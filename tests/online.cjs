const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{setProperty(k,v){this[k]=v;}},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const events={};const window={addEventListener(k,f){events[k]=f;},devicePixelRatio:1};function requestAnimationFrame(){}
`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
(async()=>{try {
await new Function('assert','data',env+source+`;return (async()=>{
const tick=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
assert.deepEqual(currentMapPlayers(1,20,'existing'),[],'No dummy map players while offline');
let remote=null,writes=0,queries=0,fail=false;
const adapter={authenticate:async()=>({uid:'test-owner'}),async sync(uid,local,preferLocal){
 assert.equal(uid,'test-owner');if(fail)throw {code:'unavailable'};
 const result=mergeOnlineProfile(local,remote,preferLocal);remote=JSON.parse(JSON.stringify(result));writes++;return result;
},async players(){queries++;return [];}};
playerName='最初の名前';playerColors=['#112233','#abcdef'];playerHeadColor='#d1ad53';stageProgress.existing.cleared=6;
const local=onlineProfile();await startOnline(adapter);
assert(online.ready);assert.deepEqual(remote,local,'First auth migrates local appearance and progress');
assert.equal(ui.playerUuid.textContent,'UID test-owner');assert.equal(JSON.parse(data[ONLINE_PROFILE_KEY]).uid,'test-owner');
assert.equal(online.status,'オンラインに保存済み');
// Simulate a clean reload with the same authenticated identity: restore server data.
online.ready=false;remote={...remote,name:'クラウド',colors:['#556677'],reachedLevel:10};await startOnline(adapter);
assert.equal(playerName,'クラウド');assert.deepEqual(playerColors,['#556677']);assert.equal(stageProgress.existing.cleared,9);
assert.equal(JSON.parse(data[PLAYER_NAME_KEY]),'クラウド');
// Pending local edits and progress survive a failed save and reconnect/reload.
fail=true;playerName='オフライン';stageProgress.existing.cleared=12;queueOnlineProfileSave();await tick();
assert(online.dirty);assert.equal(remote.name,'クラウド');assert.equal(playerName,'オフライン');
fail=false;online.ready=false;await startOnline(adapter);
assert.equal(remote.name,'オフライン');assert.equal(remote.reachedLevel,13);assert(!online.dirty);
// A concurrent server progress update never moves this player backwards.
remote.reachedLevel=30;playerHeadColor='#223344';queueOnlineProfileSave();await tick();
assert.equal(stageProgress.existing.cleared,29);assert.equal(remote.reachedLevel,30);
// Editing/clearing during an in-flight save triggers a subsequent save, not rollback.
let release;const normalSync=adapter.sync;adapter.sync=async(uid,profile,preferLocal)=>{
 await new Promise(resolve=>release=resolve);return normalSync(uid,profile,preferLocal);
};
playerName='途中A';queueOnlineProfileSave();assert(online.saving);
playerName='途中B';stageProgress.existing.cleared=32;queueOnlineProfileSave();release();await tick();
assert.equal(playerName,'途中B');assert(online.saving);release();await tick();assert.equal(remote.name,'途中B');assert.equal(remote.reachedLevel,33);assert(!online.dirty);
adapter.sync=normalSync;
// The editor's unconfirmed draft remains intact during initial profile restoration.
state='map';assert(showCharacterEditor());const draft=[...draftColors];online.ready=false;remote={...remote,name:'遠隔',colors:['#bb555b']};
await startOnline(adapter);assert.deepEqual(draftColors,draft);assert.equal(playerName,'途中B');assert.equal(remote.name,'途中B');ui.editorCancel.onclick();
// Validate hostile/corrupt public data before generating any SVG/HTML.
assert.equal(onlineProfileFrom({...remote,colors:['<script>']}),null);
assert.equal(onlineProfileFrom({...remote,reachedLevel:1.2}),null);
assert.equal(onlineProfileFrom({...remote,reachedLevel:0}),null);
assert.equal(onlineProfileFrom({...remote,headColor:'red'}),null);
assert(onlineProfileFrom({...remote,colors:Array(8).fill('#123456')}));
assert.equal(onlineProfileFrom({...remote,colors:Array(9).fill('#123456')}),null);
// A page requests once, caches repeated renders, excludes self, caps each level.
online.pages.clear();let resolveRows;adapter.players=async()=>{queries++;return new Promise(r=>resolveRows=r);};
mapPage=0;courseMode='existing';state='map';
const before=queries;currentMapPlayers(1,20,'existing');currentMapPlayers(1,20,'existing');assert.equal(queries,before+1);
const rows=Array.from({length:9},(_,i)=>({...remote,id:'other-'+i,reachedLevel:2}));
rows.unshift({...remote,id:'test-owner',reachedLevel:2});rows.push({...remote,id:'hostile',colors:['<script>'],reachedLevel:3});
resolveRows(rows);await tick();const players=currentMapPlayers(1,20,'existing');
assert.equal(players.length,5);assert(players.every(p=>p.id!=='test-owner' && p.reachedLevel===2));
assert.deepEqual(players[0].appearance.colors,remote.colors);
assert(scoreAvatar(players[0]).includes(remote.colors[0]));
assert.equal(queries,before+1);assert.equal((ui.mapPlayers.innerHTML.match(/data-player=/g)||[]).length,5);
// A slow previous-page response cannot repaint or reposition the current page.
currentMapPlayers(21,40,'existing');const resolveOld=resolveRows;
mapPage=2;renderLevelMap();const currentMarkup=ui.mapPlayers.innerHTML,position=ui.mapMarker.style.top;
resolveOld([{...remote,id:'old-page',reachedLevel:22}]);await tick();
assert.equal(ui.mapPlayers.innerHTML,currentMarkup);assert.equal(ui.mapMarker.style.top,position);
// Ranking also stays empty while no score adapter/data exists.
assert.equal(currentStageScores(2,'existing',10).length,0);
console.log('PASS online profile migration/restore, UID ownership, pending offline changes, concurrent saves/progress, draft preservation, invalid public data, real map avatars, per-stage caps, bounded cached requests and stale-page isolation');
})();`)(assert,data);
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}})().catch(e=>{console.error(e);process.exitCode=1;});
