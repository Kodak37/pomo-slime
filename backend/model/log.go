package model

import (
	"pomodoro-slime/db"
	"time"
)

type PomodoroLog struct {
	ID          int       `json:"id"`
	DurationMin int       `json:"durationMin"`
	CoinsEarned int       `json:"coinsEarned"`
	CompletedAt time.Time `json:"completedAt"`
}

func GetLogs(limit int) ([]PomodoroLog, error) {
	rows, err := db.DB.Query(`SELECT id, duration_min, coins_earned, completed_at FROM pomodoro_logs ORDER BY completed_at DESC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []PomodoroLog
	for rows.Next() {
		var l PomodoroLog
		if err := rows.Scan(&l.ID, &l.DurationMin, &l.CoinsEarned, &l.CompletedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	if logs == nil {
		logs = []PomodoroLog{}
	}
	return logs, nil
}
