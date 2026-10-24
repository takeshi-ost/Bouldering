"use strict";
const NORMAL_AD_PLAY_INTERVAL=3;
const AD_PLAYS_KEY='ascent.ad-plays.v1';
const DUMMY_AD_DURATION=10000;
function readAdPlayCount() {
    try {
        const count=JSON.parse(globalThis.localStorage?.getItem(AD_PLAYS_KEY)||'0');
        return Number.isSafeInteger(count) && count>=0 ? count : 0;
    } catch(_) {return 0;}
}
let playsSinceAd=readAdPlayCount();
let dummyAd=null;
let adCoverPending=false;
function finishDummyAdCover() {
    if(!adCoverPending)return;
    adCoverPending=false;
    ui.dummyAd.close?.();ui.dummyAd.hidden=true;
    resumeBackgroundMusicAfterAd();
}
function saveAdPlayCount() {
    try {globalThis.localStorage?.setItem(AD_PLAYS_KEY,JSON.stringify(playsSinceAd));}
    catch(_) { /* Keep the interval within this session if storage is unavailable. */ }
}
function recordAdPlay() {
    if(adPlayRecorded || dailyRun || debugAttempt || courseMode!=='existing')return;
    adPlayRecorded=true;
    playsSinceAd=Math.min(Number.MAX_SAFE_INTEGER,playsSinceAd+1);saveAdPlayCount();
}
function resetAdPlayCount() {playsSinceAd=0;saveAdPlayCount();}
// Completion work (e.g. a future reward) runs before returning to the caller's sequence.
function startDummyAd({onComplete=()=>{},onReturn=null}={}) {
    if(dummyAd || adCoverPending)return false;
    const previousState=state,wasResultOpen=!!ui.overlay.open;
    const wasTiming=runStartedAt!==null;
    if(wasTiming){runElapsedMs=runTimeMs();runStartedAt=null;}
    release(true);endPan();bodyTap=null;touchId=null;ignoreTouches=false;
    hideSettings();hideResultModal();
    dummyAd={start:performance.now(),previousState,wasResultOpen,wasTiming,onComplete,onReturn,remaining:10};
    state='ad';ui.dummyAd.hidden=false;
    stopBackgroundMusicForAd();
    ui.adCounter.textContent='10';ui.adComplete.hidden=true;
    ui.dummyAd.showModal?.();ui.dummyAd.focus();
    requestGameRender();schedulePresentationUpdates();
    return true;
}
function advanceDummyAd(now=performance.now()) {
    if(!dummyAd)return;
    const remaining=Math.max(0,Math.ceil((DUMMY_AD_DURATION-Math.max(0,now-dummyAd.start))/1000));
    dummyAd.remaining=remaining;
    if(ui.adCounter.textContent!==String(remaining))ui.adCounter.textContent=String(remaining);
    if(remaining===0 && ui.adComplete.hidden) {
        ui.adComplete.hidden=false;ui.adComplete.focus();
    }
}
function completeDummyAd() {
    if(!dummyAd || dummyAd.remaining>0)return false;
    const ad=dummyAd;dummyAd=null;
    adCoverPending=true;ui.adComplete.hidden=true;
    state=ad.previousState;
    if(ad.wasTiming)runStartedAt=performance.now()-runElapsedMs;
    try {ad.onComplete();}
    finally {
        if(ad.onReturn)ad.onReturn();
        else if(ad.wasResultOpen){showResultModal();}
        else canvas.focus();
        if(state!=='map' || !mapPreparing)finishDummyAdCover();
    }
    requestGameRender();schedulePresentationUpdates();
    return true;
}
ui.adComplete.onclick=completeDummyAd;
ui.dummyAd.addEventListener('cancel',e=>e.preventDefault());

// Result dismissal and retry share the same end-of-play ad gate.
function continueAfterNormalAd(onReturn) {
    if(dummyAd || adCoverPending)return false;
    if(courseMode==='existing' && !dailyRun && !debugAttempt && playsSinceAd>=NORMAL_AD_PLAY_INTERVAL)
        return startDummyAd({onComplete:resetAdPlayCount,onReturn});
    return onReturn();
}
