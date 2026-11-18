'use strict';
require('./coupled-production-harness.cjs')(`
 const mouse=(name,e)=>(name==='mousedown'?canvas.events:window.events)[name](e);
 const touch=(name,touches,changedTouches=touches)=>canvas.events[name]({touches,changedTouches,preventDefault(){}});
 const gameplay=()=>JSON.stringify({body,grips:ids(grips),stamina,moveCount,hearts,lives,heartItems,undoSnapshot,rankingAssistanceUsed});
 for(const daily of [false,true])for(const rect of [{left:0,top:0,width:400,height:700},{left:17,top:40,width:320,height:720}]){
  fixture();testRect=rect;setDebugMode(false);SixPairSelection.clear();dailyRun=daily?{date:'2026-11-18'}:null;
  const e=eventAtScreen(100,200),before=gameplay();
  mouse('mousedown',e);assert(drag,'Original normal down lifecycle is preserved');
  assert(TouchPairPreview.visible);assert.equal(SixPairAngleOverlay.pending,null);
  const shown=TouchPairPreview.snapshot,center=point(e),arcs=[],gradients=[],texts=[];
  const saved={arc:ctx.arc,createRadialGradient:ctx.createRadialGradient,fillText:ctx.fillText};
  try {
   ctx.arc=(...args)=>arcs.push(args);
   ctx.createRadialGradient=(...args)=>{const item={args,stops:[]};gradients.push(item);return {addColorStop:(...stop)=>item.stops.push(stop)}};
   ctx.fillText=(...args)=>texts.push(args);TouchPairPreview.draw();
  }finally{Object.assign(ctx,saved);}
  assert.equal(arcs.length,12);assert.equal(gradients.length,6);assert.equal(texts.length,6,'No diagnostic legend in normal play');
  shown.sectors.forEach((sector,i)=>{
   assert.deepEqual(arcs[i*2].slice(0,2),[center.x,center.y]);
   assert.equal(arcs[i*2][3],sector.start);assert.equal(arcs[i*2][4],sector.start+sector.width);
   assert.deepEqual(gradients[i].args,[center.x,center.y,52,center.x,center.y,96]);
   assert.equal(gradients[i].stops[0][0],0);assert.equal(gradients[i].stops[0][1].length,7);
   assert.equal(gradients[i].stops[1][0],1);assert(gradients[i].stops[1][1].endsWith('00'));
   assert.deepEqual(selectAnchor(Math.cos(sector.start+sector.width/2),Math.sin(sector.start+sector.width/2)),sector.pair);
  });
  mouse('mousemove',movedEvent(e,{dx:INPUT_CONFIG.dragThreshold-1,dy:0}));assert(TouchPairPreview.visible);
  clock+=INPUT_CONFIG.tapMaxDuration+100;assert(TouchPairPreview.visible,'Long hold remains visible until swipe/release');
  mouse('mouseup',e);assert(!TouchPairPreview.visible);assert.equal(gameplay(),before);
  mouse('mousedown',e);mouse('mousemove',movedEvent(e,{dx:30,dy:-30}));assert(!TouchPairPreview.visible);assert(drag?.fingerAction.points.length);
  window.events.blur();assert.equal(gameplay(),before);assert(!TouchPairPreview.visible);
  let undos=0;const oldUndo=undoMove;undoMove=()=>undos++;
  const torso=eventAtScreen(body.x,body.y-camera);mouse('mousedown',torso);assert(bodyTap&&TouchPairPreview.visible);mouse('mouseup',torso);
  assert.equal(undos,1);undoMove=oldUndo;assert(!TouchPairPreview.visible);
  const finger={...e,identifier:7};touch('touchstart',[finger]);assert(TouchPairPreview.visible);assert.equal(touchId,7);
  touch('touchcancel',[],[finger]);assert(!TouchPairPreview.visible);assert.equal(touchId,null);assert.equal(gameplay(),before);
  touch('touchstart',[finger]);touch('touchstart',[finger,{...finger,identifier:8,clientY:finger.clientY+20}]);
  assert(pan&&ignoreTouches);assert(!TouchPairPreview.visible);touch('touchend',[],[finger]);
  mouse('mousedown',eventAtScreen(2,200));assert(pan?.edge);assert(!TouchPairPreview.visible);mouse('mouseup',eventAtScreen(2,200));
  for(const block of ['settings','help','result','intro']){
   mouse('mousedown',e);assert(TouchPairPreview.visible);
   if(block==='settings')settingsOpen=true;if(block==='help')featureHelpOpen=true;if(block==='result')ui.overlay.hidden=false;if(block==='intro')cameraIntro={};
   TouchPairPreview.draw();assert(!TouchPairPreview.visible);endPointer(null,true);
   settingsOpen=featureHelpOpen=false;ui.overlay.hidden=true;cameraIntro=null;
  }
  mouse('mousedown',e);document.visibilityState='hidden';TouchPairPreview.draw();assert(!TouchPairPreview.visible);document.visibilityState='visible';endPointer(null,true);
  mouse('mousemove',e);assert(!TouchPairPreview.visible,'No hover activation');assert.equal(gameplay(),before);
 }
`);
console.log('PASS touch pair preview: normal/Daily, pointer-centered exact sectors, opaque inner / transparent outer ring, scaled viewport, hold/release/swipe, body Undo, pan, cancel/blur, modal guards, no gameplay cost');
