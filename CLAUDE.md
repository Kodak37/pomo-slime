# ポモドーロ × スライム育成アプリ

## プロジェクト概要

ポモドーロタイマーを回すとコインが貯まり、スライムを育てられるWebアプリ。
タスクバーヒーローのようにながら作業で楽しめるコンセプト。

## MVP機能

- [ ] ポモドーロタイマー（25分作業 + 5分休憩）
- [ ] タイマー完了ごとにコイン獲得（連続回数で増加）
- [ ] スライムの表示
- [ ] コインで餌をあげられる
- [ ] 空腹度メーター（餌をあげないと減っていく）
- [ ] 空腹度が0になるとスライムが弱る

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite |
| スタイル | Tailwind CSS |
| バックエンド | Go（REST API） |
| DB | SQLite（`modernc.org/sqlite` ドライバ使用） |
| 通信 | REST API（まずシンプルに、後からWebSocket検討） |

## ディレクトリ構成

```
hoge/
├── backend/          # Go
│   ├── main.go
│   ├── handler/
│   ├── model/
│   └── db/
├── frontend/         # React + Vite
│   ├── src/
│   │   ├── components/
│   │   └── App.tsx
│   └── package.json
└── CLAUDE.md
```

## Git ルール

### ブランチ構成

```
main        → 動く状態のみ
dev         → 開発作業場
feature/xxx → 機能単位で切る
```

### ブランチ命名

```
feature/timer       ポモドーロタイマー
feature/coin        コイン獲得ロジック
feature/slime       スライム表示・状態管理
feature/feed        餌やり機能
feature/ui-polish   UI調整
```

### コミットメッセージ

```
feat: 機能追加
fix:  バグ修正
chore: セットアップ・設定変更
style: UIの見た目調整
```

例：
```
feat: ポモドーロタイマー25分カウントダウン実装
feat: タイマー完了時にコイン加算するAPIエンドポイント追加
fix: タイマーがリセットされないバグ修正
```

## 開発の進め方

1. `main` から `dev` ブランチを切る
2. 機能ごとに `feature/xxx` を `dev` から切る
3. 機能完成したら `dev` にマージ
4. 全機能揃ったら `main` にマージ

## APIエンドポイント設計（予定）

```
GET  /api/slime          スライムの状態取得
POST /api/pomodoro/done  ポモドーロ完了→コイン加算
POST /api/feed           餌やり→空腹度回復・コイン消費
GET  /api/coins          コイン残高取得
```

## 将来の拡張（MVPには含めない）

- スライムの着せ替え
- 食べ物の種類追加（高級エサ）
- サブスクリプションプラン
- WebSocketによるリアルタイム更新
