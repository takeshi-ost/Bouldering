'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {boot,page,tap,play,settleTransition}=require('./tutorial-modals.cjs');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function controlledImages(){
 const images=[];
 class Image {
  constructor(){this.complete=false;this.naturalWidth=0;this.events={};this.decodeCalls=0;this.hidden=false;images.push(this);}
  set src(value){this.url=value;}get src(){return this.url;}
  addEventListener(name,fn){(this.events[name]||=[]).push(fn);}
  decode(){this.decodeCalls++;return this.promise??=new Promise((resolve,reject)=>{this.resolveDecode=resolve;this.rejectDecode=reject;});}
  load(){this.complete=true;this.naturalWidth=78;this.naturalHeight=78;this.onload?.();for(const fn of this.events.load||[])fn();}
  fail(){this.onerror?.();}
 }
 const pending=src=>images.filter(image=>image.src===src && typeof image.onload==='function').at(-1);
 return {Image,images,pending,async ready(src){const image=pending(src);assert(image,'pending image '+src);image.load();assert(image.decodeCalls>0);image.resolveDecode();await flush();return image;}};
}
const first='assets/tutorial-swipe-78-v1.png',second='assets/tutorial-feet-limit-78-v2.png',third='assets/tutorial-goal-hands-78-v2.png',wide='assets/hold-wide-flat.webp',goal='assets/tutorial-goal-feet-78-v2.png',gear='assets/settings-gear.svg',heart='assets/course-heart-2.svg',hazard='assets/hold-hazard-source.webp';
function startAtBoundary(b){b.run('titleReady=true;');b.node('titleScreen').onclick();assert(b.run('cameraIntro'));b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');assert.equal(b.run('cameraIntro'),null);}
const frozen=b=>b.run('JSON.stringify({body,grips,stamina,moveCount,runElapsedMs})');
function blocked(b){const before=frozen(b);b.run('down({clientX:body.x,clientY:body.y-camera});move({clientX:body.x+40,clientY:body.y-camera-40});release();undoMove();');assert.equal(frozen(b),before);}
(async()=>{
 // Cache sharing, real load + decode barrier, automatic retry and bounded timeout.
 {
  const c=controlledImages(),timers=new Map();let id=0;
  const context=vm.createContext({Image:c.Image,Promise,setTimeout(fn,ms){assert.equal(ms,4000);timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);}});
  vm.runInContext(fs.readFileSync('js/explanation-images.js','utf8'),context);const request=(src,fn)=>{context.src=src;context.ready=fn;vm.runInContext('requestExplanationImage(src,ready)',context);};
  const results=[];request(first,x=>results.push(x));request(first,x=>results.push(x));assert.equal(c.images.length,1);
  const original=c.pending(first);original.load();assert.equal(results.length,0,'load alone must not reveal a card');original.resolveDecode();await flush();assert.deepEqual(results,[original,original]);
  request(first,x=>results.push(x));assert.equal(results.length,2,'warm cache also rechecks decode before display');await flush();assert.equal(results[2],original,'mount the cached decoded node, not a URL clone');assert.equal(c.images.length,1);assert.equal(original.decodeCalls,2);
  request(second,x=>results.push(x));const failed=c.pending(second);failed.load();failed.rejectDecode(Error('decode failure'));await flush();assert.notEqual(c.pending(second),failed);const recovered=await c.ready(second);assert.equal(results.at(-1),recovered);
  request(third,x=>results.push(x));const late=c.pending(third);late.load();const before=results.length;
  const expire=()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);fn();};expire();assert.equal(results.length,before);expire();assert.equal(results.at(-1),null);assert.equal(timers.size,0,'two attempts terminate even when decode hangs');
  late.resolveDecode();await flush();assert.equal(results.length,before+1,'late decode must not replace a text-only result');
  request(third,x=>results.push(x));assert(c.pending(third),'failed cache entry is retryable on next request');await c.ready(third);assert(results.at(-1));
 }
 // Start waits at the original playable boundary. Success mounts the SAME decoded
 // node. Every later page, including hand/goal explanations, has its own barrier.
 {
  const c=controlledImages(),b=boot(new Map(),{imageClass:c.Image});startAtBoundary(b);
  assert(b.run('tutorialRun.imageLoading'));assert(!b.node('tutorialDialog').open);assert(b.run('featureHelpOpen'));blocked(b);const before=frozen(b);b.advance(60000);assert.equal(frozen(b),before);assert.equal(b.run('runTimeMs()'),0);
  const image=c.pending(first);image.load();assert(!b.node('tutorialDialog').open);tap(b,false);assert.equal(b.run('tutorialRun.explanation.id'),'intro-welcome');image.resolveDecode();await flush();page(b,1);assert.equal(b.node('tutorialImage'),image);
  tap(b,false);b.fireTimer(b.run('tutorialRun.transitionTimer'));assert.equal(b.run('tutorialRun.transition'),'loading');assert(b.node('tutorialDialog').classList.contains('explanation-image-loading'));blocked(b);tap(b,false);
  await c.ready(second);assert.equal(b.run('tutorialRun.transition'),'opening');settleTransition(b);page(b,2);
  tap(b,false);b.fireTimer(b.run('tutorialRun.transitionTimer'));await c.ready(third);settleTransition(b);page(b,3);tap(b);
  const center=b.run('route.findIndex(p=>p.grips?.slice(0,2).includes(tutorialRun.centerHoldId))');for(let i=1;i<=center;i++)play(b,i);
  assert(b.run('tutorialRun.imageLoading'));assert(!b.node('tutorialDialog').open);blocked(b);await c.ready(wide);page(b,4);tap(b);
  const length=b.run('route.length');for(let i=center+1;i<length;i++)play(b,i);
  assert(b.run('tutorialRun.imageLoading'));assert.equal(b.run('tutorialRun.pendingOutcome'),true);assert.equal(b.run('state'),'playing');assert.equal(b.run('stageStartContext'),null);blocked(b);
  await c.ready(goal);page(b,5);tap(b,false);b.fireTimer(b.run('tutorialRun.transitionTimer'));assert.equal(b.run('state'),'playing');assert.equal(b.run('tutorialPending()'),true);
  await c.ready(gear);settleTransition(b);page(b,6);tap(b);assert.equal(b.run('state'),'map');assert.equal(b.run('stageStartContext.n'),1);
 }
 // Error twice falls back once to a blank plate plus unchanged text, never a late
 // inserted image. A new attempt retries, and obsolete loads cannot open dialogs.
 {
  const c=controlledImages(),b=boot(new Map(),{imageClass:c.Image});startAtBoundary(b);const firstAttempt=c.pending(first);firstAttempt.fail();assert(!b.node('tutorialDialog').open);c.pending(first).fail();
  assert(b.node('tutorialDialog').open);assert(b.node('tutorialImage').hidden);assert(!b.run('tutorialRun.imageLoading'));assert.equal(b.node('tutorialText').textContent,'画面スワイプで移動、指をはなしてホールドを決定します');
  firstAttempt.load();await flush();assert(b.node('tutorialImage').hidden);
  b.run('showTitleScreen();');startAtBoundary(b);assert(c.pending(first));b.run('showTitleScreen();');await c.ready(first);assert(!b.node('tutorialDialog').open);assert.equal(b.run('state'),'choosing');
  startAtBoundary(b);await flush();page(b,1);tap(b,false);b.fireTimer(b.run('tutorialRun.transitionTimer'));b.run('showTitleScreen();');await c.ready(second);assert(!b.node('tutorialDialog').open);assert(b.run('tutorialPending()'));
 }
 // The actual hazard painter consumes the supplied decoded source synchronously;
 // renderer's separate Image need not have finished, and no late listener is added.
 {
  const c=controlledImages(),b=boot(new Map([['ascent.player-uuid.v1','existing']]),{imageClass:c.Image});await c.ready(hazard);
  b.run(`document.createElement=()=>({width:0,height:0,getContext:()=>({drawImage(){},getImageData(){return {data:new Uint8Array([120,120,120,255])};},putImageData(){}})});
    var iconPaint=[];var iconCanvas={width:128,height:128,getContext:()=>Object.fromEntries(['clearRect','save','translate','rotate','drawImage','restore'].map(name=>[name,(...args)=>iconPaint.push(name)]))};
    assert.equal(hazardHoldImage.complete,false);
    assert.equal(paintHazardHelpIcon(iconCanvas,explanationImageCache.get('assets/hold-hazard-source.webp').image),true);
    assert.deepEqual(iconPaint,['clearRect','save','translate','rotate','drawImage','restore']);
    assert.equal(paintHazardHelpIcon(iconCanvas,null),false);assert.equal(iconPaint.length,6);`);
 }
 // Heart IMG and hazard canvas stay invisible until their decoded source is ready.
 // Consecutive feature pages retain pause/shield and do not acknowledge early taps.
 {
  const c=controlledImages(),b=boot(new Map([['ascent.player-uuid.v1','existing']]),{imageClass:c.Image});
  b.run("reset(1);featureHelpSeen={heart:false,hazard:false};hearts=[{x:200,y:300}];holds.push({type:'hazard'});showStageHelp();");
  assert(b.run('featureHelpImageLoading'));assert(!b.node('featureHelpDialog').open);blocked(b);b.run('dismissStageHelp();');assert(!b.run('featureHelpSeen.heart'));
  const decodedHeart=await c.ready(heart);assert(b.node('featureHelpDialog').open);assert.equal(b.node('featureHelpContent').querySelector('.course-heart-icon'),decodedHeart);
  b.run('var hazardPainted=false;paintHazardHelpIcon=(canvas,image)=>{assert(image.complete);assert(image.decodeCalls>0);assert(featureHelpImageLoading);hazardPainted=true;};dismissStageHelp();');
  assert(b.run('featureHelpSeen.heart'));assert(!b.run('featureHelpSeen.hazard'));assert(b.node('featureHelpDialog').classList.contains('explanation-image-loading'));assert(!b.run('hazardPainted'));blocked(b);
  await c.ready(hazard);assert(b.run('hazardPainted'));assert(!b.node('featureHelpDialog').classList.contains('explanation-image-loading'));b.run('dismissStageHelp();');assert(!b.run('featureHelpOpen'));assert.equal(b.run('cameraIntro.start'),null);
 }
 // Feature image failure remains dismissible; leaving during loading cannot reopen.
 {
  const c=controlledImages(),b=boot(new Map([['ascent.player-uuid.v1','existing']]),{imageClass:c.Image});b.run('reset(1);hearts=[{}];showStageHelp();');c.pending(heart).fail();c.pending(heart).fail();assert(b.node('featureHelpDialog').open);assert(b.node('featureHelpContent').querySelector('.course-heart-icon').hidden);b.run('dismissStageHelp();');assert(!b.run('featureHelpOpen'));
  b.run('reset(1);featureHelpSeen.heart=false;hearts=[{}];showStageHelp();showTitleScreen();');await c.ready(heart);assert(!b.node('featureHelpDialog').open);assert(!b.run('featureHelpOpen'));
 }
 console.log('PASS explanation image readiness: shared preload/cache, actual decoded-node mount, all six tutorial pages and heart/hazard barrier, continuous pause/input/goal deferral, decode/error retry, 2×4s timeout, text-only nonblocking fallback, no late insertion, subsequent retry and stale navigation/transition guards (controlled Image/DOM, not browser QA)');
})().catch(error=>{console.error(error);process.exitCode=1;});
