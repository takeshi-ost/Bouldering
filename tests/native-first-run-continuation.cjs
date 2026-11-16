'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createFirstRun}=require('../scripts/native-first-run.cjs');
const source=fs.readFileSync('scripts/native-first-run-runtime.js','utf8');
const key='ascent.terms.continue-after-reload.v1';
const main=fs.readFileSync('js/main.js','utf8');
const titleEntry=main.slice(main.indexOf('function enterPreparedMap()'),main.indexOf('ui.titleScreen.onclick=enterPreparedMap;'));
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function fixture({token={version:'v1',at:Date.now()},accepted=true,pending=true,ready=false,privacyFails=false,removeFails=false,refreshFails=false}={}) {
 const events={},session=new Map(token?[[key,JSON.stringify(token)]]:[]),created=[];
 let entered=0,privacy=0,native=0;
 const element=tag=>{const e={tag,style:{},children:[],append(...a){this.children.push(...a)},setAttribute(){},showModal(){},close(){},remove(){}};created.push(e);return e;};
 const c={createFirstRun,document:{createElement:element,body:{appendChild(){}}},ui:{titleScreen:{},titleTap:{}},titleReady:ready,titlePreparation:0,state:'choosing',tutorialPending:()=>pending,
 transferBusy:()=>false,transferElement:()=>({open:false}),playSound(){},startTutorialRun(){entered++;c.state='tutorial';},
 ASCENT_REVIEWED_TERMS:{version:'v1',ja:'test',en:'test'},localStorage:{getItem:()=>accepted?'v1':null},sessionStorage:{getItem:k=>session.get(k),removeItem:k=>{if(removeFails)throw Error('storage');session.delete(k)}},
 ASCENT_TERMS_NETWORK:{get accepted(){return accepted},refresh:async()=>{if(refreshFails)throw Error('refresh');return accepted}},addEventListener:(n,f)=>events[n]=f,
 Capacitor:{Plugins:{AscentAnalytics:{acceptTerms:async o=>{assert.equal(o.explicitAcceptance,false);native++;return{accepted}}},AscentAds:{beginFirstRunPrivacy:async()=>{privacy++;if(privacyFails)throw Error('offline');return{status:'updated'}}}}}};
 vm.createContext(c);vm.runInContext(titleEntry+'\nui.titleScreen.onclick=enterPreparedMap;',c);vm.runInContext(source,c);await flush();
 return {c,events,session,created,counts:()=>({entered,privacy,native})};
}
(async()=>{
 const f=await fixture();assert(!f.session.has(key));assert.equal(f.counts().entered,0);
 f.c.titleReady=true;await f.events['ascent-title-ready']();await flush();assert.deepEqual(f.counts(),{entered:1,privacy:1,native:1});
 await f.events['ascent-title-ready']();await f.c.ui.titleScreen.onclick();assert.equal(f.counts().entered,1);
 for(const options of [{token:null},{token:{version:'old',at:Date.now()}},{token:{version:'v1',at:Date.now()-61000}},{token:{version:'v1',at:Date.now()+60000}},{accepted:false},{pending:false},{removeFails:true},{refreshFails:true}]){
  const t=await fixture({...options,ready:true});await flush();assert.deepEqual(t.counts(),{entered:0,privacy:0,native:0});
 }
 const blocked=await fixture({ready:true,privacyFails:true});await flush();assert.equal(blocked.counts().entered,0);
 const offline=blocked.created.find(x=>x.textContent==='広告なしで進む');assert(offline&&!offline.hidden);offline.onclick();assert.equal(blocked.counts().entered,1);
 // A manually completed title tap wins over a queued ready event.
 const race=await fixture();race.c.titleReady=true;await race.c.ui.titleScreen.onclick();await race.events['ascent-title-ready']();assert.equal(race.counts().entered,1);
 // Consumed state cannot auto-start a later document, including a crash/restart.
 const next=await fixture({token:null,ready:true});assert.equal(next.counts().entered,0);
 console.log('PASS one-shot terms reload continuation: ready gate, consent/privacy gate, no stale/duplicate/existing-progress auto-entry');
})().catch(e=>{console.error(e);process.exitCode=1});
