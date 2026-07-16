package model

import "testing"

func TestPomodoroReward(t *testing.T) {
	cases := []struct {
		name           string
		pomodoroCount  int
		durationMin    int
		happinessBonus int
		want           int
	}{
		// 25分ちょうど・ボーナスなし: base=10
		{"baseline", 0, 25, 0, 10},
		// 連続回数でbaseが増える: base = 10 + 9/3 = 13
		{"streak", 9, 25, 0, 13},
		// baseは30で頭打ち: 10 + 90/3 = 40 -> 30
		{"base capped", 90, 25, 0, 30},
		// セッション長のズレでペナルティ: deviation=10 -> penalty40% -> 10*0.6=6
		{"duration penalty", 0, 35, 0, 6},
		// ペナルティ上限80%: deviation=25 -> 100% -> 80%上限 -> 10*0.2=2
		{"penalty capped", 0, 50, 0, 2},
		// 家具ボーナス: base10 + 10*20/20 = 20
		{"happiness bonus", 0, 25, 20, 20},
		// 極端なズレでもペナルティは80%止まり: base10 -> 10*0.2=2（1未満にはならない）
		{"penalty stays capped", 0, 120, 0, 2},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := pomodoroReward(c.pomodoroCount, c.durationMin, c.happinessBonus)
			if got != c.want {
				t.Errorf("pomodoroReward(%d,%d,%d) = %d, want %d",
					c.pomodoroCount, c.durationMin, c.happinessBonus, got, c.want)
			}
		})
	}
}

func TestMinigameReward(t *testing.T) {
	cases := []struct {
		game   string
		score  int
		want   int
		wantOK bool
	}{
		{"catch", 5, 15, true},     // 5 * 3
		{"catch", 1000, 100, true}, // 上限100でクランプ
		{"mole", 4, 16, true},      // 4 * 4
		{"dodge", 30, 30, true},    // 30 * 1
		{"dodge", 1000, 60, true},  // 上限60でクランプ
		{"catch", -5, 0, true},     // 負スコアは0
		{"unknown", 100, 0, false}, // 未知ゲームは付与しない
	}
	for _, c := range cases {
		got, ok := minigameReward(c.game, c.score)
		if got != c.want || ok != c.wantOK {
			t.Errorf("minigameReward(%q,%d) = (%d,%v), want (%d,%v)",
				c.game, c.score, got, ok, c.want, c.wantOK)
		}
	}
}

func TestFeedFood(t *testing.T) {
	cases := []struct {
		reqCost  int
		wantCost int
		wantGain int
	}{
		{5, 5, 10},
		{15, 15, 30},
		{30, 30, 60},
		// ホワイトリスト外（負値・任意値）は最安の餌にフォールバック
		{-1000000, 5, 10},
		{9999, 5, 10},
		{0, 5, 10},
	}
	for _, c := range cases {
		cost, gain := feedFood(c.reqCost)
		if cost != c.wantCost || gain != c.wantGain {
			t.Errorf("feedFood(%d) = (%d,%d), want (%d,%d)",
				c.reqCost, cost, gain, c.wantCost, c.wantGain)
		}
	}
}
