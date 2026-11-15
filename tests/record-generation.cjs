'use strict';
// Actual browser storage/record/reward/transfer code, without Firebase or DOM navigation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createNativeAutoSync,SYNC_KEY}=require('../scripts/native-auto-sync.cjs');
const read=p=>fs.readFileSync(p,'utf8');
const meta=require('../js/score-metadata.js');
const fresh=(extra={})=>({moves:12,timeMs:100,version:'v5',recordVersion:'r1',scoreSpecVersion:'v5',...extra});
const old=new Map([
 ['ascent.progress.v1',JSON.stringify({existing:{cleared:900},prototype:{cleared:2}})],
 ['ascent.records.v1',JSON.stringify({existing:{1:{moves:1,timeMs:1,stars:3,version:'v5'}},prototype:{}})],
 ['ascent.daily-records.v1',JSON.stringify({'2026-11-15':{moves:1,timeMs:1,stars:3,rewardStatus:'claimed'}})],
 ['ascent.map-rewards.v1',JSON.stringify({4:{status:'claimed'},8:{status:'pending'}})],
 ['ascent.pending-scores.v1',JSON.stringify({uid:'owner',items:[['v5_existing_1',{moves:1,timeMs:1}]]})],
 ['ascent.native-sync.after-enable.v1',JSON.stringify({version:1,owner:'owner',sequence:1,name:'Old',events:[{sequence:1,board:'v5_existing_1',score:{moves:1,timeMs:1}}]})]
]);
const baseline=new Map(old);
const storage={getItem:k=>old.get(k)??null,setItem:(k,v)=>old.set(k,v),removeItem:k=>old.delete(k),get length(){return old.size;},key:i=>[...old.keys()][i]};
const context=vm.createContext({console,localStorage:storage,assert,Blob});
vm.runInContext(read('js/score-metadata.js')+`
const ui={mapPlayers:{addEventListener(){}},titleTransfer:{},mapItemCount:{},mapInventory:{setAttribute(){}}};
function renderMapInventory(){}function gameText(k){return k;}
const document={getElementById:()=>({addEventListener(){}})},window={addEventListener(){}};
const COURSE_VERSION='v5',COURSE_RANKINGS_ENABLED=true;
const DAILY_COURSE_VERSION='v4';
`,context);
// Evaluate storage readers directly from production files; UI handlers are not relevant here.
let level=read('js/level-map.js');level=level.slice(level.indexOf('const PROGRESS_KEY'),level.indexOf('let mapPage'));
let daily=read('js/daily.js');daily=daily.slice(0,daily.indexOf('function startDailyClearReward'));
vm.runInContext(level+daily,context);
assert.equal(vm.runInContext('stageProgress.existing.cleared',context),0);
assert.equal(vm.runInContext('Object.keys(stageRecords.existing).length',context),0);
assert.equal(vm.runInContext('Object.keys(dailyRecords).length',context),0);
vm.runInContext(`
assert(previouslyClaimedReward('ascent.map-rewards.v1',4));
assert(!previouslyClaimedReward('ascent.map-rewards.v1',8));
assert(previouslyClaimedReward('ascent.daily-records.v1','2026-11-15',true));
`,context);
// New tagged scores survive restart; missing/wrong generation remains invisible.
old.set('ascent.records.v1.r1',JSON.stringify({existing:{1:fresh({stars:2}),2:fresh({recordVersion:'r0'}),3:{moves:1,timeMs:1}},prototype:{}}));
assert.equal(vm.runInContext('Object.keys(readStageRecords().existing).join()',context),'1');
old.set('ascent.progress.v1.r1',JSON.stringify({recordVersion:'r0',existing:{cleared:700}}));assert.equal(vm.runInContext('readStageProgress().existing.cleared',context),0);
old.set('ascent.progress.v1.r1',JSON.stringify({recordVersion:'r1',existing:{cleared:3}}));assert.equal(vm.runInContext('readStageProgress().existing.cleared',context),3);
assert(meta.scoreMatchesBoard('r1_v5_existing_1',fresh()));
for(const [board,score] of [['v5_existing_1',fresh()],['r1_v5_existing_1',fresh({recordVersion:undefined})],['r1_v5_existing_1',fresh({recordVersion:'r0'})],['r1_v4_existing_1',fresh()]])assert(!meta.scoreMatchesBoard(board,score));
// Native old offline queue is neither imported nor mutated. Fresh queue persists, retries once.
(async()=>{
 let offline=true,lost=true;const writes=new Map(),sent=[];
 const controller={permissions:()=>({automaticSync:true}),authenticate:async()=>{if(offline)throw Error('offline');},syncFreshScore:async(uid,board,score)=>{sent.push(board);if(!writes.has(board))writes.set(board,score);if(lost){lost=false;throw Error('lost-ack');}},syncAutomaticProfile:async()=>({name:'Current'})};
 const make=()=>createNativeAutoSync({storage,owner:'owner',controller,courseVersion:'v5'});
 const first=make();assert.equal(first.report().freshPending,0);assert(!first.recordClear(1,'existing',fresh({recordVersion:undefined})));
 assert(first.recordClear(1,'existing',fresh()));await first.flush();assert.equal(first.report().freshPending,1);
 offline=false;await first.flush();assert.equal(first.report().freshPending,1);
 const restart=make();await restart.flush();assert.equal(restart.report().freshPending,0);assert.equal(writes.size,1);assert.deepEqual(sent,['r1_v5_existing_1','r1_v5_existing_1']);
 for(const [key,value]of baseline)assert.equal(old.get(key),value,`${key} must remain byte-identical`);
 // A forged/mixed old event inside a current ledger remains unsent, never relabeled.
 const ledger=JSON.parse(old.get(SYNC_KEY));ledger.events=[{sequence:2,board:'v5_existing_2',score:fresh()},{sequence:3,board:'r1_v5_existing_2',score:fresh({recordVersion:'r0'})}];old.set(SYNC_KEY,JSON.stringify(ledger));
 const mixed=make();await mixed.flush();assert.equal(mixed.report().retainedEvents,2);assert.equal(sent.length,2);await mixed.stop();assert(!mixed.recordClear(3,'existing',fresh()));
 // Transfer nested records are checked, even when the top-level envelope is changed.
 const transfer=read('js/transfer.js');vm.runInContext(transfer.slice(transfer.indexOf('function transferObject'),transfer.indexOf('function validTransferIdentity'))+transfer.slice(transfer.indexOf('function validTransferRecord'),transfer.indexOf('function transferStorageEntries')),context);
 context.score=fresh();assert(vm.runInContext('validTransferRecord(score)',context));context.score=fresh({recordVersion:undefined});assert(!vm.runInContext('validTransferRecord(score)',context));
 // Rotate to r2 while an r1 device is offline. Neither runtime adopts the other's ledger.
 const module2={exports:{}};vm.runInNewContext(read('js/score-metadata.js').replace("const RECORD_VERSION='r1'", "const RECORD_VERSION='r2'"),{module:module2});
 const queueModule={exports:{}};vm.runInNewContext(read('scripts/native-auto-sync.cjs'),{module:queueModule,require:()=>module2.exports,setTimeout,clearTimeout});
 let serverGeneration='r1';const accepted=[];
 const gatedController={permissions:()=>({automaticSync:true}),authenticate:async()=>{},syncFreshScore:async(uid,board,score)=>{
  if(!board.startsWith(serverGeneration+'_') || score.recordVersion!==serverGeneration)throw Error('permission-denied');accepted.push(board);
 }};
 const oldDevice=createNativeAutoSync({storage,owner:'owner',courseVersion:'v5',startPaused:true,controller:gatedController});
 assert(oldDevice.recordClear(10,'existing',fresh()));serverGeneration='r2';
 const newDevice=queueModule.exports.createNativeAutoSync({storage,owner:'owner',courseVersion:'v5',startPaused:true,controller:gatedController});
 assert.equal(newDevice.report().freshPending,0);assert(!newDevice.recordClear(11,'existing',fresh()));
 assert(newDevice.recordClear(11,'existing',fresh({recordVersion:'r2'})));newDevice.activate('owner');await newDevice.flush();
 oldDevice.activate('owner');await oldDevice.flush();assert.equal(oldDevice.report().freshPending,1);assert.deepEqual(accepted,['r2_v5_existing_11']);
 await oldDevice.stop();await newDevice.stop();
 old.set('ascent.records.v1.r99','future history');old.set('ascent.reward-claims.v1.r99',JSON.stringify({map:['4'],daily:[]}));old.set('ascent.reward-history-scope.v1',JSON.stringify({ownerUid:'owner',excludedKeys:[]}));old.set('ascent.terms.accepted.v1','retain consent until lifecycle reset');old.set('ascent.native-ads.preferences.v1','keep ads');old.set('another-app','keep');
 const deleteSource=read('js/account-deletion.js');
 const cleanup=deleteSource.slice(deleteSource.indexOf('function clearLocalGameData()'),deleteSource.indexOf('async function deleteCurrentAccount()'));
 const keyNames=['APPEARANCE_KEY','PLAYER_NAME_KEY','PLAYER_UUID_KEY','ONLINE_PROFILE_KEY','ONLINE_SCORES_KEY','PROGRESS_KEY','RECORDS_KEY','HEART_ITEMS_KEY','LIVES_KEY','MAP_REWARDS_KEY','FEATURE_HELP_KEY','SOUND_KEY','MUSIC_KEY','SOUND_VOLUME_KEY','LANGUAGE_KEY','AD_PLAYS_KEY','DAILY_RECORDS_KEY','DAILY_ATTEMPTS_KEY','DAILY_PLAY_AD_KEY'];
 const cleanupContext=vm.createContext({localStorage:storage,...Object.fromEntries(keyNames.map(k=>[k,'synthetic-'+k]))});
 vm.runInContext(cleanup+'clearLocalGameData()',cleanupContext);
 for(const key of old.keys())assert(!/^ascent\.(reward-history-scope|reward-claims|progress|records|daily-records|map-rewards|pending-scores|native-sync\.after-enable)\.v1/.test(key),key+' survived deletion');
 assert.equal(old.get('another-app'),'keep');assert.equal(old.get('ascent.native-ads.preferences.v1'),'keep ads');assert(old.has('ascent.terms.accepted.v1'));
 console.log('PASS shared record generation: old local progress/stars/daily hidden; legacy storage immutable; reward claims retained; fresh queue offline/restart/lost ACK; mixed generations unsent; stop fence; nested transfer validation');
})().catch(e=>{console.error(e);process.exitCode=1;});
