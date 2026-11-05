'use strict';
// Exercise actual classic sources, native transformations, preboot, runtime and
// durable queue in a local DOM/storage VM. No SDK, service, or route sweep.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const nativeSource=require('../scripts/native-bundle-source.cjs');
const serviceInput=require('./helpers/coupled-service-input.cjs');
const {createNativeResumeStore,RESUME_KEY,ITEMS_KEY,LIVES_KEY}=require('../scripts/native-resume-store.cjs');
const {installNativeResume}=require('../scripts/native-resume-adapter.cjs');
const {createNativeAutoSync,SYNC_KEY}=require('../scripts/native-auto-sync.cjs');
const files=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
const runtime=fs.readFileSync(path.join(root,'scripts/native-resume-runtime.js'),'utf8');
const preboot=`(${installNativeResume.toString()})(${createNativeResumeStore.toString()});`;
const wallTime=Date.parse('2026-11-03T12:00:00Z');
function initial() {
    return new Map([
        ['ascent.progress.v1',JSON.stringify({existing:{cleared:10},prototype:{cleared:0}})],
        [ITEMS_KEY,'20'],[LIVES_KEY,JSON.stringify({count:3,recoveryAt:null,inProgress:false})],
        ['ascent.records.v1',JSON.stringify({existing:{10:{moves:12,timeMs:1000,version:'v3',scoreSpecVersion:'v3'}},prototype:{}})],
        ['ascent.map-rewards.v1',JSON.stringify({4:{status:'claimed',adRequired:false,adCompleted:false}})],
        ['ascent.pending-scores.v1',JSON.stringify({uid:null,items:[['v3_existing_10',{moves:12,timeMs:1000,version:'v3'}]]})],
        [SYNC_KEY,JSON.stringify({version:1,owner:null,activatedAt:1000,sequence:1,name:'Saved name',profile:null,
            events:[{sequence:1,board:'v4_existing_10',score:{moves:15,timeMs:2000,version:'v4',scoreSpecVersion:'v4'}}]})]
    ]);
}
function boot(data=initial(),{token=null,fault=null,now=wallTime}={}) {
    const operations=[],messages=[],elements={},windowEvents={},documentEvents={},timers=new Map();
    let timerId=0,frameId=0,clock=1000,wallNow=now,serial=0,reloads=0,fail=fault;
    const node=id=>elements[id]||={id,style:{setProperty(){}},classList:{toggle(){},add(){},remove(){},contains(){return false;}},
        events:{},listeners:{},hidden:false,open:false,value:'',querySelector(selector){return node(id+selector);},focus(){document.activeElement=this;},blur(){},
        setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},addEventListener(k,f){(this.listeners[k]||=[]).push(f);this.events[k]=e=>this.listeners[k].forEach(fn=>fn(e));},
        showModal(){this.open=true;},close(){this.open=false;},contains(){return true;},
        getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};
    const document={getElementById:node,documentElement:{},hidden:false,addEventListener(k,f){(documentEvents[k]||=[]).push(f);},querySelectorAll(){return [];}};
    function operation(kind,key,value,action) {
        operations.push({kind,key,value});
        const mode=fail?.(kind,key,value);
        if(mode==='before')throw Error('injected unavailable storage');
        const result=action();
        if(mode==='after')throw Error('injected lost storage acknowledgment');
        return result;
    }
    const storage={getItem:key=>operation('get',key,undefined,()=>data.get(key)??null),
        setItem:(key,value)=>operation('set',key,String(value),()=>data.set(key,String(value))),
        removeItem:key=>operation('remove',key,undefined,()=>data.delete(key)),get length(){return data.size;},key:i=>[...data.keys()][i]??null};
    class ClockDate extends Date {constructor(...args){super(...(args.length?args:[wallNow]));}static now(){return wallNow;}}
    const host={document,localStorage:storage,console,performance:{now:()=>clock},Date:ClockDate,Math,assert,URL,Uint8Array,TextEncoder,TextDecoder,atob,
        crypto:{randomUUID:()=>`attempt-${++serial}`},ASCENT_IOS_BUILD:{configuration:'Debug',debugAllowed:true,syncStatusAllowed:true},
        ASCENT_IOS_RESUME:token?{id:token}:undefined,webkit:{messageHandlers:{ascentResume:{postMessage:m=>messages.push({...m})}}},
        location:{reload(){reloads++;}},fetch(){throw Error('Unexpected network request');},
        setTimeout(fn,delay=0){timers.set(++timerId,{fn,at:clock+delay});return timerId;},clearTimeout:id=>timers.delete(id),
        requestAnimationFrame(){return ++frameId;},cancelAnimationFrame(){},
        window:{devicePixelRatio:1,addEventListener(k,f){(windowEvents[k]||=[]).push(f);},clearTimeout:id=>timers.delete(id),cancelAnimationFrame(){}}};
    const context=vm.createContext(host),run=code=>vm.runInContext(code,context);
    vm.runInContext(preboot,context,{filename:'native-resume-preboot.js'});
    // Real native queue implementation, deliberately paused/offline: no SDK or
    // authentication, and retained bytes remain observable across reloads.
    host.ASCENT_NATIVE_SYNC=createNativeAutoSync({storage,owner:null,startPaused:true,courseVersion:'v4',
        controller:{permissions:()=>({automaticSync:false}),authenticate(){throw Error('Unexpected authentication');}}});
    for(const file of files) {
        if(file==='js/main.js')vm.runInContext(runtime,context,{filename:'native-resume-runtime.js'});
        vm.runInContext(nativeSource(path.basename(file),fs.readFileSync(path.join(root,file),'utf8')),context,{filename:file});
    }
    // Explicit short/straight/no-feature recipe fixture for recovery flow checks.
    // Score 1 alone still samples middle/pair courses (e.g. Stage 11, seed 21).
    // Every fresh VM runs the real generator; broad geometry/distribution and
    // all-stage reachability belong to the independent population gates.
    run(`CourseProgressionConfig.stageSegments=[{fromStage:1,toStage:100,fromScore:1,toScore:1}];
        CourseProgressionConfig.daily.minScore=CourseProgressionConfig.daily.maxScore=1;
        CourseDistributionConfig.tables.length.rows=[{score:0,weights:[1,0,0]},{score:100,weights:[1,0,0]}];`);
    run(serviceInput);
    return {data,storage,operations,messages,node,run,setFault:f=>{fail=f;},clearFault:()=>{fail=null;},reloads:()=>reloads,now:()=>wallNow,
        advance(ms){clock+=ms;wallNow+=ms;},emitWindow(name){for(const fn of windowEvents[name]||[])fn({});},
        emitDocument(name){for(const fn of documentEvents[name]||[])fn({});}};
}
function normal(b,{spent=3,stage=1,debug=false}={}) {
    b.run(`showLevelMap();cancelMapReveal();mapPreparing=false;mapTransition=null;debugMode=${debug};assert(selectStage(${stage},${debug},${spent}));cameraIntro=null;hideStageHelp();runStartedAt=performance.now();`);
    assert.equal(b.run('state'),'playing');assert.equal(b.run('heartItems'),20-spent);
    assert.equal(b.run('lives.inProgress'),!debug);
}
const receipt=b=>JSON.parse(b.data.get(RESUME_KEY)||'null');
const life=b=>JSON.parse(b.data.get(LIVES_KEY));
const preservedKeys=['ascent.records.v1','ascent.progress.v1','ascent.map-rewards.v1','ascent.daily-records.v1',
    'ascent.daily-attempts.v1','ascent.daily-play-ad.v1','ascent.ad-plays.v2','ascent.pending-scores.v1',SYNC_KEY];
