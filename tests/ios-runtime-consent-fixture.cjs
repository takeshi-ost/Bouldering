'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('tests/ios-runtime-consent-fixture.js','utf8'),context);
const install=context.installAscentOfflineConsentFixture;
test('offline consent fixture exercises explicit acceptance without native SDK/storage calls',async()=>{
 const calls=[],original=async(...args)=>{calls.push(args);return 'forwarded';},cap={nativePromise:original};
 assert.throws(()=>install(cap,{firebaseEnabled:true},'TEST'),/guard/);
 assert.equal(cap.nativePromise,original);
 const f=install(cap,{firebaseEnabled:false},'TEST');
 assert.equal((await cap.nativePromise('AscentAnalytics','termsStatus')).accepted,false);
 await assert.rejects(cap.nativePromise('AscentAnalytics','acceptTerms',{version:'TEST',explicitAcceptance:false}),/explicit/);
 await assert.rejects(cap.nativePromise('AscentAds','beginFirstRunPrivacy'),/blocked/);
 await cap.nativePromise('AscentAnalytics','acceptTerms',{version:'TEST',explicitAcceptance:true});
 assert.equal((await cap.nativePromise('AscentAnalytics','termsStatus')).accepted,true);
 assert.equal((await cap.nativePromise('AscentAds','beginFirstRunPrivacy')).adsEnabled,false);
 await cap.nativePromise('AscentAnalytics','event',{name:'level_start'});
 await assert.rejects(cap.nativePromise('AscentAnalytics','openPrivacyPolicy'),/blocked/);
 await assert.rejects(cap.nativePromise('AscentAds','showRewarded'),/blocked/);
 await cap.nativePromise('AscentAnalytics','acceptTerms',{version:'TEST',explicitAcceptance:false});
 assert.equal(calls.length,0);assert.equal(f.accepts,1);assert.equal(f.privacyRequests,1);
 assert.equal(await cap.nativePromise('AscentResume','status',{}),'forwarded');assert.equal(calls.length,1);
 f.restore();assert.equal(cap.nativePromise,original);
});
test('Capacitor registered native plugins route through the guarded offline fixture',async()=>{
 const capacitorContext={exports:{},console};vm.createContext(capacitorContext);
 vm.runInContext(fs.readFileSync(require.resolve('@capacitor/core'),'utf8')+'\nglobalThis.testCreateCapacitor=createCapacitor;',capacitorContext);
 const createCapacitor=capacitorContext.testCreateCapacitor;
 const calls=[],host={navigator:{},androidBridge:{},console,PluginHeaders:[{name:'AscentAnalytics',methods:[{name:'termsStatus',rtype:'promise'},{name:'acceptTerms',rtype:'promise'}]}]};
 // Test the same dynamically looked-up nativePromise boundary as native proxies.
 const cap=createCapacitor(host);cap.PluginHeaders=host.PluginHeaders;cap.nativePromise=async(...args)=>{calls.push(args);throw Error('native bridge must not run');};
 const plugin=cap.registerPlugin('AscentAnalytics');
 const f=install(cap,{firebaseEnabled:false},'TEST');
 assert.equal((await plugin.termsStatus()).accepted,false);
 await plugin.acceptTerms({version:'TEST',explicitAcceptance:true});
 assert.equal(f.accepted,true);assert.equal(calls.length,0);f.restore();
});
