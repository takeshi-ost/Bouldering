'use strict';
require('./coupled-production-harness.cjs')(`
assert(Object.isFrozen(STRAIGHT_SUPPORT_CONFIG));assert.equal(STRAIGHT_SUPPORT_CONFIG.halfWidth,80);assert.equal(STRAIGHT_SUPPORT_CONFIG.retention,.5);
const diagonal=[{x:0,y:100},{x:100,y:0}];
assert.equal(labStraightSupportDistance({x:130,y:50},diagonal),80);
assert.equal(labStraightSupportDistance({x:50,y:101},diagonal),Infinity,'no endpoint radial bubble');
const traced=[{x:0,y:100},{x:0,y:0,action:{},trace:[{x:0,y:100},{x:100,y:50},{x:200,y:50},{x:0,y:0}]}];
assert.equal(labStraightSupportDistance({x:250,y:50},traced),50,'horizontal actual trace');
assert.equal(labStraightSupportDistance({x:100,y:50},traced),0,'trace overrides endpoint chord');
assert.equal(labStraightSupportDistance({x:40,y:75},traced),10);
HEIGHT=1000;
const single={config:{type:'straight',seed:11}},mixed={config:{type:'straight',composition:'pair',secondType:'meander'},sections:[{type:'straight',index:0,idMap:[[10,1],[11,2],[12,3]]},{type:'meander',index:1,idMap:[[20,4]]}]};
assert(labStraightSupportOwned({id:1,y:500},mixed));assert(!labStraightSupportOwned({id:2,y:499},mixed));assert(!labStraightSupportOwned({id:4,y:700},mixed),'nonstraight source excluded even inside straight half');
const upper={config:{type:'meander',composition:'pair',secondType:'straight'},sections:[{type:'straight',index:1,idMap:[[0,5],[1,6]]}]};
assert(labStraightSupportOwned({id:5,y:499},upper));assert(!labStraightSupportOwned({id:6,y:500},upper),'seam belongs to lower half');
assert(!labHasStraightProfile({type:'meander',secondType:'straight'}));
holds=[{id:1,type:'normal',x:130,y:50},{id:2,type:'normal',x:130.01,y:50},{id:3,type:'hazard',x:50,y:50},{id:4,type:'goal',x:50,y:50}];
assert.deepEqual([...labStraightSupportIds(diagonal,single)],[1]);assert.deepEqual([...labStraightSupportIds(diagonal,{...single,defer:true})],[1,2]);
const oldRandom=Math.random,oldRng=mulberry32;
try{
 Math.random=()=>{throw Error('thinning consumed Math.random');};mulberry32=()=>{throw Error('thinning consumed layout RNG');};
 for(let n=0;n<=31;n++){
  const candidates=Array.from({length:n},(_,id)=>({id,x:id%2?120:280,y:1000-Math.floor(id/2)*50})),saved=JSON.stringify(candidates);
  for(const seed of [0,1,11,4294967295]){
   difficulty=0;const low=labHalfStraightSupportSelection(candidates,seed);difficulty=100;const high=labHalfStraightSupportSelection(candidates,seed);
   assert.equal(low.length,Math.floor(n/2));assert.equal(new Set(low).size,low.length);assert.deepEqual(low,high,'difficulty-independent thinning');
   assert.deepEqual(low,labHalfStraightSupportSelection([...candidates].reverse(),seed),'input order independent');
  }assert.equal(JSON.stringify(candidates),saved,'selection never mutates candidates');
 }
}finally{Math.random=oldRandom;mulberry32=oldRng;}
const sentinel={config:{type:'straight',composition:'pair'}};labStraightSupportContext=sentinel;
assert.throws(()=>labGenerateSkeleton({type:'invalid',length:'short',seed:-1}));assert.equal(labStraightSupportContext,sentinel,'restore parent context after failure');
labStraightSupportContext=null;assert.throws(()=>labGenerateSkeleton({type:'straight',length:'invalid',seed:-1}));assert.equal(labStraightSupportContext,null,'restore null context after failure');
// Exercise the complete post-hazard thinning path with an isolated replay oracle.
const savedThinning={replayRoute,samePairRoute,hasHazardFallbackCandidates,labRecordStraightSupports};
try{
 HEIGHT=1000;route=[{x:200,y:900,grips:[1]},{x:200,y:500,grips:[1]}];initialGrips=[{id:1}];
 holds=[{id:1,type:'normal',x:200,y:600},{id:2,type:'normal',x:180,y:600},{id:3,type:'normal',x:220,y:650},{id:4,type:'normal',x:220,y:700},{id:5,type:'normal',x:220,y:750},{id:6,type:'normal',x:180,y:800},{id:7,type:'hazard',x:200,y:650},{id:8,type:'normal',x:200,y:700},{id:9,type:'normal',x:350,y:600}];
 const context={config:{type:'straight',composition:'pair',secondType:'meander',seed:11},sections:[{type:'straight',index:0,idMap:[1,2,3,4,5,6,7,9].map(id=>[id,id])},{type:'meander',index:1,idMap:[[8,8]]}]};
 const before=JSON.stringify(route);labSkeletonReport={straightSupports:{candidateIds:[2,3,4,5,6]}};densityStats={};
 replayRoute=r=>r;samePairRoute=()=>true;hasHazardFallbackCandidates=()=>true;
 labRecordStraightSupports=()=>{const supportIds=holds.filter(h=>[2,3,4,5,6].includes(h.id)).map(h=>h.id);return labSkeletonReport.straightSupports={supportIds,normalCount:supportIds.length};};
 Math.random=()=>{throw Error('thinning consumed RNG');};mulberry32=()=>{throw Error('thinning consumed layout RNG');};
 const report=labThinStraightSupports(context);assert.equal(report.thinning.beforeCount,5);assert.equal(report.thinning.afterCount,2);assert.equal(JSON.stringify(route),before);
 for(const id of [1,7,8,9])assert(holds.some(h=>h.id===id),'preserve used, spike, nonstraight source and outside-band holds');
 assert.equal(labThinStraightSupports(context),report,'idempotent postprocessing');
}finally{({replayRoute,samePairRoute,hasHazardFallbackCandidates,labRecordStraightSupports}=savedThinning);Math.random=oldRandom;mulberry32=oldRng;}
console.log('PASS straight support geometry: actual horizontal trace, boundaries, source ownership, floor-half, RNG-free difficulty-independent deterministic selection, context cleanup');
`);
