'use strict';
const fs=require('node:fs'),run=require('./coupled-production-harness.cjs');
const manifest=JSON.parse(fs.readFileSync('course-data/manifest.json')),descriptor=manifest.packs.find(p=>p.id==='stages-00001-01000');
if(!descriptor)throw Error('Integration requires the bundled stage sample');
const pack=JSON.parse(fs.readFileSync('course-data/'+descriptor.file));
const courses=[1,4,26,78].map(n=>pack.courses.find(c=>c.request.level===n&&c.request.date===null));
if(courses.some(c=>!c))throw Error('Integration requires sample stages 1, 4, 26');
const dailyDescriptor=manifest.packs.find(p=>p.id.startsWith('daily-'));
const dailyCourse=dailyDescriptor?JSON.parse(fs.readFileSync('course-data/'+dailyDescriptor.file)).courses[0]:null;
run(`return (async()=>{
 const courses=${JSON.stringify(courses)};
 const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
 globalThis.document=document;document.baseURI='https://example.test/';
 let workerCount=0;globalThis.Worker=class {constructor(){workerCount++;}postMessage(){}terminate(){}};
 courseDataStore={lookup:async(request,validate)=>{
  const c=courses.find(c=>JSON.stringify(c.request)===JSON.stringify(request));
  return c?validate(globalThis.AscentCourseData.decode(c.snapshot)):null;
 }};
 for(const c of courses){
  clearAdoptedCourseCache();const saved=adoptedCourseSnapshot(),job=prepareCourseAsync(c.request.level),lease=await job.promise;
  assert.equal(workerCount,0,'Stored stages must never create a generator Worker');
  assert.equal(holds,saved.holds,'Decoding must not replace current live holds');assert.equal(route,saved.route);
  const decoded=globalThis.AscentCourseData.decode(c.snapshot);
  assert.equal(lease.snapshot.activeCourseGeneration.initialStamina,decoded.activeCourseGeneration.initialStamina);
  assert.deepEqual(lease.snapshot.holds,decoded.holds);
  assert.deepEqual(lease.snapshot.route,decoded.route,'Saved traces and debug grip/anchor/body route markers preserved');
  assert(lease.snapshot.route.every(p=>p.trace===undefined),'Generation-only traces are neither stored nor reconstructed');
  withPreparedCourse(lease,c.request.level,null,()=>reset(c.request.level));
  assert.notEqual(holds,lease.snapshot.holds);assert.deepEqual(holds,lease.snapshot.holds);assert.equal(moveCount,0);
  assert.equal(stamina,decoded.activeCourseGeneration.initialStamina);
  assert.deepEqual(hearts,decoded.generatedCourse.hearts.map(h=>({...h,collected:false})),'Loaded heart placements are used unchanged');
  assert.equal(routeExpectedMoves(),decoded.route.length-1);
  const oldDebug=debugMode,oldCamera=camera,oldLine=ctx.lineTo,oldText=ctx.fillText;let lines=0,labels=0;
  try {debugMode=true;camera=route[0].y-H/2;ctx.lineTo=()=>lines++;ctx.fillText=()=>labels++;drawPath();assert(lines>0&&labels>0,'Body guide line and numbered limb holds render without traces');}
  finally{debugMode=oldDebug;camera=oldCamera;ctx.lineTo=oldLine;ctx.fillText=oldText;}
 }
 // No action replay, heart generation or mutable game context is required at read time.
 {
  const c=courses.find(c=>c.request.level===78),snapshot=globalThis.AscentCourseData.decode(c.snapshot);
  const saved=adoptedCourseSnapshot(),old={debugCourseTrial,debugMode,debugAttempt};
  const replay=fingerReplayRoute,heartBuilder=createHearts,hypot=Math.hypot;
  try {
   debugCourseTrial={kind:'score',score:73,seed:83,typeId:generationTypeForScore(73)};debugMode=true;debugAttempt=true;
   fingerReplayRoute=()=>{throw Error('Read must never replay inputs');};
   createHearts=()=>{throw Error('Read must never generate hearts');};
   Math.hypot=()=>{throw Error('Read must never recompute geometry');};
   const restored=restoreCompactCourse(snapshot,c.request);
   assert.equal(restored,snapshot);assert.deepEqual(restored.route,snapshot.route);
   assert.equal(holds,saved.holds);assert.equal(route,saved.route);assert.equal(debugCourseTrial.score,73);
   for(const mutate of [s=>s.route[1].trace=[],s=>s.route[1].x=NaN,s=>s.route[1].grips=[-1,-1,-1,-1],s=>s.activeCourseGeneration.initialStamina=0]){
    const invalid=globalThis.AscentCourseData.decode(c.snapshot);mutate(invalid);
    assert.throws(()=>restoreCompactCourse(invalid,c.request));
   }
  }finally{fingerReplayRoute=replay;createHearts=heartBuilder;Math.hypot=hypot;({debugCourseTrial,debugMode,debugAttempt}=old);}
 }
 const dailyCourse=${JSON.stringify(dailyCourse)};
 if(dailyCourse){
  const previous=courseDataStore,profile=dailyProfile(dailyCourse.request.date);
  courseDataStore={lookup:async(request,validate)=>JSON.stringify(request)===JSON.stringify(dailyCourse.request)?validate(globalThis.AscentCourseData.decode(dailyCourse.snapshot)):null};
  clearAdoptedCourseCache();const dailyLease=await prepareCourseAsync(1,profile).promise;assert.equal(workerCount,0);
  withPreparedCourse(dailyLease,1,profile,()=>{dailyRun={...profile};reset(1);});
  assert.deepEqual(holds,dailyLease.snapshot.holds);assert.equal(stamina,dailyLease.snapshot.activeCourseGeneration.initialStamina);dailyRun=null;courseDataStore=previous;
 }
 clearAdoptedCourseCache();const absent=prepareCourseAsync(999);await tick();assert.equal(workerCount,1);absent.cancel();await assert.rejects(absent.promise);
 const real=courseDataStore;let complete;
 courseDataStore={lookup:()=>new Promise(r=>complete=r)};
 const cancelled=prepareCourseAsync(3);cancelled.cancel();await assert.rejects(cancelled.promise);complete(null);await tick();assert.equal(workerCount,1,'Canceled read does not trigger generation');
 courseDataStore={lookup:async()=>{throw Error('database failure');}};
 const failed=prepareCourseAsync(3);await tick();assert.equal(workerCount,2);failed.cancel();await assert.rejects(failed.promise);
 clearAdoptedCourseCache();const saved=adoptedCourseSnapshot();
 courseDataStore={lookup:async(request,validate)=>{const bad=globalThis.AscentCourseData.decode(courses[0].snapshot);bad.route[1].trace=[];return validate(bad);}};
 const corrupt=prepareCourseAsync(1);await tick();assert.equal(workerCount,3,'Invalid stored shape triggers generator');assert.equal(holds,saved.holds);assert.equal(route,saved.route);corrupt.cancel();await assert.rejects(corrupt.promise);
 courseDataStore=real;

 console.log('PASS course-data integration: playable stored samples with zero Worker runs; exact geometry/resources/guide markers; trace omission with zero input replay; missing/corrupt/database failure fallback; canceled-load guard; preserved live globals');
})()`);

// These replay checks run only in administrator tooling, never on data loading.
run(require('../scripts/course-data-validation-source.cjs')+`
 const c=${JSON.stringify(courses.find(c=>c.request.level===78))};
 const snapshot=globalThis.AscentCourseData.decode(c.snapshot);
 const verified=adminValidateStoredCourse(snapshot,c.request);
 assert(verified.route.slice(1).every(p=>p.trace.length>0));
 const saved=adoptedCourseSnapshot();
 for(const mutate of [s=>s.route[1].x+=1,s=>s.route[1].penalty+=1,s=>s.route[1].grips[0]=-1,
  s=>{s.route[1].trace=[{x:0,y:0}];}]){
  const bad=globalThis.AscentCourseData.decode(c.snapshot);mutate(bad);
  assert.throws(()=>adminValidateStoredCourse(bad,c.request));
  assert.equal(holds,saved.holds);assert.equal(route,saved.route);
 }
 console.log('PASS admin-only course validation rejects altered pose, penalty, hold ID and trace');
`);
