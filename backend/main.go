package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
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
	if err := handler.InitAuth(); err != nil {
		log.Fatal("Auth初期化失敗:", err)
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
		AllowedOrigins: []string{"https://pomo-slime.onrender.com"},
		AllowedMethods: []string{"GET", "POST", "PUT"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
	}))

	// フロントエンドに渡すSupabase設定（認証不要）
	r.Get("/api/config", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{
			"supabaseUrl": os.Getenv("SUPABASE_URL"),
			"supabaseKey": os.Getenv("SUPABASE_ANON_KEY"),
		})
	})

	// 認証が必要なAPIルート
	r.Group(func(r chi.Router) {
		r.Use(handler.AuthMiddleware)

		r.Get("/api/slime", handler.GetSlime)
		r.Put("/api/slime/name", handler.UpdateName)
		r.Post("/api/pomodoro/done", handler.PomodoroComplete)
		r.Post("/api/feed", handler.Feed)

		r.Get("/api/logs", handler.GetLogs)

		r.Get("/api/outfits", handler.GetOutfits)
		r.Post("/api/outfits/{id}/buy", handler.BuyOutfit)
		r.Post("/api/outfits/{id}/equip", handler.EquipOutfit)

		r.Get("/api/furniture", handler.GetFurniture)
		r.Post("/api/furniture/{id}/buy", handler.BuyFurniture)
		r.Post("/api/furniture/{id}/toggle", handler.ToggleFurniture)
		r.Put("/api/furniture/{id}/layout", handler.UpdateFurnitureLayout)

		r.Get("/api/room", handler.GetRoom)
		r.Put("/api/room", handler.UpdateRoom)
	})

	// フロントエンド静的ファイル配信
	frontendDist := "./frontend/dist"
	if _, err := os.Stat(frontendDist); err == nil {
		fileServer := http.FileServer(http.Dir(frontendDist))
		r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := filepath.Join(frontendDist, filepath.Clean("/"+r.URL.Path))
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, r, filepath.Join(frontendDist, "index.html"))
				return
			}
			fileServer.ServeHTTP(w, r)
		}))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("サーバー起動: http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
