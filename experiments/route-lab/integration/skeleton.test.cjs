'use strict';
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.join(__dirname,'../public/game');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
assert(files.includes('skeleton.js'),'Build must include the trial skeleton adapter');
assert(files.indexOf('skeleton.js')>files.indexOf('js/main.js'),'Skeleton boot must follow baseline initialization');
// Native-function fixture, like the original routes test. The globalThis parameter
// is a fresh isolated object: bootstrap cannot replace Node global storage/network.
// Omit only the large audio data bundle; sound semantics are covered separately.
// Capture pre-nudge holds without altering the engine's candidate or replay logic.
const densityCapture=`
let labTestDensityBefore=null;
if(typeof labNudgeBranchScatter==='function'){
 const nudge=labNudgeBranchScatter;
 labNudgeBranchScatter=function(...args){labTestDensityBefore=[...holds];return nudge(...args);};
}
`;
const source=files.filter(f=>f!=='audio-bundle.js').map(f=>{
 const text=fs.readFileSync(path.join(root,f),'utf8');
 return f==='skeleton.js'?text.replace(/\nlabBootSkeleton\(\);\s*$/,densityCapture+'\nlabBootSkeleton();'):text;
}).join('\n');
const environment=`
let clock=2000;const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {style:{},events:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false},addEventListener(k,f){this.events[k]=f},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};
function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){};
`;
const expose=`
function labTestFingerprint(){return JSON.stringify({config:labSkeletonConfig,holds,route,report:labSkeletonReport});}
function labTestValidate(){
 assert.equal(state,'playing','configuration must enter a playable stage');
 assert.equal(difficulty,0);assert.equal(hearts.length,0);assert(holds.every(h=>h.type!=='hazard'));
 assert.equal(holds.filter(h=>h.type==='goal').length,1,'exactly one real goal');
 const goal=holds.find(h=>h.type==='goal');
 assert(goal.y>=0&&goal.y<=STAGE_CONFIG.goalTopMargin+STAGE_CONFIG.holdOffset+1e-6,'original goal remains near wall top: '+JSON.stringify({config:labSkeletonConfig,goal}));
 assert(goal.y>=cameraTop()&&goal.y<=cameraTop()+H,'camera top includes the real goal');
 assert.equal(HEIGHT,{short:700,middle:1400,long:2100}[labSkeletonConfig.length]);
 assert.equal(new Set(holds.map(h=>h.id)).size,holds.length);
 assert(holds.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)&&h.x>=STAGE_SAFE_WIDTH&&h.x<=W-STAGE_SAFE_WIDTH));
 assert(samePairRoute(route,replayRoute(route)),'final contact replay');
 assert(validateRouteBudget(route),'final route budget');
 assert.equal(stamina,stageStamina(route.length-1));
 assert.equal(labSkeletonReport.validated,true);assert.equal(labSkeletonReport.search,'bounded');
 assert(labSkeletonReport.movesAfter<=labSkeletonReport.movesBefore);
 assert.equal(online.uid,null);assert.equal(online.ready,false);assert.equal(onlineScores.pending.size,0);
 assert.equal(debugMode,false);assert(ui.prototypeCourse.hidden);assert(ui.titleTransfer.hidden);
 assert.equal(labSkeletonReport.placement.engine,'original-createStageGenerator');
 assert(labSkeletonReport.placement.placedHolds>0);
 assert(labSkeletonReport.placement.scatteredHolds>0,'original wall scatter remains active');
 assert(labSkeletonReport.placement.densityInitial>=labSkeletonReport.placement.placedHolds,'original density convergence cannot increase count');
 assert(labSkeletonReport.placement.pruneRemoved>=0);
 if(labSkeletonConfig.type==='branch'){
  const wrong=labSkeletonReport.branchRoute,details=labSkeletonReport.branchDetails;
  assert(wrong&&wrong.length>3,'branch exposes a genuine multi-move wrong-path witness');
  assert(details&&details.kind==='dead-end','branch is the new wrong-arm dead-end mode, not the former rejoin alternative');
  assert(samePairRoute(wrong,labReplayPartial(wrong)),'partial wrong-path contacts replay on final shared holds');
  assert(routeResources(wrong,{pickups:[],budget:routeStamina(route)}).valid,'wrong-path witness fits the actual primary stamina budget');
  assert.equal(wrong[0].x,route[0].x);assert.equal(wrong[0].y,route[0].y,'both arms start from the same real pose');
  const endpoint=wrong.at(-1),terminal=endpoint.grips.map(id=>holds.find(h=>h.id===id));
  assert.deepEqual(endpoint,details.endpoint);
  assert(terminal.every(h=>h&&h.type==='normal'),'wrong arm ends on ordinary holds, not a fake or real goal');
  assert(!bothHandsOnGoal(terminal));
  assert.equal(details.correctSide,-details.wrongSide);assert([-1,1].includes(details.correctSide));
  assert(details.correctSide*(goal.x-W/2)>100,'the real goal belongs to the correct lateral arm');
  assert(details.wrongSide*(endpoint.x-W/2)>90,'wrong endpoint is on the opposite lateral arm');
  assert(Math.abs(goal.x-endpoint.x)>200,'branch is a broad left/right split, not two nearby parallel routes');
  assert(details.bodySeparation>=200);
  const placement=labSkeletonReport.placement,filter=placement.geometryFilter;
  assert.equal(filter.centralGapApplied,false,'the old full-height narrow two-arm mask stays removed');
  assert.equal(filter.wrongSide,details.wrongSide);assert.equal(placement.mergeMinSpacing,52);
  assert.deepEqual(placement.scatterRetention,{source:'original-row-null',minimumBodyRouteDistance:45,bandHeight:160,maxPerSidePerBand:1});
  assert.equal(filter.wrongCutoff,details.cutoff);assert.equal(details.cutoff,Math.max(160,HEIGHT-600));
  assert(holds.every(h=>h.type==='goal'||!(details.wrongSide*(h.x-W/2)>20&&h.y<details.cutoff)),'wrong arm ends below the real goal');
  assert(placement.postFilterRemoved>0,'wrong-arm cutoff is explicit and exercised');
  assert.equal(details.search.limit,18000);assert.equal(details.search.maxMoves,45);assert.equal(details.search.beamWidth,12);
  assert(details.search.transitions>0&&details.search.transitions<=details.search.limit,'wrong endpoint reachability search is bounded');
  assert.deepEqual(details.deadEnd,{scope:'endpoint-only',returnRequired:false,crossoverExcluded:false},'endpoint arrival is tested, not impossibility of crossover or a return route');
  assert(placement.protectedScatterIds.length>0,'retain a sparse subset of original off-route scatter');
  assert.equal(placement.protectedScatterCount,placement.protectedScatterIds.length);
  assert(placement.protectedScatterIds.every(id=>holds.some(h=>h.id===id&&h.row===null)),'all protected scatter remains ordinary original scatter after pruning');
  assert(holds.filter(h=>h.row===null).length<placement.scatteredHolds,'keep original pruning active instead of retaining all original scatter');

 }

 return JSON.parse(JSON.stringify(labSkeletonReport));
}
function labTestTouchReplay(path,{expectClear=true,undoLast=false}={}){
 assert(path&&path.length>1);cameraIntro=null;hideStageHelp();characterAnimation=null;
 const budget=stamina,firstMove=moveCount;
 const finger=p=>({identifier:7,clientX:p.x,clientY:p.y-camera});
 const touch=(name,p,ended=false)=>{const t=finger(p);canvas.events[name]({touches:ended?[]:[t],changedTouches:[t],preventDefault(){}});};
 let beforeLast;
 for(let i=1;i<path.length;i++){
  camera=clamp(body.y-H*CAMERA_CONFIG.bodyScreenRatio,cameraTop(),HEIGHT-H);const from={...body},to=path[i];
  beforeLast={body:{...body},grips:grips.map(h=>h.id),moveCount,stamina};
  touch('touchstart',from);
  for(let step=1;step<=10;step++)touch('touchmove',{x:from.x+(to.x-from.x)*step/10,y:from.y+(to.y-from.y)*step/10});
  const actualAnchor=drag?.anchor;touch('touchend',to,true);clock+=300;
  assert.equal(moveCount,firstMove+i,'touch commit '+JSON.stringify(labSkeletonConfig)+' move '+i);
  assert(grips.every((h,j)=>h&&h.id===to.grips[j]),'touch contact sequence '+JSON.stringify(labSkeletonConfig)+' step '+i+' expected '+JSON.stringify(to.grips)+' got '+JSON.stringify(grips.map(h=>h?.id))+' anchors '+JSON.stringify([to.anchor,actualAnchor])+' body '+JSON.stringify(body)+' target '+JSON.stringify(to));
 }
 if(expectClear){assert.equal(state,'won');assert(bothHandsOnGoal());}
 else {assert.equal(state,'playing','wrong branch is a playable partial path, not a clear');assert(!bothHandsOnGoal(),'dead-end witness must not end at the goal');}
 assert.equal(stamina,budget-(path.length-1));assert.equal(hearts.length,0);
 assert.equal(onlineScores.pending.size,0);assert.equal(stageProgress.existing.cleared,0,'trial must not award baseline progress');
 const completed={moves:moveCount,stamina,state,body:{...body},grips:grips.map(h=>h.id)};
 if(undoLast){
  assert(!expectClear,'Undo check exercises the wrong-branch partial path');
  assert(canUndoMove(),'the last branch step remains undoable');characterAnimation=null;
  touch('touchstart',body);touch('touchend',body,true);
  assert.equal(state,'playing');assert.equal(moveCount,beforeLast.moveCount);assert.equal(stamina,beforeLast.stamina);
  assert.deepEqual(body,beforeLast.body);assert.deepEqual(grips.map(h=>h.id),beforeLast.grips);
  assert(!canUndoMove(),'Undo is only the original single previous move');
  const undone=JSON.stringify({body,grips:grips.map(h=>h.id),moveCount,stamina});
  characterAnimation=null;touch('touchstart',body);touch('touchend',body,true);
  assert.equal(JSON.stringify({body,grips:grips.map(h=>h.id),moveCount,stamina}),undone,'repeated Undo cannot remove a second step');
 }
 return completed;
}
function labTestPlay(alternative=false){return labTestTouchReplay(alternative?labSkeletonReport.branchRoute:route);}

return {
 fingerprint:labTestFingerprint,validate:labTestValidate,play:labTestPlay,
 playPartial(undoLast=true){return labTestTouchReplay(labSkeletonReport.branchRoute,{expectClear:false,undoLast});},
 densityBefore(){return JSON.parse(JSON.stringify(labTestDensityBefore));},
 verifyDensityRemovalReplays(){
  const saved=holds,wrong=labSkeletonReport.branchRoute;
  try{holds=[...labTestDensityBefore];for(const id of labSkeletonReport.placement.densityBias.removedIds){
   holds=holds.filter(h=>h.id!==id);
   assert(samePairRoute(route,replayRoute(route)),'every accepted removal preserves the exact primary contacts');
   assert(samePairRoute(wrong,labReplayPartial(wrong)),'every accepted removal preserves the exact wrong-path contacts');
  }}finally{holds=saved;}
 },
 rejectDensityReplay(kind){
  const saved={holds,densityStats,replayRoute,labReplayPartial,before:labTestDensityBefore};
  try{
   holds=[...labTestDensityBefore];densityStats=JSON.parse(JSON.stringify(densityStats));
   if(kind==='primary')replayRoute=()=>null;else labReplayPartial=()=>null;
   const before=JSON.stringify(holds),bias=labNudgeBranchScatter(labSkeletonReport.branchDetails.correctSide,labSkeletonReport.branchRoute,labSkeletonConfig.seed,labSkeletonReport.branchDetails.cutoff);
   assert(bias.target>0&&bias.eligibleIds.length>0);assert.equal(bias.removedIds.length,0,'failed '+kind+' replay rejects every candidate');
   assert.equal(bias.replayRejectedIds.length,bias.eligibleIds.length);assert.equal(JSON.stringify(holds),before,'rejected candidates restore original holds');
  }finally{holds=saved.holds;densityStats=saved.densityStats;replayRoute=saved.replayRoute;labReplayPartial=saved.labReplayPartial;labTestDensityBefore=saved.before;}
 },
 straightDirection:labStraightDirection,
 reset(){reset(1);},retry(){ui.retry.onclick();},next(){ui.next.onclick();},back(){returnFromStage();},
 snapshot(){return {state,config:labSkeletonConfig,report:labSkeletonReport,error:elements.labGenerationError?.textContent||'',titleHidden:ui.titleScreen.hidden,mapHidden:ui.levelMap.hidden};},
 readConfig:labReadConfig,
 rawLayout(config){return JSON.parse(JSON.stringify(labCreateOriginalLayout(config)));},
 rawOriginal(n,seed){const g=createStageGenerator();g.generate(1);return JSON.parse(JSON.stringify(g.generate(n,false,seed,seed)));},
 nativeLength(seed){const rule=stageLengthRule(2,seed);return rule.category==='medium'?'middle':rule.category;},
 finalLayout(){return JSON.parse(JSON.stringify({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse}));},
 pristineFinal(){assert.equal(labSkeletonConfig,null);level=1;difficulty=0;dailyRun=null;courseMode='existing';generatedCourse=null;stageGenerator=createStageGenerator();prepareStage();route=optimizeRoute(route);finalizeCourseGeneration('basic');assert(validateRouteBudget(route));return JSON.parse(JSON.stringify({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse}));},
 cancelTouch(){cameraIntro=null;hideStageHelp();characterAnimation=null;const before={x:body.x,y:body.y,stamina,moveCount};const p={identifier:8,clientX:body.x,clientY:body.y-camera};canvas.events.touchstart({touches:[p],changedTouches:[p],preventDefault(){}});const q={...p,clientY:p.clientY-25};canvas.events.touchmove({touches:[q],changedTouches:[q],preventDefault(){}});canvas.events.touchcancel({touches:[],changedTouches:[q],preventDefault(){}});assert.equal(stamina,before.stamina);assert.equal(moveCount,before.moveCount);assert.equal(body.x,before.x);assert.equal(body.y,before.y);assert.equal(touchId,null);},
 generateInvalid(){assert.throws(()=>labGenerateSkeleton({type:'unknown',length:'short',seed:1}),/無効/);}
};
`;
const factory=new Function('globalThis','assert',environment+source+expose);
function create(search=''){
 let nativeReads=0;const messages=[];
 const g={location:{protocol:'https:',origin:'https://ascent-route-lab.activeboar15.chatgpt.site',search},navigator:{},crypto:require('node:crypto').webcrypto,parent:{postMessage(value,origin){messages.push({value,origin});}}};
 for(const name of ['localStorage','sessionStorage'])Object.defineProperty(g,name,{configurable:true,get(){nativeReads++;throw Error('native storage must not be read');}});
 const api=factory(g,assert);assert.equal(nativeReads,0);return {api,g,messages};
}
const query=(type,length,seed,guide=false)=>'?lab=1&type='+type+'&length='+length+'&seed='+seed+(guide?'&guide=1':'');

