'use strict';
const run=require('./coupled-production-harness.cjs');
run(`
const saved={labGenerateSkeleton,labPrepareSpikes,labPrepareHearts,labPrepareStaminaAdjustment,fingerValidateDragReference};
try {
 clearAdoptedCourseCache();dailyRun=null;level=4;difficulty=0;courseTypeId=0;courseMode='existing';
 const seeds=[];let validations=0;
 labGenerateSkeleton=recipe=>{
  assert(SixPairSelection.useBaseline,'only generation runs baseline');seeds.push(recipe.seed);
  holds=[{id:1,x:100,y:600,type:'normal'},{id:2,x:200,y:50,type:'goal'}];
  route=[{x:100,y:500,grips:[1,1,1,1]},{x:200,y:60,grips:[2,2,2,2]}];
  HEIGHT=700;initialGrips=[holds[0],holds[0],holds[0],holds[0]];densityStats={total:2};
  generatedCourse={holds,hearts:[]};labSkeletonReport={validated:true,seed:recipe.seed};
 };
 labPrepareSpikes=()=>assert(SixPairSelection.useBaseline);
 labPrepareHearts=()=>{assert(SixPairSelection.useBaseline);labHeartsCache=[];};
 labPrepareStaminaAdjustment=()=>{assert(SixPairSelection.useBaseline);labStaminaCache={initialStamina:4};};
 fingerValidateDragReference=()=>{validations++;return {valid:false,step:1};};
 prepareAdoptedCourse();assert.equal(validations,0,'no new-selector same-input gate');assert.equal(seeds.length,1);
 assert.equal(activeCourseGeneration.retry.attempts,1);assert.equal(adoptedCourseCache.size,1);assert(!SixPairSelection.useBaseline);
 prepareAdoptedCourse();assert.equal(validations,0);assert.equal(seeds.length,1,'old validated snapshot reused');
 clearAdoptedCourseCache();labGenerateSkeleton=()=>{throw Error('programming-error');};
 assert.throws(prepareAdoptedCourse,/programming-error/);assert.equal(adoptedCourseCache.size,0);assert(!SixPairSelection.useBaseline);
} finally {Object.entries(saved).forEach(([name,fn])=>eval(name+'=fn'));clearAdoptedCourseCache();}
console.log('PASS six-pair course gate: all generation/witness phases baseline, no live same-input reseed gate, immutable warm cache, errors propagate');
`);
