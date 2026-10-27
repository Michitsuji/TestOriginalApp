# SkillMap Pro（スキルマップ管理システム / `testoriginalapp`）📊🚀

> **組織・チームのスキル可視化・目標管理・半期評価を一元化するクラウド型人材育成プラットフォーム**  
> GitHubリポジトリ: `michitsuji/testoriginalapp` ｜ Vercelプロジェクト: `testoriginalapp`

---

## 📌 概要

**SkillMap Pro**（Vercelプロジェクト名: `testoriginalapp`）は、チームメンバー一人ひとりの保有スキルレベル、次期目標、上長評価、および1on1フィードバックをリアルタイムに管理・可視化するWebアプリケーションです。

既存のFirebase基盤（`duofit-app-75cb2`）を共有しつつ、**完全に独立したデータベース名前空間（`appId = 'skillmap-pro-app'`）** と専用プレフィックス（`sm_mem_`, `sm_skl_`, `sm_prd_`, `sm_evl_`, `sm_bkp_`）で設計されているため、他アプリ（WithFit等）のデータと干渉することなく安全に稼働します。

---

## ✨ 主要機能一覧

### 1. メンバー専用ワークスペース（Member View）
- **自己評価 & 次期目標入力**
  - スキルカテゴリ別に「現在の自己評価（Lv.1〜Lv.5）」と「今期の目標レベル」を直感的なボタン操作で入力・即時クラウド保存。
  - 項目ごとのメモ・自己PR・取り組み状況の記入機能。
- **成長推移 & レーダーチャート分析（Growth）**
  - カテゴリ別習熟度バランスをSVGレーダーチャートでリアルタイム描画（現在値・目標値・前期実績の重ね合わせ表示）。
  - 過去期間とのスコア比較、成長ギャップ（目標までの差分）の可視化。
- **スキル評価基準ガイド（Guide）**
  - Lv.1（基礎・学習中）〜 Lv.5（全社牽引・変革）の5段階定義と、各スキル項目の達成基準（クライテリア）をいつでも参照可能。

### 2. グループ長・管理者ワークスペース（Manager View）
- **全体スキルマトリクス（Matrix）**
  - 全メンバー × 全スキル項目の習熟度をヒートマップ形式の一覧表で俯瞰。
  - 「上長確定スコア」「自己評価スコア」「目標との差分（ギャップ）」の表示モード切替。
  - セルをクリックして個別メンバーの評価確定・1on1フィードバックコメントを即座に入力できる詳細ドロワー。
- **組織アナリティクス & ボトルネック分析（Analytics）**
  - チーム全体の平均スキルレベル、一人前基準（Lv.3以上）達成率、高難度スキル保有者数の自動集計。
  - 要強化スキル（Lv.3以上の保有者が少ない業務項目）のアラート抽出による育成優先度の可視化。
- **メンバー管理（Members）**
  - メンバーの追加・編集・等級（グレード）・役職・所属部署・個別PINコードの設定。
- **スキル項目マスター管理（Skills）**
  - スキルカテゴリ・評価項目の追加・編集・並び替え・重要スキル（Core）指定・有効/無効切替。
- **評価期間管理 & スコア引き継ぎ（Periods）**
  - 半期・四半期ごとの評価期間作成、前期スコアをベースにした初期値一括コピー機能、過去期間の編集ロック機能。
- **データ保全・エクスポート**
  - CSV出力（Excel分析用）、JSONフルバックアップ出力、およびFirestoreクラウドスナップショット保存・復元機能。

---

## 🛠️ 技術スタック & データベース分離設計

| 項目 | 内容 |
| :--- | :--- |
| **フロントエンド** | React 19, Tailwind CSS, Lucide React |
| **ホスティング / CI** | Vercel（Project: `testoriginalapp`）, GitHub Actions |
| **GitHub リポジトリ** | `https://github.com/michitsuji/testoriginalapp` |
| **データベース** | Firebase Firestore（専用名前空間: `artifacts/skillmap-pro-app/public/data/...`） |
| **ローカルキャッシュ** | IndexedDB オフライン永続化 ＋ `localStorage`（`sm_*` プレフィックス） |

---

## 📁 ディレクトリ構成

```text
testoriginalapp/
├── .github/
│   └── workflows/
│       └── apply_changes.yml     # スマホからchanges.jsonコミット時にクラウドで自動置換するCI
├── public/
│   ├── index.html
│   ├── icon.svg
│   └── manifest.json             # PWAマニフェスト
├── src/
│   ├── App.js                    # アプリケーション本体（メンバー画面・管理者画面・Firestore同期）
│   ├── App.css
│   ├── index.js
│   ├── index.css
│   ├── apply_changes.js          # changes.json をソースコードに自動適用するスクリプト
│   └── changes.json              # AI変更差分ファイル
├── apdate.bat                    # PCからのワンクリック更新・GitHub同期スクリプト
├── update.bat                    # apdate.bat と同等の更新スクリプト
├── deploy_skillmap.bat           # apdate.bat と同等のデプロイスクリプト
├── reset_github.bat              # PCからGitHubリポジトリを一発で強制クリーン化するスクリプト
├── rollback_previous_app.bat     # 直前のコミット(HEAD~1)へ1クリックでロールバックする緊急バッチ
├── start_local.bat               # ローカル開発サーバー(http://localhost:3000)起動バッチ
├── package.json                  # 依存関係およびクラウド自動適用ビルドコマンド
├── postcss.config.js
└── tailwind.config.js
```

---

## 🚀 デプロイ & コード更新フロー

本プロジェクトは **GitHub（`michitsuji/testoriginalapp` の `main` ブランチ）へのプッシュを検知して、Vercel（`testoriginalapp`）が自動的にビルド＆本番公開** を行います。

### 方法A: PCから更新する場合（`apdate.bat`）

1. AIから出力された `changes.json` を `src/changes.json` に配置します。
2. フォルダ内の **`apdate.bat`**（または `update.bat`）をダブルクリックします。
3. 自動で `node src/apply_changes.js` が実行されてコードが置換され、`https://github.com/michitsuji/testoriginalapp.git` へコミット＆プッシュされます。
4. 1〜2分後にVercel（`testoriginalapp`）の自動デプロイが完了します。

> 💡 **GitHub内のフォルダ構成を最初から綺麗にリセットしたい場合**  
> 解凍したフォルダ内の **`apdate.bat`** または **`reset_github.bat`** をダブルクリックするだけで、GitHubの `main` ブランチがこの綺麗なフォルダ構造で強制上書き（Force Push）されます。

---

### 方法B: スマホからPCなしで更新する場合（Mobile Deploy）

`package.json` のビルド設定に `"build": "node src/apply_changes.js && CI=false react-scripts build"` および GitHub Actions（`.github/workflows/apply_changes.yml`）が組み込まれているため、**スマホ単体でコード更新・デプロイが可能**です。

1. **GitHubスマホアプリ**（またはスマホブラウザ）で `michitsuji/testoriginalapp` リポジトリを開きます。
2. `src/changes.json` をタップし、右上の **「…」 → 「編集（Edit）」** を開きます。
3. AIが出力した `changes.json` の中身を貼り付けて **「コミット（Commit）」** を押します。
4. GitHub Actions と Vercel（`testoriginalapp`）がクラウド上で自動的に `apply_changes.js` を実行して `src/App.js` を書き換え、約1〜2分で本番環境へ自動デプロイされます。

---

## 📄 ライセンス

Private Project (Created by ゆうた / michitsuji)
