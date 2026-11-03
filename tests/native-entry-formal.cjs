'use strict';
// Real esbuild output with only the SDK import seam mocked. Never execute Firebase SDK.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),build=require('../scripts/build-native-firebase.cjs'),nativeSource=require('../scripts/native-bundle-source.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ascent-native-entry-')),emitted={};
for(const mode of ['offline','read-only','auto-sync']){const out=path.join(temp,mode);build(root,out,mode);const source=fs.readFileSync(path.join(out,'js/native-firebase-control.js'),'utf8');assert.equal(source.split('import("../vendor/firebase-sdk.js")').length,2,'Exactly one reviewed SDK loader seam');emitted[mode]=source.replace('import("../vendor/firebase-sdk.js")','__loadMockSDK()');}
const KEY='ascent.native-firebase.identity-check.v1';
const profile={name:'Local name',colors:['#123456'],headColor:'#abcdef',progressVersion:'v4',reachedLevel:4,reachedPrototypeLevel:1};
async function boot({mode='read-only',enabled=true,uid='owner',known='owner',missingStorage=false,deleting=false,legacyProgress=false}={}){
 const data=new Map([['ascent.pending-scores.v1','unchanged legacy queue'],['ascent.records.v1','unchanged legacy bests']]);if(known)data.set(KEY,known);
 let user=uid?{uid}:null,epoch=7;const calls={loads:0,creates:0,reads:[],writes:[],storage:0,success:[]},remote=new Map([['players/owner',{...profile,name:'Server name'}]]);
 if(legacyProgress){const old=remote.get('players/owner');delete old.progressVersion;old.reachedLevel=900;old.reachedPrototypeLevel=800;}
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{calls.storage++;data.set(k,String(v));},removeItem:k=>data.delete(k)};
 const sdk={app:{getApps:()=>[],initializeApp:config=>({options:config})},auth:{browserLocalPersistence:{},initializeAuth:()=>({get currentUser(){return user;},authStateReady:async()=>{}}),setPersistence:async()=>{},signInAnonymously:async()=>{calls.creates++;user={uid:'new-owner'};return {user};}},firestore:{getFirestore:()=>({}),doc:(db,...p)=>p.join('/'),collection:(db,...p)=>p.join('/'),where:(...args)=>args,orderBy:(...args)=>args,limit:n=>n,query:(...args)=>args,serverTimestamp:()=>({mock:true}),getDocFromServer:async key=>{calls.reads.push(key);return {exists:()=>remote.has(key),data:()=>remote.get(key)};},getDocsFromServer:async query=>{calls.reads.push(query[0]);return {docs:[]};},runTransaction:async(db,action)=>{const pending=[];const result=await action({get:async key=>({exists:()=>remote.has(key),data:()=>remote.get(key)}),set:(k,v)=>pending.push([k,v])});for(const [k,v]of pending){calls.writes.push(k);remote.set(k,v);}return result;}}};
 const reports=[],policy={configuration:'Debug',syncStatusAllowed:true,firebaseMode:mode,firebaseEnabled:enabled,firebaseAuthAllowed:true,firebaseAnonymousAllowed:true,firebaseReadsAllowed:true,firebaseAutomaticSyncAllowed:true};
 const env={COURSE_VERSION:'v4',DAILY_COURSE_VERSION:'v3',ASCENT_IOS_BUILD:policy,ASCENT_SETTINGS_CONNECTION:{ticket:()=>epoch,success:n=>calls.success.push(n),failure(){}},document:{getElementById:()=>null},window:{addEventListener(){}},console:{warn(){}},online:{ready:false},onlineScores:{owner:known},readOnlineCheckpoint:()=>known?{uid:known}:null,accountDeletion:{marker:deleting?{uid:'owner',phase:'pending'}:null},scoreBoardKey:(n,mode)=>'v4_'+mode+'_'+n,setOnlineStatus(){},renderTransferAvailability(){},renderMapPlayers(){},onlineProfile:()=>({...profile}),webkit:{messageHandlers:{ascentFirebaseReport:{postMessage:r=>reports.push(r)}}},__loadMockSDK:async()=>{calls.loads++;return sdk;},fetch(){throw Error('No live traffic permitted');}};
 if(missingStorage)Object.defineProperty(env,'localStorage',{get(){throw Error('Storage denied');}});else env.localStorage=storage;
 vm.runInNewContext(emitted[mode],env);
 for(let i=0;i<150;i++)await Promise.resolve();
 return {env,calls,data,remote,reports,nextEpoch(){epoch++;}};
}
(async()=>{try{
 for(const mode of ['offline','read-only','auto-sync']){const f=await boot({mode,enabled:false});assert.equal(f.calls.loads,0);assert.equal(f.calls.creates,0);assert.equal(f.calls.storage,0);assert.deepEqual(f.calls.writes,[]);assert.equal(f.data.get('ascent.pending-scores.v1'),'unchanged legacy queue');}
 for(const mode of ['read-only','auto-sync']){const f=await boot({mode,missingStorage:true});assert.equal(f.calls.loads,0);assert.equal(f.calls.creates,0);assert.equal(f.env.online.ready,false);assert.equal(f.calls.writes.length,0);}
 const fresh=await boot({uid:null,known:null});assert.equal(fresh.calls.creates,1);assert.equal(fresh.env.online.uid,'new-owner');assert(fresh.calls.reads.includes('stageScores/v4_existing_1/entries'));assert.equal(fresh.calls.writes.length,0);
 const restored=await boot();assert.equal(restored.calls.creates,0);assert.equal(restored.env.online.uid,'owner');assert(restored.calls.reads.includes('stageScores/v4_existing_1/entries'));assert(!restored.calls.reads.some(x=>x.includes('v1_existing')));assert(restored.calls.success.includes(7));assert.equal(restored.calls.writes.length,0);
 for(const method of ['deleteAccount','lockDeletion','prepareTransferIdentity','importTransferIdentity','saveScore','sync'])await assert.rejects(restored.env.ASCENT_NATIVE_FIREBASE.adapter()[method](),/write-disabled/);
 const mismatch=await boot({uid:'other',known:'owner'});assert.equal(mismatch.env.online.ready,false);assert.equal(mismatch.calls.creates,0);assert.equal(mismatch.calls.reads.length,0);assert.equal(mismatch.data.get(KEY),'owner');
 const deleting=await boot({deleting:true});assert.equal(deleting.calls.loads,0);assert.equal(deleting.calls.creates,0);
 const noIdentity=await boot({mode:'auto-sync',uid:null,known:null});assert.equal(noIdentity.calls.creates,0);assert.equal(noIdentity.calls.writes.length,0);
 const auto=await boot({mode:'auto-sync'});assert.equal(auto.env.online.uid,'owner');assert.equal(auto.calls.creates,0);assert.equal(auto.remote.get('players/owner').name,'Server name','Automatic startup preserves server name');assert(auto.calls.reads.includes('stageScores/v4_existing_1/entries'));
 const adopted=await boot({mode:'auto-sync',legacyProgress:true});assert.equal(adopted.remote.get('players/owner').progressVersion,'v4');assert.equal(adopted.remote.get('players/owner').reachedLevel,4);assert.equal(adopted.remote.get('players/owner').reachedPrototypeLevel,1);assert.equal(adopted.remote.get('players/owner').name,'Server name');
 const sync=auto.env.ASCENT_NATIVE_SYNC,score={version:'v4',scoreSpecVersion:'v4',moves:6,timeMs:2000,platform:'iOS'};
 assert.equal(sync.recordClear(1,'existing',{...score,rankingEligible:false}),false);assert.equal(sync.recordClear(1,'existing',{...score,version:'v3',scoreSpecVersion:'v3'}),false);assert.equal(sync.recordClear(1,'daily',{...score,version:'v3',scoreSpecVersion:'v3'}),false);
 assert.equal(sync.recordClear(1,'existing',score),true);await sync.flush();assert.equal(auto.remote.get('stageScores/v4_existing_1/entries/owner').scoreSpecVersion,'v4');assert.equal(auto.data.get('ascent.pending-scores.v1'),'unchanged legacy queue');assert.equal(auto.data.get('ascent.records.v1'),'unchanged legacy bests');
 auto.nextEpoch();await auto.env.ASCENT_NATIVE_FIREBASE.players(1,1,'existing');assert.equal(auto.reports.at(-1).connectionEpoch,8);assert(auto.calls.success.includes(8));
 // Native wrapping cannot change Daily identity or reset the game's assistance latch.
 for(const name of ['config.js','daily.js','game.js','score-metadata.js']){const source=fs.readFileSync(path.join(root,'js',name),'utf8');assert.equal(nativeSource(name,source),source,name+' remains byte-identical');}
 const level=nativeSource('level-map.js',fs.readFileSync(path.join(root,'js/level-map.js'),'utf8'));
 assert.match(level,/if\(rankingAttemptEligible\(\)\)\s*\{[\s\S]*?ASCENT_NATIVE_SYNC\?\.recordClear\(level,courseMode,candidate\)/,'Native clear hook remains behind assistance eligibility gate');
 // Execute the transformed clear boundary: assisted local best is retained, never sent.
 const clearFunction=level.slice(level.indexOf('function recordStageClear()'),level.indexOf('function unlockedLevel()'));
 const game=fs.readFileSync(path.join(root,'js/game.js'),'utf8');
 const eligibility=game.match(/function rankingAttemptEligible\(\)\{[^}]+\}/)[0];
 const sent=[],gameEnv={level:2,dailyRun:null,debugAttempt:false,rankingAssistanceUsed:true,activeDebugCourse:()=>false,moveCount:6,runElapsedMs:2000,COURSE_VERSION:'v4',courseMode:'existing',stageRecords:{existing:{}},stageProgress:{existing:{cleared:0}},clearStars:()=>3,routeExpectedMoves:()=>6,currentScoreMetadata:()=>({scoreSpecVersion:'v4'}),historicalCourseVersion:()=>true,compareStageScores:(a,b)=>a.moves-b.moves,ASCENT_NATIVE_SYNC:{recordClear:(...args)=>sent.push(args)},queueOnlineScore(){},queueOnlineProfileSave(){},recordDailyClear(){gameEnv.dailyRecorded=true;},PROGRESS_KEY:'p',RECORDS_KEY:'r'};
 vm.createContext(gameEnv);vm.runInContext(eligibility+'\n'+clearFunction+'\nrecordStageClear();',gameEnv);
 assert.equal(sent.length,0);assert.equal(gameEnv.stageRecords.existing[2].rankingEligible,false);assert.equal(gameEnv.stageProgress.existing.cleared,2);
 gameEnv.rankingAssistanceUsed=false;gameEnv.moveCount=8;vm.runInContext('recordStageClear()',gameEnv);
 assert.equal(sent.length,1);assert.equal(sent[0][2].moves,8,'Current unassisted run sent, not faster assisted best');assert.equal(sent[0][2].rankingEligible,undefined);
 gameEnv.dailyRun={date:'2026-11-02'};vm.runInContext('recordStageClear()',gameEnv);assert.equal(sent.length,1,'Daily cannot enter normal native queue');
 console.log('PASS actual emitted native entry: v4 startup/clear, v3 Daily unchanged, assistance gate, identity/name/old saves, epoch signals, off/storage denial/no live traffic');
}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
