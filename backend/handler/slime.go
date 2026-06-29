package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
)

func GetSlime(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	s, err := model.GetOrCreateSlime(uid)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func UpdateName(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "invalid name", http.StatusBadRequest)
		return
	}
	s, err := model.UpdateName(uid, body.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func PomodoroComplete(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	var body struct {
		PomodoroCount int `json:"pomodoroCount"`
		DurationMin   int `json:"durationMin"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.DurationMin <= 0 {
		body.DurationMin = 25
	}
	s, err := model.AddPomodoroCoins(uid, body.PomodoroCount, body.DurationMin)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func Feed(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	var body struct {
		Cost int `json:"cost"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Cost <= 0 {
		body.Cost = 5
	}
	s, err := model.Feed(uid, body.Cost)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}
