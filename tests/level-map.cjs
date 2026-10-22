const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!/id="(?:mapStatus|mapRange)"|class="map-navigation"|class="map-hint"/.test(html));
assert(/id="mapNext"[^>]*><svg/.test(html));assert(/id="mapPrev"[^>]*><svg/.test(html));
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},contains(){return true;},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};
const console={error(){}};
`;
const data={};const storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try {
new Function('assert','storage','data',env+source+`
// Wall height follows generated length; road facing never mirrors live labels.
assert.equal(new Set(Array.from({length:60},(_,i)=>mapStageVariant(i+1).height)).size,3);
for(let n=1;n<=100;n++) {
 const actual=createStageGenerator().generate(n,true);
 assert.equal(stageLengthInfo(n).height,actual.HEIGHT);
 assert.equal(mapStageVariant(n).height,actual.HEIGHT<=H?'100':actual.HEIGHT<H*2?'125':'150');
}
assert.equal(mapStageVariant(1).height,'100');
assert.equal(mapStageVariant(2).height,'125');
assert.equal(mapStageVariant(5).height,'150');
for(const status of ['active','cleared','unplayed'])for(let n=1;n<=6;n++) {
 const markup=mapWallMarkup(n,status);
 assert(markup.includes('assets/stage-icons/'+status+'-'+mapStageVariant(n).height+'.webp'));
 assert(markup.includes('class="map-node-number"'));
 assert(!markup.includes('<text'));
 assert(!markup.includes('rotate('));
 assert(markup.includes('transform:scaleX('));
}
for(let n=1;n<=20;n++) {
 const a=MAP_TRAIL[n-1],b=n===20?[400,0]:MAP_TRAIL[n],v=mapStageVariant(n);
 assert.equal(v.mirrored,b[0]>a[0]);
 assert(!('rotation' in v));
}
assert.equal(MAP_TRAIL.length,20);
assert(!mapSceneryMarkup().includes('scale(1 -'),'No reflected background copies');
assert(mapSceneryMarkup().includes('values="1.2"'));
assert(Math.hypot(MAP_TRAIL[1][0]-MAP_TRAIL[0][0],MAP_TRAIL[1][1]-MAP_TRAIL[0][1])>200,'Start stage spacing must match the rest of the map');
for(let i=0;i<MAP_TRAIL.length;i++) {
 const point=mapTrailPoint(i/19);
 assert(Math.abs(point.x-MAP_TRAIL[i][0])<1e-8 && Math.abs(point.y-MAP_TRAIL[i][1])<1e-8,'Stage must match its painted clearing');
 if(i)assert(MAP_TRAIL[i][1]<MAP_TRAIL[i-1][1],'Stages ascend along the image');
 if(i<19){const half=mapTrailPoint((i+.5)/19);assert(Math.abs(half.x-(MAP_TRAIL[i][0]+MAP_TRAIL[i+1][0])/2)<1e-8);assert(Math.abs(half.y-(MAP_TRAIL[i][1]+MAP_TRAIL[i+1][1])/2)<1e-8);}
}
let run=1;const runs=[];
for(let i=2;i<MAP_TRAIL.length;i++) {
 const prev=Math.sign(MAP_TRAIL[i-1][0]-MAP_TRAIL[i-2][0]),next=Math.sign(MAP_TRAIL[i][0]-MAP_TRAIL[i-1][0]);
 if(prev===next)run++;else{runs.push(run);run=1;}
}
runs.push(run);assert(runs.includes(1)&&runs.includes(2)&&runs.every(n=>n===1||n===2));
assert.equal(state,'choosing');startCourse('existing');
assert.equal(state,'map');assert.equal(unlockedLevel(),1);assert.equal(mapSelected,1);
assert(ui.mapPrev.hidden && ui.mapNext.hidden);
assert(ui.titleScreen.hidden && !ui.levelMap.hidden && !canUndoMove() && ui.restart.disabled);
assert(!canScrollStage());assert.equal(undoMove(),false);
down({clientX:200,clientY:400});assert.equal(drag,null);
for(const n of [0,-1,1.5,2,NaN])assert.equal(selectStage(n),false);
ui.mapNodes.onclick({target:{closest(){return {dataset:{level:'2'}};}}});assert.equal(state,'map');
ui.mapNodes.onclick({target:{closest(){return {dataset:{level:'1'},classList:{toggle(){}}};}}});assert.equal(state,'map');assert.equal(stageStartContext.n,1);
ui.stageStartDialog.showModal();ui.stageStartButton.onclick();assert.equal(state,'playing');
assert(ui.levelMap.hidden);assert(!ui.restart.disabled);
function complete() {
 while(featureHelpOpen)dismissStageHelp();
 cameraIntro=null;
 for(let i=1;i<route.length;i++) {
  camera=clamp(body.y-H*.6,0,HEIGHT-H);
  const e=p=>({clientX:p.x,clientY:p.y-camera});
  down(e(body));move(e(route[i]));release();
  assert.equal(moveCount,i);
 }
 assert.equal(state,'won');
}
complete();assert.equal(unlockedLevel(),2);
assert.equal(JSON.parse(data[PROGRESS_KEY]).existing.cleared,1);
assert.equal(JSON.parse(data[PROGRESS_KEY]).prototype.cleared,0);
ui.next.onclick();assert.equal(state,'map');assert.equal(mapSelected,1);
assert(ui.mapNodes.innerHTML.includes('map-node-stars'));assert(!ui.mapNodes.innerHTML.includes('map-record'));assert(!ui.mapNodes.innerHTML.includes(formatStageRecord(stageRecords.existing[1])));
assert.deepEqual([mapTransition.from,mapTransition.to],[1,2]);assert.equal(selectStage(2),false);
assert(ui.mapPrev.disabled && ui.mapNext.disabled);ui.mapNext.onclick();assert.equal(mapPage,0);
advanceLevelMap(100);advanceLevelMap(425);
assert(mapTransition);assert.equal(selectStage(2),false);
advanceLevelMap(750);assert.equal(mapTransition,null);assert.equal(mapSelected,2);closeStageStart();
ui.next.onclick();assert.equal(mapSelected,2);assert.equal(selectStage(3),false);
// Replaying a cleared node works without advancing or erasing existing progress.
assert(selectStage(1));complete();assert.equal(unlockedLevel(),2);
ui.next.onclick();advanceLevelMap(1000);advanceLevelMap(1650);closeStageStart();
assert(selectStage(2));assert.equal(level,2);assert.equal(stamina,stageStamina(route.length-1));
returnFromStage();assert.equal(state,'map');assert.equal(mapSelected,2);assert.equal(drag,null);
ui.mapCourses.onclick();assert.equal(state,'choosing');
startCourse('prototype');assert.equal(unlockedLevel(),1);assert.equal(selectStage(2),false);
startCourse('existing');assert.equal(unlockedLevel(),2);
// A new browser session will load the same course-specific completion data.
assert.deepEqual(readStageProgress(),stageProgress);
const saved=data[PROGRESS_KEY];
data[PROGRESS_KEY]='{bad json';assert.deepEqual(readStageProgress(),{existing:{cleared:0},prototype:{cleared:0}});
data[PROGRESS_KEY]=JSON.stringify({existing:{cleared:-3},prototype:{cleared:2.5}});
assert.deepEqual(readStageProgress(),{existing:{cleared:0},prototype:{cleared:0}});
data[PROGRESS_KEY]=saved;
const get=storage.getItem;storage.getItem=()=>{throw Error('Storage blocked');};
assert.deepEqual(readStageProgress(),{existing:{cleared:0},prototype:{cleared:0}});storage.getItem=get;
const set=storage.setItem;storage.setItem=()=>{throw Error('Storage full');};
level=2;assert.doesNotThrow(()=>recordStageClear());assert.equal(unlockedLevel(),3);storage.setItem=set;
// Crossing page boundaries keeps a visible single-step 20 -> 21 hop.
stageProgress.existing.cleared=19;mapPage=0;renderLevelMap();assert(ui.mapNext.hidden && ui.mapPrev.hidden);
stageProgress.existing.cleared=20;renderLevelMap();assert(!ui.mapNext.hidden && ui.mapPrev.hidden);level=20;state='won';ui.next.onclick();
assert.deepEqual(mapBounds(),{first:21,last:40});assert(!ui.mapNodes.innerHTML.includes('data-level="20"'));assert.equal((ui.mapNodes.innerHTML.match(/data-level=/g)||[]).length,20);assert.equal(ui.mapMarker.hidden,false);
assert.deepEqual([mapTransition.from,mapTransition.to],[20,21]);
advanceLevelMap(2000);advanceLevelMap(2650);assert.equal(mapSelected,21);closeStageStart();assert(!ui.mapPrev.hidden && ui.mapNext.hidden);
ui.mapPrev.onclick();assert.equal(mapPage,0);assert.equal(ui.mapMarker.hidden,true);assert(ui.mapPrev.disabled && ui.mapPrev.hidden && !ui.mapNext.hidden);ui.mapPrev.onclick();assert.equal(mapPage,0);
ui.mapNext.onclick();assert.equal(mapPage,1);assert.equal(ui.mapMarker.hidden,false);assert(ui.mapNext.disabled && ui.mapNext.hidden && !ui.mapPrev.hidden);ui.mapNext.onclick();assert.equal(mapPage,1);
assert.equal(selectStage(22),false);
level=1;recordStageClear();assert.equal(stageProgress.existing.cleared,20);
// Explicit debug play can jump beyond unlocks without changing saved progress.
showTitleScreen();setDebugMode(true);startCourse('existing');assert.equal(ui.debugControls.hidden,false);
const progressBefore=JSON.stringify(stageProgress),savedBefore=data[PROGRESS_KEY];
for(const n of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER])assert.equal(selectStage(n,true),false);
assert.equal(selectStage(22),false);
ui.debugStage.value='22';ui.debugControls.onsubmit({preventDefault(){}});
assert.equal(state,'map');assert(ui.stageStartDialog.open);ui.stageStartButton.onclick();
assert.equal(state,'playing');assert.equal(level,22);assert(debugAttempt);
ui.retry.onclick();assert(debugAttempt);complete();
assert.equal(JSON.stringify(stageProgress),progressBefore);assert.equal(data[PROGRESS_KEY],savedBefore);
state='won';ui.next.onclick();assert.equal(state,'map');assert.equal(mapSelected,21);assert.equal(mapTransition,null);
ui.debugStage.value='1.2';ui.debugControls.onsubmit({preventDefault(){}});assert(!ui.mapError.hidden);
showTitleScreen();setDebugMode(false);startCourse('existing');assert(ui.debugControls.hidden);
assert.equal(selectStage(22,true),false);assert.equal(selectStage(22),false);
// Generation errors stay on the map so a player can retry selection.
const originalReset=reset;reset=()=>{throw Error('generation failed');};
assert.equal(selectStage(1),false);assert.equal(state,'map');assert(!ui.mapError.hidden);reset=originalReset;
`)(assert,storage,data);
new Function('assert',env+source+`
startCourse('existing');assert.equal(state,'map');assert.equal(unlockedLevel(),21);assert.equal(mapSelected,21);
startCourse('prototype');assert.equal(unlockedLevel(),1);
`)(assert);
console.log('PASS stage map: real clear/replay, course-specific saved progress, locked levels, input guards, one-step animation, page boundary, no carryover, storage and generation failures');
} finally {
 if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);
 else delete globalThis.localStorage;
}
