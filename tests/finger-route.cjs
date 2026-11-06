'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const files=['config','course-progression-config','course-distribution-config','course-distribution','course-progression','difficulty-config','utils','difficulty','stage','finger-aim','viewport','game','route','finger-route','course','hazards','course-stamina-settings','course-generator-core','course-adoption','tutorial-course'];
const nativeSource=require('../scripts/native-bundle-source.cjs');
const source=files.map(file=>{const s=fs.readFileSync(path.join(root,'js',file+'.js'),'utf8');return process.env.ASCENT_NATIVE_TEST==='1'?nativeSource(file+'.js',s):s;}).join('\n');
function engine(body){return new Function('assert',`
 const globalThis={},gameText=x=>x,performance={now:()=>2000};
 const document={getElementById(){return {getContext(){return {}},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
 ${source}
 const jointHistory=[null,null,null,null];let characterAnimation=null;
 function characterPose(){return {body:{...body}};}function resetCharacterAnimation(){characterAnimation=null;}
 function startPoseSettle(){}function playSound(){}
 updateUI=()=>{};finish=won=>{state=won?'won':'lost';};
 ${body}
 `)(assert);}
test('tutorial preserves historical baseline witness and has fixed production coupled witness',()=>engine(`
 withFingerAimDisabled(()=>prepareTutorialCourse());const native=route,geometry=JSON.stringify(holds);
 assert.equal(native.length-1,8);assert.equal(replayRoute(native),null,'No torso-derived fallback');
 const report=prepareTutorialCourse();assert.equal(JSON.stringify(holds),geometry);assert.equal(report.referenceMoves,6);
 assert(route.slice(1).every(p=>p.action?.bodyMotion===COUPLED_BODY_MODEL&&p.trace.length>2));assert(samePairRoute(route,replayRoute(route)));
 assert(fingerValidateDragReference(route).valid);assert(report.resources.valid);
 const changed=JSON.parse(JSON.stringify(route));changed[1].action.points[0].dx+=1;
 assert(!samePairRoute(route,changed),'Pruning fingerprint includes action');
 const changedTrace=JSON.parse(JSON.stringify(route));changedTrace[1].trace[0].x+=1;
 assert(!samePairRoute(route,changedTrace),'Pruning fingerprint includes heart sweep');
 assert(fingerAimEnabled());assert(coupledBodyEnabled());assert.equal(fingerRouteAction(0,-10).gain,1.5);assert.equal(fingerRouteAction(0,-10).bodyMotion,COUPLED_BODY_MODEL);
`));
for(const subdivisions of [1,10])test('fixed tutorial wins with actual live input ('+subdivisions+' samples)',()=>engine(`
 const report=prepareTutorialCourse();const reference=route;body={...route[0]};committed={...body};grips=fingerRouteInitial();startGrips=[...grips];
 stamina=report.initialStamina;moveCount=0;state='playing';settingsOpen=false;featureHelpOpen=false;cameraIntro=null;camera=0;
 for(let i=1;i<reference.length;i++){
  const origin={clientX:123,clientY:330};down(origin);assert(drag);let previous={dx:0,dy:0};
  for(const point of reference[i].action.points){for(let k=1;k<=${subdivisions};k++)move({clientX:origin.clientX+previous.dx+(point.dx-previous.dx)*k/${subdivisions},clientY:origin.clientY+previous.dy+(point.dy-previous.dy)*k/${subdivisions}});previous=point;}
  release();assert.equal(moveCount,i);assert(distance(body,reference[i])<1e-7);assert.deepEqual(grips.map(h=>h.id),reference[i].grips);
 }
 assert.equal(state,'won');assert.equal(stamina,report.initialStamina-6);
`));
test('bounded solver deterministic, pruning preserves explicit route, partial searches use actions',()=>engine(`
 withFingerAimDisabled(()=>prepareTutorialCourse());const guide=route;
 const a=solveRoute(guide),b=solveRoute(guide);assert(a);assert.deepEqual(a,b);assert(samePairRoute(a,replayRoute(a)));
 assert(labValidateRecoveryDragReference(a).valid);assert(a.slice(1).every(p=>p.action.bodyMotion===COUPLED_BODY_MODEL&&Math.hypot(p.action.points[0].dx,p.action.points[0].dy)>=INPUT_CONFIG.dragThreshold),'Solver emits activated coupled input actions');
 route=a;pruneUnusedHolds();assert(samePairRoute(a,route));assert(samePairRoute(route,replayRoute(route)));
 for(const search of [labPartialSearch,labColumnPartialSearch,labSwitchbackSearch]){
  const r=search(guide,{limit:10000,maxMoves:12,stop:(p,s)=>bothHandsOnGoal(s)});assert(r.found);assert(r.path.slice(1).every(p=>p.action));assert(labValidateRecoveryDragReference(r.path).valid);
 }
 const optimized=optimizeRoute(route,{maxTransitions:200,passes:1});assert(replayRoute(optimized));assert(fingerValidateDragReference(optimized).valid);
 const cost=solveCostRoute(optimized,40,{maxTransitions:1000,beamWidth:3});assert(cost);assert(routeResources(cost).valid);assert(samePairRoute(cost,replayRoute(cost)));
`));
test('resource sweep uses explicit intermediate trace and collects once',()=>engine(`
 const origin={x:100,y:300},endpoint={x:100,y:300,action:fingerRouteAction(0,0),trace:[{x:100,y:300},{x:200,y:300},{x:100,y:300}]};
 const pickup={x:200,y:300};assert(!torsoTouchesHeart(origin,endpoint,pickup));
 assert.equal(coursePickupMask([pickup],0,origin,endpoint),1);assert.equal(coursePickupMask([pickup],1,origin,endpoint),1);
 prepareTutorialCourse();const witness=findCourseHeartMove({x:route[1].x,y:route[1].y},route);assert(witness?.action);assert(witness.trace.length>1);
 const s=fingerRouteInitial(),m=fingerGestureReplay(witness.from,s,witness.action);assert(m.active);
 assert(fingerRouteTraceMask([{x:route[1].x,y:route[1].y}],0,m.trace));
`));
