const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`const elements={};const events={};const document={getElementById(id){return elements[id] ||= {
 style:{setProperty(){}},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},events:{},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(k,f){events[k]=f;},devicePixelRatio:1};function requestAnimationFrame(){}`;
const data={otherApplication:'keep'},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v,removeItem:k=>delete data[k]};
let reloads=0;
(async()=>{
await new Function('assert','data','globalThis',env+source+`;return (async()=>{
const tick=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
const calls=[];let fail=true,releaseSave;
online.uid='owner';online.ready=true;online.adapter={
 async authenticate(create){calls.push('authenticate:'+create);return {uid:'owner'};},
 async sync(uid,profile){return new Promise(resolve=>releaseSave=()=>resolve(profile));},
 async lockDeletion(uid){assert.equal(uid,'owner');calls.push('lock');},
 async deleteAccount(uid,progress){assert.equal(uid,'owner');assert(!online.saving && !onlineScores.saving);calls.push('delete');progress(2);if(fail)throw {code:'permission-denied'};}
};
state='map';settingsOpen=true;debugMode=false;updateDeleteUserButton();assert(deleteUserElement('debugDeleteUser').hidden);
deleteUserElement('debugDeleteUser').onclick();assert(!deleteUserElement('deleteUserDialog').open);
debugMode=true;updateDeleteUserButton();assert(!deleteUserElement('debugDeleteUser').hidden && !deleteUserElement('debugDeleteUser').disabled);
deleteUserElement('debugDeleteUser').onclick();assert(deleteUserElement('deleteUserDialog').open);assert(deleteUserElement('deleteUserSummary').textContent.includes('UID: owner'));
deleteUserElement('deleteUserCancel').onclick();assert(!deleteUserElement('deleteUserDialog').open);assert.equal(calls.length,0,'Cancel performs no deletion');assert(!accountDeletion.marker);
// Wait for a profile request already in flight; its result must never recreate local data.
online.dirty=true;const save=flushOnlineProfile();const checkpoint=data[ONLINE_PROFILE_KEY];
deleteUserElement('debugDeleteUser').onclick();const deletion=deleteCurrentAccount();await tick();
assert.equal(accountDeletion.marker.phase,'pending');assert(!online.ready && accountDeletion.busy);
assert.equal(queueOnlineScore(1,'existing',{moves:1,timeMs:1}),false);const revision=online.revision;queueOnlineProfileSave();assert.equal(online.revision,revision);
let blocked=false;deleteUserElement('deleteUserDialog').events.cancel({preventDefault(){blocked=true;}});assert(blocked);
releaseSave();await save;await deletion;
assert.deepEqual(calls,['lock','delete']);assert.equal(data[ONLINE_PROFILE_KEY],checkpoint,'Delayed profile result must not save its checkpoint');
assert.equal(accountDeletion.marker.phase,'pending');assert.equal(online.uid,'owner');assert(!accountDeletion.busy);assert(deleteUserElement('deleteUserStatus').textContent.includes('削除が完了していません'));
const count=calls.length;resumeOnline();await startOnline(online.adapter);assert.equal(calls[count],'authenticate:false','Resume must not create an anonymous user');assert.equal(calls.filter(x=>x==='delete').length,1,'No destructive retry without another click');
// Successful retry cleans only this game's keys and leaves a persistent done marker.
fail=false;await deleteCurrentAccount();assert.equal(accountDeletion.marker.phase,'done');assert.equal(online.uid,null);
assert.equal(data[PLAYER_NAME_KEY],undefined);assert.equal(data[PROGRESS_KEY],undefined);assert.equal(data[ONLINE_SCORES_KEY],undefined);assert.equal(data.otherApplication,'keep');
assert.equal(JSON.parse(data[ACCOUNT_DELETION_KEY]).phase,'done');assert(deleteUserElement('deleteUserConfirm').hidden);assert(!deleteUserElement('deleteUserNew').hidden);assert(deleteUserElement('deleteUserCancel').hidden);
const doneCalls=calls.length;resumeOnline();await startOnline(online.adapter);await tick();assert.equal(calls.length,doneCalls,'Done identity must never authenticate/create/save automatically');
blocked=false;deleteUserElement('deleteUserDialog').events.cancel({preventDefault(){blocked=true;}});assert(blocked);
// Deliberate new-user action is the only exit that clears the guard and reloads.
deleteUserElement('deleteUserNew').onclick();assert.equal(accountDeletion.marker,null);assert.equal(data[ACCOUNT_DELETION_KEY],undefined);
// Missing original auth must not be replaced by another anonymous account.
markAccountDeletion('lost-user','pending');online.uid=null;let createOption;
await restoreDeletionSession({async authenticate(create){createOption=create;return null;}});assert.equal(createOption,false);assert.equal(online.uid,null);assert.equal(accountDeletion.marker.uid,'lost-user');
console.log('PASS debug self-deletion: debug-only entry, target UID/confirmation/cancel, in-flight save fence, blocked queues, failure/retry, no automatic auth, scoped local cleanup, done guard, explicit restart and missing-auth recovery');
})();`)(assert,data,{localStorage:storage,location:{reload(){reloads++;}}});
assert.equal(reloads,1);
})().catch(e=>{console.error(e);process.exitCode=1;});
