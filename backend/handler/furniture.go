package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func GetFurniture(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	list, err := model.GetFurniture(uid)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}

func BuyFurniture(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	list, err := model.BuyFurniture(uid, id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}

func ToggleFurniture(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	list, err := model.ToggleFurniture(uid, id)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}

func UpdateFurnitureLayout(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	var body struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
		W float64 `json:"w"`
		H float64 `json:"h"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := model.UpdateFurnitureLayout(uid, id, body.X, body.Y, body.W, body.H); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Write([]byte(`{"ok":true}`))
}
