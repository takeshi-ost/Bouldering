# ASCENT のローカル iOS 版

基準は Web 版 0.3.10、コミット `15e482dc3b12587b35dcad629b5065b74bfb3e5a`。
`feature/ios-app` の別 worktree で作成した。既存 main の作業フォルダと公開 Web は変更していない。
このブランチの共通ソースでは、後述の説明モーダル修正と版番号・assets 参照の更新だけを行った。ゲーム本体・音源・画像は維持している。
ユーザー承認によりローカルコミットへ保存する。push・merge・公開は行わない。
最初のローカルコミット `cb13aae` では `AGENTS.md` に従いソースを 0.3.11／ビルド4 とし、その時点ではインストール版 0.3.10／ビルド3 を維持した。
その後、下記の Debug／Release 対応を 0.3.11／ビルド4 で両構成ともビルド・検証した。ユーザー承認により追加分を新規ローカルコミットへ保存する。保存時のソースは規約に従い 0.3.12／ビルド5 としたが、再ビルド・再インストールはしていない。18 Pro のインストール済み検証版は Release 0.3.11／ビルド4 のまま。差は版番号・ビルド番号と config の assets ハッシュ。

## 用途と制限

- アプリ名: ASCENT Local
- 仮 Bundle ID: `local.ascent.simulator.t20261024`。シミュレーター検証専用で、正式な ID ではない。
- ソースの表示バージョン: 0.3.12、ビルド番号: 5、iOS 最低バージョン: 15.0。
- Firebase は無効。実装・接続設定を含む `js/firebase-client.js` を同梱しない。
- 生成する HTML に CSP を追加。外部スクリプト・外部通信・iframe・フォーム送信を禁止する。同梱音声の fetch のため `connect-src 'self'` のみ許可する。
- Firebase の匿名認証、ユーザー作成、プロフィール・ランキング更新は起動しない。引継ぎ・オンラインランキングは検証対象外。
- 広告は既存の仮広告。実広告 SDK、追加の Capacitor プラグイン、CocoaPods は導入しない。
- 保存領域はアプリのローカル領域であり、Web ブラウザの進捗・認証情報を自動的には引き継がない。
- Apple アカウント、実機署名、配布設定は未設定。

## ツール

- Node.js 24.22.1 LTS / npm 11.19.1
- `@capacitor/core`、`@capacitor/ios`、`@capacitor/cli`: 8.5.3 に固定
- Swift Package Manager で公式 `ionic-team/capacitor-swift-pm` 8.5.3 を解決
- Xcode 27.1 / iOS SDK 27.1

