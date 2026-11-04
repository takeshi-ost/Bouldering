'use strict';
// Real esbuild output with only the SDK import seam mocked. Never execute Firebase SDK.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),build=require('../scripts/build-native-firebase.cjs'),nativeSource=require('../scripts/native-bundle-source.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ascent-native-entry-')),emitted={};
for(const mode of ['offline','read-only','auto-sync']){const out=path.join(temp,mode);build(root,out,mode);const source=fs.readFileSync(path.join(out,'js/native-firebase-control.js'),'utf8');assert.equal(source.split('import("../vendor/firebase-sdk.js")').length,2,'Exactly one reviewed SDK loader seam');emitted[mode]=source.replace('import("../vendor/firebase-sdk.js")','__loadMockSDK()');}
const KEY='ascent.native-firebase.identity-check.v1',ATTEMPT_KEY='ascent.native-firebase.auth-attempt.v1',SYNC_KEY='ascent.native-sync.after-enable.v1';
const profile={name:'Local name',colors:['#123456'],headColor:'#abcdef',progressVersion:'v4',reachedLevel:4,reachedPrototypeLevel:1};
const score={version:'v4',scoreSpecVersion:'v4',moves:6,timeMs:2000,platform:'iOS'};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const settle=async()=>{for(let i=0;i<250;i++)await Promise.resolve();};
const ledger=(owner=null)=>({version:1,owner,activatedAt:123,sequence:0,name:'',profile:null,events:[]});
async function boot({mode='read-only',enabled=true,uid='owner',known='owner',identity=known,checkpoint=known,scoresOwner=known,missingStorage=false,deleting=false,legacyProgress=false,storageData,initialLedger,online=true,sdkGate,authGate,failLoads=0,failReads=0,signInBehavior,localProfile=profile}={}){
 const data=storageData||new Map([['ascent.pending-scores.v1','unchanged legacy queue'],['ascent.records.v1','unchanged legacy bests']]);
 if(deleting)data.set('ascent.account-deletion.v1',JSON.stringify({uid:'owner',phase:'pending'}));
 if(!storageData && identity)data.set(KEY,identity);
 if(initialLedger!==undefined)data.set(SYNC_KEY,typeof initialLedger==='string'?initialLedger:JSON.stringify(initialLedger));
 let user=uid?{uid}:null,epoch=7,currentProfile={...localProfile};
 const calls={loads:0,creates:0,initializes:0,persistence:0,authReady:0,reads:[],writes:[],transactions:0,storage:0,success:[]};
 const remote=new Map([['players/owner',{...profile,name:'Server name'}]]);
 if(legacyProgress){const old=remote.get('players/owner');delete old.progressVersion;old.reachedLevel=900;old.reachedPrototypeLevel=800;}
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{calls.storage++;data.set(k,String(v));},removeItem:k=>data.delete(k)};
 const snap=key=>({exists:()=>remote.has(key),data:()=>remote.get(key)});
 const beforeRead=key=>{calls.reads.push(key);if(failReads-->0)throw {code:'unavailable'};};
 const sdk={
  app:{getApps:()=>[],initializeApp:config=>({options:config})},
  auth:{browserLocalPersistence:{},initializeAuth:()=>{calls.initializes++;return {get currentUser(){return user;},authStateReady:async()=>{calls.authReady++;if(authGate)await authGate.promise;}};},setPersistence:async()=>{calls.persistence++;},signInAnonymously:async()=>{calls.creates++;if(signInBehavior)return signInBehavior({attempt:calls.creates,setUser:value=>{user=value?{uid:value}:null;}});user={uid:'new-owner'};return {user};}},
  firestore:{getFirestore:()=>({}),doc:(db,...p)=>(typeof db==='string'?[db,...p]:p).join('/'),collection:(db,...p)=>p.join('/'),where:(...args)=>args,orderBy:(...args)=>args,limit:n=>n,query:(...args)=>args,serverTimestamp:()=>({mock:true}),getDocFromServer:async key=>{beforeRead(key);return snap(key);},getDocsFromServer:async query=>{beforeRead(query[0]);return {docs:[]};},runTransaction:async(db,action)=>{calls.transactions++;const pending=[];const result=await action({get:async key=>snap(key),set:(k,v)=>pending.push([k,v])});for(const [k,v]of pending){calls.writes.push(k);remote.set(k,v);}return result;}}
 };
 const reports=[],listeners=new Map(),policy={configuration:'Debug',syncStatusAllowed:true,firebaseMode:mode,firebaseEnabled:enabled,firebaseAuthAllowed:true,firebaseAnonymousAllowed:true,firebaseReadsAllowed:true,firebaseAutomaticSyncAllowed:true};
 const deleteStatus={};
 const env={gameText:key=>key,deleteUserElement:()=>deleteStatus,COURSE_VERSION:'v4',DAILY_COURSE_VERSION:'v3',ASCENT_IOS_BUILD:policy,ASCENT_SETTINGS_CONNECTION:{ticket:()=>epoch,success:n=>calls.success.push(n),failure(){}},document:{getElementById:()=>null},window:{addEventListener:(name,handler)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(handler);}},navigator:{onLine:online},console:{warn(){}},online:{ready:false},onlineScores:{owner:scoresOwner},readOnlineCheckpoint:()=>checkpoint?{uid:checkpoint}:null,accountDeletion:{marker:JSON.parse(data.get('ascent.account-deletion.v1')||'null')},scoreBoardKey:(n,mode)=>'v4_'+mode+'_'+n,setOnlineStatus(){},updateDeleteUserButton(){},showDeleteUserDialog(){calls.dialogs=(calls.dialogs||0)+1;},markAccountDeletion(uid,phase){storage.setItem('ascent.account-deletion.v1',JSON.stringify({uid,phase}));env.accountDeletion.marker={uid,phase};},clearLocalGameData(){env.ASCENT_NATIVE_ACCOUNT_DELETION.clearLocal();},renderTransferAvailability(){},renderMapPlayers(){},onlineProfile:()=>({...currentProfile,colors:[...currentProfile.colors]}),webkit:{messageHandlers:{ascentFirebaseReport:{postMessage:r=>reports.push(r)}}},__loadMockSDK:async()=>{calls.loads++;if(sdkGate)await sdkGate.promise;if(failLoads-->0)throw Error('SDK import unavailable');return sdk;},fetch(){throw Error('No live traffic permitted');}};
 if(missingStorage)Object.defineProperty(env,'localStorage',{get(){throw Error('Storage denied');}});else env.localStorage=storage;
 vm.runInNewContext(emitted[mode],env);
 await settle();
 return {env,calls,data,remote,reports,listeners,settle,nextEpoch(){epoch++;},setUser(value){user=value?{uid:value}:null;},setProfile(value){currentProfile={...value};},dispatch(...events){for(const event of events)for(const listener of listeners.get(event)||[])listener();}};
}
(async()=>{try{
 for(const mode of ['offline','read-only','auto-sync']){const f=await boot({mode,enabled:false});assert.equal(f.calls.loads,0);assert.equal(f.calls.creates,0);assert.equal(f.calls.storage,0);assert.deepEqual(f.calls.writes,[]);assert.equal(f.data.get('ascent.pending-scores.v1'),'unchanged legacy queue');}
 for(const mode of ['read-only','auto-sync']){const f=await boot({mode,missingStorage:true});assert.equal(f.calls.loads,0);assert.equal(f.calls.creates,0);assert.equal(f.env.online.ready,false);assert.equal(f.calls.writes.length,0);}
 const fresh=await boot({uid:null,known:null});assert.equal(fresh.calls.creates,1);assert.equal(fresh.env.online.uid,'new-owner');assert(fresh.calls.reads.includes('stageScores/v4_existing_1/entries'));assert.equal(fresh.calls.writes.length,0);
 const restored=await boot();assert.equal(restored.calls.creates,0);assert.equal(restored.env.online.uid,'owner');assert(restored.calls.reads.includes('stageScores/v4_existing_1/entries'));assert(!restored.calls.reads.some(x=>x.includes('v1_existing')));assert(restored.calls.success.includes(7));assert.equal(restored.calls.writes.length,0);
 for(const method of ['prepareTransferIdentity','importTransferIdentity','saveScore','sync'])await assert.rejects(restored.env.ASCENT_NATIVE_FIREBASE.adapter()[method](),/write-disabled/);
 for(const method of ['deleteAccount','lockDeletion'])await assert.rejects(restored.env.ASCENT_NATIVE_FIREBASE.adapter()[method](),/deletion-disabled/);
 const mismatch=await boot({uid:'other',known:'owner'});assert.equal(mismatch.env.online.ready,false);assert.equal(mismatch.calls.creates,0);assert.equal(mismatch.calls.reads.length,0);assert.equal(mismatch.data.get(KEY),'owner');
 const deleting=await boot({deleting:true});assert.equal(deleting.calls.loads,0);assert.equal(deleting.calls.creates,0);
 const noIdentity=await boot({mode:'auto-sync',uid:null,known:null});assert.equal(noIdentity.calls.creates,1);assert.equal(noIdentity.env.online.uid,'new-owner');assert.equal(noIdentity.env.online.ready,true);assert.equal(noIdentity.remote.get('players/new-owner').name,profile.name);assert.equal(noIdentity.remote.get('players/new-owner').progressVersion,'v4');assert.equal(noIdentity.data.get(KEY),'new-owner');assert.equal(JSON.parse(noIdentity.data.get(SYNC_KEY)).owner,'new-owner');
 assert.equal(noIdentity.env.ASCENT_NATIVE_SYNC.recordClear(1,'existing',score),true);await noIdentity.env.ASCENT_NATIVE_SYNC.flush();assert.equal(noIdentity.remote.get('stageScores/v4_existing_1/entries/new-owner').scoreSpecVersion,'v4');assert.equal(noIdentity.calls.creates,1,'Fresh automatic profile and score share one new identity');
 const auto=await boot({mode:'auto-sync'});assert.equal(auto.env.online.uid,'owner');assert.equal(auto.calls.creates,0);assert.equal(auto.remote.get('players/owner').name,'Server name','Automatic startup preserves server name');assert(auto.calls.reads.includes('stageScores/v4_existing_1/entries'));
 const adopted=await boot({mode:'auto-sync',legacyProgress:true});assert.equal(adopted.remote.get('players/owner').progressVersion,'v4');assert.equal(adopted.remote.get('players/owner').reachedLevel,4);assert.equal(adopted.remote.get('players/owner').reachedPrototypeLevel,1);assert.equal(adopted.remote.get('players/owner').name,'Server name');
 const sync=auto.env.ASCENT_NATIVE_SYNC;
 assert.equal(sync.recordClear(1,'existing',{...score,rankingEligible:false}),false);assert.equal(sync.recordClear(1,'existing',{...score,version:'v3',scoreSpecVersion:'v3'}),false);assert.equal(sync.recordClear(1,'daily',{...score,version:'v3',scoreSpecVersion:'v3'}),false);
 assert.equal(sync.recordClear(1,'existing',score),true);await sync.flush();assert.equal(auto.remote.get('stageScores/v4_existing_1/entries/owner').scoreSpecVersion,'v4');assert.equal(auto.data.get('ascent.pending-scores.v1'),'unchanged legacy queue');assert.equal(auto.data.get('ascent.records.v1'),'unchanged legacy bests');
 auto.nextEpoch();await auto.env.ASCENT_NATIVE_FIREBASE.players(1,1,'existing');assert.equal(auto.reports.at(-1).connectionEpoch,8);assert(auto.calls.success.includes(8));
 // A first-use queue exists before either SDK loading or auth restoration finishes.
 const sdkGate=deferred(),authGate=deferred(),delayed=await boot({mode:'auto-sync',uid:null,known:null,sdkGate,authGate});
 const earlyProfile={...profile,name:'Edited before sign-in',reachedLevel:9};delayed.setProfile(earlyProfile);
 assert(delayed.env.ASCENT_NATIVE_SYNC,'Sync hooks are installed synchronously before SDK import');
 assert.equal(delayed.env.ASCENT_NATIVE_SYNC.recordClear(3,'existing',score),true);
 assert.equal(delayed.env.ASCENT_NATIVE_SYNC.profileEdited(earlyProfile,true),true);
 await delayed.env.ASCENT_NATIVE_SYNC.flush();
 const earlyLedger=JSON.parse(delayed.data.get(SYNC_KEY));
 assert.equal(earlyLedger.owner,null);assert.equal(earlyLedger.events.length,1);assert.equal(earlyLedger.profile.value.name,earlyProfile.name);
 assert.equal(delayed.calls.creates,0);assert.equal(delayed.calls.reads.length,0);assert.equal(delayed.calls.writes.length,0);assert.equal(delayed.data.has(ATTEMPT_KEY),false);
 delayed.dispatch('online','focus','ascent-native-resume','online');await settle();assert.equal(delayed.calls.loads,1,'Reconnect events share pending SDK bootstrap');
 sdkGate.resolve();await settle();assert.equal(delayed.calls.authReady,1);assert.equal(delayed.calls.creates,0);
 delayed.dispatch('online','focus','ascent-native-resume');await settle();assert.equal(delayed.calls.authReady,1,'Reconnect events share pending auth restoration');
 assert.equal(delayed.calls.writes.length,0);authGate.resolve();await settle();
 assert.equal(delayed.calls.creates,1);assert.equal(delayed.calls.initializes,1);assert.equal(delayed.env.online.ready,true);
 assert.equal(delayed.remote.get('players/new-owner').name,earlyProfile.name);assert.equal(delayed.remote.get('players/new-owner').reachedLevel,9);
 assert.equal(delayed.remote.get('stageScores/v4_existing_3/entries/new-owner').moves,6);
 assert.equal(JSON.parse(delayed.data.get(SYNC_KEY)).events.length,0);assert.equal(delayed.env.ASCENT_NATIVE_SYNC.report().freshDelivered,1);
 const deliveredWrites=delayed.calls.writes.length;
 for(let i=0;i<3;i++){delayed.dispatch('online','focus','ascent-native-resume');await settle();}
 assert.equal(delayed.calls.creates,1);assert.equal(delayed.calls.loads,1);assert.equal(delayed.calls.writes.length,deliveredWrites,'Reconnect never replays an acknowledged fresh score');

 // A known offline launch keeps an unbound durable queue and does not burn the
 // one anonymous attempt. Reloading must preserve that exact unsent ledger.
 const offline=await boot({mode:'auto-sync',uid:null,known:null,online:false});
 assert.equal(offline.calls.creates,0);assert.equal(offline.data.has(ATTEMPT_KEY),false);assert.equal(offline.env.online.ready,false);
 assert.equal(offline.env.ASCENT_NATIVE_SYNC.recordClear(4,'existing',{...score,moves:7}),true);
 const offlineProfile={...profile,name:'Offline edit',reachedLevel:5};offline.setProfile(offlineProfile);
 assert.equal(offline.env.ASCENT_NATIVE_SYNC.profileEdited(offlineProfile,true),true);await offline.env.ASCENT_NATIVE_SYNC.flush();
 const offlineLedger=offline.data.get(SYNC_KEY);assert.equal(JSON.parse(offlineLedger).owner,null);assert.equal(offline.calls.writes.length,0);
 offline.dispatch('online','focus','ascent-native-resume');await settle();assert.equal(offline.calls.creates,0);assert.equal(offline.data.has(ATTEMPT_KEY),false);assert.equal(offline.data.get(SYNC_KEY),offlineLedger);
 const reload=await boot({mode:'auto-sync',uid:null,known:null,online:false,storageData:offline.data,localProfile:offlineProfile});
 assert.equal(reload.data.get(SYNC_KEY),offlineLedger,'Reload cannot replace an unbound ledger');assert.equal(reload.calls.creates,0);assert.equal(reload.calls.writes.length,0);
 reload.env.navigator.onLine=true;reload.dispatch('online','focus','ascent-native-resume');await settle();
 assert.equal(reload.calls.creates,1);assert.equal(reload.env.online.ready,true);assert.equal(reload.remote.get('players/new-owner').name,offlineProfile.name);
 assert.equal(reload.remote.get('stageScores/v4_existing_4/entries/new-owner').moves,7);assert.equal(JSON.parse(reload.data.get(SYNC_KEY)).owner,'new-owner');assert.equal(JSON.parse(reload.data.get(SYNC_KEY)).events.length,0);
 assert.equal(reload.data.get('ascent.pending-scores.v1'),'unchanged legacy queue');assert.equal(reload.data.get('ascent.records.v1'),'unchanged legacy bests');

 // Reconnect reruns the full startup, including a failed dynamic import and
 // initial server reads, rather than just flushing a queue that never activated.
 const importRetry=await boot({mode:'auto-sync',uid:null,known:null,failLoads:1});
 assert.equal(importRetry.calls.loads,1);assert.equal(importRetry.calls.creates,0);assert.equal(importRetry.env.online.ready,false);assert.equal(importRetry.data.has(ATTEMPT_KEY),false);
 assert.equal(importRetry.env.ASCENT_NATIVE_SYNC.recordClear(5,'existing',score),true);
 importRetry.dispatch('online','focus','ascent-native-resume');await settle();
 assert.equal(importRetry.calls.loads,2);assert.equal(importRetry.calls.creates,1);assert.equal(importRetry.env.online.ready,true);assert(importRetry.remote.has('stageScores/v4_existing_5/entries/new-owner'));
 const readRetry=await boot({mode:'auto-sync',uid:null,known:null,failReads:1});
 assert.equal(readRetry.env.online.ready,false);assert.equal(readRetry.calls.creates,1);
 readRetry.dispatch('online','focus','ascent-native-resume');await settle();
 assert.equal(readRetry.env.online.ready,true);assert.equal(readRetry.calls.creates,1);assert(readRetry.calls.reads.includes('stageScores/v4_existing_1/entries'));

 // Identity sources must agree before a newly queued event can acquire an owner.
 for(const options of [
  {uid:'other',known:'owner'},
  {uid:'owner',known:null,identity:'owner',checkpoint:'other'},
  {uid:'owner',known:null,checkpoint:'owner',scoresOwner:'other'},
  {uid:'owner',known:null,identity:'owner',initialLedger:ledger('other')},
  {uid:'other',known:null,initialLedger:ledger('owner')},
  {uid:null,known:null,initialLedger:ledger('owner')},
  {uid:null,known:'owner'},
  {uid:'owner',known:null,initialLedger:'{malformed ledger'},
  {uid:'owner',known:null,initialLedger:{...ledger(null),owner:''}}
 ]){
  const denied=await boot({mode:'auto-sync',...options});
  const savedIdentity=denied.data.get(KEY),savedLedger=denied.data.get(SYNC_KEY);
  assert.equal(denied.env.online.ready,false,JSON.stringify(options));assert.equal(denied.calls.creates,0);assert.equal(denied.calls.reads.length,0);assert.equal(denied.calls.writes.length,0);
  denied.dispatch('online','focus','ascent-native-resume');await settle();
  assert.equal(denied.calls.creates,0);assert.equal(denied.calls.reads.length,0);assert.equal(denied.calls.writes.length,0);assert.equal(denied.data.get(KEY),savedIdentity);assert.equal(denied.data.get(SYNC_KEY),savedLedger,'Retry cannot relabel a mismatched or invalid ledger');
 }
 const noMarker=await boot({mode:'auto-sync',uid:'owner',known:null});
 assert.equal(noMarker.calls.creates,0);assert.equal(noMarker.env.online.uid,'owner');assert.equal(noMarker.env.online.ready,true);assert.equal(noMarker.data.get(KEY),'owner');assert.equal(JSON.parse(noMarker.data.get(SYNC_KEY)).owner,'owner');assert.equal(noMarker.remote.get('players/owner').name,'Server name');

 // Deletion blocks initial bootstrap and reconnects, including when it becomes
 // pending during an in-flight auth restore. Queued data remains unactivated.
 const deletingAuto=await boot({mode:'auto-sync',uid:null,known:null,deleting:true});
 assert.equal(deletingAuto.calls.loads,1);assert.equal(deletingAuto.calls.creates,0);
 deletingAuto.dispatch('online','focus','ascent-native-resume');await settle();assert.equal(deletingAuto.calls.loads,1);assert.equal(deletingAuto.calls.writes.length,0);
 const deletionGate=deferred(),deletionRace=await boot({mode:'auto-sync',uid:null,known:null,authGate:deletionGate});
 assert.equal(deletionRace.env.ASCENT_NATIVE_SYNC.recordClear(6,'existing',score),true);
 deletionRace.env.markAccountDeletion('owner','pending');deletionGate.resolve();await settle();
 assert.equal(deletionRace.calls.creates,0);assert.equal(deletionRace.env.online.ready,false);assert.equal(deletionRace.calls.reads.length,0);assert.equal(deletionRace.calls.writes.length,0);assert.equal(JSON.parse(deletionRace.data.get(SYNC_KEY)).owner,null);
 const deletionAuthCalls=deletionRace.calls.authReady;
 deletionRace.dispatch('online','focus','ascent-native-resume');await settle();assert(deletionRace.calls.authReady>=deletionAuthCalls);assert.equal(deletionRace.calls.writes.length,0);assert.equal(JSON.parse(deletionRace.data.get(SYNC_KEY)).events.length,1);

 const issuedGate=deferred(),issuedDeletion=await boot({mode:'auto-sync',uid:null,known:null,signInBehavior:async({setUser})=>{await issuedGate.promise;setUser('issued-owner');return {user:{uid:'issued-owner'}};}});
 assert.equal(issuedDeletion.calls.creates,1);assert.equal(issuedDeletion.env.ASCENT_NATIVE_SYNC.recordClear(8,'existing',score),true);
 issuedDeletion.env.markAccountDeletion('issued-owner','pending');issuedGate.resolve();await settle();
 assert.equal(issuedDeletion.env.online.ready,false);assert.equal(issuedDeletion.calls.reads.length,0);assert.equal(issuedDeletion.calls.writes.length,0);assert.equal(JSON.parse(issuedDeletion.data.get(SYNC_KEY)).owner,null);
 issuedDeletion.dispatch('online','focus','ascent-native-resume');await settle();assert.equal(issuedDeletion.calls.creates,1);assert.equal(issuedDeletion.calls.writes.length,0);assert.equal(JSON.parse(issuedDeletion.data.get(SYNC_KEY)).events.length,1);

 // Missing auth is not deletion proof: token invalidation may also sign out.
 const ambiguousData=new Map([[KEY,'owner'],[ATTEMPT_KEY,'completed'],['ascent.account-deletion.v1',JSON.stringify({uid:'owner',phase:'pending'})],['ascent.native-firebase.deletion.v1',JSON.stringify({uid:'owner',phase:'auth-deleting'})]]);
 const ambiguous=await boot({mode:'auto-sync',uid:null,storageData:ambiguousData});
 assert.equal(ambiguous.calls.creates,0);assert.equal(ambiguous.calls.writes.length,0);
 assert.equal(ambiguous.env.accountDeletion.marker.phase,'pending');
 assert.equal(ambiguous.env.deleteUserElement().textContent,'account-deletion.deleteCurrentAccount.2');
 assert.throws(()=>ambiguous.env.ASCENT_NATIVE_ACCOUNT_DELETION.startNewUser(),/deletion-incomplete/);
 // Durable done state dominates a stale shared pending marker without importing
 // auth or creating a user. The explicit reset removes all identity boundaries.
 const completedData=new Map([[KEY,'owner'],[ATTEMPT_KEY,'completed'],[SYNC_KEY,JSON.stringify(ledger('owner'))],['ascent.native-resume.v1','old receipt'],
  ['ascent.account-deletion.v1',JSON.stringify({uid:'owner',phase:'pending'})],['ascent.native-firebase.deletion.v1',JSON.stringify({uid:'owner',phase:'done'})]]);
 const completed=await boot({mode:'auto-sync',uid:null,storageData:completedData});
 assert.equal(completed.calls.loads,0);assert.equal(completed.calls.creates,0);assert.equal(completed.env.online.ready,false);assert.equal(completed.env.accountDeletion.marker.phase,'done');assert.equal(completed.env.online.uid,null);assert(completed.calls.dialogs>0);
 assert(!completedData.has(SYNC_KEY));assert(!completedData.has('ascent.native-resume.v1'));
 completed.env.ASCENT_NATIVE_ACCOUNT_DELETION.startNewUser();
 for(const key of [KEY,ATTEMPT_KEY,'ascent.account-deletion.v1','ascent.native-firebase.deletion.v1'])assert(!completedData.has(key));
 const freshAfterDeletion=await boot({mode:'auto-sync',uid:null,known:null,storageData:completedData});
 assert.equal(freshAfterDeletion.calls.creates,1);assert.equal(freshAfterDeletion.env.online.uid,'new-owner');assert.equal(freshAfterDeletion.env.online.ready,true);
 // An uncertain anonymous request is never repeated, even across reload. A
 // subsequently restored SDK user may finish startup with that same identity.
 const uncertain=await boot({mode:'auto-sync',uid:null,known:null,signInBehavior:async()=>{throw {code:'auth/network-request-failed'};}});
 assert.equal(uncertain.calls.creates,1);assert.equal(uncertain.data.get(ATTEMPT_KEY),'started');assert.equal(uncertain.data.has(KEY),false);assert.equal(uncertain.env.online.ready,false);
 assert.equal(uncertain.env.ASCENT_NATIVE_SYNC.recordClear(7,'existing',score),true);
 for(let i=0;i<3;i++){uncertain.dispatch('online','focus','ascent-native-resume');await settle();}
 assert.equal(uncertain.calls.creates,1);assert.equal(uncertain.calls.writes.length,0);
 const uncertainReload=await boot({mode:'auto-sync',uid:null,known:null,storageData:uncertain.data});
 assert.equal(uncertainReload.calls.creates,0);assert.equal(uncertainReload.calls.writes.length,0);assert.equal(JSON.parse(uncertainReload.data.get(SYNC_KEY)).events.length,1);
 uncertainReload.setUser('eventually-restored');uncertainReload.dispatch('online','focus','ascent-native-resume');await settle();
 assert.equal(uncertainReload.calls.creates,0);assert.equal(uncertainReload.env.online.uid,'eventually-restored');assert.equal(uncertainReload.env.online.ready,true);assert.equal(uncertainReload.data.get(KEY),'eventually-restored');assert(uncertainReload.remote.has('stageScores/v4_existing_7/entries/eventually-restored'));
 // Native wrapping cannot change Daily identity or reset the game's assistance latch.
 for(const name of ['config.js','daily.js','score-metadata.js']){const source=fs.readFileSync(path.join(root,'js',name),'utf8');assert.equal(nativeSource(name,source),source,name+' remains byte-identical');}
 const level=nativeSource('level-map.js',fs.readFileSync(path.join(root,'js/level-map.js'),'utf8'));
 assert.match(level,/if\(rankingAttemptEligible\(\)\)\s*\{[\s\S]*?ASCENT_NATIVE_SYNC\?\.recordClear\(level,courseMode,candidate\)/,'Native clear hook remains behind assistance eligibility gate');
 // Execute the transformed clear boundary: assisted local best is retained, never sent.
 const clearFunction=level.slice(level.indexOf('function recordStageClear()'),level.indexOf('function unlockedLevel()'));
 const game=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
 const wrappedGame=nativeSource('game.js',game);
 const stripResumeGuards=s=>s.replace(/\n    if\(globalThis\.ASCENT_NATIVE_RESUME[^\n]+/g,'').replace('function finish(...args) {\n    const commit=()=>nativeResume_finish(...args);\n    return globalThis.ASCENT_NATIVE_RESUME ? globalThis.ASCENT_NATIVE_RESUME.endAttempt(commit) : commit();\n}\nfunction nativeResume_finish(', 'function finish(');
 assert.equal(stripResumeGuards(wrappedGame),game,'Native game changes are limited to receipt/input gates; generation, Daily identity and assistance latch remain unchanged');
 const eligibility=game.match(/function rankingAttemptEligible\(\)\{[^}]+\}/)[0];
 const sent=[],gameEnv={level:2,dailyRun:null,debugAttempt:false,rankingAssistanceUsed:true,activeDebugCourse:()=>false,moveCount:6,runElapsedMs:2000,COURSE_VERSION:'v4',courseMode:'existing',stageRecords:{existing:{}},stageProgress:{existing:{cleared:0}},clearStars:()=>3,routeExpectedMoves:()=>6,currentScoreMetadata:()=>({scoreSpecVersion:'v4'}),historicalCourseVersion:()=>true,compareStageScores:(a,b)=>a.moves-b.moves,ASCENT_NATIVE_SYNC:{recordClear:(...args)=>sent.push(args)},queueOnlineScore(){},queueOnlineProfileSave(){},recordDailyClear(){gameEnv.dailyRecorded=true;},PROGRESS_KEY:'p',RECORDS_KEY:'r'};
 vm.createContext(gameEnv);vm.runInContext(eligibility+'\n'+clearFunction+'\nrecordStageClear();',gameEnv);
 assert.equal(sent.length,0);assert.equal(gameEnv.stageRecords.existing[2].rankingEligible,false);assert.equal(gameEnv.stageProgress.existing.cleared,2);
 gameEnv.rankingAssistanceUsed=false;gameEnv.moveCount=8;vm.runInContext('recordStageClear()',gameEnv);
 assert.equal(sent.length,1);assert.equal(sent[0][2].moves,8,'Current unassisted run sent, not faster assisted best');assert.equal(sent[0][2].rankingEligible,undefined);
 gameEnv.dailyRun={date:'2026-11-02'};vm.runInContext('recordStageClear()',gameEnv);assert.equal(sent.length,1,'Daily cannot enter normal native queue');
 console.log('PASS actual emitted native entry: first-use auto-sync, delayed SDK/auth, offline/reload/reconnect, identity/deletion/uncertain-auth guards, v4 startup/clear, v3 Daily unchanged, assistance gate, old saves, epoch signals, no live traffic');
}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
