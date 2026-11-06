'use strict';
const assert=require('node:assert/strict'),{boot}=require('./tutorial-modals.cjs');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const settings=html.match(/<dialog id="settingsDialog"[\s\S]*?<\/dialog>/)[0];
assert(settings.includes('id="debugCourseStatus"'));
assert.equal((html.match(/id="debugCourseStatus"/g)||[]).length,1);
assert(!fs.readFileSync('styles.css','utf8').match(/\.debug-course-status\s*\{[^}]*position\s*:\s*(absolute|fixed)/));
const b=boot(new Map([['ascent.tutorial-stage0.v1',JSON.stringify({version:1,status:'completed'})]]));
b.run(`
showLevelMap();debugMode=true;mapPreparing=false;mapTransition=null;
const before=JSON.stringify({stageProgress,stageRecords,lives,heartItems,mapRewards,playsSinceAd,featureHelpSeen});
const originalRestart=restartInput,originalPrepare=prepareCurrentStage;
// Exercise every transition with inexpensive valid geometry; generation checked separately below.
prepareCurrentStage=()=>prepareTutorialCourse();
assert.equal(startDebugScoreTrial(0),false);assert.equal(startDebugScoreTrial(101),false);
assert.equal(startDebugScoreTrial(1.5),false);
settingsOpen=true;assert.equal(startDebugScoreTrial(1),false);settingsOpen=false;
assert(startDebugScoreTrial());
for(let score=1;score<=100;score++){
 assert.equal(debugCourseTrial.score,score);assert.equal(debugCourseTrial.seed,score+10);
 assert.equal(rankingAttemptEligible(),false);assert.equal(ui.level.textContent,'SCORE '+score+' / 100');
 cameraIntro=null;hideStageHelp();state='playing';
 finish(false);ui.retry.onclick();assert.equal(debugCourseTrial.score,score);
 cameraIntro=null;hideStageHelp();state='playing';finish(true);
 assert.equal(ui.resultRanking.hidden,true);assert.equal(ui.next.hidden,false);
 ui.next.onclick();
 if(score<100){assert.equal(debugCourseTrial.score,score+1);ui.next.onclick();assert.equal(debugCourseTrial.score,score+1);}
}
assert.equal(state,'map');assert.equal(debugCourseTrial,null);
assert.equal(JSON.stringify({stageProgress,stageRecords,lives,heartItems,mapRewards,playsSinceAd,featureHelpSeen}),before);
assert(startDebugScoreTrial());cameraIntro=null;hideStageHelp();openSettings();
assert(settingsOpen);assert(ui.settingsDialog.open);ui.debugScoreNext.onclick();
assert.equal(debugCourseTrial.score,2);assert.equal(settingsOpen,false);assert.equal(ui.settingsDialog.open,false);
cameraIntro=null;hideStageHelp();openSettings();ui.debugRegenerate.onclick();
assert.equal(debugCourseTrial.score,2);assert.equal(settingsOpen,false);
cameraIntro=null;hideStageHelp();openSettings();ui.debugCourseExit.onclick();
assert.equal(state,'map');assert.equal(settingsOpen,false);
assert(startDebugScoreTrial(100));ui.debugScoreNext.onclick();assert.equal(debugCourseTrial.score,100);
assert(ui.debugScoreNext.disabled);
setDebugMode(false);assert.equal(state,'map');assert.equal(debugCourseTrial,null);assert.equal(startDebugScoreTrial(),false);
debugMode=true;prepareCurrentStage=originalPrepare;
// Verify real production sampling, deterministic retry, and comparison retention.
debugSwipeComparison.steps=30;
assert(startDebugScoreTrial(1));
assert.equal(activeCourseGeneration.resolved.score,1);
assert.equal(activeCourseGeneration.resolved.kind,'debug-score');
const sampled=CourseProgression.recipe({score:1,seed:11});
for(const [key,value] of Object.entries(sampled))if(key!=='seed')assert.deepEqual(activeCourseGeneration.recipe[key],value);
const geometry=JSON.stringify({holds,route,hearts,stamina});
ui.debugRegenerate.onclick();assert.equal(JSON.stringify({holds,route,hearts,stamina}),geometry);
assert.equal(debugSwipeComparison.steps,30);
ui.debugCourseExit.onclick();assert.equal(state,'map');assert.equal(debugCourseTrial,null);
`);
console.log('PASS debug score trial: 1–100 lifecycle, isolation, real production recipe and deterministic retry');
