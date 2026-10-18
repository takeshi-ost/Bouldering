const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!html.includes('id="resultTag"') && !html.includes('id="resultText"'));
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
let clock=100;const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},setAttribute(){},addEventListener(k,fn){this.events[k]=fn;},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try {
new Function('assert','data','storage',env+source+`
function play(i){camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});down(e(body));move(e(route[i]));release();assert.equal(moveCount,i);}
function begin(n=1){reset(n);advanceCameraIntro(clock);clock+=1000;advanceCameraIntro(clock);assert(!cameraIntro);}
reset(1);assert.equal(runTimeMs(),0);advanceCameraIntro(100);clock=1099;advanceCameraIntro(clock);
assert(cameraIntro);assert.equal(runStartedAt,null);assert.equal(runTimeMs(),0);
clock=1100;advanceCameraIntro(clock);assert(!cameraIntro);assert.equal(runStartedAt,1100);
clock=6100;assert.equal(runTimeMs(),5000);
down({clientX:body.x,clientY:body.y-camera});clock+=1000;release(true);
assert.equal(moveCount,0);assert.equal(runTimeMs(),6000,'Canceled drag must not erase time');
clock=8100;play(1);const usedTime=runTimeMs();assert(undoMove());assert.equal(runTimeMs(),usedTime,'Undo must not erase time');
for(let i=1;i<route.length;i++){clock+=1234;play(i);}
assert.equal(state,'won');assert(ui.overlay.open && !ui.overlay.hidden);assert(!ui.next.hidden);
assert.equal(ui.resultStats.hidden,false);assert(!ui.resultStars.hidden);assert.equal(ui.resultStars.textContent,'⭐️⭐️⭐️');
const result={moves:moveCount,timeMs:Math.floor(clock-1100),stars:3};
assert.deepEqual(stageRecords.existing[1],result);
assert.equal(ui.resultStats.textContent,formatStageRecord(result));
assert.equal(formatClearTime(0),'00:00:00');assert.equal(formatClearTime(999),'00:00:99');
assert.equal(formatClearTime(60000),'01:00:00');assert.equal(formatClearTime(61029),'01:01:02');
assert.equal(formatClearTime(3600010),'60:00:01');
clock+=30000;assert.equal(runTimeMs(),result.timeMs,'Result wait must not count');
let canceled=false;ui.overlay.events.cancel({preventDefault(){canceled=true;}});assert(canceled && ui.overlay.open);
beginPointer({clientX:body.x,clientY:body.y-camera});assert.equal(bodyTap,null);assert.equal(canScrollStage(),false);
ui.next.onclick();assert.equal(state,'map');assert(!ui.overlay.open && ui.overlay.hidden);
advanceLevelMap(clock);advanceLevelMap(clock+MAP_HOP_DURATION);
assert(!ui.mapNodes.innerHTML.includes(formatStageRecord(result)));assert(!ui.mapNodes.innerHTML.includes('map-record'));assert(ui.mapNodes.innerHTML.includes('map-node-stars'));assert(ui.mapNodes.innerHTML.includes('⭐️⭐️'));
assert.deepEqual(readStageRecords(),stageRecords);
const firstRecord=JSON.stringify(stageRecords.existing[1]);
// Failing and retrying never overwrite a completed record.
begin();stamina=1;clock+=500;play(1);assert.equal(state,'lost');assert(ui.overlay.open);assert(ui.resultStats.hidden);assert(ui.resultStars.hidden);assert.equal(ui.resultStars.textContent,'');
clock+=5000;assert.equal(runTimeMs(),500);assert.equal(JSON.stringify(stageRecords.existing[1]),firstRecord);
ui.retry.onclick();assert(!ui.overlay.open && ui.overlay.hidden);assert.equal(runStartedAt,null);assert.equal(runTimeMs(),0);
advanceCameraIntro(clock);clock+=1000;advanceCameraIntro(clock);
for(let i=1;i<route.length;i++){clock+=100;play(i);}
assert.equal(state,'won');assert.equal(stageRecords.existing[1].timeMs,100*moveCount,'Replay must replace with the latest record');
assert.notEqual(JSON.stringify(stageRecords.existing[1]),firstRecord);
const latest=JSON.stringify(stageRecords.existing);
// Separate course records, debug isolation, and unavailable storage.
courseMode='prototype';begin();for(let i=1;i<route.length;i++){clock+=200;play(i);}
assert(stageRecords.prototype[1]);assert.equal(JSON.stringify(stageRecords.existing),latest);
const before=JSON.stringify(stageRecords);debugAttempt=true;begin();for(let i=1;i<route.length;i++){clock+=10;play(i);}
assert.equal(JSON.stringify(stageRecords),before);debugAttempt=false;
const saved=data[RECORDS_KEY];data[RECORDS_KEY]='{broken';assert.deepEqual(readStageRecords(),{existing:{},prototype:{}});
data[RECORDS_KEY]=JSON.stringify({existing:{'1':{moves:2,timeMs:1234},'2':{moves:0,timeMs:0},'3':{moves:4,timeMs:-1},'4':{moves:4,timeMs:'123'},'__proto__':{},'1e2':{moves:2,timeMs:1}}});
assert.deepEqual(readStageRecords(),{existing:{'1':{moves:2,timeMs:1234}},prototype:{}});data[RECORDS_KEY]=saved;
const get=storage.getItem;storage.getItem=()=>{throw Error('blocked');};assert.deepEqual(readStageRecords(),{existing:{},prototype:{}});storage.getItem=get;
const set=storage.setItem;storage.setItem=()=>{throw Error('full');};
begin();for(let i=1;i<route.length;i++){clock+=10;play(i);}assert.equal(state,'won');assert(stageRecords.prototype[1]);storage.setItem=set;
assert.deepEqual(readStageRecords(),JSON.parse(saved),'Previously saved records must survive blocked writes');
`)(assert,data,storage);
new Function('assert',env+source+`
assert(stageRecords.existing[1] && stageRecords.prototype[1]);
startCourse('existing');assert(ui.mapNodes.innerHTML.includes('map-node-stars'));assert(!ui.mapNodes.innerHTML.includes('map-record'));
`)(assert);
assert(html.includes('<dialog class="overlay" id="overlay"'));
new Function('assert','data',env+source+`
for(const moves of [0,1,5,9,10,20,30,40,100])assert.equal(stageStamina(moves),moves+3);
for(const [difference,stars] of [[-1,3],[0,3],[1,2],[2,2],[3,1],[8,1]]) {
 reset(1);cameraIntro=null;debugAttempt=true;moveCount=route.length-1+difference;finish(true);
 assert.equal(ui.resultStars.textContent,'⭐️'.repeat(stars));assert(!ui.resultStars.hidden);
}
// Display labels use the selected rule profile, including daily runs.
for(const [value,label] of [[0,'EASY'],[1,'NORMAL'],[2,'NORMAL'],[3,'HARD']]) {
 difficulty=value;finish(true);
 assert.equal(difficultyLabel(value),label);
 assert.equal(ui.resultDifficulty.textContent,label);assert(!ui.resultDifficulty.hidden);
 debugMode=true;updateUI();assert(ui.progress.textContent.endsWith('/ '+label));
 dailyRun={...dailyProfile('2026-10-17'),difficulty:value,returnCourse:'existing'};
 finish(true);assert.equal(ui.resultDifficulty.textContent,label);assert(!ui.resultDifficulty.hidden);
 dailyRun=null;
}
finish(false);assert(ui.resultStars.hidden && ui.resultStars.textContent==='');
assert(ui.resultDifficulty.hidden);assert.equal(ui.resultDifficulty.textContent,'');
debugMode=false;
// Map stars retain the highest earned rating while moves/time remain the latest run.
debugAttempt=false;reset(1);moveCount=route.length-2;finish(true);assert.equal(stageRecords.existing[1].stars,3);
moveCount=route.length+2;finish(true);assert.equal(stageRecords.existing[1].stars,3);assert.equal(stageRecords.existing[1].moves,moveCount);
assert.equal(readStageRecords().existing[1].stars,3);
showLevelMap();assert(ui.mapNodes.innerHTML.includes('⭐️⭐️⭐️'));assert(ui.mapNodes.innerHTML.includes('3つ星'));
const savedRecords=data[RECORDS_KEY];
for(const stars of [0,4,1.5,'3',null]) {
 data[RECORDS_KEY]=JSON.stringify({existing:{'1':{moves:2,timeMs:100,stars}}});
 assert.deepEqual(readStageRecords().existing[1],{moves:2,timeMs:100});
}
data[RECORDS_KEY]=savedRecords;
`)(assert,data);
console.log('PASS results: centered native modal, background guards, intro-excluded timer, cancel/Undo timing, frozen results, formatting, latest per-course records, map labels, reload, legacy/invalid/blocked storage, debug isolation');
} finally {
 if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);
 else delete globalThis.localStorage;
}
