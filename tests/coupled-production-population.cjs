'use strict';
// Actual production reset, fixed recipe retries, coupled actions, no old-mode fallback.
// ASCENT_POPULATION_STAGES=1,401 or 0-401; ASCENT_POPULATION_DATES=none or dates.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const run=require('./coupled-production-harness.cjs');
const out=process.env.ASCENT_POPULATION_OUT||'build/coupled-population';fs.mkdirSync(out,{recursive:true});
const tag=(process.env.ASCENT_NATIVE_TEST==='1'?'native':'web')+'-'+(process.env.ASCENT_POPULATION_TAG||'population');
fs.writeFileSync(path.join(out,tag+'.jsonl'),'');fs.writeFileSync(path.join(out,tag+'-source.json'),JSON.stringify({digest:run.productionDigest,files:run.sourceManifest},null,2));if(process.env.ASCENT_POPULATION_SNAPSHOTS==='1'){fs.writeFileSync(path.join(out,tag+'-loaded-source.js.gz'),require('node:zlib').gzipSync(run.loadedSource));fs.writeFileSync(path.join(out,tag+'-raw-source.json.gz'),require('node:zlib').gzipSync(JSON.stringify(run.rawEntries)));}
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
function initialize(n,date,{cold=true}={}){if(cold&&typeof clearAdoptedCourseCache==='function')clearAdoptedCourseCache();dailyRun=date?{...dailyProfile(date),returnCourse:'existing'}:null;tutorialRun=n===0?{seen:new Set(),queue:[],explanation:null,introReady:true,timing:false,paused:false}:null;reset(n);}
${require('./helpers/coupled-production-validation.cjs')}
for(const spec of [...selected.map(n=>({n})),...dates.map(date=>({date,n:dailyProfile(date).referenceStage}))]){
 console.log('START',JSON.stringify(spec),Date.now());attemptLog=[];const begin=Date.now();
 try{
 initialize(spec.n,spec.date);const generationMs=Date.now()-begin,reference=route,budget=stamina,heartTemplate=hearts.map(h=>({...h})),stable=fingerprint(),attempts=attemptLog.slice();
 assert(fingerAimEnabled()&&coupledBodyEnabled());assert(reference.slice(1).every(q=>q.action?.gain===1.5&&q.action.bodyMotion===COUPLED_BODY_MODEL));
 assert(samePairRoute(reference,replayRoute(reference)),'exact explicit action/trace/contact replay');
 const referenceResources=routeResources(reference,{pickups:heartTemplate,budget});assert(validateRouteBudget(reference));const plan=resourcePlan(reference,budget,heartTemplate,activeCourseGeneration?.report?.hearts?.placements||[]);const {byStep,...resources}=plan;
 if(spec.n!==0||spec.date){const resolved=spec.date?CourseProgression.resolveDaily(spec.date):CourseProgression.resolveStage(spec.n),expected=CourseProgression.recipe(resolved),actual=activeCourseGeneration;
 for(const k of ['type','length','composition','secondType','heartsFirst','heartsSecond','spikePercent','generationScore','distributionVersion'])assert.equal(actual.recipe[k],expected[k],k);
 assert(actual.retry.attempts>=1&&actual.retry.attempts<=32);assert.equal(actual.retry.geometrySeed,(resolved.seed+actual.retry.attempts-1)>>>0);assert.equal(courseSeed(),resolved.seed);assert.equal(hearts.length,actual.report.hearts.actual.total);
 }
 const retry=activeCourseGeneration?.retry,recipe=activeCourseGeneration?.recipe;const repeatStart=Date.now();initialize(spec.n,spec.date);assert.equal(fingerprint(),stable,'deterministic reset');const repeatMs=Date.now()-repeatStart;
 let warmCache={tested:false};
 if(typeof clearAdoptedCourseCache==='function'&&spec.n!==0){
  const previous={holds,initialGrips,hearts,route},warmStart=Date.now();initialize(spec.n,spec.date,{cold:false});assert.equal(fingerprint(),stable,'warm cache exact fingerprint');assert.notEqual(holds,previous.holds);assert.notEqual(initialGrips,previous.initialGrips);assert.notEqual(hearts,previous.hearts);assert.notEqual(route,previous.route);route.forEach((p,i)=>assert.notEqual(p,previous.route[i],'fresh route entry'));holds.forEach((h,i)=>assert.notEqual(h,previous.holds[i],'fresh hold'));initialGrips.forEach(h=>assert(holds.includes(h),'grip references newly hydrated hold'));hearts.forEach((h,i)=>assert.notEqual(h,previous.hearts[i],'fresh heart'));assert.equal(generatedCourse.holds,holds);warmCache={tested:true,ms:Date.now()-warmStart};
 }

 for(const count of [1,10]){const result=play(reference,count,budget,heartTemplate,plan);assert.equal(result.remaining,resources.remaining,'live stamina '+count);assert.equal(result.pickups,resources.pickups,'live hearts '+count);}
 const hazardProbe=generatedHazardProbe(reference,budget);const row={...spec,ok:true,hazardProbe,warmCache,generationMs,repeatMs,totalMs:Date.now()-begin,moves:reference.length-1,resources,referenceResources,retry,recipe,attempts,fingerprint:stable};log.push(row);emitResult(row);console.log('PASS',JSON.stringify({...row,fingerprint:undefined}));
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
