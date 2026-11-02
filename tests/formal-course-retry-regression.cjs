'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
// Instrument only the pure sampler entry, not production behavior or its RNG.
const marker='function recipe(resolved) {';assert.equal(source.split(marker).length,2);
source=source.replace(marker,marker+' formalRetrySampleCount++; if(formalLegacySampler)return {...CourseDistribution.sampleLegacyV5(resolved.score,resolved.seed),seed:resolved.seed};');
const env=`
let formalRetrySampleCount=0,formalLegacySampler=false;
const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
new Function('assert',env+source+`
// Historical pre-offset identity fixture; current offset behavior has its own suite.
const savedNormalSeedOffset=CourseProgressionConfig.normalSeedOffset;
CourseProgressionConfig.normalSeedOffset=0;
try {
const fields=['type','length','composition','secondType','heartsFirst','heartsSecond','spikePercent','generationScore','distributionVersion'];
const fingerprint=()=>JSON.stringify({holds,route,hearts,stamina,level,difficulty,courseTypeId,seed:courseSeed(),recipe:activeCourseGeneration.recipe,retry:activeCourseGeneration.retry});
const real=[];
// Historical course-v2 / distribution-v5 rejection fixtures: preserve the exact old sampled
// recipes independently of the current editable progression defaults.
const currentSegments=CourseProgressionConfig.stageSegments,currentTail=CourseProgressionConfig.afterLastStageScore;
CourseProgressionConfig.stageSegments=[
 {fromStage:1,toStage:20,fromScore:1,toScore:10},
 {fromStage:21,toStage:80,fromScore:11,toScore:30},
 {fromStage:81,toStage:200,fromScore:30,toScore:40},
 {fromStage:201,toStage:400,interpolationFromStage:200,fromScore:35,toScore:45}
];CourseProgressionConfig.afterLastStageScore=45;formalLegacySampler=true;
try {
for(const n of [148,154,163,181,237,269,350,352,362]){
 dailyRun=null;const expected=CourseProgression.recipe(CourseProgression.resolveStage(n));
 reset(n);const retry=activeCourseGeneration.retry;
 assert(retry.attempts>1&&retry.attempts<=32,'historical v2 rejected stage '+n+' must use bounded geometry retry');
 assert.equal(retry.initialSeed,n);assert.equal(retry.geometrySeed,(n+retry.attempts-1)>>>0);
 for(const key of fields)assert.equal(activeCourseGeneration.recipe[key],expected[key],key+' changed at stage '+n);
 assert.equal(level,n);assert.equal(courseSeed(),n);assert.equal(generatedCourse.level,n);assert.equal(generatedCourse.seed,n);
 assert.equal(activeCourseGeneration.recipe.seed,retry.geometrySeed);assert.equal(activeCourseGeneration.resolved.seed,n);assert.equal(generatedCourse.geometrySeed,retry.geometrySeed);assert.equal(generatedCourse.generationRetryVersion,'1');
 assert(samePairRoute(route,replayRoute(route)),'contact replay at stage '+n);
 assert.equal(hearts.length,activeCourseGeneration.report.hearts.actual.total);
 assert.equal(generatedCourse.holds,holds);
 const first=fingerprint();reset(n);assert.equal(fingerprint(),first,'same failed starting seed must resolve identically');
 real.push({stage:n,score:expected.generationScore,type:expected.type,length:expected.length,...retry});
}
} finally {formalLegacySampler=false;CourseProgressionConfig.stageSegments=currentSegments;CourseProgressionConfig.afterLastStageScore=currentTail;}
console.log('PASS remaining9 historical v2 rejected stages: fixed recipe, original+1 retries, exact repeat geometry and identity; no default-stamina solvability claim');console.log(JSON.stringify(real));
} finally {CourseProgressionConfig.normalSeedOffset=savedNormalSeedOffset;}
`)(assert);
