package model

import (
	"pomodoro-slime/db"
	"time"
)

type Slime struct {
	ID            int       `json:"id"`
	Name          string    `json:"name"`
	Hunger        int       `json:"hunger"`
	Coins         int       `json:"coins"`
	PomodoroCount int       `json:"pomodoroCount"`
	UpdatedAt     time.Time `json:"updatedAt"`
	Status        string    `json:"status"`
}

func GetSlime() (*Slime, error) {
	row := db.DB.QueryRow(`SELECT id, name, hunger, coins, pomodoro_count, updated_at FROM slime WHERE id = 1`)
	s := &Slime{}
	err := row.Scan(&s.ID, &s.Name, &s.Hunger, &s.Coins, &s.PomodoroCount, &s.UpdatedAt)
	if err != nil {
		return nil, err
	}
	s.Status = calcStatus(s.Hunger)
	return s, nil
}

func AddPomodoroCoins(pomodoroCount int) (*Slime, error) {
	// 連続回数が多いほどボーナスコイン
	bonus := 10 + (pomodoroCount / 3)
	if bonus > 30 {
		bonus = 30
	}

	_, err := db.DB.Exec(`
		UPDATE slime SET
			coins = coins + ?,
			pomodoro_count = pomodoro_count + 1,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
	`, bonus)
	if err != nil {
		return nil, err
	}
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

	hungerGain := cost * 2
	newHunger := s.Hunger + hungerGain
	if newHunger > 100 {
		newHunger = 100
	}

	_, err = db.DB.Exec(`
		UPDATE slime SET
			hunger = ?,
			coins = coins - ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
	`, newHunger, cost)
	if err != nil {
		return nil, err
	}
	return GetSlime()
}

func DecayHunger() error {
	_, err := db.DB.Exec(`
		UPDATE slime SET
			hunger = MAX(0, hunger - 2),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = 1
	`)
	return err
}

func calcStatus(hunger int) string {
	switch {
	case hunger >= 70:
		return "happy"
	case hunger >= 40:
		return "normal"
	case hunger >= 15:
		return "hungry"
	default:
		return "dying"
	}
}
