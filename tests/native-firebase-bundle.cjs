'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const metadata=JSON.parse(fs.readFileSync('www/native-firebase-mode.json','utf8'));
assert(['offline','read-only','auto-sync'].includes(metadata.mode));
const shipped=fs.readFileSync('www/js/native-firebase-control.js','utf8');
assert(!shipped.includes('runLimitedWriteTest'),'Limited saving test must not ship');
const scene=fs.readFileSync('ios/App/App/SceneDelegate.swift','utf8');
assert(/#if DEBUG\s+if ProcessInfo\.processInfo\.environment\["ASCENT_FIREBASE_READ_TEST"\][\s\S]*?name: "ascentFirebaseReport"[\s\S]*?#endif/.test(scene),'Report handler is Debug-only');
let imports=0,network=0;const reports=[];const saved=new Map([['ascent.pending-scores.v1','preserve-existing-queue']]);
const context=vm.createContext({ASCENT_IOS_BUILD:Object.freeze({firebaseMode:'offline',firebaseEnabled:false}),
 localStorage:{getItem:k=>saved.get(k)??null,setItem:()=>{throw Error('No writes on offline startup');}},
 fetch:()=>{network++;throw Error('Network disabled');},webkit:{messageHandlers:{ascentFirebaseReport:{postMessage:r=>reports.push(r)}}}});
vm.runInContext(fs.readFileSync('www/js/native-firebase-control.js','utf8'),context,{importModuleDynamically:()=>{imports++;throw Error('SDK must remain dormant');}});
(async()=>{
 await assert.rejects(context.ASCENT_NATIVE_FIREBASE.authenticate({createAnonymous:true}),/auth-disabled/);
 await assert.rejects(context.ASCENT_NATIVE_FIREBASE.adapter().saveScore(),/write-disabled/);
 assert.equal(imports,0);assert.equal(network,0);assert.equal(saved.get('ascent.pending-scores.v1'),'preserve-existing-queue');
 assert(reports.every(r=>r.writesIssued===0 && r.pendingUnchanged));
 const descriptor=Object.getOwnPropertyDescriptor(context,'ASCENT_NATIVE_FIREBASE');assert.equal(descriptor.writable,false);assert.equal(descriptor.configurable,false);
 console.log('PASS shipped network-disabled bundle: SDK never imported/initialized, no requests/storage writes, pending queue preserved, immutable controller');
})().catch(e=>{console.error(e);process.exitCode=1;});
