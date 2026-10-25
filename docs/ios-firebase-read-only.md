# iOS Firebase 接続と通常同期

## モードと安全境界

Firebase Web SDK 12.11.0 を公式 npm から固定版で同梱する。既存 Web の bootstrap を使わず、iOS 専用コントローラーで bouldering-7482d へ接続する。公開設定値は既存ソースからビルド時に読み、ログに出さない。

- `offline`（既定）: SDKを初期化せず、CSPも外部通信を禁止。
- `read-only`: 承認済みの認証・読み取り用。匿名作成には明示的なネイティブ許可と永続的な一度の試行マーカーが必要。
- `auto-sync`: 既存UIDを復元して通常同期。匿名ユーザー追加作成は禁止。

assetsとXcodeのモード不一致はビルドを停止する。Debug／Releaseのゲームデバッグ設定と通信モードは独立し、ReleaseのゲームデバッグはOFF固定。
オンライン時のCSP接続先は HTTPS の identitytoolkit.googleapis.com、securetoken.googleapis.com、firestore.googleapis.com のみ。外部script・iframe・フォームは禁止。認証永続化失敗やUID不一致では停止し、ローカルプレイとセーブを維持する。削除・引継ぎ・既存Webの旧同期経路は無効。

## 通常プレイ同期

有効化境界を `ascent.native-sync.after-enable.v1` に owner・activatedAt・sequence として永続化する。既存の `ascent.pending-scores.v1` と過去のlocal bestを送信候補に取り込まない。旧キューは保持し、消去・所有者付替え・送信を行わない。
通常／prototypeの新規実プレイクリア時、local best判定とは独立に、その回のcandidateを専用キューに保存する。サーバーに良い記録があれば保持し、改善時だけ更新する。比較順は手数、同手数なら時間。過去bestより悪い新規記録でも、送信候補はその回の値である。
オフライン時の有効化後記録とプロフィール編集は永続保留し、online・focus・ネイティブ復帰で再送する。単調改善と同一プロフィール抑止で応答不明後の重複更新を防ぐ。
公開名は「iOS接続テスト」で開始し、既存ローカル名を勝手に公開しない。以後エディターで名前そのものを変更した場合だけ採用する。見た目と到達ステージは同期し、到達ステージはサーバーとの最大値を使う。サーバー値をローカルセーブへ上書きしない。

## ビルド

```sh
# 既定は通信無効
npm run sync:ios

# 承認済みの通常同期
ASCENT_FIREBASE_MODE=auto-sync npm run sync:ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphoneos -destination 'id=<DEVICE_UDID>' \
  -derivedDataPath build/DerivedData -packageAuthorizationProvider netrc \
  -disableAutomaticPackageResolution -jobs 2 ASCENT_FIREBASE_MODE=auto-sync build
```

## 検証結果

実機0.3.13 / build 6で、匿名Auth作成は通算1件、以後の再起動では同じUIDの復元・追加作成0件を確認。承認済みの限定保存テストではプロフィール「iOS接続テスト」1件と実プレイ由来STAGE1記録1件を保存・サーバー読み戻しした。この限定保存テスト用モードと関数は現在のソースから削除済み。サーバーの文書・Auth・アプリ内の既存マーカーは削除しない。
通常同期版の実プレイ後レポートは新規処理完了2件、スコア書込2件、未送信0件、過去キュー保持、既存UID維持、エラーなし。ユーザーも改善記録更新・悪化記録維持を確認した。レポートには記録値やステージ番号がなく、本人STAGE1のサーバー値との数値照合を独立実施したものではない。
モックで過去キュー隔離、新規candidate、オフライン／再起動、応答不明後の再試行、重複抑止、プロフィール同時編集、認証保持・永続化失敗、名前保護を検証。実機の機内モードと長時間token更新は未検証。

現在のソースは0.4.1 / build 9。実機はメタデータ・オフライン同期・診断Debug限定化を確認した通常Release 0.4.0 / build 8を維持する。保存時の版更新だけのための実機再ビルド・更新はしていない。

## 診断と非公開データ

Firebase状態ファイルの収集は `#if DEBUG` 内だけに限定し、さらに起動環境変数 `ASCENT_FIREBASE_READ_TEST=1` が必要。通常Releaseではこの指定があってもハンドラーを登録しない。Debug診断は件数・真偽・安全なエラーコードだけで最大256回。UID・トークン・公開設定値・文書本文を含めない。過去の実機検証版ではReleaseに明示指定したときのみ有効だった。
診断ファイル、ビルド生成物、認証情報、ローカルツールはコミットしない。削除・引継ぎ・追加Auth作成・Rules／App Check／API制限変更・過去キュー送信は許可されていない。
