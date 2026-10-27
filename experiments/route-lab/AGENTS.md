# Route Lab 作業範囲

- この独立試作のバージョンは package.json と入口画面で管理する。通常版 js/config.js / index.html / iOSファイルを変更しない。
- GitHub main3728558を基準に、承認済みの単独骨格（straight/meander/branch）比較を試作アダプターだけで実装する。旧prototype.jsを復活・配信しない。ハート・尖ホールド・複数区間の合成は今回の対象外。
- main、既存Pages、Firebaseを変更しない。同じ本人限定Site ID/URLを継続利用する。
- 公開はpublic/のみ。public/game/はbuild.cjsと固定baseline-manifest.jsonから再生成する。基準を無断で新しい版へ変更しない。
- 本番通信・本番UID・保存・引き継ぎ・広告SDK・購入を追加しない。メモリのみの保存とCSP通信拒否を維持する。
- iframeのallow-same-originを強い分離と説明しない。別Site origin、配信コード除外、CSP、メモリ保存が根拠。
- 変更後npm run buildとnpm test。自動入力再生と実ブラウザ/実機の検証範囲を区別する。

- 配置は従来のcreateStageGenerator/fillWall/convergeDensity/pruneUnusedHoldsを実際に使う。独自の規則的2列配置へ戻さない。分岐は元の散在配置から局所経路を残し、両経路を剪定・予算検証する。
