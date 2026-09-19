# ASCENT

胴体をスワイプし、四肢のうち2点を固定して残り2肢を動かすクライミングパズルです。

## 起動

[index.html](index.html) をブラウザで開くとLevel 1が始まります。ビルド・インストール・コース選択はありません。ゴールを見せてからプレイヤーへスクロールし、操作可能になります。

- フィールドの任意の位置からスワイプして移動します。
- 支持ペアは6組を内部評価し、開始方向への移動先が多い組、同条件なら移動距離が長い組を選びます。
- スワイプ中は2点を固定し、残り2肢の吸着先はリアルタイムに変化します。
- 全四肢が吸着していれば移動を確定でき、1手消費します。同じ4接触位置への復帰やキャンセルは消費しません。
- 両手でゴールを掴むとクリア。スタミナは検証した手数＋1です。
- 右端の帯でステージをスクロールできます。
- 「パス表示」で想定ルート、クリア後は実際の確定位置を結ぶルートも表示します。

## 実装構成

| ファイル | 役割 |
| --- | --- |
| `js/config.js` | 可動域・配置・表示の設定 |
| `js/utils.js` | 座標計算とシード付き乱数 |
| `js/stage.js` | 初期ホールド、折れ線ガイド、密度調整 |
| `js/game.js` | 2肢固定、吸着、確定、勝敗、開始演出 |
| `js/route.js` | 2肢固定の探索・再生・ホールド削減・最終生成 |
| `js/input.js` | マウス・タッチ・スクロール・再開始 |
| `js/renderer.js` | プレイヤー・可動域・想定／実走パスの描画 |
| `js/main.js` | Level 1と描画ループの開始 |

`file://` で動く通常のdeferスクリプトを使用します。旧1肢固定コース、固定パターン検証ステージ、コース選択は削除済みです。

## テスト

```sh
node tests/routes.cjs
node tests/animations.cjs
```

20レベルの実入力クリア、固定ペアの維持、接触先、ホールド削減、キャンセル、実走パスを確認します。

Windowsでは次のスクリプトも使用できます。Node.jsがなければVS CodeのElectronを使います。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-routes.ps1
```

配置の調査には `node scripts/inspect-routes.cjs 1 3` を使用できます。

詳細は [ゲーム仕様](GAME_SPEC.md) と [生成手順](docs/course-generation.md) を参照してください。`docs/layout-study.md`、`docs/controll_test.md`、`docs/report_light.md` は過去の検討記録です。
