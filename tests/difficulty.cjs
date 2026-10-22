const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},contains(){return true;},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
new Function('assert',env+source+`
for(const [stage,expected] of [[0,0],[1,0],[4,0],[5,1],[19,1],[20,2],[39,2],[40,3],[500,3]])assert.equal(difficultyForStage(stage),expected);
for(const weights of [[],[1,2,3],[0,0,0,0],[-1,1,1,1],[NaN,1,1,1],[Infinity,1,1,1],['1',1,1,1],[1,,,,]])assert.throws(()=>weightedDifficulty(weights,1));
for(const stage of [-1,1.2,NaN])assert.throws(()=>difficultyForStage(stage));
for(let selected=0;selected<4;selected++)for(let seed=0;seed<100;seed++)assert.equal(weightedDifficulty([0,1,2,3].map(n=>n===selected?100:0),seed),selected);
const counts=[0,0,0,0];for(let seed=0;seed<10000;seed++){const d=weightedDifficulty([10,20,30,40],seed);counts[d]++;assert.equal(weightedDifficulty([1,2,3,4],seed),d);}
for(let i=0;i<4;i++)assert(Math.abs(counts[i]-(i+1)*1000)<180);
const bands=DIFFICULTY_CONFIG.stageBands,weights=DIFFICULTY_CONFIG.dailyWeights;
DIFFICULTY_CONFIG.stageBands=[{fromStage:0,weights:[20,80,0,0]},{fromStage:10,weights:[0,0,60,40]}];
for(let stage=0;stage<100;stage++){const d=difficultyForStage(stage);assert(stage<10 ? d<2 : d>=2);assert.equal(difficultyForStage(stage),d);}
// Daily uses the same four-way weighted selector independently of stage bands.
for(let selected=0;selected<4;selected++){
 DIFFICULTY_CONFIG.dailyWeights=[0,1,2,3].map(n=>n===selected?1:0);
 for(let day=1;day<=28;day++){const p=dailyProfile('2026-02-'+String(day).padStart(2,'0'));assert.equal(p.difficulty,selected);assert.equal(p.referenceStage,DIFFICULTY_RULES[selected].referenceStage);}
}
DIFFICULTY_CONFIG.dailyWeights=weights;
// Force dense hazards on STAGE 1: progression must not disable a selected rule set.
DIFFICULTY_CONFIG.stageBands=[{fromStage:0,weights:[0,0,0,100]}];reset(1);cameraIntro=null;
assert.equal(difficulty,3);const ratio=holds.filter(h=>h.type==='hazard').length/holds.length;assert(ratio>=.3 && ratio<=.5);
for(let i=1;i<route.length;i++){
 camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});down(e(body));move(e(route[i]));release();assert.equal(moveCount,i);
}
assert.equal(state,'won');
const sample=Array.from({length:9},(_,i)=>({x:200,y:800-i*80}));
for(const d of [0,1,2,3]){
 const found=new Set();for(let n=1;n<100;n++)found.add(createHearts(n,sample,d).length);
 assert.deepEqual([...found].sort(),d===0?[0]:[0,1,2]);
}
// Force difficulty 0 on a late stage: neither hearts nor blue holds should appear.
DIFFICULTY_CONFIG.stageBands=[{fromStage:0,weights:[100,0,0,0]}];reset(40);assert.equal(difficulty,0);assert.equal(hearts.length,0);assert(!holds.some(h=>h.type==='hazard'));
const snapshot=JSON.stringify({holds,route,hearts,stamina,difficulty});reset(40);assert.equal(JSON.stringify({holds,route,hearts,stamina,difficulty}),snapshot);
DIFFICULTY_CONFIG.stageBands=bands;
console.log('PASS weighted difficulties: 0–3 boundaries, normalized ratios, deterministic stage/day selection, independent daily weights, dense early-stage clear, late-stage rule removal and stable retry');
`)(assert);
