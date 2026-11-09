'use strict';
const run=require('./coupled-harness.cjs');
run(`
let total=0;
const record=(name,fn)=>{fn();total++;console.log('PASS coupled body: '+name);};
function validate(r,origin,stance) {
 assert(r);if(!r.active)return;
 assert(r.trace.length>=1);nearly(r.trace[0],origin);nearly(r.trace.at(-1),r.p);
 for(let k=0;k<r.trace.length;k++) {
  const p=r.trace[k];assert(p.x>=25-1e-7&&p.x<=375+1e-7&&p.y>=80-1e-7&&p.y<=HEIGHT-40+1e-7);
  for(const i of r.anchor)assert(limbReachable(p,stance[i],i));
  if(k){assert(distance(p,r.trace[k-1])<=1+1e-7);assert(supportMotionFraction(r.trace[k-1],p,r.anchor,stance)>=1-1e-9);
   for(let j=1;j<10;j++){const q={x:r.trace[k-1].x+(p.x-r.trace[k-1].x)*j/10,y:r.trace[k-1].y+(p.y-r.trace[k-1].y)*j/10};for(const i of r.anchor)assert(limbReachable(q,stance[i],i));}}
 }
 for(const i of r.anchor)assert.equal(r.stance[i],stance[i]);
 for(let i=0;i<4;i++)if(r.stance[i])assert(limbReachable(r.p,r.stance[i],i));
}
record('screenshot support stance slides right/up continuously and keeps hold 44 semantics',()=>{
 const f=fixture(reconstructed),r=coupledGestureReplay(f.p,f.stance,fingerAction([{dx:0,dy:-200}]),[0,3]);validate(r,f.p,f.stance);
 assert(r.p.x>f.p.x+20);assert(r.p.y<f.p.y);assert(r.valid);assert.equal(r.stance[1].id,42);
 const partial=coupledGestureReplay(f.p,f.stance,fingerAction([{dx:20,dy:-110}]),[0,2]);validate(partial,f.p,f.stance);
 assert(partial.stance.some(h=>!h));assert.equal(partial.valid,false);assert(partial.stance.some(h=>h?.id===42));
 // This explicitly fixes the screenshot support pair, not a claim that a fresh
 // upward input chooses it. The original six-pair selector stays unchanged.
});
record('straight sample counts 1/2/10/60/120 share body, contacts and full sweep',()=>{
 let cases=0;
 for(const fdata of [null,reconstructed])for(const [dx,dy] of [[0,-200],[300,-300],[-300,-150],[280,60],[-60,300],[0,0],[.7,-3.2],[20,-9]]){
  const f=fixture(fdata),a=fingerAction(sample(dx,dy)),one=fingerGestureReplay(f.p,f.stance,a);validate(one,f.p,f.stance);
  for(const n of [2,10,60,120]){
   const r=fingerGestureReplay(f.p,f.stance,fingerAction(sample(dx,dy,n)));validate(r,f.p,f.stance);nearly(r.p,one.p);assert.deepEqual(ids(r.stance),ids(one.stance));assert.deepEqual(r.anchor,one.anchor);assert.equal(r.valid,one.valid);assert.equal(r.trace.length,one.trace.length);r.trace.forEach((p,i)=>nearly(p,one.trace[i]));cases++;
  }
  assert(fingerRouteSampleStable(f.p,f.stance,a,one,{requireRelease:false})||!one.active);
 }
 assert.equal(cases,64);
});
record('actual live gestures, arbitrary origins/scale, cancellation and undo match replay',()=>{
 for(const points of [sample(80,-80),sample(250,-200,60),[{dx:30,dy:-50},{dx:-60,dy:-150},{dx:-20,dy:-70}],sample(-90,70,10)])for(const rect of [{left:0,top:0,width:400,height:700},{left:12,top:47,width:390,height:780}]){
  const f=fixture();testRect=rect;const r=fingerGestureReplay(f.p,f.stance,fingerAction(points)),out=live(points);validate(r,f.p,f.stance);nearly(out.p,r.p);assert.deepEqual(out.stance,ids(r.stance));assert.equal(out.after.moves,Number(r.valid));assert.equal(out.record.trace.length,r.trace.length);
  if(r.valid){assert(undoMove());nearly(body,f.p);assert.deepEqual(ids(grips),ids(f.stance));assert.equal(stamina,100);}
  fixture();const canceled=live(points,{cancel:true});nearly(body,f.p);assert.deepEqual(ids(grips),ids(f.stance));assert.equal(canceled.after.moves,0);
 }
 testRect={left:0,top:0,width:400,height:700};
});
record('turn/reversal prefixes and heart sweeps preserve canceled pickups without chord shortcuts',()=>{
 const f=fixture(),points=[{dx:60.3,dy:-70.7},{dx:100.9,dy:-110.2},{dx:20.1,dy:75.2},{dx:0,dy:0}],full=fingerGestureReplay(f.p,f.stance,fingerAction(points));validate(full,f.p,f.stance);
 let prior=[f.p];for(let n=1;n<=points.length;n++){const r=fingerGestureReplay(f.p,f.stance,fingerAction(points.slice(0,n)));assert(r.trace.length>=prior.length);prior.forEach((p,i)=>nearly(p,r.trace[i]));prior=r.trace;}
 const center=full.trace[Math.floor(full.trace.length*.4)];hearts=[{id:'test-heart',x:center.x,y:center.y,collected:false}];const expected=fingerRouteTraceMask(hearts,0,full.trace);assert.equal(expected,1);
 live(points,{cancel:true});assert(hearts[0].collected);assert.equal(stamina,100+HEART_CONFIG.recovery);nearly(body,f.p);assert.equal(moveCount,0);
});
record('native support selector, capture sharing/goal/hazard rules remain unchanged',()=>{
 const f=fixture();for(const [dx,dy] of [[0,-70],[30,-60],[-70,20],[60,70]]){const r=fingerGestureReplay(f.p,f.stance,fingerAction([{dx,dy}]));assert.deepEqual(r.anchor,selectAnchor(dx,dy));}
 // Same assignment routine, including simultaneous assignment and full-goal
 // priority, is used at the resulting feasible body position.
 let found=false;
 findHazard:for(const dy of [-120,-80,-40,0,40,80])for(const dx of [-120,-80,-40,0,40,80]){const a=fingerAction([{dx,dy}]),r=fingerGestureReplay(f.p,f.stance,a);if(!r.valid)continue;
  const changed=r.stance.find((h,i)=>h!==f.stance[i]);if(!changed)continue;changed.type='hazard';const h=fingerGestureReplay(f.p,f.stance,a);assert.equal(h.penalty,newHazardContacts(h.stance,f.stance).size*HAZARD_CONFIG.penalty);live(a.points);assert.equal(stamina,100-1-h.penalty);found=true;break findHazard;}assert(found);
});
record('slow curved input carries subpixel distance across turns',()=>{
 for(const n of [10,90,180]){
  const f=fixture(),points=Array.from({length:n},(_,i)=>{const t=(i+1)*Math.PI/(2*n);return {dx:40*Math.sin(t),dy:-40*(1-Math.cos(t))};});
  const r=coupledGestureReplay(f.p,f.stance,fingerAction(points),[0,3]);validate(r,f.p,f.stance);assert(r.travel>=62);assert(distance(r.p,f.p)>40);
  let prior=[f.p];for(let k=1;k<=points.length;k++){const prefix=coupledGestureReplay(f.p,f.stance,fingerAction(points.slice(0,k)),[0,3]);prior.forEach((p,i)=>nearly(p,prefix.trace[i]));prior=prefix.trace;}
 }
});
// Isolate motion cancellation from the direction-selector policy used by this recorded gesture.
record('return to pointer origin cancels hysteresis without cost or lost hearts',()=>SixPairSelection.withBaseline(()=>{
 const points=[{dx:122.4586983568,dy:295.6414504036},{dx:0,dy:0}],f=fixture(),r=fingerGestureReplay(f.p,f.stance,fingerAction(points));
 assert(distance(r.p,f.p)>80);assert(r.cancelAtOrigin);assert.equal(r.valid,false);
 for(const delta of [{dx:0,dy:0},{dx:3,dy:3}]){fixture();const out=live([points[0],delta]);assert(out.record.canceled);assert.equal(out.record.accepted,false);nearly(body,f.p);assert.equal(stamina,100);assert.equal(moveCount,0);}
 fixture();const center=r.trace[Math.floor(r.trace.length/3)];hearts=[{x:center.x,y:center.y,collected:false}];const out=live(points);assert(hearts[0].collected);assert.equal(stamina,100+HEART_CONFIG.recovery);assert.equal(moveCount,0);nearly(body,f.p);
 fixture();live([points[0],{dx:0,dy:0},{dx:60,dy:-50}]);assert.equal(lastFingerGesture.canceled,false,'Moving out of cancellation zone may resume the same gesture');
}));
record('point-limit overflow latches cancellation and records replay parity',()=>{
 const f=fixture(),points=Array.from({length:8192},(_,i)=>({dx:80,dy:-80+(i%2)*.01})),a=fingerAction(points),r=fingerGestureReplay(f.p,f.stance,a);assert(r.valid);
 const e=eventAtScreen(150,300);down(e);drag.fingerAction=a;drag.anchor=r.anchor;drag.fingerTrace=r.trace;drag.motionCache=r.motionCache;body=r.p;grips=r.stance;
 move(movedEvent(e,{dx:0,dy:0}));assert(drag.inputLimitExceeded);assert(drag.fingerAction.inputLimitExceeded);assert.equal(drag.fingerAction.points.length,8192);
 move(movedEvent(e,{dx:120,dy:-150}));assert(drag.inputLimitExceeded);release();assert(lastFingerGesture.canceled);assert.equal(lastFingerGesture.accepted,false);assert.equal(stamina,100);assert.equal(moveCount,0);nearly(body,f.p);
 const replay=fingerGestureReplay(f.p,f.stance,lastFingerGesture.action);assert.equal(replay.valid,false);assert(replay.inputLimitExceeded);assert.equal(replay.trace.length,lastFingerGesture.trace.length);replay.trace.forEach((p,i)=>nearly(p,lastFingerGesture.trace[i]));
});
record('bounds stop body integration but preserve target update; malformed actions fail closed',()=>{
 const f=fixture(),a=fingerAction([{dx:0,dy:-3000}]),r=fingerGestureReplay(f.p,f.stance,a);assert(r.limited);assert.equal(r.travel,2048);validate(r,f.p,f.stance);
 assert.equal(fingerGestureReplay(f.p,f.stance,{...a,bodyMotion:'unknown'}),null);
 assert.equal(fingerGestureReplay(f.p,f.stance,{...a,points:Array(8193).fill({dx:20,dy:0})}),null);
 assert.equal(fingerGestureReplay(f.p,f.stance,{...a,points:[{dx:NaN,dy:0}]}),null);
});
console.log('PASS all '+total+' coupled-body groups');
`);
