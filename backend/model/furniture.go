package model

import (
	"database/sql"
	"pomodoro-slime/db"
)

type Furniture struct {
	ID             int     `json:"id"`
	Name           string  `json:"name"`
	Emoji          string  `json:"emoji"`
	Cost           int     `json:"cost"`
	HappinessBonus int     `json:"happinessBonus"`
	Owned          bool    `json:"owned"`
	Equipped       bool    `json:"equipped"`
	X              float64 `json:"x"`
	Y              float64 `json:"y"`
	W              float64 `json:"w"`
	H              float64 `json:"h"`
	FloorOnly      bool    `json:"floorOnly"`
}

func GetFurniture(userID string) ([]Furniture, error) {
	rows, err := db.DB.Query(`
		SELECT fc.id, fc.name, fc.emoji, fc.cost, fc.happiness_bonus, fc.floor_only,
		       (uf.user_id IS NOT NULL) AS owned,
		       COALESCE(uf.equipped, FALSE) AS equipped,
		       COALESCE(uf.x, fc.default_x) AS x,
		       COALESCE(uf.y, fc.default_y) AS y,
		       COALESCE(uf.w, fc.default_w) AS w,
		       COALESCE(uf.h, fc.default_h) AS h
		FROM furniture_catalog fc
		LEFT JOIN user_furniture uf ON uf.furniture_id = fc.id AND uf.user_id = $1
		ORDER BY fc.id
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Furniture
	for rows.Next() {
		var f Furniture
		if err := rows.Scan(&f.ID, &f.Name, &f.Emoji, &f.Cost, &f.HappinessBonus, &f.FloorOnly, &f.Owned, &f.Equipped, &f.X, &f.Y, &f.W, &f.H); err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	if list == nil {
		list = []Furniture{}
	}
	return list, nil
}

// BuyFurniture は家具を購入する。BuyOutfit と同様に、1トランザクション内で
// 「INSERT（所有権を取る）→ 残高チェック付き減算」を行い、原子性とレース耐性を確保する。
// INSERT を所有権のゲートにすることで同一アイテムの二重課金を防ぎ、
// 減算を `coins >= cost` の1文にまとめることで残高の二重使用(TOCTOU)を防ぐ。
func BuyFurniture(userID string, id int) ([]Furniture, error) {
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var cost int
	if err := tx.QueryRow(`SELECT cost FROM furniture_catalog WHERE id = $1`, id).Scan(&cost); err != nil {
		return nil, err
	}

	// INSERT を所有権のゲートにする。デフォルト位置はカタログから引き継ぐ。
	res, err := tx.Exec(`
		INSERT INTO user_furniture (user_id, furniture_id, x, y, w, h)
		SELECT $1, id, default_x, default_y, default_w, default_h
		FROM furniture_catalog WHERE id = $2
		ON CONFLICT DO NOTHING
	`, userID, id)
	if err != nil {
		return nil, err
	}
	if n, err := res.RowsAffected(); err != nil {
		return nil, err
	} else if n != 1 {
		return GetFurniture(userID) // 所有済み: 課金せず現状返却
	}

	res, err = tx.Exec(`UPDATE slimes SET coins = coins - $1 WHERE user_id = $2 AND coins >= $1`, cost, userID)
	if err != nil {
		return nil, err
	}
	if n, err := res.RowsAffected(); err != nil {
		return nil, err
	} else if n != 1 {
		return GetFurniture(userID) // 残高不足 → ROLLBACK で INSERT も取消
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetFurniture(userID)
}

func ToggleFurniture(userID string, id int) ([]Furniture, error) {
	var equipped bool
	err := db.DB.QueryRow(`SELECT equipped FROM user_furniture WHERE user_id = $1 AND furniture_id = $2`, userID, id).Scan(&equipped)
	if err == sql.ErrNoRows {
		return GetFurniture(userID) // 未所持: 何もしない
	}
	if err != nil {
		return nil, err
	}
	if _, err := db.DB.Exec(`UPDATE user_furniture SET equipped = $1 WHERE user_id = $2 AND furniture_id = $3`, !equipped, userID, id); err != nil {
		return nil, err
	}
	if err := UpdateHappinessBonus(userID); err != nil {
		return nil, err
	}
	return GetFurniture(userID)
}

func UpdateFurnitureLayout(userID string, id int, x, y, w, h float64) error {
	_, err := db.DB.Exec(`
		UPDATE user_furniture SET x=$1, y=$2, w=$3, h=$4
		WHERE user_id = $5 AND furniture_id = $6
	`, x, y, w, h, userID, id)
	return err
}
