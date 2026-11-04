'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createNativeAccountDeletion}=require('../scripts/native-account-deletion.cjs');
const nativeSource=require('../scripts/native-bundle-source.cjs');
const SHARED='ascent.account-deletion.v1',JOURNAL='ascent.native-firebase.deletion.v1',SYNC='ascent.native-sync.after-enable.v1',RESUME='ascent.native-resume.v1';
const keys=['APPEARANCE_KEY','PLAYER_NAME_KEY','PLAYER_UUID_KEY','ONLINE_PROFILE_KEY','ONLINE_SCORES_KEY','PROGRESS_KEY','RECORDS_KEY','HEART_ITEMS_KEY','LIVES_KEY','MAP_REWARDS_KEY','FEATURE_HELP_KEY','SOUND_KEY','MUSIC_KEY','SOUND_VOLUME_KEY','LANGUAGE_KEY','AD_PLAYS_KEY','DAILY_RECORDS_KEY','DAILY_ATTEMPTS_KEY','DAILY_PLAY_AD_KEY'];
function fixture(data=new Map(),options={}){
 const calls=[];let fail=options.fail,storageFails=false,removedFails=false,reloads=0;
 const elements={},storage={getItem:k=>data.get(k)??null,setItem(k,v){if(storageFails)throw Error('storage');data.set(k,v);},removeItem(k){if(removedFails)return;data.delete(k);}};
 const adapter={async authenticate(){throw Error('restoreDeletion must be used');},async restoreDeletion(){calls.push('restore');const marker=JSON.parse(data.get(JOURNAL)||data.get(SHARED));return {uid:marker.uid,phase:marker.phase==='done'?'done':'pending'};},async lockDeletion(uid){calls.push('lock');data.set(JOURNAL,JSON.stringify({uid,phase:'pending'}));},async deleteAccount(uid){calls.push('delete');if(fail)throw Error('offline');data.set(JOURNAL,JSON.stringify({uid,phase:'done'}));}};
 const controller={permissions:()=>({deletion:options.allowed!==false}),adapter:()=>adapter,deletionState:()=>JSON.parse(data.get(JOURNAL)||'null'),resetDeletion(){calls.push('reset');assert.equal(JSON.parse(data.get(JOURNAL)).phase,'done');for(const key of ['ascent.native-firebase.identity-check.v1','ascent.native-firebase.auth-attempt.v1',SHARED,JOURNAL]){storage.removeItem(key);if(storage.getItem(key)!==null)throw Error('persistence');}}};
 const context=vm.createContext({console,localStorage:storage,location:{reload(){reloads++;}},document:{getElementById:id=>elements[id]||=( {addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}})},window:{addEventListener(){}},debugMode:true,settingsOpen:true,state:'map',playerName:'Original',online:{uid:'owner',adapter,ready:true,pages:new Map()},onlineScores:{pending:new Map(),boards:new Map()},ui:{playerUuid:{}},setOnlineStatus(){},persistPendingScores(){},gameText:k=>k,ASCENT_NATIVE_FIREBASE:controller,...Object.fromEntries(keys.map(k=>[k,k]))});
 vm.runInContext(nativeSource('account-deletion.js',fs.readFileSync('js/account-deletion.js','utf8')),context);
 const game=vm.runInContext(`({marker:()=>accountDeletion.marker,mark:markAccountDeletion,ready:v=>{online.ready=v},uid:v=>{online.uid=v},adapter:v=>{online.adapter=v},show:showDeleteUserDialog,updateButton:updateDeleteUserButton,clearGame:clearLocalGameData,failed:()=>{}})`,context);
 const lifecycle=createNativeAccountDeletion({controller,storage,game,sync:()=>({async stop(){calls.push('stop');}}),resume:()=>({suspend(){calls.push('suspend');}})});
 context.ASCENT_NATIVE_ACCOUNT_DELETION=lifecycle;
 return {data,calls,context,elements,lifecycle,eval:code=>vm.runInContext(code,context),fail:v=>{fail=v},storageFails:v=>{storageFails=v},removeFails:v=>{removedFails=v},reloads:()=>reloads};
}
(async()=>{
 const saved=new Map([[SYNC,'old events'],[RESUME,'old receipt'],['ascent.native-firebase.identity-check.v1','owner'],['ascent.native-firebase.auth-attempt.v1','completed'],['ascent.tutorial-stage0.v1','done'],['PROGRESS_KEY','old progress'],['other-app','preserve']]);
 const h=fixture(saved,{fail:true});await h.eval('deleteCurrentAccount()');
 assert.deepEqual(h.calls,['suspend','stop','lock','delete']);assert.equal(h.eval('accountDeletion.marker.phase'),'pending');assert.equal(saved.get(SYNC),'old events');assert.equal(saved.get('PROGRESS_KEY'),'old progress');
 const retry=fixture(saved,{fail:true});await retry.lifecycle.restore();assert.deepEqual(retry.calls,['suspend','stop','restore']);assert.equal(retry.eval('online.ready'),false);assert.equal(retry.eval('online.uid'),'owner');assert(retry.elements.deleteUserDialog.open);assert.equal(retry.calls.includes('delete'),false,'Reload does not retry destructive work');
 retry.fail(false);await retry.eval('deleteCurrentAccount()');assert.equal(retry.eval('accountDeletion.marker.phase'),'done');assert(!saved.has(SYNC));assert(!saved.has(RESUME));assert(!saved.has('PROGRESS_KEY'));assert(!saved.has('ascent.tutorial-stage0.v1'));assert.equal(saved.get('other-app'),'preserve');assert(saved.has(JOURNAL));
 const done=fixture(saved);await done.lifecycle.restore();assert.equal(done.eval('online.uid'),null);assert.equal(done.elements.deleteUserNew.hidden,false);assert.equal(done.elements.deleteUserConfirm.hidden,true);assert(!done.calls.includes('delete'));
 saved.set('PROGRESS_KEY','stale progress after interrupted cleanup');
 done.removeFails(true);done.elements.deleteUserNew.onclick();assert.equal(done.reloads(),0);assert(saved.has(SHARED));
 done.removeFails(false);done.elements.deleteUserNew.onclick();assert.equal(done.reloads(),1);assert(!saved.has(JOURNAL));assert(!saved.has(SHARED));assert(!saved.has('ascent.native-firebase.identity-check.v1'));assert(!saved.has('ascent.native-firebase.auth-attempt.v1'));assert(!saved.has('ascent.tutorial-stage0.v1'),'Fresh launch must enter tutorial STAGE0');
 const tutorialEnv=vm.createContext({localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)}});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js/tutorial-state.js'),'utf8'),tutorialEnv);
 assert.equal(tutorialEnv.AscentTutorialState.pending(),true);assert.equal(tutorialEnv.AscentTutorialState.snapshot().firstUse,true,'Actual tutorial startup recognizes a new player after reset');
 const journalOnly=fixture(new Map([[JOURNAL,JSON.stringify({uid:'owner',phase:'done'})]]));await journalOnly.lifecycle.restore();assert.equal(journalOnly.eval('accountDeletion.marker.phase'),'done');assert.equal(journalOnly.eval('online.uid'),null);
 const failed=fixture();failed.storageFails(true);await failed.eval('deleteCurrentAccount()');assert.equal(failed.calls.length,0,'No server operation before durable shared marker');assert.equal(failed.eval('accountDeletion.busy'),false);
 const disabled=fixture(new Map(),{allowed:false});await disabled.eval('deleteCurrentAccount()');disabled.eval('updateDeleteUserButton()');assert(disabled.elements.debugDeleteUser.disabled);assert.equal(disabled.calls.length,0);
 console.log('PASS native deletion UI/lifecycle: durable marker fence, stop-before-delete, pending retry/reload, no automatic destructive retries, done recovery, scoped verified reset, explicit fresh STAGE0 restart and disabled modes');
})().catch(error=>{console.error(error);process.exitCode=1;});
