// Explicit local-only emulator suite. Not part of the ordinary no-emulator tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const host=process.env.FIRESTORE_EMULATOR_HOST;
if(host!=='127.0.0.1:8089')throw Error('Requires local emulator FIRESTORE_EMULATOR_HOST=127.0.0.1:8089; refusing all other targets');
const {initializeTestEnvironment,assertSucceeds,assertFails}=await import('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,serverTimestamp,Timestamp}=await import('firebase/firestore');
const current=fs.readFileSync('firestore.rules','utf8');
const legacy=execFileSync('git',['show','795bc08378f029b2e537f70b5c3a00d84219fd9f:firestore.rules'],{encoding:'utf8'});
// Two isolated demo projects; never a production project or production token.
const environments=[];
let assertions=0;
const pass=async p=>{await assertSucceeds(p);assertions++;};
const deny=async p=>{await assertFails(p);assertions++;};
try {
 for(const [label,rules] of [['legacy',legacy],['metadata',current]]) {
  const env=await initializeTestEnvironment({projectId:`demo-score-${label}`,firestore:{host:'127.0.0.1',port:8089,rules}});
  environments.push(env);
  const owner=env.authenticatedContext('mock-owner').firestore();
  const other=env.authenticatedContext('mock-other').firestore();
  const guest=env.unauthenticatedContext().firestore();
  let stage=0;
  const path=()=>`stageScores/v1_existing_${++stage}/entries/mock-owner`;
  const old=()=>({moves:12,timeMs:1200,updatedAt:serverTimestamp()});
  const metadata={appVersion:'0.3.14',buildNumber:'7',platform:'iOS',scoreSpecVersion:'v1'};
  await pass(setDoc(doc(owner,path()),old())); // Old client still works.
  const validPath=path();
  await (label==='metadata'?pass:deny)(setDoc(doc(owner,validPath),{...old(),...metadata}));
  const nulls=Object.fromEntries(Object.keys(metadata).map(k=>[k,null]));
  await (label==='metadata'?pass:deny)(setDoc(doc(owner,path()),{...old(),...nulls}));
  if(label==='metadata') {
   for(const [k,v] of Object.entries(metadata))await pass(setDoc(doc(owner,path()),{...old(),[k]:v}));
   await pass(setDoc(doc(owner,path()),{...old(),...metadata,buildNumber:null,platform:'Web'}));
   await pass(setDoc(doc(owner,path()),{...old(),...metadata,buildNumber:'7.2.1'}));
   await pass(setDoc(doc(owner,path()),{...old(),...metadata,appVersion:'1'.repeat(60)+'.1.1',buildNumber:'7'.repeat(32)}));
   for(const [field,max] of [['appVersion',64],['buildNumber',32],['platform',32],['scoreSpecVersion',32]]) {
    for(const value of [false,12,{},[], '', 'x'.repeat(max+1)])await deny(setDoc(doc(owner,path()),{...old(),...metadata,[field]:value}));
   }
   for(const [field,value] of [['appVersion','latest'],['appVersion','0.3'],['buildNumber','7beta'],['buildNumber','1.2.3.4'],['platform','Android'],['platform','ios'],['scoreSpecVersion','v2']])
    await deny(setDoc(doc(owner,path()),{...old(),...metadata,[field]:value}));
   // New reader accepts old document without rewriting or inventing metadata.
   const oldPath=path();await pass(setDoc(doc(owner,oldPath),old()));
   const oldSnapshot=await getDoc(doc(owner,oldPath));assert(!('appVersion' in oldSnapshot.data()));assertions++;
   // New client improves old data, old client can still improve new data.
   await pass(setDoc(doc(owner,oldPath),{...old(),moves:11,...metadata}));
   await pass(setDoc(doc(owner,oldPath),{...old(),moves:10}));
  }
  // The authentication, ownership, board, timestamp and numeric guards remain.
  await deny(setDoc(doc(guest,path()),old()));
  await deny(setDoc(doc(other,path()),old()));
  await deny(setDoc(doc(owner,path()),{...old(),unexpected:'not allowed'}));
  for(const patch of [{moves:0},{moves:1000001},{moves:1.5},{moves:'12'},{timeMs:-1},{timeMs:604800001},{timeMs:1.5},{updatedAt:Timestamp.fromMillis(1)}])
   await deny(setDoc(doc(owner,path()),{...old(),...patch}));
  for(const missing of ['moves','timeMs','updatedAt']) {
   const payload=old();delete payload[missing];await deny(setDoc(doc(owner,path()),payload));
  }
  for(const board of ['v1_daily_1','v2_existing_1','v1_existing_0'])await deny(setDoc(doc(owner,`stageScores/${board}/entries/mock-owner`),old()));
  const updatePath=path();await pass(setDoc(doc(owner,updatePath),old()));
  await deny(setDoc(doc(other,updatePath),{...old(),moves:1})); // Other owner's update.
  await deny(setDoc(doc(owner,updatePath),old())); // Equal.
  await deny(setDoc(doc(owner,updatePath),{...old(),moves:13,timeMs:1})); // Worse.
  await pass(setDoc(doc(owner,updatePath),{...old(),timeMs:1000}));
  await pass(setDoc(doc(owner,updatePath),{...old(),moves:11,timeMs:5000}));
  // Deletion-locked accounts cannot create or update a score.
  await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'accountDeletionLocks/mock-owner'),{requestedAt:serverTimestamp()}));
  await deny(setDoc(doc(owner,path()),old()));
  await deny(setDoc(doc(owner,updatePath),{...old(),moves:10}));
  console.log(`PASS ${label} Rules compatibility and rejection cases`);
 }
 console.log(`PASS ${assertions} emulator assertions; no production access or deletes`);
} finally {
 // cleanup closes test clients; no clearFirestore/delete operation is used.
 for(const env of environments)await env.cleanup();
}
