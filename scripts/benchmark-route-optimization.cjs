// Native JS timing; this does not predict iPhone Safari performance.
// Usage: node scripts/benchmark-route-optimization.cjs [repetitions] [stage ...]
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const repetitions=Number(process.argv[2]||3),stages=process.argv.slice(3).map(Number);
if(!Number.isSafeInteger(repetitions)||repetitions<1||repetitions>20||stages.some(n=>!Number.isSafeInteger(n)||n<1))
 throw Error('Use 1–20 repetitions and positive integer stages');
const source=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)" defer><\/script>/g)]
 .map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={
 style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('repetitions','stages',env+source+`
const limit=ROUTE_OPTIMIZATION_CONFIG.maxTransitions;
const mean=a=>+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2);
try {
 for(const mode of ['existing','prototype'])for(const n of stages) {
  courseMode=mode;reset(n); // warm-up excluded
  const runs={baseline:[],optimized:[]},extra=[];let before,after,transitions;
  for(let run=0;run<repetitions;run++) {
   // Alternate order to reduce warm-up/thermal bias.
   for(const kind of (run%2 ? ['optimized','baseline'] : ['baseline','optimized'])) {
    ROUTE_OPTIMIZATION_CONFIG.maxTransitions=kind==='baseline'?0:limit;
    const began=performance.now();reset(n);runs[kind].push(performance.now()-began);
    if(kind==='baseline')before=routeExpectedMoves();
    else {after=routeExpectedMoves();extra.push(densityStats.routeOptimization.elapsedMs);transitions=densityStats.routeOptimization.transitions;}
   }
  }
  console.log(JSON.stringify({mode,stage:n,repetitions,before,after,
   baselineGenerationMs:mean(runs.baseline),optimizedGenerationMs:mean(runs.optimized),
   refinementMs:mean(extra),maxRefinementMs:+Math.max(...extra).toFixed(2),transitions,limit}));
 }
} finally {ROUTE_OPTIMIZATION_CONFIG.maxTransitions=limit;}
`)(repetitions,stages.length?stages:[6]);
