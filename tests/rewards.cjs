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
 rewardSequence.angle=-index*30-ROULETTE_SPEED*ROULETTE_BRAKE_MS/3;rewardSequence.lastTime=clock;
 assert(stopRewardSequence(clock));assert(!stopRewardSequence(clock));clock+=ROULETTE_BRAKE_MS;advanceRewardSequence(clock);
 assert.equal(rewardIndex(rewardSequence.angle),index);assert.equal(rewardSequence.phase,'result');
}
function resultReturn(){const timer=timers.get(rewardReturnTimer);assert(timer);timer.fn();}
function visibility(hidden){document.hidden=hidden;for(const fn of documentEvents.visibilitychange||[])fn();}
startCourse('existing');
mapPreparing=true;assert(!startRewardSequence());mapPreparing=false;
assert(openStageStart(1));assert(!startRewardSequence());closeStageStart();
for(let index=0;index<12;index++) {
 const before=heartItems;lives.count=3;lives.recoveryAt=null;let grants=0,returns=0;
 assert(startRewardSequence({onGrant:()=>grants++,onReturn:()=>{returns++;state='map';}}));
 assert.equal(state,'reward');assert(!startRewardSequence());assert(!finishRewardSequence());
 land(index);assert.equal(grants,1);const balance=heartItems,lifeBalance=lives.count;
 assert.equal(balance,before+(index===11?0:index));assert.equal(lifeBalance,index===11?4:3);
 clock+=100;advanceRewardSequence(clock);assert.equal(grants,1);assert.equal(heartItems,balance);
 resultReturn();assert.equal(returns,1);assert.equal(state,'map');assert(!rewardSequence);assert(!finishRewardSequence());assert.equal(returns,1);
}
assert.throws(()=>applyRouletteReward({kind:'wrong',amount:1}),TypeError);assert.throws(()=>startRewardSequence({onGrant:null}),TypeError);
lives.count=LIFE_MAX;assert(startRewardSequence());land(11);assert.equal(lives.count,LIFE_MAX);assert(ui.rewardResult.textContent.includes('上限'));finishRewardSequence();
lives.count=2;lives.recoveryAt=Date.now()-LIFE_RECOVERY_MS;assert(startRewardSequence());land(11);assert.equal(lives.count,4);assert.equal(rewardSequence.reward.amount,1);finishRewardSequence();
// Hidden screens stop spinning and preserve both brake time and result display time.
assert(startRewardSequence());clock+=100;advanceRewardSequence(clock);const angle=rewardSequence.angle;
visibility(true);clock+=50000;advanceRewardSequence(clock);assert.equal(rewardSequence.angle,angle);assert.equal(rewardFrame,null);
visibility(false);land(5);clock+=400;visibility(true);const remaining=rewardSequence.returnRemaining;assert.equal(remaining,REWARD_RESULT_MS-400);assert.equal(rewardReturnTimer,null);
clock+=50000;visibility(false);assert.equal(timers.get(rewardReturnTimer).delay,remaining);resultReturn();
// Even a second-attempt win today gets the completion ad, then exactly one roulette.
lives.count=3;showDailyCalendar({openFromMap:true});assert(selectDailyDate(today));finish(false);ui.retry.onclick();assert.equal(state,'ad');ad();assert.equal(dailyRun.attempt,2);
moveCount=1;finish(true);assert.equal(dailyRecords[today].rewardStatus,'pending');ui.next.onclick();assert.equal(state,'ad');ad();assert.equal(state,'reward');
assert(dailyRecords[today].rewardAdCompleted);const beforeDaily=heartItems;land(10);assert.equal(heartItems,beforeDaily+10);assert.equal(dailyRecords[today].rewardStatus,'claimed');resultReturn();assert.equal(state,'daily');assert.equal(dailyRun,null);
assert.equal(readDailyRecords()[today].rewardStatus,'claimed');assert(!startDailyClearReward(today));assert(!selectDailyDate(today));
// Earlier dates keep their existing flow and never earn this daily completion reward.
assert(selectDailyDate('2026-01-01'));moveCount=1;finish(true);assert(!dailyRecords['2026-01-01'].rewardStatus);ui.next.onclick();ad();assert.equal(state,'daily');assert(!rewardSequence);
// A reload after the ad resumes an unclaimed roulette without another ad.
dailyRecords['2026-10-19']={moves:1,timeMs:100,stars:3,rewardStatus:'pending',rewardAdCompleted:true};saveDailyRecords();dailyRecords=readDailyRecords();showDailyCalendar();assert.equal(state,'reward');assert(!dummyAd);land(0);resultReturn();assert.equal(dailyRecords['2026-10-19'].rewardStatus,'claimed');
// A reload before the ad resumes with the ad still required.
dailyRecords['2026-10-18']={moves:1,timeMs:100,stars:3,rewardStatus:'pending'};saveDailyRecords();dailyRecords=readDailyRecords();showDailyCalendar();assert.equal(state,'ad');ad();land(2);resultReturn();assert.equal(state,'daily');
const saved=data[DAILY_RECORDS_KEY];data[DAILY_RECORDS_KEY]=JSON.stringify({'2026-10-01':{rewardStatus:'pending'},'2026-10-02':{moves:1,timeMs:0,stars:3,rewardStatus:'pending'}});assert.deepEqual(Object.keys(readDailyRecords()),['2026-10-02']);data[DAILY_RECORDS_KEY]=saved;
// Generic callers can insert a reward in a playing stage without restarting it.
showLevelMap();assert(selectStage(1));cameraIntro=null;runStartedAt=clock-200;const attempt=lifeAttemptId;
assert(startRewardSequence());assert.equal(runStartedAt,null);land(1);finishRewardSequence();assert.equal(state,'playing');assert.equal(lifeAttemptId,attempt);assert.equal(runTimeMs(),200);
console.log('PASS rewards: all 12 stops, single grant/return, caps, hidden pause, today/past/second-attempt routing, persistence/recovery and generic in-play continuation');
`)(assert,data);}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
