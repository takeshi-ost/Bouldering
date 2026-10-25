'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {scoreMetadata}=require('../js/score-metadata.js');
const {createNativeAutoSync,SYNC_KEY}=require('../scripts/native-auto-sync.cjs');
const script=fs.readFileSync('js/score-metadata.js','utf8');
function runtime(version,build) {
 const context=vm.createContext({...(build?{ASCENT_IOS_BUILD:Object.freeze({buildNumber:build})}:{})});
 vm.runInContext(`const RELEASE_VERSION=${JSON.stringify(version)},COURSE_VERSION='v1';`+script,context);
 return JSON.parse(vm.runInContext('JSON.stringify(currentScoreMetadata())',context));
}
const oldMeta=runtime('0.3.14','7'),newMeta=runtime('0.4.0','8');
assert.deepEqual(runtime('0.3.14'),{appVersion:'0.3.14',buildNumber:null,platform:'Web',scoreSpecVersion:'v1'});
const sourceConfig=fs.readFileSync('js/config.js','utf8'),project=fs.readFileSync('ios/App/App.xcodeproj/project.pbxproj','utf8');
const actualVersion=sourceConfig.match(/const RELEASE_VERSION = '([^']+)'/)[1];
const actualSpec=sourceConfig.match(/const COURSE_VERSION = '([^']+)'/)[1];
assert.equal(actualVersion,'0.4.2');assert.equal(actualSpec,'v1');
assert.equal(JSON.parse(fs.readFileSync('package.json','utf8')).version,actualVersion);
assert.equal(JSON.parse(fs.readFileSync('package-lock.json','utf8')).version,actualVersion);
assert.deepEqual([...project.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(m=>m[1]),['10','10']);
assert.deepEqual([...project.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(m=>m[1]),[actualVersion,actualVersion]);
assert.deepEqual(runtime(actualVersion,'10'),{appVersion:'0.4.2',buildNumber:'10',platform:'iOS',scoreSpecVersion:'v1'});
assert.deepEqual(runtime(actualVersion),{appVersion:'0.4.2',buildNumber:null,platform:'Web',scoreSpecVersion:'v1'});
assert.equal(oldMeta.platform,'iOS');assert.equal(newMeta.scoreSpecVersion,oldMeta.scoreSpecVersion);
assert.deepEqual(scoreMetadata({version:'v1'}),{appVersion:null,buildNumber:null,platform:null,scoreSpecVersion:null});
(async()=>{
 const data=new Map([['ascent.pending-scores.v1','historical-queue-unchanged']]);const sent=[];
 let offline=true;
 const controller={permissions:()=>({automaticSync:true}),authenticate:async()=>{if(offline)throw {code:'auth/network-request-failed'};},syncFreshScore:async(o,b,s)=>sent.push({...s}),syncAutomaticProfile:async()=>{}};
 const make=()=>createNativeAutoSync({storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},owner:'mock-owner',controller});
 const before=make();before.recordClear(1,'existing',{moves:12,timeMs:3000,version:'v1',...oldMeta});await before.flush();
 assert.deepEqual(JSON.parse(data.get(SYNC_KEY)).events[0].score,{moves:12,timeMs:3000,...oldMeta});
 // A changed runtime/version is deliberately not consulted while restoring.
 const after=make();offline=false;await after.flush();assert.deepEqual(scoreMetadata(sent[0]),oldMeta);assert.notDeepEqual(scoreMetadata(sent[0]),newMeta);
 assert.equal(data.get('ascent.pending-scores.v1'),'historical-queue-unchanged');
 const ledger=JSON.parse(data.get(SYNC_KEY));ledger.events=[{sequence:2,board:'v1_existing_2',score:{moves:14,timeMs:4000}}];ledger.sequence=2;data.set(SYNC_KEY,JSON.stringify(ledger));
 await make().flush();assert.deepEqual(scoreMetadata(sent[1]),scoreMetadata(null),'Pre-metadata queued event remains unknown');
 // Exercise the real Web queue across two independent runtimes/app versions.
 const webData=new Map(),webSent=[];
 function webRuntime(version) {
  const c=vm.createContext({localStorage:{getItem:k=>webData.get(k)??null,setItem:(k,v)=>webData.set(k,v)},webSent});
  vm.runInContext(`const RELEASE_VERSION=${JSON.stringify(version)},COURSE_VERSION='v1',RECORDS_KEY='records',ONLINE_CACHE_MS=1;
   const document={getElementById:()=>({})},accountDeletion={marker:false},online={ready:false,uid:'mock-web-owner'},stageRecords={existing:{},prototype:{}};
   function gameText(){return '';}function readOnlineCheckpoint(){return null;}
   function compareStageScores(a,b){return a.moves-b.moves || a.timeMs-b.timeMs;}
   const state='map',stageStartContext=null;`+script+fs.readFileSync('js/online-scores.js','utf8'),c);
  return c;
 }
 const webBefore=webRuntime('0.3.14');vm.runInContext("queueOnlineScore(1,'existing',{moves:11,timeMs:800, ...currentScoreMetadata()})",webBefore);
 const webAfter=webRuntime('0.4.0');
 await vm.runInContext("online.ready=true;online.adapter={saveScore:async(uid,board,score)=>{webSent.push(score);return score;}};flushOnlineScores()",webAfter);
 assert.deepEqual(scoreMetadata(webSent[0]),runtime('0.3.14'));
 assert.equal(JSON.parse(webData.get('ascent.pending-scores.v1')).items.length,0);
 console.log('PASS score provenance: Web unknown build; native captured build; stable v1 rule generation; offline upgrade preserves original metadata; old queues stay unknown; historical queue untouched');
})().catch(e=>{console.error(e);process.exitCode=1;});
