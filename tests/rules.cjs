const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('id="undo"') && !html.includes('id="changeCourse"'));
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const environment=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
new Function('assert',environment+source+`
const wide={x:200,y:220,id:1,type:'normal',wide:true};
for(let a=0;a<4;a++)for(let b=0;b<4;b++) {
 assert.equal(canShareHold(wide,a,b),a!==b && Math.floor(a/2)===Math.floor(b/2));
 assert.equal(canShareHold({...wide,wide:false},a,b),false);
 assert.equal(canShareHold({type:'goal'},a,b),a!==b && a<2 && b<2);
}
body={x:200,y:300};committed={...body};
const feet=[{x:160,y:378,id:2,type:'normal'},{x:240,y:378,id:3,type:'normal'}];
startGrips=[null,null,...feet];holds=[wide,...feet];
let attached=attachMoving(body,[2,3]);assert.equal(attached[0],wide);assert.equal(attached[1],wide);
startGrips=attached;
assert(supportsReachable(body,[0,1]),'Two hands on wide hold cannot support body');
const hands=[{x:148,y:232,id:4,type:'normal'},{x:252,y:232,id:5,type:'normal'}];
const wideFoot={...wide,y:380,id:6};startGrips=[...hands,null,null];holds=[...hands,wideFoot];
attached=attachMoving(body,[0,1]);assert.equal(attached[2],wideFoot);assert.equal(attached[3],wideFoot);
startGrips=attached;assert(supportsReachable(body,[2,3]),'Two feet on wide hold cannot support body');
// Without sharing, at most one moving hand may occupy the sole hand target.
wide.wide=false;startGrips=[null,null,...feet];holds=[wide,...feet];
attached=attachMoving(body,[2,3]);assert(attached.filter(h=>h===wide).length<=1);
// Actual input / release path, including visual restoration and terminal states.
startCourse('existing');assert.equal(state,'playing');
advanceCameraIntro(0);advanceCameraIntro(1650);assert.equal(ui.undo.disabled,true);
function playStep(step) {
 camera=clamp(body.y-H*.6,0,HEIGHT-H);
 const event=p=>({clientX:p.x,clientY:p.y-camera});
 down(event(body));const snapshot=moveSnapshot;
 move(event(step));release();return snapshot;
}
function checkUndo(snapshot) {
 const stage=holds,routeBefore=route;
 assert.equal(undoMove(),true);assert.equal(state,'playing');
 assert.deepEqual(body,snapshot.body);assert.deepEqual(grips,snapshot.grips);
 assert.equal(stamina,snapshot.stamina);assert.equal(moveCount,snapshot.moveCount);
 assert.deepEqual(playerPath,snapshot.playerPath);
 assert.deepEqual(characterPose(performance.now()).body,snapshot.visibleBody);
 assert.equal(holds,stage);assert.equal(route,routeBefore);
 assert(ui.overlay.hidden);assert(ui.undo.disabled);assert.equal(undoMove(),false);
}
const first=playStep(route[1]);assert.equal(moveCount,1);checkUndo(first);
// A new confirmed move replenishes Undo; canceled input must not replace it.
playStep(route[1]);const savedUndo=undoSnapshot;
down({clientX:body.x,clientY:body.y-camera});release(true);assert.equal(undoSnapshot,savedUndo);
checkUndo(savedUndo);
// Loss on the last stamina point is reversible.
stamina=1;const losing=playStep(route[1]);assert.equal(state,'lost');checkUndo(losing);
reset(1);assert.equal(undoSnapshot,null);advanceCameraIntro(0);advanceCameraIntro(1650);
let winning;
for(let i=1;i<route.length;i++)winning=playStep(route[i]);
assert.equal(state,'won');checkUndo(winning);
reset(2);assert.equal(undoSnapshot,null);assert.equal(ui.undo.disabled,true);
// Bonus first, total remaining carried forward exactly once, no retry farming.
reset(1,3);const regular=stamina-bonusStamina;
assert.equal(ui.stamina.textContent,regular+'+3');
const bonusMove=playStep(route[1]);
assert.equal(bonusStamina,2);assert.equal(stamina-bonusStamina,regular);
checkUndo(bonusMove);assert.equal(bonusStamina,3);
for(let i=1;i<route.length;i++) {
 const beforeBonus=bonusStamina,beforeRegular=stamina-bonusStamina;
 playStep(route[i]);
 assert.equal(bonusStamina,Math.max(0,beforeBonus-1));
 assert.equal(stamina-bonusStamina,beforeRegular-(beforeBonus===0?1:0));
}
assert.equal(state,'won');draw(2000);const earned=stamina;
ui.next.onclick();assert.equal(level,2);assert.equal(stageBonus,earned);assert.equal(bonusStamina,earned);
const nextBudget=route.length-1+STAGE_CONFIG.spareMoves;
assert.equal(ui.stamina.textContent,nextBudget+'+'+earned);
ui.next.onclick();assert.equal(level,2,'Repeated Next advances or awards twice');
advanceCameraIntro(0);advanceCameraIntro(1650);playStep(route[1]);
ui.retry.onclick();assert.equal(bonusStamina,earned);assert.equal(stamina,nextBudget+earned);
startCourse('prototype');assert.equal(stageBonus,0);assert.equal(bonusStamina,0);
assert(ui.level.innerHTML.includes('ロジハラコース'));
startCourse('existing');assert(ui.level.innerHTML.includes('ノーマルコース'));
console.log('PASS bonus carryover, bonus-first spending, Undo, retry, Next guard, course labels');
console.log('PASS Undo: actual input, single use, rearming, cancel, loss, win, reset, visible pose; wide holds: hands/feet sharing and mixed exclusion');
`)(assert);
