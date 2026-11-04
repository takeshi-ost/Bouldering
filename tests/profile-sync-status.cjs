'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./tutorial-modals.cjs');
const html=fs.readFileSync('index.html','utf8');
const dialog=html.match(/<dialog id="settingsDialog"[\s\S]*?<\/dialog>/)[0];
const ids=['stageDebugDisplay','onlineStatus','onlineScoreStatus'];
for(let i=1;i<ids.length;i++)assert(dialog.indexOf('id="'+ids[i-1]+'"')<dialog.indexOf('id="'+ids[i]+'"'));
assert.equal((dialog.match(/id="onlineStatus"/g)||[]).length,1);
const copy={ja:{saving:'プロフィール同期中…',saved:'プロフィール同期済み',failed:'プロフィール未同期（通信を確認してください）'},en:{saving:'Syncing profile…',saved:'Profile synced',failed:'Profile not synced (check your connection)'}};
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
(async()=>{
 for(const lang of ['ja','en']){
  const b=boot(new Map([['ascent.language.v1',lang]]));
  // Real profile queue transitions with an unresolved response and a separate
  // score still waiting: profile success must never imply score completion.
  b.run(`onlineScores.owner='synthetic';onlineScores.pending.set('v4_existing_1',{moves:8,timeMs:1000});persistPendingScores();
    online.ready=true;online.uid='synthetic';
    online.adapter={sync:()=>new Promise(resolve=>{globalThis.resolveProfile=resolve;})};
    queueOnlineProfileSave();`);
  assert.equal(b.node('onlineStatus').textContent,copy[lang].saving);
  const scores=b.run('JSON.stringify([...onlineScores.pending])');
  const other=lang==='ja'?'en':'ja';b.run(`setGameLanguage('${other}');`);
  assert.equal(b.node('onlineStatus').textContent,copy[other].saving);
  b.run(`setGameLanguage('${lang}');resolveProfile(onlineProfile());`);await tick();
  assert.equal(b.node('onlineStatus').textContent,copy[lang].saved);
  assert.equal(b.run('JSON.stringify([...onlineScores.pending])'),scores);
  assert(b.node('onlineScoreStatus').textContent.includes('1'));
  b.run(`online.adapter.sync=async()=>{throw {code:'unavailable'};};queueOnlineProfileSave();`);await tick();
  assert.equal(b.node('onlineStatus').textContent,copy[lang].failed);assert(b.run('online.dirty'));
  b.run(`setGameLanguage('${other}');`);assert.equal(b.node('onlineStatus').textContent,copy[other].failed);
  b.run(`online.adapter.sync=async(uid,profile)=>profile;flushOnlineProfile();`);await tick();
  assert.equal(b.node('onlineStatus').textContent,copy[other].saved);assert(!b.run('online.dirty'));
  assert.equal(b.run('JSON.stringify([...onlineScores.pending])'),scores);
  for(const key of ['online','online.startOnline','firebase-client.bootFirebase']){
   b.run(`setOnlineStatus(gameText('${key}'));setGameLanguage('${lang}');`);
   const text=b.node('onlineStatus').textContent;
   assert(text.toLowerCase().includes(lang==='ja'?'プロフィール':'profile'),key+' always identifies profile scope');
  }
 }
 console.log('PASS profile sync: shared bottom position; JA/EN in-flight, success, failed/pending, retry and locale refresh; independent pending scores retained; no live network');
})().catch(error=>{console.error(error);process.exitCode=1;});
