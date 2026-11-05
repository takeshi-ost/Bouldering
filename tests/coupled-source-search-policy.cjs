'use strict';
// Stub expensive geometry searches, but execute the production scope, dispatch,
// composite source loop, and cache dependency logic in both web/native harnesses.
const run=require('./coupled-production-harness.cjs');
run(`
assert.equal(fingerRouteSearchStrategy,'hybrid');
const failure=new Error('controlled source failure'),marker={};
assert.strictEqual(withFingerRouteSearchStrategy('canonical',()=>{
 assert.equal(fingerRouteSearchStrategy,'canonical');
 assert.strictEqual(withFingerRouteSearchStrategy('hybrid',()=>{
  assert.equal(fingerRouteSearchStrategy,'hybrid');return marker;
 }),marker);
 assert.equal(fingerRouteSearchStrategy,'canonical');
 assert.throws(()=>withFingerRouteSearchStrategy('hybrid',()=>{throw failure;}),e=>e===failure);
 assert.equal(fingerRouteSearchStrategy,'canonical');return marker;
}),marker);
assert.equal(fingerRouteSearchStrategy,'hybrid');
assert.throws(()=>withFingerRouteSearchStrategy('canonical',()=>{throw failure;}),e=>e===failure);
assert.equal(fingerRouteSearchStrategy,'hybrid');
assert.throws(()=>withFingerRouteSearchStrategy('unknown',()=>assert.fail('invalid strategy ran')),RangeError);
assert.equal(fingerRouteSearchStrategy,'hybrid');

const originalBounded=fingerPartialSearchBounded;
try {
 const guide=[{x:100,y:200}],stop=()=>true,accept=()=>false,start=guide[0],stance=[1,2,3,4];
 const options={start,stance,stop,accept,maxMoves:24,limit:10000,beamWidth:12,forwardOnly:true,needsTraverse:true,greedy:true,preferGreedy:true};
 let calls=[],foundAt=-1;
 fingerPartialSearchBounded=(g,o)=>{calls.push({g,o});return {found:calls.length===foundAt,path:marker,transitions:calls.length,limit:o.limit};};
 withFingerRouteSearchStrategy('canonical',()=>{
  const result=fingerPartialSearch(guide,options);assert.equal(calls.length,1);assert.equal(result.limit,10000);
  assert.strictEqual(calls[0].g,guide);assert.equal(calls[0].o.greedy,false);
  for(const key of Object.keys(options).filter(k=>k!=='greedy'))assert.strictEqual(calls[0].o[key],options[key],key);
 });
 for(const mode of ['hybrid','canonical']){
  calls=[];withFingerRouteSearchStrategy(mode,()=>fingerPartialSearch(guide,{...options,beamWidth:1}));
  assert.equal(calls.length,1);assert.equal(calls[0].o.beamWidth,1);assert.equal(calls[0].o.greedy,false);
 }
 holds=[{id:1,x:200,y:80,type:'goal'}];densityStats={};
 for(const maxMoves of [10,40])for(const success of [1,2,-1]){
  calls=[];foundAt=success;
  const result=withFingerRouteSearchStrategy('canonical',()=>fingerSolveRoute(guide,maxMoves));
  assert.strictEqual(result,success===-1?null:marker);
  assert.equal(calls.length,success===1?1:2);
  assert.equal(calls[0].o.beamWidth,1);assert.equal(calls[0].o.limit,Math.max(3000,maxMoves*150));
  if(calls.length===2){
   assert.equal(calls[1].o.beamWidth,undefined);assert.equal(calls[1].o.limit,Math.max(18000,maxMoves*1200));
   assert.strictEqual(calls[0].g,calls[1].g);assert.strictEqual(calls[0].o.stop,calls[1].o.stop);
   assert.equal(calls[0].o.needsTraverse,calls[1].o.needsTraverse);
  }
  for(const c of calls){assert.equal(c.o.maxMoves,maxMoves);assert.equal(c.o.greedy,false);}
  assert.equal(fingerRouteSearchStrategy,'hybrid');
 }
 calls=[];foundAt=-1;fingerSolveRoute(guide,40);
 assert.deepEqual(calls.map(c=>c.o.beamWidth??12),[3,1,12]);
 assert.deepEqual(calls.map(c=>c.o.limit),[2400,6000,48000]);
 fingerPartialSearchBounded=()=>{throw failure;};
 assert.throws(()=>withFingerRouteSearchStrategy('canonical',()=>fingerSolveRoute(guide,40)),e=>e===failure);
 assert.equal(fingerRouteSearchStrategy,'hybrid');
} finally {fingerPartialSearchBounded=originalBounded;}

const originalSource=labGenerateSkeleton,originalAim=fingerAimEnabled,originalScope=withFingerRouteSearchStrategy;
try {
 const types=['straight','meander','branch','contrast','switchback'],source={type:'straight',seed:7};
 let seen=[];labGenerateSkeleton=c=>{assert.strictEqual(c,source);seen.push(fingerRouteSearchStrategy);return marker;};
 for(const composition of ['pair','single',undefined])for(const type of types)for(const secondType of types){
  seen=[];const config={composition,type,secondType};
  assert.strictEqual(labGenerateCompositeSourceSkeleton(config,source),marker);
  assert.deepEqual(seen,[composition==='pair'&&type==='switchback'&&secondType==='straight'?'canonical':'hybrid']);
  assert.equal(fingerRouteSearchStrategy,'hybrid');
 }
 const config={composition:'pair',type:'switchback',secondType:'straight'};
 for(const disabled of [()=>false,undefined]){
  fingerAimEnabled=disabled;seen=[];labGenerateCompositeSourceSkeleton(config,source);assert.deepEqual(seen,['hybrid']);
 }
 fingerAimEnabled=originalAim;withFingerRouteSearchStrategy=undefined;
 seen=[];labGenerateCompositeSourceSkeleton(config,source);assert.deepEqual(seen,['hybrid']);
 withFingerRouteSearchStrategy=originalScope;
 for(let attempt=0;attempt<2;attempt++){
  labGenerateSkeleton=()=>{assert.equal(fingerRouteSearchStrategy,'canonical');throw failure;};
  assert.throws(()=>labGenerateCompositeSourceSkeleton(config,source),e=>e===failure);
  assert.equal(fingerRouteSearchStrategy,'hybrid');
 }
} finally {labGenerateSkeleton=originalSource;fingerAimEnabled=originalAim;withFingerRouteSearchStrategy=originalScope;}

// Run the actual source loop and stop at the merged solver, before expensive work.
const originalMerged=labSolveCompositeSwitchbacks,originalRepair=labRepairBranchJoin;
try {
 const config={composition:'pair',type:'switchback',secondType:'straight',length:'middle',seed:239};
 const calls=[],savedSeed=courseSeed,savedLayout=labCreateOriginalLayout,savedSide=labColumnSideSearch;
 labGenerateSkeleton=c=>{
  calls.push({type:c.type,mode:fingerRouteSearchStrategy,seed:c.seed});
  HEIGHT=900;holds=[{id:0,x:80,y:800,type:'start'},{id:1,x:300,y:100,type:'goal'}];
  initialGrips=[holds[0],holds[0],holds[0],holds[0]];route=[{x:80,y:800},{x:300,y:100}];
  densityStats={initialTotal:2,iterations:0};return {};
 };
 labRepairBranchJoin=()=>null;
 labSolveCompositeSwitchbacks=()=>{assert.equal(fingerRouteSearchStrategy,'hybrid');throw failure;};
 for(let attempt=0;attempt<2;attempt++){
  calls.length=0;assert.throws(()=>labGenerateCompositeSkeleton(config),e=>e===failure);
  assert.deepEqual(calls.map(c=>[c.type,c.mode]),[['switchback','canonical'],['straight','canonical']]);
  assert.deepEqual(calls.map(c=>c.seed),[(239^0x243F6A88)>>>0,(239^0x7F4A7C15)>>>0]);
  assert.equal(fingerRouteSearchStrategy,'hybrid');assert.strictEqual(courseSeed,savedSeed);
  assert.strictEqual(labCreateOriginalLayout,savedLayout);assert.strictEqual(labColumnSideSearch,savedSide);
 }
} finally {labGenerateSkeleton=originalSource;labSolveCompositeSwitchbacks=originalMerged;labRepairBranchJoin=originalRepair;}

const inputs=adoptedCourseCacheInputs(),signature=adoptedCourseCacheSignature();
assert(inputs.includes('hybrid'));assert(inputs.includes(withFingerRouteSearchStrategy));assert(inputs.includes(labGenerateCompositeSourceSkeleton));
withFingerRouteSearchStrategy('canonical',()=>{
 assert(adoptedCourseCacheInputs().includes('canonical'));assert.notEqual(adoptedCourseCacheSignature(),signature);
});
assert.equal(adoptedCourseCacheSignature(),signature);
const originalCompositeSource=labGenerateCompositeSourceSkeleton;
try {
 withFingerRouteSearchStrategy=(...args)=>originalScope(...args);assert.notEqual(adoptedCourseCacheSignature(),signature);
 withFingerRouteSearchStrategy=originalScope;assert.equal(adoptedCourseCacheSignature(),signature);
 labGenerateCompositeSourceSkeleton=(...args)=>originalCompositeSource(...args);assert.notEqual(adoptedCourseCacheSignature(),signature);
} finally {withFingerRouteSearchStrategy=originalScope;labGenerateCompositeSourceSkeleton=originalCompositeSource;}
assert.equal(adoptedCourseCacheSignature(),signature);
refreshAdoptedCourseCacheDependencies();adoptedCourseCache.set('stale',{});stagePreviewCache.set('stale',{});
withFingerRouteSearchStrategy('canonical',()=>refreshAdoptedCourseCacheDependencies());
assert.equal(adoptedCourseCache.size,0);assert.equal(stagePreviewCache.size,0);
refreshAdoptedCourseCacheDependencies();
console.log('PASS canonical source policy: bounded callbacks, original narrow/full search, nested/error/retry restoration, all profile guards, both sources, hybrid merged solve, cache dependencies');
`);
