'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../scripts/native-ads-runtime.js'),'utf8');
async function fixture(withDebug=false){
 let resolve,reject,listener,calls=0,grants=0,returns=0,unavailable=0,blocked=false;
 const ctx={console,Promise,Date,Map,setTimeout,clearTimeout,requestAnimationFrame:fn=>Promise.resolve().then(fn),GAME_TEXT_LANGUAGE:"ja",document:{body:{children:[],appendChild(x){this.children.push(x)}},createElement(){return {style:{},setAttribute(){},remove(){ctx.document.body.children=ctx.document.body.children.filter(x=>x!==this)}}}},performance:{now:()=>2000},state:'playing',dummyAd:null,adCoverPending:false,runStartedAt:1000,runElapsedMs:0,
 bodyTap:null,touchId:null,ignoreTouches:false,ui:{lifeWatchAd:{},overlay:{open:false}},runTimeMs:()=>1000,release(){},endPan(){},hideSettings(){},hideResultModal(){},showResultModal(){},refreshLives(){},
 stopBackgroundMusicForAd(){blocked=true},resumeBackgroundMusicAfterAd(){blocked=false},requestGameRender(){},schedulePresentationUpdates(){},advanceDummyAd(){},completeDummyAd(){},startDummyAd(){},
 Capacitor:{Plugins:{AscentAds:{addListener:async(name,fn)=>{listener=fn;return{}},show(args){calls++;ctx.args=args;return new Promise((a,b)=>{resolve=a;reject=b})}}}}};
 if(withDebug){ctx.debugMode=true;ctx.state='map';ctx.ui.debugControls={children:[],appendChild(x){this.children.push(x)}};ctx.Capacitor.Plugins.AscentAds.openDeveloperTestSuite=()=>new Promise((a,b)=>{resolve=a;reject=b});}
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const start=(format='rewarded')=>ctx.startDummyAd({format,onComplete:()=>grants++,onReturn:()=>returns++,onUnavailable:()=>unavailable++});
 const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};
 return {ctx,start,flush,resolve:x=>resolve(x),reject:()=>reject(Error('no fill')),reward:()=>listener({requestId:ctx.args.requestId}),stats:()=>({calls,grants,returns,unavailable,blocked})};
}
(async()=>{
 for(const result of [{shown:false,rewarded:false},{shown:true,rewarded:false}]){
  const f=await fixture();assert(f.start());assert(!f.start());await f.flush();assert.equal(f.ctx.state,'ad');assert.equal(f.ctx.document.body.children[0].textContent,'広告を読み込み中…');assert.equal(f.stats().blocked,true);
  f.resolve(result);await f.flush();assert.equal(f.ctx.state,'playing');assert.equal(f.ctx.document.body.children.length,0);assert.equal(f.stats().grants,0);assert.equal(f.stats().returns,0);assert.equal(f.stats().unavailable,1);assert.equal(f.stats().blocked,false);
 }
 {const f=await fixture();f.start();await f.flush();f.reward();f.reward();assert.equal(f.stats().grants,0);f.resolve({shown:true,rewarded:true});await f.flush();f.reward();assert.equal(f.stats().grants,1);assert.equal(f.stats().returns,1);assert.equal(f.ctx.runStartedAt,1000);}
 {const f=await fixture();f.start();await f.flush();f.resolve({shown:true,rewarded:false});await f.flush();f.reward();f.reward();assert.equal(f.stats().grants,1);assert.equal(f.stats().returns,0);}
 {const f=await fixture();f.start('interstitial');await f.flush();f.reject();await f.flush();assert.equal(f.stats().returns,1);assert.equal(f.stats().grants,0);assert.equal(f.stats().blocked,false);}
 {const f=await fixture();delete f.ctx.Capacitor;f.start();await f.flush();assert.equal(f.stats().unavailable,1);assert.equal(f.stats().blocked,false);}
 {const f=await fixture(true),button=f.ctx.ui.debugControls.children[0];
  const opening=button.onclick();assert.equal(button.disabled,true);assert.equal(f.stats().blocked,true);
  f.resolve({status:'cancelled'});await opening;assert.equal(button.disabled,false);assert.equal(f.stats().blocked,false);
  const retry=button.onclick();f.reject();await retry;assert.equal(f.stats().blocked,false);
  f.ctx.debugMode=false;await button.onclick();assert.equal(button.disabled,false);
 }
 {const f=await fixture(true),button=f.ctx.ui.debugControls.children[2],suite=f.ctx.ui.debugControls.children[0];
  let requests=0,done;
  f.ctx.Capacitor.Plugins.AscentAds.authorizeDeveloperGameTest=()=>{requests++;return new Promise(r=>done=r)};
  const pending=button.onclick();assert.equal(button.disabled,true);assert.equal(suite.disabled,true);
  await button.onclick();assert.equal(requests,1);assert.equal(f.stats().calls,0);
  done({status:'declined'});await pending;assert.equal(button.disabled,false);assert.equal(suite.disabled,false);assert.equal(f.stats().calls,0);
  const allowed=button.onclick();done({status:'authorized'});await allowed;assert.equal(f.stats().calls,0);
  f.ctx.debugMode=false;await button.onclick();assert.equal(requests,2);
 }
 {const f=await fixture();f.ctx.GAME_TEXT_LANGUAGE='en';f.start();await f.flush();assert.equal(f.ctx.document.body.children[0].textContent,'Loading ad…');f.reject();await f.flush();assert.equal(f.ctx.document.body.children.length,0);}
 {const f=await fixture();let expire;f.ctx.setTimeout=fn=>{expire=fn;return 1};f.ctx.requestAnimationFrame=()=>{};f.start();await f.flush();assert.equal(f.stats().calls,0);expire();await f.flush();assert.equal(f.ctx.document.body.children.length,0);assert.equal(f.stats().calls,0);assert.equal(f.stats().grants,0);}
 {const f=await fixture();f.ctx.Capacitor.Plugins.AscentAds.show=()=>{throw Error('sync failure')};f.start();await f.flush();assert.equal(f.ctx.document.body.children.length,0);assert.equal(f.stats().blocked,false);}
 for(const result of [{shown:true,rewarded:true,status:'closed'},{shown:false,rewarded:false,status:'load_timeout'},{shown:false,rewarded:false,status:'display_failed'}]){const f=await fixture();f.start();await f.flush();f.resolve(result);await f.flush();assert.equal(f.ctx.document.body.children.length,0);assert.equal(f.stats().grants,result.rewarded?1:0);assert.equal(f.stats().blocked,false);}
 console.log('PASS native ads: no fill, dismissal, reward once, late reward, timer/audio restoration, duplicate tap, missing plugin');
})().catch(e=>{console.error(e);process.exitCode=1});
