'use strict';
const assert=require('node:assert/strict');
const {createNativeFirebaseController,ATTEMPT_KEY,IDENTITY_KEY}=require('../scripts/native-firebase-controller.cjs');
const readPolicy={firebaseMode:'read-only',firebaseEnabled:true,firebaseAuthAllowed:true,firebaseAnonymousAllowed:true,firebaseReadsAllowed:true};
function fixture({mode='read-only',policy=readPolicy,data=new Map(),failStorage=false,failPersistence=false,lostResponse=false,known=null,loadGate=null,allowWrites=false,remote=new Map(),lostCommit=false}={}) {
 let activePolicy={...policy},user=data.get('mock-auth')?{uid:data.get('mock-auth')}:null;
 const calls={load:0,app:0,auth:0,create:0,read:0,write:0,transactions:0};const reports=[];
 const storage={getItem:k=>{if(failStorage)throw Error('storage');return data.get(k)??null;},setItem:(k,v)=>{if(failStorage)throw Error('storage');data.set(k,v);},removeItem:k=>data.delete(k)};
 const sdk={app:{getApps:()=>[],initializeApp(){calls.app++;return {};},getApp:()=>({})},
  auth:{browserLocalPersistence:{type:'LOCAL'},initializeAuth(app,options){calls.auth++;assert(options.persistence);return {get currentUser(){return user;},authStateReady:async()=>{}};},
   setPersistence:async()=>{if(failPersistence)throw {code:'auth/unsupported-persistence-type'};},
   signInAnonymously:async()=>{calls.create++;if(lostResponse)throw {code:'auth/network-request-failed',message:'private request URL must not leak'};user={uid:'mock-native-identity'};data.set('mock-auth',user.uid);return {user};}},
  firestore:{getFirestore:()=>({}),doc:(db,...p)=>typeof db==='string'?[db,...p].join('/'):p.join('/'),collection:(db,...p)=>p.join('/'),where:(...x)=>x,orderBy:x=>x,limit:x=>x,query:(...x)=>x,
   getDocFromServer:async key=>{calls.read++;return {exists:()=>remote.has(key),data:()=>remote.get(key)};},
   getDocsFromServer:async q=>{calls.read++;return {docs:[...remote].filter(([key])=>key.startsWith(q[0]+'/')).map(([key,value])=>({id:key.split('/').at(-1),data:()=>value}))};},
   serverTimestamp:()=>({server:true}),async runTransaction(db,fn){
    if(!allowWrites)throw Error('write forbidden');calls.transactions++;const pending=[];
    const result=await fn({get:async key=>({exists:()=>remote.has(key),data:()=>remote.get(key)}),set:(key,value)=>pending.push([key,value])});
    for(const [key,value] of pending){remote.set(key,value);calls.write++;}
    if(lostCommit){lostCommit=false;throw {code:'unavailable'};}return result;
   },deleteDoc(){calls.write++;throw Error('delete forbidden');}}
 };
 const control=createNativeFirebaseController({mode,config:{projectId:'bouldering-7482d'},policy:()=>activePolicy,storage,knownUid:()=>known,
  loadSDK:async()=>{calls.load++;if(loadGate)await loadGate;sdk.loaded=true;return sdk;},onReport:r=>reports.push(r)});
 return {control,calls,data,reports,remote,revoke:()=>activePolicy.firebaseEnabled=false};
}
(async()=>{
 const offline=fixture({mode:'offline'});
 await assert.rejects(offline.control.authenticate({createAnonymous:true}),/auth-disabled/);
 await assert.rejects(offline.control.players(1,1,'existing'),/read-disabled/);
 for(const name of ['sync','saveScore','prepareTransferIdentity','importTransferIdentity','lockDeletion','deleteAccount'])await assert.rejects(offline.control.adapter()[name](),/write-disabled/);
 assert.equal(offline.calls.load,0);assert.equal(offline.calls.create,0);assert.equal(offline.calls.write,0);
 const unavailable=fixture({failStorage:true});await assert.rejects(unavailable.control.authenticate({createAnonymous:true}),/persistence-unavailable/);assert.equal(unavailable.calls.load,0);
 const badPersistence=fixture({failPersistence:true});await assert.rejects(badPersistence.control.authenticate({createAnonymous:true}));assert.equal(badPersistence.calls.create,0);
 const data=new Map([['ascent.pending-scores.v1','keep-queued-scores'],['ascent.progress.v1','keep-progress']]);
 const first=fixture({data});
 const [a,b]=await Promise.all([first.control.authenticate({createAnonymous:true}),first.control.authenticate({createAnonymous:true})]);assert.equal(a.uid,b.uid);assert.equal(first.calls.create,1);
 await first.control.players(1,1,'existing');await first.control.scores(a.uid,'v1_existing_1');assert(first.calls.read>0);assert.equal(first.calls.write,0);
 assert.equal(data.get('ascent.pending-scores.v1'),'keep-queued-scores');assert.equal(data.get('ascent.progress.v1'),'keep-progress');
 const restored=fixture({data});const second=await restored.control.authenticate({createAnonymous:true});assert.equal(second.uid,a.uid);assert.equal(restored.calls.create,0);assert(restored.control.report().sameIdentity);
 for(const name of ['sync','saveScore','prepareTransferIdentity','importTransferIdentity','lockDeletion','deleteAccount'])await assert.rejects(restored.control.adapter()[name](),/write-disabled/);
 assert.equal(restored.calls.write,0);assert.equal(data.get('ascent.pending-scores.v1'),'keep-queued-scores');
 assert(!JSON.stringify([...first.reports,...restored.reports]).includes(a.uid),'Report never exposes identity');
 const lost=fixture({lostResponse:true});await assert.rejects(lost.control.authenticate({createAnonymous:true}));await assert.rejects(lost.control.authenticate({createAnonymous:true}));assert.equal(lost.calls.create,1);
 const afterLost=fixture({data:lost.data});await assert.rejects(afterLost.control.authenticate({createAnonymous:true}),/creation-already-attempted/);assert.equal(afterLost.calls.create,0);
 assert.equal(lost.data.get(ATTEMPT_KEY),'started');
 const lostIdentity=new Map([[IDENTITY_KEY,a.uid]]);const missing=fixture({data:lostIdentity});await assert.rejects(missing.control.authenticate({createAnonymous:true}),/identity-restore-required/);assert.equal(missing.calls.create,0);
 const noReads=fixture({policy:{...readPolicy,firebaseReadsAllowed:false}});await assert.rejects(noReads.control.scores('any','v1_existing_1'),/read-disabled/);assert.equal(noReads.calls.load,0);
 const noCreation=fixture({policy:{...readPolicy,firebaseAnonymousAllowed:false}});await assert.rejects(noCreation.control.authenticate({createAnonymous:true}),/create-disabled/);assert.equal(noCreation.calls.create,0);
 let release;const pending=new Promise(r=>release=r);const revoked=fixture({loadGate:pending});const attempt=revoked.control.authenticate({createAnonymous:true});await Promise.resolve();revoked.revoke();release();await assert.rejects(attempt,/auth-disabled/);assert.equal(revoked.calls.app,0);
 const identity=()=>new Map([['mock-auth','existing-test'],[IDENTITY_KEY,'existing-test'],[ATTEMPT_KEY,'completed']]);
 const input={profile:{name:'iOS接続テスト',colors:['#123456'],headColor:'#abcdef',reachedLevel:2,reachedPrototypeLevel:1}};
 assert.equal(typeof restored.control.runLimitedWriteTest,'undefined');
 const removedMode=fixture({mode:'limited-write-test'});await assert.rejects(removedMode.control.authenticate(),/auth-disabled/);
 const autoPolicy={...readPolicy,firebaseMode:'auto-sync',firebaseAnonymousAllowed:false,firebaseAutomaticSyncAllowed:true};
 const auto=fixture({mode:'auto-sync',policy:autoPolicy,data:identity(),allowWrites:true});
 await auto.control.syncAutomaticProfile('existing-test',input.profile);assert.equal(auto.calls.write,1);
 await auto.control.syncAutomaticProfile('existing-test',input.profile);assert.equal(auto.calls.write,1,'Unchanged profile is not rewritten');
 const capturedMeta={appVersion:'0.3.14',buildNumber:'7',platform:'iOS',scoreSpecVersion:'v1'};
 await auto.control.syncFreshScore('existing-test','v1_existing_2',{moves:12,timeMs:8000,...capturedMeta});assert.equal(auto.calls.write,2);
 await auto.control.syncFreshScore('existing-test','v1_existing_2',{moves:14,timeMs:9000});assert.equal(auto.calls.write,2,'Server best is retained but worse new clear is acknowledged');
 assert.deepEqual(require('../js/score-metadata.js').scoreMetadata(auto.remote.get('stageScores/v1_existing_2/entries/existing-test')),capturedMeta);
 await auto.control.syncFreshScore('existing-test','v1_existing_2',{moves:12,timeMs:8000,appVersion:'future',buildNumber:'9'});assert.equal(auto.calls.write,2);
 assert.deepEqual(require('../js/score-metadata.js').scoreMetadata(auto.remote.get('stageScores/v1_existing_2/entries/existing-test')),capturedMeta);
 await auto.control.syncFreshScore('existing-test','v1_existing_2',{moves:10,timeMs:11000});assert.equal(auto.calls.write,3);
 await assert.rejects(auto.control.adapter().saveScore(),/write-disabled/);await assert.rejects(auto.control.syncFreshScore('another-owner','v1_existing_2',{moves:1,timeMs:1}),/identity-mismatch/);assert.equal(auto.calls.create,0);
 console.log('PASS native Firebase mock: dormant offline SDK; separate auth/read gates; persistence fail-stop; durable one-attempt creation; restored identity; every write/transfer/delete denied; queues preserved; reports sanitized');
 console.log('PASS automatic writes: own identity only; unchanged profile and worse score skipped; better score saved; limited test API removed');
})().catch(e=>{console.error(e);process.exitCode=1;});
