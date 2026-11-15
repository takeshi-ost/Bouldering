'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createNativeAutoSync,SYNC_KEY}=require('../scripts/native-auto-sync.cjs');
const {createNativeFirebaseController}=require('../scripts/native-firebase-controller.cjs');
(async()=>{
 const event={sequence:1,board:'v5_existing_78',score:{moves:19,timeMs:60000,scoreSpecVersion:'v5'}};
 const original={version:1,owner:'test-user',activatedAt:42,sequence:1,name:'Test',profile:null,events:[event]};
 const data=new Map([[SYNC_KEY,JSON.stringify(original)],['daily-sentinel','unchanged']]);
 const calls={profiles:0,scores:0};let enabled=true;
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const controller={permissions:()=>({automaticSync:enabled}),authenticate:async()=>({uid:'test-user'}),
 syncAutomaticProfile:async()=>{calls.profiles++;return {written:true,name:'Test'};},
 syncFreshScore:async()=>{calls.scores++;}};
 const queue=createNativeAutoSync({storage,owner:'test-user',controller,courseVersion:'v5',rankingsEnabled:false});
 await queue.flush();
 assert.equal(data.get(SYNC_KEY),JSON.stringify(original),'disabled-only startup does not mutate saved queue');
 assert.equal(queue.recordClear(78,'existing',{...event.score,version:'v5'}),false);
 assert.equal(queue.recordClear(1,'daily',{...event.score,version:'v5'}),false);
 assert.equal(queue.report().freshPending,0);assert.equal(queue.report().retainedEvents,1);
 assert.equal(queue.pendingForBoard('v5_existing_78'),false);
 const profile={name:'Test',colors:['#112233'],headColor:'#223344',reachedLevel:79,reachedPrototypeLevel:1,recordVersion:'r1',progressVersion:'r1'};
 assert(queue.queueProfile(profile));await queue.flush();
 assert.equal(calls.profiles,1);assert.equal(calls.scores,0);
 assert.deepEqual(JSON.parse(data.get(SYNC_KEY)).events,[event]);
 assert.equal(data.get('daily-sentinel'),'unchanged');
 enabled=false;queue.queueProfile({...profile,reachedLevel:80});await queue.flush();
 enabled=true;await queue.flush();assert.equal(calls.profiles,2);assert.equal(calls.scores,0);
 // Direct score entry points are gated before auth, SDK load, or Firestore use.
 let loads=0;
 const native=createNativeFirebaseController({mode:'auto-sync',rankingsEnabled:false,
 policy:()=>({firebaseMode:'auto-sync',firebaseEnabled:true,firebaseAuthAllowed:true,firebaseAnonymousAllowed:true,firebaseReadsAllowed:true,firebaseAutomaticSyncAllowed:true}),
 config:{projectId:'bouldering-7482d'},loadSDK:()=>{loads++;throw Error('unexpected network SDK');},storage});
 assert.deepEqual(await native.adapter().scores('test-user','v5_existing_78'),[]);
 await assert.rejects(native.syncFreshScore('test-user','v5_existing_78',event.score),e=>e.code==='native-firebase/rankings-disabled');
 assert.equal(loads,0);assert.equal(native.permissions().automaticSync,true);assert.equal(native.permissions().deletion,true);
 // Capture generated boot source without building SDKs, touching disk, or accessing a network.
 const captures=[];const root=path.resolve(__dirname,'..');
 const buildContext={module:{exports:{}},require:name=>name==='esbuild'?{buildSync:o=>captures.push(o.stdin.contents)}:name==='node:fs'?{readFileSync:fs.readFileSync,mkdirSync(){},writeFileSync(){}}:require(name)};
 vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/build-native-firebase.cjs'),'utf8'),buildContext);
 buildContext.module.exports(root,'/unused-output','auto-sync');
 const entry=captures[1];
 assert(entry.includes("const rankingsEnabled=typeof COURSE_RANKINGS_ENABLED==='boolean' && COURSE_RANKINGS_ENABLED;"));
 assert(entry.includes('createNativeFirebaseController({mode,config,rankingsEnabled,'));
 assert(entry.includes('courseVersion,rankingsEnabled,startPaused:true'));
 assert(entry.includes('if(rankingsEnabled)await controller.scores(user.uid,firstBoard);'));
 assert(entry.includes('sync.queueProfile(onlineProfile())'));assert(entry.includes("await controller.players(1,1,'existing')"));
 console.log('PASS native rankings disabled: queue retained, new/enqueued sends blocked, direct reads blocked, profile/reconnect/deletion permission retained; memory-only');
})().catch(e=>{console.error(e);process.exitCode=1;});
