'use strict';
const fs=require('node:fs'),run=require('./coupled-production-harness.cjs');
const manifest=JSON.parse(fs.readFileSync('course-data/manifest.json')),descriptor=manifest.packs.find(p=>p.id==='stages-00001-01000');
if(!descriptor)throw Error('Integration requires the bundled stage sample');
const pack=JSON.parse(fs.readFileSync('course-data/'+descriptor.file));
const courses=[1,4,26].map(n=>pack.courses.find(c=>c.request.level===n&&c.request.date===null));
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
  assert.deepEqual(lease.snapshot.route.map(({trace,...p})=>p),decoded.route,'Debug grip/anchor/body route markers preserved');
  assert(lease.snapshot.route.slice(1).every(p=>p.trace.length>0),'Recorded trace reconstructed');
  withPreparedCourse(lease,c.request.level,null,()=>reset(c.request.level));
  assert.notEqual(holds,lease.snapshot.holds);assert.deepEqual(holds,lease.snapshot.holds);assert.equal(moveCount,0);
  assert.equal(stamina,decoded.activeCourseGeneration.initialStamina);
 }
 // Build a pickup-mask witness with the real heart and gesture logic, then restore
 // it while a valid debug trial is active. Production samples may omit masks.
 {
  const c=courses[2],snapshot=globalThis.AscentCourseData.decode(c.snapshot);
  const saved=adoptedCourseSnapshot(),oldSettings={level,difficulty,courseTypeId,courseMode,dailyRun,tutorialRun,debugCourseTrial,debugMode,debugAttempt};
  try {
   ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=snapshot);
   level=c.request.level;difficulty=c.request.difficulty;courseTypeId=c.request.courseTypeId;courseMode='existing';dailyRun=null;tutorialRun=null;debugCourseTrial=null;debugMode=false;debugAttempt=false;
   const masked=route.map(p=>({...p,pickupMask:0}));
   snapshot.route=SixPairSelection.withBaseline(()=>fingerReplayRoute(masked)).map(({trace,...p})=>p);
   assert(snapshot.route.every(p=>Number.isInteger(p.pickupMask)));
  }finally{
   ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=saved);
   ({level,difficulty,courseTypeId,courseMode,dailyRun,tutorialRun,debugCourseTrial,debugMode,debugAttempt}=oldSettings);
  }
  const trial={kind:'score',score:73,seed:83,typeId:generationTypeForScore(73)};
  debugCourseTrial=trial;debugMode=true;debugAttempt=true;
  assert.equal(activeDebugCourse(),trial);
  const originalHearts=createHearts,originalReplay=fingerReplayRoute;let heartCalls=0;
  createHearts=(...args)=>{
   heartCalls++;assert.equal(debugCourseTrial,null);assert.equal(debugMode,false);assert.equal(debugAttempt,false);
   assert.equal(courseSeed(),c.request.resolved.seed,'Replay must use stored stage identity, never the active debug seed');
   return originalHearts(...args);
  };
  const assertRestored=()=>{assert.equal(debugCourseTrial,trial);assert.equal(debugMode,true);assert.equal(debugAttempt,true);assert.equal(activeDebugCourse(),trial);assert.equal(holds,saved.holds);assert.equal(route,saved.route);};
  try {
   const restored=restoreCompactCourse(snapshot,c.request);
   assert(heartCalls>0,'Masked witness must exercise real heart creation');
   assert.deepEqual(restored.route.map(({trace,...p})=>p),snapshot.route);assertRestored();
   fingerReplayRoute=()=>{assert.equal(debugCourseTrial,null);assert.equal(debugMode,false);assert.equal(debugAttempt,false);throw Error('injected replay failure');};
   assert.throws(()=>restoreCompactCourse(snapshot,c.request),/injected replay failure/);assertRestored();
  }finally{
   createHearts=originalHearts;fingerReplayRoute=originalReplay;
   ({debugCourseTrial,debugMode,debugAttempt}=oldSettings);
  }
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
 courseDataStore={lookup:async(request,validate)=>{const bad=globalThis.AscentCourseData.decode(courses[0].snapshot);bad.route[1].x+=1;return validate(bad);}};
 const corrupt=prepareCourseAsync(1);await tick();assert.equal(workerCount,3,'Invalid witness triggers generator');assert.equal(holds,saved.holds);assert.equal(route,saved.route);corrupt.cancel();await assert.rejects(corrupt.promise);
 courseDataStore=real;
 console.log('PASS course-data integration: playable stored samples with zero Worker runs; exact geometry/resources/guide markers; trace reconstruction; missing/corrupt/database failure fallback; canceled-load guard; preserved live globals');
})()`);
