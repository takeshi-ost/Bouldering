const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
const original={selectAnchor,supportsReachable,supportMotionFraction,attachMoving,limbReachable,bothHandsOnGoal};
// Endpoint-only synthetic graph deliberately exercises the retained legacy cost solver.
// Current finger-action solver is covered with real generated witnesses below.
fingerAimSuspended=true;
level=1;HEIGHT=800;densityStats={};
const S={x:200,y:600},A={x:200,y:555},B={x:200,y:465},G={x:200,y:420};
const pos=p=>p.x+','+p.y;
let id=0;const stance=(type='normal')=>Array.from({length:4},()=>({id:id++,x:200+id,y:420,type}));
const first=stance(),a=stance(),b=stance(),goal=stance('goal'),paid=stance();
paid[0].type='hazard';paid[1].type='hazard';
holds=[...first,...a,...b,...goal,...paid];initialGrips=first;
const edges=new Set([[S,A],[A,B],[B,G],[S,B]].map(([from,to])=>pos(from)+'>'+pos(to)));
selectAnchor=()=>[0,1];limbReachable=()=>true;
supportsReachable=p=>edges.has(pos(committed)+'>'+pos(p));
supportMotionFraction=(from,to)=>edges.has(pos(from)+'>'+pos(to))?1:0;
attachMoving=p=>pos(p)===pos(A)?a:pos(p)===pos(B)?(pos(committed)===pos(S)?paid:b):goal;
bothHandsOnGoal=grips=>grips[0]===goal[0];
const path=[S,{...A,grips:a.map(h=>h.id)},{...B,grips:b.map(h=>h.id)},{...G,grips:goal.map(h=>h.id)}];
committed=S;startGrips=first;
assert.equal(routeMoveCost(a,first),1);
assert.equal(routeMoveCost([paid[0],...a.slice(1)],first),2);
assert.equal(routeMoveCost(paid,first),3);
assert.equal(routeMoveCost(paid,paid),1,'Existing supports are not charged twice');
const expensive=[S,{...B,grips:paid.map(h=>h.id)},{...G,grips:goal.map(h=>h.id)}];
assert.equal(routeConsumption(path),3);assert.equal(routeConsumption(expensive),4);
const searched=solveRoute(expensive);
assert.equal(searched.length-1,3,'Choose 3 ordinary moves over 2 moves costing 4');
assert.equal(routeConsumption(searched),3);
const kept=optimizeRoute(path,{maxTransitions:500,passes:2});
assert.equal(kept.length-1,3,'Do not shorten into a higher-consumption route');
paid[1].type='normal';
const shortened=optimizeRoute(path,{maxTransitions:500,passes:2});
assert.equal(shortened.length-1,2,'At equal real cost, prefer fewer moves');assert.equal(routeConsumption(shortened),3);
const savedCommitted=committed,savedStart=startGrips;
assert(solveCostRoute(path,40,{maxTransitions:0,beamWidth:2}));
assert.equal(committed,savedCommitted);assert.equal(startGrips,savedStart);
// A heart detour must remain searchable when gross cost exceeds a fixed budget.
A.x=140;edges.clear();for(const [from,to] of [[S,A],[A,B],[B,G],[S,B]])edges.add(pos(from)+'>'+pos(to));
paid[1].type='hazard';
generatedCourse={level,seed:courseSeed(),difficulty,holds,hearts:[{id:0,x:A.x,y:A.y}]};
const recovered=solveCostRoute(expensive,40,ROUTE_COST_SEARCH_CONFIG,{budget:2});
assert(recovered);assert.equal(recovered.length-1,3);
assert(routeResources(recovered,{budget:2}).valid);assert.equal(routeResources(recovered,{budget:2}).pickups,1);
assert.equal(solveCostRoute(expensive,40,ROUTE_COST_SEARCH_CONFIG,{budget:2,noHearts:true}),null);
generatedCourse=null;
selectAnchor=original.selectAnchor;supportsReachable=original.supportsReachable;supportMotionFraction=original.supportMotionFraction;
attachMoving=original.attachMoving;limbReachable=original.limbReachable;bothHandsOnGoal=original.bothHandsOnGoal;
fingerAimSuspended=false;
SixPairSelection.withBaseline(()=>{
courseMode='existing';reset(80);cameraIntro=null;hideStageHelp();
const reduction=activeCourseGeneration.report.hearts?.staminaAdjustment.appliedReduction||0;
assert.equal(stamina,routeExpectedMoves()+3-reduction);assert(validateRouteBudget(route));
assert(routeResources(route).valid);
assert(solveCostRoute(route,40,ROUTE_COST_SEARCH_CONFIG));
assert(densityStats.costSearch.transitions<=ROUTE_COST_SEARCH_CONFIG.maxTransitions);
assert(densityStats.routeOptimization.costAfter<=densityStats.routeOptimization.costBefore);
const snapshot=JSON.stringify({holds,route,hearts,stamina});
const preview=stagePreview(80);assert.equal(preview.expectedMoves,routeExpectedMoves());assert.equal(preview.stamina,stamina);
reset(80);cameraIntro=null;hideStageHelp();assert.equal(JSON.stringify({holds,route,hearts,stamina}),snapshot);
// Heart budget reduction can assume a better pickup path than this reference.
// Verify the actual default budget above, then add only that reduction for replay.
if(reduction){reset(80,reduction);cameraIntro=null;hideStageHelp();}
const replayBudget=stamina,expectedPath=[...route];
for(let i=1;i<route.length;i++) {
 camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);const origin={x:body.x,y:body.y-camera};const e=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});
 assert(validFingerAction(route[i].action));down(e({dx:0,dy:0}));for(const point of fingerResampledAction(route[i].action,10).points)move(e(point));release();assert.equal(moveCount,i);assert.notEqual(state,'lost');
}
assert.equal(state,'won');
assert.equal(stamina,replayBudget-(expectedPath.length-1)-routeHazardCosts(expectedPath).at(-1)+hearts.filter(h=>h.collected).length*HEART_CONFIG.recovery);
});
console.log('PASS real 1/2/3 costs, cost-first search, reject costly shortcut, equal-cost shortening, exhausted fallback/state restoration, STAGE80 current-action replay with explicit heart-reduction bonus, default preview/retry');
`)(assert);
