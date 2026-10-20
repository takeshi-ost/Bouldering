const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`let clock=1000;const NativeDate=globalThis.Date;const Date=class extends NativeDate {constructor(...args){super(...(args.length?args:['2026-10-20T12:00:00Z']));}static now(){return new NativeDate('2026-10-20T12:00:00Z').getTime();}};const performance={now:()=>clock};
const documentEvents={};const elements={};const document={hidden:false,addEventListener(k,f){(documentEvents[k] ||= []).push(f);},getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(k,f){this.events[k]=f;},setAttribute(){},contains(){return true;},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const timers=new Map();let serial=0;const window={addEventListener(){},devicePixelRatio:1,setTimeout(fn,delay){const id=++serial;timers.set(id,{fn,delay});return id;},clearTimeout(id){timers.delete(id);},cancelAnimationFrame(){}};function requestAnimationFrame(){return ++serial;};`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try {new Function('assert','data',env+source+`
const today=localToday();DIFFICULTY_CONFIG.dailyWeights=[100,0,0,0];
function ad(){clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());}
function land(index){
 rewardSequence.angle=-ROULETTE_SEGMENTS[index].center-ROULETTE_SPEED*ROULETTE_BRAKE_MS/3;rewardSequence.lastTime=clock;
 assert(stopRewardSequence(clock));assert(!stopRewardSequence(clock));clock+=ROULETTE_BRAKE_MS;advanceRewardSequence(clock);
 assert.equal(rewardIndex(rewardSequence.angle),index);assert.equal(rewardSequence.phase,'result');
}
function resultReturn(){assert.equal(rewardSequence.phase,'result');ui.rewardDialog.events.click();}
function visibility(hidden){document.hidden=hidden;for(const fn of documentEvents.visibilitychange||[])fn();}
// Angular area and reward selection share the same 2:2:1:1 geometry.
const counts=[0,0,0,0];
for(let degree=0;degree<360;degree++){
 const index=rewardIndex(-degree-.5);counts[index]++;
 assert.equal(rewardIndex(-degree-.5+720),index);
}
assert.deepEqual(counts,[120,120,60,60]);
assert.deepEqual([0,120,240,300,360].map(degree=>rewardIndex(-degree)),[0,1,2,3,0]);
const originalIcon=createPlayerIcon;
createPlayerIcon=()=>({src:'data:image/png;base64,AAAA'});
const markup=rewardWheelMarkup();
assert.equal((markup.match(/<path /g)||[]).length,4);
assert.equal((markup.match(/<text /g)||[]).length,3,'Life sector has no count');
assert(markup.includes('>01</text>') && markup.includes('>05</text>') && markup.includes('>10</text>'));
assert(markup.includes('<image href="data:image/png;base64,AAAA"'));
createPlayerIcon=originalIcon;
startCourse('existing');
mapPreparing=true;assert(!startRewardSequence());mapPreparing=false;
assert(openStageStart(1));assert(!startRewardSequence());closeStageStart();
for(let index=0;index<4;index++) {
 const before=heartItems;lives.count=3;lives.recoveryAt=null;let grants=0,returns=0;
 assert(startRewardSequence({onGrant:()=>grants++,onReturn:()=>{returns++;state='map';}}));
 assert.equal(state,'reward');assert(!startRewardSequence());assert(!finishRewardSequence());
 land(index);assert.equal(grants,1);assert(ui.rewardResult.innerHTML.includes(index===3?'ライフアップ':'チョークバッグ'));assert(ui.rewardResult.innerHTML.includes('reward-rays'));assert(ui.rewardResult.innerHTML.includes('✖️'+(index===3?1:ROULETTE_OPTIONS[index].amount)));const balance=heartItems,lifeBalance=lives.count;
 assert.equal(balance,before+(ROULETTE_OPTIONS[index].kind==='hearts'?ROULETTE_OPTIONS[index].amount:0));assert.equal(lifeBalance,index===3?4:3);
 clock+=100;advanceRewardSequence(clock);assert.equal(grants,1);assert.equal(heartItems,balance);
 resultReturn();assert.equal(returns,1);assert.equal(state,'map');assert(!rewardSequence);assert(!finishRewardSequence());assert.equal(returns,1);
}
assert.throws(()=>applyRouletteReward({kind:'wrong',amount:1}),TypeError);assert.throws(()=>startRewardSequence({onGrant:null}),TypeError);
lives.count=LIFE_MAX;assert(startRewardSequence());land(3);assert.equal(lives.count,LIFE_MAX);assert(ui.rewardResult.innerHTML.includes('上限'));finishRewardSequence();
lives.count=2;lives.recoveryAt=Date.now()-LIFE_RECOVERY_MS;assert(startRewardSequence());land(3);assert.equal(lives.count,4);assert.equal(rewardSequence.reward.amount,1);finishRewardSequence();
// Hidden screens stop spinning and keep a confirmed result until an explicit tap.
assert(startRewardSequence());clock+=100;advanceRewardSequence(clock);const angle=rewardSequence.angle;
visibility(true);clock+=50000;advanceRewardSequence(clock);assert.equal(rewardSequence.angle,angle);assert.equal(rewardFrame,null);
visibility(false);land(1);clock+=60000;advanceRewardSequence(clock);assert.equal(rewardSequence.phase,'result');assert.equal(state,'reward');
visibility(true);clock+=50000;visibility(false);assert.equal(rewardSequence.phase,'result');assert.equal(rewardFrame,null);resultReturn();
// Even a second-attempt win today gets the completion ad, then exactly one roulette.
lives.count=3;showDailyCalendar({openFromMap:true});assert(selectDailyDate(today));finish(false);ui.retry.onclick();assert.equal(state,'ad');ad();assert.equal(dailyRun.attempt,2);
moveCount=1;finish(true);assert.equal(dailyRecords[today].rewardStatus,'pending');ui.next.onclick();assert.equal(state,'ad');ad();assert.equal(state,'reward');
assert(dailyRecords[today].rewardAdCompleted);const beforeDaily=heartItems;land(2);assert.equal(heartItems,beforeDaily+10);assert.equal(dailyRecords[today].rewardStatus,'claimed');resultReturn();assert.equal(state,'daily');assert.equal(dailyRun,null);
assert.equal(readDailyRecords()[today].rewardStatus,'claimed');assert(!startDailyClearReward(today));assert(!selectDailyDate(today));
// Earlier dates keep their existing flow and never earn this daily completion reward.
assert(selectDailyDate('2026-01-01'));moveCount=1;finish(true);assert(!dailyRecords['2026-01-01'].rewardStatus);ui.next.onclick();ad();assert.equal(state,'daily');assert(!rewardSequence);
// A reload after the ad resumes an unclaimed roulette without another ad.
dailyRecords['2026-10-19']={moves:1,timeMs:100,stars:3,rewardStatus:'pending',rewardAdCompleted:true};saveDailyRecords();dailyRecords=readDailyRecords();showDailyCalendar();assert.equal(state,'reward');assert(!dummyAd);land(0);resultReturn();assert.equal(dailyRecords['2026-10-19'].rewardStatus,'claimed');
// A reload before the ad resumes with the ad still required.
dailyRecords['2026-10-18']={moves:1,timeMs:100,stars:3,rewardStatus:'pending'};saveDailyRecords();dailyRecords=readDailyRecords();showDailyCalendar();assert.equal(state,'ad');ad();land(2);resultReturn();assert.equal(state,'daily');
const saved=data[DAILY_RECORDS_KEY];data[DAILY_RECORDS_KEY]=JSON.stringify({'2026-10-01':{rewardStatus:'pending'},'2026-10-02':{moves:1,timeMs:0,stars:3,rewardStatus:'pending'}});assert.deepEqual(Object.keys(readDailyRecords()),['2026-10-02']);data[DAILY_RECORDS_KEY]=saved;
// Map milestones: fixed stage numbers, one grant, shared goal glints, existing ad interval.
showLevelMap();
assert.equal((ui.mapNodes.innerHTML.match(/map-reward-effects/g)||[]).length,5);assert.equal((ui.mapNodes.innerHTML.match(/map-reward-gift/g)||[]).length,5);
assert(hasMapReward(4));assert(hasMapReward(8));assert(hasMapReward(12));assert(hasMapReward(20));assert(!hasMapReward(9));assert(!hasMapReward(10));
stageProgress.existing.cleared=3;showLevelMap({target:4});assert(selectStage(4));
clearsSinceAd=4;moveCount=1;finish(true);
assert.equal(mapRewards[4].status,'pending');assert(mapRewards[4].adRequired);
ui.next.onclick();assert.equal(state,'ad');ad();assert.equal(state,'reward');assert(mapRewards[4].adCompleted);
const mapBefore=heartItems;land(1);assert.equal(heartItems,mapBefore+5);assert.equal(mapRewards[4].status,'claimed');
assert(!hasMapReward(4));assert(hasMapReward(20));assert.deepEqual(readMapRewards(),mapRewards);
resultReturn();assert.equal(state,'map');assert.deepEqual([mapTransition.from,mapTransition.to],[4,5]);
assert.equal((ui.mapNodes.innerHTML.match(/map-reward-effects/g)||[]).length,4);assert.equal((ui.mapNodes.innerHTML.match(/map-reward-gift/g)||[]).length,4);
advanceLevelMap(clock);advanceLevelMap(clock+MAP_HOP_DURATION);closeStageStart();
assert(selectStage(4));moveCount=1;finish(true);clearsSinceAd=0;ui.next.onclick();assert.equal(state,'map');assert(!rewardSequence);
advanceLevelMap(clock);advanceLevelMap(clock+MAP_HOP_DURATION);closeStageStart();
// The map-return action also delivers rewards; an interrupted ad/roulette resumes on map entry.
stageProgress.existing.cleared=19;showLevelMap({target:20});assert(selectStage(20));
clearsSinceAd=0;moveCount=1;finish(true);ui.mapButton.onclick();assert.equal(state,'reward');land(3);resultReturn();assert.equal(state,'map');assert.equal(mapSelected,20);assert(!mapTransition);
mapRewards[12]={status:'pending',adRequired:true,adCompleted:false};saveMapRewards();mapRewards=readMapRewards();
showLevelMap();assert.equal(state,'ad');ad();assert.equal(state,'reward');
// Simulate reloading before an unclaimed roulette (completed ad must not repeat).
rewardSequence=null;ui.rewardDialog.close();ui.rewardDialog.hidden=true;mapRewards=readMapRewards();showLevelMap();assert.equal(state,'reward');assert(!dummyAd);
land(0);resultReturn();assert.equal(mapRewards[12].status,'claimed');
// Debug and daily wins never earn map milestones.
showLevelMap();debugAttempt=true;level=40;recordMapRewardClear();assert(!mapRewards[40]);debugAttempt=false;
const savedMap=data[MAP_REWARDS_KEY];data[MAP_REWARDS_KEY]=JSON.stringify({'0':{status:'pending'},'11':{status:'pending'},'10':{status:'bad'},'20':{status:'claimed'}});
assert.deepEqual(readMapRewards(),{'20':{status:'claimed',adRequired:false,adCompleted:false}});data[MAP_REWARDS_KEY]=JSON.stringify({'10':{status:'pending',adRequired:true,adCompleted:true},'20':{status:'claimed'}});
assert.deepEqual(readMapRewards(),{'10':{status:'pending',adRequired:true,adCompleted:true},'20':{status:'claimed',adRequired:false,adCompleted:false}});
data[MAP_REWARDS_KEY]=savedMap;
// Generic callers can insert a reward in a playing stage without restarting it.
showLevelMap();assert(selectStage(1));cameraIntro=null;runStartedAt=clock-200;const attempt=lifeAttemptId;
assert(startRewardSequence());assert.equal(runStartedAt,null);land(1);finishRewardSequence();assert.equal(state,'playing');assert.equal(lifeAttemptId,attempt);assert.equal(runTimeMs(),200);
console.log('PASS rewards: all 4 weighted stops, single grant/return, caps, map milestones/glints/recovery, hidden pause, today/past/second-attempt routing, persistence/recovery and generic in-play continuation');
`)(assert,data);}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
