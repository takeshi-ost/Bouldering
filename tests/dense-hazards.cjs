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
const report=[];
for(const mode of ['existing','prototype'])for(const n of [40,41,42,45,80]) {
 courseMode=mode;reset(n);cameraIntro=null;
 const blue=holds.filter(h=>h.type==='hazard'),ratio=blue.length/holds.length;
 assert(ratio>=.3 && ratio<=.5,mode+' Lv'+n+' ratio '+ratio);
 assert(blue.length>5);assert(initialGrips.every(h=>h.type!=='hazard'));
 assert(blue.every(h=>!h.wide));assert(holds.some(h=>h.type==='goal'));
 assert(samePairRoute(route,replayRoute(route)));
 const saved=JSON.stringify({holds,route,hearts}),starting=stamina;
 // Conversion changes type only; normal geometry replays the identical route.
 blue.forEach(h=>h.type='normal');assert(samePairRoute(route,replayRoute(route)));
 blue.forEach(h=>h.type='hazard');
 const moves=route.length-1,base=stageStamina(moves);
 let paid=0,pickups=0;
 for(let i=1;i<route.length;i++) {
  assert(stamina>0,mode+' Lv'+n+' cannot start move '+i);
  camera=clamp(body.y-H*.6,0,HEIGHT-H);
  const eventAt=p=>({clientX:p.x,clientY:p.y-camera});
  const before=[...grips],beforeStamina=stamina,beforeHearts=hearts.filter(h=>h.collected).length;
  down(eventAt(body));move(eventAt(route[i]));release();
  assert.equal(moveCount,i);assert.notEqual(state,'lost');
  const fresh=grips.filter((h,j)=>h.type==='hazard' && before[j]!==h).length;
  paid+=fresh;
  const gained=(hearts.filter(h=>h.collected).length-beforeHearts)*2;pickups+=gained;
  assert.equal(stamina,beforeStamina+gained-1-fresh);
 }
 assert(paid>0,'Dense stage must include penalties on the planned route');
 assert.equal(state,'won');assert.equal(pickups,hearts.length*2);
 assert.equal(routeExpectedMoves(),moves+paid);assert.equal(starting,moves+paid+3);
 assert.equal(stamina,3+pickups);
 assert.equal(routeHazardCosts(route).at(-1),paid);
 debugMode=true;updateUI();assert(ui.progress.textContent.includes('想定 '+(moves+paid)+' 手'));debugMode=false;
 const expected=moves+paid;
 for(const [extra,stars] of [[0,3],[1,2],[2,2],[3,1]]) {
  moveCount=expected+extra;finish(true);
  assert.equal(ui.resultStars.textContent,'⭐️'.repeat(stars));assert.equal(stageRecords[mode][n].stars,3);
 }

 ui.retry.onclick();assert.equal(JSON.stringify({holds,route,hearts}),saved);assert.equal(stamina,starting);
 report.push({mode,level:n,total:holds.length,blue:blue.length,moves,penalties:paid,starting});
}
// Heart deadlines include early penalties in the expected-move budget.
level=40;initialGrips=[];holds=Array.from({length:20},(_,id)=>({id,type:'hazard',x:id,y:0}));
const path=Array.from({length:11},(_,i)=>({x:200,y:700-i*40,grips:[i*2%20,(i*2+1)%20]}));
for(let n=40;n<100;n++) {
 const items=createHearts(n,path),costs=routeHazardCosts(path);
 let budget=routeStamina(path);
 for(let i=1;i<path.length;i++) {
  assert(budget>0);
  for(const h of items)if(!h.collected && torsoTouchesHeart(path[i-1],path[i],h)){h.collected=true;budget+=2;}
  budget-=1+costs[i]-costs[i-1];
  assert(budget>=0);
 }
 assert(items.every(h=>h.collected));
}
console.log('PASS dense hazards: both courses Lv40/41/42/45/80, 30-50% of all holds, protected start/wide/goal, unchanged replay, exact live costs, early hearts, complete clears, seeded retries');
console.log(JSON.stringify(report));
`)(assert);
