'use strict';
const assert=require('node:assert/strict');
const {createNativeAutoSync,SYNC_KEY}=require('../scripts/native-auto-sync.cjs');
function fixture(data=new Map(),remote=new Map()) {
 const calls={profiles:[],scores:[],writes:0,auth:0};let online=true,lost=false,blockProfile;
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const controller={permissions:()=>({automaticSync:true}),authenticate:async o=>{assert.equal(o.createAnonymous,false);calls.auth++;if(!online)throw {code:'auth/network-request-failed'};},
  syncAutomaticProfile:async(uid,p)=>{if(!online)throw {code:'firestore/unavailable'};calls.profiles.push(p);if(blockProfile){const block=blockProfile;blockProfile=null;await block;}remote.set('profile',p);return {written:true};},
  syncFreshScore:async(uid,board,s)=>{if(!online)throw {code:'firestore/unavailable'};calls.scores.push({board,score:s});const old=remote.get(board);if(!old || old.moves>s.moves || (old.moves===s.moves && old.timeMs>s.timeMs)){remote.set(board,s);calls.writes++;}if(lost){lost=false;throw {code:'firestore/unavailable'};}return {written:true};}};
 const queue=createNativeAutoSync({storage,owner:'existing-owner',controller,clock:()=>1000});
 return {queue,data,remote,calls,online:v=>online=v,lose:()=>lost=true,block:p=>blockProfile=p};
}
const profile={name:'local-private-name',colors:['#123456'],headColor:'#abcdef',reachedLevel:2,reachedPrototypeLevel:1};
(async()=>{
 const oldQueue=JSON.stringify({uid:null,items:[['v1_existing_1',{moves:4,timeMs:500}]]});
 const data=new Map([['ascent.pending-scores.v1',oldQueue],['ascent.records.v1','old best: 4 moves']]);
 const h=fixture(data);assert(h.queue.report().boundaryPersisted);assert.equal(h.queue.report().freshPending,0);assert.equal(h.calls.scores.length,0);
 h.queue.recordClear(1,'existing',{moves:12,timeMs:5000,version:'v1'});await h.queue.flush();
 assert.equal(h.calls.scores[0].score.moves,12,'Send actual new clear, even when worse than historical local best');assert.equal(h.remote.get('v1_existing_1').moves,12);
 assert.equal(data.get('ascent.pending-scores.v1'),oldQueue);assert.equal(data.get('ascent.records.v1'),'old best: 4 moves');
 h.queue.queueProfile(profile);await h.queue.flush();assert.equal(h.calls.profiles.at(-1).name,'iOS接続テスト');
 h.queue.profileEdited({...profile,colors:['#112233']},false);await h.queue.flush();assert.equal(h.calls.profiles.at(-1).name,'iOS接続テスト');
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
 const invalid=new Map([[SYNC_KEY,'{"version":1}']]);const safe=fixture(invalid);await safe.queue.flush();assert(safe.queue.report().syncError);assert.equal(safe.calls.scores.length,0);assert.equal(invalid.get(SYNC_KEY),'{"version":1}');
 console.log('PASS automatic queue: persistent activation boundary; historical queues/best never imported; worse fresh result sent; offline/restart recovery; duplicate suppression; safe public name; concurrent profile edits; corrupt storage fail-stop');
})().catch(e=>{console.error(e);process.exitCode=1;});
