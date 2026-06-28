# ポモドーロ × スライム育成アプリ

## プロジェクト概要

ポモドーロタイマーを回すとコインが貯まり、スライムを育てられるWebアプリ。
タスクバーヒーローのようにながら作業で楽しめるコンセプト。

## MVP機能

- [x] ポモドーロタイマー（25分作業 + 5分休憩）
- [x] タイマー完了ごとにコイン獲得（連続回数で増加）
- [x] スライムの表示（GIFアニメーション）
- [x] コインで餌をあげられる
- [x] 空腹度メーター（餌をあげないと減っていく）
- [x] 空腹度が0になるとスライムが弱る

### MVP以外で実装済みの機能

- [x] 着せ替え（ボディカラー7種 + 帽子3種）
- [x] 家具ショップ（7種、コインボーナスUP）
- [x] 部屋テーマ切り替え（5種）
- [x] ポモドーロログ
- [x] スライム名前変更
- [x] ミニゲーム（食べ物キャッチ）
- [x] 部屋ビュー（スライムが部屋を徘徊）

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite |
| スタイル | Tailwind CSS |
| バックエンド | Go（REST API） |
| DB | SQLite（`modernc.org/sqlite` ドライバ使用・CGO不要） |
| 通信 | REST API |
| デプロイ | Render（Dockerマルチステージビルド） |

## ディレクトリ構成

```
hoge/
├── backend/
│   ├── main.go           # ルーティング・静的ファイル配信・PORT対応
│   ├── handler/
│   │   └── debug.go      # 開発用コインチャージAPI（本番でも残ってる、要削除）
│   ├── model/
│   └── db/
├── frontend/
│   ├── public/
│   │   └── slime/        # GIFアセット（CC0）
│   │       ├── idle.gif  # 待機アニメーション（状態: normal/hungry/dying）
│   │       ├── jump.gif  # ジャンプ（状態: slightly_happy）
│   │       └── move.gif  # 歩き（状態: happy）
│   ├── src/
│   │   ├── components/
│   │   │   ├── SlimeRoom.tsx    # 部屋ビュー（スライム徘徊・HUD）★メイン
│   │   │   ├── Slime.tsx        # スライム単体コンポーネント（設定タブ等で使用）
│   │   │   ├── PomodoroTimer.tsx
│   │   │   ├── FeedPanel.tsx
│   │   │   ├── Customization.tsx
│   │   │   ├── Shop.tsx
│   │   │   ├── RoomSettings.tsx
│   │   │   ├── PomodoroLog.tsx
│   │   │   └── MiniGame.tsx
│   │   └── App.tsx
│   └── package.json
├── Dockerfile            # マルチステージビルド（Node→Go→Alpine）
├── render.yaml           # Render設定
└── CLAUDE.md
```

## Git ルール

### ブランチ構成

```
main        → 動く状態のみ
dev         → 開発作業場（現在ここが最新）
feature/xxx → 機能単位で切る
```

### 現在のブランチ状態

- `main` — 部屋ビュー実装前の安定版（まだデプロイ設定が入っていない）
- `dev` — 最新（GIF化・部屋ビュー・Renderデプロイ設定済み）← **ここが最新**
- `feature/slime-gif` — dev にマージ済み

**→ main への最終マージがまだ。Renderでデプロイするには main を更新する必要あり。**

### コミットメッセージ

```
feat: 機能追加
fix:  バグ修正
chore: セットアップ・設定変更
style: UIの見た目調整
```

## 開発の進め方

1. `dev` から `feature/xxx` を切る
2. 機能完成したら `dev` にマージ
3. 全機能揃ったら `main` にマージ → Render が自動デプロイ

## APIエンドポイント（実装済み）

```
GET  /api/slime              スライムの状態取得
PUT  /api/slime/name         名前変更
POST /api/pomodoro/done      ポモドーロ完了→コイン加算
POST /api/feed               餌やり→空腹度回復・コイン消費
GET  /api/logs               ポモドーロ履歴
GET  /api/outfits            着せ替え一覧
POST /api/outfits/{id}/buy   着せ替え購入
POST /api/outfits/{id}/equip 着せ替え装備
GET  /api/furniture          家具一覧
POST /api/furniture/{id}/buy     家具購入
POST /api/furniture/{id}/toggle  家具設置/撤去
GET  /api/room               部屋テーマ取得
PUT  /api/room               部屋テーマ変更
POST /api/debug/coins        【開発用】コイン追加（本番前に要削除）
```

## デザイン方針（v2）

- **ドット調UI**: フォントは "Press Start 2P"（Google Fonts）、ピクセルボーダー、レトロカラーパレット
- **画面分離**: タブ切り替えで「作業モード（タイマーのみ）」と「スライムモード（育成）」を分ける
  - 作業中は集中のためスライムを見せない
  - 休憩タイムになったら自動でスライムタブへの通知
- **スライムアセット**: CC0ライセンスの cute-slime（itch.io: zhengxiaoyao0716）
  - 色変更は CSS `hue-rotate()` フィルターで実現（ベースHue: 200°）
  - 状態別GIF: idle（dying/hungry/normal/待機中）、jump（slightly_happy）、move（happy）
- **スライムの5段階状態**:
  - `dying`（hunger < 15）: grayscale + 暗め、ほぼ動かない
  - `hungry`（hunger 15〜34）: 彩度低下、のろい動き
  - `normal`（hunger 35〜59）: 通常
  - `slightly_happy`（hunger 60〜79）: ジャンプ
  - `happy`（hunger ≥ 80）: 高速移動

## デプロイ（Render）

- GitHub: `https://github.com/Kodak37/pomo-slime.git`
- **Renderデプロイ手順**:
  1. https://render.com → New Web Service
  2. GitHubリポジトリ接続（Kodak37/pomo-slime）
  3. Runtime: Docker（自動検出）/ Branch: main
  4. Create → 5〜10分でビルド完了
- **注意**: Renderの無料プランはSQLiteが揮発（再デプロイでDBリセット）
  - コイン・スライム状態・購入履歴などがリセットされる
  - 本格運用にはRender Disk（有料）かPostgreSQLへの移行が必要

## TODO（作業再開時）

- [ ] `dev` → `main` マージ＆プッシュ（Renderデプロイに必要）
- [ ] ログイン機能（未実装。現状は全員が同じスライムを共有）
- [ ] `backend/handler/debug.go` の本番前削除 or 認証付きに変更
- [ ] Renderの無料プランDB揮発問題の対処

## 将来の拡張（MVPには含めない）

- ログイン・ユーザー管理（デプロイ後に必要）
- スライムの着せ替え追加
- 食べ物の種類追加（高級エサ）
- サブスクリプションプラン
- WebSocketによるリアルタイム更新
