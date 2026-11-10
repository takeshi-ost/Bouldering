'use strict';
require('./coupled-production-harness.cjs')(`
 fixture();setDebugMode(true);SixPairSelection.clear();SixPairAngleOverlay.reset();
 const e=eventAtScreen(100,200),initial={...body},initialIds=ids(grips),initialEnergy=stamina;
 beginPointer(e);assert(SixPairAngleOverlay.pending);assert.equal(drag,null);endPointer(e);
 assert(SixPairAngleOverlay.visible);assert.equal(moveCount,0);assert.equal(stamina,initialEnergy);nearly(body,initial);assert.deepEqual(ids(grips),initialIds);
 const display=SixPairAngleOverlay.snapshot,arcs=[],oldArc=ctx.arc;
 assert.equal(display.sectors.length,6,'overlay receives exact input sectors');
 try {ctx.arc=(...args)=>arcs.push(args);SixPairAngleOverlay.draw();} finally {ctx.arc=oldArc;}
 assert.equal(arcs.length,12,'one outer and one inner arc per pair, no fragmented runs');
 for(let i=0;i<6;i++){
  const sector=display.sectors[i];assert.equal(arcs[i*2][3],sector.start);assert.equal(arcs[i*2][4],sector.start+sector.width);
  assert.deepEqual(selectAnchor(Math.cos(sector.start+sector.width/2),Math.sin(sector.start+sector.width/2)),sector.pair);
 }
 beginPointer(e);endPointer(e);assert(!SixPairAngleOverlay.visible,'second wall tap hides');
 beginPointer(e);endPointer(e);assert(SixPairAngleOverlay.visible);
 beginPointer(e);movePointer(movedEvent(e,{dx:30,dy:-30}));assert(drag);assert(!SixPairAngleOverlay.visible);endPointer(null,true);
 nearly(body,initial);assert.deepEqual(ids(grips),initialIds);assert.equal(moveCount,0);
 beginPointer(e);clock+=INPUT_CONFIG.tapMaxDuration+1;endPointer(e);assert(!SixPairAngleOverlay.visible,'long hold does not toggle');
 beginPointer(e);window.events.blur();assert(!SixPairAngleOverlay.pending);assert(!SixPairAngleOverlay.visible);assert.equal(touchId,null);
 beginPointer(e);beginTouchPan([{identifier:1,clientY:200},{identifier:2,clientY:220}]);assert(pan);assert(ignoreTouches);assert(!SixPairAngleOverlay.pending);assert(!SixPairAngleOverlay.visible);endPan();ignoreTouches=false;
 let undoCalls=0;const oldUndo=undoMove;undoMove=()=>undoCalls++;
 const bodyEvent=eventAtScreen(body.x,body.y-camera);
 beginPointer(bodyEvent);assert(bodyTap);assert(!SixPairAngleOverlay.pending);endPointer(bodyEvent);assert.equal(undoCalls,1);undoMove=oldUndo;
 const edgeEvent=eventAtScreen(2,200);beginPointer(edgeEvent);assert(pan?.edge);assert(!SixPairAngleOverlay.pending);endPan();
 assert.equal(moveCount,0);assert.equal(stamina,initialEnergy);
`);
require('./coupled-production-harness.cjs')(`
 const mouse=(name,e)=>(name==='mousedown'?canvas.events:window.events)[name](e);
 const touch=(name,touches,changedTouches=touches)=>canvas.events[name]({touches,changedTouches,preventDefault(){}});
 const wall=()=>eventAtScreen(100,200);
 const gameplay=()=>JSON.stringify({body,grips:ids(grips),stamina,moveCount,hearts,
     lives,heartItems,undoSnapshot,rankingAssistanceUsed});
 for(let cycle=0;cycle<3;cycle++){
  fixture();setDebugMode(false);SixPairSelection.clear();
  const e=wall(),before=gameplay();
  mouse('mousedown',e);
  assert(drag,'Normal wall press starts the ordinary swipe');
  assert.equal(SixPairAngleOverlay.pending,null);
  mouse('mouseup',e);
  assert.equal(gameplay(),before,'Normal wall tap must not move or spend resources');
  assert(!SixPairAngleOverlay.visible);
  // Calling the overlay directly must not bypass the normal-mode guard.
  SixPairAngleOverlay.begin(e);SixPairAngleOverlay.toggle();SixPairAngleOverlay.draw();
  assert.equal(SixPairAngleOverlay.pending,null);assert.equal(SixPairAngleOverlay.snapshot,null);
  mouse('mousedown',e);mouse('mousemove',movedEvent(e,{dx:30,dy:-30}));
  assert(drag?.fingerAction.points.length,'Normal wall swipe still records movement');
  window.events.blur();assert.equal(gameplay(),before);

  const finger={...wall(),identifier:7};
  touch('touchstart',[finger]);assert.equal(touchId,7);assert(drag);
  touch('touchend',[],[finger]);assert.equal(touchId,null);
  assert.equal(gameplay(),before);assert(!SixPairAngleOverlay.visible);
  touch('touchstart',[finger]);
  touch('touchstart',[finger,{...finger,identifier:8,clientY:finger.clientY+20}]);
  assert(pan && ignoreTouches);assert(!drag);assert(!SixPairAngleOverlay.pending);
  touch('touchend',[],[finger]);assert(!pan && !ignoreTouches);
  const edge=eventAtScreen(2,200);mouse('mousedown',edge);assert(pan?.edge);mouse('mouseup',edge);
  let undos=0;const savedUndo=undoMove;undoMove=()=>undos++;
  const torso=eventAtScreen(body.x,body.y-camera);
  mouse('mousedown',torso);assert(bodyTap);mouse('mouseup',torso);
  assert.equal(undos,1);undoMove=savedUndo;

  setDebugMode(true);
  const debugBefore=gameplay(),debugCamera=camera,debugTimer=runStartedAt;
  touch('touchstart',[finger]);assert(SixPairAngleOverlay.pending);assert.equal(drag,null);
  touch('touchend',[],[finger]);assert(SixPairAngleOverlay.visible);
  assert.equal(gameplay(),debugBefore);assert.equal(camera,debugCamera);assert.equal(runStartedAt,debugTimer);
  mouse('mousedown',wall());assert(SixPairAngleOverlay.pending);
  setDebugMode(false);
  assert.equal(SixPairAngleOverlay.pending,null);assert.equal(SixPairAngleOverlay.snapshot,null);
  setDebugMode(true);mouse('mouseup',wall());
  assert(!SixPairAngleOverlay.visible,'Re-enabling must not revive an old pending tap');
  mouse('mousedown',wall());mouse('mouseup',wall());assert(SixPairAngleOverlay.visible);
  // Defensive draw guard handles even a direct state change outside the setter.
  debugMode=false;let paintCalls=0;const savedArc=ctx.arc;ctx.arc=()=>paintCalls++;
  SixPairAngleOverlay.draw();ctx.arc=savedArc;
  assert.equal(paintCalls,0);assert.equal(SixPairAngleOverlay.snapshot,null);
  setDebugMode(true);assert(!SixPairAngleOverlay.visible);
  mouse('mousedown',wall());touch('touchcancel',[],[]);
  assert(!SixPairAngleOverlay.pending && !SixPairAngleOverlay.visible);
 }
`);
// Release native policy must preserve its immutable, disabled debugMode.
// Exercise the real overlay and mode setter without replacing their guards.
{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const root=path.resolve(__dirname,'..'),input=fs.readFileSync(path.join(root,'js/input.js'),'utf8');
 const setter=input.slice(input.indexOf('function setDebugMode(enabled) {'),input.indexOf('ui.mapDebugMode.onchange='));
 const context={assert:require('node:assert/strict')};
 vm.runInNewContext(`
  const DEBUG_FEATURES_ALLOWED=false;const debugMode=false;
  const ui={mapDebugMode:{checked:true}};function syncDebugCourseControls(){}
  // Any drawing, timing, or game-state access would throw: policy must fail closed first.
  `+fs.readFileSync(path.join(root,'js/six-pair-angle-overlay.js'),'utf8')+setter+`
  for(let i=0;i<3;i++){
   SixPairAngleOverlay.begin({clientX:1,clientY:1});
   SixPairAngleOverlay.toggle();SixPairAngleOverlay.move({});SixPairAngleOverlay.end(false);SixPairAngleOverlay.draw();
   assert.equal(SixPairAngleOverlay.enabled,false);assert.equal(SixPairAngleOverlay.pending,null);
   assert.equal(SixPairAngleOverlay.visible,false);assert.equal(SixPairAngleOverlay.snapshot,null);
   setDebugMode(true);assert.equal(debugMode,false);assert.equal(ui.mapDebugMode.checked,false);
  }
 `,context);
}
console.log('PASS six-pair angle input: normal/debug/release policy gates, repeated mode changes, mouse/touch wall taps without gameplay cost, swipes, cancel/blur, two-finger/edge pan and body Undo');
