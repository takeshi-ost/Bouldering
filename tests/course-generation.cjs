const assert=require('node:assert/strict'),fs=require('node:fs');
const source=[...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
// The same final recovery total is insufficient if it is reached after exhaustion.
initialGrips=Array.from({length:4},(_,id)=>({id,type:'normal',x:200+id,y:600}));
holds=[...initialGrips,...Array.from({length:12},(_,i)=>({id:i+4,type:i<6?'hazard':'normal',x:200+i,y:500}))];
const path=[{x:200,y:600},{x:200,y:500,grips:[4,5,10,11]},{x:200,y:400,grips:[6,7,10,11]},{x:200,y:300,grips:[12,13,14,15]}];
const early=[{id:0,x:200,y:400}],late=[{id:0,x:200,y:300}];
assert(routeResources(path,{pickups:early,budget:6}).valid);
assert(!routeResources(path,{pickups:late,budget:6}).valid);
assert.equal(routeResources(path,{pickups:early,budget:6}).pickupMask,1);
assert.equal(routeResources(path,{pickups:early,budget:6}).pickups,1,'Swept repeated visits never grant twice');
// Old dense/consumption/recovery TYPE recipes and their quota/fallback
// assertions are deliberately retired. Test the current formal sampler and
// still-shared resource/finalization contracts instead, without a forced TYPE.
const report=[];let clears=0,heartCount=0;
for(const n of [1,18,55]) {
 debugMode=false;debugAttempt=false;debugCourseTrial=null;dailyRun=null;courseMode='existing';
 reset(n);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
 const active=generatedCourse,recipe=activeCourseGeneration.recipe,features=activeCourseGeneration.report;
 const resources=SixPairSelection.withBaseline(()=>routeResources(route,{pickups:hearts,budget:stamina}));
 assert.equal(features.spikes.count,Math.floor(features.spikes.candidateCount*recipe.spikePercent/100));
 assert.equal(hearts.length,features.hearts.actual.total);heartCount+=hearts.length;
 assert.equal(stamina,currentCourseInitialStamina());
 assert(SixPairSelection.withBaseline(()=>samePairRoute(route,replayRoute(route))));
 for(const heart of hearts)assert(SixPairSelection.withBaseline(()=>findCourseHeartMove(heart,route)),'Formal heart must be reachable');
 const layout=JSON.stringify(createHearts(level,route,difficulty));
 assert.equal(JSON.stringify(createHearts(level,route.slice(0,-1),difficulty)),layout,'Search cannot relocate fixed hearts');
 const snapshot=JSON.stringify({holds,route,hearts,stamina});
 stagePreview(2);assert.equal(generatedCourse,active,'Preview contaminated active recipe');
 assert.equal(JSON.stringify({holds,route,hearts,stamina}),snapshot);
 reset(n);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
 assert.equal(JSON.stringify({holds,route,hearts,stamina}),snapshot,'Retry changed fixed recipe');
 // Stored witnesses use baseline controls. Use actual shipped stamina and
 // assert the real loss when reductions make that witness infeasible.
 SixPairSelection.withBaseline(()=>{
  for(let i=1;i<route.length;i++) {
   assert(stamina>0);camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);
   const origin={x:body.x,y:body.y-camera},action=route[i].action;
   assert(validFingerAction(action));
   const e=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});down(e({dx:0,dy:0}));
   for(const point of action.points)move(e(point));
   release();assert.equal(moveCount,i);
   if(state==='lost')break;
  }
 });
 assert.equal(state,resources.valid?'won':'lost');
 if(resources.valid){clears++;assert.equal(stamina,resources.remaining);assert.equal(hearts.filter(h=>h.collected).length,resources.pickups);}
 else assert.equal(stamina,0);
 report.push({stage:n,hearts:hearts.length,moves:resources.moves,feasible:resources.valid,outcome:state,remaining:stamina});
}
assert(clears>0);assert(heartCount>0,'Fixed-heart checks must exercise placed hearts');
// Formal Daily keeps its actual date-selected recipe.
dailyRun={...dailyProfile('2026-10-23'),returnCourse:'existing'};
reset(dailyRun.referenceStage);assert.equal(activeCourseGeneration.resolved.score,CourseProgression.dailyScore(dailyRun.date));assert.equal(stamina,currentCourseInitialStamina());assert.equal(dailyRun.seed,activeCourseGeneration.retry.geometrySeed);dailyRun=null;
// Shared basic finalizer safety: failure to add optional features restores a
// genuinely valid snapshot. Non-basic requests fail rather than fall back.
reset(1);cameraIntro=null;hideStageHelp();
const initial=JSON.stringify({holds,route}),add=addHazardHolds;
try {
 for(const intent of ['choice','consumption','recovery','mixed'])assert.throws(()=>finalizeCourseGeneration(intent),/retired/);
 addHazardHolds=()=>{throw Error('injected optional feature failure');};
 SixPairSelection.withBaseline(()=>finalizeCourseGeneration('basic'));
 assert(densityStats.courseGeneration.usedSafeFallback);
 assert.deepEqual(densityStats.courseGeneration.failures,['injected optional feature failure']);
 assert.equal(JSON.stringify({holds,route}),initial);
 assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));
} finally {addHazardHolds=add;}
// A search error with a real off-reference hazard cannot discard the valid
// basic witness. This is explicit failure injection, not an old TYPE recipe.
const search=solveCostRoute;
try {
 addHazardHolds=()=>{
  const used=new Set(route.flatMap(p=>p.grips||[]));
  const extra=holds.find(h=>h.type==='normal'&&!h.wide&&!used.has(h.id)&&!initialGrips.includes(h));
  assert(extra,'Fixture needs an actual off-reference contact');extra.type='hazard';
 };
 solveCostRoute=()=>{throw Error('injected shared search failure');};
 SixPairSelection.withBaseline(()=>finalizeCourseGeneration());
 assert(densityStats.courseGeneration.searchFallback);
 assert(densityStats.courseGeneration.failures.includes('injected shared search failure'));
 assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));
 let boundedCalls=0;
 solveCostRoute=(path,maxMoves,config,options)=>{boundedCalls++;return search(path,maxMoves,{...(config||{}),maxTransitions:0},options);};
 SixPairSelection.withBaseline(()=>finalizeCourseGeneration());
 assert(boundedCalls>0,'Exhaustion check must invoke the actual solver');
 assert.equal(densityStats.costSearch.transitions,0);
 assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));
} finally {addHazardHolds=add;solveCostRoute=search;}
// Resource classification may report bounded-search uncertainty, never invent
// necessity after a solver error. Reuse the deterministic prefix-cost fixture.
initialGrips=Array.from({length:4},(_,id)=>({id,type:'normal',x:200+id,y:600}));
holds=[...initialGrips,...Array.from({length:12},(_,i)=>({id:i+4,type:i<6?'hazard':'normal',x:200+i,y:500}))];
const originalBudget=routeStamina;
try {
 generatedCourse={level,seed:courseSeed(),difficulty,holds,hearts:early,intent:'basic'};routeStamina=()=>6;
 solveCostRoute=()=>{throw Error('injected comparison failure');};
 const classified=classifyCourse(path);
 assert.equal(classified.heart,'unknown');assert.equal(classified.hazard,'unknown');assert.equal(classified.actual,'unclassified');
 assert.equal(classified.necessityScope,'bounded-search');
 for(const item of Object.values(classified.comparisons)){assert.equal(item.status,'error');assert.equal(item.found,null);assert.equal(item.transitions,0);}
 solveCostRoute=()=>null;
 const bounded=classifyCourse(path);assert.equal(bounded.heart,'required-in-search');assert.equal(bounded.hazard,'required-in-search');assert.equal(bounded.necessityScope,'bounded-search');
} finally {routeStamina=originalBudget;solveCostRoute=search;}
console.log('PASS prefix/one-time recovery; formal sampled features, fixed/reachable hearts, preview/retry isolation and real-stamina baseline witness outcomes; Daily identity; shared basic fallback and bounded-search uncertainty (legacy TYPE recipes retired)');
console.log(JSON.stringify(report));
`)(assert);
