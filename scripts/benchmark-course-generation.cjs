// Native JS timings only; Safari/device timings must be checked on that device.
// Usage: node scripts/benchmark-course-generation.cjs [repetitions] [stage ...]
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const repetitions=Number(process.argv[2]||3),stages=process.argv.slice(3).map(Number);
if(!Number.isSafeInteger(repetitions)||repetitions<1||repetitions>20 || stages.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('Use 1–20 repetitions and positive integer stages');
const source=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('repetitions','stages',env+source+`
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return +sorted[Math.floor(sorted.length/2)].toFixed(2);};
for(const mode of ['existing','prototype'])for(const n of stages) {
 courseMode=mode;reset(n); // Warm-up excluded.
 const total=[],planner=[];
 for(let i=0;i<repetitions;i++) {
  const began=performance.now();reset(n);total.push(performance.now()-began);planner.push(densityStats.courseGeneration.elapsedMs);
 }
 const g=densityStats.courseGeneration;
 console.log(JSON.stringify({mode,stage:n,repetitions,totalMedianMs:median(total),totalMaxMs:+Math.max(...total).toFixed(2),
  plannerMedianMs:median(planner),intent:g.requested,actual:g.actual,moves:routeExpectedMoves(),stamina,
  penalties:g.resources.penalties,pickups:g.resources.pickups,validated:densityStats.routeBudgetValidated,
  searchTransitions:densityStats.costSearch?.transitions||0,comparisonTransitions:Object.values(g.comparisons).reduce((n,c)=>n+c.transitions,0),
  recipeAttempts:g.recipeAttempts,safeFallback:g.usedSafeFallback}));
}
`)(repetitions,stages.length?stages:[6,40,47,48]);
