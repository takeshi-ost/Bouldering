'use strict';
// Test-only fictional terms; never used by build-ios-assets or published bundles.
const assert=require('node:assert/strict');
const {createFirstRun}=require('../scripts/native-first-run.cjs');
const {servicePermissions}=require('../scripts/native-service-gate.cjs');
(async()=>{
 const fixture={version:'TEST-ONLY-NOT-A-LEGAL-DOCUMENT',ja:'テスト専用の仮規約',en:'Test fixture, not legal terms'};
 let saved=null,analytics=0,ump=0;
 const flow=createFirstRun({version:fixture.version,read:()=>saved,write:v=>{
   saved=v;
   if(servicePermissions({reviewedVersion:fixture.version,acceptedVersion:v}).analytics)analytics++;
 },requestPrivacy:async()=>{ump++;return {status:'updated',adsEnabled:false};}});
 assert.equal((await flow.proceed()).allow,false);assert.equal(analytics,0);assert.equal(ump,0);
 assert.equal((await flow.proceed(true)).allow,true);assert.equal(analytics,1);assert.equal(ump,1);
 assert.equal(servicePermissions({reviewedVersion:fixture.version,acceptedVersion:saved}).personalizedAdvertising,false);
 assert.equal(servicePermissions({reviewedVersion:fixture.version,acceptedVersion:saved,analyticsChoice:'denied'}).analytics,true);
 assert.equal((await flow.proceed()).allow,true);assert.equal(analytics,1);
 console.log('PASS fictional terms flow: no consent no calls; accepted analytics initially ON; ad denial independent; personalization OFF; accepted terms analytics ON');
})();
