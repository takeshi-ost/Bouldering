const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!/<(?:header|footer)[ >]/.test(html));
assert(!/id="(?:showPath|mapDebug|courseMenu)"/.test(html));
assert.equal((html.match(/type="checkbox"/g)||[]).length,1);
assert(/<dialog id="settingsDialog"[\s\S]*id="restart"[\s\S]*id="mapButton"[\s\S]*?<\/dialog>/.test(html));
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
let clock=0;const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},showModal(){this.open=true;},close(){this.open=false;},classList:{values:{},toggle(key,value){this.values[key]=value;}},focus(){},events:{},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:15,top:30,width:300,height:525};}
};}};const window={events:{},addEventListener(name,fn){this.events[name]=fn;},devicePixelRatio:1};function requestAnimationFrame(){}
`;
new Function('assert','html',env+source+`
// A fixed palette isolates press feedback from randomized first-run appearance.
playerColors=['#39785b'];
function eventAt(p) {const r=canvas.getBoundingClientRect();return {clientX:r.left+p.x*r.width/W,clientY:r.top+(p.y-camera)*r.height/H,button:0,preventDefault(){}};}
function visibleEvent(){return eventAt(characterPose(clock).body);}
function mouse(name,e){(name==='mousedown'?canvas.events:window.events)[name](e);}
function touch(name,touches,changed=touches){canvas.events[name]({touches,changedTouches:changed,preventDefault(){}});}
function finger(id,e){return {...e,identifier:id};}
function play(i) {
 camera=clamp(body.y-H*.6,0,HEIGHT-H);
 down(eventAt(body));move(eventAt(route[i]));release();
 assert.equal(moveCount,i);
}
function fixture() {
 reset(1);advanceCameraIntro(0);advanceCameraIntro(1000);clock+=1000;
 play(1);clock+=250;
 assert(canUndoMove());return {stamina,moveCount,undo:undoSnapshot};
}
// Only the title checkbox controls debug tools and planned-path rendering.
assert.equal(state,'choosing');assert.equal(debugMode,false);assert(ui.hud.hidden);
ui.debugMode.checked=true;ui.debugMode.onchange();
startCourse('existing');assert(!ui.debugControls.hidden && ui.hud.hidden);
assert(selectStage(1));assert(!ui.hud.hidden && !ui.progress.hidden);
ui.debugMode.checked=false;ui.debugMode.onchange();assert(debugMode && ui.debugMode.checked);
showTitleScreen();assert(ui.debugMode.checked);ui.debugMode.checked=false;ui.debugMode.onchange();
startCourse('existing');assert(ui.debugControls.hidden);assert(selectStage(1));assert(ui.progress.hidden);
// Settings cancel an in-flight gesture, block movement/scroll/Undo, and close on navigation.
ui.settingsButton.onclick();assert(!settingsOpen,'Cannot open settings during intro');
fixture();const menuBefore=JSON.stringify({body,grips,stamina,moveCount});
mouse('mousedown',visibleEvent());assert(bodyTap);
const menuTime=runTimeMs();ui.settingsButton.onclick();assert(settingsOpen && ui.settingsDialog.open && !bodyTap && !drag);
clock+=500;assert.equal(runTimeMs(),menuTime+500,'Settings do not pause the timer');
assert(!canScrollStage() && !canUndoMove());
mouse('mousedown',visibleEvent());down(eventAt(body));assert(!bodyTap && !drag);
assert.equal(JSON.stringify({body,grips,stamina,moveCount}),menuBefore);
ui.settingsDialog.events.cancel({preventDefault(){}});assert(!settingsOpen && !ui.settingsDialog.open);
assert(canUndoMove());
ui.settingsButton.onclick();ui.restart.onclick();assert(!settingsOpen && !ui.settingsDialog.open && cameraIntro && moveCount===0);
fixture();ui.settingsButton.onclick();ui.mapButton.onclick();assert(!settingsOpen && !ui.settingsDialog.open && state==='map' && ui.hud.hidden);
showTitleScreen();assert(ui.hud.hidden);
// Press feedback changes only rendered torso position/color, then immediately returns.
fixture();const paints=[];ctx.fillRect=(x,y,w,h)=>paints.push({x,y,w,h,color:ctx.fillStyle});
const physics=JSON.stringify({body,grips});draw(0);
const normalTorso=paints.find(p=>p.color==='#39785b' && p.w===TORSO.width);
assert(normalTorso);paints.length=0;
let pressEvent=visibleEvent();mouse('mousedown',pressEvent);draw(0);
const pressedTorso=paints.find(p=>p.color==='#5b9b72' && p.w===TORSO.width);
assert(pressedTorso);assert.equal(pressedTorso.y,normalTorso.y+3);
assert.equal(JSON.stringify({body,grips}),physics,'Press feedback changes physics');
window.events.blur();paints.length=0;draw(0);
assert(paints.some(p=>p.color==='#39785b' && p.y===normalTorso.y));
// Tap visible settled torso: no snap on press, then exactly one Undo on release.
let before=fixture(),e=visibleEvent(),pose=characterAnimation;
mouse('mousedown',e);assert(bodyTap && !drag);assert.equal(characterAnimation,pose);
clock+=100;mouse('mouseup',e);assert.equal(moveCount,0);assert.equal(stamina,before.stamina+1);
assert.equal(canUndoMove(),false);
e=visibleEvent();mouse('mousedown',e);clock+=80;mouse('mouseup',e);assert.equal(moveCount,0);
// Small finger jitter remains a tap; outside-body clicks and long presses do not Undo.
before=fixture();e=visibleEvent();mouse('mousedown',e);mouse('mousemove',{...e,clientX:e.clientX+1});clock+=100;mouse('mouseup',{...e,clientX:e.clientX+1});assert.equal(moveCount,0);
before=fixture();e=eventAt({x:body.x<200?380:20,y:body.y});mouse('mousedown',e);clock+=100;mouse('mouseup',e);assert.equal(moveCount,1);assert.equal(undoSnapshot,before.undo);
e=visibleEvent();mouse('mousedown',e);clock+=INPUT_CONFIG.tapMaxDuration+1;mouse('mouseup',e);assert.equal(moveCount,1);assert.equal(bodyTap,null);
// Drag from the visible torso still performs an ordinary move, never Undo.
before=fixture();e=visibleEvent();const r=canvas.getBoundingClientRect();
const destination={...e,clientX:e.clientX+(route[2].x-body.x)*r.width/W,clientY:e.clientY+(route[2].y-body.y)*r.height/H};
mouse('mousedown',e);assert(bodyTap);mouse('mousemove',destination);assert(!bodyTap && drag);
mouse('mouseup',destination);assert.equal(moveCount,2);
// Crossing the drag threshold and returning must not turn into a body tap.
before=fixture();e=visibleEvent();mouse('mousedown',e);mouse('mousemove',{...e,clientX:e.clientX+18});mouse('mousemove',e);mouse('mouseup',e);assert(moveCount>=1);
// Release can carry the first movement sample: it must be treated as a drag.
before=fixture();e=visibleEvent();mouse('mousedown',e);mouse('mouseup',{...e,clientX:e.clientX+18});assert(moveCount>=1);
// Blur, touchcancel (even without changedTouches), and two fingers never trigger Undo.
before=fixture();e=visibleEvent();mouse('mousedown',e);window.events.blur();assert.equal(bodyTap,null);assert.equal(moveCount,1);
e=visibleEvent();touch('touchstart',[finger(7,e)]);assert(bodyTap);touch('touchcancel',[],[]);assert.equal(bodyTap,null);assert.equal(touchId,null);assert.equal(moveCount,1);
e=visibleEvent();touch('touchstart',[finger(7,e)]);touch('touchstart',[finger(7,e),finger(8,{...e,clientX:e.clientX+50})],[finger(8,e)]);assert.equal(bodyTap,null);assert.equal(moveCount,1);
touch('touchend',[finger(7,e)],[finger(8,e)]);touch('touchend',[],[finger(7,e)]);assert.equal(moveCount,1);
HEIGHT=H*2;e=visibleEvent();touch('touchstart',[finger(7,e)]);touch('touchstart',[finger(7,e),finger(8,{...e,clientY:e.clientY+50})],[finger(8,e)]);assert(pan && !bodyTap);
touch('touchend',[finger(7,e)],[finger(8,e)]);touch('touchend',[],[finger(7,e)]);assert.equal(moveCount,1);
// A normal touch tap works and preserves pickup semantics tested by rules.cjs.
e=visibleEvent();touch('touchstart',[finger(7,e)]);clock+=100;touch('touchend',[],[finger(7,e)]);assert.equal(moveCount,0);
// Central result modals block background body taps and scrolling.
fixture();for(let i=2;i<route.length;i++)play(i);assert.equal(state,'won');clock+=1000;
e=visibleEvent();mouse('mousedown',e);clock+=100;mouse('mouseup',e);assert.equal(state,'won');assert.equal(bodyTap,null);assert(!canScrollStage());
fixture();stamina=1;play(2);assert.equal(state,'lost');assert.equal(characterAnimation.kind,'fall');
const lossCamera=camera;HEIGHT=H*3;assert.equal(canScrollStage(),false);
canvas.events.wheel({deltaY:100,deltaMode:0,preventDefault(){}});
canvas.events.keydown({key:'End',preventDefault(){}});
beginTouchPan([finger(1,eventAt(body)),finger(2,eventAt({x:body.x+30,y:body.y}))]);assert.equal(pan,null);
draw(0);assert.equal(camera,lossCamera);assert(!ui.overlay.hidden);assert(!ui.overlay.classList.values.reviewing);
e=visibleEvent();mouse('mousedown',e);clock+=100;mouse('mouseup',e);assert.equal(state,'lost');assert.equal(bodyTap,null);ui.retry.onclick();assert.equal(state,'playing');assert(ui.overlay.hidden);assert.equal(moveCount,0);
// Every stage, including a one-screen stage, blocks input until its title has lasted 1s.
reset(1);assert(cameraIntro);e=visibleEvent();mouse('mousedown',e);mouse('mouseup',e);assert.equal(bodyTap,null);assert.equal(drag,null);
advanceCameraIntro(100);advanceCameraIntro(1099);assert(cameraIntro);assert.equal(camera,HEIGHT-H);
const labels=[];ctx.fillText=(text,x,y)=>labels.push({text,x,y});
drawStageIntro();assert.deepEqual(labels.pop(),{text:'STAGE 001',x:W/2,y:H/2});
advanceCameraIntro(1100);assert.equal(cameraIntro,null);drawStageIntro();assert.equal(labels.length,0);
assert.equal(ui.next.textContent,'次のステージへ →');
showLevelMap();e=visibleEvent();mouse('mousedown',e);mouse('mouseup',e);assert.equal(bodyTap,null);assert.equal(state,'map');
console.log('PASS title-only debug controls, settings modal cancellation/navigation/input guards and timer; body-tap Undo: visible pose, jitter, mouse/touch, single use, drag/return, long press, cancel, blur, two fingers, result modal input guards; centered STAGE label and 1s input lock');
`)(assert,html);
