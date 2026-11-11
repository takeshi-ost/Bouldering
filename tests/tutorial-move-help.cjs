'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {boot,tap}=require('./tutorial-modals.cjs');
function start(b){b.run('titleReady=true;');b.node('titleScreen').onclick();b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');for(let i=0;i<3;i++)tap(b);}
function move(b,n,cancel=false){b.run(`var p=route[${n}];down({clientX:200,clientY:500});for(const d of p.action.points)move({clientX:200+d.dx,clientY:500+d.dy});release(${cancel});`);}
for(const [lang,cancel,undo,cancelTitle,undoTitle] of [
 ['ja','2本タップで移動をキャンセルできます','ボディを短くタップすると1ムーブ戻せます','操作のやり直し','アンドゥ'],
 ['en','Tap with two fingers to cancel your current move','Briefly tap the climber’s back to undo your last move','Cancel Move','Undo']]) {
 const b=boot(new Map([['ascent.language.v1',lang],['ascent.tutorial-stage0.v1',JSON.stringify({version:1,status:'pending',reason:'test'})]]));start(b);
 for(let i=1;i<=3;i++){move(b,i);assert.equal(b.run('moveCount'),i);assert(!b.run('tutorialInstructionsOpen()'),'no help before confirmed move four');}
 move(b,4,true);assert.equal(b.run('moveCount'),3);assert(!b.run('tutorialInstructionsOpen()'));
 move(b,4);assert.equal(b.run('moveCount'),4);assert.equal(b.node('tutorialText').textContent,cancel);assert.equal(b.node('tutorialTitle').textContent,cancelTitle);
 assert.equal(b.node('tutorialImage').src,'assets/tutorial-two-finger-cancel-78-v1.png');
 const frozen=b.run('JSON.stringify({body,grips,stamina,moveCount,runElapsedMs})');
 b.advance(5000);b.run('undoMove();down({clientX:200,clientY:500});release();tutorialTrigger("move");');
 assert.equal(b.run('JSON.stringify({body,grips,stamina,moveCount,runElapsedMs})'),frozen);
 assert.equal(b.run('tutorialRun.queue.length'),1);tap(b);
 assert.equal(b.node('tutorialText').textContent,undo);assert.equal(b.node('tutorialTitle').textContent,undoTitle);assert.equal(b.node('tutorialImage').src,'assets/help-body-tap-78-v1.png');tap(b);
 assert(b.run('undoMove()'));move(b,4);assert(!b.run('tutorialInstructionsOpen()'),'undo/recommit must not repeat either page');
 b.run('showTitleScreen();');const reloaded=boot(b.data);start(reloaded);for(let i=1;i<=4;i++)move(reloaded,i);assert.equal(reloaded.node('tutorialText').textContent,cancel,'interrupted tutorial restarts with help intact');
}
// The last goal tap cannot dismiss the Stage 1 backdrop; explicit Close still works.
for(const close of ['backdrop','button','normal']) {
 const b=boot();start(b);
 b.run('const p=route.at(-1);body={x:p.x,y:p.y};grips=p.grips.map(id=>holds.find(h=>h.id===id));finishTutorialRun(true);');
 tap(b);tap(b);assert(b.node('stageStartDialog').open);
 const backdrop=()=>b.node('stageStartDialog').events.click({target:b.node('stageStartDialog'),clientX:-1,clientY:-1});
 backdrop();assert(b.node('stageStartDialog').open);b.advance(399);backdrop();assert(b.node('stageStartDialog').open);
 if(close==='button'){b.node('closeStageStart').onclick();assert(!b.node('stageStartDialog').open);}
 else if(close==='backdrop'){b.advance(1);backdrop();assert(!b.node('stageStartDialog').open);}
 else {b.node('closeStageStart').onclick();b.run('openStageStart(1);');backdrop();assert(!b.node('stageStartDialog').open,'ordinary stage selection has no guard');}
}
const png=fs.readFileSync('assets/tutorial-two-finger-cancel-78-v1.png');assert.equal(png.readUInt32BE(16),78);assert.equal(png.readUInt32BE(20),78);
console.log('PASS confirmed 4-move JA/EN help, cancel, pause, undo/recommit, restart and scoped 400ms backdrop guard');
