'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('scripts/native-ads-runtime.js','utf8');
async function test(){
 let calls=0,network=0,finish,blocked=false;
 const children=[],ctx={advanceDummyAd(){},completeDummyAd(){},document:{getElementById:()=>({appendChild:x=>children.push(x)}),createElement:()=>({setAttribute(){}})},ui:{lifeWatchAd:{}},active:false,dummyAd:null,adCoverPending:false,stopBackgroundMusicForAd(){blocked=true},resumeBackgroundMusicAfterAd(){blocked=false},Capacitor:{Plugins:{AscentAds:{updatePrivacy(){calls++;return new Promise(r=>finish=r)},privacyOptions(){calls++;return Promise.reject(Error('offline'))},show(){network++}}}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);assert.equal(calls,0);assert.equal(network,0);
 const [update,options,label]=children;assert.equal(options.hidden,true);
 update.onclick();update.onclick();assert.equal(calls,1);assert.equal(blocked,true);
 finish({status:'updated',privacyOptionsRequired:true,canRequestAds:false});for(let i=0;i<5;i++)await Promise.resolve();
 assert.equal(update.disabled,false);assert.equal(blocked,false);assert.equal(options.hidden,false);assert.equal(network,0);
 options.onclick();for(let i=0;i<5;i++)await Promise.resolve();assert.equal(blocked,false);assert.equal(update.disabled,false);assert.match(label.textContent,/Ads remain disabled/);assert.equal(network,0);
 update.onclick();finish({status:'updated',privacyOptionsRequired:true,canRequestAds:true,adsEnabled:true});for(let i=0;i<5;i++)await Promise.resolve();assert.match(label.textContent,/TEST ads enabled/);assert.equal(options.hidden,false);assert.equal(network,0);
 update.onclick();finish({status:'restart_required',privacyOptionsRequired:true,canRequestAds:true,adsEnabled:false});for(let i=0;i<5;i++)await Promise.resolve();assert.match(label.textContent,/Fully close/);assert.equal(options.hidden,false);assert.equal(network,0);
 const swift=fs.readFileSync('ios/App/App/AscentAdsPlugin.swift','utf8');
 const consent=swift.slice(swift.indexOf('private func privacyResult'),swift.indexOf('@objc func getStatus'));
 assert(!consent.includes('LevelPlay.initWith'));assert(!consent.includes('setGDPRConsent(true)'));assert(consent.includes('setGDPRConsent(false)'));
 assert(consent.includes('privacyUpdated && info.canRequestAds'));assert(consent.includes('integratedBlocker == nil'));
 assert(swift.includes('guard !self.integratedTest, !self.privacyFlowEntered'));
 assert(swift.includes('#if DEBUG'));assert(!consent.includes('.reset()'));
 assert(swift.includes('guard permitted() else'));assert(swift.includes('session.finish("privacy_changed")'));assert(swift.includes('self.privacyRestartRequired = true'));
 console.log('PASS: UMP UI duplicate/failure/reselection, no automatic network or ad call; static fail-closed guards');
}
test().catch(e=>{console.error(e);process.exitCode=1});
