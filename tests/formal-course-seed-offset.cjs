'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
const marker='function recipe(resolved) {';assert.equal(source.split(marker).length,2);source=source.replace(marker,marker+' seedOffsetSampleCalls++;');
new Function('assert','let seedOffsetSampleCalls=0;'+env+source+`
assert.equal(CourseProgressionConfig.normalSeedOffset,10);assert.equal(CourseDistribution.version,'7');
const frozenRecipe=r=>{const copy={...r};delete copy.seed;return copy;};
const shape=()=>JSON.stringify({holds,route,hearts,stamina,HEIGHT,initialGrips});
const sampledFeatures=Array.from({length:20},(_,i)=>{const stage=i+1,r=CourseProgression.recipe(CourseProgression.resolveStage(stage));return {stage,seed:r.seed,score:r.generationScore,length:r.length,hearts:r.heartsFirst+r.heartsSecond,spikePercent:r.spikePercent};});
const firstSpike=sampledFeatures.find(r=>r.spikePercent>0)?.stage;assert(firstSpike);
const report=[];
let heartInputTested=false;
for(let stage=1;stage<=20;stage++){
 dailyRun=null;const expected=CourseProgression.recipe(CourseProgression.resolveStage(stage));
 reset(stage);const active=activeCourseGeneration,first=shape();
 assert.equal(level,stage);assert.equal(generatedCourse.level,stage);assert.equal(active.resolved.stage,stage);
 assert.equal(active.resolved.seed,stage+10);assert.equal(generatedCourse.seed,stage+10);assert.equal(courseSeed(),stage+10);
 assert.equal(active.retry.initialSeed,stage+10);assert.equal(active.retry.geometrySeed,(stage+10+active.retry.attempts-1)>>>0);assert.equal(active.recipe.seed,active.retry.geometrySeed);
 for(const key of Object.keys(expected).filter(k=>k!=='seed'))assert.equal(active.recipe[key],expected[key]);
 assert(samePairRoute(route,replayRoute(route)));assert.equal(hearts.length,active.report.hearts.actual.total);
 assert.deepEqual(hearts.map(({id,x,y})=>({id,x,y})),generatedCourse.hearts.map(({id,x,y})=>({id,x,y})),'live adopted heart placements must not fall back');
 assert.equal(active.resolved.score,stage);assert.equal(active.resolved.difficultyLabel,stage<=5?'EASY':'NORMAL');
 const preview=stagePreview(stage);assert.equal(preview.seed,stage+10);assert.equal(preview.stamina,stamina);assert.equal(preview.height,HEIGHT);assert.equal(shape(),first);assert.equal(activeCourseGeneration,active);
 reset(stage);assert.equal(shape(),first);assert.deepEqual(activeCourseGeneration.retry,active.retry);
 const testHeart=!heartInputTested&&hearts.length>0;let physical=null;
 if(stage===1||stage===firstSpike||testHeart){
  if(testHeart)heartInputTested=true;
  if(stage===firstSpike)assert(active.report.spikes.count>0,'first selected low-score spike stage must place actual spikes');
  if(!testHeart)assert.equal(hearts.length,0);const budget=stamina;cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
  for(let i=1;i<route.length&&state==='playing';i++){camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);const event=p=>({clientX:p.x,clientY:p.y-camera});down(event(body));move(event(route[i]));release();}
  physical={state,moves:moveCount,expectedMoves:route.length-1,remaining:stamina,budget,picked:hearts.filter(h=>h.collected).length};
  assert.equal(stamina,budget-moveCount+physical.picked*HEART_CONFIG.recovery);
  if(!testHeart){assert.equal(state,'won','default input clear stage '+stage);assert.equal(moveCount,route.length-1);assert.equal(stamina,3);}
  else {assert(['won','lost'].includes(state));if(state==='won')assert.equal(moveCount,route.length-1);else assert.equal(stamina,0,'report legitimate default-budget exhaustion, not an input failure');}
 }
 report.push({stage,seed:active.resolved.seed,score:active.resolved.score,length:expected.length,spikePercent:expected.spikePercent,actualHearts:hearts.length,actualSpikes:active.report.spikes.count,...(physical?{defaultInput:physical}:{}),...active.retry});
}
// Real Daily geometry and identity are independent of the normal offset data.
for(const date of ['2026-03-21','2026-01-16']){
 dailyRun={...dailyProfile(date),returnCourse:'existing'};const profile=JSON.stringify(dailyRun);
 reset(dailyRun.referenceStage);const before=shape(),resolved=JSON.stringify(activeCourseGeneration.resolved),retry=JSON.stringify(activeCourseGeneration.retry);
 try{for(const offset of [0,100,200]){CourseProgressionConfig.normalSeedOffset=offset;reset(dailyRun.referenceStage);assert.equal(shape(),before);assert.equal(JSON.stringify(dailyRun),profile);assert.equal(JSON.stringify(activeCourseGeneration.resolved),resolved);assert.equal(JSON.stringify(activeCourseGeneration.retry),retry);}}
 finally{CourseProgressionConfig.normalSeedOffset=10;}
}
dailyRun=null;
// Mock only the geometry rejection boundary: one sample, base+10 then +1,
// frozen recipe, bounded32 failures and full rollback of live references.
reset(4);const previous={holds,route,hearts,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
const originals={labGenerateSkeleton,labPrepareSpikes,labPrepareHearts,labPrepareStaminaAdjustment};
let attempts=[],failures=2;
try{
 labGenerateSkeleton=r=>{attempts.push({...r});assert.equal(courseSeed(),r.seed);holds=[];route=[{},{}];initialGrips=[];generatedCourse={holds,hearts:[]};labSkeletonReport={};if(attempts.length<=failures)throw new CourseGeometryRejection('offset fixture rejection');};
 labPrepareSpikes=()=>{};labPrepareHearts=()=>{labHeartsCache=[];};labPrepareStaminaAdjustment=()=>{labStaminaCache={initialStamina:4};};
 level=4;seedOffsetSampleCalls=0;prepareAdoptedCourse();assert.equal(seedOffsetSampleCalls,1);assert.deepEqual(attempts.map(r=>r.seed),[14,15,16]);
 for(const r of attempts)assert.deepEqual(frozenRecipe(r),frozenRecipe(attempts[0]));assert.equal(activeCourseGeneration.resolved.seed,14);assert.equal(generatedCourse.seed,14);assert.equal(level,4);assert.equal(courseSeed(),14);
 ({holds,route,hearts,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=previous);
 attempts=[];failures=Infinity;seedOffsetSampleCalls=0;
 assert.throws(prepareAdoptedCourse,error=>{assert.equal(error.code,'COURSE_GENERATION_EXHAUSTED');assert.equal(error.retry.initialSeed,14);assert.equal(error.retry.geometrySeed,45);assert.equal(error.retry.attempts,32);return true;});
 assert.equal(seedOffsetSampleCalls,1);assert.deepEqual(attempts.map(r=>r.seed),Array.from({length:32},(_,i)=>14+i));
 for(const r of attempts)assert.deepEqual(frozenRecipe(r),frozenRecipe(attempts[0]));for(const [k,v] of Object.entries(previous))assert.equal(eval(k),v,'rollback '+k);assert.equal(level,4);assert.equal(courseSeed(),14);
}finally{({labGenerateSkeleton,labPrepareSpikes,labPrepareHearts,labPrepareStaminaAdjustment}=originals);}
const sampledSpikes=[];for(let stage=1;stage<=20;stage++){const r=CourseProgression.recipe(CourseProgression.resolveStage(stage));if(r.spikePercent)sampledSpikes.push({stage,seed:r.seed,score:r.generationScore,spikePercent:r.spikePercent});}
console.log('PASS offset10 normal stage identity/seed, actual generation/repeat/preview/contact replay; real Daily unchanged; fixed-recipe retry and bounded rollback');
console.log(JSON.stringify({actual:report,sampledFeatures,sampledSpikes,scope:'sampled spike percentages are not actual spike counts; generation/contact replay is not universal default-stamina solvability'}));
`)(assert);
