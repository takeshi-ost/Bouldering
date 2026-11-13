'use strict';
// Geometry only. Never store account, progress, inventory or live-run resources.
(function(root){
 const SCHEMA=1,MAX_BYTES=32*1024*1024,MAX_NODES=250000;
 const MIN_GENERATOR_VERSION='0.5.0';
 function compatibleGeneration(m,minimum=MIN_GENERATOR_VERSION){
  const parse=v=>typeof v==='string'&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v)?v.split('.').map(Number):null;
  const a=parse(m?.generationVersion),b=parse(minimum);if(m?.schema!==SCHEMA||!a||!b||!a.concat(b).every(Number.isSafeInteger))return false;
  for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return true;
 }
 const fail=()=>{throw Error('Invalid course data');};
 function encode(value){
  const nodes=[],seen=new Map();
  function ref(v){
   if(v===undefined)return {u:1};
   if(v===null||['string','boolean'].includes(typeof v))return v;
   if(typeof v==='number'){if(!Number.isFinite(v))fail();return v;}
   if(typeof v!=='object')fail();
   if(seen.has(v))return {r:seen.get(v)};
   if(nodes.length>=MAX_NODES)fail();
   const i=nodes.length;seen.set(v,i);nodes.push(null);
   nodes[i]=Array.isArray(v)?{a:v.map(ref)}:{o:Object.entries(v).map(([k,w])=>{if(['__proto__','constructor','prototype'].includes(k))fail();return [k,ref(w)];})};
   return {r:i};
  }
  return {root:ref(value),nodes};
 }
 function compact(snapshot){
  const {holds,route,HEIGHT,initialGrips,activeCourseGeneration:a,generatedCourse:c}=snapshot;
  const {report,...active}=a,{holds:unused,...generated}=c;
  return {format:'ascent-compact-1',holds,HEIGHT,initialGripIds:initialGrips.map(h=>h.id),
   route:route.map(({trace,...point})=>point),active,generated,
   hearts:snapshot.labHeartsCache,stamina:snapshot.labStaminaCache};
 }
 function decode(data){
  if(data?.format==='ascent-compact-1'){
   // JSON clone also isolates bundled records from live mutations.
   const p=JSON.parse(JSON.stringify(data)),report={source:'precomputed',diagnosticsOmitted:true};
   if(!Array.isArray(p.holds)||!Array.isArray(p.initialGripIds))fail();
   return {holds:p.holds,HEIGHT:p.HEIGHT,initialGrips:p.initialGripIds.map(id=>p.holds.find(h=>h.id===id)),
    route:p.route,densityStats:{source:'precomputed',diagnosticsOmitted:true},
    activeCourseGeneration:{...p.active,report},generatedCourse:{...p.generated,holds:p.holds},
    labSkeletonReport:report,labHeartsCache:p.hearts,labStaminaCache:p.stamina};
  }

  if(!data||!Array.isArray(data.nodes)||data.nodes.length>MAX_NODES)fail();
  const out=data.nodes.map(n=>{if(n&&Object.keys(n).length===1&&Array.isArray(n.a))return [];if(n&&Object.keys(n).length===1&&Array.isArray(n.o))return {};fail();});
  function value(v){
   if(v===null||['string','boolean'].includes(typeof v))return v;
   if(typeof v==='number'&&Number.isFinite(v))return v;
   if(v&&Object.keys(v).length===1&&v.u===1)return undefined;
   if(v&&Object.keys(v).length===1&&Number.isInteger(v.r)&&v.r>=0&&v.r<out.length)return out[v.r];
   fail();
  }
  data.nodes.forEach((n,i)=>{if(n.a){for(const v of n.a)out[i].push(value(v));}else for(const entry of n.o){
   if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||['__proto__','constructor','prototype'].includes(entry[0])||Object.hasOwn(out[i],entry[0]))fail();out[i][entry[0]]=value(entry[1]);
  }});
  return value(data.root);
 }
 const requestKey=request=>JSON.stringify(request);
 function location(r){
  let kind,number;
  if(r?.date===null&&r.resolved?.kind==='stage'){kind='stages';number=r.level;}
  else if(r?.resolved?.kind==='daily'&&r.date===r.resolved.date){kind='daily';number=Date.parse(r.date+'T00:00:00Z')/86400000;if(!Number.isInteger(number)||new Date(number*86400000).toISOString().slice(0,10)!==r.date)return null;}
  else return null;
  if(!Number.isSafeInteger(number)||number<1)return null;
  const start=Math.floor((number-1)/1000)*1000+1,end=start+999;
  return {kind,number,start,end,id:`${kind}-${String(start).padStart(5,'0')}-${String(end).padStart(5,'0')}`};
 }
 const date=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&new Date(value).toISOString()===value;
 async function sha(text){return [...new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
 // One atomic IndexedDB record per verified pack. Quota/failure never affects play.
 function storage(){
  let opening;
  const db=()=>opening||(opening=new Promise((resolve,reject)=>{
   let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;reject(Error('Course database open timeout'));},3000);
   const r=root.indexedDB.open('ascent-course-data-v1',1);
   r.onblocked=()=>{clearTimeout(timeout);reject(Error('Course database blocked'));};
   r.onupgradeneeded=()=>r.result.createObjectStore('packs');
   r.onsuccess=()=>{clearTimeout(timeout);if(timedOut){r.result.close();return;}r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>{clearTimeout(timeout);reject(r.error);};
  }));
  const transact=async(mode,key,value)=>{
   const d=await db();
   return new Promise((resolve,reject)=>{
    let tx,r;
    try{tx=d.transaction('packs',mode);const object=tx.objectStore('packs');r=mode==='readonly'?object.get(key):object.put(value,key);}
    catch(error){reject(error);return;}
    const timeout=setTimeout(()=>{try{tx.abort();}catch{}reject(Error('Course database transaction timeout'));},3000);
    tx.oncomplete=()=>{clearTimeout(timeout);resolve(r.result);};tx.onerror=()=>{clearTimeout(timeout);reject(tx.error);};tx.onabort=()=>{clearTimeout(timeout);reject(tx.error);};
   });
  };
  return {get:key=>transact('readonly',key),put:(key,v)=>transact('readwrite',key,v)};
 }
 function create({buildId,minGenerationVersion=MIN_GENERATOR_VERSION,runtimeSignature=null,bundleManifest,remoteManifest=null,baseURL,fetcher=root.fetch?.bind(root),disk=storage(),digest=sha,onUpdate=()=>{}}){
  let bundled=null,updating=null;const loaded=new Map();
  const compatible=m=>compatibleGeneration(m,minGenerationVersion);
  const storageKey=id=>`schema-${SCHEMA}:`+id;
  function manifest(m){
   if(!compatible(m)||!date(m.generatedAt)||!Array.isArray(m.packs)||m.packs.length>10000)fail();
   const ids=new Set();
   for(const p of m.packs){
    if(!p||!/^(stages|daily)-\d{5}-\d{5}$/.test(p.id)||ids.has(p.id)||!date(p.generatedAt)||!Number.isInteger(p.start)||!Number.isInteger(p.end)||p.start<1||p.end<p.start||p.end-p.start>=1000||p.id!==`${p.id.split('-')[0]}-${String(p.start).padStart(5,'0')}-${String(p.end).padStart(5,'0')}`||!Number.isInteger(p.count)||p.count<1||p.count>1000||!Number.isInteger(p.bytes)||p.bytes<1||p.bytes>MAX_BYTES||!/^\w[\w.-]*\.json$/.test(p.file)||! /^[a-f0-9]{64}$/.test(p.sha256))fail();
    ids.add(p.id);
   }
   return m;
  }
  async function read(url,max=MAX_BYTES){
   if(!fetcher)throw Error('Course data fetch unavailable');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
   try {const r=await fetcher(url,{signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'});if(!r.ok)throw Error('Course data HTTP '+r.status);
    if(Number(r.headers?.get('content-length')||0)>max)fail();
    const s=await r.text();if(new TextEncoder().encode(s).length>max)fail();return s;
   } finally {clearTimeout(timer);}
  }
  async function bundle(){if(!bundled)bundled=read(new URL(bundleManifest,baseURL).href,1024*1024).then(s=>manifest(JSON.parse(s))).catch(()=>null);return bundled;}
  function packBody(p,descriptor){
   if(!compatible(p)||p.id!==descriptor.id||p.generatedAt!==descriptor.generatedAt||!Array.isArray(p.courses)||p.courses.length!==descriptor.count)fail();
   const keys=new Set();
   for(const c of p.courses){
    const r=c?.request,key=requestKey(r);
    if(c.generationVersion!==undefined&&!compatible({schema:SCHEMA,generationVersion:c.generationVersion}))fail();
    const where=location(r);if(!where||where.id!==descriptor.id||where.number<descriptor.start||where.number>descriptor.end||keys.has(key)||!c.snapshot)fail();keys.add(key);
   }
   return p;
  }
  async function checked(text,descriptor){if(new TextEncoder().encode(text).length!==descriptor.bytes||await digest(text)!==descriptor.sha256)fail();return packBody(JSON.parse(text),descriptor);}
  async function diskPack(id){try {const d=await disk.get(storageKey(id));if(!d)return null;manifest({...JSON.parse(d.text),packs:[d.descriptor]});return {descriptor:d.descriptor,pack:await checked(d.text,d.descriptor)};}catch{return null;}}
  async function loadBundle(descriptor){
   const key=descriptor.sha256;if(!loaded.has(key))loaded.set(key,read(new URL(descriptor.file,new URL(bundleManifest,baseURL)).href).then(s=>checked(s,descriptor)).catch(()=>null));
   return loaded.get(key);
  }
  async function lookup(request,validate,portable){
   const where=location(request);if(!where)return null;
   try {
    if(typeof portable!=='string')return null;
    const runtimeHash=await digest(portable);
    const m=await bundle();
    // The range convention is stable even when a pack is absent from the bundle.
    const {id}=where;
    const d=m?.packs.find(p=>p.id===id),stored=await diskPack(id),sources=[];
    if(stored)sources.push({date:stored.descriptor.generatedAt,pack:stored.pack});
    if(d){const p=await loadBundle(d);if(p)sources.push({date:d.generatedAt,pack:p});}
    sources.sort((a,b)=>b.date.localeCompare(a.date));
    for(const source of sources){const c=source.pack.courses.find(c=>requestKey(c.request)===requestKey(request)&&c.runtimeHash===runtimeHash);if(c)try{return validate(decode(c.snapshot));}catch{/* Try intact older data before generation. */}}
   }catch{/* Corrupt/incompatible/unavailable data falls through to generation. */}
   return null;
  }
  async function update(){
   if(updating)return updating;
   updating=(async()=>{
    if(!remoteManifest)return {updated:0,disabled:true};
    let updated=0;const failures=[];
    try {
     const remoteURL=new URL(remoteManifest,baseURL);
     if(remoteURL.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(remoteURL.hostname))throw Error('Course updates require HTTPS');
     // No third-party redirects or arbitrary pack URLs from the downloaded manifest.
     const m=manifest(JSON.parse(await read(remoteURL.href,1024*1024))),currentHash=runtimeSignature?await digest(runtimeSignature()):null;
     for(const d of m.packs){
      try {
       // A partial newer bundle must not suppress remote-only courses.
       const local=await diskPack(d.id),newest=local?.descriptor.generatedAt;
       if(newest&&newest>=d.generatedAt)continue;
       const text=await read(new URL(d.file,remoteURL).href),candidate=await checked(text,d);
       if(currentHash&&candidate.courses.some(c=>c.runtimeHash!==currentHash))throw Error('Incompatible course generation rules');
       await disk.put(storageKey(d.id),{descriptor:d,text});updated++;
      }catch(e){failures.push({id:d.id,error:String(e.message||e)});}
     }
     if(updated)onUpdate();
    }catch(e){failures.push({error:String(e.message||e)});}
    return {updated,failures};
   })().finally(()=>{updating=null;});return updating;
  }
  return Object.freeze({lookup,update});
 }
 root.AscentCourseData=Object.freeze({schema:SCHEMA,minimumGenerationVersion:MIN_GENERATOR_VERSION,compatibleGeneration,location,encode,compact,decode,create});
})(globalThis);
