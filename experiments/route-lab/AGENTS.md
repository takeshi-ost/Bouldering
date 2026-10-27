# Route Lab 作業範囲

- この独立試作のバージョンは package.json と入口画面で管理する。通常版 js/config.js / index.html / iOSファイルを変更しない。
- GitHub main3728558を基準に、承認済みの単独骨格（straight/meander/branch）比較を試作アダプターだけで実装する。旧prototype.jsを復活・配信しない。ハート・尖ホールド・複数区間の合成は今回の対象外。
- main、既存Pages、Firebaseを変更しない。同じ本人限定Site ID/URLを継続利用する。
- 公開はpublic/のみ。public/game/はbuild.cjsと固定baseline-manifest.jsonから再生成する。基準を無断で新しい版へ変更しない。
- 本番通信・本番UID・保存・引き継ぎ・広告SDK・購入を追加しない。メモリのみの保存とCSP通信拒否を維持する。
- iframeのallow-same-originを強い分離と説明しない。別Site origin、配信コード除外、CSP、メモリ保存が根拠。
- 変更後npm run buildとnpm test。自動入力再生と実ブラウザ/実機の検証範囲を区別する。

- 配置は従来のcreateStageGenerator/fillWall/convergeDensityと元の接触・剪定処理を実際に使う。独自の規則的2列配置へ戻さない。
- 0.3.0のストレートはseedにより垂直・左斜め・右斜めを再現し、ほぼ一方向の骨格にする。分岐は左右に大きく分かれる一方ゴール／他方通常ホールドの行き止まりを比較する。以前の局所合流型へ黙って代替しない。偽ゴールは置かない。
- Undoは元の直前1手のみ。退路・ゴール到達・行き止まりの検証範囲と探索上限を明示し、全操作に対する到達不能や最適性を証明したと説明しない。
- 狭い画面でも外側の比較／リセット操作を44px以上に保つ。新しい変更の実機・viewport・入力検証は実行した範囲だけ記録する。
