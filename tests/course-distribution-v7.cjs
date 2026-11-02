'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function context(previous){
 const c=vm.createContext({});
 for(const file of ['course-progression-config','course-distribution-config'])vm.runInContext(read('js/'+file+'.js'),c);
 // Historical 0.4.13 onset comparison used stage SEEDs with offset 0.
 // Later selected offsets have separate current-generation regression tests.
 c.CourseProgressionConfig.normalSeedOffset=0;
 if(previous){c.CourseDistributionConfig.version='6';c.CourseDistributionConfig.tables.spikes.rows[1].score=5;}
 for(const file of ['course-distribution','course-progression'])vm.runInContext(read('js/'+file+'.js'),c);
 return c;
}
const current=context(false),previous=context(true),api=current.CourseDistribution,old=previous.CourseDistribution;
const plain=x=>JSON.parse(JSON.stringify(x)),withoutVersion=x=>{const p=plain(x);delete p.distributionVersion;return p;};
test('v7 spike zero anchor is3; first positive heart and spike score is4',()=>{
 assert.equal(api.version,'7');assert.equal(current.CourseDistributionConfig.randomVersion,'3');
 assert.deepEqual(plain(current.CourseDistributionConfig.jointTrial),plain(previous.CourseDistributionConfig.jointTrial));
 for(let score=0;score<=20;score++){
  const expected=score<=3?0:.3*(score-3)/17,legacy=score<=5?0:.3*(score-5)/15;
  assert(Math.abs(1-api.probabilities(score,'spikes')[0]-expected)<1e-12,'raw spike interpolation '+score);
  assert(Math.abs(1-old.probabilities(score,'spikes')[0]-legacy)<1e-12,'legacy raw spike interpolation '+score);
  const short=api.probabilities(score,'length')[0],p=api.shortFeatureProbabilities(score);
  const joint=api.jointProbabilities(score),heart=joint.heartOnly+joint.both,spike=joint.spikeOnly+joint.both;
  assert(Math.abs(short*p.spike-spike*Math.min(1,short/(heart+spike||1)))<1e-12);
 }
 for(const feature of ['heart','spike']){
  assert.equal(Array.from({length:21},(_,s)=>s).find(s=>api.shortFeatureProbabilities(s)[feature]>0),4);
 }
 // Joint override starts at10, so changed raw table interpolation at10–19
 // does not change the actual final feature probabilities there.
 for(let s=10;s<=100;s++)assert.deepEqual(plain(api.shortFeatureProbabilities(s)),plain(old.shortFeatureProbabilities(s)));
});
test('only scores4–9 can change recipes; profiles/length/RNG/exclusion/caps remain stable',()=>{
 const changedScores=new Set();
 for(let score=0;score<=100;score++)for(let seed=0;seed<256;seed++){
  const a=api.sample(score,seed),b=old.sample(score,seed);
  assert.deepEqual(plain(a),plain(api.sample(score,seed)));
  for(const key of ['type','length','composition','secondType','seed','generationScore'])assert.equal(a[key],b[key]);
  if(score<=3||score>=10)assert.deepEqual(withoutVersion(a),withoutVersion(b));
  else if(JSON.stringify(withoutVersion(a))!==JSON.stringify(withoutVersion(b)))changedScores.add(score);
  if(a.length==='short'){assert(a.heartsFirst+a.heartsSecond<=1);assert.equal(a.heartsSecond,0);}
  if(score<=20)assert(Number(a.length!=='short')+Number(a.heartsFirst+a.heartsSecond>0)+Number(a.spikePercent>0)<=1);
 }
 assert.deepEqual([...changedScores],[4,5,6,7,8,9]);
 assert.deepEqual(withoutVersion(api.sample(1,1)),withoutVersion(old.sample(1,1)));
 const changed=[];for(let n=1;n<=50;n++){
  const a=current.CourseProgression.recipe(current.CourseProgression.resolveStage(n)),b=previous.CourseProgression.recipe(previous.CourseProgression.resolveStage(n));
  if(JSON.stringify(withoutVersion(a))!==JSON.stringify(withoutVersion(b)))changed.push(n);
 }
 assert.deepEqual(changed,[]);
 for(let day=1;day<=365;day++){
  const date=new Date(Date.UTC(2026,0,day)).toISOString().slice(0,10);
  const a=current.CourseProgression.recipe(current.CourseProgression.resolveDaily(date)),b=previous.CourseProgression.recipe(previous.CourseProgression.resolveDaily(date));
  assert.deepEqual(withoutVersion(a),withoutVersion(b),'Daily '+date);
 }
 console.log('Historical offset0 stage identities1–50 and365 Daily dates unchanged; new probability is tested with score4 seed174.');
});
test('score4 seed174 spike recipe generates deterministically and clears via actual default-stamina input',()=>{
 const recipe=plain(api.sample(4,174));assert.equal(recipe.spikePercent,10);assert.equal(old.sample(4,174).spikePercent,0);
 const html=read('index.html'),source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>read(m[1])).join('\n');
 const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}`;
 new Function('assert','sample',env+source+`
 reset(1);const recipe={...sample,seed:174,stage:4,staminaRules:'0:3'};
 const first=generateCourseFromRecipe(recipe),shape=JSON.stringify({holds,route,HEIGHT,initialGrips});
 const second=generateCourseFromRecipe(recipe);assert.equal(JSON.stringify({holds,route,HEIGHT,initialGrips}),shape);assert.deepEqual(first,second);
 assert(samePairRoute(route,replayRoute(route)));assert.equal(first.report.spikes.percent,10);assert.equal(first.report.spikes.count,Math.floor(first.report.spikes.candidateCount*.1));
 assert.equal(first.report.spikes.referenceHazardCost,0);assert(first.report.spikes.referenceContactsUnchanged);assert.equal(first.hearts.length,0);
 body={...route[0]};committed={...body};grips=[...initialGrips];startGrips=[...grips];hearts=[];stamina=first.stamina.initialStamina;moveCount=0;cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
 const budget=stamina;
 for(let i=1;i<route.length;i++){
  camera=clamp(body.y-H*.6,cameraTop(),HEIGHT-H);const event=p=>({clientX:p.x,clientY:p.y-camera});down(event(body));move(event(route[i]));release();
 }
 assert.equal(state,'won');assert.equal(moveCount,route.length-1);assert.equal(stamina,budget-moveCount);
 console.log(JSON.stringify({score:4,seed:174,spikePercent:10,candidates:first.report.spikes.candidateCount,actualSpikes:first.report.spikes.count,moves:moveCount,remaining:stamina,scope:'one direct recipe input clear, not universal solvability'}));
 `)(assert,recipe);
});
