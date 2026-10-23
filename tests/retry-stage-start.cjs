const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!/stageItem[123]|stage-start-items/.test(html));
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={},timers=[];
const performance={now:()=>1000};
const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},events:{},focus(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},contains(){return true;},
 addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
function setTimeout(fn,ms){timers.push({fn,ms});return timers.length;}
function clearTimeout(id){timers[id-1]=null;}
`;
new Function('assert',env+source+`
function doneAd(){advanceDummyAd(dummyAd.start+10000);assert(completeDummyAd());}
function begin(mode='existing',debug=false){
 showLevelMap();courseMode=mode;mapPreparing=false;mapTransition=null;
 lives.count=3;lives.recoveryAt=null;playsSinceAd=0;
 assert(selectStage(1,debug));cameraIntro=null;hideStageHelp();
}
startCourse('existing');heartItems=20;
begin();const base=routeStamina(route);
finish(false);const livesAfterLoss=lives.count,attempt=lifeAttemptId;
const wall=JSON.stringify({holds,route,hearts,stamina,body,camera,level});
ui.retry.onclick();assert.equal(state,'lost');assert(stageStartContext.retry);
assert(ui.stageStartDialog.open && ui.overlay.hidden && !ui.overlay.open);
assert(ui.levelMap.hidden && !ui.hud.hidden);assert.equal(lifeAttemptId,attempt);
assert.equal(JSON.stringify({holds,route,hearts,stamina,body,camera,level}),wall);
assert.equal(stageStartContext.hearts,0);assert.equal(heartItems,20);assert(!lives.inProgress);
setStageHeartItems(3);const context=stageStartContext;ui.retry.onclick();assert.equal(stageStartContext,context);
assert.equal(heartItems,20);assert.equal(lives.count,livesAfterLoss);
ui.stageStartButton.onclick();assert.equal(state,'playing');assert(!stageStartContext && !ui.stageStartDialog.open);
assert.equal(stamina,base+3);assert.equal(heartItems,17);assert.equal(lives.count,livesAfterLoss);assert(lives.inProgress);
const started=lifeAttemptId;ui.stageStartButton.onclick();assert.equal(lifeAttemptId,started);assert.equal(heartItems,17);
// Every close route returns to the map without starting or spending an attempt.
for(const close of ['button','backdrop','escape']) {
 begin();finish(false);const balance=heartItems,livesBefore=lives.count,id=lifeAttemptId;
 ui.retry.onclick();setStageHeartItems(2);
 if(close==='button')ui.closeStageStart.onclick();
 if(close==='backdrop')ui.stageStartDialog.events.click({target:ui.stageStartDialog,clientX:-1,clientY:-1});
 if(close==='escape')ui.stageStartDialog.events.cancel({preventDefault(){}});
 assert.equal(state,'map');assert(!stageStartContext && !ui.stageStartDialog.open);
 assert.equal(heartItems,balance);assert.equal(lives.count,livesBefore);assert.equal(lifeAttemptId,id);assert(!lives.inProgress);
}
// End-of-play ads return to confirmation with the original wall underneath.
begin();playsSinceAd=2;finish(false);const adAttempt=lifeAttemptId;
ui.retry.onclick();assert.equal(state,'ad');assert(!stageStartContext);doneAd();
assert.equal(state,'lost');assert(ui.stageStartDialog.open && stageStartContext.retry);
assert.equal(lifeAttemptId,adAttempt);assert(!lives.inProgress);assert.equal(playsSinceAd,0);
closeStageStart();
// Zero lives: recover first, then choose items and explicitly press Start.
begin();lives.count=1;finish(false);playsSinceAd=0;const zeroAttempt=lifeAttemptId;
ui.retry.onclick();assert.equal(state,'life-prompt');assert(!stageStartContext);
ui.lifeWatchAd.onclick();assert.equal(state,'ad');doneAd();
assert.equal(state,'lost');assert.equal(lives.count,1);assert(stageStartContext.retry);
assert.equal(lifeAttemptId,zeroAttempt);assert(!lives.inProgress);const beforeRecoveryStart=heartItems;
setStageHeartItems(2);ui.stageStartButton.onclick();assert.equal(state,'playing');assert.equal(heartItems,beforeRecoveryStart-2);assert(lives.inProgress);
// Last-second depletion reopens confirmation after recovery and spends no items early.
finish(false);playsSinceAd=0;lives.count=1;ui.retry.onclick();setStageHeartItems(2);lives.count=0;
const balance=heartItems;ui.stageStartButton.onclick();assert.equal(state,'life-prompt');assert.equal(heartItems,balance);
grantLife();ui.lifeWatchAd.onclick();assert(stageStartContext.retry);assert.equal(stageStartContext.hearts,0);closeStageStart();assert.equal(state,'map');
// Generation errors leave both inventory and the already settled life untouched.
begin();finish(false);ui.retry.onclick();setStageHeartItems(2);
const generation=prepareCurrentStage,log=console.error,itemsBefore=heartItems,lifeBefore=lives.count;
prepareCurrentStage=()=>{throw Error('retry generation failure');};console.error=()=>{};
ui.stageStartButton.onclick();prepareCurrentStage=generation;console.error=log;
assert.equal(state,'map');assert.equal(heartItems,itemsBefore);assert.equal(lives.count,lifeBefore);assert(!lives.inProgress);assert(!ui.mapError.hidden);
// Verification and debug attempts keep their mode and life exemption.
for(const mode of ['prototype','existing']) {
 if(mode==='existing')debugMode=true;
 begin(mode,mode==='existing');lives.count=0;finish(false);playsSinceAd=0;
 const exemptItems=heartItems;ui.retry.onclick();assert(ui.stageStartDialog.open);setStageHeartItems(1);ui.stageStartButton.onclick();
 assert.equal(state,'playing');assert.equal(courseMode,mode);assert.equal(heartItems,exemptItems-1);assert.equal(lives.count,0);assert(!lives.inProgress);
}
console.log('PASS retry confirmation: same stage background, Start-only reset/items/life attempt, all close routes to map, double taps, ad/recovery sequence, generation rollback, prototype/debug exemptions');
`)(assert);
