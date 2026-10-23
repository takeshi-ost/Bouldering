const assert=require('node:assert/strict'),fs=require('node:fs');
const source=[...fs.readFileSync('index.html','utf8').matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},events:{},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};let reloads=0;const window={addEventListener(){},devicePixelRatio:1,location:{reload(){reloads++;}}};function requestAnimationFrame(){};`;
const data={anotherApp:'keep'},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]};
const scope={localStorage:storage,crypto:require('node:crypto').webcrypto};
(async()=>{
 await new Function('assert','data','storage','globalThis',env+source+`;return (async()=>{
 let currentUid='source-uid',prepared=0,syncs=0,authentications=0,failAuth=false;
 const identities=new Map();
 online.adapter={authenticate:async()=>{authentications++;return {uid:currentUid};},sync:async(uid,p)=>{assert(!transferBusy(),'Cloud write during identity transfer');syncs++;return p;},players:async()=>[],
  async prepareTransferIdentity(identity){assert.equal(identity.uid,currentUid);prepared++;const saved=identities.get(identity.email);if(saved)assert.equal(identity.password,saved.password);identities.set(identity.email,{...identity});},
  async importTransferIdentity(identity,apply){const before=currentUid;try {
   const known=identities.get(identity.email);if(failAuth || !known || known.password!==identity.password || known.uid!==identity.uid)throw Error('UID/auth mismatch');
   currentUid=known.uid;await apply();
  }catch(error){currentUid=before;throw error;}}
 };
 online.uid=currentUid;online.ready=true;online.dirty=false;updateTitleUid();assert.equal(ui.playerUuid.textContent,'UID source-uid');
 ui.titleTransfer.onclick({stopPropagation(){}});titleReady=true;enterPreparedMap();assert.equal(state,'choosing');assert(transferElement('transferDialog').open);
 playerName='引き継ぎ';playerColors=['#123456','#abcdef'];playerHeadColor='#ffffff';
 stageProgress={existing:{cleared:23},prototype:{cleared:4}};
 stageRecords={existing:{23:{moves:23,timeMs:5678,stars:3,version:COURSE_VERSION}},prototype:{}};
 heartItems=9;lives={count:2,recoveryAt:Date.now()-1000,inProgress:false};
 dailyRecords={'2026-10-23':{moves:10,timeMs:1000,stars:3,clearedOn:'2026-10-23',rewardStatus:'claimed'}};
 dailyAttempts={'2026-10-23':2};dailyPlayAdState={plays:1,adPaid:true};
 mapRewards={4:{status:'claimed',adRequired:false,adCompleted:false}};
 featureHelpSeen={heart:true,hazard:true};soundEnabled=false;playsSinceAd=2;
 onlineScores.pending.set(scoreBoardKey(23,'existing'),{moves:23,timeMs:5678});
 online.saving=true;const inFlight=exportTransferFile();await Promise.resolve();assert(transferBusy());assert.equal(prepared,0);resumeOnline();await startOnline(online.adapter);assert.equal(authentications,0,'Focus/online events must not reconnect during transfer');online.saving=false;
 const exported=await inFlight;assert.equal(prepared,1);assert.equal(exported.identity.uid,'source-uid');
 assert.equal(exported.data.heartItems,9);assert.equal(exported.data.lives.inProgress,false);
 assert.equal(exported.data.dailyRecords['2026-10-23'].clearedOn,'2026-10-23');assert.equal(data.anotherApp,'keep');
 assert.deepEqual(validateTransferFile(JSON.parse(JSON.stringify(exported))),exported);
 const again=await exportTransferFile();assert.deepEqual(again.identity,exported.identity,'Re-export must preserve working credentials');
 for(const mutate of [f=>f.identity.project='other',f=>f.data.heartItems=-1,f=>f.data.lives.count=6,
  f=>f.data.records.existing[23].timeMs=-1,f=>f.data.dailyRecords['2026-10-23'].clearedOn='bad',
  f=>f.data.pendingScores=[['bad',{moves:1,timeMs:0}]]]) {
  const bad=JSON.parse(JSON.stringify(exported));mutate(bad);assert.throws(()=>validateTransferFile(bad));
 }
 assert(transferErrorMessage({code:'auth/operation-not-allowed'}).includes('メール／パスワード'));
 closeTransferDialog();assert(!transferElement('transferDialog').open);
 // Destination's unrelated data and existing game save survive rejected files/auth.
 currentUid='destination-uid';online.uid=currentUid;online.dirty=false;
 storage.setItem(PROGRESS_KEY,JSON.stringify({existing:{cleared:1},prototype:{cleared:0}}));
 const original=JSON.stringify(data);failAuth=true;
 await assert.rejects(importTransferFile(exported),/mismatch/);failAuth=false;
 assert.equal(JSON.stringify(data),original);assert.equal(currentUid,'destination-uid');assert.equal(online.uid,'destination-uid');
 const wrongUid=JSON.parse(JSON.stringify(exported));wrongUid.identity.uid='wrong-uid';
 await assert.rejects(importTransferFile(wrongUid),/mismatch/);assert.equal(JSON.stringify(data),original);
 // Quota/storage errors roll back local game keys AND the authenticated identity.
 const write=storage.setItem;let failWrite=true;
 storage.setItem=(key,value)=>{if(key===HEART_ITEMS_KEY && failWrite){failWrite=false;throw Error('quota');}write(key,value);};
 await assert.rejects(importTransferFile(exported),/元のデータ/);storage.setItem=write;
 assert.deepEqual(JSON.parse(JSON.stringify(data)),JSON.parse(original));assert.equal(currentUid,'destination-uid');assert.equal(online.uid,'destination-uid');
 await importTransferFile(exported);
 assert.equal(currentUid,'source-uid');assert.equal(online.uid,'source-uid');assert(transferState.pendingReload);assert(!online.ready);assert.equal(reloads,1);
 assert.deepEqual(readStageProgress(),exported.data.progress);assert.deepEqual(readStageRecords(),exported.data.records);
 assert.deepEqual(readAppearance(),{colors:exported.data.profile.colors,headColor:exported.data.profile.headColor});
 assert.equal(readHeartItems(),9);assert.deepEqual(readDailyRecords(),exported.data.dailyRecords);
 assert.deepEqual(readMapRewards(),exported.data.mapRewards);assert.deepEqual(readTransferIdentity(),exported.identity);
 assert.equal(JSON.parse(storage.getItem(ONLINE_SCORES_KEY)).uid,'source-uid');assert.equal(storage.getItem(ONLINE_PROFILE_KEY),null);assert.equal(data.anotherApp,'keep');
 assert.equal(ui.playerUuid.textContent,'UID source-uid');online.uid=null;updateTitleUid();assert.equal(ui.playerUuid.textContent,'UID source-uid','Known imported UID must be visible before auth reconnects');assert.equal(syncs,0);
 console.log('PASS transfer: same-UID credential export/re-export, complete game snapshot and medals/rewards, file validation, UID mismatch rejection, auth+storage rollback, unrelated storage preservation, reload with cloud writes suspended');
 })();`)(assert,data,storage,scope);
})().catch(error=>{console.error(error);process.exitCode=1;});
