'use strict';
// Pure geometry tests, independent of course generation and browser storage.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const source=fs.readFileSync(path.join(__dirname,'../js/six-pair-selection.js'),'utf8');
const context=vm.createContext({Math});
vm.runInContext(source.replace('return {enabled:true,','return {testFinish:finish,testReservation:reservation,enabled:true,'),context);
const api=vm.runInContext('SixPairSelection',context),tau=2*Math.PI,N=3600,base=tau/10;
const wrap=a=>(a%tau+tau)%tau,delta=a=>wrap(a+Math.PI)-Math.PI;
const near=(a,b,why)=>assert(Math.abs(a-b)<1e-10,why||`${a} != ${b}`);
const preferred=[Math.PI/2,0,3*Math.PI/4,Math.PI/4,Math.PI,3*Math.PI/2];
let seed=17;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const finishMs=[];
for(let trial=0;trial<400;trial++){
 let samples=Array.from({length:N},()=>trial<6?trial:Math.floor(random()*(1+trial%6)));
 if(trial===6){samples.fill(0);samples[42]=1;}
 if(trial===7)samples=samples.map((_,i)=>i%2);
 const job={samples,direction:random()*tau},start=performance.now(),plan=api.testFinish(job);
 finishMs.push(performance.now()-start);
 const counts=Array(6).fill(0);for(const i of samples)counts[i]++;
 assert.equal(plan.sectors.length,6);assert.equal(new Set(plan.sectors.map(s=>s.index)).size,6);
 assert.equal(plan.iterations,120);assert.deepEqual(Array.from(plan.counts),counts);
 assert.deepEqual(Array.from(plan.missing),counts.flatMap((n,i)=>n?[]:[i]));
 assert.equal(plan.k,counts.filter(Boolean).length);
 near(plan.sectors.reduce((sum,s)=>sum+s.width,0),tau);
 let cursor=plan.rotation;
 for(let j=0;j<6;j++){
  const s=plan.sectors[j],previous=plan.sectors[(j+5)%6],next=plan.sectors[(j+1)%6];
  assert(s.width>=base-1e-12);near(s.width,base+tau*.4*counts[s.index]/N);
  near(delta(s.start-cursor),0,'no gaps or overlap');cursor+=s.width;
  assert.equal(s.natural,counts[s.index]>0);near(s.preferredAngle,plan.targets[s.index]);
  if(!counts[s.index])near(delta(plan.targets[s.index]-preferred[s.index]),0);
  for(const fraction of [1e-7,.2,.5,.8,1-1e-7])
   for(const turn of [-2,0,2])assert.equal(api.testReservation(plan,s.start+s.width*fraction+turn*tau).index,s.index);
  // Probe both sides of every exact endpoint, including the circle seam.
  assert.equal(api.testReservation(plan,s.start+1e-9).index,s.index);
  assert.equal(api.testReservation(plan,s.start-1e-9).index,previous.index);
  assert.equal(api.testReservation(plan,s.start+s.width+1e-9).index,next.index);
 }
 assert.equal(JSON.stringify(plan),JSON.stringify(api.testFinish(job)),'deterministic tie resolution');
 assert(plan.targets.every(Number.isFinite));
 // Each pair forms exactly one cyclic run, including the sample-grid seam.
 const sequence=Array.from({length:N},(_,i)=>api.testReservation(plan,i*tau/N).index),runs=Array(6).fill(0);
 for(let i=0;i<N;i++)if(sequence[i]!==sequence[(i+N-1)%N])runs[sequence[i]]++;
 assert(runs.every(n=>n===1));
 near(plan.placementCost,plan.sectors.reduce((sum,s)=>sum+delta(s.start+s.width/2-plan.targets[s.index])**2,0));
 // Independently verify the exact rotation beats every coarse rotation for
 // its selected order. This catches missing wrap branches in the optimizer.
 for(let i=0;i<72;i++){
  const shift=i*tau/72-plan.rotation;
  const cost=plan.sectors.reduce((sum,s)=>sum+delta(s.start+s.width/2+shift-plan.targets[s.index])**2,0);
  assert(plan.placementCost<=cost+1e-10);
 }
 if(trial<12){
  // Independent coarse oracle over EVERY circular order, not just the winner.
  // The continuous optimum must be at least as good as each grid candidate.
  const widths=counts.map(n=>base+tau*.4*n/N);
  function checkOrder(order,left){
   if(left.length){for(const i of left)checkOrder([...order,i],left.filter(j=>j!==i));return;}
   let offset=0;const centers=order.map(i=>{const center=offset+widths[i]/2;offset+=widths[i];return center;});
   for(let k=0;k<72;k++){
    const cost=order.reduce((sum,i,j)=>sum+delta(k*tau/72+centers[j]-plan.targets[i])**2,0);
    assert(plan.placementCost<=cost+1e-10,'global placement beats coarse exhaustive oracle');
   }
  }
  checkOrder([0],[1,2,3,4,5]);
 }
}
// Uniform full-circle and directionless ties must not depend on the scan origin.
for(let index=0;index<6;index++)for(const direction of [0,.123,Math.PI]){
 const p=api.testFinish({samples:Array(N).fill(index),direction});
 near(delta(p.targets[index]-preferred[index]),0,'full-circle fallback');
}
// One occupied sample counts as natural and uses the cell-center angle.
const singleton=Array(N).fill(0);singleton[42]=1;
const singlePlan=api.testFinish({samples:singleton,direction:.234});
near(delta(singlePlan.targets[1]-(.234-Math.PI+42.5*tau/N)),0);
assert(singlePlan.sectors.find(s=>s.index===1).width>base);
// Opposite equal runs: circular mean cancels; smaller screen-angle midpoint wins.
const opposite=Array(N).fill(1);for(let i=0;i<100;i++){opposite[i]=0;opposite[i+N/2]=0;}
const oppositePlan=api.testFinish({samples:opposite,direction:Math.PI});
near(oppositePlan.targets[0],50*tau/N,'longest-run midpoint tie');
finishMs.sort((a,b)=>a-b);
console.log('PASS continuous six-pair geometry '+JSON.stringify({maps:400,minWidthDegrees:36,
 medianFinishMs:+finishMs[200].toFixed(2),p95FinishMs:+finishMs[380].toFixed(2),maxFinishMs:+finishMs.at(-1).toFixed(2),
 scope:'shared-cloud Node finish only; excludes baseline scan and physical-device input'}));
