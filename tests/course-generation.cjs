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
const natural=new Set();
for(let n=40;n<=240;n++){level=n;natural.add(chooseCourseIntent());}
assert.deepEqual([...natural].sort(),['choice','consumption','mixed','recovery']);
const weights=COURSE_GENERATION_CONFIG.intentWeights;
COURSE_GENERATION_CONFIG.intentWeights=weights.map(row=>[...row]);
const report=[];
for(const mode of ['existing','prototype'])for(let kind=0;kind<COURSE_INTENTS.length;kind++) {
 courseMode=mode;
 COURSE_GENERATION_CONFIG.intentWeights[3]=COURSE_INTENTS.map((_,i)=>i===kind?1:0);
 reset(47);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
 const generation=densityStats.courseGeneration,resources=routeResources(route);
 assert.equal(generation.requested,COURSE_INTENTS[kind]);assert(resources.valid);assert(validateRouteBudget(route));
 assert.equal(stamina,routeExpectedMoves()+3);assert(generation.recipeAttempts<=COURSE_GENERATION_CONFIG.recipeAttempts);
 assert.equal(generation.necessityScope,'bounded-search');
 for(const comparison of Object.values(generation.comparisons))assert(comparison.transitions<=COURSE_GENERATION_CONFIG.comparisonTransitions);
 if(kind===0){assert.equal(hearts.length,0);assert.equal(resources.penalties,0);assert.equal(generation.actual,'basic');}
 if(kind===1)for(const heart of hearts)assert(findCourseHeartMove(heart,route),'Optional heart cannot be reached');
 if(kind===2){assert(resources.penalties>0);assert.equal(hearts.length,0);}
 if(kind>=3){assert(resources.penalties>3);assert(resources.pickups>0);assert(!routeResources(route,{pickups:[]}).valid);}
 const layout=JSON.stringify(createHearts(level,route,difficulty));
 assert.equal(JSON.stringify(createHearts(level,route.slice(0,-1),difficulty)),layout,'Searching cannot relocate hearts');
 const snapshot=JSON.stringify({holds,route,hearts,stamina}),active=generatedCourse;
 stagePreview(48,mode);assert.equal(generatedCourse,active,'Preview contaminated the active recipe');
 assert.equal(JSON.stringify({holds,route,hearts,stamina}),snapshot);
 reset(47);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
 assert.equal(JSON.stringify({holds,route,hearts,stamina}),snapshot,'Retry changed the fixed recipe');
 for(let i=1;i<route.length;i++) {
  assert(stamina>0);camera=clamp(body.y-H*.6,0,HEIGHT-H);
  const from={...body},to=route[i],e=p=>({clientX:p.x,clientY:p.y-camera});down(e(from));
  for(let k=1;k<=10;k++)move(e({x:from.x+(to.x-from.x)*k/10,y:from.y+(to.y-from.y)*k/10}));
  release();assert.equal(moveCount,i);assert.notEqual(state,'lost');
 }
 assert.equal(state,'won');assert.equal(stamina,resources.remaining);
 assert.equal(hearts.filter(h=>h.collected).length,resources.pickups);
 report.push({mode,intent:COURSE_INTENTS[kind],actual:generation.actual,moves:resources.moves,penalties:resources.penalties,pickups:resources.pickups,remaining:stamina});
}
// Optional hearts are present, reachable, and can be skipped in actual play.
courseMode='existing';reset(6);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
assert.equal(hearts.length,2);assert.equal(routeResources(route).pickups,0);
for(const heart of hearts)assert(findCourseHeartMove(heart,route));
for(let i=1;i<route.length;i++) {
 camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});
 down(e(body));move(e(route[i]));release();assert.equal(moveCount,i);
}
assert.equal(state,'won');assert(hearts.every(h=>!h.collected));assert.equal(stamina,3);
// A daily uses the same recovery-dependent recipe and actual fixed-budget replay.
COURSE_GENERATION_CONFIG.intentWeights[3]=[0,0,0,1,0];
dailyRun={date:'2026-10-23',baseSeed:20261023,seed:20261023,difficulty:3,referenceStage:40,returnCourse:'existing'};
reset(40);cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
assert(routeResources(route).penalties>3);assert(validateRouteBudget(route));
const dailyBudget=stamina;assert.equal(dailyBudget,routeExpectedMoves()+3);
for(let i=1;i<route.length;i++) {
 camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});
 down(e(body));move(e(route[i]));release();assert.equal(moveCount,i);assert.notEqual(state,'lost');
}
assert.equal(state,'won');dailyRun=null;
// Failed bounded recipes return to a previously verified course, never raise stamina.
const apply=applyRouteHazards;applyRouteHazards=()=>false;
COURSE_GENERATION_CONFIG.intentWeights[3]=[0,0,0,0,1];courseMode='existing';reset(47);
assert(densityStats.courseGeneration.usedSafeFallback);assert.equal(densityStats.courseGeneration.recipeAttempts,COURSE_GENERATION_CONFIG.recipeAttempts);
assert(validateRouteBudget(route));assert.equal(stamina,routeExpectedMoves()+3);
applyRouteHazards=()=>{throw Error('forced recipe failure');};reset(47);
assert(validateRouteBudget(route));assert(densityStats.courseGeneration.usedSafeFallback);assert.equal(densityStats.courseGeneration.failures.length,COURSE_GENERATION_CONFIG.recipeAttempts);
applyRouteHazards=apply;
// Search exhaustion retains a valid recovery-dependent witness.
const limit=ROUTE_COST_SEARCH_CONFIG.maxTransitions;ROUTE_COST_SEARCH_CONFIG.maxTransitions=0;reset(47);
assert(validateRouteBudget(route));assert(routeResources(route).penalties>3);assert.equal(densityStats.costSearch.transitions,0);
ROUTE_COST_SEARCH_CONFIG.maxTransitions=limit;
// A search error must not discard the cleared witness or assert false necessity.
const solver=solveCostRoute;solveCostRoute=()=>{throw Error('forced search failure');};reset(47);
assert(validateRouteBudget(route));assert(densityStats.courseGeneration.searchFallback);
assert.equal(densityStats.courseGeneration.heart,'unknown');assert.equal(densityStats.courseGeneration.actual,'unclassified');
assert.equal(stamina,routeExpectedMoves()+3);solveCostRoute=solver;
COURSE_GENERATION_CONFIG.intentWeights=weights;
console.log('PASS five intents in both generators: frozen hearts, real unassisted input, budget prefix/one-time recovery, comparisons, preview/retry isolation, bounded repairs and valid exhausted fallback');
console.log(JSON.stringify(report));
`)(assert);
