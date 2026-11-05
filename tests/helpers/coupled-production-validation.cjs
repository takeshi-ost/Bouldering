'use strict';
module.exports=String.raw`
function assertMovingLimbOrder(stance,anchor){
 assert(Array.isArray(anchor)&&anchor.length===2,'locked support pair');
 const moving=[0,1,2,3].filter(i=>!anchor.includes(i));
 if(moving.length===2&&(moving[0]<2)===(moving[1]<2)&&stance[moving[0]]&&stance[moving[1]])
  assert(stance[moving[0]].x<=stance[moving[1]].x,'same-type moving contacts must retain absolute left/right order');
}
function resourcePlan(reference,budget,heartTemplate,placements){
 for(const point of reference.slice(1))assertMovingLimbOrder(point.grips.map(id=>holds.find(h=>h.id===id)),point.anchor);
 const byStep=new Map();for(const h of placements){const w=h.witness;assert(w?.action&&Number.isInteger(w.fromStep),'explicit heart pickup action');if(!byStep.has(w.fromStep))byStep.set(w.fromStep,[]);byStep.get(w.fromStep).push(w);}
 let mask=0,remaining=budget,penalties=0;const costs=routeHazardCosts(reference);
 for(let i=1;i<reference.length;i++){
  assert(remaining>0,'cannot begin pickup/action at exhausted step '+i);
  for(const w of byStep.get(i-1)||[]){const stance=w.grips.map(id=>holds.find(h=>h.id===id)),m=fingerGestureReplay(w.from,stance,w.action);assert(m?.active,'heart gesture active');assertMovingLimbOrder(m.stance,m.anchor);assert(fingerRouteSampleStable(w.from,stance,w.action,m,{requireRelease:false}),'heart resampling');const next=fingerRouteTraceMask(heartTemplate,mask,m.trace);remaining+=(bitCount(next)-bitCount(mask))*HEART_CONFIG.recovery;mask=next;}
  const next=coursePickupMask(heartTemplate,mask,reference[i-1],reference[i]);remaining+=(bitCount(next)-bitCount(mask))*HEART_CONFIG.recovery-1-(costs[i]-costs[i-1]);penalties+=costs[i]-costs[i-1];mask=next;assert(remaining>=0,'resource plan exhausted at '+i);
 }
 assert.equal(bitCount(mask),heartTemplate.length,'all authored heart witnesses collect their pickups');return {byStep,remaining,pickups:bitCount(mask),penalties,budget,moves:reference.length-1,canceledPickups:placements.length};
}
function play(reference,count,initialBudget,heartTemplate,plan){
 body={...reference[0]};committed={...body};grips=fingerRouteInitial();startGrips=[...grips];stamina=initialBudget;hearts=heartTemplate.map(h=>({...h,collected:false}));moveCount=0;state='playing';drag=null;cameraIntro=null;settingsOpen=false;featureHelpOpen=false;
 // Tutorial UI lessons are orthogonal to physics, which is exercised via real input.
 tutorialRun=null;finish=won=>{state=won?'won':'lost';};
 for(let i=1;i<reference.length;i++){
  assert(stamina>0,'exhausted before move '+i);camera=clamp(body.y-H*.6,0,HEIGHT-H);
  for(const w of plan.byStep.get(i-1)||[]){
   const before={...body},beforeGrips=ids(grips),beforeMoves=moveCount;nearly(before,w.from);assert.deepEqual(beforeGrips,w.grips);
   const pickupOrigin=eventAtScreen(137,320);down(pickupOrigin);assert(drag);for(const p of fingerResampledAction(w.action,count).points){move(movedEvent(pickupOrigin,p));if(drag.anchor)assertMovingLimbOrder(grips,drag.anchor);}release(true);nearly(body,before);assert.deepEqual(ids(grips),beforeGrips);assert.equal(moveCount,beforeMoves);assert(lastFingerGesture.canceled);
  }
  const e=eventAtScreen(123,330);down(e);assert(drag,'drag '+i);
  const sampled=fingerResampledAction(reference[i].action,count);for(const p of sampled.points){move(movedEvent(e,p));if(drag.anchor)assertMovingLimbOrder(grips,drag.anchor);}
  release();assert.equal(moveCount,i,'live commit '+JSON.stringify({step:i,samples:count,action:reference[i].action,expected:{x:reference[i].x,y:reference[i].y,grips:reference[i].grips},actual:{body,grips:ids(grips),state,stamina},record:lastFingerGesture&&{...lastFingerGesture,trace:undefined}}));assert.notEqual(state,'lost');nearly(body,reference[i]);assert.deepEqual(ids(grips),reference[i].grips,'live contacts '+JSON.stringify({step:i,samples:count,action:reference[i].action,body,record:lastFingerGesture&&{...lastFingerGesture,trace:undefined}}));assert.equal(lastFingerGesture.accepted,true);
 }
 assert.equal(state,'won');return {remaining:stamina,pickups:hearts.filter(h=>h.collected).length};
}
function generatedHazardProbe(reference,budget){
 const candidates=holds.filter(h=>h.type==='hazard');if(!testHazards)return {tested:false,count:candidates.length};
 let checked=0;
 for(const h of candidates){checked++;const witness=fingerFindHazardMove(h,reference);if(!witness)continue;
  const from=reference[witness.step],stance=witness.step?from.grips.map(id=>holds.find(h=>h.id===id)):fingerRouteInitial();
  const cold=fingerGestureReplay(from,stance,witness.action);assert(cold?.valid&&cold.penalty>0);assert.equal(cold.penalty,newHazardContacts(cold.stance,stance).size*HAZARD_CONFIG.penalty);
  for(const samples of [1,10]){
   body={x:from.x,y:from.y};committed={...body};grips=[...stance];startGrips=[...stance];stamina=budget;moveCount=0;state='playing';drag=null;cameraIntro=null;settingsOpen=false;featureHelpOpen=false;tutorialRun=null;hearts=hearts.map(p=>({...p,collected:true}));camera=clamp(body.y-H*.6,0,HEIGHT-H);
   const e=eventAtScreen(123,330);down(e);assert(drag);for(const p of fingerResampledAction(witness.action,samples).points)move(movedEvent(e,p));release();assert.equal(moveCount,1);nearly(body,cold.p);assert.deepEqual(ids(grips),ids(cold.stance));assert.equal(stamina,budget-1-cold.penalty);assert(lastFingerGesture.accepted);assert.equal(lastFingerGesture.trace.length,cold.trace.length);lastFingerGesture.trace.forEach((p,i)=>nearly(p,cold.trace[i]));
  }
  return {tested:true,count:candidates.length,checked,found:true,id:h.id,step:witness.step,penalty:cold.penalty,samples:[1,10]};
 }
 return {tested:true,count:candidates.length,checked,found:false};
}
`;
