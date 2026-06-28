package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
)

func GetLogs(w http.ResponseWriter, r *http.Request) {
	logs, err := model.GetLogs(50)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(logs)
}
