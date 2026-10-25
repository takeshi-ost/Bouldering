# ASCENT のローカル iOS 版

Firebase の現在の準備・承認済み読取専用テストは [ios-firebase-read-only.md](ios-firebase-read-only.md) を参照。
通常ビルドは引き続き通信無効。実機のテスト版だけ、明示した read-only モードで認証と読み取りを許可する。

## 音声復帰の原因と修正

前回の復帰処理は、ユーザーの実機ではタップ・設定切替後も復旧しなかった。模擬テスト合格を実機解決とは扱わない。
実機検証用の Release 0.3.12／ビルド5 では、ゲームデバッグを OFF に保ち、一時的な音声専用診断で現象を記録した。保存するソースでは記録処理を Debug 専用へ戻し、Release では環境変数に関係なく記録しない。Debug も `ASCENT_AUDIO_DIAGNOSTICS=1` を明示した場合だけ最大300回・2秒間隔で記録する。JavaScript の診断履歴もこの Debug 診断時以外は収集しない。
内容は音声のフラグ・音量・context時刻・再生ノード有無・resumeの結果・ネイティブイベントと音声セッション・viewport寸法のみで、セーブ・アカウント・認証情報は読まない。ファイルの取得先は Git 管理外の build/。
実機の再現ログを build/physical-audio-reproduction-215108.json に保全した。中断前は running・時刻進行・BGMノードあり・Speaker。復帰通知は届いており、resume が一度 InvalidStateError / Failed to start the audio device で失敗。その後 running に戻り BGM ノードも再作成されたが、AudioContext.currentTime は337.552のまま約36秒停止した。ネイティブの setActive エラー・音量ゼロ・通知未達は観測していない。内部の音声デバイス停止の詳細原因は未確定だが、同じ context を再利用するだけでは復旧しないことを確認した。
復帰後700msの時刻進行を一度確認し、停止が続く場合だけ旧ノード・context を閉じて音声基盤を一度再作成する。音量・ON/OFFと同梱音源のバイトキャッシュは保持し、SEは再発火しない。バックグラウンド化でチェックを取消し、正常復帰・両方OFFでは再作成しない。OSが新contextの自動開始を拒否した場合は次のタップで再試行する。修正後はユーザーが中断・復帰後の BGM／SE の実音を確認した。通話など別種類の割り込み・長時間の反復試験は未検証。
ステージ開始の半透明演出と側面スクロール補助は、旧H=700の矩形ではなく拡張viewport全体を覆うようにした。必要な演出を保ちつつ、旧境界の帯をなくす。マップ・Dailyは縦のviewportに揃え、横方向はセーフエリア内の全幅を保つ（横画面で細いcanvas幅へ縮めない）。
この音声時刻停止対策・帯修正・横画面補正を含む Release 0.3.12／ビルド5 は、最終同梱 assets 検査と署名検証、実機への上書き更新・前面起動に成功した。ユーザーが帯の消失と復帰後の音声を実機で確認済み。保存時はソースを0.3.13／ビルド6に更新したが、実機は確認済み0.3.12／ビルド5のまま。差分は版番号・assetsハッシュ更新と通常Releaseからの診断収集除外で、再ビルドはしていない。

床の下方延長は image_gen で作成した `assets/gym-floor-extended.png`（1774×887）。元の `assets/gym-floor.webp`（800×100）は既存のHOLD_CONFIG.bottomMarginに従って描き、生成画像の下部だけを同じ倍率でHEIGHTより下へ延長する。実機の追加 viewport は上下約41.27ゲーム単位。元画像の変更・Python等による画像編集はしていない。編集記録は隣の `.prompt.txt` に保存した。

## 実機向けの追加変更（ソース0.3.13／ビルド6）

Personal Team を設定し、iPhone 13 Pro／iOS 26.6.2 で Release を検証する。
生成時の `native-bundle-source.cjs` はコピーした iOS assets だけを変更し、Web の元のゲームソース・CSS・HTML は変更しない。
縦画面ではセーフエリア内まで canvas の描画 viewport を広げ、上下に追加のワールドを表示する。400×700 のゲーム内座標、カメラ制御、到達距離、生成・スコアは維持し、描画を等倍率のまま平行移動する。タッチ・ドラッグ・スクロールと DOM のゴール演出も同じ倍率・余白を使う。横画面は既存の 4:7 を維持する。

HUD 用の属性・位置変数はステージを離れると解除する。`game-lives` はマップでも共有されるため `.map-lives` をステージ CSS から明示的に除外する。
iOS の Scene 中断・復帰を WebView に通知し、復帰時は音声セッションの再有効化と既存 AudioContext の再開を試みる。中断中の再生を禁止し、保存済みの音楽／SE の ON/OFF・音量を保持する。OS に自動再開を拒否された場合は次のユーザー操作で再試行する。実音と繰り返し復帰の実機確認は自動テストとは別に必要。

軽量チェック: `node tests/ios-stage-layout.cjs`、`node tests/ios-audio-lifecycle.cjs`、`ASCENT_NATIVE_TEST=1 node tests/input.cjs`、`ASCENT_NATIVE_TEST=1 node tests/render-scheduling.cjs`。関連する既存の音声・モーダル・ビルド方針のテストも行う。署名ビルドは直列に行い、キーチェーン確認はユーザーが手動操作する。
今回の結合 Release はビルド・署名検証・同梱 assets 検査に合格し、同じ iPhone 13 Pro へ削除せず上書きインストール・前面起動した。マップ・Daily・ステージの配置、床延長、帯の消失と復帰後の実音はユーザー確認済み。

