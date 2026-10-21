const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{setProperty(){}},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
(async()=>{try{await new Function('assert','data',env+source+`;return (async()=>{
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
assert.equal(validStageScore({moves:1,timeMs:0}),true);
for(const score of [{moves:0,timeMs:10},{moves:1.1,timeMs:10},{moves:1,timeMs:-1},{moves:1,timeMs:Infinity},{moves:1,timeMs:604800001}])assert(!validStageScore(score));
assert(validScoreBoard(scoreBoardKey(1,'existing')));assert(!validScoreBoard('v0_existing_1'));assert(!validScoreBoard('v1_daily_1'));assert(!validScoreBoard('v1_existing_0'));
// No old unversioned records are automatically submitted. Only a new clear queues a score.
stageRecords.existing[1]={moves:1,timeMs:1,stars:3};assert.equal(onlineScores.pending.size,0);
queueOnlineScore(1,'existing',{moves:12,timeMs:5000});queueOnlineScore(1,'existing',{moves:13,timeMs:100});
queueOnlineScore(1,'existing',{moves:12,timeMs:4000});
const board=scoreBoardKey(1,'existing');assert.deepEqual(onlineScores.pending.get(board),{moves:12,timeMs:4000});
assert.equal(JSON.parse(data[ONLINE_SCORES_KEY]).items.length,1);
onlineScores.pending.clear();readPendingScores();assert.equal(onlineScores.pending.size,1,'Offline queue survives reload');
const stored=new Map();let fail=false,writes=0;
online.uid='self';online.ready=true;onlineScores.owner='self';
online.adapter={async saveScore(uid,key,score){assert.equal(uid,'self');if(fail)throw {code:'unavailable'};
 const old=stored.get(key);if(!old || compareStageScores(score,old)<0){stored.set(key,{...score});writes++;}return stored.get(key);
}};
await flushOnlineScores();assert.equal(onlineScores.pending.size,0);assert.equal(stored.get(board).timeMs,4000);assert.equal(stageRecords.existing[1].version,COURSE_VERSION);assert.equal(stageRecords.existing[1].stars,3);
queueOnlineScore(1,'existing',{moves:15,timeMs:100});await tick();assert.equal(writes,1);assert.equal(stageRecords.existing[1].moves,12,'A worse replay must not replace server best');
fail=true;queueOnlineScore(1,'existing',{moves:10,timeMs:9000});await tick();assert(onlineScores.pending.has(board));assert.equal(JSON.parse(data[ONLINE_SCORES_KEY]).items.length,1);
fail=false;await flushOnlineScores();assert(!onlineScores.pending.size);assert.equal(stored.get(board).moves,10);
// Improvement submitted during a write is sent afterward without losing it.
const normalSave=online.adapter.saveScore;let release;
online.adapter.saveScore=async(...args)=>{await new Promise(r=>release=r);return normalSave(...args);};
queueOnlineScore(1,'existing',{moves:9,timeMs:9000});queueOnlineScore(1,'existing',{moves:8,timeMs:10000});
release();await tick();assert(onlineScores.saving);release();await tick();assert.equal(stored.get(board).moves,8);assert(!onlineScores.pending.size);
online.adapter.saveScore=normalSave;
// An old guest's pending scores never get attributed to a different auth UID.
online.ready=false;queueOnlineScore(2,'existing',{moves:5,timeMs:100});connectOnlineScores('different');assert.equal(onlineScores.pending.size,0);onlineScores.owner='self';online.ready=true;
// Real profiles, personal best ordering and one self row, including cloud-only scores.
const profile={name:'<Other>',colors:['#123456','#abcdef'],headColor:'#445566',reachedLevel:3,reachedPrototypeLevel:1};
const records=Array.from({length:8},(_,i)=>({id:'p'+i,moves:10+i,timeMs:1000,profile}));
records.push({id:'self',moves:16,timeMs:500});let loads=0;
online.adapter.scores=async()=>{loads++;return records;};
let rows=currentStageScores(3,'existing');assert.equal(rows.length,0);assert.equal(rows.rankingReady,false);await tick();
rows=currentStageScores(3,'existing');assert(rows.rankingReady);assert.equal(loads,1);
let shown=stageLeaderboardRows({moves:20,timeMs:100},rows);assert.equal(shown.length,5);assert.equal(shown.at(-1).moves,16);assert.equal(shown.at(-1).rank,7);assert.equal(shown.filter(p=>p.isPlayer).length,1);
const markup=stageLeaderboardMarkup(null,rows);assert(markup.includes('&lt;Other&gt;'));assert(markup.includes('#abcdef'));assert(!markup.includes('Dummy'));
shown=stageLeaderboardRows({moves:1,timeMs:100},rows);assert(shown[0].isPlayer);assert.equal(shown[0].rank,1);
const longRows=Array.from({length:100},(_,i)=>({id:'p'+i,moves:i+1,timeMs:100}));longRows.push({id:'self',moves:200,timeMs:100});assert.equal(stageLeaderboardRows(null,longRows).at(-1).rank,'100+');
// Unknown ranks must not claim 1st place while a request is still pending.
const waiting=Object.defineProperty([],'rankingReady',{value:false});assert(stageLeaderboardMarkup({moves:1,timeMs:0},waiting).includes('score-rank">—</span>'));
// Slow request for one modal cannot repaint the currently selected other stage.
const resolves=new Map();online.adapter.scores=async(uid,key)=>new Promise(r=>resolves.set(key,r));
stageProgress.existing.cleared=5;state='map';
stageStartContext={n:4,mode:'existing'};renderStageStartRecord(stageStartContext);
stageStartContext={n:5,mode:'existing'};renderStageStartRecord(stageStartContext);const before=ui.stageStartLeaderboard.innerHTML;
resolves.get(scoreBoardKey(4,'existing'))(records);await tick();assert.equal(ui.stageStartLeaderboard.innerHTML,before);
resolves.get(scoreBoardKey(5,'existing'))(records);await tick();assert(ui.stageStartLeaderboard.innerHTML.includes('&lt;Other&gt;'));
// Debug clears never queue records; normal replays preserve best and highest stars.
stageStartContext=null;online.ready=false;debugAttempt=true;const pending=onlineScores.pending.size;recordStageClear();assert.equal(onlineScores.pending.size,pending);
debugAttempt=false;reset(1);moveCount=30;runElapsedMs=50000;recordStageClear();assert.equal(stageRecords.existing[1].moves,8);assert(onlineScores.pending.has(board));
console.log('PASS online scores: version/bounds, fresh-clear-only submission, offline queue/reload, monotonic personal best, concurrent improvements, guest ownership, real profiles/ranking, self deduplication, 100+ fallback, loading ranks, stale modal isolation and debug exclusion');
})();`)(assert,data);}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}})().catch(e=>{console.error(e);process.exitCode=1;});
