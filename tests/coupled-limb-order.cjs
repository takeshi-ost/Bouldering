'use strict';
// Current Web/native physics; independent assignment oracle and real gesture replay.
const assert=require('node:assert/strict'),run=require('./coupled-production-harness.cjs');
const result=run(String.raw`
function oracle(p,pair,aim=null,ordered=true){
 if(!isSupportPair(pair)||!pair.every(i=>startGrips[i]&&limbReachable(p,startGrips[i],i)))return null;
 const moving=[0,1,2,3].filter(i=>!pair.includes(i)),fixed=Array(4).fill(null);pair.forEach(i=>fixed[i]=startGrips[i]);
 const lists=moving.map(i=>{
  const target=aim?{x:aim.originGrips[i].x+aim.dx*aim.gain,y:aim.originGrips[i].y+aim.dy*aim.gain}:{x:p.x+limbs[i].x,y:p.y+limbs[i].y};
  return holds.filter(h=>limbReachable(p,h,i)&&pair.every(j=>h!==fixed[j]||canShareHold(h,i,j)))
   .map(h=>({h,cost:Math.hypot(h.x-target.x,h.y-target.y)**2-(h.type==='goal'?4*R*R:0)})).sort((a,b)=>a.cost-b.cost||a.h.id-b.h.id).concat({h:null,cost:0});
 });
 let best=null,rank=null;
 for(const a of lists[0])for(const b of lists[1]){
  const stance=[...fixed];stance[moving[0]]=a.h;stance[moving[1]]=b.h;
  if(stance.some((h,i)=>h&&stance.some((k,j)=>i!==j&&h===k&&!canShareHold(h,i,j))))continue;
  if(ordered&&(moving[0]<2)===(moving[1]<2)&&a.h&&b.h&&a.h.x>b.h.x)continue;
  if(stance.slice(2).some(f=>f&&stance.slice(0,2).some(h=>h&&f.y<h.y)))continue;
  const r=[Number(stance.every(Boolean)&&bothHandsOnGoal(stance)),Number(!!a.h)+Number(!!b.h),-(a.cost+b.cost)];
  if(!rank||r[0]>rank[0]||(r[0]===rank[0]&&(r[1]>rank[1]||(r[1]===rank[1]&&r[2]>rank[2])))){rank=r;best=stance;}
 }
 return best;
}
function order(stance,anchor){const m=[0,1,2,3].filter(i=>!anchor.includes(i));if((m[0]<2)===(m[1]<2)&&stance[m[0]]&&stance[m[1]])assert(stance[m[0]].x<=stance[m[1]].x);}
let direct=0,matrix=0,changed=0,mixed=0,liveChecks=0;
for(const moving of [[0,1],[2,3]]){
 const hands=[{id:1,x:140,y:232,type:'normal'},{id:2,x:260,y:232,type:'normal'}],feet=[{id:3,x:160,y:378,type:'normal'},{id:4,x:240,y:378,type:'normal'}];
 const all=[...hands,...feet],fixed=[0,1,2,3].filter(i=>!moving.includes(i)),y=moving[0]===0?220:380;
 fixture({origin:{x:200,y:300},HEIGHT:1400,gripIds:[1,2,3,4],holds:all});
 const left={id:5,x:180,y,type:'normal'},right={id:6,x:220,y,type:'normal'};
 holds=[...fixed.map(i=>startGrips[i]),left,right];
 const originGrips=[...startGrips];originGrips[moving[0]]=right;originGrips[moving[1]]=left;
 const aim={model:'finger-origin-v1',dx:0,dy:0,gain:1,originGrips};
 const old=oracle(body,fixed,aim,false);assert(old[moving[0]].x>old[moving[1]].x,'fixture must expose the old crossed optimum');
 for(const anchor of [fixed,[...fixed].reverse()]){
  const stance=attachMoving(body,anchor,aim);assert.equal(stance[moving[0]],left);assert.equal(stance[moving[1]],right);direct++;
  assert.deepEqual(ids(stance),ids(oracle(body,anchor,aim)));
 }
 // An already crossed starting pose must be able to uncross (absolute rule).
 startGrips[moving[0]]=right;startGrips[moving[1]]=left;
 assert.equal(attachMoving(body,fixed,aim)[moving[0]],left);direct++;
 for(const type of ['wide','goal']){
  if(type==='goal'&&moving[0]===2)continue;
  const shared={id:7,x:200,y,type:type==='goal'?'goal':'normal',wide:type==='wide'};
  holds=[...fixed.map(i=>startGrips[i]),shared];const stance=attachMoving(body,fixed);
  assert.equal(stance[moving[0]],shared);assert.equal(stance[moving[1]],shared);direct++;
 }
 const a={id:8,x:200,y,type:'normal'},b={id:9,x:200,y:y+1,type:'normal'};holds=[...fixed.map(i=>startGrips[i]),a,b];
 const equal=attachMoving(body,fixed);assert(equal.every(Boolean));assert.notEqual(equal[moving[0]],equal[moving[1]]);direct++;
 holds=[...fixed.map(i=>startGrips[i]),a];const one=attachMoving(body,fixed);assert.equal(moving.filter(i=>one[i]).length,1);direct++;
 holds=[...fixed.map(i=>startGrips[i])];const partial=attachMoving(body,fixed);assert.equal(partial[moving[0]],null);assert.equal(partial[moving[1]],null);direct++;
}
fixture();
for(const pair of pairs)for(const ox of [-15,0,15])for(const oy of [-15,0,15])for(const [dx,dy] of [[0,0],[0,-40],[0,-120],[90,-30],[-90,30],[80,80],[-120,0],[120,0]]){
 const p={x:body.x+ox,y:body.y+oy},aim={model:'finger-origin-v1',dx,dy,gain:1,originGrips:dx===120?[grips[1],grips[0],grips[3],grips[2]]:grips};
 const expected=ids(oracle(p,pair,aim)),old=ids(oracle(p,pair,aim,false)),actual=attachMoving(p,pair,aim);
 assert.deepEqual(ids(actual),expected);assert.deepEqual(ids(withFingerAimDisabled(()=>attachMoving(p,pair,aim))),expected);matrix++;
 assert.deepEqual(ids(attachMoving(p,[...pair].reverse(),aim)),expected);
 if(JSON.stringify(expected)!==JSON.stringify(old))changed++;
 if(pair[0]<2&&pair[1]>=2){assert.deepEqual(expected,old);mixed++;}
 assert.deepEqual(ids(attachMoving(p,pair)),ids(oracle(p,pair)));
}
assert(changed>0);assert.equal(matrix,432);assert.equal(mixed,288);
// Crossed fixed hands or feet remain untouched by the new rule.
for(const fixed of [[0,1],[2,3]]){fixture();[startGrips[fixed[0]],startGrips[fixed[1]]]=[startGrips[fixed[1]],startGrips[fixed[0]]];const stance=attachMoving(body,fixed);assert(stance);fixed.forEach(i=>assert.equal(stance[i],startGrips[i]));}
// Actual automatic selection, canonical traces, event density, undo, and preview.
for(const [dx,dy] of [[0,-150],[70,-100],[-80,-50],[160,0],[-160,0],[30,90],[0,150],[-100,100]]){
 const f=fixture(),a=fingerAction([{dx,dy}]),cold=fingerGestureReplay(f.p,f.stance,a);assert(cold);order(cold.stance,cold.anchor);
 for(const n of [1,10,60]){
  fixture();const e=eventAtScreen(123,330);down(e);assert(drag);
  for(const point of fingerResampledAction(a,n).points){move(movedEvent(e,point));if(drag.anchor)order(grips,drag.anchor);}
  const beforeRelease=ids(grips);release();assert.equal(lastFingerGesture.accepted,cold.valid);assert.deepEqual(beforeRelease,ids(cold.stance));assert.deepEqual(lastFingerGesture.anchor,cold.anchor);nearly(lastFingerGesture.p,cold.p);assert.equal(lastFingerGesture.trace.length,cold.trace.length);lastFingerGesture.trace.forEach((p,i)=>nearly(p,cold.trace[i]));
  if(cold.valid){assert.equal(moveCount,1);assert(undoMove());assert.deepEqual(ids(grips),ids(f.stance));nearly(body,f.p);assert.equal(moveCount,0);assert.equal(stamina,100);}
  liveChecks++;
 }
}
return {direct,matrix,changed,mixed,liveChecks};
`);
assert.equal(result.matrix,432);assert.equal(result.liveChecks,24);
console.log('PASS moving limb order '+JSON.stringify(result)+' '+(process.env.ASCENT_NATIVE_TEST==='1'?'native':'web'));
