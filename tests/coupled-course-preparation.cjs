'use strict';
const run=require('./coupled-production-harness.cjs');
const script=String.raw`
return (async()=>{
 const tick=()=>Promise.resolve();
 globalThis.document=document;document.baseURI='https://example.test/ascent/';
 const workers=[];
 class TestWorker {
  constructor(url,options){this.url=String(url);this.options=options;workers.push(this);}
  postMessage(input){this.input=input;}
  terminate(){this.terminated=true;}
  ready(){if(!this.didReady){this.didReady=true;this.onmessage({data:{type:'ready',protocol:1,buildId:globalThis.ASCENT_COURSE_BUILD.id}});}}
  reply(change=null){
   this.ready();
   const input=this.input,request=input.request;
   const h=[{id:0,x:200,y:432,type:'start',wide:true},{id:1,x:130,y:600,type:'start'},
    {id:2,x:270,y:600,type:'start'},{id:3,x:200,y:100,type:'goal'}];
   const report={validated:true},adjustment={initialStamina:6};
   const retry={version:COURSE_RETRY_CONFIG.version,initialSeed:request.resolved.seed,geometrySeed:request.resolved.seed,
    attempts:1,maxAttempts:COURSE_RETRY_CONFIG.maxAttempts};
   const snapshot={holds:h,route:[{x:200,y:500},{x:200,y:168,grips:[3,3,1,2],anchor:[0,1],trace:[{x:200,y:500},{x:200,y:168}],action:{version:1,model:FINGER_AIM_MODEL,gain:1,bodyMotion:COUPLED_BODY_MODEL,points:[{dx:0,dy:-120}]}}],HEIGHT:700,
    initialGrips:[h[0],h[0],h[1],h[2]],densityStats:{total:4},labSkeletonReport:report,labHeartsCache:[],labStaminaCache:adjustment,
    generatedCourse:{holds:h,hearts:[],level:request.level,difficulty:request.difficulty,typeId:request.courseTypeId,
     seed:request.resolved.seed,geometrySeed:request.resolved.seed,generationRetryVersion:retry.version,mode:'existing',generationScore:request.resolved.score},
    activeCourseGeneration:{resolved:request.resolved,recipe:{...request.sampled,seed:request.resolved.seed},retry,report,initialStamina:6}};
   const result={protocol:1,buildId:input.buildId,requestId:input.requestId,request,portable:input.portable,runtime:input.runtime,snapshot};
   if(change)change(result);this.onmessage({data:result});return snapshot;
  }
 }
 globalThis.Worker=TestWorker;
 const forbidden=labGenerateSkeleton;labGenerateSkeleton=()=>{throw Error('UI cold generation is forbidden');};
 const setupMap=()=>{hideStageStart();state='map';mapPreparing=false;mapTransition=null;courseMode='existing';
   dailyRun=null;tutorialRun=null;debugCourseTrial=null;debugAttempt=false;stageProgress.existing.cleared=300;heartItems=5;
   lives.count=3;lives.inProgress=false;lives.recoveryAt=null;};
 setupMap();debugMode=true;clearAdoptedCourseCache();
 const scoreLife=lifeAttemptId,scoreHearts=heartItems;
 assert(startDebugScoreTrial(31));assert(ui.debugScoreLoading.open);assert.equal(state,'map');
 assert.equal(workers.at(-1).input.request.resolved.score,31);
 assert.equal(workers.at(-1).input.request.resolved.seed,41);
 assert.equal(startDebugScoreTrial(32),false);
 const cancelledScore=workers.at(-1);ui.debugScoreCancel.onclick();assert(cancelledScore.terminated);
 cancelledScore.reply();await tick();assert.equal(state,'map');assert.equal(debugCourseTrial,null);
 assert(startDebugScoreTrial(31));workers.at(-1).reply();await tick();
 assert.equal(state,'playing');assert.equal(activeCourseGeneration.resolved.score,31);assert(!ui.debugScoreLoading.open);
 assert.equal(lifeAttemptId,scoreLife+1);assert.equal(lives.count,3);assert.equal(lives.inProgress,false);assert.equal(heartItems,scoreHearts);
 const scoreWorkers=workers.length;ui.debugRegenerate.onclick();await tick();assert.equal(workers.length,scoreWorkers);
 assert.equal(debugCourseTrial.score,31);assert.equal(state,'playing');
 ui.debugCourseExit.onclick();assert.equal(state,'map');
 assert(startDebugScoreTrial(32));workers.at(-1).onerror();await tick();await tick();
 assert.equal(state,'map');assert.equal(debugCourseTrial,null);assert.equal(ui.mapError.hidden,false);
 debugMode=false;workers.length=0;
 setupMap();clearAdoptedCourseCache();
 const before={lifeAttemptId,heartItems,count:lives.count};
 assert(openStageStart(1));assert(ui.stageStartDialog.open);assert(ui.stageStartButton.disabled);
 assert.equal(ui.stageStartStamina.textContent,'—');assert.equal(workers.length,1);
 assert.match(workers[0].url,/^https:\/\/example.test\/ascent\/js\/course-worker.js\?v=/);
 setStageHeartItems(2);assert.equal(stageStartContext.hearts,2);assert.equal(lifeAttemptId,before.lifeAttemptId);
 assert.equal(heartItems,before.heartItems);assert.equal(lives.count,before.count);
 const original=workers[0].reply();await tick();assert.equal(ui.stageStartStamina.textContent,'06');
 assert.equal(stageStartContext.hearts,2);assert(!ui.stageStartButton.disabled);assert(workers[0].terminated);
 // Evict every cache entry: the dialog's lease still owns the immutable graph.
 clearAdoptedCourseCache();ui.stageStartButton.onclick();
 assert.equal(state,'playing');assert.equal(stamina,8);assert.equal(heartItems,3);assert.equal(lifeAttemptId,before.lifeAttemptId+1);
 assert.notEqual(holds,original.holds);assert.equal(initialGrips[0],holds[0]);assert.equal(generatedCourse.holds,holds);
 assert.equal(activeCourseGeneration.report,labSkeletonReport);
 assert(Object.isFrozen(original));holds[0].x=-1;assert.equal(original.holds[0].x,200);
 const startAttempts=lifeAttemptId;ui.stageStartButton.onclick();assert.equal(lifeAttemptId,startAttempts);
 // Closing and replacement cancel work; a late result must not launch or reenable UI.
 setupMap();clearAdoptedCourseCache();assert(openStageStart(2));const old=workers.at(-1);closeStageStart();
 assert(old.terminated);assert(openStageStart(3));const newer=workers.at(-1);old.reply();await tick();
 assert.equal(stageStartContext.n,3);assert(ui.stageStartButton.disabled);newer.reply();await tick();closeStageStart();
 // Config/hook changes invalidate a ready snapshot before any transaction.
 assert(openStageStart(3));await tick();const countBefore=lifeAttemptId;const rules=COURSE_STAMINA_CONFIG.rules;
 COURSE_STAMINA_CONFIG.rules='0:4';ui.stageStartButton.onclick();assert.equal(lifeAttemptId,countBefore);assert.equal(state,'map');
 COURSE_STAMINA_CONFIG.rules=rules;
 // Stage-number debug uses the same worker path, without forced custom debug seed.
 setupMap();debugMode=true;assert(openStageStart(250,true));const debugWorker=workers.at(-1);
 assert.equal(debugWorker.input.request.level,250);debugWorker.reply();await tick();closeStageStart();
 // The existing formal DEBUG seed offset is the sole portable runtime override.
 const offset=CourseProgressionConfig.normalSeedOffset;CourseProgressionConfig.normalSeedOffset=20;
 assert(openStageStart(1,true));const custom=workers.at(-1);assert.equal(custom.input.runtime.normalSeedOffset,20);
 assert.equal(custom.input.request.resolved.seed,21);custom.reply();await tick();closeStageStart();
 CourseProgressionConfig.normalSeedOffset=offset;
 // Worker unavailable/failure is recoverable. It never falls back to synchronous solving.
 clearAdoptedCourseCache();globalThis.Worker=undefined;assert(openStageStart(4));await tick();
 assert(stageStartContext.error);assert(!ui.stageStartButton.disabled);assert.equal(state,'map');
 globalThis.Worker=TestWorker;ui.stageStartButton.onclick();assert(ui.stageStartButton.disabled);
 workers.at(-1).onerror(new Error('load failure'));await tick();assert(stageStartContext.error);
 ui.stageStartButton.onclick();workers.at(-1).reply();await tick();assert(stageStartContext.prepared);closeStageStart();
 // Warm launch and normal retry reuse cached geometry without a new Worker.
 setupMap();const warmCount=workers.length,warmAttempts=lifeAttemptId;assert(openStageStart(4));await tick();
 assert.equal(workers.length,warmCount);setStageHeartItems(1);ui.stageStartButton.onclick();
 assert.equal(state,'playing');assert.equal(heartItems,4);assert.equal(stamina,7);assert.equal(lifeAttemptId,warmAttempts+1);
 state='lost';dailyRun=null;debugAttempt=false;assert(openStageStart(4,false,null,0,true));await tick();
 assert.equal(workers.length,warmCount);setStageHeartItems(2);ui.stageStartButton.onclick();
 assert.equal(state,'playing');assert.equal(heartItems,2);assert.equal(lifeAttemptId,warmAttempts+2);
 // Reject request, build, model/config and malformed graph replies before caching.
 for(const mutate of [r=>r.requestId++,r=>r.buildId='wrong',r=>r.portable='wrong',r=>r.runtime={normalSeedOffset:99},
  r=>r.request={...r.request,level:99},r=>r.snapshot.initialGrips[0]={...r.snapshot.holds[0]},
  r=>r.snapshot.activeCourseGeneration.recipe.seed++,r=>r.snapshot.activeCourseGeneration.initialStamina=Infinity,
  r=>r.snapshot.generatedCourse.holds=[],r=>r.snapshot.player={name:'forbidden'},
  r=>r.snapshot.route[1].action={version:1,model:'wrong',gain:1,points:[{dx:1,dy:2}]}]){
  clearAdoptedCourseCache();const job=prepareCourseAsync(5),rejected=assert.rejects(job.promise);workers.at(-1).reply(mutate);await rejected;
  assert.equal(adoptedCourseCache.size,0);
 }
 const invalid=prepareCourseAsync(0);await assert.rejects(invalid.promise);
 // A silently blocked Worker times out at startup; ready clears that timer.
 const savedSetTimeout=setTimeout,savedClearTimeout=clearTimeout;let startupCallback=null,cleared=false;
 setTimeout=fn=>{startupCallback=fn;return 42;};clearTimeout=id=>{if(id===42)cleared=true;};
 clearAdoptedCourseCache();let timed=prepareCourseAsync(7),timeoutRejection=assert.rejects(timed.promise,e=>e.code==='COURSE_PREPARATION_STARTUP_TIMEOUT');
 startupCallback();await timeoutRejection;assert(workers.at(-1).terminated);
 timed=prepareCourseAsync(8);const timedDone=timed.promise;workers.at(-1).ready();assert(cleared);
 workers.at(-1).reply();await timedDone;setTimeout=savedSetTimeout;clearTimeout=savedClearTimeout;
 // Main dependency changes while the worker is running reject otherwise-valid data.
 const job=prepareCourseAsync(6),rejected=assert.rejects(job.promise);const radius=HEART_CONFIG.radius;HEART_CONFIG.radius++;
 workers.at(-1).reply();await rejected;HEART_CONFIG.radius=radius;
 // Daily selection is responsive, cancels stale work, and prepares before ads/counters.
 hideStageStart();state='daily';settingsOpen=false;dailySelectedDate='2026-11-02';dailyMonth='2026-11';dailyRecords={};dailyAttempts={};
 dailyPlayAdState={plays:0,adPaid:false};clearAdoptedCourseCache();renderDailyStart();
 const first=workers.at(-1),attemptsBefore=lifeAttemptId;assert(ui.dailyStartButton.disabled);
 assert(chooseDailyDate('2026-11-03'));const second=workers.at(-1);assert(first.terminated);
 first.reply();await tick();assert.equal(dailyPreparation.date,'2026-11-03');assert(ui.dailyStartButton.disabled);
 assert.deepEqual(dailyAttempts,{});assert.equal(dailyPlayAdState.plays,0);assert.equal(lifeAttemptId,attemptsBefore);
 second.reply();await tick();assert(!ui.dailyStartButton.disabled);ui.dailyStartButton.onclick();
 assert.equal(state,'playing');assert.equal(dailyRun.date,'2026-11-03');assert.equal(dailyAttempts['2026-11-03'],1);
 assert.equal(dailyPlayAdState.plays,1);assert.equal(lifeAttemptId,attemptsBefore+1);
 // Programmatic Daily retry waits for a warm job, then launches once without another tap.
 state='lost';const retryAttempt=lifeAttemptId;dailyPlayAdState={plays:0,adPaid:false};
 continueDailyResult(true);assert.equal(state,'daily');await tick();
 assert.equal(state,'playing');assert.equal(dailyAttempts['2026-11-03'],2);assert.equal(lifeAttemptId,retryAttempt+1);
 // Second Daily attempt keeps its existing ad timing, but only after readiness.
 state='daily';dailyRun=null;dailySelectedDate='2026-11-04';renderDailyStart();
 assert.equal(state,'daily');assert(ui.dailyStartButton.disabled);workers.at(-1).reply();await tick();
 ui.dailyStartButton.onclick();assert.equal(state,'ad');assert.equal(dailyAttempts['2026-11-04'],undefined);
 clock+=10001;advanceDummyAd(clock);assert(completeDummyAd());assert.equal(state,'playing');
 assert.equal(dailyAttempts['2026-11-04'],1);assert.equal(dailyPlayAdState.plays,0);
 // Leaving through the actual character-editor path cancels, then return re-prepares.
 state='daily';dailyRun=null;dailySelectedDate='2026-11-01';dailyMonth='2026-11';mapPreparing=false;mapTransition=null;
 renderDailyStart();const editorWorker=workers.at(-1);openSettings();assert(showCharacterEditor());
 assert.equal(state,'editing');assert(editorWorker.terminated);assert.equal(dailyPreparation,null);
 editorWorker.reply();await tick();assert.equal(state,'editing');
 returnFromCharacterEditor();assert.equal(state,'daily');assert(dailyPreparation);assert(ui.dailyStartButton.disabled);
 workers.at(-1).reply();await tick();assert(dailyPreparation.prepared);assert.equal(state,'daily');
 // A pending reward owns the screen, not a silently running Daily worker.
 dailySelectedDate='2026-11-02';dailyRecords['2026-10-31']={moves:1,timeMs:1,stars:1,rewardStatus:'pending'};
 showDailyCalendar();assert.equal(state,'reward');assert.equal(dailyPreparation,null);
 await tick();
 labGenerateSkeleton=forbidden;clearAdoptedCourseCache();
 console.log('PASS asynchronous course preparation: responsive normal/Daily/debug, cancel/stale navigation, pinned fresh graph, selected items, unchanged counters/ad order, invalid payload/config, unavailable/failing Worker recovery');
})();
`;
Promise.resolve(run(script)).catch(error=>{console.error(error);process.exitCode=1;});
