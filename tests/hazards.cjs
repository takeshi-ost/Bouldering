const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
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
// Real route preservation, no mandatory penalties, playable optional branches and retry.
const report=[];
for(const mode of ['existing','prototype'])for(const n of [19,20,21,22,23]) {
 courseMode=mode;reset(n);cameraIntro=null;
 const hazards=holds.filter(h=>h.type==='hazard');
 assert(hazards.length<=5);if(n<20)assert.equal(hazards.length,0);
 if(n===20)assert.equal(hazards.length,5);if(n===21)assert.equal(hazards.length,0);
 assert(hazards.every(h=>!h.wide && h.type!=='start' && !insideStartTriangle(h,initialGrips)));
 const all=holds,saved=JSON.stringify({holds,route,hearts});
 const baseBody={...body},baseCommitted={...committed},baseStance=startGrips;
 assert(samePairRoute(route,replayRoute(route)),'Hazards change the validated free route');
 for(const h of hazards)assert(findHazardMove(h),'Hazard cannot be grabbed by a real move');
 assert.deepEqual(body,baseBody);assert.deepEqual(committed,baseCommitted);assert.equal(startGrips,baseStance);
 holds=all.filter(h=>h.type!=='hazard');assert(samePairRoute(route,replayRoute(route)));holds=all;
 // On Lv20, actually enter one optional branch through down/move/release.
 if(n===20) {
  const option=findHazardMove(hazards[0]);
  for(let i=1;i<=option.step;i++)play(i);
  camera=clamp(body.y-H*.6,0,HEIGHT-H);
  down(eventAt(body));const snapshot=moveSnapshot;move(eventAt(option.to));
  assert(grips.includes(hazards[0]));const fresh=new Set(grips.filter(h=>h.type==='hazard' && !startGrips.includes(h)));
  const gains=hearts.filter((h,i)=>h.collected&&!snapshot.collectedHearts[i]).length*2;
  release();assert.equal(stamina,Math.max(0,snapshot.stamina+gains-1-fresh.size*2));
  assert(undoMove());assert.equal(stamina,snapshot.stamina+gains);
  reset(n);cameraIntro=null;
 }
 for(let i=1;i<route.length;i++)play(i);
 assert.equal(state,'won');assert.equal(stamina,Math.floor((route.length-1)/10));
 assert(grips.every(h=>h.type!=='hazard'));
 ui.retry.onclick();assert.equal(JSON.stringify({holds,route,hearts}),saved);
 report.push({mode,level:n,count:hazards.length});
}
// Focused new-contact costs: ordinary move +2 per hazard, not per support selection.
function fixture(two=false) {
 reset(1);cameraIntro=null;resetCharacterAnimation();
 body={x:200,y:300};committed={...body};camera=0;stamina=10;moveCount=0;hearts=[];
 const hands=[{id:0,x:148,y:232,type:'normal'},{id:1,x:252,y:232,type:'normal'}];
 const feet=[{id:2,x:160,y:378,type:'normal'},{id:3,x:240,y:378,type:'normal'}];
 const targets=[{id:4,x:160,y:388,type:'hazard'},{id:5,x:240,y:388,type:two?'hazard':'normal'}];
 holds=[...hands,...feet,...targets];grips=[...hands,...feet];startGrips=[...grips];initialGrips=[...grips];
 playerPath=[{...body}];return targets;
}
function reach(pair,p){down(eventAt(body));drag.anchor=pair;move(eventAt(p));assert(grips.every(Boolean));}
let targets=fixture();reach([0,1],{x:200,y:310});assert(grips.includes(targets[0]));release(true);assert.equal(stamina,10);
reach([0,1],{x:200,y:310});grips[3]=null;release();assert.equal(stamina,10,'Invalid move charges penalty');
reach([0,1],{x:200,y:310});release();assert.equal(stamina,7);assert(undoMove());assert.equal(stamina,10);
targets=fixture(true);reach([0,1],{x:200,y:310});release();assert.equal(stamina,5,'Two hazards must cost 4 extra');
holds.push({id:6,x:148,y:220,type:'normal'},{id:7,x:252,y:220,type:'normal'});
reach([2,3],{x:200,y:288});release();assert.equal(stamina,4,'Keeping hazard contacts charges twice');
holds.push({id:8,x:160,y:366,type:'normal'},{id:9,x:240,y:366,type:'normal'});
reach([0,1],{x:200,y:286});release();assert.equal(stamina,3);
reach([0,1],{x:200,y:310});release();assert.equal(stamina,0);assert.equal(state,'lost');
assert(undoMove());assert.equal(stamina,3,'Undo does not refund the whole move');
fixture();hearts=[{id:0,x:200,y:310,collected:false}];reach([0,1],{x:200,y:310});release();assert.equal(stamina,9);
assert(undoMove());assert(hearts[0].collected);assert.equal(stamina,12,'Hazard Undo loses permanent heart recovery');
// Distinct small jagged geometry and blue fill, independent of emoji fonts.
const points=[];ctx.moveTo=(x,y)=>points.push({x,y});ctx.lineTo=(x,y)=>points.push({x,y});
drawJaggedHold(100,200,HAZARD_CONFIG.radius,'#6099cf');assert.equal(points.length,16);assert.equal(ctx.fillStyle,'#6099cf');
assert(HAZARD_CONFIG.radius<8);
points.forEach((p,i)=>assert(Math.abs(distance(p,{x:100,y:200})-HAZARD_CONFIG.radius*(i%2?.66:1))<1e-8));
console.log('PASS hazards: Lv19 boundary, 0-5 seeded placement, optional real moves, free-route clears in both courses, retry, contact transitions, cancel, stacked costs, zero clamp, Undo and heart recovery; jagged blue drawing');
console.log(JSON.stringify(report));
`)(assert);
