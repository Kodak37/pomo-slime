package handler

import (
	"encoding/json"
	"net/http"
	"pomodoro-slime/model"
	"strconv"

	"github.com/go-chi/chi/v5"
)

func GetOutfits(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	list, err := model.GetOutfits(uid)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}

func BuyOutfit(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	list, err := model.BuyOutfit(uid, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}

func EquipOutfit(w http.ResponseWriter, r *http.Request) {
	uid := GetUserID(r)
	id, _ := strconv.Atoi(chi.URLParam(r, "id"))
	list, err := model.EquipOutfit(uid, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(list)
}
