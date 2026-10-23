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
const key='2026-01-01',repeat='2026-01-10',other='2026-01-02';DIFFICULTY_CONFIG.dailyWeights=[100,0,0,0];
function done(){assert.equal(state,'ad');clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());}
function fail(){finish(false);assert.equal(state,'lost');}
startCourse('existing');showDailyCalendar({openFromMap:true});
const normal=playsSinceAd;
assert(selectDailyDate(key));assert.equal(state,'playing');assert.equal(dailyPlayAdState.plays,1);
while(featureHelpOpen)dismissStageHelp();cameraIntro=null;
for(let i=1;i<route.length;i++){camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});down(e(body));move(e(route[i]));release();}
assert.equal(state,'won');ui.next.onclick();assert.equal(state,'daily');assert(!dummyAd,'No post-clear daily ad');
const before=JSON.stringify(dailyPlayAdState);assert(!selectDailyDate(key));assert.equal(JSON.stringify(dailyPlayAdState),before);
// Play 2 is the first attempt on another date, so cadence cannot be date-local.
assert(selectDailyDate(repeat));assert.equal(state,'ad');assert(!dailyAttempts[repeat]);assert(!selectDailyDate(other));done();assert.equal(dailyAttempts[repeat],1);
const seed=dailyRun.seed;fail();ui.retry.onclick();assert.equal(state,'playing');assert.equal(dailyRun.seed,seed);assert.equal(dailyAttempts[repeat],2,'Retry is global play 3');
fail();ui.retry.onclick();assert.equal(state,'ad');done();assert.equal(dailyAttempts[repeat],3,'Retry is global play 4');
fail();ui.closeResult.onclick();assert.equal(state,'daily');assert(!dummyAd);
assert(selectDailyDate(other));assert.equal(state,'playing');assert.equal(dailyAttempts[other],1,'Different past date is global play 5');
ui.restart.onclick();assert.equal(state,'lost');assert(!ui.resultTip.hidden);ui.closeResult.onclick();assert.equal(state,'daily');assert(!dummyAd);
assert(selectDailyDate(other));assert.equal(state,'ad');done();assert.equal(dailyAttempts[other],2,'Global play 6');
fail();ui.retry.onclick();assert.equal(state,'playing');assert.equal(dailyAttempts[other],3,'Global play 7');fail();ui.closeResult.onclick();
// Ad 8 is paid once even if generation fails, including persistence across reloads.
const next='2026-01-03',resetOriginal=reset,logOriginal=console.error;console.error=()=>{};reset=()=>{throw Error('no course');};
assert(selectDailyDate(next));done();assert.equal(state,'daily');assert(!ui.dailyError.hidden);assert(!dailyAttempts[next]);
assert.deepEqual(dailyPlayAdState,{plays:1,adPaid:true});assert.deepEqual(readDailyPlayAdState(),dailyPlayAdState);
reset=resetOriginal;console.error=logOriginal;assert(selectDailyDate(next));assert.equal(state,'playing');assert(!dummyAd);assert.equal(dailyAttempts[next],1);assert.deepEqual(dailyPlayAdState,{plays:0,adPaid:false});
assert.equal(playsSinceAd,normal,'Daily cadence stays independent of normal plays');
const saved=data[DAILY_PLAY_AD_KEY];for(const value of ['null','{}','-1','{"plays":2,"adPaid":false}','{"plays":1,"adPaid":"true"}','{bad']){data[DAILY_PLAY_AD_KEY]=value;assert.deepEqual(readDailyPlayAdState(),{plays:0,adPaid:false});}data[DAILY_PLAY_AD_KEY]=saved;
const set=storage.setItem;storage.setItem=()=>{throw Error('full');};assert.doesNotThrow(saveDailyAttempts);assert.doesNotThrow(saveDailyPlayAdState);storage.setItem=set;
`)(assert,data,storage);
new Function('assert',env+source+`assert.equal(dailyAttempts['2026-01-01'],1);assert.equal(dailyAttempts['2026-01-10'],3);assert.equal(dailyAttempts['2026-01-02'],3);assert.deepEqual(dailyPlayAdState,{plays:0,adPaid:false});`)(assert);
console.log('PASS daily ads: global plays 2/4/6/8 across dates and retries, no exit ads, no double charging after generation failure, counts/reload/storage, independent normal cadence');
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
