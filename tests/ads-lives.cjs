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
CourseProgressionConfig.stageSegments=[{fromStage:1,toStage:100,fromScore:1,toScore:1}]; /* Ad-flow fixture. */
stageProgress.existing.cleared=10;
function prepare(count,plays=2,stage=11){
 hideStageStart();if(lifePrompt)cancelLifePrompt();showLevelMap();
 lives.count=count;lives.recoveryAt=Date.now();lives.inProgress=false;lifeRunId=null;saveLives();
 playsSinceAd=plays;saveAdPlayCount();assert(selectStage(stage));cameraIntro=null;
 assert.equal(lives.count,count);assert(lives.inProgress);
}
function completeAd(){clock=dummyAd.start+DUMMY_AD_DURATION;advanceDummyAd(clock);assert(completeDummyAd());}
// The failed attempt is charged before result dismissal; no regular ad at zero.
prepare(1);finish(false);assert.equal(lives.count,0);assert.equal(JSON.parse(data[LIVES_KEY]).count,0);assert.equal(playsSinceAd,3);
ui.closeResult.onclick();assert.equal(state,'map');assert(!dummyAd);assert.equal(playsSinceAd,3,'Skipping must retain the unpaid cadence');
assert(!selectStage(11));assert.equal(state,'life-prompt');assert(ui.lifeDialog.open);assert(!dummyAd);
ui.lifeWatchAd.onclick();assert.equal(state,'ad');assert.equal(lives.count,0);assert.equal(playsSinceAd,3);
completeAd();assert.equal(lives.count,1);assert(ui.stageStartDialog.open);assert.equal(playsSinceAd,3,'Recovery ad must not reset the regular-ad counter');
ui.stageStartButton.onclick();assert.equal(state,'playing');finish(true);assert.equal(playsSinceAd,4);ui.closeResult.onclick();assert.equal(state,'ad','Regular ad remains due on a later eligible result');
assert.equal(playsSinceAd,4);completeAd();assert.equal(state,'map');assert.equal(playsSinceAd,0);
// Retry also bypasses the regular ad but still offers the recovery ad.
prepare(1);finish(false);finish(false);assert.equal(lives.count,0);assert.equal(playsSinceAd,3);ui.retry.onclick();assert.equal(state,'life-prompt');assert(!dummyAd);
ui.lifeWatchAd.onclick();assert.equal(state,'ad');completeAd();assert.equal(lives.count,1);assert(ui.stageStartDialog.open);assert.equal(playsSinceAd,3);hideStageStart();showLevelMap();
// Remaining lives retain the original post-result timing and completion reset.
prepare(2);finish(false);assert.equal(lives.count,1);assert.equal(state,'lost');assert(!dummyAd);assert.equal(playsSinceAd,3);
ui.closeResult.onclick();assert.equal(state,'ad');assert.equal(lives.count,1);assert.equal(playsSinceAd,3);assert(!completeDummyAd());completeAd();assert.equal(state,'map');assert.equal(playsSinceAd,0);
prepare(2);finish(false);ui.retry.onclick();assert.equal(state,'ad');completeAd();assert(ui.stageStartDialog.open);assert.equal(lives.count,1);hideStageStart();showLevelMap();
// Below the threshold no ad is introduced; direct retirement settles before gate.
prepare(2,0);finish(false);ui.closeResult.onclick();assert.equal(state,'map');assert.equal(playsSinceAd,1);assert(!dummyAd);
prepare(1,3);returnFromStage();assert.equal(state,'map');assert.equal(lives.count,0);assert(!dummyAd);assert.equal(playsSinceAd,3);
// Early-stage loss/retry still offers the identical zero-life reward ad,
// without counting the play or consuming already-earned later-stage debt.
prepare(1,3,10);finish(false);finish(false);assert.equal(lives.count,0);assert.equal(playsSinceAd,3);
ui.retry.onclick();assert.equal(state,'life-prompt');assert(!dummyAd);
ui.lifeWatchAd.onclick();assert.equal(state,'ad');completeAd();assert.equal(lives.count,1);assert.equal(playsSinceAd,3);
assert(ui.stageStartDialog.open);ui.stageStartButton.onclick();assert.equal(level,10);assert.equal(state,'playing');
finish(true);ui.closeResult.onclick();assert.equal(state,'map');assert(!dummyAd);assert.equal(playsSinceAd,3);
`)(assert,data,storage);
console.log('PASS normal ads/lives: last-life failure, map/retry recovery, remaining-life cadence, completion-only counter reset, retained skipped counter, independent recovery ad, direct retirement settlement');
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
