const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
assert(/\.map-node\s*\{[^}]*-webkit-tap-highlight-color:transparent/.test(css));
assert(/\.map-node:active:not\(:disabled\) \.map-wall\s*\{\s*transform:scale\(1\.16\)/.test(css));
const env=`
const elements={},frames=[];let mapImageWork=[];
const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},events:{},focus(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},
 addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;},
 querySelectorAll(){return id==='mapNodes'?mapImageWork:[];},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};
function requestAnimationFrame(fn){if(fn.name!=='draw')frames.push(fn);}
`;
(async()=>{await new Function('assert',env+source+`;return (async()=>{
const tick=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
const finishFrames=async()=>{while(frames.length)frames.shift()();await tick();};
const ready=[];mapImageWork=Array.from({length:20},()=>({decode(){return new Promise(r=>ready.push(r));}}));
state='won';showResultModal();
stageProgress.existing.cleared=1;showLevelMap({advanceFrom:1});
assert(mapPreparing && ui.levelMap.inert);assert(ui.overlay.open,'Keep the previous result screen during preparation');assert.equal(ready.length,20);
assert.equal(selectStage(2),false);ui.mapSettingsButton.onclick();assert(!settingsOpen);
advanceLevelMap(1000);assert.equal(mapTransition.start,null);assert.equal(mapSelected,1);
ready.forEach(resolve=>resolve());await tick();assert(mapPreparing);assert.equal(frames.length,1);
frames.shift()();assert(mapPreparing);frames.shift()();assert(!mapPreparing && !ui.levelMap.inert);assert(!ui.overlay.open,'Close the previous screen only at reveal');
assert.equal(mapTransition.start,null);advanceLevelMap(100);advanceLevelMap(750);assert.equal(mapSelected,2);
// Keep the completed ad covering the goal until the async map is ready.
let adReady;mapImageWork=[{decode(){return new Promise(r=>adReady=r);}}];
state='won';assert(startDummyAd({onReturn:()=>showLevelMap({advanceFrom:1})}));
dummyAd.remaining=0;assert(completeDummyAd());assert.equal(state,'map');
assert(mapPreparing && adCoverPending && ui.dummyAd.open && !ui.dummyAd.hidden);assert(ui.adComplete.hidden);
assert(!completeDummyAd());assert(!startDummyAd());adReady();await tick();await finishFrames();
assert(!mapPreparing && !adCoverPending && !ui.dummyAd.open && ui.dummyAd.hidden);
// Reward confirmation keeps the roulette above the old goal until map reveal.
let rewardReady;mapImageWork=[{decode(){return new Promise(r=>rewardReady=r);}}];
state='won';assert(startRewardSequence({onReturn:()=>showLevelMap({advanceFrom:1})}));
rewardSequence.phase='result';rewardSequence.reward={kind:'hearts',amount:1};
assert(finishRewardSequence());assert(mapPreparing && rewardCoverPending && ui.rewardDialog.open && !ui.rewardDialog.hidden);
assert(!finishRewardSequence());assert(!startRewardSequence());
rewardReady();await tick();await finishFrames();
assert(!mapPreparing && !rewardCoverPending && !ui.rewardDialog.open && ui.rewardDialog.hidden);
mapImageWork=[{decode(){return Promise.reject(Error('offline'));}}];showLevelMap({target:2});assert(mapPreparing);await tick();await finishFrames();assert(!mapPreparing && !ui.levelMap.inert);
let stale;mapImageWork=[{decode(){return new Promise(r=>stale=r);}}];showLevelMap();assert(mapPreparing);
showTitleScreen();assert(!mapPreparing && ui.levelMap.inert);stale();await tick();await finishFrames();
assert.equal(state,'choosing');assert(ui.levelMap.inert,'Stale map reveal must not expose the map under a title');
console.log('PASS map presentation: decoded images and two layout frames before reveal, input and hop held until ready, offline errors do not lock map, stale reveal canceled by title; shape-only press scale');
})();`)(assert);})().catch(e=>{console.error(e);process.exitCode=1;});
