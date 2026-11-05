'use strict';
// Actual production reset, fixed recipe retries, coupled actions, no old-mode fallback.
// ASCENT_POPULATION_STAGES=1,401 or 0-401; ASCENT_POPULATION_DATES=none or dates.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const run=require('./coupled-production-harness.cjs');
const out=process.env.ASCENT_POPULATION_OUT||'build/coupled-population';fs.mkdirSync(out,{recursive:true});
const tag=(process.env.ASCENT_NATIVE_TEST==='1'?'native':'web')+'-'+(process.env.ASCENT_POPULATION_TAG||'population');
fs.writeFileSync(path.join(out,tag+'.jsonl'),'');
const stages=(process.env.ASCENT_POPULATION_STAGES==='none'?[]:(process.env.ASCENT_POPULATION_STAGES||'0-401').split(',')).flatMap(s=>s.includes('-')?Array.from({length:+s.split('-')[1]-+s.split('-')[0]+1},(_,i)=>+s.split('-')[0]+i):[+s]);
const rows=run(`
const testHazards=${process.env.ASCENT_POPULATION_HAZARDS==='1'},selected=${JSON.stringify(stages)},requestedDates=${JSON.stringify(process.env.ASCENT_POPULATION_DATES||'representative')};
const log=[];let attemptLog=[];
for(const name of ['labGenerateSkeleton','labPrepareSpikes','labPrepareHearts','labPrepareStaminaAdjustment']){
 const original=eval(name);eval(name+'=function(...args){const t=Date.now();try{return original(...args);}finally{const entry={phase:name,seed:args[0]?.seed,type:args[0]?.type,ms:Date.now()-t};attemptLog.push(entry);if(entry.ms>5000)console.log("PHASE",JSON.stringify(entry));}}');
}
const dates=requestedDates==='none'?[]:requestedDates==='representative'?(()=>{
 const byFamily=new Map();for(let d=1;d<=365;d++){const date=new Date(Date.UTC(2026,0,d)).toISOString().slice(0,10),r=CourseProgression.recipe(CourseProgression.resolveDaily(date));const key=r.type+':'+r.composition+':'+r.secondType;if(!byFamily.has(key))byFamily.set(key,date);}
 return [...new Set(['2026-01-16','2026-10-23','2026-11-05',...byFamily.values()])];
})():requestedDates.split(',');
const fingerprint=()=>JSON.stringify({holds,route,hearts,stamina,HEIGHT,initialGrips,recipe:activeCourseGeneration?.recipe,retry:activeCourseGeneration?.retry});
function initialize(n,date){dailyRun=date?{...dailyProfile(date),returnCourse:'existing'}:null;tutorialRun=n===0?{seen:new Set(),queue:[],explanation:null,introReady:true,timing:false,paused:false}:null;reset(n);}
function resourcePlan(reference,budget,heartTemplate,placements){
 const byStep=new Map();for(const h of placements){const w=h.witness;assert(w?.action&&Number.isInteger(w.fromStep),'explicit heart pickup action');if(!byStep.has(w.fromStep))byStep.set(w.fromStep,[]);byStep.get(w.fromStep).push(w);}
 let mask=0,remaining=budget,penalties=0;const costs=routeHazardCosts(reference);
 for(let i=1;i<reference.length;i++){
  assert(remaining>0,'cannot begin pickup/action at exhausted step '+i);
  for(const w of byStep.get(i-1)||[]){const stance=w.grips.map(id=>holds.find(h=>h.id===id)),m=fingerGestureReplay(w.from,stance,w.action);assert(m?.active,'heart gesture active');assert(fingerRouteSampleStable(w.from,stance,w.action,m,{requireRelease:false}),'heart resampling');const next=fingerRouteTraceMask(heartTemplate,mask,m.trace);remaining+=(bitCount(next)-bitCount(mask))*HEART_CONFIG.recovery;mask=next;}
  const next=coursePickupMask(heartTemplate,mask,reference[i-1],reference[i]);remaining+=(bitCount(next)-bitCount(mask))*HEART_CONFIG.recovery-1-(costs[i]-costs[i-1]);penalties+=costs[i]-costs[i-1];mask=next;assert(remaining>=0,'resource plan exhausted at '+i);
 }
 assert.equal(bitCount(mask),heartTemplate.length,'all authored heart witnesses collect their pickups');return {byStep,remaining,pickups:bitCount(mask),penalties,budget,moves:reference.length-1,canceledPickups:placements.length};
}
function play(reference,count,initialBudget,heartTemplate,plan){
 body={...reference[0]};committed={...body};grips=fingerRouteInitial();startGrips=[...grips];stamina=initialBudget;hearts=heartTemplate.map(h=>({...h,collected:false}));moveCount=0;state='playing';drag=null;cameraIntro=null;settingsOpen=false;featureHelpOpen=false;
 // Tutorial UI lessons are orthogonal to physics, which is exercised via real input.
 tutorialRun=null;finish=won=>{state=won?'won':'lost';};
 for(let i=1;i<reference.length;i++){
  assert(stamina>0,'exhausted before move '+i);camera=clamp(body.y-H*.6,0,HEIGHT-H);
  for(const w of plan.byStep.get(i-1)||[]){
   const before={...body},beforeGrips=ids(grips),beforeMoves=moveCount;nearly(before,w.from);assert.deepEqual(beforeGrips,w.grips);
   const pickupOrigin=eventAtScreen(137,320);down(pickupOrigin);assert(drag);for(const p of fingerResampledAction(w.action,count).points)move(movedEvent(pickupOrigin,p));release(true);nearly(body,before);assert.deepEqual(ids(grips),beforeGrips);assert.equal(moveCount,beforeMoves);assert(lastFingerGesture.canceled);
  }
  const e=eventAtScreen(123,330);down(e);assert(drag,'drag '+i);
  const sampled=fingerResampledAction(reference[i].action,count);for(const p of sampled.points)move(movedEvent(e,p));
  release();assert.equal(moveCount,i,'live commit '+JSON.stringify({step:i,samples:count,action:reference[i].action,expected:{x:reference[i].x,y:reference[i].y,grips:reference[i].grips},actual:{body,grips:ids(grips),state,stamina},record:lastFingerGesture&&{...lastFingerGesture,trace:undefined}}));assert.notEqual(state,'lost');nearly(body,reference[i]);assert.deepEqual(ids(grips),reference[i].grips,'live contacts '+JSON.stringify({step:i,samples:count,action:reference[i].action,body,record:lastFingerGesture&&{...lastFingerGesture,trace:undefined}}));assert.equal(lastFingerGesture.accepted,true);
 }
 assert.equal(state,'won');return {remaining:stamina,pickups:hearts.filter(h=>h.collected).length};
}
function generatedHazardProbe(reference,budget){
 const candidates=holds.filter(h=>h.type==='hazard');if(!testHazards)return {tested:false,count:candidates.length};
 let checked=0;
 for(const h of candidates){checked++;const witness=fingerFindHazardMove(h,reference);if(!witness)continue;
  const from=reference[witness.step],stance=witness.step?from.grips.map(id=>holds.find(h=>h.id===id)):fingerRouteInitial();
  const cold=fingerGestureReplay(from,stance,witness.action);assert(cold?.valid&&cold.penalty>0);assert.equal(cold.penalty,newHazardContacts(cold.stance,stance).size*HAZARD_CONFIG.penalty);
  for(const samples of [1,10]){
   body={x:from.x,y:from.y};committed={...body};grips=[...stance];startGrips=[...stance];stamina=budget;moveCount=0;state='playing';drag=null;cameraIntro=null;settingsOpen=false;featureHelpOpen=false;tutorialRun=null;hearts=hearts.map(p=>({...p,collected:true}));camera=clamp(body.y-H*.6,0,HEIGHT-H);
   const e=eventAtScreen(123,330);down(e);assert(drag);for(const p of fingerResampledAction(witness.action,samples).points)move(movedEvent(e,p));release();assert.equal(moveCount,1);nearly(body,cold.p);assert.deepEqual(ids(grips),ids(cold.stance));assert.equal(stamina,budget-1-cold.penalty);assert(lastFingerGesture.accepted);assert.equal(lastFingerGesture.trace.length,cold.trace.length);lastFingerGesture.trace.forEach((p,i)=>nearly(p,cold.trace[i]));
  }
  return {tested:true,count:candidates.length,checked,found:true,id:h.id,step:witness.step,penalty:cold.penalty,samples:[1,10]};
 }
 return {tested:true,count:candidates.length,checked,found:false};
}
for(const spec of [...selected.map(n=>({n})),...dates.map(date=>({date,n:dailyProfile(date).referenceStage}))]){
 console.log('START',JSON.stringify(spec),Date.now());attemptLog=[];const begin=Date.now();
 try{
 initialize(spec.n,spec.date);const generationMs=Date.now()-begin,reference=route,budget=stamina,heartTemplate=hearts.map(h=>({...h})),stable=fingerprint(),attempts=attemptLog.slice();
 assert(fingerAimEnabled()&&coupledBodyEnabled());assert(reference.slice(1).every(q=>q.action?.gain===1&&q.action.bodyMotion===COUPLED_BODY_MODEL));
 assert(samePairRoute(reference,replayRoute(reference)),'exact explicit action/trace/contact replay');
 const referenceResources=routeResources(reference,{pickups:heartTemplate,budget});assert(validateRouteBudget(reference));const plan=resourcePlan(reference,budget,heartTemplate,activeCourseGeneration?.report?.hearts?.placements||[]);const {byStep,...resources}=plan;
 if(spec.n!==0||spec.date){const resolved=spec.date?CourseProgression.resolveDaily(spec.date):CourseProgression.resolveStage(spec.n),expected=CourseProgression.recipe(resolved),actual=activeCourseGeneration;
 for(const k of ['type','length','composition','secondType','heartsFirst','heartsSecond','spikePercent','generationScore','distributionVersion'])assert.equal(actual.recipe[k],expected[k],k);
 assert(actual.retry.attempts>=1&&actual.retry.attempts<=32);assert.equal(actual.retry.geometrySeed,(resolved.seed+actual.retry.attempts-1)>>>0);assert.equal(courseSeed(),resolved.seed);assert.equal(hearts.length,actual.report.hearts.actual.total);
 }
 const retry=activeCourseGeneration?.retry,recipe=activeCourseGeneration?.recipe;const repeatStart=Date.now();initialize(spec.n,spec.date);assert.equal(fingerprint(),stable,'deterministic reset');const repeatMs=Date.now()-repeatStart;
 for(const count of [1,10]){const result=play(reference,count,budget,heartTemplate,plan);assert.equal(result.remaining,resources.remaining,'live stamina '+count);assert.equal(result.pickups,resources.pickups,'live hearts '+count);}
 const hazardProbe=generatedHazardProbe(reference,budget);const row={...spec,ok:true,hazardProbe,generationMs,repeatMs,totalMs:Date.now()-begin,moves:reference.length-1,resources,referenceResources,retry,recipe,attempts,fingerprint:stable};log.push(row);emitResult(row);console.log('PASS',JSON.stringify({...row,fingerprint:undefined}));
 }catch(e){const row={...spec,ok:false,totalMs:Date.now()-begin,error:e.stack,attempts:attemptLog};log.push(row);emitResult(row);console.log('FAIL',JSON.stringify(row));}
}
return log;
`,row=>{
 row.productionDigest=run.productionDigest;
 if(row.fingerprint){
  row.sha256=crypto.createHash('sha256').update(row.fingerprint).digest('hex');
  if(process.env.ASCENT_POPULATION_SNAPSHOTS==='1'){const dir=path.join(out,tag+'-snapshots');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,(row.date||'stage-'+row.n)+'.json.gz'),require('node:zlib').gzipSync(row.fingerprint));}
  delete row.fingerprint;
 }
 fs.appendFileSync(path.join(out,tag+'.jsonl'),JSON.stringify(row)+'\n');
});
for(const r of rows){r.productionDigest=run.productionDigest;if(r.fingerprint){r.sha256=crypto.createHash('sha256').update(r.fingerprint).digest('hex');delete r.fingerprint;}}
const file=path.join(out,(process.env.ASCENT_NATIVE_TEST==='1'?'native':'web')+'-'+(process.env.ASCENT_POPULATION_TAG||'population')+'.json');fs.writeFileSync(file,JSON.stringify(rows,null,2));console.log('REPORT',file);if(rows.some(r=>!r.ok))process.exitCode=1;
