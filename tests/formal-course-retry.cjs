'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
// Instrument only the pure sampler entry, not production behavior or its RNG.
const marker='function recipe(resolved) {';assert.equal(source.split(marker).length,2);
source=source.replace(marker,marker+' formalRetrySampleCount++; if(formalLegacySampler)return {...CourseDistribution.sampleLegacyV5(resolved.score,resolved.seed),seed:resolved.seed};');
const env=`
let formalRetrySampleCount=0,formalLegacySampler=false;
const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
new Function('assert',env+source+`
// Historical pre-offset identity fixture; current offset behavior has its own suite.
const savedNormalSeedOffset=CourseProgressionConfig.normalSeedOffset;
CourseProgressionConfig.normalSeedOffset=0;
try {
const fields=['type','length','composition','secondType','heartsFirst','heartsSecond','spikePercent','generationScore','distributionVersion'];
const fingerprint=()=>JSON.stringify({holds,route,hearts,stamina,level,difficulty,courseTypeId,seed:courseSeed(),recipe:activeCourseGeneration.recipe,retry:activeCourseGeneration.retry});
const real=[];
// Historical course-v2 / distribution-v5 rejection fixtures: preserve the exact old sampled
// recipes independently of the current editable progression defaults.
const currentSegments=CourseProgressionConfig.stageSegments,currentTail=CourseProgressionConfig.afterLastStageScore;
CourseProgressionConfig.stageSegments=[
 {fromStage:1,toStage:20,fromScore:1,toScore:10},
 {fromStage:21,toStage:80,fromScore:11,toScore:30},
 {fromStage:81,toStage:200,fromScore:30,toScore:40},
 {fromStage:201,toStage:400,interpolationFromStage:200,fromScore:35,toScore:45}
];CourseProgressionConfig.afterLastStageScore=45;formalLegacySampler=true;
try {
for(const n of [117,201,261]){
 dailyRun=null;const expected=CourseProgression.recipe(CourseProgression.resolveStage(n));
 reset(n);const retry=activeCourseGeneration.retry;
 assert(retry.attempts>1&&retry.attempts<=32,'historical v2 rejected stage '+n+' must use bounded geometry retry');
 assert.equal(retry.initialSeed,n);assert.equal(retry.geometrySeed,(n+retry.attempts-1)>>>0);
 for(const key of fields)assert.equal(activeCourseGeneration.recipe[key],expected[key],key+' changed at stage '+n);
 assert.equal(level,n);assert.equal(courseSeed(),n);assert.equal(generatedCourse.level,n);assert.equal(generatedCourse.seed,n);
 assert.equal(activeCourseGeneration.recipe.seed,retry.geometrySeed);assert.equal(activeCourseGeneration.resolved.seed,n);assert.equal(generatedCourse.geometrySeed,retry.geometrySeed);assert.equal(generatedCourse.generationRetryVersion,'1');
 assert(samePairRoute(route,replayRoute(route)),'contact replay at stage '+n);
 assert.equal(hearts.length,activeCourseGeneration.report.hearts.actual.total);
 assert.equal(generatedCourse.holds,holds);
 const first=fingerprint();reset(n);assert.equal(fingerprint(),first,'same failed starting seed must resolve identically');
 const geometry=()=>JSON.stringify({holds,route,HEIGHT,initialGrips,hearts:labHeartsCache,stamina:labStaminaCache});
 const adoptedGeometry=geometry(),identity={level,difficulty,courseTypeId,dailyRun,courseSeed},accepted=activeCourseGeneration;
 generateCourseFromRecipe(accepted.recipe);assert.equal(geometry(),adoptedGeometry,'retry output must equal direct core at effective seed');assert.deepEqual({level,difficulty,courseTypeId,dailyRun,courseSeed},identity);assert.equal(activeCourseGeneration,accepted);
 real.push({stage:n,score:expected.generationScore,type:expected.type,length:expected.length,...retry});
}
} finally {formalLegacySampler=false;CourseProgressionConfig.stageSegments=currentSegments;CourseProgressionConfig.afterLastStageScore=currentTail;}
// First naturally rejected Daily found after the October/November scan:
// 2026-01-16 keeps contrast→switchback/long/score26/caps1+2 and uses +1.
dailyRun={...dailyProfile('2026-01-16'),returnCourse:'existing'};
const realDayRecipe=CourseProgression.recipe(CourseProgression.resolveDaily(dailyRun.date));
reset(dailyRun.referenceStage);assert.equal(activeCourseGeneration.retry.attempts,2);assert.equal(activeCourseGeneration.retry.geometrySeed,20260117);assert.equal(dailyRun.seed,20260116);assert.equal(courseSeed(),20260116);
for(const key of fields)assert.equal(activeCourseGeneration.recipe[key],realDayRecipe[key]);
const realDayFirst=fingerprint();reset(dailyRun.referenceStage);assert.equal(fingerprint(),realDayFirst);
const dayGeometry=()=>JSON.stringify({holds,route,HEIGHT,initialGrips,hearts:labHeartsCache,stamina:labStaminaCache});
const realDayGeometry=dayGeometry(),dayIdentity=dailyRun,dayGeneration=activeCourseGeneration;
generateCourseFromRecipe(dayGeneration.recipe);assert.equal(dayGeometry(),realDayGeometry);assert.equal(dailyRun,dayIdentity);assert.equal(dailyRun.seed,20260116);assert.equal(courseSeed(),20260116);assert.equal(activeCourseGeneration,dayGeneration);
// A Daily uses the same date's immutable recipe and identity through failures.
const nativeGenerate=labGenerateSkeleton;
dailyRun={...dailyProfile('2026-01-01'),returnCourse:'existing'};
const dateRecipe=CourseProgression.recipe(CourseProgression.resolveDaily(dailyRun.date));
let dayAttempts=[];
labGenerateSkeleton=recipe=>{dayAttempts.push({...recipe});if(dayAttempts.length<=2)throw new CourseGeometryRejection('injected Daily geometry failure');return nativeGenerate(recipe);};
try {
 reset(dailyRun.referenceStage);const first=fingerprint(),retry=activeCourseGeneration.retry;
 assert(retry.attempts>=3);assert.equal(retry.initialSeed,20260101);assert.equal(dailyRun.seed,20260101);assert.equal(courseSeed(),20260101);
 for(let i=0;i<dayAttempts.length;i++){assert.equal(dayAttempts[i].seed,(20260101+i)>>>0);for(const key of fields)assert.equal(dayAttempts[i][key],dateRecipe[key]);}
 dayAttempts=[];reset(dailyRun.referenceStage);assert.equal(fingerprint(),first);assert.equal(activeCourseGeneration.retry.attempts,retry.attempts);
} finally {labGenerateSkeleton=nativeGenerate;dailyRun=null;}
// Fast controlled attempts prove exact draw count, +1/wrap ordering and state
// restoration without depending on probabilistic occurrence of a search failure.
const originals={labGenerateSkeleton,labPrepareSpikes,labPrepareHearts,labPrepareStaminaAdjustment};
const previous={holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,hearts,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
function assertPrevious(){for(const [key,value] of Object.entries(previous))assert.equal(eval(key),value,'rollback changed '+key);}
let attempts=[],failures=2;
try {
 labGenerateSkeleton=recipe=>{
  attempts.push({...recipe});assert.equal(courseSeed(),recipe.seed,'solver uses effective geometry seed');
  assert.equal(generatedCourse,null,'previous failed recipe must not survive into another attempt');
  holds=[{id:attempts.length,type:'normal'}];route=[{x:0,y:0},{x:0,y:1}];HEIGHT=700;initialGrips=[];densityStats={};
  level=1;difficulty=0;generatedCourse={hearts:[],holds};labSkeletonReport={};
  if(attempts.length<=failures)throw new CourseGeometryRejection('injected bounded failure');
 };
 labPrepareSpikes=()=>{};labPrepareHearts=()=>{labHeartsCache=[];};labPrepareStaminaAdjustment=()=>{labStaminaCache={initialStamina:4};};
 level=0xffffffff;difficulty=3;courseTypeId=6;const beforeSeedFunction=courseSeed;
 const expected=CourseProgression.recipe(CourseProgression.resolveStage(level));formalRetrySampleCount=0;
 prepareAdoptedCourse();assert.equal(formalRetrySampleCount,1,'sample once, never resample after rejection');
 assert.deepEqual(attempts.map(x=>x.seed),[0xffffffff,0,1]);
 for(const recipe of attempts)for(const key of fields)assert.equal(recipe[key],expected[key]);
 assert.equal(activeCourseGeneration.retry.initialSeed,0xffffffff);assert.equal(activeCourseGeneration.retry.geometrySeed,1);assert.equal(activeCourseGeneration.retry.attempts,3);assert.equal(activeCourseGeneration.retry.maxAttempts,32);assert(activeCourseGeneration.retry.version);
 assert.equal(courseSeed,beforeSeedFunction);assert.equal(level,0xffffffff);assert.equal(difficulty,3);assert.equal(courseTypeId,6);
 // A classified post-placement rejection retries the geometry, not its recipe.
 level=7;difficulty=0;courseTypeId=0;attempts=[];failures=0;formalRetrySampleCount=0;labPrepareSpikes=()=>{if(attempts.length===1)throw new CourseGeometryRejection('post-placement rejection');};prepareAdoptedCourse();assert.deepEqual(attempts.map(x=>x.seed),[7,8]);assert.equal(formalRetrySampleCount,1);assert.equal(activeCourseGeneration.retry.attempts,2);labPrepareSpikes=()=>{};
 // Restore the pre-test live references before testing exhaustion, including a
 // partially collected heart. Failure must not leak the last attempted geometry.
 ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,hearts,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=previous);
 level=55;difficulty=2;courseTypeId=2;attempts=[];failures=Infinity;formalRetrySampleCount=0;
 let exhausted;try{prepareAdoptedCourse();assert.fail('Expected bounded exhaustion');}catch(error){exhausted=error;}
 assert.equal(exhausted.code,'COURSE_GENERATION_EXHAUSTED');assert(exhausted.cause instanceof CourseGeometryRejection);assert.match(exhausted.message,/injected bounded failure/);assert.deepEqual(exhausted.retry,{version:'1',initialSeed:55,geometrySeed:86,attempts:32,maxAttempts:32});
 assert.equal(attempts.length,32);assert.deepEqual(attempts.map(x=>x.seed),Array.from({length:32},(_,i)=>55+i));
 assert.equal(formalRetrySampleCount,1);assertPrevious();assert.equal(level,55);assert.equal(difficulty,2);assert.equal(courseTypeId,2);assert.equal(courseSeed,beforeSeedFunction);
 // Programmer/configuration errors must not be hidden behind32 seed attempts.
 for(const failure of [new Error('unknown exception'),new TypeError('programmer failure')]){let calls=0;labGenerateSkeleton=()=>{calls++;throw failure;};formalRetrySampleCount=0;assert.throws(prepareAdoptedCourse,error=>error===failure);assert.equal(calls,1);assert.equal(formalRetrySampleCount,1);assertPrevious();}
 let calls=0;labGenerateSkeleton=()=>{calls++;};const rounding=CourseProgressionConfig.rounding;try{CourseProgressionConfig.rounding='invalid';assert.throws(prepareAdoptedCourse,/rounding/);assert.equal(calls,0);assertPrevious();}finally{CourseProgressionConfig.rounding=rounding;}
} finally {({labGenerateSkeleton,labPrepareSpikes,labPrepareHearts,labPrepareStaminaAdjustment}=originals);}
console.log('PASS fixed-recipe geometry retries: 3 historical v2 rejected stages/direct-core parity, repeat determinism, Daily identity, one sample, ordered +1 and uint32 wrap,32-attempt exhaustion and rollback; no post-reduction solvability claim');
console.log(JSON.stringify(real));
} finally {CourseProgressionConfig.normalSeedOffset=savedNormalSeedOffset;}
`)(assert);
