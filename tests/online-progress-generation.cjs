'use strict';
// Real Web bootstrap/profile/Firestore-adapter code, synthetic in-memory SDK.
// No network, real account, production writes, browser or device is used.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
let client=read('js/firebase-client.js');
client=client.slice(0,client.indexOf("window.addEventListener('online'"));
client=client.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/12\.11\.0\/firebase-(app|auth|firestore)\.js'\)/g,(_,name)=>`Promise.resolve(sdk.${name})`);
const profile=(extra={})=>({name:'Old cloud name',colors:['#abcdef'],headColor:'#aabbcc',reachedLevel:31,reachedPrototypeLevel:70,...extra});
function harness(remote=profile()) {
 const docs=new Map(remote?[['players/synthetic-owner',remote]]:[]),storage=new Map();
 const calls={authCreates:0,writes:[],queries:[]};let fail=false;
 const auth={currentUser:{uid:'synthetic-owner'},authStateReady:async()=>{}};
 const snapshot=id=>({exists:()=>docs.has(id),data:()=>docs.get(id)});
 const sdk={app:{getApps:()=>[],initializeApp:()=>({})},auth:{getAuth:()=>auth,browserLocalPersistence:'persist',setPersistence:async()=>{},signInAnonymously:async()=>{calls.authCreates++;throw Error('unexpected creation');}},firestore:{
  getFirestore:()=>({}),doc:(db,...parts)=>parts.join('/'),collection:(db,...parts)=>parts.join('/'),serverTimestamp:()=>123,
  getDocFromServer:async id=>snapshot(id),
  runTransaction:async(db,fn)=>{if(fail)throw {code:'unavailable'};return fn({get:async id=>snapshot(id),set:(id,data)=>{calls.writes.push({id,data});docs.set(id,data);}});},
  where:(field,op,value)=>({field,op,value}),limit:n=>({limit:n}),query:(...parts)=>parts,
  getDocs:async q=>{calls.queries.push(q);const filters=q.slice(1).filter(x=>x.field);return {docs:[...docs].filter(([id,v])=>id.startsWith(q[0]+'/')&&filters.every(f=>v[f.field]===f.value)).slice(0,q.at(-1).limit).map(([id,data])=>({id:id.split('/').at(-1),data:()=>data}))};}
 }};
 const context=vm.createContext({console:{warn(){}},sdk,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
 vm.runInContext(`const ui={playerUuid:{}},document={getElementById:()=>({})},window={addEventListener(){}};
 function gameText(k){return k;}function normalizedPlayerName(n){return n||'';}function validBodyColor(c){return /^#[0-9a-f]{6}$/i.test(c);}
 let playerName='Trial name',playerColors=['#112233'],playerHeadColor='#445566',state='playing',courseMode='existing';
 const stageProgress={existing:{cleared:20},prototype:{cleared:0}},accountDeletion={marker:false},PROGRESS_KEY='ascent.progress.v1';
 function savePlayerName(){}function saveAppearance(){}function updateMapAppearance(){}function connectOnlineScores(){}function renderMapPlayers(){}
 `+read('js/score-metadata.js')+read('js/online.js')+client,context);
 return {context,docs,calls,storage,fail:v=>fail=v,run:s=>vm.runInContext(s,context),result:()=>JSON.parse(vm.runInContext('JSON.stringify({uid:online.uid,name:playerName,colors:playerColors,progress:stageProgress,dirty:online.dirty})',context))};
}
(async()=>{
 // Initial adoption keeps trial name/colors/progress, reuses UID, replaces no scores.
 const x=harness();x.docs.set('stageScores/v1_existing_31/entries/synthetic-owner',{moves:1,timeMs:1});
 await x.run('bootFirebase()');assert.equal(x.result().uid,'synthetic-owner');assert.equal(x.calls.authCreates,0);
 assert.equal(x.result().progress.existing.cleared,20);assert.equal(x.result().progress.prototype.cleared,0);
 assert.equal(x.result().name,'Trial name');assert.deepEqual(x.result().colors,['#112233']);
 let saved=x.docs.get('players/synthetic-owner');assert.equal(saved.reachedLevel,21);assert.equal(saved.reachedPrototypeLevel,1);assert.equal(saved.progressVersion,'v4');
 assert.equal(x.docs.get('stageScores/v1_existing_31/entries/synthetic-owner').moves,1);
 assert.equal(x.calls.writes.length,1);assert.equal(x.calls.writes[0].id,'players/synthetic-owner');
 // A canonical profile key is stable after parser readback, avoiding repeat writes.
 await x.run('online.ready=false;startOnline(online.adapter)');assert.equal(x.calls.writes.length,1);
 x.docs.set('players/synthetic-owner',{...saved,name:'Same generation remote edit'});
 await x.run('online.ready=false;startOnline(online.adapter)');assert.equal(x.result().name,'Same generation remote edit');assert.equal(x.calls.writes.length,1);
 console.log('PASS legacy adoption: trial progress/appearance + same UID, no score deletion, stable checkpoint/no repeat write');
 // A clear after adoption and subsequent reconnect cannot merge a legacy high value.
 x.docs.set('players/synthetic-owner',profile({reachedLevel:999}));
 await x.run('stageProgress.existing.cleared=21;queueOnlineProfileSave();flushOnlineProfile()');
 // queueOnlineProfileSave starts an asynchronous flush; wait for its transaction.
 for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(x.result().progress.existing.cleared,21);assert.equal(x.docs.get('players/synthetic-owner').reachedLevel,22);
 x.run("applyOnlineProfile({name:'Legacy',colors:['#112233'],headColor:'#445566',reachedLevel:500,reachedPrototypeLevel:500},true)");assert.equal(x.result().progress.existing.cleared,21);
 console.log('PASS clear/retry and defensive readback cannot reimport unversioned progress');
 // A temporarily rejected write leaves local play intact; next retry uses latest local.
 const failed=harness();failed.fail(true);await failed.run('bootFirebase()');assert(failed.result().dirty);assert.equal(failed.result().progress.existing.cleared,20);assert.equal(failed.calls.writes.length,0);
 failed.run('stageProgress.existing.cleared=22');failed.fail(false);await failed.run('flushOnlineProfile()');assert.equal(failed.docs.get('players/synthetic-owner').reachedLevel,23);assert.equal(failed.result().progress.existing.cleared,22);
 console.log('PASS failed initial write and offline clear retry retain current progress');
 // Same generation still synchronizes maximum values in either direction.
 for(const [remoteReached,expected] of [[31,30],[5,20]]){const h=harness(profile({progressVersion:'v4',reachedLevel:remoteReached,reachedPrototypeLevel:1}));await h.run('bootFirebase()');assert.equal(h.result().progress.existing.cleared,expected);assert.equal(h.docs.get('players/synthetic-owner').reachedLevel,expected+1);}
 const resumed=harness(profile({progressVersion:'v4',reachedPrototypeLevel:1}));resumed.run("localStorage.setItem(ONLINE_PROFILE_KEY,JSON.stringify({uid:'synthetic-owner',key:onlineProfileKey(onlineProfile())}))");await resumed.run('bootFirebase()');assert.equal(resumed.result().name,'Old cloud name');assert.equal(resumed.result().progress.existing.cleared,30);
 console.log('PASS same-generation max sync and known-checkpoint appearance restore');
 // Server query excludes legacy rows before limit(6); UI also independently filters.
 for(let i=0;i<8;i++)x.docs.set('players/legacy-'+i,profile({reachedLevel:2}));
 x.docs.set('players/current',profile({progressVersion:'v4',reachedLevel:2}));
 const rows=await x.run("online.adapter.players(2,2,'existing')");assert.equal(JSON.stringify(rows.map(r=>r.id)),JSON.stringify(['current']));
 assert(x.calls.queries.at(-1).some(q=>q.field==='progressVersion'&&q.value==='v4'));
 x.run("online.pages.clear();online.adapter.players=async()=>[{id:'legacy',name:'Old',colors:['#112233'],headColor:'#445566',reachedLevel:2,reachedPrototypeLevel:1},{id:'current',name:'Now',colors:['#112233'],headColor:'#445566',reachedLevel:2,reachedPrototypeLevel:1,progressVersion:'v4'}];onlineMapPlayers(1,20,'existing')");
 for(let i=0;i<30;i++)await Promise.resolve();assert.equal(x.run("onlineMapPlayers(1,20,'existing').length"),1);assert.equal(x.run("onlineMapPlayers(1,20,'existing')[0].id"),'current');
 console.log('PASS current-generation map query limit and independent display guard');
 const future=harness(profile({progressVersion:'v5'}));await future.run('bootFirebase()');assert.equal(future.calls.writes.length,0);assert.equal(future.result().progress.existing.cleared,20);assert(future.result().dirty);
 console.log('PASS unknown generation fails safely without replacing stored profile');
})().catch(e=>{console.error(e);process.exitCode=1});
