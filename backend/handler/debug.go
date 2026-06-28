package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/db"
)

func DebugAddCoins(w http.ResponseWriter, r *http.Request) {
	var body struct{ Amount int `json:"amount"` }
	json.NewDecoder(r.Body).Decode(&body)
	if body.Amount == 0 { body.Amount = 9999 }
	db.DB.Exec(`UPDATE slime SET coins = coins + ? WHERE id = 1`, body.Amount)
	w.Write([]byte(`{"ok":true}`))
}
