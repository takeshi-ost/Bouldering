'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createFirstRun}=require('../scripts/native-first-run.cjs');
async function fixture(language,legacyOff=false,deletion=false){
 let reloads=0;let accepted=false,nativeCalls=0,umpCalls=0,entered=0,webCalls=0,webReason='revision_not_published';const saved=new Map(),created=[];
 function element(tag){const x={tag,textContent:'',style:{},children:[],append(...a){this.children.push(...a)},setAttribute(){},showModal(){},close(){},remove(){}};created.push(x);return x;}
 const c={createFirstRun,DOMParser:class{parseFromString(){return{querySelector:()=>({textContent:'Offline privacy policy'})}}},document:{createElement:element,body:{appendChild(){}}},ui:{titleScreen:{onclick(){entered++}},titleTap:{}},titleReady:true,state:'choosing',GAME_TEXT_LANGUAGE:language,
 navigator:{onLine:true},ASCENT_REVIEWED_TERMS:{version:'TEST-ONLY',ja:'仮規約',en:'Fictional terms',privacyHTML:'Test fixture'},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},ASCENT_TERMS_NETWORK:{get accepted(){return accepted},refresh:async()=>accepted},Capacitor:{Plugins:{AscentAnalytics:{openPrivacyPolicy:async()=>{webCalls++;return{opened:webReason==='browser_opened',reason:webReason}},acceptTerms:async options=>{assert.equal(options.explicitAcceptance,true);nativeCalls++;accepted=true;return{accepted:true}}},AscentAds:{beginFirstRunPrivacy:async()=>{umpCalls++;return{status:'updated',adsEnabled:false}}}}}};
 if(deletion){c.sessionStorage={setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)};c.ASCENT_NATIVE_ACCOUNT_DELETION={completeConfirmedDeletion:async()=>true,prepareTermsRestart:()=>true};c.location={reload:()=>{reloads++}};}
 if(legacyOff)saved.set("ascent.terms.accepted.v1","TEST-ONLY");
 vm.createContext(c);vm.runInContext(fs.readFileSync('scripts/native-first-run-runtime.js','utf8'),c);
 assert.equal(nativeCalls,0);await c.ui.titleScreen.onclick();assert.equal(nativeCalls,0);assert.equal(umpCalls,0);
 const button=created.find(x=>x.tag==='button'&&/同意|Agree/.test(x.textContent));assert(button);const policy=created.find(x=>x.tag==='button'&&/Privacy|プライバシー/.test(x.textContent));assert(policy);
 assert(!created.some(x=>x.tag==='h2'));assert(!created.some(x=>x.textContent==='はじめに'));
 const dialog=created.find(x=>x.tag==='dialog');assert(dialog.style.cssText.includes('height:min(500px'));
 const scroll=dialog.children[0];assert(scroll.style.cssText.includes('overflow:auto'));
 assert.equal(scroll.children.length,2);assert(!created.some(x=>/in app|アプリ内/.test(x.textContent)));assert(!created.some(x=>x.textContent==='Offline privacy policy'));
 const webButton=created.find(x=>x.tag==='button'&&/website|Webサイト/.test(x.textContent));assert(webButton);assert.equal(created.filter(x=>x.tag==='button'&&/Privacy|プライバシー/.test(x.textContent)).length,1);assert.equal(webCalls,0);
 await webButton.onclick();assert.equal(webCalls,1);assert(created.some(x=>/not available yet|サイト未公開/.test(x.textContent)));assert.equal(nativeCalls,0);assert.equal(umpCalls,0);
 c.navigator.onLine=false;await webButton.onclick();assert.equal(webCalls,1);assert(created.some(x=>/Offline|オフライン/.test(x.textContent)));
 c.navigator.onLine=true;webReason='browser_opened';await webButton.onclick();assert.equal(webCalls,2);assert.equal(nativeCalls,0);
 await button.onclick();assert.equal(nativeCalls,1);assert.equal(umpCalls,deletion?0:1);assert.equal(entered,deletion?0:1);assert.equal(reloads,deletion?1:0);assert.equal(saved.get('ascent.terms.accepted.v1'),'TEST-ONLY');if(deletion){const continuation=JSON.parse(saved.get('ascent.terms.continue-after-reload.v1'));assert.equal(continuation.version,'TEST-ONLY');assert(Date.now()-continuation.at<1000);}
}
(async()=>{await fixture('ja');await fixture('en');await fixture('ja',true);await fixture('en',true);await fixture('ja',false,true);await fixture('en',false,true);console.log('PASS native first-run UI JP/EN: compact terms with website-only policy, no services before click, native acceptance precedes UMP, declined ads still enters');})();
