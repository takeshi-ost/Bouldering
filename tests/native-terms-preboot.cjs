'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 let approved=false,requests=0,events=0,updates=0;
 const fetch=async()=>{requests++;return 'ok'};
 const c={Promise,fetch,Event:class{},window:{dispatchEvent(){events++}},Capacitor:{Plugins:{AscentAnalytics:{termsStatus:async()=>({accepted:approved})}}},checkCourseDataUpdates(){updates++}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('scripts/native-terms-preboot.js','utf8'),c);
 await c.ASCENT_TERMS_NETWORK.refresh();assert.equal(c.ASCENT_TERMS_NETWORK.accepted,false);assert.equal(requests,0);assert.equal(c.fetch,fetch);
 await c.fetch('https://public.example/policy');assert.equal(requests,1);
 approved=true;await c.ASCENT_TERMS_NETWORK.refresh();assert.equal(events,1);assert.equal(updates,1);
 await c.ASCENT_TERMS_NETWORK.refresh();assert.equal(events,1);
 approved=false;await c.ASCENT_TERMS_NETWORK.refresh();assert.equal(c.ASCENT_TERMS_NETWORK.accepted,false);
 c.Capacitor.Plugins.AscentAnalytics.termsStatus=async()=>{throw Error('bridge')};await c.ASCENT_TERMS_NETWORK.refresh();assert.equal(c.ASCENT_TERMS_NETWORK.accepted,false);
 const swift=fs.readFileSync('ios/App/App/AscentAdsPlugin.swift','utf8');
 for(const m of ['beginFirstRunPrivacy','updatePrivacy','privacyOptions','authorizeDeveloperGameTest','openDeveloperTestSuite','show'])assert(swift.includes('@objc func '+m+'(_ call: CAPPluginCall) {\n        guard AscentTermsGate.accepted'));
 const a=fs.readFileSync('ios/App/App/AscentAnalyticsPlugin.swift','utf8');assert(a.includes('guard AscentTermsGate.accepted, available, allowed'));assert(a.includes('guard AscentTermsGate.accepted, allowed, configured'));
 assert(a.includes('AscentPublishedPrivacyVersion'));assert(a.includes('https://takeshi-ost.github.io/Bouldering/privacy/'));assert(a.includes('UIApplication.shared.open'));
 console.log('PASS service permission preboot: no automatic request; ordinary web allowed; native consent state fails closed; SDK gates retained; revision-gated policy browser action');
})().catch(e=>{console.error(e);process.exitCode=1});
