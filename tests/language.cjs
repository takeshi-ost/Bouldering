const fs=require('node:fs'),assert=require('node:assert/strict');
const source=[...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`
const elements={};const document={documentElement:{},getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},events:{},focus(){},setAttribute(){},removeAttribute(){},addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){}
`;
const data={'other.app':'keep'},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]};
const scope={localStorage:storage};
new Function('assert','data','globalThis',env+source+`
const snapshot=()=>JSON.stringify({playerName,playerColors,playerHeadColor,stageProgress,stageRecords,dailyRecords,dailyAttempts,heartItems,lives,playsSinceAd,dailyPlayAdState,level,moveCount,stamina,runElapsedMs,runStartedAt,body,grips,undoSnapshot});
const map=()=>{cancelMapReveal();state='map';ui.titleScreen.hidden=true;ui.levelMap.hidden=false;settingsOpen=false;renderLevelMap();};
assert.equal(GAME_TEXT_LANGUAGE,'ja');assert.equal(ui.languageChoice.value,'ja');
map();setOnlineStatus(gameText('firebase-client.bootFirebase'));ui.mapSettingsButton.onclick();
let before=snapshot();ui.languageChoice.value='en';ui.languageChoice.onchange();
assert.equal(GAME_TEXT_LANGUAGE,'en');assert.equal(data[LANGUAGE_KEY],'en');assert.equal(state,'map');assert(settingsOpen);assert.equal(snapshot(),before);
assert.equal(online.status,'Offline (playing on this device)');assert.equal(ui.playerUuid.textContent,'UID Not connected');
assert.equal(GAMEPLAY_TIPS[1],'Tap your back to undo one move!');assert(ui.mapNodes.innerHTML.includes('Ready to play'));
ui.languageChoice.value='ja';ui.languageChoice.onchange();assert.equal(online.status,'オフライン（端末内でプレイ）');assert.equal(ui.playerUuid.textContent,'UID 未接続');assert.equal(snapshot(),before);
assert.equal(setGameLanguage('xx'),false);assert.equal(GAME_TEXT_LANGUAGE,'ja');
transferState.busy=true;ui.languageChoice.value='en';ui.languageChoice.onchange();assert.equal(ui.languageChoice.value,'ja');assert.equal(GAME_TEXT_LANGUAGE,'ja');transferState.busy=false;
ui.closeSettings.onclick();showDailyCalendar();chooseDailyDate(localToday());
const date=dailySelectedDate,month=dailyMonth;ui.dailySettingsButton.onclick();before=snapshot();ui.languageChoice.value='en';ui.languageChoice.onchange();
assert.equal(dailySelectedDate,date);assert.equal(dailyMonth,month);assert.equal(snapshot(),before);assert.equal(state,'daily');assert(settingsOpen);
assert(ui.dailyMonthTitle.textContent.includes('/'));assert.equal(dailyDateLabel('2026-10-24'),'10/24 (Sat)');assert.equal(dailyResultDateLabel('2026-10-24'),'10/24 (Sat)');
assert.equal(gameText('daily.renderDailyCalendar.9',{value0:1}),'Streak: 1 day');assert.equal(gameText('daily.renderDailyCalendar.9',{value0:2}),'Streak: 2 days');
assert.equal(gameText('daily.renderDailyCalendar.3',{value0:1}),' star · Cannot replay');
showCharacterEditor();const draft=JSON.stringify([ui.playerName.value,draftColors,draftStripeCount]);before=snapshot();setGameLanguage('ja');setGameLanguage('en');
assert.equal(snapshot(),before);assert.equal(JSON.stringify([ui.playerName.value,draftColors,draftStripeCount]),draft);assert(EDITOR_POSES[0].name.includes('Standing'));
assert.equal(formatStageRecord({moves:18,timeMs:1234}),'Moves: 18 00:01:23');
map();dailyRun=null;reset(1);cameraIntro=null;moveCount=1;finish(false);const tip=GAMEPLAY_TIPS.indexOf(ui.resultTipText.textContent);before=snapshot();
setGameLanguage('ja');assert.equal(ui.resultTitle.textContent,'登頂失敗…');assert.equal(ui.resultTipText.textContent,GAMEPLAY_TIPS[tip]);assert.equal(snapshot(),before);
setGameLanguage('en');assert.equal(ui.resultTitle.textContent,'Climb Failed…');assert.equal(ui.retry.textContent,'RETRY');assert.equal(snapshot(),before);
assert.equal(data['other.app'],'keep');
console.log('PASS language: live map/daily settings, retained modal/date/month, persistence, UID/offline status, tips and pose labels, plural dates, unchanged game/profile/inventory/timer, transfer guard and invalid locale');
`)(assert,data,scope);
// Saved language is applied before configuration/initial screen strings are created.
const bootstrap=['text-ja','text-en','text-dev-ja','text','config'].map(f=>fs.readFileSync('js/'+f+'.js','utf8')).join('\n');
assert.equal(new Function('globalThis',bootstrap+';return GAMEPLAY_TIPS[1];')(scope),'Tap your back to undo one move!');
const blocked={localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('quota');}}};
const blockedResult=new Function('globalThis',bootstrap+`;const initial=GAME_TEXT_LANGUAGE;setGameLanguage('en');return [initial,GAME_TEXT_LANGUAGE,gameText('ui.settingsTitle')];`)(blocked);
assert.deepEqual(blockedResult,['ja','en','Settings']);
