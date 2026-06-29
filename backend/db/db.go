package db

import (
	"database/sql"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Init() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://localhost/pomo_slime?sslmode=disable"
	}
	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		return err
	}
	return createTables()
}

func createTables() error {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS slimes (
			user_id TEXT PRIMARY KEY,
			name TEXT NOT NULL DEFAULT 'スライムちゃん',
			hunger INTEGER NOT NULL DEFAULT 80,
			coins INTEGER NOT NULL DEFAULT 0,
			pomodoro_count INTEGER NOT NULL DEFAULT 0,
			happiness_bonus INTEGER NOT NULL DEFAULT 0,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS pomodoro_logs (
			id SERIAL PRIMARY KEY,
			user_id TEXT NOT NULL,
			duration_min INTEGER NOT NULL,
			coins_earned INTEGER NOT NULL,
			completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS outfits (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			cost INTEGER NOT NULL DEFAULT 0,
			body_color TEXT NOT NULL DEFAULT '',
			hat_type TEXT NOT NULL DEFAULT 'none'
		);

		CREATE TABLE IF NOT EXISTS user_outfits (
			user_id TEXT NOT NULL,
			outfit_id INTEGER NOT NULL REFERENCES outfits(id),
			equipped BOOLEAN NOT NULL DEFAULT FALSE,
			PRIMARY KEY (user_id, outfit_id)
		);

		CREATE TABLE IF NOT EXISTS furniture_catalog (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			emoji TEXT NOT NULL,
			cost INTEGER NOT NULL DEFAULT 0,
			happiness_bonus INTEGER NOT NULL DEFAULT 0,
			floor_only BOOLEAN NOT NULL DEFAULT FALSE,
			default_x REAL NOT NULL DEFAULT 50,
			default_y REAL NOT NULL DEFAULT 75,
			default_w REAL NOT NULL DEFAULT 10,
			default_h REAL NOT NULL DEFAULT 10
		);

		CREATE TABLE IF NOT EXISTS user_furniture (
			user_id TEXT NOT NULL,
			furniture_id INTEGER NOT NULL REFERENCES furniture_catalog(id),
			equipped BOOLEAN NOT NULL DEFAULT FALSE,
			x REAL NOT NULL DEFAULT 50,
			y REAL NOT NULL DEFAULT 75,
			w REAL NOT NULL DEFAULT 10,
			h REAL NOT NULL DEFAULT 10,
			PRIMARY KEY (user_id, furniture_id)
		);

		CREATE TABLE IF NOT EXISTS room_settings (
			user_id TEXT PRIMARY KEY,
			theme TEXT NOT NULL DEFAULT 'warm'
		);
	`)
	if err != nil {
		return err
	}
	return seedCatalog()
}

func seedCatalog() error {
	_, err := DB.Exec(`
		INSERT INTO outfits (id, name, description, cost, body_color, hat_type) VALUES
		(1, 'デフォルト',   'みどりのスライム',      0, '#4ade80', 'none'),
		(2, 'ブルーベリー', 'すずしげなあおいろ',    80, '#60a5fa', 'none'),
		(3, 'サンゴ',       'あたたかなピンク',      80, '#fb7185', 'none'),
		(4, 'ラベンダー',   'やさしいむらさき',      80, '#c084fc', 'none'),
		(5, 'おうじさま',   'きんのおうかん',       150, '#fbbf24', 'crown'),
		(6, 'サンタ',       'あかいぼうし',         150, '#ef4444', 'santa'),
		(7, 'うちゅうじん', 'ぎんいろのヘルメット',  200, '#94a3b8', 'helmet')
		ON CONFLICT DO NOTHING;

		INSERT INTO furniture_catalog (id, name, emoji, cost, happiness_bonus, floor_only, default_x, default_y, default_w, default_h) VALUES
		(1, '木の机',         '🪵', 100, 2, FALSE, 24, 55, 16, 12),
		(2, '本棚',           '📚', 120, 3, TRUE,   5, 50,  9, 16),
		(3, 'カーテン',       '🪟',  80, 2, FALSE,  3,  5,  6, 55),
		(4, 'ラグ',           '🟫',  60, 1, TRUE,  27, 76, 38,  5),
		(5, 'スタンドライト', '💡',  90, 3, TRUE,  75, 53,  5, 14),
		(6, '観葉植物',       '🪴',  70, 4, TRUE,  82, 58,  7, 12),
		(7, 'ぬいぐるみ',     '🧸', 110, 5, TRUE,  52, 62,  7,  8)
		ON CONFLICT DO NOTHING;
	`)
	return err
}
