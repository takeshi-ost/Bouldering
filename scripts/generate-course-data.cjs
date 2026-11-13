'use strict';
// Explicit administrator workflow, independent of application builds.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Worker}=require('node:worker_threads');
const ROOT=path.resolve(__dirname,'..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const {buildCourseWorker}=require('./build-course-worker.cjs');
const DAY=86400000,MAX_BYTES=32*1024*1024;
function dateNumber(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Invalid Daily date');
 const ms=Date.parse(value+'T00:00:00Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value||ms/DAY<1)throw Error('Invalid Daily date');
 return ms/DAY;
}
function location(item){
 const kind=typeof item==='number'?'stages':'daily',number=typeof item==='number'?item:dateNumber(item);
 if(!Number.isSafeInteger(number)||number<1)throw Error('Invalid course ID');
 const start=Math.floor((number-1)/1000)*1000+1,end=start+999;
 return {kind,number,start,end,id:`${kind}-${String(start).padStart(5,'0')}-${String(end).padStart(5,'0')}`};
}
function optionsFrom(args){
 const o={out:path.join(ROOT,'course-data'),stages:null,dailyStart:null,dailyCount:0,resume:false,full:false};
 for(let i=0;i<args.length;i++){
  const a=args[i];
  if(a==='--out')o.out=path.resolve(args[++i]);
  else if(a==='--stages')o.stages=String(args[++i]).split(',').map(Number);
  else if(a==='--stage-range'){
   const [start,end,...extra]=String(args[++i]).split(':').map(Number);
   if(extra.length||!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>10000)throw Error('Invalid stage range');
   o.stages=Array.from({length:end-start+1},(_,i)=>start+i);
  }else if(a==='--daily-start')o.dailyStart=args[++i];
  else if(a==='--daily-count')o.dailyCount=Number(args[++i]);
  else if(a==='--resume')o.resume=true;
  else if(a==='--full')o.full=true;
  else throw Error('Unknown argument '+a);
 }
 if(o.resume&&o.full)throw Error('--full and --resume cannot be combined');
 if(o.stages===null)o.stages=o.dailyStart?[]:[1,4,26];
 if(o.stages.some(n=>!Number.isInteger(n)||n<1||n>10000))throw Error('Stage range is 1..10000');
 const dates=[];
 if(o.dailyStart!==null||o.dailyCount!==0){
  const first=dateNumber(o.dailyStart);
  if(!Number.isInteger(o.dailyCount)||o.dailyCount<1||o.dailyCount>10000)throw Error('Daily count is 1..10000');
  for(let i=0;i<o.dailyCount;i++)dates.push(new Date((first+i)*DAY).toISOString().slice(0,10));
 }
 o.items=[...new Set(o.stages)].sort((a,b)=>a-b).concat(dates);
 if(!o.items.length)throw Error('No courses requested');
 return o;
}
function generate(item,built,codec,existing=null){return new Promise((resolve,reject)=>{
 const source=`const {parentPort}=require('node:worker_threads');globalThis.postMessage=()=>{};\n${codec}\n${built.output['js/course-worker.js']}\n${require('./course-data-validation-source.cjs')}\n
 try {
  const item=${JSON.stringify(item)},existing=${JSON.stringify(existing)};
  const profile=typeof item==='string'?{date:item,typeId:generationTypeForScore(CourseProgression.resolveDaily(item).score)}:null;
  const request=coursePreparationIdentity(typeof item==='number'?item:1,profile);
  const runtimeHash=require('node:crypto').createHash('sha256').update(coursePreparationPortableSignature()).digest('hex');
  if(existing&&existing.snapshot?.format==='ascent-compact-1'&&existing.generationVersion===RELEASE_VERSION&&existing.runtimeHash===runtimeHash&&JSON.stringify(existing.request)===JSON.stringify(request)){
   adminValidateStoredCourse(globalThis.AscentCourseData.decode(existing.snapshot),request);
   parentPort.postMessage({course:existing,skipped:true});
  }else{
   level=request.level;difficulty=request.difficulty;courseTypeId=request.courseTypeId;courseMode='existing';dailyRun=profile;tutorialRun=null;debugCourseTrial=null;debugMode=debugAttempt=false;
   prepareAdoptedCourse();const snapshot=adminValidateStoredCourse(validatePreparedCourse(adoptedCourseSnapshot(),request),request);
   parentPort.postMessage({course:{generationVersion:RELEASE_VERSION,request,runtimeHash,snapshot:globalThis.AscentCourseData.compact(snapshot)},moves:snapshot.route.length-1,stamina:snapshot.activeCourseGeneration.initialStamina});
  }
 }catch(e){parentPort.postMessage({error:String(e.stack||e)});}`;
 const worker=new Worker(source,{eval:true});let finished=false;
 const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);void worker.terminate();error?reject(error):resolve(value);};
 const timer=setTimeout(()=>finish(Error('Course '+item+' generation exceeded 180s')),180000);
 worker.once('error',error=>finish(error));worker.once('exit',code=>{if(!finished)finish(Error('Course worker exited before result: '+code));});
 worker.once('message',r=>finish(r.error?Error(r.error):null,r));
 });}
