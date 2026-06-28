package model

import (
	"pomodoro-slime/db"
	"time"
)

type Slime struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Hunger         int       `json:"hunger"`
	Coins          int       `json:"coins"`
	PomodoroCount  int       `json:"pomodoroCount"`
	HappinessBonus int       `json:"happinessBonus"`
	UpdatedAt      time.Time `json:"updatedAt"`
	Status         string    `json:"status"`
}

func GetSlime() (*Slime, error) {
	row := db.DB.QueryRow(`SELECT id, name, hunger, coins, pomodoro_count, happiness_bonus, updated_at FROM slime WHERE id = 1`)
	s := &Slime{}
	if err := row.Scan(&s.ID, &s.Name, &s.Hunger, &s.Coins, &s.PomodoroCount, &s.HappinessBonus, &s.UpdatedAt); err != nil {
		return nil, err
	}
	s.Status = calcStatus(s.Hunger)
	return s, nil
}

func UpdateName(name string) (*Slime, error) {
	if _, err := db.DB.Exec(`UPDATE slime SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`, name); err != nil {
		return nil, err
	}
	return GetSlime()
}

func AddPomodoroCoins(pomodoroCount, durationMin int) (*Slime, error) {
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
	s, err := GetSlime()
	if err != nil {
		return nil, err
	}
	if s.HappinessBonus > 0 {
		coins = coins + (coins*s.HappinessBonus)/20
	}
	if _, err := db.DB.Exec(`UPDATE slime SET coins = coins + ?, pomodoro_count = pomodoro_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1`, coins); err != nil {
		return nil, err
	}
	db.DB.Exec(`INSERT INTO pomodoro_logs (duration_min, coins_earned) VALUES (?, ?)`, durationMin, coins)
	return GetSlime()
}

func Feed(cost int) (*Slime, error) {
	s, err := GetSlime()
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
	if _, err := db.DB.Exec(`UPDATE slime SET hunger = ?, coins = coins - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`, newHunger, cost); err != nil {
		return nil, err
	}
	return GetSlime()
}

func DecayHunger() error {
	_, err := db.DB.Exec(`UPDATE slime SET hunger = MAX(0, hunger - 2), updated_at = CURRENT_TIMESTAMP WHERE id = 1`)
	return err
}

func UpdateHappinessBonus() error {
	var bonus int
	db.DB.QueryRow(`SELECT COALESCE(SUM(happiness_bonus),0) FROM furniture WHERE equipped = 1`).Scan(&bonus)
	_, err := db.DB.Exec(`UPDATE slime SET happiness_bonus = ? WHERE id = 1`, bonus)
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
