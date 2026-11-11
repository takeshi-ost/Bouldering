'use strict';
globalThis.ASCENT_COURSE_BUILD=Object.freeze({"protocol":1,"id":"e195df53c0dbc5201bb033cc9a8d0320e13ad351588ac4adea91c04abd8885d2","sources":[{"path":"js/text-ja.js","sha256":"b7b388347894b418f375fb293e4722f3fcfe332a0a5d365fae7c86bca70ff707"},{"path":"js/text-en.js","sha256":"776d93c49c11af48d6a5567d83309c3cc83dcb2ea761962b57792197d5ca528c"},{"path":"js/text-dev-ja.js","sha256":"778e1317540d5fd3c6440ecd306a1ffd02328bbe02df5fc3c0c5cc6f99c6602f"},{"path":"js/config.js","sha256":"63dddb55aab625d51c7617519cb7e889523a5aa78233e13f6dcac3a2677a3700"},{"path":"js/course-progression-config.js","sha256":"3438658870e1c410eb9f6e9448a4f4099641c0d48c3afb53eed764033c8368b8"},{"path":"js/course-distribution-config.js","sha256":"a7e767c2872aec25f7794be70226b762f93b3f312649b4c6184f8adc5f4265ca"},{"path":"js/course-distribution.js","sha256":"b8ee0f3a1f110848c4708daece6173ab0f397d95181681c9be87c91bd5b7882e"},{"path":"js/course-progression.js","sha256":"03d7bbaa775d381b7cb51481d568b0b69ffb1710a99cac5b40df0afbc66bde90"},{"path":"js/difficulty-config.js","sha256":"7f4b057f83197243144648db00926568a2efa987d73d6716535c2d795f40c43c"},{"path":"js/utils.js","sha256":"d73670fd1f8dede824efe908fe20807c8c4547ade0d37497463bbdeb3e2010ed"},{"path":"js/difficulty.js","sha256":"c750680f755fcee9a9f539dd64a268e13acf95e21dcdf0f378df574b55db2378"},{"path":"js/stage.js","sha256":"1c768a6ef803bae57144f7f8954171ec54e15eb86178fa367cf5dcfdecf7c06b"},{"path":"js/finger-aim.js","sha256":"50d41c61ca1fa42bb0e40961bf99fdd066a1bbe8d2809a2a4e11306419c88606"},{"path":"js/finger-route.js","sha256":"2f355fb52497a23ea8ab8cacbf913b82688e70e64a937763e523114ebf0e067f"},{"path":"js/six-pair-selection.js","sha256":"3001c2472ba388076e3465f499bbd6594eb984b74f7488efa86f89a66350da78"},{"path":"js/game.js","sha256":"412a2370411e7a55d2727cf04d0a4307cf936e14ebd846e686b8edec1aa06351"},{"path":"js/route.js","sha256":"196fc0f599c3ec9c3ef81e850e1169a55657fcd555483d6b0750b7e823526f46"},{"path":"js/course.js","sha256":"2db489d41b918fa4c39534bf6998121ed30a3a392941da439389c7a3db5f99ae"},{"path":"js/hazards.js","sha256":"26ac55233974a498ae6962cb437a6d6fd777248614bb27e7ae65f94120275157"},{"path":"js/course-stamina-settings.js","sha256":"e5a64ef8dafb6b06277a50b25ddcba153158fcbcede0e52d6f32fc8c8c057b47"},{"path":"js/course-generator-core.js","sha256":"3612d7bedf39c9ea9a6cea6c14d5425e314796b36fc65524ebfa9e8edcc367d2"},{"path":"js/course-adoption.js","sha256":"4116239692a490e82a3870ebda26e86c773449449bad260cfed25f9d764ab9bb"},{"path":"js/tutorial-course.js","sha256":"c846a93a64e8371c2b8df2f59777f300768d6a2c1ed5a5df6150dd4628a4e2de"},{"path":"js/course-preparation.js","sha256":"dc559f6c5352939b7288e97e4b26ceb9936a28084562e5af585ee7e6ec1ccc6a"},{"path":"js/text.js","sha256":"c7df5d2ebf704285535e0499a629283f60c57e96a8b7783357893b64235d4a96"},{"path":"scripts/course-worker-entry.js","sha256":"c960ffcd5d9405c15008c0ac27344f7cd85404bd21b94a915037a1ddfebbd288"},{"path":"scripts/build-course-worker.cjs","sha256":"c830ae65e1e699c280ccdac7b6bcc85ab3f1da3b9adc69e48148359fe6f88aee"}]});
globalThis.ASCENT_COURSE_WORKER=true;
let debugAttempt=false;
function isTutorialRun(){return tutorialRun!==null;}

// js/text-ja.js
"use strict";
// Player-facing Japanese copy, including accessibility and recoverable errors.
const GAME_TEXT_JA = Object.freeze({
    "debug.pair.title": "可動二肢（残りが固定）｜壁タップで消す",
    "debug.pair.feet": "両足",
    "debug.pair.right": "右手＋右足",
    "debug.pair.rightLeft": "右手＋左足",
    "debug.pair.leftRight": "左手＋右足",
    "debug.pair.left": "左手＋左足",
    "debug.pair.hands": "両手",
    "debug.pair.hint": "二肢選択・全方向を0.1°刻みで表示／スワイプ開始で消去",

    "course-preparation.loading": "コースを準備中…",
    "course-preparation.retry": "準備をやり直す",
    "course-preparation.error": "コースを準備できませんでした。やり直すか、閉じて開き直してください。",
    "online-scores.pendingBlocked": "未送信記録を保護しています。通信を停止しました。",
    "formal.ranking.localOnly": "デバッグ補助を使用した記録です。進行は保存されますが、ランキングには送信されません。",
    "formal.seed.label": "DEBUG SEED 補正値",
    "formal.seed.apply": "適用",
    "formal.seed.help": "通常プレイは +10 固定です。DEBUG の補正値は次の検証用ステージから使用し、進行・正式記録には保存しません。デイリーは変わりません。",
    "formal.seed.invalid": "0〜4294967295 の整数を入力してください。",
    "formal.seed.unsafe": "DEBUG を ON にして、マップで適用してください。",
    "formal.seed.saved": "適用しました。次の検証用ステージから反映します。",
    "formal.seed.unsaved": "このセッションに適用しました。端末への保存はできませんでした。",
    // Owner-supplied tutorial copy, verbatim; English intentionally falls back to Japanese until a translation is approved.
    "tutorial.title.play": "ASCENTにようこそ！",
    "tutorial.title.complete": "チュートリアル完了",
    "tutorial.title.wide": "大きなホールド",
    "tutorial.intro.welcome": "画面スワイプで移動、指をはなしてホールドを決定します",
    "tutorial.intro.movement": "手足2つが自由に動きます。足は手より高い場所には置けません",
    "tutorial.intro.goal": "スタミナがなくなる前に、ゴールを両手でつかむと登頂成功です",
    "tutorial.wide": "大きなホールドには、両手または両足を置くことができます。",
    "tutorial.move.cancel": "2本タップで移動をキャンセルできます",
    "tutorial.move.undo": "ボディを短くタップすると1ムーブ戻せます",
    "tutorial.goal.fixed": "ゴールするには両足もホールドに固定されていないといけません",
    "tutorial.goal.finish": "くわしい操作やルールの説明は歯車アイコンで開くメニューから見ることができます",


    "debug.exit": "試作を終了",
    "debug.trialError": "試作生成失敗：{value0}",

    "settings.connection": "通信状態",
    "settings.appVersion": "アプリバージョン",
    "settings.online": "オンライン",
    "settings.offline": "オフライン",
    "audio.music": "BGM",
    "audio.effects": "効果音",
    "audio.musicVolume": "音楽の音量",
    "audio.effectsVolume": "効果音の音量",

    "appearance.confirmCharacterEditor": "名前と配色を適用しました。この端末への保存はできませんでした。",
    "appearance.renderCharacterEditor": "色 {value2}",
    "appearance.renderCharacterEditor.2": "頭の色 {value11}",
    "appearance.renderCharacterEditor.3": "{value0}色・{value1}のキャラクター配色プレビュー",
    "appearance.renderCharacterEditor.4": "上から{value6}番目の色 {value7}",
    "editor.pose.chest": "脚を広げて胸に手を添える",
    "editor.pose.foldedArms": "腕を組む",
    "editor.pose.crossedLegs": "脚を交差して立つ",
    "editor.pose.head": "頭に手を添える",
    "editor.pose.joinedHands": "前で手を組む",
    "editor.pose.hip": "腰に手を当てる",
    "editor.pose.weightShift": "片足に重心をかける",
    "editor.pose.standing": "自然に立つ",
    "tips.appearance": "設定から見た目と名前が変えられるよ！",
    "tips.cancel": "ムーブは2本タッチでキャンセルできる！",
    "tips.heart": "スタミナ+2はボディでタッチ！",
    "tips.goal": "ゴールは両足の支えも忘れずに！",
    "tips.reach": "動けないときは手足の伸びをチェック！",
    "tips.undo": "ボディをタップで1ムーブ戻せるよ！",
    "tips.scroll": "画面端か2本スワイプでスクロール！",
    "daily.reportDailyGenerationError": "コースを生成できませんでした。もう一度日付を選んでください。",
    "score.stars": "{value0}スター",
    "course.long": "ロング",
    "course.medium": "ミドル",
    "course.short": "ショート",
    "date.select": "日付を選択",
    "date.yearAndLabel": "{value0}年{value1}",
    "label.daily": "DAILY {value0}",
    "daily.renderDailyCalendar": "{value0}年 {value1}月",
    "daily.renderDailyCalendar.2": "選択できます",
    "daily.renderDailyCalendar.3": "スター・再挑戦できません",
    "daily.renderDailyCalendar.4": "銀貨",
    "daily.renderDailyCalendar.5": "金貨",
    "daily.renderDailyCalendar.6": "クリア済み・",
    "daily.renderDailyCalendar.7": "{value5}年{value6}月{value7}日 {value8}",
    "daily.renderDailyCalendar.8": "{value1}年{value2}月{value3}日",
    "daily.renderDailyCalendar.9": "ストリーク {value0}日",
    "daily.refreshDailyEntry": "デイリーチャレンジ {value0}",
    "date.monthDayWeekday": "{value0}月{value1}日({value2})",
    "difficulty.hard": "HARD",
    "difficulty.normal": "NORMAL",
    "difficulty.easy": "EASY",
    "firebase-client.bootFirebase": "プロフィール未同期（オフライン・端末内でプレイ）",
    "firebase-client.bootFirebase.2": "削除済みユーザーのデータは引き継げません。",
    "firebase-client.bootFirebase.3": "ファイルのUIDと認証情報が一致しません。",
    "firebase-client.bootFirebase.4": "引き継ぎ情報のUIDが一致しません。",
    "firebase-client.bootFirebase.5": "UIDを確認できません。再読み込みしてください。",
    "result.failure": "登頂失敗…",
    "result.success": "登頂成功！",
    "action.retryEnglish": "もういちど",
    "action.retry": "もういちど",
    "action.returnMap": "マップにもどる",
    "action.returnCalendar": "カレンダーにもどる",
    "game.updateUI.2": "スタミナ {value0} ムーブ",
    "label.stage": "STAGE {value0}",
    "game.formatStageRecord": "{value0}ムーブ {value1}",
    "hold.hazard": "小さくとがったホールド",
    "feature.hazard": "新しく手足を固定するとスタミナを追加で1消費する",
    "feature.heart": "ボディで触れるとスタミナが2回復する",
    "feature.title.heart": "スタミナ+2",
    "action.tap": "TAP",
    "leaderboard.stageLeaderboardMarkup": "{value6}ムーブ",
    "leaderboard.stageLeaderboardMarkup.2": "{value0}位 記録なし",
    "level-map.selectStage": "ステージを生成できませんでした。もう一度選んでください。",
    "level-map.renderStageHeartItems": "規定スタミナ {value0}",
    "level-map.renderStageHeartItems.2": "使用ハート {value0}個、タップで1個追加",
    "level-map.renderLevelMap": "挑戦できます",
    "level-map.renderLevelMap.2": "未解放",
    "level-map.renderLevelMap.3": "クリア済み",
    "level-map.renderLevelMap.4": "スター",
    "level-map.renderLevelMap.5": " 報酬あり",
    "level-map.renderLevelMap.6": "PLAY",
    "level-map.renderLevelMap.7": "STAGE {value4} {value5}{value6}{value7}",
    "level-map.renderMapPlayers": "{value0}の名前を表示",
    "level-map.renderMapInventory": "チョークバッグ 所持数 {value0}個",
    "lives.refreshLives": "ライフがありません。広告を見てライフを増やしますか？",
    "lives.refreshLives.2": "ライフが回復しました。ステージを開始しますか？",
    "lives.refreshLives.3": "広告を見る",
    "lives.refreshLives.4": "ステージを開始",
    "lives.refreshLives.5": "ライフ {value0} / {value1}",
    "lives.refreshLives.6": "ライフ0、回復まで {value0}",
    "label.version": "VERSION {value0}",
    "online-scores.onlineStageScores": "プレイヤー",
    "online-scores.stageScoreStatus": "まだオンライン記録がありません",
    "online-scores.stageScoreStatus.2": "ランキングを読み込み中…",
    "online-scores.stageScoreStatus.3": "ランキングを取得できません",
    "online-scores.stageScoreStatus.4": "オンライン接続を待っています",
    "online-scores.stageScoreStatus.5": "記録のオンライン保存を待っています",
    "online-scores.stageScoreStatus.6": "記録を保存中…",
    "online-scores.persistPendingScores": "スコアの送信待ち：{value0}件",
    "online.startOnline": "プロフィール同期のため接続中…",
    "online.flushOnlineProfile": "プロフィール同期済み",
    "online.flushOnlineProfile.2": "プロフィール同期中…",
    "online.onlineError": "プロフィール未同期（通信を確認してください）",
    "online.updateTitleUid": "UID 接続中…",
    "online.updateTitleUid.2": "UID 未接続",
    "label.uid": "UID {value0}",
    "online": "プロフィールの同期を準備中…",
    "hold.start": "START",
    "hold.goal": "GOAL",
    "label.height": "{value0} M",
    "rewards.rewardResultMarkup": "チョークバッグ",
    "rewards.rewardResultMarkup.2": "ライフアップ",
    "rewards.rewardResultMarkup.3": "ライフは上限{value0}です",
    "transfer.progressGeneration": "旧版の引き継ぎファイルは、この版には読み込めません。現在のデータは変更していません。",
    "transfer": "ASCENTの引き継ぎファイルとして読み込めません。",
    "transfer.2": "内容を確認して「このデータを読み込む」を押してください。",
    "transfer.3": "{value0}\nUID {value1}\n到達ステージ {value2}\nこの端末のゲームデータを置き換えます。",
    "transfer.4": "ファイルが大きすぎます。",
    "transfer.5": "ファイルが大きすぎます。ASCENTの引き継ぎファイルを選んでください。",
    "transfer.6": "「ファイルを保存」を押し、移行先の端末でインポートしてください。",
    "transfer.importTransferFile": "引き継ぎが完了しました。「再読み込み」を押してください。",
    "transfer.importTransferFile.2": "引き継ぎが完了しました。再読み込みします。",
    "transfer.importTransferFile.3": "同じUIDを確認してデータを読み込んでいます…",
    "transfer.exportTransferFile": "引き継ぎ情報を端末に保存できません。保存を許可してからお試しください。",
    "transfer.exportTransferFile.2": "引き継ぎファイルを準備しています…",
    "transfer.withTransferLock": "オンライン接続が完了してからお試しください。",
    "transfer.transferErrorMessage": "引き継ぎできませんでした。もう一度お試しください。",
    "transfer.transferErrorMessage.2": "オンラインに接続して、もう一度お試しください。",
    "transfer.transferErrorMessage.3": "このファイルの引き継ぎ情報を確認できません。元の端末でエクスポートし直してください。",
    "transfer.transferErrorMessage.4": "FirebaseのAuthentication → ログイン方法で「メール／パスワード」を有効にしてください。",
    "transfer.commitTransferFile": "保存できなかったため、元のデータに戻しました。端末の空き容量を確認してください。",
    "transfer.commitTransferFile.2": "端末への保存を許可してから、もう一度読み込んでください。",
    "transfer.createTransferIdentity": "安全な引き継ぎ情報を作成できません。対応ブラウザで開いてください。",
    "ui.wall.aria-label": "クライミングゲーム",
    "ui.game.aria-label": "1本指のスワイプで移動、ボディをタップしてUndo、2本指のスワイプでステージをスクロール",
    "ui.settingsButton.aria-label": "設定を開く",
    "ui.titleScreen.aria-label": "準備完了後にタップしてマップへ",
    "ui.characterEditor.aria-label": "キャラエディット",
    "ui.editorPalette.aria-label": "カラーパレット",
    "ui.levelMap.aria-label": "ステージマップ",
    "ui.openDaily.aria-label": "デイリーチャレンジ",
    "ui.mapScroll.aria-label": "ステージ一覧。上下にスクロールできます",
    "ui.mapNext.aria-label": "次の20STAGEへ",
    "ui.mapPrev.aria-label": "前の20STAGEへ",
    "ui.mapPlayers.aria-label": "他のプレイヤー",
    "ui.dailyBack.aria-label": "マップへ戻る",
    "ui.dailyPrev.aria-label": "前の月",
    "ui.dailyNext.aria-label": "次の月",
    "ui.dailyStartGift.alt": "本日の報酬は未受取です",
    "ui.closeLife.aria-label": "閉じる",
    "ui.adCounter.aria-label": "広告の残り秒数",
    "ui.closeResult.aria-label": "閉じて戻る",
    "ui.resultTip.aria-label": "Tips",
    "ui.resultRanking.aria-label": "ステージハイスコア",
    "ui.stageStartDialog.div.aria-label": "開始スタミナと使用するハート",
    "ui.stageHeartCount.aria-label": "ハートを1個追加",
    "ui.stageHeartReset.aria-label": "使用するハートを0個に戻す",
    "ui.closeSettings.aria-label": "設定を閉じる",
    "ui.closeHelp.aria-label": "説明を閉じる",
    "title.document": "ASCENT — クライミングパズル",
    "title.brand": "ASCENT",
    "title.tagline": "One-swipe bouldering",
    "ui.titleTransfer": "データ引き継ぎ",
    "ui.characterEditor.label": "プレイヤー名",
    "ui.playerNameError": "プレイヤー名を入力してください。",
    "ui.bodyStripeControls.label": "ボディの塗り分け",
    "ui.editorRandom": "おまかせ",
    "ui.editorCancel": "戻る",
    "ui.editorConfirm": "決定",
    "date.weekday.sun": "日",
    "date.weekday.mon": "月",
    "date.weekday.tue": "火",
    "date.weekday.wed": "水",
    "date.weekday.thu": "木",
    "date.weekday.fri": "金",
    "date.weekday.sat": "土",
    "ui.dailyCalendar.div.section.div.div.dl.div.dt": "難易度",
    "ui.dailyCalendar.div.section.div.div.dl.div.dt.2": "コースの長さ",
    "ui.dailyStartButton": "スタート",
    "ui.lifeCancel": "キャンセル",
    "ui.adTitle": "広告",
    "ui.adComplete": "完了",
    "ui.rewardTitle": "アイテム獲得",
    "ui.settingsTitle": "設定",
    "ui.restart": "リタイヤ",
    "ui.mapEditCharacter": "キャラクターエディット",
    "ui.mapSettingsControls.label.span.2": "言語",
    "ui.languageChoice.option": "日本語",
    "ui.languageChoice.option.2": "English",
    "ui.showHelp": "くわしいあそびかた",
    "ui.mapCourses": "タイトル画面へ",
    "ui.mapSettingsFooter.label.span": "デバッグモード",
    "ui.transferDialog.p": "進行状況・記録・見た目・所持アイテム・ライフと、同じUIDを引き継ぎます。",
    "ui.transferDialog.p.2": "保存ファイルで同じユーザーとして復元できます。他の人に渡さず、大切に保管してください。",
    "ui.transferExport": "エクスポート",
    "ui.transferDownload": "ファイルを保存",
    "ui.transferDialog.label": "インポートするファイル",
    "ui.transferImport": "このデータを読み込む",
    "ui.transferReload": "再読み込み",
    // Owner-authored JA-only help blocks; empty translations are intentionally hidden.
    "help.controls.feet": "足を手より高い位置に置くことはできません。",
    "help.holds.goalLabel": "ゴールホールド",
    "help.holds.goal": "ゴールを両手でつかむと登頂成功です。",
    "help.map.chalk": "開始前の画面でチョークバッグの使用量を増やすと1個につきスタミナを1追加できます。使った分は消費され、やり直しには持ち越しません。",
    "help.map.unlock": "クリアすると次が開き、クリア済みのステージは何度でも遊べます。",
    "help.game.intro": "ASCENTは、クライマーを動かしてゴールを目指すボルダリングゲームです。ホールドを選びながら、少ないムーブで登ってみましょう。",
    "help.rules.heading": "ルール",
    "help.rules.goal": "手足4本がホールドに固定された状態で、黄色いゴールを両手でつかむとクリアです。",
    "help.rules.stamina": "1ムーブごとにスタミナを消費し、0になる前にゴールできれば登頂成功です。",
    "help.rules.lives": "ステージマップでは、登頂に失敗するとライフが一つ減り、ライフがなくなると回復するまであそぶことができません。",
    "help.rules.tutorial": "",
    "help.controls.heading": "そうさ方法",
    "help.controls.move": "画面をスワイプして体を動かします。2本の手足で支え、残りの2本は近くのホールドへ自動で移ります。",
    "help.controls.commit": "手足4本がホールドに届く位置で指を離すと、1ムーブが決まります。届かない位置で離すと、移動前の位置へ戻ります。",
    "help.controls.undo": "ボディを短くタップすると、直前の1ムーブだけ元に戻せます。",
    "help.controls.scroll": "2本指スワイプ、または画面の左右端をスワイプすると、壁を上下にスクロールできます。",
    "help.holds.heading": "ホールドとアイテム",
    "help.holds.normalLabel": "ホールド",
    "help.holds.normal": "手足を1本置くことができます。",
    "help.holds.wideLabel": "大きなホールド",
    "help.holds.wide": "両手または両足を置くことができます。手と足を一緒に置くことはできません。",
    "help.holds.hazardLabel": "尖ホールド",
    "help.holds.hazard": "小さくとがったホールドです。新たにつかんで1ムーブを確定すると、スタミナを追加で1消費します。",
    "help.holds.heartLabel": "スタミナ+2",
    "help.holds.heart": "コース上でボディが触れると、スタミナが2回復します。",
    "help.holds.chalkLabel": "",
    "help.holds.chalk": "",
    "help.map.heading": "ステージマップ",
    "help.map.select": "マップに並んだステージを順番にクリアするモードです。",
    "help.map.records": "",
    "help.map.rewards": "",
    "help.map.lives": "",
    "help.daily.heading": "デイリーチャレンジ",
    "help.daily.select": "マップの飛行船からカレンダーを開き、その日のお題にチャレンジします。\nライフは消費せず、チョークバッグも使えません。",
    "help.daily.attempts": "",
    "help.daily.rewards": "",
    "help.settings.heading": "設定",
    "help.settings.audio": "右上の歯車アイコンから開きます。音楽と効果音のオン・オフと音量、使う言語が変えられます。\n使う場所によって「リタイヤ」や「タイトルに戻る」などが選べます。",
    "help.settings.navigation": "",
    "help.editor.heading": "キャラクターエディット",
    "help.editor.customize": "マップとデイリーの設定から開き、プレイヤー名と配色を変えられます。スライダーでボディを1〜8段に分け、頭や各段をタップして色を選びます。「おまかせ」で配色と段数をランダムに変更できます。",
    "help.editor.saveCancel": "プレイヤー名は10文字まで入力できます。「決定」で保存し、「戻る」で変更を取り消します。見た目を変えても、登る力やスタミナは変わりません。",
    "help.trialNote": "この試遊版はオフラインです。記録は正式版とは別に、このブラウザに保存されます。オンラインランキングへの送信とデータの引き継ぎはできません。広告はテスト用の画面です。"
});


// js/text-en.js
"use strict";
// English copy aligned with the Japanese player and maintenance catalogs.
// Placeholder names and intentionally empty help blocks match the Japanese source.
const GAME_TEXT_EN = Object.freeze({
    "debug.pair.title": "Moving limbs | Tap wall to hide",
    "debug.pair.feet": "Both feet",
    "debug.pair.right": "RH + RF",
    "debug.pair.rightLeft": "RH + LF",
    "debug.pair.leftRight": "LH + RF",
    "debug.pair.left": "LH + LF",
    "debug.pair.hands": "Both hands",
    "debug.pair.hint": "0.1° angle samples | Swipe to hide",

    "debug.score.start": "Play scores 1–100 in order",
    "debug.score.help": "One course per production difficulty score. Retries use the same layout. Clear to continue, or use Next score to skip. Records, lives and rewards are unaffected.",
    "debug.score.current": "SCORE {value0} / 100",
    "debug.score.next": "Next score",
    "debug.score.retry": "Retry this score",
    "debug.score.done": "Trial complete · Map",

    "debug.swipe.title": "Swipe sensitivity comparison",
    "debug.swipe.less": "Decrease sensitivity by 0.05",
    "debug.swipe.more": "Increase sensitivity by 0.05",
    "debug.swipe.reset": "Reset to 1.00× (standard)",
    "debug.swipe.mode": "Apply to",
    "debug.swipe.limbs": "Limb aiming only",
    "debug.swipe.body": "Include body",
    "debug.swipe.help": "Steps of 0.05, from 0.25× to 3.00×. Applies to the next swipe. 1.00× is the formal default: 1.5× limb aiming with unchanged body sensitivity. Settings survive retries and reset on reload. Comparison factors do not change the standard course or expected route. Runs using nonstandard sensitivity are excluded from rankings.",

    "course-preparation.loading": "Preparing course…",
    "course-preparation.retry": "Retry preparation",
    "course-preparation.error": "Could not prepare the course. Please retry or close and reopen.",
    "online-scores.pendingBlocked": "Pending records are protected. Sync has been stopped.",
    "formal.ranking.localOnly": "This run used debug assistance. Progress is saved, but this record is not submitted to rankings.",
    "formal.seed.label": "DEBUG SEED offset",
    "formal.seed.apply": "Apply",
    "formal.seed.help": "Normal play always uses +10. This DEBUG offset applies from the next test stage, and test results are not saved as progress or official records. Daily is unchanged.",
    "formal.seed.invalid": "Enter an integer from 0 to 4294967295.",
    "formal.seed.unsafe": "Turn DEBUG on and apply the offset from the map.",
    "formal.seed.saved": "Applied. The offset will take effect from the next test stage.",
    "formal.seed.unsaved": "Applied for this session. Could not save on this device.",
    // Translations of the current owner-authored tutorial copy.
    "tutorial.title.play": "Welcome to ASCENT!",
    "tutorial.title.complete": "Tutorial Complete",
    "tutorial.title.wide": "Large Hold",
    "tutorial.intro.welcome": "Swipe the screen to move, then release your finger to choose your holds",
    "tutorial.intro.movement": "Two of your limbs move freely. Your feet cannot be placed higher than your hands",
    "tutorial.intro.goal": "Grab the goal with both hands before your stamina runs out to reach the summit",
    "tutorial.wide": "A large hold can support both hands or both feet.",
    "tutorial.move.cancel": "Tap with two fingers to cancel your current move",
    "tutorial.move.undo": "Briefly tap the body to undo one move",
    "tutorial.goal.fixed": "To finish, both feet must also be fixed on holds",
    "tutorial.goal.finish": "Detailed controls and rules are available in the menu opened with the gear icon",


    "debug.exit": "End trial",
    "debug.trialError": "Trial generation failed: {value0}",

    "settings.connection": "Connection Status",
    "settings.appVersion": "App version",
    "settings.online": "Online",
    "settings.offline": "Offline",
    "audio.music": "BGM",
    "audio.effects": "Effects",
    "audio.musicVolume": "Music volume",
    "audio.effectsVolume": "Effects volume",

    // Debug and account-maintenance UI must not fall back to Japanese in English.
    "account-deletion": "Waiting to delete user data",
    "account-deletion.2": "Could not reset the data saved on this device.",
    "account-deletion.deleteCurrentAccount": "Deletion is not complete. Check your connection and Firestore rules, then try again.",
    "account-deletion.deleteCurrentAccount.2": "Your authentication needs to be verified again. Make a note of the displayed UID, then delete the authentication account in the Firebase console.",
    "account-deletion.deleteCurrentAccount.3": "User data deleted",
    "account-deletion.deleteCurrentAccount.4": "Your user data has been deleted",
    "account-deletion.deleteCurrentAccount.5": "Deleting scores… {value0} records",
    "account-deletion.deleteCurrentAccount.6": "Deleting… Please wait without closing this window.",
    "account-deletion.restoreDeletionSession": "Could not verify your authentication for deletion. Check your connection and reload",
    "account-deletion.showDeleteUserDialog": "The previous deletion is not complete. Select “Delete” to try again.",
    "account-deletion.showDeleteUserDialog.2": "Please close this window. A new user will not be created automatically.",
    "account-deletion.showDeleteUserDialog.3": "Your user data has been deleted.",
    "game.updateUI": "Moves: {value0} / Expected moves: {value1} / {value2}",
    "leaderboard.renderStageLeaderboard": "Debug records are not submitted",
    "level-map": "Enter a stage number that is an integer of 1 or greater.",
    "ui.debugControls.label": "Stage Number",
    "ui.debugControls.small": "Locked stages can also be selected. Clear progress is not saved.",
    "ui.debugDeleteUser": "Delete My User Data",
    "ui.stageDebugDisplay.label.span": "Expected Route",
    "ui.stageDebugDisplay.label.span.2": "Hold Numbers",
    "ui.stageDebugDisplay.label.span.3": "Course Information",
    "ui.deleteUserWarning": "This will delete your name, colors, progress, scores for every stage, authentication account, and the game data on this device. This action cannot be undone.",
    "ui.deleteUserConfirm": "Delete",
    "ui.deleteUserNew": "Start as a New User",
    "account-deletion.identitySummary": "{value0}\nUID: {value1}",
    "ui.debugPlay": "Play",

    "appearance.confirmCharacterEditor": "Your name and colors have been applied, but could not be saved on this device.",
    "appearance.renderCharacterEditor": "Color {value2}",
    "appearance.renderCharacterEditor.2": "Head color {value11}",
    "appearance.renderCharacterEditor.3": "Character color preview: {value0} colors, {value1}",
    "appearance.renderCharacterEditor.4": "Section {value6} from the top, color {value7}",
    "editor.pose.chest": "Standing with legs apart and a hand on the chest",
    "editor.pose.foldedArms": "Standing with arms folded",
    "editor.pose.crossedLegs": "Standing with legs crossed",
    "editor.pose.head": "Standing with a hand on the head",
    "editor.pose.joinedHands": "Standing with hands clasped in front",
    "editor.pose.hip": "Standing with a hand on the hip",
    "editor.pose.weightShift": "Standing with weight on one leg",
    "editor.pose.standing": "Standing naturally",
    "tips.appearance": "Change your look and name in Settings!",
    "tips.cancel": "Touch with two fingers to cancel your current move!",
    "tips.heart": "Touch Stamina +2 with your body!",
    "tips.goal": "Keep both feet supported at the goal!",
    "tips.reach": "Can’t move? Check how far your arms and legs are stretched!",
    "tips.undo": "Tap your body to undo one move!",
    "tips.scroll": "Swipe along the screen edge or with two fingers to scroll!",
    "daily.reportDailyGenerationError": "Could not generate the course. Please select the date again.",
    "score.stars": "Stars: {value0}",
    "course.long": "Long",
    "course.medium": "Medium",
    "course.short": "Short",
    "date.select": "Select a Date",
    "date.yearAndLabel": "{value1}, {value0}",
    "label.daily": "DAILY {value0}",
    "daily.renderDailyCalendar": "{value0}/{value1}",
    "daily.renderDailyCalendar.2": "Available to select",
    "daily.renderDailyCalendar.3": " stars · Cannot replay",
    "daily.renderDailyCalendar.4": "Silver Coin",
    "daily.renderDailyCalendar.5": "Gold Coin",
    "daily.renderDailyCalendar.6": "Cleared · ",
    "daily.renderDailyCalendar.7": "{value5}/{value6}/{value7} {value8}",
    "daily.renderDailyCalendar.8": "{value1}/{value2}/{value3}",
    "daily.renderDailyCalendar.9": "Streak: {value0} days",
    "daily.refreshDailyEntry": "Daily Challenge {value0}",
    "date.monthDayWeekday": "{value0}/{value1} ({value2})",
    "difficulty.hard": "HARD",
    "difficulty.normal": "NORMAL",
    "difficulty.easy": "EASY",
    "firebase-client.bootFirebase": "Profile not synced (offline; playing on this device)",
    "firebase-client.bootFirebase.2": "Deleted user data cannot be transferred.",
    "firebase-client.bootFirebase.3": "The UID in the file does not match the authentication credentials.",
    "firebase-client.bootFirebase.4": "The transfer UID does not match.",
    "firebase-client.bootFirebase.5": "Could not verify your UID. Please reload.",
    "result.failure": "Climb Failed…",
    "result.success": "Summit!",
    "action.retryEnglish": "RETRY",
    "action.retry": "Retry",
    "action.returnMap": "Back to Map",
    "action.returnCalendar": "Back to Calendar",
    "game.updateUI.2": "Stamina: {value0} moves",
    "label.stage": "STAGE {value0}",
    "game.formatStageRecord": "Moves: {value0} {value1}",
    "hold.hazard": "Small Pointed Hold",
    "feature.hazard": "Each new hand or foot placement costs 1 extra stamina",
    "feature.heart": "Touch it with your body to restore 2 stamina",
    "feature.title.heart": "Stamina +2",
    "action.tap": "TAP",
    "leaderboard.stageLeaderboardMarkup": "{value6} moves",
    "leaderboard.stageLeaderboardMarkup.2": "Rank {value0}: No record",
    "level-map.selectStage": "Could not generate the stage. Please select it again.",
    "level-map.renderStageHeartItems": "Base stamina: {value0}",
    "level-map.renderStageHeartItems.2": "Hearts selected: {value0}. Tap to add one.",
    "level-map.renderLevelMap": "Ready to play",
    "level-map.renderLevelMap.2": "Locked",
    "level-map.renderLevelMap.3": "Cleared",
    "level-map.renderLevelMap.4": " stars",
    "level-map.renderLevelMap.5": " Reward available",
    "level-map.renderLevelMap.6": "PLAY",
    "level-map.renderLevelMap.7": "STAGE {value4} {value5}{value6}{value7}",
    "level-map.renderMapPlayers": "Show {value0}’s name",
    "level-map.renderMapInventory": "Chalk Bags owned: {value0}",
    "lives.refreshLives": "You have no lives. Watch an ad to gain a life?",
    "lives.refreshLives.2": "A life has recovered. Start the stage?",
    "lives.refreshLives.3": "Watch Ad",
    "lives.refreshLives.4": "Start Stage",
    "lives.refreshLives.5": "Lives: {value0} / {value1}",
    "lives.refreshLives.6": "No lives. Next life in {value0}",
    "label.version": "VERSION {value0}",
    "online-scores.onlineStageScores": "Player",
    "online-scores.stageScoreStatus": "No online records yet",
    "online-scores.stageScoreStatus.2": "Loading leaderboard…",
    "online-scores.stageScoreStatus.3": "Could not load the leaderboard",
    "online-scores.stageScoreStatus.4": "Waiting for an online connection",
    "online-scores.stageScoreStatus.5": "Waiting to save your record online",
    "online-scores.stageScoreStatus.6": "Saving your record…",
    "online-scores.persistPendingScores": "Scores waiting to upload: {value0}",
    "online.startOnline": "Connecting to sync your profile…",
    "online.flushOnlineProfile": "Profile synced",
    "online.flushOnlineProfile.2": "Syncing profile…",
    "online.onlineError": "Profile not synced (check your connection)",
    "online.updateTitleUid": "UID Connecting…",
    "online.updateTitleUid.2": "UID Not connected",
    "label.uid": "UID {value0}",
    "online": "Preparing profile sync…",
    "hold.start": "START",
    "hold.goal": "GOAL",
    "label.height": "{value0} M",
    "rewards.rewardResultMarkup": "Chalk Bag",
    "rewards.rewardResultMarkup.2": "Extra Life",
    "rewards.rewardResultMarkup.3": "Lives are capped at {value0}",
    "transfer.progressGeneration": "Transfer files from older versions cannot be imported into this version. Your current data has not changed.",
    "transfer": "This is not a valid ASCENT transfer file.",
    "transfer.2": "Check the details, then select “Import This Data.”",
    "transfer.3": "{value0}\nUID {value1}\nStage Reached: {value2}\nThis will replace the game data on this device.",
    "transfer.4": "The file is too large.",
    "transfer.5": "The file is too large. Please select an ASCENT transfer file.",
    "transfer.6": "Select “Save File,” then import the file on your other device.",
    "transfer.importTransferFile": "Transfer complete. Please select “Reload.”",
    "transfer.importTransferFile.2": "Transfer complete. Reloading…",
    "transfer.importTransferFile.3": "Verifying that your UID matches and importing your data…",
    "transfer.exportTransferFile": "Could not save the transfer credentials on this device. Allow storage, then try again.",
    "transfer.exportTransferFile.2": "Preparing your transfer file…",
    "transfer.withTransferLock": "Please wait until you are connected online, then try again.",
    "transfer.transferErrorMessage": "Could not transfer your data. Please try again.",
    "transfer.transferErrorMessage.2": "Please connect to the internet and try again.",
    "transfer.transferErrorMessage.3": "Could not verify the credentials in this file. Export a new file from your original device.",
    "transfer.transferErrorMessage.4": "Enable “Email/Password” under Authentication → Sign-in method in Firebase.",
    "transfer.commitTransferFile": "Could not save your data, so the original data was restored. Check your device’s available storage.",
    "transfer.commitTransferFile.2": "Allow storage on this device, then try importing again.",
    "transfer.createTransferIdentity": "Could not create secure transfer credentials. Please use a supported browser.",
    "ui.wall.aria-label": "Climbing Game",
    "ui.game.aria-label": "Swipe with one finger to move, tap your body to undo, and swipe with two fingers to scroll the stage",
    "ui.settingsButton.aria-label": "Open Settings",
    "ui.titleScreen.aria-label": "Tap when ready to open the map",
    "ui.characterEditor.aria-label": "Character Editor",
    "ui.editorPalette.aria-label": "Color Palette",
    "ui.levelMap.aria-label": "Stage Map",
    "ui.openDaily.aria-label": "Daily Challenge",
    "ui.mapScroll.aria-label": "Stage list. Scroll up or down.",
    "ui.mapNext.aria-label": "Next 20 Stages",
    "ui.mapPrev.aria-label": "Previous 20 Stages",
    "ui.mapPlayers.aria-label": "Other Players",
    "ui.dailyBack.aria-label": "Back to Map",
    "ui.dailyPrev.aria-label": "Previous Month",
    "ui.dailyNext.aria-label": "Next Month",
    "ui.dailyStartGift.alt": "Today’s reward has not been claimed",
    "ui.closeLife.aria-label": "Close",
    "ui.adCounter.aria-label": "Ad time remaining in seconds",
    "ui.closeResult.aria-label": "Close and Return",
    "ui.resultTip.aria-label": "Tips",
    "ui.resultRanking.aria-label": "Stage High Scores",
    "ui.stageStartDialog.div.aria-label": "Starting stamina and selected hearts",
    "ui.stageHeartCount.aria-label": "Add One Heart",
    "ui.stageHeartReset.aria-label": "Reset Selected Hearts to Zero",
    "ui.closeSettings.aria-label": "Close Settings",
    "ui.closeHelp.aria-label": "Close Instructions",
    "title.document": "ASCENT — Climbing Puzzle",
    "title.brand": "ASCENT",
    "title.tagline": "One-swipe bouldering",
    "ui.titleTransfer": "Data Transfer",
    "ui.characterEditor.label": "Player Name",
    "ui.playerNameError": "Please enter a player name.",
    "ui.bodyStripeControls.label": "Body Color Sections",
    "ui.editorRandom": "Randomize",
    "ui.editorCancel": "Back",
    "ui.editorConfirm": "Confirm",
    "date.weekday.sun": "Sun",
    "date.weekday.mon": "Mon",
    "date.weekday.tue": "Tue",
    "date.weekday.wed": "Wed",
    "date.weekday.thu": "Thu",
    "date.weekday.fri": "Fri",
    "date.weekday.sat": "Sat",
    "ui.dailyCalendar.div.section.div.div.dl.div.dt": "Difficulty",
    "ui.dailyCalendar.div.section.div.div.dl.div.dt.2": "Course Length",
    "ui.dailyStartButton": "Start",
    "ui.lifeCancel": "Cancel",
    "ui.adTitle": "Ad",
    "ui.adComplete": "Done",
    "ui.rewardTitle": "Item Obtained",
    "ui.settingsTitle": "Settings",
    "ui.restart": "Give Up",
    "ui.mapEditCharacter": "Character Editor",
    "ui.mapSettingsControls.label.span.2": "Language",
    "ui.languageChoice.option": "日本語",
    "ui.languageChoice.option.2": "English",
    "ui.showHelp": "Detailed Instructions",
    "ui.mapCourses": "Title Screen",
    "ui.mapSettingsFooter.label.span": "Debug Mode",
    "ui.transferDialog.p": "Transfer your progress, records, appearance, items, lives, and the same UID.",
    "ui.transferDialog.p.2": "This file can restore access to your user account. Keep it safe and do not share it.",
    "ui.transferExport": "Export",
    "ui.transferDownload": "Save File",
    "ui.transferDialog.label": "File to Import",
    "ui.transferImport": "Import This Data",
    "ui.transferReload": "Reload",
    // Match the current Japanese help, including intentionally omitted blocks.
    "help.controls.feet": "Your feet cannot be placed higher than your hands.",
    "help.holds.goalLabel": "Goal Hold",
    "help.holds.goal": "Grab the goal with both hands to reach the summit.",
    "help.map.chalk": "On the screen before a stage starts, increasing the number of Chalk Bags used adds 1 stamina per bag. Used bags are consumed, and their bonus does not carry over to a retry.",
    "help.map.unlock": "Clearing a stage unlocks the next one, and cleared stages can be replayed as often as you like.",
    "help.game.intro": "ASCENT is a bouldering game where you guide a climber to the goal. Choose your holds and try to reach the top in fewer moves.",
    "help.rules.heading": "Rules",
    "help.rules.goal": "Grab the yellow goal with both hands while all four limbs are fixed on holds to clear the stage.",
    "help.rules.stamina": "Each move uses stamina. Reach the goal before it drops to 0 to complete the climb.",
    "help.rules.lives": "On the Stage Map, failing a climb costs one life. If you run out of lives, you cannot play until they recover.",
    "help.rules.tutorial": "",
    "help.controls.heading": "Controls",
    "help.controls.move": "Swipe the screen to move your body. Two limbs support you while the other two automatically move to nearby holds.",
    "help.controls.commit": "Release where all four limbs can reach holds to complete one move. Release where they cannot reach, and you return to your previous position.",
    "help.controls.undo": "Tap your body briefly to undo only your last move.",
    "help.controls.scroll": "Swipe with two fingers, or along the left or right edge of the screen, to scroll the wall up and down.",
    "help.holds.heading": "Holds and Items",
    "help.holds.normalLabel": "Hold",
    "help.holds.normal": "Supports one hand or foot.",
    "help.holds.wideLabel": "Large Hold",
    "help.holds.wide": "Can support both hands or both feet. A hand and a foot cannot share it.",
    "help.holds.hazardLabel": "Pointed Hold",
    "help.holds.hazard": "A small pointed hold. Completing a move with a new grip on it costs 1 extra stamina.",
    "help.holds.heartLabel": "Stamina +2",
    "help.holds.heart": "Touch it with your body on the course to restore 2 stamina.",
    "help.holds.chalkLabel": "",
    "help.holds.chalk": "",
    "help.map.heading": "Stage Map",
    "help.map.select": "In this mode, clear the stages on the map in order.",
    "help.map.records": "",
    "help.map.rewards": "",
    "help.map.lives": "",
    "help.daily.heading": "Daily Challenge",
    "help.daily.select": "Open the calendar from the airship on the map and take on the challenge for that day.\nNo lives are used, and Chalk Bags cannot be used.",
    "help.daily.attempts": "",
    "help.daily.rewards": "",
    "help.settings.heading": "Settings",
    "help.settings.audio": "Open Settings with the gear icon at the top right. You can turn music and sound effects on or off, adjust their volume, and change the language.\nDepending on where you open Settings, options such as “Give Up” and “Title Screen” are available.",
    "help.settings.navigation": "",
    "help.editor.heading": "Character Editor",
    "help.editor.customize": "Open it from the map or Daily settings to change your name and colors. Use the slider to divide the body into 1–8 sections, then tap the head or a section to choose its color. “Randomize” changes the colors and number of sections at random.",
    "help.editor.saveCancel": "Your name can contain up to 10 characters. Select “Confirm” to save, or “Back” to discard your changes. Appearance does not change your climbing ability or stamina.",
    "help.trialNote": "This trial is offline. Records are saved in this browser separately from the regular game. Online ranking submissions and data transfers are disabled. Ads use a test screen."
});

// Singular forms share the same keys and placeholder contract.
const GAME_TEXT_EN_ONE = Object.freeze({
    "appearance.renderCharacterEditor.3": "Character color preview: {value0} color, {value1}",
    "account-deletion.deleteCurrentAccount.5": "Deleting scores… {value0} record",
    "daily.renderDailyCalendar.9": "Streak: {value0} day",
    "game.updateUI.2": "Stamina: {value0} move",
    "daily.renderDailyCalendar.3": " star · Cannot replay",
    "level-map.renderLevelMap.4": " star",
    "leaderboard.stageLeaderboardMarkup": "{value6} move"
});


// js/text-dev-ja.js
"use strict";
// Japanese source for active debug tools and account maintenance; English counterparts are in text-en.js.
const GAME_DEV_TEXT_JA = Object.freeze({
    "debug.score.start": "スコア1〜100を順番に試遊",
    "debug.score.help": "本番と同じ難易度スコアで各1コースを試遊。再挑戦は同じ配置。クリア後は次へ進みます。途中で「次のスコアへ」でスキップも可能です。記録・ライフ・報酬には影響しません。",
    "debug.score.current": "SCORE {value0} / 100",
    "debug.score.next": "次のスコアへ",
    "debug.score.retry": "同じスコアを再挑戦",
    "debug.score.done": "試遊完了・マップへ",

    "debug.swipe.title": "スワイプ感度の比較",
    "debug.swipe.less": "感度を0.05下げる",
    "debug.swipe.more": "感度を0.05上げる",
    "debug.swipe.reset": "1.00倍（標準）に戻す",
    "debug.swipe.mode": "適用先",
    "debug.swipe.limbs": "四肢の狙いだけ",
    "debug.swipe.body": "ボディも含む",
    "debug.swipe.help": "0.05刻み・0.25〜3.00倍。次のスワイプから反映。1.00倍は正式仕様（四肢の狙い1.5倍・ボディ従来）の標準です。設定はリトライ後も維持し、再読み込みで標準に戻ります。比較倍率を変えてもコース・想定ルートは標準のままです。標準以外で操作した記録はランキング対象外です。",

    "account-deletion": "ユーザーデータの削除を待っています",
    "account-deletion.2": "端末の保存データを初期化できませんでした。",
    "account-deletion.deleteCurrentAccount": "削除が完了していません。接続とFirestoreのルールを確認して再試行してください。",
    "account-deletion.deleteCurrentAccount.2": "認証の再確認が必要です。表示中のUIDを控え、Firebase管理画面で認証アカウントを削除してください。",
    "account-deletion.deleteCurrentAccount.3": "ユーザーデータ削除済み",
    "account-deletion.deleteCurrentAccount.4": "ユーザーデータを削除しました",
    "account-deletion.deleteCurrentAccount.5": "スコアを削除中… {value0}件",
    "account-deletion.deleteCurrentAccount.6": "削除中…このウィンドウを閉じずにお待ちください。",
    "account-deletion.restoreDeletionSession": "削除の認証を確認できません。接続を確認して再読み込みしてください",
    "account-deletion.showDeleteUserDialog": "前回の削除は完了していません。「削除する」で再試行してください。",
    "account-deletion.showDeleteUserDialog.2": "このウィンドウを閉じてください。新しいユーザーは自動作成しません。",
    "account-deletion.showDeleteUserDialog.3": "ユーザーデータを削除しました。",
    "game.updateUI": "{value0} ムーブ / 想定 {value1} ムーブ / {value2}",
    "leaderboard.renderStageLeaderboard": "デバッグの記録は送信しません",
    "level-map": "ステージ番号は1以上の整数を入力してください。",
    "ui.debugControls.label": "ステージ番号",
    "ui.debugControls.small": "未解放も選択可能・クリア進捗は保存しません",
    "ui.debugDeleteUser": "自分のユーザーデータを削除",
    "ui.stageDebugDisplay.label.span": "想定ルート",
    "ui.stageDebugDisplay.label.span.2": "ホールドNo",
    "ui.stageDebugDisplay.label.span.3": "コース情報",
    "ui.deleteUserWarning": "名前・配色・進行状況・全ステージのスコア・認証アカウントと、この端末のゲームデータを削除します。この操作は取り消せません。",
    "ui.deleteUserConfirm": "削除する",
    "ui.deleteUserNew": "新しいユーザーで開始",
    "account-deletion.identitySummary": "{value0}\nUID: {value1}",
    "ui.debugPlay": "プレイ"
});

const GAME_TEXT_LOCALES=Object.freeze({ja:GAME_TEXT_JA,en:GAME_TEXT_EN});
let GAME_TEXT_LANGUAGE='ja';
function gameText(key, values = {}) {
    const singular = GAME_TEXT_LANGUAGE === 'en' && Number(values.value0) === 1 && GAME_TEXT_EN_ONE[key];
    const text = singular || (GAME_TEXT_LOCALES[GAME_TEXT_LANGUAGE][key] ?? GAME_TEXT_JA[key] ?? GAME_DEV_TEXT_JA[key]);
    if (typeof text !== 'string') throw new Error(`Unknown game text key: ${key}`);
    // A single pass keeps user-supplied braces/$/HTML as literal data.
    return text.replace(/\{(value\d+)\}/g, (_, name) => {
        if (!Object.hasOwn(values, name)) throw new Error(`Missing game text value: ${key}.${name}`);
        return String(values[name]);
    });
}

// js/config.js
"use strict";
const HEART_ITEM_IMAGE_SRC = 'assets/heart-item-chalk-bag.png';
function heartItemIconMarkup() {
    return `<img class="heart-item-icon" src="${HEART_ITEM_IMAGE_SRC}" width="52" height="48" alt="" aria-hidden="true" draggable="false">`;
}
const COURSE_HEART_IMAGE_SRC = 'assets/course-heart-2.svg';
const RELEASE_VERSION = '0.5.13';
// Temporarily disabled for the formal release. Keep historical records and queues.
const COURSE_RANKINGS_ENABLED = false;
const GAMEPLAY_TIP_KEYS = [
    'tips.scroll', 'tips.undo', 'tips.reach',
    'tips.goal', 'tips.heart', 'tips.cancel', 'tips.appearance'
];
const GAMEPLAY_TIPS = GAMEPLAY_TIP_KEYS.map(key=>gameText(key));
// Bump whenever generation/gameplay changes make stage scores incomparable.
const COURSE_VERSION = 'v5';
// Six-pair controls and arc-progress generation: retain older records as history.
const DAILY_COURSE_VERSION = 'v4';
// 表示サイズと可動域。単位はゲーム内の論理pxです。
const W = 400;
const H = 700;
const STAGE_SAFE_WIDTH = 16;
const R = 112;
const MAX_HEIGHT = H * 3;
const TORSO = { width: 40, height: 72, hitPadding: 8 };
// Shared by the live Canvas player and the editor's SVG preview.
const PLAYER_SILHOUETTE_STYLE = { color:'rgba(67,92,80,.22)', width:1.5,
    shadowColor:'rgba(67,92,80,.28)', shadowBlur:3, shadowOffsetY:1.5,
    rootColor:'#d9e9db', rootRadius:2.5 };
const limbs = [
    { x: -52, y: -68 },
    { x: 52, y: -68 },
    { x: -40, y: 78 },
    { x: 40, y: 78 },
];
const LIMB_LENGTHS = [100, 100, 110, 110];
const POSE_CONFIG = {
    highFootMinKneeAngle: 150,
    jointWeights: { inward: 4, spread: 1, overlap: 4, lowHand: .75, kneeBelowFoot: 4, continuity: .03 }
};
const HIGH_FOOT_REACH_RATIO = Math.sin(POSE_CONFIG.highFootMinKneeAngle * Math.PI / 360);
// 初期配置の生成。実際の想定ムーブ数は現行ルールで探索して決定します。
const STAGE_CONFIG = {
    introGuideSteps: 5,
    maxGuideSteps: 100,
    stationSpacing: 40,
    supportSpan: 5,
    introStations: [6.5, 7.5, 8.5, 11.5, 14.5],
    horizontalAmplitude: 160 - STAGE_SAFE_WIDTH,
    traverseDrop: 20,
    climbVariation: 20,
    goalTopMargin: 100,
    bottomMargin: 80,
    startFootSpan: 140,
    lengthRules: [
        {category:'short',labelKey:'course.short',mapHeight:'100',height:H,climbHeight:200},
        {category:'medium',labelKey:'course.medium',mapHeight:'125',height:H*2,climbHeight:290},
        {category:'long',labelKey:'course.long',mapHeight:'150',height:MAX_HEIGHT,climbHeight:600},
    ],
    holdOffset: 8,
};
// Legacy generation-rule families retained for isolated developer trials.
// Formal Stage/Daily settings and labels come from the score resolver.
const DIFFICULTY_RULES = [
    {id:0,hearts:false,hazards:'none',referenceStage:4},
    {id:1,hearts:true,hazards:'none',referenceStage:5},
    {id:2,hearts:true,hazards:'optional',referenceStage:20},
    {id:3,hearts:true,hazards:'dense',referenceStage:40},
];
// Stable legacy developer-trial IDs. Formal courses use only the label mapping;
// these types do not select their geometry/features. generationDifficulty is an
// internal family (legacy 0..3), never a score metadata field.
const COURSE_TYPES = [
    {id:0,name:'basic',generationDifficulty:0,intent:'basic',labelKey:'difficulty.easy'},
    {id:1,name:'plain-choice',generationDifficulty:1,intent:'choice',labelKey:'difficulty.easy'},
    {id:2,name:'optional-choice',generationDifficulty:2,intent:'choice',labelKey:'difficulty.normal'},
    {id:3,name:'optional-consumption',generationDifficulty:2,intent:'consumption',labelKey:'difficulty.normal'},
    {id:4,name:'optional-recovery',generationDifficulty:2,intent:'recovery',labelKey:'difficulty.normal'},
    {id:5,name:'optional-mixed',generationDifficulty:2,intent:'mixed',labelKey:'difficulty.normal'},
    {id:6,name:'dense-choice',generationDifficulty:3,intent:'choice',labelKey:'difficulty.hard'},
    {id:7,name:'dense-consumption',generationDifficulty:3,intent:'consumption',labelKey:'difficulty.hard'},
    {id:8,name:'dense-recovery',generationDifficulty:3,intent:'recovery',labelKey:'difficulty.hard'},
    {id:9,name:'dense-mixed',generationDifficulty:3,intent:'mixed',labelKey:'difficulty.hard'},
];
// 追加ホールドの候補配置。
const HOLD_SPACING = 52;
const HOLD_CONFIG = {
    passes: 5,
    gridStep: 40,
    jitter: 38,
    sideMargin: STAGE_SAFE_WIDTH + 30,
    topMargin: 28,
    bottomMargin: 50,
    snapGuard: 6,
};
// 密度評価。基準個数はステージ1を実際に生成して測定します。
const DENSITY_CONFIG = {
    sampleStep: 20,
    gapScale: 1.3,
    gapReachRatio: 0.7,
    crowdRadius: 110,
    crowdWeight: 8,
};
// Reference-route heart settings. Formal live stamina applies the adopted
// post-placement reduction separately; reference validation is unchanged.
const HEART_CONFIG = { minMoves: 5, maxCount: 2, recovery: 2, radius: 10, popupDuration: 1000, popupRise: 30 };
// Retained developer trials: family 2 adds 0–5 hazards; family 3 converts
// 10–30%. Formal courses instead use the adopted score-sampled spike setting.
const HAZARD_CONFIG = { maxCount: 5, minRatio: .1, maxRatio: .3, reserveCount: 6, penalty: 1, shakeDuration: 280, shakeAmplitude: 4, radius: 6, attempts: 140, spacing: 24 };
// 操作と描画。
const INPUT_CONFIG = { edgeScrollWidth: STAGE_SAFE_WIDTH, dragThreshold: 5, aimDistance: 100, reachSearchSteps: 24, tapMaxDuration: 400 };
// Deterministic work limits keep preview/retry budgets identical on slow devices.
const COURSE_GENERATION_CONFIG = {
    recipeAttempts:2, maxDetourMoves:3, comparisonTransitions:600, heartPlacementChecks:24,
};
const ROUTE_COST_SEARCH_CONFIG = {maxTransitions:1800,beamWidth:2};
const ROUTE_OPTIMIZATION_CONFIG = { maxTransitions: 900, passes: 2 };
const CAMERA_CONFIG = { goalTopPadding: 180, bodyScreenRatio: 0.6, followRate: 0.08, introSpeed: H * 1.5, introMinDuration: 1000 };
const FALL_CONFIG = { gravity: 1400, clearance: 180 };
const RENDER_CONFIG = { maxPixelRatio: 2, safeAreaColor: '#aeb8ac' };


// js/course-progression-config.js
'use strict';
// Editable data, not a stage lookup table. Change version AND COURSE_VERSION
// whenever an edit changes normal courses. Daily keeps an independent data and
// score version; change daily.version AND DAILY_COURSE_VERSION only when its
// date score, recipe or gameplay changes. Never relabel saved historical scores.
const CourseProgressionConfig = globalThis.CourseProgressionConfig = {
    version: '5',
    normalSeedOffset: 10, // Uint32 offset; Daily remains date-seeded.
    rounding: 'nearest', // Math.round: positive half-integers round upward.
    stageSegments: [
        {fromStage: 1, toStage: 20, fromScore: 1, toScore: 20},
        {fromStage: 21, toStage: 80, fromScore: 21, toScore: 40},
        {fromStage: 81, toStage: 200, fromScore: 35, toScore: 45},
        // Stage 200 belongs to the previous segment (score 45). The next
        // segment starts at 201 but interpolates from the independent 200=40
        // anchor. A downward jump or overlapping SCORE ranges is intentional.
        {fromStage: 201, toStage: 400, interpolationFromStage: 200, fromScore: 40, toScore: 50}
    ],
    afterLastStageScore: 50,
    daily: {version: '1', minScore: 20, maxScore: 40, randomVersion: '1'},
    difficultyBands: [
        {fromScore: 1, label: 'EASY'},
        {fromScore: 6, label: 'NORMAL'},
        {fromScore: 31, label: 'HARD'}
    ]
};


// js/course-distribution-config.js
'use strict';
// The score controls generation probabilities, not a sum of selected features.
// Rows: score and weights in the order of values. Endpoint weights are normalized
// before interpolation. Change version whenever these tables change.
const CourseDistributionConfig = globalThis.CourseDistributionConfig = {
 version: '7',
 // Keep all existing streams; the joint trial uses additional named streams.
 randomVersion: '3',
 // v6 preserves legacy length/profile draws; only feature presence is balanced.
 balance: {exclusiveMaxScore:20,shortHeartCap:1},
 // Whole-course presence probabilities, not heart counts or spike percentages.
 // Preserve the base tables below for positive-feature conditionals and rejoining.
 jointTrial: {
  startScore: 10, endScore: 40, rejoinScore: 60,
  start: {heart: .20, spike: .28, both: .04},
  end: {heart: .655, spike: .30, both: .04}
 },
 tables: {
  length: {values:['short','middle','long'], rows:[
   {score:0,weights:[90,10,0]}, {score:5,weights:[90,10,0]},
   {score:30,weights:[30,60,10]}, {score:40,weights:[10,30,60]}, {score:100,weights:[5,25,70]}
  ]},
  composition: {values:['single','pair'], rows:[{score:0,weights:[1,1]},{score:100,weights:[1,1]}]},
  profile: {values:['straight','meander','contrast','branch','switchback'], rows:[
   {score:0,weights:[1,0,0,0,0]}, {score:10,weights:[1,0,0,0,0]},
   {score:15,weights:[1,1,1,0,0]}, {score:20,weights:[1,1,1,0,0]},
   {score:25,weights:[1,1,1,1,1]}, {score:100,weights:[1,1,1,1,1]}
  ]},
  hearts: {values:[0,1,2,3], rows:[
   {score:0,weights:[1,0,0,0]}, {score:3,weights:[1,0,0,0]},
   {score:10,weights:[1,10,0,0]}, {score:30,weights:[2,2,3,0]}, {score:40,weights:[1,1,1,1]}, {score:100,weights:[1,1,1,1]}
  ]},
  spikes: {values:[0,10,20,30], rows:[
   // Match hearts: zero through score 3, first positive integer score 4.
   {score:0,weights:[100,0,0,0]}, {score:3,weights:[100,0,0,0]},
   {score:20,weights:[70,30,0,0]},
   {score:50,weights:[70,30,0,0]}, {score:75,weights:[15,25,40,20]}, {score:100,weights:[5,15,40,40]}
  ]}
 }
};


// js/course-distribution.js
'use strict';
const CourseDistribution=(()=>{
 const config=CourseDistributionConfig;
 function scoreValue(value){
  if(!/^(?:0|[1-9]\d?|100)$/.test(String(value)))throw Error('Invalid course distribution setting (1)');
  return Number(value);
 }
 function seedValue(value){
  if(!/^\d{1,10}$/.test(String(value))||Number(value)>4294967295)throw Error('Invalid course distribution setting (2)');
  return Number(value);
 }
 function probabilities(value,name){
  const score=scoreValue(value),table=config.tables[name];
  if(!table||!Array.isArray(table.values)||!table.values.length||!table.rows?.length)throw Error('Invalid course distribution setting (3)');
  const normalized=table.rows.map((row,i)=>{
   if(!Number.isFinite(row.score)||(i&&row.score<=table.rows[i-1].score)||row.weights.length!==table.values.length||row.weights.some(w=>!Number.isFinite(w)||w<0))throw Error('Invalid course distribution setting (3)');
   const sum=row.weights.reduce((a,b)=>a+b,0);if(sum<=0)throw Error('Invalid course distribution setting (4)');
   return {score:row.score,weights:row.weights.map(w=>w/sum)};
  });
  let low=normalized[0],high=normalized.at(-1);
  if(score<=low.score)return low.weights.slice();
  if(score>=high.score)return high.weights.slice();
  for(let i=1;i<normalized.length;i++)if(score<=normalized[i].score){low=normalized[i-1];high=normalized[i];break;}
  const t=(score-low.score)/(high.score-low.score);
  return low.weights.map((w,i)=>w+(high.weights[i]-w)*t);
 }
 // Base tables stay unchanged. These are the actual whole-course joint events.
 function baseJoint(score){
  const q=(1-probabilities(score,'length')[0])*(1-probabilities(score,'hearts')[0]**2);
  const z=1-probabilities(score,'spikes')[0];
  return categories(q,z,q*z);
 }
 function categories(q,z,b){return {heartOnly:q-b,spikeOnly:z-b,both:b,neither:1-q-z+b};}
 function jointProbabilities(value){
  const score=scoreValue(value),trial=config.jointTrial;
  if(!trial||score<trial.startScore||score>=trial.rejoinScore)return baseJoint(score);
  const lower=score<=trial.endScore?categories(trial.start.heart,trial.start.spike,trial.start.both):categories(trial.end.heart,trial.end.spike,trial.end.both);
  const upper=score<=trial.endScore?categories(trial.end.heart,trial.end.spike,trial.end.both):baseJoint(trial.rejoinScore);
  const t=score<=trial.endScore?(score-trial.startScore)/(trial.endScore-trial.startScore):(score-trial.endScore)/(trial.rejoinScore-trial.endScore);
  const result=Object.fromEntries(Object.keys(lower).map(k=>[k,lower[k]+(upper[k]-lower[k])*t]));
  const values=Object.values(result),q=result.heartOnly+result.both,m=1-probabilities(score,'length')[0];
  if(values.some(p=>!Number.isFinite(p)||p<0||p>1)||Math.abs(values.reduce((a,b)=>a+b,0)-1)>1e-12||q>m+1e-12)throw Error('Invalid course distribution setting (5)');
  return result;
 }
 // Preserve the old pair distribution conditional on at least one heart.
 // A direct 15-cell draw avoids rejection loops and guarantees a positive pair.
 function positiveHeartPairs(value){
  const p=probabilities(value,'hearts'),normalizer=1-p[0]**2;
  if(normalizer<=0)return [];
  return p.flatMap((a,i)=>p.map((b,j)=>({first:config.tables.hearts.values[i],second:config.tables.hearts.values[j],probability:a*b/normalizer})).filter(pair=>pair.first+pair.second>0));
 }
 function choose(weights,values,r){
  let total=0;for(let i=0;i<weights.length;i++){total+=weights[i];if(r<total)return values[i];}
  // Floating point accumulation may end just below 1. Never pick a zero cell.
  for(let i=weights.length-1;i>=0;i--)if(weights[i]>0)return values[i];
  throw Error('Invalid course distribution setting (4)');
 }
 // Independent named substreams keep later choices stable if another draw is added.
 function random(seed,name){
  let hash=(seed^2166136261)>>>0;
  for(const c of 'ascent-distribution-v'+(config.randomVersion??config.version)+':'+name)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  let t=(hash+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 }
 function sampleLegacyV5(value,seedInput){
  const score=scoreValue(value),seed=seedValue(seedInput);
  const pick=(table,stream)=>{
   const weights=probabilities(score,table),r=random(seed,stream);let total=0;
   for(let i=0;i<weights.length;i++){total+=weights[i];if(r<total)return config.tables[table].values[i];}
   return config.tables[table].values.at(-1);
  };
  const length=pick('length','length'),composition=length==='short'?'single':pick('composition','composition');
  const result={type:pick('profile','profile-first'),length,seed:String(seed),heartsFirst:length==='short'?0:pick('hearts','hearts-first'),heartsSecond:length==='short'?0:pick('hearts','hearts-second'),spikePercent:pick('spikes','spikes'),generationScore:score,distributionVersion:'5'};
  if(composition==='pair')Object.assign(result,{composition,secondType:pick('profile','profile-second')});
  const trial=config.jointTrial;
  if(trial&&score>=trial.startScore&&score<trial.rejoinScore){
   const joint=jointProbabilities(score),q=joint.heartOnly+joint.both,m=1-probabilities(score,'length')[0];
   const hasHeart=length!=='short'&&random(seed,'joint-heart-presence')<q/m;
   result.heartsFirst=0;result.heartsSecond=0;result.spikePercent=0;
   if(hasHeart){
    const pairs=positiveHeartPairs(score),pair=choose(pairs.map(p=>p.probability),pairs,random(seed,'joint-heart-pair'));
    result.heartsFirst=pair.first;result.heartsSecond=pair.second;
   }
   const spikeChance=hasHeart?joint.both/q:joint.spikeOnly/(1-q);
   if(random(seed,'joint-spike-presence')<spikeChance){
    const p=probabilities(score,'spikes'),sum=1-p[0];
    result.spikePercent=choose(p.slice(1).map(w=>w/sum),config.tables.spikes.values.slice(1),random(seed,'joint-spike-level'));
   }
  }
  return result;
 }
 // These are conditional probabilities on an already-drawn short course.
 // When the old global marginals cannot fit, reduce both proportionally.
 function shortFeatureProbabilities(value){
  const score=scoreValue(value),short=probabilities(score,'length')[0];
  const joint=jointProbabilities(score),q=joint.heartOnly+joint.both,z=joint.spikeOnly+joint.both;
  const divisor=Math.max(short,q+z);
  const heart=divisor>0?q/divisor:0,spike=divisor>0?z/divisor:0;
  return {heart,spike,neither:Math.max(0,1-heart-spike)};
 }
 function sample(value,seedInput){
  const result=sampleLegacyV5(value,seedInput),score=result.generationScore,seed=Number(result.seed);
  result.distributionVersion=config.version;
  if(score<=config.balance.exclusiveMaxScore){
   result.heartsFirst=0;result.heartsSecond=0;result.spikePercent=0;
   if(result.length==='short'){
    const p=shortFeatureProbabilities(score);
    const feature=choose([p.heart,p.spike,p.neither],['heart','spike','neither'],random(seed,'v6-short-exclusive-feature'));
    if(feature==='heart')result.heartsFirst=config.balance.shortHeartCap;
    if(feature==='spike'){
     const weights=probabilities(score,'spikes'),sum=1-weights[0];
     result.spikePercent=choose(weights.slice(1).map(w=>w/sum),config.tables.spikes.values.slice(1),random(seed,'v6-short-exclusive-spike-level'));
    }
   }
  }else if(result.length==='short'){
   result.heartsFirst=random(seed,'v6-short-heart-presence')<1-probabilities(score,'hearts')[0]?config.balance.shortHeartCap:0;
   result.heartsSecond=0;
  }
  return result;
 }
 return Object.freeze({probabilities,jointProbabilities,positiveHeartPairs,shortFeatureProbabilities,sampleLegacyV5,sample,scoreValue,version:config.version});
})();
globalThis.CourseDistribution=CourseDistribution;


// js/course-progression.js
'use strict';
// Pure resolver: no storage, clock, player identity, network, or game state.
const CourseProgression = (() => {
    const integer = (n, min, max, label) => {
        if (!Number.isSafeInteger(n) || n < min || n > max)
            throw new RangeError('Invalid ' + label);
        return n;
    };
    function validate(config) {
        if (!config || typeof config.version !== 'string' || !config.version || config.rounding !== 'nearest')
            throw new RangeError('Invalid course progression version or rounding');
        integer(config.normalSeedOffset === undefined ? 0 : config.normalSeedOffset, 0, 4294967295, 'normal seed offset');
        if (!Array.isArray(config.stageSegments) || !config.stageSegments.length)
            throw new RangeError('Stage segments must cover stage 1 onward');
        let next = 1;
        for (const segment of config.stageSegments) {
            integer(segment.fromStage, 1, Number.MAX_SAFE_INTEGER, 'segment start');
            integer(segment.toStage, segment.fromStage, Number.MAX_SAFE_INTEGER - 1, 'segment end');
            if (segment.fromStage !== next) throw new RangeError('Stage segments must be ordered without gaps or overlap');
            const anchor = segment.interpolationFromStage ?? segment.fromStage;
            integer(anchor, 1, segment.fromStage, 'interpolation anchor');
            integer(segment.fromScore, 1, 100, 'start score');
            integer(segment.toScore, 1, 100, 'end score');
            if (anchor === segment.toStage && segment.fromScore !== segment.toScore)
                throw new RangeError('A one-stage segment needs a single score');
            next = segment.toStage + 1;
        }
        integer(config.afterLastStageScore, 1, 100, 'final score');
        const daily = config.daily;
        if (!daily || (daily.version !== undefined && (typeof daily.version !== 'string' || !daily.version)) || typeof daily.randomVersion !== 'string' || !daily.randomVersion)
            throw new RangeError('Invalid Daily random version');
        integer(daily.minScore, 1, 100, 'Daily minimum score');
        integer(daily.maxScore, daily.minScore, 100, 'Daily maximum score');
        if (!Array.isArray(config.difficultyBands) || !config.difficultyBands.length || config.difficultyBands[0].fromScore !== 1)
            throw new RangeError('Difficulty bands must start at score 1');
        let previous = 0;
        for (const band of config.difficultyBands) {
            integer(band.fromScore, previous + 1, 100, 'difficulty threshold');
            if (!['EASY', 'NORMAL', 'HARD'].includes(band.label)) throw new RangeError('Invalid difficulty label');
            previous = band.fromScore;
        }
        return config;
    }
    function stageValue(stage, config) {
        integer(stage, 1, Number.MAX_SAFE_INTEGER, 'stage');
        const segment = config.stageSegments.find(row => stage <= row.toStage);
        if (!segment) return config.afterLastStageScore;
        const anchor = segment.interpolationFromStage ?? segment.fromStage;
        if (segment.toStage === anchor) return segment.fromScore;
        return segment.fromScore + (segment.toScore - segment.fromScore) *
            ((stage - anchor) / (segment.toStage - anchor));
    }
    function stageScore(stage, config = CourseProgressionConfig) {
        return Math.round(stageValue(stage, validate(config)));
    }
    function dateSeed(date) {
        if (typeof date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date))
            throw new RangeError('Invalid Daily date');
        const parsed = new Date(date + 'T00:00:00Z');
        if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
            throw new RangeError('Invalid Daily date');
        return Number(date.replaceAll('-', ''));
    }
    function dailyScore(date, config = CourseProgressionConfig) {
        validate(config); dateSeed(date);
        // A dedicated named stream does not consume or perturb the distribution
        // or geometry RNGs. Date keys, never locale/timezone/UID, are hashed.
        let hash = 2166136261;
        for (const c of 'ascent-daily-score-v' + config.daily.randomVersion + ':' + date)
            hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
        let t = (hash + 0x6D2B79F5) >>> 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        const random = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        return config.daily.minScore + Math.floor(random * (config.daily.maxScore - config.daily.minScore + 1));
    }
    function labelForScore(score, config = CourseProgressionConfig) {
        validate(config); integer(score, 1, 100, 'difficulty score');
        return config.difficultyBands.findLast(band => band.fromScore <= score).label;
    }
    function resolveStage(stage, config = CourseProgressionConfig) {
        const score = stageScore(stage, config);
        // Reduce the safe-integer stage before addition to avoid precision loss.
        // Missing offset preserves old editable configurations; Daily never uses it.
        return {kind: 'stage', stage, score, seed: ((stage >>> 0) + (config.normalSeedOffset ?? 0)) >>> 0,
            difficultyLabel: labelForScore(score, config), progressionVersion: config.version};
    }
    function resolveDaily(date, config = CourseProgressionConfig) {
        const score = dailyScore(date, config);
        return {kind: 'daily', date, score, seed: dateSeed(date),
            difficultyLabel: labelForScore(score, config), progressionVersion: config.daily.version ?? config.version};
    }
    function recipe(resolved) {
        // v6 retains v5 length/profile/composition draws and applies the
        // explicitly versioned trial feature constraints; no stage-1 override.
        return {...CourseDistribution.sample(resolved.score, resolved.seed), seed: resolved.seed};
    }
    return Object.freeze({validate, stageScore, dailyScore, dateSeed, labelForScore, resolveStage, resolveDaily, recipe});
})();
globalThis.CourseProgression = CourseProgression;


// js/difficulty-config.js
"use strict";
// Legacy placer calibration and isolated developer course-type trials only.
// Normal progression and Daily are resolved by CourseProgressionConfig. There
// is deliberately no stage band / per-stage table or Daily weighted difficulty.
const DIFFICULTY_CONFIG = {
    calibration:{difficulty:[100,0,0,0,0,0,0,0,0,0],length:[2,5,3]},
    introCategory:'short'
};


// js/utils.js
"use strict";
// 共通の座標計算とシード付き乱数。
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function gripAim(p, origin) {
    const d = distance(p, origin);
    return d < INPUT_CONFIG.dragThreshold ? p : { x: p.x + (p.x - origin.x) * INPUT_CONFIG.aimDistance / d, y: p.y + (p.y - origin.y) * INPUT_CONFIG.aimDistance / d };
}

// World Y increases downward. An ascending diagonal is not a traverse.
function isTraverse(a, b, minimum = 30) {
    return Math.abs(b.x-a.x)>=minimum && b.y>=a.y-1e-7;
}

// Include the boundary so new holds do not sit across the opening stance.
function insideStartTriangle(p, contacts) {
    const [a,b,c] = [contacts[0],contacts[2],contacts[3]];
    const cross = (u,v,w) => (v.x-u.x)*(w.y-u.y)-(v.y-u.y)*(w.x-u.x);
    if (Math.abs(cross(a,b,c)) < 1e-7) return false;
    const sides = [cross(a,b,p),cross(b,c,p),cross(c,a,p)];
    return sides.every(v=>v>=-1e-7) || sides.every(v=>v<=1e-7);
}


// js/difficulty.js
"use strict";
// Generic seeded draw over stable item IDs. Invalid definitions/ratios fail closed.
function weightedItemId(items,weights,seed) {
    const validId=id=>typeof id==='string' && /^[a-z][a-z0-9_-]*$/i.test(id) || Number.isSafeInteger(id) && id>=0;
    if(!Array.isArray(items) || !items.length || Array.from(items).some(item=>!item || !validId(item.id)) || new Set(items.map(item=>item.id)).size!==items.length)
        throw new RangeError('Weighted items require unique valid IDs');
    if(!Array.isArray(weights) || weights.length!==items.length || Array.from(weights).some(w=>typeof w!=='number' || !Number.isFinite(w) || w<0))
        throw new RangeError('Weights must match items and be nonnegative finite numbers');
    if(!Number.isSafeInteger(seed))throw new RangeError('Invalid draw seed');
    const sum=weights.reduce((a,b)=>a+b,0);
    if(!Number.isFinite(sum))throw new RangeError('Weight total must be finite');
    const equal=sum===0,total=equal?items.length:sum,target=mulberry32(seed)()*total;
    let cumulative=0,last=null;
    for(let i=0;i<items.length;i++) {
        const weight=equal?1:weights[i];if(weight>0)last=items[i].id;
        cumulative+=weight;if(target<cumulative)return items[i].id;
    }
    return last;
}
function difficultyRule(id) {
    const rule=DIFFICULTY_RULES.find(item=>item?.id===id);
    if(!rule || typeof rule.hearts!=='boolean' || !['none','optional','dense'].includes(rule.hazards) || !Number.isSafeInteger(rule.referenceStage) || rule.referenceStage<1)
        throw new RangeError('Undefined or invalid difficulty rule');
    return rule;
}
// Weight positions follow stable IDs (numeric IDs first), never declaration order.
function courseTypeDefinitions() {
    return [...COURSE_TYPES].sort((a,b)=>typeof a.id==='number'&&typeof b.id==='number'?a.id-b.id:
        typeof a.id==='number'?-1:typeof b.id==='number'?1:String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0);
}
function courseTypeRule(id) {
    const type=COURSE_TYPES.find(t=>t?.id===id);
    if(!type || !['basic','choice','consumption','recovery','mixed'].includes(type.intent) || typeof type.name!=='string' || !type.name || typeof type.labelKey!=='string' || !type.labelKey)throw new RangeError('Invalid course type');
    difficultyRule(type.generationDifficulty);
    return type;
}
function courseTypeLabel(id) { return gameText(courseTypeRule(id).labelKey); }
function weightedCourseType(weights,seed) {
    const id=weightedItemId(courseTypeDefinitions(),weights,seed);courseTypeRule(id);return id;
}
function validateCourseDistribution(distribution) {
    if(!distribution || typeof distribution!=='object')throw new RangeError('Missing course distribution');
    // Validate both ratios together, including bands that are not selected yet.
    weightedItemId(courseTypeDefinitions(),distribution.difficulty,0);
    for(const type of COURSE_TYPES)courseTypeRule(type.id);
    const lengths=Array.isArray(STAGE_CONFIG.lengthRules)?STAGE_CONFIG.lengthRules.map(r=>({id:r?.category})):[];
    weightedItemId(lengths,distribution.length,0);
    return distribution;
}
// Used only by the retained native placer and explicitly isolated debug trials.
function stageDistribution(n) {
    if(!Number.isSafeInteger(n) || n<0)throw new RangeError('Invalid stage number');
    return validateCourseDistribution(DIFFICULTY_CONFIG.calibration);
}
function dailyDistribution() { return validateCourseDistribution(DIFFICULTY_CONFIG.calibration); }
function generationTypeForScore(score) {
    return {EASY:0,NORMAL:2,HARD:6}[CourseProgression.labelForScore(score)];
}
function courseTypeForStage(n) {
    return generationTypeForScore(CourseProgression.stageScore(n));
}
// Internal legacy family only; never used to sample a normal/Daily recipe.
function difficultyForStage(n) { return courseTypeRule(courseTypeForStage(n)).generationDifficulty; }


// js/stage.js
"use strict";
function makeStageCourse(length, mirror, climbHeight) {
    // Piecewise-linear centerline; sample by arc length without smoothing
    // the corners. Traverses are horizontal or slightly descending.
    const samples = [{ x: W / 2 + mirror * STAGE_CONFIG.horizontalAmplitude, y: 0, s: 0 }];
    let side=mirror, segment=0;
    while(samples[samples.length-1].s<length) {
        const previous=samples[samples.length-1];
        const p=segment%2===0
            ? {x:previous.x,y:previous.y-climbHeight}
            : {x:W/2-side*STAGE_CONFIG.horizontalAmplitude,y:previous.y+STAGE_CONFIG.traverseDrop};
        samples.push({...p,s:previous.s+distance(previous,p)});
        if(segment%2===1)side=-side;
        segment++;
    }
    return s => {
        let low = 0, high = samples.length - 1;
        while (high - low > 1) {
            const mid = (low + high) >> 1;
            if (samples[mid].s < s)
                low = mid;
            else
                high = mid;
        }
        const a = samples[low], b = samples[high], t = clamp((s - a.s) / (b.s - a.s), 0, 1), d = distance(a, b);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: -(b.y - a.y) / d, ny: (b.x - a.x) / d };
    };
}

// Pick length before geometry, independently of difficulty and layout RNG.
// A daily keeps this base seed even when its geometry needs an internal retry.
function stageLengthRule(n,seed=n,distribution=stageDistribution(n)) {
    if(!Number.isSafeInteger(n) || n<0 || !Number.isSafeInteger(seed))throw new RangeError('Invalid stage length seed');
    const rules=STAGE_CONFIG.lengthRules;
    if(!Array.isArray(rules) || !rules.length || Array.from(rules).some(r=>!r || typeof r.category!=='string' || typeof r.labelKey!=='string' || !r.labelKey.length || typeof r.mapHeight!=='string' || !/^[0-9]+$/.test(r.mapHeight) || !Number.isFinite(r.height) || r.height<H || !Number.isFinite(r.climbHeight) || r.climbHeight<=0))
        throw new RangeError('Invalid course length definitions');
    const id=weightedItemId(rules.map(r=>({id:r.category})),validateCourseDistribution(distribution).length,seed ^ 0x4D7C2A19);
    // The dedicated STAGE 1 tutorial keeps its original one-screen geometry.
    const chosen=n===1?DIFFICULTY_CONFIG.introCategory:id;
    const rule=rules.find(r=>r.category===chosen);
    if(!rule || (n===1 && rule.height!==H))throw new RangeError('Invalid tutorial length definition');
    return rule;
}
function courseLengthLabel(category) {
    const rule=STAGE_CONFIG.lengthRules.find(r=>r.category===category);
    if(!rule || typeof rule.labelKey!=='string')throw new RangeError('Undefined course length label');
    return gameText(rule.labelKey);
}

// Pure shared geometry: map previews do not generate holds or solve routes.
function stageLayout(n,random=mulberry32(n),lengthSeed=n,distribution=stageDistribution(n)) {
    const lengthRule=stageLengthRule(n,lengthSeed,distribution);
    const height=lengthRule.height;
    const targetRise=height-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin;
    // Build enough reference geometry to reach the selected wall's top. Keep
    // contact spacing unchanged; stretching an undersized guide breaks reach.
    const rawCourse=n===1?s=>({x:W/2,y:-s,nx:1,ny:0}):
        makeStageCourse(STAGE_CONFIG.maxGuideSteps*STAGE_CONFIG.supportSpan*STAGE_CONFIG.stationSpacing,
            random()<.5?-1:1,lengthRule.climbHeight+random()*STAGE_CONFIG.climbVariation);
    const rows=[0,1,2,3],support=[...rows];
    const station=()=>rows.at(-1)*STAGE_CONFIG.stationSpacing;
    const append=()=>{
        support.shift();
        const next=support[0]+STAGE_CONFIG.supportSpan;
        rows.push(next);support.push(next);
    };
    if(n===1) {
        // Preserve the dedicated tutorial exactly.
        for(let i=0;i<STAGE_CONFIG.introGuideSteps;i++)append();
        rows.splice(4,STAGE_CONFIG.introGuideSteps,...STAGE_CONFIG.introStations);
    } else {
        for(let i=0;i<STAGE_CONFIG.maxGuideSteps && -rawCourse(station()).y<targetRise;i++)append();
        if(-rawCourse(station()).y<targetRise)throw new Error('Guide did not reach selected course height');
    }
    const rise=-rawCourse(station()).y;
    // Only compress the final station overshoot, never increase contact gaps.
    const scaleY=n===1?1:targetRise/rise;
    const course = s => {
        const p = rawCourse(s);
        return { ...p, y: p.y * scaleY, ny: p.ny * scaleY };
    };
    return {rows,course,height,category:lengthRule.category};
}
function resolvedCourseLengthInfo(resolved) {
    const recipe=CourseProgression.recipe(resolved);
    const category=recipe.length==='middle'?'medium':recipe.length;
    const rule=STAGE_CONFIG.lengthRules.find(rule=>rule.category===category);
    if(!rule)throw new RangeError('Missing resolved course length');
    return {height:rule.height,category};
}
function stageLengthInfo(n) {
    return resolvedCourseLengthInfo(CourseProgression.resolveStage(n));
}

// 生成中の状態をゲーム本体から分離します。戻り値だけをゲームへ渡します。
function createStageGenerator() {
    let holds = [];
    let route = [];
    let HEIGHT = H;
    let initialGrips = [];
    let densityReference = null;
    let densityStats = null;
    function generate(n, guideOnly = false, seed = n, lengthSeed = seed, distribution = stageDistribution(n)) {
        // Calibrate from STAGE 1 even when a debug tool opens another level first.
        // This uses its unchanged seeded layout, rather than a hard-coded count.
        if (!guideOnly && n !== 1 && !densityReference)
            generate(1);
        const random = mulberry32(seed);
        holds = [];
        route = [];
        let nextHoldId = 0;
        const add = (x, y, type = 'normal', row = null) => {
            const h = { x, y, type, row, id: nextHoldId++ };
            holds.push(h);
            return h;
        };
        const {rows,course,height}=stageLayout(n,random,lengthSeed,distribution);
        HEIGHT=height;
        const bottom = HEIGHT - STAGE_CONFIG.bottomMargin;
        rows.forEach((row, i) => {
            const p = course(row * STAGE_CONFIG.stationSpacing), offset = (row % 2 ? 1 : -1) * STAGE_CONFIG.holdOffset;
            add(p.x + p.nx * offset, bottom + p.y + p.ny * offset, i < 4 ? 'start' : i === rows.length - 1 ? 'goal' : 'normal', row);
        });
        initialGrips = [holds[2], holds[3], holds[0], holds[1]];
        const pose = stance => {
            const first = Math.min(...stance.map(h => h.row)), last = Math.max(...stance.map(h => h.row));
            const p = course((first + last) * STAGE_CONFIG.stationSpacing / 2);
            return { x: p.x, y: bottom + p.y };
        };
        route.push(pose(initialGrips));
        const stance = [...initialGrips];
        for (let i = 4; i < rows.length; i++) {
            const moving = stance.indexOf(stance.reduce((a, b) => a.row < b.row ? a : b));
            stance[moving] = holds[i];
            route.push({ ...pose(stance), hold: holds[i], limb: moving });
        }
        // Keep the original guide, but use three physical starting holds:
        // a shared hand bar above the shoulders and two feet on the bottom row.
        const startBody = route[0], hand = holds[2], removedHand = holds[3];
        hand.x = startBody.x; hand.y = startBody.y - 68; hand.wide = true;
        initialGrips = [hand, hand, holds[0], holds[1]];
        for (const i of [2,3]) {
            initialGrips[i].x = clamp(startBody.x + (i===2 ? -1 : 1) * STAGE_CONFIG.startFootSpan / 2,HOLD_CONFIG.sideMargin,W-HOLD_CONFIG.sideMargin);
            initialGrips[i].y = HEIGHT - HOLD_CONFIG.bottomMargin;
        }
        holds = holds.filter(h=>h !== removedHand &&
            (h.type !== 'normal' || !insideStartTriangle(h,initialGrips)));
        if (guideOnly)
            return { holds, route, HEIGHT, initialGrips };
        fillWall(random, add);
        if (n === 1)
            densityReference = measureDensity(holds, HEIGHT);
        densityStats = convergeDensity();
        return { holds, route, HEIGHT, initialGrips, densityStats };
    }
    function fillWall(random, add) {
        // A 52px spacing (formerly 36px) roughly halves the wall's hold count.
        // Apply it across the wall, including alongside the preserved solution.
        // Small snap-target guards preserve the example solution; unlike the old
        // R+12 corridor, they do not exclude all reachable alternative holds.
        const targets = route.slice(1).map((p, i) => ({ p, aim: gripAim(p, route[i]), score: distance(p.hold, gripAim(p, route[i])) }));
        const top = Math.min(...holds.map(h => h.y)) + HOLD_CONFIG.topMargin, bottom = HEIGHT - HOLD_CONFIG.bottomMargin;
        const allowed = p => !insideStartTriangle(p,initialGrips) && p.y <= initialGrips[2].y - 24 && !holds.some(h => distance(h, p) < HOLD_SPACING) && !targets.some(t => distance(t.p, p) <= R && distance(t.aim, p) < t.score + HOLD_CONFIG.snapGuard);
        // Repeated jittered grids fill gaps rather than scattering only at edges.
        // Existing route holds participate in the same minimum-distance check.
        for (let pass = 0; pass < HOLD_CONFIG.passes; pass++)
            for (let y = top; y <= bottom; y += HOLD_CONFIG.gridStep)
                for (let x = HOLD_CONFIG.sideMargin; x <= W - HOLD_CONFIG.sideMargin; x += HOLD_CONFIG.gridStep) {
                    const p = { x: clamp(x + (random() - .5) * HOLD_CONFIG.jitter, HOLD_CONFIG.sideMargin, W - HOLD_CONFIG.sideMargin), y: clamp(y + (random() - .5) * HOLD_CONFIG.jitter, top, bottom) };
                    if (allowed(p))
                        add(p.x, p.y);
                }
    }
    function measureDensity(points, height) {
        // Every possible scroll position is covered: a window's count can only
        // increase when a hold enters at its lower edge. Include both wall ends.
        const limit = height - H, starts = [...new Set([0, limit, ...points.map(p => clamp(p.y - H, 0, limit))])];
        const windows = starts.map(y => ({ y, count: points.filter(p => p.y >= y && p.y <= y + H).length }));
        const top = Math.min(...points.map(p => p.y)) + HOLD_CONFIG.topMargin, coverage = [];
        // Local empty-space checks prevent pruning a whole region to satisfy
        // the screen-wide count. Record second-nearest distances for removals.
        for (let y = top; y <= height - HOLD_CONFIG.bottomMargin; y += DENSITY_CONFIG.sampleStep)
            for (let x = HOLD_CONFIG.sideMargin; x <= W - HOLD_CONFIG.sideMargin; x += DENSITY_CONFIG.sampleStep) {
                let nearest = Infinity, second = Infinity, owner = null;
                for (const p of points) {
                    const d = distance(p, { x, y });
                    if (d < nearest) {
                        second = nearest;
                        nearest = d;
                        owner = p;
                    }
                    else if (d < second)
                        second = d;
                }
                coverage.push({ nearest, second, owner });
            }
        return { total: points.length, peak: Math.max(...windows.map(w => w.count)), windows, coverage, maxGap: Math.max(...coverage.map(p => p.nearest)) };
    }
    function convergeDensity() {
        const target = densityReference.peak, gapLimit = Math.max(densityReference.maxGap * DENSITY_CONFIG.gapScale, R * DENSITY_CONFIG.gapReachRatio);
        let measured = measureDensity(holds, HEIGHT), iterations = 0;
        const initialTotal = measured.total, initialPeak = measured.peak, history = [initialPeak];
        const maxIterations = holds.filter(h => h.row === null).length;
        while (measured.peak > target && iterations < maxIterations) {
            let chosen = null, best = -Infinity;
            for (const h of holds) {
                if (h.row !== null)
                    continue; // Preserve guide holds here; route.js validates later removals.
                if (measured.coverage.some(p => p.owner === h && p.second > gapLimit))
                    continue;
                let improvement = 0;
                for (const w of measured.windows) {
                    if (h.y < w.y || h.y > w.y + H || w.count <= target)
                        continue;
                    const excess = w.count - target;
                    improvement += excess * excess - (excess - 1) * (excess - 1);
                }
                if (improvement === 0)
                    continue;
                // Prefer redundant holds in crowded neighborhoods when reductions
                // have a similar effect on the over-budget screen windows.
                const crowding = holds.reduce((sum, p) => sum + (p === h ? 0 : Math.max(0, 1 - distance(p, h) / DENSITY_CONFIG.crowdRadius)), 0);
                const score = improvement / measured.windows.length + crowding * DENSITY_CONFIG.crowdWeight;
                if (score > best) {
                    best = score;
                    chosen = h;
                }
            }
            if (!chosen)
                break;
            holds = holds.filter(h => h !== chosen);
            iterations++;
            measured = measureDensity(holds, HEIGHT);
            history.push(measured.peak);
        }
        return { target, total: measured.total, peak: measured.peak, maxGap: measured.maxGap, gapLimit, initialTotal, initialPeak, iterations, history, converged: measured.peak <= target };
    }
    return { generate };
}
let stageGenerator = createStageGenerator();


// js/finger-aim.js
'use strict';
// Production finger-origin aiming with support-constrained coupled body motion.
// Values are logical screen pixels (400-unit width), never camera/world deltas.
const FINGER_AIM_MODEL = 'finger-origin-v1';
let fingerAimSuspended = 0;
let lastFingerGesture = null;
function fingerAimEnabled() { return !fingerAimSuspended; }
// Formal limb target sensitivity; body displacement remains unscaled.
function fingerAimGain() { return 1.5; }
function withFingerAimDisabled(fn) {
    fingerAimSuspended++;
    try { return fn(); } finally { fingerAimSuspended--; }
}
function fingerInputIdentity() { return [FINGER_AIM_MODEL, fingerAimGain(), COUPLED_BODY_MODEL]; }
function fingerAimTarget(index, aim) {
    if (aim?.model !== FINGER_AIM_MODEL || !aim.originGrips?.[index] ||
        !Number.isFinite(aim.dx) || !Number.isFinite(aim.dy) ||
        !Number.isFinite(aim.gain) || aim.gain <= 0 || aim.gain > 4.5)
        throw new TypeError('Explicit finger-origin aiming context is required.');
    return { x: aim.originGrips[index].x + aim.dx * aim.gain,
        y: aim.originGrips[index].y + aim.dy * aim.gain };
}
function fingerAction(points, gain = fingerAimGain()) {
    return { version: 1, model: FINGER_AIM_MODEL, gain,
        ...(coupledBodyEnabled() ? {bodyMotion: COUPLED_BODY_MODEL} : {}),
        points: points.map(p => ({ dx: p.dx, dy: p.dy })) };
}
function validFingerAction(action) {
    return action?.version === 1 && action.model === FINGER_AIM_MODEL &&
        Number.isFinite(action.gain) && action.gain > 0 && action.gain <= 4.5 &&
        (action.bodyMotion === undefined || action.bodyMotion === COUPLED_BODY_MODEL) &&
        Array.isArray(action.points) && action.points.length > 0 &&
        (action.inputLimitExceeded === undefined || (action.inputLimitExceeded === true &&
            action.bodyMotion === COUPLED_BODY_MODEL && action.points.length === COUPLED_BODY_CONFIG.maxPoints)) &&
        action.points.every(p => Number.isFinite(p.dx) && Number.isFinite(p.dy));
}
// Shared live/search/replay transition. Supports lock on the first activated
// vector. Later turns change aiming, not the locked pair. The original selector
// intentionally receives no aiming context, including its goal look-ahead.
function fingerGestureStep(origin, originGrips, previousBody, previousStance, anchor, delta, gain = fingerAimGain()) {
    if (!Number.isFinite(delta.dx) || !Number.isFinite(delta.dy)) return null;
    if (anchor === null && Math.hypot(delta.dx, delta.dy) < INPUT_CONFIG.dragThreshold)
        return { p: {...previousBody}, stance: [...previousStance], anchor: null, active: false, blocked: false };
    const saved = { committed, startGrips };
    try {
        committed = origin; startGrips = originGrips;
        const fixed = anchor === null ? selectAnchor(delta.dx, delta.dy) : [...anchor];
        if (!isSupportPair(fixed)) return null;
        const target = { x: clamp(origin.x + delta.dx, 25, W - 25),
            y: clamp(origin.y + delta.dy, 80, HEIGHT - 40) };
        const fraction = supportMotionFraction(previousBody, target, fixed);
        const candidate = { x: previousBody.x + (target.x - previousBody.x) * fraction,
            y: previousBody.y + (target.y - previousBody.y) * fraction };
        const stance = attachMoving(candidate, fixed, { model: FINGER_AIM_MODEL,
            dx: delta.dx, dy: delta.dy, gain, originGrips });
        // Match live behavior: an impossible assignment rolls back only this
        // body's segment. Partial legal stances remain visible until release.
        return { p: stance ? candidate : {...previousBody},
            stance: stance || [...previousStance], anchor: fixed, active: true,
            blocked: fraction < 1 - 1e-9 };
    } finally { committed = saved.committed; startGrips = saved.startGrips; }
}
function fingerGestureReplay(origin, originGrips, action) {
    if (!validFingerAction(action) || !originGrips?.every((h, i) => h && limbReachable(origin, h, i))) return null;
    if (action.bodyMotion === COUPLED_BODY_MODEL) return coupledGestureReplay(origin, originGrips, action);
    let p = {...origin}, stance = [...originGrips], anchor = null, active = false, blocked = false;
    const trace = [{...p}];
    for (const delta of action.points) {
        const next = fingerGestureStep(origin, originGrips, p, stance, anchor, delta, action.gain);
        if (!next) return null;
        ({p, stance, anchor, active, blocked} = next);
        trace.push({...p});
    }
    const hazards = newHazardContacts(stance, originGrips);
    const valid = active && stance.every(Boolean) && isSupportPair(anchor) &&
        anchor.every(i => stance[i] === originGrips[i] && limbReachable(p, stance[i], i)) &&
        (!sameContacts(stance, originGrips) || hazards.size > 0);
    return {p, stance, anchor, trace, action: {...action,points:action.points.map(p=>({...p}))},
        active, blocked, valid, won: valid && bothHandsOnGoal(stance),
        penalty: hazards.size * HAZARD_CONFIG.penalty};
}
// A bounded, deterministic input polyline drives a
// closest-feasible local body step. Targeting remains finger-origin-v1.
const COUPLED_BODY_MODEL = 'support-slide-v1';
const COUPLED_BODY_CONFIG = Object.freeze({inputStep:1,maxTravel:2048,maxPoints:8192});
function coupledBodyEnabled() {
    return fingerAimEnabled();
}
// Redundant collinear samples must not change the integration grid. A turn or
// reversal remains an explicit waypoint. Arclength remainders carry across
// turns, so slow curved input cannot discard motion at every browser event.
function coupledInputPath(points) {
    const path=[{dx:0,dy:0}];
    for(const point of points) {
        const q={dx:point.dx,dy:point.dy},b=path.at(-1);
        if(Math.hypot(q.dx-b.dx,q.dy-b.dy)<1e-10)continue;
        if(path.length>1) {
            const a=path.at(-2),ux=b.dx-a.dx,uy=b.dy-a.dy,vx=q.dx-b.dx,vy=q.dy-b.dy;
            if(ux*vx+uy*vy>=0 && Math.abs(ux*vy-uy*vx)<=1e-9*Math.max(1,Math.hypot(ux,uy)*Math.hypot(vx,vy)))path.pop();
        }
        path.push(q);
    }
    return path;
}
// Exact boundaries of the existing support rules: outer reach circles, the
// raised-foot inner circles, hip-height and foot-height lines, and wall bounds.
// Candidate enumeration projects a desired one-pixel step onto these boundaries.
// Every accepted chord also passes supportMotionFraction, not just endpoint QA.
function coupledSupportGeometry(pair,stance) {
    const circles=[],lines=[{axis:'x',v:25},{axis:'x',v:W-25},{axis:'y',v:80},{axis:'y',v:HEIGHT-40}];
    for(const i of pair) {
        const root=limbRoot({x:0,y:0},i),h=stance[i],center={x:h.x-root.x,y:h.y-root.y};
        circles.push({...center,r:LIMB_LENGTHS[i]});
        if(i>=2) {
            circles.push({...center,r:LIMB_LENGTHS[i]*HIGH_FOOT_REACH_RATIO,inner:true});
            lines.push({axis:'y',v:h.y},{axis:'y',v:h.y-root.y});
        }
    }
    // These intersections depend only on the locked support contacts. Cache
    // them once, preserving the original enumeration and tie-breaking order.
    const lineIntersections=[];
    for(let a=0;a<lines.length;a++)for(let b=a+1;b<lines.length;b++)
        if(lines[a].axis!==lines[b].axis)lineIntersections.push({[lines[a].axis]:lines[a].v,[lines[b].axis]:lines[b].v});
    const circleIntersections=circles.map((c,a)=>{
        const points=[];
        for(const line of lines) {
            const other=line.axis==='x'?'y':'x',v=line.v-c[line.axis],disc=c.r*c.r-v*v;
            if(disc>=-1e-8)for(const sign of [-1,1])points.push({[line.axis]:line.v,[other]:c[other]+sign*Math.sqrt(Math.max(0,disc))});
        }
        for(let b=a+1;b<circles.length;b++) {
            const q=circles[b],length=distance(c,q);
            if(length<1e-12||length>c.r+q.r+1e-8||length<Math.abs(c.r-q.r)-1e-8)continue;
            const along=(c.r*c.r-q.r*q.r+length*length)/(2*length),height=Math.sqrt(Math.max(0,c.r*c.r-along*along));
            const ux=(q.x-c.x)/length,uy=(q.y-c.y)/length;
            for(const sign of [-1,1])points.push({x:c.x+along*ux-sign*height*uy,y:c.y+along*uy+sign*height*ux});
        }
        return points;
    });
    return {circles,lines,lineIntersections,circleIntersections};
}
function coupledBodyStep(from,raw,pair,stance,geometry) {
    const gap=distance(from,raw);
    if(gap<1e-10)return {...from};
    const step=Math.min(COUPLED_BODY_CONFIG.inputStep,gap),desired={x:from.x+(raw.x-from.x)*step/gap,y:from.y+(raw.y-from.y)*step/gap};
    const legal=p=>p.x>=25-1e-8&&p.x<=W-25+1e-8&&p.y>=80-1e-8&&p.y<=HEIGHT-40+1e-8&&
        pair.every(i=>limbReachable(p,stance[i],i))&&supportMotionFraction(from,p,pair,stance)>=1-1e-9;
    if(legal(desired))return desired;
    let best=from,cost=step*step;
    const consider=p=>{
        if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
        const next=(p.x-desired.x)**2+(p.y-desired.y)**2;
        // Cost and axis rejection are necessary conditions, not approximate
        // reach tests. Keep the original distance and full chord checks for
        // every candidate that can actually improve the selected point.
        if(!(next<cost-1e-12)||Math.abs(p.x-from.x)>step+1e-7||Math.abs(p.y-from.y)>step+1e-7)return;
        if(distance(from,p)<=step+1e-7&&legal(p)){cost=next;best=p;}
    };
    const circles=geometry.circles,lines=geometry.lines;
    // The exact first obstruction is always a valid candidate.
    const fraction=supportMotionFraction(from,desired,pair,stance);
    consider({x:from.x+(desired.x-from.x)*fraction,y:from.y+(desired.y-from.y)*fraction});
    for(const line of lines)consider(line.axis==='x'?{x:line.v,y:desired.y}:{x:desired.x,y:line.v});
    for(const p of geometry.lineIntersections)consider(p);
    for(let a=0;a<circles.length;a++) {
        const c=circles[a],d=distance(c,desired);
        if(d>1e-12)consider({x:c.x+(desired.x-c.x)*c.r/d,y:c.y+(desired.y-c.y)*c.r/d});
        // A chord between points on a forbidden inner circle cuts through the
        // hole. Its supporting tangent, in contrast, stays outside throughout.
        if(c.inner) {
            const radius=distance(c,from);
            if(radius>=c.r-1e-7&&radius>1e-12) {
                const nx=(from.x-c.x)/radius,ny=(from.y-c.y)/radius,
                    dot=(desired.x-c.x)*nx+(desired.y-c.y)*ny;
                if(dot<c.r)consider({x:desired.x+nx*(c.r-dot),y:desired.y+ny*(c.r-dot)});
            }
        }
        for(const p of geometry.circleIntersections[a])consider(p);
    }
    // Do not expose cached geometry points as mutable replay/body nodes.
    return {...best};
}
function coupledGestureReplay(origin,originGrips,action,lockedAnchor=null,motionCache=null) {
    if(!validFingerAction(action)||action.points.length>COUPLED_BODY_CONFIG.maxPoints||!originGrips?.every((h,i)=>h&&limbReachable(origin,h,i)))return null;
    const activation=action.points.find(q=>Math.hypot(q.dx,q.dy)>=INPUT_CONFIG.dragThreshold);
    const saved={committed,startGrips};
    try {
        committed=origin;startGrips=originGrips;
        const anchor=lockedAnchor||(activation?selectAnchor(activation.dx,activation.dy):null),trace=[{...origin}];
        let p={...origin},stance=[...originGrips],travel=0,limited=false;
        const inputNodes=[],bodyNodes=[];
        const reuse=motionCache&&distance(motionCache.origin,origin)<1e-10&&
            originGrips.every((h,i)=>h===motionCache.originGrips[i])&&JSON.stringify(anchor)===JSON.stringify(motionCache.anchor);
        let prefixReusable=!!reuse;
        if(anchor) {
            if(!isSupportPair(anchor))return null;
            const geometry=coupledSupportGeometry(anchor,originGrips),path=coupledInputPath(action.points);
            let remainder=0;
            outer:for(let i=1;i<path.length;i++) {
                const a=path[i-1],b=path[i],length=Math.hypot(b.dx-a.dx,b.dy-a.dy),steps=Math.floor((remainder+length+1e-8)/COUPLED_BODY_CONFIG.inputStep);
                for(let k=1;k<=steps;k++) {
                    if(travel>=COUPLED_BODY_CONFIG.maxTravel){limited=true;break outer;}
                    travel+=COUPLED_BODY_CONFIG.inputStep;
                    const t=Math.min(1,(k*COUPLED_BODY_CONFIG.inputStep-remainder)/length),raw={x:origin.x+a.dx+(b.dx-a.dx)*t,y:origin.y+a.dy+(b.dy-a.dy)*t};
                    const at=inputNodes.length,old=prefixReusable&&motionCache.inputNodes[at];
                    if(!old||distance(old,raw)>1e-9)prefixReusable=false;
                    const next=prefixReusable?motionCache.bodyNodes[at]:coupledBodyStep(p,raw,anchor,originGrips,geometry);
                    inputNodes.push(raw);bodyNodes.push(next);
                    if(distance(p,next)>1e-10){p=next;trace.push({...p});}
                }
                remainder=Math.max(0,remainder+length-steps*COUPLED_BODY_CONFIG.inputStep);
            }
            const delta=action.points.at(-1);
            stance=attachMoving(p,anchor,{model:FINGER_AIM_MODEL,originGrips,dx:delta.dx,dy:delta.dy,gain:action.gain});
            if(!stance)return null;
        }
        const last=action.points.at(-1),cancelAtOrigin=!!anchor&&Math.hypot(last.dx,last.dy)<INPUT_CONFIG.dragThreshold;
        const hazards=newHazardContacts(stance,originGrips),valid=!!anchor&&!cancelAtOrigin&&!action.inputLimitExceeded&&stance.every(Boolean)&&
            anchor.every(i=>stance[i]===originGrips[i]&&limbReachable(p,stance[i],i))&&(!sameContacts(stance,originGrips)||hazards.size>0);
        return {p,stance,anchor:anchor&&[...anchor],trace,action:{...action,points:action.points.map(q=>({...q}))},active:!!anchor,valid,
            blocked:distance(p,{x:origin.x+last.dx,y:origin.y+last.dy})>1.01,limited,travel,cancelAtOrigin,inputLimitExceeded:action.inputLimitExceeded===true,
            motionCache:{origin:{...origin},originGrips:[...originGrips],anchor:anchor&&[...anchor],inputNodes,bodyNodes},
            won:valid&&bothHandsOnGoal(stance),penalty:hazards.size*HAZARD_CONFIG.penalty};
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}


// js/finger-route.js
'use strict';
// Deterministic production action search. Nodes are committed body/contact/resource
// states; input witnesses belong to edges. Bounds are not shortest-path proofs.
function fingerRouteInitial() {
    const first=[...initialGrips];
    for(const pair of [[0,1],[2,3]]) {
        const sorted=pair.map(i=>first[i]).sort((a,b)=>(a?.x??0)-(b?.x??0));
        pair.forEach((i,j)=>first[i]=sorted[j]);
    }
    return first;
}
function fingerRouteAction(dx,dy) {
    return fingerAction([{dx,dy}]);
}
// Reference routes accept only straight actions whose one- and ten-sample
// executions agree in body, contacts, support lock and swept body geometry.
// This does not assert arbitrary curved/coalesced input equivalence.
function fingerResampledAction(action,samples=10) {
    const points=[];let previous={dx:0,dy:0};
    for(const point of action.points){for(let k=1;k<=samples;k++)points.push({dx:previous.dx+(point.dx-previous.dx)*k/samples,dy:previous.dy+(point.dy-previous.dy)*k/samples});previous=point;}
    return {...action,points};
}
function fingerRouteSampleStable(origin,stance,action,move,{requireRelease=true}={}) {
    const sampled=fingerGestureReplay(origin,stance,fingerResampledAction(action));
    if(!sampled||!sampled.active||(requireRelease&&!sampled.valid)||sampled.valid!==move.valid||distance(sampled.p,move.p)>1e-7||sampled.penalty!==move.penalty||
        JSON.stringify(sampled.anchor)!==JSON.stringify(move.anchor)||
        JSON.stringify(sampled.stance.map(h=>h?.id))!==JSON.stringify(move.stance.map(h=>h?.id)))return false;
    if(action.bodyMotion === COUPLED_BODY_MODEL) {
        return move.trace.length===sampled.trace.length&&move.trace.every((p,i)=>distance(p,sampled.trace[i])<1e-7);
    }
    for(let i=0;i<action.points.length;i++) {
        const a=move.trace[i],b=move.trace[i+1],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;let previous=-1e-7;
        for(let k=0;k<=10;k++) {
            const p=sampled.trace[i*10+k],t=den?((p.x-a.x)*dx+(p.y-a.y)*dy)/den:0;
            if(distance(p,{x:a.x+dx*clamp(t,0,1),y:a.y+dy*clamp(t,0,1)})>1e-6||t<previous-1e-7)return false;
            previous=t;
        }
    }
    return true;
}
function fingerRouteEntry(move) {
    return {...move.p,anchor:[...move.anchor],grips:move.stance.map(h=>h?.id??null),
        action:JSON.parse(JSON.stringify(move.action)),trace:move.trace.map(p=>({x:p.x,y:p.y})),penalty:move.penalty};
}
function fingerRouteTraceMask(pickups,mask,trace) {
    for(let i=1;i<trace.length;i++)mask=coursePickupMask(pickups,mask,trace[i-1],trace[i]);
    return mask;
}
function fingerRouteTouchesHeart(from,to,heart) {
    const trace=to.action&&Array.isArray(to.trace)?to.trace:[from,to];
    return trace.slice(1).some((p,i)=>torsoTouchesHeart(trace[i],p,heart));
}
function fingerReplayRoute(path,{partial=false}={}) {
    if(!Array.isArray(path)||!path.length)return null;
    let stance=fingerRouteInitial(),p={x:path[0].x,y:path[0].y};
    if(!stance.every((h,i)=>h&&limbReachable(p,h,i)))return null;
    const result=[{...path[0]}],withMasks=path.some(q=>q.pickupMask!==undefined);
    const pickups=withMasks?createHearts(level,path,difficulty):[];let mask=0;
    for(let i=1;i<path.length;i++) {
        // No inferred torso-to-finger conversion: legacy witnesses are separate.
        if(!path[i].action)return null;
        const move=fingerGestureReplay(p,stance,path[i].action);
        if(!move?.valid)return null;
        const entry=fingerRouteEntry(move);
        if(withMasks){mask=fingerRouteTraceMask(pickups,mask,move.trace);entry.pickupMask=mask;}
        result.push(entry);p=move.p;stance=move.stance;
        if(move.won)return partial||!requiresLegacyTraverse()||result.slice(1).some((q,j)=>isTraverse(result[j],q))?result:null;
    }
    return partial?result:null;
}
function fingerSamePairRoute(expected,actual) {
    const samePoint=(a,b)=>a&&b&&Math.abs(a.x-b.x)<=1e-7&&Math.abs(a.y-b.y)<=1e-7;
    return !!actual&&actual.length===expected.length&&actual.every((p,i)=>{
        const q=expected[i];
        return samePoint(p,q)&&JSON.stringify(p.grips)===JSON.stringify(q.grips)&&
            JSON.stringify(p.anchor)===JSON.stringify(q.anchor)&&
            JSON.stringify(p.action)===JSON.stringify(q.action)&&p.penalty===q.penalty&&
            p.pickupMask===q.pickupMask&&((!p.trace&&!q.trace)||(p.trace?.length===q.trace?.length&&p.trace.every((r,j)=>samePoint(r,q.trace[j]))));
    });
}
function fingerRouteCandidates(p,targets,{wide=false}={}) {
    const result=[],seen=new Set(),directions=[];
    const add=(dx,dy)=>{
        if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<INPUT_CONFIG.dragThreshold)return;
        const key=dx.toFixed(6)+','+dy.toFixed(6);if(seen.has(key))return;seen.add(key);
        result.push(fingerRouteAction(dx,dy));
    };
    for(const q of targets) {
        const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
        if(d>230||d<5)continue;
        for(const t of [.5,.75,1])add(dx*t,dy*t);
        directions.push({x:dx/d,y:dy/d});
    }
    // Preserve short/ordinary gestures, then explicitly explore travel past a
    // support clamp. No final-body displacement threshold is applied.
    for(const dx of (wide?[-90,-60,-30,0,30,60,90]:[-60,-30,0,30,60]))
        for(const dy of [-90,-45,0,20,40])add(dx,dy);
    for(const [x,y] of [[0,-1],[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1],[0,1]]) {
        const d=Math.hypot(x,y);directions.push({x:x/d,y:y/d});
    }
    for(const d of directions)for(const length of [120,180,240])add(d.x*length,d.y*length);
    return result;
}
function fingerRouteProgress(guide,p) {
    let best=Infinity,progress=0,arc=0;
    for(let i=1;i<guide.length;i++) {
        const a=guide[i-1],b=guide[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
        const t=length?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(length*length),0,1):0;
        const d=distance(p,{x:a.x+dx*t,y:a.y+dy*t});
        if(d<best){best=d;progress=arc+length*t;}
        arc+=length;
    }
    return progress;
}
function fingerPartialSearchBounded(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false,accept=()=>true,beamWidth=12,needsTraverse=false,greedy=false}={}) {
    const origin=start||guide[0],first=stance||fingerRouteInitial();
    let transitions=0,expanded=0,best=null;
    const report=(path,found)=>({path,transitions,expanded,limit,maxMoves,beamWidth,
        retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found,search:'bounded-finger-actions'});
    if(!origin||!first.every((h,i)=>h&&limbReachable(origin,h,i)))return report(null,false);
    let beam=[{p:origin,stance:first,path:[{x:origin.x,y:origin.y}],score:fingerRouteProgress(guide,origin),traversed:!needsTraverse}];
    const visited=new Set();
    for(let depth=0;depth<maxMoves&&transitions<limit;depth++) {
        const next=[];
        for(const node of beam) {
            expanded++;
            let advances=0;
            const candidates=fingerRouteCandidates(node.p,guide,{wide:true});
            const ordered=greedy?candidates.map(action=>({action,score:fingerRouteProgress(guide,{
                x:node.p.x+action.points.at(-1).dx,y:node.p.y+action.points.at(-1).dy})}))
                .sort((a,b)=>b.score-a.score).map(entry=>entry.action):candidates;
            for(const action of ordered) {
                if(transitions>=limit)break;transitions++;
                const move=fingerGestureReplay(node.p,node.stance,action);
                if(!move?.valid)continue;
                const p=move.p;
                if(p.x<STAGE_SAFE_WIDTH+TORSO.width/2||p.x>W-STAGE_SAFE_WIDTH-TORSO.width/2||p.y<80||p.y>HEIGHT-40||
                    (forwardOnly&&p.y>origin.y+60+1e-7)||!accept(p,node.path))continue;
                const traversed=node.traversed||isTraverse(node.p,p);
                const key=traversed+':'+Math.round(p.x/6)+','+Math.round(p.y/6)+':'+move.stance.map(h=>h.id).join(',');
                if(visited.has(key)||!fingerRouteSampleStable(node.p,node.stance,action,move))continue;visited.add(key);
                const path=[...node.path,fingerRouteEntry(move)];
                const entry={p,stance:move.stance,path,traversed,score:fingerRouteProgress(guide,p)};
                if(!best||p.y<best.p.y)best=entry;
                if(traversed&&stop(p,move.stance,path))return report(path,true);
                // Winning ends the game; never continue moving beyond it.
                if(!move.won)next.push(entry);
                if(greedy&&entry.score>node.score+10&&++advances>=3)break;
            }
        }
        next.sort((a,b)=>b.score-a.score);beam=next.slice(0,beamWidth);if(!beam.length)break;
    }
    return report(best?.path||null,false);
}
// Fast searches only change exploration order. Every edge still passes the same
// physics, reach, one/ten-sample, acceptance and stop checks. A failed prepass
// always falls back to the original full beam and its original bounds.
let fingerRouteSearchStrategy='hybrid';
function withFingerRouteSearchStrategy(strategy,operation) {
    if(strategy!=='hybrid'&&strategy!=='canonical')throw new RangeError('Unknown finger route search strategy');
    const previous=fingerRouteSearchStrategy;fingerRouteSearchStrategy=strategy;
    try{return operation();}finally{fingerRouteSearchStrategy=previous;}
}
function fingerPartialSearch(guide,options={}) {
    if(fingerRouteSearchStrategy==='canonical'||options.beamWidth===1)return fingerPartialSearchBounded(guide,{...options,greedy:false});
    const maxMoves=options.maxMoves??45,phases=[];
    const quick=()=>fingerPartialSearchBounded(guide,{...options,greedy:false,beamWidth:1,
        limit:Math.min(options.limit??18000,Math.max(3000,maxMoves*150))});
    const greedy=()=>fingerPartialSearchBounded(guide,{...options,greedy:true,beamWidth:3,
        limit:Math.min(options.limit??18000,2400)});
    const report=result=>({...result,
        prepasses:phases.map(({name,result:r})=>({name,found:r.found,transitions:r.transitions})),
        totalTransitions:phases.reduce((n,p)=>n+p.result.transitions,0)});
    for(const [name,search] of (options.preferGreedy?[['greedy',greedy],['narrow',quick]]:[['narrow',quick],['greedy',greedy]])) {
        const result=search();phases.push({name,result});if(result.found)return report(result);
    }
    const result=fingerPartialSearchBounded(guide,{...options,greedy:false});phases.push({name:'full',result});return report(result);
}
function fingerSolveRoute(guide,maxMoves=40) {
    if(holds.some(h=>h.type==='hazard'))return fingerSolveCostRoute(guide,maxMoves);
    const goal=holds.find(h=>h.type==='goal');if(!goal)return null;
    const targets=[...guide,{x:goal.x,y:goal.y+70}],options={maxMoves,
        needsTraverse:requiresLegacyTraverse(),stop:(p,stance)=>bothHandsOnGoal(stance)};
    let result;
    if(fingerRouteSearchStrategy==='canonical') {
        // Source witnesses determine native pruning before sections are joined.
        // Preserve the original narrow/full goal sequence for that scoped phase.
        const quick=fingerPartialSearch(targets,{...options,beamWidth:1,limit:Math.max(3000,maxMoves*150)});
        result=quick.found?quick:fingerPartialSearch(targets,{...options,limit:Math.max(18000,maxMoves*1200)});
        densityStats.fingerSearch={...result,path:undefined,quickTransitions:quick.transitions,
            quickFound:quick.found,totalTransitions:quick.transitions+(result===quick?0:result.transitions)};
    }else{
        result=fingerPartialSearch(targets,{...options,preferGreedy:true,limit:Math.max(18000,maxMoves*1200)});
        densityStats.fingerSearch={...result,path:undefined};
    }
    return result.found?result.path:null;
}
function fingerSolveCostRoute(guide,maxMoves=40,config=ROUTE_COST_SEARCH_CONFIG,options={}) {
    const began=performance.now(),first=fingerRouteInitial(),start={x:guide[0].x,y:guide[0].y},goal=holds.find(h=>h.type==='goal');
    if(!goal||!first.every((h,i)=>h&&limbReachable(start,h,i)))return null;
    const pickups=createHearts(level,guide,difficulty),resourcePickups=options.noHearts?[]:pickups;
    const fixedBudget=options.budget??null,targets=[...guide.slice(1),...pickups,{x:goal.x,y:goal.y+70}];
    const fallback=fingerReplayRoute(guide),resources=fallback?routeResources(fallback,{pickups:resourcePickups,budget:fixedBudget}):null;
    let best=resources?.valid&&(!options.noHazards||!resources.penalties)&&(!options.noHearts||!routeResources(fallback,{pickups}).pickupMask)?fallback:null;
    let bestCost=best?routeConsumption(best):maxMoves+3+pickups.length*HEART_CONFIG.recovery,transitions=0;
    const buckets=[],visited=new Map();buckets[0]=[{p:start,stance:first,path:[start],traversed:!requiresLegacyTraverse(),score:fingerRouteProgress(guide,start),mask:0,net:0,required:1}];
    for(let cost=0;cost<=bestCost&&transitions<config.maxTransitions;cost++) {
        const groups=new Map();for(const node of buckets[cost]||[]){const group=groups.get(node.mask)||[];group.push(node);groups.set(node.mask,group);}
        const beam=[...groups.values()].flatMap(group=>group.sort((a,b)=>b.score-a.score||a.required-b.required).slice(0,config.beamWidth));
        for(const node of beam) {
            if(node.path.length-1>=maxMoves)continue;
            for(const action of fingerRouteCandidates(node.p,targets)) {
                if(transitions>=config.maxTransitions)break;transitions++;
                const move=fingerGestureReplay(node.p,node.stance,action);if(!move?.valid)continue;
                const p=move.p,edge=routeMoveCost(move.stance,node.stance),won=move.won;
                if(p.x<STAGE_SAFE_WIDTH+TORSO.width/2||p.x>W-STAGE_SAFE_WIDTH-TORSO.width/2||p.y<80||p.y>HEIGHT-40||options.noHazards&&edge>1)continue;
                const nextCost=cost+edge,moves=node.path.length;if(nextCost>bestCost)continue;
                const mask=fingerRouteTraceMask(pickups,node.mask,move.trace);if(options.noHearts&&mask)continue;
                const net=node.net+edge-(bitCount(mask)-bitCount(node.mask))*HEART_CONFIG.recovery;
                const required=Math.max(node.required,node.net+1,net+(won?0:1));if(required>(fixedBudget??maxMoves+3))continue;
                const traversed=node.traversed||isTraverse(node.p,p),ids=move.stance.map(h=>h.id);
                if(node.path.some((q,i)=>distance(q,p)<5&&(q.pickupMask||0)===mask&&(i?q.grips:first.map(h=>h.id)).every((id,j)=>id===ids[j])))continue;
                if(!fingerRouteSampleStable(node.p,node.stance,action,move))continue;
                const path=[...node.path,{...fingerRouteEntry(move),pickupMask:mask}];
                if(won){if(traversed&&required<=(fixedBudget??moves+3)&&(nextCost<bestCost||nextCost===bestCost&&(!best||path.length<best.length))){best=path;bestCost=nextCost;}continue;}
                const key=traversed+':'+Math.round(p.x/8)+','+Math.round(p.y/8)+':'+ids.join(',')+':'+mask+':'+moves;
                const labels=visited.get(key)||[];if(labels.some(label=>label.cost<=nextCost&&label.required<=required))continue;
                visited.set(key,[...labels.filter(label=>label.cost<nextCost||label.required<required),{cost:nextCost,required}]);
                if(nextCost<bestCost)(buckets[nextCost]||=[]).push({p,stance:move.stance,path,traversed,score:fingerRouteProgress(guide,p),mask,net,required});
            }
        }
    }
    densityStats.costSearch={transitions,limit:config.maxTransitions,limitReached:transitions>=config.maxTransitions,costBefore:fallback?routeConsumption(fallback):null,costAfter:best?routeConsumption(best):null,elapsedMs:performance.now()-began,search:'bounded-finger-actions'};
    return best;
}
function fingerOptimizeRoute(path,config=ROUTE_OPTIMIZATION_CONFIG) {
    const began=performance.now(),first=fingerRouteInitial(),byId=new Map(holds.map(h=>[h.id,h]));
    let best=fingerReplayRoute(path);if(!best)return path;
    let bestCost=routeConsumption(best),transitions=0;
    for(let pass=0;pass<config.passes&&transitions<config.maxTransitions;pass++) {
        const before=best;
        for(let i=0;i<best.length-2&&transitions<config.maxTransitions;i++) {
            for(let j=best.length-1;j>i+1&&transitions<config.maxTransitions;j--) {
                if(distance(best[i],best[j])>Math.max(...LIMB_LENGTHS)*2)continue;
                const stance=i?best[i].grips.map(id=>byId.get(id)):first;
                let improved=false;
                for(const action of fingerRouteCandidates(best[i],[best[j]])) {
                    if(transitions>=config.maxTransitions)break;transitions++;
                    const move=fingerGestureReplay(best[i],stance,action);if(!move?.valid||!fingerRouteSampleStable(best[i],stance,action,move))continue;
                    // The first shortcut action changes. Every following action
                    // is replayed unchanged from the resulting committed state.
                    const candidate=[...best.slice(0,i+1),fingerRouteEntry(move),...best.slice(j+1)];
                    const replay=fingerReplayRoute(candidate);if(!replay||!fingerValidateDragReference(replay).valid)continue;
                    const cost=routeConsumption(replay);
                    if(routeResources(replay).valid&&(cost<bestCost||cost===bestCost&&replay.length<best.length)){best=replay;bestCost=cost;improved=true;break;}
                }
                if(improved)break;
            }
        }
        if(best===before)break;
    }
    densityStats.routeOptimization={before:path.length-1,after:best.length-1,costBefore:routeConsumption(path),costAfter:bestCost,transitions,limit:config.maxTransitions,elapsedMs:performance.now()-began,search:'bounded-finger-actions'};
    return best;
}
function fingerValidateDragReference(path) {
    if(!path?.length)return {valid:false,step:0,reason:'missing-path',samples:10,viewportWidth:400};
    let stance=fingerRouteInitial(),p=path[0];
    for(let i=1;i<path.length;i++) {
        const action=path[i].action;if(!action)return {valid:false,step:i,reason:'missing-finger-action',samples:10,viewportWidth:400};
        const exact=fingerGestureReplay(p,stance,action);
        const move=fingerGestureReplay(p,stance,fingerResampledAction(action));
        if(!move?.valid||distance(move.p,path[i])>1e-7||JSON.stringify(move.stance.map(h=>h?.id))!==JSON.stringify(path[i].grips)||JSON.stringify(move.anchor)!==JSON.stringify(path[i].anchor)||!exact?.valid||!fingerRouteSampleStable(p,stance,action,exact))
            return {valid:false,step:i,reason:'finger-drag-reference-mismatch',samples:10,viewportWidth:400,actualBody:move?.p,actualGrips:move?.stance.map(h=>h?.id)};
        p=move.p;stance=move.stance;
    }
    return {valid:true,samples:10,viewportWidth:400,moves:path.length-1,model:'finger-origin-v1'};
}
function fingerFindCourseHeartMove(heart,path) {
    const byId=new Map(holds.map(h=>[h.id,h]));let checks=0;
    const nearby=path.slice(0,-1).map((p,i)=>({p,i})).sort((a,b)=>distance(a.p,heart)-distance(b.p,heart));
    for(const {p,i} of nearby) {
        const stance=i?p.grips.map(id=>byId.get(id)):fingerRouteInitial();
        const dx=heart.x-p.x,dy=heart.y-p.y;
        const actions=[path[i+1]?.action,fingerRouteAction(dx*.5,dy*.5),fingerRouteAction(dx,dy),fingerRouteAction(dx*1.5,dy*1.5)].filter(Boolean);
        for(const action of actions) {
            if(checks>=COURSE_GENERATION_CONFIG.heartPlacementChecks)return null;checks++;
            const move=fingerGestureReplay(p,stance,action);
            // Collection occurs during dragging, including an eventual canceled
            // release. Require a real activated trace, not a valid release.
            if(move?.active&&move.stance.every(Boolean)&&fingerRouteTraceMask([heart],0,move.trace)&&fingerRouteSampleStable(p,stance,action,move,{requireRelease:false}))
                return {from:p,to:move.p,anchor:move.anchor,action:move.action,trace:move.trace.map(q=>({x:q.x,y:q.y}))};
        }
    }
    return null;
}
function fingerFindHazardMove(hold,path=route) {
    const byId=new Map(holds.map(h=>[h.id,h]));
    for(let step=0;step<path.length-1;step++) {
        const from=path[step];if(distance(from,hold)>220)continue;
        const stance=step?from.grips.map(id=>byId.get(id)):fingerRouteInitial();
        for(const action of fingerRouteCandidates(from,[hold])) {
            const move=fingerGestureReplay(from,stance,action);
            if(move?.valid&&move.stance.includes(hold)&&fingerRouteSampleStable(from,stance,action,move))return {step,to:move.p,anchor:move.anchor,grips:move.stance.map(h=>h.id),action:move.action,trace:move.trace};
        }
    }
    return null;
}


// js/six-pair-selection.js
'use strict';
// Adaptive six-pair selector. Route generation retains its recorded baseline input model.
const SixPairSelection = (() => {
    const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
    // Stable diagnostic identifiers; localized UI names belong to the catalogs.
    const labels=['both-feet','right-hand-right-foot','right-hand-left-foot','left-hand-right-foot','left-hand-left-foot','both-hands'];
    const tau=Math.PI*2;
    let cached=null,baselineDepth=0;
    function withBaseline(fn){baselineDepth++;try{return fn();}finally{baselineDepth--;}}
    function withCurrent(fn){const saved=baselineDepth;baselineDepth=0;try{return fn();}finally{baselineDepth=saved;}}
    const wrap=a=>(a%tau+tau)%tau;
    function forward() {
        let nearest=Infinity,result=-Math.PI/2;
        for(let i=1;i<route.length;i++) {
            const a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
            if(len2<1e-9)continue;
            const t=Math.max(0,Math.min(1,((committed.x-a.x)*dx+(committed.y-a.y)*dy)/len2));
            const d=(committed.x-a.x-t*dx)**2+(committed.y-a.y-t*dy)**2;
            if(d<nearest){nearest=d;result=Math.atan2(dy,dx);}
        }
        return result;
    }
    const N=3600, step=tau/N;
    let pending=null, ticket=0;
    function same(snapshot) {return snapshot && snapshot.HEIGHT===HEIGHT && snapshot.holds===holds && snapshot.route===route && snapshot.x===committed.x && snapshot.y===committed.y && snapshot.grips.every((h,i)=>h===startGrips[i]);}
    function snapshot() {return {holds,route,HEIGHT,x:committed.x,y:committed.y,grips:[...startGrips],direction:forward(),samples:[],goal:[]};}
    function scan(job,count=N) {
        const saved={committed,startGrips,holds,route,HEIGHT};
        try {
            committed={x:job.x,y:job.y};startGrips=job.grips;holds=job.holds;route=job.route;HEIGHT=job.HEIGHT;
            const end=Math.min(N,job.samples.length+count);
            while(job.samples.length<end) {
                const i=job.samples.length,a=job.direction-Math.PI+i*step,ux=Math.cos(a),uy=Math.sin(a),pair=selectAnchorBaseline(ux,uy);
                job.samples.push(pairs.findIndex(p=>p[0]===pair[0]&&p[1]===pair[1]));
                job.goal.push(Number.isFinite(goalSupportDistance(pair,ux,uy,supportPairReach(pair,ux,uy))));
            }
        } finally {({committed,startGrips,holds,route,HEIGHT}=saved);}
    }
    // Screen directions for MOVING limbs (pair stores the complementary anchors).
    const preferredAngles=[Math.PI/2,0,3*Math.PI/4,Math.PI/4,Math.PI,-Math.PI/2];
    function finish(job) {
        const counts=Array(6).fill(0),sx=Array(6).fill(0),sy=Array(6).fill(0),origin=job.direction-Math.PI;
        job.samples.forEach((index,i)=>{const a=origin+(i+.5)*step;counts[index]++;sx[index]+=Math.cos(a);sy[index]+=Math.sin(a);});
        const missing=counts.map((n,i)=>n? -1:i).filter(i=>i>=0),remaining=tau-6*Math.PI/5;
        const targets=counts.map((n,index)=>{
            if(!n)return wrap(preferredAngles[index]);
            if(Math.hypot(sx[index],sy[index])/n>=1e-6)return wrap(Math.atan2(sy[index],sx[index]));
            // A directionless circular average uses the longest natural run.
            // Ties choose the smallest screen angle, independent of scan origin.
            let bestLength=-1,bestAngle=Infinity;
            for(let i=0;i<N;i++)if(job.samples[i]===index&&job.samples[(i+N-1)%N]!==index){
                let length=1;while(length<N&&job.samples[(i+length)%N]===index)length++;
                const angle=wrap(origin+(i+length/2)*step);
                if(length>bestLength||length===bestLength&&angle<bestAngle){bestLength=length;bestAngle=angle;}
            }
            return Number.isFinite(bestAngle)?bestAngle:wrap(preferredAngles[index]);
        });
        const total=counts.reduce((sum,n)=>sum+n,0);
        const widths=counts.map(n=>Math.PI/5+remaining*(total?n/total:1/6));
        const delta=a=>wrap(a+Math.PI)-Math.PI;
        let best=null;
        function evaluate(order){
            let cursor=0;const offsets=order.map(i=>{const mid=cursor+widths[i]/2;cursor+=widths[i];return mid;});
            const breaks=[0,tau,...order.map((i,j)=>wrap(targets[i]-offsets[j]+Math.PI))].sort((a,b)=>a-b);
            for(let q=0;q<breaks.length-1;q++){
                const lo=breaks[q],hi=breaks[q+1],mid=(lo+hi)/2;
                const desired=order.map((i,j)=>mid-delta(mid+offsets[j]-targets[i]));
                const rotation=Math.max(lo,Math.min(hi,desired.reduce((a,b)=>a+b,0)/6));
                const cost=order.reduce((sum,i,j)=>sum+delta(rotation+offsets[j]-targets[i])**2,0);
                if(!best||cost<best.cost-1e-12){best={order:[...order],rotation:wrap(rotation),cost};}
            }
        }
        // Fix pair 0 first to remove equivalent circular permutations (5! =120).
        function permute(order,left){if(!left.length){evaluate(order);return;}for(const i of left)permute([...order,i],left.filter(j=>j!==i));}
        permute([0],[1,2,3,4,5]);
        let cursor=0;const sectors=best.order.map((index,j)=>{
            const width=j===5?tau-cursor:widths[index],start=wrap(best.rotation+cursor);cursor+=width;
            return {start,width,index,pair:[...pairs[index]],moving:labels[index],preferredAngle:targets[index],natural:counts[index]>0};
        });
        return {...job,sectors,protectedSectors:[],missing,k:6-missing.length,counts,targets,rotation:best.rotation,placementCost:best.cost,iterations:120};
    }
    function plan() {
        if(same(cached))return cached;
        const job=same(pending)?pending:snapshot();
        ticket++;pending=null; // A synchronous completion supersedes scheduled chunks.
        // Rare first-touch/rapid-repeat fallback: finish outstanding work once,
        // never silently revert to old selection while the map is incomplete.
        scan(job);cached=finish(job);return cached;
    }
    function prepare() {
        if(!committed || !startGrips?.every(Boolean) || same(cached) || same(pending))return;
        const job=snapshot(),id=++ticket;pending=job;
        const next=()=>{
            if(id!==ticket || same(cached))return;
            scan(job,120);
            if(job.samples.length===N){cached=finish(job);if(pending===job)pending=null;}
            else setTimeout(next,0);
        };
        setTimeout(next,0);
    }
    function reservation(map,a) {
        const local=wrap(a-map.rotation);let end=0;
        for(let i=0;i<map.sectors.length;i++){end+=map.sectors[i].width;if(local<end||i===map.sectors.length-1)return map.sectors[i];}
    }
    function directionSamples() {
        const map=plan(),start=map.direction-Math.PI;
        return {start,sectors:SixPairSelection.enabled?map.sectors.map(s=>({...s})):null,indices:map.samples.map((baseline,i)=>
            SixPairSelection.enabled?reservation(map,wrap(start+i*step)).index:baseline)};
    }
    function select(dx,dy) {
        if(Math.hypot(dx,dy)<1e-12)return selectAnchorBaseline(dx,dy);
        const a=wrap(Math.atan2(dy,dx)),map=plan();
        // Exact half-open sectors tile the circle; never fall back between samples.
        const sector=reservation(map,a);
        return sector?[...sector.pair]:selectAnchorBaseline(dx,dy);
    }
    return {enabled:true,get useBaseline(){return baselineDepth>0;},withBaseline,withCurrent,plan,prepare,select,directionSamples,pairs,labels,clear:()=>{cached=null;pending=null;ticket++;}};
})();


// js/game.js
"use strict";
// DOM、ゲーム状態、移動・吸着・勝敗の処理。
const COURSE_WORKER_MODE = globalThis.ASCENT_COURSE_WORKER === true;
const canvas = COURSE_WORKER_MODE ? null : document.getElementById("game");
const ctx = COURSE_WORKER_MODE ? null : canvas.getContext("2d");
const ui = COURSE_WORKER_MODE ? null : Object.fromEntries([
    "rewardDialog", "rewardWheel", "rewardStop", "rewardStatus", "rewardResult", "goalEffects", "closeLife", "closeResult", "staminaGauge", "lifeStatus", "lifeDialog", "lifeQuestion", "lifeWatchAd", "lifeCancel", "dummyAd", "adCounter", "adComplete", "featureHelpDialog", "featureHelpContent", "wall", "level", "stamina", "progress", "overlay", "resultStars",
    "stageStartDialog", "closeStageStart", "stageStartTitle", "stageStartStars", "stageStartRanking", "stageStartLeaderboard", "stageStartLives", "stageStartDifficulty", "stageStartLength", "stageStartStamina", "stageStartButton", "stageHeartCount", "stageHeartValue", "stageHeartReset", "debugSwipeValue", "debugSwipeLess", "debugSwipeMore", "debugSwipeReset", "debugSwipeMode", "stageDebugDisplay", "debugRoute", "debugHoldNumbers", "debugCourseInfo", "resultTitle", "resultTip", "resultTipText", "resultTap", "resultRanking", "resultLeaderboard", "resultDifficulty", "resultStats", "next", "retry", "restart", "hud", "settingsButton", "settingsDialog", "closeSettings", "mapSettingsButton", "mapSettingsControls", "mapSettingsFooter", "mapSettingsDebug", "mapEditCharacter", "mapDebugMode", "mapDebugModeRow",
    "dailyCalendar", "dailyMonthViewport", "dailySettingsButton", "dailyPlate", "dailySkyDate", "dailyClearRecord", "dailyClearStars", "dailyClearStats", "dailyStartTitle", "dailyStartGift", "dailyStartLabel", "dailyStartDifficulty", "dailyStartLength", "dailyStartButton", "openDaily", "dailyEntryDate", "dailyBack", "dailyMonthTitle", "dailyStreak", "dailyPrev", "dailyNext", "dailyGrid", "dailyError", "levelMap", "mapInventory", "mapItemCount", "mapError", "mapScroll", "mapTrack", "mapScenery", "mapRoad", "mapNodes", "mapPlayers", "mapMarker", "mapPrev", "mapNext", "mapCourses", "debugControls", "debugStage", "debugPlay", "debugScoreLoading", "debugScoreCancel", "debugScoreStart", "debugScoreNext", "debugCourseStatus", "debugRegenerate", "debugCourseReport", "debugCourseExit", "debugCourseVerdict", "debugCourseSummary",
    "characterEditor", "playerName", "playerNameError", "editorPreview", "stripeCount", "stripeCountValue", "bodyStripeControls", "editorPalette", "paletteSwatches", "editorRandom", "editorConfirm", "editorCancel",
    "mapSettingsLanguage", "languageChoice", "titleWallpaper", "titleTransfer", "titleScreen", "releaseVersion", "playerUuid", "titleTap", "showHelp", "helpDialog", "helpScroll", "closeHelp"
].map(id => [id, document.getElementById(id)]));

// Native build policy arrives before page scripts. Missing native policy fails closed.
// The browser version retains its existing developer controls.
const DEBUG_FEATURES_ALLOWED = globalThis.location?.protocol === 'capacitor:'
    ? globalThis.ASCENT_IOS_BUILD?.configuration === 'Debug' && globalThis.ASCENT_IOS_BUILD?.debugAllowed === true
    : true;
let debugMode = false;
const debugDisplay={route:true,holdNumbers:true,courseInfo:true};
// Session-only comparison controls. 1.00 means the formal sensitivity for both live input and generation.
const debugSwipeComparison={steps:20,mode:'limbs'};
function liveSwipeComparison() {
    const enabled=DEBUG_FEATURES_ALLOWED && debugMode;
    const multiplier=enabled?debugSwipeComparison.steps/20:1;
    const bodyScale=enabled && debugSwipeComparison.mode==='body'?multiplier:1;
    return {multiplier,bodyScale,aimGain:fingerAimGain()*(enabled && debugSwipeComparison.mode==='limbs'?multiplier:1)};
}

// Latched per attempt: turning a displayed route off (or undoing a move) never
// makes an assisted attempt eligible for the formal leaderboard again.
let rankingAssistanceUsed=false;
function rankingAttemptEligible(){return !rankingAssistanceUsed && !debugAttempt && !activeDebugCourse();}
let settingsOpen = false;
function hideSettings() {
    settingsOpen=false;
    if(typeof requestGameRender==='function')requestGameRender();
    if(ui.settingsDialog.open)ui.settingsDialog.close?.();
}
// First encounters are shared by both courses and retained across launches.
const FEATURE_HELP_KEY='ascent.feature-help.v1';
function readFeatureHelpSeen() {
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(FEATURE_HELP_KEY)||'null');
        return {wide:saved?.wide===true,heart:saved?.heart===true,hazard:saved?.hazard===true};
    } catch(_) {return {wide:false,heart:false,hazard:false};}
}
let featureHelpSeen=COURSE_WORKER_MODE ? {wide:false,heart:false,hazard:false} : readFeatureHelpSeen();
let featureHelpOpen=false;
let pendingFeatureHelp=[];
let featureHelpImageTicket=0,featureHelpImageLoading=false;
function hideStageHelp() {
    featureHelpImageTicket++;featureHelpImageLoading=false;
    ui.featureHelpDialog.classList.remove?.('explanation-image-loading');
    featureHelpOpen=false;pendingFeatureHelp=[];
    if(ui.featureHelpDialog.open)ui.featureHelpDialog.close?.();
}
function stageHasLargeHold() {
    // Inspect the final playable geometry, not a recipe or a hold-array slot.
    // The yellow goal is a separate kind; only ordinary wide holds teach this.
    const starts=new Set(initialGrips),startIds=new Set(initialGrips.map(h=>h?.id).filter(id=>id!=null));
    return holds.some(h=>h.type==='normal' && h.wide===true && !starts.has(h) && !startIds.has(h.id));
}
function showStageHelp() {
    if(state!=='playing' || featureHelpOpen || (typeof isTutorialRun==='function' && isTutorialRun()))return;
    if(featureHelpSeen.wide && featureHelpSeen.heart && featureHelpSeen.hazard)return;
    const features=[];
    if(!featureHelpSeen.wide && stageHasLargeHold())features.push('wide');
    if(!featureHelpSeen.heart && hearts.length)features.push('heart');
    if(!featureHelpSeen.hazard && holds.some(h=>h.type==='hazard'))features.push('hazard');
    if(!features.length)return;
    pendingFeatureHelp=features;featureHelpOpen=true;
    renderStageHelp();
}
function stageHelpCopy(feature=pendingFeatureHelp[0]) {
    const heart=feature==='heart',wide=feature==='wide';
    return {
        title:wide?gameText("tutorial.title.wide"):heart?gameText("feature.title.heart"):gameText("hold.hazard"),
        text:wide?gameText("tutorial.wide"):heart?gameText("feature.heart"):gameText("feature.hazard")
    };
}
function refreshStageHelpLanguage() {
    if(!featureHelpOpen || !pendingFeatureHelp.length)return;
    const copy=stageHelpCopy(),content=ui.featureHelpContent;
    content.lang=GAME_TEXT_LANGUAGE;
    for(const [selector,text] of [['#featureHelpTitle',copy.title],['p',copy.text],['.modal-tap',gameText("action.tap")]]) {
        const node=content.querySelector?.(selector);
        if(node)node.textContent=text;
    }
    // Text only: preserve the loaded illustration, input shield and queued
    // acknowledgment, including while image decode is still pending.
}
function renderStageHelp() {
    const feature=pendingFeatureHelp[0],heart=feature==='heart',wide=feature==='wide';
    const source=wide?'assets/hold-wide-flat.webp':heart?COURSE_HEART_IMAGE_SRC:'assets/hold-hazard-source.webp';
    const {title,text}=stageHelpCopy(feature);
    ui.featureHelpContent.lang=GAME_TEXT_LANGUAGE;
    const icon=wide?'<img class="feature-wide-image" width="78" height="78" alt="">':heart ? `<img class="course-heart-icon" src="${COURSE_HEART_IMAGE_SRC}" width="96" height="96" alt="">` : '<canvas class="feature-hold-image" width="128" height="128" aria-hidden="true"></canvas>';
    ui.featureHelpContent.innerHTML=`<h1 id="featureHelpTitle">${title}</h1><div class="feature-help-icon" aria-hidden="true">${icon}</div><p>${text}</p><div class="modal-tap">${gameText("action.tap")}</div>`;
    const ticket=++featureHelpImageTicket;
    featureHelpImageLoading=true;ui.featureHelpDialog.classList.add?.('explanation-image-loading');
    requestExplanationImage(source,image=>{
        if(ticket!==featureHelpImageTicket || !featureHelpOpen || state!=='playing')return;
        if(wide)mountExplanationImage(ui.featureHelpContent.querySelector?.('.feature-wide-image'),image,{className:'feature-wide-image',width:78,height:78});
        else if(heart)mountExplanationImage(ui.featureHelpContent.querySelector?.('.course-heart-icon'),image,{className:'course-heart-icon',width:96,height:96});
        else if(image)paintHazardHelpIcon(ui.featureHelpContent.querySelector?.('.feature-hold-image'),image);
        featureHelpImageLoading=false;ui.featureHelpDialog.classList.remove?.('explanation-image-loading');
        if(!ui.featureHelpDialog.open)ui.featureHelpDialog.showModal?.();
        requestGameRender();
    });
}
function dismissStageHelp() {
    if(!featureHelpOpen || featureHelpImageLoading || !pendingFeatureHelp.length)return;
    playSound('move');
    featureHelpSeen[pendingFeatureHelp.shift()]=true;
    try {if(!debugAttempt)globalThis.localStorage?.setItem(FEATURE_HELP_KEY,JSON.stringify(featureHelpSeen));}
    catch(_) { /* Remember for this session if storage is unavailable. */ }
    if(pendingFeatureHelp.length) {
        renderStageHelp();
        return;
    }
    hideStageHelp();
    requestGameRender();
    // Start the full opening sequence on the next frame, excluding reading time.
    if(cameraIntro)cameraIntro.start=null;
}
// Initialize before lives/profile startup callbacks (also safe in concatenated builds).
let tutorialRun=null;
let dailyRun=null;
function courseSeed(n=level) {
    if(typeof isTutorialRun==='function' && isTutorialRun())return TUTORIAL_COURSE_CONFIG.seed;
    if(activeDebugCourse())return debugCourseTrial.seed;
    if(dailyRun)return dailyRun.seed;
    // After generation restores the normal identity, cached pickups/previews
    // must still recognize the resolved base seed, not the stage number.
    return typeof CourseProgression!=='undefined'?CourseProgression.resolveStage(n).seed:n;
}
function leaveDailyRun() {
    if(dailyRun) {courseMode='existing';dailyRun=null;}
}
let courseMode = 'existing';
let level = 1;
let difficulty = 0; // Internal legacy generation family, not a course-type ID.
let courseTypeId = 0;
let debugCourseTrial = null;
let debugHelpBefore = null;
function activeDebugScoreTrial(){return activeDebugCourse()?.kind==='score';}
function debugCourseTitle(){return activeDebugScoreTrial()?gameText('debug.score.current',{value0:debugCourseTrial.score}):'';}
function activeDebugCourse(){
    const trial=debugCourseTrial;
    // Only current score trials may override generation identity. Old TYPE-only
    // runtime objects (or malformed score objects) must never revive the retired path.
    return DEBUG_FEATURES_ALLOWED && debugMode && typeof debugAttempt!=='undefined' && debugAttempt &&
        trial?.kind==='score' && Number.isInteger(trial.score) && trial.score>=1 && trial.score<=100 &&
        trial.seed===trial.score+10 && trial.typeId===generationTypeForScore(trial.score) ? trial : null;
}
let holds = [];
let route = [];
let hearts = [];
let heartPopups = [];
let anchorRings = [];
let hazardShakeStart = null;
let HEIGHT = H;
// Extra space above high goals belongs to the camera, preserving course geometry.
function cameraTop() {
    const goal=holds.find(h=>h.type==='goal');
    return goal ? Math.min(0,goal.y-CAMERA_CONFIG.goalTopPadding) : 0;
}
let initialGrips = [];
let body;
let committed;
let grips = [];
let startGrips = [];
let stamina = 0;
let moveCount = 0;
let camera = 0;
let cameraIntro = null;
let inspecting = false;
let drag = null;
let bodyTap = null;
let state = "choosing";
let warning = 0;
let densityStats = null;
let undoSnapshot = null;
let moveSnapshot = null;
let lifeAttemptId=0;
let adPlayRecorded=false;
let runStartedAt = null;
let runElapsedMs = 0;
function runTimeMs(now=performance.now()) {
    return runStartedAt===null ? runElapsedMs : Math.max(0,now-runStartedAt);
}
function formatClearTime(ms) {
    const ticks=Math.floor(Math.max(0,ms)/10);
    return [Math.floor(ticks/6000),Math.floor(ticks/100)%60,ticks%100]
        .map(n=>String(n).padStart(2,'0')).join(':');
}
function formatStageRecord(record) { return gameText("game.formatStageRecord", {value0: record.moves, value1: formatClearTime(record.timeMs)}); }
function hideResultModal() {
    if(ui.overlay.open)ui.overlay.close?.();
    ui.overlay.hidden=true;
}
function showResultModal() {
    requestGameRender();
    ui.overlay.hidden=false;
    if(!ui.overlay.open)ui.overlay.showModal?.();
}


function generate(n) {
    ({ holds, route, HEIGHT, initialGrips, densityStats } = stageGenerator.generate(n,false,courseSeed(n),dailyRun?.baseSeed??courseSeed(n),dailyRun?dailyDistribution():stageDistribution(n)));
}

// Anatomical reach is measured from the shoulder/hip, not the torso center.
function limbReachable(p, h, i) {
    const root = limbRoot(p, i);
    const reach = distance(root, h);
    return reach <= LIMB_LENGTHS[i] + 1e-7 && (i < 2 || (
        h.y >= p.y - 1e-7 &&
        (h.y >= root.y - 1e-7 || reach >= LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO - 1e-7)
    ));
}

// Raised fixed feet create a non-convex reachable area. Stop at the FIRST
// invalid interval, even when the endpoint itself is reachable again.
function supportMotionFraction(from, to, pair, stance = startGrips) {
    if (!isSupportPair(pair) || !pair.every(i => stance[i] && limbReachable(from, stance[i], i))) return 0;
    const dx = to.x - from.x, dy = to.y - from.y;
    const length2 = dx * dx + dy * dy;
    if (length2 < 1e-16) return 1;
    const cuts = [0, 1];
    const add = t => { if (t > 0 && t < 1) cuts.push(t); };
    for (const i of pair) {
        const h = stance[i], root = limbRoot(from, i);
        const x = root.x - h.x, y = root.y - h.y;
        const circle = radius => {
            const b = 2 * (x * dx + y * dy);
            const c = x * x + y * y - radius * radius;
            const discriminant = b * b - 4 * length2 * c;
            if (discriminant < 0) return;
            const q = Math.sqrt(discriminant);
            add((-b - q) / (2 * length2));
            add((-b + q) / (2 * length2));
        };
        circle(LIMB_LENGTHS[i]);
        if (i >= 2) {
            circle(LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO);
            if (Math.abs(dy) > 1e-12) {
                add((h.y - from.y) / dy);
                add((h.y - TORSO.height / 2 - from.y) / dy);
            }
        }
    }
    cuts.sort((a, b) => a - b);
    for (let k = 1; k < cuts.length; k++) {
        const t = (cuts[k - 1] + cuts[k]) / 2;
        const p = { x: from.x + dx * t, y: from.y + dy * t };
        if (!pair.every(i => limbReachable(p, stance[i], i))) return cuts[k - 1];
    }
    return 1;
}

function supportPairReach(pair, ux, uy) {
    const limit = Math.max(...pair.map(i => LIMB_LENGTHS[i])) * 2;
    return limit * supportMotionFraction(committed,
        { x: committed.x + ux * limit, y: committed.y + uy * limit }, pair);
}

// A moving limb should have a hold ahead of its current contact in the
// initial Body movement direction. This only checks whether such a
// possibility exists; it does not decide which hold the limb will use.
function movingLimbHasForwardHold(i, pair, ux, uy, pairReach) {
    const current = startGrips[i];
    if (!current)
        return false;

    // Sample several Body positions along the support pair's reachable range.
    // The actual hold remains undecided and will still be selected in real time
    // by attachMoving() during the drag.
    const samples = [0.25, 0.5, 0.75, 1.0];

    for (const ratio of samples) {
        const p = {
            x: committed.x + ux * pairReach * ratio,
            y: committed.y + uy * pairReach * ratio
        };

        for (const h of holds) {
            // Staying on the same hold is not a new movement opportunity.
            if (h === current)
                continue;

            // A support hold is occupied and cannot normally be reused.
            // The goal is the one exception: both hands may share it.
            const occupiedBySupport = pair.some(j =>
                startGrips[j] === h &&
                !canShareHold(h, i, j)
            );

            if (occupiedBySupport)
                continue;

            // Only count holds that lie ahead of the limb's current contact
            // in the initial drag direction.
            const forward =
                (h.x - current.x) * ux +
                (h.y - current.y) * uy;

            if (forward <= 0)
                continue;

            if (limbReachable(p, h, i))
                return true;
        }
    }

    return false;
}

function goalSupportDistance(pair, ux, uy, reach) {
    const goal = holds.find(h => h.type === 'goal');
    if (!goal || !(reach > 1e-7) || bothHandsOnGoal(startGrips)) return Infinity;
    // A diagonal alignment may approach one shoulder while moving away from
    // the midpoint. Accept an approach by either hand still needing the goal.
    if (![0, 1].some(i => {
        if (startGrips[i] === goal) return false;
        const root = limbRoot(committed, i);
        return (goal.x-root.x)*ux+(goal.y-root.y)*uy > 1e-7;
    })) return Infinity;
    if (pair.some(i => i < 2 && startGrips[i] !== goal)) return Infinity;

    let lo = 0, hi = reach;
    const clipAxis = (origin, direction, min, max) => {
        if (Math.abs(direction) < 1e-12) return origin >= min && origin <= max;
        const a = (min - origin) / direction, b = (max - origin) / direction;
        lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
        return lo <= hi;
    };
    if (!clipAxis(committed.x, ux, 25, W - 25) ||
        !clipAxis(committed.y, uy, 80, HEIGHT - 40)) return Infinity;
    // Intersect the ray with both hands' actual shoulder-centered reach circles.
    for (const i of [0, 1]) {
        const root = limbRoot(committed, i), x = root.x - goal.x, y = root.y - goal.y;
        const b = x * ux + y * uy;
        const disc = b * b - (x * x + y * y - LIMB_LENGTHS[i] ** 2);
        if (disc < -1e-7) return Infinity;
        const q = Math.sqrt(Math.max(0, disc));
        lo = Math.max(lo, -b - q); hi = Math.min(hi, -b + q);
    }
    if (lo > hi + 1e-7) return Infinity;
    lo = Math.max(0, lo); hi = Math.max(lo, hi);
    const cuts = [lo, hi];
    const add = t => { if (t > lo && t < hi) cuts.push(t); };
    // With one hand already held on goal, the other moving limb may be a foot.
    // Include every reach boundary so even a narrow legal foot interval is tested.
    for (const i of [2, 3].filter(i => !pair.includes(i))) {
        const root = limbRoot(committed, i);
        for (const h of holds) {
            if (h.y < goal.y || pair.some(j => startGrips[j] === h && !canShareHold(h, i, j))) continue;
            const x = root.x - h.x, y = root.y - h.y, b = x * ux + y * uy;
            for (const radius of [LIMB_LENGTHS[i], LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO]) {
                const d = b * b - (x * x + y * y - radius * radius);
                if (d >= 0) { const q = Math.sqrt(d); add(-b - q); add(-b + q); }
            }
            if (Math.abs(uy) > 1e-12) {
                add((h.y - committed.y) / uy);
                add((h.y - TORSO.height / 2 - committed.y) / uy);
            }
        }
    }
    cuts.sort((a,b) => a-b);
    const probes = [];
    cuts.forEach((t,i) => { probes.push(t); if(i+1<cuts.length)probes.push((t+cuts[i+1])/2); });
    for (const t of probes) {
        const p = {x:committed.x+ux*t,y:committed.y+uy*t};
        if (supportMotionFraction(committed,p,pair)<1-1e-9) continue;
        const stance = attachMoving(p,pair);
        if (stance?.every(Boolean) && bothHandsOnGoal(stance) && !sameContacts(stance,startGrips)) return t;
    }
    return Infinity;
}

function selectAnchor(dx, dy) {
    return typeof SixPairSelection !== "undefined" && SixPairSelection.enabled && !SixPairSelection.useBaseline
        ? SixPairSelection.select(dx,dy) : selectAnchorBaseline(dx,dy);
}
function selectAnchorBaseline(dx, dy) {
    const length = Math.hypot(dx, dy);
    if (!(length > 0)) return [0, 1];
    const ux = dx / length;
    const uy = dy / length;

    const supportPairs = [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [1, 3],
        [2, 3]
    ];

    let goalPair = null, goalDistance = Infinity;
    for (const pair of supportPairs) {
        const t = goalSupportDistance(pair, ux, uy, supportPairReach(pair, ux, uy));
        if (t < goalDistance) { goalPair = pair; goalDistance = t; }
    }
    if (goalPair) return [...goalPair];

    const reachTieTolerance = typeof fingerAimEnabled === 'function' && fingerAimEnabled() ? 1e-7 : 0;
    let bestPair = supportPairs[0];
    let bestMovingCount = -1;
    let bestReach = -1;

    for (const pair of supportPairs) {
        const reach = supportPairReach(pair, ux, uy);
        const moving = [0, 1, 2, 3].filter(i => !pair.includes(i));

        let movingCount = 0;

        for (const i of moving) {
            if (movingLimbHasForwardHold(i, pair, ux, uy, reach))
                movingCount++;
        }

        // First prefer the support pair that gives more moving limbs
        // a useful forward destination.
        //
        // If the number of useful moving limbs is the same, preserve
        // the original philosophy and prefer the pair that lets Body
        // travel farther in the requested direction. Numerically tied reaches
        // retain supportPairs order: screen-space round trips can perturb a
        // mathematically equal ray by ~1e-14 and must not change the lock.
        if (
            movingCount > bestMovingCount ||
            (movingCount === bestMovingCount && reach > bestReach + reachTieTolerance)
        ) {
            bestPair = pair;
            bestMovingCount = movingCount;
            bestReach = reach;
        }
    }

    return [...bestPair];
}

function canShareHold(hold, a, b) {
    return a !== b && ((hold.type === 'goal' && a < 2 && b < 2) ||
        (hold.wide === true && Math.floor(a / 2) === Math.floor(b / 2)));
}

function attachMoving(p, anchor, gestureAim = null) {
    const result = Array(4).fill(null);
    const fixed = anchor;

    if (!supportsReachable(p, anchor))return null;

    fixed.forEach(i => result[i] = startGrips[i]);

    const moving = [0, 1, 2, 3].filter(i => !fixed.includes(i));
    const movingSameType = moving.length === 2 &&
        Math.floor(moving[0] / 2) === Math.floor(moving[1] / 2);

    const candidates = moving.map(i => {
        const target = gestureAim ? fingerAimTarget(i, gestureAim) : {
            x: p.x + limbs[i].x,
            y: p.y + limbs[i].y
        };

        const available = holds;

        return available
            .filter(h =>
                fixed.every(j => h !== result[j] || canShareHold(h, i, j)) &&
                limbReachable(p, h, i)
            )
            .map(h => ({
                h,
                cost:
                    distance(h, target) ** 2 -
                    (h.type === 'goal' ? 4 * R * R : 0)
            }))
            .sort((a, b) =>
                a.cost - b.cost ||
                a.h.id - b.h.id
            );
    });

    // Sharing is pairwise: a wide hold accepts two hands OR two feet, never a mix.
    let best = [...result];
    let bestCount = -1;
    let bestCost = Infinity;
    let bestGoal = false;

    function assign(slot, count, cost) {
        if (slot === moving.length) {
            // Two moving hands/feet retain absolute left-to-right order.
            // Equal-x sharing and mixed moving pairs keep their existing rules.
            if (movingSameType && result[moving[0]] && result[moving[1]] &&
                result[moving[0]].x > result[moving[1]].x)
                return;

            const hands = result.slice(0, 2).filter(Boolean);
            const feet = result.slice(2).filter(Boolean);

            if (feet.some(foot => hands.some(hand => foot.y < hand.y)))
                return;

            // A complete, legal goal stance outranks heuristic attraction cost.
            // Partial contacts cannot win; fixed contacts and reach remain unchanged.
            const goal = result.every(Boolean) && bothHandsOnGoal(result);
            if (
                (goal && !bestGoal) ||
                (goal === bestGoal && (count > bestCount ||
                (count === bestCount && cost < bestCost)))
            ) {
                best = [...result];
                bestCount = count;
                bestCost = cost;
                bestGoal = goal;
            }

            return;
        }

        const i = moving[slot];

        for (const candidate of candidates[slot]) {
            if (
                result.some((h, j) =>
                    j !== i &&
                    h === candidate.h &&
                    !canShareHold(h, i, j)
                )
            )
                continue;

            result[i] = candidate.h;
            assign(slot + 1, count + 1, cost + candidate.cost);
        }

        result[i] = null;
        assign(slot + 1, count, cost);
    }

    assign(0, 0, 0);

    return bestCount < 0 ? null : best;
}

function clearStars(moves,expectedMoves) {
    return moves<=expectedMoves ? 3 : moves<=expectedMoves+2 ? 2 : 1;
}
function stageStamina(moves) {
    return moves + 3;
}

// Share the live per-limb contact rule with route budgeting.
function newHazardContacts(stance,previous) {
    return new Set(stance.filter((h,i)=>h?.type==='hazard' && h!==previous[i]));
}
function routeHazardCosts(path) {
    const byId=new Map(holds.map(h=>[h.id,h]));
    let previous=[...initialGrips],total=0;
    for(const pair of [[0,1],[2,3]]) {
        const sorted=pair.map(i=>previous[i]).sort((a,b)=>(a?.x||0)-(b?.x||0));
        pair.forEach((i,j)=>previous[i]=sorted[j]);
    }
    return path.map((p,step)=>{
        if(step) {
            const stance=(p.grips||[]).map(id=>byId.get(id));
            total+=newHazardContacts(stance,previous).size*HAZARD_CONFIG.penalty;
            previous=stance;
        }
        return total;
    });
}
// One real move plus the actual new-contact surcharge; no extra search multiplier.
function routeMoveCost(stance,previous) {
    return 1+newHazardContacts(stance,previous).size*HAZARD_CONFIG.penalty;
}
function routeConsumption(path) {
    return path.length-1+(routeHazardCosts(path).at(-1)||0);
}
function routeExpectedMoves(path=route) {
    return path.length-1;
}
function routeStamina(path) {
    return stageStamina(routeExpectedMoves(path));
}

// Use an independent stream: retries preserve both holds and items.
function createHearts(n,path,selectedDifficulty=dailyRun?.difficulty ?? difficultyForStage(n)) {
    if(typeof isTutorialRun==='function' && isTutorialRun())return [];
    if(typeof generatedCourse!=='undefined' && generatedCourse?.holds===holds &&
        generatedCourse.level===n && generatedCourse.seed===courseSeed(n) && generatedCourse.difficulty===selectedDifficulty)
        return generatedCourse.hearts.map(h=>({...h,collected:false}));
    return makeRouteHearts(n,path,selectedDifficulty);
}
function makeRouteHearts(n, path, selectedDifficulty=dailyRun?.difficulty ?? difficultyForStage(n)) {
    const moves = path.length - 1;
    if (!difficultyRule(selectedDifficulty).hearts || moves < HEART_CONFIG.minMoves) return [];
    const random = mulberry32(courseSeed(n) ^ 0x48EA27B1);
    const count = Math.floor(random() * (HEART_CONFIG.maxCount + 1));
    const costs = routeHazardCosts(path);
    const initialBudget = routeStamina(path);
    let previousStep = 0;
    return Array.from({length:count}, (_,id) => {
        // Recover before the late climb: one item by halfway, or two by 1/3 and 2/3.
        // Also reserve stamina before pickup where the short-stage budget permits it.
        const routeDeadline = Math.floor(moves * (id + 1) / (count + 1));
        const budgetDeadline = initialBudget + id * HEART_CONFIG.recovery - 1;
        let latest = Math.max(previousStep + 1,
            Math.min(routeDeadline,budgetDeadline,moves - (count - id)));
        while(latest>previousStep+1 && latest+costs[latest]>budgetDeadline)latest--;
        const step = previousStep + 1 + Math.floor(random() * (latest - previousStep));
        previousStep = step;
        return {id, x:path[step].x, y:path[step].y, collected:false};
    });
}

// Sweep the torso rectangle along each actual movement segment so fast drags
// cannot skip an item. Limbs, camera movement and pose-only settling do not collect.
function torsoTouchesHeart(from, to, heart) {
    const halfWidth = TORSO.width / 2 + HEART_CONFIG.radius;
    const halfHeight = TORSO.height / 2 + HEART_CONFIG.radius;
    let enter = 0, exit = 1;
    for (const [axis,half] of [['x',halfWidth],['y',halfHeight]]) {
        const delta = to[axis] - from[axis];
        const offset = from[axis] - heart[axis];
        if (Math.abs(delta) < 1e-12) {
            if (Math.abs(offset) > half) return false;
        } else {
            const a = (-half-offset)/delta, b = (half-offset)/delta;
            enter = Math.max(enter,Math.min(a,b));
            exit = Math.min(exit,Math.max(a,b));
            if (enter > exit) return false;
        }
    }
    return true;
}
function collectHearts(from, to) {
    for (const heart of hearts) {
        if (!heart.collected && torsoTouchesHeart(from,to,heart)) {
            heart.collected = true;
            playSound('heart');
            stamina += HEART_CONFIG.recovery;
            heartPopups.push({x:heart.x,y:heart.y,start:performance.now()});
        }
    }
}
// Pickups persist for the whole attempt, including canceled moves and Undo.
function restoreMoveStamina(saved) {
    const newPickups = hearts.filter((heart,i) => heart.collected && !saved.collectedHearts[i]).length;
    stamina = saved.stamina + newPickups * HEART_CONFIG.recovery;
}

// A date keeps its difficulty even if a layout needs a deterministic retry.
function prepareCurrentStage() {
    // Every generation entry, including score trials and authored tutorial,
    // uses baseline controls. Live six-pair planning must never run inside search.
    return typeof SixPairSelection==='undefined' ? prepareCurrentStageBaseline()
        : SixPairSelection.withBaseline(prepareCurrentStageBaseline);
}
function prepareCurrentStageBaseline() {
    courseMode='existing'; // Old experimental modes cannot enter generation.
    if(typeof isTutorialRun==='function' && isTutorialRun())return prepareTutorialCourse();
    return prepareAdoptedCourse();
}
const stagePreviewCache=new Map();
function stagePreview(n,mode=courseMode,profile=null) {
    if(typeof refreshAdoptedCourseCacheDependencies === 'function')refreshAdoptedCourseCacheDependencies();
    mode='existing';
    const selectedTypeId=profile?.typeId ?? courseTypeForStage(n);
    const selectedDifficulty=courseTypeRule(selectedTypeId).generationDifficulty;
    const key=JSON.stringify([typeof fingerInputIdentity === 'function' ? fingerInputIdentity() : ['baseline'],n,mode,profile?.date,selectedTypeId,COURSE_VERSION,CourseProgressionConfig,CourseDistributionConfig,COURSE_STAMINA_CONFIG,COURSE_RETRY_CONFIG,STAGE_CONFIG,COURSE_TYPES,DIFFICULTY_CONFIG,DIFFICULTY_RULES,HOLD_CONFIG,HAZARD_CONFIG,ROUTE_OPTIMIZATION_CONFIG,ROUTE_COST_SEARCH_CONFIG,COURSE_GENERATION_CONFIG]);
    if(stagePreviewCache.has(key))return stagePreviewCache.get(key);
    const saved={level,difficulty,courseTypeId,courseMode,dailyRun,debugCourseTrial,holds,route,hearts,HEIGHT,initialGrips,densityStats,stageGenerator,committed,startGrips,moveCount,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
    const savedTutorial=typeof tutorialRun==='undefined'?null:tutorialRun;
    try {
        if(typeof tutorialRun!=='undefined')tutorialRun=null;
        debugCourseTrial=null; // A normal/Daily preview must never inherit a trial seed or forced type.
        level=n;difficulty=selectedDifficulty;courseTypeId=selectedTypeId;courseMode=mode;dailyRun=profile?{...profile}:null;
        stageGenerator=createStageGenerator();
        prepareCurrentStage();
        const preview={stamina:currentCourseInitialStamina(),expectedMoves:routeExpectedMoves(),height:HEIGHT,typeId:selectedTypeId,difficulty,seed:courseSeed()};
        if(stagePreviewCache.size>=64)stagePreviewCache.delete(stagePreviewCache.keys().next().value);
        stagePreviewCache.set(key,preview);return preview;
    } finally {
        if(typeof tutorialRun!=='undefined')tutorialRun=savedTutorial;
        ({level,difficulty,courseTypeId,courseMode,dailyRun,debugCourseTrial,holds,route,hearts,HEIGHT,initialGrips,densityStats,stageGenerator,committed,startGrips,moveCount,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=saved);
    }
}
function previewStaminaText(n,mode=courseMode,profile=null,bonus=0) {
    try {return `❤️${String(stagePreview(n,mode,profile).stamina+bonus).padStart(2,'0')}`;}
    catch(_) {return '❤️—';}
}
function reset(n,staminaBonus=0) {
    const tutorial=typeof isTutorialRun==='function' && isTutorialRun();
    if(n===0 && !tutorial)throw new RangeError('Stage 0 is tutorial-only');
    if(tutorial && (n!==0 || staminaBonus!==0))throw new RangeError('Tutorial does not accept normal stages or consumable bonuses');
    // Trials are runtime-only. Reject stale retired/malformed state without
    // deleting any saved progress, Daily records, help flags or account data.
    if(debugCourseTrial && !activeDebugCourse()) {
        endDebugCourseTrial();debugAttempt=false;
    }
    courseMode='existing';
    lifeAttemptId++;
    adPlayRecorded=false;
    hideStageHelp();
    runStartedAt=null;runElapsedMs=0;
    undoSnapshot = moveSnapshot = null;
    bodyTap = null;
    resetCharacterAnimation();
    jointHistory.fill(null);
    level = n;
    courseTypeId=typeof isTutorialRun==='function' && isTutorialRun()?0:activeDebugCourse()?debugCourseTrial.typeId:dailyRun?.typeId??courseTypeForStage(n);
    difficulty=courseTypeRule(courseTypeId).generationDifficulty;
    prepareCurrentStage();
    if(currentCourseInitialStamina()+staminaBonus<=0)throw new Error('Course initial stamina is not positive');
    rankingAssistanceUsed=false;

    body = { ...route[0] };
    committed = { ...body };
    grips = [...initialGrips];

    for (const pair of [[0, 1], [2, 3]]) {
        const sorted = pair
            .map(i => grips[i])
            .sort((a, b) => a.x - b.x);

        pair.forEach((i, j) => grips[i] = sorted[j]);
    }

    startGrips = [...grips];
    startInitialPose();

    hearts = createHearts(n,route,difficulty);
    heartPopups = [];
    anchorRings = [];
    hazardShakeStart = null;
    stamina = currentCourseInitialStamina()+staminaBonus;

    moveCount = 0;

    camera = clamp(
        holds.find(h => h.type === 'goal').y - CAMERA_CONFIG.goalTopPadding,
        cameraTop(),
        HEIGHT - H
    );

    const introTarget = HEIGHT - H;
    cameraIntro = {from:camera,to:introTarget,start:null};

    inspecting = false;
    drag = null;
    state = 'playing';
    warning = 0;

    hideResultModal();
    hideSettings();
    ui.hud.hidden=false;
    ui.titleScreen.hidden=true;
    ui.characterEditor.hidden=true;
    ui.restart.disabled = false;

    ui.level.textContent = activeDebugCourse() ? debugCourseTitle() : dailyRun ? gameText("label.daily", {value0: dailyRun.date.slice(5).replace('-','/')}) : gameText("label.stage", {value0: level});
    ui.next.hidden=true;
    ui.retry.hidden=false;
    ui.dailyCalendar.hidden=true;
    ui.levelMap.hidden = true;
    ui.wall.classList.toggle('map-open',false);

    startStageBackgroundMusic();
    updateUI();
}

function updateUI() {
    if(typeof SixPairSelection!=="undefined" && state==='playing' && !drag && body && grips.every(Boolean)) {
        const savedOrigin=committed,savedStance=startGrips;
        try {committed=body;startGrips=grips;SixPairSelection.prepare();}
        finally {committed=savedOrigin;startGrips=savedStance;}
    }
    if(typeof updateDebugCourseReport==='function')updateDebugCourseReport();
    if(typeof requestGameRender==='function')requestGameRender();
    ui.settingsButton.disabled = !!cameraIntro || state!=='playing';
    ui.stamina.textContent = String(stamina);
    ui.stamina.setAttribute('aria-label',gameText("game.updateUI.2", {value0: stamina}));
    ui.stamina.style.color = '#fffaf0';
    ui.staminaGauge.style.color = stamina <= 4 ? '#bc5144' : '#cf6676';

    ui.progress.hidden=!(debugMode && debugDisplay.courseInfo);
    ui.progress.textContent =
        gameText("game.updateUI", {value0: moveCount, value1: routeExpectedMoves(), value2: courseTypeLabel(courseTypeId)});
}

function point(e) {
    return viewportClientPoint(e,canvas.getBoundingClientRect(),camera);
}

function limbRoot(p, index) {
    return {
        x:
            p.x +
            (index % 2 ? 1 : -1) *
            TORSO.width / 2,

        y:
            p.y +
            (index < 2 ? -1 : 1) *
            TORSO.height / 2
    };
}

function down(e) {
    if (
        state !== 'playing' || settingsOpen || featureHelpOpen ||
        cameraIntro ||
        drag
    )
        return;

    inspecting = false;

    // Read the world point before camera recentering changes its screen mapping.
    const inputCamera = camera;
    const p = point(e);

    camera = clamp(
        body.y - H * CAMERA_CONFIG.bodyScreenRatio,
        cameraTop(),
        HEIGHT - H
    );

    if (
        p.x < 0 ||
        p.x > W ||
        p.y < (typeof fingerAimEnabled === 'function' && fingerAimEnabled() ? inputCamera : camera) ||
        p.y > (typeof fingerAimEnabled === 'function' && fingerAimEnabled() ? inputCamera : camera) + H
    )
        return;

    if(runStartedAt===null)runStartedAt=performance.now()-runElapsedMs;
    // Preserve the visible settled pose as well as the logical move origin.
    moveSnapshot = {
        body:{...body}, grips:[...grips], stamina, moveCount,
        collectedHearts:hearts.map(heart=>heart.collected),
        camera,
        visibleBody:{...characterPose(performance.now()).body},
        joints:jointHistory.map(p=>p && ({...p}))
    };
    resetCharacterAnimation();
    const swipeComparison=liveSwipeComparison();
    drag = {
        dx: body.x - p.x,
        dy: body.y - p.y,
        anchor: null,
        ...(typeof fingerAimEnabled === 'function' && fingerAimEnabled() ? { fingerOrigin: {x:e.clientX,y:e.clientY,width:canvas.getBoundingClientRect().width},
            fingerAction: fingerAction([],swipeComparison.aimGain), swipeComparison, fingerTrace: [{...body}] } : {})
    };

    committed = { ...body };
    startGrips = [...grips];

    updateUI();
}

function move(e) {
    if (!drag)
        return;

    if (drag.fingerOrigin) {
        moveFingerGesture(e);
        return;
    }

    const p = point(e);

    const raw = {
        x: p.x + drag.dx,
        y: p.y + drag.dy
    };

    const target = {
        x: clamp(raw.x, 25, W - 25),
        y: clamp(raw.y, 80, HEIGHT - 40)
    };

    const d = distance(raw, committed);

    if (drag.anchor === null) {
        if (d < INPUT_CONFIG.dragThreshold)
            return;

        drag.anchor = selectAnchor(
            raw.x - committed.x,
            raw.y - committed.y
        );
    }

    const previousBody = { ...body };
    const fraction = supportMotionFraction(body, target, drag.anchor);
    const blocked = fraction < 1 - 1e-9;
    body = { x: body.x + (target.x - body.x) * fraction,
        y: body.y + (target.y - body.y) * fraction };

    const attached =
        attachMoving(body, drag.anchor);

    if (attached) {
        // Only new provisional limb/hold contacts, never a held pose or detachment.
        const freshContacts=attached.filter((h,i)=>h && h!==grips[i] && !drag.anchor.includes(i));
        // Hazard confirmation has its own release cue; do not preface it with
        // the normal provisional contact sound (including mixed limb pairs).
        if(freshContacts.length && !freshContacts.some(h=>h.type==='hazard'))
            playSound('contact');
        grips = attached;
    } else
        body = previousBody;

    collectHearts(previousBody,body);
    warning = blocked ? 1 : 0;

    updateUI();
}


// Screen-space displacement continues to update even when support reach stops
// the torso. Capturing width at down makes the gesture independent of camera
// recentering, starting point, and the number/timing of move events.
function moveFingerGesture(e) {
    const origin = drag.fingerOrigin;
    const scale=drag.swipeComparison?.bodyScale ?? 1;
    const delta = { dx: (e.clientX-origin.x)*400/origin.width*scale,
        dy: (e.clientY-origin.y)*400/origin.width*scale };
    const last = drag.fingerAction.points.at(-1);
    if (last && last.dx === delta.dx && last.dy === delta.dy) return;
    const previousBody = {...body};
    const coupled=drag.fingerAction.bodyMotion === COUPLED_BODY_MODEL;
    if(coupled && (drag.inputLimitExceeded || drag.fingerAction.points.length>=COUPLED_BODY_CONFIG.maxPoints)) {
        // Fail closed instead of committing the stale last accepted endpoint.
        // The latch is part of the bounded replay record and cannot be cleared
        // by moving the pointer again within the same gesture.
        drag.inputLimitExceeded=true;drag.fingerAction.inputLimitExceeded=true;
        warning=1;updateUI();return;
    }
    const next = coupled ? coupledGestureReplay(committed,startGrips,
        {...drag.fingerAction,points:[...drag.fingerAction.points,delta]},drag.anchor,drag.motionCache) :
        fingerGestureStep(committed, startGrips, body, grips, drag.anchor,delta, drag.fingerAction.gain);
    if (!next) return;
    drag.fingerAction.points.push(delta);
    drag.anchor = next.anchor;
    const previousTraceLength=drag.fingerTrace.length;
    if(coupled){drag.fingerTrace=next.trace.map(p=>({...p}));drag.motionCache=next.motionCache;drag.cancelAtOrigin=next.cancelAtOrigin;}
    else drag.fingerTrace.push({...next.p});
    if (!next.active) return;
    if((drag.swipeComparison?.multiplier ?? 1)!==1)rankingAssistanceUsed=true;
    const freshContacts = next.stance.filter((h,i) => h && h !== grips[i] && !drag.anchor.includes(i));
    if (freshContacts.length && !freshContacts.some(h => h.type === 'hazard')) playSound('contact');
    body = next.p; grips = next.stance;
    if(coupled) {
        for(let i=previousTraceLength;i<next.trace.length;i++)collectHearts(next.trace[i-1],next.trace[i]);
    } else collectHearts(previousBody, body);
    warning = next.blocked ? 1 : 0;
    updateUI();
}

function bothHandsOnGoal(stance = grips) {
    return (
        stance[0]?.type === 'goal' &&
        stance[0] === stance[1]
    );
}

// Compare contact positions as a multiset, independent of limb assignment.
function sameContacts(a, b) {
    if (
        a.length !== 4 ||
        b.length !== 4 ||
        !a.every(Boolean) ||
        !b.every(Boolean)
    )
        return false;

    const positions = list =>
        list
            .map(h => h.x + ',' + h.y)
            .sort();

    const left = positions(a);
    const right = positions(b);

    return left.every(
        (position, i) =>
            position === right[i]
    );
}

function release(cancel = false) {
    if (!drag)
        return;
    // Returning the coupled pointer to its start is an explicit no-cost cancel,
    // even if a constrained body path still has positional hysteresis.
    cancel = cancel || drag.cancelAtOrigin === true || drag.inputLimitExceeded === true;

    const invalid =
        grips.some(h => h === null) ||
        (
                (
                !isSupportPair(drag.anchor) ||
                !drag.anchor.every(i =>
                    grips[i] === startGrips[i] &&
                    limbReachable(
                        body,
                        grips[i],
                        i
                    )
                )
            )
        );

    const movingLimbs=[0,1,2,3].filter(i=>!drag.anchor?.includes(i));
    if (drag.fingerAction) lastFingerGesture = {
        action: {...fingerAction(drag.fingerAction.points, drag.fingerAction.gain),
            ...(drag.fingerAction.inputLimitExceeded?{inputLimitExceeded:true}:{})},
        origin: {...committed}, originGripIds: startGrips.map(h=>h?.id??null),
        p: {...body}, grips: grips.map(h=>h?.id??null), anchor: drag.anchor && [...drag.anchor],
        trace: drag.fingerTrace.map(p=>({...p})), canceled: cancel,
        accepted: !cancel && !invalid && (!sameContacts(grips,startGrips) || newHazardContacts(grips,startGrips).size>0)
    };
    drag = null;

    // Continuity belongs to a limb/hold pair, not just an occupied hold.
    const newHazards = newHazardContacts(grips,startGrips);
    if (
        cancel ||
        invalid ||
        (sameContacts(grips, startGrips) && !newHazards.size)
    ) {
        if(invalid && !cancel)playSound('move');
        body = { ...committed };
        grips = [...startGrips];
    } else {
        const now=performance.now();
        anchorRings=movingLimbs.map(i=>({x:grips[i].x,y:grips[i].y,start:now}));
        undoSnapshot = moveSnapshot;

        stamina = Math.max(0,stamina-1-newHazards.size*HAZARD_CONFIG.penalty);
        if (newHazards.size) {
            const now = performance.now();
            hazardShakeStart = now;
            for (const h of newHazards) heartPopups.push({x:h.x,y:h.y,start:now,
                kind:'hazard',text:`-${HAZARD_CONFIG.penalty}`,color:'#9442be'});
        }
        if(!bothHandsOnGoal() && stamina>0)playSound(newHazards.size?'hazard':'move');
        moveCount++;

        committed = { ...body };
        startPoseSettle();
        if(typeof tutorialTrigger==='function') {tutorialTrigger('move');tutorialTrigger('hold');}

        if (bothHandsOnGoal())
            finish(true);
        else if (stamina === 0)
            finish(false);
    }

    moveSnapshot = null;
    warning = 0;

    updateUI();
}

function canUndoMove() {
    return !!undoSnapshot && !featureHelpOpen && !settingsOpen && !drag && !cameraIntro && ['playing','won','lost'].includes(state);
}
function undoMove() {
    if (!canUndoMove()) return false;
    playSound('move');
    hazardShakeStart = null;
    anchorRings = [];
    heartPopups = heartPopups.filter(p => p.kind !== 'hazard');
    const elapsed=runTimeMs();
    const saved = undoSnapshot;
    undoSnapshot = moveSnapshot = null;
    body = {...saved.body}; committed = {...body};
    grips = [...saved.grips]; startGrips = [...grips];
    restoreMoveStamina(saved);
    moveCount = saved.moveCount;
    camera = saved.camera; inspecting = false; warning = 0; state = 'playing';
    runElapsedMs=elapsed;runStartedAt=performance.now()-elapsed;
    resetCharacterAnimation();
    characterAnimation = {kind:'settle',start:performance.now(),
        origin:{...saved.visibleBody},target:{...saved.visibleBody}};
    saved.joints.forEach((p,i)=>jointHistory[i]=p && ({...p}));
    hideResultModal(); ui.next.hidden = true;
    updateUI();
    return true;
}

function finish(won) {
    if(typeof isTutorialRun==='function' && isTutorialRun())return finishTutorialRun(won);
    if(state==='playing')playSound(won?'clear':'fail');
    settleLifeAttempt(won);
    runElapsedMs=Math.floor(runTimeMs());runStartedAt=null;
    state = won ? 'won' : 'lost';
    recordAdPlay();
    if(won) { recordStageClear(); recordMapRewardClear(); startGoalHang(); }
    else startFall();
    const showRanking=COURSE_RANKINGS_ENABLED && won && !dailyRun && !activeDebugCourse();
    ui.resultRanking.hidden=!showRanking;
    ui.overlay.classList.toggle('has-ranking',showRanking);
    ui.resultDifficulty.hidden=!won || showRanking;
    ui.resultDifficulty.textContent=won ? (dailyRun ? dailyResultDateLabel(dailyRun.date) : courseTypeLabel(courseTypeId)) : '';
    ui.overlay.classList.toggle('is-daily-clear',won && !!dailyRun);
    ui.resultStats.hidden=!won || showRanking;
    ui.resultStats.textContent=won ? formatStageRecord({moves:moveCount,timeMs:runElapsedMs}) : '';
    ui.next.hidden=won;
    ui.next.textContent=dailyRun?gameText("action.returnCalendar"):gameText("action.returnMap");
    ui.retry.hidden=won;
    ui.closeResult.hidden=won;
    ui.resultTap.hidden=!won || activeDebugScoreTrial();
    if(activeDebugScoreTrial() && won){ui.next.hidden=false;ui.next.textContent=debugCourseTrial.score<100?gameText('debug.score.next'):gameText('debug.score.done');}
    ui.overlay.classList.toggle('is-clear',won);
    ui.retry.textContent=dailyRun?gameText("action.retry"):gameText("action.retryEnglish");

    const expectedMoves=routeExpectedMoves();
    const stars=clearStars(moveCount,expectedMoves);
    if(showRanking)renderStageLeaderboard(expectedMoves);
    ui.resultStars.hidden=!won;
    ui.resultStars.textContent=won ? '⭐️'.repeat(stars) : '';
    ui.resultStars.setAttribute('aria-label',won ? gameText("score.stars", {value0: stars}) : '');

    ui.resultTitle.textContent =
        won
            ? gameText("result.success")
            : gameText("result.failure");
    ui.resultTip.hidden=false;
    ui.resultTipText.textContent=GAMEPLAY_TIPS[Math.floor(Math.random()*GAMEPLAY_TIPS.length)];

    hideSettings();
    updateUI();
    showResultModal();
}

// RAF time is injected so tests can advance the opening without real waits.
function advanceCameraIntro(now) {
    if (featureHelpOpen || !cameraIntro || state !== 'playing')
        return;

    if (cameraIntro.start === null) {
        cameraIntro.start = now;
        playSound('start');
    }

    camera = Math.min(cameraIntro.to, cameraIntro.from +
        Math.max(0,now-cameraIntro.start) * CAMERA_CONFIG.introSpeed / 1000);
    if (camera >= cameraIntro.to && now-cameraIntro.start >= CAMERA_CONFIG.introMinDuration) {
        cameraIntro = null;
        runStartedAt=now;runElapsedMs=0;
        if(typeof tutorialReadyToPlay==='function')tutorialReadyToPlay();
        updateUI();
    }
}

function isSupportPair(pair) {
    return Array.isArray(pair) && pair.length===2 && pair[0]!==pair[1] &&
        pair.every(i=>Number.isInteger(i) && i>=0 && i<4);
}
function supportsReachable(p, anchor) {
    return isSupportPair(anchor) && anchor.every(i =>
        startGrips[i] &&
        limbReachable(
            p,
            startGrips[i],
            i
        )
    );
}


// js/route.js
"use strict";
// New profiles validate their own shape during generation. A real stage number
// must not reimpose the retired table's non-tutorial traverse requirement after
// the generator restores production identity. Legacy debug trials keep it.
function requiresLegacyTraverse() {
    return !(typeof activeCourseGeneration!=='undefined' && activeCourseGeneration) && level!==1;
}
// Search, replay and pruning share live reach checks, including mid-body foot height and straight raised legs.
function solveRoute(guide, maxMoves = 40) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerSolveRoute(guide,maxMoves);
    if(holds.some(h=>h.type==='hazard'))return solveCostRoute(guide,maxMoves);
    const saved = { committed, startGrips };
    const needsTraverse = requiresLegacyTraverse();
    const start = { ...guide[0] };
    const first = [...initialGrips];
    for (const pair of [[0, 1], [2, 3]]) {
        const sorted = pair.map(i => first[i]).sort((a, b) => a.x - b.x);
        pair.forEach((i, j) => first[i] = sorted[j]);
    }
    if (!first.every((h, i) => h && limbReachable(start, h, i))) return null;
    const goal = holds.find(h => h.type === 'goal');
    const targets = [...guide.slice(1), { x: goal.x, y: goal.y + 70 }];
    const progress = p => {
        let best = Infinity, index = 0;
        targets.forEach((q, i) => {
            const d = distance(p, q);
            if (d < best) { best = d; index = i; }
        });
        return index * 100 - best;
    };
    let beam = [{ p: start, stance: first, path: [start], traversed: !needsTraverse, score: progress(start) }];
    const visited = new Set();
    try {
        for (let depth = 0; depth < maxMoves; depth++) {
            const next = [];
            for (const node of beam) {
                committed = node.p;
                startGrips = node.stance;
                const candidates = [];
                for (const q of targets) {
                    if (distance(node.p, q) > 230) continue;
                    for (const t of [0.5, 0.75, 1])
                        candidates.push({ x: node.p.x + (q.x - node.p.x) * t, y: node.p.y + (q.y - node.p.y) * t });
                }
                for (const dx of [-60, -30, 0, 30, 60])
                    for (const dy of (needsTraverse ? [-90,-45,0,20,40] : [-90,-45,0]))
                        candidates.push({ x: node.p.x + dx, y: node.p.y + dy });
                for (const p of candidates) {
                    if (p.x < STAGE_SAFE_WIDTH + TORSO.width/2 || p.x > W - STAGE_SAFE_WIDTH - TORSO.width/2 || p.y < 80 || p.y > HEIGHT - 40 || distance(p, node.p) < 5) continue;
                    const anchor = selectAnchor(p.x - node.p.x, p.y - node.p.y);
                    if (!supportsReachable(p,anchor) || supportMotionFraction(node.p,p,anchor)<1-1e-9) continue;
                    const stance = attachMoving(p, anchor);
                    if (!stance) continue;
                    const won = bothHandsOnGoal(stance) && stance.every(Boolean);
                    if (!won && (!stance.every(Boolean) || sameContacts(stance, node.stance))) continue;
                    const key = node.traversed + ':' + Math.round(p.x / 8) + ',' + Math.round(p.y / 8) + ':' + stance.map(h => h?.id).join(',');
                    if (visited.has(key)) continue;
                    visited.add(key);
                    const path = [...node.path, { ...p, anchor, grips: stance.map(h => h?.id ?? null) }];
                    const traversed=node.traversed || isTraverse(node.p,p);
                    if (won) {if(traversed)return path;else continue;}
                    next.push({ p, stance, path, traversed, score: progress(p) });
                }
            }
            next.sort((a, b) => b.score - a.score);
            beam = next.slice(0, 12);
            if (!beam.length) break;
        }
        return null;
    } finally {
        committed = saved.committed;
        startGrips = saved.startGrips;
    }
}
function replayRoute(path) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerReplayRoute(path);
    const saved = { committed, startGrips, moveCount };
    try {
        let stance = [...initialGrips];
        for (const pair of [[0, 1], [2, 3]]) {
            const sorted = pair.map(i => stance[i]).sort((a, b) => a.x - b.x);
            pair.forEach((i, j) => stance[i] = sorted[j]);
        }
        if (!stance.every((h, i) => h && limbReachable(path[0], h, i))) return null;
        const result = [path[0]];
        for (let i = 1; i < path.length; i++) {
            committed = path[i - 1]; startGrips = stance;
            const p = path[i], anchor = selectAnchor(p.x - committed.x, p.y - committed.y);
            if (!supportsReachable(p,anchor) || supportMotionFraction(committed,p,anchor)<1-1e-9) return null;
            stance = attachMoving(p, anchor);
            if (!stance) return null;
            const won = bothHandsOnGoal(stance) && stance.every(Boolean);
            if (!won && (!stance.every(Boolean) || (sameContacts(stance, startGrips) && !newHazardContacts(stance,startGrips).size))) return null;
            result.push({ ...p, anchor, grips: stance.map(h => h?.id ?? null) });
            if (won) return !requiresLegacyTraverse() ||
                result.slice(1).some((q,j)=>isTraverse(result[j],q)) ? result : null;
        }
        return null;
    } finally { committed = saved.committed; startGrips = saved.startGrips; moveCount=saved.moveCount; }
}

// Re-search the finished hold layout by bypassing intermediate body positions.
// Every accepted shortcut replays its suffix with the live selector/snapping rules;
// a changed contact is allowed only when the rest still reaches the goal.
function optimizeRoute(path, config = ROUTE_OPTIMIZATION_CONFIG) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerOptimizeRoute(path,config);
    const saved = { committed, startGrips };
    const byId = new Map(holds.map(h => [h.id, h]));
    const first = [...initialGrips];
    for (const pair of [[0,1],[2,3]]) {
        const sorted = pair.map(i => first[i]).sort((a,b) => a.x-b.x);
        pair.forEach((i,j) => first[i] = sorted[j]);
    }
    let best = path, bestCost=routeConsumption(path), transitions = 0;
    const began = performance.now();
    const maxSpan = Math.max(...LIMB_LENGTHS)*2;
    const hasTraverse = candidate => !requiresLegacyTraverse() || candidate.slice(1).some((p,i) => isTraverse(candidate[i],p));
    const attempt = (from, to) => {
        if (transitions >= config.maxTransitions) return null;
        transitions++;
        if (distance(from,to)<5) return null;
        const anchor = selectAnchor(to.x-from.x,to.y-from.y);
        if (supportMotionFraction(from,to,anchor) < 1-1e-9) return null;
        const stance = attachMoving(to,anchor);
        if (!stance?.every(Boolean) || (!bothHandsOnGoal(stance) && sameContacts(stance,startGrips) && !newHazardContacts(stance,startGrips).size)) return null;
        return { ...to, anchor, grips: stance.map(h => h.id) };
    };
    try {
        for (let pass = 0; pass < config.passes && transitions < config.maxTransitions; pass++) {
            const before = best;
            for (let i = 0; i < best.length-2 && transitions < config.maxTransitions; i++) {
                for (let j = best.length-1; j > i+1 && transitions < config.maxTransitions; j--) {
                    // A fixed limb cannot span more than twice its full length.
                    if (distance(best[i],best[j]) > maxSpan) continue;
                    // Nearby body positions explore other support pairs/contacts,
                    // instead of only following the original guide's endpoints.
                    const q = best[j];
                    const targets = [q, {x:q.x-24,y:q.y}, {x:q.x+24,y:q.y},
                        {x:q.x,y:q.y+24}, {x:q.x,y:q.y-24}];
                    let improved = false;
                    for (const target of targets) {
                        if (target.x<STAGE_SAFE_WIDTH+TORSO.width/2 || target.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || target.y<80 || target.y>HEIGHT-40) continue;
                        const candidate = best.slice(0,i+1);
                        committed = best[i];
                        startGrips = i ? best[i].grips.map(id => byId.get(id)) : first;
                        let complete = false;
                        for (let k = j; k < best.length; k++) {
                            const step = attempt(committed,k===j ? target : best[k]);
                            if (!step) break;
                            candidate.push(step);
                            committed = step;
                            startGrips = step.grips.map(id => byId.get(id));
                            if (bothHandsOnGoal(startGrips)) { complete = true; break; }
                        }
                        const cost=complete?routeConsumption(candidate):Infinity;
                        if (complete && routeResources(candidate).valid && (cost<bestCost || (cost===bestCost && candidate.length<best.length)) && hasTraverse(candidate)) {
                            best = candidate;bestCost=cost;
                            improved = true;
                            break;
                        }
                    }
                    if (improved) break;
                }
            }
            if (best === before) break;
        }
        densityStats.routeOptimization = { before: path.length-1, after: best.length-1,
            costBefore:routeConsumption(path),costAfter:bestCost,
            transitions, limit: config.maxTransitions, elapsedMs: performance.now()-began };
        return best;
    } finally { committed = saved.committed; startGrips = saved.startGrips; }
}


function prepareStage() {
    generate(level);
    assignWideHolds(route);
    const solved=solveRoute(route);
    if(!solved)throw new Error('Two-support route search failed for level '+level);
    route=solved;
    pruneUnusedHolds();
    densityStats.fixedSupports=2;
}

// Unused contacts can still affect the six-pair selector's look-ahead.
// Remove a hold only if both the support pairs and all contacts replay exactly.
function samePairRoute(expected, actual) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerSamePairRoute(expected,actual);
    return !!actual && actual.length===expected.length && actual.every((p,i)=>
        JSON.stringify(p.grips)===JSON.stringify(expected[i].grips) &&
        JSON.stringify(p.anchor)===JSON.stringify(expected[i].anchor));
}
function pruneUnusedHolds() {
    const before=holds.length;
    const reserved=reserveDenseCandidates(route);
    const straightSupports=typeof labStraightSupportIds==='function'?labStraightSupportIds(route):new Set();
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    let removed;
    do {
        removed=false;
        for(const h of [...holds]) {
            if(h.type!=='normal' || used.has(h.id) || reserved.has(h.id) || straightSupports.has(h.id))continue;
            const previous=holds;
            holds=holds.filter(p=>p!==h);
            const played=replayRoute(route);
            if(samePairRoute(route,played) && hasHazardFallbackCandidates(played)) {route=played;removed=true;}
            else holds=previous;
        }
        // A later removal can make a formerly necessary selector hold removable.
        // Every successful iteration strictly reduces the finite hold set.
    } while(removed);
    if(!samePairRoute(route,replayRoute(route)))throw new Error('Two-support final replay failed');
    densityStats.routeRemoved=before-holds.length;
    densityStats.selectionHoldIds=holds.filter(h=>!used.has(h.id)).map(h=>h.id);
    updateStageDensity();
}

function updateStageDensity() {
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    const windows=[0,HEIGHT-H,...holds.map(h=>clamp(h.y-H,0,HEIGHT-H))];
    densityStats.total=holds.length;
    densityStats.coreCount=holds.filter(h=>used.has(h.id)).length;
    densityStats.branchCount=holds.length-densityStats.coreCount;
    densityStats.peak=Math.max(...windows.map(y=>holds.filter(h=>h.y>=y&&h.y<=y+H).length));
}

// Upgrade existing candidates before solving. Separate RNG preserves guide layout.
// Wide holds remain normal holds for density and pruning; removed ones stay removed.
function assignWideHolds(guide) {
    const random = mulberry32(courseSeed() ^ 0x6B1D2F43);
    const available = Math.max(0,3-holds.filter(h=>h.wide).length);
    const count = Math.floor(random() * (available+1));
    const candidates = holds.filter(h => h.type === 'normal').map(h => ({h,key:random()}));
    candidates.sort((a,b)=>a.key-b.key || a.h.id-b.h.id);
    let placed = 0;
    for (const {h} of candidates) {
        if (placed === count) break;
        if (!guide.some(p => [[0,1],[2,3]].some(pair=>pair.every(i=>limbReachable(p,h,i))))) continue;
        h.wide = true;
        placed++;
    }
}

// Keep enough existing alternatives for a valid minimum-ratio fallback.
function hasHazardFallbackCandidates(path) {
    if(difficultyRule(difficulty).hazards!=='dense')return true;
    const used=new Set([...initialGrips.map(h=>h.id),...path.flatMap(p=>p.grips||[])]);
    return holds.filter(h=>h.type==='normal' && !h.wide && !used.has(h.id)).length>=Math.ceil(holds.length*HAZARD_CONFIG.minRatio);
}

// Retain off-route geometry for varied recipes and a verified safe fallback.
// RNG and the retained count are deterministic.
function reserveDenseCandidates(path) {
    if(difficultyRule(difficulty).hazards!=='dense')return new Set();
    const used=new Set([...initialGrips.map(h=>h.id),...path.flatMap(p=>p.grips||[])]);
    const random=mulberry32(courseSeed() ^ 0x2E8CA17B);
    const candidates=holds.filter(h=>h.type==='normal' && !h.wide && !used.has(h.id))
        .map(h=>({h,key:random()})).sort((a,b)=>a.key-b.key || a.h.id-b.h.id);
    const count=HAZARD_CONFIG.reserveCount;
    return new Set(candidates.slice(0,count).map(({h})=>h.id));
}

// Bounded cost-layer beam search on the FINAL hold types. Each edge costs the
// same 1 + new hazard contacts as release(). A move using two hazards costs 3.
function solveCostRoute(guide,maxMoves=40,config=ROUTE_COST_SEARCH_CONFIG,options={}) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerSolveCostRoute(guide,maxMoves,config,options);
    const saved={committed,startGrips};
    const began=performance.now(),first=[...initialGrips];
    for(const pair of [[0,1],[2,3]]) {
        const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);
        pair.forEach((i,j)=>first[i]=sorted[j]);
    }
    const start={...guide[0]},goal=holds.find(h=>h.type==='goal');
    if(!first.every((h,i)=>h && limbReachable(start,h,i)))return null;
    const pickups=createHearts(level,guide,difficulty);
    const resourcePickups=options.noHearts?[]:pickups;
    const fixedBudget=options.budget??null;
    const targets=[...guide.slice(1),...pickups,{x:goal.x,y:goal.y+70}];
    const progress=p=>{
        let best=Infinity,index=0;
        guide.slice(1).forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});
        return index*100-best;
    };
    const fallback=replayRoute(guide);
    const fallbackResources=fallback?routeResources(fallback,{pickups:resourcePickups,budget:fixedBudget}):null;
    let best=fallbackResources?.valid && (!options.noHazards || !fallbackResources.penalties) &&
        (!options.noHearts || !routeResources(fallback,{pickups}).pickupMask)?fallback:null;
    let bestCost=best?routeConsumption(best):maxMoves+3+pickups.length*HEART_CONFIG.recovery;
    let transitions=0,limitReached=false;
    const buckets=Array.from({length:bestCost+1},()=>[]),visited=new Map();
    buckets[0].push({p:start,stance:first,path:[start],traversed:!requiresLegacyTraverse(),score:progress(start),mask:0,net:0,required:1});
    try {
        for(let cost=0;cost<=bestCost && transitions<config.maxTransitions;cost++) {
            // Preserve different pickup states rather than discarding a heart detour.
            const groups=new Map();
            for(const node of buckets[cost]||[]) {
                const group=groups.get(node.mask)||[];group.push(node);groups.set(node.mask,group);
            }
            const beam=[...groups.values()].flatMap(group=>group.sort((a,b)=>b.score-a.score || a.required-b.required).slice(0,config.beamWidth));
            for(const node of beam) {
                if(transitions>=config.maxTransitions)break;
                if(node.path.length-1>=maxMoves)continue;
                committed=node.p;startGrips=node.stance;
                const candidates=[];
                for(const q of targets)if(distance(node.p,q)<=230)
                    for(const t of [.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
                for(const dx of [-60,0,60])for(const dy of [-90,-45,0])
                    candidates.push({x:node.p.x+dx,y:node.p.y+dy});
                for(const p of candidates) {
                    if(transitions>=config.maxTransitions)break;
                    transitions++;
                    if(p.x<STAGE_SAFE_WIDTH+TORSO.width/2 || p.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || p.y<80 || p.y>HEIGHT-40 || distance(p,node.p)<5)continue;
                    const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
                    if(!supportsReachable(p,anchor) || supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
                    const stance=attachMoving(p,anchor);
                    if(!stance?.every(Boolean))continue;
                    const won=bothHandsOnGoal(stance),edge=routeMoveCost(stance,node.stance);
                    if((options.noHazards && edge>1) || (!won && sameContacts(stance,node.stance) && edge===1))continue;
                    const nextCost=cost+edge,moves=node.path.length;
                    if(nextCost>bestCost)continue;
                    const mask=coursePickupMask(pickups,node.mask,node.p,p);
                    if(options.noHearts && mask)continue;
                    const net=node.net+edge-(bitCount(mask)-bitCount(node.mask))*HEART_CONFIG.recovery;
                    const required=Math.max(node.required,node.net+1,net+(won?0:1));
                    if(required>(fixedBudget??maxMoves+3))continue;
                    const traversed=node.traversed || isTraverse(node.p,p),ids=stance.map(h=>h.id);
                    // No idle loops to increase the eventual moves+3 allowance.
                    if(node.path.some((q,i)=>distance(q,p)<5 && (q.pickupMask||0)===mask &&
                        (i?q.grips:first.map(h=>h.id)).every((id,j)=>id===ids[j])))continue;
                    const path=[...node.path,{...p,anchor,grips:ids,pickupMask:mask}];
                    if(won) {
                        if(traversed && required<=(fixedBudget??moves+3) &&
                            (nextCost<bestCost || (nextCost===bestCost && (!best || path.length<best.length)))) {best=path;bestCost=nextCost;}
                        continue;
                    }
                    const key=traversed+':'+Math.round(p.x/8)+','+Math.round(p.y/8)+':'+ids.join(',')+':'+mask+':'+moves;
                    const labels=visited.get(key)||[];
                    if(labels.some(label=>label.cost<=nextCost && label.required<=required))continue;
                    visited.set(key,[...labels.filter(label=>label.cost<nextCost || label.required<required),{cost:nextCost,required}]);
                    if(nextCost<bestCost)(buckets[nextCost]||=[]).push({p,stance,path,traversed,score:progress(p),mask,net,required});
                }
            }
        }
        limitReached=transitions>=config.maxTransitions;
        densityStats.costSearch={transitions,limit:config.maxTransitions,limitReached,costBefore:fallback?routeConsumption(fallback):null,costAfter:best?routeConsumption(best):null,elapsedMs:performance.now()-began};
        return best;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}

// Contact replay and resource simulation must both succeed on the frozen layout.
function validateRouteBudget(path) {
    return samePairRoute(path,replayRoute(path)) && routeResources(path).valid;
}


// js/course.js
"use strict";
// A recipe is fixed before the final search. Search/preview never relocates pickups.
let generatedCourse=null;
function bitCount(mask) {
    let count=0;for(;mask;mask&=mask-1)count++;return count;
}
function coursePickupMask(pickups,mask,from,to) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled()&&to.action&&Array.isArray(to.trace))return fingerRouteTraceMask(pickups,mask,to.trace);
    for(let i=0;i<pickups.length;i++)if(!(mask&(1<<i)) && torsoTouchesHeart(from,to,pickups[i]))mask|=1<<i;
    return mask;
}
function routeResources(path,{pickups=createHearts(level,path,difficulty),budget=null}={}) {
    const moves=path.length-1,costs=routeHazardCosts(path);
    const allowance=budget??routeStamina(path);
    let mask=0,net=0,required=1,valid=allowance>0;
    for(let i=1;i<path.length;i++) {
        if(allowance-net<=0)valid=false;
        const next=coursePickupMask(pickups,mask,path[i-1],path[i]);
        net+=1+costs[i]-costs[i-1]-(bitCount(next)-bitCount(mask))*HEART_CONFIG.recovery;
        required=Math.max(required,net+(i===path.length-1?0:1));
        if(net>allowance)valid=false;
        mask=next;
    }
    return {valid:valid && required<=allowance,moves,cost:moves+(costs.at(-1)||0),
        penalties:costs.at(-1)||0,pickupMask:mask,pickups:bitCount(mask),required,
        budget:allowance,remaining:allowance-net};
}
// A pickup may occur while dragging even if the player cancels the release.
// Check a reachable drag segment, using the same support/snapping rules as play.
function findCourseHeartMove(heart,path) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerFindCourseHeartMove(heart,path);
    const saved={committed,startGrips},byId=new Map(holds.map(h=>[h.id,h]));
    const nearby=path.slice(0,-1).map((p,i)=>({p,i})).sort((a,b)=>distance(a.p,heart)-distance(b.p,heart));
    let checks=0;
    try {
        for(const {p,i} of nearby) {
            committed=p;startGrips=i?p.grips.map(id=>byId.get(id)):[...initialGrips];
            for(const pair of [[0,1],[2,3]])if(!i) {
                const sorted=pair.map(j=>startGrips[j]).sort((a,b)=>a.x-b.x);
                pair.forEach((j,k)=>startGrips[j]=sorted[k]);
            }
            for(const q of [{x:(p.x+heart.x)/2,y:(p.y+heart.y)/2},heart]) {
                if(checks++>=COURSE_GENERATION_CONFIG.heartPlacementChecks)return null;
                if(q.x<STAGE_SAFE_WIDTH+TORSO.width/2 || q.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || q.y<80 || q.y>HEIGHT-40)continue;
                const anchor=selectAnchor(q.x-p.x,q.y-p.y);
                if(supportsReachable(q,anchor) && supportMotionFraction(p,q,anchor)>=1-1e-9 &&
                    attachMoving(q,anchor)?.every(Boolean) && torsoTouchesHeart(p,q,heart))return {from:p,to:q,anchor};
            }
        }
        return null;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
function bindCourseRecipe(intent,path) {
    generatedCourse={level,seed:courseSeed(),difficulty,typeId:courseTypeId,mode:courseMode,holds,intent,
        hearts:[],hazardPlacement:{routeIds:[],optionalIds:[]}};
}
function snapshotCourse(path) {
    return {holds:[...holds],types:holds.map(h=>h.type),path,
        recipe:{...generatedCourse,hearts:generatedCourse.hearts.map(h=>({...h}))}};
}
function restoreCourse(snapshot) {
    holds=snapshot.holds;
    holds.forEach((h,i)=>h.type=snapshot.types[i]);
    route=snapshot.path;
    generatedCourse={...snapshot.recipe,holds,hearts:snapshot.recipe.hearts.map(h=>({...h}))};
}
function classifyCourse(path) {
    const resources=routeResources(path),budget=routeStamina(path);
    const config={maxTransitions:COURSE_GENERATION_CONFIG.comparisonTransitions,beamWidth:ROUTE_COST_SEARCH_CONFIG.beamWidth};
    const primary=densityStats.costSearch,comparisons={};
    const compare=(name,options)=>{
        const maxMoves=budget+(options.noHearts?0:generatedCourse.hearts.length*HEART_CONFIG.recovery);
        try {
            const alternative=solveCostRoute(path,maxMoves,config,{budget,...options});
            comparisons[name]={...densityStats.costSearch,found:!!alternative,status:'bounded-search'};
            return !!alternative;
        } catch(error) {
            comparisons[name]={found:null,status:'error',limit:config.maxTransitions,transitions:0,error:String(error.message||error)};
            return null;
        }
    };
    let heart='unnecessary',hazard='unnecessary';
    if(resources.pickupMask) {const found=compare('withoutHearts',{noHearts:true});heart=found===null?'unknown':found?'optional':'required-in-search';}
    else if(generatedCourse.hearts.length)heart='optional';
    if(resources.penalties)
        {const found=compare('withoutHazards',{noHazards:true});hazard=found===null?'unknown':found?'optional':'required-in-search';}
    else if(holds.some(h=>h.type==='hazard'))hazard='optional';
    densityStats.costSearch=primary;
    let actual=heart==='required-in-search'?(hazard==='required-in-search'?'mixed':'recovery'):
        hazard==='required-in-search'?'consumption':generatedCourse.hearts.length || holds.some(h=>h.type==='hazard')?'choice':'basic';
    if(generatedCourse.intent==='basic' && heart!=='required-in-search' && hazard!=='required-in-search')actual='basic';
    if(generatedCourse.intent==='recovery' && heart==='required-in-search')actual='recovery';
    if(heart==='unknown' || hazard==='unknown')actual='unclassified';
    return {requested:generatedCourse.intent,actual,heart,hazard,resources,comparisons,
        // Absence in a bounded search is not a mathematical necessity proof.
        necessityScope:'bounded-search',heartResourceRequired:!routeResources(path,{pickups:[],budget}).valid};
}
function finalizeCourseGeneration(intent='basic') {
    // Feature placement is owned by the formal post-process. TYPE-selected
    // consumption/recovery/dense recipes are retired, not silently reclassified.
    if(intent!=='basic')throw new RangeError('Legacy TYPE recipes are retired');
    const began=performance.now(),base=route;
    densityStats.initialRouteOptimization=densityStats.routeOptimization;
    const failures=[];let searchFallback=false,safeFeatureFallback=false;
    // Retain a genuinely cleared safe recipe before attempting any varied recipe.
    bindCourseRecipe(intent,base);
    if(!validateRouteBudget(base))throw new Error('Initial route cannot clear its base budget');
    const plain=snapshotCourse(base);
    try {
        addHazardHolds();
        if(!validateRouteBudget(base))throw new Error('Initial recipe cannot clear its base budget');
    } catch(error) {failures.push(String(error.message||error));safeFeatureFallback=true;restoreCourse(plain);}
    const safe=snapshotCourse(base);
    let selected=safe,attempts=0;
    restoreCourse(selected);
    const fallback=route;
    if(holds.some(h=>h.type==='hazard') || generatedCourse.hearts.length) {
        try {
            const solved=solveCostRoute(route,route.length-1+COURSE_GENERATION_CONFIG.maxDetourMoves);
            route=optimizeRoute(solved||fallback);
        } catch(error) {failures.push(String(error.message||error));searchFallback=true;restoreCourse(selected);}
    }
    if(!validateRouteBudget(route)) {
        restoreCourse(selected);
        if(!validateRouteBudget(route))restoreCourse(safe);
    }
    if(!validateRouteBudget(route))throw new Error('Final course cannot clear its actual base budget');
    generatedCourse.requestedIntent=intent;
    const classification=classifyCourse(route);
    classification.requested=intent;
    densityStats.courseGeneration={...classification,recipeAttempts:attempts,recipeLimit:COURSE_GENERATION_CONFIG.recipeAttempts,
        usedSafeFallback:safeFeatureFallback,
        searchFallback,failures,elapsedMs:performance.now()-began};
    densityStats.routeBudgetValidated=true;
    densityStats.hazardCount=holds.filter(h=>h.type==='hazard').length;
    updateStageDensity();
}


// js/hazards.js
"use strict";
// Find a real, optional move that grabs a hazard. The ordinary route never uses it.
function findHazardMove(hold,path=route) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerFindHazardMove(hold,path);
    const saved={committed,startGrips};
    const byId=new Map(holds.map(h=>[h.id,h]));
    try {
        for (let step=0;step<path.length-1;step++) {
            const from=path[step];
            if (distance(from,hold)>220) continue;
            const stance=step===0 ? [...initialGrips] : path[step].grips.map(id=>byId.get(id));
            if (step===0) for (const pair of [[0,1],[2,3]]) {
                const sorted=pair.map(i=>stance[i]).sort((a,b)=>a.x-b.x);
                pair.forEach((i,j)=>stance[i]=sorted[j]);
            }
            committed=from;startGrips=stance;
            for (const dx of [-48,-24,0,24,48]) for (const dy of [-48,-24,0,24,48]) {
                if (dx===0 && dy===0) continue;
                const to={x:from.x+dx,y:from.y+dy};
                if (to.x<STAGE_SAFE_WIDTH+TORSO.width/2 || to.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || to.y<80 || to.y>HEIGHT-40) continue;
                const anchor=selectAnchor(dx,dy);
                if (supportMotionFraction(from,to,anchor)<1-1e-9) continue;
                const attached=attachMoving(to,anchor);
                if (attached?.every(Boolean) && attached.includes(hold) && !sameContacts(attached,stance))
                    return {step,to,anchor,grips:attached.map(h=>h.id)};
            }
        }
        return null;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
function addHazardHolds() {
    const mode=difficultyRule(difficulty).hazards;
    if (mode==='none') return;
    if (mode==='dense') {
        convertDenseHazards();
        return;
    }
    const random=mulberry32(courseSeed() ^ 0x3C61D52A);
    const target=Math.floor(random()*(HAZARD_CONFIG.maxCount+1));
    let count=0,nextId=Math.max(...holds.map(h=>h.id))+1;
    for (let attempt=0;attempt<HAZARD_CONFIG.attempts && count<target;attempt++) {
        const step=1+Math.floor(random()*(route.length-2));
        const a=route[step],b=route[Math.min(step+1,route.length-1)];
        const t=random(),limb=limbs[Math.floor(random()*4)];
        // Between route stations and slightly to either side: tempting stepping stones.
        const h={id:nextId,type:'hazard',
            x:a.x+(b.x-a.x)*t+limb.x+(random()-.5)*72,
            y:a.y+(b.y-a.y)*t+limb.y+(random()-.5)*56};
        if (h.x<HOLD_CONFIG.sideMargin || h.x>W-HOLD_CONFIG.sideMargin ||
            h.y<HOLD_CONFIG.topMargin || h.y>=initialGrips[2].y-24 ||
            insideStartTriangle(h,initialGrips) ||
            holds.some(other=>distance(other,h)<(other.wide?32:HAZARD_CONFIG.spacing))) continue;
        holds.push(h);
        // Adding a hold can change automatic support selection as well as attachment.
        // Reject it unless the complete original contact sequence remains penalty-free.
        if (samePairRoute(route,replayRoute(route)) && findHazardMove(h)) {
            count++;nextId++;
        } else holds.pop();
    }
    densityStats.hazardCount=count;
    updateStageDensity();
}

// Convert only existing geometry, after heart placement and before cost search.
// The initial sample treats route and off-route contacts identically. A protected
// sample first keeps the witness free, then accepts only resource-valid changes.
function convertDenseHazards(path=route,salt=0,safeFallback=false) {
    const random=mulberry32(courseSeed() ^ 0x3C61D52A ^ Math.imul(salt+1,0x9E3779B9));
    const used=new Set(path.flatMap(p=>p.grips||[]));
    const protectedIds=new Set(initialGrips.map(h=>h.id));
    const candidates=holds.filter(h=>h.type==='normal' && !h.wide && !protectedIds.has(h.id))
        .map(h=>({h,key:random()})).sort((a,b)=>
            (safeFallback?Number(used.has(a.h.id))-Number(used.has(b.h.id)):0) || a.key-b.key || a.h.id-b.h.id);
    const min=Math.ceil(holds.length*HAZARD_CONFIG.minRatio);
    const max=Math.min(candidates.length,Math.floor(holds.length*HAZARD_CONFIG.maxRatio));
    if(max<min)return false;
    const target=min+Math.floor(random()*(max-min+1));
    const selected=[];
    for(const {h} of candidates) {
        if(selected.length>=target)break;
        h.type='hazard';
        // A safe fallback must preserve the executable witness, not only its
        // arithmetic budget: changing a hold type can alter capture selection.
        if(!safeFallback || validateRouteBudget(path))selected.push(h.id);
        else h.type='normal';
    }
    if(selected.length<min)return false;
    generatedCourse.hazardPlacement={routeIds:selected.filter(id=>used.has(id)),
        optionalIds:selected.filter(id=>!used.has(id)),total:holds.length,min,max,target:selected.length,safeFallback};
    densityStats.hazardCount=selected.length;
    return true;
}


// js/course-stamina-settings.js
'use strict';
// Shared stamina policy extracted from Site41 / trial 0.11.8.
// Configuration parsing only: no URL, UI, storage or network access.
const LabStaminaSettings=(()=>{
 const DEFAULT_BONUS=3;
 const defaultRules=Object.freeze([Object.freeze({fromStage:0,staminaBonus:DEFAULT_BONUS})]);
 const defaultText=defaultRules.map(r=>`${r.fromStage}:${r.staminaBonus}`).join(',');
 const integer=(value,min,label)=>{
  const text=String(value);
  if(!/^\d+$/.test(text)||!Number.isSafeInteger(Number(text))||Number(text)<min)throw Error(`${label} must be an integer at least ${min}.`);
  return Number(text);
 };
 function parseRules(text=defaultText){
  if(typeof text!=='string'||!text.trim())throw Error('Stamina rules must be nonempty, for example 0:3.');
  const rows=text.trim().split(/[,\n]/).map(row=>{
   const parts=row.trim().match(/^(\d+)\s*:\s*(\d+)$/);
   if(!parts)throw Error('Use one fromStage:bonus pair per rule.');
   return {fromStage:integer(parts[1],0,'fromStage'),staminaBonus:integer(parts[2],0,'common bonus')};
  });
  if(rows[0].fromStage!==0)throw Error('Stamina rules must begin at fromStage 0.');
  for(let i=1;i<rows.length;i++)if(rows[i].fromStage<=rows[i-1].fromStage)throw Error('fromStage values must be unique and strictly increasing.');
  return rows;
 }
 function normalize(config={}){
  const explicit=Object.hasOwn(config,'stage')||Object.hasOwn(config,'staminaRules');
  const stage=integer(config.stage??1,1,'target stage'),rules=parseRules(config.staminaRules??defaultText);
  const index=rules.findLastIndex(r=>r.fromStage<=stage),selected=rules[index];
  return {stage,staminaRules:rules.map(r=>`${r.fromStage}:${r.staminaBonus}`).join(','),bonus:selected.staminaBonus,fromStage:selected.fromStage,nextFromStage:rules[index+1]?.fromStage??null,explicit};
 }
 function fields(config){const r=normalize(config);return r.explicit?{stage:r.stage,staminaRules:r.staminaRules}:{};}
 return Object.freeze({DEFAULT_BONUS,defaultRules,defaultText,parseRules,normalize,fields});
})();
globalThis.LabStaminaSettings=LabStaminaSettings;


// js/course-generator-core.js
'use strict';
// Extracted from Site41 / trial 0.11.8, source be2145d9b9fb6865f3fcb398d533e8c29b28f86f.
// Generation helpers only: no trial boot, URL, UI, storage or network overrides.
// This legacy engine mutates the game geometry globals and temporarily uses
// level 1/2 and difficulty 0; its caller must restore the real run identity.
const LAB_SKELETON_VERSION='0.11.5';
// Only expected finite geometry failures permit deterministic seed retries.
// Keep Error.name unchanged for legacy diagnostic compatibility; use instanceof.
class CourseGeometryRejection extends Error {}
function classifyNativeCourseGeometryRejection(error) {
 const messages=[
  'Guide did not reach selected course height',
  'Two-support final replay failed',
  'Initial route cannot clear its base budget',
  'Initial recipe cannot clear its base budget',
  'Final course cannot clear its actual base budget'
 ];
 if(error?.constructor===Error && messages.includes(error.message))
  return new CourseGeometryRejection(error.message,{cause:error});
 return error;
}
let labSkeletonReport=null,labHeartsCache=null,labStaminaCache=null;
// For nonzero spikes, postpone native unused-hold pruning until the final
// normal-only reference is known. This also applies to sources of a two-part
// course, so their candidates are not lost before the combined search.
const labGenerateSkeletonNative=labGenerateSkeleton;
let labPruningDeferred=false;
labGenerateSkeleton=function(config){
 if(labPruningDeferred||!(config.spikePercent>0))return labGenerateSkeletonNative(config);
 const nativePrune=pruneUnusedHolds;
 labPruningDeferred=true;
 try{
  pruneUnusedHolds=function(){densityStats.routeRemoved=0;updateStageDensity();};
  return labGenerateSkeletonNative(config);
 }finally{pruneUnusedHolds=nativePrune;labPruningDeferred=false;}
};
// BEGIN typed native boundary: no changes to generation choices or draws.
const labGenerateSkeletonUnclassified=labGenerateSkeleton;
labGenerateSkeleton=function(config){
 try{return labGenerateSkeletonUnclassified(config);}
 catch(error){throw classifyNativeCourseGeometryRejection(error);}
};
// END typed native boundary.

// BEGIN straight-support prototype. Fixed profile geometry, never a difficulty rule.
const STRAIGHT_SUPPORT_CONFIG=Object.freeze({version:'prototype-2-half',halfWidth:80,retention:0.5});
// Dynamic scope only: nothing survives a generation/retry/cache restoration.
let labStraightSupportContext=null;
function labHasStraightProfile(config){return config.type==='straight'||config.composition==='pair'&&config.secondType==='straight';}
function labStraightSupportOwned(hold,context){
 if(!context||!labHasStraightProfile(context.config))return false;
 if(context.config.composition!=='pair')return true;
 const seam=HEIGHT/2;
 return (context.sections||[]).some(s=>s.type==='straight'&&s.idMap.some(pair=>pair[1]===hold.id)&&
  (s.index===0?hold.y>=seam:hold.y<seam));
}
// A horizontal band at the hold's exact y, not Euclidean distance, guide distance,
// or a vertical screen-centre strip. Horizontal/nonmonotone trace segments count.
function labStraightSupportDistance(hold,path){
 let best=Infinity;
 for(let i=1;i<path.length;i++){
  const trace=path[i].action&&Array.isArray(path[i].trace)?path[i].trace:[path[i-1],path[i]];
  for(let j=1;j<trace.length;j++){
   const a=trace[j-1],b=trace[j];
   if(hold.y<Math.min(a.y,b.y)-1e-9||hold.y>Math.max(a.y,b.y)+1e-9)continue;
   if(Math.abs(b.y-a.y)<1e-9){
    if(Math.abs(hold.y-a.y)<1e-9)best=Math.min(best,Math.max(Math.min(a.x,b.x)-hold.x,0,hold.x-Math.max(a.x,b.x)));
   }else{
    const t=clamp((hold.y-a.y)/(b.y-a.y),0,1);
    best=Math.min(best,Math.abs(hold.x-(a.x+(b.x-a.x)*t)));
   }
  }
 }
 return best;
}
function labStraightSupportIds(path,context=labStraightSupportContext){
 return new Set(holds.filter(h=>h.type==='normal'&&labStraightSupportOwned(h,context)&&
  (context.defer||labStraightSupportDistance(h,path)<=STRAIGHT_SUPPORT_CONFIG.halfWidth+1e-9)).map(h=>h.id));
}
function labRecordStraightSupports(context,candidateIds){
 if(!context||!labHasStraightProfile(context.config)||!labSkeletonReport)return null;
 const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
 const kept=labStraightSupportIds(route,{...context,defer:false});
 const supportIds=[...kept].filter(id=>!used.has(id));
 const report={version:STRAIGHT_SUPPORT_CONFIG.version,halfWidth:STRAIGHT_SUPPORT_CONFIG.halfWidth,
  metric:'horizontal-distance-at-same-y-to-final-body-trace',difficultyLinked:false,
  scope:context.config.composition==='pair'?'straight-source-ids-within-owned-half':'straight-profile',
  seamOwnership:'lower-y-greater-or-equal; upper-y-less',candidateIds:candidateIds||[],
  supportIds,usedRouteIds:[...used],normalCount:supportIds.length,
  spikeSelection:'unchanged-unused-normal-pool; retained-supports-may-be-converted',
  finalReferenceReplay:!!samePairRoute(route,replayRoute(route))};
 labSkeletonReport.straightSupports=report;labSkeletonReport.holds=holds.length;
 const finalIds=new Set(holds.map(h=>h.id)),placement=labSkeletonReport.placement;
 if(placement){const input=placement.mergedInputHolds??placement.placedHolds;if(Number.isFinite(input))placement.pruneRemoved=input-holds.length;}
 // The native report was assembled before final support trimming. Keep final
 // section diagnostics faithful to the geometry actually delivered to play.
 for(const s of labSkeletonReport.composition?.sections||[]){
  const ids=new Set(s.idMap.map(pair=>pair[1])),points=holds.filter(h=>ids.has(h.id));
  const collisionIds=new Set(s.collisionRemovedIds||[]);
  s.finalIds=points.map(h=>h.id);s.usedIds=points.filter(h=>used.has(h.id)).map(h=>h.id);
  s.prunedIds=[...ids].filter(id=>!finalIds.has(id)&&!collisionIds.has(id));
  s.finalGeometry.holds=points.length;
 }

 densityStats.straightSupports=report;updateStageDensity();
 if(generatedCourse)generatedCourse.holds=holds;
 return report;
}
function labTrimStraightSupports(context){
 const beforeCount=holds.length;
 const owned=holds.filter(h=>h.type==='normal'&&labStraightSupportOwned(h,context));
 const retained=labStraightSupportIds(route,{...context,defer:false});
 const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
 let removed;
 do{
  removed=false;
  for(const h of [...holds]){
   if(h.type!=='normal'||!labStraightSupportOwned(h,context)||used.has(h.id)||retained.has(h.id))continue;
   const previous=holds;holds=holds.filter(p=>p!==h);
   const played=replayRoute(route);
   if(samePairRoute(route,played)&&hasHazardFallbackCandidates(played)){route=played;removed=true;}
   else holds=previous;
  }
 }while(removed);
 if(!samePairRoute(route,replayRoute(route)))throw new CourseGeometryRejection('Straight support final reference replay failed.');
 densityStats.routeRemoved=(densityStats.routeRemoved||0)+beforeCount-holds.length;
 return labRecordStraightSupports(context,owned.map(h=>h.id));
}
// Thin only the final v1 result, after spike selection. No layout RNG is consumed.
// Partition the y-sorted candidates into equal-count strata; alternating sides
// avoids choosing an entire vertical column when each stratum offers both sides.
function labHalfStraightSupportSelection(candidates,seed){
 const sorted=[...candidates].sort((a,b)=>b.y-a.y||a.x-b.x||a.id-b.id);
 const count=Math.floor(sorted.length*STRAIGHT_SUPPORT_CONFIG.retention),ids=[];
 for(let i=0;i<count;i++){
  const group=sorted.slice(Math.floor(i*sorted.length/count),Math.floor((i+1)*sorted.length/count));
  const side=((seed>>>0)+i)%2?1:-1;
  group.sort((a,b)=>side*(a.x-b.x)||b.y-a.y||a.id-b.id);ids.push(group[0].id);
 }
 return ids;
}
function labThinStraightSupports(context){
 if(!labHasStraightProfile(context.config))return null;
 const oldReport=labSkeletonReport?.straightSupports;
 if(oldReport?.thinning?.applied)return oldReport;
 const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
 const eligible=labStraightSupportIds(route,{...context,defer:false});
 const candidates=holds.filter(h=>eligible.has(h.id)&&!used.has(h.id));
 const preferred=new Set(labHalfStraightSupportSelection(candidates,context.config.seed));
 const originalHolds=holds,originalRoute=route,target=preferred.size;
 const safe=()=>{const played=replayRoute(originalRoute);return samePairRoute(originalRoute,played)&&hasHazardFallbackCandidates(played);};
 const candidateIds=new Set(candidates.map(h=>h.id));
 holds=originalHolds.filter(h=>!candidateIds.has(h.id)||preferred.has(h.id));
 const unreducedIds=[];
 if(!safe()){
  holds=originalHolds;
  const order=[...candidates].sort((a,b)=>Number(preferred.has(a.id))-Number(preferred.has(b.id))||b.y-a.y||a.x-b.x||a.id-b.id);
  let remaining=candidates.length;
  // Retry after successful deletions because selector dependencies can change.
  let changed=true;
  while(remaining>target&&changed){changed=false;
   for(const h of order){if(remaining<=target)break;if(!holds.includes(h))continue;
    const previous=holds;holds=holds.filter(p=>p!==h);
    if(safe()){remaining--;changed=true;}else holds=previous;
   }
  }
  if(remaining>target)for(const h of candidates)if(holds.includes(h))unreducedIds.push(h.id);
 }
 if(!safe()){holds=originalHolds;throw new CourseGeometryRejection('Half straight support replay failed.');}
 const retained=new Set(holds.map(h=>h.id)),removedIds=candidates.filter(h=>!retained.has(h.id)).map(h=>h.id);
 densityStats.routeRemoved=(densityStats.routeRemoved||0)+removedIds.length;
 densityStats.selectionHoldIds=holds.filter(h=>!used.has(h.id)).map(h=>h.id);
 const report=labRecordStraightSupports(context,oldReport?.candidateIds||[]);
 report.thinning={applied:true,ratio:STRAIGHT_SUPPORT_CONFIG.retention,rounding:'floor',
  selection:'y-strata-alternating-x-side-seed-parity; safe-replay-fallback',
  beforeIds:candidates.map(h=>h.id),beforeCount:candidates.length,targetCount:target,afterCount:report.normalCount,
  preferredIds:[...preferred],removedIds,unreducedIds,
  configSignature:JSON.stringify(context.config),
  referenceRouteUnchanged:samePairRoute(originalRoute,route)};
 return report;
}
const labGenerateSkeletonBeforeStraightSupports=labGenerateSkeleton;
labGenerateSkeleton=function(config){
 const previous=labStraightSupportContext;
 const context={config,sections:null,defer:true};
 // Non-straight source calls must not inherit their parent's straight scope.
 labStraightSupportContext=labHasStraightProfile(config)?context:null;
 try{
  const result=labGenerateSkeletonBeforeStraightSupports(config);
  if(!labHasStraightProfile(config))return result;
  context.sections=result.composition?.sections||null;
  // Keep source candidates until the actual merged trace exists. Source IDs
  // alone are never the final protection, and collision-dropped IDs stay gone.
  if(previous?.config.composition==='pair')return result;
  if(!(config.spikePercent>0))labTrimStraightSupports(context);
  else labRecordStraightSupports(context,holds.filter(h=>h.type==='normal'&&labStraightSupportOwned(h,context)).map(h=>h.id));
  return result;
 }finally{labStraightSupportContext=previous;}
};
// END straight-support prototype.
// Change unused normal holds after the final normal-only reference search.
// Selected candidates become spikes; the other unused holds are pruned.
// At 0% retain the established no-spike profile generation byte-for-byte.
// Distance is to the body trajectory's line segments, not the original placer guide.
function labPrepareSpikes(config){
 const percent=config.spikePercent??0;
 if(![0,10,20,30].includes(percent))throw Error('Spike scatter must be 0, 10, 20 or 30 percent.');
 if(labHasStraightProfile(config)&&labSkeletonReport?.straightSupports?.thinning?.configSignature===JSON.stringify(config))return labSkeletonReport.spikes||null;
 if(!Object.prototype.hasOwnProperty.call(config,'spikePercent')){if(labHasStraightProfile(config))labThinStraightSupports({config,sections:labSkeletonReport?.composition?.sections||null});return null;}
 const supportContext={config,sections:labSkeletonReport?.composition?.sections||null,defer:false};
 const supportIds=labStraightSupportIds(route,supportContext);
 const protectedIds=new Set(initialGrips.map(h=>h.id));
 for(const p of route)for(const id of p.grips||[])protectedIds.add(id);
 const distanceToRoute=h=>{
  let best=Infinity;
  for(let i=1;i<route.length;i++){
   const trace=typeof fingerAimEnabled==='function'&&fingerAimEnabled()&&route[i].action?route[i].trace:[route[i-1],route[i]];
   for(let j=1;j<trace.length;j++){
    const a=trace[j-1],b=trace[j],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
    const t=den?clamp(((h.x-a.x)*dx+(h.y-a.y)*dy)/den,0,1):0;
    best=Math.min(best,Math.hypot(h.x-a.x-t*dx,h.y-a.y-t*dy));
   }
  }
  return best;
 };
 const candidates=holds.filter(h=>h.type==='normal'&&!h.wide&&!protectedIds.has(h.id)).map(h=>({hold:h,distance:distanceToRoute(h)})).sort((a,b)=>a.distance-b.distance||a.hold.id-b.hold.id);
 const count=Math.floor(candidates.length*percent/100),selected=candidates.slice(0,count);
 const beforeHolds=[...holds],beforeRoute=route;
 for(const {hold} of selected)hold.type='hazard';
 if(percent>0){
  const selectedIds=new Set(selected.map(v=>v.hold.id)),previous=holds;
  // Remove the whole unused group first: selectors can depend on pairs of
  // unused holds even when no individual removal preserves the replay.
  holds=holds.filter(h=>h.type!=='normal'||protectedIds.has(h.id)||selectedIds.has(h.id)||supportIds.has(h.id));
  if(!samePairRoute(route,replayRoute(route))){
   holds=previous;const previousContext=labStraightSupportContext;
   try{labStraightSupportContext=labHasStraightProfile(config)?supportContext:null;pruneUnusedHolds();}
   finally{labStraightSupportContext=previousContext;}
  }
  updateStageDensity();
 }
 const retainedIds=new Set(holds.map(h=>h.id)),deletedIds=beforeHolds.filter(h=>!retainedIds.has(h.id)).map(h=>h.id);
 const retainedUnselectedIds=candidates.slice(count).filter(v=>retainedIds.has(v.hold.id)).map(v=>v.hold.id);
 const replay=replayRoute(route),unchanged=!!replay&&samePairRoute(route,replay),cost=routeHazardCosts(route).at(-1)||0;
 if(!unchanged||cost!==0){holds=beforeHolds;route=beforeRoute;for(const {hold} of selected)hold.type='normal';throw new CourseGeometryRejection('Spike placement did not preserve the reference route.');}
 if(percent>0){densityStats.hazardCount=selected.length;densityStats.routeRemoved=deletedIds.length;updateStageDensity();}
 const report={percent,candidateCount:candidates.length,count,deletedIds,deletedCount:deletedIds.length,retainedUnselectedIds,
  prunePolicy:percent>0?'nearest-fraction-to-spikes-rest-native-safe-delete':'legacy-zero-percent',rounding:'floor',denominator:'unused-normal-holds',distanceMetric:'minimum-distance-to-reference-body-segments',
  selectedIds:selected.map(v=>v.hold.id),candidates:candidates.map(v=>({id:v.hold.id,distance:v.distance})),protectedIds:[...protectedIds],
  referenceContactsUnchanged:unchanged,referenceHazardCost:cost,placementStage:'after-normal-reference-before-hearts'};
 if(labHasStraightProfile(config))labRecordStraightSupports(supportContext,labSkeletonReport?.straightSupports?.candidateIds||[...supportIds]);
 if(labSkeletonReport){labSkeletonReport.spikes=report;labSkeletonReport.holds=holds.length;if(percent>0&&labSkeletonReport.placement)labSkeletonReport.placement.pruneRemoved=deletedIds.length;}
 if(labHasStraightProfile(config)){
  labThinStraightSupports(supportContext);
  const finalIds=new Set(holds.map(h=>h.id));
  report.deletedIds=beforeHolds.filter(h=>!finalIds.has(h.id)).map(h=>h.id);report.deletedCount=report.deletedIds.length;
  report.retainedUnselectedIds=candidates.slice(count).filter(v=>finalIds.has(v.hold.id)).map(v=>v.hold.id);
 }
 return report;
}
// The actual original placer is used, not a parallel grid or a new hold-adder.
// First calibrate with pristine STAGE 1, then override ONLY length/centerline.
function labStraightDirection(seed) {
 // Seed 1 remains the unchanged tutorial reference. Other seeds select the
 // centerline independently of the original placer RNG.
 return seed===1?0:Math.floor(mulberry32(seed ^ 0x72E5A491)()*3)-1;
}
function labCreateOriginalLayout(config) {
 const index={short:0,middle:1,long:2}[config.length];
 if(config.type==='switchback'){if(index===undefined||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Invalid switchback configuration.');return labCreateSwitchbackLayout(config,STAGE_CONFIG.lengthRules[index].height);}
 if(index===undefined||!['straight','meander','branch'].includes(config.type)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Invalid skeleton configuration.');
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse};
 const direction=config.type==='straight'?labStraightDirection(config.seed):0;
 const tutorial=config.type!=='meander' && config.length==='short' && direction===0;
 try {
  stageLengthRule=(n,seed)=>n===1?saved.stageLengthRule(n,seed):STAGE_CONFIG.lengthRules[index];
  if(config.type!=='meander'){
   const rise=STAGE_CONFIG.lengthRules[index].height-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin;
   const dx=direction*180,span=Math.hypot(rise,dx),ux=dx/span,uy=-rise/span;
   makeStageCourse=()=>s=>({x:W/2-dx/2+s*ux,y:s*uy,nx:-uy,ny:ux});
  }
  return generator.generate(tutorial?1:2,false,config.seed,config.seed);
 } finally {stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;}
}
function labReplayPartial(path){
 if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerReplayRoute(path,{partial:true});
 const saved={committed,startGrips};let stance=[...initialGrips];
 for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>stance[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>stance[i]=sorted[j]);}
 try{
  if(!stance.every((h,i)=>limbReachable(path[0],h,i)))return null;
  const result=[path[0]];
  for(let i=1;i<path.length;i++){
   committed=path[i-1];startGrips=stance;const p=path[i],anchor=selectAnchor(p.x-committed.x,p.y-committed.y);
   if(!supportsReachable(p,anchor)||supportMotionFraction(committed,p,anchor)<1-1e-9)return null;
   stance=attachMoving(p,anchor);
   if(!stance?.every(Boolean)||sameContacts(stance,startGrips))return null;
   result.push({...p,anchor,grips:stance.map(h=>h.id)});
  }
  return result;
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
function labPartialSearch(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false}={}){
 if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerPartialSearch(guide,{start,stance,limit,maxMoves,stop,forwardOnly});
 const saved={committed,startGrips};const first=stance||[...initialGrips];
 if(!stance)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>first[i]=sorted[j]);}
 const origin=start||guide[0];let transitions=0,expanded=0,best=null;
 const progress=p=>{let best=Infinity,index=0;guide.forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});return index*100-best;};
 let beam=[{p:origin,stance:first,path:[origin],score:progress(origin)}];const visited=new Set();
 try{
  for(let depth=0;depth<maxMoves&&transitions<limit;depth++){
   const next=[];
   for(const node of beam){
    expanded++;committed=node.p;startGrips=node.stance;
    const candidates=[];
    for(const q of guide)if(distance(node.p,q)<=230)for(const t of [.5,.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
    for(const dx of [-90,-60,-30,0,30,60,90])for(const dy of [-90,-45,0,20,40])candidates.push({x:node.p.x+dx,y:node.p.y+dy});
    for(const p of candidates){
     if(transitions++>=limit)break;
     if(p.x<36||p.x>364||p.y<80||p.y>HEIGHT-40||distance(p,node.p)<5||(forwardOnly&&p.y>origin.y+60+1e-7))continue;
     const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
     if(!supportsReachable(p,anchor)||supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
     const contacts=attachMoving(p,anchor);if(!contacts?.every(Boolean)||sameContacts(contacts,node.stance))continue;
     const key=Math.round(p.x/6)+','+Math.round(p.y/6)+':'+contacts.map(h=>h.id).join(',');if(visited.has(key))continue;visited.add(key);
     const path=[...node.path,{...p,anchor,grips:contacts.map(h=>h.id)}];
     const entry={p,stance:contacts,path,score:progress(p)};
     if(!best||p.y<best.p.y)best=entry;
     if(stop(p,contacts,path))return {path,transitions,expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:false,found:true};
     next.push(entry);
    }
   }
   next.sort((a,b)=>b.score-a.score);beam=next.slice(0,12);if(!beam.length)break;
  }
  return {path:best?.path||null,transitions:Math.min(transitions,limit),expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found:false};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
// Local column choice followed by an edge-concentrated native-contact section.
// Only normal source IDs in the local window are mapped. No new holds/physics.
function labColumnPartialSearch(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false}={}){
 if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerPartialSearch(guide,{start,stance,limit,maxMoves,stop,forwardOnly});
 const saved={committed,startGrips};const first=stance||[...initialGrips];
 if(!stance)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>first[i]=sorted[j]);}
 const origin=start||guide[0];let transitions=0,expanded=0,best=null;
 const progress=p=>{let best=Infinity,index=0;guide.forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});return index*100-best;};
 let beam=[{p:origin,stance:first,path:[origin],score:progress(origin)}];const visited=new Set();
 try{
  for(let depth=0;depth<maxMoves&&transitions<limit;depth++){
   const next=[];
   for(const node of beam){
    expanded++;committed=node.p;startGrips=node.stance;
    const candidates=[];
    for(const q of guide)if(distance(node.p,q)<=230)for(const t of [.5,.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
    for(const dx of [-90,-60,-30,0,30,60,90])for(const dy of [-90,-45,0,20,40])candidates.push({x:node.p.x+dx,y:node.p.y+dy});
    for(const p of candidates){
     if(transitions++>=limit)break;
     if(p.x<36||p.x>364||p.y<80||p.y>HEIGHT-40||distance(p,node.p)<5||(forwardOnly&&p.y>origin.y+60+1e-7))continue;
     const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
     if(!supportsReachable(p,anchor)||supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
     const contacts=attachMoving(p,anchor);if(!contacts?.every(Boolean)||sameContacts(contacts,node.stance))continue;
     const key=Math.round(p.x/6)+','+Math.round(p.y/6)+':'+contacts.map(h=>h.id).join(',');if(visited.has(key))continue;visited.add(key);
     const path=[...node.path,{...p,anchor,grips:contacts.map(h=>h.id)}];
     const entry={p,stance:contacts,path,score:progress(p)};
     if(!best||p.y<best.p.y)best=entry;
     if(stop(p,contacts,path))return {path,transitions,expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:false,found:true};
     next.push(entry);
    }
   }
   next.sort((a,b)=>b.score-a.score);beam=next.slice(0,12);if(!beam.length)break;
  }
  return {path:best?.path||null,transitions:Math.min(transitions,limit),expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found:false};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
function labColumnNaturalScatter(points,cap,seed){
 const chosen=[],remaining=[...points].sort((a,b)=>a.id-b.id);
 while(chosen.length<cap&&remaining.length){let best=0,score=-Infinity;remaining.forEach((h,i)=>{const value=chosen.length?Math.min(...chosen.map(q=>distance(h,q))):mulberry32(seed^h.id)();if(value>score){best=i;score=value;}});chosen.push(remaining.splice(best,1)[0]);}
 return chosen.map(h=>h.id);
}
function labColumnSideSearch(primary,solveGuide,column,side,edgeIds,forestBottom,forestTop,band){
 let checkpointIndex=0;primary.forEach((p,i)=>{if(p.y>band.yMax)checkpointIndex=i;});
 const checkpoint=primary[checkpointIndex],initial=[...initialGrips],byId=new Map(holds.map(h=>[h.id,h]));
 if(!checkpointIndex)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>initial[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>initial[i]=sorted[j]);}
 const stance=checkpointIndex?checkpoint.grips.map(id=>byId.get(id)):initial;
 const columnIds=new Set(column.ids),gate={xMin:column.x-48,xMax:column.x+48,yMin:forestTop-60,yMax:forestTop+32};
 const partial=labColumnPartialSearch([checkpoint,{x:column.x,y:forestBottom-36},{x:column.x,y:forestTop-36}],{start:checkpoint,stance,limit:10000,maxMoves:24,stop:(p,c)=>p.x>=gate.xMin&&p.x<=gate.xMax&&p.y>=gate.yMin&&p.y<=gate.yMax&&c.some(h=>columnIds.has(h.id))&&c[0].x<=c[1].x&&c[2].x<=c[3].x});
 const result={side,columnIndex:column.index,found:false,moves:null,path:null,entryIndex:null,checkpointIndex,commonPrefixMoves:checkpointIndex,withinPrimaryBudget:false,contactedColumnIds:[],usedEdgeIds:[],reason:null,gate,search:{limit:10000,maxMoves:24,transitions:partial.transitions,expanded:partial.expanded,limitReached:partial.limitReached,ascentMaxMoves:70}};
 if(!partial.found||partial.limitReached){result.reason=partial.limitReached?'entry-search-limit':'entry-not-found';return result;}
 const entry=partial.path.at(-1),savedInitial=initialGrips;let ascent;
 try{initialGrips=entry.grips.map(id=>byId.get(id));ascent=solveRoute([entry,...solveGuide.filter(p=>p.y<entry.y)],70);}
 finally{initialGrips=savedInitial;}
 if(!ascent){result.reason='goal-not-found';return result;}
 const combined=[...primary.slice(0,checkpointIndex+1),...partial.path.slice(1),...ascent.slice(1)],played=replayRoute(combined);
 if(!played){result.reason='joined-replay-failed';return result;}
 const used=new Set(played.flatMap(p=>p.grips||[]));
 if(!edgeIds.some(id=>used.has(id))){result.reason='edge-section-not-used';return result;}
 result.found=true;result.path=played;result.moves=routeConsumption(played);result.entryIndex=checkpointIndex+partial.path.length-1;result.withinPrimaryBudget=result.moves<=routeStamina(primary);result.contactedColumnIds=column.ids.filter(id=>used.has(id));result.usedEdgeIds=edgeIds.filter(id=>used.has(id));return result;
}
function labColumnOffsets(seed,column,count,spacing){
 const random=mulberry32(seed^0x3C7A91E5^column),start=(random()-.5)*10,end=(random()-.5)*10,bend=(random()<.5?-1:1)*(14+random()*8);
 const weights=Array.from({length:count-1},()=>.65+random()*.7),total=weights.reduce((a,b)=>a+b,0);let sum=0;
 return Array.from({length:count},(_,row)=>{if(row)sum+=weights[row-1];const t=row/(count-1);return {dx:clamp(start*(1-t)+end*t+bend*Math.sin(Math.PI*t)+(random()-.5)*8,-26,26),dy:sum/total*(count-1)*spacing};});
}
function labGenerateBranchSkeleton(config){
 const savedSeed=courseSeed;
 try{
  courseSeed=()=>config.seed;
  const base=labCreateOriginalLayout({...config,type:'straight'});
  level=1;difficulty=0;generatedCourse=null;
  ({holds,route,HEIGHT,initialGrips,densityStats}=base);
  const guide=base.route,source=holds.map(h=>({...h})),rowCount={short:3,middle:4,long:5}[config.length],edgeCount=rowCount,spacing=config.length==='short'?40:52,gap=config.length==='short'?52:64;
  const random=mulberry32(config.seed^0x5B71D3),requestedColumns=random()<.5?3:4,edgeSide=random()<.5?-1:1,edgeX=edgeSide<0?36:W-36;
  const localSpan=(rowCount-1)*spacing+gap+(edgeCount-1)*spacing,forestBottom=Math.min(HEIGHT*.52+localSpan/2,guide[0].y-84),forestTop=forestBottom-(rowCount-1)*spacing,edgeBottom=forestTop-gap,edgeTop=edgeBottom-(edgeCount-1)*spacing;
  const band={xMin:16,xMax:W-16,yMin:edgeTop-24,yMax:forestBottom+24};
  const inside=h=>h.y>=band.yMin&&h.y<=band.yMax;
  const local=holds.filter(h=>h.type==='normal'&&inside(h));
  const columnCount=local.length>=requestedColumns*rowCount+edgeCount?requestedColumns:3,required=columnCount*rowCount+edgeCount;
  if(local.length<required)throw new CourseGeometryRejection('Insufficient source holds for local columns at this seed.');
  // Wide selection sees exactly the original pool before any local mapping.
  assignWideHolds(guide);
  const byId=new Map(holds.map(h=>[h.id,h])),available=[...local].sort((a,b)=>b.y-a.y||a.id-b.id),columns=[],edgeIds=[],mapping=[];
  const mapped=[];let used=0;
  for(let col=0;col<columnCount;col++){
   const nominalX=58+(W-116)*col/(columnCount-1),x=nominalX+(mulberry32(config.seed^0x6E17^col)()-.5)*6,ids=[],offsets=labColumnOffsets(config.seed,col,rowCount,spacing);
   for(let row=0;row<rowCount;row++){
    const original=available[used++],h={...byId.get(original.id),x:x+offsets[row].dx,y:forestBottom-offsets[row].dy+(mulberry32(config.seed^0x44A7^original.id)()-.5)*8};
    if(insideStartTriangle(h,initialGrips))throw new CourseGeometryRejection('Column overlaps the starting stance.');
    mapped.push(h);ids.push(h.id);mapping.push({id:h.id,source:{x:original.x,y:original.y,row:original.row},mapped:{x:h.x,y:h.y},group:'column',column:col,row});
   }
   const ys=mapped.filter(h=>ids.includes(h.id)).map(h=>h.y);columns.push({index:col,x,nominalX,ids,count:ids.length,yMin:Math.min(...ys),yMax:Math.max(...ys),nominalYMin:forestTop,nominalYMax:forestBottom});
  }
  for(let row=0;row<edgeCount;row++){
   const original=available[used++],h={...byId.get(original.id),x:edgeX,y:edgeBottom-row*spacing+(mulberry32(config.seed^0x44A7^original.id)()-.5)*8};
   mapped.push(h);edgeIds.push(h.id);mapping.push({id:h.id,source:{x:original.x,y:original.y,row:original.row},mapped:{x:h.x,y:h.y},group:'edge',row});
  }
  holds=[...holds.filter(h=>h.type!=='normal'||!inside(h)),...mapped].sort((a,b)=>a.id-b.id);
  const protectedBeforeIds=labColumnNaturalScatter(holds.filter(h=>h.type==='normal'&&h.row===null&&h.y>band.yMax),4,config.seed^0x2B45),protectedAfterIds=labColumnNaturalScatter(holds.filter(h=>h.type==='normal'&&h.row===null&&h.y<band.yMin),4,config.seed^0x7C19);
  const protectedIds=new Set([...mapped.map(h=>h.id),...protectedBeforeIds,...protectedAfterIds]),removedIds=available.slice(used).map(h=>h.id),entryY=forestBottom-36,edgeBodyX=edgeX-edgeSide*34;
  const localGuide=[];
  for(let row=0;row<rowCount;row++){
   const t=row/(rowCount-1);localGuide.push({x:guide[0].x+(edgeBodyX-guide[0].x)*t,y:forestBottom-row*spacing-36});
  }
  for(let row=0;row<edgeCount;row++)localGuide.push({x:edgeBodyX,y:edgeBottom-row*spacing-36});
  const solveGuide=[...guide.filter(p=>p.y>entryY),...localGuide,...guide.filter(p=>p.y<edgeTop-36)];
  const solved=solveRoute(solveGuide,70);
  if(!solved)throw new CourseGeometryRejection('No validated column-to-edge route at this seed.');
  route=solved;const before=routeConsumption(route),prePrune=holds.length,nativeSame=samePairRoute;
  try{samePairRoute=(a,b)=>[...protectedIds].every(id=>holds.some(h=>h.id===id))&&nativeSame(a,b);pruneUnusedHolds();}
  finally{samePairRoute=nativeSame;}
  densityStats.fixedSupports=2;route=optimizeRoute(route);finalizeCourseGeneration('basic');
  if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final column contact and stamina validation failed.');
  const usedIds=new Set(route.flatMap(p=>p.grips||[]));
  if(!columns.some(c=>c.ids.some(id=>usedIds.has(id)))||!edgeIds.some(id=>usedIds.has(id)))throw new CourseGeometryRejection('No route using both the column and edge section.');
  const sideSearches=[labColumnSideSearch(route,solveGuide,columns[0],-1,edgeIds,forestBottom,forestTop,band),labColumnSideSearch(route,solveGuide,columns.at(-1),1,edgeIds,forestBottom,forestTop,band)];
  const alternative=sideSearches.filter(s=>s.found&&s.withinPrimaryBudget&&JSON.stringify(s.path.map(p=>[p.x,p.y]))!==JSON.stringify(route.map(p=>[p.x,p.y]))).sort((a,b)=>a.moves-b.moves)[0]||null;
  const edgeYs=holds.filter(h=>edgeIds.includes(h.id)).map(h=>h.y);
  labSkeletonReport={type:'branch',length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:edgeSide<0?'left':'right',routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:alternative?.moves??null,branchRoute:alternative?.path??null,branchDetails:{kind:'local-columns-to-edge',band,requestedColumns,columnCount,rowCount,columns,edge:{side:edgeSide,x:edgeX,ids:edgeIds,count:edgeCount,yMin:Math.min(...edgeYs),yMax:Math.max(...edgeYs),nominalYMin:edgeTop,nominalYMax:edgeBottom},spacing,gap,jitter:{columnXAmplitude:3,holdYAmplitude:4,columnSalt:0x6E17,holdSalt:0x44A7},columnVariation:{kind:'seeded-curved-lanes',laneHalfWidth:26,endpointOffset:5,bendRange:[14,22],holdXNoise:4,gapWeights:[.65,1.35],salt:0x3C7A91E5},protectedIds:[...protectedIds],naturalRetention:{capPerRegion:4,protectedBeforeIds,protectedAfterIds,policy:'seeded-first-then-farthest-native-scatter'},usedColumnIds:columns.flatMap(c=>c.ids.filter(id=>usedIds.has(id))),usedEdgeIds:edgeIds.filter(id=>usedIds.has(id)),sideSearches,minimumRouteProven:false},optimizationAccepted:true,
  placement:{engine:'original-createStageGenerator',placedHolds:source.length,scatteredHolds:source.filter(h=>h.row===null).length,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations,pruneRemoved:prePrune-holds.length,layoutFingerprint:source.map(h=>[h.id,h.x,h.y,h.type,h.row]),mapping,localRemovedIds:removedIds,extraIds:[],coordinatesMapped:true}};
  return labSkeletonReport;
 }finally{courseSeed=savedSeed;}
}

// Contrast uses ONE native scatter pool. Only concentration-band row-null
// coordinates are mapped radially; native start/goal/row supports stay fixed.
function labContrastGuideCenter(guide,y){
 let a=guide[0],b=guide[1];
 if(y<=guide.at(-1).y){a=guide.at(-2);b=guide.at(-1);}
 else for(let i=0;i<guide.length-1;i++)if(y<=guide[i].y&&y>=guide[i+1].y){a=guide[i];b=guide[i+1];break;}
 const t=(y-a.y)/(b.y-a.y||1);return {x:a.x+(b.x-a.x)*t,y};
}
function labContrastSpreadMetrics(points,band,guide,used=null){
 const center=labContrastGuideCenter(guide,(band.yMin+band.yMax)/2),rx=(band.xMax-band.xMin)/2,ry=(band.yMax-band.yMin)/2;
 const a=guide[0],b=guide.at(-1),dx=b.x-a.x,dy=b.y-a.y,span=Math.hypot(dx,dy);
 const inside=p=>p.x>=band.xMin&&p.x<=band.xMax&&p.y>=band.yMin&&p.y<=band.yMax;
 const group=list=>{const xs=list.map(h=>h.x),ys=list.map(h=>h.y),mx=xs.reduce((s,x)=>s+x,0)/(xs.length||1),my=ys.reduce((s,y)=>s+y,0)/(ys.length||1);
  const distances=list.map(h=>Math.abs(dx*(h.y-a.y)-dy*(h.x-a.x))/span).sort((a,b)=>a-b),radii=list.map(h=>Math.hypot((h.x-center.x)/rx,(h.y-center.y)/ry)).sort((a,b)=>a-b),avg=v=>v.reduce((s,x)=>s+x,0)/(v.length||1),q=(v,p)=>v.length?v[Math.floor((v.length-1)*p)]:null;
  return {count:list.length,xSpan:xs.length?Math.max(...xs)-Math.min(...xs):0,ySpan:ys.length?Math.max(...ys)-Math.min(...ys):0,xStd:Math.sqrt(avg(xs.map(x=>(x-mx)**2))),yStd:Math.sqrt(avg(ys.map(y=>(y-my)**2))),guideDistanceMean:avg(distances),guideDistanceP50:q(distances,.5),guideDistanceP90:q(distances,.9),normalizedGuideDistanceMean:avg(distances)/rx,ellipseRadiusMean:avg(radii),ellipseRadiusP50:q(radii,.5),ellipseRadiusP90:q(radii,.9)};};
 const normal=points.filter(h=>h.type==='normal'&&inside(h)),scatter=normal.filter(h=>h.row===null);
 return {center,normalization:{xRadius:rx,yRadius:ry,guideDistanceScale:rx},allNormal:group(normal),scatter:group(scatter),...(used?{usedScatter:group(scatter.filter(h=>used.has(h.id)))}:{})};
}
function labContrastProtectedSample(points,count,sourceById,band,guide){
 const center=labContrastGuideCenter(guide,(band.yMin+band.yMax)/2),rx=(band.xMax-band.xMin)/2,ry=(band.yMax-band.yMin)/2;
 const p=h=>{const s=sourceById.get(h.id);return {x:(s.x-center.x)/rx,y:(s.y-center.y)/ry};},chosen=[];
 const remaining=[...points].sort((a,b)=>a.id-b.id);
 while(chosen.length<count&&remaining.length){let best=0,score=-Infinity;
  remaining.forEach((h,i)=>{const q=p(h),value=chosen.length?Math.min(...chosen.map(k=>{const r=p(k);return (q.x-r.x)**2+(q.y-r.y)**2;})):q.x*q.x+q.y*q.y;if(value>score){best=i;score=value;}});
  chosen.push(remaining.splice(best,1)[0]);
 }
 return chosen.map(h=>h.id);
}
function labGenerateContrastSkeleton(config){
 const savedSeed=courseSeed;
 try{
 courseSeed=()=>config.seed;
 const nativeConfig={...config,type:'straight'},base=labCreateOriginalLayout(nativeConfig);
 level=1;difficulty=0;generatedCourse=null;
 ({holds,route,HEIGHT,initialGrips,densityStats}=base);
 const guide=base.route,rise=HEIGHT-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin,bandHeight=Math.min(200,Math.floor(rise*.3));
 const rect=progress=>{const y=HEIGHT-STAGE_CONFIG.bottomMargin-rise*progress;return {xMin:16,xMax:384,yMin:y-bandHeight/2,yMax:y+bandHeight/2,area:368*bandHeight};};
 const diffusion=rect(.72),concentration=rect(.4),inRect=(h,r)=>h.x>=r.xMin&&h.x<=r.xMax&&h.y>=r.yMin&&h.y<=r.yMax;
 const source=holds.map(h=>({...h})),sourceById=new Map(source.map(h=>[h.id,h])),center=labContrastGuideCenter(guide,(concentration.yMin+concentration.yMax)/2);
 const eligible=holds.filter(h=>h.type==='normal'&&h.row===null&&inRect(h,concentration)),fixed=holds.filter(h=>!eligible.includes(h)),mapped=[],mapping=[],collisionDrops=[];
 const scales=[.4,.55,.7,.85,1],minSpacing=24;
 for(const h of eligible){let accepted=null,scale=null;
  for(const candidateScale of scales){const p={...h,x:center.x+(h.x-center.x)*candidateScale,y:center.y+(h.y-center.y)*candidateScale};
   if([...fixed,...mapped].some(q=>distance(p,q)<minSpacing))continue;accepted=p;scale=candidateScale;break;
  }
  if(accepted){mapped.push(accepted);mapping.push({id:h.id,source:{x:h.x,y:h.y},mapped:{x:accepted.x,y:accepted.y},scale});}
  else collisionDrops.push({id:h.id,x:h.x,y:h.y});
 }
 holds=[...fixed,...mapped].sort((a,b)=>a.id-b.id);
 const placedHolds=source.length,scatteredHolds=source.filter(h=>h.row===null).length,layoutFingerprint=source.map(h=>[h.id,h.x,h.y,h.type,h.row]);
 const beforeMapping={diffusion:labContrastSpreadMetrics(source,diffusion,guide),concentration:labContrastSpreadMetrics(source,concentration,guide)};
 const afterMapping={diffusion:labContrastSpreadMetrics(holds,diffusion,guide),concentration:labContrastSpreadMetrics(holds,concentration,guide)};
 const diffuseScatter=holds.filter(h=>h.type==='normal'&&h.row===null&&inRect(h,diffusion)),concentratedScatter=holds.filter(h=>h.type==='normal'&&h.row===null&&inRect(h,concentration));
 const protectionCap=8,protectedCount=Math.min(protectionCap,diffuseScatter.length,concentratedScatter.length);
 const protectedDiffusionIds=labContrastProtectedSample(diffuseScatter,protectedCount,sourceById,diffusion,guide),protectedConcentrationIds=labContrastProtectedSample(concentratedScatter,protectedCount,sourceById,concentration,guide),protectedIds=new Set([...protectedDiffusionIds,...protectedConcentrationIds]);
 assignWideHolds(guide);const solved=solveRoute(guide,60);
 if(!solved)throw new CourseGeometryRejection('No validated contrast-scatter route at this seed.');
 route=solved;const before=routeConsumption(route),filteredHolds=holds.length;
 const nativeSame=samePairRoute;
 try{samePairRoute=(a,b)=>[...protectedIds].every(id=>holds.some(h=>h.id===id))&&nativeSame(a,b);pruneUnusedHolds();}
 finally{samePairRoute=nativeSame;}
 densityStats.fixedSupports=2;route=optimizeRoute(route);finalizeCourseGeneration('basic');
 if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final contrast contact and stamina validation failed.');
 const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]),metrics={diffusion:labContrastSpreadMetrics(holds,diffusion,guide,used),concentration:labContrastSpreadMetrics(holds,concentration,guide,used)};
 const validation={minimumScatterPoints:3,maxMeanRadiusRatio:.85,ratio:metrics.concentration.scatter.ellipseRadiusMean/metrics.diffusion.scatter.ellipseRadiusMean,appliesTo:'final-row-null-scatter'};
 if(metrics.diffusion.scatter.count<validation.minimumScatterPoints||metrics.concentration.scatter.count<validation.minimumScatterPoints||!Number.isFinite(validation.ratio)||validation.ratio>validation.maxMeanRadiusRatio)throw new CourseGeometryRejection('Scatter spread contrast could not be validated at this seed.');
 validation.validated=true;
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,optimizationAccepted:true,
  contrast:{kind:'single-pool-radial-spread',diffusion,concentration,center,mapping:{kind:'isotropic-2d',scales,minSpacing,eligibleIds:eligible.map(h=>h.id),records:mapping,collisionDrops},retention:{policy:'equal-cap-maximin-original-source-ellipse',cap:protectionCap,selectedPerBand:protectedCount,protectedDiffusionIds,protectedConcentrationIds},beforeMapping,afterMapping,metrics,validation,countDifferenceIsNotAcceptanceCriterion:true},
  placement:{engine:'original-createStageGenerator',placedHolds,scatteredHolds,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations,pruneRemoved:filteredHolds-holds.length,layoutFingerprint,nativeSources:[{seed:config.seed,holds:source.length,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations}],extraIds:[],collisionRemoved:collisionDrops.length,coordinatesMapped:true}};
 return labSkeletonReport;
 }finally{courseSeed=savedSeed;}
}

// Composition-only adapter: native-sized sections, translated (never scaled).
function labCompositeOriginalLayout(config,height){
 if(config.type==='switchback')return labCreateSwitchbackLayout(config,height);
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse},index={short:0,middle:1,long:2}[config.length];
 try{
  stageLengthRule=(n,seed)=>n===1?saved.stageLengthRule(n,seed):{...STAGE_CONFIG.lengthRules[index],height};
  if(config.type!=='meander'){
   const rise=height-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin,dx=labStraightDirection(config.seed)*180,span=Math.hypot(rise,dx),ux=dx/span,uy=-rise/span;
   makeStageCourse=()=>s=>({x:W/2-dx/2+s*ux,y:s*uy,nx:-uy,ny:ux});
  }
  return generator.generate(2,false,config.seed,config.seed);
 }finally{stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;}
}
// Only a previously rejected branch/branch mandatory collision is repairable.
// Move one retained ordinary native scatter, never a column/edge/start/goal/wide
// hold. The same ID/count is kept and the final course still uses native solve,
// contact replay, pruning, optimization, budget validation and player controls.
function labRepairBranchJoin(points,sectionReports,mandatory,sourceSection,seam,initialPairs){
 if(sectionReports.length!==2||sectionReports.some(s=>s.type!=='branch'))return null;
 const conflicts=initialPairs.filter(p=>p.distance<24&&mandatory.has(p.a.id)&&mandatory.has(p.b.id));
 if(conflicts.length!==1)return null;
 const pair=conflicts[0],candidates=[];
 const isRetainedScatter=h=>{const origin=sourceSection.get(h.id),d=sectionReports[origin.section].sourceReport.branchDetails;return h.type==='normal'&&h.row===null&&!h.wide&&[...d.naturalRetention.protectedBeforeIds,...d.naturalRetention.protectedAfterIds].includes(origin.sourceId);};
 // Do not move even the scatter neighbor of a structural mandatory hold.
 if(![pair.a,pair.b].every(isRetainedScatter))return null;
 for(const h of [pair.a,pair.b]){
  const origin=sourceSection.get(h.id),s=sectionReports[origin.section],d=s.sourceReport.branchDetails,b=s.ownedBounds;
  const natural=[...d.naturalRetention.protectedBeforeIds,...d.naturalRetention.protectedAfterIds];
  if(h.type!=='normal'||h.row!==null||h.wide||!natural.includes(origin.sourceId))continue;
  const inOwn=p=>p.x>=b.xMin&&p.x<=b.xMax&&p.y>=b.yMin&&p.y<=b.yMax;
  const inJoin=p=>p.y>=seam-120&&p.y<=seam+120;
  const before=d.naturalRetention.protectedBeforeIds.includes(origin.sourceId),regionEdge=(before?d.band.yMax:d.band.yMin)+s.offsetY;
  const sameRegion=p=>before?p.y>regionEdge:p.y<regionEdge;
  if(!inOwn(h)||!inJoin(h)||!sameRegion(h))continue;
  for(let dy=-16;dy<=16;dy++)for(let dx=-16;dx<=16;dx++){
   const displacement=Math.hypot(dx,dy);if(!displacement||displacement>16)continue;
   const p={x:h.x+dx,y:h.y+dy};if(!inOwn(p)||!inJoin(p)||!sameRegion(p))continue;
   if(points.some(q=>q.id!==h.id&&distance(p,q)<24))continue;
   candidates.push({h,origin,ownedBounds:{...b},sourceRegion:before?'before-branch-band':'after-branch-band',from:{x:h.x,y:h.y},to:p,dx,dy,displacement});
  }
 }
 candidates.sort((a,b)=>a.displacement-b.displacement||a.h.id-b.h.id||a.dy-b.dy||a.dx-b.dx);
 const chosen=candidates[0];if(!chosen)return null;
 const {h,origin,ownedBounds,sourceRegion,from,to,dx,dy,displacement}=chosen;h.x=to.x;h.y=to.y;
 return {kind:'single-retained-scatter-translation',trigger:'previously-rejected-mandatory-collision',candidatePolicy:'integer-grid-minimum-displacement-then-id-dy-dx',maxDisplacement:16,minSpacing:24,spacingScope:'moved-hold-against-entire-merged-input',candidates:candidates.length,conflict:{ids:[pair.a.id,pair.b.id],beforeDistance:pair.distance},moves:[{id:h.id,...origin,ownedBounds,sourceRegion,from,to,dx,dy,displacement}],allInputIdsPreserved:true,featureCoordinatesUnchanged:true};
}

// Mixed switchback-to-straight joins need the canonical source witnesses:
// choosing a faster source path can prune contacts needed by the merged solve.
// Keep the hybrid search for the final join and every other recipe family.
function labGenerateCompositeSourceSkeleton(config,sourceConfig){
 if(config.composition==='pair'&&config.type==='switchback'&&config.secondType==='straight'&&
    typeof withFingerRouteSearchStrategy==='function'&&typeof fingerAimEnabled==='function'&&fingerAimEnabled())
  return withFingerRouteSearchStrategy('canonical',()=>labGenerateSkeleton(sourceConfig));
 return labGenerateSkeleton(sourceConfig);
}
function labGenerateCompositeSkeleton(config){
 labSkeletonReport=null;
 if(config.composition!=='pair'||!['middle','long'].includes(config.length)||!['straight','meander','branch','contrast','switchback'].includes(config.type)||!['straight','meander','branch','contrast','switchback'].includes(config.secondType)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Composition requires two sections and middle or long length.');
 const saved={courseSeed,labCreateOriginalLayout,labColumnSideSearch},height=STAGE_CONFIG.lengthRules[config.length==='middle'?1:2].height,sectionHeight=height/2+120,sectionLength=config.length==='middle'?'short':'middle';
 const types=[config.type,config.secondType],sections=[],hasSwitchback=types.includes('switchback');
 try{
  labCreateOriginalLayout=c=>labCompositeOriginalLayout(c,sectionHeight);
  labColumnSideSearch=()=>({found:false,reason:'not-run-in-section-source'});
  for(let i=0;i<2;i++){
   const seed=(config.seed^(i?0x7F4A7C15:0x243F6A88))>>>0,c={type:types[i],length:sectionLength,seed};courseSeed=()=>seed;
   let report;try{report=labGenerateCompositeSourceSkeleton(config,c);}catch(e){if(!(e instanceof CourseGeometryRejection))throw e;throw new CourseGeometryRejection(`Section ${i+1} (${types[i]}): ${e.message}`,{cause:e});}
   sections.push({type:types[i],seed,height:HEIGHT,report:JSON.parse(JSON.stringify(report)),holds:holds.map(h=>({...h})),route:route.map(p=>({...p,grips:p.grips?[...p.grips]:undefined})),initialIds:initialGrips.map(h=>h.id),density:JSON.parse(JSON.stringify(densityStats))});
  }
  labCreateOriginalLayout=saved.labCreateOriginalLayout;labColumnSideSearch=saved.labColumnSideSearch;courseSeed=()=>config.seed;
  const all=[],protectedIds=new Set(),sectionReports=[],converted=[];let nextId=0;
  for(let i=0;i<2;i++){
   const s=sections[i],dy=i===0?height-sectionHeight:0,map=new Map();
   for(const h of s.holds){const id=nextId++;map.set(h.id,id);if((i===0&&h.type==='goal')||(i===1&&h.type==='start'))converted.push({id,section:i,sourceId:h.id,from:h.type,to:'normal',wide:!!h.wide||h.type==='goal'});all.push({...h,id,y:h.y+dy,type:(i===0&&h.type==='goal')||(i===1&&h.type==='start')?'normal':h.type, ...(i===0&&h.type==='goal'?{wide:true}:{})});}
   s.idMap=map;s.dy=dy;s.worldRoute=s.route.map(p=>({x:p.x,y:p.y+dy}));
   const preserve=s.report.branchDetails?.protectedIds||[...(s.report.contrast?.retention.protectedDiffusionIds||[]),...(s.report.contrast?.retention.protectedConcentrationIds||[])];preserve.forEach(id=>protectedIds.add(map.get(id)));
   sectionReports.push({index:i,type:s.type,seed:s.seed,height:s.height,offsetY:dy,idMap:[...map],sourceReport:s.report,sourceHolds:s.holds,sourceRoute:s.route,ownedBounds:{xMin:16,xMax:W-16,yMin:i===0?height/2:0,yMax:i===0?height:height/2},protectedIds:preserve.map(id=>map.get(id))});
  }
  if(labStraightSupportContext)labStraightSupportContext.sections=sectionReports;
  const seam=height/2,sourceSection=new Map(sectionReports.flatMap(s=>s.idMap.map(([sourceId,id])=>[id,{section:s.index,sourceId}]))),joinDrops=[];
  const mandatory=new Set([...protectedIds,...sections[0].initialIds.map(id=>sections[0].idMap.get(id)),...all.filter(h=>h.type==='goal').map(h=>h.id)]);
  const crossPairs=points=>{
   const left=points.filter(h=>sourceSection.get(h.id).section===0),right=points.filter(h=>sourceSection.get(h.id).section===1);
   return left.flatMap(a=>right.map(b=>({a,b,distance:distance(a,b)}))).sort((a,b)=>a.distance-b.distance||a.a.id-b.a.id||a.b.id-b.b.id);
  };
  const initialPairs=crossPairs(all),joinRepair=labRepairBranchJoin(all,sectionReports,mandatory,sourceSection,seam,initialPairs),mergePairs=joinRepair?crossPairs(all):initialPairs,removed=new Set();
  for(const pair of mergePairs){
   if(pair.distance>=24)break;if(removed.has(pair.a.id)||removed.has(pair.b.id))continue;
   const pa=mandatory.has(pair.a.id),pb=mandatory.has(pair.b.id);
   if(pa&&pb)throw new CourseGeometryRejection('Required seam holds are too close for composition.');
   let drop,keep;
   if(pa||pb){drop=pa?pair.b:pair.a;keep=pa?pair.a:pair.b;}
   else{const da=Math.max(0,seam-pair.a.y),db=Math.max(0,pair.b.y-seam);drop=da>=db?pair.a:pair.b;keep=drop===pair.a?pair.b:pair.a;}
   removed.add(drop.id);joinDrops.push({id:drop.id,...sourceSection.get(drop.id),keptId:keep.id,distance:pair.distance,reason:pa||pb?'mandatory-neighbor':'outside-owned-half-priority'});
  }
  holds=all.filter(h=>!removed.has(h.id));HEIGHT=height;initialGrips=sections[0].initialIds.map(id=>holds.find(h=>h.id===sections[0].idMap.get(id)));level=1;difficulty=0;generatedCourse=null;
  densityStats={...sections[0].density,initialTotal:sections.reduce((n,s)=>n+s.density.initialTotal,0),iterations:sections.reduce((n,s)=>n+s.density.iterations,0)};
  const postMergeMin=crossPairs(holds)[0]?.distance??null;
  const guide=[...sections[0].worldRoute.filter(p=>p.y>=seam),...sections[1].worldRoute.filter(p=>p.y<seam)];
  const switchbackWitness=hasSwitchback?labSolveCompositeSwitchbacks(guide,sectionReports):null;
  const solved=hasSwitchback?switchbackWitness.route:solveRoute(guide,90);if(!solved)throw new CourseGeometryRejection('Bounded search could not validate a continuous two-section route.');route=solved;
  const before=routeConsumption(route),beforeCount=holds.length,nativeSame=samePairRoute;
  try{samePairRoute=(a,b)=>[...protectedIds].every(id=>holds.some(h=>h.id===id))&&nativeSame(a,b);pruneUnusedHolds();}finally{samePairRoute=nativeSame;}
  densityStats.fixedSupports=2;const preOptimization=route,optimized=optimizeRoute(route),compositeOptimizationAccepted=!hasSwitchback||labCompositeSwitchbackFeatures(optimized,sectionReports).validated;route=compositeOptimizationAccepted?optimized:preOptimization;finalizeCourseGeneration('basic');
  if(!validateRouteBudget(route))throw new CourseGeometryRejection('Composed contact and stamina validation failed.');
  const recoveryDragReference=switchbackWitness?.variantLimit===4||sections.some(s=>s.report.switchback?.variantLimit===4)?labAssertRecoveryDragReference(route):null;
  const compositeSwitchbackFeatures=hasSwitchback?labCompositeSwitchbackFeatures(route,sectionReports):null;
  if(hasSwitchback&&!compositeSwitchbackFeatures.validated)throw new CourseGeometryRejection('Composed switchback amplitude and legs could not be validated.');
  const used=new Set(route.flatMap(p=>p.grips||[]));
  const finalIds=new Set(holds.map(h=>h.id));
  for(const s of sectionReports){
   const idMap=new Map(s.idMap),ids=new Set(idMap.values()),worldPoints=holds.filter(h=>ids.has(h.id)),localPoints=worldPoints.map(h=>({...h,y:h.y-s.offsetY}));
   s.usedIds=worldPoints.filter(h=>used.has(h.id)).map(h=>h.id);s.finalIds=worldPoints.map(h=>h.id);s.collisionRemovedIds=joinDrops.filter(d=>d.section===s.index).map(d=>d.id);s.prunedIds=s.idMap.map(p=>p[1]).filter(id=>!finalIds.has(id)&&!removed.has(id));
   const pathPoints=route.filter(p=>p.y>=s.ownedBounds.yMin&&p.y<=s.ownedBounds.yMax),xs=pathPoints.map(p=>p.x);
   s.finalGeometry={holds:worldPoints.length,sourceHolds:s.sourceHolds.length,routeSpan:xs.length?Math.max(...xs)-Math.min(...xs):0,travelX:pathPoints.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-pathPoints[i].x),0),routePoints:pathPoints.length};
   if(!s.usedIds.length)throw new CourseGeometryRejection(`Section ${s.index+1} has no validated contacts.`);
   if(s.type==='branch'){
    const d=s.sourceReport.branchDetails,mapIds=a=>a.map(id=>idMap.get(id));
    const columns=d.columns.map(c=>({...c,ids:mapIds(c.ids),yMin:c.yMin+s.offsetY,yMax:c.yMax+s.offsetY,nominalYMin:c.nominalYMin+s.offsetY,nominalYMax:c.nominalYMax+s.offsetY})),edge={...d.edge,ids:mapIds(d.edge.ids),yMin:d.edge.yMin+s.offsetY,yMax:d.edge.yMax+s.offsetY,nominalYMin:d.edge.nominalYMin+s.offsetY,nominalYMax:d.edge.nominalYMax+s.offsetY};
    const usedColumnIds=columns.flatMap(c=>c.ids).filter(id=>used.has(id)),usedEdgeIds=edge.ids.filter(id=>used.has(id));
    if(!columns.every(c=>c.ids.every(id=>finalIds.has(id)))||!edge.ids.every(id=>finalIds.has(id))||!usedColumnIds.length||!usedEdgeIds.length)throw new CourseGeometryRejection(`Section ${s.index+1} column and edge shape/contact validation failed.`);
    s.features={kind:'local-columns-to-edge',columns,edge,usedColumnIds,usedEdgeIds};
   }else if(s.type==='contrast'){
    const d=s.sourceReport.contrast;
    // The radial metric guide is straight. Recover its exact centerline from
    // the two recorded native band centers, not the solved wandering route.
    const guide=[d.metrics.concentration.center,d.metrics.diffusion.center].sort((a,b)=>b.y-a.y);
    const visiblePoints=holds.map(h=>({...h,y:h.y-s.offsetY}));
    const metrics={diffusion:labContrastSpreadMetrics(visiblePoints,d.diffusion,guide,used),concentration:labContrastSpreadMetrics(visiblePoints,d.concentration,guide,used)};
    const bands={};for(const key of ['diffusion','concentration']){
     const b=d[key],within=worldPoints.filter(h=>h.type==='normal'&&h.x>=b.xMin&&h.x<=b.xMax&&h.y>=b.yMin+s.offsetY&&h.y<=b.yMax+s.offsetY);
     const visible=holds.filter(h=>h.type==='normal'&&h.x>=b.xMin&&h.x<=b.xMax&&h.y>=b.yMin+s.offsetY&&h.y<=b.yMax+s.offsetY);
     bands[key]={...b,yMin:b.yMin+s.offsetY,yMax:b.yMax+s.offsetY,ids:within.map(h=>h.id),visibleIds:visible.map(h=>h.id),usedIds:within.filter(h=>used.has(h.id)).map(h=>h.id)};
    }
    const ratio=metrics.concentration.scatter.ellipseRadiusMean/metrics.diffusion.scatter.ellipseRadiusMean;
    if(metrics.diffusion.scatter.count<3||metrics.concentration.scatter.count<3||!Number.isFinite(ratio)||ratio>.85||!bands.diffusion.usedIds.length||!bands.concentration.usedIds.length)throw new CourseGeometryRejection(`Section ${s.index+1} density contrast and dual-region contacts failed.`);
    s.features={kind:'single-pool-radial-spread',metricScope:'all-visible-merged-holds-in-world-windows',bands,metrics,ratio,maxRatio:.85,minimumScatterPoints:3};
   }else if(s.type==='switchback'){
    const geometry=labSwitchbackCompositeGeometry([s]),features=labCompositeSwitchbackFeatures(route,[s]);
    if(!features.validated)throw new CourseGeometryRejection(`Section ${s.index+1} switchback amplitude validation failed.`);
    s.features={kind:'wide-switchback',geometry,features,metricScope:'final-world-route-within-owned-section',shapeNecessityProven:false};
   }else{
    // 140px is only a visual reference (about half the native guide width),
    // not an original movement rule or a reason to reject a playable course.
    s.features={kind:s.type,orientation:s.sourceReport.orientation,usedIds:s.usedIds,referenceWidth:s.type==='meander'?140:null,meetsReferenceWidth:s.type==='meander'?s.finalGeometry.routeSpan>=140:null,shapeNecessityProven:false};
   }
  }

  labSkeletonReport={type:config.type,secondType:config.secondType,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,contrast:null,optimizationAccepted:compositeOptimizationAccepted,...(hasSwitchback?{switchback:{geometry:labSwitchbackCompositeGeometry(sectionReports),features:compositeSwitchbackFeatures,...(recoveryDragReference?{recoveryDragReference}:{}),variant:switchbackWitness.variant,attempts:switchbackWitness.attempts,unconstrained:{scope:'pre-prune-merged-holds',found:!!switchbackWitness.free,moves:switchbackWitness.free?routeConsumption(switchbackWitness.free):null,features:switchbackWitness.freeFeature,path:switchbackWitness.free,finalReplay:switchbackWitness.free?replayRoute(switchbackWitness.free):null},optimization:{accepted:compositeOptimizationAccepted,moves:routeConsumption(optimized),features:labCompositeSwitchbackFeatures(optimized,sectionReports),path:optimized}}}:{}),composition:{kind:'two-sections',types,sectionHeight,sectionLength,seedSalts:[0x243F6A88,0x7F4A7C15],junction:{seam,overlap:240,yMin:seam-120,yMax:seam+120,converted,...(joinRepair?{repair:joinRepair}:{}),removedJoinIds:[...removed],collisionPolicy:{minCrossSourceSpacing:24,mandatoryIds:[...mandatory],priority:'protected-then-owned-half; equal-penalty-keeps-upper-source',drops:joinDrops,beforeMinDistance:initialPairs[0]?.distance??null,postMergeMinDistance:postMergeMin,finalMinDistance:crossPairs(holds)[0]?.distance??null}},sections:sectionReports,solverMaxMoves:90,intermediateGoal:'converted-to-normal-wide',upperStart:'converted-to-normal',verticalScaling:false,staminaResets:0,singleModeUnchanged:true},placement:{engine:'original-createStageGenerator',nativeSources:sections.map(s=>({type:s.type,seed:s.seed,height:s.height,placedHolds:s.report.placement.placedHolds,sourceFinalHolds:s.holds.length,densityInitial:s.report.placement.densityInitial,densityRemoved:s.report.placement.densityRemoved})),placedHolds:sections.reduce((n,s)=>n+s.report.placement.placedHolds,0),scatteredHolds:sections.reduce((n,s)=>n+s.report.placement.scatteredHolds,0),densityInitial:sections.reduce((n,s)=>n+s.report.placement.densityInitial,0),densityRemoved:sections.reduce((n,s)=>n+s.report.placement.densityRemoved,0),mergedSourceHolds:all.length,collisionRemoved:removed.size,mergedInputHolds:beforeCount,pruneRemoved:beforeCount-holds.length,translationOnly:!joinRepair,...(joinRepair?{joinCoordinatesMapped:true}:{}),extraIds:[]}};
  return labSkeletonReport;
 }catch(error){labSkeletonReport=null;generatedCourse=null;throw error;}finally{courseSeed=saved.courseSeed;labCreateOriginalLayout=saved.labCreateOriginalLayout;labColumnSideSearch=saved.labColumnSideSearch;}
}

function labSwitchbackSearch(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false,accept=()=>true}={}){
 if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerPartialSearch(guide,{start,stance,limit,maxMoves,stop,forwardOnly,accept});
 const saved={committed,startGrips};const first=stance||[...initialGrips];
 if(!stance)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>first[i]=sorted[j]);}
 const origin=start||guide[0];let transitions=0,expanded=0,best=null;
 const progress=p=>{let best=Infinity,index=0;guide.forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});return index*100-best;};
 let beam=[{p:origin,stance:first,path:[origin],score:progress(origin)}];const visited=new Set();
 try{
  for(let depth=0;depth<maxMoves&&transitions<limit;depth++){
   const next=[];
   for(const node of beam){
    expanded++;committed=node.p;startGrips=node.stance;
    const candidates=[];
    for(const q of guide)if(distance(node.p,q)<=230)for(const t of [.5,.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
    for(const dx of [-90,-60,-30,0,30,60,90])for(const dy of [-90,-45,0,20,40])candidates.push({x:node.p.x+dx,y:node.p.y+dy});
    for(const p of candidates){
     if(transitions++>=limit)break;
     if(!accept(p,node.path)||p.x<36||p.x>364||p.y<80||p.y>HEIGHT-40||distance(p,node.p)<5||(forwardOnly&&p.y>origin.y+60+1e-7))continue;
     const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
     if(!supportsReachable(p,anchor)||supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
     const contacts=attachMoving(p,anchor);if(!contacts?.every(Boolean)||sameContacts(contacts,node.stance))continue;
     const key=Math.round(p.x/6)+','+Math.round(p.y/6)+':'+contacts.map(h=>h.id).join(',');if(visited.has(key))continue;visited.add(key);
     const path=[...node.path,{...p,anchor,grips:contacts.map(h=>h.id)}];
     const entry={p,stance:contacts,path,score:progress(p)};
     if(!best||p.y<best.p.y)best=entry;
     if(stop(p,contacts,path))return {path,transitions,expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:false,found:true};
     next.push(entry);
    }
   }
   next.sort((a,b)=>b.score-a.score);beam=next.slice(0,12);if(!beam.length)break;
  }
  return {path:best?.path||null,transitions:Math.min(transitions,limit),expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found:false};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
// Local column choice followed by an edge-concentrated native-contact section.
// Only normal source IDs in the local window are mapped. No new holds/physics.
// New switchback only. Native station placement/scatter/density and contacts.
function labCreateSwitchbackLayout(config,height){
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse,stageLayout};
 const rise=height-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin,swings=height>=1400?2:1,side=mulberry32(config.seed^0x57C4B3)()<.5?-1:1,x0=W/2+side*144;
 const samples=[{x:x0,y:0,s:0}],turnStations=[];let x=x0;
 for(let i=1;i<=swings;i++){
  const y=-rise*i/(swings+1),last=samples.at(-1),a={x,y,s:last.s+distance(last,{x,y})};samples.push(a);
  x=W-x;const b={x,y,s:a.s+Math.abs(x-a.x)};samples.push(b);turnStations.push({startS:a.s,endS:b.s,side:x<W/2?-1:1});
 }
 const end={x,y:-rise-300};end.s=samples.at(-1).s+distance(samples.at(-1),end);samples.push(end);
 const raw=s=>{let i=0;while(i<samples.length-2&&samples[i+1].s<s)i++;const a=samples[i],b=samples[i+1],t=(s-a.s)/(b.s-a.s),d=distance(a,b);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,nx:-(b.y-a.y)/d,ny:(b.x-a.x)/d};};let nativeLayout;
 try{
  stageLengthRule=(n,seed)=>n===1?saved.stageLengthRule(n,seed):{category:config.length,height,climbHeight:rise/(swings+1)};
  makeStageCourse=()=>raw;stageLayout=function(n,...args){const r=saved.stageLayout(n,...args);if(n===2)nativeLayout=r;return r;};
  const base=generator.generate(2,false,config.seed,config.seed),bottom=height-STAGE_CONFIG.bottomMargin;
  base.switchback={side,swings,shapeKind:swings===1?'crank':'u-switchback',rawCourseVertices:samples.map(p=>({...p,y:p.y+bottom})),turns:turnStations.map(t=>{const a=nativeLayout.course(t.startS),b=nativeLayout.course(t.endS);return {side:t.side,start:{x:a.x,y:a.y+bottom},end:{x:b.x,y:b.y+bottom}};})};return base;
 }finally{stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;stageLayout=saved.stageLayout;}
}
function labSwitchbackPathFeatures(path,geometry){
 const legs=[];let begin=0;
 for(const turn of geometry.turns){
  let found=null;
  for(let i=begin;i<path.length-1&&!found;i++){
   const a=path[i];if(turn.bounds&&(a.y<turn.bounds.yMin||a.y>turn.bounds.yMax))continue;if(turn.side*(a.x-W/2)>-65||a.y<turn.end.y-130||a.y>turn.end.y+80)continue;
   let ymin=a.y,ymax=a.y;
   for(let j=i+1;j<path.length;j++){
    const b=path[j];if(turn.bounds&&(b.y<turn.bounds.yMin||b.y>turn.bounds.yMax))break;ymin=Math.min(ymin,b.y);ymax=Math.max(ymax,b.y);if(ymax-ymin>100)break;
    const dx=turn.side*(b.x-a.x),dy=b.y-a.y;if(dx>=200&&Math.abs(dy)<=80){found={sectionIndex:turn.sectionIndex,entryIndex:i,exitIndex:j,entry:{x:a.x,y:a.y},exit:{x:b.x,y:b.y},side:turn.side,span:dx,deltaY:dy,yRange:ymax-ymin,slope:Math.abs(dy)/dx};break;}
   }
  }
  if(!found)return {validated:false,reason:'ordered-near-horizontal-leg-not-found',legs,minimumAmplitude:200,maxDeltaY:80,maxYRange:100};legs.push(found);begin=found.exitIndex;
 }
 return {validated:true,minimumAmplitude:200,maxDeltaY:80,maxYRange:100,legs,minimumObservedAmplitude:Math.min(...legs.map(g=>g.span)),allPathsRequired:false};
}
function labBuildSwitchbackWitness(guide,geometry){
 const free=solveRoute(guide,90),freeFeature=free?labSwitchbackPathFeatures(free,geometry):null;
 if(freeFeature?.validated)return {route:free,free,freeFeature,variant:'unconstrained',attempts:[]};
 const attempts=[];
 for(const variant of ['native-guide','side-approach']){
  let current=guide[0],stance=null,joined=[{x:current.x,y:current.y}],searches=[];
  try{
   const byId=()=>new Map(holds.map(h=>[h.id,h]));
   for(const turn of geometry.turns){
    const target={x:turn.end.x,y:turn.end.y-40},entryTarget={x:turn.start.x,y:turn.start.y-40};
    const approachGuide=guide.filter(p=>p.y<current.y&&p.y>entryTarget.y+(variant==='side-approach'?60:0)&&(variant!=='side-approach'||turn.side*(p.x-W/2)<=-65));
    const approach=labSwitchbackSearch([current,...approachGuide,entryTarget],{start:current,stance,limit:10000,maxMoves:32,stop:p=>turn.side*(p.x-W/2)<=-100&&Math.abs(p.y-entryTarget.y)<=40&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax)),accept:p=>p.y>=entryTarget.y-50});
    searches.push({phase:'approach',...approach,path:undefined});if(!approach.found)throw new CourseGeometryRejection('approach');
    joined.push(...approach.path.slice(1));current=joined.at(-1);let ids=byId();stance=current.grips.map(id=>ids.get(id));const entry={x:current.x,y:current.y};
    const cross=labSwitchbackSearch([current,{x:turn.end.x,y:entry.y},target],{start:current,stance,limit:10000,maxMoves:24,stop:(p,grips)=>turn.side*(p.x-entry.x)>=200&&grips[0].x<=grips[1].x&&grips[2].x<=grips[3].x,accept:p=>Math.abs(p.y-entry.y)<=40&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax))});
    searches.push({phase:'cross',...cross,path:undefined});if(!cross.found)throw new CourseGeometryRejection('cross');
    joined.push(...cross.path.slice(1));current=joined.at(-1);ids=byId();stance=current.grips.map(id=>ids.get(id));
   }
   const originalInitial=initialGrips;let suffix;
   try{initialGrips=stance;suffix=solveRoute([current,...guide.filter(p=>p.y<current.y)],90);}finally{initialGrips=originalInitial;}
   if(!suffix)throw new CourseGeometryRejection('goal');joined.push(...suffix.slice(1));const replay=replayRoute(joined);
   if(!replay||!labSwitchbackPathFeatures(replay,geometry).validated)throw new CourseGeometryRejection('full-replay-or-shape');
   attempts.push({variant,found:true,searches});return {route:replay,free,freeFeature,variant,attempts};
  }catch(error){if(!(error instanceof CourseGeometryRejection))throw error;attempts.push({variant,found:false,reason:error.message,searches});}
 }
 return labRecoverSwitchbackWitness(guide,geometry,free,attempts);
}
// Failure-only recovery; preserves the two original successful search results.
// Uses actual native goal continuations as approach checkpoints, never a fake
// goal or a substituted stance. Every accepted whole path is replayed from start.
// Reference acceptance only: finite native drag simulation, not new controls.
// Replays the standard ten-sample body drag at logical 400px width, including
// the anchor lock when the original 5px threshold is first crossed.
function labValidateRecoveryDragReference(path){
 if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerValidateDragReference(path);
 const saved={committed,startGrips},byId=new Map(holds.map(h=>[h.id,h]));
 let stance=[...initialGrips];for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>stance[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>stance[i]=sorted[j]);}
 const fail=(step,reason,extra={})=>({valid:false,step,reason,samples:10,viewportWidth:400,...extra});
 try{
  for(let i=1;i<path.length;i++){
   const from=path[i-1],to=path[i],cam=clamp(from.y-H*CAMERA_CONFIG.bodyScreenRatio,cameraTop(),HEIGHT-H),origin={x:from.x,y:(from.y-cam)+cam};
   committed={x:from.x,y:from.y};startGrips=stance;let actual={...committed},attached=stance,anchor=null;
   const offset={x:from.x-origin.x,y:from.y-origin.y};
   for(const step of [1,2,3,4,5,6,7,8,9,10,10]){
    const t=step/10,p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t},raw={x:p.x+offset.x,y:((p.y-cam)+cam)+offset.y};
    if(anchor===null){if(distance(raw,committed)<INPUT_CONFIG.dragThreshold)continue;anchor=selectAnchor(raw.x-committed.x,raw.y-committed.y);}
    const target={x:clamp(raw.x,25,W-25),y:clamp(raw.y,80,HEIGHT-40)},fraction=supportMotionFraction(actual,target,anchor),next={x:actual.x+(target.x-actual.x)*fraction,y:actual.y+(target.y-actual.y)*fraction},nextContacts=attachMoving(next,anchor);
    if(nextContacts){actual=next;attached=nextContacts;}
   }
   if(!isSupportPair(anchor)||!attached.every(Boolean)||!anchor.every(j=>attached[j]===stance[j]&&limbReachable(actual,attached[j],j))||sameContacts(attached,stance))return fail(i,'native-drag-release-rejected',{expectedAnchor:to.anchor,actualAnchor:anchor});
   if(distance(actual,to)>1e-7||!to.grips?.every((id,j)=>attached[j].id===id))return fail(i,'native-drag-reference-mismatch',{expectedAnchor:to.anchor,actualAnchor:anchor,actualBody:actual,actualGrips:attached.map(h=>h.id),expectedGrips:to.grips});
   stance=attached;
  }
  return {valid:true,samples:10,viewportWidth:400,moves:path.length-1};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
function labAssertRecoveryDragReference(path){
 const result=labValidateRecoveryDragReference(path);
 if(!result.valid){const error=new CourseGeometryRejection('Recovery-route native drag validation failed.');error.details={inputReferenceValidation:result};throw error;}
 return result;
}

function labRecoverSwitchbackWitness(guide,geometry,free,priorAttempts){
 const attempts=[...priorAttempts],byId=new Map(holds.map(h=>[h.id,h]));
 for(const profile of [{name:'checkpoint-minus40',plane:-40},{name:'checkpoint-minus20',plane:-20}]){
  let current=guide[0],stance=null,joined=[{x:current.x,y:current.y}],searches=[];
  try{
   for(const turn of geometry.turns){
    const target={x:turn.end.x,y:turn.end.y+profile.plane},entryTarget={x:turn.start.x,y:turn.start.y+profile.plane};
    const savedInitial=initialGrips;let continuation;
    try{if(stance)initialGrips=stance;continuation=stance?solveRoute([current,...guide.filter(p=>p.y<current.y)],90):free;}finally{initialGrips=savedInitial;}
    let checkpoint=0;
    if(continuation){for(let i=1;i<continuation.length;i++){if(continuation[i].y<entryTarget.y+100)break;checkpoint=i;}
     if(checkpoint){joined.push(...continuation.slice(1,checkpoint+1));current=joined.at(-1);stance=current.grips.map(id=>byId.get(id));}
    }
    searches.push({phase:'checkpoint',found:!!continuation,nativeMaxMoves:90,prefixMoves:checkpoint,position:{x:current.x,y:current.y},grips:stance?stance.map(h=>h.id):initialGrips.map(h=>h.id)});
    const approachGuide=guide.filter(p=>p.y<current.y&&p.y>entryTarget.y);
    const approach=labSwitchbackSearch([current,...approachGuide,entryTarget],{start:current,stance,limit:10000,maxMoves:32,stop:p=>turn.side*(p.x-W/2)<=-100&&Math.abs(p.y-entryTarget.y)<=30&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax)),accept:p=>p.y>=entryTarget.y-40});
    searches.push({phase:'approach',...approach,path:undefined});if(!approach.found)throw new CourseGeometryRejection('approach');
    joined.push(...approach.path.slice(1));current=joined.at(-1);stance=current.grips.map(id=>byId.get(id));const entry={x:current.x,y:current.y};
    const cross=labSwitchbackSearch([current,{x:turn.end.x,y:entry.y},target],{start:current,stance,limit:10000,maxMoves:24,stop:(p,grips)=>turn.side*(p.x-entry.x)>=200&&grips[0].x<=grips[1].x&&grips[2].x<=grips[3].x,accept:p=>Math.abs(p.y-entry.y)<=40&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax))});
    searches.push({phase:'cross',...cross,path:undefined});if(!cross.found)throw new CourseGeometryRejection('cross');
    joined.push(...cross.path.slice(1));current=joined.at(-1);stance=current.grips.map(id=>byId.get(id));
   }
   const savedInitial=initialGrips;let suffix;
   try{
    initialGrips=stance;suffix=solveRoute([current,...guide.filter(p=>p.y<current.y)],90);searches.push({phase:'goal',guide:'section-guide',nativeMaxMoves:90,found:!!suffix});
    if(!suffix){const goal=holds.find(h=>h.type==='goal');suffix=solveRoute([current,{x:goal.x,y:goal.y+70}],90);searches.push({phase:'goal',guide:'goal-only',nativeMaxMoves:90,found:!!suffix});}
   }finally{initialGrips=savedInitial;}
   if(!suffix)throw new CourseGeometryRejection('goal');joined.push(...suffix.slice(1));const replay=replayRoute(joined);
   if(!replay||!labSwitchbackPathFeatures(replay,geometry).validated)throw new CourseGeometryRejection('full-replay-or-shape');
   attempts.push({variant:profile.name,found:true,searches});return {route:replay,free,freeFeature:free?labSwitchbackPathFeatures(free,geometry):null,variant:profile.name,attempts,variantLimit:4};
  }catch(error){if(!(error instanceof CourseGeometryRejection))throw error;attempts.push({variant:profile.name,found:false,reason:error.message,searches});}
 }
 const error=new CourseGeometryRejection('Bounded search could not validate a 200px switchback and continuous goal route.');error.details={attempts};throw error;
}

function labSwitchbackCompositeGeometry(sectionReports){
 const turns=sectionReports.filter(s=>s.type==='switchback').flatMap(s=>s.sourceReport.switchback.geometry.turns.map(t=>({...t,start:{x:t.start.x,y:t.start.y+s.offsetY},end:{x:t.end.x,y:t.end.y+s.offsetY},sectionIndex:s.index,bounds:s.ownedBounds})));
 return {shapeKind:'composite-switchbacks',swings:turns.length,turns};
}
function labSolveCompositeSwitchbacks(guide,sectionReports){return labBuildSwitchbackWitness(guide,labSwitchbackCompositeGeometry(sectionReports));}
function labCompositeSwitchbackFeatures(path,sectionReports){return labSwitchbackPathFeatures(path,labSwitchbackCompositeGeometry(sectionReports));}
function labGenerateSwitchbackSkeleton(config,height=null){
 const savedSeed=courseSeed;try{
  courseSeed=()=>config.seed;const h=height??STAGE_CONFIG.lengthRules[{short:0,middle:1,long:2}[config.length]].height,base=height===null?labCreateOriginalLayout(config):labCreateSwitchbackLayout(config,h);
  level=1;difficulty=0;generatedCourse=null;({holds,route,HEIGHT,initialGrips,densityStats}=base);const guide=base.route,geometry=base.switchback,source=holds.map(h=>({...h}));assignWideHolds(guide);
  const witness=labBuildSwitchbackWitness(guide,geometry);route=witness.route;
  const before=routeConsumption(route),initialFeature=labSwitchbackPathFeatures(route,geometry);if(!initialFeature.validated)throw new CourseGeometryRejection('Actual switchback route has insufficient horizontal span.');
  const beforeCount=holds.length;pruneUnusedHolds();densityStats.fixedSupports=2;
  const savedRoute=route,optimized=optimizeRoute(route),feature=labSwitchbackPathFeatures(optimized,geometry),optimizationAccepted=feature.validated;route=optimizationAccepted?optimized:savedRoute;
  finalizeCourseGeneration('basic');if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final switchback contact and budget validation failed.');
  const recoveryDragReference=witness.variantLimit===4?labAssertRecoveryDragReference(route):null;
  const finalFeature=labSwitchbackPathFeatures(route,geometry);if(!finalFeature.validated)throw new CourseGeometryRejection('Final switchback span validation failed.');
  labSkeletonReport={type:'switchback',length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:geometry.side<0?'left':'right',routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,contrast:null,optimizationAccepted,switchback:{geometry,features:finalFeature,...(recoveryDragReference?{recoveryDragReference}:{}),unconstrained:{scope:'pre-prune-source-holds',found:!!witness.free,moves:witness.free?routeConsumption(witness.free):null,features:witness.freeFeature,path:witness.free,finalReplay:witness.free?replayRoute(witness.free):null},optimization:{accepted:optimizationAccepted,moves:routeConsumption(optimized),features:feature,path:optimized},variant:witness.variant,attempts:witness.attempts,placementGuide:guide.map(p=>({x:p.x,y:p.y})),phaseMaxTransitions:10000,approachMaxMoves:32,crossMaxMoves:24,suffixMaxMoves:90,variantLimit:witness.variantLimit??2},placement:{engine:'original-createStageGenerator',placedHolds:source.length,scatteredHolds:source.filter(h=>h.row===null).length,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations,pruneRemoved:beforeCount-holds.length,layoutFingerprint:source.map(h=>[h.id,h.x,h.y,h.type,h.row]),coordinatesMapped:false,extraIds:[]}};
  return labSkeletonReport;
 }catch(e){labSkeletonReport=null;generatedCourse=null;throw e;}finally{courseSeed=savedSeed;}
}

function labGenerateSkeleton(config) {
 if(config.composition!==undefined||config.secondType!==undefined){
  if(config.composition!=='pair'||!['middle','long'].includes(config.length)||!['straight','meander','branch','contrast','switchback'].includes(config.type)||!['straight','meander','branch','contrast','switchback'].includes(config.secondType)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Invalid two-section configuration; use middle/long and two valid profiles.');
  return labGenerateCompositeSkeleton(config);
 }
 if(config.type==='switchback')return labGenerateSwitchbackSkeleton(config);
 if(config.type==='contrast')return labGenerateContrastSkeleton(config);
 if(config.type==='branch')return labGenerateBranchSkeleton(config);
 const generated=labCreateOriginalLayout(config);
 // The legacy solver requires a traverse for normal non-intro stages. Keep that
 // for the existing meander, waive only for the straight/branch experiment.
 level=config.type==='meander'?2:1;difficulty=0;generatedCourse=null;
 ({holds,route,HEIGHT,initialGrips,densityStats}=generated);
 const placedHolds=holds.length,scatteredHolds=holds.filter(h=>h.row===null).length;
 const layoutFingerprint=holds.map(h=>[h.id,h.x,h.y,h.type,h.row]);
 assignWideHolds(route);
 const solved=solveRoute(route);
 if(!solved)throw new CourseGeometryRejection('Original placement route validation failed at this seed.');
 route=solved;
 const before=routeConsumption(route);
 pruneUnusedHolds();
 densityStats.fixedSupports=2;
 route=optimizeRoute(route);
 // Keep original no-feature finalization (recipe binding, resource replay and
 // density stats), rather than replacing it with a solver-only success flag.
 finalizeCourseGeneration('basic');
 if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final layout contact and stamina validation failed.');
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,
  orientation:config.type==='straight'?(['left','vertical','right'][labStraightDirection(config.seed)+1]):null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,optimizationAccepted:true,
  placement:{engine:'original-createStageGenerator',placedHolds,scatteredHolds,densityInitial:densityStats.initialTotal,densityRemoved:densityStats.iterations,pruneRemoved:densityStats.routeRemoved,layoutFingerprint}};
 return labSkeletonReport;
}
// Pickups are a post-process only: the original heart-free route, holds and
// moves+3 budget are already final. No recipe finalizer/search runs after this.
function labPrepareHearts(config){
 const keys=['heartsFirst','heartsSecond'],specified=keys.some(key=>Object.prototype.hasOwnProperty.call(config,key));
 for(const key of keys)if(Object.prototype.hasOwnProperty.call(config,key)&&(!Number.isInteger(config[key])||config[key]<0||config[key]>3))throw Error('Each section heart cap must be an integer from 0 to 3.');
 labHeartsCache=[];
 if(generatedCourse)generatedCourse.hearts=[];
 if(labSkeletonReport)delete labSkeletonReport.hearts;
 if(!specified)return null;
 const requested={first:config.heartsFirst??0,second:config.heartsSecond??0},moves=route.length-1,budget=routeStamina(route);
 // v6 allows a single pickup across the whole short course, not one per half.
 if(config.length==='short'&&requested.first+requested.second>1)throw Error('Short course heart caps must total at most 1.');
 const disabledReason=null,effectiveRequested=requested;
 const split=labSkeletonReport?.composition?{kind:'composition-seam',y:labSkeletonReport.composition.junction.seam}:{kind:'reference-move-halves',move:Math.floor(moves/2)};
 if(split.kind==='composition-seam'&&!Number.isFinite(split.y))throw Error('Heart section boundary is invalid.');
 const regionFor=(p,step)=>split.kind==='composition-seam'?(p.y>=split.y?'first':'second'):(step<=split.move?'first':'second');
 const minimumDistance=2*HEART_CONFIG.radius+4,candidateStepLimit=16,placements=[],regions={};
 // Native choice hearts end no later than floor(moves*2/3) (two pickups).
 // Retain that global latest deadline for the expanded per-half caps; never
 // apply it independently to the second half or stretch it with the new count.
 const latestReferenceStep=Math.floor(moves*2/3);
 // Unlike makeRouteHearts' global random count/deadlines, each requested half
 // has a seeded ordering of its reference body positions. This limited count
 // extension restores the native latest route deadline, but does not add a
 // budget deadline or reduce the already-fixed initial budget.
 for(const [region,salt] of [['first',0],['second',0x7C1A83D5]]){
  const random=mulberry32(config.seed^0x48EA27B1^salt);
  const eligible=route.slice(1,-1).map((p,i)=>({p,step:i+1})).filter(v=>v.step<=latestReferenceStep&&regionFor(v.p,v.step)===region);
  const ordered=eligible.map(v=>({...v,key:random()})).sort((a,b)=>a.key-b.key||a.step-b.step);
  let checked=0,reachabilityCalls=0,actual=0;const rejected={ownership:0,witnessOwnership:0,overlap:0,onReferenceOffset:0,unreachable:0,lateWitness:0};
  for(const {p,step} of ordered.slice(0,candidateStepLimit)){
   if(actual>=effectiveRequested[region])break;
   checked++;
   const from=route[step-1],length=distance(from,p)||1,dx=-(p.y-from.y)/length,dy=(p.x-from.x)/length;
   for(const offset of [48,-48,64,-64,0]){
    const point={x:offset?clamp(p.x+dx*offset,30,W-30):p.x,y:offset?clamp(p.y+dy*offset,80,HEIGHT-40):p.y};
    if(regionFor(point,step)!==region){rejected.ownership++;continue;}
    if(placements.some(h=>distance(h,point)<minimumDistance-1e-9)){rejected.overlap++;continue;}
    const onReference=route.slice(1).some((q,i)=>typeof fingerAimEnabled==='function'&&fingerAimEnabled()?fingerRouteTouchesHeart(route[i],q,point):torsoTouchesHeart(route[i],q,point));
    if(offset&&onReference){rejected.onReferenceOffset++;continue;}
    reachabilityCalls++;
    const reachable=findCourseHeartMove(point,route);
    if(!reachable){rejected.unreachable++;continue;}
    const fromStep=route.indexOf(reachable.from);
    if(fromStep<0)throw Error('Heart reachability witness does not reference the expected route.');
    if(fromStep>latestReferenceStep){rejected.lateWitness++;continue;}
    if(regionFor(reachable.from,fromStep)!==region){rejected.witnessOwnership++;continue;}
    let contactIds=fromStep?[...route[fromStep].grips]:initialGrips.map(h=>h.id);
    if(!fromStep){const orderedInitial=[...initialGrips];for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>orderedInitial[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>orderedInitial[i]=sorted[j]);}contactIds=orderedInitial.map(h=>h.id);}
    placements.push({id:placements.length,region,referenceStep:step,offset,offReference:!onReference,...point,
     witness:{fromStep,from:{x:reachable.from.x,y:reachable.from.y},to:{x:reachable.to.x,y:reachable.to.y},anchor:[...reachable.anchor],grips:contactIds,...(reachable.action?{action:reachable.action,trace:reachable.trace}: {})}});
    actual++;break;
   }
  }
  regions[region]={eligibleSteps:eligible.map(v=>v.step),candidateStepsChecked:checked,candidateStepLimit,reachabilityCalls,actual,requested:effectiveRequested[region],shortfall:effectiveRequested[region]-actual,rejected,
   shortageReason:actual<effectiveRequested[region]?(ordered.length>candidateStepLimit?'bounded-candidate-search-exhausted':'eligible-candidates-exhausted'):null};
 }
 labHeartsCache=placements.map(({id,x,y})=>({id,x,y,collected:false}));
 // Keep the native recipe and reset's visible pickup list identical even when
 // meander's internal level is2 but reset was called with1. Classification in
 // densityStats remains the already-completed heart-free reference analysis.
 if(generatedCourse)generatedCourse.hearts=labHeartsCache.map(h=>({...h}));
 const report={requested,effectiveRequested,disabledReason,actual:{first:regions.first.actual,second:regions.second.actual,total:placements.length},shortfall:{first:regions.first.shortfall,second:regions.second.shortfall},split,
  recovery:HEART_CONFIG.recovery,budgetBefore:budget,budgetAfter:routeStamina(route),budgetFixed:true,referenceMoves:moves,
  lateClimbGuard:{kind:'global-reference-step-deadline',latestReferenceStep,numerator:2,denominator:3,source:'native-choice-maximum-count-two',scope:'reference-step-and-witness; not-spatial-goal-distance'},
  placementStage:'after-heart-free-finalization',selection:'seeded-reference-steps-per-region',seedSalt:0x48EA27B1,secondRegionSalt:0x7C1A83D5,
  offsets:[48,-48,64,-64],fallback:'original-reference-body-point',minimumDistance,candidateStepLimit,reachabilityChecksPerCandidate:COURSE_GENERATION_CONFIG.heartPlacementChecks,
  reachabilityScope:'reachable-drag-from-reference-stance; release-or-return-not-required',completionAfterDetourGuaranteed:false,classificationScope:'heart-free-reference',regions,placements};
 if(labSkeletonReport)labSkeletonReport.hearts=report;
 return report;
}
// Independent seeded draws run only after the final pickup list exists. This
// changes the live initial allowance, never routeStamina or generation budgets.
// Keep the same stage-selected bonus for the base budget. The reduction cap is
// 2N+1, independent of that bonus. Zero pickups still draw zero reduction.
function labHeartStaminaAdjustment(seed,heartCount,baseBudget,bonus=LabStaminaSettings.DEFAULT_BONUS){
 if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isInteger(heartCount)||heartCount<0||heartCount>6||!Number.isFinite(baseBudget)||!Number.isSafeInteger(bonus)||bonus<0||!Number.isSafeInteger(heartCount*2+bonus))throw Error('Invalid stamina adjustment configuration.');
 const seedSalt=0x59D2F6A7,random=mulberry32(seed^seedSalt);
 const draws=Array.from({length:heartCount},()=>2+Math.floor(random()*2));
 const rawReduction=draws.reduce((sum,n)=>sum+n,0),cap=heartCount*2+1,appliedReduction=Math.min(rawReduction,cap);
 const initialStamina=baseBudget-appliedReduction;
 return {heartCount,draws,rawReduction,cap,appliedReduction,baseBudget,initialStamina,seedSalt,
  distribution:'independent-uniform-integers-2-to-3',allHeartsRecovery:heartCount*HEART_CONFIG.recovery,
  allHeartsReferenceRemainder:bonus+heartCount*HEART_CONFIG.recovery-appliedReduction,
  startAllowed:initialStamina>0,placementStage:'after-final-heart-placement',
  scope:'arithmetic-only; pickup-access-and-clear-not-guaranteed'};
}
function labPrepareStaminaAdjustment(config){
 const setting=LabStaminaSettings.normalize(config),h=labSkeletonReport?.hearts;
 const referenceValidationBudget=routeStamina(route),baseBudget=routeExpectedMoves(route)+setting.bonus;
 if(!Number.isSafeInteger(baseBudget))throw Error('Base stamina exceeds the safe integer range.');
 const adjustment=labHeartStaminaAdjustment(config.seed,labHeartsCache?.length??0,baseBudget,setting.bonus);
 labStaminaCache=adjustment;labSkeletonReport.budget=baseBudget;
 if(h){
  h.budgetBefore=baseBudget;h.staminaAdjustment=adjustment;h.budgetAfter=adjustment.initialStamina;
  h.referenceBudgetFixed=true;h.budgetFixed=adjustment.appliedReduction===0;
 }
 if(setting.explicit){
  const {explicit,...resolved}=setting;
  if(h)h.referenceValidationBudget=referenceValidationBudget;
  labSkeletonReport.stamina={...resolved,referenceValidationBudget,baseBudget,adjustment};
  labSkeletonReport.budget=baseBudget;
 }
 return adjustment;
}

// Explicit production boundary. The extracted solver uses tutorial identities
// internally; neither those identities nor a failed partial layout may leak to
// progression, daily rewards, ranking, preview or a later retry.
function generateCourseFromRecipe(recipe) {
 if(!recipe||!['number','string'].includes(typeof recipe.seed)||!/^\d{1,10}$/.test(String(recipe.seed))||Number(recipe.seed)>4294967295)throw Error('Invalid course recipe seed');
 const config={...recipe,seed:Number(recipe.seed)};
 const hasActiveGeneration=typeof activeCourseGeneration!=='undefined';
 const previousActiveGeneration=hasActiveGeneration?activeCourseGeneration:null;
 const saved={level,difficulty,dailyRun,courseMode,courseSeed,holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,
  labSkeletonReport,labHeartsCache,labStaminaCache};
 const immutable=value=>{
  if(value&&typeof value==='object'){Object.values(value).forEach(immutable);Object.freeze(value);}
  return value;
 };
 const copy=value=>immutable(JSON.parse(JSON.stringify(value)));
 try {
  if(hasActiveGeneration)activeCourseGeneration=null;
  level=1;difficulty=0;dailyRun=null;courseMode='existing';courseSeed=()=>config.seed;
  labHeartsCache=null;labStaminaCache=null;labSkeletonReport=null;generatedCourse=null;
  const build=()=>{labGenerateSkeleton(config);labPrepareSpikes(config);labPrepareHearts(config);labPrepareStaminaAdjustment(config);};
  if(typeof SixPairSelection==='undefined')build();else SixPairSelection.withBaseline(build);
  if(generatedCourse)Object.assign(generatedCourse,{level:saved.level,difficulty:saved.difficulty,mode:saved.courseMode,seed:config.seed,holds});
  return Object.freeze({recipe:copy(config),report:copy(labSkeletonReport),hearts:copy(labHeartsCache),stamina:copy(labStaminaCache)});
 } catch(error) {
  ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,labSkeletonReport,labHeartsCache,labStaminaCache}=saved);
  throw error;
 } finally {
  ({level,difficulty,dailyRun,courseMode,courseSeed}=saved);
  if(hasActiveGeneration)activeCourseGeneration=previousActiveGeneration;
 }
}


// js/course-adoption.js
'use strict';
// Production-only adapter. Does not replace persistence, network, UI, rewards,
// normal retry/navigation, native services or player identity.
const COURSE_STAMINA_CONFIG = {version:'1', rules:'0:3'};
// Versioned geometry-only retry policy: original seed counts as attempt 1.
// The core already bounds each search; this cap also bounds the outer retry.
const COURSE_RETRY_CONFIG = Object.freeze({version:'1',maxAttempts:32});
let activeCourseGeneration = null;
// Session-only validated geometry. No storage, account, reward or live run state.
// Bump this schema when adding generation inputs or changing the snapshot shape.
const ADOPTED_COURSE_CACHE_VERSION='2';
const ADOPTED_COURSE_CACHE_CAPACITY=12;
const adoptedCourseCache=new Map();
const adoptedCourseFunctionIds=new WeakMap();
let adoptedCourseNextFunctionId=1;
let adoptedCourseLastSignature=null;
function clearAdoptedCourseCache(){
    adoptedCourseCache.clear();
    if(typeof stagePreviewCache!=='undefined')stagePreviewCache.clear();
}
function refreshAdoptedCourseCacheDependencies(){
    const signature=adoptedCourseCacheSignature();
    if(signature!==adoptedCourseLastSignature){
        clearAdoptedCourseCache();adoptedCourseLastSignature=signature;
    }
    return signature;
}
function adoptedCourseClone(value,seen=new Map()) {
    if(!value||typeof value!=='object')return value;
    if(seen.has(value))return seen.get(value);
    const copy=Array.isArray(value)?[]:{};seen.set(value,copy);
    for(const key of Object.keys(value))copy[key]=adoptedCourseClone(value[key],seen);
    return copy;
}
function freezeAdoptedCourse(value,seen=new Set()) {
    if(!value||typeof value!=='object'||seen.has(value))return value;
    seen.add(value);Object.values(value).forEach(item=>freezeAdoptedCourse(item,seen));
    return Object.freeze(value);
}
function adoptedCourseCacheInputs() {
    // Historical baseline fixtures intentionally omit the new input modules.
    // Keep their uncached generation path unchanged, including injected hooks.
    if(typeof fingerAimEnabled!=='function'||!fingerAimEnabled()||
        typeof coupledBodyEnabled!=='function'||!coupledBodyEnabled())return null;
    // Reference identities invalidate hot-swapped test/diagnostic hooks, including
    // lower-level physics and solver helpers, before a hit can skip validation.
    const inputs=[ADOPTED_COURSE_CACHE_VERSION,COURSE_VERSION,DAILY_COURSE_VERSION,
        LAB_SKELETON_VERSION,FINGER_AIM_MODEL,COUPLED_BODY_MODEL,COUPLED_BODY_CONFIG,
        fingerAimEnabled(),coupledBodyEnabled(),fingerRouteSearchStrategy,fingerInputIdentity(),fingerAimGain(),W,H,R,MAX_HEIGHT,STAGE_SAFE_WIDTH,
        TORSO,LIMB_LENGTHS,limbs,POSE_CONFIG,HIGH_FOOT_REACH_RATIO,HOLD_SPACING,
        STAGE_CONFIG,DIFFICULTY_CONFIG,DIFFICULTY_RULES,COURSE_TYPES,HOLD_CONFIG,
        DENSITY_CONFIG,HEART_CONFIG,HAZARD_CONFIG,INPUT_CONFIG,CAMERA_CONFIG,
        COURSE_GENERATION_CONFIG,ROUTE_COST_SEARCH_CONFIG,ROUTE_OPTIMIZATION_CONFIG,
        CourseProgressionConfig,CourseDistributionConfig,COURSE_STAMINA_CONFIG,
        COURSE_RETRY_CONFIG,STRAIGHT_SUPPORT_CONFIG,labHasStraightProfile,labStraightSupportOwned,labStraightSupportDistance,labStraightSupportIds,labRecordStraightSupports,labTrimStraightSupports,labHalfStraightSupportSelection,labThinStraightSupports,CourseProgression,CourseDistribution,LabStaminaSettings,
        mulberry32,gripAim,isTraverse,insideStartTriangle,weightedItemId,
        difficultyRule,courseTypeDefinitions,courseTypeRule,courseTypeLabel,weightedCourseType,
        validateCourseDistribution,stageDistribution,dailyDistribution,generationTypeForScore,courseTypeForStage,
        difficultyForStage,makeStageCourse,stageLengthRule,courseLengthLabel,stageLayout,
        resolvedCourseLengthInfo,stageLengthInfo,createStageGenerator,fingerAimEnabled,fingerAimGain,
        withFingerAimDisabled,fingerInputIdentity,fingerAimTarget,fingerAction,validFingerAction,
        fingerGestureStep,fingerGestureReplay,coupledBodyEnabled,coupledInputPath,coupledSupportGeometry,
        coupledBodyStep,coupledGestureReplay,fingerRouteInitial,fingerRouteAction,fingerResampledAction,
        fingerRouteSampleStable,fingerRouteEntry,fingerRouteTraceMask,fingerRouteTouchesHeart,fingerReplayRoute,
        fingerSamePairRoute,fingerRouteCandidates,fingerRouteProgress,withFingerRouteSearchStrategy,fingerPartialSearchBounded,fingerPartialSearch,fingerSolveRoute,
        fingerSolveCostRoute,fingerOptimizeRoute,fingerValidateDragReference,fingerFindCourseHeartMove,fingerFindHazardMove,
        requiresLegacyTraverse,solveRoute,replayRoute,optimizeRoute,prepareStage,
        samePairRoute,pruneUnusedHolds,updateStageDensity,assignWideHolds,hasHazardFallbackCandidates,
        reserveDenseCandidates,solveCostRoute,validateRouteBudget,bitCount,coursePickupMask,
        routeResources,findCourseHeartMove,bindCourseRecipe,
        snapshotCourse,restoreCourse,classifyCourse,finalizeCourseGeneration,
        findHazardMove,addHazardHolds,convertDenseHazards,classifyNativeCourseGeometryRejection,
        labPrepareSpikes,labStraightDirection,labCreateOriginalLayout,labReplayPartial,labPartialSearch,
        labColumnPartialSearch,labColumnNaturalScatter,labColumnSideSearch,labColumnOffsets,labGenerateBranchSkeleton,
        labContrastGuideCenter,labContrastSpreadMetrics,labContrastProtectedSample,labGenerateContrastSkeleton,labCompositeOriginalLayout,
        labRepairBranchJoin,labGenerateCompositeSourceSkeleton,labGenerateCompositeSkeleton,labSwitchbackSearch,labCreateSwitchbackLayout,labSwitchbackPathFeatures,
        labBuildSwitchbackWitness,labValidateRecoveryDragReference,labAssertRecoveryDragReference,labRecoverSwitchbackWitness,labSwitchbackCompositeGeometry,
        labSolveCompositeSwitchbacks,labCompositeSwitchbackFeatures,labGenerateSwitchbackSkeleton,labGenerateSkeleton,labPrepareHearts,
        labHeartStaminaAdjustment,labPrepareStaminaAdjustment,generateCourseFromRecipe,courseSeed,cameraTop,
        limbReachable,supportMotionFraction,supportPairReach,movingLimbHasForwardHold,goalSupportDistance,
        selectAnchor,selectAnchorBaseline,
        ...(typeof SixPairSelection!=='undefined'?[SixPairSelection.select,SixPairSelection.plan]:[]),canShareHold,attachMoving,stageStamina,newHazardContacts,
        routeHazardCosts,routeMoveCost,routeConsumption,routeExpectedMoves,routeStamina,
        createHearts,makeRouteHearts,torsoTouchesHeart,limbRoot,bothHandsOnGoal,
        sameContacts,isSupportPair,supportsReachable,
        adoptedCourseCacheInputs,adoptedCourseRequest,adoptedCourseSnapshot,
        adoptedCourseCacheKey,cacheAdoptedCourseSnapshot,restoreAdoptedCourseCache,
        adoptedCourseClone,freezeAdoptedCourse,prepareAdoptedCourse,
        coursePreparationIdentity,coursePreparationRuntimeConfig,validatePreparedCourse,assertPreparedCourse,
    ];
    return inputs;
}
function adoptedCourseCacheSignature() {
    const inputs=adoptedCourseCacheInputs();
    if(inputs===null)return null;
    return JSON.stringify(inputs,(_key,value)=>{
        if(typeof value!=='function')return value;
        if(!adoptedCourseFunctionIds.has(value))adoptedCourseFunctionIds.set(value,adoptedCourseNextFunctionId++);
        return {courseFunction:adoptedCourseFunctionIds.get(value)};
    });
}
// Shared, state-free identity used by previews, the worker and launch leases.
function resolveDebugScoreCourse(profile){
    if(!Number.isInteger(profile.score)||profile.score<1||profile.score>100||profile.seed!==profile.score+10)throw new RangeError('Invalid debug score');
    return {kind:'debug-score',score:profile.score,seed:profile.seed,difficultyLabel:CourseProgression.labelForScore(profile.score),progressionVersion:CourseProgressionConfig.version};
}
function adoptedCourseRequest(n,profile=null) {
    const resolved=profile?.kind==='score'?resolveDebugScoreCourse(profile):profile?CourseProgression.resolveDaily(profile.date):CourseProgression.resolveStage(n);
    const typeId=profile?.typeId??courseTypeForStage(n);
    return {level:n,difficulty:courseTypeRule(typeId).generationDifficulty,courseTypeId:typeId,
        mode:'existing',date:profile?.date??null,resolved,
        sampled:{...CourseProgression.recipe(resolved),stage:profile && profile.kind!=='score'?1:n,staminaRules:COURSE_STAMINA_CONFIG.rules}};
}
function adoptedCourseCacheKey(request,signature=refreshAdoptedCourseCacheDependencies()) {
    return signature===null?null:JSON.stringify([signature,request.resolved,request.sampled,
        request.level,request.difficulty,request.courseTypeId,request.mode,request.date]);
}
function adoptedCourseSnapshot() {
    return {holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,
        activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
}
function cacheAdoptedCourseSnapshot(key,snapshot) {
    if(key===null)return;
    adoptedCourseCache.delete(key);
    if(adoptedCourseCache.size>=ADOPTED_COURSE_CACHE_CAPACITY)
        adoptedCourseCache.delete(adoptedCourseCache.keys().next().value);
    adoptedCourseCache.set(key,snapshot);
}
let adoptedCourseLaunchLease=null;
function restoreAdoptedCourseCache(snapshot) {
    // Clone the whole graph so shared holds/report nodes remain shared within
    // this generation, but never with another run or the frozen cache entry.
    const fresh=adoptedCourseClone(snapshot);
    ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,
        activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=fresh);
    Object.freeze(activeCourseGeneration.recipe);Object.freeze(activeCourseGeneration.retry);
    if(generatedCourse)generatedCourse.holds=holds;
}

function prepareAdoptedCourse() {
    if(adoptedCourseLaunchLease) {
        assertPreparedCourse(adoptedCourseLaunchLease,level,activeDebugScoreTrial()?debugCourseTrial:dailyRun);
        restoreAdoptedCourseCache(adoptedCourseLaunchLease.snapshot);
        if(dailyRun)dailyRun.seed=adoptedCourseLaunchLease.request.resolved.seed;
        return;
    }
    const resolved=activeDebugScoreTrial()?resolveDebugScoreCourse(debugCourseTrial):
        dailyRun?CourseProgression.resolveDaily(dailyRun.date):CourseProgression.resolveStage(level);
    // Sample exactly once. Never let a rejected placement resample its score,
    // length, profiles/composition, heart caps, spikes or stamina bonus rules.
    const sampled=Object.freeze({...CourseProgression.recipe(resolved),stage:dailyRun?1:level,
        staminaRules:COURSE_STAMINA_CONFIG.rules});
    const identity={level,difficulty,courseTypeId,courseSeed};
    const previous={holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,hearts,
        activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
    const restorePrevious=()=>{
        ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,hearts,
            activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=previous);
    };
    try {
        const signature=refreshAdoptedCourseCacheDependencies();
        const cacheKey=signature===null?null:JSON.stringify([signature,resolved,sampled,
            identity.level,identity.difficulty,identity.courseTypeId,courseMode,dailyRun?.date??null]);
        if(cacheKey!==null&&adoptedCourseCache.has(cacheKey)) {
            const snapshot=adoptedCourseCache.get(cacheKey);
            restoreAdoptedCourseCache(snapshot);
            adoptedCourseCache.delete(cacheKey);adoptedCourseCache.set(cacheKey,snapshot);
            if(dailyRun)dailyRun.seed=resolved.seed;
            return;
        }
        let failure;
        for(let attempt=0;attempt<COURSE_RETRY_CONFIG.maxAttempts;attempt++) {
            restorePrevious();
            ({level,difficulty,courseTypeId}=identity);
            activeCourseGeneration=null;generatedCourse=null;
            labSkeletonReport=null;labHeartsCache=null;labStaminaCache=null;
            const geometrySeed=(resolved.seed+attempt)>>>0;
            const recipe=Object.freeze({...sampled,seed:geometrySeed});
            const retry=Object.freeze({version:COURSE_RETRY_CONFIG.version,initialSeed:resolved.seed,
                geometrySeed,attempts:attempt+1,maxAttempts:COURSE_RETRY_CONFIG.maxAttempts});
            courseSeed=()=>geometrySeed;
            try {
                // All placement/postprocessing randomness uses the same effective
                // seed. The core's temporary level 1/2 and difficulty 0 may not
                // escape to stage/day identity, score records or progression.
                const build=()=>{
                    labGenerateSkeleton(recipe);
                    labPrepareSpikes(recipe);
                    labPrepareHearts(recipe);
                    labPrepareStaminaAdjustment(recipe);
                };
                // Generation and its recorded witnesses intentionally retain the
                // baseline selection model. A changed live input direction alone
                // is not a reason to reject/reseed an otherwise valid layout.
                // Alternative live input is verified separately, not searched here.
                if(typeof SixPairSelection==='undefined')build();
                else SixPairSelection.withBaseline(build);
            } catch(error) {
                // Configuration/programming failures must not be disguised as a
                // rejected seed. Only explicitly classified finite rejections retry.
                if(!(error instanceof CourseGeometryRejection))throw error;
                failure=error;
                if(attempt+1<COURSE_RETRY_CONFIG.maxAttempts)continue;
                const exhausted=new Error('Course generation exhausted '+retry.attempts+
                    ' deterministic seed attempts: '+failure.message,{cause:failure});
                exhausted.code='COURSE_GENERATION_EXHAUSTED';exhausted.retry=retry;
                throw exhausted;
            }
            activeCourseGeneration={resolved,recipe,retry,report:labSkeletonReport,
                initialStamina:labStaminaCache.initialStamina};
            if(generatedCourse)Object.assign(generatedCourse,{level:identity.level,difficulty:identity.difficulty,
                typeId:identity.courseTypeId,holds,seed:resolved.seed,geometrySeed,
                generationRetryVersion:retry.version,mode:'existing',generationScore:resolved.score});
            // Capture only after every validation/postprocess succeeds. Live
            // hearts and resources are deliberately left to the normal reset.
            if(cacheKey!==null) {
                const snapshot=freezeAdoptedCourse(adoptedCourseClone(adoptedCourseSnapshot()));
                cacheAdoptedCourseSnapshot(cacheKey,snapshot);
            }
            if(dailyRun)dailyRun.seed=resolved.seed;
            return;
        }
    } catch(error) {
        restorePrevious();
        throw error; // Existing normal/Daily launch handlers show failure, not another recipe.
    } finally {
        ({level,difficulty,courseTypeId,courseSeed}=identity);
    }
}
function currentCourseInitialStamina() {
    return activeCourseGeneration?activeCourseGeneration.initialStamina:routeStamina(route);
}


// js/tutorial-course.js
'use strict';
// Authored, isolated STAGE 0. No normal/Daily generator or RNG is changed.
const TUTORIAL_COURSE_CONFIG=Object.freeze({version:'2',seed:0,height:700,centerHoldId:null,extraStamina:5});
function tutorialCourseHolds(){
    return [
        {x:130,y:650,type:'start'},{x:270,y:650,type:'start'},
        {x:200,y:492,type:'start',wide:true},
        // Ordinary holds alternate sides in a single ascending sequence.
        {x:150,y:460,type:'normal'},{x:250,y:420,type:'normal'},
        {x:150,y:380,type:'normal'},{x:250,y:340,type:'normal'},
        {x:150,y:300,type:'normal'},{x:250,y:260,type:'normal'},
        {x:150,y:220,type:'normal'},{x:250,y:180,type:'normal'},
        {x:150,y:140,type:'normal'},
        {x:208,y:40,type:'goal'}
    ].map((hold,id)=>({...hold,id,row:null}));
}
// Fixed authored explicit gestures for the formal 1.5× limb aiming controls.
// Both support-constrained body motion and live sampled input are replayed.
function tutorialFingerAuthoredRoute(){
    return [{"x":200,"y":560},
        {"x":193.3872215243139,"y":519.6867277989843,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-30,"dy":-90}]}},
        {"x":190.77477265772333,"y":398.18175619538084,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-2.0744142640695316,"dy":-126.2232427922086}]}},
        {"x":200,"y":347.8334617360803,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-3.943744368834026,"dy":-239.9675954797924}]}},
        {"x":241.8628735511183,"y":196.70613195614658,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":50.05366258171523,"dy":-196.73475775884248}]}},
        {"x":199.99451552612794,"y":160.6043552443149,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":0,"dy":-240}]}},
        {"x":192.1399228197822,"y":156.25110758094036,"action":{"version":1,"model":"finger-origin-v1","gain":1.5,"points":[{"dx":-8.265306415753429,"dy":-31.088151245082557}]}}];
}
function prepareTutorialCourse(){
    const previous={holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,
        hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount};
    try{
        if(W!==400||H!==700)throw Error('Tutorial authored dimensions require review.');
        holds=tutorialCourseHolds();HEIGHT=TUTORIAL_COURSE_CONFIG.height;
        initialGrips=[holds[2],holds[2],holds[0],holds[1]];
        // Mark dedicated mode before replay: real STAGE 0 must not inherit the
        // legacy non-stage-1 traverse constraint. No level/difficulty mutation.
        activeCourseGeneration={tutorial:true,initialStamina:0};
        // Authored offline, then verified with the exact live contact solver.
        // No generation/search, RNG, or fallback is used at runtime.
        const authored=[{x:200,y:560},{x:200,y:540},{x:170,y:450},
            {x:185,y:355},{x:195,y:265},{x:225,y:220},{x:205,y:185},
            {x:265,y:140},{x:235,y:155}];
        const fingerInput=typeof fingerAimEnabled==='function'&&fingerAimEnabled();
        if(fingerInput&&fingerAimGain()!==1.5)throw Error('Tutorial authored input witness requires gain 1.5.');
        const witness=fingerInput?tutorialFingerAuthoredRoute():authored;
        if(fingerInput&&coupledBodyEnabled())for(const p of witness)if(p.action)p.action.bodyMotion=COUPLED_BODY_MODEL;
        route=replayRoute(witness);
        if(!route || route.length!==witness.length)
            throw Error('Tutorial authored route no longer replays.');
        if(fingerInput&&!fingerValidateDragReference(route).valid)throw Error('Tutorial finger drag witness no longer replays.');
        const referenceMoves=routeExpectedMoves(route),normalStamina=stageStamina(referenceMoves);
        const initialStamina=normalStamina+TUTORIAL_COURSE_CONFIG.extraStamina;
        const resources=routeResources(route,{pickups:[],budget:initialStamina});
        if(!resources.valid || resources.pickups || resources.penalties)
            throw Error('Tutorial authored route exceeds its stamina budget.');
        const report={version:TUTORIAL_COURSE_CONFIG.version,seed:TUTORIAL_COURSE_CONFIG.seed,
            type:'straight',length:'short',height:HEIGHT,centerHoldId:TUTORIAL_COURSE_CONFIG.centerHoldId,
            referenceMoves,normalStamina,extraStamina:TUTORIAL_COURSE_CONFIG.extraStamina,initialStamina,
            hearts:0,spikes:0,resources,validated:true,...(fingerInput?{inputModel:'finger-origin-v1',gain:1.5,...(coupledBodyEnabled()?{bodyMotion:COUPLED_BODY_MODEL}:{})}: {})};
        generatedCourse={level:0,seed:TUTORIAL_COURSE_CONFIG.seed,difficulty:0,typeId:0,mode:'tutorial',
            holds,intent:'basic',hearts:[],hazardPlacement:{routeIds:[],optionalIds:[]}};
        activeCourseGeneration={tutorial:true,report,initialStamina};
        hearts=[];labHeartsCache=[];labStaminaCache=null;labSkeletonReport=null;
        densityStats={total:holds.length,coreCount:holds.length,branchCount:0,peak:holds.length,
            fixedSupports:2,routeBudgetValidated:true,hazardCount:0,tutorial:true};
        return report;
    }catch(error){
        ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,
            hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount}=previous);
        throw error;
    }
}


// js/course-preparation.js
'use strict';
// Geometry-only, session-local preparation. Workers never receive player state.
const COURSE_PREPARATION_PROTOCOL=1;
const COURSE_PREPARATION_STARTUP_MS=15000;
let coursePreparationSerial=0;
const coursePreparationJobs=new Set();
function coursePreparationInteractive(){return typeof globalThis.document?.baseURI==='string';}
function coursePreparationError(code,message=code) {const error=new Error(message);error.code=code;return error;}
function coursePreparationText(kind) {
    if(kind==='loading')return gameText("course-preparation.loading");
    if(kind==='retry')return gameText("course-preparation.retry");
    return gameText("course-preparation.error");
}
function coursePreparationPortableSignature() {
    return JSON.stringify(adoptedCourseCacheInputs(),(_key,value)=>typeof value==='function'?String(value):value);
}
function coursePreparationRuntimeConfig() {
    const normalSeedOffset=CourseProgressionConfig.normalSeedOffset??0;
    if(!Number.isSafeInteger(normalSeedOffset)||normalSeedOffset<0||normalSeedOffset>4294967295)
        throw coursePreparationError('COURSE_PREPARATION_CONFIG');
    return {normalSeedOffset};
}
function coursePreparationIdentity(n,profile=null) {
    const request=adoptedCourseRequest(n,profile);
    if(!Number.isSafeInteger(n)||n<1||n>=Number.MAX_SAFE_INTEGER||
        (profile && (n!==(profile.kind==='score'?2:1)||profile.typeId!==generationTypeForScore(request.resolved.score))))
        throw coursePreparationError('COURSE_PREPARATION_REQUEST');
    return request;
}
function validatePreparedCourse(snapshot,request) {
    const fail=()=>{throw coursePreparationError('COURSE_PREPARATION_RESULT');};
    const keys=['holds','route','HEIGHT','initialGrips','densityStats','generatedCourse',
        'activeCourseGeneration','labSkeletonReport','labHeartsCache','labStaminaCache'];
    if(!snapshot || Object.keys(snapshot).sort().join()!==keys.sort().join())fail();
    // Structured-clone messages must contain bounded plain data, never an API,
    // typed payload, nonfinite geometry, or a hidden mutable live-state object.
    const seen=new Set();let count=0;
    const visit=value=>{
        if(value===null || typeof value==='string' || typeof value==='boolean' || typeof value==='undefined')return;
        if(typeof value==='number'){if(!Number.isFinite(value))fail();return;}
        if(typeof value!=='object'||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype))fail();
        if(seen.has(value))return;seen.add(value);if(++count>250000)fail();
        for(const [key,item] of Object.entries(value)){
            if(['__proto__','constructor','prototype'].includes(key))fail();visit(item);
        }
    };visit(snapshot);
    const {holds:h,route:r,initialGrips:g,activeCourseGeneration:a,generatedCourse:c}=snapshot;
    const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
    if(!Array.isArray(h)||h.length<2||h.length>10000||!h.every(p=>point(p)&&Number.isSafeInteger(p.id)&&['start','normal','goal','hazard'].includes(p.type))||
        new Set(h.map(p=>p.id)).size!==h.length||!h.some(p=>p.type==='goal')||
        !Array.isArray(r)||!r.length||r.length>10000||!r.every(point)||
        !Array.isArray(g)||g.length!==4||!g.every(p=>h.includes(p))||
        !Number.isFinite(snapshot.HEIGHT)||snapshot.HEIGHT<=0||
        !a||!a.recipe||!a.retry||a.report!==snapshot.labSkeletonReport||
        !Number.isSafeInteger(a.initialStamina)||a.initialStamina<=0||
        a.initialStamina!==snapshot.labStaminaCache?.initialStamina||
        JSON.stringify(a.resolved)!==JSON.stringify(request.resolved))fail();
    const ids=new Set(h.map(p=>p.id));
    for(const [index,p] of r.entries()){
        if((index || p.grips) && (!Array.isArray(p.grips)||p.grips.length!==4||!p.grips.every(id=>ids.has(id))))fail();
        if(index && (!validFingerAction(p.action)||p.action.bodyMotion!==COUPLED_BODY_MODEL||p.action.gain!==fingerAimGain()||
            !Array.isArray(p.anchor)||p.anchor.length!==2||new Set(p.anchor).size!==2||!p.anchor.every(i=>Number.isInteger(i)&&i>=0&&i<4)||
            !Array.isArray(p.trace)||!p.trace.length||!p.trace.every(point)))fail();
    }
    const retry=a.retry;
    if(retry.version!==COURSE_RETRY_CONFIG.version||retry.initialSeed!==request.resolved.seed||
        !Number.isSafeInteger(retry.attempts)||retry.attempts<1||retry.attempts>COURSE_RETRY_CONFIG.maxAttempts||
        retry.maxAttempts!==COURSE_RETRY_CONFIG.maxAttempts||retry.geometrySeed!==((retry.initialSeed+retry.attempts-1)>>>0)||
        JSON.stringify(a.recipe)!==JSON.stringify({...request.sampled,seed:retry.geometrySeed}))fail();
    if(!c||c.holds!==h||c.level!==request.level||c.difficulty!==request.difficulty||c.typeId!==request.courseTypeId||
        c.seed!==request.resolved.seed||c.geometrySeed!==retry.geometrySeed||c.mode!=='existing'||
        c.generationRetryVersion!==retry.version||c.generationScore!==request.resolved.score||
        !Array.isArray(snapshot.labHeartsCache)||!Array.isArray(c.hearts))fail();
    return snapshot;
}
function assertPreparedCourse(lease,n,profile=null) {
    if(!lease || lease.cancelled || lease.signature!==refreshAdoptedCourseCacheDependencies()||
        JSON.stringify(lease.request)!==JSON.stringify(coursePreparationIdentity(n,profile)))
        throw coursePreparationError('COURSE_PREPARATION_STALE');
    return lease;
}
function withPreparedCourse(lease,n,profile,operation) {
    assertPreparedCourse(lease,n,profile);
    const previous=adoptedCourseLaunchLease;adoptedCourseLaunchLease=lease;
    try{return operation();}finally{adoptedCourseLaunchLease=previous;}
}
function restartPreparedCourse(lease,n,bonus=0,profile=null) {
    return withPreparedCourse(lease,n,profile,()=>restartInput(n,bonus));
}
function prepareCourseAsync(n,profile=null) {
    let request,signature;
    try {request=coursePreparationIdentity(n,profile);signature=refreshAdoptedCourseCacheDependencies();}
    catch(error){return {cancelled:false,cancel(){this.cancelled=true;},promise:Promise.reject(error)};}
    const key=adoptedCourseCacheKey(request,signature),requestId=++coursePreparationSerial;
    const job={requestId,request,signature,cancelled:false,snapshot:null,worker:null};
    let resolve,reject,settled=false,startupTimer=null;
    job.promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const settle=(error,snapshot)=>{
        if(settled)return;settled=true;
        if(startupTimer!==null)clearTimeout(startupTimer);startupTimer=null;
        job.worker?.terminate();job.worker=null;coursePreparationJobs.delete(job);
        if(error){reject(error);return;}
        job.snapshot=snapshot;resolve(job);
    };
    job.cancel=()=>{job.cancelled=true;settle(coursePreparationError('COURSE_PREPARATION_CANCELLED'));};
    coursePreparationJobs.add(job);
    const cached=key===null?null:adoptedCourseCache.get(key);
    if(cached){cacheAdoptedCourseSnapshot(key,cached);settle(null,cached);return job;}
    const build=globalThis.ASCENT_COURSE_BUILD;
    if(signature===null||typeof globalThis.Worker!=='function'||!build?.id){
        settle(coursePreparationError('COURSE_PREPARATION_UNAVAILABLE'));return job;
    }
    try {
        const portable=coursePreparationPortableSignature(),runtime=coursePreparationRuntimeConfig();
        const url=new URL('js/course-worker.js?v='+build.id,globalThis.document.baseURI);
        job.worker=new globalThis.Worker(url,{name:'ascent-course-preparation'});
        startupTimer=setTimeout(()=>settle(coursePreparationError('COURSE_PREPARATION_STARTUP_TIMEOUT')),COURSE_PREPARATION_STARTUP_MS);
        job.worker.onerror=()=>settle(coursePreparationError('COURSE_PREPARATION_WORKER'));
        job.worker.onmessageerror=()=>settle(coursePreparationError('COURSE_PREPARATION_MESSAGE'));
        job.worker.onmessage=event=>{
            if(settled||job.cancelled)return;
            try {
                const result=event.data;
                if(result?.type==='ready') {
                    if(job.ready || result.protocol!==COURSE_PREPARATION_PROTOCOL||result.buildId!==build.id)
                        throw coursePreparationError('COURSE_PREPARATION_MISMATCH');
                    job.ready=true;clearTimeout(startupTimer);startupTimer=null;
                    return;
                }
                if(!job.ready || !result||result.protocol!==COURSE_PREPARATION_PROTOCOL||result.requestId!==requestId||
                    result.buildId!==build.id||result.portable!==portable||JSON.stringify(result.runtime)!==JSON.stringify(runtime)||
                    JSON.stringify(result.request)!==JSON.stringify(request))
                    throw coursePreparationError('COURSE_PREPARATION_MISMATCH');
                assertPreparedCourse(job,n,profile);
                if(result.error)throw coursePreparationError('COURSE_PREPARATION_FAILED',result.error.message);
                const snapshot=freezeAdoptedCourse(validatePreparedCourse(result.snapshot,request));
                cacheAdoptedCourseSnapshot(key,snapshot);settle(null,snapshot);
            } catch(error){settle(error);}
        };
        job.worker.postMessage({protocol:COURSE_PREPARATION_PROTOCOL,buildId:build.id,requestId,request,portable,runtime});
    } catch(error){settle(error);}
    return job;
}

function launchPreparedCourseInput(lease,n,bonus=0,profile=null) {
    if(!lease && !coursePreparationInteractive())return restartInput(n,bonus);
    return restartPreparedCourse(lease,n,bonus,profile);
}
function setCoursePreparationStatus(id,text) {
    const element=typeof document!=='undefined'?document.getElementById(id):null;
    if(element){element.textContent=text;element.hidden=!text;}
}

'use strict';
// This endpoint accepts course identities only, not user/account/run state.
globalThis.onmessage=event=>{
    const input=event.data;
    const response={protocol:COURSE_PREPARATION_PROTOCOL,buildId:globalThis.ASCENT_COURSE_BUILD.id,
        requestId:input?.requestId,request:null,portable:null,runtime:null};
    try {
        if(!input||Object.keys(input).sort().join()!==['protocol','buildId','requestId','request','portable','runtime'].sort().join()||
            input.protocol!==COURSE_PREPARATION_PROTOCOL||input.buildId!==response.buildId||
            !Number.isSafeInteger(input.requestId)||input.requestId<1)
            throw coursePreparationError('COURSE_PREPARATION_REQUEST');
        if(!input.runtime||Object.keys(input.runtime).join()!=='normalSeedOffset'||
            !Number.isSafeInteger(input.runtime.normalSeedOffset)||input.runtime.normalSeedOffset<0||input.runtime.normalSeedOffset>4294967295)
            throw coursePreparationError('COURSE_PREPARATION_CONFIG');
        CourseProgressionConfig.normalSeedOffset=input.runtime.normalSeedOffset;
        response.runtime=coursePreparationRuntimeConfig();response.portable=coursePreparationPortableSignature();
        if(input.portable!==response.portable)throw coursePreparationError('COURSE_PREPARATION_CONFIG');
        const requested=input.request;
        const scoreTrial=requested.resolved?.kind==='debug-score';
        const resolved=scoreTrial?resolveDebugScoreCourse(requested.resolved):requested.date?CourseProgression.resolveDaily(requested.date):CourseProgression.resolveStage(requested.level);
        const profile=scoreTrial?{kind:'score',score:resolved.score,seed:resolved.seed,typeId:generationTypeForScore(resolved.score)}:requested.date?{date:requested.date,typeId:generationTypeForScore(resolved.score)}:null;
        const request=coursePreparationIdentity(requested.level,profile);response.request=request;
        if(JSON.stringify(request)!==JSON.stringify(requested))throw coursePreparationError('COURSE_PREPARATION_REQUEST');
        level=request.level;difficulty=request.difficulty;courseTypeId=request.courseTypeId;
        courseMode='existing';dailyRun=scoreTrial?null:profile;tutorialRun=null;debugCourseTrial=scoreTrial?profile:null;debugMode=debugAttempt=scoreTrial;
        prepareAdoptedCourse();
        response.snapshot=validatePreparedCourse(adoptedCourseSnapshot(),request);
    } catch(error){response.error={code:error?.code||'COURSE_PREPARATION_FAILED',message:String(error?.message||error)};}
    globalThis.postMessage(response);
};

// Report startup separately from potentially long, bounded course searches.
globalThis.postMessage({type:'ready',protocol:COURSE_PREPARATION_PROTOCOL,buildId:globalThis.ASCENT_COURSE_BUILD.id});
