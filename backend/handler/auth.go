package handler

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const userIDKey contextKey = "userID"

var jwks keyfunc.Keyfunc

func InitAuth() error {
	url := os.Getenv("SUPABASE_URL") + "/auth/v1/.well-known/jwks.json"
	k, err := keyfunc.NewDefault([]string{url})
	if err != nil {
		return fmt.Errorf("JWKS初期化失敗: %w", err)
	}
	jwks = k
	return nil
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if tokenStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		claims := jwt.MapClaims{}
		_, err := jwt.ParseWithClaims(tokenStr, claims, jwks.Keyfunc)
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		sub, _ := claims["sub"].(string)
		if sub == "" {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, sub)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(r *http.Request) string {
	id, _ := r.Context().Value(userIDKey).(string)
	return id
}
