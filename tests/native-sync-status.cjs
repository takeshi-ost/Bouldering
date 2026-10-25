'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createNativeSyncStatus}=require('../scripts/native-sync-status.cjs');
const {createNativeAutoSync}=require('../scripts/native-auto-sync.cjs');
const nativeSource=require('../scripts/native-bundle-source.cjs');
const project=fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj','utf8'),scene=fs.readFileSync('ios/App/App/SceneDelegate.swift','utf8');
assert(!project.includes('ASCENT_RELEASE_SYNC_STATUS'),'Temporary Release build setting removed');
assert(scene.includes('let syncStatusAllowed = configuration == \"Debug\"'));
assert(!scene.includes('ASCENTReleaseSyncStatus'));
assert(!fs.readFileSync('ios/App/App/Info.plist','utf8').includes('ASCENTReleaseSyncStatus'));
assert(scene.includes('let syncStatusAllowed = false'));

const elements={},document={getElementById:id=>elements[id]||=( {})};
let policy={configuration:'Release',syncStatusAllowed:false,firebaseEnabled:true,firebaseMode:'auto-sync'},lang='ja';
const presenter=createNativeSyncStatus({document,policy:()=>policy,language:()=>lang});
presenter.update({authenticated:true},{freshPending:0});assert(elements.onlineStatus.hidden && elements.onlineScoreStatus.hidden);
assert.equal(elements.onlineStatus.textContent,'');assert.equal(elements.onlineScoreStatus.textContent,'');
policy={...policy,configuration:'Debug',syncStatusAllowed:true,debugAllowed:false};presenter.refresh();
assert(!elements.onlineScoreStatus.hidden);assert(elements.onlineScoreStatus.textContent.includes('0件'),'Debug build shows diagnostics while game debug mode is OFF');
presenter.update({authenticated:true},{freshPending:2,profilePending:true,syncError:'firestore/permission-denied'});
assert(elements.onlineScoreStatus.textContent.includes('2件'));assert(elements.onlineStatus.textContent.includes('firestore/permission-denied'));
lang='en';presenter.refresh();assert(elements.onlineScoreStatus.textContent.includes('2'));assert(elements.onlineStatus.textContent.startsWith('Sync error'));
presenter.update({authenticated:true},{freshPending:0});assert(elements.onlineScoreStatus.textContent.endsWith('0'));assert.equal(elements.onlineStatus.textContent,'Online sync');
presenter.update({lastError:'private-url-or-token?secret'},{freshPending:1});assert(!elements.onlineStatus.textContent.includes('secret'));
policy={...policy,configuration:'Release',syncStatusAllowed:true};presenter.refresh();assert(elements.onlineStatus.hidden&&elements.onlineScoreStatus.hidden);assert.equal(elements.onlineStatus.textContent,'');assert.equal(elements.onlineScoreStatus.textContent,'');

// Actual copied native scripts: startup must never show the six historical
// entries, and the real language-switch path must use the same presenter.
const html=fs.readFileSync('index.html','utf8');
const nativeScripts=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
 .map(m=>nativeSource(path.basename(m[1]),fs.readFileSync(m[1],'utf8'))).join('\n');
const historical=JSON.stringify({uid:'mock-owner',items:Array.from({length:6},(_,i)=>['v1_existing_'+(i+1),{moves:12,timeMs:5000}])});
const data=new Map([['ascent.pending-scores.v1',historical]]),scope={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},ASCENT_IOS_BUILD:{configuration:'Debug',syncStatusAllowed:true,debugAllowed:false,firebaseMode:'auto-sync',firebaseEnabled:true}};
const env=`const elements={};const document={documentElement:{},getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},events:{},focus(){},setAttribute(k,v){this[k]=v;},removeAttribute(){},addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){}`;
new Function('assert','createNativeSyncStatus','globalThis',env+nativeScripts+`
assert.equal(onlineScores.pending.size,6);
assert.equal(document.getElementById('onlineScoreStatus').textContent,'');assert(document.getElementById('onlineScoreStatus').hidden);
const presenter=createNativeSyncStatus({document,policy:()=>globalThis.ASCENT_IOS_BUILD,language:()=>GAME_TEXT_LANGUAGE});globalThis.ASCENT_NATIVE_SYNC_STATUS=presenter;
presenter.update({authenticated:true},{freshPending:0});assert(document.getElementById('onlineScoreStatus').textContent.includes('0件'));
persistPendingScores();assert(document.getElementById('onlineScoreStatus').textContent.includes('0件'));
setGameLanguage('en');assert.equal(document.getElementById('onlineScoreStatus').textContent,'Scores waiting to upload: 0');
presenter.update({authenticated:true},{freshPending:2,syncError:'firestore/unavailable'});setGameLanguage('ja');
assert(document.getElementById('onlineScoreStatus').textContent.includes('2件'));assert(document.getElementById('onlineStatus').textContent.includes('firestore/unavailable'));
globalThis.ASCENT_NATIVE_SYNC={pendingForBoard:()=>false};assert(!stageScoreStatus(1,'existing').includes('送信待ち'));
globalThis.ASCENT_IOS_BUILD.configuration='Release';globalThis.ASCENT_IOS_BUILD.syncStatusAllowed=true;persistPendingScores();setGameLanguage('en');assert(document.getElementById('onlineStatus').hidden);assert(document.getElementById('onlineScoreStatus').hidden);assert.equal(stageScoreStatus(1,'existing'),'');
`)(assert,createNativeSyncStatus,scope);
assert.equal(data.get('ascent.pending-scores.v1'),historical);

(async()=>{
 let offline=true;const queueData=new Map(),queueStorage={getItem:k=>queueData.get(k)??null,setItem:(k,v)=>queueData.set(k,v)};
 policy={...policy,configuration:'Debug',syncStatusAllowed:true};lang='ja';
 const controller={permissions:()=>({automaticSync:true}),authenticate:async()=>{if(offline)throw {code:'auth/network-request-failed'};},syncFreshScore:async()=>({written:false}),syncAutomaticProfile:async()=>({written:false})};
 const queue=createNativeAutoSync({storage:queueStorage,owner:'mock-owner',controller,onReport:stats=>presenter.update({authenticated:!offline},stats)});
 queue.recordClear(11,'existing',{moves:6,timeMs:5411,version:'v1'});await queue.flush();
 assert.equal(queue.pendingForBoard('v1_existing_11'),true);assert(elements.onlineScoreStatus.textContent.includes('1件'));assert(elements.onlineStatus.textContent.includes('auth/network-request-failed'));
 offline=false;await queue.flush();assert.equal(queue.pendingForBoard('v1_existing_11'),false);assert(elements.onlineScoreStatus.textContent.includes('0件'));assert(!elements.onlineStatus.textContent.includes('error'));
 console.log('PASS native sync diagnostics: legacy six excluded; startup/result/language share real queue; offline/recovery/skip acknowledgement; safe errors; Debug independent of game toggle; Release always hidden even with old true flag and language switch; temporary override removed; Web source untouched');
})().catch(e=>{console.error(e);process.exitCode=1;});
