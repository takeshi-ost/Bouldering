'use strict';
const SHARED_KEY='ascent.account-deletion.v1';
const LOCAL_KEYS=['ascent.native-sync.after-enable.v1','ascent.native-resume.v1'];
// Native-only lifecycle glue. Server deletion and its durable journal belong to
// the controller; this layer never creates an identity or retries deletion.
function createNativeAccountDeletion({controller,storage,game,sync=()=>null,resume=()=>null}) {
    let restoring=null;
    const failure=()=>Object.assign(Error('native-firebase/persistence-unavailable'),{code:'native-firebase/persistence-unavailable'});
    function persistMarker(uid,phase) {
        const value=JSON.stringify({uid,phase});
        storage.setItem(SHARED_KEY,value);
        if(storage.getItem(SHARED_KEY)!==value)throw failure();
    }
    async function beforeDelete() {
        resume()?.suspend();
        await sync()?.stop();
    }
    function clearLocal() {
        if(game.marker()?.phase!=='done')throw Error('native-firebase/deletion-incomplete');
        resume()?.suspend();
        for(const key of LOCAL_KEYS){storage.removeItem(key);if(storage.getItem(key)!==null)throw failure();}
    }
    function startNewUser() {
        if(!controller.permissions().deletion || game.marker()?.phase!=='done')throw Error('native-firebase/deletion-incomplete');
        clearLocal();controller.resetDeletion();
    }
    function hasMarker(){return !!(game.marker() || controller.deletionState());}
    async function restore() {
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
                if(value.phase==='done')game.clearGame();
                game.show();
            } catch(error){game.show();game.failed(error);}
            finally {game.updateButton();}
            return true;
        })().finally(()=>{restoring=null;});
        return restoring;
    }
    return Object.freeze({persistMarker,beforeDelete,clearLocal,startNewUser,hasMarker,restore});
}
module.exports={createNativeAccountDeletion};
