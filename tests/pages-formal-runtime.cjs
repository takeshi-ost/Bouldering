'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{buildPagesFormal}=require('../scripts/build-pages-formal.cjs');
const prefix='ascent.pages-trial.0.4.12.d6.';
function build(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ascent-formal-minimal-'));return {dir,...buildPagesFormal({outputDir:dir,allowDirty:true})};}
function boot(dir,data){
 const elements={},operations=[];let created=0;
 const node=id=>elements[id]||={id,style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},events:{},hidden:false,open:false,value:'',focus(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;},appendChild(){},append(){},contains(){return true;},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};
 const storage={getItem(k){operations.push(['get',k]);return data.get(k)??null;},setItem(k,v){operations.push(['set',k]);data.set(k,String(v));},removeItem(k){operations.push(['remove',k]);data.delete(k);},key:i=>[...data.keys()][i]??null,get length(){return data.size;}};
 const context=vm.createContext({localStorage:storage,document:{getElementById:node,createElement:()=>node('new'+(++created)),documentElement:{},addEventListener(){}},window:{devicePixelRatio:1,addEventListener(){}},console,performance,crypto:crypto.webcrypto,URL,Uint8Array,TextEncoder,TextDecoder,atob,setTimeout:()=>0,clearTimeout(){},requestAnimationFrame(){},fetch(url){throw Error('Unexpected network during local startup: '+url);}});
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),scripts=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
 for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(dir,file),'utf8'),context,{filename:file});
 return {context,operations,data,run:code=>vm.runInContext(code,context)};
}
test('minimal artifact preserves original order and includes existing Firebase module, with no migration/policy machinery',()=>{
 const {dir,manifest}=build();try{
  const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),original=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=source=>[...source.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
  assert.deepEqual(scripts(html),['js/pages-storage.js',...scripts(original),'js/formal-debug-seed.js']);
  assert(/<script type="module" src="js\/firebase-client.js\?v=/.test(html));
  assert.equal(fs.readFileSync(path.join(dir,'js/firebase-client.js'),'utf8'),fs.readFileSync(path.join(root,'js/firebase-client.js'),'utf8'));
  assert(!/formalEntry|pagesTrialLabel|pages-trial-seed|formal-save-migration|formal-web-online|Web Locks/.test(html));
  assert.equal(manifest.storagePrefix,prefix);assert.equal(manifest.normalVersion,'v4');assert.equal(manifest.dailyVersion,'v3');assert.equal(manifest.normalSeedOffset,10);
  assert(manifest.csp.includes('https://www.gstatic.com'));assert(manifest.csp.includes('https://firestore.googleapis.com'));
  for(const file of manifest.files){assert(!/migration|formal-pages-entry|formal-web-online/.test(file.path));assert(!/^(?:ios|docs|tests|\.git)\//.test(file.path));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file.path))).digest('hex'),file.sha256);}
  console.log('PASS minimal formal artifact: '+manifest.files.length+' files / '+manifest.totalBytes+' bytes, Firebase packaged but not executed in tests');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('existing prefixed save continues in place; raw unrelated data untouched and local TAP does not await Firebase',()=>{
 const {dir}=build();try{
  const raw=[['ascent.progress.v1','raw-formal-preserve'],['unrelated','keep']],data=new Map(raw);
  data.set(prefix+'ascent.progress.v1',JSON.stringify({existing:{cleared:12},prototype:{cleared:0}}));
  const records=JSON.stringify({existing:{1:{version:'trial-d7-offset10',scoreSpecVersion:'trial-d7-offset10',moves:8,timeMs:1234,stars:3,appVersion:'0.4.45'}},prototype:{}});
  data.set(prefix+'ascent.records.v1',records);data.set(prefix+'ascent.ad-plays.v2','2');
  data.set(prefix+'ascent.heart-items.v1','17');
  data.set(prefix+'ascent.daily-records.v1',JSON.stringify({'2026-10-30':{moves:10,timeMs:1000,stars:3,scoreSpecVersion:'trial-d6-0.4.12',clearedOn:'2026-10-30',rewardStatus:'claimed'}}));
  const b=boot(dir,data);assert.equal(b.run('stageProgress.existing.cleared'),12);assert.equal(b.run('heartItems'),17);assert.equal(b.run('dailyRecords["2026-10-30"].moves'),10);assert.equal(b.run('tutorialPending()'),false);assert.equal(b.run('stageRecords.existing[1].moves'),8);assert.equal(data.get(prefix+'ascent.records.v1'),records);assert.equal(b.run('playsSinceAd'),2);
  assert.equal(b.run('state'),'choosing');b.run('titleReady=true;ui.titleScreen.onclick();');assert.equal(b.run('state'),'map');
  assert.equal(b.run('online.adapter'),null);assert.equal(b.run('CourseProgression.resolveStage(1).seed'),11);
  for(const [key,value]of raw)assert.equal(data.get(key),value);
  assert(b.operations.every(([,key])=>key.startsWith(prefix)));assert(![...data.keys()].some(key=>/migration|generation\.v1|formal-save/.test(key)));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('fresh prefix still enters STAGE0 despite unrelated raw saves',()=>{
 const {dir}=build();try{
  const data=new Map([['ascent.player-uuid.v1','old-raw-uuid']]),b=boot(dir,data);
  assert.equal(b.run('tutorialPending()'),true);b.run('titleReady=true;ui.titleScreen.onclick();');
  assert.equal(b.run('level'),0);assert.equal(b.run('isTutorialRun()'),true);assert.equal(b.run('stamina'),14);
  assert.equal(data.get('ascent.player-uuid.v1'),'old-raw-uuid');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('thin facade is initially inert, avoids duplicate prefix and limits cleanup to existing prefix',()=>{
 const data=new Map([['ascent.progress.v1','raw'],['other','safe'],[prefix+'ascent.progress.v1','trial']]),operations=[];
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){operations.push(k);data.set(k,v);},removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size;}};
 const context=vm.createContext({localStorage:storage});vm.runInContext(fs.readFileSync(path.join(root,'scripts/pages-storage.js'),'utf8'),context);
 const s=context.ASCENT_FORMAL_STORAGE;assert.equal(operations.length,0);assert.equal(s.length,1);assert.equal(s.key(0),'ascent.progress.v1');
 assert.equal(s.getItem('ascent.progress.v1'),'trial');assert.equal(s.physicalKey(prefix+'ascent.progress.v1'),prefix+'ascent.progress.v1');
 s.setItem(prefix+'ascent.progress.v1','updated');assert.equal(data.get(prefix+'ascent.progress.v1'),'updated');assert(!data.has(prefix+prefix+'ascent.progress.v1'));
 s.clear();assert.deepEqual([...data],[['ascent.progress.v1','raw'],['other','safe']]);
});
