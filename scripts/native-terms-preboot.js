'use strict';
(() => {
    let accepted=false;
    // SDK/data-use permissions are enforced at their service entry points.
    // Do not globally block ordinary public-page/asset requests. Policy Web
    // navigation is a separate explicit user action via the native plugin.
    async function refresh() {
        const previous=accepted;
        try {const result=await globalThis.Capacitor?.Plugins?.AscentAnalytics?.termsStatus();accepted=result?.accepted===true;}
        catch(_){accepted=false;}
        if(!accepted && previous)window.dispatchEvent(new Event('ascent-terms-reset'));
        if(accepted && !previous) {
            window.dispatchEvent(new Event('ascent-terms-ready'));
            if(typeof checkCourseDataUpdates==='function')void checkCourseDataUpdates();
        }
        return accepted;
    }
    Object.defineProperty(globalThis,'ASCENT_TERMS_NETWORK',{value:Object.freeze({get accepted(){return accepted;},refresh}),writable:false,configurable:false});
    void refresh();
})();
