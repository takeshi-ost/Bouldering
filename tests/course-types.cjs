'use strict';
// TYPE-selected trials are retired. Keep this registry slot as an explicit
// retirement/compatibility boundary, not a success claim for removed recipes.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const html=fs.readFileSync('index.html','utf8');
const entries=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>({file:m[1],source:fs.readFileSync(m[1],'utf8')}));
const nativeSource=require('../scripts/native-bundle-source.cjs');
for(const id of ['debugCourseType','debugCourseLength','debugGenerate'])assert(!html.includes('id="'+id+'"'),id+' must not be a hidden entry');
const env=`
const nodes={};const document={getElementById(id){return nodes[id]||={style:{setProperty(){}},classList:{toggle(){}},focus(){},blur(){},addEventListener(){},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){};
`;
const checks=`
assert.equal(typeof startDebugCourse,'undefined');assert.equal(typeof debugCourseDistribution,'undefined');
assert.equal(typeof newDebugCourseSeed,'undefined');assert.equal(typeof renderDebugCourseChoices,'undefined');
assert.equal(typeof applyRouteHazards,'undefined');assert.equal(typeof recipeHearts,'undefined');
assert.equal(typeof finalizeConvertedCourse,'undefined');assert.equal(typeof chooseCourseIntent,'undefined');
for(const id of ['debugCourseType','debugCourseLength','debugGenerate'])assert.equal(ui[id],undefined);
assert.equal(typeof findCourseHeartMove,'function');assert.equal(typeof finalizeCourseGeneration,'function');
for(const intent of ['choice','consumption','recovery','mixed'])assert.throws(()=>finalizeCourseGeneration(intent),/retired/);
// Internal IDs/weight mapping remain stable because formal placement consumes
// these calibration definitions. Removing the UI must not remove array entries.
assert.deepEqual(COURSE_TYPES.map(t=>t.id),[0,1,2,3,4,5,6,7,8,9]);
assert.deepEqual(COURSE_TYPES.map(t=>courseTypeLabel(t.id)),['EASY','EASY','NORMAL','NORMAL','NORMAL','NORMAL','HARD','HARD','HARD','HARD']);
const weights=[145,55,45,25,20,10,20,25,25,30];
const ordered=Array.from({length:100},(_,seed)=>weightedCourseType(weights,seed));
COURSE_TYPES.reverse();assert.deepEqual(Array.from({length:100},(_,seed)=>weightedCourseType(weights,seed)),ordered);COURSE_TYPES.reverse();
assert.equal(courseTypeRule(1).generationDifficulty,1);assert(difficultyRule(1).hearts);
let sent=0;queueOnlineScore=()=>sent++;queueOnlineProfileSave=()=>sent++;
const save=()=>JSON.stringify({stageProgress,stageRecords,dailyRecords,mapRewards,heartItems,playsSinceAd,lives,help:featureHelpSeen,storage:[...data]});
const before=save();
tutorialRun=null;dailyRun=null;debugCourseTrial=null;debugMode=debugAttempt=false;reset(1);
const normal=JSON.stringify({holds,route,hearts,HEIGHT,stamina,level,difficulty,courseTypeId});
for(const invalid of [
 {typeId:3,lengthCategory:'short',seed:23},
 {typeId:7,lengthCategory:'long',seed:1007},
 {kind:'score',score:0,seed:10,typeId:0},
 {kind:'score',score:101,seed:111,typeId:6},
 {kind:'score',score:1.5,seed:11.5,typeId:0},
 {kind:'score',score:1,seed:12,typeId:0},
 {kind:'score',score:1,seed:11,typeId:3}
]){
 debugMode=debugAttempt=true;debugCourseTrial=invalid;
 assert.equal(activeDebugCourse(),null);assert(!activeDebugScoreTrial());assert.equal(courseSeed(1),CourseProgression.resolveStage(1).seed);
 updateDebugCourseReport();assert(ui.debugCourseStatus.hidden);assert.equal(debugCourseTitle(),'');
 debugHelpBefore={...featureHelpSeen};featureHelpSeen.hazard=true;
 reset(1);assert.equal(debugCourseTrial,null);assert.equal(debugHelpBefore,null);assert.equal(debugAttempt,false);
 assert.equal(JSON.stringify({holds,route,hearts,HEIGHT,stamina,level,difficulty,courseTypeId}),normal,'Invalid TYPE state cannot change normal geometry');
 assert.equal(save(),before,'No saved user data or help corruption');
}
// Actual score geometry and asynchronous cancellation are tested in
// debug-score-trial/coupled-course-preparation. Here exercise policy and
// arbitrary-start lifecycle across Web / native Debug / native Release.
prepareCurrentStage=()=>SixPairSelection.withBaseline(prepareTutorialCourse);
state='map';mapPreparing=false;mapTransition=null;settingsOpen=false;debugMode=true;renderLevelMap();
assert.equal(ui.debugControls.hidden,!DEBUG_FEATURES_ALLOWED);
if(DEBUG_FEATURES_ALLOWED){
 assert(startDebugScoreTrial(37));assert(activeDebugScoreTrial());assert.equal(debugCourseTrial.score,37);
 assert.equal(courseSeed(),47);assert.equal(ui.debugCourseSummary.textContent,'SCORE 37 / 100');
 assert.equal(rankingAttemptEligible(),false);cameraIntro=null;hideStageHelp();finish(false);ui.retry.onclick();assert.equal(debugCourseTrial.score,37);
 cameraIntro=null;hideStageHelp();openSettings();ui.debugScoreNext.onclick();assert.equal(debugCourseTrial.score,38);assert(!settingsOpen);
 ui.debugRegenerate.onclick();assert.equal(debugCourseTrial.score,38);
 ui.debugCourseExit.onclick();assert.equal(state,'map');assert.equal(debugCourseTrial,null);assert(ui.debugCourseStatus.hidden);
 assert.equal(save(),before);mapPreparing=false;mapTransition=null;setDebugMode(false);assert.equal(startDebugScoreTrial(1),false);
}else{
 assert.equal(startDebugScoreTrial(37),false);
 debugAttempt=true;debugCourseTrial={kind:'score',score:37,seed:47,typeId:generationTypeForScore(37)};
 assert.equal(activeDebugCourse(),null);updateDebugCourseReport();assert(ui.debugCourseStatus.hidden);
 reset(1);assert.equal(debugCourseTrial,null);assert.equal(debugAttempt,false);assert.equal(save(),before);
}
assert.equal(sent,0);
`;
for(const mode of ['Web','Debug','Release']){
 const data=new Map([['ascent.tutorial-stage0.v1',JSON.stringify({version:1,status:'completed'})],['unrelated.keep','preserved']]);
 const global={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};
 if(mode!=='Web'){global.location={protocol:'capacitor:'};global.ASCENT_IOS_BUILD={configuration:mode,debugAllowed:mode==='Debug'};}
 const source=entries.map(({file,source})=>mode==='Web'?source:nativeSource(path.basename(file),source)).join('\n');
 new Function('assert','globalThis','data',env+source+checks)(assert,global,data);
 console.log('PASS retired TYPE boundary '+mode+': no old UI/API/recipe builders; stable internal IDs; malformed state rejected; current score lifecycle and saved data protected');
}
