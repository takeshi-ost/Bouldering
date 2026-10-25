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
function play(i){camera=clamp(body.y-H*.6,0,HEIGHT-H);down(eventAt(body));move(eventAt(route[i]));release();assert.equal(moveCount,i);}
// Final cost-aware route, playable optional branches, real budget and retry.
const report=[];
const applyRecipe=applyRouteHazards;
let consumptionRecipes=0;
applyRouteHazards=(path,intent,salt)=>{
 const accepted=applyRecipe(path,intent,salt);
 if(accepted && difficulty===2 && intent==='consumption') {
  const extra=routeHazardCosts(path).at(-1)||0;
  assert(extra>=3 && extra<=5,'Consumption recipe must target 3–5 extra stamina');
  consumptionRecipes++;
 }
 return accepted;
};
for(const mode of ['existing','prototype'])for(const n of [19,20,21,22,23]) {
 courseMode=mode;reset(n);cameraIntro=null;
 const hazards=holds.filter(h=>h.type==='hazard');
 assert(hazards.length<=5);if(n<20)assert.equal(hazards.length,0);

 assert(hazards.every(h=>!h.wide && h.type!=='start' && !insideStartTriangle(h,initialGrips)));
 const all=holds,saved=JSON.stringify({holds,route,hearts});
 const baseBody={...body},baseCommitted={...committed},baseStance=startGrips;
 assert(samePairRoute(route,replayRoute(route)),'Hazards change the validated free route');
 assert(densityStats.courseGeneration.resources.valid);
 if(mode==='existing' && n===23){assert.equal(hazards.length,3);assert.equal(routeResources(route).penalties,3);}
 assert.deepEqual(body,baseBody);assert.deepEqual(committed,baseCommitted);assert.equal(startGrips,baseStance);
 assert(validateRouteBudget(route));
 assert(densityStats.routeOptimization.costAfter<=densityStats.routeOptimization.costBefore);
 // On Lv20, actually enter one optional branch through down/move/release.
 if(n===20) {
  const option=findHazardMove(hazards[0]);
  if(option) {
  for(let i=1;i<=option.step;i++)play(i);
  camera=clamp(body.y-H*.6,0,HEIGHT-H);
  down(eventAt(body));const snapshot=moveSnapshot;move(eventAt(option.to));
  assert(grips.includes(hazards[0]));const fresh=new Set(grips.filter((h,i)=>h.type==='hazard' && h!==startGrips[i]));
  const gains=hearts.filter((h,i)=>h.collected&&!snapshot.collectedHearts[i]).length*2;
  release();assert.equal(stamina,Math.max(0,snapshot.stamina+gains-1-fresh.size*HAZARD_CONFIG.penalty));
  assert(undoMove());assert.equal(stamina,snapshot.stamina+gains);
  reset(n);cameraIntro=null;
  }
 }
 for(let i=1;i<route.length;i++)play(i);
 assert.equal(state,'won');assert.equal(stamina,stageStamina(route.length-1)-(route.length-1)-routeHazardCosts(route).at(-1)+hearts.filter(h=>h.collected).length*2);
 assert(routeResources(route).valid);
 reset(n);assert.equal(JSON.stringify({holds,route,hearts}),saved);
 report.push({mode,level:n,count:hazards.length});
}
assert(consumptionRecipes>0);applyRouteHazards=applyRecipe;
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
function reach(pair,p){down(eventAt(body));drag.anchor=pair;move(eventAt(p));assert(grips.every(Boolean));}
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
fixture();reach([0,1],{x:200,y:310});assert.deepEqual(emitted,[],'No normal preview before hazard confirmation');release();assert.deepEqual(emitted,['hazard'],'Hazard replaces the normal move/contact cue');playSound=originalPlaySound;
console.log('PASS hazards: Lv19 boundary, 0-5 seeded placement, optional real moves, free-route clears in both courses, retry, contact transitions, cancel, stacked costs, zero clamp, Undo and heart recovery; purple penalty and vector loading fallback');
console.log(JSON.stringify(report));
`)(assert);
