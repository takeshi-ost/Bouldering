"use strict";
const assert=require('node:assert/strict');
const {createFirstRun}=require('../scripts/native-first-run.cjs');
(async()=>{
 let saved=null,calls=0,resolve;
 const make=()=>createFirstRun({version:'reviewed-1',read:()=>saved,write:v=>saved=v,requestPrivacy:()=>{calls++;return new Promise(r=>resolve=r);}});
 let f=make();assert.equal((await f.proceed()).status,'terms_required');assert.equal(calls,0);
 const pending=f.proceed(true);assert.equal(calls,1);assert.equal((await f.proceed()).status,'busy');
 resolve({status:'updated',adsEnabled:false});assert.equal((await pending).allow,true);assert.equal((await f.proceed()).allow,true);assert.equal(calls,1);
 f=make();const again=f.proceed();assert.equal(calls,2);resolve({status:'updated',adsEnabled:false});assert.equal((await again).allow,true);
 f=createFirstRun({version:'reviewed-1',read:()=>saved,write(){},requestPrivacy:async()=>{throw Error('offline');}});
 assert.equal((await f.proceed()).status,'privacy_unavailable');assert.equal(f.continueWithoutAds().allow,true);
 f=createFirstRun({version:'reviewed-2',read:()=>saved,write(){throw Error('storage');},requestPrivacy:async()=>{throw Error('must not call');}});
 assert.equal((await f.proceed(true)).status,'storage_failed');assert.equal(f.continueWithoutAds().allow,false);
 f=createFirstRun({version:null,read:()=>null,write(){},requestPrivacy(){throw Error('must not call');}});assert.equal((await f.proceed(true)).allow,false);
 console.log('PASS first-run: acceptance, refusal/no network, duplicate tap, restart refresh, privacy decline, offline fallback, storage failure, unreviewed terms');
})().catch(e=>{console.error(e);process.exitCode=1});
