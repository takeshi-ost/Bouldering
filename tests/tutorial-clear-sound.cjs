'use strict';
const assert=require('node:assert/strict');
const {boot,page,tap,play,settleTransition}=require('./tutorial-modals.cjs');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const goalImage='assets/tutorial-goal-feet-78-v2.png';
function controlledImages(){
 const images=[];
 class Image {
  constructor(){this.complete=false;this.naturalWidth=0;this.hidden=false;images.push(this);}
  set src(src){this.url=src;}get src(){return this.url;}
  decode(){return this.promise??=new Promise((resolve,reject)=>{this.resolveDecode=resolve;this.rejectDecode=reject;});}
  load(){this.complete=true;this.naturalWidth=this.naturalHeight=78;this.onload?.();}
  fail(){this.onerror?.();}
 }
 const pending=src=>images.filter(x=>x.src===src && typeof x.onload==='function').at(-1);
 return {Image,pending,async ready(src){const image=pending(src);assert(image,src);image.load();image.resolveDecode();await flush();return image;}};
}
function trace(b){return JSON.parse(b.run('JSON.stringify(clearOrder)'));}
function installTrace(b){
 b.run('var clearOrder=[];playSound=name=>clearOrder.push(name);');
 const dialog=b.node('tutorialDialog'),open=dialog.showModal;
 dialog.showModal=function(){b.run('clearOrder.push("open:"+tutorialRun.explanation.id)');open.call(this);};
}
async function advance(b){
 tap(b,false);
 if(b.run('!!tutorialRun?.transition')){
  b.fireTimer(b.run('tutorialRun.transitionTimer'));await flush();settleTransition(b);
 }
}
async function climb(b){
 b.run('titleReady=true;');b.node('titleScreen').onclick();b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');await flush();
 for(let n=1;n<=3;n++){page(b,n);await advance(b);}
 const center=b.run('route.findIndex(p=>p.grips?.slice(0,2).includes(tutorialRun.centerHoldId))');
 for(let i=1;i<=center;i++)play(b,i);await flush();page(b,4);await advance(b);
 b.run('clearOrder=[];');
 const length=b.run('route.length');for(let i=center+1;i<length;i++)play(b,i);
 assert(b.run('bothHandsOnGoal() && grips.every((h,i)=>h && limbReachable(body,h,i))'));
}
async function finishPages(b){
 page(b,5);assert.deepEqual(trace(b).filter(x=>x==='clear'||x.startsWith('open:')),['clear','open:goal-fixed']);
 b.run('finishTutorialRun(true);finishTutorialRun(false);');assert.equal(b.run('tutorialRun.pendingOutcome'),true);
 const frozen=b.run('JSON.stringify({body,grips,stamina,moveCount,runElapsedMs})');b.advance(30000);
 b.run('down({clientX:body.x,clientY:body.y-camera});release();undoMove();');assert.equal(b.run('JSON.stringify({body,grips,stamina,moveCount,runElapsedMs})'),frozen);
 b.run('clearOrder=[];');await advance(b);page(b,6);await advance(b);
 assert.deepEqual(trace(b),['move','move'],'No delayed/duplicate clear at page taps or map transition');
 assert.equal(b.run('state'),'map');assert.equal(b.run('stageStartContext.n'),1);assert.equal(b.run('AscentTutorialState.snapshot().reason'),'cleared');
 b.run('finishTutorialRun(true);');assert.deepEqual(trace(b),['move','move']);
}
(async()=>{
 // Synchronous ready callback is the tightest ordering race: success must be
 // dispatched before tutorialTrigger can open the very first goal card.
 {
  const b=boot();installTrace(b);await climb(b);await finishPages(b);
 }
 // Existing clear file and effects bus, including a muted success which must
 // not be replayed if SE is enabled while the result explanations are read.
 for(const [enabled,volume] of [[true,.35],[false,.35],[true,0]]){
  const voices=[],param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
  class Audio {
   constructor(){this.state='running';this.currentTime=1;this.destination={};this.sampleRate=44100;}
   createGain(){return {gain:param(),connect(to){this.output=to;},disconnect(){}};}
   createBuffer(ch,n){return {length:n,getChannelData:()=>new Float32Array(n)};}
   createBufferSource(){const v={connect(to){this.output=to;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(v);return v;}
   createOscillator(){throw Error('Uncached non-clear cues are irrelevant to this file-path assertion');}
  }
  const b=boot(new Map(),{audioClass:Audio});b.run('var originalPlaySound=playSound;');installTrace(b);
  b.run(`playSound=name=>{clearOrder.push(name);return originalPlaySound(name);};musicEnabled=false;unlockSound();soundFileCache.set('clear',{buffer:{approvedClear:true},context:soundContext});setSoundVolume(${volume});soundEnabled=${enabled};`);
  await climb(b);page(b,5);const clearVoices=()=>voices.filter(v=>v.buffer?.approvedClear);
  assert.equal(clearVoices().length,enabled?1:0);
  if(enabled){const v=clearVoices()[0];assert(v.started);assert.equal(v.output.output.gain.value,volume);assert.equal(v.output.gain.value,b.run('SOUND_FILES.clear.volume*SOUND_LEVELS.clear'));}
  b.run('soundEnabled=true;soundContext.currentTime+=1;');await finishPages(b);
  assert.equal(clearVoices().length,enabled?1:0,'No catch-up clear after unmuting or completing explanations');
 }
 // Real image helper: delayed load/decode, retry success, two errors and two
 // deadlines all retain success-before-open with no late callback replay.
 for(const mode of ['decode','retry','failure','timeout','interrupt']){
  const c=controlledImages(),b=boot(new Map(),{imageClass:c.Image});installTrace(b);
  // Real HTMLImageElement supports replaceWith; preserve that DOM behavior when
  // revisiting cached nodes in a restarted attempt, rather than mutating src.
  c.Image.prototype.replaceWith=b.node('tutorialImage').replaceWith;
  const sources=JSON.parse(b.run('JSON.stringify(TUTORIAL_CONFIG.steps.map(s=>s.image))'));
  for(const src of sources.filter(src=>src!==goalImage))await c.ready(src);
  // Settle unrelated title preloads so only the goal image has live deadlines.
  await c.ready('assets/course-heart-2.svg');await c.ready('assets/hold-hazard-source.webp');
  await climb(b);assert(!b.node('tutorialDialog').open);assert(b.run('tutorialRun.imageLoading'));assert.equal(b.run('tutorialRun.pendingOutcome'),true);
  assert.deepEqual(trace(b).filter(x=>x==='clear'||x.startsWith('open:')),['clear']);
  const paused=b.run('runTimeMs()');b.advance(60000);assert.equal(b.run('runTimeMs()'),paused);
  b.run('finishTutorialRun(true);finishTutorialRun(false);');tap(b,false);assert.equal(trace(b).filter(x=>x==='clear').length,1);
  const first=c.pending(goalImage);
  if(mode==='interrupt'){
   b.run('showTitleScreen();');await c.ready(goalImage);assert(!b.node('tutorialDialog').open);assert.equal(b.run('state'),'choosing');assert(b.run('tutorialPending()'));
   assert.equal(trace(b).filter(x=>x==='clear').length,1);
   // A new attempt gets its own single cue; late old callbacks never open pages.
   await climb(b);await flush();await finishPages(b);continue;
  }
  if(mode==='decode'){
   first.load();await flush();assert(!b.node('tutorialDialog').open);first.resolveDecode();await flush();
  }else if(mode==='retry'){
   first.fail();assert(!b.node('tutorialDialog').open);await c.ready(goalImage);
  }else if(mode==='failure'){
   first.fail();c.pending(goalImage).fail();assert(b.node('tutorialImage').hidden);
  }else{
   first.load();b.flush();assert(!b.node('tutorialDialog').open);b.flush();assert(b.node('tutorialImage').hidden);
   first.resolveDecode();await flush();assert(b.node('tutorialImage').hidden);
  }
  if(mode==='failure'||mode==='timeout'){
   assert.equal(b.run('tutorialRun.explanation.id'),'goal-fixed');assert(b.node('tutorialDialog').open);
   // page() expects artwork; the bounded text-only fallback is intentional.
   assert.deepEqual(trace(b).filter(x=>x==='clear'||x.startsWith('open:')),['clear','open:goal-fixed']);
   b.run('clearOrder=[];');await advance(b);page(b,6);await advance(b);assert.deepEqual(trace(b),['move','move']);assert.equal(b.run('state'),'map');
  }else await finishPages(b);
 }
 // A genuine exhausted tutorial still plays only fail and reaches Stage 1;
 // ordinary stage result sounds remain covered by audio.cjs.
 {
  const b=boot();installTrace(b);b.run('titleReady=true;');b.node('titleScreen').onclick();b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');for(let n=1;n<=3;n++)await advance(b);
  b.run('clearOrder=[];const low={...route[0]},high={...route[1]},budget=stamina;for(let i=0;i<budget;i++){const p=i%2?low:high;camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);down({clientX:body.x,clientY:body.y-camera});move({clientX:p.x,clientY:p.y-camera});release();}');
  assert.deepEqual(trace(b).filter(x=>x==='clear'||x==='fail'||x.startsWith('open:')),['fail']);assert.equal(b.run('state'),'map');assert.equal(b.run('AscentTutorialState.snapshot().reason'),'failed');
 }
 console.log('PASS tutorial clear ordering: actual valid goal emits clear once before first goal card (sync/delayed decode/retry/error/timeout), no replay after TAP/completion/stale callbacks, interruption retry, continuous pause and genuine failure unchanged (no device audio audition)');
})().catch(error=>{console.error(error);process.exitCode=1;});
