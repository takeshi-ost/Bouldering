'use strict';
const assert=require('node:assert/strict');
const {createNativeFirebaseController,ATTEMPT_KEY,IDENTITY_KEY,DELETION_KEY}=require('../scripts/native-firebase-controller.cjs');
const policy={firebaseMode:'auto-sync',firebaseEnabled:true,firebaseAuthAllowed:true,firebaseAnonymousAllowed:true,firebaseReadsAllowed:true,firebaseAutomaticSyncAllowed:true};
const sharedKey='ascent.account-deletion.v1';
function fixture({data=new Map([[IDENTITY_KEY,'owner'],[ATTEMPT_KEY,'completed'],['auth','owner']]),remote=new Map(),mode='auto-sync',fault={},gate=null}={}) {
 const calls=[],storage={getItem:k=>data.get(k)??null,setItem(k,v){if(fault.persist===k)throw Error('storage');data.set(k,v);},removeItem(k){if(fault.remove===k)throw Error('storage');data.delete(k);}};
 const ref=(...args)=>({path:args.filter(x=>typeof x==='string').join('/')});
 const snap=path=>({id:path.split('/').at(-1),ref:{path},exists:()=>remote.has(path),data:()=>remote.get(path)});
 let user=data.has('auth')?{uid:data.get('auth')}:null;
 const sdk={app:{getApps:()=>[],initializeApp:()=>({})},auth:{browserLocalPersistence:{},initializeAuth:()=>({get currentUser(){return user;},authStateReady:async()=>{}}),setPersistence:async()=>{},signInAnonymously:async()=>{calls.push('create');user={uid:'new-owner'};data.set('auth',user.uid);return {user};},deleteUser:async target=>{assert.equal(target.uid,'owner');calls.push('auth-delete');if(fault.auth){if(fault.signOut){user=null;data.delete('auth');}throw {code:fault.auth};}user=null;data.delete('auth');if(fault.afterAuth)fault.persist=DELETION_KEY;}},firestore:{
  getFirestore:()=>({}),doc:ref,collectionGroup:(_,name)=>name,limit:n=>({limit:n}),startAfter:doc=>({after:doc.ref.path}),query:(group,...opts)=>({group,...Object.assign({},...opts)}),serverTimestamp:()=>1,
  getDocFromServer:async r=>snap(r.path),
  getDocsFromServer:async q=>{calls.push('page');assert.equal(q.limit,100);if(fault.read){fault.read=false;throw {code:'unavailable'};}return {docs:[...remote.keys()].sort().filter(p=>p.includes('/entries/') && (!q.after || p>q.after)).slice(0,q.limit).map(snap)};},
  runTransaction:async(_,fn)=>{calls.push('transaction');if(fault.lock)throw {code:'permission-denied'};const writes=[];const result=await fn({get:async r=>snap(r.path),set:(r,v)=>writes.push([r.path,v])});if(gate)await gate;for(const [p,v]of writes)remote.set(p,v);return result;},
  writeBatch:()=>{const paths=[];return {delete:r=>paths.push(r.path),commit:async()=>{for(const p of paths){assert(p.endsWith('/entries/owner'));calls.push('score-delete');remote.delete(p);}if(fault.batch){fault.batch=false;throw {code:'unavailable'};}}};},
  deleteDoc:async r=>{calls.push('profile-delete');if(fault.profile)throw {code:'unavailable'};remote.delete(r.path);}
 }};
 const control=createNativeFirebaseController({policy:()=>({...policy,firebaseMode:mode}),mode,config:{projectId:'bouldering-7482d'},storage,loadSDK:async()=>sdk});
 return {control,adapter:control.adapter(),data,remote,calls,fault,storage};
}
function deletionUI(fixture) {
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const source=require('../scripts/native-bundle-source.cjs')('account-deletion.js',fs.readFileSync(path.join(__dirname,'../js/account-deletion.js'),'utf8'));
 const keys=['APPEARANCE_KEY','PLAYER_NAME_KEY','PLAYER_UUID_KEY','ONLINE_PROFILE_KEY','ONLINE_SCORES_KEY','PROGRESS_KEY','RECORDS_KEY','HEART_ITEMS_KEY','LIVES_KEY','MAP_REWARDS_KEY','FEATURE_HELP_KEY','SOUND_KEY','MUSIC_KEY','SOUND_VOLUME_KEY','LANGUAGE_KEY','AD_PLAYS_KEY','DAILY_RECORDS_KEY','DAILY_ATTEMPTS_KEY','DAILY_PLAY_AD_KEY'];
 const elements={},context=vm.createContext({console:{warn(){}},localStorage:fixture.storage,document:{getElementById:id=>elements[id]||={addEventListener(){},showModal(){this.open=true;}}},window:{addEventListener(){}},debugMode:true,settingsOpen:true,state:'map',playerName:'Owner',online:{uid:'owner',adapter:fixture.adapter,ready:true,pages:new Map()},onlineScores:{pending:new Map(),boards:new Map()},ui:{playerUuid:{}},setOnlineStatus(){},persistPendingScores(){},gameText:k=>k,ASCENT_NATIVE_FIREBASE:fixture.control,...Object.fromEntries(keys.map(k=>[k,k]))});
 vm.runInContext(source,context);
 const game=vm.runInContext('({marker:()=>accountDeletion.marker,mark:markAccountDeletion,ready:v=>{online.ready=v},uid:v=>{online.uid=v},adapter:v=>{online.adapter=v},show:showDeleteUserDialog,updateButton:updateDeleteUserButton,clearGame:clearLocalGameData,failed:()=>{}})',context);
 context.ASCENT_NATIVE_ACCOUNT_DELETION=require('../scripts/native-account-deletion.cjs').createNativeAccountDeletion({controller:fixture.control,storage:fixture.storage,game});
 return code=>vm.runInContext(code,context);
}
(async()=>{
 for(const mode of ['offline','read-only']) {
  const x=fixture({mode});await assert.rejects(x.adapter.lockDeletion('owner'),/deletion-disabled/);await assert.rejects(x.adapter.deleteAccount('owner'),/deletion-disabled/);assert.deepEqual(x.calls,[]);
 }
 const remote=new Map([['players/owner',{}],['players/other',{}],['unrelated/one/entries/owner',{}]]);
 for(let n=0;n<205;n++){remote.set(`stageScores/legacy_${String(n).padStart(3,'0')}/entries/owner`,{});remote.set(`stageScores/legacy_${String(n).padStart(3,'0')}/entries/other`,{});}
 const x=fixture({remote});await x.adapter.lockDeletion('owner');assert.equal(x.control.permissions().automaticSync,false);assert.equal(x.control.permissions().create,false);
 await assert.rejects(x.control.syncAutomaticProfile('owner',{}),/automatic-sync-disabled/);
 await x.adapter.deleteAccount('owner');
 assert.equal(x.calls.filter(x=>x==='score-delete').length,205);assert(x.calls.filter(x=>x==='page').length>=5);
 assert.equal(remote.has('players/owner'),false);assert(remote.has('players/other'));assert(remote.has('unrelated/one/entries/owner'));assert(remote.has('accountDeletionLocks/owner'));
 assert.equal([...remote.keys()].filter(p=>p.endsWith('/entries/other')).length,205);assert.equal(x.calls.at(-1),'auth-delete');assert.equal(x.control.deletionState().phase,'done');assert.equal(x.data.get(IDENTITY_KEY),'owner');
 await x.adapter.lockDeletion('owner');await x.adapter.deleteAccount('owner');assert.equal(x.calls.filter(c=>c==='auth-delete').length,1);
 x.control.resetDeletion();assert.equal(x.data.has(DELETION_KEY),false);assert.equal(x.data.has(ATTEMPT_KEY),false);assert.equal(x.data.has(IDENTITY_KEY),false);
 const fresh=fixture({data:x.data});assert.equal((await fresh.control.authenticate({createAnonymous:true})).uid,'new-owner');
 const mismatch=fixture();await assert.rejects(mismatch.adapter.deleteAccount('other'),/identity-mismatch/);assert.deepEqual(mismatch.calls,[]);assert.equal(mismatch.data.has(DELETION_KEY),false);
 const badStorage=fixture({fault:{persist:DELETION_KEY}});await assert.rejects(badStorage.adapter.deleteAccount('owner'),/persistence-unavailable/);assert.deepEqual(badStorage.calls,[]);
 for(const fault of [{lock:true},{read:true},{batch:true},{profile:true},{auth:'auth/requires-recent-login'},{auth:'auth/network-request-failed'}]) {
  const r=new Map([['stageScores/v1_existing_1/entries/owner',{}],['players/owner',{}]]),x=fixture({fault,remote:r});
  await assert.rejects(x.adapter.deleteAccount('owner'));assert(x.data.has('auth'));assert(x.data.has(DELETION_KEY));assert.equal(x.control.permissions().automaticSync,false);assert.equal(x.control.permissions().create,false);assert.equal(x.data.get(IDENTITY_KEY),'owner');assert.throws(()=>x.control.resetDeletion(),/deletion-incomplete/);
  Object.keys(fault).forEach(k=>delete fault[k]);const retry=fixture({data:x.data,remote:r});assert.equal((await retry.adapter.restoreDeletion()).phase,'pending');await retry.adapter.deleteAccount('owner');assert.equal(retry.control.deletionState().phase,'done');assert(!r.has('players/owner'));assert(!r.has('stageScores/v1_existing_1/entries/owner'));
 }
 // A process interruption after Firebase removed persisted auth but before our
 // final journal write must not create a replacement or restore old progress.
 // Same-session acknowledgement recovers; after restart missing auth alone is
 // ambiguous (SDK token invalidation also signs out), so require manual review.
 const crash=fixture({fault:{afterAuth:true}});await assert.rejects(crash.adapter.deleteAccount('owner'),/persistence-unavailable/);assert.equal(crash.control.deletionState().phase,'auth-deleting');
 delete crash.fault.persist;delete crash.fault.afterAuth;await crash.adapter.lockDeletion('owner');await crash.adapter.deleteAccount('owner');assert.equal(crash.control.deletionState().phase,'done');
 const crashedAgain=fixture({fault:{afterAuth:true}});await assert.rejects(crashedAgain.adapter.deleteAccount('owner'));
 const recovered=fixture({data:crashedAgain.data});await assert.rejects(recovered.adapter.restoreDeletion(),/deletion-auth-unconfirmed/);assert(!recovered.calls.includes('create'));assert.throws(()=>recovered.control.resetDeletion(),/deletion-incomplete/);
 // Exercise the ordinary Retry button's real pre-lock path, not only the
 // controller API, after acknowledged auth deletion and failed local storage.
 const interruptedUI=fixture({fault:{afterAuth:true}}),ui=deletionUI(interruptedUI);
 await ui('deleteCurrentAccount()');assert.equal(ui('accountDeletion.marker.phase'),'pending');
 assert.equal(interruptedUI.control.deletionState().phase,'auth-deleting');
 delete interruptedUI.fault.persist;delete interruptedUI.fault.afterAuth;
 await ui('deleteCurrentAccount()');assert.equal(ui('accountDeletion.marker.phase'),'done');
 assert.equal(ui('online.uid'),null);assert.equal(interruptedUI.calls.filter(c=>c==='auth-delete').length,1);
 const invalidated=fixture({fault:{auth:'auth/user-token-expired',signOut:true}});
 await assert.rejects(invalidated.adapter.deleteAccount('owner'),/user-token-expired/);
 await assert.rejects(invalidated.adapter.restoreDeletion(),/deletion-auth-unconfirmed/);
 assert.equal(invalidated.control.deletionState().phase,'auth-deleting');assert(!invalidated.calls.includes('create'));
 const missing=fixture({data:new Map([[DELETION_KEY,JSON.stringify({uid:'owner',phase:'pending'})],[IDENTITY_KEY,'owner']])});await assert.rejects(missing.adapter.restoreDeletion(),/identity-restore-required/);assert(!missing.calls.includes('create'));
 const shared=fixture();shared.data.set(sharedKey,JSON.stringify({uid:'owner',phase:'pending'}));assert.deepEqual(await shared.adapter.restoreDeletion(),{uid:'owner',phase:'pending'});assert.equal(shared.control.permissions().automaticSync,false);
 const corrupt=fixture();corrupt.data.set(DELETION_KEY,'invalid');assert.equal(corrupt.control.permissions().automaticSync,false);await assert.rejects(corrupt.adapter.deleteAccount('owner'),/invalid-deletion-state/);assert.deepEqual(corrupt.calls,[]);
 let release;const gate=new Promise(r=>release=r),busy=fixture({gate});const one=busy.adapter.deleteAccount('owner'),two=busy.adapter.deleteAccount('owner');assert.equal(one,two);await assert.rejects(busy.adapter.deleteAccount('other'),/identity-mismatch/);release();await one;assert.equal(busy.calls.filter(c=>c==='auth-delete').length,1);
 for(const key of [IDENTITY_KEY,ATTEMPT_KEY,sharedKey,DELETION_KEY]) {
 const reset=fixture();await reset.adapter.deleteAccount('owner');reset.data.set(sharedKey,JSON.stringify({uid:'owner',phase:'done'}));reset.fault.remove=key;assert.throws(()=>reset.control.resetDeletion());assert.equal(reset.control.deletionState().phase,'done');delete reset.fault.remove;const restarted=fixture({data:reset.data});assert.equal((await restarted.adapter.restoreDeletion()).phase,'done');restarted.control.resetDeletion();assert(!reset.data.has(sharedKey));assert(!reset.data.has(DELETION_KEY));
 }
 console.log('PASS native deletion: own UID only, bounded legacy cleanup, permanent server lock, auth last, durable retry/fail-stop, interrupted auth completion, explicit reset and one new identity');
})().catch(e=>{console.error(e);process.exitCode=1;});
