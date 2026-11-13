'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../scripts/build-pages-site.cjs'),'utf8');
const copy=vm.runInNewContext(source.slice(source.indexOf('// Optional'),source.indexOf('const args='))+';copyTestCourseData',{fs,path,require});
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ascent-feed-test-')),out=path.join(root,'out'),dir=path.join(root,'test-course-data/stages-101-150');
try{
 copy(root,out);assert(!fs.existsSync(out),'Absent feed remains optional');fs.mkdirSync(dir,{recursive:true});
 const pack={schema:1,id:'stages-00001-01000',generatedAt:'2026-11-13T00:00:00Z',courses:Array.from({length:50},(_,i)=>({request:{level:101+i,date:null}}))};
 const bytes=Buffer.from(JSON.stringify(pack)),sha256=crypto.createHash('sha256').update(bytes).digest('hex'),file='stages-00001-01000-'+sha256.slice(0,12)+'.json';
 const manifest={schema:1,packs:[{id:pack.id,start:1,end:1000,count:50,generatedAt:pack.generatedAt,file,bytes:bytes.length,sha256}]};
 const write=()=>fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
 write();fs.writeFileSync(path.join(dir,file),bytes);fs.writeFileSync(path.join(dir,'unreferenced.json'),'private');
 copy(root,out);assert.deepEqual(fs.readdirSync(path.join(out,'test-course-data/stages-101-150')).sort(),['manifest.json',file].sort());assert.deepEqual(fs.readFileSync(path.join(out,'test-course-data/stages-101-150',file)),bytes);
 manifest.packs[0].file='../unreferenced.json';write();assert.throws(()=>copy(root,out),/descriptor/);
 manifest.packs[0].file=file;manifest.packs[0].count=49;write();assert.throws(()=>copy(root,out),/descriptor/);
 manifest.packs[0].count=50;write();fs.writeFileSync(path.join(dir,file),Buffer.concat([bytes,Buffer.from(' ')]));assert.throws(()=>copy(root,out),/integrity/);
 fs.unlinkSync(path.join(dir,file));fs.symlinkSync(path.join(dir,'unreferenced.json'),path.join(dir,file));assert.throws(()=>copy(root,out),/regular/);
 console.log('PASS optional Pages test feed: exact 50-stage scope, referenced files only, integrity/path/symlink/partial guards');
}finally{fs.rmSync(root,{recursive:true,force:true});}
