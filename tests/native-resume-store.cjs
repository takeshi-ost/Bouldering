'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {createNativeResumeStore,RESUME_KEY,ITEMS_KEY,LIVES_KEY}=require('../scripts/native-resume-store.cjs');
const originalLives={count:2,recoveryAt:1000,inProgress:false,attemptAt:1500};
const attempt={id:'attempt-a',spent:3,itemsBefore:20,chargeLife:true};
const retained=new Map([
    ['ascent.records.v1','{"existing":{"4":{"moves":11,"timeMs":500}}}'],
    ['ascent.map-rewards.v1','{"4":{"status":"pending","adCompleted":true}}'],
    ['ascent.daily-records.v1','{"2026-11-03":{"rewardStatus":"claimed"}}'],
    ['ascent.pending-scores.v1','{"items":[["v4_existing_4",{"moves":11}]]}'],
    ['ascent.native-sync.after-enable.v1','{"sequence":8,"events":[{"sequence":8}]}'],
    ['ascent.tutorial.v1','{"status":"complete"}'],
    ['ascent.music.v1','{"enabled":false,"volume":0.3}']
]);
function fixture(source) {
    const data=source?new Map(source):new Map([...retained,[ITEMS_KEY,'20'],[LIVES_KEY,JSON.stringify(originalLives)]]);
    let fault=null,operations=[];
    function step(type,key,action) {
        const index=operations.length;operations.push({type,key});
        const match=fault?.index===index;
        if(match && fault.when==='before')throw Error('injected process death');
        if(match && fault.when==='drop' && type==='set')return;
        const result=action();
        if(match && fault.when==='after')throw Error('injected process death');
        if(match && fault.when==='mismatch' && type==='get')return 'injected readback mismatch';
        return result;
    }
    const storage={getItem:key=>step('get',key,()=>data.get(key)??null),setItem:(key,value)=>step('set',key,()=>data.set(key,value))};
    return {data,storage,store:()=>createNativeResumeStore({storage}),
        arm:(index,when)=>{operations=[];fault={index,when};},reset:()=>{operations=[];fault=null;},operations:()=>operations};
}
function active({life=true,spent=3}={}) {
    const h=fixture(),s=h.store();s.beginAttempt({...attempt,spent,chargeLife:life});
    h.data.set(ITEMS_KEY,JSON.stringify(attempt.itemsBefore-spent));
    h.data.set(LIVES_KEY,JSON.stringify({...originalLives,inProgress:life}));
    h.reset();return h;
}
const lives=h=>JSON.parse(h.data.get(LIVES_KEY));
const items=h=>JSON.parse(h.data.get(ITEMS_KEY));
function unchangedUnrelated(h) {for(const [key,value] of retained)assert.equal(h.data.get(key),value,key);}
function recovered(h,token='background-a') {
    assert.equal(items(h),20);assert.deepEqual(lives(h),originalLives);
    assert.deepEqual(h.store().status(),{version:1,completedId:token,attempt:null,ended:null,refund:null});
    unchangedUnrelated(h);
}

// First start, exact retry, conflicting start, normal refund and native replay.
{
    const h=fixture(),s=h.store();assert.equal(h.data.has(RESUME_KEY),false);
    assert(s.beginAttempt(attempt));const saved=h.data.get(RESUME_KEY);
    h.reset();assert(s.beginAttempt({...attempt}));assert(h.operations().every(o=>o.type==='get'));
    assert.equal(h.data.get(RESUME_KEY),saved);
    assert.throws(()=>s.beginAttempt({...attempt,spent:2}),/attempt-conflict/);
    assert.throws(()=>s.beginAttempt({...attempt,id:'attempt-b'}),/attempt-active/);
    h.data.set(ITEMS_KEY,'17');h.data.set(LIVES_KEY,JSON.stringify({...originalLives,inProgress:true}));
    assert(s.recover('background-a'));recovered(h);
    assert.equal(s.recover('background-a'),false);recovered(h);
    s.beginAttempt({...attempt,id:'attempt-b',spent:2});
    h.data.set(ITEMS_KEY,'18');h.data.set(LIVES_KEY,JSON.stringify({...originalLives,inProgress:true}));
    assert.equal(s.recover('background-a'),false,'Old token must not refund a newer attempt');
    assert.equal(s.status().attempt.id,'attempt-b');assert.equal(items(h),18);assert(lives(h).inProgress);
    assert(s.recover('background-b'));recovered(h,'background-b');
    const detached=s.status();detached.completedId='changed';assert.equal(s.status().completedId,'background-b');
}

