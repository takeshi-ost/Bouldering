'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),esbuild=require('esbuild');
module.exports=function buildNativeFirebase(root,out,mode) {
    if(!['offline','read-only','auto-sync'].includes(mode))throw Error('Unsupported native Firebase mode');
    let config;
    if(mode!=='offline') {
        const source=fs.readFileSync(path.join(root,'js/firebase-client.js'),'utf8');
        const literal=source.match(/appSDK\.initializeApp\((\{[\s\S]*?\})\)/)?.[1];
        if(!literal)throw Error('Firebase configuration anchor changed');
        config=vm.runInNewContext('('+literal+')',Object.create(null),{timeout:100});
        if(config.projectId!=='bouldering-7482d')throw Error('Firebase project mismatch');
    }
    fs.mkdirSync(path.join(out,'vendor'),{recursive:true});
    const writes=mode==='auto-sync';
    const sdk=`
import {initializeApp,getApps,getApp} from 'firebase/app';
import {initializeAuth,browserLocalPersistence,setPersistence${mode!=='offline'?',signInAnonymously':''}} from 'firebase/auth';
import {getFirestore,doc,collection,getDocFromServer,getDocsFromServer,query,where,orderBy,limit${writes?',runTransaction,serverTimestamp':''}} from 'firebase/firestore';
export const app={initializeApp,getApps,getApp};
export const auth={initializeAuth,browserLocalPersistence,setPersistence${mode!=='offline'?',signInAnonymously':''}};
export const firestore={getFirestore,doc,collection,getDocFromServer,getDocsFromServer,query,where,orderBy,limit${writes?',runTransaction,serverTimestamp':''}};`;
    esbuild.buildSync({stdin:{contents:sdk,resolveDir:root},bundle:true,format:'esm',platform:'browser',target:'ios15',minify:true,
        outfile:path.join(out,'vendor/firebase-sdk.js'),logLevel:'silent',legalComments:'eof'});
    const entry=`
const {createNativeFirebaseController}=require('./scripts/native-firebase-controller.cjs');
const {createNativeAutoSync}=require('./scripts/native-auto-sync.cjs');
const {createNativeSyncStatus}=require('./scripts/native-sync-status.cjs');
const mode=${JSON.stringify(mode)},config=${JSON.stringify(config)||'undefined'};
const courseVersion=typeof COURSE_VERSION==='string'?COURSE_VERSION:'v1';
let storage;try{storage=globalThis.localStorage;}catch(_){}
function pendingValue(){try{return storage?.getItem('ascent.pending-scores.v1');}catch(_){return 'unavailable';}}
const baseline=pendingValue();
let sync;
const statusPresenter=createNativeSyncStatus({document:globalThis.document,policy:()=>globalThis.ASCENT_IOS_BUILD,language:()=>typeof GAME_TEXT_LANGUAGE==='string'?GAME_TEXT_LANGUAGE:'ja'});
Object.defineProperty(globalThis,'ASCENT_NATIVE_SYNC_STATUS',{value:statusPresenter,writable:false,configurable:false});
function publish(report,stats=sync?.report()||{}){
 statusPresenter.update(report,stats);
 const safe={...report,...stats,pendingUnchanged:pendingValue()===baseline};
 globalThis.webkit?.messageHandlers?.ascentFirebaseReport?.postMessage(safe);
}
const controller=createNativeFirebaseController({mode,config,policy:()=>typeof accountDeletion!=='undefined' && accountDeletion.marker?{...globalThis.ASCENT_IOS_BUILD,firebaseEnabled:false}:globalThis.ASCENT_IOS_BUILD,
 storage,loadSDK:()=>import('../vendor/firebase-sdk.js'),
 connectionEpoch:()=>globalThis.ASCENT_SETTINGS_CONNECTION?.ticket(),
 knownUid:()=>{
  const known=[readOnlineCheckpoint()?.uid,onlineScores.owner,sync?.ownerUid()].filter(Boolean);
  if(new Set(known).size>1)throw {code:'native-firebase/identity-mismatch'};
  return known[0]||null;
 },onReport:publish});
Object.defineProperty(globalThis,'ASCENT_NATIVE_FIREBASE',{value:controller,writable:false,configurable:false});
if(controller.permissions().automaticSync){
 let owner=null;try{owner=storage?.getItem('ascent.native-firebase.identity-check.v1')||null;}catch(_){}
 sync=createNativeAutoSync({storage,owner,controller,courseVersion,startPaused:true,onReport:stats=>publish(controller.report(),stats)});
 Object.defineProperty(globalThis,'ASCENT_NATIVE_SYNC',{value:sync,writable:false,configurable:false});
}
let connectionFlight=null;
function connectNative(){
 if(!controller.permissions().network || connectionFlight)return connectionFlight;
 connectionFlight=(async()=>{
 try {
  if(accountDeletion.marker)throw {code:'native-firebase/deletion-pending'};
  sync?.ownerUid(); // Fail before authentication if an existing ledger is invalid.
  const user=await controller.authenticate({createAnonymous:true});
  if(accountDeletion.marker)throw {code:'native-firebase/deletion-pending'};
  if(sync && !sync.activate(user.uid))throw {code:sync.report().syncError};
  online.uid=user.uid;online.adapter=controller.adapter();online.ready=true;
  setOnlineStatus(mode==='auto-sync'?'オンライン同期 / Online sync':'オンライン（読み取り専用） / Read-only online');
  renderTransferAvailability();renderMapPlayers();
  if(sync){sync.queueProfile(onlineProfile());await sync.flush();}
  await controller.players(1,1,'existing');
  const firstBoard=typeof scoreBoardKey==='function'?scoreBoardKey(1,'existing'):courseVersion+'_existing_1';
  await controller.scores(user.uid,firstBoard);
 }catch(error){online.ready=false;setOnlineStatus('オンライン接続なし / Offline');console.warn('Native Firebase:',controller.report().lastError || 'native-firebase/read-unavailable');}
 })().finally(()=>{connectionFlight=null;});
 return connectionFlight;
}
if(controller.permissions().network){
 for(const event of ['online','focus','ascent-native-resume'])window.addEventListener(event,()=>{void connectNative();});
 void connectNative();
}`;
    esbuild.buildSync({stdin:{contents:entry,resolveDir:root},bundle:true,format:'iife',platform:'browser',target:'ios15',
        external:['../vendor/firebase-sdk.js'],outfile:path.join(out,'js/native-firebase-control.js'),logLevel:'silent'});
    fs.writeFileSync(path.join(out,'native-firebase-mode.json'),JSON.stringify({mode,sdkVersion:'12.11.0'}));
};
