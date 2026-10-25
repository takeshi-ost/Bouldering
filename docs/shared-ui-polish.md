# 共通UI調整4点（0.4.3 / build 11）

基準main b2f20f4、作業ブランチfeature/shared-ui-polish。保存版は0.4.3/build11、scoreSpecはv1のまま。ユーザーがChromeで4点をすべて確認し、commit/Push/main統合/Web反映を承認。実機は確認済み0.4.1/build9のまま、今回4点は未反映。

## 変更

1. 大きなホールドのactive長方形をやめ、接触している肢ごとに実際のgrip座標へ通常と同じ円を描く。大きい画像に隠れないよう円を画像より前に描く。共有ホールドで同じ固定点なら円は重なるが、見た目のための架空のずらしは入れない。金色/通常/危険の色、共有判定、当たり判定は保持する。
2. ゴール後のピンクの実プレイルート描画・矢印・番号を除去。その表示専用のplayerPath蓄積とUndo時のコピーも除去した。永続セーブの項目ではなく、既存データの削除はしない。生成/検証・探索用routeは維持し、debugDisplay.routeで明示的に有効にする計画ルート表示は維持する。ぶら下がり等の別用途の演出も維持する。
3. 飛行船ボタンの標準tap highlightを透明化。hit領域・浮遊/移動の処理は外側buttonに残し、内側の絵と日付だけを押下中1.04倍にする。keyboard focus-visibleの枠は残す。reduced-motionでは倍率変化のtransitionだけを止める。
4. 日本語の失敗時再挑戦ラベルを通常/Dailyとも「もういちど」へ変更。英語は通常RETRY、Daily Retryの既存表示を維持する。言語切替にも反映する。

## 自動検証

専用shared-ui-polishテストで実際のrendererを呼び、通常/共有ホールドの接触点ごとの円・金色の意味、active長方形なし、描画によるgeometry変更なし、ゴール後の線なし、明示debug計画ルート維持、日英の再挑戦切替、score不変、飛行船の内側のみ拡大とfocusを確認。

input、animations、hazards、render-scheduling、goal-safe-area、viewport、daily、daily-ads、language、level-map、retry-stage-start、stage-start、build-policy、score-metadata、native-auto-sync、native-sync-statusとnative input/render-schedulingが合格。static textのdigestは「もういちど」への依頼どおりの変更をレビューして更新した。固定STAGE10のコース/routeハッシュは基準mainと同一。

全体テストを合格とはしていない。既知baseline8件は別扱いで、今回触ったrules/routesもそれぞれ従来のad対map、Course choice missingの失敗で止まることを確認した。新しい描画/翻訳の検証は専用テストで独立して実行する。

## Web確認の状態・手順

build/web-reviewへ共通ファイルをコピーし、Firebase bootstrapを除外、CSPで外部通信を遮断したlocalhost専用確認ページを準備した。新規匿名登録や本番スコア送信を行わない。

Chromeは既存ウィンドウの画面取得でタイムアウトしたが、新しい専用ウィンドウで復旧した。Mac Chromeで実際のマップ、Daily、STAGE1を表示し、390×844と844×390の縦横切替後も共通枠・letterboxと入力操作が維持されることをスクリーンショットで確認した。STAGE1の共有スタートホールドには長方形でなく実固定点の緑の円が描かれている。設定→リタイヤで「登頂失敗…」と「もういちど」の実表示を確認。飛行船でMap→Daily→Mapを操作し、日付/絵・既存遷移を確認した。コンソールの確認範囲ではfavicon.icoの404のみでゲームの実行エラーはなかった。

追加Web確認では、Shift+Tabで飛行船に移動した際の金色focus-visible枠と、SpaceキーでDailyへ移動することを実画面確認した。通常操作のDaily開始→設定→リタイヤで日本語「もういちど」を確認。設定から英語への切替も確認した。

ignoredのbuild/web-review/review.htmlとqa-review.jsで、Firebaseのない同じ隔離ページにQA操作だけを追加した。通常のfinish関数を呼び出して英語DailyのRetry、英語通常のRETRY、表示中のmodalを日本語に切り替えた際の「もういちど」をスクリーンショットとAXで確認した。クリアは自然プレイ完走ではなく、QAボタンでSTAGE1の手をゴールへ置きfinish(true)を呼んだ状態再現。成功modal→通常TAP→マップと次ステージの解放を確認し、modalをQA操作で閉じたwon状態の背景単体にもルート線・番号・矢印がないことを実撮影で確認した。この再現はlocalhostにだけローカルテスト記録を作り、本番には接続/送信していない。実機セーブや公開Webの保存領域は触っていない。

残る最小の目視確認は飛行船をマウス/指で押している間の拡大感と四角い着色なし。ツールのpressKey/clickが離すまで待ち、並列スクリーンショットも遷移後の画面になったため、1.04倍の押下中フレームは取得できなかった。倍率・適用対象・tap highlight透明は専用自動テストとCSSで確認済みで、押下中実画面の確認と区別する。キーボードfocusの四角い金枠は意図して維持したもの。

確認用URLは http://127.0.0.1:8791/ 。最後にMac Chromeの専用ASCENTウィンドウをこのURLの日本語マップ表示へ戻し、DevToolsは閉じている。飛行船は操作可能。localhostのライフは失敗QAで0になっており、本番/実機のライフやセーブとは別。QA再現を見直す場合だけ /review.html を使う。サーバーの生存は利用時に確認する。

ユーザーが押下中の表示を含めChromeで4点すべてを確認済み。保存時に0.4.3/build11へ更新し、アプリ版・package・Xcode設定・メタデータテスト・assetsクエリを整合。QAページ/状態/ログはignored build内のみでGit対象外。実機の再ビルド・署名・更新は行わない。