function atomicWrite(file,data){const temp=file+'.tmp';fs.writeFileSync(temp,data);fs.renameSync(temp,file);}
async function main(args=process.argv.slice(2)){
 const o=optionsFrom(args),built=buildCourseWorker(),codec=fs.readFileSync(path.join(ROOT,'js/course-data-store.js'),'utf8');
 const generationVersion=fs.readFileSync(path.join(ROOT,'js/config.js'),'utf8').match(/const RELEASE_VERSION\s*=\s*'([^']+)'/)?.[1];
 if(!generationVersion)throw Error('Generation release version unavailable');
 fs.mkdirSync(o.out,{recursive:true});const manifestFile=path.join(o.out,'manifest.json');
 const old=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):null;
 if(old&&!o.full&&(old.schema!==1||old.generationVersion!==generationVersion))throw Error('Existing batch generation version differs; use a separate output directory');
 const packs=new Map(o.full?[]:(old?.packs||[]).map(d=>[d.id,d])),groups=new Map(),rows=[];
 function readGroup(where){
  if(groups.has(where.id))return groups.get(where.id);
  const d=packs.get(where.id);let courses=[];
  if(d){
   if(!/^[\w.-]+\.json$/.test(d.file))throw Error('Invalid existing pack filename');
   const text=fs.readFileSync(path.join(o.out,d.file));if(text.length!==d.bytes||sha(text)!==d.sha256)throw Error('Existing pack integrity mismatch');
   const p=JSON.parse(text);if(p.schema!==1||p.id!==d.id||p.generationVersion!==generationVersion||p.courses.length!==d.count)throw Error('Existing pack metadata mismatch');courses=p.courses;
  }
  const p={schema:1,generationVersion,buildId:built.manifest.id,id:where.id,generatedAt:d?.generatedAt||new Date().toISOString(),courses};groups.set(where.id,p);return p;
 }
 function checkpoint(p,where){
  p.courses.sort((a,b)=>location(a.request.date??a.request.level).number-location(b.request.date??b.request.level).number);
  const text=JSON.stringify(p)+'\n',bytes=Buffer.byteLength(text);if(bytes>MAX_BYTES)throw Error('Course pack exceeds 32 MiB');
  const hash=sha(text),file=p.id+'-'+hash.slice(0,12)+'.json';atomicWrite(path.join(o.out,file),text);
  packs.set(p.id,{id:p.id,start:where.start,end:where.end,count:p.courses.length,generatedAt:p.generatedAt,file,bytes,sha256:hash});
  const manifest={schema:1,generationVersion,buildId:built.manifest.id,generatedAt:new Date().toISOString(),packs:[...packs.values()].sort((a,b)=>a.id.localeCompare(b.id))};
  atomicWrite(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 }
 for(const item of o.items){
  const where=location(item),p=readGroup(where),existing=o.resume?p.courses.find(c=>typeof item==='number'?c.request.date===null&&c.request.level===item:c.request.date===item):null;
  const began=Date.now(),result=await generate(item,built,codec,existing);
  if(result.skipped){console.log(JSON.stringify({course:item,skipped:true}));continue;}
  p.courses=p.courses.filter(c=>typeof item==='number'?!(c.request.date===null&&c.request.level===item):c.request.date!==item);
  p.courses.push(result.course);p.generatedAt=new Date().toISOString();checkpoint(p,where);
  const row={course:item,bytes:Buffer.byteLength(JSON.stringify(result.course)),moves:result.moves,stamina:result.stamina,ms:Date.now()-began};rows.push(row);console.log(JSON.stringify(row));
 }
 const manifest=JSON.parse(fs.readFileSync(manifestFile));console.log(JSON.stringify({mode:o.resume?'resume':o.full?'full':'incremental',count:manifest.packs.reduce((n,p)=>n+p.count,0),packs:manifest.packs.length,generated:rows.length}));return manifest;
}
module.exports={main,generate,optionsFrom,location};if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
