'use strict';
const assert=require('node:assert/strict');
const {createNativeAutoSync,SYNC_KEY}=require('../scripts/native-auto-sync.cjs');
function fixture(data=new Map(),remote=new Map(),courseVersion='v1',options={}) {
 const calls={profiles:[],scores:[],writes:0,auth:0};let online=true,lost=false,blockProfile;
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const controller={permissions:()=>({automaticSync:true}),authenticate:async o=>{assert.equal(o.createAnonymous,false);calls.auth++;if(!online)throw {code:'auth/network-request-failed'};},
  syncAutomaticProfile:async(uid,p,{nameChanged=false}={})=>{if(!online)throw {code:'firestore/unavailable'};calls.profiles.push(p);if(blockProfile){const block=blockProfile;blockProfile=null;await block;}const name=!nameChanged && remote.has('profile')?remote.get('profile').name:p.name;remote.set('profile',{...p,name});return {written:true,name};},
  syncFreshScore:async(uid,board,s)=>{if(!online)throw {code:'firestore/unavailable'};calls.scores.push({board,score:s});const old=remote.get(board);if(!old || old.moves>s.moves || (old.moves===s.moves && old.timeMs>s.timeMs)){remote.set(board,s);calls.writes++;}if(lost){lost=false;throw {code:'firestore/unavailable'};}return {written:true};}};
 const queue=createNativeAutoSync({storage,owner:'existing-owner',controller,courseVersion,clock:()=>1000,...options});
 return {queue,data,remote,calls,online:v=>online=v,lose:()=>lost=true,block:p=>blockProfile=p};
}
const profile={name:'local-private-name',colors:['#123456'],headColor:'#abcdef',progressVersion:'v4',reachedLevel:2,reachedPrototypeLevel:1};
(async()=>{
 const unbound=fixture(new Map(),new Map(),'v4',{owner:null,startPaused:true});
 const freshScore={moves:9,timeMs:500,version:'v4',scoreSpecVersion:'v4'};
 assert(unbound.queue.recordClear(1,'existing',freshScore));
 unbound.queue.profileEdited({...profile,name:'Before first connection'},true);await unbound.queue.flush();
 assert.equal(unbound.calls.auth,0);assert.equal(JSON.parse(unbound.data.get(SYNC_KEY)).owner,null);
 const unboundRestart=fixture(unbound.data,new Map(),'v4',{owner:null,startPaused:true});
 assert(unboundRestart.queue.activate('first-owner'));await unboundRestart.queue.flush();
 assert.equal(unboundRestart.calls.scores.length,1);assert.equal(unboundRestart.remote.get('profile').name,'Before first connection');
 assert.equal(JSON.parse(unbound.data.get(SYNC_KEY)).owner,'first-owner');
 const boundBefore=unbound.data.get(SYNC_KEY);
 assert.equal(unboundRestart.queue.activate('other-owner'),false);assert.equal(unbound.data.get(SYNC_KEY),boundBefore);
 assert.throws(()=>unboundRestart.queue.ownerUid(),/identity-mismatch/);
 const damaged=fixture(new Map([[SYNC_KEY,'broken']]),new Map(),'v4',{owner:null,startPaused:true});
 assert.throws(()=>damaged.queue.ownerUid());assert.equal(damaged.queue.activate('first-owner'),false);assert.equal(damaged.calls.auth,0);
 const oldQueue=JSON.stringify({uid:null,items:[['v1_existing_1',{moves:4,timeMs:500}]]});
 const data=new Map([['ascent.pending-scores.v1',oldQueue],['ascent.records.v1','old best: 4 moves']]);
 const h=fixture(data);assert(h.queue.report().boundaryPersisted);assert.equal(h.queue.report().freshPending,0);assert.equal(h.calls.scores.length,0);
 h.queue.recordClear(1,'existing',{moves:12,timeMs:5000,version:'v1'});await h.queue.flush();
 assert.equal(h.calls.scores[0].score.moves,12,'Send actual new clear, even when worse than historical local best');assert.equal(h.remote.get('v1_existing_1').moves,12);
 assert.equal(data.get('ascent.pending-scores.v1'),oldQueue);assert.equal(data.get('ascent.records.v1'),'old best: 4 moves');
 h.queue.queueProfile(profile);await h.queue.flush();assert.equal(h.calls.profiles.at(-1).name,profile.name);
 h.queue.profileEdited({...profile,colors:['#112233']},false);await h.queue.flush();assert.equal(h.calls.profiles.at(-1).name,profile.name);
 h.queue.profileEdited({...profile,name:'explicit-public-name'},true);await h.queue.flush();assert.equal(h.calls.profiles.at(-1).name,'explicit-public-name');
 const offline=fixture();offline.online(false);
 offline.queue.recordClear(2,'existing',{moves:10,timeMs:8000,version:'v1'});await offline.queue.flush();
 offline.queue.recordClear(3,'existing',{moves:14,timeMs:12000,version:'v1'});await offline.queue.flush();assert.equal(offline.queue.report().freshPending,2);
 const restarted=fixture(offline.data,offline.remote);assert.equal(JSON.parse(restarted.data.get(SYNC_KEY)).activatedAt,1000);
 await Promise.all([restarted.queue.flush(),restarted.queue.flush()]);assert.equal(restarted.calls.scores.length,2);assert.equal(restarted.queue.report().freshPending,0);
 const uncertain=fixture();uncertain.lose();uncertain.queue.recordClear(4,'existing',{moves:13,timeMs:16000,version:'v1'});await uncertain.queue.flush();assert.equal(uncertain.queue.report().freshPending,1);assert.equal(uncertain.calls.writes,1);
 const recovered=fixture(uncertain.data,uncertain.remote);await recovered.queue.flush();assert.equal(recovered.calls.writes,0,'Lost acknowledgement retries must not rewrite an equal score');assert.equal(recovered.queue.report().freshPending,0);
 const better=fixture(new Map(),new Map([['v1_existing_5',{moves:7,timeMs:1000}]]));better.queue.recordClear(5,'existing',{moves:12,timeMs:4000,version:'v1'});await better.queue.flush();assert.equal(better.calls.writes,0);assert.equal(better.queue.report().freshPending,0);
 const concurrent=fixture();let release;concurrent.block(new Promise(r=>release=r));concurrent.queue.queueProfile(profile);await new Promise(r=>setImmediate(r));
 concurrent.queue.queueProfile({...profile,colors:['#445566']});release();await concurrent.queue.flush();assert.equal(concurrent.calls.profiles.length,2);assert.deepEqual(concurrent.remote.get('profile').colors,['#445566']);
 // Deletion must quiesce a current write without persisting its late result or
 // draining another score/profile. Old callbacks cannot recreate a cleared ledger.
 const deleting=fixture();let finishDeleteWrite;
 deleting.block(new Promise(r=>finishDeleteWrite=r));deleting.queue.queueProfile(profile);
 await new Promise(r=>setImmediate(r));
 deleting.queue.recordClear(1,'existing',{moves:20,timeMs:4000,version:'v1'});
 await assert.rejects(deleting.queue.stop({timeoutMs:1}),/drain-timeout/);
 const stopping=deleting.queue.stop(),beforeStop=deleting.data.get(SYNC_KEY);
 assert.equal(deleting.queue.queueProfile(profile),false);assert.equal(deleting.queue.activate('existing-owner'),false);
 finishDeleteWrite();await stopping;assert.equal(deleting.data.get(SYNC_KEY),beforeStop);assert.equal(deleting.calls.scores.length,0);
 deleting.data.delete(SYNC_KEY);await deleting.queue.flush();assert.equal(deleting.data.has(SYNC_KEY),false);
 const invalid=new Map([[SYNC_KEY,'{"version":1}']]);const safe=fixture(invalid);await safe.queue.flush();assert(safe.queue.report().syncError);assert.equal(safe.calls.scores.length,0);assert.equal(invalid.get(SYNC_KEY),'{"version":1}');
 // Upgrade keeps old queue bytes/provenance and skips retained-only events.
 const entries=[{sequence:1,board:'v1_existing_1',score:{moves:8,timeMs:10}},
  {sequence:2,board:'v2_existing_1',score:{moves:7,timeMs:11,scoreSpecVersion:'v2',appVersion:'0.4.10'}},
  {sequence:3,board:'v3_existing_1',score:{moves:6,timeMs:12,scoreSpecVersion:'v3'}},
  {sequence:4,board:'v1_prototype_1',score:{moves:1,timeMs:1}},
  {sequence:5,board:'v6_existing_1',score:{moves:1,timeMs:1}},
  {sequence:6,board:'v4_existing_2',score:{moves:1,timeMs:1,scoreSpecVersion:'v3'}},
  {sequence:7,board:'v4_existing_3',score:{moves:1,timeMs:1,rankingEligible:false}}];
 const upgradeData=new Map([[SYNC_KEY,JSON.stringify({version:1,owner:'existing-owner',activatedAt:42,sequence:7,name:'Saved name',profile:null,events:entries})],['ascent.pending-scores.v1',oldQueue]]);
 const upgraded=fixture(upgradeData,new Map(),'v4');upgraded.online(false);
 for(const candidate of [{moves:30,timeMs:40,version:'v3'},{moves:30,timeMs:40,version:'v4',rankingEligible:false},{moves:30,timeMs:40,version:'v4',scoreSpecVersion:'v3'}])assert.equal(upgraded.queue.recordClear(1,'existing',candidate),false);
 assert.equal(upgraded.queue.recordClear(1,'daily',{moves:30,timeMs:40,version:'v4'}),false);
 assert(upgraded.queue.recordClear(1,'existing',{moves:30,timeMs:40,version:'v4',scoreSpecVersion:'v4',appVersion:'0.4.49'}));await upgraded.queue.flush();
 const resumed=fixture(upgradeData,new Map(),'v4');await resumed.queue.flush();
 assert.deepEqual(resumed.calls.scores.map(e=>e.board),['v1_existing_1','v2_existing_1','v3_existing_1','v4_existing_1']);
 assert.deepEqual(resumed.calls.scores.slice(0,3).map(e=>e.score),entries.slice(0,3).map(e=>e.score));
 assert.deepEqual(JSON.parse(upgradeData.get(SYNC_KEY)).events,entries.slice(3));assert.equal(JSON.parse(upgradeData.get(SYNC_KEY)).activatedAt,42);assert.equal(upgradeData.get('ascent.pending-scores.v1'),oldQueue);assert.equal(resumed.queue.report().freshPending,0);assert.equal(resumed.queue.report().retainedEvents,4);
 const existingProfile=fixture(new Map(),new Map([['profile',{...profile,name:'Existing remote name'}]]),'v4');existingProfile.queue.queueProfile(profile);await existingProfile.queue.flush();assert.equal(existingProfile.remote.get('profile').name,'Existing remote name');assert.equal(JSON.parse(existingProfile.data.get(SYNC_KEY)).name,'Existing remote name');
 existingProfile.online(false);existingProfile.queue.profileEdited({...profile,name:'Explicit offline rename'},true);existingProfile.queue.profileEdited({...profile,colors:['#445566']},false);await existingProfile.queue.flush();assert.equal(JSON.parse(existingProfile.data.get(SYNC_KEY)).profile.nameChanged,true);
 const nameRestart=fixture(existingProfile.data,existingProfile.remote,'v4');await nameRestart.queue.flush();assert.equal(nameRestart.remote.get('profile').name,'Explicit offline rename');
 const presentationEvents=[null,{}, {board:'v4_existing_9'}, {sequence:1,board:'v3_existing_9',score:{moves:2,timeMs:2,scoreSpecVersion:'v3'}}, {sequence:2,board:'v4_existing_10',score:{moves:2,timeMs:2,rankingEligible:false}}];
 const presentationData=new Map([[SYNC_KEY,JSON.stringify({version:1,owner:'existing-owner',sequence:2,name:'Saved',profile:null,events:presentationEvents})]]);
 const presentation=fixture(presentationData,new Map(),'v4');assert.equal(presentation.queue.pendingForBoard('v4_existing_9'),false);assert.equal(presentation.queue.pendingForBoard('v4_existing_10'),false);assert.equal(presentation.queue.pendingForBoard('v3_existing_9'),true);assert.equal(presentation.queue.report().freshPending,1);assert.equal(presentation.queue.report().retainedEvents,4);
 await presentation.queue.flush();assert.equal(presentation.queue.pendingForBoard('v3_existing_9'),false);assert.deepEqual(JSON.parse(presentationData.get(SYNC_KEY)).events,presentationEvents.filter((_,i)=>i!==3));
 const malformed=JSON.stringify({version:1,owner:'existing-owner',sequence:0,name:'Saved',events:{}});const malformedData=new Map([[SYNC_KEY,malformed]]);const blocked=fixture(malformedData,new Map(),'v4');await blocked.queue.flush();assert.equal(malformedData.get(SYNC_KEY),malformed);assert.equal(blocked.calls.scores.length,0);assert.equal(blocked.queue.report().syncError,'native-sync/invalid-ledger');
 // Retain an old queued profile without relabeling it or blocking current score delivery.
 const oldProfile={...profile,reachedLevel:900};delete oldProfile.progressVersion;
 const pendingLegacy={version:1,owner:'existing-owner',activatedAt:42,sequence:2,name:'Saved name',profile:{revision:1,value:oldProfile,nameChanged:false},events:[{sequence:2,board:'v4_existing_1',score:{moves:10,timeMs:20,scoreSpecVersion:'v4'}}]};
 const pendingData=new Map([[SYNC_KEY,JSON.stringify(pendingLegacy)]]),pending=fixture(pendingData,new Map(),'v4');
 assert(pending.queue.report().retainedProfile);assert.equal(pending.queue.report().profilePending,false);
 await pending.queue.flush();assert.equal(pending.calls.profiles.length,0);assert.equal(pending.calls.scores.length,1);assert.deepEqual(JSON.parse(pendingData.get(SYNC_KEY)).profile,pendingLegacy.profile);
 assert.equal(pending.queue.queueProfile(oldProfile),false);assert.equal(pending.calls.profiles.length,0);
 pending.queue.queueProfile(profile);await pending.queue.flush();assert.equal(pending.calls.profiles.length,1);assert.equal(pending.calls.profiles[0].reachedLevel,2);assert.equal(pending.calls.profiles[0].progressVersion,'v4');assert.equal(pending.queue.report().retainedProfile,false);
 // Current v5 queues retain v4 scores with original provenance and v4 profile generation.
 const v5Data=new Map([[SYNC_KEY,JSON.stringify({version:1,owner:'existing-owner',activatedAt:42,sequence:1,name:'Saved',profile:null,events:[{sequence:1,board:'v4_existing_1',score:{moves:8,timeMs:9,scoreSpecVersion:'v4'}}]})]]);
 const v5=fixture(v5Data,new Map(),'v5');v5.online(false);
 assert.equal(v5.queue.recordClear(1,'existing',{moves:1,timeMs:1,version:'v4',scoreSpecVersion:'v4'}),false);
 assert(v5.queue.recordClear(1,'existing',{moves:20,timeMs:30,version:'v5',scoreSpecVersion:'v5'}));
 v5.queue.queueProfile(profile);await v5.queue.flush();v5.online(true);await v5.queue.flush();
 assert.deepEqual(v5.calls.scores.map(x=>x.board),['v4_existing_1','v5_existing_1']);
 assert.deepEqual(v5.calls.scores.map(x=>x.score.scoreSpecVersion),['v4','v5']);
 assert.equal(v5.calls.profiles[0].progressVersion,'v4');
 console.log('PASS automatic queue: persistent activation boundary; historical queues/best never imported; worse fresh result sent; offline/restart recovery; duplicate suppression; real names preserved; v4 mixed-history/assisted exclusions; concurrent profile edits; corrupt storage fail-stop');
})().catch(e=>{console.error(e);process.exitCode=1;});
