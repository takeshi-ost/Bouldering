'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createFirstRun}=require('../scripts/native-first-run.cjs');
async function check({accepted=true,version='v1',failure=false,privacyFailure=false}={}){
 let release,shown=0,entered=0,privacy=0,checks=0;
 const saved=new Map([['ascent.terms.accepted.v1',version]]);
 const el=()=>({style:{},children:[],append(...x){this.children.push(...x)},setAttribute(){},showModal(){shown++},close(){},remove(){}});
 const c={createFirstRun,document:{createElement:el,body:{appendChild(){}}},ui:{titleScreen:{onclick(){entered++}},titleTap:{}},titleReady:true,state:'choosing',GAME_TEXT_LANGUAGE:'ja',ASCENT_REVIEWED_TERMS:{version:'v1',ja:'terms',en:'terms'},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},ASCENT_TERMS_NETWORK:{accepted,refresh:()=>{checks++;return checks===1?new Promise((resolve,reject)=>release=()=>failure?reject(Error('read')):resolve()):Promise.resolve()}},Capacitor:{Plugins:{AscentAnalytics:{acceptTerms:async o=>{assert.equal(o.explicitAcceptance,false);return {accepted:true}}},AscentAds:{beginFirstRunPrivacy:async()=>{privacy++;if(privacyFailure)throw Error('offline');return{status:'updated',adsEnabled:false}}}}}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('scripts/native-first-run-runtime.js','utf8'),c);
 const pending=c.ui.titleScreen.onclick();await Promise.resolve();assert.equal(shown,0);assert.equal(entered,0);release();await pending;
 if(failure){assert.equal(shown,0);assert.equal(entered,0);assert.equal(privacy,0);assert.match(c.ui.titleTap.textContent,/再試行/);}
 else if(!accepted||version!=='v1'){assert.equal(shown,1);assert.equal(entered,0);assert.equal(privacy,0);}
 else if(privacyFailure){assert.equal(shown,1);assert.equal(entered,0);assert.equal(privacy,1);}
 else{assert.equal(shown,0);assert.equal(entered,1);assert.equal(privacy,1);}
}
(async()=>{await check();await check();await check({accepted:false});await check({version:'old'});await check({failure:true});await check({privacyFailure:true});console.log('PASS no terms flash: delayed read, accepted restart, unaccepted, updated terms, read failure, privacy error');})();