const saved=b=>Object.fromEntries(preservedKeys.map(key=>[key,b.data.get(key)]));
const snapshot=b=>b.run('JSON.stringify({heartItems,lives,lifeAttemptId,moveCount,stamina,state})');
function oneShotReceiptFailure(b,mode='before') {
    let used=false,written=false;
    b.setFault((kind,key)=>{
        if(used || key!==RESUME_KEY)return;
        if(mode==='readback') {
            if(kind==='set')written=true;
            else if(kind==='get' && written){used=true;return 'after';}
        } else if(kind==='set'){used=true;return mode;}
    });
}
function oneShotCleanupFailure(b,mode='before') {
    let used=false,written=false;
    b.setFault((kind,key,value)=>{
        if(used || key!==RESUME_KEY)return;
        if(kind==='set') {
            const next=JSON.parse(value);
            if(next.attempt!==null || next.ended!==null)return;
            written=true;
            if(mode!=='readback'){used=true;return mode;}
        } else if(kind==='get' && written && mode==='readback'){used=true;return 'after';}
    });
}
function completeAd(b) {b.advance(10000);b.run('advanceDummyAd(performance.now());assert(completeDummyAd());');}

// Actual start spends selected chalk, writes an active receipt, then a long
// background boot refunds once before classic eager life/chalk saves execute.
{
    const b=boot();normal(b);b.run('servicePlayStep(1);assert.equal(state,"playing");');
    const before=saved(b),attempt=receipt(b).attempt;
    assert.equal(attempt.spent,3);assert.equal(attempt.itemsBefore,20);assert.equal(attempt.chargeLife,true);
    b.advance(300000);const resumed=boot(b.data,{token:'long-a'});
    assert.equal(resumed.run('state'),'choosing');assert.equal(resumed.run('heartItems'),20);
    assert.equal(resumed.run('lives.count'),3);assert.equal(resumed.run('lives.inProgress'),false);
    assert.deepEqual(saved(resumed),before);assert.equal(receipt(resumed).attempt,null);assert.equal(receipt(resumed).completedId,'long-a');
    assert(resumed.messages.some(m=>m.kind==='ready' && m.id==='long-a'));
    const twice=boot(resumed.data,{token:'long-a'});assert.equal(twice.run('heartItems'),20);assert.equal(twice.run('lives.count'),3);assert.deepEqual(saved(twice),before);
    // Replayed old token must not refund the subsequently launched attempt.
    normal(twice,{spent:2});const newer=boot(twice.data,{token:'long-a'});
    assert.equal(newer.run('heartItems'),18);assert.equal(newer.run('lives.count'),2);assert.equal(newer.run('lives.inProgress'),false);
}
// A naturally recovered life during the attempt is retained, together with the
// fractional recovery anchor. The launch-time life count must not be restored.
{
    const data=initial();data.set(LIVES_KEY,JSON.stringify({count:1,recoveryAt:wallTime-30*60*1000+1000,inProgress:false}));
    const b=boot(data);normal(b);b.advance(2000);b.run('recoverLives();');
    assert.equal(b.run('lives.count'),2);const anchor=b.run('lives.recoveryAt');
    const resumed=boot(b.data,{token:'natural-recovery',now:b.now()+300000});
    assert.equal(resumed.run('lives.count'),2);assert.equal(resumed.run('lives.recoveryAt'),anchor);assert.equal(resumed.run('heartItems'),20);
}
// No qualifying native token means ordinary crash semantics: spent chalk stays
// spent and one life is charged, once. Short/focus events do not reload in JS.
{
    const b=boot();normal(b);const before=saved(b),state=snapshot(b);
    b.emitWindow('blur');b.emitWindow('ascent-native-pause');b.emitWindow('ascent-native-resume');b.emitWindow('focus');
    assert.equal(snapshot(b),state);assert.equal(b.reloads(),0);
    const cold=boot(b.data);assert.equal(cold.run('heartItems'),17);assert.equal(cold.run('lives.count'),2);assert.deepEqual(saved(cold),before);
    const twice=boot(cold.data);assert.equal(twice.run('lives.count'),2);assert.equal(twice.run('heartItems'),17);
}
// Completed success/failure cannot be recredited. Actual record/reward hooks and
// the native queued clear survive reload unchanged, including historical queues.
for(const won of [true,false]) {
    const data=initial();if(won)data.set('ascent.map-rewards.v1','{}');
    const b=boot(data);normal(b,{stage:4});b.advance(1500);b.run(`moveCount=8;finish(${won});`);
    assert.equal(b.run('state'),won?'won':'lost');assert.equal(receipt(b).attempt,null);
    assert.equal(b.run('lives.count'),won?3:2);assert.equal(b.run('heartItems'),17);
    if(won) {
        assert.equal(b.run('stageRecords.existing[4].moves'),8);assert.equal(b.run('mapRewards[4].status'),'pending');
        assert.equal(JSON.parse(b.data.get(SYNC_KEY)).events.at(-1).board,'v4_existing_4');
    }
    const before=saved(b),resumed=boot(b.data,{token:'finished-'+won});
    assert.equal(resumed.run('heartItems'),17);assert.equal(resumed.run('lives.count'),won?3:2);assert.deepEqual(saved(resumed),before);
}
// Saved roulette inventory and life rewards are retained after the attempt ends.
{
    const b=boot();normal(b);b.run("moveCount=8;finish(true);applyRouletteReward({kind:'hearts',amount:5});applyRouletteReward({kind:'life',amount:1});");
    const before=saved(b),resumed=boot(b.data,{token:'after-reward'});
    assert.equal(resumed.run('heartItems'),22);assert.equal(resumed.run('lives.count'),4);assert.deepEqual(saved(resumed),before);
}
// Daily and fresh tutorial runs never create normal-attempt receipts and do not
// refund Daily attempts or fabricate normal life/chalk credits on a long boot.
{
    const b=boot();b.run('showDailyCalendar();assert(selectDailyDate("2026-11-03"));cameraIntro=null;hideStageHelp();');
    assert.equal(b.run('dailyRun.date'),'2026-11-03');assert.equal(receipt(b)?.attempt??null,null);
    const before=saved(b),resumed=boot(b.data,{token:'daily-long'});
    assert.equal(resumed.run('heartItems'),20);assert.equal(resumed.run('lives.count'),3);assert.deepEqual(saved(resumed),before);
}
{
    const b=boot(new Map());b.run('TUTORIAL_CONFIG.steps=[];titleReady=true;');b.node('titleScreen').onclick();
    assert.equal(b.run('isTutorialRun()'),true);assert.equal(receipt(b)?.attempt??null,null);
    const before=saved(b),hearts=b.run('heartItems'),count=b.run('lives.count');
    const resumed=boot(b.data,{token:'tutorial-long'});
    assert.equal(resumed.run('state'),'choosing');assert.equal(resumed.run('heartItems'),hearts);assert.equal(resumed.run('lives.count'),count);
    assert.equal(resumed.run('tutorialPending()'),true);assert.deepEqual(saved(resumed),before);
}
// Debug starts may spend chalk but do not mark/charge a normal life.
{
    const b=boot();normal(b,{debug:true});assert.equal(receipt(b).attempt.chargeLife,false);
    const resumed=boot(b.data,{token:'debug-long'});assert.equal(resumed.run('heartItems'),20);assert.equal(resumed.run('lives.count'),3);
}