基準は Web 版 0.3.10、コミット `15e482dc3b12587b35dcad629b5065b74bfb3e5a`。
`feature/ios-app` の別 worktree で作成した。既存 main の作業フォルダと公開 Web は変更していない。
このブランチの共通ソースでは、後述の説明モーダル修正と版番号・assets 参照の更新だけを行った。ゲーム本体・音源・画像は維持している。
ユーザー承認によりローカルコミットへ保存する。push・merge・公開は行わない。
最初のローカルコミット `cb13aae` では `AGENTS.md` に従いソースを 0.3.11／ビルド4 とし、その時点ではインストール版 0.3.10／ビルド3 を維持した。
その後、下記の Debug／Release 対応を 0.3.11／ビルド4 で両構成ともビルド・検証した。ユーザー承認により追加分を新規ローカルコミットへ保存する。保存時のソースは規約に従い 0.3.12／ビルド5 としたが、再ビルド・再インストールはしていない。18 Pro のインストール済み検証版は Release 0.3.11／ビルド4 のまま。差は版番号・ビルド番号と config の assets ハッシュ。

## 用途と制限

- アプリ名: ASCENT Local
- 仮 Bundle ID: `local.ascent.simulator.t20261024`。ローカル実機・シミュレーター検証用で、正式な ID ではない。
- ソースの表示バージョン: 0.4.1、ビルド番号: 9、iOS 最低バージョン: 15.0。
- Firebase は既定で無効。既存の書込用 `js/firebase-client.js` は同梱せず、固定版SDKと制御されたiOS専用アダプターを使う。承認済み read-only テストのみ認証と読み取りを許可する。
- 生成する HTML に CSP を追加。外部スクリプト・外部通信・iframe・フォーム送信を禁止する。同梱音声の fetch のため `connect-src 'self'` のみ許可する。
- 既定のofflineでは匿名認証も行わない。read-onlyでは匿名作成を最大1件に制限し、プロフィール・ランキング更新、保留スコア送信、削除・引継ぎは許可しない。
- 広告は既存の仮広告。実広告 SDK、追加の Capacitor プラグイン、CocoaPods は導入しない。
- 保存領域はアプリのローカル領域であり、Web ブラウザの進捗・認証情報を自動的には引き継がない。
- ユーザー承認の Personal Team による開発署名を設定済み。証明書・秘密鍵・プロファイル・診断ログ・端末識別子はコミットしない。配布設定は未設定。

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
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<SIMULATOR_UDID>' \
  -derivedDataPath build/DerivedData -packageAuthorizationProvider netrc \
  -disableAutomaticPackageResolution -jobs 2 \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
node tests/ios-assets.cjs --built

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,id=<SIMULATOR_UDID>' \
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

## 0.4.0 の保存範囲

iOS対応とスコア来歴4項目を含むソースは0.4.0/build8。スコア仕様世代COURSE_VERSIONはv1のまま。実機はSTAGE10保存を確認した0.3.14/build7を維持し、コミット・pushのためだけの実機再ビルドや更新は行わない。詳細は score-metadata.md と firestore-rules-local-review.md を参照。

## 0.4.1 の保存範囲

送信待ち表示をiOS新キューへ統一し、通信状態・件数・詳細エラーの表示をDebugビルド限定化した。ゲーム内デバッグモードとは独立する。実機は通常Release 0.4.0/build8で最終確認済み。保存時のソース0.4.1/build9は版番号・assets更新のみ追加し、実機再ビルド・更新は行わない。詳細は ios-sync-status.md を参照。

## 0.4.2 の保存範囲

共通viewportとUIKit safe area橋渡しを追加し、Web/iOSのtitle/map/Daily/stage/HUD/modalを幅400・最小高700の同じ論理枠へ統一。コース/採点v1は維持。既存の床延長素材をassetsへ移して共用する。保存版は0.4.2/build10、実機確認版は0.4.1/build9のまま。一時geometryログ収集は保存前に除去し、計測ログはGit対象外。詳細はcommon-viewport.md。

## 0.4.3 の保存範囲

共通UI4点（大きいホールドの固定点円、ゴール後ルートの停止、飛行船押下の絵だけの拡大、日本語「もういちど」）をWebで確認。保存版0.4.3/build11、実機は確認済み0.4.1/build9を維持しており、この4点は未反映。コース/採点v1とFirebase同期は変更しない。詳細はshared-ui-polish.md。

## 0.4.4 の保存範囲

新規合成の回復・尖ホールド・クリア・次ステージ移動SEを共通assetsへ追加。尖ホールドは採用第4案、ファイルゲイン2倍。四肢固定の通常音との二重再生を防ぎ、移動音は650msの演出開始時に一度だけ再生する。原音は同梱せず、stdlib Pythonスクリプトで再生成できる。

iOS同梱音源のstatus-0応答正規化に新規3パスを追加。修正前の統合テストは8音中5音のみデコード成功し、修正後は8音すべて成功。音色・実機反映は0.4.3/build11の修正版でユーザー確認済み。上下マップ三角は絵だけ1.1倍、飛行船は1.04倍を維持。Webの実入力で押下・解除・外側キャンセル・キーボードフォーカスとページ移動を確認。

保存版は0.4.4/build12。ReleaseのDebug OFF、安全領域、既存匿名認証と以後の実プレイ同期・過去キュー非送信を維持。scoreSpec v1とコース/採点ルール、Rulesは変更しない。確認は関連テストに限定し、全体テストの既知8失敗を解消したとは扱わない。参考音源・QAページ・ログ・署名成果物は保存対象外。
