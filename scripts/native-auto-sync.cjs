'use strict';
const SYNC_KEY='ascent.native-sync.after-enable.v1';
function createNativeAutoSync({storage,owner,controller,onReport=()=>{},clock=Date.now}) {
    let state,flight=null,halted=false;
    const stats={boundaryPersisted:false,freshPending:0,freshDelivered:0,profilePending:false,profileNamePreserved:true,syncError:''};
    const notify=()=>{stats.freshPending=state?.events?.length||0;stats.profilePending=!!state?.profile;stats.profileNamePreserved=state?.name==='iOS接続テスト';onReport({...stats});};
    const fail=code=>{stats.syncError=/^[a-z0-9/-]+$/.test(code||'')?code:'native-sync/unavailable';notify();};
    function commit(next){storage.setItem(SYNC_KEY,JSON.stringify(next));if(storage.getItem(SYNC_KEY)!==JSON.stringify(next))throw Error('native-sync/persistence-failed');state=next;stats.boundaryPersisted=true;notify();}
    try {
        if(!owner)throw Error('native-sync/identity-required');
        const old=storage.getItem(SYNC_KEY);
        if(old!==null){state=JSON.parse(old);if(state.owner!==owner || state.version!==1 || !Number.isSafeInteger(state.sequence) || !Array.isArray(state.events) || typeof state.name!=='string')throw Error('native-sync/invalid-ledger');stats.boundaryPersisted=true;}
        else commit({version:1,owner,activatedAt:clock(),sequence:0,name:'iOS接続テスト',profile:null,events:[]});
    } catch(e){halted=true;fail(e.message);}
    async function flush() {
        if(halted || !controller.permissions().automaticSync)return;
        if(flight)return flight;
        flight=(async()=>{
            try {
                await controller.authenticate({createAnonymous:false});
                while(state.profile || state.events.length) {
                    if(state.profile) {
                        const item=state.profile;await controller.syncAutomaticProfile(state.owner,item.value);
                        if(state.profile?.revision===item.revision)commit({...state,profile:null});
                    } else {
                        const item=state.events[0];await controller.syncFreshScore(state.owner,item.board,item.score);
                        if(state.events[0]?.sequence===item.sequence){commit({...state,events:state.events.slice(1)});stats.freshDelivered++;}
                    }
                }
                stats.syncError='';notify();
            } catch(e){fail(e.code || e.message);}
        })().finally(()=>{flight=null;if(!stats.syncError && (state.profile || state.events.length))void flush();});
        return flight;
    }
    function queueProfile(profile,nameChanged=false) {
        if(halted)return false;
        try {
            const name=nameChanged?profile.name:state.name;
            const sequence=state.sequence+1;
            commit({...state,name,sequence,profile:{revision:sequence,value:{...profile,colors:[...profile.colors],name}}});
            void flush();return true;
        }catch(e){halted=true;fail(e.message);return false;}
    }
    function recordClear(stage,mode,candidate) {
        if(halted)return false;
        if(!Number.isSafeInteger(stage) || stage<1 || stage>999999 || !['existing','prototype'].includes(mode) || candidate?.version!=='v1' || !Number.isSafeInteger(candidate.moves) || candidate.moves<1 || !Number.isSafeInteger(candidate.timeMs) || candidate.timeMs<0)return false;
        try {
            if(state.events.length>=10000)throw Error('native-sync/queue-full');
            const sequence=state.sequence+1;
            // Capture the actual just-finished run, never stageRecords/local best
            // or the legacy pending queue. Only post-boundary hooks can add here.
            commit({...state,sequence,events:[...state.events,{sequence,board:`v1_${mode}_${stage}`,score:{moves:candidate.moves,timeMs:candidate.timeMs}}]});
            void flush();return true;
        }catch(e){halted=true;fail(e.message);return false;}
    }
    notify();return Object.freeze({queueProfile,profileEdited:(p,changed)=>queueProfile(p,changed),recordClear,flush,report:()=>({...stats})});
}
module.exports={createNativeAutoSync,SYNC_KEY};
