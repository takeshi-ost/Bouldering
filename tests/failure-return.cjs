'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./tutorial-modals.cjs');
// Return/reward flows replay generated baseline witnesses; new-selector live
// equivalence is covered separately by six-pair-baseline-live.cjs.
function play(b,index,cancel=false){b.run(`SixPairSelection.withBaseline(()=>{const target=route[${index}];assert(validFingerAction(target.action));assert.equal(target.action.bodyMotion,COUPLED_BODY_MODEL);down({clientX:200,clientY:500});for(const p of target.action.points)move({clientX:200+p.dx,clientY:500+p.dy});release(${cancel});});`);}
const existing=()=>new Map([['ascent.progress.v1',JSON.stringify({existing:{cleared:10},prototype:{cleared:0}})]]);
function context(){
 const b=boot(existing());
 // Flow-only fixtures retain real generation and input, but pin short/single
 // walls. Score 1 alone still samples middle paired Stage 11 courses,
 // repeating expensive generation in fresh VM contexts.
 b.run('CourseProgressionConfig.stageSegments=[{fromStage:1,toStage:100,fromScore:1,toScore:1}];CourseProgressionConfig.daily.minScore=CourseProgressionConfig.daily.maxScore=1;');
 b.run('CourseDistributionConfig.tables.length.rows=[{score:0,weights:[1,0,0]}];CourseDistributionConfig.tables.composition.rows=[{score:0,weights:[1,0]}];');
 b.run('for(const resolved of [CourseProgression.resolveStage(1),CourseProgression.resolveStage(11),CourseProgression.resolveDaily("2026-01-01")]){const recipe=CourseProgression.recipe(resolved);assert.equal(recipe.length,"short");assert.equal(recipe.composition??"single","single");}');
 return b;
}
const records=b=>b.run('JSON.stringify({stageProgress,stageRecords,dailyRecords,mapRewards,heartItems,pending:[...onlineScores.pending]})');
function normal(b,{stage=1,lives=3,plays=0}={}){
 b.run(`showLevelMap();cancelMapReveal();mapPreparing=false;mapTransition=null;heartItems=10;lives.count=${lives};lives.recoveryAt=Date.now();playsSinceAd=${plays};assert(selectStage(${stage},false,2));cameraIntro=null;hideStageHelp();`);
 assert.equal(b.run('heartItems'),8);assert.equal(b.run('lives.inProgress'),true);
 assert.equal(b.node('next').hidden,true,'New play clears stale return-button visibility');
}
function failByMove(b){b.run('stamina=1;');play(b,1);assert.equal(b.run('state'),'lost');assert.equal(b.node('overlay').hidden,false);assert.equal(b.node('overlay').open,true);assert.equal(b.node('next').hidden,false);assert.equal(b.node('retry').hidden,false);assert.equal(b.node('closeResult').hidden,false);assert.equal(b.node('overlay').events.keydown,undefined);}
function completeAd(b){b.run('advanceDummyAd(dummyAd.start+DUMMY_AD_DURATION);assert(completeDummyAd());');}
// Actual stamina failure, primary return button, repeat click, X and Escape parity.
for(const action of ['next','closeResult','escape','backdrop']){
 const b=context();normal(b);const before=records(b);failByMove(b);
 assert.equal(b.node('next').textContent,'マップにもどる');assert.equal(b.run('lives.count'),2);
 assert.equal(b.run('lives.inProgress'),false);const attempt=b.run('lifeAttemptId');
 if(action==='escape')b.node('overlay').events.cancel({preventDefault(){}});
 else if(action==='backdrop')b.node('overlay').events.click({target:b.node('overlay')});
 else b.node(action).onclick();
 assert.equal(b.run('state'),'map');assert.equal(b.run('mapSelected'),1);assert.equal(b.node('overlay').open,false);
 b.node('next').onclick();b.node('closeResult').onclick();assert.equal(b.run('lives.count'),2);assert.equal(b.run('lifeAttemptId'),attempt);assert.equal(records(b),before);
 assert.equal(b.run('!!dummyAd || !!lifePrompt || !!rewardSequence'),false);
}
// Same regular-ad gate as X, one pending callback, no extra loss/item charge.
{
 const b=context();normal(b,{stage:11,lives:2,plays:2});const before=records(b);failByMove(b);
 assert.equal(b.run('playsSinceAd'),3);b.node('next').onclick();assert.equal(b.run('state'),'ad');
 const pending=b.run('dummyAd');b.node('next').onclick();b.node('retry').onclick();assert.equal(b.run('dummyAd'),pending);assert.equal(b.run('lives.count'),1);
 completeAd(b);assert.equal(b.run('state'),'map');assert.equal(b.run('mapSelected'),11);assert.equal(b.run('playsSinceAd'),0);assert.equal(b.run('lives.count'),1);assert.equal(records(b),before);
}
// Last-life loss returns without forcing a recovery ad; next start still offers it.
{
 const b=context();normal(b,{stage:11,lives:1,plays:2});failByMove(b);const before=records(b);
 b.node('next').onclick();assert.equal(b.run('state'),'map');assert.equal(b.run('lives.count'),0);assert.equal(b.run('playsSinceAd'),3);assert.equal(b.run('dummyAd'),null);
 b.run('cancelMapReveal();mapPreparing=false;mapTransition=null;openStageStart(11);');assert.equal(b.run('state'),'life-prompt');assert.equal(records(b),before);
 b.node('next').onclick();assert.equal(b.run('state'),'life-prompt');b.node('lifeWatchAd').onclick();completeAd(b);
 assert.equal(b.run('lives.count'),1);assert.equal(b.run('playsSinceAd'),3);assert.equal(b.run('stageStartContext.n'),11);assert.equal(records(b),before);
}
// Retry confirmation retains the failed wall; queued return clicks cannot cancel it.
{
 const b=context();normal(b);failByMove(b);const before=records(b),attempt=b.run('lifeAttemptId');
 b.node('retry').onclick();assert.equal(b.run('stageStartContext.retry'),true);assert.equal(b.node('overlay').hidden,true);
 const preview=b.run('stageStartContext');b.node('next').onclick();assert.equal(b.run('stageStartContext'),preview);assert.equal(b.run('lifeAttemptId'),attempt);assert.equal(records(b),before);
 b.node('stageStartButton').onclick();assert.equal(b.run('state'),'playing');assert.equal(b.run('lifeAttemptId'),attempt+1);assert.equal(b.run('heartItems'),8);assert.equal(b.run('lives.count'),2);assert.equal(b.node('next').hidden,true);
 b.node('next').onclick();assert.equal(b.run('state'),'playing');
}
// Daily failure returns to the existing selected month/date, without life use,
// rewards, rank writes, automatic replay or another pre-play ad on returning.
{
 const b=context();b.run('showDailyCalendar();dailyMonth="2026-01";dailySelectedDate="2026-01-01";dailyPlayAdState={plays:0,adPaid:false};assert(selectDailyDate(dailySelectedDate));cameraIntro=null;hideStageHelp();');
 const before=records(b),life=b.run('JSON.stringify(lives)'),seed=b.run('dailyRun.seed');failByMove(b);
 assert.equal(b.node('next').textContent,'カレンダーにもどる');const attempts=b.run('JSON.stringify(dailyAttempts)'),cadence=b.run('JSON.stringify(dailyPlayAdState)');
 b.run('setGameLanguage("en")');assert.equal(b.node('next').textContent,'Back to Calendar');b.run('setGameLanguage("ja")');assert.equal(b.node('next').textContent,'カレンダーにもどる');
 b.node('next').onclick();b.node('next').onclick();assert.equal(b.run('state'),'daily');assert.equal(b.run('dailyRun'),null);assert.equal(b.run('dailyMonth'),'2026-01');assert.equal(b.run('dailySelectedDate'),'2026-01-01');
 assert.equal(records(b),before);assert.equal(b.run('JSON.stringify(lives)'),life);assert.equal(b.run('JSON.stringify(dailyAttempts)'),attempts);assert.equal(b.run('JSON.stringify(dailyPlayAdState)'),cadence);assert.equal(b.run('dummyAd'),null);
 b.run('assert(selectDailyDate("2026-01-01"));');assert.equal(b.run('state'),'ad','Existing every-second Daily pre-play ad remains');completeAd(b);
 assert.equal(b.run('dailyRun.seed'),seed);assert.equal(b.run('dailyAttempts["2026-01-01"]'),2);b.run('cameraIntro=null;hideStageHelp();');failByMove(b);
 b.node('retry').onclick();assert.equal(b.run('state'),'playing');assert.equal(b.run('dailyRun.seed'),seed);assert.equal(b.run('dailyAttempts["2026-01-01"]'),3);assert.equal(b.run('JSON.stringify(lives)'),life);assert.equal(b.node('next').hidden,true);
}
// Localized normal label, unchanged hidden-on-clear TAP continuation.
{
 const b=context();normal(b);failByMove(b);b.run('setGameLanguage("en")');assert.equal(b.node('next').textContent,'Back to Map');b.run('setGameLanguage("ja")');assert.equal(b.node('next').textContent,'マップにもどる');
 b.node('next').onclick();b.run('cancelMapReveal();mapPreparing=false;assert(selectStage(1));cameraIntro=null;hideStageHelp();');
 for(let i=1,n=b.run('route.length');i<n;i++)play(b,i);
 assert.equal(b.run('state'),'won');assert.equal(b.node('next').hidden,true);assert.equal(b.node('retry').hidden,true);assert.equal(b.node('resultTap').hidden,false);
 b.node('overlay').events.click({target:b.node('resultTap')});assert.equal(b.run('state'),'map');
}
// Fresh STAGE0 still bypasses the normal failure result altogether.
{
 const b=boot();const before=records(b),life=b.run('JSON.stringify(lives)');b.run('TUTORIAL_CONFIG.steps=[];titleReady=true;');b.node('titleScreen').onclick();assert.equal(b.run('isTutorialRun()'),true);
 b.run('cameraIntro=null;stamina=1;');play(b,1);assert.equal(b.run('state'),'map');assert.equal(b.node('overlay').hidden,true);assert.equal(b.node('next').hidden,true);assert.equal(b.run('stageStartContext.n'),1);assert.equal(records(b),before);assert.equal(b.run('JSON.stringify(lives)'),life);
}
const html=fs.readFileSync('index.html','utf8');assert(html.includes('<button id="next" type="button" hidden></button>'),'Use a native button, no nested click target');
console.log('PASS failure returns: actual normal/Daily stamina loss, map/calendar destinations, normal/zero-life/Daily ad gates, no double charges/rewards/ranks, retry and stale/repeated input guards, JA/EN labels, success TAP and free STAGE0 transition retained (no browser rendering)');
