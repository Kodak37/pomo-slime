package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
)

func GetRoom(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	room, err := model.GetRoomSettings(uid)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(room)
}

func UpdateRoom(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	var body struct {
		Theme string `json:"theme"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Theme == "" {
		http.Error(w, "invalid theme", http.StatusBadRequest)
		return
	}
	room, err := model.UpdateRoomTheme(uid, body.Theme)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(room)
}
