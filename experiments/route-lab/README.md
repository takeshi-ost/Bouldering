# ASCENT Route Lab — 既存方式のオフライン試遊

本人限定URL: https://ascent-route-lab.activeboar15.chatgpt.site

- GitHub基準: `372855820cff937c1414cd741301559a60453279` / 0.4.6。
- 試作環境バージョン: 0.1.1。通常版の生成・操作・描画モジュールはバイト一致を検証してコピーします。
- **新しい生成方式は未実装**。Macの未push／未コミット変更は含みません。旧 `prototype.js` は配信しません。
- 「既存方式で試遊する」→タイトルTAP→STAGE 1→スタート。進行・記録・設定はメモリ内だけで、入口／最初から／再読み込みで消えます。

## 起動・テスト

Node.js 22以上。依存インストール不要。

```sh
git clone --branch experiment/route-lab --single-branch https://github.com/takeshi-ost/Bouldering.git
cd Bouldering/experiments/route-lab
npm run build
npm test
npm run dev
```

ローカルは `http://127.0.0.1:4173`。`BASELINE_ROOT` を指定する場合は同じ基準コミットの素材が必要です。`baseline-manifest.json` に固定した73ファイルのGit blob SHAが異なるとビルドを拒否します。

`public/game/` は再生成物でGit管理外。リポジトリの既存ルート素材から生成し、配信するのは `public/` だけです。リポジトリルートをWeb公開しないでください。

## 分離の実装

- 本番Firebase SDK・online・online-scores・引き継ぎ・アカウント削除・旧prototypeモジュールは配信物から除外。
- 代替APIはUIDなし、アダプターなし、送信キューなし、リモートプレイヤーなし。結果はこの試遊内の自分の記録のみです。
- CSP `connect-src 'none'` で通信を拒否。画像・スクリプト・CSSは同じSiteだけ。外部CDN、広告SDK、購入は使いません。
- 効果音8本＋BGM2本は元の音源をメモリに同梱。fetch互換関数はその10本だけをメモリから返し、他URLは拒否します。ネイティブfetchへ転送しません。
- localStorage/sessionStorage互換オブジェクトはメモリのみ。ブラウザに保存済みの値を一度も読みません。本番の保存・UIDを取得しません。
- iframeは `allow-scripts allow-same-origin`。これは同一Site内の資源を動かすためで、iframe自体を強いセキュリティ境界とは扱いません。分離の根拠は本番とは異なるSite origin、禁止CSP、配信対象除外、メモリ保存です。
- 外側の入口・リセット・履歴移動でiframeを破棄／作成し直します。キャンセルは現状維持。ゲームの広告は元から存在するローカル10秒ダミーで、その旨を表示します。
- 本人限定ログインはホスティング側のアクセス制御です。ゲームのFirebase認証とは別です。

## 検証

- 元コードの routes/input/rules/retry-stage-start/title-startup/course-generation/course-length: 7/7成功。routesは通常STAGE 1〜20を実入力処理でクリア。
- 配信物の隔離・ソース一致・HTTP範囲・書き込み拒否と試遊ランタイム: 3/3成功。
- 試遊ランタイムではSTAGE 1〜3をtouchstart/move/endの実ハンドラでクリア。旧prototype/debug拒否、リトライキャンセル、設定/言語、メモリ音源、外部fetch拒否、再起動時の進行消去を確認。
- ブラウザで入口→タイトル→マップ→STAGE 1開始まで確認。実iPhoneでのスワイプ・音声・表示は未検証。自動テストと実機検証を区別してください。
- Mac/iOSネイティブのテストや通常版全件スイートは実行していません。

## 公開の継続

Site ID: `appgprj_6adff062c06481919e9795ea2ec6c505`。同じIDとURLを継続利用し、本人限定を維持します。
GitHub試作ブランチへのpushだけではSiteは更新されません。`public/`を同サイトのソース `dist/` と同期し、検証済みコミットの保存バージョンを公開します。
通常版 `main`・既存GitHub Pagesの設定・デプロイ・Firebase設定は変更しません。
