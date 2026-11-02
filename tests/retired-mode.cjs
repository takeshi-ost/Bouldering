'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
assert(!fs.existsSync('js/prototype.js'));assert(!fs.existsSync('tests/prototype.cjs'));
for(const forbidden of ['js/prototype.js','id="prototypeCourse"','id="prototypeDescription"','id="mapCourse"','ロジハラ'])assert(!html.includes(forbidden));
assert(!source.includes('preparePrototypeStage'));assert(!fs.readFileSync('js/text-dev-ja.js','utf8').includes('ロジハラ'));
const env=`const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(k,f){this.events[k]=f},setAttribute(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
// Compare the adopted current generator in a clean context with the same generator
// after retired URLs/modes/saves are encountered. Content parity is separately
// covered against Site41; this test proves legacy mode state cannot alter it.
const specs=[1,5,20,40,'2026-02-04','2026-02-25'];
const clean=vm.createContext({performance,setTimeout:()=>0,clearTimeout(){},specs,hash:s=>crypto.createHash('sha256').update(s).digest('hex')});
vm.runInContext(env+source,clean);
const baseline=JSON.parse(vm.runInContext(`JSON.stringify(specs.map(spec=>{
 courseMode='existing';dailyRun=typeof spec==='string'?dailyProfile(spec):null;
 reset(dailyRun?dailyRun.referenceStage:spec);
 return [spec,hash(JSON.stringify({holds,route,hearts,stamina,difficulty,height:HEIGHT,seed:courseSeed()}))];
}))`,clean));
assert.equal(baseline.length,6);assert.equal(new Set(baseline.map(x=>x[1])).size,6);
const data=new Map([['ascent.progress.v1',JSON.stringify({existing:{cleared:7},prototype:{cleared:90}})],['ascent.records.v1',JSON.stringify({existing:{1:{moves:2,timeMs:123,version:'v1',stars:3}},prototype:{5:{moves:19,timeMs:999,version:'v1',stars:2}}})]]);
const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const ctx=vm.createContext({localStorage:storage,assert,performance,setTimeout:()=>0,clearTimeout(){},hash:s=>crypto.createHash('sha256').update(s).digest('hex'),baseline,location:{protocol:'https:',search:'?course=prototype&debug=true',hash:'#prototype'}});
vm.runInContext(env+source+`
assert.equal(courseMode,'existing');assert.equal(unlockedLevel(),8);assert.equal(stageProgress.prototype.cleared,90);assert(stageRecords.prototype[5]);
startCourse('prototype');assert.equal(courseMode,'existing');assert.equal(unlockedLevel(),8);
setDebugMode(true);syncDebugCourseControls();assert.equal(typeof ui.prototypeCourse,'undefined');assert.equal(typeof preparePrototypeStage,'undefined');
courseMode='prototype';reset(5);assert.equal(courseMode,'existing');
showLevelMap();assert.equal(courseMode,'existing');
dailyRun={returnCourse:'prototype'};leaveDailyRun();assert.equal(courseMode,'existing');
const legacy=JSON.stringify({progress:stageProgress.prototype,records:stageRecords.prototype});
for(const [spec,expected] of baseline){courseMode='existing';dailyRun=typeof spec==='string'?dailyProfile(spec):null;reset(dailyRun?dailyRun.referenceStage:spec);assert.equal(hash(JSON.stringify({holds,route,hearts,stamina,difficulty,height:HEIGHT,seed:courseSeed()})),expected,String(spec));}
assert.equal(JSON.stringify({progress:stageProgress.prototype,records:stageRecords.prototype}),legacy);
assert.equal(scoreBoardKey(5,'existing'),COURSE_VERSION+'_existing_5');assert.equal(currentScoreMetadata().scoreSpecVersion,COURSE_VERSION);
assert.equal(queueOnlineScore(5,'prototype',{moves:1,timeMs:1}),false);assert.deepEqual(onlineStageScores(5,'prototype'),[]);
`,ctx);
(async()=>{
 // Retain old Web entries without transmitting them or starving the supported queue.
 await vm.runInContext(`(async()=>{onlineScores.pending=new Map([['v1_prototype_5',{moves:19,timeMs:999}],['v1_existing_1',{moves:2,timeMs:123}]]);onlineScores.owner=online.uid='mock';online.ready=true;const sent=[];online.adapter={saveScore:async(u,b,s)=>{sent.push(b);return s}};await flushOnlineScores();assert.deepEqual(sent,['v1_existing_1']);assert(onlineScores.pending.has('v1_prototype_5'));assert(!onlineScores.pending.has('v1_existing_1'));})()`,ctx);
 const {createNativeAutoSync,SYNC_KEY}=require('../scripts/native-auto-sync.cjs');
 const old={sequence:1,board:'v1_prototype_5',score:{moves:19,timeMs:999}};
 const map=new Map([[SYNC_KEY,JSON.stringify({version:1,owner:'mock',sequence:1,name:'Guest',events:[old],profile:null})]]),store={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 let enabled=false;const sent=[];const controller={permissions:()=>({automaticSync:enabled}),authenticate:async()=>({uid:'mock'}),syncFreshScore:async(u,b)=>sent.push(b)};
 const sync=createNativeAutoSync({courseVersion:'v1',storage:store,owner:'mock',controller});assert(!sync.recordClear(1,'prototype',{version:'v1',moves:1,timeMs:1}));assert(sync.recordClear(1,'existing',{version:'v1',moves:2,timeMs:123}));enabled=true;await sync.flush();assert.deepEqual(sent,['v1_existing_1']);assert.deepEqual(JSON.parse(map.get(SYNC_KEY)).events,[old]);
 const {createNativeAccountLifecycle,KEY}=require('../scripts/native-account-lifecycle.cjs');
 map.set(KEY,JSON.stringify({version:1,bundle:'com.kamogawagames.ascent',phase:'active',consent:true,offered:true,owner:'mock',sequence:1,events:[old],profile:null,stage:'lock'}));enabled=false;sent.length=0;
 const account=createNativeAccountLifecycle({courseVersion:'v1',storage:store,bundleIdentifier:'com.kamogawagames.ascent',controller:()=>controller});assert(!account.recordClear(1,'prototype',{version:'v1',moves:1,timeMs:1}));assert(account.recordClear(1,'existing',{version:'v1',moves:2,timeMs:123}));enabled=true;await account.flush();assert.deepEqual(sent,['v1_existing_1']);assert.deepEqual(JSON.parse(map.get(KEY)).events,[old]);
 console.log('PASS retired mode: generator/UI absent, Web Debug/direct/URL/legacy Daily fallback, old progress/records retained, six exact current clean-versus-legacy normal/Daily generation hashes, isolated current keys, Web/native legacy queues retained and never transmitted while normal queue drains');
})().catch(e=>{console.error(e);process.exitCode=1;});
