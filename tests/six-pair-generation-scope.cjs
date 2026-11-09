'use strict';
require('./coupled-production-harness.cjs')(`
const original={isTutorialRun,prepareTutorialCourse,activeDebugCourse,activeDebugScoreTrial,prepareAdoptedCourse,chooseCourseIntent,prepareStage,optimizeRoute,updateStageDensity,finalizeCourseGeneration};
let calls=[];
const phase=name=>{assert(SixPairSelection.useBaseline,name+' must not scan six-pair maps during generation');calls.push(name);};
try {
 dailyRun=null;
 isTutorialRun=()=>false;activeDebugCourse=()=>false;prepareAdoptedCourse=()=>phase('adopted');
 prepareCurrentStage();assert.deepEqual(calls,['adopted']);assert(!SixPairSelection.useBaseline);
 calls=[];isTutorialRun=()=>true;prepareTutorialCourse=()=>phase('tutorial');
 prepareCurrentStage();assert.deepEqual(calls,['tutorial']);assert(!SixPairSelection.useBaseline);
 calls=[];isTutorialRun=()=>false;activeDebugCourse=()=>true;activeDebugScoreTrial=()=>false;
 chooseCourseIntent=()=>{phase('intent');return 'basic';};prepareStage=()=>phase('geometry');
 optimizeRoute=r=>{phase('optimize');return r;};updateStageDensity=()=>phase('density');finalizeCourseGeneration=()=>phase('validate');
 prepareCurrentStage();assert.deepEqual(calls,['intent','geometry','optimize','density','validate']);assert(!SixPairSelection.useBaseline);
 calls=[];activeDebugScoreTrial=()=>true;prepareCurrentStage();assert.deepEqual(calls,['adopted']);
 activeDebugScoreTrial=()=>false;prepareStage=()=>{phase('error');throw Error('generation-failure');};
 assert.throws(prepareCurrentStage,/generation-failure/);assert(!SixPairSelection.useBaseline,'failure must restore live selector');
} finally {Object.entries(original).forEach(([name,fn])=>eval(name+'=fn'));}
console.log('PASS baseline generation scope: normal, score trial, retained debug, authored tutorial and error restoration');
`);
