'use strict';
// Injected only by the disposable, unsigned, offline simulator harness.
// Exercise the real terms DOM without native consent writes or SDK requests.
function installAscentOfflineConsentFixture(cap,build,version){
    if(build?.firebaseEnabled!==false||!cap||typeof cap.nativePromise!=='function'||!version)throw Error('offline-consent-fixture-guard');
    const original=cap.nativePromise;
    let accepted=false,accepts=0,privacyRequests=0;
    const status=()=>({accepted,version,analyticsEnabled:false,configured:false,available:false});
    const replacement=async function(plugin,method,options){
        if(plugin==='AscentAnalytics'){
            if(method==='termsStatus'||method==='status')return status();
            if(method==='acceptTerms'){
                if(options?.version!==version||(!accepted&&options?.explicitAcceptance!==true))throw Error('fixture-explicit-acceptance-required');
                if(options?.explicitAcceptance===true)accepts++;accepted=true;return status();
            }
            if(method==='event')return {};
            throw Error('offline-consent-fixture-blocked-analytics-method');
        }
        if(plugin==='AscentAds'){
            if(method==='beginFirstRunPrivacy'&&accepted){privacyRequests++;return {status:'updated',adsEnabled:false,canRequestAds:false};}
            throw Error('offline-consent-fixture-blocked-ads-method');
        }
        return original.call(this,plugin,method,options);
    };
    cap.nativePromise=replacement;
    if(cap.nativePromise!==replacement)throw Error('offline-consent-fixture-install-failed');
    return {get accepted(){return accepted;},get accepts(){return accepts;},get privacyRequests(){return privacyRequests;},
        restore(){if(cap.nativePromise===replacement)cap.nativePromise=original;}};
}
