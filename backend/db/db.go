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
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		INSERT OR IGNORE INTO slime (id, name) VALUES (1, 'スライムちゃん');
	`)
	return err
}