// Actual normal cadence ads retain their debt until completion. The completed
// stage's chalk, life, score and queue remain settled throughout an ad reload.
for(const complete of [false,true]) {
    const data=initial();data.set('ascent.ad-plays.v2','2');
    const b=boot(data);normal(b,{stage:11});b.run('moveCount=8;finish(true);continueNormalClear();');
    assert.equal(b.run('state'),'ad');assert.equal(b.run('playsSinceAd'),3);assert.equal(receipt(b).attempt,null);
    if(complete)completeAd(b);
    const before=saved(b),resumed=boot(b.data,{token:'normal-ad-'+complete});
    assert.equal(resumed.run('state'),'choosing');assert.equal(resumed.run('dummyAd'),null);
    assert.equal(resumed.run('heartItems'),17);assert.equal(resumed.run('lives.count'),3);
    assert.equal(resumed.run('playsSinceAd'),complete?0:3);assert.deepEqual(saved(resumed),before);
}
// A zero-life reward ad grants nothing until its completion callback. A saved
// grant survives long recovery exactly once and does not pay regular ad debt.
for(const complete of [false,true]) {
    const data=initial();data.set(LIVES_KEY,JSON.stringify({count:0,recoveryAt:wallTime,inProgress:false}));data.set('ascent.ad-plays.v2','3');
    const b=boot(data);b.run('showLevelMap();cancelMapReveal();mapPreparing=false;mapTransition=null;assert(openStageStart(1));');
    assert.equal(b.run('state'),'life-prompt');b.node('lifeWatchAd').onclick();assert.equal(b.run('state'),'ad');
    assert.equal(b.run('lives.count'),0);assert.equal(receipt(b)?.attempt??null,null);
    if(complete) {completeAd(b);assert.equal(b.run('stageStartContext.n'),1);assert.equal(b.run('lives.inProgress'),false);}
    const before=saved(b),resumed=boot(b.data,{token:'life-ad-'+complete});
    assert.equal(resumed.run('lives.count'),complete?1:0);assert.equal(resumed.run('heartItems'),20);
    assert.equal(resumed.run('playsSinceAd'),3);assert.deepEqual(saved(resumed),before);
    const twice=boot(resumed.data,{token:'life-ad-'+complete});assert.equal(twice.run('lives.count'),complete?1:0);assert.deepEqual(saved(twice),before);
}
// An interrupted Daily pre-start ad has not launched another attempt or paid
// its debt. After reload it is still required and normal completion starts once.
{
    const data=initial();data.set('ascent.daily-attempts.v1',JSON.stringify({'2026-11-03':1}));
    data.set('ascent.daily-play-ad.v1',JSON.stringify({plays:1,adPaid:false}));
    const b=boot(data);b.run('showDailyCalendar();assert(selectDailyDate("2026-11-03"));');
    assert.equal(b.run('state'),'ad');assert.equal(b.run('dailyRun'),null);assert.equal(b.run('dailyAttempts["2026-11-03"]'),1);
    const before=saved(b),resumed=boot(b.data,{token:'daily-prestart-ad'});
    assert.equal(resumed.run('heartItems'),20);assert.equal(resumed.run('lives.count'),3);assert.deepEqual(saved(resumed),before);
    resumed.run('showDailyCalendar();assert(selectDailyDate("2026-11-03"));');
    assert.equal(resumed.run('state'),'ad');assert.equal(resumed.run('dailyAttempts["2026-11-03"]'),1);
    assert.equal(resumed.run('JSON.stringify(dailyPlayAdState)'),JSON.stringify({plays:1,adPaid:false}));
    completeAd(resumed);assert.equal(resumed.run('state'),'playing');assert.equal(resumed.run('dailyAttempts["2026-11-03"]'),2);
    assert.equal(resumed.run('JSON.stringify(dailyPlayAdState)'),JSON.stringify({plays:0,adPaid:false}));assert.equal(receipt(resumed)?.attempt??null,null);
}

