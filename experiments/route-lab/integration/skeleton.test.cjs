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
const source=files.filter(f=>f!=='audio-bundle.js').map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
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

const branchExtraSamples=[['short',1],['middle',1],... [1,7,17,99,2027].map(seed=>['long',seed])];
const observedMetrics=[];
function recordMetrics(type,length,seed,api,report){
 const metrics=geometryMetrics(api.finalLayout(),report);
 if(type==='branch'){
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
 const entry={type,length,seed,accepted:true,moves:report.movesAfter,wrongMoves:report.branchMoves,...metrics,placedHolds:report.placement.placedHolds,pruneRemoved:report.placement.pruneRemoved};
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
