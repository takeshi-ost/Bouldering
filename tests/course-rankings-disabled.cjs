'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
assert.match(read('js/config.js'), /const COURSE_RANKINGS_ENABLED = true;/);
// Keep testing the explicit disabled fallback independently of the restored default.
const config='const COURSE_RANKINGS_ENABLED = false;';
const raw=JSON.stringify({uid:'old-owner',items:[['v4_existing_26',{moves:19,timeMs:1000}]]});
const data=new Map([['ascent.pending-scores.v1',raw]]),elements={},calls=[];
const c=vm.createContext({console,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>{calls.push('write');data.set(k,v);}},elements,calls});
vm.runInContext(config+`const COURSE_VERSION='v5';const document={getElementById:id=>elements[id]||=( {setAttribute(){}})};const ui={resultRanking:{},resultLeaderboard:{},stageStartRanking:{},stageStartLeaderboard:{},stageStartStars:{setAttribute(){}}};const online={ready:true,uid:'new-owner',adapter:{saveScore:async()=>{calls.push('save');},scores:async()=>{calls.push('read');}}};const stageRecords={existing:{1:{version:'v5',moves:3,stars:2}}},stageProgress={existing:{cleared:1}};const state='map',stageStartContext=null;function gameText(){return '';} `+read('js/score-metadata.js')+read('js/online-scores.js')+read('js/leaderboard.js'),c);
(async()=>{
 await vm.runInContext(`(async()=>{connectOnlineScores('new-owner');await flushOnlineScores();if(queueOnlineScore(1,'existing',{moves:2,timeMs:2})!==false)throw Error('queued');onlineStageScores(1,'existing');renderStageLeaderboard();renderStageStartRecord({n:1,mode:'existing'});persistPendingScores();})()`,c);
 assert.equal(data.get('ascent.pending-scores.v1'),raw);assert.deepEqual(calls,[]);
 assert.equal(vm.runInContext('onlineScores.pending.size',c),1);
 assert(vm.runInContext('ui.resultRanking.hidden && ui.stageStartRanking.hidden && !ui.stageStartStars.hidden',c));
 assert(elements.onlineScoreStatus.hidden);
 const fb=read('js/firebase-client.js');assert.match(fb,/async saveScore\(uid,board,score\) \{\s*if\(!COURSE_RANKINGS_ENABLED\)return null;/);assert.match(fb,/async scores\(uid,board\) \{\s*if\(!COURSE_RANKINGS_ENABLED\)return \[\];/);
 assert.match(read('js/game.js'),/const showRanking=COURSE_RANKINGS_ENABLED &&/);
 assert(!/queueOnlineScore|saveScore|onlineStageScores/.test(read('js/daily.js')));
 console.log('PASS disabled course rankings: no reads/writes/queue additions, byte-identical historic queue, hidden panels, local stars retained, daily remains local');
})().catch(e=>{console.error(e);process.exitCode=1;});
