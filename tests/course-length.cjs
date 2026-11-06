const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
const counts={short:0,medium:0,long:0};
for(let n=2;n<=10001;n++) {
 const info=stageLengthInfo(n);counts[info.category]++;
 const recipe=CourseProgression.recipe(CourseProgression.resolveStage(n));
 assert.equal(info.category,recipe.length==='middle'?'medium':recipe.length);
 assert.equal(info.category,info.height<=H?'short':info.height<=H*2?'medium':'long');
 assert.equal(JSON.stringify(info),JSON.stringify(stageLengthInfo(n)));
}
assert(Object.values(counts).every(n=>n>0),'Normal score sampler retains all lengths');
const report=[];
for(let kind=0;kind<3;kind++) {
 assert.equal(stageLengthInfo(1).category,'short','Fixed stage1 seed samples short');
 for(const mode of ['existing'])for(const rating of [0,2,3]) {
  debugMode=true;debugAttempt=true;debugCourseTrial={typeId:({0:0,2:2,3:6})[rating],lengthCategory:['short','medium','long'][kind],seed:23};
  courseMode=mode;reset(23);cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
  const info=stageLengthRule(23,23,debugCourseDistribution()),expected=['short','medium','long'][kind];
  assert.equal(info.category,expected);assert.equal(HEIGHT,info.height);assert.equal(HEIGHT,(kind+1)*H);
  const goal=holds.find(h=>h.type==='goal');
  assert(Math.abs(goal.y-STAGE_CONFIG.goalTopMargin)<=STAGE_CONFIG.holdOffset+1e-8);
  assert(initialGrips[2].y-goal.y>=HEIGHT-160);
  if(kind===0){assert(cameraTop()<0);assert(canScrollStage(),'Short course must remain scrollable');}
  assert(validateRouteBudget(route));assert.equal(stamina,routeExpectedMoves()+3);
  const fixed=JSON.stringify({holds,route,hearts,stamina,HEIGHT});
  const preview=stagePreview(23,mode);assert.equal(preview.height,stageLengthInfo(23).height);assert.equal(preview.seed,CourseProgression.resolveStage(23).seed);
  assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),fixed);
  reset(23);cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
  assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),fixed);
  const moves=routeExpectedMoves();
  for(let i=1;i<route.length;i++) {
   camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);
   const origin={x:body.x,y:body.y-camera},action=route[i].action;
   assert(validFingerAction(action));
   const e=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});down(e({dx:0,dy:0}));
   for(const point of fingerResampledAction(action,10).points)move(e(point));
   release();assert.equal(moveCount,i);assert.notEqual(state,'lost');
  }
  assert.equal(state,'won');report.push({mode,rating,length:expected,height:HEIGHT,moves});
 }
 // Geometry retries keep the selected length's base seed.
 const seed=20261023,profile=stageLengthRule(40,seed);
 const actual=createStageGenerator().generate(40,true,seed+123,seed);
 assert.equal(actual.HEIGHT,stageLayout(40,mulberry32(seed+123),seed).height);
 assert.equal(actual.HEIGHT<=H?'short':actual.HEIGHT<=H*2?'medium':'long',profile.category);
}
debugCourseTrial=null;debugAttempt=false;debugMode=false;
// Both calendar and normal-map draws have all three lengths.
const days=new Set();for(let day=1;day<=31;day++) {
 const p=dailyProfile('2026-10-'+String(day).padStart(2,'0'));days.add(resolvedCourseLengthInfo(CourseProgression.resolveDaily(p.date)).category);
}
assert.equal(days.size,3);
console.log('PASS score-derived normal/Daily lengths, exact recipe previews; retained debug planner all lengths/families clear via real input with preview/retry isolation');
console.log(JSON.stringify({counts,report}));
`)(assert);
