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
	if err := createTables(); err != nil {
		return err
	}
	migrate()
	return seedData()
}

// migrate は既存DBに新カラムを追加する。カラムが既にあればエラーを無視する
func migrate() {
	cols := []string{
		`ALTER TABLE furniture ADD COLUMN x REAL NOT NULL DEFAULT 50`,
		`ALTER TABLE furniture ADD COLUMN y REAL NOT NULL DEFAULT 75`,
		`ALTER TABLE furniture ADD COLUMN w REAL NOT NULL DEFAULT 10`,
		`ALTER TABLE furniture ADD COLUMN h REAL NOT NULL DEFAULT 10`,
		`ALTER TABLE furniture ADD COLUMN floor_only INTEGER NOT NULL DEFAULT 0`,
	}
	for _, sql := range cols {
		DB.Exec(sql)
	}
	// 既存行がデフォルト値(x=50)のままなら家具ごとの初期位置を設定
	positions := []string{
		`UPDATE furniture SET x=24, y=55, w=16, h=12, floor_only=1 WHERE id=1 AND x=50`,
		`UPDATE furniture SET x=5,  y=50, w=9,  h=16, floor_only=1 WHERE id=2 AND x=50`,
		`UPDATE furniture SET x=3,  y=5,  w=6,  h=55, floor_only=0 WHERE id=3 AND x=50`,
		`UPDATE furniture SET x=27, y=76, w=38, h=5,  floor_only=1 WHERE id=4 AND x=50`,
		`UPDATE furniture SET x=75, y=53, w=5,  h=14, floor_only=1 WHERE id=5 AND x=50`,
		`UPDATE furniture SET x=82, y=58, w=7,  h=12, floor_only=1 WHERE id=6 AND x=50`,
		`UPDATE furniture SET x=52, y=62, w=7,  h=8,  floor_only=1 WHERE id=7 AND x=50`,
	}
	for _, sql := range positions {
		DB.Exec(sql)
	}
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
			equipped INTEGER NOT NULL DEFAULT 0,
			x REAL NOT NULL DEFAULT 50,
			y REAL NOT NULL DEFAULT 75,
			w REAL NOT NULL DEFAULT 10,
			h REAL NOT NULL DEFAULT 10,
			floor_only INTEGER NOT NULL DEFAULT 0
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
	outfitSQL := `INSERT OR IGNORE INTO outfits (id, name, description, cost, body_color, hat_type, owned, equipped) VALUES
		(1, 'デフォルト',   'みどりのスライム',   0, '#4ade80', 'none',   1, 1),
		(2, 'ブルーベリー', 'すずしげなあおいろ',  80, '#60a5fa', 'none',   0, 0),
		(3, 'サンゴ',       'あたたかなピンク',    80, '#fb7185', 'none',   0, 0),
		(4, 'ラベンダー',   'やさしいむらさき',    80, '#c084fc', 'none',   0, 0),
		(5, 'おうじさま',   'きんのおうかん',      150, '#fbbf24', 'crown',  0, 0),
		(6, 'サンタ',       'あかいぼうし',        150, '#ef4444', 'santa',  0, 0),
		(7, 'うちゅうじん', 'ぎんいろのヘルメット', 200, '#94a3b8', 'helmet', 0, 0);`

	furnitureSQL := `INSERT OR IGNORE INTO furniture
		(id, name, emoji, cost, happiness_bonus, owned, equipped, x, y, w, h, floor_only) VALUES
		(1, '木の机',         '🪵', 100, 2, 0, 0, 24, 55, 16, 12, 1),
		(2, '本棚',           '📚', 120, 3, 0, 0,  5, 50,  9, 16, 1),
		(3, 'カーテン',       '🪟',  80, 2, 0, 0,  3,  5,  6, 55, 0),
		(4, 'ラグ',           '🟫',  60, 1, 0, 0, 27, 76, 38,  5, 1),
		(5, 'スタンドライト', '💡',  90, 3, 0, 0, 75, 53,  5, 14, 1),
		(6, '観葉植物',       '🪴',  70, 4, 0, 0, 82, 58,  7, 12, 1),
		(7, 'ぬいぐるみ',     '🧸', 110, 5, 0, 0, 52, 62,  7,  8, 1);`

	if _, err := DB.Exec(outfitSQL);    err != nil { return err }
	if _, err := DB.Exec(furnitureSQL); err != nil { return err }
	return nil
}