公式互換条件は [Capacitor の環境設定](https://capacitorjs.com/docs/getting-started/environment-setup) を参照。
Capacitor 8 は Node.js 22 以上・Xcode 26 以上を要求する。
Node は [公式配布](https://nodejs.org/dist/v24.22.1/) の Apple Silicon バイナリと SHA-256 を照合して使用した。
今回の Node は worktree の隣の `.tools/node-v24.22.1-darwin-arm64/` にあり、システムの PATH やシェル初期化設定は変更していない。

## 再現手順

リポジトリのルートで実行する。Node の場所が異なる場合は PATH を読み替える。

```sh
export PATH="$(pwd)/../.tools/node-v24.22.1-darwin-arm64/bin:$PATH"
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org
npm run sync:ios
npm test
python3 tests/text-static.py
```

`sync:ios` は `www/` を作り直してから native public にコピーし、安全性テストを実行する。
`www/`、native public、node_modules、ビルド出力は Git の管理対象外。

シミュレーター向けの署名なしビルド:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/DerivedData -packageAuthorizationProvider netrc \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
npm run verify:ios-build
```

`-packageAuthorizationProvider netrc` はこのビルドの公開パッケージ取得に Keychain を使わないための指定。
今回の環境では `.netrc` が存在しないことだけを確認し、認証情報を読まずに取得した。
セキュリティ設定変更、署名検証・パッケージ検証の無効化は行っていない。
Xcode 27 ではシミュレーター画面は Device Hub に表示される。

## テスト結果の読み方

2026-10-24 の Node 24.22.1 で CJS 46 ファイル中 41 が合格。
追加した `tests/ios-assets.cjs` と既存の `tests/text-static.py` は合格。
Firebase adapter の既存テストはモックを使用し、本番へ接続しない。

以下の 5 件は、未変更の基準コミットを別の一時ディレクトリへ展開しても同じエラーで失敗した。
この iOS 作業ではゲーム本体や既存テストを変更していない。

| テスト | 基準コミットでも再現した失敗 |
| --- | --- |
| dense-hazards.cjs | `assert(moves<=20)` |
| prototype.cjs | `Redundant hold 5/59` |
| routes.cjs | `Course choice missing` |
| rules.cjs | 状態 `ad` に対して `map` を期待 |
| wallpaper.cjs | `COURSE_HEART_IMAGE_SRC is not defined` |

`npm test` はこれらを隠さず失敗として返す。実機の音声・操作・熱・消費電力・iOS 最低バージョンの互換性は別途検証が必要。

## シミュレーター検証

Xcode 27.1 / iOS 27.1 の iPhone Duo で署名なしビルドが成功し、インストール・起動できた。
以下を Device Hub の実画面で確認した。

- タイトルの VERSION 0.3.10、オフライン検証の表示、TAP の準備完了
- ステージマップ、STAGE 1 の開始前情報、スタート後の演出とプレイ画面
- スワイプに応じたプレイヤーの姿勢変化（クリアまでの通しプレイは未実施）
- Home へ移動してバックグラウンド化した後、アプリアイコンから復帰し、同じステージ・姿勢・スタミナを維持
- 復帰後の設定モーダル、オフライン表示、音楽・効果音のチェックボックスと音量スライダー

音声は audio / audio-files / audio-settings / bgm の自動テストが合格した。
初回は Mac の実際の音声出力を遠隔では聴取できず未確認だったが、修正後にユーザーが BGM・SE の実音と STAGE 1 クリア後のマップ復帰を確認した。復帰後の実音や全曲の通し再生は別途確認が必要。
通信をパケットキャプチャで計測したわけではなく、Firebase 除外と CSP の検査、実際にビルドされた同梱 HTML / bootstrap の一致で本番接続を防いでいる。

最初の xcodebuild は SPM の公開バイナリ取得時に既定の Keychain 認証プロバイダーで待機したため中断・終了した。
ユーザーはその github.com 資格情報アクセスを拒否した。資格情報・Keychain 設定は変更せず、そのアクセスは再試行していない。
成功したビルドは前述の `-packageAuthorizationProvider netrc` 指定による認証情報を使わない公開取得。

## BGM のローカル iOS 修正（2026-10-24）

ユーザーから BGM が鳴らないとの報告があり、以下を実行時の音声状態で確認した。

- 修正前: 音楽 ON・音量 1、AudioContext は running、表示中なのに BGM 2 曲の読込が失敗し、キャッシュは 0 バイト、再生なし。
- Capacitor の WebViewAssetHandler は同梱メディアに HTTP ステータスを持たない URLResponse を使用する。実際の fetch は有効な音源バイトを返すが status 0 / ok=false となり、既存ローダーが拒否していた。
- `scripts/native-audio-fetch.js` を生成する iOS assets にだけ追加。Capacitor の同一ホスト・既知の音源 7 ファイル・GET・非 opaque・非空の status 0 応答だけを 200 の Response にする。外部 URL、別ホスト、未知のパス、POST、HTTP エラーは補正しない。
- CSP、外部通信遮断、Firebase 除外、Web の元ファイル、ユーザーの保存設定は維持。
- 修正後: main MP3 1,321,318 バイト、stage MP3 1,721,514 バイトを取得。main は 66 秒の AudioBuffer にデコードされ、AudioContext の時間が進み、再生中を確認。ユーザーから「BGMが聞こえています」と実音確認を受けた。
- ステージ音源の読込は確認済み。修正後のステージ曲の通し再生・バックグラウンド復帰後の実音は未確認。
- Mac の出力は読み取りでミュート OFF・音量約 62%、シミュレーターの音量は約 60%、出力は Speaker。設定は変更していない。

追加の native audio fetch テストと既存 audio / audio-files / audio-settings / bgm テスト、生成 assets とビルド済み assets の安全性検査、署名なしビルドが合格。
既存の全体テスト 5 件の失敗は修正していない。

SceneDelegate の Debug 専用診断は `ASCENT_AUDIO_DIAGNOSTICS=1` の実行時のみ、音声状態をアプリの Caches に有限回記録する。
`ASCENT_AUDIO_PROBE=1` は診断用に音声開始を試すフラグで、通常起動は従来のユーザー操作で開始する。
ゲームのセーブ・識別情報・資格情報は診断に含めない。上書きインストール前に、このアプリの localStorage を build 内へ読み取りバックアップした。アプリの削除・データリセットはしていない。

機種確認: iPhone 13 Pro の simulator type は iOS 27.0 runtime で利用可能だが、13 Pro の仮想端末は未作成。
既存の iPhone 18 Pro / iOS 27.0 と iPhone Duo / iOS 27.1 は利用可能。
修正版は当初 Duo で確認後、承認に従い既存 18 Pro にもインストールした。13 Pro の新規作成・runtime の追加ダウンロードは行っていない。

## 説明モーダル修正と最終確認

共通 HTML/CSS の説明モーダルは、高さが画面高から 40px を引いた上限で、閉じる文字も絵文字だった。18 Pro でほぼ全画面に広がる状態を再現した。
説明モーダルだけを最大 560px かつ safe-area を差し引いた高さに制限し、見出しを固定した flex 配置で本文だけをスクロールさせる。閉じる文字を他と同じ `×` にし、既存共通の 44px 操作領域・色・位置の CSS を利用する。閉じた dialog を display:flex にしないよう `[open]` のみを対象とする。
説明の文章やゲーム挙動は変更していない。共通 Web ソースの設計に由来し、iOS 専用の CSS ではない。別の Web ブラウザでの実画面比較は未実施。

- 18 Pro／iOS 27.0 へ 0.3.10／ビルド3 を反映し、縦画面で安全領域を避けたカードと共通の閉じる表示を確認。
- ユーザーが説明のスクロール・閉じる操作を確認済み。Daily 入口からの実画面での開閉・再表示は未確認。
- 新規 help-dialog と既存 title-startup / daily / input / language / ios-audio-fetch の6テスト、静的文言検査、安全性検査、署名なしビルドが合格。
- 全体テストの既存5件の失敗は今回変更していない。今回の最終保存時は重い全体テスト・ビルドを繰り返していない。
- 18 Pro の上書き前に同端末のアプリ内 localStorage を読み取りバックアップした。ゲームの削除・リセット・Duo からのデータ移植はしていない。
- ユーザーの発熱対応の依頼で Duo だけ shutdown。18 Pro は起動したまま維持し、Duo のアプリ・セーブは削除していない。

## Debug／Release の切替

Firebase 無効・外部通信禁止は今回のローカル検証用設定であり、ビルド構成と独立して両方に適用する。Release へ切り替えても本番接続は有効にならない。

| 構成 | ゲーム内デバッグ |
| --- | --- |
| Debug | 設定に切替を表示。初期値 OFF、ON/OFF を操作可能 |
| Release | OFF 固定。切替・任意ステージ・検証コース・デバッグ削除等の UI を非表示 |

Xcode では `ios/App/App.xcodeproj` を開き、**Product → Scheme → Edit Scheme → Run → Info → Build Configuration** で Debug または Release を選ぶ。実行先は iPhone 18 Pro の Simulator を選ぶ。これは実機署名・Archive・App Store 公開の手順ではない。

コマンドで再現する場合は、リポジトリのルートで assets を更新してから両構成を直列にビルドする。

```sh
export PATH="$(pwd)/../.tools/node-v24.22.1-darwin-arm64/bin:$PATH"
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
npm run sync:ios

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=70062A63-64BF-4D6C-8004-D28A596DB797' \
  -derivedDataPath build/DerivedData -packageAuthorizationProvider netrc \
  -disableAutomaticPackageResolution -jobs 2 \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
node tests/ios-assets.cjs --built

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=70062A63-64BF-4D6C-8004-D28A596DB797' \
  -derivedDataPath build/DerivedData -packageAuthorizationProvider netrc \
  -disableAutomaticPackageResolution -jobs 2 \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
node tests/ios-assets.cjs --built --release
```

アプリは次の別々の場所に生成される。同じ仮 Bundle ID なので、Simulator 上では上書きして構成を切り替える（ゲームの削除やデータリセットは不要）。

- Debug: `build/DerivedData/Build/Products/Debug-iphonesimulator/App.app`
- Release: `build/DerivedData/Build/Products/Release-iphonesimulator/App.app`

必要な方を `xcrun simctl install <対象UDID> <App.appのパス>` で入れ、`xcrun simctl launch --terminate-running-process <対象UDID> local.ascent.simulator.t20261024` で起動する。インストール先 UDID は操作前に必ず確認する。

### 強制条件と検証

- Native 側が Xcode のコンパイル条件と `ASCENTBuildConfiguration` から固定ポリシーを作り、ページ読込の最初に凍結・再定義不可の `ASCENT_IOS_BUILD` を渡す。Native でポリシーが欠けた場合もデバッグ許可は false。
- Copy Bundle Resources の後に `prepare-ios-build.sh` が**構成別の生成物だけ**を加工する。Release の `debugMode` は `const false`、Debug は切替可能な `let`。共有の `www` や native public の元ソースをこのフェーズで書き換えない。
- Release では通常の切替関数を拒否し、検証コース・デバッグステージ開始・旧デバッグ挑戦の再試行を拒否する。初期値 false だけに頼らない。
- 現在のゲームには debug 状態の保存・URL復元はない。旧設定を想定して `ascent.debug-mode.v1=true` を1キーだけ実際の18 Proに一時注入し、Release の設定画面にデバッグ切替・検証コース等が現れないことを確認した。
- テストキーは元の値または未保存状態に復元済み。他の localStorage 全行が検証前後で一致することも確認した。Duo は shutdown のまま、データ移植・削除・リセットは行っていない。
- Debug の実画面で切替 ON/OFF と開発用項目の表示／非表示を確認。Release の実画面で切替 UI が非表示であることを確認。
- 自動テストは旧保存値・URL指定・Release定数への直接代入・旧デバッグ挑戦・検証コース経路を検証し、Debug→Release／Release→Debug の生成で混ざらないことを確認する。
- 両ネイティブビルド、構成別 assets の安全性・変数の可変性・構成マーカーの検査に合格。署名アカウント・資格情報・公開は使用していない。

追加テスト: `node tests/build-policy.cjs`。実機、App Store 用 Release、Release での全ステージ通しプレイは未検証。
