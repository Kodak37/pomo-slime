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
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" || len([]rune(body.Name)) > 20 {
		http.Error(w, "invalid name", http.StatusBadRequest)
		return
	}
	s, err := model.UpdateName(uid, body.Name)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func PomodoroComplete(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	// durationMin のみセッション長として受け取る。報酬に効く pomodoroCount は
	// サーバー保持の値を使うため、クライアント送信値は無視する。
	var body struct {
		DurationMin int `json:"durationMin"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.DurationMin <= 0 {
		body.DurationMin = 25
	}
	if body.DurationMin > 120 {
		body.DurationMin = 120
	}
	s, err := model.AddPomodoroCoins(uid, body.DurationMin)
	if err != nil {
		if err == model.ErrRateLimit {
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func Feed(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	// cost は餌の選択にのみ使う。実際のコスト・空腹回復量はサーバー定数で確定させる。
	var body struct {
		Cost int `json:"cost"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	s, err := model.Feed(uid, body.Cost)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(s)
}

func MinigameReward(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	// クライアントからはゲームIDと生スコアのみ受け取る。コイン額は受け取らない。
	var body struct {
		Game  string `json:"game"`
		Score int    `json:"score"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	s, awarded, err := model.ClaimMinigameReward(uid, body.Game, body.Score)
	if err != nil {
		switch err {
		case model.ErrUnknownGame:
			http.Error(w, "unknown game", http.StatusBadRequest)
		case model.ErrMinigameCooldown:
			http.Error(w, "too many requests", http.StatusTooManyRequests)
		default:
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	json.NewEncoder(w).Encode(struct {
		Awarded int          `json:"awarded"`
		Slime   *model.Slime `json:"slime"`
	}{awarded, s})
}
