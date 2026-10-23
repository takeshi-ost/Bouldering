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
function clearStage(){reset(1);cameraIntro=null;for(let i=1;i<route.length;i++) {camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});down(e(body));move(e(route[i]));release();}assert.equal(state,'won');}
for(let i=1;i<=9;i++) {
 clearStage();assert.equal(playsSinceAd,(i-1)%3+1);finish(true);assert.equal(playsSinceAd,(i-1)%3+1,'Count each run only once');
 const record=JSON.stringify(stageRecords);ui.overlay.events.click({target:ui.overlay});
 if(i%3){assert.equal(state,'map');continue;}
 assert.equal(state,'ad');assert(ui.dummyAd.open && !ui.dummyAd.hidden && !ui.overlay.open);assert.equal(ui.adCounter.textContent,'10');assert(ui.adComplete.hidden);
 assert(!completeDummyAd());assert(!startDummyAd());assert(!canUndoMove() && !canScrollStage());
 let canceled=false;ui.dummyAd.events.cancel({preventDefault(){canceled=true;}});assert(canceled);
 const start=dummyAd.start;for(const [ms,remaining] of [[999,10],[1000,9],[9999,1],[10000,0]]){clock=start+ms;advanceDummyAd(clock);assert.equal(ui.adCounter.textContent,String(remaining));}
 assert(!ui.adComplete.hidden);assert.equal(playsSinceAd,3,'Counter resets only after completion tap');
 ui.overlay.events.click({target:ui.overlay});ui.restart.onclick();returnFromStage();assert.equal(state,'ad');
 assert(completeDummyAd());assert(!completeDummyAd());assert.equal(state,'map');assert(ui.dummyAd.hidden && !ui.dummyAd.open);assert.equal(playsSinceAd,0);assert.equal(JSON.stringify(stageRecords),record);
 assert.deepEqual([mapTransition.from,mapTransition.to],[1,2]);advanceLevelMap(clock);advanceLevelMap(clock+650);assert.equal(mapSelected,2);
}
// Daily, debug and prototype runs do not count toward normal ads.
reset(1);debugAttempt=true;finish(true);assert.equal(playsSinceAd,0);debugAttempt=false;
reset(1);dailyRun={...dailyProfile('2026-01-01'),returnCourse:'existing'};finish(true);assert.equal(playsSinceAd,0);dailyRun=null;
courseMode='prototype';reset(1);finish(true);assert.equal(playsSinceAd,0);courseMode='existing';
// Losses, retirements and past-level retries count once, and show ads on exit or retry.
for(let i=1;i<=3;i++){reset(i%2+1);finish(false);finish(false);assert.equal(playsSinceAd,i);if(i<3)returnFromStage();}
ui.retry.onclick();assert.equal(state,'ad');clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());assert(ui.stageStartDialog.open);ui.stageStartButton.onclick();assert.equal(state,'playing');assert.equal(playsSinceAd,0);
for(let i=1;i<=3;i++){reset(1);ui.restart.onclick();assert.equal(state,'lost');returnFromStage();if(i<3)assert.equal(state,'map');}
assert.equal(state,'ad');clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());assert.equal(state,'map');assert.equal(playsSinceAd,0);
// Shared completion hook runs once before the continuation, and pauses an active timer.
reset(1);cameraIntro=null;runStartedAt=clock-1234;const order=[];
assert(startDummyAd({onComplete(){order.push('reward');},onReturn(){order.push('resume');assert.equal(state,'playing');}}));
clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());assert.deepEqual(order,['reward','resume']);assert.equal(runTimeMs(),1234);assert(!completeDummyAd());
finish(true);const count=playsSinceAd;assert(startDummyAd());clock+=10000;advanceDummyAd(clock);completeDummyAd();assert.equal(state,'won');assert(ui.overlay.open);assert.equal(playsSinceAd,count);
for(const bad of ['null','-1','1.2','"5"','{}','{bad']){data[AD_PLAYS_KEY]=bad;assert.equal(readAdPlayCount(),0);}saveAdPlayCount();assert.equal(readAdPlayCount(),1);
const set=storage.setItem;storage.setItem=()=>{throw Error('blocked');};assert.doesNotThrow(resetAdPlayCount);assert.equal(playsSinceAd,0);storage.setItem=set;
`)(assert,data,storage);
new Function('assert',env+source+`assert.equal(playsSinceAd,1,'Reload keeps the clear interval');`)(assert);
console.log('PASS ads: 3rd/6th/9th completed plays, failed/retired replay exits and retries, exclusions, 10-to-0 timer, early/duplicate completion guards, modal/input guards, map hop, shared callbacks, timer pause, persistence and blocked storage');
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
