package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
)

func GetLogs(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	logs, err := model.GetLogs(uid, 1000)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(logs)
}
