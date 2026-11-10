'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/six-pair-selection.js'),'utf8'),tasks=[];
const context=vm.createContext({Math,assert,setTimeout:fn=>tasks.push(fn)});
vm.runInContext(`
let HEIGHT=1000,holds=[],route=[{x:0,y:100},{x:0,y:0}],committed={x:0,y:50},startGrips=[{},{},{},{}],calls=0;
function selectAnchorBaseline(x,y){calls++;return x<0?[0,1]:[2,3];}
function supportPairReach(){return 1;}function goalSupportDistance(){return Infinity;}
`+source,context);
const run=code=>vm.runInContext(code,context);
const drain=()=>{let count=0;while(tasks.length){tasks.shift()();assert(++count<100,'bounded asynchronous preparation');}};
run('SixPairSelection.prepare();');assert.equal(tasks.length,1);tasks.shift()();
run('assert.equal(calls,120);assert.equal(committed.y,50);');
run('SixPairSelection.prepare();');assert.equal(tasks.length,1,'do not schedule duplicate work');
run('const first=SixPairSelection.plan();assert.equal(calls,3600);assert.equal(first.sectors.length,6);');
drain();run('assert.equal(calls,3600);');
run(`for(let i=0;i<10000;i++)SixPairSelection.select(Math.cos(i),Math.sin(i));
assert.equal(calls,3600,'cached input must not rescan');assert.equal(SixPairSelection.plan(),first);
const view=SixPairSelection.directionSamples();assert.equal(view.sectors.length,6);
assert.equal(view.indices.length,3600);assert.equal(calls,3600);
for(let i=0;i<view.indices.length;i++){
 const a=view.start+i*Math.PI*2/view.indices.length,pair=SixPairSelection.select(Math.cos(a),Math.sin(a));
 const expected=SixPairSelection.pairs[view.indices[i]].join(',');
 if(pair.join(',')!==expected){
  // cos/sin/atan2 can round an exact endpoint to its adjacent sector.
  const boundary=view.sectors.findIndex(s=>Math.abs(Math.atan2(Math.sin(a-s.start),Math.cos(a-s.start)))<1e-12);
  assert(boundary>=0,'input and overlay agree away from exact endpoints');
  const adjacent=[view.sectors[boundary],view.sectors[(boundary+5)%6]].map(s=>s.pair.join(','));
  assert(adjacent.includes(pair.join(','))&&adjacent.includes(expected));
 }
}
SixPairSelection.enabled=false;const oldView=SixPairSelection.directionSamples();
assert.equal(oldView.sectors,null);assert.equal(oldView.indices.join(','),first.samples.join(','));SixPairSelection.enabled=true;
SixPairSelection.select(0,0);assert.equal(calls,3601,'zero input retains baseline');
committed={x:1,y:50};SixPairSelection.prepare();`);
drain();run('assert.equal(calls,7201);assert.equal(SixPairSelection.plan().x,1);');
run('committed={x:2,y:50};SixPairSelection.prepare();');tasks.shift()();
run('SixPairSelection.clear();');drain();run('assert.equal(calls,7321);');
run('SixPairSelection.plan();assert.equal(calls,10921);');
run(`for(const change of [()=>{HEIGHT++;},()=>{holds=[...holds];},()=>{route=[...route];},()=>{startGrips=[{},...startGrips.slice(1)];}]){
 const before=calls;change();SixPairSelection.plan();assert.equal(calls-before,3600,'invalidate changed posture/course');
}
assert.throws(()=>SixPairSelection.withBaseline(()=>{
 assert(SixPairSelection.useBaseline);SixPairSelection.withCurrent(()=>assert(!SixPairSelection.useBaseline));
 assert(SixPairSelection.useBaseline);throw Error('scope');}),/scope/);assert(!SixPairSelection.useBaseline);
`);
console.log('PASS six-pair cache: chunking, synchronous takeover, repeated input, cancellation, posture invalidation, overlay/input parity, baseline restoration');
