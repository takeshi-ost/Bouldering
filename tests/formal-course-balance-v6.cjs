'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
new Function('assert',env+source+`
// Historical internal-generation witness; actual new live inputs are tested separately.
return SixPairSelection.withBaseline(()=>{
// Historical pre-offset identity fixture; current offset behavior has its own suite.
const savedNormalSeedOffset=CourseProgressionConfig.normalSeedOffset;
CourseProgressionConfig.normalSeedOffset=0;
try {
assert.equal(CourseDistribution.version,'7');
const results=[];
const geometry=()=>JSON.stringify({holds,route,hearts,stamina,HEIGHT,initialGrips});
function verify(kind,id){
 if(kind==='daily')dailyRun={...dailyProfile(id),returnCourse:'existing'};else dailyRun=null;
 const resolved=kind==='daily'?CourseProgression.resolveDaily(id):CourseProgression.resolveStage(id),expected=CourseProgression.recipe(resolved);
 const start=()=>reset(kind==='daily'?dailyRun.referenceStage:id);
 start();const current=activeCourseGeneration;
 assert.equal(current.resolved.score,resolved.score);assert.equal(courseSeed(),resolved.seed);assert.equal(generatedCourse.seed,resolved.seed);
 for(const key of Object.keys(expected).filter(k=>k!=='seed'))assert.equal(current.recipe[key],expected[key],kind+' '+id+' '+key);
 assert(samePairRoute(route,replayRoute(route)));
 assert.equal(hearts.length,current.report.hearts.actual.total);assert.equal(generatedCourse.holds,holds);
 if(expected.length==='short'){assert(expected.heartsFirst+expected.heartsSecond<=1);assert(hearts.length<=1);}
 if(resolved.score<=20){
  assert(Number(expected.length!=='short')+Number(expected.heartsFirst+expected.heartsSecond>0)+Number(expected.spikePercent>0)<=1);
  assert(Number(expected.length!=='short')+Number(hearts.length>0)+Number(holds.some(h=>h.type==='hazard'))<=1);
 }
 assert.equal(stamina,routeExpectedMoves()+3-current.report.hearts.staminaAdjustment.appliedReduction);
 const first=geometry();start();assert.equal(geometry(),first,'repeat geometry '+id);
 const live=activeCourseGeneration,preview=stagePreview(level,'existing',dailyRun);
 assert.equal(preview.stamina,stamina);assert.equal(geometry(),first);assert.equal(activeCourseGeneration,live);
 results.push({kind,id,score:resolved.score,recipe:expected,actualHearts:hearts.length,retry:current.retry});
}
for(const n of [1,12,13,14,15,16,17,20,21])verify('stage',n);
// Tutorial must retain its original v5 geometry and initial stamina exactly.
verify('stage',1);const tutorial=geometry();
const legacy={...CourseDistribution.sampleLegacyV5(1,1),seed:1,stage:1,staminaRules:'0:3'};
generateCourseFromRecipe(legacy);createHearts(1,route);assert.equal(geometry(),tutorial,'stage1 tutorial geometry changed');
// Pick regression identities by the public pure sampler, without generating a
// large matrix or choosing easier geometry after a rejected attempt.
let date;for(let i=1;i<=365;i++){const d=new Date(Date.UTC(2026,0,i)).toISOString().slice(0,10);if(CourseProgression.dailyScore(d)===20){date=d;break;}}
assert.equal(date,'2026-03-21');verify('daily',date);
let shortStage;for(let n=21;n<=400;n++){const r=CourseProgression.recipe(CourseProgression.resolveStage(n));if(r.length==='short'&&r.heartsFirst+r.heartsSecond===1){shortStage=n;break;}}
assert.equal(shortStage,22);verify('stage',shortStage);assert.equal(hearts.length,1,'short heart request must be physically placed in this regression');
// Real input, original default stamina and no test bonus. This one selected
// short-heart route is checked; it is not universal balanced-solvability proof.
cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
const defaultBudget=stamina;const moves=route.length-1;
for(let i=1;i<route.length&&state==='playing';i++){
 camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);
 const origin={x:body.x,y:body.y-camera};
 const event=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});
 assert(validFingerAction(route[i].action));down(event({dx:0,dy:0}));
 for(const point of route[i].action.points)move(event(point));release();
}
const physical={stage:shortStage,state,moves:moveCount,expectedMoves:moves,defaultBudget,remaining:stamina,picked:hearts.filter(h=>h.collected).length};
assert.equal(moveCount,moves,'short-heart default input route did not finish');assert.equal(state,'won','short-heart default input route did not clear');
console.log('PASS v6 targeted actual generation/repeat/contact replay/preview/identity, low-score feature exclusion, global short heart cap, tutorial parity, one default-stamina short-heart input clear; no universal solvability claim');
console.log(JSON.stringify({results,physical}));
} finally {CourseProgressionConfig.normalSeedOffset=savedNormalSeedOffset;}
});
`)(assert);
