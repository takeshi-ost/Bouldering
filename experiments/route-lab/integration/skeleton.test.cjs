'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../public/game');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
assert(files.includes('skeleton.js'),'Build must include the trial skeleton adapter');
assert(files.indexOf('skeleton.js')>files.indexOf('js/main.js'),'Skeleton boot must follow baseline initialization');
// Native-function fixture, like the original routes test. The globalThis parameter
// is a fresh isolated object: bootstrap cannot replace Node global storage/network.
// Omit only the large audio data bundle; sound semantics are covered separately.
const source=files.filter(f=>f!=='audio-bundle.js').map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const environment=`
let clock=2000;const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {style:{},events:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false},addEventListener(k,f){this.events[k]=f},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};
function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){};
`;
const expose=`
function labTestFingerprint(){return JSON.stringify({config:labSkeletonConfig,holds,route,report:labSkeletonReport});}
function labTestValidate(){
 assert.equal(state,'playing','configuration must enter a playable stage');
 assert.equal(difficulty,0);assert.equal(hearts.length,0);assert(holds.every(h=>h.type!=='hazard'));
 assert.equal(holds.filter(h=>h.type==='goal').length,1,'exactly one real goal');
 assert.equal(holds.find(h=>h.type==='goal').y,100,'goal visible at top of selected wall');
 assert.equal(HEIGHT,{short:700,middle:1400,long:2100}[labSkeletonConfig.length]);
 assert.equal(new Set(holds.map(h=>h.id)).size,holds.length);
 assert(holds.every(h=>Number.isFinite(h.x)&&Number.isFinite(h.y)&&h.x>=STAGE_SAFE_WIDTH&&h.x<=W-STAGE_SAFE_WIDTH));
 assert(samePairRoute(route,replayRoute(route)),'final contact replay');
 assert(validateRouteBudget(route),'final route budget');
 assert.equal(stamina,stageStamina(route.length-1));
 assert.equal(labSkeletonReport.validated,true);assert.equal(labSkeletonReport.search,'bounded');
 assert(labSkeletonReport.movesAfter<=labSkeletonReport.movesBefore);
 assert.equal(online.uid,null);assert.equal(online.ready,false);assert.equal(onlineScores.pending.size,0);
 assert.equal(debugMode,false);assert(ui.prototypeCourse.hidden);assert(ui.titleTransfer.hidden);
 if(labSkeletonConfig.type==='branch'){
  const alt=labSkeletonReport.branchRoute,b=labSkeletonReport.branchBand;
  assert(alt);assert(samePairRoute(alt,replayRoute(alt)),'alternate contacts replay on final shared holds');
  assert(routeResources(alt,{pickups:[],budget:routeStamina(route)}).valid,'alternate fits final primary stamina');
  assert(Math.max(...alt.map(p=>b.mirror*(p.x-b.base)))>=65,'alternate actually uses side lane');
  assert.equal(alt[0].x,route[0].x);assert.equal(alt[0].y,route[0].y);
  const goal=holds.find(h=>h.type==='goal');assert(alt.at(-1).grips.slice(0,2).every(id=>id===goal.id),'alternative rejoins shared goal');
  assert(b.lower-b.upper<=400,'branch is one local band');
  for(const h of holds.filter(h=>h.type==='normal')){
   const onPrimary=Math.abs(Math.abs(h.x-b.base)-45)<1e-8;
   if(!onPrimary)assert(h.y+68>b.upper&&h.y+68<b.lower,'side contacts cannot connect remote primary segments');
  }
 }
 return JSON.parse(JSON.stringify(labSkeletonReport));
}
function labTestPlay(alternative=false){
 const path=alternative?labSkeletonReport.branchRoute:route;
 assert(path&&path.length>1);cameraIntro=null;hideStageHelp();characterAnimation=null;
 const budget=stamina;
 const finger=p=>({identifier:7,clientX:p.x,clientY:p.y-camera});
 const touch=(name,p,ended=false)=>{const t=finger(p);canvas.events[name]({touches:ended?[]:[t],changedTouches:[t],preventDefault(){}});};
 for(let i=1;i<path.length;i++){
  camera=clamp(body.y-H*CAMERA_CONFIG.bodyScreenRatio,cameraTop(),HEIGHT-H);const from={...body},to=path[i];
  touch('touchstart',from);
  for(let step=1;step<=10;step++)touch('touchmove',{x:from.x+(to.x-from.x)*step/10,y:from.y+(to.y-from.y)*step/10});
  const actualAnchor=drag?.anchor;touch('touchend',to,true);clock+=300;
  assert.equal(moveCount,i,'touch commit '+JSON.stringify(labSkeletonConfig)+' move '+i);
  assert(grips.every((h,j)=>h&&h.id===to.grips[j]),'touch contact sequence '+JSON.stringify(labSkeletonConfig)+' step '+i+' expected '+JSON.stringify(to.grips)+' got '+JSON.stringify(grips.map(h=>h?.id))+' anchors '+JSON.stringify([to.anchor,actualAnchor])+' body '+JSON.stringify(body)+' target '+JSON.stringify(to));
 }
 assert.equal(state,'won');assert(bothHandsOnGoal());
 assert.equal(stamina,budget-(path.length-1));assert.equal(hearts.length,0);
 assert.equal(onlineScores.pending.size,0);assert.equal(stageProgress.existing.cleared,0,'trial must not award baseline progress');
 return {moves:moveCount,stamina};
}
return {
 fingerprint:labTestFingerprint,validate:labTestValidate,play:labTestPlay,
 reset(){reset(1);},retry(){ui.retry.onclick();},next(){ui.next.onclick();},back(){returnFromStage();},
 snapshot(){return {state,config:labSkeletonConfig,report:labSkeletonReport,error:elements.labGenerationError?.textContent||'',titleHidden:ui.titleScreen.hidden,mapHidden:ui.levelMap.hidden};},
 readConfig:labReadConfig,
 cancelTouch(){cameraIntro=null;hideStageHelp();characterAnimation=null;const before={x:body.x,y:body.y,stamina,moveCount};const p={identifier:8,clientX:body.x,clientY:body.y-camera};canvas.events.touchstart({touches:[p],changedTouches:[p],preventDefault(){}});const q={...p,clientY:p.clientY-25};canvas.events.touchmove({touches:[q],changedTouches:[q],preventDefault(){}});canvas.events.touchcancel({touches:[],changedTouches:[q],preventDefault(){}});assert.equal(stamina,before.stamina);assert.equal(moveCount,before.moveCount);assert.equal(body.x,before.x);assert.equal(body.y,before.y);assert.equal(touchId,null);},
 generateInvalid(){assert.throws(()=>labGenerateSkeleton({type:'unknown',length:'short',seed:1}),/無効/);}
};
`;
const factory=new Function('globalThis','assert',environment+source+expose);
function create(search=''){
 let nativeReads=0;const messages=[];
 const g={location:{protocol:'https:',origin:'https://ascent-route-lab.activeboar15.chatgpt.site',search},navigator:{},crypto:require('node:crypto').webcrypto,parent:{postMessage(value,origin){messages.push({value,origin});}}};
 for(const name of ['localStorage','sessionStorage'])Object.defineProperty(g,name,{configurable:true,get(){nativeReads++;throw Error('native storage must not be read');}});
 const api=factory(g,assert);assert.equal(nativeReads,0);return {api,g,messages};
}
const query=(type,length,seed,guide=false)=>'?lab=1&type='+type+'&length='+length+'&seed='+seed+(guide?'&guide=1':'');