// Begin write failure blocks before generation/resource debit. Exact retry uses
// the first id, even when the write succeeded but its acknowledgment was lost.
for(const mode of ['before','after']) {
    const b=boot();b.run('showLevelMap();cancelMapReveal();mapPreparing=false;mapTransition=null;');
    const resources=snapshot(b),before=saved(b);oneShotReceiptFailure(b,mode);
    assert.equal(b.run('selectStage(1,false,3)'),false);assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);
    assert.equal(b.run('selectStage(2,false,1)'),false,'A second blocked start cannot replace the pending stage');
    assert.equal(snapshot(b),resources);assert.deepEqual(saved(b),before);assert.equal(b.data.get(ITEMS_KEY),'20');assert.equal(life(b).inProgress,false);
    const writes=b.operations.filter(o=>o.kind==='set' && o.key===RESUME_KEY),firstId=JSON.parse(writes.at(-1).value).attempt.id;
    b.advance(5000);b.clearFault();assert.equal(b.run('ASCENT_NATIVE_RESUME.retry()'),true);
    assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),true);assert.equal(b.run('state'),'playing');assert.equal(b.run('heartItems'),17);assert.equal(life(b).count,3);
    assert.equal(b.run('level'),1);
    assert.equal(receipt(b).attempt.id,firstId);assert.equal(b.run('ASCENT_NATIVE_RESUME.retry()'),true);assert.equal(b.run('heartItems'),17);
}
// A native begin-write retry retains its prepared geometry lease. If that
// lease becomes stale, cancelled or superseded by navigation while blocked, its deferred continuation
// must reject before reset/debit and durably clean up the unused receipt.
// One real preview supplies immutable geometry for all six fault scenarios.
{
    const b=boot();
    b.run(`showLevelMap();cancelMapReveal();mapPreparing=false;mapTransition=null;
        stagePreview(1);
        globalThis.nativeResumePreparedFixture=(()=>{
            const request=coursePreparationIdentity(1),signature=refreshAdoptedCourseCacheDependencies();
            const snapshot=adoptedCourseCache.get(adoptedCourseCacheKey(request,signature));
            assert(snapshot && Object.isFrozen(snapshot));
            return {request,signature,snapshot};
        })();`);
    const staminaRules=b.run('COURSE_STAMINA_CONFIG.rules');
    for(const invalidation of ['configuration','cancelled','navigation'])for(const blockedCleanup of [false,true]) {
        b.run(`cancelMapReveal();mapPreparing=false;mapTransition=null;
            globalThis.nativeResumePreparedLease={...globalThis.nativeResumePreparedFixture,cancelled:false};
            assertPreparedCourse(globalThis.nativeResumePreparedLease,1);`);
        const resources=snapshot(b),before=saved(b),items=b.data.get(ITEMS_KEY),lives=b.data.get(LIVES_KEY);
        oneShotReceiptFailure(b);
        assert.equal(b.run('selectStage(1,false,3,false,globalThis.nativeResumePreparedLease)'),false);
        assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);assert.equal(snapshot(b),resources);
        if(invalidation==='configuration')b.run('COURSE_STAMINA_CONFIG.rules="0:4";');
        else if(invalidation==='cancelled')b.run('globalThis.nativeResumePreparedLease.cancelled=true;');
        else b.run('hideStageStart();'); // Invalidate navigation even if the visible map is unchanged.
        if(blockedCleanup)oneShotCleanupFailure(b);else b.clearFault();
        assert.equal(b.run('ASCENT_NATIVE_RESUME.retry()'),true);
        assert.equal(snapshot(b),resources,'Invalid deferred lease cannot reset the game or spend resources');
        assert.equal(b.data.get(ITEMS_KEY),items);assert.equal(b.data.get(LIVES_KEY),lives);assert.deepEqual(saved(b),before);
        assert.equal(receipt(b).attempt,null);
        if(blockedCleanup) {
            assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);assert(receipt(b).ended);
            b.clearFault();assert.equal(b.run('ASCENT_NATIVE_RESUME.retry()'),true);
        }
        assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),true);assert.equal(b.run('state'),'map');
        assert.equal(receipt(b).attempt,null);assert.equal(receipt(b).ended,null);
        assert.equal(snapshot(b),resources);assert.equal(b.data.get(ITEMS_KEY),items);assert.equal(b.data.get(LIVES_KEY),lives);
        assert.deepEqual(saved(b),before);
        const settled=JSON.stringify([...b.data]);assert.equal(b.run('ASCENT_NATIVE_RESUME.retry()'),true);
        assert.equal(JSON.stringify([...b.data]),settled,'Completed stale-lease cleanup cannot repeat');
        b.run('COURSE_STAMINA_CONFIG.rules='+JSON.stringify(staminaRules)+';');
    }
}
// End write failure freezes movement/timing without settling loss or clear.
// Retry completes exactly that outcome; a second retry cannot duplicate it.
for(const won of [true,false])for(const mode of ['before','after','readback']) {
    const b=boot();normal(b);b.advance(500);b.run('moveCount=8;');
    const before=saved(b),lifeBefore=b.run('lives.count'),moves=b.run('moveCount');oneShotReceiptFailure(b,mode);
    b.run(`finish(${won});`);assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);assert.equal(b.run('state'),'playing');
    b.run(`finish(${!won});`); // A queued opposite result cannot replace the first pending outcome.
    assert.equal(b.run('lives.count'),lifeBefore);assert.equal(b.run('lives.inProgress'),true);assert.equal(b.run('heartItems'),17);assert.deepEqual(saved(b),before);
    assert.equal(b.run('runStartedAt'),null);const elapsed=b.run('runElapsedMs');
    const frozen=b.run('JSON.stringify({body,grips,stamina,moveCount,camera,drag,runStartedAt,runElapsedMs})');
    // The same explicit route action that can move an active run must be fenced
    // while recovery is blocked, including preview, commit and render state.
    b.run(`assert(validFingerAction(route[1].action));assert.equal(route[1].action.bodyMotion,COUPLED_BODY_MODEL);
        down({clientX:123,clientY:330});assert.equal(drag,null);
        for(const p of route[1].action.points)move({clientX:123+p.dx,clientY:330+p.dy});
        release();draw(performance.now());`);
    assert.equal(b.run('JSON.stringify({body,grips,stamina,moveCount,camera,drag,runStartedAt,runElapsedMs})'),frozen);
    assert.equal(b.run('moveCount'),moves);b.advance(5000);b.clearFault();assert.equal(b.run('ASCENT_NATIVE_RESUME.retry()'),true);
    assert.equal(b.run('state'),won?'won':'lost');assert.equal(b.run('lives.count'),lifeBefore-(won?0:1));assert.equal(b.run('runElapsedMs'),elapsed);
    assert.equal(receipt(b).attempt,null);const after=saved(b);b.run('ASCENT_NATIVE_RESUME.retry();');assert.deepEqual(saved(b),after);
}

