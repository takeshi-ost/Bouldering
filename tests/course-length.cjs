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
assert.equal(stageLengthInfo(1).category,'short','Fixed stage1 seed samples short');
// First deterministic normal stage for each presently sampled length/family.
// EASY is short-only; inventing EASY medium/long TYPE trials would test a
// removed product rather than the formal sampler.
const cases=[];
for(let n=1;n<=100;n++){
 const info=stageLengthInfo(n),rating=difficultyForStage(n);
 if(!cases.some(c=>c.expected===info.category&&c.rating===rating))cases.push({n,rating,expected:info.category});
}
assert.deepEqual(cases.map(c=>[c.rating,c.expected]),[[0,'short'],[2,'short'],[2,'medium'],[2,'long'],[3,'short'],[3,'medium'],[3,'long']]);
for(const {n,rating,expected} of cases) {
 debugMode=false;debugAttempt=false;debugCourseTrial=null;dailyRun=null;
 courseMode='existing';reset(n);cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
 const info=stageLengthInfo(n);
 assert.equal(info.category,expected);assert.equal(HEIGHT,info.height);
 assert.equal(HEIGHT,(['short','medium','long'].indexOf(expected)+1)*H);
 const goal=holds.find(h=>h.type==='goal');assert(goal);
 assert(initialGrips[2].y>goal.y,'Course rises from its initial feet to its goal');
 assert(goal.y>=cameraTop(),'Goal remains inside the scrollable wall');
 if(expected==='short'){assert(cameraTop()<0);assert(canScrollStage(),'Short course must remain scrollable');}
 const budget=stamina;
 const resources=SixPairSelection.withBaseline(()=>routeResources(route,{pickups:hearts,budget}));
 assert.equal(budget,currentCourseInitialStamina(),'Use the shipped stamina, never a fixture allowance');
 const fixed=JSON.stringify({holds,route,hearts,stamina,HEIGHT});
 const preview=stagePreview(n,'existing');assert.equal(preview.height,info.height);assert.equal(preview.seed,CourseProgression.resolveStage(n).seed);
 assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),fixed);
 reset(n);cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
 assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),fixed);
 const moves=routeExpectedMoves();
 // Historical generator witness uses baseline controls, not a claim that the
 // same swipe directions work with current live six-pair remapping.
 // Shipped stamina reductions can make a historical witness too expensive.
 // Verify its real loss as well as feasible clears; do not add hidden stamina.
 SixPairSelection.withBaseline(()=>{
  for(let i=1;i<route.length;i++) {
   camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);
   const origin={x:body.x,y:body.y-camera},action=route[i].action;
   assert(validFingerAction(action));
   const e=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});down(e({dx:0,dy:0}));
   for(const point of action.points)move(e(point));
   release();assert.equal(moveCount,i);
   if(state==='lost')break;
  }
 });
 assert.equal(state,resources.valid?'won':'lost','Live baseline witness result agrees with its real resource feasibility');
 if(resources.valid)assert.equal(stamina,resources.remaining);else assert.equal(stamina,0);
 report.push({stage:n,rating,length:expected,height:HEIGHT,moves,startingStamina:budget,witnessFeasible:resources.valid,outcome:state,committedMoves:moveCount});
}
// Native calibration geometry retains its independent base length seed.
for(let kind=0;kind<3;kind++) {
 const distribution={difficulty:DIFFICULTY_CONFIG.calibration.difficulty,length:[0,0,0]};distribution.length[kind]=1;
 const seed=20261023,profile=stageLengthRule(40,seed,distribution);
 const actual=createStageGenerator().generate(40,true,seed+123,seed,distribution);
 assert.equal(actual.HEIGHT,stageLayout(40,mulberry32(seed+123),seed,distribution).height);
 assert.equal(actual.HEIGHT<=H?'short':actual.HEIGHT<=H*2?'medium':'long',profile.category);
}
// Both calendar and normal-map draws have all three lengths.
const days=new Set();for(let day=1;day<=31;day++) {
 const p=dailyProfile('2026-10-'+String(day).padStart(2,'0'));days.add(resolvedCourseLengthInfo(CourseProgression.resolveDaily(p.date)).category);
}
assert.equal(days.size,3);
console.log('PASS score-derived normal/Daily lengths, exact recipe previews; current normal sampler lengths/families and actual-stamina witness outcomes (not all witnesses clear); preview/retry isolation and native length-seed calibration');
console.log(JSON.stringify({counts,report}));
`)(assert);