function geometryMetrics(layout,report){
 const paths=[layout.route,report.branchRoute].filter(Boolean),scatter=layout.holds.filter(h=>h.row===null);
 const segmentDistance=(p,a,b)=>{
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
 };
 const distanceToRoute=h=>Math.min(...paths.flatMap(route=>route.slice(1).map((p,i)=>segmentDistance(h,route[i],p))));
 const distances=scatter.map(distanceToRoute).sort((a,b)=>a-b),near=layout.holds.filter(h=>distanceToRoute(h)<25).length;
 const sideStats=[-1,1].map(side=>{
  const xs=scatter.filter(h=>side*(h.x-200)>0).map(h=>h.x),mean=xs.reduce((sum,x)=>sum+x,0)/(xs.length||1);
  return {side,count:xs.length,xStd:Math.sqrt(xs.reduce((sum,x)=>sum+(x-mean)**2,0)/(xs.length||1)),xRange:xs.length?Math.max(...xs)-Math.min(...xs):0};
 });
 return {holds:layout.holds.length,scatter:scatter.length,onRoute25:near,onRoute25Per100:near/(layout.HEIGHT/100),offRoute65:distances.filter(d=>d>=65).length,
  scatterDistanceP50:distances[Math.floor(distances.length*.5)],scatterDistanceP90:distances[Math.floor(distances.length*.9)],sideStats,
  grid50x100Occupancy:new Set(layout.holds.map(h=>Math.floor(h.x/50)+','+Math.floor(h.y/100))).size,
  centralScatterAboveOldGap:scatter.filter(h=>h.y<layout.HEIGHT-410&&h.x>68&&h.x<332).length};
}

