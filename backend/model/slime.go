package model

import (
	"pomodoro-slime/db"
	"time"
)

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
	db.DB.Exec(`
		INSERT INTO slimes (user_id) VALUES ($1)
		ON CONFLICT DO NOTHING
	`, userID)
	// デフォルト衣装（id=1）を付与
	db.DB.Exec(`
		INSERT INTO user_outfits (user_id, outfit_id, equipped) VALUES ($1, 1, TRUE)
		ON CONFLICT DO NOTHING
	`, userID)
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

func AddPomodoroCoins(userID string, pomodoroCount, durationMin int) (*Slime, error) {
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
	s, err := GetSlime(userID)
	if err != nil {
		return nil, err
	}
	if s.HappinessBonus > 0 {
		coins = coins + (coins*s.HappinessBonus)/20
	}
	if _, err := db.DB.Exec(`
		UPDATE slimes SET coins = coins + $1, pomodoro_count = pomodoro_count + 1, updated_at = NOW()
		WHERE user_id = $2
	`, coins, userID); err != nil {
		return nil, err
	}
	db.DB.Exec(`INSERT INTO pomodoro_logs (user_id, duration_min, coins_earned) VALUES ($1, $2, $3)`, userID, durationMin, coins)
	return GetSlime(userID)
}

func Feed(userID string, cost int) (*Slime, error) {
	s, err := GetSlime(userID)
	if err != nil {
		return nil, err
	}
	if s.Coins < cost {
		return s, nil
	}
	newHunger := s.Hunger + cost*2
	if newHunger > 100 {
		newHunger = 100
	}
	if _, err := db.DB.Exec(`
		UPDATE slimes SET hunger = $1, coins = coins - $2, updated_at = NOW()
		WHERE user_id = $3
	`, newHunger, cost, userID); err != nil {
		return nil, err
	}
	return GetSlime(userID)
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
