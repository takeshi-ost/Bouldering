'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
require('../js/course-data-store.js');
const A=globalThis.AscentCourseData,hash=s=>crypto.createHash('sha256').update(s).digest('hex'),signature='production-rules';
const req=n=>({level:n,date:null,resolved:{kind:'stage',seed:n}});
function fixture(levels,date,marker){
 const pack={schema:1,generationVersion:'0.5.17',id:'stages-00001-01000',generatedAt:date,courses:levels.map(n=>({request:req(n),runtimeHash:hash(signature),snapshot:A.encode({level:n,marker})}))};
 const text=JSON.stringify(pack),descriptor={id:pack.id,start:1,end:1000,count:levels.length,generatedAt:date,file:'pack.json',bytes:Buffer.byteLength(text),sha256:hash(text)};
 return {text,manifest:{schema:1,generationVersion:'0.5.17',generatedAt:date,packs:[descriptor]}};
}
(async()=>{
 const bundle=fixture(Array.from({length:100},(_,i)=>i+1),'2026-11-12T00:00:00.000Z','bundle');
 const remote=fixture(Array.from({length:50},(_,i)=>i+101),'2026-11-13T00:00:00.000Z','remote');
 const files=new Map(),saved=new Map();let downloads=0,updates=0,gate=null,offline=false;
 for(const [dir,f]of [['bundle',bundle],['remote',remote]]){files.set('https://example.test/'+dir+'/manifest.json',JSON.stringify(f.manifest));files.set('https://example.test/'+dir+'/pack.json',f.text);}
 const create=()=>A.create({bundleManifest:'bundle/manifest.json',remoteManifest:'remote/manifest.json',baseURL:'https://example.test/',runtimeSignature:()=>signature,digest:async s=>hash(s),disk:{get:async k=>saved.get(k),put:async(k,v)=>saved.set(k,structuredClone(v))},onUpdate:()=>updates++,fetcher:async url=>{
  if(String(url).includes('/remote/pack')){downloads++;if(gate)await gate;}
  if(offline)throw Error('offline');const text=files.get(String(url));return {ok:text!==undefined,status:text===undefined?404:200,text:async()=>text};
 }});
 const read=(s,n,validate=x=>x)=>s.lookup(req(n),validate,signature);
 const s=create();let release;gate=new Promise(r=>release=r);
 const updating=s.update(),duplicate=s.update();
 assert.equal((await read(s,1)).marker,'bundle','Title download must not block bundle lookup');
 assert.equal(await read(s,101),null,'Not yet downloaded means normal generation fallback');
 release();assert.equal((await updating).updated,1);assert.equal((await duplicate).updated,1);assert.equal(downloads,1);assert.equal(updates,1);
 for(let n=1;n<=150;n++)assert.equal((await read(s,n)).marker,n<=100?'bundle':'remote','Same bucket coexist '+n);
 assert.equal(await read(s,151),null);
 offline=true;const restarted=create();assert.equal((await read(restarted,101)).marker,'remote');assert.equal((await restarted.update()).updated,0);offline=false;
 // A newer invalid decoded record may not suppress an intact older bundled record.
 const overlap=fixture([1],'2026-11-14T00:00:00.000Z','invalid');saved.set('schema-1:stages-00001-01000',{text:overlap.text,descriptor:overlap.manifest.packs[0]});
 assert.equal((await read(s,1,x=>{if(x.marker==='invalid')throw Error('Replay mismatch');return x;})).marker,'bundle');
 // A newer partial bundle must not suppress older remote-only stages.
 saved.clear();const newerBundle=fixture(Array.from({length:100},(_,i)=>i+1),'2026-11-15T00:00:00.000Z','newer-bundle');
 files.set('https://example.test/bundle/manifest.json',JSON.stringify(newerBundle.manifest));files.set('https://example.test/bundle/pack.json',newerBundle.text);
 const newerStore=create();assert.equal((await newerStore.update()).updated,1);
 assert.equal((await read(newerStore,101)).marker,'remote','Older remote-only record remains obtainable');
 assert.equal((await read(newerStore,1)).marker,'newer-bundle');
 // A matching older downloaded record cannot override a newer bundled record.
 saved.set('schema-1:stages-00001-01000',{text:overlap.text,descriptor:overlap.manifest.packs[0]});
 assert.equal((await read(newerStore,1)).marker,'newer-bundle');
 console.log('PASS production store: same-bucket 1-100 + 101-150 coexist; concurrent title lookup/update dedup; restart offline persistence; invalid newer witness fallback; newer partial bundle does not suppress remote-only records');
})().catch(e=>{console.error(e);process.exitCode=1;});
