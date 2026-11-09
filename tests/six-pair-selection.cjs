'use strict';
// Independent contract tests; no storage/network or generation side effects.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/six-pair-selection.js'),'utf8');
for(let mode=0;mode<20;mode++){
 const context=vm.createContext({Math,setTimeout:()=>0});
 vm.runInContext(`const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];let HEIGHT=1000,holds=[],route=[{x:0,y:100},{x:0,y:0}],committed={x:0,y:50},startGrips=[{},{},{},{}];function selectAnchorBaseline(x,y){let a=(Math.atan2(y,x)+Math.PI*2)%(Math.PI*2);const mode=${mode};return pairs[mode<6?mode:Math.floor(a*(mode-4)*13)%6];}function supportPairReach(){return 1;}function goalSupportDistance(){return Infinity;}`+source,context);
 const report=vm.runInContext(`(()=>{const map=SixPairSelection.plan();return {k:map.k,iterations:map.iterations,sectors:[...map.protectedSectors,...map.sectors].map(s=>({pair:s.pair,width:s.width,selected:[.1,.5,.9].map(t=>SixPairSelection.select(Math.cos(s.start+s.width*t),Math.sin(s.start+s.width*t)))}))};})()`,context);
 assert.equal(report.sectors.length,6);assert(report.iterations<=7);
 assert.equal(new Set(report.sectors.map(s=>JSON.stringify(s.pair))).size,6);
 for(const sector of report.sectors){assert(sector.width>0);for(const selected of sector.selected)assert.equal(JSON.stringify(selected),JSON.stringify(sector.pair));}
}
require('./coupled-production-harness.cjs')(`
 for(const custom of [null,reconstructed]){
  fixture(custom);SixPairSelection.clear();
  const map=SixPairSelection.plan(),seen=new Set();
  for(const sector of [...map.protectedSectors,...map.sectors]){
   const a=sector.start+sector.width/2;const selected=selectAnchor(Math.cos(a),Math.sin(a));
   assert.deepEqual(selected,sector.pair);seen.add(selected.join(','));
  }
  assert.equal(seen.size,6);
 }
 assert(!SixPairSelection.useBaseline);
 assert.throws(()=>SixPairSelection.withBaseline(()=>{assert(SixPairSelection.useBaseline);SixPairSelection.withCurrent(()=>assert(!SixPairSelection.useBaseline));assert(SixPairSelection.useBaseline);throw Error('scope');}),/scope/);
 assert(!SixPairSelection.useBaseline);
 assert.equal(fingerAimGain(),1.5);
`);
console.log('PASS six-pair: 20 discontinuous/constant distributions, positive six reservations, real posture selection, scoped baseline restoration, 1.5 gain');
