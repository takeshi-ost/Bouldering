const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},setAttribute(){},addEventListener(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};
`;
new Function('assert',env+source+`
function eventAt(p){return {clientX:p.x,clientY:p.y-camera};}
// Legacy TYPE-forced consumption recipes are retired with their entry point.
// Current sampled spike generation and live contact behavior below remain covered.
const generationReport=[];
// Actual v5 sampled features are post-process caps, not legacy dense quotas.
for(const stage of [1,18,55]){
 reset(stage);const resolved=CourseProgression.resolveStage(stage),recipe=CourseProgression.recipe(resolved),report=activeCourseGeneration.report;
 assert.equal(activeCourseGeneration.recipe.spikePercent,recipe.spikePercent);
 assert.equal(report.spikes.count,Math.floor(report.spikes.candidateCount*recipe.spikePercent/100));
 assert.deepEqual(holds.filter(h=>h.type==='hazard').map(h=>h.id).sort((a,b)=>a-b),[...report.spikes.selectedIds].sort((a,b)=>a-b));
 assert.equal(report.spikes.referenceHazardCost,0);assert(report.spikes.referenceContactsUnchanged);
 // Adopted generation records baseline witnesses, not identical new-control inputs.
 assert(samePairRoute(route,SixPairSelection.withBaseline(()=>replayRoute(route))));assert.equal(routeHazardCosts(route).at(-1)||0,0);
 assert(holds.filter(h=>h.type==='hazard').every(h=>!h.wide&&!initialGrips.includes(h)));
 assert(report.hearts.actual.first<=recipe.heartsFirst);assert(report.hearts.actual.second<=recipe.heartsSecond);
 assert.equal(hearts.length,report.hearts.actual.total,'Visible hearts must match adopted caps at stage '+stage+': '+JSON.stringify({hearts,recipe,identityMatches:generatedCourse?.holds===holds,recipeHearts:generatedCourse?.hearts,actual:report.hearts.actual}));if(recipe.length==='short')assert(hearts.length<=1,'Approved short-course rule permits at most one heart');
 assert.deepEqual(hearts,report.hearts.placements.map(({id,x,y})=>({id,x,y,collected:false})));
 assert.equal(generatedCourse.holds,holds,'Post-pruning recipe cache must bind final hold array');
 const adjustment=report.stamina.adjustment;assert.equal(stamina,routeExpectedMoves()+3-adjustment.appliedReduction);assert.equal(adjustment.cap,hearts.length*2+1);
 const fixed=JSON.stringify({holds,route,hearts,stamina});reset(stage);assert.equal(JSON.stringify({holds,route,hearts,stamina}),fixed);
 generationReport.push({stage,hazards:report.spikes.count,hearts:hearts.length,stamina});
}
// Focused new-contact costs: ordinary move +1 per hazard, not per support selection.
function fixture(two=false) {
 reset(1);cameraIntro=null;resetCharacterAnimation();
 body={x:200,y:300};committed={...body};camera=0;stamina=10;moveCount=0;hearts=[];
 const hands=[{id:0,x:148,y:232,type:'normal'},{id:1,x:252,y:232,type:'normal'}];
 const feet=[{id:2,x:160,y:378,type:'normal'},{id:3,x:240,y:378,type:'normal'}];
 const targets=[{id:4,x:160,y:388,type:'hazard'},{id:5,x:240,y:388,type:two?'hazard':'normal'}];
 holds=[...hands,...feet,...targets];grips=[...hands,...feet];startGrips=[...grips];initialGrips=[...grips];
 return targets;
}
// Deterministic contact-boundary fixture: choose a valid support pair and endpoint
// explicitly, then exercise the production down snapshot / heart collection /
// release / Undo path. These are not end-to-end direction-selector assertions.
function reach(pair,p){
 down(eventAt(body));assert(drag);drag.anchor=pair;
 assert(pair.every(i=>limbReachable(p,startGrips[i],i)));
 const next=attachMoving(p,pair);assert(next?.every(Boolean));
 const previous={...body};body={...p};grips=next;collectHearts(previous,body);
}
// Also acquire a hazard through an actual current coupled pointer gesture.
const gestureTargets=fixture();let hazardAction=null;
for(let degree=0;degree<360 && !hazardAction;degree+=5)for(const length of [10,20,40,80,120]){
 const angle=degree*Math.PI/180,action=fingerAction([{dx:Math.cos(angle)*length,dy:Math.sin(angle)*length}]);
 const result=coupledGestureReplay(body,startGrips,action);
 if(result?.stance.includes(gestureTargets[0]) && !result.cancelAtOrigin){hazardAction=action;break;}
}
assert(hazardAction,'Fixture must expose an actually reachable hazard with the current selector');
down(eventAt(body));const gestureOrigin={...drag.fingerOrigin};
for(const p of hazardAction.points)move({clientX:gestureOrigin.x+p.dx,clientY:gestureOrigin.y+p.dy});
assert(grips.includes(gestureTargets[0]));release();assert.equal(stamina,8);
assert(lastFingerGesture.accepted);assert(undoMove());assert.equal(stamina,10);

