package model

import (
	"database/sql"
	"errors"
	"pomodoro-slime/db"
	"time"
)

// ErrRateLimit はポモドーロ報酬のレートリミットに引っかかったことを表す。
var ErrRateLimit = errors.New("rate limit")

// ErrMinigameCooldown はミニゲーム報酬のクールダウン中であることを表す。
var ErrMinigameCooldown = errors.New("minigame cooldown")

// ErrUnknownGame は未知のミニゲームIDが指定されたことを表す。
var ErrUnknownGame = errors.New("unknown game")

// minigameCooldown は連続請求による稼ぎを防ぐためのクールダウン。
const minigameCooldown = 20 * time.Second

// feedFoods は餌の cost -> 空腹回復量 のサーバー固定定義。
// クライアントは cost で餌を選ぶだけで、コスト・回復量はここで確定させる。
var feedFoods = map[int]int{
	5:  10, // きのこ
	15: 30, // おにぎり
	30: 60, // ステーキ
}

type gameRule struct {
	rate        int // 生スコア1点あたりのコイン
	maxPerClaim int // 1回の請求で獲得できるコイン上限
}

// gameRules は各ミニゲームの単価と上限のサーバー定数。
var gameRules = map[string]gameRule{
	"catch": {rate: 3, maxPerClaim: 100},
	"mole":  {rate: 4, maxPerClaim: 100},
	"dodge": {rate: 1, maxPerClaim: 60},
}

type Slime struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Hunger         int       `json:"hunger"`
	Coins          int       `json:"coins"`
	PomodoroCount  int       `json:"pomodoroCount"`
	HappinessBonus int       `json:"happinessBonus"`
	UpdatedAt      time.Time `json:"updatedAt"`
	Status         string    `json:"status"`
}

// GetOrCreateSlime は初回ログイン時にスライムを作成する
func GetOrCreateSlime(userID string) (*Slime, error) {
	if _, err := db.DB.Exec(`
		INSERT INTO slimes (user_id) VALUES ($1)
		ON CONFLICT DO NOTHING
	`, userID); err != nil {
		return nil, err
	}
	// デフォルト衣装（id=1）を付与
	if _, err := db.DB.Exec(`
		INSERT INTO user_outfits (user_id, outfit_id, equipped) VALUES ($1, 1, TRUE)
		ON CONFLICT DO NOTHING
	`, userID); err != nil {
		return nil, err
	}
	return GetSlime(userID)
}

func GetSlime(userID string) (*Slime, error) {
	row := db.DB.QueryRow(`
		SELECT user_id, name, hunger, coins, pomodoro_count, happiness_bonus, updated_at
		FROM slimes WHERE user_id = $1
	`, userID)
	s := &Slime{}
	if err := row.Scan(&s.ID, &s.Name, &s.Hunger, &s.Coins, &s.PomodoroCount, &s.HappinessBonus, &s.UpdatedAt); err != nil {
		return nil, err
	}
	s.Status = calcStatus(s.Hunger)
	return s, nil
}

func UpdateName(userID, name string) (*Slime, error) {
	if _, err := db.DB.Exec(`UPDATE slimes SET name = $1, updated_at = NOW() WHERE user_id = $2`, name, userID); err != nil {
		return nil, err
	}
	return GetSlime(userID)
}

// pomodoroReward は報酬コインを算出する純粋関数。
// 報酬に効く pomodoroCount / happinessBonus はサーバー保持の値を渡すこと。
func pomodoroReward(pomodoroCount, durationMin, happinessBonus int) int {
	base := 10 + (pomodoroCount / 3)
	if base > 30 {
		base = 30
	}
	deviation := durationMin - 25
	if deviation < 0 {
		deviation = -deviation
	}
	penaltyPct := deviation * 4
	if penaltyPct > 80 {
		penaltyPct = 80
	}
	coins := base * (100 - penaltyPct) / 100
	if coins < 1 {
		coins = 1
	}
	if happinessBonus > 0 {
		coins = coins + (coins*happinessBonus)/20
	}
	return coins
}