// A process can die while the end action is paused, including after the receipt
// write succeeded but its readback failed. The ending tombstone must preserve
// this still-unsettled normal run across a long-background boot.
for(const won of [true,false])for(const mode of ['before','after','readback']) {
    const b=boot();normal(b);b.run('moveCount=8;');const before=saved(b);oneShotReceiptFailure(b,mode);
    b.run(`finish(${won});`);assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);assert.equal(b.run('state'),'playing');
    assert.equal(life(b).inProgress,true);assert.equal(b.data.get(ITEMS_KEY),'17');
    if(mode!=='before'){assert.equal(receipt(b).attempt,null);assert(receipt(b).ended);}
    const resumed=boot(b.data,{token:'paused-end-'+won+'-'+mode});
    assert.equal(resumed.run('state'),'choosing');assert.equal(resumed.run('heartItems'),20);assert.equal(resumed.run('lives.count'),3);
    assert.equal(resumed.run('lives.inProgress'),false);assert.equal(receipt(resumed).ended,null);assert.deepEqual(saved(resumed),before);
}

// The outcome may already have saved its life/records/rewards/queued score when
// final cleanup fails. Retry must run cleanup only, and long recovery must not
// refund the finished normal outcome or duplicate its pending reward/queue.
for(const won of [true,false])for(const mode of ['before','after','readback']) {
    const data=initial();data.set('ascent.map-rewards.v1','{}');
    const b=boot(data);normal(b,{stage:4});b.run('moveCount=8;');oneShotCleanupFailure(b,mode);
    b.run(`finish(${won});`);assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);assert.equal(b.run('state'),won?'won':'lost');
    assert.equal(life(b).inProgress,false);assert.equal(life(b).count,won?3:2);assert.equal(b.data.get(ITEMS_KEY),'17');
    if(won){assert.equal(b.run('mapRewards[4].status'),'pending');assert.equal(JSON.parse(b.data.get(SYNC_KEY)).events.at(-1).board,'v4_existing_4');}
    const before=saved(b),crashed=new Map(b.data);
    b.clearFault();b.run('ASCENT_NATIVE_RESUME.retry();');assert.equal(receipt(b).ended,null);assert.deepEqual(saved(b),before);
    assert.equal(life(b).count,won?3:2);assert.equal(b.data.get(ITEMS_KEY),'17');
    const resumed=boot(crashed,{token:'completed-end-'+won+'-'+mode});
    assert.equal(resumed.run('heartItems'),17);assert.equal(resumed.run('lives.count'),won?3:2);assert.deepEqual(saved(resumed),before);
    assert.equal(receipt(resumed).ended,null);
}