// SHA-256 snapshots from the saved released v0.3.1 adapter; no runtime reference-file dependency.
const meanderV6FinalHashes={
 "short:0": "bd117800e4d6f8434ecfcf32d78b49f67bbd508fc1cbdef1dc8f582f9e98480c",
 "short:42": "d9c0a5372130adc25763e88136cf79846eabfdb14d8e20ca5b43690e1cde4d09",
 "short:2026": "c7789ba415ff8fd443ebd98a5e6ca7d4a2b36d9e59cc6a396836597e28d5bc9a",
 "middle:0": "f69ff6c8e9867f258b16b52d3724cac867842e0947325406faaaa2c688bfb6fe",
 "middle:42": "9963d15cc0dfc1c7061d8d83266643af6128f8a9bd209bc543be933a9146eaa5",
 "middle:2026": "009fff2111f17fc6ccb6e87a05dbdae33ae23c713f58e24882ce8c492501ea73",
 "long:0": "89c02894ae05ccfb391ac8019721c9e20cd647fb60908c88de390fa90553fa1e",
 "long:42": "3bb4d291063c40869acc622830cbb769de9b950a055ec01b674c6707111ea571",
 "long:2026": "dc09f1534c45b3b162f28e3b211abcab8da95c22952d3629954000e1cda86125"
};
const branchV6Hashes={
 "short:0": {
  "holds": "8f519ac2fdcb6b9c646301ad4f6497145fc6a7ebe914b30f32d7ae968c0f5f89",
  "primary": "b33a5813a988da550d8ea85f9873ff9fba84baee17cca64b03d4b14827489a21",
  "wrong": "4ad544d83792b61aeeb58d51e8f0dc4c2be83bc2be0dc6b95e88eef624c9fc8c",
  "wrongHolds": "384beba7925be75908f711de658aa1d16d68d256208e8d1f6bc73d65d60cbc7d"
 },
 "short:42": {
  "holds": "27886613d30277a83bb00060e7ad22d7be3d6f18225f2344ede31766ca59326f",
  "primary": "b2603bf66e32d896ab5f09179ab4c1e8b248f8eb5c0e74d50438f241cca64080",
  "wrong": "8d32af91ece8ea1194457552b422446e9262974a514fb5da62c93555d37355e2",
  "wrongHolds": "885fa984e7fa18ddec706e2ffbab18ad421049b769ad574b6b90e2837fc1ee71"
 },
 "short:2026": {
  "holds": "2703cecfe9925ae143cbff5e71e0daddc8a4a89b5b0de19a4538e2a9825306f8",
  "primary": "8a52a2cf02117d64731ba651dfdd6cf5fbcf01d373b831c6c8061c86ff3f64d4",
  "wrong": "db8fc2232f42bbeca74fe8587fe73192e0002c60e24790d1a8e3c968dc961bce",
  "wrongHolds": "1293f3c10f60e347ab5775eb283f28d45fad0d1d548e7569b8694dc8eeb8956a"
 },
 "middle:0": {
  "holds": "1b5cc9cc95dcb22ccfc02b540d233da0e0b9004e09eebd5162ca44d10d33419e",
  "primary": "3fcbe7383a1aa921e7fc1a242b490ad80403011e75dc417bbecf429a3a95bc0f",
  "wrong": "dece9188b16063d4b62df39a324963a7a33c64b8e09d2ee50c54609d1e77ede5",
  "wrongHolds": "ea2551efe83816ba889c20a42d1a9e95bb685e0f467dc3d046dd4d485e22a081"
 },
 "middle:42": {
  "holds": "bdd64d2774af8dd7a50cecf4b199244b19233e6b30e6567dc6b0055b73723615",
  "primary": "7e7b2550f679d4bb4ee0407630f63ed361b6ebcd5234ebfd708845c94a36643d",
  "wrong": "5f6f398a765202637d64c8909a7e4f75d5d12d6c84195ffe6404f2b70c1be330",
  "wrongHolds": "33f80e1549ab6c23831e19c183e8bc7761720246ab7b22dd2df6d39799fccf35"
 },
 "middle:2026": {
  "holds": "9e7ef0b4dd633a41452b537ca067da1d1eff18c6c84bcfc9b23bd5376bb65152",
  "primary": "eb3b8785bc83fa6441178967430d11cfdc166afadddb38f8c2d09a7c2ff6d914",
  "wrong": "7b44a073e74884da0bf8f6a413af106403a4b52bd997ceaaf6622eae4596fa8f",
  "wrongHolds": "0696a2e484410d100d60af27d58c38703f63d22a2febbdb7ee284fa4c7ffc44b"
 },
 "long:0": {
  "holds": "39a55a64c39739c24e304e551b4897463b50ed2a42310af572dbcd07639d6e7b",
  "primary": "47bbf4eb78c4de063bc997296b425cf2affc0d7f3b9710cded51acfb927d0693",
  "wrong": "083377256d229e4a296168a13aa0c92e69e84ab476a42e6eb4b34334a167cf94",
  "wrongHolds": "a2bffcee0776fc189ebc6bdd67105009b391be9bac7f7c0167ebd57815cbf7ad"
 },
 "long:42": {
  "holds": "ef92ce576803bce00857d224fe2f68147f7f43028124f0e3593b4da6ca881c0f",
  "primary": "939cf93ba6c0791a1be2d3b8e8ba6cd296d1502536c8065f631e4678e82fcb76",
  "wrong": "7f0981842741a7b9b2b17f12fc408340728bf6c320943ea620290cbfb1eb3991",
  "wrongHolds": "4140ce306d1de05f3615f427c5f2592d1d1bece663786dee5e0582612b6d9b39"
 },
 "long:2026": {
  "holds": "5063e68f87a63b1e8f7ca3207dd4d0c6e9805f6c6732d215d3b4b6e242cd4968",
  "primary": "923595f7aad5c1bafe5100bbc0273c4270a221009276a9c2554657d287c73745",
  "wrong": "15c7992966f6bfc1d6f8c13cc603f9726fd34a8c7bec2f84132c67e560c5abbc",
  "wrongHolds": "7983c0d1c699334b8141b9dad7b3dea6b8382dc2e54fe7544c0a25ec0b30c7fa"
 },
 "short:1": {
  "holds": "b5a1701471c206e867f3270671862a5183d6da9097028dc05d63d806fc59b5e0",
  "primary": "61adf72f3b9d1791b6a514b4ed157b81ac74eeeef18ab8b38d5e50a1f77a1574",
  "wrong": "b69ecc80ac910815d65b26c75b08ce0912b07feb59beb7c0ce0eab29e7d6c168",
  "wrongHolds": "869c75a7ae28cf60e957368aea7098559a6c3e380d41124aa0547d6f8141d486"
 },
 "middle:1": {
  "holds": "d547a0dc358d5e8cf849965e92979f8bfb43936143a4cdd05cb55c1cc9f63d19",
  "primary": "556094df674e147757a5da47c164cfb7c820184e785a80aecdb763a847f7e75c",
  "wrong": "fae1bf52af6e11fbf90340a8a50f131985c1a1b0cd7b7ea0fc7b18926d5b36af",
  "wrongHolds": "2d87ef0b0f342568eaa163475e7afc965239b171af4e5e7eb1f0c1709f8b2fc7"
 },
 "long:1": {
  "holds": "48661a4bdcc45cf882000ecfec542f63015c80fa4cfd22581f24e2ce29789232",
  "primary": "79e63f4f6f2683330bfd4e8aaf0b8f7516bc563c82a179b3413c23fe97350058",
  "wrong": "a24db806dfd2cddac8a77406c2ae68f543c155c5734fa3b974333ce9b178c277",
  "wrongHolds": "0acc3bfabb233ed16f411a5b63b18992ee67e36726452d3ac79efa0e54163cf7"
 },
 "long:7": {
  "holds": "8f9581a2d6543735f8ddfe4808df9eae2598cfc55b362150a8a60646a765a73b",
  "primary": "9b283bbda0fb95f8443695e15d7a4670ba25146584e0229fb82792b3bd59f823",
  "wrong": "5a580fc6115f1f91d38507656fa73b56d41952b10227314c69b462ff1c7c2c5e",
  "wrongHolds": "5a31b60a045365da55169e2f6f07148d33e66f0de8f44860a06c3a7863e1452e"
 },
 "long:17": {
  "holds": "0f22bd75ffc8d584688537c7aed25e2ff69839aeb91c85678e8276420b58fdf5",
  "primary": "1c4a2b6fe57fc07a235438294aabf516ed8832982fdd4a5e7f83d33517cb21e6",
  "wrong": "d55db45a565c62ca003e87ff11d0fe692a5cdf875875fe747feac34c9cc7db54",
  "wrongHolds": "1f9b7953c6a290ca06c5c3d59cf31480e90140d028d42481b9a8c492e3f1cf3d"
 },
 "long:99": {
  "holds": "4906c75f89d004057501d9a3db3ddc277bf96a02816c616f50a4a51e95e686bf",
  "primary": "ee0755d4431bc492741ba91dc4691ff463114f41da03a546b295fb274ad9fdc1",
  "wrong": "42340005150c965105d3527bae52ad86331c535468ec08df803d0a2d2d4d6de0",
  "wrongHolds": "6606d2f39339172f5e7f5d5aaa088d13fe20dcb0b6fb88cdbde1b04ea4b7fdcc"
 },
 "long:2027": {
  "holds": "6e069fa0fd3bb51dd496f5450377b458e8e5c3c755ced056d51f473b8d147cab",
  "primary": "1cd5a6cb7ce39ca6764feff009fc139c74bb79cbb6ca070de44957cb7590fae3",
  "wrong": "c3680a1f375f24fbe3ac939f47574c09139750360d0a7ae2796ff15c6a8bba3b",
  "wrongHolds": "b00fb6c9a9c44e3372448ff49930e79ce382468334fcb58ddfbf85952fac990e"
 }
};
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

