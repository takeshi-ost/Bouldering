'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {boot}=require('./tutorial-modals.cjs');
const b=boot(new Map([['ascent.tutorial-stage0.v1',JSON.stringify({version:1,status:'completed'})]]));
b.run(`globalThis.sent=[];queueOnlineScore=(n,m,c)=>sent.push({n,m,c});
 reset(1);cameraIntro=null;hideStageHelp();state='playing';debugMode=false;drawPath();assert.equal(rankingAssistanceUsed,false);
 debugMode=true;debugDisplay.route=false;drawPath();assert.equal(rankingAssistanceUsed,false);
 debugDisplay.route=true;drawPath();assert.equal(rankingAssistanceUsed,true);
 debugMode=false;debugDisplay.route=false;drawPath();assert.equal(rankingAssistanceUsed,true);
 moveCount=6;runElapsedMs=900;recordStageClear();assert.equal(sent.length,0);assert.equal(stageProgress.existing.cleared,1);assert.equal(stageRecords.existing[1].rankingEligible,false);
 reset(1);cameraIntro=null;hideStageHelp();state='playing';assert.equal(rankingAssistanceUsed,false);drawPath();moveCount=8;runElapsedMs=1000;recordStageClear();assert.equal(sent.length,1);assert.equal(sent[0].c.scoreSpecVersion,'v5');assert.equal(stageRecords.existing[1].rankingEligible,false,'better local assisted remains visibly local only');
 reset(1);state='lost';debugMode=true;debugDisplay.route=true;drawPath();state='playing';debugMode=false;assert.equal(rankingAssistanceUsed,true,'route viewed while lost cannot become ranked via undo');
 reset(1);state='won';debugMode=true;debugDisplay.route=true;drawPath();assert.equal(rankingAssistanceUsed,false,'route shown only after completed clear does not retroactively invalidate it');
`);
// Load the actual extra script into the real classic-game VM; only DOM creation
// is stubbed. No network or browser is involved.
b.run(`globalThis.ASCENT_FORMAL_PAGES={release:"0.4.47"};globalThis.ASCENT_FORMAL_STORAGE=globalThis.localStorage;
 document.created=0;document.createElement=tag=>{const n=document.getElementById('formal-created-'+(++document.created));n.children=[];n.append=(...kids)=>n.children.push(...kids);return n;};
 document.getElementById('mapSettingsDebug').append=function(...kids){this.children=kids;};
 state='map';debugMode=false;mapPreparing=false;mapTransition=null;stageStartContext=null;dailyRun=null;debugCourseTrial=null;lifePrompt=null;dummyAd=null;rewardSequence=null;adCoverPending=false;rewardCoverPending=false;`);
b.run(fs.readFileSync('scripts/formal-debug-seed.js','utf8'));
assert.equal(b.run('CourseProgressionConfig.normalSeedOffset'),10);assert.equal(b.run('ASCENT_FORMAL_DEBUG_SEED.offset'),10);
for(const value of ['', '-1','1.1','1e2','+10','4294967296'])assert.equal(b.run('ASCENT_FORMAL_DEBUG_SEED.parse('+JSON.stringify(value)+')'),null);
b.run(`assert.equal(ASCENT_FORMAL_DEBUG_SEED.apply('100').ok,false);setDebugMode(true);assert.equal(ASCENT_FORMAL_DEBUG_SEED.apply('100').ok,true);assert.equal(CourseProgression.resolveStage(1).seed,101);assert.equal(localStorage.getItem('ascent.formal-debug-seed.v1'),'100');
 const dayBefore=JSON.stringify(CourseProgression.resolveDaily('2026-03-21'));
 setDebugMode(false);assert.equal(CourseProgression.resolveStage(1).seed,11);assert.equal(JSON.stringify(CourseProgression.resolveDaily('2026-03-21')),dayBefore);
 setDebugMode(true);assert.equal(CourseProgression.resolveStage(1).seed,101);assert(openStageStart(1));assert(stageStartContext.debug);closeStageStart();
 assert(selectStage(1));assert.equal(courseSeed(),101);assert.equal(debugAttempt,true);assert.equal(ASCENT_FORMAL_DEBUG_SEED.apply('200').ok,false);hideStageHelp();cameraIntro=null;state='map';stageStartContext=null;setDebugMode(false);assert.equal(CourseProgression.resolveStage(1).seed,11);`);
console.log('PASS formal DEBUG: actual path latch survives off/undo, normal progress unchanged and new attempt reset; local-only best not official; settings-only SEED validates/persists, preview/start matches, custom offset uses test attempt, OFF restores canonical +10, Daily unchanged');
