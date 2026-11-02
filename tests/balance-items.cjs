'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const nodes={};const document={getElementById(id){return nodes[id]||={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
const original={types:COURSE_TYPES.slice(),config:JSON.parse(JSON.stringify(DIFFICULTY_CONFIG)),lengths:STAGE_CONFIG.lengthRules};
const weights=id=>COURSE_TYPES.map(t=>Number(t.id===id));
const allLengths=length=>{DIFFICULTY_CONFIG.calibration.length=length;};
const forceTrial=(typeId,lengthCategory='short',seed=5)=>{debugMode=true;debugAttempt=true;debugCourseTrial={typeId,lengthCategory,seed};};
try {
 for(const count of [1,2,5,7]) {
  const items=Array.from({length:count},(_,i)=>({id:'item-'+(i+10)})),counts=new Map(items.map(x=>[x.id,0]));
  for(let seed=0;seed<10000;seed++){const zero=weightedItemId(items,Array(count).fill(0),seed),equal=weightedItemId(items,Array(count).fill(1),seed);assert.equal(zero,equal);assert.equal(weightedItemId(items,Array(count).fill(5),seed),equal);counts.set(zero,counts.get(zero)+1);}
  for(const n of counts.values())assert(Math.abs(n-10000/count)<220);
 }
 for(const bad of [[],[1,2],Array(10).fill(-1),Array(10).fill(NaN),Array(10).fill(Infinity),Array(10).fill('1'),Array(10),Array(10).fill(Number.MAX_VALUE)])assert.throws(()=>weightedCourseType(bad,3),RangeError);
 for(const items of [[],[{}],[{id:'x'},{id:'x'}],[{id:-1}],[null]])assert.throws(()=>weightedItemId(items,Array(items.length).fill(0),1),RangeError);
 assert.throws(()=>weightedItemId([{id:'x'}],[1],NaN),RangeError);
 // Zero/equal and mutable definitions remain supported by the isolated debug
 // selector; they must no longer change the normal score schedule or Daily.
 const zero=COURSE_TYPES.map(()=>0),equal=COURSE_TYPES.map(()=>1);
 const normal=JSON.stringify(CourseProgression.resolveStage(20)),day=JSON.stringify(dailyProfile('2026-02-04'));
 DIFFICULTY_CONFIG.calibration={difficulty:zero,length:[0,0,0]};
 for(let n=2;n<502;n++){assert.equal(weightedCourseType(zero,n ^ 0x44A17C39),weightedCourseType(equal,n ^ 0x44A17C39));assert.equal(stageLengthRule(n).category,STAGE_CONFIG.lengthRules[mulberry32(n ^ 0x4D7C2A19)()*3|0].category);}
 assert.equal(stageLengthRule(1).category,'short');assert.equal(JSON.stringify(CourseProgression.resolveStage(20)),normal);assert.equal(JSON.stringify(dailyProfile('2026-02-04')),day);
 for(const bad of [{difficulty:[],length:[1,1,1]},{difficulty:zero,length:[]},{difficulty:zero,length:[-1,1,1]}]){DIFFICULTY_CONFIG.calibration=bad;assert.throws(()=>stageLengthRule(1),RangeError);}
 COURSE_TYPES.splice(0,COURSE_TYPES.length,{...original.types[0],id:10},{...original.types[1],id:20});DIFFICULTY_CONFIG.calibration={difficulty:weights(20),length:[2,5,3]};assert.equal(weightedCourseType(weights(20),1),20);forceTrial(20);reset(5);assert.equal(courseTypeId,20);assert.equal(difficulty,1);assert(validateRouteBudget(route));
 COURSE_TYPES.push({...original.types[0],id:'gentle',name:'new-basic'});DIFFICULTY_CONFIG.calibration.difficulty=weights('gentle');forceTrial('gentle');reset(5);assert.equal(courseTypeId,'gentle');assert.equal(chooseCourseIntent(),'basic');assert(validateRouteBudget(route));const saved=COURSE_TYPES.at(-1).intent;COURSE_TYPES.at(-1).intent='unknown';assert.throws(()=>courseTypeRule('gentle'),RangeError);COURSE_TYPES.at(-1).intent=saved;
 COURSE_TYPES.splice(0,COURSE_TYPES.length,...original.types);Object.assign(DIFFICULTY_CONFIG,JSON.parse(JSON.stringify(original.config)));
 STAGE_CONFIG.lengthRules=[...original.lengths,{category:'extra',labelKey:'course.medium',mapHeight:'125',height:H*2,climbHeight:290}];allLengths([0,0,0,1]);assert.equal(stageLengthRule(5).category,'extra');assert.equal(courseLengthLabel('extra'),'ミドル');
 forceTrial(0,'extra');reset(5);assert.equal(HEIGHT,H*2);assert(validateRouteBudget(route));const fixed=JSON.stringify({holds,route,hearts,stamina});reset(5);assert.equal(JSON.stringify({holds,route,hearts,stamina}),fixed);
 const formalInfo=stageLengthInfo(5);allLengths([1,0,0,0]);assert.deepEqual(stageLengthInfo(5),formalInfo,'Native calibration must not override score recipe length');
 STAGE_CONFIG.lengthRules=[original.lengths[0],original.lengths[2]];allLengths([0,1]);assert.equal(stageLengthRule(5).category,'long');
 for(const bad of [[],[1],[-1,1],[NaN,1],[Infinity,1]]){allLengths(bad);assert.throws(()=>stageLengthRule(5),RangeError);}
 STAGE_CONFIG.lengthRules=[];allLengths([]);assert.throws(()=>stageLengthRule(5),RangeError);
} finally {COURSE_TYPES.splice(0,COURSE_TYPES.length,...original.types);Object.assign(DIFFICULTY_CONFIG,original.config);STAGE_CONFIG.lengthRules=original.lengths;dailyRun=null;debugMode=false;debugAttempt=false;debugCourseTrial=null;}
console.log('PASS balance: generic variable IDs/zero/equal/invalid ratios and retained debug custom types/lengths/budget/retry; calibration cannot alter formal score schedule, Daily or recipe lengths');
`)(assert);
