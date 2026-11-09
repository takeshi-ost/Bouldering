'use strict';
const run=require('./coupled-production-harness.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const adapter=fs.readFileSync(path.join(__dirname,'../js/course-adoption.js'),'utf8');
assert.equal(new Function(adapter+'; return refreshAdoptedCourseCacheDependencies();')(),null,
 'Historical fixtures without input modules bypass cache without evaluating missing symbols');
run(`
const fingerprint=()=>JSON.stringify({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache});
const originals={labGenerateSkeleton,labPrepareSpikes,labPrepareHearts,labPrepareStaminaAdjustment,fingerValidateDragReference};
let calls=0;
try {
 // Cache isolation fixture is deliberately synthetic, not a playable route.
 fingerValidateDragReference=()=>({valid:true});
 clearAdoptedCourseCache();dailyRun=null;level=4;difficulty=0;courseTypeId=0;courseMode='existing';
 labGenerateSkeleton=recipe=>{
  calls++;holds=[{id:1,x:100,y:600,type:'normal'},{id:2,x:200,y:50,type:'goal'}];
  route=[{x:100,y:500,grips:[1,1,1,1]},{x:200,y:60,grips:[2,2,2,2]}];
  HEIGHT=700;initialGrips=[holds[0],holds[0],holds[0],holds[0]];densityStats={total:2};
  generatedCourse={holds,hearts:[]};labSkeletonReport={validated:true,seed:recipe.seed};
 };
 labPrepareSpikes=()=>{};
 labPrepareHearts=()=>{labHeartsCache=[{id:0,x:150,y:300,collected:false}];generatedCourse.hearts=labHeartsCache.map(h=>({...h}));};
 labPrepareStaminaAdjustment=()=>{labStaminaCache={initialStamina:4};labSkeletonReport.stamina=labStaminaCache;};
 const oldHearts=[{id:99,collected:true}],oldBody=body,oldGrips=grips;
 hearts=oldHearts;stamina=17;moveCount=8;
 prepareAdoptedCourse();const cold=fingerprint(),firstHolds=holds,firstRoute=route,firstHearts=labHeartsCache,firstReport=labSkeletonReport;
 assert.equal(calls,1);assert.equal(adoptedCourseCache.size,1);
 const snapshot=adoptedCourseCache.values().next().value;
 assert(Object.isFrozen(snapshot));assert(Object.isFrozen(snapshot.holds[0]));
 for(const forbidden of ['hearts','body','grips','stamina','moveCount','dailyRun','player','profile','contacts'])assert(!Object.hasOwn(snapshot,forbidden));
 holds[0].x=-500;route[0].x=-500;initialGrips[0].type='spike';generatedCourse.hearts[0].collected=true;
 labHeartsCache[0].collected=true;labStaminaCache.initialStamina=-1;labSkeletonReport.extra='mutated';
 prepareAdoptedCourse();assert.equal(calls,1);assert.equal(fingerprint(),cold);
 assert.notEqual(holds,firstHolds);assert.notEqual(holds[0],firstHolds[0]);assert.notEqual(route,firstRoute);assert.notEqual(route[0],firstRoute[0]);
 assert.notEqual(labHeartsCache,firstHearts);assert.notEqual(labSkeletonReport,firstReport);
 assert.equal(initialGrips[0],holds[0]);assert.equal(generatedCourse.holds,holds);assert.equal(activeCourseGeneration.report,labSkeletonReport);
 assert.equal(hearts,oldHearts);assert.equal(stamina,17);assert.equal(moveCount,8);assert.equal(body,oldBody);assert.equal(grips,oldGrips);
 assert(Object.isFrozen(activeCourseGeneration.recipe));assert(Object.isFrozen(activeCourseGeneration.retry));
 // Geometry/config and nested solver hooks invalidate without any disk state.
 stagePreviewCache.set('stale-preview',{});
 const radius=HEART_CONFIG.radius;HEART_CONFIG.radius++;
 prepareAdoptedCourse();assert.equal(calls,2);assert.equal(stagePreviewCache.size,0);HEART_CONFIG.radius=radius;
 const hook=labGenerateSkeleton;labGenerateSkeleton=r=>hook(r);
 prepareAdoptedCourse();assert.equal(calls,3);
 const supportHook=supportMotionFraction;supportMotionFraction=(...args)=>supportHook(...args);
 prepareAdoptedCourse();assert.equal(calls,4);supportMotionFraction=supportHook;
 const coupledHook=coupledBodyEnabled;coupledBodyEnabled=()=>false;
 prepareAdoptedCourse();assert.equal(calls,5);assert.equal(adoptedCourseCache.size,0);
 prepareAdoptedCourse();assert.equal(calls,6);assert.equal(adoptedCourseCache.size,0);coupledBodyEnabled=coupledHook;
 // Invalid inputs/errors are not cached and all adopted references roll back.
 const prior={holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,hearts,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
 const failure=new Error('injected cache validation failure');
 labPrepareStaminaAdjustment=()=>{holds=[];throw failure;};
 for(let i=0;i<2;i++){
  assert.throws(prepareAdoptedCourse,e=>e===failure);
  for(const [key,value] of Object.entries(prior))assert.equal(eval(key),value,key+' rollback');
  assert.equal(adoptedCourseCache.size,0);
 }
 labPrepareStaminaAdjustment=()=>{labStaminaCache={initialStamina:4};};
 clearAdoptedCourseCache();for(let n=1;n<=20;n++){level=n;prepareAdoptedCourse();}
 assert.equal(adoptedCourseCache.size,ADOPTED_COURSE_CACHE_CAPACITY);
 clearAdoptedCourseCache();assert.equal(adoptedCourseCache.size,0);
 // Deterministic rejection metadata and Daily identity survive warm reuse.
 let rejected=0;labGenerateSkeleton=recipe=>{if(rejected++<2)throw new CourseGeometryRejection('controlled rejection');hook(recipe);};
 dailyRun={date:'2026-11-05'};level=10;prepareAdoptedCourse();
 const retryFingerprint=fingerprint(),retryCalls=calls;
 assert.equal(activeCourseGeneration.retry.attempts,3);assert.equal(dailyRun.seed,20261105);
 prepareAdoptedCourse();assert.equal(calls,retryCalls);assert.equal(fingerprint(),retryFingerprint);
 clearAdoptedCourseCache();rejected=0;prepareAdoptedCourse();
 assert.equal(calls,retryCalls+1);assert.equal(fingerprint(),retryFingerprint);
 dailyRun=null;
} finally {({labGenerateSkeleton,labPrepareSpikes,labPrepareHearts,labPrepareStaminaAdjustment,fingerValidateDragReference}=originals);clearAdoptedCourseCache();}
console.log('PASS coupled course cache: immutable bounded geometry, exact warm parity, fresh objects, hook/config invalidation, no live resource leakage, failure rollback');
`);

if(process.argv.includes('--real'))run(`
clearAdoptedCourseCache();const started=Date.now();
const preview=stagePreview(1),previewMs=Date.now()-started;
assert.equal(adoptedCourseCache.size,1);
const snapshot=adoptedCourseCache.values().next().value;
const begin=Date.now();reset(1);const startMs=Date.now()-begin;
assert.equal(currentCourseInitialStamina(),preview.stamina);
const fingerprint=()=>JSON.stringify({holds,route,hearts,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache,stamina});
const first=fingerprint(),oldHolds=holds,oldRoute=route,oldHearts=hearts;
holds[0].x=-1;route[0].x=-1;if(hearts[0])hearts[0].collected=true;stamina=-1;moveCount=99;
const retryStart=Date.now();reset(1);const retryMs=Date.now()-retryStart;
assert.equal(fingerprint(),first);assert.notEqual(holds,oldHolds);assert.notEqual(route,oldRoute);assert.notEqual(hearts,oldHearts);
assert.equal(generatedCourse.holds,holds);assert(initialGrips.every(h=>holds.includes(h)));assert.equal(moveCount,0);
assert.equal(adoptedCourseCache.values().next().value,snapshot);
console.log('PASS real preview → start → retry cache: '+JSON.stringify({previewMs,startMs,retryMs}));
`);
