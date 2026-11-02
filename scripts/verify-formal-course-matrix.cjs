'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.join(__dirname,'..'),args=process.argv.slice(2),repeat=args.includes('--repeat');
const output=args.find(arg=>!arg.startsWith('--'));
for(const arg of args)if(arg.startsWith('--')&&arg!=='--repeat')throw Error('Unknown option: '+arg);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
const result=new Function('assert','createHash','repeat',env+source+`
const report=[];
function generateAndVerify(n){
 dailyRun=null;const expected=CourseProgression.recipe(CourseProgression.resolveStage(n));reset(n);
 assert(samePairRoute(route,replayRoute(route)));assert.equal(hearts.length,activeCourseGeneration.report.hearts.actual.total);
 const {seed:originalSeed,...expectedFields}=expected,{seed:geometrySeed,...actualFields}=activeCourseGeneration.recipe;
 assert.deepEqual(actualFields,{...expectedFields,stage:n,staminaRules:COURSE_STAMINA_CONFIG.rules},'Frozen sampled fields changed');
 const retry=activeCourseGeneration.retry;
 assert(Number.isSafeInteger(retry.attempts)&&retry.attempts>=1&&retry.attempts<=COURSE_RETRY_CONFIG.maxAttempts);
 assert.equal(retry.maxAttempts,COURSE_RETRY_CONFIG.maxAttempts);assert.equal(retry.version,COURSE_RETRY_CONFIG.version);
 assert.equal(retry.initialSeed,originalSeed);assert.equal(retry.geometrySeed,(originalSeed+retry.attempts-1)>>>0);
 assert.equal(geometrySeed,retry.geometrySeed);assert.equal(activeCourseGeneration.report.seed,geometrySeed);
 assert.equal(activeCourseGeneration.resolved.seed,originalSeed);assert.equal(courseSeed(),originalSeed);assert.equal(level,n);
 assert.equal(generatedCourse.seed,originalSeed);assert.equal(generatedCourse.level,n);assert.equal(generatedCourse.geometrySeed,geometrySeed);assert.equal(generatedCourse.generationRetryVersion,retry.version);
 const digest=createHash('sha256').update(JSON.stringify({holds,route,hearts,HEIGHT,initialGrips,stamina})).digest('hex');
 return {stage:n,score:activeCourseGeneration.resolved.score,type:activeCourseGeneration.recipe.type,length:activeCourseGeneration.recipe.length,ok:true,hearts:hearts.length,stamina,retry,geometrySha256:digest};
}
for(let n=1;n<=401;n++) {
 try {report.push(generateAndVerify(n));}
 catch(error){report.push({stage:n,ok:false,error:String(error.message||error)});}
 if(n%25===0)console.log('checked',n,'failures',report.filter(r=>!r.ok).length);
}
if(repeat){
 let checked=0;
 for(const previous of [...report].reverse()){
  if(!previous.ok)continue;
  try {const next=generateAndVerify(previous.stage);assert.equal(next.geometrySha256,previous.geometrySha256,'Geometry changed in reverse-order repeat');assert.deepEqual(next.retry,previous.retry);previous.repeat={ok:true,order:'reverse',geometrySha256:next.geometrySha256};}
  catch(error){previous.ok=false;previous.repeat={ok:false,error:String(error.message||error)};previous.error=previous.repeat.error;}
  checked++;if(checked%25===0)console.log('reverse checked',checked,'failures',report.filter(r=>!r.ok).length);
 }
}
return report;
`)(assert,createHash,repeat);
if(output)fs.writeFileSync(path.resolve(output),JSON.stringify(result,null,2));
console.log(JSON.stringify({scope:'fixed-recipe generation/contact replay; not default-stamina solvability',generated:result.filter(r=>r.ok).length,repeatMode:repeat?'reverse':null,repeated:result.filter(r=>r.repeat?.ok).length,retried:result.filter(r=>r.ok&&r.retry.attempts>1).map(r=>({stage:r.stage,...r.retry})),maxAttempts:Math.max(0,...result.filter(r=>r.ok).map(r=>r.retry.attempts)),rejected:result.filter(r=>!r.ok)}));
process.exitCode=result.every(r=>r.ok)?0:1;
