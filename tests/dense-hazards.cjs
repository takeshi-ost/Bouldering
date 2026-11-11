const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},setAttribute(){},addEventListener(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};
`;
new Function('assert',env+source+`
// Percentage sampling includes route contacts, preserves geometry, and excludes
// initial/wide/goal holds. It never imposes a 0–3 off-route cap or a cost quota.
level=47;
initialGrips=[{id:0,type:'normal',x:0,y:0}];
holds=[...initialGrips,{id:1,type:'normal',wide:true,x:100,y:0},
 {id:2,type:'goal',x:200,y:0},
 ...Array.from({length:100},(_,i)=>({id:i+3,type:'normal',x:(i+3)*100,y:0}))];
const reference=[{grips:[0]},{grips:Array.from({length:40},(_,i)=>i+3)}];
generatedCourse={};densityStats={};
const geometry=JSON.stringify(holds.map(({type,...h})=>h));
assert(convertDenseHazards(reference));
let hazards=holds.filter(h=>h.type==='hazard');
assert(hazards.length>=Math.ceil(holds.length*.1));assert(hazards.length<=Math.floor(holds.length*.3));
assert(holds.slice(0,3).every(h=>h.type!=='hazard'));
assert(generatedCourse.hazardPlacement.routeIds.length>0);
assert(generatedCourse.hazardPlacement.optionalIds.length>3);
assert.equal(JSON.stringify(holds.map(({type,...h})=>h)),geometry);

// The TYPE-forced dense generator is retired. The sampling primitive above
// remains a low-level compatibility helper, not a reachable full-course mode.
assert.equal(typeof startDebugCourse,'undefined');
assert.equal(typeof debugCourseDistribution,'undefined');
assert.equal(typeof finalizeConvertedCourse,'undefined');
assert.equal(typeof applyRouteHazards,'undefined');
assert.equal(typeof recipeHearts,'undefined');
// Failed protected conversion must leave each rejected candidate normal.
const ordinary=holds.map(h=>({...h,type:h.type==='hazard'?'normal':h.type}));
holds=ordinary.map(h=>({...h}));initialGrips=[holds[0]];generatedCourse={};
const beforeProtected=JSON.stringify(holds),validate=validateRouteBudget;
let protectedChecks=0;
validateRouteBudget=()=>{protectedChecks++;return false;};
try {assert.equal(convertDenseHazards(reference,0,true),false);} finally {validateRouteBudget=validate;}
assert(protectedChecks>0);assert.equal(JSON.stringify(holds),beforeProtected);
// Too few eligible holds cannot satisfy the legacy primitive's minimum.
holds=[{id:0,type:'normal',x:0,y:0},{id:1,type:'goal',x:100,y:0}];initialGrips=[holds[0]];
assert.equal(convertDenseHazards([{grips:[0,1]}]),false);
assert(holds.every(h=>h.type!=='hazard'));

// Current formal stages use sampled caps and preserve the baseline witness,
// not the obsolete 10–30% dense quota or TYPE-specific moves+3 budget.
const report=[];let sampledHazards=0;
for(const n of [40,47,55,80]){
 debugMode=false;debugAttempt=false;debugCourseTrial=null;reset(n);cameraIntro=null;
 const blue=holds.filter(h=>h.type==='hazard'),sample=activeCourseGeneration.report.spikes;sampledHazards+=blue.length;
 assert.equal(blue.length,Math.floor(sample.candidateCount*activeCourseGeneration.recipe.spikePercent/100));
 assert.deepEqual(blue.map(h=>h.id).sort((a,b)=>a-b),[...sample.selectedIds].sort((a,b)=>a-b));
 assert(initialGrips.every(h=>h.type!=='hazard'));assert(blue.every(h=>!h.wide));
 assert(holds.some(h=>h.type==='goal'));assert(sample.referenceContactsUnchanged);
 assert.equal(sample.referenceHazardCost,0);
 assert(samePairRoute(route,SixPairSelection.withBaseline(()=>replayRoute(route))));
 const saved=JSON.stringify({holds,route,hearts,stamina}),starting=stamina;
 // Changing only hazard types cannot change witness geometry/contacts.
 blue.forEach(h=>h.type='normal');
 const normalReplay=SixPairSelection.withBaseline(()=>replayRoute(route));assert(normalReplay);
 assert(normalReplay.slice(1).every(p=>p.penalty===0));
 assert(samePairRoute(route.map((p,i)=>i?{...p,penalty:0}:p),normalReplay));
 blue.forEach(h=>h.type='hazard');
 const beforePreview=JSON.stringify({holds,route,hearts,stamina});
 const preview=stagePreview(n,'existing');assert.equal(preview.height,HEIGHT);
 assert.equal(JSON.stringify({holds,route,hearts,stamina}),beforePreview,'Preview must restore live course state');
 reset(n);assert.equal(JSON.stringify({holds,route,hearts,stamina}),saved);
 report.push({level:n,total:holds.length,hazards:blue.length,starting});
}
assert(sampledHazards>0,'Current formal geometry/replay checks must include real sampled hazards');
generatedCourse=null;
// Heart placement must not silently enlarge a fixed move-based budget.
level=40;initialGrips=[];holds=Array.from({length:20},(_,id)=>({id,type:'hazard',x:id,y:0}));
const path=Array.from({length:11},(_,i)=>({x:200,y:700-i*40,grips:[i*2%20,(i*2+1)%20]}));
for(let n=40;n<100;n++) {
 const items=createHearts(n,path),costs=routeHazardCosts(path);
 let budget=routeStamina(path);assert.equal(budget,path.length-1+3);
 for(let i=1;i<path.length;i++) {
  if(budget<=0)break;
  for(const h of items)if(!h.collected && torsoTouchesHeart(path[i-1],path[i],h)){h.collected=true;budget+=2;}
  budget-=1+costs[i]-costs[i-1];
  // Extra hazard contacts may exhaust the fixed budget.
 }
 assert(items.length<=HEART_CONFIG.maxCount);
}
console.log('PASS retired dense TYPE boundary; retained sampling primitive protects geometry/start/wide/goal and rejects unsafe candidates; formal sampled caps/reference/preview/retry; low-level hearts retain fixed budgets');
console.log(JSON.stringify(report));
`)(assert);
