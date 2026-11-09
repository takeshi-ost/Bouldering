'use strict';
// Actual default tutorial pages and native input lifecycle in classic-script order.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
// Pin all four approved 78px PNGs, not re-encoded or generated substitutes.
const approvedArtworks=[
 ['assets/tutorial-swipe-78-v1.png','2c9650008a84143599e5881c970b435a3decad380f9a3eaf370db16ae594a968'],
 ['assets/tutorial-feet-limit-78-v2.png','9a560637230823a0007d0410d899d9a6e11f616277810eeb49ce4a5e90caa996'],
 ['assets/tutorial-goal-hands-78-v2.png','b01ebf14e189fb3cab872558e6224570dc311c029b7f9b6ff14c681d9fadef60'],
 ['assets/tutorial-goal-feet-78-v2.png','a5a29865fca4456037dd3be6d81edfcd15dceb3241ff70fb3c99b2bf6c2bed63']
];
const wideArtwork='assets/hold-wide-flat.webp';
const pageArtwork=[approvedArtworks[0][0],approvedArtworks[1][0],approvedArtworks[2][0],approvedArtworks[3][0],'assets/settings-gear.svg'];
for(const [file,hash] of approvedArtworks){
 const bytes=fs.readFileSync(path.join(root,file));
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),78);assert.equal(bytes.readUInt32BE(20),78);
 assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),hash);
}
// Reuse the game's original lossless WebP; no copy, crop or new artwork.
const wideBytes=fs.readFileSync(path.join(root,wideArtwork));
assert.equal(require('node:crypto').createHash('sha256').update(wideBytes).digest('hex'),'92a8054c99ad6feaa040f6fc87210e1f332107495bf26ac36160388b56d6b836');
assert.equal(wideBytes.toString('ascii',0,4),'RIFF');
assert.equal(wideBytes.toString('ascii',8,16),'WEBPVP8L');assert.equal(wideBytes[20],0x2f);
const wideHeader=wideBytes.readUInt32LE(21);
const wideWidth=(wideHeader&0x3fff)+1,wideHeight=((wideHeader>>>14)&0x3fff)+1;
assert.deepEqual([wideWidth,wideHeight],[256,128]);
const containScale=Math.min(78/wideWidth,78/wideHeight);
assert.deepEqual([wideWidth*containScale,wideHeight*containScale],[78,39]);
assert(fs.readFileSync(path.join(root,'js/renderer.js'),'utf8').includes("wideHoldImage.src='"+wideArtwork+"'"));
// Exactly the existing settings-button SVG; its inset geometry fits the 78px plate.
const settingsSvg=html.match(/<button id="settingsButton"[^>]*>(<svg.*?<\/svg>)<\/button>/)[1];
const gearSvg=fs.readFileSync(path.join(root,'assets/settings-gear.svg'),'utf8').trim();
assert.equal(gearSvg,settingsSvg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));
assert(gearSvg.includes('viewBox="0 0 24 24"'));
assert(!/<(?:script|image)|https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(gearSvg));
const files=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
function boot(data=new Map(),{blocked=false,readBlocked=blocked,writeBlocked=blocked,missingStorage=false,imageClass=null,audioClass=null,locale='ja-JP'}={}){
 const operations=[],elements={},windowEvents={},documentEvents={},timers=new Map(),frames=[];let nextTimer=0,captureFrames=false,clock=1000;
 const node=id=>elements[id]||={id,style:{setProperty(){}},classList:{values:new Set(),toggle(k,v){if(v)this.values.add(k);else this.values.delete(k);},add(k){this.values.add(k);},remove(k){this.values.delete(k);},contains(k){return this.values.has(k);}},querySelector(selector){return node(id+selector);},replaceWith(next){elements[id]=next;next.isConnected=true;},events:{},listeners:{},hidden:false,open:false,value:'',focus(){document.activeElement=this;},blur(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){(this.listeners[k]||=[]).push(f);this.events[k]=e=>this.listeners[k].forEach(fn=>fn(e));},showModal(){this.showCount=(this.showCount||0)+1;this.open=true;},close(){this.closeCount=(this.closeCount||0)+1;this.open=false;},contains(){return true;},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};
 const document={getElementById:node,documentElement:{},addEventListener(k,f){(documentEvents[k]||=[]).push(f);},querySelectorAll(){return [];}};
 const storage={getItem(k){operations.push(['get',k]);if(readBlocked)throw Error('blocked storage');return data.get(k)??null;},setItem(k,v){operations.push(['set',k]);if(writeBlocked)throw Error('blocked storage');data.set(k,String(v));},removeItem(k){operations.push(['remove',k]);if(writeBlocked)throw Error('blocked storage');data.delete(k);},get length(){return data.size;},key:i=>[...data.keys()][i]??null};
 const context=vm.createContext({navigator:{language:locale,languages:[locale]},AudioContext:audioClass||undefined,Image:imageClass||undefined,document,localStorage:missingStorage?undefined:storage,console,performance:{now:()=>clock},Date,Math,assert,URL,Uint8Array,TextEncoder,TextDecoder,atob,setTimeout(fn,delay=0){timers.set(++nextTimer,{fn,at:clock+delay});return nextTimer;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(fn){if(captureFrames)frames.push(fn);return 0;},window:{devicePixelRatio:1,addEventListener(k,f){(windowEvents[k]||=[]).push(f);}}});
 for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 // These synchronous lifecycle cases stub readiness; the separate controlled-Image
 // suite exercises real asynchronous loading/decoding, retries and stale results.
 if(!imageClass)vm.runInContext('requestExplanationImage=(src,ready)=>ready(src?{src}:null);',context);
 return {data,operations,node,emitDocument(name,event){for(const fn of documentEvents[name]||[])fn(event);},fireTimer(id){const timer=timers.get(id);assert(timer,'timer must still be scheduled');timers.delete(id);clock=Math.max(clock,timer.at);timer.fn();},timerCallback:id=>timers.get(id)?.fn,advance(ms){clock+=ms;},enableFrames(){captureFrames=true;},flushFrames(){const pending=frames.splice(0);for(const fn of pending)fn(performance.now());},run:code=>vm.runInContext(code,context),emitWindow(name){for(const fn of windowEvents[name]||[])fn({});},flush(){const pending=[...timers.values()];timers.clear();for(const {fn} of pending)fn();}};
}
const pages=[
 [
  "ASCENTにようこそ！",
  "画面スワイプで移動、指をはなしてホールドを決定します"
 ],
 [
  "ASCENTにようこそ！",
  "手足2つが自由に動きます。足は手より高い場所には置けません"
 ],
 [
  "ASCENTにようこそ！",
  "スタミナがなくなる前に、ゴールを両手でつかむと登頂成功です"
 ],
 [
  "チュートリアル完了",
  "ゴールするには両足もホールドに固定されていないといけません"
 ],
 [
  "チュートリアル完了",
  "くわしい操作やルールの説明は歯車アイコンで開くメニューから見ることができます"
 ]
];
// Reviewed against the five Japanese instructions above, independently of the
// runtime catalog. Preserve both exact texts rather than using gameText as its
// own expected value or retaining the former Japanese-only English fallback.
const englishPages=[
 ['Welcome to ASCENT!','Swipe the screen to move, then release your finger to choose your holds'],
 ['Welcome to ASCENT!','Two of your limbs move freely. Your feet cannot be placed higher than your hands'],
 ['Welcome to ASCENT!','Grab the goal with both hands before your stamina runs out to reach the summit'],
 ['Tutorial Complete','To finish, both feet must also be fixed on holds'],
 ['Tutorial Complete','Detailed controls and rules are available in the menu opened with the gear icon']
];
const localizedPages={ja:pages,en:englishPages};
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');assert(/\.feature-help-icon\s*\{[^}]*height:\s*78px/.test(css));assert(/\.tutorial-dialog \.card p\s*\{[^}]*white-space:pre-wrap/.test(css));assert(html.includes('id="tutorialImageSlot"'));assert(/id="tutorialDialog"[^>]*class="overlay feature-help tutorial-dialog"/.test(html));assert(/\.feature-help \.card h1\s*\{[^}]*font-size:18px/.test(css));assert(/\.feature-help \.card p\s*\{[^}]*font-size:16px/.test(css));assert(!/<div[^>]*id="tutorialImageSlot"[^>]*\shidden(?:[ =>])/.test(html));
assert(/\.tutorial-dialog \.feature-help-icon img\s*\{[^}]*width:100%;[^}]*height:100%;[^}]*object-fit:contain;/.test(css));
assert(/\.feature-help-icon\s*\{[^}]*place-items:center;/.test(css));
const snapshot=b=>b.run('JSON.stringify({stageProgress,stageRecords,heartItems,lives,playsSinceAd,mapRewards,dailyRecords,pending:[...onlineScores.pending]})');
const event=(extra={})=>({preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra});
function start(b,{completeIntro=true}={}){
 b.run('titleReady=true;');b.node('titleScreen').onclick();assert.equal(b.run('isTutorialRun()'),true);
 assert.equal(b.node('tutorialDialog').open,false);assert.equal(b.run('featureHelpOpen'),false);assert(b.run('cameraIntro'));
 b.run('tutorialTrigger("start");');assert.equal(b.run('tutorialRun.seen.size'),0,'start cannot fire before playable');
 const initial=b.run('JSON.stringify({body,grips,stamina,moveCount})');
 b.run('down({clientX:body.x,clientY:body.y-camera});move({clientX:body.x+40,clientY:body.y-camera-40});release();');
 assert.equal(b.run('JSON.stringify({body,grips,stamina,moveCount})'),initial,'intro itself blocks gameplay');
 if(!completeIntro)return;
 const duration=b.run('Math.ceil(Math.max(CAMERA_CONFIG.introMinDuration,(cameraIntro.to-cameraIntro.from)*1000/CAMERA_CONFIG.introSpeed))');
 b.run('advanceCameraIntro(performance.now());');b.advance(duration-1);b.run('advanceCameraIntro(performance.now());');
 assert(b.run('cameraIntro'));assert(!b.node('tutorialDialog').open);
 b.advance(1);b.run('advanceCameraIntro(performance.now());');
 assert.equal(b.run('cameraIntro'),null);assert.equal(b.run('tutorialRun.introReady'),true);page(b,1);
 assert.equal(b.run('runStartedAt'),null);assert.equal(b.run('runTimeMs()'),0);
 b.run('advanceCameraIntro(performance.now());tutorialReadyToPlay();tutorialTrigger("start");');
 assert.equal(b.run('tutorialRun.queue.length'),2,'start boundary must enqueue exactly once');
}
function page(b,n){const language=b.run('GAME_TEXT_LANGUAGE'),expected=localizedPages[language][n-1];assert.equal(b.node('tutorialDialog').open,true);assert.equal(b.run('tutorialInstructionsOpen()'),true);assert.equal(b.node('tutorialTitle').textContent,expected[0]);assert.equal(b.node('tutorialText').textContent,expected[1]);assert.equal(b.node('tutorialTitle').lang,language);assert.equal(b.node('tutorialText').lang,language);assert.equal(b.node('tutorialImage').hidden,!pageArtwork[n-1]);assert.equal(b.node('tutorialImage').src,pageArtwork[n-1]);assert.equal(b.run('featureHelpOpen'),true);assert.equal(b.node('tutorialDialog').events.keydown,undefined);}
function settleTransition(b){while(b.run('!!tutorialRun?.transition'))b.fireTimer(b.run('tutorialRun.transitionTimer'));}
function tap(b,settle=true){const e=event();b.node('tutorialContinue').onclick(e);assert(e.stopped,'button tap must not bubble and advance twice');if(settle)settleTransition(b);}
function intros(b){for(let n=1;n<=3;n++){page(b,n);tap(b);}assert.equal(b.run('tutorialInstructionsOpen()'),false);assert.equal(b.run('cameraIntro'),null);assert.notEqual(b.run('runStartedAt'),null);}
// Actions are cumulative logical screen deltas, independent of camera recentering.
function play(b,index,cancel=false){b.run(`var targetForModalTest=route[${index}];assert(validFingerAction(targetForModalTest.action));assert.equal(targetForModalTest.action.bodyMotion,COUPLED_BODY_MODEL);down({clientX:200,clientY:500});for(const p of targetForModalTest.action.points)move({clientX:200+p.dx,clientY:500+p.dy});release(${cancel});`);}
// Fixed failure-cycle fixture uses its authored baseline controls. Success
// play() above still exercises current live selection and all tutorial messages.
function exhaust(b){b.run(`SixPairSelection.withBaseline(()=>{const budget=stamina,cycle=[];assert.equal(budget,stageStamina(routeExpectedMoves())+TUTORIAL_COURSE_CONFIG.extraStamina);assert(fingerAimEnabled());assert(coupledBodyEnabled());for(let i=0;i<budget;i++){assert(isTutorialRun());const sign=i%2?1:-1;down({clientX:200,clientY:500});move({clientX:200+30*sign,clientY:500+90*sign});release();assert.equal(moveCount,i+1);assert.equal(stamina,budget-i-1);assert(grips.every((h,k)=>h&&limbReachable(body,h,k)));assert(!bothHandsOnGoal());assert.deepEqual(grips.slice(0,2).map(h=>h.id),i%2?[2,2]:[3,4]);if(i<2)cycle.push({...body});else assert.deepEqual(body,cycle[i%2]);}assert.equal(stamina,0);});`);}