// AddPomodoroCoins はポモドーロ完了報酬を付与する。
// 報酬計算に使う pomodoro_count / happiness_bonus はサーバー保持の値のみを信用し、
// レートリミット判定・コイン加算・ログ挿入を1トランザクションで原子的に行う。
func AddPomodoroCoins(userID string, durationMin int) (*Slime, error) {
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// レートリミット: 直近ログから15分未満なら弾く（判定をTx内に入れ二重付与のレースを塞ぐ）
	var lastCompleted time.Time
	err = tx.QueryRow(`
		SELECT completed_at FROM pomodoro_logs
		WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 1
	`, userID).Scan(&lastCompleted)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}
	if !lastCompleted.IsZero() && time.Since(lastCompleted) < 15*time.Minute {
		return nil, ErrRateLimit
	}

	// 報酬に効く数値はクライアントではなくサーバーのslimesから取得する
	var pomodoroCount, happinessBonus int
	if err := tx.QueryRow(`
		SELECT pomodoro_count, happiness_bonus FROM slimes WHERE user_id = $1
	`, userID).Scan(&pomodoroCount, &happinessBonus); err != nil {
		return nil, err
	}

	coins := pomodoroReward(pomodoroCount, durationMin, happinessBonus)

	if _, err := tx.Exec(`
		UPDATE slimes SET coins = coins + $1, pomodoro_count = pomodoro_count + 1, updated_at = NOW()
		WHERE user_id = $2
	`, coins, userID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`
		INSERT INTO pomodoro_logs (user_id, duration_min, coins_earned) VALUES ($1, $2, $3)
	`, userID, durationMin, coins); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetSlime(userID)
}

// feedFood はクライアントが指定した cost をサーバー定義の餌に解決する。
// 未知の cost は最安の餌にフォールバックし、クライアントの任意値は信用しない。
func feedFood(cost int) (int, int) {
	if gain, ok := feedFoods[cost]; ok {
		return cost, gain
	}
	return 5, feedFoods[5]
}

// Feed は餌やりを行う。コスト・空腹回復量はサーバー固定定数で確定させ、
// 「残高チェック＋減算」を1文にまとめてTOCTOUを防ぐ。
func Feed(userID string, reqCost int) (*Slime, error) {
	cost, gain := feedFood(reqCost)

	res, err := db.DB.Exec(`
		UPDATE slimes SET hunger = LEAST(100, hunger + $1), coins = coins - $2, updated_at = NOW()
		WHERE user_id = $3 AND coins >= $2
	`, gain, cost, userID)
	if err != nil {
		return nil, err
	}
	// RowsAffected が 0 の場合は残高不足。現状のスライムを返すだけにする。
	if n, err := res.RowsAffected(); err != nil {
		return nil, err
	} else if n == 0 {
		return GetSlime(userID)
	}
	return GetSlime(userID)
}

// minigameReward はミニゲームの生スコアからコインを算出する純粋関数。
// clamp(score * rate, 0, maxPerClaim)。未知ゲームは ok=false。
func minigameReward(game string, score int) (int, bool) {
	rule, ok := gameRules[game]
	if !ok {
		return 0, false
	}
	if score < 0 {
		score = 0
	}
	coins := score * rule.rate
	if coins > rule.maxPerClaim {
		coins = rule.maxPerClaim
	}
	if coins < 0 {
		coins = 0
	}
	return coins, true
}

// ClaimMinigameReward はミニゲーム報酬を付与する。
// コイン額はクライアントから受け取らず、生スコアとゲームIDからサーバーで算出する。
// クールダウン判定とコイン加算を1トランザクションで原子的に行う。
func ClaimMinigameReward(userID, game string, score int) (*Slime, int, error) {
	coins, ok := minigameReward(game, score)
	if !ok {
		return nil, 0, ErrUnknownGame
	}

	tx, err := db.DB.Begin()
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()

	var last sql.NullTime
	if err := tx.QueryRow(`SELECT last_minigame_at FROM slimes WHERE user_id = $1`, userID).Scan(&last); err != nil {
		return nil, 0, err
	}
	if last.Valid && time.Since(last.Time) < minigameCooldown {
		return nil, 0, ErrMinigameCooldown
	}

	if _, err := tx.Exec(`
		UPDATE slimes SET coins = coins + $1, last_minigame_at = NOW(), updated_at = NOW()
		WHERE user_id = $2
	`, coins, userID); err != nil {
		return nil, 0, err
	}
	if err := tx.Commit(); err != nil {
		return nil, 0, err
	}
	s, err := GetSlime(userID)
	if err != nil {
		return nil, 0, err
	}
	return s, coins, nil
}

func DecayHunger() error {
	_, err := db.DB.Exec(`UPDATE slimes SET hunger = GREATEST(0, hunger - 2), updated_at = NOW()`)
	return err
}

func UpdateHappinessBonus(userID string) error {
	_, err := db.DB.Exec(`
		UPDATE slimes SET happiness_bonus = (
			SELECT COALESCE(SUM(fc.happiness_bonus), 0)
			FROM user_furniture uf
			JOIN furniture_catalog fc ON fc.id = uf.furniture_id
			WHERE uf.user_id = $1 AND uf.equipped = TRUE
		)
		WHERE user_id = $1
	`, userID)
	return err
}

func calcStatus(hunger int) string {
	switch {
	case hunger >= 80:
		return "happy"
	case hunger >= 60:
		return "slightly_happy"
	case hunger >= 35:
		return "normal"
	case hunger >= 15:
		return "hungry"
	default:
		return "dying"
	}
}
