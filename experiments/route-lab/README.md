# ASCENT Route Lab — 環境準備

通常版を上書きせず、新しい生成方式を後から試すための独立した作業場所です。
今回は入口・配信範囲・分離チェックだけを用意しています。**新生成方式と試遊機能は未実装です。本人限定の環境確認ページを公開しました。**

## 基準と作業範囲

- リポジトリ: `takeshi-ost/Bouldering`
- ブランチ: `experiment/route-lab`
- 基準: GitHub `main` の `372855820cff937c1414cd741301559a60453279`（0.4.6）
- Mac上の新しいコミットや未コミット／未pushの変更は含めていません。
- 通常版・旧検証モードをロードせず、旧 `js/prototype.js` の再利用もしません。
- この環境は独立した `0.1.0` として管理し、通常版のリリース番号・読み込みハッシュを変更しません。

## 起動と検証

Node.js 22以上。依存パッケージのインストールは不要です。

```sh
git clone --branch experiment/route-lab --single-branch https://github.com/takeshi-ost/Bouldering.git
cd Bouldering/experiments/route-lab
npm test
npm run dev
```

ローカル確認先は `http://127.0.0.1:4173`。これは実行している端末内だけのURLで、スマートフォンから使える公開URLではありません。
`PORT` / `HOST` は検証用配信環境が必要とする場合のみ設定します。既定ではループバックだけに接続します。

## 分離

- 配信対象は `public/index.html` と `public/styles.css` のみ。ルートのゲーム、Firebaseモジュール、設定・ドキュメント等は配信しません。
- 入口は静的HTML/CSSのみ。JavaScript・通信・iframe・worker・フォームをCSPで禁止します。
- Firebaseの認証／匿名UID発行、ランキングへの読み書き、端末保存の読み書き、引き継ぎデータ取扱いはありません。
- CSPはHTTPヘッダーとHTML metaの両方に記載しています。外部ホストでもHTML側の通信拒否を維持してください。
- 将来プレイ機能を追加する際は、永続化を使わずメモリ内だけで開始し、本番とは別originで配信してください。別パスだけではブラウザ保存領域は分離されません。

## 外部URLの扱い

既存Pagesの確認URLは `https://takeshi-ost.github.io/Bouldering/` のままです。
GitHub Pagesは1リポジトリにつき1サイトで、指定されたソースから公開します。ブランチ作成だけで別の試遊URLは生成されません。
既存サイトのソース切替、mainへの追加、Pagesへのデプロイは行いません。

利用者の承認により、試作の入口だけを別originのChatGPT Sitesへ本人限定で公開しました。

- 環境確認URL: https://ascent-route-lab.activeboar15.chatgpt.site
- 本人のChatGPTアカウントでログインして利用します。他の閲覧者・グループは追加していません。
- Site ID: `appgprj_6adff062c06481919e9795ea2ec6c505`（今後も同じサイトを更新し、新規作成しない）
- 配信内容は `public/` の2ファイルだけ。Sites専用ソースにはこれらを `dist/` として保存し、同サイトの `.openai/hosting.json` で管理します。
- GitHubの試作ソース更新だけでは、このサイトは自動更新されません。公開時は同じSite IDのソースを同期し、検証済みの保存バージョンを配信します。
- 通常版のGitHub Pagesとは別originで、ルートゲームや本番Firebaseを配信・利用しません。
- リポジトリ全体のミラー配信、第三者の未承認プレビューサービス、新しいGitHubリポジトリの作成はしていません。

## 初期検証（2026-10-27）

- `npm test`: 静的ファイル範囲・通信禁止ポリシー・本番パス拒否・書き込み拒否の2テスト成功。
- Sites: ownerのみのアクセス設定と公開成功を確認。
- 通常版の全テスト・Mac/iOS実機テストは未実行（通常版のソースは変更なし）。
- クラウドのローカルプレビュー起動は基盤のタイムアウトで失敗。画面の目視・スマートフォン操作は未検証。

公式資料: [Pagesのサイト数](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[公開元の設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
