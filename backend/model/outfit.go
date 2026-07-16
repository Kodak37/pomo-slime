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

// BuyOutfit は着せ替えを購入する。1トランザクション内で
// 「INSERT（所有権を取る）→ 残高チェック付き減算」を行い、原子性とレース耐性を確保する。
//   - INSERT ... ON CONFLICT DO NOTHING を所有権のゲートにする。主キー(user_id,outfit_id)
//     により同一アイテムの同時購入は直列化され、勝った1件だけが RowsAffected==1 になる。
//   - 減算は `coins >= cost` を条件に1文で行い、残高不足なら ROLLBACK で INSERT ごと取り消す。
//
// これにより「同一アイテムの二重課金」「別購入での残高二重使用(TOCTOU)」の双方を防ぐ。
func BuyOutfit(userID string, id int) ([]Outfit, error) {
	tx, err := db.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// cost はゼロ値のまま進めない。存在しないIDなら ErrNoRows で中断する。
	var cost int
	if err := tx.QueryRow(`SELECT cost FROM outfits WHERE id = $1`, id).Scan(&cost); err != nil {
		return nil, err
	}

	// INSERT を所有権のゲートにする。既に所有 or 同時購入の敗者なら RowsAffected==0。
	res, err := tx.Exec(`INSERT INTO user_outfits (user_id, outfit_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, id)
	if err != nil {
		return nil, err
	}
	if n, err := res.RowsAffected(); err != nil {
		return nil, err
	} else if n != 1 {
		return GetOutfits(userID) // 所有済み: 課金せず現状返却
	}

	// 残高チェックと減算を1文にまとめる。RowsAffected==0 は残高不足 → ROLLBACK で INSERT も取消。
	res, err = tx.Exec(`UPDATE slimes SET coins = coins - $1 WHERE user_id = $2 AND coins >= $1`, cost, userID)
	if err != nil {
		return nil, err
	}
	if n, err := res.RowsAffected(); err != nil {
		return nil, err
	} else if n != 1 {
		return GetOutfits(userID) // 残高不足
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetOutfits(userID)
}

func EquipOutfit(userID string, id int) ([]Outfit, error) {
	if _, err := db.DB.Exec(`UPDATE user_outfits SET equipped = FALSE WHERE user_id = $1`, userID); err != nil {
		return nil, err
	}
	if _, err := db.DB.Exec(`UPDATE user_outfits SET equipped = TRUE WHERE user_id = $1 AND outfit_id = $2`, userID, id); err != nil {
		return nil, err
	}
	return GetOutfits(userID)
}
