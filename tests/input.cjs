const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!/<(?:header|footer)[ >]/.test(html));
assert(!/id="(?:showPath|mapDebug|courseMenu)"/.test(html));
assert.equal((html.match(/type="checkbox"/g)||[]).length,6);
assert(/<dialog id="settingsDialog"[\s\S]*id="restart"[\s\S]*?<\/dialog>/.test(html));
assert(!html.includes('id="mapButton"'));assert(/id="restart"[^>]*data-i18n="ui.restart"/.test(html));
const nativeTest=process.env.ASCENT_NATIVE_TEST==='1';
const nativeSource=require('../scripts/native-bundle-source.cjs');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>{const s=fs.readFileSync(path.join(root,m[1]),'utf8');return nativeTest?nativeSource(path.basename(m[1]),s):s;}).join('\n');
const env=`
let clock=0;const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},showModal(){this.open=true;},close(){this.open=false;},classList:{values:{},toggle(key,value){this.values[key]=value;}},focus(){},events:{},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:15,top:30,width:300,height:525};}
};}};const window={events:{},addEventListener(name,fn){const previous=this.events[name];this.events[name]=previous?e=>{previous(e);fn(e);}:fn;},devicePixelRatio:1};function requestAnimationFrame(){}
`;
new Function('assert','html','nativeTest',env+source+`
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
 hideStageStart();playsSinceAd=0;reset(1);advanceCameraIntro(0);advanceCameraIntro(1000);clock+=1000;
 play(1);clock+=250;
 assert(canUndoMove());return {stamina,moveCount,undo:undoSnapshot};
}
// Debug controls live in map settings; the title has no individual controls.
assert.equal(state,'choosing');assert.equal(debugMode,false);assert(ui.hud.hidden);
assert(!/id="(?:existingCourse|editCharacter|debugMode)"/.test(html));
startCourse('existing');ui.mapSettingsButton.onclick();
ui.mapDebugMode.checked=true;ui.mapDebugMode.onchange();assert(!ui.prototypeCourse.hidden && !ui.prototypeDescription.hidden);
assert(!ui.debugControls.hidden && ui.hud.hidden);assert(ui.mapCourse.hidden && ui.mapCourse.textContent==='');
ui.closeSettings.onclick();assert(selectStage(1));assert(!ui.hud.hidden && !ui.progress.hidden);
ui.mapDebugMode.checked=false;ui.mapDebugMode.onchange();assert(debugMode && ui.mapDebugMode.checked);
showTitleScreen();setDebugMode(false);assert(ui.prototypeCourse.hidden && ui.prototypeDescription.hidden);
startCourse('existing');assert(ui.debugControls.hidden);assert(selectStage(1));assert(ui.progress.hidden);
// Settings cancel an in-flight gesture, block movement/scroll/Undo, and close on navigation.
ui.settingsButton.onclick();assert(!settingsOpen,'Cannot open settings during intro');
fixture();const menuBefore=JSON.stringify({body,grips,stamina,moveCount});
mouse('mousedown',visibleEvent());assert(bodyTap);
const menuTime=runTimeMs();ui.settingsButton.onclick();assert(settingsOpen && ui.settingsDialog.open && !bodyTap && !drag && ui.mapSettingsFooter.hidden);
clock+=500;assert.equal(runTimeMs(),menuTime+500,'Settings do not pause the timer');
assert(!canScrollStage() && !canUndoMove());
mouse('mousedown',visibleEvent());down(eventAt(body));assert(!bodyTap && !drag);
assert.equal(JSON.stringify({body,grips,stamina,moveCount}),menuBefore);
ui.settingsDialog.events.cancel({preventDefault(){}});assert(!settingsOpen && !ui.settingsDialog.open);
assert(canUndoMove());
ui.settingsButton.onclick();ui.restart.onclick();assert(!settingsOpen && !ui.settingsDialog.open && state==='lost');assert.equal(ui.resultTitle.textContent,'登頂失敗…');assert(!ui.resultTip.hidden);const retiredLives=lives.count;ui.restart.onclick();assert.equal(lives.count,retiredLives);
fixture();ui.settingsButton.onclick();returnFromStage();assert(!settingsOpen && !ui.settingsDialog.open && state==='map' && ui.hud.hidden);
showLevelMap();ui.mapSettingsButton.onclick();assert(settingsOpen && !ui.mapSettingsControls.hidden && ui.restart.hidden && !ui.mapSettingsFooter.hidden);
ui.mapDebugMode.checked=true;ui.mapDebugMode.onchange();assert(debugMode && ui.mapDebugMode.checked && !ui.debugControls.hidden);
ui.mapDebugMode.checked=false;ui.mapDebugMode.onchange();assert(!debugMode && !ui.mapDebugMode.checked && ui.debugControls.hidden);
ui.closeSettings.onclick();assert(!settingsOpen && !ui.settingsDialog.open);
ui.mapSettingsButton.onclick();ui.mapCourses.onclick();assert.equal(state,'choosing');assert(!settingsOpen && !ui.settingsDialog.open);
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
e=visibleEvent();mouse('mousedown',e);clock+=100;mouse('mouseup',e);assert.equal(state,'lost');assert.equal(bodyTap,null);ui.retry.onclick();assert(ui.stageStartDialog.open);ui.stageStartButton.onclick();assert.equal(state,'playing');assert(ui.overlay.hidden);assert.equal(moveCount,0);
// Every stage, including a one-screen stage, blocks input until its title has lasted 1s.
reset(1);assert(cameraIntro);e=visibleEvent();mouse('mousedown',e);mouse('mouseup',e);assert.equal(bodyTap,null);assert.equal(drag,null);
advanceCameraIntro(100);advanceCameraIntro(1099);assert(cameraIntro);assert.equal(camera,HEIGHT-H);
const labels=[];ctx.fillText=(text,x,y)=>labels.push({text,x,y});
drawStageIntro();assert.deepEqual(labels.pop(),{text:'STAGE 1',x:W/2,y:H/2});
advanceCameraIntro(1100);assert.equal(cameraIntro,null);drawStageIntro();assert.equal(labels.length,0);
assert(ui.next.hidden);
showLevelMap();e=visibleEvent();mouse('mousedown',e);mouse('mouseup',e);assert.equal(bodyTap,null);assert.equal(state,'map');
// Edge gestures scroll from their initial camera and never become player gestures.
fixture();HEIGHT=H*3;camera=100;
const edgeSnapshot=JSON.stringify({body,grips,stamina,moveCount,undoSnapshot});
let edge=finger(50,eventAt({x:STAGE_SAFE_WIDTH/2,y:camera+300}));
touch('touchstart',[edge]);assert(pan?.edge && !bodyTap && !drag);assert.equal(pan.side,'left');assert(!pan.scrolling);
let edgeMoved={...edge,clientX:eventAt({x:200,y:camera+300}).clientX,clientY:edge.clientY-75};
touch('touchmove',[edgeMoved]);assert.equal(camera,200);assert(pan.scrolling);assert.equal(pan.side,'left');
touch('touchend',[],[edgeMoved]);assert(!pan && touchId===null && !ignoreTouches);
assert.equal(JSON.stringify({body,grips,stamina,moveCount,undoSnapshot}),edgeSnapshot);
// Mouse starts on the right edge, crosses the center and remains a scroll.
edge=eventAt({x:W-STAGE_SAFE_WIDTH/2,y:camera+300});mouse('mousedown',edge);assert(pan?.edge && pan.mouse);assert.equal(pan.side,'right');assert(!pan.scrolling);
mouse('mousemove',{...edge,clientX:edge.clientX-100,clientY:edge.clientY+75});assert.equal(camera,100);
mouse('mouseup',{...edge,clientX:edge.clientX-100,clientY:edge.clientY+75});assert(!pan && !drag && !bodyTap);
assert.equal(JSON.stringify({body,grips,stamina,moveCount,undoSnapshot}),edgeSnapshot);
// Clamping and cancellation release the edge gesture without changing the player.
edge=finger(51,eventAt({x:STAGE_SAFE_WIDTH-1,y:camera+300}));touch('touchstart',[edge]);touch('touchmove',[{...edge,clientY:edge.clientY-10000}]);assert.equal(camera,HEIGHT-H);
touch('touchcancel',[],[]);assert(!pan && !ignoreTouches);
edge=eventAt({x:W-STAGE_SAFE_WIDTH+1,y:camera+300});mouse('mousedown',edge);mouse('mousemove',{...edge,clientY:edge.clientY+10000});assert.equal(camera,cameraTop());window.events.blur();assert(!pan);
// A second finger switches safely to two-finger scrolling, never to a character drag.
edge=finger(52,eventAt({x:STAGE_SAFE_WIDTH/2,y:camera+300}));const second=finger(53,{...edge,clientX:edge.clientX+100});
touch('touchstart',[edge]);touch('touchstart',[edge,second],[second]);assert(pan && !pan.edge && ignoreTouches);
touch('touchend',[edge],[second]);touch('touchend',[],[edge]);assert(!pan && !ignoreTouches && !drag && !bodyTap);
assert.equal(JSON.stringify({body,grips,stamina,moveCount,undoSnapshot}),edgeSnapshot);
if(nativeTest) {
 showTitleScreen();startCourse('existing');refreshLives();assert(state==='map' && ui.hud.hidden);
 assert(ui.lifeStatus.classList.values['map-lives']);
 hideStageStart();reset(1);assert(!ui.hud.hidden);refreshLives();assert(!ui.lifeStatus.classList.values['map-lives']);
 returnFromStage();refreshLives();assert(state==='map' && ui.hud.hidden);assert(ui.lifeStatus.classList.values['map-lives']);
 hideStageStart();reset(1);reset(1);refreshLives();assert(!ui.hud.hidden && !ui.lifeStatus.classList.values['map-lives']);
 const rules=JSON.stringify({W,H,HEIGHT,holds,route,stamina,moveCount,body,camera});
 globalThis.ASCENT_STAGE_VIEWPORT={padding:50};
 canvas.getBoundingClientRect=()=>({left:15,top:47,width:390,height:780});
 for(const p of [{x:0,y:camera-50},{x:200,y:camera+200},{x:400,y:camera+750}]) {
  const out=point({clientX:15+p.x*.975,clientY:47+(p.y-camera+50)*.975});
  assert(Math.abs(out.x-p.x)<1e-9 && Math.abs(out.y-p.y)<1e-9);
 }
 assert.equal(JSON.stringify({W,H,HEIGHT,holds,route,stamina,moveCount,body,camera}),rules);
 showTitleScreen();assert(ui.hud.hidden);delete globalThis.ASCENT_STAGE_VIEWPORT;
 // iOS read-only preparation may not claim, erase or flush an old queue.
 onlineScores.owner='old-guest';onlineScores.pending.set('v1_existing_3',{moves:2,timeMs:40});persistPendingScores();
 const queued=JSON.stringify([...onlineScores.pending]),owner=onlineScores.owner;
 let nativeWrites=0;online.ready=true;online.uid='new-guest';online.adapter={sync(){nativeWrites++;},saveScore(){nativeWrites++;}};
 connectOnlineScores(online.uid);void flushOnlineScores();void flushOnlineProfile();
 assert.equal(onlineScores.owner,owner);assert.equal(JSON.stringify([...onlineScores.pending]),queued);assert.equal(nativeWrites,0);
 const localSave=globalThis.localStorage?.getItem(RECORDS_KEY);clearLocalGameData();assert.equal(globalThis.localStorage?.getItem(RECORDS_KEY),localSave);
 assert.throws(()=>commitTransferFile({}),/transfer-disabled/);
 // The post-enable hook receives the current run, before historical-best and
 // old-queue comparisons can discard it. No production score is fabricated.
 online.ready=false;hideStageStart();reset(1);dailyRun=null;debugAttempt=false;
 stageRecords.existing[1]={moves:4,timeMs:500,version:'v1',stars:3};
 globalThis.ASCENT_IOS_BUILD=Object.freeze({configuration:'Release',debugAllowed:false,buildNumber:'8'});
 moveCount=15;runElapsedMs=8000;let fresh,editFlag;
 globalThis.ASCENT_NATIVE_SYNC={recordClear:(n,mode,score)=>fresh={n,mode,...score},queueProfile(){},profileEdited:(p,changed)=>editFlag=changed};
 const historical=JSON.stringify([...onlineScores.pending]);recordStageClear();
 assert.equal(fresh.appVersion,RELEASE_VERSION);assert.equal(fresh.scoreSpecVersion,COURSE_VERSION);assert.equal(fresh.platform,'iOS');assert.equal(fresh.buildNumber,'8');assert.equal(fresh.moves,15);assert.equal(fresh.timeMs,8000);assert.equal(stageRecords.existing[1].moves,4);assert.equal(JSON.stringify([...onlineScores.pending]),historical);
 showTitleScreen();startCourse('existing');showCharacterEditor();ui.playerName.value=playerName;confirmCharacterEditor();assert.equal(editFlag,false);
 showCharacterEditor();ui.playerName.value='新しい公開名';confirmCharacterEditor();assert.equal(editFlag,true);
 delete globalThis.ASCENT_NATIVE_SYNC;delete globalThis.ASCENT_IOS_BUILD;
 console.log('PASS native navigation and uniform expanded viewport input; game geometry/camera/rules preserved');
}
console.log('PASS map settings debug controls, settings modal cancellation/navigation/input guards and timer; body-tap Undo: visible pose, jitter, mouse/touch, single use, drag/return, long press, cancel, blur, two fingers, result modal input guards; centered STAGE label and 1s input lock');
`)(assert,html,nativeTest);