// A pre-debit interruption cannot manufacture chalk or spend a life. Every
// ordering of the two caller-owned debit writes is safe during long recovery.
for(const debitItems of [false,true])for(const markLife of [false,true]) {
    const h=fixture(),s=h.store();s.beginAttempt(attempt);
    if(debitItems)h.data.set(ITEMS_KEY,'17');
    if(markLife)h.data.set(LIVES_KEY,JSON.stringify({...originalLives,inProgress:true}));
    s.recover('background-a');recovered(h);
}

// Preserve current, not launch-time, natural recovery and any future life field.
{
    const h=active(),s=h.store();const current={count:3,recoveryAt:null,inProgress:true,attemptAt:1500,extension:'retained'};
    h.data.set(LIVES_KEY,JSON.stringify(current));s.recover('background-a');
    assert.deepEqual(lives(h),{...current,inProgress:false});assert.equal(items(h),20);
}
// Zero-chalk attempts never read/write inventory; nonlife debug chalk never
// reads/writes lives. No-attempt Daily/tutorial/ad/title recovery changes neither.
{
    const h=active({spent:0}),s=h.store();h.data.set(ITEMS_KEY,'invalid-but-unrelated');h.reset();s.recover('zero-chalk');
    assert(h.operations().every(o=>o.key!==ITEMS_KEY));assert.equal(lives(h).inProgress,false);
}
{
    const h=active({life:false}),s=h.store();h.data.set(LIVES_KEY,'invalid-but-unrelated');h.reset();s.recover('debug-chalk');
    assert(h.operations().every(o=>o.key!==LIVES_KEY));assert.equal(items(h),20);assert.equal(h.data.get(LIVES_KEY),'invalid-but-unrelated');
}
for(const context of ['daily','tutorial','ad','title','map','won','lost']) {
    const h=fixture(),s=h.store();h.data.set(ITEMS_KEY,'invalid-but-unrelated');h.data.set(LIVES_KEY,'invalid-but-unrelated');h.reset();
    assert(s.recover(context));assert(h.operations().every(o=>o.key===RESUME_KEY));unchangedUnrelated(h);
}

