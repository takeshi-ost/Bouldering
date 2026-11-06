const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},contains(){return true;},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
new Function('assert',env+source+`
for(const stage of [1,4,5,19,20,39,40,80,81,200,201,400,500]){const id=courseTypeForStage(stage);assert.equal(courseTypeLabel(id),CourseProgression.labelForScore(CourseProgression.stageScore(stage)));assert.equal(difficultyForStage(stage),courseTypeRule(id).generationDifficulty);}
for(const weights of [[],[1,2,3],[-1,1,1,1],[NaN,1,1,1],[Infinity,1,1,1],['1',1,1,1],[1,,,,]])assert.throws(()=>weightedItemId(DIFFICULTY_RULES,weights,1));
for(const stage of [-1,1.2,NaN])assert.throws(()=>difficultyForStage(stage));
for(let selected=0;selected<4;selected++)for(let seed=0;seed<100;seed++)assert.equal(weightedItemId(DIFFICULTY_RULES,[0,1,2,3].map(n=>n===selected?100:0),seed),selected);
const counts=[0,0,0,0];for(let seed=0;seed<10000;seed++){const d=weightedItemId(DIFFICULTY_RULES,[10,20,30,40],seed);counts[d]++;assert.equal(weightedItemId(DIFFICULTY_RULES,[1,2,3,4],seed),d);}
for(let i=0;i<4;i++)assert(Math.abs(counts[i]-(i+1)*1000)<180);
for(let day=1;day<=28;day++){const p=dailyProfile('2026-02-'+String(day).padStart(2,'0'));assert.equal(p.generationScore,CourseProgression.dailyScore(p.date));assert.equal(courseTypeLabel(p.typeId),CourseProgression.labelForScore(p.generationScore));assert([2,3].includes(p.difficulty));}
const forceType=id=>{debugMode=true;debugAttempt=true;debugCourseTrial={typeId:id,lengthCategory:'short',seed:40};};
// Force dense hazards on STAGE 1: progression must not disable a selected rule set.
forceType(6);reset(1);cameraIntro=null;
assert.equal(difficulty,3);const count=holds.filter(h=>h.type==='hazard').length;assert(count>=Math.ceil(holds.length*.1) && count<=Math.floor(holds.length*.3));
for(let i=1;i<route.length;i++){
 camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);const origin={x:body.x,y:body.y-camera};
 const e=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});
 assert(validFingerAction(route[i].action));down(e({dx:0,dy:0}));
 for(const point of route[i].action.points)move(e(point));release();assert.equal(moveCount,i);
}
assert.equal(state,'won');
const sample=Array.from({length:9},(_,i)=>({x:200,y:800-i*80}));
for(const d of [0,1,2,3]){
 const found=new Set();for(let n=1;n<100;n++){debugCourseTrial.seed=n;generatedCourse=null;found.add(createHearts(n,sample,d).length);}
 assert.deepEqual([...found].sort(),d===0?[0]:[0,1,2]);
}
// Force difficulty 0 on a late stage: neither hearts nor blue holds should appear.
forceType(0);reset(40);assert.equal(difficulty,0);assert.equal(hearts.length,0);assert(!holds.some(h=>h.type==='hazard'));
const snapshot=JSON.stringify({holds,route,hearts,stamina,difficulty});reset(40);assert.equal(JSON.stringify({holds,route,hearts,stamina,difficulty}),snapshot);
debugCourseTrial=null;debugAttempt=false;debugMode=false;
console.log('PASS weighted difficulties: integer-score labels, normalized legacy debug ratios, deterministic stage/day selection, dense early-stage clear, late-stage rule removal and stable retry');
`)(assert);
