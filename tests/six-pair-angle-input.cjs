'use strict';
require('./coupled-production-harness.cjs')(`
 fixture();SixPairSelection.clear();SixPairAngleOverlay.reset();
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
console.log('PASS six-pair angle input: tap/toggle, drag/cancel, long press, blur, two-finger pan, body Undo and edge pan coexist');
