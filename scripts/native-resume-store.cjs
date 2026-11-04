'use strict';

// One native-only receipt coordinates the two existing resource keys. A pending
// refund is a write-ahead projection, never an increment that a retry can repeat.
// Keep the function self-contained: native packaging embeds its source directly.
function createNativeResumeStore({storage}={}) {
    const RESUME_KEY='ascent.native-resume.v1';
    const ITEMS_KEY='ascent.heart-items.v1';
    const LIVES_KEY='ascent.lives.v1';
    const empty=()=>({version:1,completedId:null,attempt:null,ended:null,refund:null});
    const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
    const id=value=>typeof value==='string' && value.length>0 && value.length<=200;
    const integer=value=>Number.isSafeInteger(value) && value>=0;
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    function failure(code,cause) {
        const error=new Error('native-resume/'+code);error.code=error.message;
        if(cause!==undefined)error.cause=cause;
        return error;
    }
    function snapshot(value) {
        if(!object(value) || !id(value.id) || !integer(value.spent) || !integer(value.itemsBefore) ||
            value.spent>value.itemsBefore || typeof value.chargeLife!=='boolean')throw failure('invalid-attempt');
        return {id:value.id,spent:value.spent,itemsBefore:value.itemsBefore,chargeLife:value.chargeLife};
    }
    function parseLives(raw) {
        let value;
        try {value=JSON.parse(raw);}catch(error){throw failure('invalid-lives',error);}
        if(!object(value) || !Number.isInteger(value.count) || value.count<0 || value.count>5 ||
            !(value.recoveryAt===null || (Number.isFinite(value.recoveryAt) && value.recoveryAt>=0)) ||
            typeof value.inProgress!=='boolean' ||
            (value.attemptAt!==undefined && (!Number.isFinite(value.attemptAt) || value.attemptAt<0)))throw failure('invalid-lives');
        return value;
    }
    function parseItems(raw) {
        let value;
        try {value=JSON.parse(raw);}catch(error){throw failure('invalid-items',error);}
        if(!integer(value))throw failure('invalid-items');
        return value;
    }
    function receipt(raw) {
        if(raw===null)return empty();
        let value;
        try {value=JSON.parse(raw);}catch(error){throw failure('invalid-receipt',error);}
        if(!object(value) || value.version!==1 || !(value.completedId===null || id(value.completedId)) ||
            !(value.attempt===null || object(value.attempt)) || !(value.refund===null || object(value.refund)))throw failure('invalid-receipt');
        // The nullable tombstone is additive to this same receipt, not another
        // journal. Receipts written before this field existed mean no tombstone.
        value={...value,ended:value.ended??null};
        if(!(value.ended===null || object(value.ended)) || (value.attempt && value.ended))throw failure('invalid-receipt');
        if(value.attempt!==null && !same(value.attempt,snapshot(value.attempt)))throw failure('invalid-receipt');
        if(value.ended!==null && !same(value.ended,snapshot(value.ended)))throw failure('invalid-receipt');
        if(value.refund!==null) {
            const plan=value.refund,attempt=value.attempt;
            if(!attempt || !id(plan.token) || plan.token===value.completedId ||
                !(plan.items===null || object(plan.items)) || !(plan.lives===null || object(plan.lives)))throw failure('invalid-receipt');
            if(attempt.spent>0) {
                if(!plan.items || !integer(plan.items.before) || plan.items.after!==attempt.itemsBefore ||
                    ![attempt.itemsBefore,attempt.itemsBefore-attempt.spent].includes(plan.items.before))throw failure('invalid-receipt');
            } else if(plan.items!==null)throw failure('invalid-receipt');
            if(attempt.chargeLife) {
                if(!plan.lives || typeof plan.lives.before!=='string' || typeof plan.lives.after!=='string')throw failure('invalid-receipt');
                const before=parseLives(plan.lives.before),after=parseLives(plan.lives.after);
                if(!same({...before,inProgress:false},after))throw failure('invalid-receipt');
            } else if(plan.lives!==null)throw failure('invalid-receipt');
        }
        return value;
    }

    if(!storage || typeof storage.getItem!=='function' || typeof storage.setItem!=='function')throw failure('storage-unavailable');
    function read(key) {
        let value;
        try {value=storage.getItem(key);}catch(error){throw failure('storage-unavailable',error);}
        if(value!==null && typeof value!=='string')throw failure('storage-unavailable');
        return value;
    }
    function write(key,value) {
        try {storage.setItem(key,value);}catch(error){throw failure('storage-unavailable',error);}
        if(read(key)!==value)throw failure('persistence-failed');
    }
    const load=()=>receipt(read(RESUME_KEY));
    function commit(value) {write(RESUME_KEY,JSON.stringify(value));return value;}
    function replay(value) {
        const plan=value.refund;
        if(!plan)return value;
        if(plan.items) {
            const current=parseItems(read(ITEMS_KEY));
            if(current!==plan.items.before && current!==plan.items.after)throw failure('items-changed');
            if(current!==plan.items.after)write(ITEMS_KEY,JSON.stringify(plan.items.after));
        }
        if(plan.lives) {
            const current=read(LIVES_KEY);
            if(current!==plan.lives.before && current!==plan.lives.after)throw failure('lives-changed');
            if(current!==plan.lives.after)write(LIVES_KEY,plan.lives.after);
        }
        return commit({version:1,completedId:plan.token,attempt:null,ended:null,refund:null});
    }
    function beginAttempt(input) {
        const next=snapshot(input),value=replay(load());
        if(value.attempt) {
            if(same(value.attempt,next))return true;
            throw failure(value.attempt.id===next.id?'attempt-conflict':'attempt-active');
        }
        commit({...value,attempt:next,ended:null});return true;
    }
    function endAttempt() {
        const value=replay(load());
        // A successful write can lose its acknowledgment before the caller
        // settles the life. Keep enough evidence to recover that paused run.
        if(value.attempt)commit({...value,attempt:null,ended:value.attempt});
        return true;
    }
    function completeEnd() {
        const value=replay(load());
        if(value.ended)commit({...value,ended:null});
        return true;
    }
    function discardStaleAttempt() {
        const value=replay(load());
        if(value.attempt || value.ended)commit({...value,attempt:null,ended:null});
        return true;
    }
    function recover(token) {
        if(!id(token))throw failure('invalid-token');
        let value=replay(load());
        // Preserve a later active attempt if native redelivers an old ACK/token.
        if(value.completedId===token)return false;
        let attempt=value.attempt,endingLives=null;
        // Debug/nonlife outcomes have no durable normal-life settlement flag.
        // Until completeEnd persists, favor returning their chalk once. A crash
        // after the debug outcome but before cleanup is intentionally included.
        if(!attempt && value.ended && !value.ended.chargeLife)attempt=value.ended;
        if(!attempt && value.ended?.chargeLife) {
            const before=read(LIVES_KEY),current=parseLives(before);
            // Normal outcomes persist inProgress=false. If it is still true,
            // end was acknowledged incompletely or the process stopped before
            // the caller could settle. Preserve current count/recovery anchors.
            if(current.inProgress) {
                attempt=value.ended;
                endingLives={before,after:JSON.stringify({...current,inProgress:false})};
            }
        }
        if(!attempt) {
            commit({...value,completedId:token,ended:null});return true;
        }
        let items=null,lives=null;
        if(attempt.spent>0) {
            const current=parseItems(read(ITEMS_KEY));
            if(current!==attempt.itemsBefore && current!==attempt.itemsBefore-attempt.spent)throw failure('items-changed');
            items={before:current,after:attempt.itemsBefore};
        }
        if(attempt.chargeLife) {
            if(endingLives)lives=endingLives;
            else {
                const before=read(LIVES_KEY),current=parseLives(before);
                lives={before,after:JSON.stringify({...current,inProgress:false})};
            }
        }
        value=commit({...value,attempt,ended:null,refund:{token,items,lives}});
        replay(value);return true;
    }
    // Construction validates the receipt but does not change resource balances.
    // The caller chooses recover(token), or discardStaleAttempt() for an ordinary
    // boot. Both replay a committed refund before allowing game scripts to load.
    load();
    return Object.freeze({beginAttempt,endAttempt,completeEnd,recover,discardStaleAttempt,status:load});
}

module.exports={createNativeResumeStore,RESUME_KEY:'ascent.native-resume.v1',ITEMS_KEY:'ascent.heart-items.v1',LIVES_KEY:'ascent.lives.v1'};
