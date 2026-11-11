'use strict';
require('./coupled-production-harness.cjs')(`
const original={isTutorialRun,prepareTutorialCourse,prepareAdoptedCourse,prepareStage};
let calls=[];
const phase=name=>{assert(SixPairSelection.useBaseline,name+' must not scan six-pair maps during generation');calls.push(name);};
try {
 isTutorialRun=()=>false;prepareAdoptedCourse=()=>phase('adopted');
 prepareStage=()=>{throw Error('Retired direct generation was reached');};
 for(const scene of ['normal','daily','score','retired-type']){
  calls=[];dailyRun=scene==='daily'?{date:'2026-02-04'}:null;
  debugMode=debugAttempt=['score','retired-type'].includes(scene);
  debugCourseTrial=scene==='score'?{kind:'score',score:50,seed:60,typeId:generationTypeForScore(50)}:
      scene==='retired-type'?{typeId:3,lengthCategory:'short',seed:23}:null;
  prepareCurrentStage();assert.deepEqual(calls,['adopted'],scene+' uses the formal generator');assert(!SixPairSelection.useBaseline);
 }
 calls=[];isTutorialRun=()=>true;prepareTutorialCourse=()=>phase('tutorial');
 prepareCurrentStage();assert.deepEqual(calls,['tutorial']);assert(!SixPairSelection.useBaseline);
 isTutorialRun=()=>false;prepareAdoptedCourse=()=>{phase('error');throw Error('generation-failure');};
 assert.throws(prepareCurrentStage,/generation-failure/);assert(!SixPairSelection.useBaseline,'failure must restore live selector');
} finally {Object.entries(original).forEach(([name,fn])=>eval(name+'=fn'));dailyRun=null;debugCourseTrial=null;debugMode=debugAttempt=false;}
console.log('PASS baseline generation scope: normal, Daily, score trial, rejected legacy state, authored tutorial and error restoration');
`);
