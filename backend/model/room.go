package model

import "pomodoro-slime/db"

type RoomSettings struct {
	Theme string `json:"theme"`
}

func GetRoomSettings() (*RoomSettings, error) {
	var theme string
	if err := db.DB.QueryRow(`SELECT theme FROM room_settings WHERE id = 1`).Scan(&theme); err != nil {
		return nil, err
	}
	return &RoomSettings{Theme: theme}, nil
}

func UpdateRoomTheme(theme string) (*RoomSettings, error) {
	if _, err := db.DB.Exec(`UPDATE room_settings SET theme = ? WHERE id = 1`, theme); err != nil {
		return nil, err
	}
	return GetRoomSettings()
}
