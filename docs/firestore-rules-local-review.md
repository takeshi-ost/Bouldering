# スコアメタデータ Rules のローカルレビュー

## 対象と確認範囲

比較元は Git 795bc08378f029b2e537f70b5c3a00d84219fd9f の firestore.rules、比較先はメタデータ対応案。当初はローカル定義のみをレビュー。その後の明示承認に基づき、2026-10-25にFirebase公式コンソールで本番適用中Rulesを全文取得した。変更前Rulesは795bc08のローカル定義と末尾空白を除き完全一致。承認された4項目の最小差分だけを公式コンソールで公開した。公開後の再読み込みで全文4395文字がローカル案と完全一致することを確認。スコア文書の変更・埋め戻し・削除は行っていない。

差分から新ヘルパーとスコア任意フィールドの検証部分だけを取り除き、旧ファイルと完全一致する静的監査に合格した。既存の本人UID・認証・削除ロック・ボード形式・手数/時間の整数と範囲・サーバー時刻・改善時のみ更新の条件、プロフィール/読み取り/削除権限は変更していない。

## 任意フィールドの制約

4項目とも欠損/nullを許容。値がある場合は文字列限定で、空文字列は拒否する。

| 項目 | 長さ上限 | 許容する値 |
| --- | --- | --- |
| appVersion | 64 | 数字.数字.数字（例0.3.14） |
| buildNumber | 32 | 数字、または数字をドットでつないだ最大3部分（例7、7.2.1） |
| platform | 32 | iOS または Web |
| scoreSpecVersion | 32 | v1（既存v1ボードと整合） |

新しいプラットフォームや仕様世代は、将来実装とともに明示的にレビューして追加する。任意の余分なキー、型違い、過長、空文字列、未知の値は拒否する案。旧クライアントの3項目だけの書込は許容する。旧文書を新クライアントが読む際に埋め戻しはしない。

## 実行できた確認

- 上記の静的差分範囲監査に合格。
- tests/firestore/score-metadata.mjs のNode構文検査に合格。
- エミュレーター接続先未指定での実行が、依存importや通信より前に停止することを確認。
- 既存スコア来歴テストとnative Firebaseモックテストに合格。

## エミュレーター検証のブロッカー

確認した環境には firebase CLI、@firebase/rules-unit-testing、FirestoreエミュレーターJARがない。/usr/bin/javaはランチャーだけで、実行時にJava Runtime未導入のエラー。標準JDKディレクトリとユーザーJDKディレクトリにも導入を確認できない。Node24.22.1とFirebase Web SDK12.11.0は既存で利用可能。
無断の依存追加・ダウンロードはしていない。Rulesのコンパイルとエミュレーター上の許可/拒否テストは未実施であり、モックや静的監査の合格で代用しない。

## 準備したテストと次の手順

tests/firestore/score-metadata.mjs と専用 firebase.emulator.json を用意。127.0.0.1:8089 と demo-score-* プロジェクトだけを使用し、既存Firebaseプロジェクトには接続しない。clearFirestore/delete操作はなく、cleanupはテストクライアントを閉じるだけ。
旧Rulesと新Rulesを別demoプロジェクトへ適用し、以下を実行する予定：旧クライアント、全null/一部フィールド、iOS/Web、長さ上限、未知キー、型違い/空/過長/不正値、未認証・他人のcreate/update、不正ボード、数値上限・整数、時刻、必須欠損、改善/同値/悪化、削除ロック、旧文書読取と新旧クライアント相互更新。

追加導入の承認後に必要なのは、互換性のあるJDK（新規導入なら21以降を候補に確認）、公式npmの固定版firebase-toolsと@firebase/rules-unit-testing、CLI公式配布のFirestoreエミュレーター本体。認証情報の作成やfirebase login/init/use、実プロジェクト選択、デプロイは不要。
導入バージョンと容量・取得元を確認してからインストールし、リポジトリルートで実行する予定コマンド：

```sh
firebase --config tests/firestore/firebase.emulator.json \
  emulators:exec --only firestore --project demo-score-metadata \
  'node tests/firestore/score-metadata.mjs'
```

このコマンドとテスト本体は環境未導入のため未実行。通常テストからは分離してあり、未実行テストを成功扱いしない。

公式資料：
- https://firebase.google.com/docs/firestore/security/test-rules-emulator
- https://firebase.google.com/docs/emulator-suite/install_and_configure
- https://docs.cloud.google.com/firestore/native/docs/emulator

## 本番反映の控え

復元用の変更前全文は build/firestore-production-before-20261025.rules.txt に保存（Git除外）。SHA256: fbc5dff7fe9647d01a8b3d8a43f3e6fa20182a8798aae928da8524b5d356f680。公式コンソールの旧現行は10月21日23:38、反映後は10月25日10:09（Mac画面表示）。旧版はコンソールの履歴にも残る。公開処理はコンパイルエラーなく成功し、再読み込み後の全文一致を確認した。これはエミュレーターの許可・拒否テスト合格を意味しない。
