'use strict';
// Test-only input witnesses. Never used by the runtime generation flow.
const run=require('./coupled-production-harness.cjs');
const stages=(process.env.ASCENT_ALTERNATIVE_STAGES||'1').split(',').map(Number);
run(`
${require('./helpers/coupled-production-validation.cjs')}
const testHazards=false;
for(const stage of ${JSON.stringify(stages)}) {
 const begin=Date.now();level=stage;dailyRun=null;courseMode='existing';difficulty=0;
 const recipe=CourseProgression.recipe(CourseProgression.resolveStage(stage));
 clearAdoptedCourseCache();courseTypeId=0;prepareAdoptedCourse();
 assert.equal(activeCourseGeneration.retry.geometrySeed,recipe.seed,'representative baseline seed preserved');
 assert(SixPairSelection.withBaseline(()=>fingerValidateDragReference(route)).valid,'baseline generation witness');
 const originalGeometry=JSON.stringify({holds,route,labHeartsCache});
 const placements=JSON.parse(JSON.stringify(labSkeletonReport.hearts.placements));
 const generationMs=Date.now()-begin,repairStart=Date.now();
 const target=JSON.parse(JSON.stringify(route)),summary={stage,seed:recipe.seed,moves:target.length-1,changed:[],failed:[],checks:0};
 let stance=fingerRouteInitial();
 for(let i=1;i<target.length;i++) {
  const from=target[i-1],to=target[i],original=to.action;
  const match=m=>m?.valid&&distance(m.p,to)<1e-7&&JSON.stringify(m.stance.map(h=>h?.id))===JSON.stringify(to.grips)&&JSON.stringify(m.anchor)===JSON.stringify(to.anchor);
  let actual=fingerGestureReplay(from,stance,original);
  if(!match(actual)){
   const saved={committed,startGrips};committed=from;startGrips=stance;const map=SixPairSelection.plan();({committed,startGrips}=saved);
   const sectors=[...map.protectedSectors,...map.sectors].filter(s=>JSON.stringify(s.pair)===JSON.stringify(to.anchor));
   let found=null;
   for(const s of sectors)for(const fraction of [.5,.25,.75])for(const radius of [5.0001,6,10]){
    if(found)break;const angle=s.start+s.width*fraction;
    const candidate={...original,points:[{dx:Math.cos(angle)*radius,dy:Math.sin(angle)*radius},{dx:0,dy:0},...original.points]};summary.checks++;
    const m=fingerGestureReplay(from,stance,candidate);
    if(match(m)&&fingerRouteSampleStable(from,stance,candidate,m)){found={candidate,m,radius,fraction};break;}
   }
   if(found){to.action=found.candidate;to.trace=found.m.trace;actual=found.m;summary.changed.push({step:i,radius:found.radius,fraction:found.fraction});}
   else summary.failed.push({step:i,expected:to.anchor,actual:actual?.anchor,bodyGap:actual?distance(actual.p,to):null});
  }
  stance=to.grips.map(id=>holds.find(h=>h.id===id));
 }
 summary.validation=fingerValidateDragReference(target);
 if(summary.validation.valid){
  summary.routeRepairMs=Date.now()-repairStart;summary.generationMs=generationMs;summary.heartChanges=[];
  for(const h of placements){
   const w=h.witness,from=w.from,stance=w.grips.map(id=>holds.find(h=>h.id===id));
   const old=SixPairSelection.withBaseline(()=>fingerGestureReplay(from,stance,w.action));
   const match=m=>m?.active&&distance(m.p,old.p)<1e-7&&JSON.stringify(m.anchor)===JSON.stringify(old.anchor)&&JSON.stringify(m.stance.map(h=>h?.id))===JSON.stringify(old.stance.map(h=>h?.id))&&fingerRouteTraceMask([h],0,m.trace)===1;
   const direct=fingerGestureReplay(from,stance,w.action);if(match(direct)&&fingerRouteSampleStable(from,stance,w.action,direct,{requireRelease:false}))continue;
   const saved={committed,startGrips};committed=from;startGrips=stance;const map=SixPairSelection.plan();({committed,startGrips}=saved);
   let found=false;
   for(const sec of [...map.protectedSectors,...map.sectors].filter(s=>JSON.stringify(s.pair)===JSON.stringify(old.anchor)))for(const radius of [6,10]){
    if(found)break;const angle=sec.start+sec.width/2,candidate={...w.action,points:[{dx:radius*Math.cos(angle),dy:radius*Math.sin(angle)},{dx:0,dy:0},...w.action.points]},m=fingerGestureReplay(from,stance,candidate);
    if(match(m)&&fingerRouteSampleStable(from,stance,candidate,m,{requireRelease:false})){w.action=candidate;w.trace=m.trace;summary.heartChanges.push({id:h.id,radius});found=true;break;}
   }
   if(!found)summary.heartChanges.push({id:h.id,failed:true});
  }
  const heartTemplate=labHeartsCache.map(h=>({...h})),budget=labStaminaCache.initialStamina;
  try {const plan=resourcePlan(target,budget,heartTemplate,placements);summary.live=[1,10].map(count=>({samples:count,...play(target,count,budget,heartTemplate,plan)}));}catch(e){summary.liveError=e.stack;}
 }
 summary.ms=Date.now()-begin;
 assert.equal(JSON.stringify({holds,route,labHeartsCache}),originalGeometry,'test conversion cannot alter generated data');
 assert(summary.validation.valid,JSON.stringify(summary));assert(!summary.liveError,summary.liveError);assert.equal(summary.live.length,2);
 console.log('PASS baseline/live alternative',JSON.stringify(summary));emitResult(summary);
}
`);
