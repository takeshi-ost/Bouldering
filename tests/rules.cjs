const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!html.includes('id="undo"') && !html.includes('id="changeCourse"'));
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const environment=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
new Function('assert','html',environment+source+`
const wide={x:200,y:220,id:1,type:'normal',wide:true};
for(let a=0;a<4;a++)for(let b=0;b<4;b++) {
 assert.equal(canShareHold(wide,a,b),a!==b && Math.floor(a/2)===Math.floor(b/2));
 assert.equal(canShareHold({...wide,wide:false},a,b),false);
 assert.equal(canShareHold({type:'goal'},a,b),a!==b && a<2 && b<2);
}
body={x:200,y:300};committed={...body};
const feet=[{x:160,y:378,id:2,type:'normal'},{x:240,y:378,id:3,type:'normal'}];
startGrips=[null,null,...feet];holds=[wide,...feet];
let attached=attachMoving(body,[2,3]);assert.equal(attached[0],wide);assert.equal(attached[1],wide);
startGrips=attached;
assert(supportsReachable(body,[0,1]),'Two hands on wide hold cannot support body');
const hands=[{x:148,y:232,id:4,type:'normal'},{x:252,y:232,id:5,type:'normal'}];
const wideFoot={...wide,y:380,id:6};startGrips=[...hands,null,null];holds=[...hands,wideFoot];
attached=attachMoving(body,[0,1]);assert.equal(attached[2],wideFoot);assert.equal(attached[3],wideFoot);
startGrips=attached;assert(supportsReachable(body,[2,3]),'Two feet on wide hold cannot support body');
// Without sharing, at most one moving hand may occupy the sole hand target.
wide.wide=false;startGrips=[null,null,...feet];holds=[wide,...feet];
attached=attachMoving(body,[2,3]);assert(attached.filter(h=>h===wide).length<=1);
// Actual input / release path, including visual restoration and terminal states.
startCourse('existing');assert.equal(state,'map');assert(selectStage(1));assert.equal(state,'playing');
assert.equal(ui.progress.hidden,true);ui.showPath.checked=true;ui.showPath.onchange();assert.equal(ui.progress.hidden,false);
assert(ui.progress.textContent.includes('想定'));ui.showPath.checked=false;ui.showPath.onchange();assert.equal(ui.progress.hidden,true);
advanceCameraIntro(0);advanceCameraIntro(1650);assert.equal(canUndoMove(),false);
function playStep(step) {
 advanceCameraIntro(0);advanceCameraIntro(1650);
 camera=clamp(body.y-H*.6,0,HEIGHT-H);
 const event=p=>({clientX:p.x,clientY:p.y-camera});
 down(event(body));const snapshot=moveSnapshot;
 move(event(step));release();return snapshot;
}
function checkUndo(snapshot) {
 const stage=holds,routeBefore=route;
 assert.equal(undoMove(),true);assert.equal(state,'playing');
 assert.deepEqual(body,snapshot.body);assert.deepEqual(grips,snapshot.grips);
 assert.equal(stamina,snapshot.stamina);assert.equal(moveCount,snapshot.moveCount);
 assert.deepEqual(playerPath,snapshot.playerPath);
 assert.deepEqual(characterPose(performance.now()).body,snapshot.visibleBody);
 assert.equal(holds,stage);assert.equal(route,routeBefore);
 assert(ui.overlay.hidden);assert(!canUndoMove());assert.equal(undoMove(),false);
}
const first=playStep(route[1]);assert.equal(moveCount,1);checkUndo(first);
// A new confirmed move replenishes Undo; canceled input must not replace it.
playStep(route[1]);const savedUndo=undoSnapshot;
down({clientX:body.x,clientY:body.y-camera});release(true);assert.equal(undoSnapshot,savedUndo);
checkUndo(savedUndo);
// Loss on the last stamina point is reversible.
stamina=1;const losing=playStep(route[1]);assert.equal(state,'lost');checkUndo(losing);
reset(1);assert.equal(undoSnapshot,null);advanceCameraIntro(0);advanceCameraIntro(1650);
let winning;
for(let i=1;i<route.length;i++)winning=playStep(route[i]);
assert.equal(state,'won');assert.equal(stamina,0);assert.equal(characterAnimation.kind,'hang');checkUndo(winning);
reset(2);assert.equal(undoSnapshot,null);assert.equal(canUndoMove(),false);
// Every stage starts with its own fixed budget; no carryover or bonus suffix.
reset(1);const regular=stamina;
for(let i=1;i<route.length;i++)playStep(route[i]);
assert.equal(state,'won');draw(2000);
assert.equal(ui.resultText.textContent,'ステージクリア！');
ui.next.onclick();assert.equal(state,'map');
advanceLevelMap(0);advanceLevelMap(MAP_HOP_DURATION);assert.equal(mapSelected,2);assert(selectStage(2));assert.equal(level,2);
const nextBudget=stageStamina(route.length-1)-hearts.length*2;
assert.equal(stamina,nextBudget);assert.equal(ui.stamina.textContent,String(nextBudget));
ui.next.onclick();assert.equal(level,2,'Repeated Next advances twice');
advanceCameraIntro(0);advanceCameraIntro(1650);playStep(route[1]);
ui.retry.onclick();assert.equal(stamina,nextBudget);
startCourse('prototype');assert.equal(state,'map');assert(selectStage(1));assert.equal(stamina,stageStamina(route.length-1));
assert(ui.level.innerHTML.includes('ロジハラコース'));
startCourse('existing');assert.equal(state,'map');assert(selectStage(1));assert(ui.level.innerHTML.includes('ノーマルコース'));
assert.equal(ui.stamina.textContent,String(stamina));
// Actual route is automatic after winning; planned route still follows the checkbox.
const drawnColors=[],drawnLabels=[];
ctx.stroke=()=>drawnColors.push(ctx.strokeStyle);
ctx.fillText=text=>drawnLabels.push(text);
ui.showPath.checked=false;state='won';playerPath=[{x:100,y:300},{x:150,y:250}];
drawPath();assert(drawnColors.includes('#d14479'));assert(!drawnColors.includes('#527faa9c'));
assert(drawnLabels.includes('実際のルート'));
drawnColors.length=0;state='playing';drawPath();assert.equal(drawnColors.length,0);
ui.showPath.checked=true;state='won';drawPath();
assert(drawnColors.includes('#527faa9c') && drawnColors.includes('#d14479'));
ui.showPath.checked=false;
// Ten-move stamina boundaries, including the explicit 30 -> 33 example.
for(const [moves,budget] of [[5,5],[9,9],[10,11],[19,20],[20,22],[29,31],[30,33],[39,42],[40,44]])
 assert.equal(stageStamina(moves),budget);
// Heart generation boundaries, seeded count and a playable recovery schedule.
const samplePath=Array.from({length:6},(_,i)=>({x:200+i*20,y:600-i*40}));
for(let n=1;n<5;n++)assert.deepEqual(createHearts(n,samplePath),[]);
for(let moves=0;moves<5;moves++)assert.deepEqual(createHearts(5,samplePath.slice(0,moves+1)),[]);
const seenHeartCounts=new Set();
for(let n=5;n<105;n++) {
 const items=createHearts(n,samplePath);seenHeartCounts.add(items.length);
 assert(items.length<=2);assert.deepEqual(createHearts(n,samplePath),items);
 let budget=stageStamina(5)-items.length*2;
 const picked=new Set();
 for(let i=1;i<samplePath.length;i++) {
  assert(budget>0,'Cannot start next move before recovery');
  items.forEach(h=>{if(!picked.has(h.id)&&torsoTouchesHeart(samplePath[i-1],samplePath[i],h)){picked.add(h.id);budget+=2;}});
  budget--;
 }
 assert.equal(picked.size,items.length);assert.equal(budget,0);
}
assert.deepEqual([...seenHeartCounts].sort(),[0,1,2]);
// No near-goal recoveries: cover all supported route lengths and 100 stage seeds.
for(let moves=5;moves<=40;moves++)for(let n=5;n<105;n++) {
 const path=Array.from({length:moves+1},(_,i)=>({x:200,y:(moves-i)*100}));
 const items=createHearts(n,path);
 let budget=stageStamina(moves)-items.length*2;
 let step=0;
 for(let i=0;i<items.length;i++) {
  const pickup=path.findIndex(p=>p.x===items[i].x && p.y===items[i].y);
  assert(pickup>step);
  assert(pickup<=Math.floor(moves*(i+1)/(items.length+1)),'Recovery placed too late');
  const beforePickup=budget-(pickup-step-1);
  assert(beforePickup>=1,'Cannot reach recovery');
  if(moves>=10)assert(beforePickup>=2,'No reserve before recovery');
  budget=beforePickup+2-1;step=pickup;
 }
 assert.equal(budget-(moves-step),Math.floor(moves/10));
}
// Lv14 regression: both recoveries must be reached before the final third.
for(const mode of ['existing','prototype']) {
 courseMode=mode;reset(14);cameraIntro=null;
 const count=route.length-1;
 assert.equal(hearts.length,2);
 const schedule=hearts.map(h=>route.findIndex(p=>p.x===h.x && p.y===h.y));
 assert(schedule[1]<=Math.floor(count*2/3));
 const initial=stamina;
 // Consume one point to model an extra cost before reaching the second heart.
 stamina--;
 for(let i=1;i<route.length;i++) {
  playStep(route[i]);
  if(i===schedule[1])assert(hearts.every(h=>h.collected) && stamina>0);
 }
 assert.equal(state,'won','Lv14 runs out before the late heart');
 assert.equal(stamina,Math.floor(count/10)-1);
 ui.retry.onclick();
 assert.equal(stamina,initial);assert(hearts.every(h=>!h.collected));
 assert.deepEqual(hearts.map(h=>route.findIndex(p=>p.x===h.x && p.y===h.y)),schedule);
}
courseMode='existing';
console.log('PASS early heart deadlines across 3600 routes; Lv14 both courses with one stamina spent before pickup');
assert(torsoTouchesHeart({x:100,y:300},{x:300,y:300},{x:200,y:300}),'Fast sweep misses heart');
assert(!torsoTouchesHeart({x:100,y:300},{x:300,y:300},{x:200,y:347}),'Arm/leg contact collects heart');
reset(1);cameraIntro=null;
const heartTarget=route[1];
hearts=[{id:0,x:heartTarget.x,y:heartTarget.y,collected:false}];
const initialHeartBudget=stamina;
function dragToFirst() {
 camera=clamp(body.y-H*.6,0,HEIGHT-H);
 const event=p=>({clientX:p.x,clientY:p.y-camera});
 down(event(body));move(event(route[1]));
}
dragToFirst();assert(hearts[0].collected);assert.equal(stamina,initialHeartBudget+2);
assert.equal(heartPopups.length,1);assert.equal(heartPopups[0].x,heartTarget.x);assert.equal(heartPopups[0].y,heartTarget.y);
move({clientX:body.x,clientY:body.y-camera});assert.equal(stamina,initialHeartBudget+2,'Repeated contact farms recovery');
assert.equal(heartPopups.length,1,'Repeated contact duplicates popup');
release(true);assert(hearts[0].collected);assert.equal(stamina,initialHeartBudget+2);
assert.equal(moveCount,0,'Canceled pickup consumes a move');
dragToFirst();grips=[...startGrips];release();
assert(hearts[0].collected);assert.equal(stamina,initialHeartBudget+2,'No-op duplicates recovery');
dragToFirst();grips=[null,...grips.slice(1)];release();
assert(hearts[0].collected);assert.equal(stamina,initialHeartBudget+2,'Invalid move duplicates recovery');
const beforeHeart=playStep(route[1]);assert(hearts[0].collected);
assert.equal(stamina,initialHeartBudget+1);
checkUndo(beforeHeart);assert(hearts[0].collected);
playStep(route[1]);assert.equal(stamina,initialHeartBudget+1,'Undo then pickup duplicates recovery');
// Undo the move on which a heart was first touched: keep the pickup and refund the move.
reset(1);cameraIntro=null;hearts=[{id:0,x:route[1].x,y:route[1].y,collected:false}];
const beforeFreshPickup=stamina;playStep(route[1]);assert.equal(stamina,beforeFreshPickup+1);
assert(undoMove());assert(hearts[0].collected);assert.equal(stamina,beforeFreshPickup+2);
playStep(route[1]);assert.equal(stamina,beforeFreshPickup+1);
// A later canceled pickup must also survive Undo of the earlier committed move.
hearts.push({id:1,x:route[2].x,y:route[2].y,collected:false});
camera=clamp(body.y-H*.6,0,HEIGHT-H);
down({clientX:body.x,clientY:body.y-camera});
move({clientX:route[2].x,clientY:route[2].y-camera});release(true);
assert(hearts[1].collected);assert(undoMove());assert.equal(stamina,beforeFreshPickup+4);
assert(hearts.every(h=>h.collected));
// Recovery on the final available move happens before the loss check.
reset(1);cameraIntro=null;hearts=[{id:0,x:route[1].x,y:route[1].y,collected:false}];
stamina=1;playStep(route[1]);assert.equal(state,'playing');assert.equal(stamina,2);
reset(1);assert.deepEqual(hearts,[]);assert.deepEqual(heartPopups,[]);
// Sample the drawn positions and opacity at known elapsed times without real waits.
const popupCalls=[];
ctx.fillText=(text,x,y)=>popupCalls.push({text,x,y,alpha:ctx.globalAlpha});
heartPopups=[{x:170,y:400,start:1000}];
drawHeartPopups(1000);assert.deepEqual(popupCalls.pop(),{text:'+2',x:170,y:400,alpha:1});
drawHeartPopups(1500);assert.deepEqual(popupCalls.pop(),{text:'+2',x:170,y:385,alpha:.5});
drawHeartPopups(1999);const lastPopup=popupCalls.pop();
assert(Math.abs(lastPopup.y-370.03)<1e-9);assert(lastPopup.alpha>0 && lastPopup.alpha<.002);
drawHeartPopups(2000);assert.equal(popupCalls.length,0);assert.deepEqual(heartPopups,[]);
console.log('PASS +2 popup position, 30px/1s rise, opacity, expiration, reset, no duplicate; stamina 10/20/30 thresholds');
console.log('PASS hearts: eligibility, retry seed, route budget, swept contact, persistent cancel/no-op/invalid/Undo pickups, no duplicate recovery, last-stamina rescue');
// Two fingers cancel movement without spending a move and pan in canvas units.
reset(1);cameraIntro=null;HEIGHT=H*2;
const beforePan={stamina,moveCount,body:{...body},grips:[...grips]};
const finger=(id,y)=>({identifier:id,clientX:200,clientY:y});
const emit=(name,touches,changed=touches)=>canvas.events[name]({touches,changedTouches:changed,preventDefault(){}});
emit('touchstart',[finger(1,350)]);assert(drag);
emit('touchstart',[finger(1,350),finger(2,450)],[finger(2,450)]);
assert(pan);assert.equal(drag,null);assert(inspecting);
const initialCamera=camera;
canvas.getBoundingClientRect=()=>({left:0,top:0,width:200,height:350});
emit('touchmove',[finger(1,300),finger(2,400)]);
assert.equal(camera,clamp(initialCamera+100,0,HEIGHT-H));
emit('touchmove',[finger(1,-5000),finger(2,-4900)]);assert.equal(camera,HEIGHT-H);
emit('touchmove',[finger(1,5000),finger(2,5100)]);assert.equal(camera,0);
emit('touchend',[finger(1,350)],[finger(2,450)]);assert.equal(pan,null);
emit('touchmove',[finger(1,400)]);assert.equal(drag,null);
emit('touchend',[],[finger(1,400)]);assert.equal(ignoreTouches,false);
assert.equal(stamina,beforePan.stamina);assert.equal(moveCount,beforePan.moveCount);
assert.deepEqual(body,beforePan.body);assert.deepEqual(grips,beforePan.grips);
emit('touchstart',[finger(1,100),finger(2,200)]);assert(pan);
emit('touchstart',[finger(1,100),finger(2,200),finger(3,300)]);assert.equal(pan,null);
emit('touchend',[],[finger(1,100),finger(2,200),finger(3,300)]);
emit('touchstart',[finger(1,100),finger(2,200)]);assert(pan);
emit('touchcancel',[],[finger(1,100),finger(2,200)]);assert.equal(pan,null);assert.equal(ignoreTouches,false);
cameraIntro={from:0,to:HEIGHT-H,start:null};
emit('touchstart',[finger(1,100),finger(2,200)]);assert.equal(pan,null);
emit('touchend',[],[finger(1,100),finger(2,200)]);
assert(!html.includes('id="scrollRail"') && !html.includes('id="density"'));
assert(!ui.level.innerHTML.includes('2点固定'));
console.log('PASS two-finger scrolling: cancel movement, scale, bounds, finger release, third finger, cancel, intro guard');
showCourseMenu();
ui.helpDialog.showModal=function(){this.open=true;};ui.helpDialog.close=function(){this.open=false;};
ui.showHelp.onclick();assert.equal(ui.helpDialog.open,true);assert.equal(state,'choosing');
ui.closeHelp.onclick();assert.equal(ui.helpDialog.open,false);
assert(html.includes('くわしい説明') && html.includes('手足の制限') && html.includes('ホールドの種類'));
console.log('PASS fixed stage stamina, no carryover, retry, Next guard, automatic actual route and optional planned route');
console.log('PASS Undo: actual input, single use, rearming, cancel, loss, win, reset, visible pose; wide holds: hands/feet sharing and mixed exclusion');
`)(assert,html);
