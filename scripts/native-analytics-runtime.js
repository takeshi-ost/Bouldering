/* Native-only Analytics. No Web Analytics SDK, auth ID, queue or network fetch. */
(() => {
    'use strict';
    const plugin = globalThis.Capacitor?.Plugins?.AscentAnalytics;
    if (!plugin) return;
    let permission = {enabled:false,available:false,epoch:-1}, attempt = null;
    function accept(result) {
        const next=result || {enabled:false,available:false,epoch:-1};
        if(next.epoch!==permission.epoch || next.enabled!==permission.enabled)attempt=null;
        permission=next;
    }
    function emit(name, parameters, epoch) {
        if (!permission.enabled || permission.epoch !== epoch) return;
        try { Promise.resolve(plugin.event({name, parameters, epoch})).catch(()=>{}); } catch (_) {}
    }
    // Analytics follows explicit game-terms acceptance; no optional settings UI.
    const refresh=()=>Promise.resolve(plugin.status()).then(accept).catch(()=>accept(null));
    globalThis.addEventListener?.('ascent-terms-ready',refresh);
    globalThis.addEventListener?.('ascent-terms-reset',()=>{accept(null);});
    void refresh();
    const originalReset=reset, originalFinish=finish;
    reset=function(...args) {
        attempt=null;
        const result=originalReset.apply(this,args);
        if(permission.enabled && !(typeof isTutorialRun==='function' && isTutorialRun()) && !activeDebugCourse()) {
            attempt={epoch:permission.epoch,mode:dailyRun?'daily':'stage',stage:dailyRun?0:level};
            emit('level_start',{mode:attempt.mode,stage:attempt.stage},attempt.epoch);
        }
        return result;
    };
    finish=function(won,...args) {
        const current=attempt;
        if(state==='playing')attempt=null;
        const result=originalFinish.call(this,won,...args);
        if(current && (state==='won'||state==='lost')) {
            emit('level_end',{mode:current.mode,stage:current.stage,success:won?1:0,moves:moveCount},current.epoch);
        }
        return result;
    };
})();
