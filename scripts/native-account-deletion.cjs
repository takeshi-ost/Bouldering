'use strict';
const SHARED_KEY='ascent.account-deletion.v1';
const LOCAL_KEYS=['ascent.native-sync.after-enable.v1','ascent.native-resume.v1',require('../js/score-metadata.js').recordStorageKey('ascent.native-sync.after-enable.v1')];
// Native-only lifecycle glue. Server deletion and its durable journal belong to
// the controller; this layer never creates an identity or retries deletion.
function createNativeAccountDeletion({controller,storage,game,sync=()=>null,resume=()=>null,consent=null}) {
    let restoring=null,completing=null;
    const RESET_KEY="ascent.native-deletion.terms-reset.v1", RESTART_KEY="ascent.native-deletion.reconsent-reload.v1";
    const failure=()=>Object.assign(Error('native-firebase/persistence-unavailable'),{code:'native-firebase/persistence-unavailable'});
    function persistMarker(uid,phase) {
        const value=JSON.stringify({uid,phase});
        storage.setItem(SHARED_KEY,value);
        if(storage.getItem(SHARED_KEY)!==value)throw failure();
    }
    async function beforeDelete() {
        resume()?.suspend();
        await consent?.pause();
        await sync()?.stop();
    }
    function clearLocal() {
        if(game.marker()?.phase!=='done')throw Error('native-firebase/deletion-incomplete');
        resume()?.suspend();
        const keys=[...LOCAL_KEYS];
        for(let i=0;i<(storage.length||0);i++){const key=storage.key(i);if(/^ascent\.native-sync\.after-enable\.v1\.r[1-9][0-9]*$/.test(key))keys.push(key);}
        for(const key of keys){storage.removeItem(key);if(storage.getItem(key)!==null)throw failure();}
    }
    function startNewUser() {
        if(!controller.permissions().deletion || game.marker()?.phase!=='done')throw Error('native-firebase/deletion-incomplete');
        clearLocal();controller.resetDeletion();
    }
    function confirmedDone() {const value=controller.deletionState();return value?.phase==='done'?value:null;}
    async function completeConfirmedDeletion() {
        if(!consent)return false;
        const value=confirmedDone();if(!value)return false;
        if(completing)return completing;
        completing=(async()=>{
            game.mark(value.uid,'done');game.uid(null);game.ready(false);
            game.clearGame();
            if(storage.getItem(RESET_KEY)!==value.uid) {
                const result=await consent.reset(value.uid);if(result?.reset!==true)throw failure();
                storage.removeItem('ascent.terms.accepted.v1');
                if(storage.getItem('ascent.terms.accepted.v1')!==null)throw failure();
                storage.setItem(RESET_KEY,value.uid);if(storage.getItem(RESET_KEY)!==value.uid)throw failure();
                await consent.refresh();
            }
            game.returnToTitle();return true;
        })().finally(()=>{completing=null;});return completing;
    }
    function prepareTermsRestart() {
        if(!consent)return false;
        const value=confirmedDone();
        if(!value)return storage.getItem(RESTART_KEY)==='pending';
        if(storage.getItem(RESET_KEY)!==value.uid)throw failure();
        storage.setItem(RESTART_KEY,'pending');if(storage.getItem(RESTART_KEY)!=='pending')throw failure();
        clearLocal();controller.resetDeletion();game.clearMarker();
        storage.removeItem(RESET_KEY);return true;
    }
    function hasMarker(){return !!(game.marker() || controller.deletionState());}
    async function restore() {
        if(await completeConfirmedDeletion())return true;
        if(!hasMarker())return false;
        if(restoring)return restoring;
        restoring=(async()=>{
            game.ready(false);game.adapter(controller.adapter());
            await beforeDelete();
            // Show the guard immediately, including missing auth/offline cases.
            const durable=controller.deletionState();
            if(!game.marker() && durable)game.mark(durable.uid,durable.phase==='done'?'done':'pending');
            game.show();game.updateButton();
            if(!controller.permissions().deletion)return true;
            try {
                const value=await controller.adapter().restoreDeletion();
                if(!value)throw Error('native-firebase/deletion-state-unavailable');
                game.mark(value.uid,value.phase);
                game.uid(value.phase==='done'?null:value.uid);
                if(value.phase==='done'){game.clearGame();if(await completeConfirmedDeletion())return true;}
                game.show();
            } catch(error){game.show();game.failed(error);}
            finally {game.updateButton();}
            return true;
        })().finally(()=>{restoring=null;});
        return restoring;
    }
    return Object.freeze({completeConfirmedDeletion,prepareTermsRestart,persistMarker,beforeDelete,clearLocal,startNewUser,hasMarker,restore});
}
module.exports={createNativeAccountDeletion};