// Debug has no persistent normal-life settlement flag. If its outcome ran but
// final cleanup never persisted, the intentional ambiguity favors one chalk
// refund. If cleanup persisted (even with a lost acknowledgment), no refund.
for(const mode of ['before','after']) {
    const b=boot();normal(b,{debug:true});const before=saved(b);oneShotCleanupFailure(b,mode);
    b.run('moveCount=8;finish(true);');assert.equal(b.run('state'),'won');assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);
    const resumed=boot(b.data,{token:'debug-ending-'+mode});
    assert.equal(resumed.run('heartItems'),mode==='before'?20:17);assert.equal(resumed.run('lives.count'),3);assert.deepEqual(saved(resumed),before);
    const twice=boot(resumed.data,{token:'debug-ending-'+mode});assert.equal(twice.run('heartItems'),mode==='before'?20:17);
}
{
    const b=boot();normal(b,{debug:true});b.run('finish(false);');assert.equal(receipt(b).ended,null);
    const resumed=boot(b.data,{token:'debug-completed'});assert.equal(resumed.run('heartItems'),17);assert.equal(resumed.run('lives.count'),3);
}

// Explicit exit paths also persist the end before charging the normal exit
// life. A blocked navigation stays on the same stage until its exact retry.
for(const action of ['showLevelMap()','showTitleScreen()','returnFromStage()']) {
    const b=boot();normal(b);oneShotReceiptFailure(b);
    b.run(action);assert.equal(b.run('ASCENT_NATIVE_RESUME.ready'),false);assert.equal(b.run('state'),'playing');
    assert.equal(b.run('lives.count'),3);assert.equal(b.run('heartItems'),17);
    b.clearFault();b.run('ASCENT_NATIVE_RESUME.retry();');
    assert.equal(b.run('state'),action==='showTitleScreen()'?'choosing':'map');
    assert.equal(b.run('lives.count'),2);assert.equal(b.run('heartItems'),17);assert.equal(receipt(b).attempt,null);
    const resumed=boot(b.data,{token:'exited-'+action});assert.equal(resumed.run('lives.count'),2);assert.equal(resumed.run('heartItems'),17);
}

