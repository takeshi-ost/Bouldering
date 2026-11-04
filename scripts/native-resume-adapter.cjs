'use strict';
// Native-only coordinator. No Firebase, score, progression or reward mutations.
// Self-contained for packaging beside the durable store before classic scripts.
function installNativeResume(createStore,host=globalThis) {
    const token=typeof host.ASCENT_IOS_RESUME?.id==='string'?host.ASCENT_IOS_RESUME.id:null;
    let store,hooks=null,pending=null,bootFailed=false,ready=false,serial=0,ending=false,suspended=false;
    function report(kind){const locale=hooks?.language?.();host.webkit?.messageHandlers?.ascentResume?.postMessage({kind,id:token,...(locale==='ja'||locale==='en'?{locale}:{})});}
    function boot() {
        store=createStore({storage:host.localStorage});
        if(token)store.recover(token);else store.discardStaleAttempt();
    }
    function blocked(operation,continuation) {
        if(!pending && operation){pending={operation,continuation};hooks?.pause();}
        ready=false;report('blocked');return false;
    }
    function completed() {ready=true;report('ready');}
    function transact(operation,continuation) {
        if(!ready)return false;
        try {operation();}catch(_){return blocked(operation,continuation);}
        return continuation();
    }
    const api={
        get ready(){return ready;},
        configure(value){hooks=value;},
        // Account deletion owns the next reload. Never replay old continuations
        // or recreate a cleared receipt while its completion dialog is open.
        suspend(){suspended=true;ready=false;pending=null;hooks?.pause();},
        beginAttempt(spent,continuation) {
            if(!ready || !hooks)return false;
            const snapshot={...hooks.snapshot(spent),id:host.crypto?.randomUUID?.() || `native-${Date.now()}-${++serial}-${Math.random()}`};
            return transact(()=>store.beginAttempt(snapshot),continuation);
        },
        endAttempt(continuation) {
            if(!ready)return false;
            // Navigation may invoke another end hook. Only the outer action
            // owns the durable boundary and its final cleanup.
            if(ending)return continuation();
            const execute=()=>{
                let result;ending=true;
                try {result=continuation();}finally {ending=false;}
                // A failed cleanup retries only cleanup, never the outcome,
                // reward grant, record or navigation that already happened.
                return transact(()=>store.completeEnd(),()=>result);
            };
            return transact(()=>store.endAttempt(),execute);
        },
        retry() {
            if(suspended)return false;
            if(bootFailed) {
                try {boot();}catch(_){return blocked();}
                // Resource globals may have been read before the failed replay.
                // Reconstruct them in a new document; only that boot may ACK.
                host.location.reload();return true;
            }
            if(!pending)return ready;
            const task=pending;
            try {task.operation();}catch(_){return blocked();}
            pending=null;hooks?.resume();completed();
            task.continuation();return true;
        }
    };
    Object.defineProperty(host,'ASCENT_NATIVE_RESUME',{value:Object.freeze(api),writable:false,configurable:false});
    try {boot();completed();}catch(_){bootFailed=true;blocked();}
    return api;
}
module.exports={installNativeResume};
