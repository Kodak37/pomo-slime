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

func GetOutfits(userID string) ([]Outfit, error) {
	rows, err := db.DB.Query(`
		SELECT o.id, o.name, o.description, o.cost, o.body_color, o.hat_type,
		       (uo.user_id IS NOT NULL) AS owned,
		       COALESCE(uo.equipped, FALSE) AS equipped
		FROM outfits o
		LEFT JOIN user_outfits uo ON uo.outfit_id = o.id AND uo.user_id = $1
		ORDER BY o.id
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []Outfit
	for rows.Next() {
		var o Outfit
		if err := rows.Scan(&o.ID, &o.Name, &o.Description, &o.Cost, &o.BodyColor, &o.HatType, &o.Owned, &o.Equipped); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	if list == nil {
		list = []Outfit{}
	}
	return list, nil
}

func BuyOutfit(userID string, id int) ([]Outfit, error) {
	s, err := GetSlime(userID)
	if err != nil {
		return nil, err
	}
	var cost int
	db.DB.QueryRow(`SELECT cost FROM outfits WHERE id = $1`, id).Scan(&cost)
	if s.Coins < cost {
		return GetOutfits(userID)
	}
	var owned bool
	db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM user_outfits WHERE user_id = $1 AND outfit_id = $2)`, userID, id).Scan(&owned)
	if owned {
		return GetOutfits(userID)
	}
	db.DB.Exec(`UPDATE slimes SET coins = coins - $1 WHERE user_id = $2`, cost, userID)
	db.DB.Exec(`INSERT INTO user_outfits (user_id, outfit_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, id)
	return GetOutfits(userID)
}

func EquipOutfit(userID string, id int) ([]Outfit, error) {
	db.DB.Exec(`UPDATE user_outfits SET equipped = FALSE WHERE user_id = $1`, userID)
	db.DB.Exec(`UPDATE user_outfits SET equipped = TRUE WHERE user_id = $1 AND outfit_id = $2`, userID, id)
	return GetOutfits(userID)
}
