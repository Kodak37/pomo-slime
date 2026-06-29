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

func GetFurniture() ([]Furniture, error) {
	rows, err := db.DB.Query(`SELECT id, name, emoji, cost, happiness_bonus, owned, equipped, x, y, w, h, floor_only FROM furniture ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Furniture
	for rows.Next() {
		var f Furniture
		var owned, equipped, floorOnly int
		if err := rows.Scan(&f.ID, &f.Name, &f.Emoji, &f.Cost, &f.HappinessBonus, &owned, &equipped, &f.X, &f.Y, &f.W, &f.H, &floorOnly); err != nil {
			return nil, err
		}
		f.Owned = owned == 1
		f.Equipped = equipped == 1
		f.FloorOnly = floorOnly == 1
		list = append(list, f)
	}
	if list == nil {
		list = []Furniture{}
	}
	return list, nil
}

func BuyFurniture(id int) ([]Furniture, error) {
	s, err := GetSlime()
	if err != nil {
		return nil, err
	}
	var cost, owned int
	db.DB.QueryRow(`SELECT cost, owned FROM furniture WHERE id = ?`, id).Scan(&cost, &owned)
	if owned == 1 || s.Coins < cost {
		return GetFurniture()
	}
	db.DB.Exec(`UPDATE slime SET coins = coins - ? WHERE id = 1`, cost)
	db.DB.Exec(`UPDATE furniture SET owned = 1 WHERE id = ?`, id)
	return GetFurniture()
}

func ToggleFurniture(id int) ([]Furniture, error) {
	var equipped int
	db.DB.QueryRow(`SELECT equipped FROM furniture WHERE id = ?`, id).Scan(&equipped)
	if equipped == 1 {
		db.DB.Exec(`UPDATE furniture SET equipped = 0 WHERE id = ?`, id)
	} else {
		db.DB.Exec(`UPDATE furniture SET equipped = 1 WHERE id = ? AND owned = 1`, id)
	}
	UpdateHappinessBonus()
	return GetFurniture()
}

func UpdateFurnitureLayout(id int, x, y, w, h float64) error {
	_, err := db.DB.Exec(`UPDATE furniture SET x=?, y=?, w=?, h=? WHERE id=?`, x, y, w, h, id)
	return err
}