const branchExtraSamples=[['short',1],['middle',1],... [1,7,17,99,2027].map(seed=>['long',seed])];
const observedMetrics=[];
function validateDensityBias(length,seed,api,layout,report){
 const before=api.densityBefore(),bias=report.placement.densityBias,reference=branchV6Hashes[length+':'+seed],side=report.branchDetails.correctSide;
 assert(bias&&before&&reference,'density bias and released reference are available');
 assert.equal(sha(before),reference.holds,'pre-nudge holds exactly match v0.3.1');
 assert.equal(sha(layout.route),reference.primary,'primary route unchanged from v0.3.1');
 assert.equal(sha(report.branchRoute),reference.wrong,'wrong route unchanged from v0.3.1');
 assert.equal(sha(layout.holds.filter(h=>-side*(h.x-200)>0)),reference.wrongHolds,'all wrong-side holds unchanged from v0.3.1');
 const used=new Set([...layout.initialGrips.map(h=>h.id),...[layout.route,report.branchRoute].flatMap(route=>route.flatMap(p=>p.grips||[]))]);
 assert.deepEqual(bias.mandatoryIds,[...used].sort((a,b)=>a-b),'mandatory contacts include initial and both route grip unions');
 assert.deepEqual(bias.config,{targetFraction:.125,maxRemoved:2,minRetainedScatter:4,bandHeight:160,sideOffsetMin:26,sideOffsetMax:166,topMargin:100,startMargin:180});
 assert.equal(bias.correctSide,side);assert.equal(bias.wrongSide,-side);
 const isScatter=h=>h.row===null&&h.type==='normal',inSide=(h,s)=>s*(h.x-200)>=26&&s*(h.x-200)<=166;
 const trueScatter=before.filter(h=>isScatter(h)&&inSide(h,side)),eligible=before.filter(h=>isScatter(h)&&!h.wide&&!used.has(h.id)&&inSide(h,side)&&h.y>=100&&h.y<=layout.HEIGHT-180);
 assert.deepEqual(bias.eligibleIds,eligible.map(h=>h.id));
 assert.equal(bias.trueScatterBefore,trueScatter.length);
 assert.equal(bias.target,Math.min(2,Math.max(0,trueScatter.length-4),Math.round(.125*trueScatter.length)));
 assert(bias.removedIds.length<=bias.target);assert.equal(new Set(bias.removedIds).size,bias.removedIds.length);
 const removed=bias.removedIds.map(id=>before.find(h=>h.id===id));
 assert(removed.every(h=>h&&eligible.some(e=>e.id===h.id)),'only eligible correct-side random holds can be removed');
 assert.equal(new Set(removed.map(h=>Math.floor(h.y/160))).size,removed.length,'at most one removal per vertical band');
 assert.deepEqual(layout.holds,before.filter(h=>!bias.removedIds.includes(h.id)),'no movement, insertion or additional removal is hidden');
 assert(before.filter(h=>used.has(h.id)||h.type==='start'||h.type==='goal'||h.wide||h.y<100||h.y>layout.HEIGHT-180).every(h=>layout.holds.some(p=>p.id===h.id)),'route contacts, start/goal/wide, top and start zones are protected');
 assert.equal(bias.trueScatterAfter,trueScatter.length-removed.length);assert(bias.trueScatterAfter>=Math.min(4,trueScatter.length));
 const window={yMin:report.branchDetails.cutoff+40,yMax:layout.HEIGHT-180,sideOffsetMin:26,sideOffsetMax:166};window.area=(window.yMax-window.yMin)*140;
 assert.deepEqual(bias.window,window,'comparison uses equal mirrored rectangles, not unequal full-height sides');
 const segmentDistance=(h,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((h.x-a.x)*dx+(h.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(h.x-a.x-t*dx,h.y-a.y-t*dy);};
 const measure=holds=>[-1,1].map(s=>{
  const route=s===side?layout.route:report.branchRoute,scatter=holds.filter(h=>isScatter(h)&&inSide(h,s)&&h.y>=window.yMin&&h.y<=window.yMax),extra=scatter.filter(h=>!used.has(h.id));
  const distances=extra.map(h=>Math.min(...route.slice(1).map((p,i)=>segmentDistance(h,route[i],p))));
  return {side:s,role:s===side?'correct':'wrong',scatter:scatter.length,extra:extra.length,extraPer10000:extra.length/window.area*10000,distanceBands:[distances.filter(d=>d<45).length,distances.filter(d=>d>=45&&d<90).length,distances.filter(d=>d>=90).length]};
 });
 assert.deepEqual(bias.before,measure(before));assert.deepEqual(bias.after,measure(layout.holds),'window metrics and own-route distance bins independently match');
 const correctBefore=bias.before.find(s=>s.role==='correct'),correctAfter=bias.after.find(s=>s.role==='correct');
 assert(correctAfter.scatter<=correctBefore.scatter&&correctAfter.extra<=correctBefore.extra);
 assert.deepEqual(bias.after.find(s=>s.role==='wrong'),bias.before.find(s=>s.role==='wrong'));
 api.verifyDensityRemovalReplays();
 return {trueScatterBefore:bias.trueScatterBefore,trueScatterAfter:bias.trueScatterAfter,target:bias.target,removed:bias.removedIds.length,replayRejected:bias.replayRejectedIds.length,window,before:bias.before,after:bias.after};
}

function recordMetrics(type,length,seed,api,report){
 const layout=api.finalLayout(),metrics=geometryMetrics(layout,report);let densityBias=null;
 if(type==='meander')assert.equal(sha(layout),meanderV6FinalHashes[length+':'+seed],'meander final layout must remain exactly v0.3.1');
 if(type==='branch'){
  densityBias=validateDensityBias(length,seed,api,layout,report);
  const {centralScatterAboveOldGap,...spread}=metrics;
  assert.deepEqual(report.placement.spreadFinal,spread,'reported final spread matches independent measurements');
  assert(metrics.sideStats.every(side=>side.count>0&&side.xRange>45),'retained original scatter spans both sides in two dimensions');
  assert(metrics.offRoute65>0,'retained original scatter extends outside the path neighborhood');
  assert(centralScatterAboveOldGap>0,'full-height central scatter is not silently removed again');
  if(seed===42){
   const prior={short:{near:10,off:4},middle:{near:29,off:4},long:{near:45,off:1}}[length];
   assert(metrics.onRoute25<prior.near,'seed42 has fewer tightly route-adjacent holds than v0.3.0');
   assert(metrics.offRoute65>prior.off,'seed42 retains more off-route scatter than v0.3.0');
  }
 }
 const entry={type,length,seed,accepted:true,moves:report.movesAfter,wrongMoves:report.branchMoves,...metrics,densityBias,placedHolds:report.placement.placedHolds,pruneRemoved:report.placement.pruneRemoved};
 observedMetrics.push(entry);return entry;
}
after(()=>{if(process.env.LAB_METRICS_PATH)fs.writeFileSync(process.env.LAB_METRICS_PATH,JSON.stringify(observedMetrics,null,2)+'\n');});

const testTypes=process.env.LAB_TEST_TYPES?process.env.LAB_TEST_TYPES.split(','):['straight','meander','branch'];
assert(testTypes.every(type=>['straight','meander','branch'].includes(type)));

test('trial raw geometry is exactly the original placer, including scatter and density convergence',()=>{
 const {api}=create();
 assert.deepEqual(api.rawLayout({type:'straight',length:'short',seed:1}),api.rawOriginal(1,1),'straight short seed 1 must reproduce original STAGE 1 raw layout exactly');
 for(const seed of [0,1,42,2026]){
  const length=api.nativeLength(seed);
  assert.deepEqual(api.rawLayout({type:'meander',length,seed}),api.rawOriginal(2,seed),'native meander length seed '+seed+' must retain full original placement, scatter and density result');
 }
});

test('straight short seed 1 final result exactly matches pristine original pipeline',()=>{
 const baseline=create().api.pristineFinal();
 const trial=create(query('straight','short',1)).api.finalLayout();
 assert.deepEqual(trial,baseline,'original prepareStage → optimizeRoute → finalizeCourseGeneration basic equivalence');
});

// Captured from the released v0.3.0/v5 final pipeline before the v0.3.1 branch changes.
// Hash all holds, contact route, height, initial grips, density stats and generated course,
// not the report/UI metadata: straight geometry must stay byte-for-byte unchanged.
const straightV5FinalHashes={
 "short:0": "0735e07a0d023625ae0c5efd6d6caf91996a6b1ba30e86674bee3490bbe32e63",
 "short:1": "acd018e06233909a9e168b3539a61434877e99e80a07581c270b8b045f117094",
 "short:42": "2b641195596387d5257eec9f982d5467bc93631f05238598928e53d0a0be1f76",
 "middle:0": "6a149a4931133254de3ec5cbef5b8eb6549992812375840ec87f77f923207517",
 "middle:1": "dc38c222317055c846d3365db8898808383cedc9611d178844411e3fcfa537e1",
 "middle:42": "6a25711071387ef702c8d885556c7850b294aee381531064826a2c4ce1dae067",
 "long:0": "b03537f48c55901efd1cc278f9fe63ccd629e35e6c38a9c54b0000aef4e96964",
 "long:1": "5202ebadebaab435ba31b2b2227335a7e3a03d725a3b41b07cce03c1103aa069",
 "long:42": "cf8b55ed8e71743613cfe7192df959b30f05d378c8adb9aa2b96d546135de807"
};

test('straight seed selects vertical or genuinely diagonal guides and moves the real goal laterally',()=>{
 const directions=new Map([[0,{sign:1,name:'right'}],[1,{sign:0,name:'vertical'}],[42,{sign:-1,name:'left'}]]);
 for(const length of ['short','middle','long']){
  const goals=new Map();
  for(const [seed,expected] of directions){
   const {api}=create(query('straight',length,seed)),report=api.validate();
   assert.equal(createHash('sha256').update(JSON.stringify(api.finalLayout())).digest('hex'),straightV5FinalHashes[length+':'+seed],'straight final geometry must retain v0.3.0 hash for '+length+' seed '+seed);
   assert.equal(api.straightDirection(seed),expected.sign);assert.equal(report.orientation,expected.name);
   const raw=api.rawLayout({type:'straight',length,seed}),first=raw.route[0],last=raw.route.at(-1);
   const dx=last.x-first.x,dy=last.y-first.y,goal=raw.holds.find(h=>h.type==='goal');
   assert(dy<0,'guide rises toward the real goal');
   for(let i=1;i<raw.route.length;i++){
    const previous=raw.route[i-1],point=raw.route[i];
    assert(point.y<previous.y,'straight guide keeps climbing');
    assert(Math.abs((point.x-first.x)*dy-(point.y-first.y)*dx)<1e-7,'underlying guide is collinear, not a hidden meander');
    if(expected.sign)assert(expected.sign*(point.x-previous.x)>0,'diagonal guide advances in one lateral direction');
    else assert.equal(point.x,first.x,'vertical guide keeps a fixed centerline');
   }
   if(expected.sign){
    assert(expected.sign*dx>140,'diagonal guide has material horizontal travel');
    assert(expected.sign*(goal.x-first.x)>140,'real goal moves laterally, not just the decoration or initial pose');
   } else {assert.equal(dx,0);assert(Math.abs(goal.x-first.x)<=8+1e-6,'vertical goal differs only by original hold offset');}
   const finalGoal=api.finalLayout().holds.find(h=>h.type==='goal');
   assert.equal(finalGoal.x,goal.x);assert.equal(finalGoal.y,goal.y,'solver retains the configured real goal');
   goals.set(expected.name,finalGoal.x);
  }
  assert(goals.get('right')-goals.get('vertical')>80,'right-leaning seed moves goal right of vertical reference');
  assert(goals.get('vertical')-goals.get('left')>80,'left-leaning seed moves goal left of vertical reference');
 }
});

test('seed materially varies scattered geometry rather than translating a regular lane',()=>{
 const {api}=create();
 const normalized=layout=>{
  const x=Math.min(...layout.holds.map(h=>h.x)),y=Math.min(...layout.holds.map(h=>h.y));
  return layout.holds.filter(h=>h.row===null).map(h=>[(h.x-x).toFixed(6),(h.y-y).toFixed(6)]).sort().map(p=>p.join(',')).join(';');
 };
 for(const type of ['straight','meander'])for(const length of ['short','middle','long']){
  const layouts=[0,42,2026].map(seed=>api.rawLayout({type,length,seed}));
  assert.equal(new Set(layouts.map(normalized)).size,3,type+' '+length+' scatter must vary relative coordinates');
  assert(layouts.every(layout=>layout.holds.some(h=>h.row===null)));
  assert(layouts.every(layout=>new Set(layout.holds.map(h=>h.x.toFixed(5))).size>10),'original scatter is not a two-column lane');
 }
});

test('seeded skeletons are deterministic, contact-valid and clear through actual touch handlers',t=>{
 const comparisons=new Map();let clears=0;
 for(const type of testTypes)for(const length of ['short','middle','long'])for(const seed of (type==='straight'?[0,1,42]:[0,42,2026])){
  const {api,messages}=create(query(type,length,seed));
  const report=api.validate(),fingerprint=api.fingerprint();recordMetrics(type,length,seed,api,report);
  api.reset();assert.equal(api.fingerprint(),fingerprint,'same configuration must reproduce holds, route and report');
  api.play();clears++;
  comparisons.set(length+':'+seed+':'+type,report);
  assert(messages.some(m=>m.value.kind==='ascent-lab-status'&&m.value.text.includes('経路検証済み')));
  assert(messages.every(m=>m.origin==='https://ascent-route-lab.activeboar15.chatgpt.site'));
 }
 for(const length of ['short','middle','long'])for(const seed of [0,42,2026]){
  const straight=comparisons.get(length+':'+seed+':straight'),meander=comparisons.get(length+':'+seed+':meander');
  if(straight&&meander)assert(meander.travelX>straight.travelX+50,'meander must produce genuinely greater lateral travel');
 }
 assert.equal(clears,testTypes.length*9);
 assert([...comparisons.values()].some(r=>r.placement.densityRemoved>0),'representative samples exercise original density convergence removals');
 assert([...comparisons.values()].some(r=>r.placement.pruneRemoved>0),'representative samples exercise original contact-preserving pruning');
 t.diagnostic(clears+' primary configurations cleared through real touch handlers after deterministic reset; 0 rejected (includes previously rejected branch middle/0 and long/2026)');
});

test('wrong branch stops without clearing and original one-step Undo works without requiring escape or retreat',{skip:!testTypes.includes('branch')},()=>{
 let checked=0;
 for(const length of ['short','middle','long'])for(const seed of [0,42,2026]){
  const {api}=create(query('branch',length,seed));api.validate();const fingerprint=api.fingerprint();
  const stopped=api.playPartial(true);assert.equal(stopped.state,'playing');assert(stopped.stamina>=1,'wrong endpoint remains playable');
  if(seed===42){
   for(const restart of ['retry','next','back']){api[restart]();api.validate();assert.equal(api.fingerprint(),fingerprint,restart+' preserves seed, type, length and geometry');}
   api.cancelTouch();api.validate();
  }
  checked++;
 }
 assert.equal(checked,9,'all primary branch samples exercised wrong-path touch and single-step Undo');
});

test('bounded extra branch samples retain determinism, 2D scatter, goal clear and wrong-path Undo',{skip:!testTypes.includes('branch')},t=>{
 let accepted=0;
 for(const [length,seed] of branchExtraSamples){
  const {api}=create(query('branch',length,seed)),report=api.validate(),fingerprint=api.fingerprint();
  const metrics=recordMetrics('branch',length,seed,api,report);
  assert(metrics.sideStats.every(side=>side.count>0&&side.xRange>45),'retained scatter spans each side in two dimensions');
  assert(metrics.offRoute65>0,'some original scatter remains outside the path neighborhood');
  api.play();api.retry();api.validate();assert.equal(api.fingerprint(),fingerprint,'extra seed retry is deterministic');
  const stopped=api.playPartial(true);assert.equal(stopped.state,'playing');assert(stopped.stamina>=1);accepted++;
 }
 assert.equal(accepted,7);t.diagnostic('7/7 additional branch configurations accepted: short/middle seed1; long seeds1,7,17,99,2027. All clear the real goal and replay wrong-path touch + single Undo; no return/crossover assertion.');
});

test('branch density nudge rejects candidates if either exact contact replay fails',{skip:!testTypes.includes('branch')},()=>{
 const {api}=create(query('branch','short',42));api.validate();
 api.rejectDensityReplay('primary');api.rejectDensityReplay('wrong');
});

test('invalid settings fail visibly without silently substituting a baseline or different skeleton',()=>{
 for(const search of ['?lab=1','?lab=1&type=unknown&length=short&seed=42','?lab=1&type=straight&length=invalid&seed=42','?lab=1&type=branch&length=short&seed=-1','?lab=1&type=branch&length=short&seed=1.5','?lab=1&type=branch&length=short&seed=4294967296']){
  const {api}=create(search),snapshot=api.snapshot();
  assert.equal(snapshot.state,'choosing');assert.equal(snapshot.config,null);assert.equal(snapshot.report,null);assert(snapshot.error.includes('生成できませんでした'));assert(snapshot.titleHidden&&snapshot.mapHidden);
 }
 const {api}=create();assert.equal(api.snapshot().state,'choosing');assert.equal(api.snapshot().config,null,'baseline mode remains separate');
 assert.equal(api.readConfig('?lab=1&type=straight&length=short&seed=4294967295').seed,4294967295);
 api.generateInvalid();
});

test('skeleton sessions retain offline networking and memory-only isolated progress',async()=>{
 const {api,g}=create(query('straight','short',42,true));api.validate();
 g.localStorage.setItem('skeleton-test','memory');assert.equal(g.localStorage.getItem('skeleton-test'),'memory');
 await assert.rejects(g.fetch('https://example.com/'),/disabled/);
 for(const kind of ['XMLHttpRequest','WebSocket','EventSource'])assert.throws(()=>new g[kind]('https://example.com/'),/disabled/);
 assert.equal(g.navigator.sendBeacon('https://example.com/','x'),false);
 const fresh=create(query('straight','short',42));assert.equal(fresh.g.localStorage.getItem('skeleton-test'),null);
});
