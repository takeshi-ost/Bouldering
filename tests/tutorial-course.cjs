'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
// Real physics/input functions; only rendering/audio/result side effects stubbed.
const files=['config','course-progression-config','course-distribution-config','course-distribution','course-progression','difficulty-config','utils','difficulty','stage','game','route','course','hazards','course-stamina-settings','course-generator-core','course-adoption','tutorial-course'];
const source=files.map(file=>fs.readFileSync(path.join(root,'js',file+'.js'),'utf8')).join('\n');
function engine(body){return new Function('assert',`
 const globalThis={},gameText=x=>x,performance={now:()=>2000};
 const document={getElementById(){return {getContext(){return {}},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
 ${source}
 const jointHistory=[null,null,null,null];let characterAnimation=null;
 function characterPose(){return {body:{...body}};}function resetCharacterAnimation(){characterAnimation=null;}
 function startPoseSettle(){}function playSound(){}
 function viewportClientPoint(e,rect,camera){return {x:e.clientX,y:e.clientY+camera};}
 updateUI=()=>{};finish=won=>{state=won?'won':'lost';};
 ${body}
 `)(assert);}

test('dedicated deterministic geometry: alternating ordinary holds, START-only wide, usual stamina +5',()=>engine(`
 level=0;difficulty=0;const report=prepareTutorialCourse();
 assert.equal(TUTORIAL_COURSE_CONFIG.seed,0);assert(Object.isFrozen(TUTORIAL_COURSE_CONFIG));
 assert.equal(HEIGHT,700);assert.equal(holds.length,13);assert.equal(report.centerHoldId,null);
 const ordinary=holds.filter(h=>h.type==='normal');assert.equal(ordinary.length,9);
 assert.deepEqual(ordinary.map(h=>[h.x,h.y]),[[150,460],[250,420],[150,380],[250,340],[150,300],[250,260],[150,220],[250,180],[150,140]]);
 assert.equal(holds.filter(h=>h.wide).length,1);assert.equal(holds.find(h=>h.wide).type,'start');
 assert.equal(holds.filter(h=>h.type==='goal').length,1);assert(!holds.find(h=>h.type==='goal').wide);
 assert.equal(holds.filter(h=>h.type==='hazard').length,0);assert.deepEqual(hearts,[]);
 assert.equal(report.referenceMoves,8);assert.equal(report.normalStamina,stageStamina(8));assert.equal(report.initialStamina,16);
 assert.deepEqual(report.resources,{valid:true,moves:8,cost:8,penalties:0,pickupMask:0,pickups:0,required:8,budget:16,remaining:8});
 assert.equal(currentCourseInitialStamina(),report.referenceMoves+8);assert.equal(generatedCourse.holds,holds);
 assert.equal(generatedCourse.level,0);assert.equal(generatedCourse.mode,'tutorial');
 const snapshot=JSON.stringify({holds,route,report});assert.equal(JSON.stringify({holds,route,report:prepareTutorialCourse()}),snapshot);
 assert.equal(level,0);assert.equal(difficulty,0);
`));

test('yellow goal remains functionally distinct: only both hands sharing it win',()=>engine(`
 prepareTutorialCourse();const goal=holds.find(h=>h.type==='goal'),ordinary=holds.find(h=>h.type==='normal'),start=holds.find(h=>h.wide);
 assert(canShareHold(goal,0,1));assert(!canShareHold(goal,2,3));assert(!canShareHold(ordinary,0,1));
 assert(!bothHandsOnGoal([goal,ordinary,holds[0],holds[1]]));
 assert(!bothHandsOnGoal([start,start,holds[0],holds[1]]));
 assert(!bothHandsOnGoal([ordinary,ordinary,holds[0],holds[1]]));
 assert(bothHandsOnGoal([goal,goal,holds[0],holds[1]]));
`));

for(const subdivisions of [1,10])test('actual down/move/release wins on alternating ordinary holds ('+subdivisions+' samples/drag)',()=>engine(`
 level=0;const report=prepareTutorialCourse();body={...route[0]};committed={...body};grips=[...initialGrips];startGrips=[...grips];
 stamina=report.initialStamina;moveCount=0;state='playing';settingsOpen=false;featureHelpOpen=false;cameraIntro=null;camera=0;
 const event=p=>({clientX:p.x,clientY:p.y-camera});
 for(let i=1;i<route.length;i++){
  const from={...body},to=route[i];down(event(from));assert(drag);
  for(let step=1;step<=${subdivisions};step++)move(event({x:from.x+(to.x-from.x)*step/${subdivisions},y:from.y+(to.y-from.y)*step/${subdivisions}}));
  release();assert.deepEqual(grips.map(h=>h.id),to.grips,'real release agrees with reference contacts');
  assert.equal(stamina,report.initialStamina-i);assert.equal(moveCount,i);
  if(i<route.length-1)assert.equal(state,'playing','one hand on the goal is not a win');
 }
 assert.equal(state,'won');assert.equal(moveCount,8);assert.equal(stamina,8);assert(bothHandsOnGoal());
`));

test('all installed state restores on route/resource failures; changing anatomy invalidates authored route',()=>engine(`
 level=0;prepareTutorialCourse();
 const snapshot=()=>({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount,level,difficulty});
 const before=snapshot(),savedReplay=replayRoute;
 replayRoute=()=>{throw Error('injected replay failure');};assert.throws(prepareTutorialCourse,/injected replay/);replayRoute=savedReplay;
 for(const key of Object.keys(before))assert.equal(snapshot()[key],before[key],key);
 const savedResources=routeResources;routeResources=()=>({valid:false});
 assert.throws(prepareTutorialCourse,/stamina budget/);routeResources=savedResources;
 for(const key of Object.keys(before))assert.equal(snapshot()[key],before[key],key);
 const lengths=[...LIMB_LENGTHS];LIMB_LENGTHS.fill(20);
 assert.throws(prepareTutorialCourse,/no longer replays/);LIMB_LENGTHS.splice(0,4,...lengths);
 for(const key of Object.keys(before))assert.equal(snapshot()[key],before[key],key);
 assert.doesNotThrow(prepareTutorialCourse);
`));