test('27 seeded skeletons are deterministic, contact-valid and clear through actual touch handlers',()=>{
 const comparisons=new Map();let clears=0;
 for(const type of ['straight','meander','branch'])for(const length of ['short','middle','long'])for(const seed of [0,42,2026]){
  const {api,messages}=create(query(type,length,seed));
  const report=api.validate(),fingerprint=api.fingerprint();
  api.reset();assert.equal(api.fingerprint(),fingerprint,'same configuration must reproduce holds, route and report');
  api.play();clears++;
  comparisons.set(length+':'+seed+':'+type,report);
  assert(messages.some(m=>m.value.kind==='ascent-lab-status'&&m.value.text.includes('経路検証済み')));
  assert(messages.every(m=>m.origin==='https://ascent-route-lab.activeboar15.chatgpt.site'));
 }
 for(const length of ['short','middle','long'])for(const seed of [0,42,2026]){
  const straight=comparisons.get(length+':'+seed+':straight'),meander=comparisons.get(length+':'+seed+':meander');
  assert(meander.travelX>straight.travelX+50,'meander must produce genuinely greater lateral travel');
 }
 assert.equal(clears,27);
});

test('local branch alternatives clear through touch handlers; repeated retry/back/next preserve configuration',()=>{
 for(const length of ['short','middle','long']){
  const {api}=create(query('branch',length,42));api.validate();const fingerprint=api.fingerprint();
  api.play(true);
  for(const restart of ['retry','next','back']){api[restart]();api.validate();assert.equal(api.fingerprint(),fingerprint,restart+' preserves seed, type, length and geometry');}
  api.cancelTouch();api.validate();
 }
});

test('invalid settings fail visibly without silently substituting a baseline or different skeleton',()=>{
 for(const search of ['?lab=1','?lab=1&type=unknown&length=short&seed=42','?lab=1&type=straight&length=invalid&seed=42','?lab=1&type=branch&length=short&seed=-1','?lab=1&type=branch&length=short&seed=1.5','?lab=1&type=branch&length=short&seed=4294967296']){
  const {api}=create(search),snapshot=api.snapshot();
  assert.equal(snapshot.state,'choosing');assert.equal(snapshot.config,null);assert.equal(snapshot.report,null);assert(snapshot.error.includes('生成できませんでした'));assert(snapshot.titleHidden&&snapshot.mapHidden);
 }
 const {api}=create();assert.equal(api.snapshot().state,'choosing');assert.equal(api.snapshot().config,null,'baseline mode remains separate');
 assert.equal(api.readConfig('?lab=1&type=straight&length=short&seed=4294967295').seed,4294967295);
 api.generateInvalid();
});

test('skeleton sessions retain offline networking and memory-only isolated progress',async()=>{
 const {api,g}=create(query('straight','short',42,true));api.validate();
 g.localStorage.setItem('skeleton-test','memory');assert.equal(g.localStorage.getItem('skeleton-test'),'memory');
 await assert.rejects(g.fetch('https://example.com/'),/disabled/);
 for(const kind of ['XMLHttpRequest','WebSocket','EventSource'])assert.throws(()=>new g[kind]('https://example.com/'),/disabled/);
 assert.equal(g.navigator.sendBeacon('https://example.com/','x'),false);
 const fresh=create(query('straight','short',42));assert.equal(fresh.g.localStorage.getItem('skeleton-test'),null);
});
