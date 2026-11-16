'use strict';
const assert=require('node:assert/strict');const{createNativeAccountDeletion}=require('../scripts/native-account-deletion.cjs');
function fixture(phase='pending',opts={}){
 const data=opts.data||new Map([['ascent.terms.accepted.v1','v1']]);let journal={uid:'owner',phase},marker={uid:'owner',phase},resets=0,pauses=0,titles=0,terms=data.has('ascent.terms.accepted.v1'),analytics=terms,ads='preserve',cleared=0;
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(opts.failSave)throw Error('disk');data.set(k,v)},removeItem:k=>data.delete(k)};
 const controller={deletionState:()=>journal,permissions:()=>({deletion:terms}),resetDeletion(){assert.equal(journal.phase,'done');journal=null;data.delete('ascent.account-deletion.v1')}};
 const d=createNativeAccountDeletion({controller,storage,reload:opts.reload,game:{marker:()=>marker,mark:(uid,phase)=>marker={uid,phase},uid(){},ready(){},clearGame(){cleared++},clearMarker(){marker=null},returnToTitle(){titles++}},consent:{pause:async()=>{pauses++;analytics=false},reset:async()=>{resets++;if(opts.failReset)throw Error('bridge');terms=false;analytics=false;return{reset:true}},refresh:async()=>false}});
 return{d,data,opts,get:()=>({resets,pauses,titles,terms,analytics,ads,cleared,journal,marker}),done:()=>journal.phase='done'};
}
(async()=>{
 for(const phase of ['pending','auth-deleting']){const f=fixture(phase);await f.d.beforeDelete();assert.equal(await f.d.completeConfirmedDeletion(),false);assert.equal(f.get().terms,true);assert.equal(f.get().resets,0);assert.equal(f.get().titles,0);}
 let f=fixture('done');assert.equal(await f.d.completeConfirmedDeletion(),true);assert.equal(f.get().terms,false);assert.equal(f.get().analytics,false);assert.equal(f.get().ads,'preserve');assert.equal(f.data.has('ascent.terms.accepted.v1'),false);assert.equal(f.get().titles,1);await f.d.completeConfirmedDeletion();assert.equal(f.get().resets,1);
 assert.equal(f.d.prepareTermsRestart(),true);assert.equal(f.get().journal,null);assert.equal(f.get().marker,null);assert.equal(f.d.prepareTermsRestart(),true,'interrupted reconsent stays retryable');
 f=fixture('done',{failReset:true});await assert.rejects(f.d.completeConfirmedDeletion());assert.equal(f.get().titles,0);assert.equal(f.get().terms,true);assert(f.data.has('ascent.terms.accepted.v1'));f.opts.failReset=false;await f.d.completeConfirmedDeletion();assert.equal(f.get().titles,1);
 f=fixture('done',{failSave:true});await assert.rejects(f.d.completeConfirmedDeletion());assert.equal(f.get().titles,0);f.opts.failSave=false;await f.d.completeConfirmedDeletion();assert.equal(f.get().titles,1);
 f=fixture('done');await Promise.all([f.d.completeConfirmedDeletion(),f.d.completeConfirmedDeletion()]);assert.equal(f.get().resets,1);
 let reloads=0;f=fixture('done',{reload:()=>{reloads++;}});
 await f.d.completeConfirmedDeletion();assert.equal(reloads,1);assert.equal(f.get().titles,0);
 assert.equal(f.get().journal.phase,'done');assert.equal(f.get().marker.phase,'done');
 assert.equal(f.data.get('ascent.native-deletion.terms-reset.v1'),'owner');
 assert.equal(f.data.get('ascent.native-deletion.completion-reload.v1'),'owner');
 await f.d.completeConfirmedDeletion();assert.equal(reloads,1);assert.equal(f.get().titles,1);
 const reboot=fixture('done',{data:f.data,reload:()=>{reloads++;}});
 await reboot.d.completeConfirmedDeletion();assert.equal(reloads,1);assert.equal(reboot.get().titles,1);assert.equal(reboot.get().resets,0);
 assert.equal(reboot.get().journal.phase,'done','Reboot does not clear deleted identity guard');
 assert.equal(reboot.get().terms,false);assert.equal(reboot.get().analytics,false);
 reboot.d.prepareTermsRestart();assert.equal(reboot.data.has('ascent.native-deletion.completion-reload.v1'),false);
 const diskFail=fixture('done',{failSave:true,reload:()=>{reloads++;}});
 await assert.rejects(diskFail.d.completeConfirmedDeletion());assert.equal(reloads,1);
 console.log('PASS deletion consent: only durable done resets; pending/auth-deleting pause without revoking; idempotency/duplicates/bridge-storage failure retry; ads preserved; fresh acceptance reload prepared');
})().catch(e=>{console.error(e);process.exitCode=1});