// A startup refund failure suppresses eager life/chalk saves; retry replays the
// journal then reloads, rather than allowing stale globals to overwrite targets.
{
    const b=boot();normal(b);let failed=false;
    const blocked=boot(b.data,{token:'boot-failure',fault:(kind,key)=>{
        if(!failed && kind==='set' && key===ITEMS_KEY){failed=true;return 'before';}
    }});
    assert.equal(blocked.run('ASCENT_NATIVE_RESUME.ready'),false);assert.equal(blocked.data.get(ITEMS_KEY),'17');assert.equal(life(blocked).inProgress,true);
    assert(receipt(blocked).refund);assert(blocked.messages.some(m=>m.kind==='blocked'));assert(!blocked.messages.some(m=>m.kind==='ready'));
    blocked.clearFault();assert.equal(blocked.run('ASCENT_NATIVE_RESUME.retry()'),true);assert.equal(blocked.reloads(),1);
    assert.equal(blocked.run('ASCENT_NATIVE_RESUME.ready'),false);assert.equal(blocked.data.get(ITEMS_KEY),'20');assert.equal(life(blocked).inProgress,false);
    const recovered=boot(blocked.data,{token:'boot-failure'});assert.equal(recovered.run('heartItems'),20);assert.equal(recovered.run('lives.count'),3);
    assert.equal(recovered.run('ASCENT_NATIVE_RESUME.ready'),true);assert.equal(recovered.run('state'),'choosing');
}
console.log('PASS native resume game: actual native-transformed classic boot with explicit short recipe fixture and coupled finger action, chalk/life long recovery, duplicate/new-attempt and ordinary-crash semantics, retained clear/failure/rewards/queues, normal/life/Daily ads and debt, Daily/tutorial/debug isolation, begin/end/cleanup storage fences and cross-reload recovery, stale/cancelled prepared-lease cleanup without debit, exact retry without replaying outcomes, explicit debug-ending ambiguity, gameplay/timer pause, blocked preboot replay');
