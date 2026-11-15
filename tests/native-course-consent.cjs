'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let create=0,warm=0,update=0;
const ctx={ASCENT_TERMS_NETWORK:{accepted:false},fetch(){throw Error('No real network')},document:{baseURI:'capacitor://localhost/'},AscentCourseData:{create(){create++;return{warmup(){warm++},update(){update++}}}},clearAdoptedCourseCache(){},coursePreparationPortableSignature(){}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('www/js/course-data.js','utf8'),ctx);
ctx.checkCourseDataUpdates();assert.deepEqual([create,warm,update],[0,0,0]);
ctx.ASCENT_TERMS_NETWORK.accepted=true;ctx.checkCourseDataUpdates();assert.deepEqual([create,warm,update],[1,1,1]);
ctx.ASCENT_TERMS_NETWORK.accepted=false;ctx.checkCourseDataUpdates();assert.deepEqual([create,warm,update],[1,1,1]);
console.log('PASS course updater: no initialize/warmup/update before terms; resume on acceptance; no global network blockade');
