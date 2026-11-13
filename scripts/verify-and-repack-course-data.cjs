'use strict';
// Explicit administrator migration: verify routes once, retain compact runtime data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const run=require('../tests/coupled-production-harness.cjs'),validation=require('./course-data-validation-source.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function repack(dir){
 const manifestPath=path.join(dir,'manifest.json'),original=fs.readFileSync(manifestPath),manifest=JSON.parse(original);
 const stamp=new Date().toISOString(),runtimeHash=sha(run('return coursePreparationPortableSignature();')),descriptors=[],report=[];
 const backup=path.join(dir,'manifest-before-verification-'+sha(original).slice(0,12)+'.json');
 if(!fs.existsSync(backup))fs.writeFileSync(backup,original,{flag:'wx'});
 for(const d of manifest.packs){
  const raw=fs.readFileSync(path.join(dir,d.file));assert.equal(raw.length,d.bytes);assert.equal(sha(raw),d.sha256);
  const pack=JSON.parse(raw);assert.equal(pack.courses.length,d.count);
  const courses=run(`${validation}\nconst courses=${JSON.stringify(pack.courses)};return courses.map(c=>{
   assert.equal(c.snapshot.format,'ascent-compact-1');
   const snapshot=globalThis.AscentCourseData.decode(c.snapshot);
   const verified=adminValidateStoredCourse(snapshot,c.request);
   validatePreparedCourse(verified,c.request);
   const next=globalThis.AscentCourseData.compact(verified);
   assert.deepEqual(next,c.snapshot,'Preserve every layout, route, action and resource field');
   return {...c,runtimeHash:${JSON.stringify(runtimeHash)},snapshot:next};
  });`);
  const out=JSON.stringify({...pack,generatedAt:stamp,courses}),hash=sha(out),file=d.id+'-'+hash.slice(0,12)+'.json';
  fs.writeFileSync(path.join(dir,file),out,{flag:'wx'});
  descriptors.push({...d,generatedAt:stamp,file,bytes:Buffer.byteLength(out),sha256:hash});
  report.push({id:d.id,count:d.count,oldBytes:raw.length,newBytes:Buffer.byteLength(out),oldFile:d.file,newFile:file,oldSha256:d.sha256,newSha256:hash,allCoursesReplayVerified:true,allSnapshotFieldsIdentical:true});
 }
 const next={...manifest,generatedAt:stamp,packs:descriptors};
 fs.writeFileSync(manifestPath+'.tmp',JSON.stringify(next,null,2)+'\n');fs.renameSync(manifestPath+'.tmp',manifestPath);
 const audit={verifiedAt:stamp,runtimeHash,dir,report};console.log(JSON.stringify(audit,null,2));return audit;
}
module.exports=repack;if(require.main===module)repack(process.argv[2]||'course-data');
