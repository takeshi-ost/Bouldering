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
// Keep resource-planner regression on the retained isolated debug generator.
// Normal/Daily generation now uses the separately parity-tested adopted core.
const forceType=id=>{debugMode=true;debugAttempt=true;debugCourseTrial={typeId:id,lengthCategory:'medium',seed:47};};
const report=[];
const convert=convertDenseHazards,search=solveCostRoute;
let searchedInvalidWitness=0,conversions=0,searches=0;
const frozen=new Map();
convertDenseHazards=(path,salt,protect)=>{
 const heartsNow=JSON.stringify(generatedCourse.hearts),geometryNow=JSON.stringify(holds.map(({type,...h})=>h));
 const key=level+':'+courseSeed()+':'+generatedCourse.intent;
 if(!salt && !protect)frozen.set(key,{hearts:heartsNow,geometry:geometryNow});
 const fixed=frozen.get(key);
 assert.equal(heartsNow,fixed.hearts);assert.equal(geometryNow,fixed.geometry);
 conversions++;
 return convert(path,salt,protect);
};
solveCostRoute=(path,...args)=>{
 if(generatedCourse?.hazardPlacement?.target){
  searches++;
  const fixed=frozen.get(level+':'+courseSeed()+':'+generatedCourse.intent);
  assert.equal(JSON.stringify(generatedCourse.hearts),fixed.hearts);
  if(!routeResources(path).valid)searchedInvalidWitness++;
 }
 return search(path,...args);
};
for(const mode of ['existing'])for(let kind=1;kind<COURSE_INTENTS.length;kind++) {
 courseMode=mode;
 forceType(kind+5);
 reset(47);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
 const generation=densityStats.courseGeneration,resources=routeResources(route);
 assert.equal(generation.requested,COURSE_INTENTS[kind]);assert(resources.valid);assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));
 assert.equal(stamina,routeExpectedMoves()+3);assert(generation.recipeAttempts<=COURSE_GENERATION_CONFIG.recipeAttempts);
 assert.equal(generation.necessityScope,'bounded-search');
 for(const comparison of Object.values(generation.comparisons))assert(comparison.transitions<=COURSE_GENERATION_CONFIG.comparisonTransitions);
 if(kind===0)assert.equal(hearts.length,0);
 if(kind===1)for(const heart of hearts)assert(SixPairSelection.withBaseline(()=>findCourseHeartMove(heart,route)),'Optional heart cannot be reached');
 if(kind===2)assert.equal(hearts.length,0);
 if(kind>=3)assert.equal(hearts.length,kind===3?1:2);
 const count=holds.filter(h=>h.type==='hazard').length;
 assert(count>=Math.ceil(holds.length*.1) && count<=Math.floor(holds.length*.3));
 const layout=JSON.stringify(createHearts(level,route,difficulty));
 assert.equal(JSON.stringify(createHearts(level,route.slice(0,-1),difficulty)),layout,'Searching cannot relocate hearts');
 const snapshot=JSON.stringify({holds,route,hearts,stamina}),active=generatedCourse;
 stagePreview(48,mode);assert.equal(generatedCourse,active,'Preview contaminated the active recipe');
 assert.equal(JSON.stringify({holds,route,hearts,stamina}),snapshot);
 reset(47);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
 assert.equal(JSON.stringify({holds,route,hearts,stamina}),snapshot,'Retry changed the fixed recipe');
 // Historical generator witness uses baseline controls. New live controls are
 // covered separately by six-pair-baseline-live.cjs, not this replay.
 SixPairSelection.withBaseline(()=>{
 for(let i=1;i<route.length;i++) {
  assert(stamina>0);camera=clamp(body.y-H*.6,0,HEIGHT-H);
  const origin={x:body.x,y:body.y-camera},action=route[i].action;
  assert(validFingerAction(action),'Reference contains explicit live input');
  const e=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});down(e({dx:0,dy:0}));
  for(const point of fingerResampledAction(action,10).points)move(e(point));
  release();assert.equal(moveCount,i);assert.notEqual(state,'lost');
 }
 });
 assert.equal(state,'won');assert.equal(stamina,resources.remaining);
 assert.equal(hearts.filter(h=>h.collected).length,resources.pickups);
 report.push({mode,intent:COURSE_INTENTS[kind],actual:generation.actual,moves:resources.moves,penalties:resources.penalties,pickups:resources.pickups,remaining:stamina});
}
assert(searchedInvalidWitness>0,'Converted layouts must be searched even when the initial witness is exhausted');
assert(conversions>0 && searches>0);
convertDenseHazards=convert;solveCostRoute=search;
// Optional hearts are present, reachable, and can be skipped in actual play.
forceType(1);debugCourseTrial.seed=6;courseMode='existing';reset(6);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
assert.equal(hearts.length,2);assert.equal(routeResources(route).pickups,0);
for(const heart of hearts)assert(SixPairSelection.withBaseline(()=>findCourseHeartMove(heart,route)));
// Historical generator witness uses baseline controls. New live controls are
// covered separately by six-pair-baseline-live.cjs, not this replay.
SixPairSelection.withBaseline(()=>{
for(let i=1;i<route.length;i++) {
 camera=clamp(body.y-H*.6,0,HEIGHT-H);const origin={x:body.x,y:body.y-camera};
 const e=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});
 assert(validFingerAction(route[i].action));down(e({dx:0,dy:0}));
 for(const point of route[i].action.points)move(e(point));release();assert.equal(moveCount,i);
}
});
assert.equal(state,'won');assert(hearts.every(h=>!h.collected));assert.equal(stamina,3);
// Formal Daily keeps its actual date-selected recipe, not a forced old family.
debugCourseTrial=null;debugAttempt=false;debugMode=false;
dailyRun={...dailyProfile('2026-10-23'),returnCourse:'existing'};
reset(dailyRun.referenceStage);assert.equal(activeCourseGeneration.resolved.score,CourseProgression.dailyScore(dailyRun.date));assert.equal(stamina,currentCourseInitialStamina());assert.equal(dailyRun.seed,dailyRun.baseSeed);dailyRun=null;
// Failed bounded recipes return to a previously verified course, never raise stamina.
const apply=convertDenseHazards;convertDenseHazards=(path,salt,protect)=>protect?apply(path,salt,protect):false;
forceType(9);courseMode='existing';reset(47);
assert(densityStats.courseGeneration.usedSafeFallback);assert.equal(densityStats.courseGeneration.recipeAttempts,COURSE_GENERATION_CONFIG.recipeAttempts);
assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));assert.equal(stamina,routeExpectedMoves()+3);
convertDenseHazards=(path,salt,protect)=>{if(protect)return apply(path,salt,protect);throw Error('forced recipe failure');};reset(47);
assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));assert(densityStats.courseGeneration.usedSafeFallback);assert.equal(densityStats.courseGeneration.failures.length,COURSE_GENERATION_CONFIG.recipeAttempts);
convertDenseHazards=apply;
// Search exhaustion retains a valid recovery-dependent witness.
const limit=ROUTE_COST_SEARCH_CONFIG.maxTransitions;ROUTE_COST_SEARCH_CONFIG.maxTransitions=0;reset(47);
assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));assert.equal(densityStats.costSearch.transitions,0);
ROUTE_COST_SEARCH_CONFIG.maxTransitions=limit;
// A search error must not discard the cleared witness or assert false necessity.
const solver=solveCostRoute;solveCostRoute=()=>{throw Error('forced search failure');};reset(47);
assert(SixPairSelection.withBaseline(()=>validateRouteBudget(route)));assert(densityStats.courseGeneration.searchFallback);
assert.equal(densityStats.courseGeneration.heart,'unknown');assert.equal(densityStats.courseGeneration.actual,'unclassified');
assert.equal(stamina,routeExpectedMoves()+3);solveCostRoute=solver;
debugCourseTrial=null;debugAttempt=false;debugMode=false;
console.log('PASS fixed hearts and 10-30% conversion before search in retained debug planner, with formal Daily isolation: frozen hearts, baseline witness input, budget prefix/one-time recovery, comparisons, preview/retry isolation, bounded repairs and valid exhausted fallback');
console.log(JSON.stringify(report));
`)(assert);
