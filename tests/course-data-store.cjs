'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
require('../js/course-data-store.js');
const A=globalThis.AscentCourseData,portable='test-generation-rules',hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const request={level:1,date:null,resolved:{kind:'stage',seed:1}};
function fixture({at='2026-11-12T00:00:00.000Z',version='0.5.0',marker='bundle',runtimeHash=hash(portable),req=request}={}){
 const loc=A.location(req),p={schema:1,buildId:'older-build',generationVersion:version,id:loc.id,generatedAt:at,courses:[{request:req,runtimeHash,snapshot:A.encode({marker})}]};
 const text=JSON.stringify(p),d={id:loc.id,start:loc.start,end:loc.end,count:1,generatedAt:at,file:'pack.json',bytes:Buffer.byteLength(text),sha256:hash(text)};
 return {text,manifest:{schema:1,buildId:'older-build',generationVersion:version,generatedAt:at,packs:[d]}};
}
function environment(bundle=fixture(),remote=fixture({marker:'remote',at:'2026-11-13T00:00:00.000Z'})){
 const files=new Map(),saved=new Map(),calls=[];let offline=false,quota=false;
 const publish=(dir,f)=>{files.set('https://test.invalid/'+dir+'/manifest.json',JSON.stringify(f.manifest));files.set('https://test.invalid/'+dir+'/pack.json',f.text);};
 publish('bundle',bundle);publish('remote',remote);
 const disk={get:async k=>saved.get(k),put:async(k,v)=>{if(quota)throw Error('QuotaExceededError');saved.set(k,structuredClone(v));}};
 const fetcher=async(url,options)=>{calls.push(String(url));assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');if(offline)throw Error('offline');const text=files.get(String(url));return {ok:text!==undefined,status:text===undefined?404:200,headers:{get:()=>null},text:async()=>text};};
 const create=(overrides={})=>A.create({buildId:'different-app-build',bundleManifest:'bundle/manifest.json',remoteManifest:'remote/manifest.json',baseURL:'https://test.invalid/',runtimeSignature:()=>portable,fetcher,disk,digest:async s=>hash(s),...overrides});
 return {create,files,saved,calls,publish,setOffline:v=>offline=v,setQuota:v=>quota=v};
}
const lookup=(s,r=request,p=portable)=>s.lookup(r,x=>x,p);
(async()=>{
 for(const v of ['0.5.0','0.5.17','1.0.0'])assert(A.compatibleGeneration({schema:1,generationVersion:v}));
 for(const v of [undefined,'0.4.99','0.5','garbage','0.5.0-beta'])assert(!A.compatibleGeneration({schema:1,generationVersion:v}));
 let e=environment(),s=e.create();assert.equal((await lookup(s)).marker,'bundle','different build accepted');
 assert.equal(await lookup(s,request,'different-rules'),null,'signature mismatch');
 for(const version of ['0.4.9',undefined]){const f=fixture();if(version===undefined){delete f.manifest.generationVersion;}else f.manifest.generationVersion=version;assert.equal(await lookup(environment(f).create()),null);}
 // Checked digest rejects same-length corruption, not merely invalid JSON.
 e=environment();e.files.set('https://test.invalid/bundle/pack.json',e.files.get('https://test.invalid/bundle/pack.json').replace('bundle','broken'));assert.equal(await lookup(e.create()),null);
 e=environment();s=e.create();assert.equal((await s.update()).updated,1);assert.equal((await lookup(s)).marker,'remote');
 assert.equal((await s.update()).updated,0,'same date not downloaded');
 e.publish('remote',fixture({at:'2026-11-11T00:00:00.000Z',marker:'old'}));assert.equal((await s.update()).updated,0,'older date ignored');
 e.setOffline(true);assert.equal((await lookup(e.create())).marker,'remote','new store restores persisted offline data');assert.equal((await e.create().update()).updated,0);
 // Quota failure leaves bundle usable and does not claim successful persistence.
 e=environment();e.setQuota(true);s=e.create();let r=await s.update();assert.equal(r.updated,0);assert.equal(r.failures.length,1);assert.equal(e.saved.size,0);assert.equal((await lookup(s)).marker,'bundle');
 // A later but incompatible rule pack must not overwrite compatible disk data.
 e=environment();s=e.create();await s.update();const prior=JSON.stringify([...e.saved]);e.publish('remote',fixture({at:'2026-11-14T00:00:00.000Z',runtimeHash:hash('other')}));r=await s.update();assert.equal(r.updated,0);assert.equal(r.failures.length,1);assert.equal(JSON.stringify([...e.saved]),prior);
 // Newer SHA-corrupt or below-floor remote data cannot replace the good disk pack.
 for(const bad of ['sha','version']){
  e=environment();s=e.create();await s.update();const previous=JSON.stringify([...e.saved]);
  const next=fixture({at:'2026-11-15T00:00:00.000Z',version:bad==='version'?'0.4.9':'0.5.0'});
  e.publish('remote',next);if(bad==='sha')e.files.set('https://test.invalid/remote/pack.json',next.text.replace('bundle','broken'));
  r=await s.update();assert.equal(r.updated,0,bad);assert(r.failures.length);assert.equal(JSON.stringify([...e.saved]),previous,bad);
 }
 // A corrupt persisted pack falls back to intact bundle.
 const entry=[...e.saved.values()][0];entry.text=entry.text.replace('remote','BROKEN');assert.equal((await lookup(e.create())).marker,'bundle');
 // A closed IndexedDB throws synchronously from transaction(). Neither lookup nor update may hang.
 const originalIDB=globalThis.indexedDB;let transactions=0;
 globalThis.indexedDB={open(){const req={result:{close(){},transaction(){transactions++;throw Error('InvalidStateError: database is closed');}}};queueMicrotask(()=>req.onsuccess());return req;}};
 const bounded=async promise=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('IndexedDB fallback hung')),1000);})]);}finally{clearTimeout(timer);}};
 try{
  e=environment();s=e.create({disk:undefined});assert.equal((await bounded(lookup(s))).marker,'bundle');
  r=await bounded(s.update());assert.equal(r.updated,0);assert(r.failures.length);assert(transactions>=2);
  e=environment();e.files.clear();assert.equal(await bounded(lookup(e.create({disk:undefined}))),null,'missing bundle must permit generation fallback');
 }finally{if(originalIDB===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=originalIDB;}
 // Embedded metadata + SHA-keyed bundle persistence allow offline instance restart.
 e=environment();const embedded=fixture().manifest;s=e.create({bundledManifestData:embedded});
 assert.equal((await s.warmup()).loaded,1);assert(!e.calls.some(u=>u.includes('bundle/manifest')));
 assert([...e.saved.keys()].some(k=>k.startsWith('schema-1:bundle:')));
 await s.update();e.setOffline(true);e.calls.length=0;
 const offlineStore=e.create({bundledManifestData:embedded});
 assert.equal((await lookup(offlineStore)).marker,'remote');assert.equal(e.calls.length,0,'Saved candidates require no HTTP');
 // Removing downloaded data still leaves the independent bundled pack intact.
 e.saved.delete('schema-1:stages-00001-01000');assert.equal((await lookup(offlineStore)).marker,'bundle');assert.equal(e.calls.length,0);
 // Slow initial retrieval outlives the bounded lookup, then serves later starts.
 e=environment();let resolvePack,aborted=false;const policies=[];
 const slow=e.create({bundledManifestData:embedded,fetcher:async(url,opts)=>{
  policies.push(opts.cache);opts.signal.addEventListener('abort',()=>aborted=true);
  return new Promise(resolve=>{resolvePack=()=>resolve({ok:true,text:async()=>fixture().text});});
 }});
 const pendingWarm=slow.warmup(),t=Date.now();assert.equal(await lookup(slow),null);
 assert(Date.now()-t<5000,'Start must not wait 30s');assert.equal(aborted,false,'Lookup deadline must not abort warmup');
 resolvePack();assert.equal((await pendingWarm).loaded,1);assert.equal((await lookup(slow)).marker,'bundle');assert.deepEqual(policies,['force-cache']);
 // Corrupt persisted bundle is rejected; an intact asset can repair it.
 const bundleEntry=[...e.saved.entries()].find(([k])=>k.startsWith('schema-1:bundle:'));bundleEntry[1].text=bundleEntry[1].text.replace('bundle','broken');
 assert.equal((await lookup(e.create({bundledManifestData:embedded}))).marker,'bundle');
 const daily={level:1,date:'2026-11-13',resolved:{kind:'daily',date:'2026-11-13',seed:20261113}};
 const f=fixture({req:daily,marker:'daily'});e=environment(f,f);assert.equal((await lookup(e.create(),daily)).marker,'daily');assert.equal(await lookup(e.create()),null,'normal stage does not alias daily');
 assert.equal(A.location({...daily,date:'2026-02-30',resolved:{kind:'daily',date:'2026-02-30'}}),null);
 console.log('PASS course-data store: version floor/build independence/SHA/newer-only/offline/quota/runtime rejection/Daily isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
