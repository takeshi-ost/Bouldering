const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
const counts={short:0,medium:0,long:0};
for(let n=2;n<=10001;n++) {
 const info=stageLengthInfo(n);counts[info.category]++;
 assert.equal(info.category,stageLengthRule(n).category);
 assert.equal(info.category,info.height<=H?'short':info.height<=H*2?'medium':'long');
 assert.equal(JSON.stringify(info),JSON.stringify(stageLengthInfo(n)));
}
for(const count of Object.values(counts))assert(count>3000 && count<3700);
const weights=STAGE_CONFIG.lengthWeights,bands=DIFFICULTY_CONFIG.stageBands;
const report=[];
for(let kind=0;kind<3;kind++) {
 STAGE_CONFIG.lengthWeights=[0,1,2].map(i=>Number(i===kind));
 for(let seed=0;seed<10;seed++)assert.equal(stageLengthInfo(1,seed).category,'short');
 for(const mode of ['existing','prototype'])for(const rating of [0,2,3]) {
  DIFFICULTY_CONFIG.stageBands=[{fromStage:0,weights:[0,1,2,3].map(i=>Number(i===rating))}];
  courseMode=mode;reset(23);cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
  const info=stageLengthInfo(23),expected=['short','medium','long'][kind];
  assert.equal(info.category,expected);assert.equal(HEIGHT,info.height);assert.equal(HEIGHT,(kind+1)*H);
  const goal=holds.find(h=>h.type==='goal');
  assert(Math.abs(goal.y-STAGE_CONFIG.goalTopMargin)<=STAGE_CONFIG.holdOffset+1e-8);
  assert(initialGrips[2].y-goal.y>=HEIGHT-160);
  if(kind===0){assert(cameraTop()<0);assert(canScrollStage(),'Short course must remain scrollable');}
  assert(validateRouteBudget(route));assert.equal(stamina,routeExpectedMoves()+3);
  const fixed=JSON.stringify({holds,route,hearts,stamina,HEIGHT});
  const preview=stagePreview(23,mode);assert.equal(preview.stamina,stamina);assert.equal(preview.expectedMoves,routeExpectedMoves());
  assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),fixed);
  reset(23);cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
  assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),fixed);
  const moves=routeExpectedMoves();
  for(let i=1;i<route.length;i++) {
   camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);
   const from={...body},to=route[i],e=p=>({clientX:p.x,clientY:p.y-camera});down(e(from));
   for(let k=1;k<=10;k++)move(e({x:from.x+(to.x-from.x)*k/10,y:from.y+(to.y-from.y)*k/10}));
   release();assert.equal(moveCount,i);assert.notEqual(state,'lost');
  }
  assert.equal(state,'won');report.push({mode,rating,length:expected,height:HEIGHT,moves});
 }
 // Geometry retries keep the selected length's base seed.
 const seed=20261023,profile=stageLengthInfo(40,seed);
 const actual=createStageGenerator().generate(40,true,seed+123,seed);
 assert.equal(actual.HEIGHT,stageLayout(40,mulberry32(seed+123),seed).height);
 assert.equal(actual.HEIGHT<=H?'short':actual.HEIGHT<=H*2?'medium':'long',profile.category);
}
STAGE_CONFIG.lengthWeights=weights;DIFFICULTY_CONFIG.stageBands=bands;
// Both calendar and normal-map draws have all three lengths.
const days=new Set();for(let day=1;day<=31;day++) {
 const p=dailyProfile('2026-10-'+String(day).padStart(2,'0'));days.add(stageLengthInfo(p.referenceStage,p.baseSeed).category);
}
assert.equal(days.size,3);
console.log('PASS length-first seeded generation: independent equal odds, fixed intro, all lengths/modes/difficulties clear with actual input, preview/retry isolation, stable daily length during layout retry');
console.log(JSON.stringify({counts,report}));
`)(assert);
