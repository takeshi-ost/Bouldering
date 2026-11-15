"use strict";
// Pure orchestration: no SDK request before explicit acceptance of reviewed terms.
function createFirstRun({version,read,write,requestPrivacy}) {
    let busy=false, privacyChecked=false;
    const accepted=()=>{try{return read()===version;}catch(_){return false;}};
    return {accepted, async proceed(accept=false) {
        if(busy)return {status:'busy',allow:false};
        if(!version)return {status:'terms_unavailable',allow:false};
        if(!accepted()) {
            if(!accept)return {status:'terms_required',allow:false};
            try {write(version);} catch(_) {return {status:'storage_failed',allow:false};}
            if(!accepted())return {status:'storage_failed',allow:false};
        }
        if(privacyChecked)return {status:'ready',allow:true};
        busy=true;
        try {
            const result=await requestPrivacy();
            if(result?.status==='cancelled')return {status:'cancelled',allow:false};
            privacyChecked=true;
            // Selection completion is not affirmative consent. Ads retain native guards.
            return {status:'ready',allow:true,privacy:result};
        } catch(_) {
            // Offline/SDK failure must not fabricate consent or enable ads.
            return {status:'privacy_unavailable',allow:false};
        } finally {busy=false;}
    },continueWithoutAds(){privacyChecked=true;return {status:'ready_without_ads',allow:accepted()};}};
}
module.exports={createFirstRun};
