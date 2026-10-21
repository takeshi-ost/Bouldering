const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
let client=fs.readFileSync(path.join(__dirname,'../js/firebase-client.js'),'utf8');
client=client.slice(0,client.indexOf("window.addEventListener('online'"));
client=client.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/12\.11\.0\/firebase-(app|auth|firestore)\.js'\)/g,(_,name)=>`Promise.resolve(sdk.${name})`);
(async()=>{
 const calls=[],store=new Map();let adapter,signIns=0,active=0,peak=0;
 let restoredUser={uid:'existing-user'},rejectPersistence=false;
 const sdk={
  app:{getApps:()=>[],initializeApp(config){assert.equal(config.projectId,'bouldering-7482d');return {}; }},
  auth:{browserLocalPersistence:'persistent',getAuth:()=>({get currentUser(){return restoredUser;},async authStateReady(){calls.push('restore');}}),
   async setPersistence(auth,value){assert.equal(value,'persistent');calls.push('persist');if(rejectPersistence)throw new Error('Storage disabled');},async signInAnonymously(){signIns++;return {user:{uid:'new-user'}};}},
  firestore:{getFirestore:()=>({}),doc:(db,collection,id)=>{assert.equal(collection,'players');return id;},
   serverTimestamp:()=>({serverTime:true}),async runTransaction(db,fn){return fn({async get(id){return {exists:()=>store.has(id),data:()=>store.get(id)};},set(id,data){store.set(id,data);}});},
   collection:(db,name)=>name,where:(field,op,n)=>({field,op,n}),limit:n=>({limit:n}),query:(...parts)=>parts,
   async getDocs(query){const [,where,limit]=query;assert.equal(limit.limit,6);assert.equal(where.op,'==');
    active++;peak=Math.max(peak,active);await new Promise(r=>setImmediate(r));active--;
    return {docs:[{id:'p'+where.n,data:()=>({name:'Player',reachedLevel:where.n})}]};}
  }
 };
 const hooks={async start(a){adapter=a;},status(){}};
 const env=`const online={adapter:null};function startOnline(a){return hooks.start(a);}function setOnlineStatus(s){hooks.status(s);}
 function onlineProfileFrom(p){const {updatedAt,...profile}=p;return profile;}function mergeOnlineProfile(local,remote,prefer){return remote&&!prefer?remote:local;}
 function onlineProfileKey(p){return JSON.stringify(p);}`;
 await new Function('sdk','hooks',env+client+';return bootFirebase();')(sdk,hooks);
 assert(adapter);const user=await adapter.authenticate();assert.equal(user.uid,'existing-user');assert.equal(signIns,0);assert.deepEqual(calls,['persist','restore']);
 restoredUser=null;assert.equal((await adapter.authenticate()).uid,'new-user');assert.equal(signIns,1);
 rejectPersistence=true;await assert.rejects(adapter.authenticate(),/Storage disabled/);assert.equal(signIns,1,'No throwaway identity when persistence is unavailable');rejectPersistence=false;
 const profile={name:'Player',colors:['#123456'],headColor:'#abcdef',reachedLevel:2,reachedPrototypeLevel:1};
 assert.deepEqual(await adapter.sync(user.uid,profile,true),profile);
 assert.deepEqual(store.get('existing-user'),{...profile,updatedAt:{serverTime:true}});
 const saved=store.get('existing-user');await adapter.sync(user.uid,profile,true);assert.equal(store.get('existing-user'),saved,'Unchanged login does not write again');
 const rows=await adapter.players(1,20,'existing');assert.equal(rows.length,20);assert.equal(new Set(rows.map(p=>p.id)).size,20);assert(peak<=4);
 console.log('PASS Firebase adapter: persistent restored UID, transactional profile writes and server timestamps, unchanged-write suppression, per-level bounded queries and four-request concurrency');
})().catch(e=>{console.error(e);process.exitCode=1;});
