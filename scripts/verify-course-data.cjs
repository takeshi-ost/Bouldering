'use strict';
// Read-only administrator verification; does not publish or mutate the dataset.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {optionsFrom,location}=require('./generate-course-data.cjs');
const ROOT=path.resolve(__dirname,'..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function acceptableVersion(value){
 if(typeof value!=='string'||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value))return false;
 const v=value.split('.').map(Number);return v.every(Number.isSafeInteger)&&(v[0]>0||v[1]>=5);
}
function verify(dir,args=[]){
 dir=path.resolve(dir);const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
 assert.equal(manifest.schema,1);assert(acceptableVersion(manifest.generationVersion),'Unsupported generation version');assert(Array.isArray(manifest.packs));
 const run=require('../tests/coupled-production-harness.cjs'),runtimeHash=sha(run('return coursePreparationPortableSignature();'));
 const seen=new Set(),packIds=new Set(),rows=[];
 for(const d of manifest.packs){
  assert(!packIds.has(d.id),'Duplicate pack');packIds.add(d.id);assert(/^(stages|daily)-\d{5}-\d{5}$/.test(d.id));
  assert(/^[\w.-]+\.json$/.test(d.file));assert(Number.isInteger(d.count)&&d.count>0&&d.count<=1000);
  const raw=fs.readFileSync(path.join(dir,d.file));assert.equal(raw.length,d.bytes);assert(raw.length<=32*1024*1024);assert.equal(sha(raw),d.sha256);
  const p=JSON.parse(raw);assert.equal(p.schema,1);assert(acceptableVersion(p.generationVersion));assert.equal(p.id,d.id);assert.equal(p.generatedAt,d.generatedAt);assert.equal(p.courses.length,d.count);
  for(const c of p.courses){
   if(c.generationVersion!==undefined)assert(acceptableVersion(c.generationVersion));
   assert.equal(c.runtimeHash,runtimeHash,'Current generation rules mismatch');
   const item=c.request.date??c.request.level,where=location(item);assert.equal(where.id,d.id);assert.equal(where.start,d.start);assert.equal(where.end,d.end);
   const key=(c.request.date?'daily:':'stage:')+item;assert(!seen.has(key),'Duplicate course '+key);seen.add(key);
  }
  const started=Date.now();
  run(`const courses=${JSON.stringify(p.courses)};for(const c of courses){
   const profile=c.request.date?dailyProfile(c.request.date):null;
   assert.equal(JSON.stringify(coursePreparationIdentity(c.request.level,profile)),JSON.stringify(c.request));
   const snapshot=restoreCompactCourse(globalThis.AscentCourseData.decode(c.snapshot),c.request);
   validatePreparedCourse(snapshot,c.request);
  }`);
  const row={id:d.id,count:d.count,bytes:raw.length,verifyMs:Date.now()-started};rows.push(row);console.log(JSON.stringify(row));
 }
 if(args.length){
  const expected=optionsFrom(args).items.map(item=>(typeof item==='number'?'stage:':'daily:')+item);
  assert.equal(seen.size,expected.length,'Unexpected number of courses');for(const id of expected)assert(seen.has(id),'Missing '+id);
 }
 const result={pass:true,courses:seen.size,packs:rows.length,bytes:rows.reduce((n,r)=>n+r.bytes,0)};console.log(JSON.stringify(result));return result;
}
module.exports={verify,acceptableVersion};if(require.main===module){try{verify(process.argv[2]||path.join(ROOT,'course-data'),process.argv.slice(3));}catch(error){console.error(error);process.exitCode=1;}}
