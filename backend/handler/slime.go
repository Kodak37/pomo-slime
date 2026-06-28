package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
)

func GetSlime(w http.ResponseWriter, r *http.Request) {
	s, err := model.GetSlime()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func PomodoroComplete(w http.ResponseWriter, r *http.Request) {
	var body struct {
		PomodoroCount int `json:"pomodoroCount"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	s, err := model.AddPomodoroCoins(body.PomodoroCount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func Feed(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Cost int `json:"cost"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Cost <= 0 {
		body.Cost = 5
	}

	s, err := model.Feed(body.Cost)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}
