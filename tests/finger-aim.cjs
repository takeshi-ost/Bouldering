'use strict';
// Isolated headless QA. Completion/storage/network are stubbed; no score is sent.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const nativeSource=require('../scripts/native-bundle-source.cjs');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>{
 const s=fs.readFileSync(path.join(root,m[1]),'utf8');return process.env.ASCENT_NATIVE_TEST==='1'?nativeSource(path.basename(m[1]),s):s;
}).join('\n');
const env=`
let clock=10000;const performance={now:()=>clock};let testRect={left:0,top:0,width:400,height:700};
const elements={};const document={getElementById(id){return elements[id]||={style:{setProperty(){}},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},events:{},addEventListener(name,fn){this.events[name]=fn;},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return testRect}}}};
const window={devicePixelRatio:1,events:{},addEventListener(name,fn){const prev=this.events[name];this.events[name]=prev?e=>{prev(e);fn(e)}:fn;}};
function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
const failures=[];
new Function('assert','failures','globalThis',env+source+`
const resultRows=[];
function check(name,fn){try{fn();console.log('PASS finger aim: '+name);}catch(e){failures.push({name,message:e.stack});console.error('FAIL finger aim: '+name+'\\n'+e.stack);}}
const ids=stance=>stance?.map(h=>h?.id??null);
const nearly=(a,b,label='point')=>assert(Math.abs(a.x-b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6,label+': '+JSON.stringify([a,b]));
const action=points=>fingerAction(points);
const legacyRayAction=points=>({version:1,model:'finger-origin-v1',gain:1,points});
const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
function sample(dx,dy,n=1){return Array.from({length:n},(_,i)=>({dx:dx*(i+1)/n,dy:dy*(i+1)/n}));}
function fixture(custom=null){
 const base=custom||{origin:{x:200,y:500},HEIGHT:1400,gripIds:[1,2,3,4],holds:[
  {id:1,x:140,y:425,type:'normal'},{id:2,x:260,y:430,type:'normal'},
  {id:3,x:150,y:580,type:'normal'},{id:4,x:250,y:580,type:'normal'},
  ...[110,170,230,290].map((x,i)=>({id:5+i,x,y:400,type:'normal'})),
  ...[120,180,220,280].map((x,i)=>({id:9+i,x,y:540,type:'normal'})),
  {id:13,x:150,y:620,type:'normal'},{id:14,x:250,y:620,type:'normal'},
  {id:15,x:200,y:100,type:'goal'}]};
 holds=base.holds.map(h=>({...h}));HEIGHT=base.HEIGHT;body={...base.origin};committed={...body};
 grips=base.gripIds.map(id=>holds.find(h=>h.id===id));startGrips=[...grips];initialGrips=[...grips];
 route=[{...body,grips:ids(grips)}];hearts=[];stamina=100;moveCount=0;state='playing';drag=null;bodyTap=null;pan=null;touchId=null;ignoreTouches=false;
 cameraIntro=null;settingsOpen=false;featureHelpOpen=false;camera=80;warning=0;undoSnapshot=moveSnapshot=null;runStartedAt=null;runElapsedMs=0;
 level=1;courseTypeId=0;difficulty=0;dailyRun=null;tutorialRun=null;debugCourseTrial=null;generatedCourse=activeCourseGeneration=null;
 ui.overlay.hidden=true;ui.overlay.open=false;heartPopups=[];anchorRings=[];resetCharacterAnimation();jointHistory.fill(null);
 finish=won=>{state=won?'won':'lost';};
 return {p:{...body},stance:[...grips]};
}
function eventAtScreen(x,y){const s=testRect.width/400,padding=Math.max(0,(testRect.height/s-700)/2);return {clientX:testRect.left+x*s,clientY:testRect.top+(y+padding)*s,button:0,preventDefault(){}};}
function movedEvent(e,p){const s=testRect.width/400;return {...e,clientX:e.clientX+p.dx*s,clientY:e.clientY+p.dy*s};}
function live(points,{origin={x:100,y:200},cancel=false,releaseNow=true}={}){
 const e=eventAtScreen(origin.x,origin.y);down(e);assert(drag,'Visible playable origin starts gesture');
 points.forEach(p=>move(movedEvent(e,p)));const preview={p:{...body},stance:ids(grips),anchor:drag.anchor&&[...drag.anchor]};
 if(releaseNow)release(cancel);
 return {...preview,after:{p:{...body},stance:ids(grips),moves:moveCount,stamina},record:lastFingerGesture};
}
// Independent exhaustive assignment oracle. Movement may change only its
// preferred points, never reach/sharing/height/count/goal-priority rules.
function oracle(p,pair,aim=null){
 if(!isSupportPair(pair)||!pair.every(i=>startGrips[i]&&limbReachable(p,startGrips[i],i)))return null;
 const moving=[0,1,2,3].filter(i=>!pair.includes(i)),fixed=Array(4).fill(null);pair.forEach(i=>fixed[i]=startGrips[i]);
 const lists=moving.map(i=>{
  const target=aim?{x:aim.originGrips[i].x+aim.dx*aim.gain,y:aim.originGrips[i].y+aim.dy*aim.gain}:{x:p.x+limbs[i].x,y:p.y+limbs[i].y};
  return holds.filter(h=>limbReachable(p,h,i)&&pair.every(j=>h!==fixed[j]||canShareHold(h,i,j)))
   .map(h=>({h,cost:(h.x-target.x)**2+(h.y-target.y)**2-(h.type==='goal'?4*R*R:0)})).sort((a,b)=>a.cost-b.cost||a.h.id-b.h.id).concat({h:null,cost:0});
 });
 let best=null,rank=null;
 for(const a of lists[0])for(const b of lists[1]){
  const stance=[...fixed];stance[moving[0]]=a.h;stance[moving[1]]=b.h;
  if(stance.some((h,i)=>h&&stance.some((k,j)=>i!==j&&h===k&&!canShareHold(h,i,j))))continue;
  if((moving[0]<2)===(moving[1]<2) && a.h && b.h && a.h.x>b.h.x)continue;
  if(stance.slice(2).some(f=>f&&stance.slice(0,2).some(h=>h&&f.y<h.y)))continue;
  const r=[Number(stance.every(Boolean)&&bothHandsOnGoal(stance)),Number(!!a.h)+Number(!!b.h),-(a.cost+b.cost)];
  if(!rank||r[0]>rank[0]||(r[0]===rank[0]&&(r[1]>rank[1]||(r[1]===rank[1]&&r[2]>rank[2])))){rank=r;best=stance;}
 }
 return best;
}
function findValid(){for(const dy of [-100,-70,-40,0,40,70,100])for(const dx of [-100,-70,-40,0,40,70,100]){
 const a=action([{dx,dy}]),r=fingerGestureReplay(body,grips,a);if(r?.valid&&!r.won)return {a,r};
}throw Error('Fixture has no valid finger gesture');}
check('production coupled default and nested/throwing suspension restores mode',()=>{
 assert.equal(fingerAimEnabled(),true);assert.equal(coupledBodyEnabled(),true);assert.equal(fingerAimGain(),1.5);assert.equal(action([{dx:10,dy:0}]).bodyMotion,COUPLED_BODY_MODEL);
 assert(fingerAimEnabled());assert.equal(withFingerAimDisabled(()=>{assert(!fingerAimEnabled());return withFingerAimDisabled(()=>42);}),42);
 assert.throws(()=>withFingerAimDisabled(()=>{throw Error('expected');}),/expected/);assert(fingerAimEnabled());
});
check('explicit initial-contact + net displacement oracle; omitted context stays native',()=>{
 fixture();let count=0;
 for(const pair of pairs)for(const ox of [-15,0,15])for(const oy of [-15,0,15]){
  const p={x:body.x+ox,y:body.y+oy};
  const native=ids(oracle(p,pair));assert.deepEqual(ids(attachMoving(p,pair)),native);
  for(const [dx,dy] of [[0,0],[0,-40],[0,-120],[90,-30],[-90,30],[80,80]]){
   const aim={model:'finger-origin-v1',dx,dy,gain:1,originGrips:grips};
   assert.deepEqual(ids(attachMoving(p,pair,aim)),ids(oracle(p,pair,aim)));count++;
  }
 }
 assert.equal(count,324);
 const old=grips[1];const alternate=[...grips];alternate[1]={...old,x:old.x-50};
 assert.deepEqual(fingerAimTarget(1,{model:'finger-origin-v1',dx:20,dy:-30,gain:1,originGrips:alternate}),{x:old.x-30,y:old.y-30});
 assert.throws(()=>fingerAimTarget(1,{model:'finger-origin-v1',dx:Infinity,dy:0,gain:1,originGrips:grips}));
});
check('selector goal look-ahead never inherits live aiming',()=>{
 fixture();holds=holds.filter(h=>h.type!=='goal');holds.push({id:99,x:200,y:390,type:'goal'});
 const savedAttach=attachMoving,calls=[];attachMoving=function(p,pair,aim){calls.push(aim);return savedAttach(p,pair,aim);};
 try{for(const [dx,dy] of [[0,-80],[30,-60],[-30,-60],[70,0],[-70,0],[0,70]]){
  const expected=withFingerAimDisabled(()=>selectAnchor(dx,dy));
  drag={fingerOrigin:{x:10,y:20,width:400},fingerAction:action([{dx:300,dy:-300}])};
  assert.deepEqual(selectAnchor(dx,dy),expected);
 }assert(calls.length>0);assert(calls.every(a=>a===undefined));}finally{attachMoving=savedAttach;drag=null;}
});
check('legacy ray replay: net reversal and turn retain initial anchor',()=>{
 const f=fixture(),r=fingerGestureReplay(f.p,f.stance,legacyRayAction([{dx:60,dy:-30},{dx:0,dy:0}]));
 assert(r&&r.active);nearly(r.p,f.p);assert.deepEqual(ids(r.stance),ids(f.stance));assert.equal(r.valid,false);
 const turned=fingerGestureReplay(f.p,f.stance,legacyRayAction([{dx:50,dy:-20},{dx:-40,dy:45}]));
 assert.deepEqual(turned.anchor,selectAnchor(50,-20));
 const aim={model:'finger-origin-v1',dx:-40,dy:45,gain:1,originGrips:f.stance};
 assert.deepEqual(ids(turned.stance),ids(oracle(turned.p,turned.anchor,aim)));
});
check('replay rejects malformed actions and does not mutate live state',()=>{
 const f=fixture(),before=JSON.stringify({body,committed,grips,startGrips,stamina,moveCount,drag});
 for(const a of [null,{},action([]),action([{dx:NaN,dy:0}]),{...action([{dx:20,dy:0}]),gain:0}])assert.equal(fingerGestureReplay(f.p,f.stance,a),null);
 fingerGestureReplay(f.p,f.stance,action([{dx:40,dy:-80},{dx:-20,dy:30}]));
 assert.equal(JSON.stringify({body,committed,grips,startGrips,stamina,moveCount,drag}),before);
});
check('non-boundary straight 1-vs-10 event parity with actual input/replay',()=>{
 let count=0;
 for(const [dx,dy] of [[0,-150],[70,-100],[-80,-50],[160,0],[-160,0],[30,90]]){
  const f=fixture(),one=fingerGestureReplay(f.p,f.stance,action(sample(dx,dy))),ten=fingerGestureReplay(f.p,f.stance,action(sample(dx,dy,10)));
  nearly(one.p,ten.p);assert.deepEqual(ids(one.stance),ids(ten.stance));assert.deepEqual(one.anchor,ten.anchor);assert.equal(one.valid,ten.valid);
  for(const n of [1,10]){fixture();const out=live(sample(dx,dy,n));const r=n===1?one:ten;
   nearly(out.p,r.p);assert.deepEqual(out.stance,ids(r.stance));assert.deepEqual(out.anchor,r.anchor);assert.equal(out.after.moves,Number(r.valid));count++;
  }
 }assert.equal(count,12);
});
check('logical scaling, tall viewport padding, arbitrary origins and camera recenter',()=>{
 const f=fixture(),{a,r}=findValid();
 for(const rect of [{left:0,top:0,width:400,height:700},{left:15,top:30,width:200,height:350},{left:12,top:47,width:390,height:780}])
 for(const cameraStart of [0,300,700])for(const origin of [{x:100,y:200},{x:340,y:620}]){
  fixture();testRect=rect;camera=cameraStart;const out=live(a.points,{origin});
  nearly(out.p,r.p);assert.deepEqual(out.stance,ids(r.stance));assert.deepEqual(out.record.action,a);
 }
 testRect={left:0,top:0,width:400,height:700};
});
const reconstructed={HEIGHT:2100,origin:{x:297.7,y:340.6},gripIds:[43,45,47,48],holds:[
 {id:38,x:147.6071911928134,y:289,type:'normal'},
 {id:41,x:51.80130924563855,y:225.78542827592733,type:'normal'},
 {id:43,x:259.012774865143,y:255.07783325399774,type:'normal'},
 {id:44,x:208.37408035760745,y:297.22063052618444,type:'normal'},
 {id:45,x:340.6946150553413,y:302.8428386395009,type:'normal'},
 {id:46,x:46,y:358.46974550617426,type:'normal'},
 {id:47,x:364,y:420.2499584216624,type:'normal'},
 {id:48,x:364,y:475.9364247895777,type:'normal'},
 {id:62,x:313.62358621740714,y:250.43552329588252,type:'normal'},
 // Display label 44 in the reconstructed screenshot, not raw ID 44.
 {id:42,x:342.6485503409058,y:196.60729175444263,type:'normal'}]};
check('coupled torso slides along fixed LH/RF supports to capture hold 44',()=>{
 const f=fixture(reconstructed),e=eventAtScreen(200,300);down(e);drag.anchor=[0,3];
 move(movedEvent(e,{dx:0,dy:-200}));
 const replay=coupledGestureReplay(f.p,f.stance,action([{dx:0,dy:-200}]),[0,3]);
 nearly(body,replay.p);assert(body.x>f.p.x+20);assert(body.y<f.p.y);assert.equal(grips[1].id,42);
 assert.deepEqual(ids(grips),ids(replay.stance));release();assert.equal(moveCount,1);assert(lastFingerGesture.accepted);
});
check('partial hold-44 preview remains visible and invalid release restores stance',()=>{
 fixture(reconstructed);const e=eventAtScreen(200,300);down(e);drag.anchor=[0,2];
 // Coupled support motion retains partial legal stance previews.
 move(movedEvent(e,{dx:20,dy:-110}));
 const seen=ids(grips);assert(grips.some(h=>h===null),'Partial stance remains a preview');
 assert(seen.includes(42),'Display hold 44 remains reachable as partial target');
 release();assert.equal(moveCount,0);assert.equal(stamina,100);assert.deepEqual(ids(grips),reconstructed.gripIds);nearly(body,reconstructed.origin);
 assert(!lastFingerGesture.accepted);
});
check('wide/goal sharing, mixed exclusion, goal priority and hazards remain native',()=>{
 fixture();body=committed={x:200,y:300};
 const hands=[{id:1,x:148,y:232,type:'normal'},{id:2,x:252,y:232,type:'normal'}],feet=[{id:3,x:160,y:378,type:'normal'},{id:4,x:240,y:378,type:'normal'}];
 startGrips=grips=[...hands,...feet];
 for(const type of ['normal','goal']){
  const target={id:5,x:200,y:220,type,wide:type==='normal'};holds=[...hands,...feet,target];
  const aim={model:'finger-origin-v1',dx:type==='goal'?300:0,dy:type==='goal'?300:0,gain:1,originGrips:[target,target,...feet]};
  const out=attachMoving(body,[2,3],aim);assert.equal(out[0],target);assert.equal(out[1],target);
  assert.equal(canShareHold(target,0,2),false);
 }
 const foot={id:6,x:200,y:380,type:'normal',wide:true};holds=[...hands,...feet,foot];
 const out=attachMoving(body,[0,1],{model:'finger-origin-v1',dx:0,dy:0,gain:1,originGrips:[...hands,foot,foot]});assert.equal(out[2],foot);assert.equal(out[3],foot);
 fixture({origin:{x:200,y:300},HEIGHT:1400,gripIds:[1,2,3,4],holds:[...hands,...feet,{id:7,x:200,y:220,type:'goal'}]});
 const goalAction=action([{dx:0,dy:-10}]),goalReplay=fingerGestureReplay(body,grips,goalAction);
 assert(goalReplay.valid&&goalReplay.won);live(goalAction.points);assert.equal(state,'won');assert(bothHandsOnGoal());assert.equal(moveCount,1);
 fixture();const found=findValid(),changed=found.r.stance.filter((h,i)=>h!==grips[i]);changed.forEach(h=>h.type='hazard');
 const replay=fingerGestureReplay(body,grips,found.a),expected=newHazardContacts(replay.stance,grips).size*HAZARD_CONFIG.penalty;
 const outLive=live(found.a.points);assert.equal(replay.penalty,expected);assert.equal(outLive.after.stamina,100-1-expected);assert.equal(outLive.after.moves,1);
});
check('raised fixed feet cannot cross forbidden reach interval',()=>{
 fixture({origin:{x:200,y:299},HEIGHT:1400,gripIds:[1,2,3,4],holds:[
 {id:1,x:148,y:231,type:'normal'},{id:2,x:252,y:231,type:'normal'},
 {id:3,x:75,y:336,type:'normal'},{id:4,x:325,y:336,type:'normal'}]});
 assert(supportsReachable({x:200,y:330},[2,3]));
 const e=eventAtScreen(200,200);down(e);drag.anchor=[2,3];move(movedEvent(e,{dx:0,dy:31}));assert(Math.abs(body.y-300)<1e-6);assert(warning);release(true);
});
check('cancel, blur, multitouch and undo restore committed state; next gesture restarts origin',()=>{
 for(const kind of ['cancel','blur','touchcancel','multitouch']){
  fixture();const {a}=findValid(),before={p:{...body},stance:ids(grips)};
  const e=eventAtScreen(100,200),touch={...e,identifier:7};
  if(kind==='touchcancel'||kind==='multitouch')canvas.events.touchstart({touches:[touch],changedTouches:[touch],preventDefault(){}});else down(e);
  movePointer(movedEvent(e,a.points[0]));assert(drag);
  if(kind==='cancel')release(true);else if(kind==='blur')window.events.blur();else if(kind==='touchcancel')canvas.events.touchcancel({touches:[],changedTouches:[],preventDefault(){}});
  else {const other={...touch,identifier:8,clientX:touch.clientX+50};canvas.events.touchstart({touches:[touch,other],changedTouches:[other],preventDefault(){}});canvas.events.touchend({touches:[],changedTouches:[touch,other],preventDefault(){}});}
  assert.equal(drag,null);assert.equal(moveCount,0);assert.equal(stamina,100);nearly(body,before.p);assert.deepEqual(ids(grips),before.stance);
  const again=live(a.points,{origin:{x:330,y:550}});assert.equal(again.after.moves,1);assert.deepEqual(again.record.action,a);
  assert(undoMove());assert.equal(moveCount,0);assert.equal(stamina,100);nearly(body,before.p);assert.deepEqual(ids(grips),before.stance);
 }
});
check('release first sample, body tap threshold and gesture gain stay fixed',()=>{
 fixture();const {a}=findValid();const e=eventAtScreen(100,200);beginPointer(e);endPointer(movedEvent(e,a.points[0]));assert.equal(moveCount,1);
 fixture();const e2=eventAtScreen(200,500-camera);beginPointer(e2);assert(bodyTap&&!drag);
 movePointer(movedEvent(e2,{dx:1,dy:1}));assert(bodyTap&&!drag);endPointer(null,true);assert(!bodyTap&&!drag);
 fixture();down(e);move(movedEvent(e,a.points[0]));release();assert.equal(lastFingerGesture.action.gain,1.5);assert.equal(lastFingerGesture.action.bodyMotion,COUPLED_BODY_MODEL);
});
check('heart sweeps, canceled pickups, replay traces and undo preserve attempt resources',()=>{
 fixture();const {a,r}=findValid();const end=r.trace.at(-1);
 hearts=[{id:901,x:(body.x+end.x)/2,y:(body.y+end.y)/2,collected:false}];
 assert(r.trace.slice(1).some((p,i)=>torsoTouchesHeart(r.trace[i],p,hearts[0])));
 live(a.points,{cancel:true});assert(hearts[0].collected);assert.equal(stamina,102);assert.equal(moveCount,0);
 live(a.points);assert.equal(stamina,101);assert.equal(moveCount,1);assert.equal(heartPopups.length,1);
 assert(undoMove());assert.equal(stamina,102);assert(hearts[0].collected);assert.equal(moveCount,0);
 live(a.points);assert.equal(stamina,101);assert.equal(heartPopups.length,1);
});
check('stored action and live trace exactly replay with subthreshold and repeated release samples',()=>{
 const f=fixture(),e=eventAtScreen(100,200);beginPointer(e);
 movePointer(movedEvent(e,{dx:1,dy:-1}));movePointer(movedEvent(e,{dx:40,dy:-40}));endPointer(movedEvent(e,{dx:40,dy:-40}));
 const replay=fingerGestureReplay(f.p,f.stance,lastFingerGesture.action);
 assert.deepEqual(lastFingerGesture.trace,replay.trace);
 assert(lastFingerGesture.trace.length>lastFingerGesture.action.points.length+1,'Trace captures integrated support motion, not just event endpoints');
});
check('stage-edge diagonal overshoot is sample invariant and matches actual input',()=>{
 fixture();const dx=300,dy=300*Math.sqrt(3),origin={...body},stance=[...grips];
 const one=fingerGestureReplay(origin,stance,action(sample(dx,dy))),ten=fingerGestureReplay(origin,stance,action(sample(dx,dy,10)));
 nearly(one.p,ten.p);assert.deepEqual(ids(one.stance),ids(ten.stance));assert.deepEqual(one.anchor,ten.anchor);
 assert.equal(one.trace.length,ten.trace.length);one.trace.forEach((p,i)=>nearly(p,ten.trace[i]));
 for(const [n,r] of [[1,one],[10,ten]]){
  fixture();const out=live(sample(dx,dy,n));nearly(out.p,r.p);assert.deepEqual(out.stance,ids(r.stance));assert.equal(out.after.moves,Number(r.valid));
 }
});
check('production tutorial retry restores geometry, resources and input identity',()=>{
 tutorialRun={seen:new Set(TUTORIAL_CONFIG.steps.map(step=>step.id)),queue:[],explanation:null};reset(0);cameraIntro=null;
 const baseline=JSON.stringify({holds,route,hearts,stamina,HEIGHT});
 assert(route.slice(1).every(p=>p.action?.bodyMotion===COUPLED_BODY_MODEL));
 const {a}=findValid();live(a.points);restartInput(0);assert.equal(drag,null);assert.equal(moveCount,0);
 assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),baseline);
});
`)(assert,failures,{});
if(failures.length){console.error(failures.length+' finger-aim checks failed');process.exitCode=1;}else console.log('PASS all production finger-origin checks ('+(process.env.ASCENT_NATIVE_TEST==='1'?'native transform':'web source')+')');
