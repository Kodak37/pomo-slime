package model

import "pomodoro-slime/db"

type RoomSettings struct {
	Theme string `json:"theme"`
}

func GetRoomSettings(userID string) (*RoomSettings, error) {
	var theme string
	err := db.DB.QueryRow(`SELECT theme FROM room_settings WHERE user_id = $1`, userID).Scan(&theme)
	if err != nil {
		// 初回：デフォルト値を返す
		return &RoomSettings{Theme: "warm"}, nil
	}
	return &RoomSettings{Theme: theme}, nil
}

func UpdateRoomTheme(userID, theme string) (*RoomSettings, error) {
	_, err := db.DB.Exec(`
		INSERT INTO room_settings (user_id, theme) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET theme = $2
	`, userID, theme)
	if err != nil {
		return nil, err
	}
	return GetRoomSettings(userID)
}
