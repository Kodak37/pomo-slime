package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func GetOutfits(w http.ResponseWriter, r *http.Request) {
	list, err := model.GetOutfits()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}

func BuyOutfit(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	list, err := model.BuyOutfit(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}

func EquipOutfit(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	list, err := model.EquipOutfit(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}
