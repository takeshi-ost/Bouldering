'use strict';
const {scoreMetadata,supportedCourseVersion,supportedScoreBoard,scoreMatchesBoard}=require('../js/score-metadata.js');
const SYNC_KEY='ascent.native-sync.after-enable.v1';
function createNativeAutoSync({storage,owner,controller,onReport=()=>{},clock=Date.now,courseVersion='v1'}) {
    let state,flight=null,halted=false;
    const stats={boundaryPersisted:false,freshPending:0,freshDelivered:0,profilePending:false,profileNamePreserved:true,syncError:''};
    const sendable=e=>e && Number.isSafeInteger(e.sequence) && supportedScoreBoard(e.board) && e.board.split('_')[1]==='existing' && e.rankingEligible!==false && e.score?.rankingEligible!==false && scoreMatchesBoard(e.board,e.score) && Number.isSafeInteger(e.score?.moves) && e.score.moves>=1 && e.score.moves<=1000000 && Number.isSafeInteger(e.score.timeMs) && e.score.timeMs>=0 && e.score.timeMs<=604800000;
    const notify=()=>{const events=Array.isArray(state?.events)?state.events:[];stats.freshPending=events.filter(sendable).length;stats.retainedEvents=events.length-stats.freshPending;stats.profilePending=!!state?.profile;stats.profileNamePreserved=state?.profile?.nameChanged!==true;onReport({...stats});};
    const fail=code=>{stats.syncError=/^[a-z0-9/-]+$/.test(code||'')?code:'native-sync/unavailable';notify();};
    function commit(next){storage.setItem(SYNC_KEY,JSON.stringify(next));if(storage.getItem(SYNC_KEY)!==JSON.stringify(next))throw Error('native-sync/persistence-failed');state=next;stats.boundaryPersisted=true;notify();}
    try {
        if(!supportedCourseVersion(courseVersion))throw Error('native-sync/invalid-version');
        if(!owner)throw Error('native-sync/identity-required');
        const old=storage.getItem(SYNC_KEY);
        if(old!==null){state=JSON.parse(old);if(state.owner!==owner || state.version!==1 || !Number.isSafeInteger(state.sequence) || !Array.isArray(state.events) || typeof state.name!=='string')throw Error('native-sync/invalid-ledger');stats.boundaryPersisted=true;}
        else commit({version:1,owner,activatedAt:clock(),sequence:0,name:'',profile:null,events:[]});
    } catch(e){halted=true;fail(e.message);}
    async function flush() {
        if(halted || !controller.permissions().automaticSync)return;
        if(flight)return flight;
        flight=(async()=>{
            try {
                await controller.authenticate({createAnonymous:false});
                while(state.profile || state.events.length) {
                    if(state.profile) {
                        const item=state.profile;const result=await controller.syncAutomaticProfile(state.owner,item.value,{nameChanged:item.nameChanged===true});
                        if(state.profile?.revision===item.revision)commit({...state,name:typeof result?.name==='string'?result.name:state.name,profile:null});
                    } else {
                        const item=state.events.find(sendable);if(!item)break;await controller.syncFreshScore(state.owner,item.board,item.score);
                        if(state.events.includes(item)){commit({...state,events:state.events.filter(e=>e!==item)});stats.freshDelivered++;}
                    }
                }
                stats.syncError='';notify();
            } catch(e){fail(e.code || e.message);}
        })().finally(()=>{flight=null;if(!stats.syncError && (state.profile || state.events.some(sendable)))void flush();});
        return flight;
    }
    function queueProfile(profile,nameChanged=false) {
        if(halted)return false;
        try {
            const name=nameChanged || !state.name || state.name==='iOS接続テスト'?profile.name:state.name;
            const explicitName=nameChanged || state.profile?.nameChanged===true;
            const sequence=state.sequence+1;
            commit({...state,name,sequence,profile:{revision:sequence,nameChanged:explicitName,value:{...profile,colors:[...profile.colors],name}}});
            void flush();return true;
        }catch(e){halted=true;fail(e.message);return false;}
    }
    function recordClear(stage,mode,candidate) {
        if(halted)return false;
        if(!Number.isSafeInteger(stage) || stage<1 || stage>999999 || mode!=='existing' || candidate?.rankingEligible===false || candidate?.version!==courseVersion || !scoreMatchesBoard(`${courseVersion}_${mode}_${stage}`,candidate) || !Number.isSafeInteger(candidate.moves) || candidate.moves<1 || candidate.moves>1000000 || !Number.isSafeInteger(candidate.timeMs) || candidate.timeMs<0 || candidate.timeMs>604800000)return false;
        try {
            if(state.events.length>=10000)throw Error('native-sync/queue-full');
            const sequence=state.sequence+1;
            // Capture the actual just-finished run, never stageRecords/local best
            // or the legacy pending queue. Only post-boundary hooks can add here.
            commit({...state,sequence,events:[...state.events,{sequence,board:`${courseVersion}_${mode}_${stage}`,score:{moves:candidate.moves,timeMs:candidate.timeMs,...scoreMetadata(candidate)}}]});
            void flush();return true;
        }catch(e){halted=true;fail(e.message);return false;}
    }
    notify();return Object.freeze({queueProfile,profileEdited:(p,changed)=>queueProfile(p,changed),recordClear,flush,pendingForBoard:board=>Array.isArray(state?.events)&&state.events.some(item=>sendable(item) && item.board===board),report:()=>({...stats})});
}
module.exports={createNativeAutoSync,SYNC_KEY};
