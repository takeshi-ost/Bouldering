'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
new Function('assert',env+source+`
const report=[],rejections=[];
const boundaryScores={1:1,20:20,21:21,80:40,81:35,200:45,201:40,400:50,401:50};
for(const n of [1,20,21,55,80,81,200,201,400,401]) {
 dailyRun=null;try{reset(n);}catch(error){rejections.push({stage:n,error:String(error.message||error)});continue;}
 assert.equal(level,n);assert.equal(courseSeed(),n+10);
 const resolved=CourseProgression.resolveStage(n),recipe=CourseProgression.recipe(resolved);
 if(n in boundaryScores)assert.equal(resolved.score,boundaryScores[n],'approved current boundary score');
 assert.equal(activeCourseGeneration.resolved.score,resolved.score);
 assert.equal(activeCourseGeneration.recipe.seed,activeCourseGeneration.retry.geometrySeed);assert.equal(activeCourseGeneration.retry.initialSeed,n+10);assert.equal(activeCourseGeneration.recipe.type,recipe.type);
 for(const key of ['length','composition','secondType','heartsFirst','heartsSecond','spikePercent','generationScore','distributionVersion'])assert.equal(activeCourseGeneration.recipe[key],recipe[key],key+' changed during geometry retry');
 assert.equal(courseTypeLabel(courseTypeId),resolved.difficultyLabel);
 assert.equal(HEIGHT,stageLengthInfo(n).height);assert.equal(mapStageVariant(n).height,HEIGHT===H?'100':HEIGHT===2*H?'125':'150');
 assert.equal(generatedCourse.level,n);assert.equal(generatedCourse.seed,n+10);assert.equal(generatedCourse.holds,holds);
 assert.equal(hearts.length,activeCourseGeneration.report.hearts.actual.total);
 assert.equal(stamina,routeExpectedMoves()+3-activeCourseGeneration.report.hearts.staminaAdjustment.appliedReduction);
 assert(samePairRoute(route,replayRoute(route)),'restored stage identity rejects valid profile '+n);
 const stable=JSON.stringify({holds,route,hearts,stamina,level,difficulty}),active=activeCourseGeneration;
 const preview=stagePreview(n);assert.equal(preview.stamina,stamina);assert.equal(preview.height,HEIGHT);
 assert.equal(JSON.stringify({holds,route,hearts,stamina,level,difficulty}),stable);assert.equal(activeCourseGeneration,active);
 reset(n);assert.equal(JSON.stringify({holds,route,hearts,stamina,level,difficulty}),stable);
 const base=stamina;reset(n,4);assert.equal(stamina,base+4,'existing item bonus added once');
 report.push({stage:n,score:resolved.score,label:resolved.difficultyLabel,length:recipe.length,type:recipe.type,hearts:hearts.length});
}
// A failed preview must not erase collected hearts, course geometry or metadata.
reset(55);hearts.push({id:'collected-rollback-fixture',collected:true});
const saved={hearts,holds,route,generatedCourse,activeCourseGeneration,level,difficulty,courseTypeId,stamina};
const generateBefore=labGenerateSkeleton;
try {labGenerateSkeleton=()=>{holds=[];route=[];hearts=[];throw Error('injected generation failure');};assert.throws(()=>stagePreview(777),/injected generation failure/);}
finally {labGenerateSkeleton=generateBefore;}
assert.deepEqual({hearts,holds,route,generatedCourse,activeCourseGeneration,level,difficulty,courseTypeId,stamina},saved);
assert.equal(hearts,saved.hearts);assert.equal(holds,saved.holds);assert.equal(route,saved.route);assert(hearts.at(-1).collected);
// v1 records remain archived instead of being erased/relabelled by a v4 clear.
stageRecords.existing[55]={moves:3,timeMs:1234,stars:3,version:'v1',scoreSpecVersion:'v1'};
moveCount=10;runElapsedMs=3000;recordStageClear();
assert.equal(stageRecords.existing[55].version,'v4');assert.equal(stageRecords.existing[55].stars,clearStars(moveCount,routeExpectedMoves()));
assert.equal(stageRecords.existing[55].previousVersions.v1.moves,3);assert.equal(stageRecords.existing[55].previousVersions.v1.scoreSpecVersion,'v1');
console.log('PASS generated boundary course invariants, map/preview/play/retry consistency, exact hearts/stamina, item bonus, failed-preview rollback, v1 archive');
console.log(JSON.stringify({generated:report,rejections}));
assert.deepEqual(rejections,[],'Official fixed stages must generate under the approved fixed-recipe retry policy');
`)(assert);
