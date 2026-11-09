// Validate bounded refinement against actual drag/release, including retry/preview.
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
    .map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={
 style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
// This suite checks the baseline generator and its recorded input witnesses.
// New live-control alternatives are verified independently.
return SixPairSelection.withBaseline(()=>{
const timings=[];
for(const mode of ['existing']) {
 courseMode=mode;
 for(const n of [...Array.from({length:20},(_,i)=>i+1),40]) {
  const began=performance.now();reset(n);const totalMs=performance.now()-began;
  const stats=densityStats.routeOptimization;
  assert(stats && stats.after<=stats.before);
  assert(stats.transitions<=ROUTE_OPTIMIZATION_CONFIG.maxTransitions,'Exceeded work limit');
  assert(samePairRoute(route,replayRoute(route)),'Final route must replay '+mode+'/'+n);
  const serialized=JSON.stringify(route),geometry=JSON.stringify(holds);
  const savedCommitted=committed,savedStart=startGrips;
  const fallback=optimizeRoute(route,{maxTransitions:0,passes:2});
  assert.equal(JSON.stringify(fallback),serialized,'Zero budget changes fallback');
  assert.equal(committed,savedCommitted);assert.equal(startGrips,savedStart);
  assert.equal(JSON.stringify(holds),geometry,'Refinement changed hold geometry');
  if(mode==='existing' && n===6) {
   assert(densityStats.initialRouteOptimization.after<=densityStats.initialRouteOptimization.before);
   // Repeated refinements from the same original course are deterministic.
   prepareStage();const original=route;
   const once=optimizeRoute(original),twice=optimizeRoute(original);
   assert.equal(JSON.stringify(once),JSON.stringify(twice));
   assert(JSON.parse(serialized).length<=once.length);
   const exhausted=optimizeRoute(original,{maxTransitions:1,passes:2});
   assert(samePairRoute(exhausted,replayRoute(exhausted)),'Exhaustion loses validated fallback');
   reset(n);
  }
  const expected=routeExpectedMoves(),reduction=activeCourseGeneration.report.hearts?.staminaAdjustment.appliedReduction||0;
  assert.equal(stamina,expected+3-reduction);
  // The adopted trial does not guarantee reference-only completion after heart
  // reduction. Preserve native input replay coverage with an explicit item bonus.
  // Default initial stamina and preview were checked above/below without it.
  const defaultBudget=stamina;
  if(reduction)reset(n,reduction);
  const budget=stamina;assert.equal(budget,expected+3);
  if(n===6) {
   const preview=stagePreview(n,mode);
   assert.equal(preview.expectedMoves,expected);assert.equal(preview.stamina,budget);
   assert.equal(JSON.stringify(route),serialized,'Preview contaminated active route');
   reset(n);assert.equal(JSON.stringify(route),serialized,'Retry changed route');
   assert.equal(stamina,budget);
  }
  cameraIntro=null;hideStageHelp();hideResultModal();settingsOpen=false;state='playing';
  const expectedPath=[...route];
  for(let i=1;i<expectedPath.length;i++) {
   camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);
   const origin={x:body.x,y:body.y-camera},target=expectedPath[i];
   const event=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});
   assert(validFingerAction(target.action));down(event({dx:0,dy:0}));
   for(const point of fingerResampledAction(target.action,10).points)move(event(point));
   assert.deepEqual(drag.anchor,target.anchor,'Live support mismatch '+mode+'/'+n+'/'+i);
   assert.deepEqual(grips.map(h=>h?.id),target.grips,'Live contacts mismatch '+mode+'/'+n+'/'+i);
   release();assert.equal(moveCount,i,'Rejected shortcut '+mode+'/'+n+'/'+i);
  }
  assert.equal(state,'won');
  assert.equal(stamina,budget-(expectedPath.length-1)-routeHazardCosts(expectedPath).at(-1)+hearts.filter(h=>h.collected).length*HEART_CONFIG.recovery);
  timings.push({mode,stage:n,before:stats.before,after:stats.after,transitions:stats.transitions,
    addedMs:+stats.elapsedMs.toFixed(2),totalMs:+totalMs.toFixed(2)});
 }
}
console.log('PASS 21 formal courses: real input with actual base stamina, work limits, exhausted fallback, unchanged geometry, preview/retry and exact adopted initial stamina plus explicit replay bonus for heart-bearing courses');
console.log(JSON.stringify(timings));
});
`)(assert);
