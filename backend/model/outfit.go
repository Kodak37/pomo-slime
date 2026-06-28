package model

import "pomodoro-slime/db"

type Outfit struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Cost        int    `json:"cost"`
	BodyColor   string `json:"bodyColor"`
	HatType     string `json:"hatType"`
	Owned       bool   `json:"owned"`
	Equipped    bool   `json:"equipped"`
}

func GetOutfits() ([]Outfit, error) {
	rows, err := db.DB.Query(`SELECT id, name, description, cost, body_color, hat_type, owned, equipped FROM outfits ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Outfit
	for rows.Next() {
		var o Outfit
		var owned, equipped int
		if err := rows.Scan(&o.ID, &o.Name, &o.Description, &o.Cost, &o.BodyColor, &o.HatType, &owned, &equipped); err != nil {
			return nil, err
		}
		o.Owned = owned == 1
		o.Equipped = equipped == 1
		list = append(list, o)
	}
	if list == nil {
		list = []Outfit{}
	}
	return list, nil
}

func BuyOutfit(id int) ([]Outfit, error) {
	s, err := GetSlime()
	if err != nil {
		return nil, err
	}
	var cost int
	var owned int
	db.DB.QueryRow(`SELECT cost, owned FROM outfits WHERE id = ?`, id).Scan(&cost, &owned)
	if owned == 1 || s.Coins < cost {
		return GetOutfits()
	}
	db.DB.Exec(`UPDATE slime SET coins = coins - ? WHERE id = 1`, cost)
	db.DB.Exec(`UPDATE outfits SET owned = 1 WHERE id = ?`, id)
	return GetOutfits()
}

func EquipOutfit(id int) ([]Outfit, error) {
	db.DB.Exec(`UPDATE outfits SET equipped = 0`)
	db.DB.Exec(`UPDATE outfits SET equipped = 1 WHERE id = ? AND owned = 1`, id)
	return GetOutfits()
}

func GetEquippedOutfit() (*Outfit, error) {
	row := db.DB.QueryRow(`SELECT id, name, description, cost, body_color, hat_type, owned, equipped FROM outfits WHERE equipped = 1 LIMIT 1`)
	var o Outfit
	var owned, equipped int
	if err := row.Scan(&o.ID, &o.Name, &o.Description, &o.Cost, &o.BodyColor, &o.HatType, &owned, &equipped); err != nil {
		return nil, err
	}
	o.Owned = true
	o.Equipped = true
	return &o, nil
}
