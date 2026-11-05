'use strict';
// Independent lifecycle checks use the actual classic-script boot order and a
// minimal DOM/storage fixture. No tutorial geometry/content is invented here.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
function boot(data=new Map(),{blocked=false,readBlocked=blocked,writeBlocked=blocked,missingStorage=false}={}){
 const operations=[],elements={},windowEvents={},documentEvents={},timers=new Map(),frames=[];let nextTimer=0,captureFrames=false;
 const node=id=>elements[id]||={id,style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},events:{},listeners:{},hidden:false,open:false,value:'',focus(){},blur(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){(this.listeners[k]||=[]).push(f);this.events[k]=e=>this.listeners[k].forEach(fn=>fn(e));},showModal(){this.open=true;},close(){this.open=false;},contains(){return true;},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};
 const document={getElementById:node,documentElement:{},addEventListener(k,f){(documentEvents[k]||=[]).push(f);},querySelectorAll(){return [];}};
 const storage={getItem(k){operations.push(['get',k]);if(readBlocked)throw Error('blocked storage');return data.get(k)??null;},setItem(k,v){operations.push(['set',k]);if(writeBlocked)throw Error('blocked storage');data.set(k,String(v));},removeItem(k){operations.push(['remove',k]);if(writeBlocked)throw Error('blocked storage');data.delete(k);},get length(){return data.size;},key:i=>[...data.keys()][i]??null};
 const context=vm.createContext({document,localStorage:missingStorage?undefined:storage,console,performance,Date,Math,assert,URL,Uint8Array,TextEncoder,TextDecoder,atob,setTimeout(fn){timers.set(++nextTimer,fn);return nextTimer;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(fn){if(captureFrames)frames.push(fn);return 0;},window:{devicePixelRatio:1,addEventListener(k,f){(windowEvents[k]||=[]).push(f);}}});
 for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 // Explicit foundation fixture: default authored pages are covered independently
 // by tutorial-modals.cjs; keep these lifecycle/synthetic-trigger scenarios empty.
 vm.runInContext('TUTORIAL_CONFIG.steps.length=0;',context);
 return {data,operations,node,fireTimer(id){const fn=timers.get(id);assert(fn);timers.delete(id);fn();},enableFrames(){captureFrames=true;},flushFrames(){const pending=frames.splice(0);for(const fn of pending)fn(performance.now());},run:code=>vm.runInContext(code,context),emitWindow(name){for(const fn of windowEvents[name]||[])fn({});},flush(){const pending=[...timers.values()];timers.clear();for(const fn of pending)fn();}};
}
const snapshot=b=>b.run('JSON.stringify({stageProgress,stageRecords,heartItems,lives,playsSinceAd,mapRewards,dailyRecords,pending:[...onlineScores.pending]})');
function assertNoStageZero(b){
 assert.equal(b.run('stageRecords.existing[0]'),undefined);assert.equal(b.run('mapRewards[0]'),undefined);
 assert(!b.run('ui.mapNodes.innerHTML||""').includes('data-level="0"'));
 assert.equal(b.run('[...onlineScores.pending.keys()].some(k=>String(k).endsWith("_0"))'),false);
}
function titleStart(b){b.run('titleReady=true;');b.node('titleScreen').onclick();}
function completedToStageOne(b){
 assert.equal(b.run('isTutorialRun()'),false);assert.equal(b.run('tutorialPending()'),false);assert.equal(b.run('state'),'map');
 assert.equal(b.run('stageStartContext?.n'),1);assert(b.node('stageStartDialog').open);assert.equal(b.run('lives.inProgress'),false);assertNoStageZero(b);
}
(async()=>{
// Detection must execute before libraries write defaults/UUID during fresh boot.
assert.equal(files[0],'js/tutorial-state.js');assert(files.indexOf('js/tutorial-state.js')<files.indexOf('js/lives.js'));
for(const won of [true,false]){
 const b=boot();assert.equal(b.run('tutorialPending()'),true,'default boot writes must not convert a fresh user to existing');
 assert.equal(b.run('JSON.stringify(TUTORIAL_CONFIG.steps)'), '[]','foundation does not invent instructional content');
 const before=snapshot(b);titleStart(b);assert.equal(b.run('isTutorialRun()'),true);assert.equal(b.run('level'),0);
 const generation=b.run('activeCourseGeneration');b.node('titleScreen').onclick();assert.equal(b.run('activeCourseGeneration'),generation,'double title tap must not regenerate');
 assert.equal(b.run('startTutorialRun()'),false,'duplicate start must not reset an active tutorial');
 assert.equal(snapshot(b),before);assert.equal(b.run('lives.inProgress'),false);
 // Direct guard calls cannot create progression, rank, ads, items or reward0.
 b.run('moveCount=12;runElapsedMs=1234;recordStageClear();recordMapRewardClear();recordAdPlay();beginLifeAttempt();');
 assert.equal(snapshot(b),before);assertNoStageZero(b);assert.equal(b.run('queueOnlineScore(0,"existing",{moves:1,timeMs:1})'),false);
 b.run('finish('+won+');');completedToStageOne(b);assert.equal(snapshot(b),before,'either tutorial outcome consumes no normal resources');
 const after=JSON.stringify([...b.data]);b.run('finishTutorialRun('+won+');');assert.equal(JSON.stringify([...b.data]),after,'duplicate completion must be idempotent');
 // Stage1 starts only when its normal confirmation button is pressed.
 b.node('stageStartButton').onclick();assert.equal(b.run('level'),1);assert.equal(b.run('state'),'playing');assert.equal(b.run('lives.inProgress'),true);
 const reload=boot(b.data);assert.equal(reload.run('tutorialPending()'),false,'completed tutorial never repeats');
}
// Actual native drag/release clear: retain the live tutorial across a normal
// preview, traverse ordinary holds, then reach the goal naturally.
{
 const b=boot(),before=snapshot(b);titleStart(b);
 const references=b.run('({tutorialRun,activeCourseGeneration,holds,route,stamina,state,level})');
 assert.equal(b.run('stagePreview(1).seed'),b.run('CourseProgression.resolveStage(1).seed'));
 for(const [key,value] of Object.entries(references))assert.equal(b.run(key),value,'normal preview changed active tutorial '+key);
 b.run(`cameraIntro=null;hideStageHelp();const tutorialPath=[...route],initialBudget=stamina,expectedMoves=routeExpectedMoves();
  assert.equal(initialBudget,stageStamina(routeExpectedMoves())+TUTORIAL_COURSE_CONFIG.extraStamina);
  for(let i=1;i<tutorialPath.length;i++){
   camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);const target=tutorialPath[i];
   down({clientX:200,clientY:500});assert(validFingerAction(target.action));for(const p of target.action.points)move({clientX:200+p.dx,clientY:500+p.dy});release();
   assert.equal(moveCount,i);assert(grips.every((h,k)=>h&&limbReachable(body,h,k)));
   assert.equal(stamina,initialBudget-i);
  }
  assert.equal(moveCount,expectedMoves);assert.equal(stamina,initialBudget-expectedMoves);assert(stamina>0);assert(bothHandsOnGoal());`);
 completedToStageOne(b);assert.equal(b.run('AscentTutorialState.snapshot().reason'),'cleared');assert.equal(snapshot(b),before);
}
// Legal back-and-forth moves, not a forced stamina edit or synthetic failure:
// exhaust the complete route-derived starting budget without touching the goal.
{
 const b=boot(),before=snapshot(b);titleStart(b);
 b.run('cameraIntro=null;hideStageHelp();');require('./tutorial-modals.cjs').exhaust(b);
 completedToStageOne(b);assert.equal(b.run('AscentTutorialState.snapshot().reason'),'failed');assert.equal(snapshot(b),before);
}
// Interruption is not completion, does not cost a life, and survives auto-saves.
{
 const b=boot(),before=snapshot(b);titleStart(b);b.run('interruptTutorialRun();');assert.equal(b.run('isTutorialRun()'),false);assert.equal(b.run('tutorialPending()'),true);assert.equal(snapshot(b),before);
 b.run('showTitleScreen();');titleStart(b);assert.equal(b.run('isTutorialRun()'),true);
 b.run('showTitleScreen();');assert.equal(b.run('tutorialPending()'),true);assert.equal(b.run('isTutorialRun()'),false);assert.equal(snapshot(b),before);
 const reload=boot(b.data);assert.equal(reload.run('tutorialPending()'),true);titleStart(reload);assert.equal(reload.run('isTutorialRun()'),true);reload.emitWindow('pagehide');assert.equal(reload.run('tutorialPending()'),true);
 const again=boot(reload.data);assert.equal(again.run('tutorialPending()'),true);assert.equal(again.run('lives.count'),b.run('lives.count'));
}
// Existence, not truthiness or nonzero progress, identifies established users.
for(const [key,value] of [['ascent.player-uuid.v1','0'],['ascent.progress.v1','{"existing":{"cleared":0}}'],['ascent.records.v1','{}'],['ascent.progress.v1','malformed'],['ascent.heart-items.v1','0'],['ascent.pending-scores.v1','0'],['ascent.ad-plays.v1','0'],['ascent.ad-plays.v2','0'],['ascent.daily-records.v1','{}'],['ascent.lives.v1','{"count":3,"inProgress":false}']]){
 const b=boot(new Map([[key,value]]));assert.equal(b.run('tutorialPending()'),false,'existing evidence '+key);titleStart(b);assert.equal(b.run('isTutorialRun()'),false);assert.equal(b.run('state'),'map');assertNoStageZero(b);assert.equal(b.run('openStageStart(0)'),false);assert.equal(b.run('selectStage(0)'),false);
}
assert.equal(boot(new Map([['unrelated-app','value']])).run('tutorialPending()'),true,'unrelated app storage does not suppress tutorial');
for(const marker of ['malformed','null','{"version":9,"status":"pending"}','{"version":1,"status":"completed"}','{"version":1,"status":"skipped"}']){
 const b=boot(new Map([['ascent.tutorial-stage0.v1',marker]]));assert.equal(b.run('tutorialPending()'),false,'nonpending marker '+marker);
}
// Explicit restart/exit is a failure completion, unlike returning to title.
for(const action of ['ui.restart.onclick();','returnFromStage();']){
 const b=boot(),before=snapshot(b);titleStart(b);b.run(action);completedToStageOne(b);assert.equal(snapshot(b),before);
}
// Existing actual progress and Daily data remain untouched by onboarding checks.
{
 const data=new Map([['ascent.progress.v1','{"existing":{"cleared":20}}'],['ascent.heart-items.v1','17'],['ascent.daily-records.v1','{"2026-10-30":{"moves":10,"timeMs":1000,"stars":3,"clearedOn":"2026-10-30"}}']]);
 const b=boot(data),before=snapshot(b);assert.equal(b.run('startTutorialRun()'),false);assert.equal(snapshot(b),before);assert.equal(b.run('stageProgress.existing.cleared'),20);assert.equal(b.run('heartItems'),17);
 const day=b.run('JSON.stringify(CourseProgression.resolveDaily("2026-01-16"))');titleStart(b);assert.equal(b.run('JSON.stringify(CourseProgression.resolveDaily("2026-01-16"))'),day);assert.equal(snapshot(b),before);
}
// Unknown storage state fails closed (skip); readable empty storage with denied
// writes can still complete for this session without claiming durable success.
{
 assert.equal(boot(new Map(),{missingStorage:true}).run('tutorialPending()'),false);
 const b=boot(new Map(),{blocked:true});assert.equal(b.run('tutorialPending()'),false);assert.equal(b.run('startTutorialRun()'),false);titleStart(b);assert.equal(b.run('state'),'map');assert.equal(b.run('lives.count'),3);
 const writableDenied=boot(new Map(),{writeBlocked:true});assert.equal(writableDenied.run('tutorialPending()'),true);titleStart(writableDenied);assert.equal(writableDenied.run('isTutorialRun()'),true);writableDenied.run('finishTutorialRun(false);');completedToStageOne(writableDenied);assert.equal(writableDenied.run('lives.count'),3);
 const reload=boot(writableDenied.data,{writeBlocked:true});assert.equal(reload.run('tutorialPending()'),true);
}
// Trigger content exists only in this VM; production foundation remains empty.
{
 const b=boot();b.run(`TUTORIAL_CONFIG.steps.push(
  {id:'intro',when:{event:'start'},title:'<b>literal</b>',text:'test intro'},
  {id:'move-two',when:{event:'move',count:2},text:'test move'},
  {id:'bad-url',when:{event:'start'},image:'https://example.com/image.png'}
 );`);
 titleStart(b);b.run("var chosenTriggerHold=holds.find(h=>h.type==='normal');assert(chosenTriggerHold);TUTORIAL_CONFIG.steps.push({id:'normal-hand',when:{event:'hold',hold:chosenTriggerHold.id},text:'test hold'});");assert(!b.node('tutorialDialog').open);b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');assert(b.node('tutorialDialog').open);assert.equal(b.node('tutorialTitle').textContent,'<b>literal</b>');assert.equal(b.run('tutorialInstructionsOpen()'),true);assert.equal(b.run('featureHelpOpen'),true);
 assert.equal(b.run('tutorialRun.seen.has("bad-url")'),false);
 b.run('cameraIntro=null;');const paused=b.run('JSON.stringify({body,grips,stamina,moveCount})');
 b.run('down({clientX:body.x,clientY:body.y-camera});move({clientX:body.x+30,clientY:body.y-camera-30});release();');assert.equal(b.run('JSON.stringify({body,grips,stamina,moveCount})'),paused);
 b.node('tutorialContinue').onclick();assert.equal(b.run('featureHelpOpen'),false);assert.equal(b.node('tutorialDialog').open,false);
 b.run('tutorialTrigger("start");');assert.equal(b.run('tutorialInstructionsOpen()'),false,'start explanation only once');
 b.run('moveCount=1;tutorialTrigger("move");');assert.equal(b.run('tutorialInstructionsOpen()'),false);
 b.run('runStartedAt=performance.now()-500;moveCount=2;tutorialTrigger("move");');assert.equal(b.run('runStartedAt'),null);assert(b.run('runElapsedMs')>=500);assert.equal(b.node('tutorialText').textContent,'test move');
 b.run('tutorialTrigger("move");');assert.equal(b.run('tutorialRun.queue.length'),0);b.node('tutorialContinue').onclick();assert.notEqual(b.run('runStartedAt'),null);
 b.run('const originalTutorialGrips=[...grips],normalForTest=chosenTriggerHold;grips[2]=normalForTest;tutorialTrigger("hold");');assert.equal(b.run('tutorialInstructionsOpen()'),false,'foot contact is not grabbing');
 b.run('grips[0]=normalForTest;tutorialTrigger("hold");');assert.equal(b.node('tutorialText').textContent,'test hold');b.node('tutorialContinue').onclick();b.run('tutorialTrigger("hold");');assert.equal(b.run('tutorialInstructionsOpen()'),false);assert.equal(b.run('tutorialRun.seen.size'),3);
 b.run('grips=originalTutorialGrips;showTitleScreen();');assert.equal(b.run('tutorialPending()'),true);
}
// A final-move explanation queue must finish before either terminal outcome
// transitions to the map; repeated finish calls cannot change that outcome.
for(const won of [true,false]){
 const b=boot(),before=snapshot(b);b.run(`TUTORIAL_CONFIG.steps.push({id:'last-a',when:{event:'move',count:1},text:'last A'},{id:'last-b',when:{event:'move',count:1},text:'last B'});`);
 titleStart(b);b.run('moveCount=1;tutorialTrigger("move");finish('+won+');finish('+(!won)+');');
 assert.equal(b.run('isTutorialRun()'),true);assert.equal(b.run('state'),'playing');assert.equal(b.run('tutorialPending()'),true);assert.equal(b.run('stageStartContext'),null);assert.equal(snapshot(b),before);
 b.node('tutorialContinue').onclick();while(b.run('!!tutorialRun?.transition'))b.fireTimer(b.run('tutorialRun.transitionTimer'));assert.equal(b.node('tutorialText').textContent,'last B');assert.equal(b.run('isTutorialRun()'),true);assert.equal(b.run('tutorialPending()'),true);
 b.node('tutorialContinue').onclick();completedToStageOne(b);assert.equal(b.run('AscentTutorialState.snapshot().reason'),won?'cleared':'failed');assert.equal(snapshot(b),before);
}
// Completion cannot display the Stage1 pre-start modal over a not-yet-ready map.
{
 const b=boot();titleStart(b);let resolveDecode;const decoded=new Promise(resolve=>resolveDecode=resolve);
 b.node('mapNodes').querySelectorAll=()=>[{decode:()=>decoded}];b.enableFrames();b.run('finishTutorialRun(false);');
 assert.equal(b.run('tutorialPending()'),false);assert.equal(b.run('state'),'map');assert.equal(b.run('mapPreparing'),true);assert.equal(b.run('stageStartContext'),null);assert.equal(b.node('stageStartDialog').open,false);
 resolveDecode();for(let i=0;i<6;i++){await Promise.resolve();b.flushFrames();}
 completedToStageOne(b);
}
console.log('PASS tutorial lifecycle: fresh/existing early detection, complete success/failure to Stage1 confirmation, interruption/reload, blocked storage, duplicate starts/completion, no Stage0 progression/life/items/ads/rank/rewards, normal/Daily preservation, once-only paused triggers, deferred final explanations and async map-ready barrier, actual drag clear and legal route-budget exhaustion');

})().catch(error=>{console.error(error);process.exitCode=1;});
