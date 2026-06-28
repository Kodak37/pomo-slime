package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
)

func GetRoom(w http.ResponseWriter, r *http.Request) {
	room, err := model.GetRoomSettings()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(room)
}

func UpdateRoom(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Theme string `json:"theme"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Theme == "" {
		http.Error(w, "invalid theme", http.StatusBadRequest)
		return
	}
	room, err := model.UpdateRoomTheme(body.Theme)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(room)
}
