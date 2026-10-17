const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`let clock=1000,wallNow=globalThis.Date.now();const NativeDate=globalThis.Date;const Date=class extends NativeDate{static now(){return wallNow;}};const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(k,f){this.events[k]=f;},setAttribute(){},contains(){return true;},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={events:{},addEventListener(k,f){this.events[k]=f;},devicePixelRatio:1};function requestAnimationFrame(){};`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try{
new Function('assert','data','storage',env+source+`
assert.equal(lives.count,3);assert.equal(lives.recoveryAt,null);
function map(){showLevelMap();mapTransition=null;}
function ad(){assert.equal(state,'ad');clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());}
startCourse('existing');assert(selectStage(1));assert.equal(lives.count,3);assert(lives.inProgress);
finish(false);assert.equal(lives.count,2);const anchor=lives.recoveryAt;finish(false);assert.equal(lives.count,2);
ui.retry.onclick();assert.equal(state,'playing');assert.equal(lives.count,2);finish(false);assert.equal(lives.count,1);assert.equal(lives.recoveryAt,anchor);
ui.retry.onclick();assert.equal(state,'playing');assert.equal(lives.count,1);ui.restart.onclick();assert.equal(lives.count,0);assert.equal(state,'life-prompt');assert(ui.lifeDialog.open);
assert(!canScrollStage() && !canUndoMove());ui.lifeCancel.onclick();assert.equal(state,'map');assert.equal(lives.count,0);
assert(!selectStage(1));assert.equal(state,'life-prompt');assert(!ui.lifeDialog.hidden);ui.lifeCancel.onclick();assert.equal(state,'map');assert.equal(lives.count,0);
assert(!selectStage(1));ui.lifeWatchAd.onclick();assert.equal(state,'ad');assert.equal(lives.count,0);assert(!completeDummyAd());ad();assert.equal(lives.count,1);assert.equal(state,'playing');assert(lives.inProgress);
moveCount=1;finish(true);assert.equal(lives.count,1);map();assert.equal(lives.count,1);assert(selectStage(1));ui.mapButton.onclick();assert.equal(state,'map');assert.equal(lives.count,0);ui.mapButton.onclick();assert.equal(lives.count,0);
// Recovery keeps its fractional progress across additional failures and stops at 3.
wallNow=anchor+LIFE_RECOVERY_MS-1;recoverLives();assert.equal(lives.count,0);wallNow++;recoverLives();assert.equal(lives.count,1);
wallNow+=LIFE_RECOVERY_MS/2;assert(selectStage(1));finish(false);assert.equal(lives.count,0);assert.equal(lives.recoveryAt,anchor+LIFE_RECOVERY_MS);
wallNow=anchor+2*LIFE_RECOVERY_MS;recoverLives();assert.equal(lives.count,1);wallNow+=10*LIFE_RECOVERY_MS;recoverLives();assert.equal(lives.count,3);assert.equal(lives.recoveryAt,null);
lives.count=5;saveLives();wallNow+=10*LIFE_RECOVERY_MS;recoverLives();assert.equal(lives.count,5);grantLife();assert.equal(lives.count,5);
lives.count=4;consumeLife();assert.equal(lives.count,3);assert.equal(lives.recoveryAt,null);consumeLife();assert.equal(lives.count,2);assert.equal(lives.recoveryAt,wallNow);
// Natural recovery during a prompt starts without an ad when the button is tapped.
lives.count=0;lives.recoveryAt=wallNow;map();selectStage(1);assert.equal(state,'life-prompt');wallNow+=LIFE_RECOVERY_MS;refreshLives();assert.equal(ui.lifeWatchAd.textContent,'ステージを開始');ui.lifeWatchAd.onclick();assert.equal(state,'playing');assert.equal(lives.count,1);assert(!dummyAd);finish(true);map();
// Daily and verification/debug runs ignore zero lives, and cannot spend them.
lives.count=0;lives.recoveryAt=wallNow;saveLives();DIFFICULTY_CONFIG.dailyWeights=[100,0,0,0];ui.openDaily.onclick();assert(selectDailyDate('2026-01-01'));assert.equal(state,'playing');finish(false);assert.equal(lives.count,0);assert(!lives.inProgress);showDailyCalendar();ui.dailyBack.onclick();
debugMode=true;assert(selectStage(99,true));finish(false);assert.equal(lives.count,0);map();startCourse('prototype');assert(selectStage(1));finish(false);assert.equal(lives.count,0);map();startCourse('existing');
// A failed generation never spends a life; a completed reward remains available.
lives.count=1;saveLives();const original=reset,log=console.error;console.error=()=>{};reset=()=>{throw Error('no course');};assert(!selectStage(1));assert.equal(state,'map');assert.equal(lives.count,1);assert(!lives.inProgress);
lives.count=0;selectStage(1);ui.lifeWatchAd.onclick();ad();assert.equal(state,'map');assert.equal(lives.count,1);reset=original;console.error=log;
// Persistence rejects malformed state and continues in memory when writes fail.
const saved=data[LIVES_KEY];for(const bad of ['null','{bad','{}','{"count":-1}','{"count":6}','{"count":"3"}']){data[LIVES_KEY]=bad;assert.equal(readLives().count,3);}data[LIVES_KEY]=saved;
const set=storage.setItem;storage.setItem=()=>{throw Error('full');};assert.doesNotThrow(consumeLife);assert.equal(lives.count,0);storage.setItem=set;
`)(assert,data,storage);
// An interrupted run is charged once at exit time, then offline time recovers naturally.
data['ascent.lives.v1']=JSON.stringify({count:3,recoveryAt:null,inProgress:true,attemptAt:Date.now()-3*30*60*1000});
new Function('assert',env+source+`assert.equal(lives.count,3);assert(!lives.inProgress);assert.equal(lives.recoveryAt,null);`)(assert);
data['ascent.lives.v1']=JSON.stringify({count:2,recoveryAt:Date.now(),inProgress:true,attemptAt:Date.now()});
new Function('assert',env+source+`assert.equal(lives.count,1);assert(!lives.inProgress);`)(assert);
new Function('assert',env+source+`assert.equal(lives.count,1,'Reload cannot charge the same interrupted run twice');`)(assert);
console.log('PASS lives: initial/max, fail/exit/restart and no double retry charge, zero-life gate/cancel/reward, map launch, offline/fractional recovery cap, natural prompt recovery, daily/debug exclusion, generation failure, persistence/interrupted run, invalid/blocked storage');
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
