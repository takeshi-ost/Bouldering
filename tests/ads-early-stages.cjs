'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/ads.js'),'utf8');
function fixture(data={}){
 const context=vm.createContext({assert,localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v}});
 vm.runInContext(`let level=1,adPlayRecorded=false,dailyRun=null,debugAttempt=false,courseMode='existing',state='lost';
 const ui={adComplete:{},dummyAd:{addEventListener(){}}};
 const lives={count:3};let settlements=0,returns=0,adCalls=0,pendingAd;
 function settleLifeAttempt(){settlements++;}function recoverLives(){}
 `+source+`
 startDummyAd=options=>{adCalls++;pendingAd=options;return true;};
 function leave(){return continueAfterNormalAd(()=>{returns++;return 'returned';});}
 `,context);
 return code=>vm.runInContext(code,context);
}
test('v2 cadence starts fresh without deleting old v1; persisted v2 survives reload',()=>{
 const data={'ascent.ad-plays.v1':'9'};
 let run=fixture(data);run('assert.equal(playsSinceAd,0);level=11;recordAdPlay();assert.equal(playsSinceAd,1)');
 assert.equal(data['ascent.ad-plays.v1'],'9');assert.equal(data['ascent.ad-plays.v2'],'1');
 run=fixture(data);run('assert.equal(playsSinceAd,1)');
});
test('early wins/losses/retries/retirements neither count nor display, even with eligible debt',()=>{
 const run=fixture();
 run(`for(const debt of [0,2,3,9])for(level=1;level<=10;level++)for(state of ['won','lost','playing']){
  playsSinceAd=debt;adPlayRecorded=false;recordAdPlay();recordAdPlay();
  assert.equal(playsSinceAd,debt);assert.equal(leave(),'returned');assert.equal(adCalls,0);
  assert.equal(playsSinceAd,debt);
 }assert(settlements>0);`);
});
test('stage10 to11 starts eligible count, third eligible exit ad resets only on completion',()=>{
 const run=fixture();run(`
 level=10;recordAdPlay();leave();assert.equal(playsSinceAd,0);
 level=11;for(let i=1;i<=3;i++){
  adPlayRecorded=false;recordAdPlay();recordAdPlay();assert.equal(playsSinceAd,i);leave();
  assert.equal(adCalls,i===3?1:0);
 }
 assert.equal(playsSinceAd,3);pendingAd.onComplete();pendingAd.onReturn();assert.equal(playsSinceAd,0);
 `);
});
test('early replay preserves later debt; zero-life gate skips without resetting; Daily/debug excluded',()=>{
 const run=fixture();run(`
 playsSinceAd=3;level=1;recordAdPlay();leave();assert.equal(adCalls,0);assert.equal(playsSinceAd,3);
 level=11;lives.count=0;leave();assert.equal(adCalls,0);assert.equal(playsSinceAd,3);
 lives.count=1;leave();assert.equal(adCalls,1);
 for(const mode of ['daily','debug','prototype']){
  pendingAd=null;adCalls=0;adPlayRecorded=false;playsSinceAd=3;
  dailyRun=mode==='daily'?{}:null;debugAttempt=mode==='debug';courseMode=mode==='prototype'?'prototype':'existing';
  recordAdPlay();leave();assert.equal(playsSinceAd,3);assert.equal(adCalls,0);
 }
 `);
});
test('suppressing a return ad preserves persistent count and does not change later retry gate',()=>{
 const data={},run=fixture(data);
 run(`level=11;playsSinceAd=2;recordAdPlay();assert.equal(playsSinceAd,3);
  assert.equal(continueAfterNormalAd(()=>{returns++;return 'map';},{showRegularAd:false}),'map');
  assert.equal(adCalls,0);assert.equal(playsSinceAd,3);assert.equal(settlements,1);
  leave();assert.equal(adCalls,1);assert.equal(playsSinceAd,3);
 `);
 assert.equal(data['ascent.ad-plays.v2'],'3');
});
