const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`let clock=1000;const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(k,f){this.events[k]=f;},setAttribute(){},contains(){return true;},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try {
new Function('assert','data','storage',env+source+`
const key='2026-01-01',other='2026-01-02';DIFFICULTY_CONFIG.dailyWeights=[100,0,0,0];
function done(){assert.equal(state,'ad');clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());}
startCourse('existing');showDailyCalendar({openFromMap:true});
const normal=clearsSinceAd;
assert(selectDailyDate(key));assert.equal(state,'playing');assert.equal(dailyRun.attempt,1);assert.equal(dailyAttempts[key],1);
const seed=dailyRun.seed;
// First clear leaves the result visible until Calendar is tapped.
while(featureHelpOpen)dismissStageHelp();cameraIntro=null;
for(let i=1;i<route.length;i++){camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});down(e(body));move(e(route[i]));release();}
assert.equal(state,'won');assert(!dummyAd);ui.next.onclick();assert.equal(state,'ad');ui.next.onclick();done();assert.equal(state,'daily');
const attemptsBefore=dailyAttempts[key];assert(!selectDailyDate(key));assert.equal(state,'daily');assert(!dummyAd);assert.equal(dailyAttempts[key],attemptsBefore);
const repeatKey='2026-01-10';assert(selectDailyDate(repeatKey));
for(let attempt=1;attempt<=6;attempt++) {
 assert.equal(state,'playing');assert.equal(dailyRun.attempt,attempt);
 restartInput(level);assert.equal(dailyAttempts[repeatKey],attempt,'Settings restart keeps the same attempt');
 finish(false);assert(!ui.retry.hidden);
 if(attempt<6){ui.retry.onclick();if(attempt===1 || (attempt+1)%2===0){assert.equal(state,'ad');done();}}
}
showDailyCalendar();
assert.equal(clearsSinceAd,normal,'Daily ads cannot change normal ad cadence');
// A first failed run followed by Retry shows exactly one ad, then launches #2.
assert(selectDailyDate(other));finish(false);ui.retry.onclick();assert.equal(state,'ad');done();assert.equal(state,'playing');assert.equal(dailyRun.attempt,2);assert(!dummyAd);assert.equal(dailyAttempts[other],2);
finish(false);ui.retry.onclick();assert.equal(state,'playing');assert.equal(dailyRun.attempt,3);
finish(false);ui.retry.onclick();assert.equal(state,'ad');done();assert.equal(dailyRun.attempt,4);
showDailyCalendar();
// Failed generation does not consume an attempt, including after an entry ad.
const resetOriginal=reset,logOriginal=console.error;console.error=()=>{};reset=()=>{throw Error('no course');};dailyAttempts[other]=5;
assert(selectDailyDate(other));done();assert.equal(state,'daily');assert(!ui.dailyError.hidden);assert.equal(dailyAttempts[other],5);reset=resetOriginal;console.error=logOriginal;dailyAttempts[other]=4;
const saved=data[DAILY_ATTEMPTS_KEY];data[DAILY_ATTEMPTS_KEY]=JSON.stringify({'bad':1,'2026-02-30':2,'2026-01-03':-1,'2026-01-04':'2','2026-01-05':3});assert.deepEqual(readDailyAttempts(),{'2026-01-05':3});data[DAILY_ATTEMPTS_KEY]=saved;
// Leaving a failed run defers the ad to the next date tap, even a different first-time date.
assert(selectDailyDate('2026-01-03'));assert.equal(state,'playing');finish(false);ui.next.onclick();assert.equal(state,'daily');assert(!dummyAd);assert(dailyEntryAdPending);
dailyMonth='2026-01';renderDailyCalendar();assert(chooseDailyDate('2026-01-04'));assert.equal(state,'daily');assert(!dummyAd);assert(dailyEntryAdPending);assert(!dailyAttempts['2026-01-04']);ui.dailyStartButton.onclick();assert.equal(state,'ad');assert(dailyEntryAdPending);assert(!completeDummyAd());done();assert.equal(state,'playing');assert.equal(dailyRun.date,'2026-01-04');assert.equal(dailyRun.attempt,1);assert(!dailyEntryAdPending);
// The in-game Calendar action also defers, and survives reloads.
ui.mapButton.onclick();assert.equal(state,'daily');assert(dailyEntryAdPending);assert(!dummyAd);assert(readDailyEntryAdPending());
const set=storage.setItem;storage.setItem=()=>{throw Error('full');};assert.doesNotThrow(saveDailyAttempts);assert.doesNotThrow(()=>setDailyEntryAdPending(true));storage.setItem=set;
`)(assert,data,storage);
new Function('assert',env+source+`assert.equal(dailyAttempts['2026-01-01'],1);assert.equal(dailyAttempts['2026-01-10'],6);assert.equal(dailyAttempts['2026-01-02'],4);assert(dailyEntryAdPending);`)(assert);
console.log('PASS daily ads: real first clear -> result ad, attempts 2/4/6 entry ads, per-date counts, failed-run retry without back-to-back ads, restart determinism, save/reload, generation failures and blocked storage, normal ad isolation');
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
