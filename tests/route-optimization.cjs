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
const timings=[];
for(const mode of ['existing','prototype']) {
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
  const expected=routeExpectedMoves(),budget=stamina;
  assert.equal(budget,expected+3);
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
   const origin={...body},target=expectedPath[i];
   const event=p=>({clientX:p.x,clientY:p.y-camera});
   down(event(origin));
   for(let k=1;k<=10;k++)move(event({x:origin.x+(target.x-origin.x)*k/10,y:origin.y+(target.y-origin.y)*k/10}));
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
console.log('PASS 42 courses: real input with actual base stamina, work limits, exhausted fallback, unchanged geometry, preview/retry and fixed moves+3 starting budget');
console.log(JSON.stringify(timings));
`)(assert);
