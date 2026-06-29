package model

import "pomodoro-slime/db"

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

func BuyFurniture(userID string, id int) ([]Furniture, error) {
	s, err := GetSlime(userID)
	if err != nil {
		return nil, err
	}
	var cost int
	db.DB.QueryRow(`SELECT cost FROM furniture_catalog WHERE id = $1`, id).Scan(&cost)
	if s.Coins < cost {
		return GetFurniture(userID)
	}
	var owned bool
	db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM user_furniture WHERE user_id = $1 AND furniture_id = $2)`, userID, id).Scan(&owned)
	if owned {
		return GetFurniture(userID)
	}
	db.DB.Exec(`UPDATE slimes SET coins = coins - $1 WHERE user_id = $2`, cost, userID)
	// デフォルト位置をカタログから引き継ぐ
	db.DB.Exec(`
		INSERT INTO user_furniture (user_id, furniture_id, x, y, w, h)
		SELECT $1, id, default_x, default_y, default_w, default_h
		FROM furniture_catalog WHERE id = $2
		ON CONFLICT DO NOTHING
	`, userID, id)
	return GetFurniture(userID)
}

func ToggleFurniture(userID string, id int) ([]Furniture, error) {
	var equipped bool
	db.DB.QueryRow(`SELECT equipped FROM user_furniture WHERE user_id = $1 AND furniture_id = $2`, userID, id).Scan(&equipped)
	if equipped {
		db.DB.Exec(`UPDATE user_furniture SET equipped = FALSE WHERE user_id = $1 AND furniture_id = $2`, userID, id)
	} else {
		db.DB.Exec(`UPDATE user_furniture SET equipped = TRUE WHERE user_id = $1 AND furniture_id = $2`, userID, id)
	}
	UpdateHappinessBonus(userID)
	return GetFurniture(userID)
}

func UpdateFurnitureLayout(userID string, id int, x, y, w, h float64) error {
	_, err := db.DB.Exec(`
		UPDATE user_furniture SET x=$1, y=$2, w=$3, h=$4
		WHERE user_id = $5 AND furniture_id = $6
	`, x, y, w, h, userID, id)
	return err
}
