'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),run=require('./coupled-production-harness.cjs');
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/coupled-anchor-ties.json'),'utf8'));
const result=run(`
const fixtures=${JSON.stringify(fixtures)},results=[];
const originalSelect=selectAnchor;
for(const fixed of [true]) {
 // Exercise production comparator without modifying game functions.
 let count=0,failures=[];
 for(const f of fixtures)for(const samples of [1,2,3,7,10,17,100])for(const width of [320,375,400,768])for(const origin of [{x:123,y:330},{x:0,y:0},{x:397,y:699}]) {
  fixture({origin:{x:f.from.x,y:f.from.y},HEIGHT:f.HEIGHT,gripIds:f.stance,holds:f.holds});testRect={left:13.21,top:6.43,width,height:width*1.75};
  const cold=fingerGestureReplay(body,grips,f.action),e=eventAtScreen(origin.x,origin.y);down(e);if(!drag){failures.push({n:f.n,samples,width,origin,reason:'no drag'});continue;}for(const p of fingerResampledAction(f.action,samples).points)move(movedEvent(e,p));release();count++;
  const actual=lastFingerGesture;
  if(JSON.stringify(actual.anchor)!==JSON.stringify(cold.anchor)||JSON.stringify(actual.grips)!==JSON.stringify(ids(cold.stance))||actual.accepted!==cold.valid||distance(actual.p,cold.p)>1e-7||actual.trace.length!==cold.trace.length||actual.trace.some((p,i)=>distance(p,cold.trace[i])>1e-7))failures.push({n:f.n,samples,width,origin,expected:{anchor:cold.anchor,valid:cold.valid,grips:ids(cold.stance),p:cold.p,trace:cold.trace.length},actual:{anchor:actual.anchor,valid:actual.accepted,grips:actual.grips,p:actual.p,trace:actual.trace.length}});
 }
 results.push({fixed,count,failed:failures.length,failures});
}
return results;
`);for(const row of result){assert.equal(row.count,252);assert.equal(row.failed,0,JSON.stringify(row.failures));}
console.log('PASS coupled anchor tie: 252 real-input/replay cases, 7 sample counts, 4 widths, 3 origins');
