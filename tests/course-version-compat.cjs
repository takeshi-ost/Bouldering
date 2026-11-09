'use strict';
// Web adoption coverage; native mixed-generation coverage is in native-auto-sync.cjs.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {scoreMetadata,supportedCourseVersion,historicalCourseVersion,supportedScoreBoard,scoreMatchesBoard}=require('../js/score-metadata.js');
const metadata={v1:{appVersion:'0.4.9',buildNumber:'17',platform:'iOS',scoreSpecVersion:'v1'},v2:{appVersion:'0.4.10',buildNumber:'18',platform:'iOS',scoreSpecVersion:'v2'},v3:{appVersion:'0.4.11',buildNumber:'19',platform:'iOS',scoreSpecVersion:'v3'},v4:{appVersion:'0.4.46',buildNumber:null,platform:'Web',scoreSpecVersion:'v4'},v5:{appVersion:'0.5.9',buildNumber:null,platform:'Web',scoreSpecVersion:'v5'}};
const versions=['v1','v2','v3','v4','v5'],score=version=>({moves:Number(version.slice(1))*4,timeMs:100,...metadata[version]});
const clone=x=>JSON.parse(JSON.stringify(x));
function store(data=new Map()){return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};}
async function web(current) {
 const historical=versions.slice(0,versions.indexOf(current)),all=[...historical,current],fresh={...score(current),version:current};
 const archive=Object.fromEntries(historical.map(version=>[version,{...score(version),version}]));
 const data=new Map([['ascent.pending-scores.v1',JSON.stringify({uid:'owner',items:[...all.map(version=>[version+'_existing_1',score(version)]),['v1_prototype_2',{moves:3,timeMs:50}]]})]]),sent=[];
 const context=vm.createContext({localStorage:store(data),sent,console});
 vm.runInContext(`const COURSE_RANKINGS_ENABLED=true;const COURSE_VERSION=${JSON.stringify(current)},RELEASE_VERSION=${JSON.stringify(metadata[current].appVersion)},RECORDS_KEY='records',ONLINE_CACHE_MS=1;
 const document={getElementById:()=>({})},accountDeletion={marker:false},online={ready:false,uid:'owner'},stageRecords={existing:{1:${JSON.stringify({...fresh,stars:3,previousVersions:archive})}},prototype:{}};
 function gameText(){return '';}function readOnlineCheckpoint(){return null;}function compareStageScores(a,b){return a.moves-b.moves||a.timeMs-b.timeMs;}
 const state='map',stageStartContext=null;`+fs.readFileSync('js/score-metadata.js','utf8')+fs.readFileSync('js/online-scores.js','utf8'),context);
 assert.equal(JSON.parse(data.get('ascent.pending-scores.v1')).items.length,all.length+1,'Upgrade retains every generation and retired-mode queue');
 await vm.runInContext(`online.ready=true;online.adapter={saveScore:async(uid,board,score)=>{sent.push({uid,board,score});if(stageRecords.existing[1].version!==COURSE_VERSION)throw Error('old upload overwrote new record');return score;}};flushOnlineScores()`,context);
 assert.deepEqual(sent.map(x=>x.board),all.map(v=>v+'_existing_1'));
 all.forEach((version,i)=>assert.deepEqual(scoreMetadata(sent[i].score),metadata[version]));
 const record=clone(vm.runInContext('stageRecords.existing[1]',context));assert.equal(record.version,current);assert.equal(record.moves,fresh.moves);assert.deepEqual(record.previousVersions,archive);assert.equal(record.stars,3);
 assert.deepEqual(JSON.parse(data.get('ascent.pending-scores.v1')).items.map(x=>x[0]),['v1_prototype_2']);
 for(const version of historical){
  await vm.runInContext(`onlineScores.pending.set('${version}_existing_1',{moves:2,timeMs:1});flushOnlineScores()`,context);
  assert.equal(vm.runInContext('stageRecords.existing[1].version',context),current);assert.equal(vm.runInContext('stageRecords.existing[1].moves',context),fresh.moves);
 }
 assert.equal(vm.runInContext("queueOnlineScore(2,'prototype',{moves:1,timeMs:0})",context),false);
 // A current readback replacing a still-legacy local record must archive it too.
 const preceding=historical.at(-1);context.oldRecord={...score(preceding),version:preceding,stars:2,previousVersions:{v1:{...score('v1'),version:'v1'}}};
 await vm.runInContext(`stageRecords.existing[2]=oldRecord;onlineScores.pending.set(COURSE_VERSION+'_existing_2',{moves:30,timeMs:400});flushOnlineScores()`,context);
 const updated=clone(vm.runInContext('stageRecords.existing[2]',context));assert.equal(updated.version,current);assert.equal(updated.previousVersions[preceding].moves,score(preceding).moves);assert(!updated.previousVersions[preceding].previousVersions);assert.equal(updated.stars,undefined,'Old-generation stars stay archived, not assigned to new board');
}
function transfer() {
 const source=fs.readFileSync('js/transfer.js','utf8'),context=vm.createContext({supportedCourseVersion,historicalCourseVersion});
 vm.runInContext(`function transferObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}function transferInteger(v,min=0,max=Number.MAX_SAFE_INTEGER-1){return Number.isSafeInteger(v)&&v>=min&&v<=max;}`+source.slice(source.indexOf('function validTransferRecord('),source.indexOf('function transferStorageEntries(')),context);
 context.record={...score('v3'),version:'v3',previousVersions:{v1:{...score('v1'),version:'v1'},v2:{...score('v2'),version:'v2'}}};assert(vm.runInContext('validTransferRecord(record)',context));
 context.record.previousVersions['trial-d7-offset10']={moves:8,timeMs:8,stars:2,version:'trial-d7-offset10',scoreSpecVersion:'trial-d7-offset10',rankingEligible:false};assert(vm.runInContext('validTransferRecord(record)',context),'Trial provenance is valid local transfer history, never an upload board');
 context.record.previousVersions.v1.previousVersions={};assert(!vm.runInContext('validTransferRecord(record)',context),'Reject recursive history');delete context.record.previousVersions.v1.previousVersions;
 context.record.previousVersions.v6={moves:1,timeMs:1,version:'v6'};assert(!vm.runInContext('validTransferRecord(record)',context),'Reject unknown history generation');
}
(async()=>{
 for(const board of ['v1_existing_1','v1_prototype_999999','v2_existing_1','v3_existing_1','v4_existing_1','v5_existing_1'])assert(supportedScoreBoard(board));
 for(const board of ['v6_existing_1','v5_prototype_1','v4_prototype_1','trial-d7-offset10_existing_1','v2_prototype_1','v3_prototype_1','v1_existing_0','v3_existing_1000000','v3_existing_1suffix'])assert(!supportedScoreBoard(board));
 for(const version of versions){assert(scoreMatchesBoard(version+'_existing_1',{}));assert(scoreMatchesBoard(version+'_existing_1',{scoreSpecVersion:null}));for(const other of versions)assert.equal(scoreMatchesBoard(version+'_existing_1',{scoreSpecVersion:other}),version===other);}
 for(const current of ['v2','v3','v4','v5']){await web(current);}transfer();
 console.log('PASS v1→v2→v3→v4→v5 migration: mixed Web queues, retired mode preserved, original metadata, late legacy acknowledgements, trial IDs excluded from upload boards, historical archive/transfer');
})().catch(error=>{console.error(error);process.exitCode=1;});
