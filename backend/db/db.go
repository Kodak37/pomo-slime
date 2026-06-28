package db

import (
	"database/sql"
	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init() error {
	var err error
	DB, err = sql.Open("sqlite", "./slime.db")
	if err != nil {
		return err
	}
	return createTables()
}

func createTables() error {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS slime (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL DEFAULT 'スライムちゃん',
			hunger INTEGER NOT NULL DEFAULT 80,
			coins INTEGER NOT NULL DEFAULT 0,
			pomodoro_count INTEGER NOT NULL DEFAULT 0,
			happiness_bonus INTEGER NOT NULL DEFAULT 0,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		INSERT OR IGNORE INTO slime (id, name) VALUES (1, 'スライムちゃん');

		CREATE TABLE IF NOT EXISTS pomodoro_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			duration_min INTEGER NOT NULL,
			coins_earned INTEGER NOT NULL,
			completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS outfits (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			cost INTEGER NOT NULL DEFAULT 0,
			body_color TEXT NOT NULL DEFAULT '',
			hat_type TEXT NOT NULL DEFAULT 'none',
			owned INTEGER NOT NULL DEFAULT 0,
			equipped INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS furniture (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			emoji TEXT NOT NULL,
			cost INTEGER NOT NULL,
			happiness_bonus INTEGER NOT NULL DEFAULT 0,
			owned INTEGER NOT NULL DEFAULT 0,
			equipped INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS room_settings (
			id INTEGER PRIMARY KEY DEFAULT 1,
			theme TEXT NOT NULL DEFAULT 'warm'
		);
		INSERT OR IGNORE INTO room_settings (id, theme) VALUES (1, 'warm');
	`)
	if err != nil {
		return err
	}
	return seedData()
}

func seedData() error {
	// outfits
	outfitSQL := `INSERT OR IGNORE INTO outfits (id, name, description, cost, body_color, hat_type, owned, equipped) VALUES
		(1, 'デフォルト',   'みどりのスライム',   0, '#4ade80', 'none',   1, 1),
		(2, 'ブルーベリー', 'すずしげなあおいろ',  80, '#60a5fa', 'none',   0, 0),
		(3, 'サンゴ',       'あたたかなピンク',    80, '#fb7185', 'none',   0, 0),
		(4, 'ラベンダー',   'やさしいむらさき',    80, '#c084fc', 'none',   0, 0),
		(5, 'おうじさま',   'きんのおうかん',      150, '#fbbf24', 'crown',  0, 0),
		(6, 'サンタ',       'あかいぼうし',        150, '#ef4444', 'santa',  0, 0),
		(7, 'うちゅうじん', 'ぎんいろのヘルメット', 200, '#94a3b8', 'helmet', 0, 0);`

	furnitureSQL := `INSERT OR IGNORE INTO furniture (id, name, emoji, cost, happiness_bonus, owned, equipped) VALUES
		(1, '木の机',     '🪵', 100, 2, 0, 0),
		(2, '本棚',       '📚', 120, 3, 0, 0),
		(3, 'カーテン',   '🪟', 80,  2, 0, 0),
		(4, 'ラグ',       '🟫', 60,  1, 0, 0),
		(5, 'スタンドライト', '💡', 90, 3, 0, 0),
		(6, '観葉植物',   '🪴', 70,  4, 0, 0),
		(7, 'ぬいぐるみ', '🧸', 110, 5, 0, 0);`

	if _, err := DB.Exec(outfitSQL);    err != nil { return err }
	if _, err := DB.Exec(furnitureSQL); err != nil { return err }
	return nil
}
