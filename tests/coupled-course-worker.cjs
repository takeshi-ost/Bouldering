'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads');
const run=require('./coupled-production-harness.cjs');
const {buildCourseWorker}=require('../scripts/build-course-worker.cjs');
const built=buildCourseWorker();
for(const [file,source]of Object.entries(built.output))assert.equal(fs.readFileSync(file,'utf8'),source,'Current worker artifact '+file);
const source=built.output['js/course-worker.js'];
assert(!/\b(?:importScripts|fetch|XMLHttpRequest)\s*\(|new\s+(?:WebSocket|Worker)\s*\(/.test(source.replace(/new globalThis.Worker\([^;]+;/g,'')));
assert(!/\bimport\s*\(/.test(source));
function invoke(input){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(`const {parentPort}=require('node:worker_threads');
   for(const key of ['document','localStorage','sessionStorage','indexedDB','fetch','XMLHttpRequest'])
    Object.defineProperty(globalThis,key,{get(){throw Error('Forbidden worker access: '+key);}});
   // Match the production harness clock so diagnostic elapsedMs is byte-comparable.
   Object.defineProperty(globalThis,'performance',{value:{now:()=>10000},configurable:true});
   globalThis.postMessage=value=>parentPort.postMessage(value);
   ${source}
   parentPort.on('message',data=>globalThis.onmessage({data}));`,{eval:true});
  const timeout=setTimeout(()=>{worker.terminate();reject(Error('Worker exceeded test timeout'));},180000);
  const finish=(error,result)=>{clearTimeout(timeout);worker.terminate();error?reject(error):resolve(result);};
  worker.once('error',finish);let ready=false;worker.on('message',result=>{
   if(result.type==='ready'){assert.equal(result.buildId,built.manifest.id);ready=true;return;}
   assert(ready,'Worker must announce ready before generation/result');finish(null,result);
  });worker.postMessage(input);
 });
}
function fixture({offset=10,date=null,n=1,score=null}={}){
 return run(`
  CourseProgressionConfig.normalSeedOffset=${offset};
  const profile=${score?`{kind:'score',score:${score},seed:${score+10},typeId:generationTypeForScore(${score})}`:date?`dailyProfile(${JSON.stringify(date)})`:'null'};
  const request=coursePreparationIdentity(${n},profile),signature=refreshAdoptedCourseCacheDependencies();
  return {input:{protocol:1,requestId:1,buildId:globalThis.ASCENT_COURSE_BUILD.id,request,
    portable:coursePreparationPortableSignature(),runtime:coursePreparationRuntimeConfig()},
   compare(result){
    assert.equal(result.error,undefined,JSON.stringify(result.error));
    assert.equal(result.buildId,globalThis.ASCENT_COURSE_BUILD.id);
    assert.equal(JSON.stringify(result.request),JSON.stringify(request));
    assert.equal(result.portable,coursePreparationPortableSignature());
    validatePreparedCourse(result.snapshot,request);
    assert.equal(result.snapshot.initialGrips[0],result.snapshot.holds.find(h=>h.id===result.snapshot.initialGrips[0].id));
    assert.equal(result.snapshot.generatedCourse.holds,result.snapshot.holds);
    assert.equal(result.snapshot.activeCourseGeneration.report,result.snapshot.labSkeletonReport);
    if(profile?.kind==='score'){level=${n};difficulty=request.difficulty;courseTypeId=request.courseTypeId;debugAttempt=debugMode=true;debugCourseTrial=profile;prepareAdoptedCourse();}
    else stagePreview(${n},'existing',profile);
    const direct=adoptedCourseCache.get(adoptedCourseCacheKey(request,signature));
    const actualJSON=JSON.stringify(result.snapshot),expectedJSON=JSON.stringify(direct);
    if(actualJSON!==expectedJSON){let at=0;while(at<actualJSON.length&&actualJSON[at]===expectedJSON[at])at++;throw Error('Worker/direct first difference at '+at+' actual '+actualJSON.slice(at-100,at+250)+' expected '+expectedJSON.slice(at-100,at+250));}
    assert.deepEqual(result.snapshot,direct);
    const lease={request,signature,snapshot:freezeAdoptedCourse(result.snapshot),cancelled:false};
    clearAdoptedCourseCache();dailyRun=profile && profile.kind!=='score'?{...profile}:null;
    withPreparedCourse(lease,${n},profile,()=>reset(${n}));
    assert.notEqual(holds,lease.snapshot.holds);assert.notEqual(route,lease.snapshot.route);
    assert.equal(generatedCourse.holds,holds);assert(initialGrips.every(h=>holds.includes(h)));
    assert.equal(stamina,lease.snapshot.activeCourseGeneration.initialStamina);
    assert.equal(rankingAttemptEligible(),profile?.kind!=='score');
    assert.equal(activeCourseGeneration.retry.geometrySeed,lease.snapshot.activeCourseGeneration.retry.geometrySeed);
   }};
 `);
}
(async()=>{
 const base=fixture();
 for(const patch of [{protocol:2},{buildId:'wrong'},{requestId:-1},{portable:'wrong'},{runtime:{normalSeedOffset:-1}},
  {runtime:{normalSeedOffset:4294967296}},{runtime:{normalSeedOffset:10,extra:true}},
  {request:{...base.input.request,level:2}}]){
  const result=await invoke({...base.input,...patch});assert(result.error,'Malformed request must reject without generation');
 }
 console.log('PASS course worker: current deterministic bundle, no imports/DOM/storage/network, malformed request/build/config rejects');
 if(process.argv.includes('--real')){
  const scenarios=process.argv.includes('--extended')?[{}, {offset:0}, {offset:4294967295}, {date:'2026-11-05',offset:0}]:[{}];
  scenarios.push({n:2,score:1});
  for(const options of scenarios){
   const test=fixture(options),start=Date.now(),result=await invoke(test.input);
   test.compare(result);
   console.log('PASS real worker/direct parity, request/config/seed, pinned fresh live graph '+JSON.stringify({...options,ms:Date.now()-start}));
  }
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
