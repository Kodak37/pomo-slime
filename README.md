# 🍅 ポモスライム

ポモドーロタイマーを回してコインを貯め、スライムを育てる Web アプリ。  
作業に集中しながらスライムのお世話ができる「ながら育成」がコンセプト。

**→ [pomo-slime.onrender.com](https://pomo-slime.onrender.com)**

![スライム部屋](https://pomo-slime.onrender.com/slime/idle.gif)

---

## 機能

- **ポモドーロタイマー** — 25分作業 + 5分休憩。連続回数でボーナスコイン
- **スライム育成** — コインで餌をあげて空腹度を管理。放置すると弱る
- **スライム部屋** — スライムが部屋を徘徊。状態によって動きが変わる
- **着せ替え** — ボディカラー7種 + 帽子3種
- **家具ショップ** — 家具を購入・設置するとコインボーナスUP
- **部屋テーマ** — 5種類から選択
- **ミニゲーム** — 食べ物キャッチゲームでコイン獲得
- **ログ** — ポモドーロ完了履歴を記録

---

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite |
| スタイル | Tailwind CSS |
| バックエンド | Go（REST API） |
| DB | PostgreSQL（Supabase） |
| 認証 | Supabase Auth（Google / GitHub OAuth） |
| デプロイ | Render（Docker マルチステージビルド） |

---

## ローカル起動

### 必要なもの

- Go 1.21+
- Node.js 18+
- PostgreSQL（または Supabase プロジェクト）

### バックエンド

```bash
cd backend
export DATABASE_URL="postgres://..."
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_ANON_KEY="..."
go run main.go
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

### Docker でまとめて起動

```bash
docker build -t pomo-slime .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://..." \
  -e SUPABASE_URL="https://xxx.supabase.co" \
  -e SUPABASE_ANON_KEY="..." \
  pomo-slime
```

---

## 環境変数

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `SUPABASE_URL` | Supabase プロジェクト URL |
| `SUPABASE_ANON_KEY` | Supabase anon キー（公開可） |
| `PORT` | サーバーポート（デフォルト: 8080） |

---

## ブランチ構成

```
main   → 本番（Render が自動デプロイ）
dev    → 開発作業場
```

---

## ライセンス

スライム GIF アセット: [cute-slime by zhengxiaoyao0716](https://zhengxiaoyao0716.itch.io/cute-slime)（CC0）