// End remains recoverable until the normal outcome durably settles its life.
// This includes a successful end write whose readback/acknowledgment was lost.
{
    const h=active(),s=h.store();s.endAttempt();s.endAttempt();
    assert.equal(s.status().attempt,null);assert.deepEqual(s.status().ended,attempt);
    s.recover('background-a');recovered(h);
}
// Once the outcome is saved, never refund or overwrite subsequent rewards.
for(const count of [2,3,5]) {
    const h=active(),s=h.store();s.endAttempt();
    h.data.set(LIVES_KEY,JSON.stringify({...originalLives,count,inProgress:false}));h.data.set(ITEMS_KEY,'25');
    const beforeLives=h.data.get(LIVES_KEY);s.recover('background-a');
    assert.equal(items(h),25);assert.equal(h.data.get(LIVES_KEY),beforeLives);
    assert.equal(s.status().attempt,null);assert.equal(s.status().ended,null);unchangedUnrelated(h);
}
// Nonlife endings cannot prove whether their outcome already completed. Until
// final cleanup persists, return chalk once, including that ambiguous debug-only
// interruption. A completed cleanup never refunds a finished debug outcome.
for(const completed of [false,true]) {
    const h=active({life:false}),s=h.store();s.endAttempt();
    if(completed)s.completeEnd();s.recover('background-a');s.recover('background-a');
    assert.equal(items(h),completed?17:20);assert.deepEqual(lives(h),originalLives);assert.equal(s.status().ended,null);
}
// Cleanup is idempotent, preserves the last native receipt and never clears a
// newer active attempt. Its retry must not require rerunning the caller outcome.
{
    const h=active(),s=h.store();s.endAttempt();s.completeEnd();s.completeEnd();
    assert.equal(s.status().ended,null);s.beginAttempt({...attempt,id:'next'});s.completeEnd();
    assert.equal(s.status().attempt.id,'next');
}
// Ordinary crash boot discards active and ending receipts, without changing the
// game resource keys that its existing eager crash penalty will settle.
for(const ending of [false,true]) {
    const h=active(),s=h.store(),beforeLives=h.data.get(LIVES_KEY);
    if(ending)s.endAttempt();s.discardStaleAttempt();
    assert.equal(items(h),17);assert.equal(h.data.get(LIVES_KEY),beforeLives);
    assert.equal(s.status().attempt,null);assert.equal(s.status().ended,null);assert.equal(s.status().completedId,null);unchangedUnrelated(h);
}

