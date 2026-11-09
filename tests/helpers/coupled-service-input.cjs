'use strict';
// Service/reward tests replay generated baseline witnesses through real input.
// New-selector alternative inputs have a separate six-pair-baseline-live test.
module.exports = `
function serviceGesture(action,cancel=false){return SixPairSelection.withBaseline(()=>{
 assert(validFingerAction(action));assert.equal(action.bodyMotion,COUPLED_BODY_MODEL);
 const rect=canvas.getBoundingClientRect(),scale=rect.width/400;
 const origin={clientX:rect.left+123*scale,clientY:rect.top+330*scale};
 down(origin);assert(drag,'production finger gesture starts');
 for(const p of action.points)move({clientX:origin.clientX+p.dx*scale,clientY:origin.clientY+p.dy*scale});
 release(cancel);
});}
function servicePlayStep(i){
 camera=clamp(body.y-H*.6,0,HEIGHT-H);
 for(const placement of activeCourseGeneration?.report?.hearts?.placements||[]){
  const w=placement.witness;if(w?.fromStep!==i-1)continue;
  assert(w.action,'authored canceled heart detour');
  const before=JSON.stringify({body,ids:grips.map(h=>h?.id),moveCount});
  serviceGesture(w.action,true);
  assert.equal(JSON.stringify({body,ids:grips.map(h=>h?.id),moveCount}),before,'pickup cancel preserves stance and moves');
 }
 serviceGesture(route[i].action);
 assert.equal(moveCount,i,'explicit route action commits');
 assert(Math.abs(body.x-route[i].x)<1e-6&&Math.abs(body.y-route[i].y)<1e-6,'explicit action endpoint');
 assert.deepEqual(grips.map(h=>h?.id),route[i].grips,'explicit action contacts');
}
`;
