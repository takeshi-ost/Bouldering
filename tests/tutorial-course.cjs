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

test('dedicated deterministic geometry: one central interior wide, no pickups/spikes, usual stamina +5',()=>engine(`
 level=0;difficulty=0;const report=prepareTutorialCourse();
 assert.equal(TUTORIAL_COURSE_CONFIG.seed,0);assert(Object.isFrozen(TUTORIAL_COURSE_CONFIG));
 assert.equal(HEIGHT,700);assert.equal(holds.length,13);
 const interior=holds.filter(h=>h.wide&&h.type==='normal');assert.equal(interior.length,1);
 assert.deepEqual([interior[0].id,interior[0].x,interior[0].y],[report.centerHoldId,W/2,HEIGHT/2]);
 assert.equal(holds.filter(h=>h.wide&&h.type==='start').length,1);assert.equal(holds.filter(h=>h.type==='goal').length,1);
 assert.equal(holds.filter(h=>h.type==='hazard').length,0);assert.deepEqual(hearts,[]);
 assert.equal(report.referenceMoves,6);assert.equal(report.normalStamina,stageStamina(6));assert.equal(report.initialStamina,14);
 assert.equal(currentCourseInitialStamina(),report.referenceMoves+8);assert.equal(generatedCourse.holds,holds);
 assert.equal(generatedCourse.level,0);assert.equal(generatedCourse.mode,'tutorial');
 const snapshot=JSON.stringify({holds,route,report});assert.equal(JSON.stringify({holds,route,report:prepareTutorialCourse()}),snapshot);
 assert.equal(level,0);assert.equal(difficulty,0);
`));

test('exhaustive conservative graph proves HAND contact is mandatory, including all unsampled continuous gestures',()=>engine(`
 level=0;const report=prepareTutorialCourse(),p=report.mandatoryProof;
 assert.deepEqual(p.forbiddenLimbs,[0,1]);assert.equal(p.mandatory,true);
 assert.equal(p.states,234);assert.equal(p.reachableStates,66);assert.equal(p.goalStates,12);assert.equal(p.reachableGoalStates,0);
 const unrestricted=tutorialMandatoryHoldProof(holds,initialGrips,report.centerHoldId,[]);
 assert(unrestricted.reachableGoalStates>0,'unrestricted graph includes the actual winning route');
 const removed=tutorialMandatoryHoldProof(holds,initialGrips,report.centerHoldId);
 assert(removed.mandatory);assert.equal(removed.reachableGoalStates,0);
 const noFeet=tutorialMandatoryHoldProof(holds,initialGrips,report.centerHoldId,[2,3]);assert(!noFeet.mandatory);
 const bypass=[...holds,{...holds[report.centerHoldId],id:13}];
 assert(!tutorialMandatoryHoldProof(bypass,initialGrips,report.centerHoldId,[0,1]).mandatory,'alternate bridge invalidates certificate');
 assert(route.some(point=>point.grips?.slice(0,2).includes(report.centerHoldId)));
`));

for(const subdivisions of [1,10])test('actual down/move/release wins and grabs center with hands ('+subdivisions+' samples/drag)',()=>engine(`
 level=0;const report=prepareTutorialCourse();body={...route[0]};committed={...body};grips=[...initialGrips];startGrips=[...grips];
 stamina=report.initialStamina;moveCount=0;state='playing';settingsOpen=false;featureHelpOpen=false;cameraIntro=null;camera=0;
 let handGrab=false;
 const event=p=>({clientX:p.x,clientY:p.y-camera});
 for(let i=1;i<route.length;i++){
  const from={...body},to=route[i];down(event(from));assert(drag);
  for(let step=1;step<=${subdivisions};step++)move(event({x:from.x+(to.x-from.x)*step/${subdivisions},y:from.y+(to.y-from.y)*step/${subdivisions}}));
  release();assert.deepEqual(grips.map(h=>h.id),to.grips,'real release agrees with reference contacts');
  if(grips.slice(0,2).some(h=>h.id===report.centerHoldId))handGrab=true;
 }
 assert(handGrab);assert.equal(state,'won');assert.equal(moveCount,6);assert.equal(stamina,8);assert(bothHandsOnGoal());
`));

test('all installed state restores on route/proof failures; changing anatomy invalidates proof',()=>engine(`
 level=0;prepareTutorialCourse();
 const snapshot=()=>({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount,level,difficulty});
 const before=snapshot(),savedReplay=replayRoute;
 replayRoute=()=>{throw Error('injected replay failure');};assert.throws(prepareTutorialCourse,/injected replay/);replayRoute=savedReplay;
 for(const key of Object.keys(before))assert.equal(snapshot()[key],before[key],key);
 const lengths=[...LIMB_LENGTHS];LIMB_LENGTHS.fill(300);
 assert.throws(prepareTutorialCourse,/not proven mandatory/);LIMB_LENGTHS.splice(0,4,...lengths);
 for(const key of Object.keys(before))assert.equal(snapshot()[key],before[key],key);
 assert.doesNotThrow(prepareTutorialCourse);
`));