// Before/after every final cleanup storage call: normal outcomes already saved
// as settled remain settled even if cleanup was not acknowledged. For debug,
// only an unpersisted cleanup retains the conservative one-time refund option.
for(const chargeLife of [true,false]) {
    function source() {
        const h=active({life:chargeLife});h.store().endAttempt();
        h.data.set(LIVES_KEY,JSON.stringify({...originalLives,count:chargeLife?1:2,inProgress:false}));
        return h;
    }
    const probe=source(),s=probe.store();probe.reset();s.completeEnd();const sequence=probe.operations();
    for(let cut=0;cut<sequence.length;cut++)for(const when of ['before','after']) {
        const h=source(),store=h.store();h.arm(cut,when);assert.throws(()=>store.completeEnd(),/native-resume\//);
        h.reset();const stillEnding=h.store().status().ended!==null,beforeLives=h.data.get(LIVES_KEY);
        h.store().recover('background-a');h.store().recover('background-a');
        assert.equal(items(h),!chargeLife && stillEnding?20:17);assert.equal(h.data.get(LIVES_KEY),beforeLives);
        assert.equal(h.store().status().ended,null);unchangedUnrelated(h);
    }
}

// Crash/throw immediately before and after EVERY storage call in recovery,
// including each write and its readback. A fresh process finishes exactly once.
let recoveryCrashCases=0;
for(const ending of [false,true]) {
    function source(){const h=active();if(ending)h.store().endAttempt();return h;}
    const probe=source(),s=probe.store();probe.reset();s.recover('background-a');const sequence=probe.operations();
    assert(sequence.some(o=>o.type==='set' && o.key===ITEMS_KEY));
    assert(sequence.some(o=>o.type==='set' && o.key===LIVES_KEY));
    for(let cut=0;cut<sequence.length;cut++)for(const when of ['before','after']) {
        const h=source(),store=h.store();h.arm(cut,when);
        assert.throws(()=>store.recover('background-a'),/native-resume\//,`recovery ${cut} ${when}`);
        h.reset();h.store().recover('background-a');recovered(h);
        h.store().recover('background-a');recovered(h);recoveryCrashCases++;
    }
    // A setter that silently drops data and a bad readback are failures too.
    for(let cut=0;cut<sequence.length;cut++) {
        if(sequence[cut].type==='set') {
            const h=source(),store=h.store();h.arm(cut,'drop');assert.throws(()=>store.recover('background-a'),/persistence-failed/);
            h.reset();h.store().recover('background-a');recovered(h);
        }
        if(sequence[cut].type==='get' && cut>0 && sequence[cut-1].type==='set') {
            const h=source(),store=h.store();h.arm(cut,'mismatch');assert.throws(()=>store.recover('background-a'),/persistence-failed/);
            h.reset();h.store().recover('background-a');recovered(h);
        }
    }
}

// The same failure matrix at begin/end. A begin whose verified reply was lost
// can be retried with the same id; an end whose reply was lost retains evidence.
for(const operation of ['beginAttempt','endAttempt']) {
    const probe=operation==='beginAttempt'?fixture():active(),s=probe.store();probe.reset();s[operation](attempt);
    const sequence=probe.operations();
    for(let cut=0;cut<sequence.length;cut++)for(const when of ['before','after']) {
        const h=operation==='beginAttempt'?fixture():active(),store=h.store();h.arm(cut,when);
        assert.throws(()=>store[operation](attempt),/native-resume\//,`${operation} ${cut} ${when}`);
        h.reset();const restarted=h.store();assert(restarted[operation](attempt));
        if(operation==='beginAttempt') {assert.deepEqual(restarted.status().attempt,attempt);restarted.recover('background-a');recovered(h);}
        else {assert.equal(restarted.status().attempt,null);assert.deepEqual(restarted.status().ended,attempt);restarted.recover('background-a');recovered(h);}
        unchangedUnrelated(h);
    }
}

// Cross-reload regression: crash before/after every end storage call, then go
// directly to long recovery without retrying the failed end in the old page.
{
    const probe=active(),s=probe.store();probe.reset();s.endAttempt();const sequence=probe.operations();
    for(let cut=0;cut<sequence.length;cut++)for(const when of ['before','after']) {
        const h=active(),store=h.store();h.arm(cut,when);assert.throws(()=>store.endAttempt(),/native-resume\//);
        h.reset();h.store().recover('background-a');recovered(h);
    }
}
// A new attempt replaces the tombstone; a duplicate completed token leaves a
// later ending attempt alone rather than clearing its still-unsettled evidence.
{
    const h=active(),s=h.store();s.recover('background-a');s.beginAttempt({...attempt,id:'next'});s.endAttempt();
    const ended=s.status().ended;s.recover('background-a');assert.deepEqual(s.status().ended,ended);
    s.beginAttempt({...attempt,id:'later'});assert.equal(s.status().ended,null);assert.equal(s.status().attempt.id,'later');
}

// Recover the persisted journal even if native no longer supplies the token.
// Any subsequent mutation first resolves that same journal.
for(const next of ['discardStaleAttempt','endAttempt','beginAttempt','recover']) {
    const h=active(),s=h.store();h.arm(3,'after'); // set receipt after receipt/items/lives reads
    assert.throws(()=>s.recover('background-a'),/native-resume\//);
    h.reset();assert(h.store().status().refund);
    const restarted=h.store();
    if(next==='beginAttempt')restarted.beginAttempt({...attempt,id:'next',spent:0});
    else if(next==='recover')restarted.recover('background-b');else restarted[next]();
    assert.equal(items(h),20);assert.deepEqual(lives(h),originalLives);
    assert.equal(restarted.status().completedId,next==='recover'?'background-b':'background-a');
    assert.equal(restarted.status().attempt?.id??null,next==='beginAttempt'?'next':null);unchangedUnrelated(h);
}

// Unexpected balances are never overwritten. This includes changes occurring
// after the refund intent was persisted, while the caller is expected to fence.
for(const count of [0,16,18,19,21,Number.MAX_SAFE_INTEGER]) {
    const h=active(),s=h.store();h.data.set(ITEMS_KEY,JSON.stringify(count));const before=new Map(h.data);
    assert.throws(()=>s.recover('background-a'),/items-changed/);assert.deepEqual(h.data,before);
}
{
    const h=active(),s=h.store();h.arm(3,'after');assert.throws(()=>s.recover('background-a'));
    h.reset();h.data.set(ITEMS_KEY,'25');const before=new Map(h.data);
    assert.throws(()=>h.store().discardStaleAttempt(),/items-changed/);assert.deepEqual(h.data,before);
}
{
    const h=active(),s=h.store();h.arm(3,'after');assert.throws(()=>s.recover('background-a'));
    h.reset();const changed=JSON.stringify({...originalLives,count:5,inProgress:true});h.data.set(LIVES_KEY,changed);
    assert.throws(()=>h.store().recover('background-a'),/lives-changed/);assert.equal(h.data.get(LIVES_KEY),changed);
    assert.equal(items(h),20);assert(h.store().status().refund);
    h.data.set(LIVES_KEY,JSON.stringify({...originalLives,inProgress:true}));h.store().recover('background-a');recovered(h);
}

// Corrupt/unsupported receipts and resource values fail closed, preserving bytes.
const validReceipt={version:1,completedId:null,attempt:null,ended:null,refund:null};
for(const raw of ['broken','null','[]','{}',JSON.stringify({...validReceipt,version:2}),
    JSON.stringify({...validReceipt,completedId:''}),JSON.stringify({...validReceipt,attempt:{...attempt,spent:21}}),
    JSON.stringify({...validReceipt,attempt:{...attempt,chargeLife:1}}),JSON.stringify({...validReceipt,refund:{token:'x',items:null,lives:null}}),
    JSON.stringify({...validReceipt,attempt,refund:{token:'x',items:{before:17,after:19},lives:null}}),
    JSON.stringify({...validReceipt,ended:{...attempt,spent:21}}),JSON.stringify({...validReceipt,attempt,ended:attempt})]) {
    const h=fixture();h.data.set(RESUME_KEY,raw);const before=new Map(h.data);
    assert.throws(()=>h.store(),/native-resume\//);assert.deepEqual(h.data,before);
}
for(const raw of ['broken','null','"17"','-1','1.5','9007199254740992']) {
    const h=active(),s=h.store();h.data.set(ITEMS_KEY,raw);const before=new Map(h.data);
    assert.throws(()=>s.recover('background-a'),/invalid-items/);assert.deepEqual(h.data,before);
}
for(const value of [null,[],{}, {...originalLives,count:6},{...originalLives,count:1.5},
    {...originalLives,recoveryAt:-1},{...originalLives,inProgress:'true'},{...originalLives,attemptAt:-1}]) {
    const h=active(),s=h.store();h.data.set(LIVES_KEY,JSON.stringify(value));const before=new Map(h.data);
    assert.throws(()=>s.recover('background-a'),/invalid-lives/);assert.deepEqual(h.data,before);
}
for(const input of [null,{}, {...attempt,id:''},{...attempt,spent:-1},{...attempt,spent:1.5},
    {...attempt,itemsBefore:Number.MAX_SAFE_INTEGER+1},{...attempt,chargeLife:1}])assert.throws(()=>fixture().store().beginAttempt(input),/invalid-attempt/);
for(const token of [null,undefined,0,'','x'.repeat(201)])assert.throws(()=>fixture().store().recover(token),/invalid-token/);
assert.throws(()=>createNativeResumeStore(),/storage-unavailable/);
assert.throws(()=>createNativeResumeStore({storage:{getItem(){throw Error('blocked');},setItem(){}}}),/storage-unavailable/);

// The builder may serialize just this function: no CommonJS/helper dependency.
{
    const h=active();const factory=vm.runInNewContext('('+createNativeResumeStore.toString()+')');
    const store=factory({storage:h.storage});assert(store.recover('background-a'));recovered(h);
}
console.log(`PASS native resume store: ${recoveryCrashCases} active/ending recovery crash boundaries; begin/end/cleanup failures; unsettled ending tombstone and settled-outcome preservation; explicit nonlife-ending ambiguity; durable replay without native token; duplicate/new-attempt isolation; pre-debit safety; current life preservation; corrupt storage fences; unrelated saves and standalone browser packaging`);