function completed(b,reason){assert.equal(b.run('isTutorialRun()'),false);assert.equal(b.run('tutorialPending()'),false);assert.equal(b.run('AscentTutorialState.snapshot().reason'),reason);assert.equal(b.run('state'),'map');assert.equal(b.run('stageStartContext?.n'),1);assert(b.node('stageStartDialog').open);assert(!b.node('tutorialDialog').open);assert.equal(b.run('stageRecords.existing[0]'),undefined);}
function runModalTests(){
// Both selections show their own reviewed copy and matching language metadata.
for(const language of ['ja','en']){
 const b=boot(new Map([['ascent.language.v1',language],['ascent.tutorial-stage0.v1',JSON.stringify({version:1,status:'pending',reason:'test-language'})]]));assert.equal(b.run('GAME_TEXT_LANGUAGE'),language);const resources=snapshot(b);start(b);
 assert.equal(b.run('TUTORIAL_CONFIG.steps.length'),5);
 assert.equal(b.run('JSON.stringify(TUTORIAL_CONFIG.steps.filter(s=>s.image).map(s=>s.id))'),'["intro-welcome","intro-movement","intro-goal","goal-fixed","goal-finish"]');
 const bodyKeys=['tutorial.intro.welcome','tutorial.intro.movement','tutorial.intro.goal','tutorial.goal.fixed','tutorial.goal.finish'];
 const catalog=language==='ja'?'GAME_TEXT_JA':'GAME_TEXT_EN',expected=localizedPages[language];
 for(const [i,key] of bodyKeys.entries()){assert.equal(b.run('Object.hasOwn('+catalog+','+JSON.stringify(key)+')'),true);assert.equal(b.run(catalog+'['+JSON.stringify(key)+']'),expected[i][1]);}
 assert.equal(b.run(catalog+'["tutorial.title.complete"]'),expected[3][0]);assert.equal(b.run(catalog+'["tutorial.title.play"]'),expected[0][0]);page(b,1);
 const initial=b.run('JSON.stringify({body,grips,stamina,moveCount,runElapsedMs})'),closeCount=b.node('tutorialDialog').closeCount||0;
 for(let n=1;n<=3;n++){
  page(b,n);b.advance(30000);b.run('cameraIntro=null;down({clientX:body.x,clientY:body.y-camera});move({clientX:body.x+40,clientY:body.y-camera-40});release();');
  assert.equal(b.run('JSON.stringify({body,grips,stamina,moveCount,runElapsedMs})'),initial,'modal cannot spend input/stamina/time');
  if(n<3){tap(b);page(b,n+1);assert.equal(b.node('tutorialDialog').closeCount||0,closeCount,'native input shield remains open during visual close/reopen');}else tap(b);
 }
 assert.equal(b.run('tutorialInstructionsOpen()'),false);assert.equal(snapshot(b),resources);
}
// Full native gesture progression has no mid-course explanation: all ordinary
// hand placements remain playable until the two valid-goal pages.
{
 const b=boot(),resources=snapshot(b);start(b);intros(b);
 const count=b.run('route.length'),budget=b.run('stamina');
 for(let i=1;i<count;i++){
  play(b,i);assert.equal(b.run('moveCount'),i);assert.equal(b.run('stamina'),budget-i);
  assert(b.run('grips.every((h,k)=>h&&limbReachable(body,h,k))'));
  if(i<count-1)assert.equal(b.run('tutorialInstructionsOpen()'),false,'ordinary course movement has no middle page');
 }
 assert.equal(b.run('bothHandsOnGoal()'),true);assert.equal(b.run('grips.every(h=>h!==null)'),true);page(b,4);assert.equal(b.run('tutorialPending()'),true);assert.equal(b.run('state'),'playing');assert.equal(b.run('stageStartContext'),null);assert.equal(snapshot(b),resources);
 const goalTime=b.run('runTimeMs()');b.advance(60000);assert.equal(b.run('runTimeMs()'),goalTime);
 b.run('tutorialTrigger("goal");finishTutorialRun(true);');assert.equal(b.run('tutorialRun.queue.length'),1,'goal pages must enqueue once');
 const closes=b.node('tutorialDialog').closeCount||0;b.node('tutorialDialog').onclick(event({target:b.node('tutorialText')}));assert.equal(b.run('tutorialRun.transition'),'closing');b.run('finishTutorialRun(false);');assert.equal(b.run('state'),'playing');assert.equal(b.run('tutorialPending()'),true);assert.equal(b.run('tutorialRun.pendingOutcome'),true);assert.equal(b.run('stageStartContext'),null);b.fireTimer(b.run('tutorialRun.transitionTimer'));page(b,5);assert.equal(b.run('tutorialRun.transition'),'opening');tap(b,false);assert.equal(b.run('state'),'playing');settleTransition(b);page(b,5);assert.equal(b.node('tutorialDialog').closeCount||0,closes);b.advance(60000);assert.equal(b.run('runTimeMs()'),goalTime);
 assert.equal(b.node('tutorialDialog').events.keydown,undefined);page(b,5);
 tap(b);completed(b,'cleared');assert.equal(snapshot(b),resources);
 b.node('tutorialDialog').events.close?.(event());assert.equal(b.run('stageStartContext?.n'),1,'queued native close event cannot advance another flow');
}
// Synthetic explicit-ID trigger retains committed HAND/cancel/Undo behavior
// without coupling the authored tutorial course to a special central hold.
{
 const b=boot();start(b);intros(b);
 b.run(`var triggerHold=holds.find(h=>h.type==='normal' && route.slice(1).some(p=>p.grips?.slice(0,2).includes(h.id)));
  assert(triggerHold);TUTORIAL_CONFIG.steps.push({id:'test-normal-hand',when:{event:'hold',hold:triggerHold.id},text:'Explicit normal hand'});`);
 const step=b.run('route.findIndex(p=>p.grips?.slice(0,2).includes(triggerHold.id))');assert(step>0);
 b.run('const savedModalGrips=[...grips];grips[2]=triggerHold;tutorialTrigger("hold");grips=savedModalGrips;');assert.equal(b.run('tutorialInstructionsOpen()'),false,'foot contact must not trigger');
 for(let i=1;i<step;i++)play(b,i);
 play(b,step,true);assert.equal(b.run('tutorialInstructionsOpen()'),false,'canceled hand preview must not trigger');assert.equal(b.run('moveCount'),step-1);
 play(b,step);assert.equal(b.node('tutorialText').textContent,'Explicit normal hand');assert(b.node('tutorialDialog').open);
 const pausedStamina=b.run('stamina'),pausedElapsed=b.run('runElapsedMs');b.advance(60000);assert.equal(b.run('runTimeMs()'),pausedElapsed);assert.equal(b.run('stamina'),pausedStamina);tap(b);
 assert.equal(b.run('undoMove()'),true);play(b,step);assert.equal(b.run('tutorialInstructionsOpen()'),false,'Undo/regrip may not repeat explicit-ID page');
 assert(b.run('tutorialRun.seen.has("test-normal-hand")'));
}
// Visual close -> absent interval -> new card, while native shield, pause and
// queue remain held. Repeated taps/cancel/close callbacks cannot skip a page.
{
 const b=boot();start(b);const frozen=b.run('JSON.stringify({body,grips,moveCount,stamina,runElapsedMs})');
 tap(b,false);assert.equal(b.run('tutorialRun.transition'),'closing');
 assert(b.node('tutorialDialog').classList.contains('tutorial-page-closing'));assert(b.node('tutorialContinue').disabled);
 const timer=b.run('tutorialRun.transitionTimer');assert.equal(b.node('tutorialContent')['aria-busy'],'true');
 b.advance(120);page(b,1);assert(b.node('tutorialDialog').open,'shield never closes');
 for(const input of [()=>tap(b,false),()=>tap(b,false),()=>b.node('tutorialDialog').events.cancel(event())])input();
 b.run('down({clientX:body.x,clientY:body.y-camera});move({clientX:body.x+40,clientY:body.y-camera-40});release();undoMove();');
 assert.equal(b.run('JSON.stringify({body,grips,moveCount,stamina,runElapsedMs})'),frozen);
 assert.equal(b.run('tutorialRun.transitionTimer'),timer);assert.equal(b.run('tutorialRun.queue.length'),2);
 b.fireTimer(timer);page(b,2);assert.equal(b.run('tutorialRun.transition'),'opening');
 assert(!b.node('tutorialDialog').classList.contains('tutorial-page-closing'));tap(b,false);page(b,2);
 b.node('tutorialDialog').events.close(event());assert(b.run('isTutorialRun()'));
 b.fireTimer(b.run('tutorialRun.transitionTimer'));assert.equal(b.run('tutorialRun.transition'),null);assert(!b.node('tutorialContinue').disabled);
 assert.equal(b.node('tutorialContent')['aria-busy'],'false');tap(b);page(b,3);tap(b);
 assert.equal(b.run('runTimeMs()'),0);b.advance(1000);assert.equal(b.run('runTimeMs()'),1000,'only playable time resumes');
}
// Interrupt during scroll or either animation phase; stale callbacks cannot
// reopen a modal on title/map or mutate a newer tutorial attempt.
for(const phase of ['scroll','closing','opening']){
 const b=boot();start(b,{completeIntro:phase!=='scroll'});let stale;
 if(phase!=='scroll'){tap(b,false);if(phase==='opening')b.fireTimer(b.run('tutorialRun.transitionTimer'));stale=b.timerCallback(b.run('tutorialRun.transitionTimer'));}
 b.run('showTitleScreen();');assert(!b.node('tutorialDialog').open);assert.equal(b.run('tutorialPending()'),true);
 stale?.();assert.equal(b.run('state'),'choosing');start(b);stale?.();page(b,1);assert.equal(b.run('tutorialRun.transition'),null);
 const reload=boot(b.data);start(reload);page(reload,1);
}
assert(/tutorial-page-closing \.card\s*\{[^}]*opacity:0;[^}]*transform:scale\(\.96\);[^}]*transition-duration:120ms;/.test(css));
assert(/prefers-reduced-motion:reduce[^}]*tutorial-page-closing \.card[^}]*transition:none; transform:none;/.test(css));
// A forged goal event cannot display success copy without a complete valid
// four-contact posture, even when both hand references point at the goal.
{
 const b=boot();start(b);intros(b);b.run('tutorialTrigger("goal");');assert.equal(b.run('tutorialInstructionsOpen()'),false);
 b.run('const goalPose=route.at(-1);body={...goalPose};grips=goalPose.grips.map(id=>holds.find(h=>h.id===id));grips[2]=null;assert(bothHandsOnGoal());tutorialTrigger("goal");');assert.equal(b.run('tutorialInstructionsOpen()'),false);assert.equal(b.run('tutorialRun.seen.has("goal-fixed")'),false);
}
// Pointer cards advance once; native cancel still cleans up through the same queue.
{
 const b=boot();start(b);assert.equal(b.node('tutorialDialog').events.keydown,undefined);
 tap(b);page(b,2);tap(b);page(b,3);
 b.node('tutorialDialog').events.cancel(event());assert.equal(b.run('tutorialInstructionsOpen()'),false);
}
// Failure after exhausting the legal move budget reaches no goal messages and consumes no resources.
{
 const b=boot(),resources=snapshot(b);start(b);intros(b);const shows=b.node('tutorialDialog').showCount;
 exhaust(b);
 completed(b,'failed');assert.equal(snapshot(b),resources);assert.equal(b.node('tutorialDialog').showCount,shows,'failure does not show goal pages');
}
// Interrupting an intro preserves pending; reload begins page1. Existing users skip.
{
 const b=boot();start(b);tap(b);page(b,2);b.run('showTitleScreen();');assert.equal(b.run('tutorialPending()'),true);assert.equal(b.node('tutorialDialog').open,false);
 const again=boot(b.data);start(again);page(again,1);tap(again);page(again,2);again.node('tutorialDialog').events.close(event());page(again,2);assert.equal(again.run('isTutorialRun()'),true,'queued old close must not interrupt reopened/current dialog');again.node('tutorialDialog').close();again.node('tutorialDialog').events.close(event());assert.equal(again.run('isTutorialRun()'),false);assert.equal(again.run('tutorialPending()'),true);assert.equal(again.run('state'),'choosing');start(again);page(again,1);
 const old=boot(new Map([['ascent.player-uuid.v1','0']]));assert.equal(old.run('tutorialPending()'),false);old.run('titleReady=true;');old.node('titleScreen').onclick();assert.equal(old.run('isTutorialRun()'),false);assert.equal(old.node('tutorialDialog').open,false);
}
console.log('PASS five exact JA/EN tutorial pages and language metadata, scroll-complete boundary, close/reopen visual queues with uninterrupted input/time pause, transition interruption/repeat protection, committed explicit-ID HAND once across Undo, valid goal before completion, native clear/exhaustion, pointer advance/native cancel, interruption/reload/existing skip');

}
if(require.main===module)runModalTests();
module.exports={boot,page,tap,play,exhaust,settleTransition};
