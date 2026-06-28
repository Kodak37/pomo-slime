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

	// 5分ごとに空腹度を減らす
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
		AllowedMethods: []string{"GET", "POST"},
		AllowedHeaders: []string{"Content-Type"},
	}))

	r.Get("/api/slime", handler.GetSlime)
	r.Post("/api/pomodoro/done", handler.PomodoroComplete)
	r.Post("/api/feed", handler.Feed)

	log.Println("サーバー起動: http://localhost:8080")
	http.ListenAndServe(":8080", r)
}
