'use strict';
// Explicit slow sweep, kept separate from the fast registry checks.
const fixtures=require('./fixtures/straight-support-trial.json');
const stages=(process.env.ASCENT_STRAIGHT_STAGES||Object.keys(fixtures.stages).join(',')).split(',').map(Number);
require('./coupled-production-harness.cjs')(`
const fixtures=${JSON.stringify(fixtures.stages)};
const plain=x=>JSON.parse(JSON.stringify(x));
const geometry=r=>r.map(p=>Object.fromEntries(['x','y','anchor','grips'].filter(k=>k in p).map(k=>[k,p[k]])));
for(const stage of ${JSON.stringify(stages)}){
 const begin=Date.now(),expected=fixtures[stage];
 level=stage;dailyRun=null;courseMode='existing';difficulty=0;courseTypeId=0;clearAdoptedCourseCache();
 SixPairSelection.withBaseline(()=>prepareAdoptedCourse());
 assert.equal(labStraightSupportContext,null,'generation context restored');assert(!SixPairSelection.useBaseline);
 assert.deepEqual(plain(holds),expected.holds,'stage '+stage+' exact approved trial holds');
 assert.deepEqual(plain(geometry(route)),expected.route,'stage '+stage+' trial reference body/anchors/grips');
 assert.equal(HEIGHT,expected.HEIGHT);assert.deepEqual(plain(initialGrips.map(h=>h.id)),expected.initialGrips);
 assert.deepEqual(plain(labHeartsCache),expected.hearts,'hearts unchanged');
 assert.deepEqual(plain(activeCourseGeneration.retry),expected.retry,'retry geometry seed preserved');
 const valid=SixPairSelection.withBaseline(()=>fingerValidateDragReference(route));assert(valid.valid,JSON.stringify(valid));
 assert(SixPairSelection.withBaseline(()=>hasHazardFallbackCandidates(route)),'hazard fallback valid');
 const report=labSkeletonReport.straightSupports||null;
 assert.deepEqual(plain(report),expected.supportReport,'exact support report');
 if(report){
  assert.equal(report.difficultyLinked,false);assert.equal(report.halfWidth,80);
  const t=report.thinning;assert(t.applied);assert.equal(t.targetCount,Math.floor(t.beforeCount/2));assert.equal(t.afterCount,t.targetCount);assert.deepEqual(t.unreducedIds,[]);
  assert(t.referenceRouteUnchanged&&report.finalReferenceReplay);
  const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]),ids=new Set(holds.map(h=>h.id));
  for(const id of used)assert(ids.has(id),'route-used contact retained');
  const context={config:expected.recipe,sections:labSkeletonReport.composition?.sections||null};
  for(const id of report.supportIds){const h=holds.find(h=>h.id===id);assert(h&&h.type==='normal'&&!used.has(id));assert(labStraightSupportOwned(h,context));assert(labStraightSupportDistance(h,route)<=80+1e-9);}
 }else{
  assert(expected.nonStraightBaseline,'nonstraight baseline supplied');
  assert.deepEqual(expected.holds,expected.nonStraightBaseline.holds,'nonstraight baseline holds unchanged');
  assert.deepEqual(expected.route,expected.nonStraightBaseline.route,'nonstraight baseline route unchanged');
  assert.deepEqual(expected.hearts,expected.nonStraightBaseline.hearts,'nonstraight baseline hearts unchanged');
 }
 console.log('PASS straight trial integration',JSON.stringify({stage,ms:Date.now()-begin,holds:holds.length,moves:route.length-1,supports:report?.normalCount??null}));
}
`);
