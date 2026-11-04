'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {createNativeResumeStore,RESUME_KEY,ITEMS_KEY,LIVES_KEY}=require('../scripts/native-resume-store.cjs');
const {installNativeResume}=require('../scripts/native-resume-adapter.cjs');
function fixture({data=new Map(),token=null,broken=false}={}) {
    let fail=broken;const messages=[];let reloads=0,pauses=0,resumes=0,actions=0;
    const host={localStorage:{getItem:k=>{if(fail)throw Error('unavailable');return data.get(k)??null;},setItem:(k,v)=>{if(fail)throw Error('unavailable');data.set(k,v);}},
        ASCENT_IOS_RESUME:{id:token},location:{reload(){reloads++;}},crypto:{randomUUID:()=> 'fixed-attempt'},webkit:{messageHandlers:{ascentResume:{postMessage:m=>messages.push(m)}}}};
    const api=installNativeResume(createNativeResumeStore,host);
    api.configure({snapshot:spent=>({spent,itemsBefore:10,chargeLife:true}),pause(){pauses++;},resume(){resumes++;}});
    return {api,host,data,messages,broken:v=>{fail=v;},reloads:()=>reloads,pauses:()=>pauses,resumes:()=>resumes,actions:()=>actions,action:()=>{actions++;return true;}};
}
let f=fixture();assert(f.api.ready);assert.deepEqual(f.messages,[{kind:'ready',id:null}]);
assert(f.api.beginAttempt(3,f.action));assert.equal(f.actions(),1);assert.equal(JSON.parse(f.data.get(RESUME_KEY)).attempt.spent,3);
assert(f.api.endAttempt(f.action));assert.equal(f.actions(),2);assert.equal(JSON.parse(f.data.get(RESUME_KEY)).attempt,null);
// Start-write failure neither debits nor regenerates a different attempt.
f=fixture({token:'recovery-A'});f.broken(true);
assert.equal(f.api.beginAttempt(3,f.action),false);assert(!f.api.ready);assert.equal(f.actions(),0);assert.equal(f.pauses(),1);
assert.equal(f.api.beginAttempt(7,f.action),false);assert.equal(f.api.endAttempt(f.action),false);
assert.equal(f.api.retry(),false);assert.equal(f.actions(),0);assert.equal(f.pauses(),1);
f.broken(false);assert(f.api.retry());assert(f.api.ready);assert.equal(f.resumes(),1);assert.equal(f.actions(),1);
assert.equal(JSON.parse(f.data.get(RESUME_KEY)).attempt.spent,3);assert.equal(JSON.parse(f.data.get(RESUME_KEY)).completedId,'recovery-A');
assert.deepEqual(f.messages.at(-1),{kind:'ready',id:'recovery-A'});assert(f.api.retry());assert.equal(f.actions(),1);
// End-write failure freezes completion; the exact continuation runs once on retry.
f.broken(true);assert.equal(f.api.endAttempt(f.action),false);assert.equal(f.actions(),1);assert.equal(f.pauses(),2);
f.broken(false);assert(f.api.retry());assert.equal(f.actions(),2);assert.equal(f.resumes(),2);assert.equal(JSON.parse(f.data.get(RESUME_KEY)).attempt,null);
// Failed preboot never ACKs a partially loaded document. A successful retry
// reloads before globals can mutate restored resources.
f=fixture({token:'recovery-B',broken:true});assert(!f.api.ready);assert.deepEqual(f.messages,[{kind:'blocked',id:'recovery-B'}]);
assert.equal(f.api.retry(),false);assert.equal(f.reloads(),0);f.broken(false);assert(f.api.retry());assert.equal(f.reloads(),1);assert(!f.api.ready);assert(!f.messages.some(m=>m.kind==='ready'));
// A crash after the refund write and before ACK is harmless on the next boot.
const data=new Map([[ITEMS_KEY,'7'],[LIVES_KEY,JSON.stringify({count:2,recoveryAt:100,inProgress:true,attemptAt:120})],['saved-reward','keep']]);
createNativeResumeStore({storage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}}).beginAttempt({id:'run',spent:3,itemsBefore:10,chargeLife:true});
f=fixture({data,token:'recovery-C'});assert(f.api.ready);assert.equal(data.get(ITEMS_KEY),'10');assert.equal(JSON.parse(data.get(LIVES_KEY)).count,2);assert.equal(JSON.parse(data.get(LIVES_KEY)).inProgress,false);
f=fixture({data,token:'recovery-C'});assert.equal(data.get(ITEMS_KEY),'10');assert.equal(data.get('saved-reward'),'keep');
// A lost completion-marker acknowledgment retries cleanup only, never the
// outcome, and nested navigation shares a single end transaction.
{
 const messages=[];let fail=true,ends=0,completes=0,actions=0;
 const host={ASCENT_IOS_RESUME:{id:null},webkit:{messageHandlers:{ascentResume:{postMessage:m=>messages.push(m)}}}};
 const api=installNativeResume(()=>({discardStaleAttempt(){},endAttempt(){ends++;},completeEnd(){completes++;if(fail)throw Error('cleanup');}}),host);
 api.configure({pause(){},resume(){}});
 assert.equal(api.endAttempt(()=>{actions++;return api.endAttempt(()=>42);}),false);assert.equal(actions,1);assert.equal(ends,1);
 fail=false;assert(api.retry());assert.equal(actions,1);assert.equal(ends,1);assert.equal(completes,2);assert(api.ready);
}
// Serialized factories, rather than module globals, work in a browser script.
const context=vm.createContext({localStorage:{getItem:()=>null,setItem(){}},webkit:{messageHandlers:{ascentResume:{postMessage(){}}}}});
vm.runInContext(`(${installNativeResume.toString()})(${createNativeResumeStore.toString()});`,context);
assert.equal(vm.runInContext('ASCENT_NATIVE_RESUME.ready',context),true);
assert.equal(vm.runInContext("Object.getOwnPropertyDescriptor(globalThis,'ASCENT_NATIVE_RESUME').writable",context),false);
console.log('PASS native resume adapter: preboot ACK/reload gate, exact begin/end retry, preserved token, one-shot actions, saved resource replay, independent serialization');