let targets=fixture();reach([0,1],{x:200,y:310});assert(grips.includes(targets[0]));release(true);assert.equal(stamina,10);
reach([0,1],{x:200,y:310});grips[3]=null;release();assert.equal(stamina,10,'Invalid move charges penalty');
reach([0,1],{x:200,y:310});release();assert.equal(stamina,8);assert(undoMove());assert.equal(stamina,10);
targets=fixture(true);reach([0,1],{x:200,y:310});release();assert.equal(stamina,7,'Two hazards must cost 2 extra');
holds.push({id:6,x:148,y:220,type:'normal'},{id:7,x:252,y:220,type:'normal'});
reach([2,3],{x:200,y:288});release();assert.equal(stamina,6,'Keeping hazard contacts charges twice');
holds.push({id:8,x:160,y:366,type:'normal'},{id:9,x:240,y:366,type:'normal'});
reach([0,1],{x:200,y:286});release();assert.equal(stamina,5);
stamina=1;
reach([0,1],{x:200,y:310});release();assert.equal(stamina,0);assert.equal(state,'lost');
assert(undoMove());assert.equal(stamina,1,'Undo does not refund the whole move');
fixture();hearts=[{id:0,x:200,y:310,collected:false}];reach([0,1],{x:200,y:310});release();assert.equal(stamina,10);
assert(undoMove());assert(hearts[0].collected);assert.equal(stamina,12,'Hazard Undo loses permanent heart recovery');
// Feedback only for committed new contacts; body motion stays visual.
fixture();heartPopups=[];reach([0,1],{x:200,y:310});release(true);
assert.equal(hazardShakeStart,null);assert.equal(heartPopups.length,0);
reach([0,1],{x:200,y:310});release();
assert.equal(HAZARD_CONFIG.penalty,1);
assert.equal(heartPopups.length,1);assert.equal(heartPopups[0].text,'-1');
const popup=heartPopups[0],shakeStart=hazardShakeStart,logicalBody={...body},contacts=[...grips];
assert.equal(hazardShakeOffset(shakeStart),0);
assert(Math.abs(hazardShakeOffset(shakeStart+30))>0);
assert.deepEqual(body,logicalBody);assert.deepEqual(grips,contacts);
const labels=[];ctx.fillText=(text,x,y)=>labels.push({text,x,y,color:ctx.fillStyle,alpha:ctx.globalAlpha});
drawHeartPopups(popup.start+500);
assert.equal(labels[0].text,'-1');assert.equal(labels[0].color,'#9442be');
assert.equal(labels[0].x,popup.x);assert(Math.abs(labels[0].y-(popup.y-15))<1e-8);
assert(Math.abs(labels[0].alpha-.5)<1e-8);
drawHeartPopups(popup.start+1001);assert.equal(heartPopups.length,0);
assert.equal(hazardShakeOffset(shakeStart+281),0);assert.equal(hazardShakeStart,null);
assert(undoMove());assert.equal(hazardShakeStart,null);
// Maintaining existing hazards does not restart the burst or duplicate labels.
fixture(true);reach([0,1],{x:200,y:310});release();
assert.equal(heartPopups.length,2);const burstStart=hazardShakeStart;
holds.push({id:6,x:148,y:220,type:'normal'},{id:7,x:252,y:220,type:'normal'});
reach([2,3],{x:200,y:288});release();assert.equal(heartPopups.length,2);assert.equal(hazardShakeStart,burstStart);
undoMove();assert.equal(hazardShakeStart,null);assert.equal(heartPopups.length,0);
// A different limb taking the same occupied hazard pays again, even if
// the set of contact positions is unchanged (the old no-op shortcut).
fixture();reach([0,1],{x:200,y:310});release();assert.equal(stamina,8);
const beforeTransfer=[...grips];
function transferFeet(cancel=false,invalid=false) {
    reach([0,1],{...body});
    [grips[2],grips[3]]=[startGrips[3],startGrips[2]];
    assert(grips.every((h,i)=>limbReachable(body,h,i)));
    assert(sameContacts(grips,startGrips));
    if(invalid)grips[0]=null;
    release(cancel);
}
heartPopups=[];hazardShakeStart=null;
transferFeet(true);assert.equal(stamina,8);assert.deepEqual(grips,beforeTransfer);assert.equal(heartPopups.length,0);
transferFeet(false,true);assert.equal(stamina,8);assert.deepEqual(grips,beforeTransfer);assert.equal(hazardShakeStart,null);
transferFeet();assert.equal(stamina,6);assert.equal(moveCount,2);
assert.equal(grips[3],beforeTransfer[2]);assert.equal(heartPopups.length,1);assert.notEqual(hazardShakeStart,null);
assert(undoMove());assert.equal(stamina,8);assert.deepEqual(grips,beforeTransfer);
transferFeet();assert.equal(stamina,6);transferFeet();assert.equal(stamina,4);
assert.equal(heartPopups.length,2,'Each limb handoff must show a fresh penalty');
// The unloaded-image fallback retains a vector silhouette, independent of emoji fonts.
const points=[];ctx.moveTo=(x,y)=>points.push({x,y});ctx.lineTo=(x,y)=>points.push({x,y});
drawJaggedHold(100,200,HAZARD_CONFIG.radius,'#9442be');assert.equal(points.length,16);assert.equal(ctx.fillStyle,'#9442be');
assert(HAZARD_CONFIG.radius<8);
points.forEach((p,i)=>assert(Math.abs(distance(p,{x:100,y:200})-HAZARD_CONFIG.radius*(i%2?.66:1))<1e-8));
const originalPlaySound=playSound,emitted=[];playSound=name=>emitted.push(name);
fixture();down(eventAt(body));const soundOrigin={...drag.fingerOrigin};
for(const p of hazardAction.points)move({clientX:soundOrigin.x+p.dx,clientY:soundOrigin.y+p.dy});
assert.deepEqual(emitted,[],'No normal preview before hazard confirmation');release();assert.deepEqual(emitted,['hazard'],'Hazard replaces the normal move/contact cue');playSound=originalPlaySound;
console.log('PASS hazards: actual v5 spikes preserve reference and heart caps; deterministic retry, contact transitions, cancel, stacked costs, zero clamp, Undo and heart recovery; purple penalty, sound and vector loading fallback');
console.log(JSON.stringify(generationReport));
`)(assert);
