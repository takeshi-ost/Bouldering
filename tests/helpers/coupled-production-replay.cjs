'use strict';
// Final-source physics/native replay of archived actual generated courses.
// This intentionally does not claim final-source cold generation coverage.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const run=require('../coupled-production-harness.cjs'),dirs=process.argv.slice(2);assert(dirs.length,'Supply one or more population snapshot directories');
const cases=dirs.flatMap(dir=>fs.readdirSync(dir).filter(n=>n.endsWith('.json.gz')).map(name=>{
 const raw=zlib.gunzipSync(fs.readFileSync(path.join(dir,name))).toString('utf8'),snapshot=JSON.parse(raw),date=/^\d{4}-/.test(name)?name.slice(0,10):undefined,n=date?1:Number(name.match(/^stage-(\d+)/)[1]);return {n,date,snapshot,sha256:crypto.createHash('sha256').update(raw).digest('hex'),file:path.join(dir,name)};
}));
const out=process.env.ASCENT_POPULATION_OUT||'build/coupled-population',tag=(process.env.ASCENT_NATIVE_TEST==='1'?'native':'web')+'-'+(process.env.ASCENT_POPULATION_TAG||'snapshot-replay');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,tag+'-source.json'),JSON.stringify({digest:run.productionDigest,files:run.sourceManifest},null,2));fs.writeFileSync(path.join(out,tag+'-raw-source.json.gz'),zlib.gzipSync(JSON.stringify(run.rawEntries)));fs.writeFileSync(path.join(out,tag+'.jsonl'),'');
const rows=[];
for(const c of cases){
 const start=Date.now();let row;
 try{const result=run(`const saved=${JSON.stringify(c.snapshot)},spec=${JSON.stringify({n:c.n,date:c.date})},testHazards=false;
 ${require('./coupled-production-validation.cjs')}
 holds=saved.holds;HEIGHT=saved.HEIGHT;route=saved.route;initialGrips=saved.initialGrips.map(h=>holds.find(p=>p.id===h.id));hearts=saved.hearts;stamina=saved.stamina;
 level=spec.n;dailyRun=spec.date?{...dailyProfile(spec.date),returnCourse:'existing'}:null;tutorialRun=level===0?{seen:new Set(),queue:[],explanation:null,introReady:true,timing:false,paused:false}:null;courseMode='existing';debugCourseTrial=null;debugMode=false;debugAttempt=false;courseTypeId=dailyRun?.typeId??courseTypeForStage(level);difficulty=courseTypeRule(courseTypeId).generationDifficulty;
 activeCourseGeneration=level===0?{tutorial:true,initialStamina:stamina}:{recipe:saved.recipe,retry:saved.retry,initialStamina:stamina};generatedCourse={holds,hearts:hearts.map(h=>({...h})),level,seed:saved.retry?.initialSeed??0};labHeartsCache=hearts.map(h=>({...h}));labStaminaCache={initialStamina:stamina};densityStats={};cameraIntro=null;settingsOpen=false;featureHelpOpen=false;ui.overlay.hidden=true;ui.overlay.open=false;resetCharacterAnimation();jointHistory.fill(null);
 assert(fingerAimEnabled()&&coupledBodyEnabled());assert(samePairRoute(route,replayRoute(route)),'archived exact route replay');
 const reference=route,budget=stamina,heartTemplate=hearts.map(h=>({...h})),placements=heartTemplate.map(h=>{const w=findCourseHeartMove(h,reference);assert(w,'archived pickup reachable');const fromStep=reference.indexOf(w.from);return {witness:{...w,fromStep,grips:fromStep?reference[fromStep].grips:fingerRouteInitial().map(h=>h.id)}};});
 const plan=resourcePlan(reference,budget,heartTemplate,placements);for(const count of [1,10]){const r=play(reference,count,budget,heartTemplate,plan);assert.equal(r.remaining,plan.remaining);assert.equal(r.pickups,plan.pickups);}
 return {moves:reference.length-1,remaining:plan.remaining,pickups:plan.pickups};
 `);row={n:c.n,date:c.date,ok:true,ms:Date.now()-start,...result,snapshotHash:c.sha256,productionDigest:run.productionDigest};}
 catch(e){row={n:c.n,date:c.date,ok:false,ms:Date.now()-start,error:e.stack,snapshotHash:c.sha256,productionDigest:run.productionDigest};}
 rows.push(row);fs.appendFileSync(path.join(out,tag+'.jsonl'),JSON.stringify(row)+'\n');console.log(row.ok?'PASS':'FAIL',JSON.stringify(row));
}
fs.writeFileSync(path.join(out,tag+'.json'),JSON.stringify(rows,null,2));if(rows.some(r=>!r.ok))process.exitCode=1;
