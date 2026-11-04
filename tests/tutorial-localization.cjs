'use strict';
// Actual classic-script startup, settings handler and tutorial lifecycle. The VM
// asserts text/state/image ownership, not browser layout or device rendering.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
const ids=['intro-welcome','intro-movement','intro-goal','goal-fixed','goal-finish'];
const textKeys=['tutorial.intro.welcome','tutorial.intro.movement','tutorial.intro.goal','tutorial.goal.fixed','tutorial.goal.finish'];
const images=['assets/tutorial-swipe-78-v1.png','assets/tutorial-feet-limit-78-v2.png','assets/tutorial-goal-hands-78-v2.png','assets/tutorial-goal-feet-78-v2.png','assets/settings-gear.svg'];
function boot({locale='ja-JP',data=new Map(),imageClass}={}) {
 const elements={},timers=new Map();let nextTimer=0,clock=1000;
 const node=id=>elements[id]||={id,style:{setProperty(){}},classList:{values:new Set(),toggle(k,v){if(v)this.values.add(k);else this.values.delete(k);},add(k){this.values.add(k);},remove(k){this.values.delete(k);},contains(k){return this.values.has(k);}},events:{},hidden:false,open:false,value:'',querySelector(selector){return node(id+selector);},replaceWith(next){elements[this.id]=next;next.isConnected=true;},focus(){document.activeElement=this;},blur(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){this.events[k]=f;},showModal(){this.showCount=(this.showCount||0)+1;this.open=true;},close(){this.closeCount=(this.closeCount||0)+1;this.open=false;},contains(){return true;},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};
 const document={getElementById:node,documentElement:{},addEventListener(){},querySelectorAll(){return [];}};
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),get length(){return data.size;},key:i=>[...data.keys()][i]??null};
 const context=vm.createContext({navigator:{languages:[locale],language:locale},Image:imageClass,document,localStorage:storage,console,performance:{now:()=>clock},Date,Math,assert,URL,Uint8Array,TextEncoder,TextDecoder,atob,setTimeout(fn,delay=0){timers.set(++nextTimer,{fn,at:clock+delay});return nextTimer;},clearTimeout:id=>timers.delete(id),requestAnimationFrame(){return 0;},window:{devicePixelRatio:1,addEventListener(){}}});
 for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 const run=code=>vm.runInContext(code,context);
 if(!imageClass)run('requestExplanationImage=(src,ready)=>ready(src?{src}:null);');
 else imageClass.prototype.replaceWith=node('tutorialImage').replaceWith;
 run('var localizationCues=[];playSound=name=>localizationCues.push(name);');
 return {run,node,data,timers,advance:ms=>clock+=ms,fireTimer(id){const timer=timers.get(id);assert(timer,'timer remains scheduled');timers.delete(id);clock=Math.max(clock,timer.at);timer.fn();}};
}
function start(b,{ready=true}={}) {
 b.run('titleReady=true;');b.node('titleScreen').onclick();assert(b.run('isTutorialRun()'));assert.equal(b.run('level'),0);
 if(ready)b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');
}
function page(b,index,language) {
 assert.equal(b.run('GAME_TEXT_LANGUAGE'),language);
 assert.equal(b.run('tutorialRun.explanation.id'),ids[index]);
 assert.equal(b.node('tutorialTitle').textContent,b.run(`GAME_TEXT_LOCALES[${JSON.stringify(language)}][${JSON.stringify(index<3?'tutorial.title.play':'tutorial.title.complete')}]`));
 assert.equal(b.node('tutorialText').textContent,b.run(`GAME_TEXT_LOCALES[${JSON.stringify(language)}][${JSON.stringify(textKeys[index])}]`));
 assert.equal(b.node('tutorialTitle').lang,language);assert.equal(b.node('tutorialText').lang,language);
 assert.equal(b.node('tutorialTitle').hidden,false);assert.equal(b.node('tutorialText').hidden,false);
 if(language==='en')assert(!/[\u3040-\u30ff\u3400-\u9fff]/.test(b.node('tutorialTitle').textContent+b.node('tutorialText').textContent),'English tutorial cannot silently retain Japanese copy');
}
function readyPage(b,index,language) {
 page(b,index,language);assert(b.node('tutorialDialog').open);assert.equal(b.node('tutorialImage').src,images[index]);assert.equal(b.node('tutorialImage').hidden,false);
}
function tap(b,{settle=true}={}) {
 b.node('tutorialContinue').onclick({preventDefault(){},stopPropagation(){}});
 if(settle)while(b.run('!!tutorialRun?.transition'))b.fireTimer(b.run('tutorialRun.transitionTimer'));
}
function intro(b,language) {for(let i=0;i<3;i++){readyPage(b,i,language);tap(b);}assert.equal(b.run('tutorialInstructionsOpen()'),false);}
function goal(b) {
 b.run(`for(let i=1;i<route.length;i++){camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);const p=route[i];down({clientX:body.x,clientY:body.y-camera});move({clientX:p.x,clientY:p.y-camera});release();}`);
 assert(b.run('bothHandsOnGoal() && grips.every((h,i)=>h && limbReachable(body,h,i))'));
 assert.equal(b.run('tutorialRun.pendingOutcome'),true);
}
const resourceState=b=>b.run('JSON.stringify({stageProgress,stageRecords,heartItems,lives,playsSinceAd,mapRewards,dailyRecords,pending:[...onlineScores.pending]})');
const tutorialState=b=>b.run('JSON.stringify({state,level,body,grips,stamina,moveCount,runStartedAt,runElapsedMs,featureHelpOpen,settingsOpen,activeCourseGeneration,cameraIntro,run:tutorialRun?{...tutorialRun,seen:[...tutorialRun.seen]}:null,cues:localizationCues})');
function unchangedLanguageSwitch(b,language,{settings=false}={}) {
 const run=b.run('tutorialRun'),explanation=b.run('tutorialRun?.explanation'),queue=b.run('tutorialRun?.queue');
 const before=tutorialState(b),resources=resourceState(b),picture=b.node('tutorialImage');
 const dialog=b.node('tutorialDialog'),content=b.node('tutorialContent'),button=b.node('tutorialContinue');
 const presentation=JSON.stringify({open:dialog.open,shows:dialog.showCount,closes:dialog.closeCount,classes:[...dialog.classList.values],busy:content['aria-busy'],disabled:button.disabled,src:picture.src,hidden:picture.hidden});
 const timerIds=[...b.timers.keys()];
 if(settings){b.node('languageChoice').value=language;b.node('languageChoice').onchange();}
 else b.run(`setGameLanguage(${JSON.stringify(language)});`);
 assert.equal(b.run('GAME_TEXT_LANGUAGE'),language);assert.equal(tutorialState(b),before,'language refresh cannot change gameplay, cues, tutorial order, pause, image ticket or transition');
 assert.equal(resourceState(b),resources);assert.equal(b.run('tutorialRun'),run);assert.equal(b.run('tutorialRun?.explanation'),explanation);assert.equal(b.run('tutorialRun?.queue'),queue);
 assert.equal(b.node('tutorialImage'),picture,'reuse decoded/mounted image');
 assert.deepEqual([...b.timers.keys()],timerIds,'do not replace transition or image deadlines');
 assert.equal(JSON.stringify({open:dialog.open,shows:dialog.showCount,closes:dialog.closeCount,classes:[...dialog.classList.values],busy:content['aria-busy'],disabled:button.disabled,src:picture.src,hidden:picture.hidden}),presentation,'do not reopen modal, expose loading or change input shield');
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function controlledImages() {
 const created=[];
 class Image {
  constructor(){this.complete=false;this.naturalWidth=0;this.hidden=false;created.push(this);}
  set src(value){this.url=value;}get src(){return this.url;}
  decode(){return this.decodingPromise??=new Promise(resolve=>{this.resolveDecode=resolve;});}
  load(){this.complete=true;this.naturalWidth=this.naturalHeight=78;this.onload?.();}
 }
 const pending=src=>created.filter(image=>image.src===src && typeof image.onload==='function').at(-1);
 return {Image,created,pending,async ready(src){const image=pending(src);assert(image,src);image.load();image.resolveDecode();await flush();return image;}};
}
(async()=>{
 // Fresh startup selects device language before the tutorial is constructed.
 // The whole unmodified course and all five pages use the initial language.
 for(const [locale,language] of [['ja-JP','ja'],['en-US','en'],['fr-FR','en']]) {
  const b=boot({locale});assert(b.run('AscentTutorialState.snapshot().firstUse'));assert.equal(b.run('GAME_TEXT_LANGUAGE'),language);
  assert.deepEqual(JSON.parse(b.run('JSON.stringify(TUTORIAL_CONFIG.steps.map(step=>step.id))')),ids);
  assert(b.run('TUTORIAL_CONFIG.steps.every(step=>step.titleKey && step.textKey && !Object.hasOwn(step,"language") && !Object.hasOwn(step,"text"))'));
  const resources=resourceState(b);start(b);intro(b,language);goal(b);
  readyPage(b,3,language);tap(b);readyPage(b,4,language);tap(b);
  assert.equal(b.run('state'),'map');assert.equal(b.run('stageStartContext.n'),1);assert.equal(b.run('tutorialRun'),null);
  assert.equal(b.run('localizationCues.filter(cue=>cue==="clear").length'),1);assert.equal(resourceState(b),resources);
 }
 // Changing after script initialization but before the playable start boundary
 // cannot leave intro pages in the startup language.
 for(const phase of ['title','camera']) {
  const b=boot();if(phase==='camera')start(b,{ready:false});
  unchangedLanguageSwitch(b,'en');
  if(phase==='title')start(b);else b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');
  readyPage(b,0,'en');assert.equal(b.run('tutorialRun.queue.length'),2);
 }
 // Refresh current and queued pages in both directions without re-triggering,
 // reopening the native dialog, consuming time/stamina or playing a sound.
 {
  const b=boot();start(b);readyPage(b,0,'ja');unchangedLanguageSwitch(b,'en');readyPage(b,0,'en');
  b.run('tutorialReadyToPlay();tutorialTrigger("start");');assert.equal(b.run('tutorialRun.queue.length'),2);
  tap(b,{settle:false});assert.equal(b.run('tutorialRun.transition'),'closing');unchangedLanguageSwitch(b,'ja');readyPage(b,0,'ja');
  b.fireTimer(b.run('tutorialRun.transitionTimer'));assert.equal(b.run('tutorialRun.transition'),'opening');readyPage(b,1,'ja');
  unchangedLanguageSwitch(b,'en');readyPage(b,1,'en');b.fireTimer(b.run('tutorialRun.transitionTimer'));tap(b);readyPage(b,2,'en');
  unchangedLanguageSwitch(b,'ja');readyPage(b,2,'ja');tap(b);
  // Exercise the actual settings dropdown during the playable tutorial. Future
  // goal pages resolve the new language when their later trigger occurs.
  b.node('settingsButton').onclick();assert(b.node('settingsDialog').open);unchangedLanguageSwitch(b,'en',{settings:true});b.node('closeSettings').onclick();
  goal(b);readyPage(b,3,'en');unchangedLanguageSwitch(b,'ja');readyPage(b,3,'ja');
  b.run('finishTutorialRun(true);finishTutorialRun(false);');assert.equal(b.run('tutorialRun.queue.length'),1);assert.equal(b.run('tutorialRun.pendingOutcome'),true);
  tap(b);readyPage(b,4,'ja');unchangedLanguageSwitch(b,'en');readyPage(b,4,'en');tap(b);
  assert.equal(b.run('localizationCues.filter(cue=>cue==="clear").length'),1);assert.equal(b.run('state'),'map');
 }
 // A real image remains pending through locale changes. Neither the first card
 // nor a queued card can be revealed before decoding, or start another request.
 {
  const c=controlledImages(),b=boot({imageClass:c.Image});start(b);assert(b.run('tutorialRun.imageLoading'));assert.equal(b.node('tutorialDialog').open,false);
  const count=c.created.length;unchangedLanguageSwitch(b,'en');assert.equal(c.created.length,count);page(b,0,'en');
  await c.ready(images[0]);readyPage(b,0,'en');unchangedLanguageSwitch(b,'ja');readyPage(b,0,'ja');
  tap(b,{settle:false});b.fireTimer(b.run('tutorialRun.transitionTimer'));assert.equal(b.run('tutorialRun.transition'),'loading');assert(b.run('tutorialRun.imageLoading'));
  unchangedLanguageSwitch(b,'en');page(b,1,'en');assert(b.node('tutorialDialog').classList.contains('tutorial-page-closing'));
  const second=c.pending(images[1]);second.load();await flush();assert(b.run('tutorialRun.imageLoading'));
  unchangedLanguageSwitch(b,'ja');page(b,1,'ja');assert.equal(c.created.length,count);second.resolveDecode();await flush();
  readyPage(b,1,'ja');assert.equal(b.run('tutorialRun.transition'),'opening');unchangedLanguageSwitch(b,'en');b.fireTimer(b.run('tutorialRun.transitionTimer'));readyPage(b,1,'en');
  // Interruption still owns stale completion, even after another locale switch.
  tap(b,{settle:false});b.fireTimer(b.run('tutorialRun.transitionTimer'));b.run('showTitleScreen();');unchangedLanguageSwitch(b,'ja');
  await c.ready(images[2]);assert.equal(b.node('tutorialDialog').open,false);assert.equal(b.run('state'),'choosing');assert(b.run('tutorialPending()'));
 }
 // Custom literal steps keep their exact content/explicit language, including
 // safe textContent and image alt text. Only keyed fields change language.
 {
  const b=boot();b.run(`TUTORIAL_CONFIG.steps.splice(0,TUTORIAL_CONFIG.steps.length,
   {id:'literal',when:{event:'start'},language:'fr',title:'<b>Literal</b>',text:'Texte exact',alt:'Image exacte',image:'assets/settings-gear.svg'},
   {id:'keyed-alt',when:{event:'start'},titleKey:'tutorial.title.play',textKey:'tutorial.intro.welcome',altKey:'tutorial.title.play',image:'assets/settings-gear.svg'},
   {id:'text-only',when:{event:'start'},language:'ja',text:'Literal only'});`);
  start(b);unchangedLanguageSwitch(b,'en');assert.equal(b.node('tutorialTitle').textContent,'<b>Literal</b>');assert.equal(b.node('tutorialTitle').lang,'fr');assert.equal(b.node('tutorialText').textContent,'Texte exact');assert.equal(b.node('tutorialText').lang,'fr');assert.equal(b.node('tutorialImage').alt,'Image exacte');
  tap(b);assert.equal(b.node('tutorialImage').alt,b.run('gameText("tutorial.title.play")'));unchangedLanguageSwitch(b,'ja');assert.equal(b.node('tutorialImage').alt,b.run('gameText("tutorial.title.play")'));
  tap(b);assert.equal(b.node('tutorialTitle').hidden,true);assert.equal(b.node('tutorialText').textContent,'Literal only');assert.equal(b.node('tutorialImage').hidden,true);unchangedLanguageSwitch(b,'en');assert.equal(b.node('tutorialText').lang,'ja');tap(b);assert.equal(b.run('tutorialInstructionsOpen()'),false);
 }
 console.log('PASS tutorial localization: fresh JA/EN/non-JA boot, all five pages and images, pre-start/camera/settings switches, active/queued/closing/loading/opening/goal refresh, image decode and stale interruption safety, literal language/alt preservation, unchanged state/resources/pause/timers/SE');
})().catch(error=>{console.error(error);process.exitCode=1;});
