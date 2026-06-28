package main

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"pomodoro-slime/db"
	"pomodoro-slime/handler"
	"pomodoro-slime/model"
)

func main() {
	if err := db.Init(); err != nil {
		log.Fatal("DB初期化失敗:", err)
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			if err := model.DecayHunger(); err != nil {
				log.Println("空腹度更新エラー:", err)
			}
		}
	}()

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173"},
		AllowedMethods: []string{"GET", "POST", "PUT"},
		AllowedHeaders: []string{"Content-Type"},
	}))

	// debug
	r.Post("/api/debug/coins", handler.DebugAddCoins)

	// slime
	r.Get("/api/slime", handler.GetSlime)
	r.Put("/api/slime/name", handler.UpdateName)
	r.Post("/api/pomodoro/done", handler.PomodoroComplete)
	r.Post("/api/feed", handler.Feed)

	// logs
	r.Get("/api/logs", handler.GetLogs)

	// outfits
	r.Get("/api/outfits", handler.GetOutfits)
	r.Post("/api/outfits/{id}/buy", handler.BuyOutfit)
	r.Post("/api/outfits/{id}/equip", handler.EquipOutfit)

	// furniture
	r.Get("/api/furniture", handler.GetFurniture)
	r.Post("/api/furniture/{id}/buy", handler.BuyFurniture)
	r.Post("/api/furniture/{id}/toggle", handler.ToggleFurniture)

	// room
	r.Get("/api/room", handler.GetRoom)
	r.Put("/api/room", handler.UpdateRoom)

	log.Println("サーバー起動: http://localhost:8080")
	http.ListenAndServe(":8080", r)
}
