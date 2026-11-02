'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const nodes={};const document={getElementById(id){return nodes[id]||={style:{},classList:{toggle(){}},focus(){},blur(){},addEventListener(){},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){};`;
const data=new Map(),ctx=vm.createContext({assert,console,performance,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},storageDump:()=>JSON.stringify([...data]),crypto:{getRandomValues(a){a[0]=777;return a;}}});
vm.runInContext(env+source+`
assert.equal(COURSE_TYPES.length,10);assert.deepEqual(COURSE_TYPES.map(t=>t.id),[0,1,2,3,4,5,6,7,8,9]);
assert.deepEqual(COURSE_TYPES.map(t=>courseTypeLabel(t.id)),['EASY','EASY','NORMAL','NORMAL','NORMAL','NORMAL','HARD','HARD','HARD','HARD']);
const ordered=Array.from({length:100},(_,seed)=>weightedCourseType([145,55,45,25,20,10,20,25,25,30],seed));COURSE_TYPES.reverse();assert.deepEqual(Array.from({length:100},(_,seed)=>weightedCourseType([145,55,45,25,20,10,20,25,25,30],seed)),ordered,'Definition reordering must preserve stable ID weights');COURSE_TYPES.reverse();
assert.equal(courseTypeRule(1).generationDifficulty,1);assert(difficultyRule(1).hearts,'EASY label must not disable old-1 hearts');
const report=[],capture=()=>JSON.stringify({stageProgress,stageRecords,dailyRecords,mapRewards,heartItems,playsSinceAd,lives,help:featureHelpSeen,storage:storageDump()});
state='map';mapPreparing=false;mapTransition=null;settingsOpen=false;debugMode=true;
const before=capture();let sent=0;queueOnlineScore=()=>{sent++;};queueOnlineProfileSave=()=>{sent++;};
// Selecting/canceling an ordinary stage does not start a trial or mutate saves.
assert(openStageStart(1,true));closeStageStart();assert.equal(debugCourseTrial,null);assert.equal(capture(),before);
for(const type of COURSE_TYPES){
 state='map';mapPreparing=false;mapTransition=null;assert(startDebugCourse(type.id,'short',1000+type.id),ui.mapError.textContent);
 assert.equal(level,2);assert.equal(courseTypeId,type.id);assert.equal(difficulty,type.generationDifficulty);assert.equal(generatedCourse.intent,type.intent);assert.equal(chooseCourseIntent(),type.intent);assert.equal(HEIGHT,H);assert(debugAttempt);assert(!ui.debugCourseStatus.hidden);assert(validateRouteBudget(route));assert.equal(stamina,routeExpectedMoves()+3);
 const status=JSON.parse(ui.debugCourseReport.textContent);assert.equal(status.seed,1000+type.id);assert.equal(status.typeId,type.id);assert.equal(status.requested,type.intent);assert.equal(status.actual,densityStats.courseGeneration.actual);assert.equal(status.matchesRequested,status.actual===type.intent);assert.equal(status.safeFallback,densityStats.courseGeneration.usedSafeFallback);
 report.push({id:type.id,requested:type.intent,actual:status.actual,fallback:status.safeFallback});
 const fixed=JSON.stringify({holds,route,hearts,stamina});assert(startDebugCourse(type.id,'short',1000+type.id));assert.equal(JSON.stringify({holds,route,hearts,stamina}),fixed);
 cameraIntro=null;hideStageHelp();finish(true);assert(ui.resultRanking.hidden);assert.equal(sent,0);showLevelMap();mapPreparing=false;assert.equal(debugCourseTrial,null);assert(ui.debugCourseStatus.hidden);assert.equal(capture(),before,'Trial mutated normal save state');
}
state='map';mapPreparing=false;assert(startDebugCourse(9,'medium',222));assert.equal(HEIGHT,H*2);const trialBefore=JSON.stringify({debugCourseTrial,courseTypeId,holds,route,hearts,stamina,generatedCourse});const normalPreview=stagePreview(20),day=dailyProfile('2026-02-04'),dayPreview=stagePreview(day.referenceStage,'existing',day);assert.equal(normalPreview.typeId,courseTypeForStage(20));assert.equal(normalPreview.seed,20);assert.equal(dayPreview.typeId,day.typeId);assert.equal(JSON.stringify({debugCourseTrial,courseTypeId,holds,route,hearts,stamina,generatedCourse}),trialBefore,'Normal/Daily preview must not inherit or mutate trial context');const firstSeed=debugCourseTrial.seed;ui.debugRegenerate.onclick();assert.notEqual(debugCourseTrial.seed,firstSeed);const second=debugCourseTrial.seed;ui.debugRegenerate.onclick();assert.notEqual(debugCourseTrial.seed,second,'Repeated crypto output must still produce a new seed');
// Forced bounded-recipe fallback remains explicit, and requested type never rerolls.
const convert=convertDenseHazards;convertDenseHazards=(path,salt,safe)=>safe?convert(path,salt,safe):false;
assert(startDebugCourse(9,'short',333));assert(densityStats.courseGeneration.usedSafeFallback);assert.equal(JSON.parse(ui.debugCourseReport.textContent).safeFallback,true);assert.equal(courseTypeId,9);assert.equal(generatedCourse.intent,'mixed');convertDenseHazards=convert;
finish(false);cameraIntro=null;ui.retry.onclick();assert(activeDebugCourse());assert.equal(courseTypeId,9);ui.debugCourseExit.onclick();mapPreparing=false;assert.equal(capture(),before);assert.equal(sent,0);
// Invalid selection safely returns to map and does not leave a trial or stale seed.
assert.equal(startDebugCourse(99,'short',1),false);mapPreparing=false;assert.equal(debugCourseTrial,null);assert(!ui.mapError.hidden);assert.equal(capture(),before);
setDebugMode(false);assert(!startDebugCourse(0,'short',1));assert.equal(debugCourseTrial,null);reset(1);assert.equal(courseTypeId,0);assert.equal(level,1);assert.equal(HEIGHT,H);assert(!debugAttempt);assert.equal(sent,0);
console.log('PASS 10 direct types/trials: labels vs legacy rules, fixed intent/seed/length, deterministic retry, distinct new seeds, requested/actual/fallback report, cancel/exit/normal restore, no progress/items/lives/ads/scores/rewards/help/storage writes');
console.log(JSON.stringify(report));
`,ctx);
const release=vm.createContext({assert,performance,location:{protocol:'capacitor:'},ASCENT_IOS_BUILD:{configuration:'Release',debugAllowed:false}});
vm.runInContext(env+source+`state='map';mapPreparing=false;debugMode=true;assert(!startDebugCourse(0,'short',1));updateDebugCourseReport();assert(ui.debugCourseStatus.hidden);assert.equal(debugCourseTrial,null);`,release);
console.log('PASS Release: direct trial calls denied and inspector hidden regardless of old/debug state');
