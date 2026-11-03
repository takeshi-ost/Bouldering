// Explicit local-only emulator suite. Not part of the ordinary no-emulator tests.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const host=process.env.FIRESTORE_EMULATOR_HOST;
if(host!=='127.0.0.1:8089')throw Error('Requires local emulator FIRESTORE_EMULATOR_HOST=127.0.0.1:8089; refusing all other targets');
const toolRequire=createRequire(process.env.ASCENT_EMULATOR_TOOLS?path.resolve(process.env.ASCENT_EMULATOR_TOOLS,'package.json'):import.meta.url);
const {initializeTestEnvironment,assertSucceeds,assertFails}=toolRequire('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,deleteDoc,collection,collectionGroup,query,where,limit,serverTimestamp,Timestamp}=toolRequire('firebase/firestore');
const current=fs.readFileSync('firestore.rules','utf8');
// Parent verified this exact revision against Console after the approved deployment.
// This remains a static fixture, not a live production read in this test.
const deployed=execFileSync('git',['show','5812c12296f2f722b848be60ef94976c7f30ea11:firestore.rules'],{encoding:'utf8'});
const legacy=execFileSync('git',['show','795bc08378f029b2e537f70b5c3a00d84219fd9f:firestore.rules'],{encoding:'utf8'});
// Exact (LF + final LF) public-history copy of the owner's 2026-11-02 Console
// paste. This is a user-supplied snapshot, not an authenticated live Rules read.
const consoleSnapshot=execFileSync('git',['show','a5ffb19ad5d3bce368f27d7bd682ef74e698ca57:firestore.rules'],{encoding:'utf8'});
assert.equal(createHash('sha256').update(consoleSnapshot).digest('hex'),'e9b4ef2a8178bd95dfbcf0d111f33c842ed6bafc9b55f0bcaa991ee48b0537c9');
// Only board generations and matching optional metadata differ; every other
// permission, profile/deletion check and score bound must stay unchanged.
const extended=consoleSnapshot
 .replace("'^v1_(existing|prototype)_[1-9][0-9]{0,5}$'", ()=>"'^(v1_(existing|prototype)|v[234]_existing)_[1-9][0-9]{0,5}$'")
 .replace("&& optionalScoreText(data, 'scoreSpecVersion', 32, '^v1$')", ()=>`&& optionalScoreText(data, 'scoreSpecVersion', 32, '^v[1234]$')
          && (!('scoreSpecVersion' in data) || data.scoreSpecVersion == null
            || (data.scoreSpecVersion == 'v1' && board.matches('^v1_.*$'))
            || (data.scoreSpecVersion == 'v2' && board.matches('^v2_.*$'))
            || (data.scoreSpecVersion == 'v3' && board.matches('^v3_.*$'))
            || (data.scoreSpecVersion == 'v4' && board.matches('^v4_.*$')))`);
assert.equal(deployed,extended,'Unexpected change outside reviewed score generation extension');
const progressExtended=deployed
 .replace("&& data.keys().hasOnly([\n          'name', 'colors', 'headColor',\n          'reachedLevel', 'reachedPrototypeLevel', 'updatedAt'\n        ])", "&& data.keys().hasOnly([\n          'name', 'colors', 'headColor',\n          'reachedLevel', 'reachedPrototypeLevel', 'updatedAt', 'progressVersion'\n        ])\n        && (!('progressVersion' in data) || data.progressVersion == 'v4')")
 .replace("      allow create, update: if activeAccount()\n        && request.auth.uid == uid\n        && validProfile(request.resource.data);", `      allow create: if activeAccount()
        && request.auth.uid == uid
        && validProfile(request.resource.data);

      // Adoption may replace legacy reached levels with the current local save.
      // Once adopted, old clients must not strip its generation and restore old progress.
      allow update: if activeAccount()
        && request.auth.uid == uid
        && validProfile(request.resource.data)
        && (!('progressVersion' in resource.data)
          || ('progressVersion' in request.resource.data
            && request.resource.data.progressVersion == resource.data.progressVersion));`);
assert.equal(current,progressExtended,'Unexpected change outside reviewed profile generation extension');
console.log('PASS owner Console snapshot hash, deployed snapshot, and exact minimal Rules diffs');
// Four isolated demo projects; never a production project or production token.
const environments=[];
let assertions=0;
const pass=async p=>{await assertSucceeds(p);assertions++;};
const deny=async p=>{await assertFails(p);assertions++;};
try {
 for(const [label,rules] of [['legacy',legacy],['console',consoleSnapshot],['deployed',deployed],['metadata',current]]) {
  const hasMetadata=label!=='legacy',hasGenerations=label==='metadata'||label==='deployed';
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
  await (hasMetadata?pass:deny)(setDoc(doc(owner,validPath),{...old(),...metadata}));
  const nulls=Object.fromEntries(Object.keys(metadata).map(k=>[k,null]));
  await (hasMetadata?pass:deny)(setDoc(doc(owner,path()),{...old(),...nulls}));
  if(hasMetadata) {
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
  for(const board of ['v1_daily_1','v5_existing_1','v4_prototype_1','trial-d7-offset10_existing_1','v2_prototype_1','v3_prototype_1','v1_existing_0'])await deny(setDoc(doc(owner,`stageScores/${board}/entries/mock-owner`),old()));
  // v2 is isolated from legacy v1 and metadata cannot claim another generation.
  const v2Path='stageScores/v2_existing_200/entries/mock-owner';
  await (hasGenerations?pass:deny)(setDoc(doc(owner,v2Path),{...old(),...metadata,scoreSpecVersion:'v2'}));
  if(hasGenerations) {
   await deny(setDoc(doc(owner,v2Path),{...old(),moves:1,...metadata}));
   await deny(setDoc(doc(owner,path()),{...old(),...metadata,scoreSpecVersion:'v2'}));
   await pass(setDoc(doc(owner,'stageScores/v2_existing_201/entries/mock-owner'),{...old(),scoreSpecVersion:null}));
   await pass(setDoc(doc(owner,'stageScores/v1_prototype_201/entries/mock-owner'),{...old(),...metadata}));
   await deny(setDoc(doc(other,'stageScores/v2_existing_202/entries/mock-owner'),{...old(),...metadata,scoreSpecVersion:'v2'}));
  }
  const v3Path='stageScores/v3_existing_200/entries/mock-owner';
  await (hasGenerations?pass:deny)(setDoc(doc(owner,v3Path),{...old(),...metadata,scoreSpecVersion:'v3'}));
  if(hasGenerations) {
   for(const wrong of ['v1','v2'])await deny(setDoc(doc(owner,v3Path),{...old(),moves:1,...metadata,scoreSpecVersion:wrong}));
   await deny(setDoc(doc(owner,v2Path),{...old(),moves:1,...metadata,scoreSpecVersion:'v3'}));
   await pass(setDoc(doc(owner,'stageScores/v3_existing_201/entries/mock-owner'),{...old(),scoreSpecVersion:null}));
   await deny(setDoc(doc(other,'stageScores/v3_existing_202/entries/mock-owner'),{...old(),...metadata,scoreSpecVersion:'v3'}));
  }
  const v4Path='stageScores/v4_existing_200/entries/mock-owner';
  await (hasGenerations?pass:deny)(setDoc(doc(owner,v4Path),{...old(),...metadata,scoreSpecVersion:'v4'}));
  if(hasGenerations) {
   for(const wrong of ['v1','v2','v3','trial-d7-offset10'])await deny(setDoc(doc(owner,v4Path),{...old(),moves:1,...metadata,scoreSpecVersion:wrong}));
   await deny(setDoc(doc(owner,v3Path),{...old(),moves:1,...metadata,scoreSpecVersion:'v4'}));
   await pass(setDoc(doc(owner,'stageScores/v4_existing_201/entries/mock-owner'),{...old(),scoreSpecVersion:null}));
   await deny(setDoc(doc(other,'stageScores/v4_existing_202/entries/mock-owner'),{...old(),...metadata,scoreSpecVersion:'v4'}));
  }
  // Rules must preserve existing document/query and owner-only profile access.
  const profile=()=>({name:'Mock climber',colors:['#123abc'],headColor:'#ABCDEF',reachedLevel:1,reachedPrototypeLevel:1,updatedAt:serverTimestamp()});
  const profilePath='players/mock-owner';
  await pass(setDoc(doc(owner,profilePath),profile()));
  await pass(getDoc(doc(other,profilePath)));
  await deny(getDoc(doc(guest,profilePath)));
  await deny(setDoc(doc(other,profilePath),profile()));
  await deny(setDoc(doc(guest,'players/guest'),profile()));
  await deny(setDoc(doc(owner,profilePath),{...profile(),unexpected:true}));
  await deny(setDoc(doc(owner,profilePath),{...profile(),colors:['not-a-color']}));
  await deny(setDoc(doc(owner,profilePath),{...profile(),reachedLevel:0}));
  // Unversioned old profiles remain valid until this UID adopts the current save.
  await pass(setDoc(doc(owner,profilePath),{...profile(),reachedLevel:31,reachedPrototypeLevel:81}));
  await (label==='metadata'?pass:deny)(setDoc(doc(owner,profilePath),{...profile(),progressVersion:'v4',reachedLevel:21}));
  if(label==='metadata') {
   const adopted=()=>({...profile(),progressVersion:'v4',reachedLevel:21});
   const snapshot=await getDoc(doc(owner,profilePath));
   assert.equal(snapshot.data().reachedLevel,21);assert.equal(snapshot.data().reachedPrototypeLevel,1);assertions+=2;
   // Current-generation profile sync/edits work; an old full replacement cannot undo adoption.
   await pass(setDoc(doc(owner,profilePath),{...adopted(),reachedLevel:22,name:'Current name'}));
   await pass(getDocs(query(collection(owner,'players'),where('reachedLevel','==',22),where('progressVersion','==','v4'),limit(6))));
   await deny(setDoc(doc(owner,profilePath),{...profile(),reachedLevel:99}));
   for(const version of [null,'v1','v3','v5',4,true,''])
    await deny(setDoc(doc(owner,profilePath),{...adopted(),progressVersion:version}));
   await deny(setDoc(doc(other,profilePath),adopted()));
   await deny(setDoc(doc(guest,profilePath),adopted()));
   // Current-generation creates have the same auth, shape and timestamp bounds.
   const fresh=env.authenticatedContext('mock-fresh').firestore(),freshPath='players/mock-fresh';
   await pass(setDoc(doc(fresh,freshPath),adopted()));
   await deny(setDoc(doc(fresh,freshPath),{...adopted(),reachedLevel:0}));
   await deny(setDoc(doc(fresh,freshPath),{...adopted(),updatedAt:Timestamp.fromMillis(1)}));
   const oldCreate=env.authenticatedContext('mock-legacy-fresh').firestore();
   await pass(setDoc(doc(oldCreate,'players/mock-legacy-fresh'),profile()));
  }
  const readablePath=path();await pass(setDoc(doc(owner,readablePath),old()));
  await pass(getDoc(doc(other,readablePath)));
  await deny(getDoc(doc(guest,readablePath)));
  for(const collectionRef of [collection(owner,'players'),collection(owner,'stageScores/v1_existing_1/entries'),collectionGroup(owner,'entries')]) {
   await pass(getDocs(query(collectionRef,limit(100))));
   await deny(getDocs(query(collectionRef,limit(101))));
   await deny(getDocs(collectionRef));
  }
  await deny(getDocs(query(collection(guest,'players'),limit(100))));
  await deny(getDocs(query(collectionGroup(guest,'entries'),limit(100))));
  // Existing group permission is deliberately broad: any entries collection is
  // readable to a signed-in user with a bounded query, not only stageScores.
  await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'syntheticPrivate/demo/entries/mock-owner'),{testOnly:true}));
  await pass(getDocs(query(collection(owner,'syntheticPrivate/demo/entries'),limit(1))));
  await deny(setDoc(doc(owner,'syntheticPrivate/demo/entries/mock-owner'),{testOnly:false}));
  await deny(deleteDoc(doc(other,readablePath)));
  await deny(deleteDoc(doc(guest,readablePath)));
  // Owner deletion remains possible, including after acquiring a deletion lock.
  // All deletes below are isolated synthetic emulator records only.
  const updatePath=path();await pass(setDoc(doc(owner,updatePath),old()));
  await deny(setDoc(doc(other,updatePath),{...old(),moves:1})); // Other owner's update.
  await deny(setDoc(doc(owner,updatePath),old())); // Equal.
  await deny(setDoc(doc(owner,updatePath),{...old(),moves:13,timeMs:1})); // Worse.
  await pass(setDoc(doc(owner,updatePath),{...old(),timeMs:1000}));
  await pass(setDoc(doc(owner,updatePath),{...old(),moves:11,timeMs:5000}));
  // Deletion-locked accounts cannot create or update a score.
  const lockPath='accountDeletionLocks/mock-owner';
  await deny(setDoc(doc(other,lockPath),{requestedAt:serverTimestamp()}));
  await deny(setDoc(doc(guest,lockPath),{requestedAt:serverTimestamp()}));
  await deny(setDoc(doc(owner,lockPath),{requestedAt:serverTimestamp(),unexpected:true}));
  await deny(setDoc(doc(owner,lockPath),{requestedAt:Timestamp.fromMillis(1)}));
  await pass(setDoc(doc(owner,lockPath),{requestedAt:serverTimestamp()}));
  await pass(getDoc(doc(owner,lockPath)));
  await deny(getDoc(doc(other,lockPath)));
  await deny(getDocs(query(collection(owner,'accountDeletionLocks'),limit(1))));
  await deny(setDoc(doc(owner,lockPath),{requestedAt:serverTimestamp()}));
  await deny(deleteDoc(doc(owner,lockPath)));
  await deny(setDoc(doc(owner,profilePath),profile()));
  if(label==='metadata')await deny(setDoc(doc(owner,profilePath),{...profile(),progressVersion:'v4'}));
  await deny(setDoc(doc(owner,path()),old()));
  await deny(setDoc(doc(owner,updatePath),{...old(),moves:10}));
  await pass(deleteDoc(doc(owner,readablePath)));
  await pass(deleteDoc(doc(owner,profilePath)));
  console.log(`PASS ${label} Rules compatibility, permissions and rejection cases`);
 }
 console.log(`PASS ${assertions} emulator assertions; synthetic demo data only, no production access`);
} finally {
 // cleanup only closes clients; explicit deletes above target synthetic demo records.
 for(const env of environments)await env.cleanup();
}
