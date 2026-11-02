'use strict';
// In-memory only: exercise the real scoped storage bootstrap and game deletion flow.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n').replaceAll('globalThis.localStorage','ASCENT_FORMAL_STORAGE');
const prefix='ascent.pages-trial.0.4.12.d6.';
const original={'ascent.progress.v1':'{"existing":{"cleared":99}}','ascent.player-uuid.v1':'raw-formal-owner','ascent.transfer-identity.v1':'raw-formal-secret','ascent.account-deletion.v1':'{"uid":"unrelated-raw","phase":"pending"}',otherApplication:'keep','firebase:authUser:fixture':'keep-sdk-auth'};
const values=new Map(Object.entries(original));
for(const [key,value]of Object.entries({'ascent.progress.v1':'{"existing":{"cleared":20}}','ascent.heart-items.v1':'7','ascent.ad-plays.v1':'2','ascent.ad-plays.v2':'1','ascent.formal-debug-seed.v1':'10','ascent.transfer-identity.v1':'{"uid":"owner"}'}))values.set(prefix+key,value);
const raw={get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
let reloads=0;
const host={localStorage:raw,location:{reload(){reloads++;}}};
// Bootstrap path is the artifact's actual implementation, not a test reimplementation.
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/pages-storage.js'),'utf8'),host);
const scoped=host.ASCENT_FORMAL_STORAGE;
assert.equal(scoped.physicalKey('ascent.progress.v1'),prefix+'ascent.progress.v1');
const env=`const elements={},events={};const document={getElementById(id){return elements[id] ||= {style:{setProperty(){}},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},events:{},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};const window={addEventListener(k,f){events[k]=f;},devicePixelRatio:1};function requestAnimationFrame(){}`;
(async()=>{
await new Function('assert','globalThis','ASCENT_FORMAL_STORAGE','raw',env+source+`;return (async()=>{
 const calls=[];let fail=true;
 online.uid='owner';online.ready=true;state='map';settingsOpen=true;debugMode=true;
 online.adapter={async authenticate(create){calls.push('authenticate:'+create);return {uid:'owner'};},async lockDeletion(uid){assert.equal(uid,'owner');calls.push('lock');},async deleteAccount(uid){assert.equal(uid,'owner');calls.push('delete');if(fail)throw {code:'permission-denied'};}};
 assert.equal(accountDeletion.marker,null,'Unrelated raw deletion marker is outside this save scope');
 showDeleteUserDialog();deleteUserElement('deleteUserCancel').onclick();assert.equal(calls.length,0,'Cancellation has no destructive effects');
 await deleteCurrentAccount();assert.equal(accountDeletion.marker.phase,'pending');assert.equal(calls.filter(x=>x==='delete').length,1);
 assert.equal(ASCENT_FORMAL_STORAGE.getItem(PROGRESS_KEY),'{"existing":{"cleared":20}}','Failed server deletion preserves gameplay save');
 assert(!online.ready);assert(deleteUserElement('deleteUserStatus').textContent.includes('削除が完了していません'));
 await startOnline(online.adapter);assert.equal(calls.at(-1),'authenticate:false','Pending resume never makes a new anonymous account');assert.equal(calls.filter(x=>x==='delete').length,1,'Notice/resume does not automatically retry deletion');
 fail=false;await deleteCurrentAccount();assert.equal(accountDeletion.marker.phase,'done');
 for(const key of [PROGRESS_KEY,HEART_ITEMS_KEY,ONLINE_SCORES_KEY,'ascent.transfer-identity.v1','ascent.ad-plays.v1','ascent.ad-plays.v2','ascent.formal-debug-seed.v1'])assert.equal(ASCENT_FORMAL_STORAGE.getItem(key),null,key);
 const doneCalls=calls.length;await startOnline(online.adapter);resumeOnline();assert.equal(calls.length,doneCalls,'Done does not authenticate or retry');
 assert.equal(JSON.parse(ASCENT_FORMAL_STORAGE.getItem(ACCOUNT_DELETION_KEY)).phase,'done');
 // Browser events carry physical keys. Ignore raw/other-scope and wrong UID events.
 accountDeletion.marker=null;online.uid='owner';online.ready=true;
 events.storage({key:ACCOUNT_DELETION_KEY,newValue:'changed'});assert.equal(accountDeletion.marker,null);assert.equal(online.ready,true);
 ASCENT_FORMAL_STORAGE.setItem(ACCOUNT_DELETION_KEY,JSON.stringify({uid:'other',phase:'pending'}));
 events.storage({key:ASCENT_FORMAL_STORAGE.physicalKey(ACCOUNT_DELETION_KEY),newValue:'changed'});assert.equal(accountDeletion.marker,null);
 ASCENT_FORMAL_STORAGE.setItem(ACCOUNT_DELETION_KEY,JSON.stringify({uid:'owner',phase:'pending'}));
 events.storage({key:ASCENT_FORMAL_STORAGE.physicalKey(ACCOUNT_DELETION_KEY),newValue:'changed'});assert.equal(accountDeletion.marker.phase,'pending');assert.equal(online.ready,false);
 online.dirty=true;onlineScores.pending.set('test',{});onlineScores.boards.set('test',{});online.pages.set('test',{});
 ASCENT_FORMAL_STORAGE.setItem(ACCOUNT_DELETION_KEY,JSON.stringify({uid:'owner',phase:'done'}));
 events.storage({key:ASCENT_FORMAL_STORAGE.physicalKey(ACCOUNT_DELETION_KEY),newValue:'changed'});
 assert.equal(accountDeletion.marker.phase,'done');assert.equal(online.dirty,false);assert.equal(onlineScores.pending.size,0);assert.equal(onlineScores.boards.size,0);assert.equal(online.pages.size,0);assert(deleteUserElement('deleteUserDialog').open);
 assert.equal(calls.length,doneCalls,'Storage notices never perform server deletion');
 deleteUserElement('deleteUserNew').onclick();assert.equal(accountDeletion.marker,null);assert.equal(ASCENT_FORMAL_STORAGE.getItem(ACCOUNT_DELETION_KEY),null);
})();`)(assert,host,scoped,raw);
assert.equal(reloads,1);
// A real fresh runtime (not only an in-memory marker) restores interrupted status.
for(const phase of ['pending','done']){
 scoped.setItem('ascent.account-deletion.v1',JSON.stringify({uid:'owner',phase}));
 await new Function('assert','globalThis','ASCENT_FORMAL_STORAGE','phase',env+source+`;return (async()=>{
  assert.equal(accountDeletion.marker.phase,phase);const calls=[];
  const adapter={async authenticate(create){calls.push('authenticate:'+create);return {uid:'owner'};},async deleteAccount(){calls.push('delete');},async lockDeletion(){calls.push('lock');}};
  await startOnline(adapter);
  assert.deepEqual(calls,phase==='pending'?['authenticate:false']:[],'Reload only restores original authentication for a pending notice');
  assert.equal(accountDeletion.marker.phase,phase);assert.equal(online.ready,false);
 })();`)(assert,host,scoped,phase);
}
for(const [k,v]of Object.entries(original))assert.equal(raw.getItem(k),v,`Unrelated raw source unchanged: ${k}`);
console.log('PASS scoped Pages deletion: physical events, raw-save isolation, cancel, failure notice/retry, no automatic auth/deletion, done and explicit restart');
})().catch(error=>{console.error(error);process.exitCode=1;});
