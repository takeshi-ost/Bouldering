# 共通 viewport（0.4.2 / build 10）

Web・iOSの画面と入力を共通化した更新。基準はmain 9d4c0b4（0.4.1/build9）。COURSE_VERSION / scoreSpecVersionはv1を維持する。Androidのプロジェクト、ライフサイクル、認証、platform / Rules対応は別途必要。

## 座標と表示枠

`js/viewport.js` が安全領域と可視領域を一度だけ交差させる。有効なCSS幅をA、高さをBとして `s=min(A/400,B/700)`。論理幅400、高さB/s（最低700）の共通枠を中央配置し、横長画面は左右letterbox、縦長は上下を拡張する。

DOMはCSS zoomで一様拡大し、clientWidth / scrollTopを論理単位のまま保つ。外側mainは拡大後の実CSS寸法にする。title、map、Daily、stage、HUD、modal内容を同じ枠に配置する。全dialogはbody直下の拡大前レイヤーへ移し、top layerで親のzoomも継承する二重拡大を避ける。backdropだけはウィンドウ全体を覆う例外。長文は内部スクロールする。

Canvasの入力は `viewportClientPoint`、パン量は `viewportClientDelta` で逆変換し、Dailyスワイプ等のしきい値も論理単位へ統一する。DOMのゴール演出も同じ枠の論理座標に配置する。

## safe area

WebはCSS envのprobeを計測する。iOSはUIKitのview/window safeAreaLayoutGuideをWebViewローカルへ変換し、`ASCENT_NATIVE_SAFE_AREA` で渡す。WebView自体がinset済みなら交差の結果、追加の余白は0になる。nativeのlayout/safeArea/表示変更と初回JS要求で更新し、CSS probeのResizeObserverでも初期env値の遅れを検出する。

安全矩形とvisualViewportを交差させるため、キーボードで既に縮んだ可視領域の下からhome-indicator余白を再度差し引かない。HUD/dialogだけの独立した補正はしない。

## 変えないゲームルール

W=400/H=700はコース生成、可動域、到達、カメラ追従・移動限界、採点の既存座標として維持する。表示の追加分 `(論理高-700)/2` は上下の背景、床、culling、イントロ・スクロール補助の描画だけに使う。

既存の床延長画像をios-assetsからassetsへ移動して共用する。画素・デザイン・元の床と足位置は変更しない。音声素材も変更しない。

DPRは描画品質だけに使い、実CSS倍率×DPR、既存上限2、200万pixelのバッファ予算で制限する。判定座標には混ぜず、アイドル時RAF停止も維持する。

## 検証結果と限界

- `tests/viewport.cjs`: safe areaあり/なし、縦横・小型、keyboard相当の高さ/offset、初期native通知、二重控除防止、入力逆変換、固定STAGE10のコース/routeハッシュが変更前mainと一致。
- Web/native input、render scheduling、map、Daily、help、build policy、同期境界、metadata、iOS assetsの関連テストを実施。
- 全体テスト初回は48/58。生成準備不足の2件は準備後に合格。残る8件はmain 9d4c0b4でも同じNode24.22.1とコマンドで再現したdense-hazards / prototype / routes / rules / wallpaper / results / text / transfer。後者3件はmetadata追加以前の期待値などによる既存失敗で、今回修正に混ぜない。全体合格とはしていない。
- ChromeのFirebase遮断コピーで通常ウィンドウ、390×844、844×390、320×568、回転、入力、説明スクロール、エディターパレット・結果dialogを確認。safe areaを模擬した320×568と568×320でも余白・letterboxを確認した。
- iPhone13Proの実測: WebView390×844、UIKit上47/下34/左右0、adjustedContentInset上下0。初期CSS envは0、後から47/34になる。UIKit橋渡し後は共通枠とCanvasがともにleft0/top47/390×763（下端810）へ一致し、CSS更新後も二重控除なし。ユーザーが表示の改善を確認済み。

## 保存版と実機版

ソースは0.4.2/build10、実機は確認済みRelease0.4.1/build9。保存時に一時的なgeometry収集の環境設定・ハンドラー・ファイル書込処理を除去した。geometryを渡す通常のsafe area橋渡しは維持する。実機計測ログはignored build/内のみでGit対象外。保存のためだけの実機再ビルドや署名は行わない。

実機の表示改善は確認済みだが、全機種での回転・キーボード・長時間プレイの網羅確認はしていない。横長では全UIも一様縮小される。Firebase同期境界、旧キュー保持・非送信、既存UID/セーブ、Releaseのゲームdebug OFF、最小CSP、Rulesは変更していない。
