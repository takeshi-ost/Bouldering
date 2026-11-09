"use strict";
let touchId = null;
let pan = null;
let ignoreTouches = false;
function endPan() { pan = null; }
function canScrollStage() { return !featureHelpOpen && !settingsOpen && ['playing','won','lost'].includes(state) && ui.overlay.hidden && characterAnimation?.kind!=='fall' && !cameraIntro && HEIGHT-H > cameraTop(); }
// Delay a body gesture until it becomes a drag, preserving the visible pose on tap.
function beginPointer(e) {
    if (featureHelpOpen || settingsOpen || !ui.overlay.hidden || bodyTap || drag || cameraIntro || !['playing','won','lost'].includes(state)) return;
    const p=point(e);
    if(p.x>=0 && p.x<=W && (p.x<INPUT_CONFIG.edgeScrollWidth || p.x>W-INPUT_CONFIG.edgeScrollWidth)) {
        if(typeof SixPairAngleOverlay!=='undefined')SixPairAngleOverlay.reset();
        inspecting=true;
        pan={edge:true,side:p.x<W/2?'left':'right',scrolling:false,mouse:e.identifier===undefined,ids:e.identifier===undefined?[]:[e.identifier],y:e.clientY,camera};
        return;
    }
    const visible=characterPose(performance.now()).body;
    if (Math.abs(p.x-visible.x)<=TORSO.width/2+TORSO.hitPadding &&
        Math.abs(p.y-visible.y)<=TORSO.height/2+TORSO.hitPadding) {
        if(typeof SixPairAngleOverlay!=='undefined')SixPairAngleOverlay.hide();
        bodyTap={event:{clientX:e.clientX,clientY:e.clientY},start:performance.now()};
    } else if(typeof SixPairAngleOverlay!=='undefined' && state==='playing')SixPairAngleOverlay.begin(e);
    else down(e);
}
function movePointer(e) {
    if(typeof SixPairAngleOverlay!=='undefined' && SixPairAngleOverlay.pending){
        const origin=SixPairAngleOverlay.move(e);if(!origin)return;down(origin);
    }
    if (bodyTap) {
        const r=canvas.getBoundingClientRect(),origin=bodyTap.event;
        const moved=Math.hypot(viewportClientDelta(e.clientX-origin.clientX,r),viewportClientDelta(e.clientY-origin.clientY,r));
        if (moved<INPUT_CONFIG.dragThreshold) return;
        bodyTap=null;
        down(origin);
    }
    move(e);
}
function endPointer(e=null,cancel=false) {
    if (!cancel && e) movePointer(e);
    if(typeof SixPairAngleOverlay!=='undefined' && SixPairAngleOverlay.pending){SixPairAngleOverlay.end(cancel);return;}
    if(cancel && typeof SixPairAngleOverlay!=='undefined')SixPairAngleOverlay.hide();
    if (bodyTap) {
        const tap=bodyTap;bodyTap=null;
        if (!cancel && performance.now()-tap.start<=INPUT_CONFIG.tapMaxDuration) undoMove();
        return;
    }
    release(cancel);
}
function beginTouchPan(touches) {
    if (!canScrollStage() || touches.length !== 2) return;
    endPointer(null,true);
    touchId = null;
    inspecting = true;
    pan = {ids:Array.from(touches,t=>t.identifier),y:(touches[0].clientY+touches[1].clientY)/2,camera};
    // Never turn the remaining finger into a character drag on release.
    ignoreTouches = true;
}
canvas.addEventListener('wheel', e => {
    if (!canScrollStage() || pan) return;
    e.preventDefault();endPointer(null,true);inspecting=true;
    const scale=e.deltaMode===1 ? 16 : e.deltaMode===2 ? H : viewportClientDelta(1,canvas.getBoundingClientRect());
    camera=clamp(camera+e.deltaY*scale,cameraTop(),HEIGHT-H);
}, {passive:false});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && !pan) { e.preventDefault(); beginPointer(e); }
});
function moveEdgePan(e) {
    if(!pan?.edge || !canScrollStage())return;
    const dy=(e.clientY-pan.y)*viewportClientDelta(1,canvas.getBoundingClientRect());
    if(Math.abs(dy)>=INPUT_CONFIG.dragThreshold)pan.scrolling=true;
    camera=clamp(pan.camera-dy,cameraTop(),HEIGHT-H);
}
window.addEventListener('mousemove', e => {
    if(pan?.edge && pan.mouse)moveEdgePan(e);
    else if(!pan)movePointer(e);
});
window.addEventListener('mouseup', e => {
    if(e.button!==0)return;
    if(pan?.edge && pan.mouse){moveEdgePan(e);endPan();}
    else if(!pan)endPointer(e);
});
window.addEventListener('blur', () => {
    endPointer(null,true); endPan(); touchId = null; ignoreTouches = false;
});
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 2 && (!pan || pan.edge) && !ignoreTouches && canScrollStage()) {
        beginTouchPan(e.touches);
        return;
    }
    if (e.touches.length !== 1 || pan || ignoreTouches) {
        endPan();
        endPointer(null,true);
        touchId = null;
        ignoreTouches = true;
        return;
    }
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    beginPointer(t);
    if (drag || bodyTap || (typeof SixPairAngleOverlay!=='undefined' && SixPairAngleOverlay.pending)) touchId = t.identifier;
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (pan?.edge) {
        const finger=Array.from(e.touches).find(t=>t.identifier===pan.ids[0]);
        if(e.touches.length!==1 || !finger){endPan();ignoreTouches=true;return;}
        moveEdgePan(finger);return;
    }
    if (pan) {
        const fingers=pan.ids.map(id=>Array.from(e.touches).find(t=>t.identifier===id));
        if (e.touches.length!==2 || fingers.some(t=>!t)) { endPan(); return; }
        const y=(fingers[0].clientY+fingers[1].clientY)/2;
        camera=clamp(pan.camera-(y-pan.y)*viewportClientDelta(1,canvas.getBoundingClientRect()),cameraTop(),HEIGHT-H);
        return;
    }
    if (ignoreTouches) return;
    const t = Array.from(e.changedTouches).find(t => t.identifier === touchId);
    if (t) movePointer(t);
}, { passive: false });
function touchEnd(e, cancel) {
    if (cancel) {
        endPointer(null,true);endPan();touchId=null;
        ignoreTouches=e.touches.length>0;
        return;
    }
    if(pan?.edge) {
        const last=Array.from(e.changedTouches).find(t=>t.identifier===pan.ids[0]);
        if(last)moveEdgePan(last);
    }
    if (pan && (e.touches.length!==pan.ids.length || pan.ids.some(id=>!Array.from(e.touches).some(t=>t.identifier===id)))) {
        endPan(); touchId=null;
    }
    const t=Array.from(e.changedTouches).find(t=>t.identifier===touchId);
    if (t) {
        endPointer(t);
        touchId = null;
    }
    if (e.touches.length === 0) ignoreTouches = false;
}
canvas.addEventListener('touchend', e => touchEnd(e, false));
canvas.addEventListener('touchcancel', e => touchEnd(e, true));
function restartInput(n,staminaBonus=0) {
    if(typeof SixPairAngleOverlay!=='undefined')SixPairAngleOverlay.reset();
    bodyTap=null;endPan(); touchId = null; ignoreTouches = false; reset(n,staminaBonus);showStageHelp();
}
ui.next.onclick = () => {
    if(activeDebugScoreTrial() && state==='won'){
        if(ui.overlay.hidden)return;
        if(debugCourseTrial.score<100)startDebugScoreTrial(debugCourseTrial.score+1);else showLevelMap();
        return;
    }
    if(state==='lost') {
        // Ignore queued/hidden clicks while retry confirmation or an ad owns UI.
        if(ui.overlay.hidden || stageStartContext || lifePrompt || dummyAd || adCoverPending)return;
        returnFromStage();return; // Same settled-life and ad gate as the close button.
    }
    if(dailyRun && ['won','lost'].includes(state))continueDailyResult();
    else if(state==='won')continueNormalClear();
};
ui.retry.onclick=()=>{
    if(activeDebugScoreTrial()){startDebugScoreTrial(debugCourseTrial.score);return;}
    if(activeDebugCourse()){const trial=debugCourseTrial;startDebugCourse(trial.typeId,trial.lengthCategory);return;}
    if(state!=='lost')return;
    if(dailyRun)continueDailyResult(true);
    else continueAfterNormalAd(()=>restartNormalStage());
};
ui.restart.onclick=()=>{
    if(state!=='playing')return;
    finish(false);
};
function returnFromStage() {
    if(typeof isTutorialRun==='function' && isTutorialRun()) {finishTutorialRun(false);return;}
    if(!['playing','won','lost'].includes(state))return;
    if(dailyRun) {
        if(state==='won')continueDailyResult();else returnDailyWithoutClear();
    } else if(state==='won')continueNormalClear({advance:false});
    else continueAfterNormalAd(()=>showLevelMap({target:level}));
}

function showTitleScreen() {
    if(typeof interruptTutorialRun==='function')interruptTutorialRun();
    endDebugCourseTrial();
    finishDummyAdCover();finishRewardCover();
    hideStageStart();
    cancelMapReveal();
    settleLifeAttempt(false);
    leaveDailyRun();ui.dailyCalendar.hidden=true;
    endPointer(null,true);
    endPan();
    touchId = null;
    ignoreTouches = false;
    drag = null;
    cameraIntro = null;
    hideStageHelp();
    state = 'choosing';
    ui.characterEditor.hidden=true;
    mapTransition = null;
    ui.levelMap.hidden = true;
    ui.wall.classList.toggle('map-open',false);
    hideResultModal();
    ui.titleScreen.hidden = false;

    ui.restart.disabled = true;
    bodyTap = null;
    hideSettings();
    ui.hud.hidden=true;
    courseMode='existing';
    syncDebugCourseControls();
    document.getElementById('titleTutorialError').hidden=true;
    beginTitlePreparation();
}
function startCourse() {
    // Legacy callers may still pass a retired mode; only normal play exists.
    courseMode = 'existing';
    if(state==='choosing' && typeof tutorialPending==='function' && tutorialPending()) {startTutorialRun();return;}
    showLevelMap();
}
function syncDebugCourseControls() {
    ui.mapDebugModeRow.hidden=!DEBUG_FEATURES_ALLOWED;
    ui.mapDebugMode.disabled=!DEBUG_FEATURES_ALLOWED;
    if(typeof updateDeleteUserButton==='function')updateDeleteUserButton();
}

ui.showHelp.onclick = () => {
    if (mapPreparing || !settingsOpen || !['map','daily','playing'].includes(state) || ui.helpDialog.open) return;
    if(typeof prepareHelpIllustrations==='function')prepareHelpIllustrations();
    ui.helpDialog.showModal();
    ui.helpScroll.scrollTop = 0;
};
ui.closeHelp.onclick = () => ui.helpDialog.close();
ui.helpDialog.addEventListener('cancel',e=>{e.preventDefault();ui.closeHelp.onclick();});
ui.helpDialog.onclick = e => {if(e.target===ui.helpDialog && ui.helpDialog.open)ui.helpDialog.close();};

// Full-screen dialogs use a card; compact dialogs use their own bounds.
function dismissOutside(dialog,close,card=false) {
    dialog.addEventListener('click',e=>{
        if(e.target!==dialog)return;
        if(!card) {
            const r=dialog.getBoundingClientRect();
            if(e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom)return;
        }
        close();
    });
}
ui.closeResult.onclick=()=>state==='won'?ui.next.onclick():returnFromStage();
ui.overlay.addEventListener('cancel',e=>{e.preventDefault();ui.closeResult.onclick();});
ui.overlay.addEventListener('click',e=>{
    if(ui.overlay.hidden)return;
    if(state==='won')ui.next.onclick();
    else if(e.target===ui.overlay)ui.closeResult.onclick();
});
ui.closeStageStart.onclick=closeStageStart;
ui.stageStartDialog.addEventListener('cancel',e=>{e.preventDefault();closeStageStart();});
dismissOutside(ui.stageStartDialog,closeStageStart);
ui.closeLife.onclick=cancelLifePrompt;
dismissOutside(ui.lifeDialog,cancelLifePrompt,true);

function setDebugMode(enabled) {
    if(!DEBUG_FEATURES_ALLOWED) {
        ui.mapDebugMode.checked=false;
        syncDebugCourseControls();
        return;
    }
    if(!enabled && debugCourseTrial)showLevelMap();
    debugMode=!!enabled;
    ui.mapDebugMode.checked=debugMode;
    syncDebugCourseControls();
    updateUI();
    if(state==='map') {
        const lastPage=Math.floor((unlockedLevel()-1)/MAP_PAGE_SIZE);
        const returnToProgress=!debugMode && mapPage>lastPage;
        if(returnToProgress)mapPage=lastPage;
        renderLevelMap();
        if(returnToProgress)ui.mapScroll.scrollTop=ui.mapTrack.clientHeight;
    }
}
ui.mapDebugMode.onchange=()=>{
    if(!['map','daily'].includes(state) || !settingsOpen) {ui.mapDebugMode.checked=debugMode;return;}
    setDebugMode(ui.mapDebugMode.checked);
};
const debugDisplayControls={route:ui.debugRoute,holdNumbers:ui.debugHoldNumbers,courseInfo:ui.debugCourseInfo};
for(const [key,control] of Object.entries(debugDisplayControls)) {
    control.onchange=()=>{
        if(state==='playing' && settingsOpen && debugMode)debugDisplay[key]=control.checked;
        control.checked=debugDisplay[key];
        updateUI();
    };
}
function syncDebugSwipeControls() {
    ui.debugSwipeValue.textContent=(debugSwipeComparison.steps/20).toFixed(2)+'×';
    ui.debugSwipeLess.disabled=debugSwipeComparison.steps<=5;
    ui.debugSwipeMore.disabled=debugSwipeComparison.steps>=60;
    ui.debugSwipeMode.value=debugSwipeComparison.mode;
}
function changeDebugSwipe(change) {
    if(!DEBUG_FEATURES_ALLOWED || !debugMode || state!=='playing' || !settingsOpen)return;
    change();syncDebugSwipeControls();
}
ui.debugSwipeLess.onclick=()=>changeDebugSwipe(()=>{debugSwipeComparison.steps=Math.max(5,debugSwipeComparison.steps-1);});
ui.debugSwipeMore.onclick=()=>changeDebugSwipe(()=>{debugSwipeComparison.steps=Math.min(60,debugSwipeComparison.steps+1);});
ui.debugSwipeReset.onclick=()=>changeDebugSwipe(()=>{debugSwipeComparison.steps=20;});
ui.debugSwipeMode.onchange=()=>{
    changeDebugSwipe(()=>{debugSwipeComparison.mode=ui.debugSwipeMode.value==='body'?'body':'limbs';});
    syncDebugSwipeControls();
};
function openSettings() {
    const onMap=['map','daily'].includes(state);
    if(settingsOpen || stageStartContext || (onMap ? !!mapTransition || mapPreparing : state!=='playing' || cameraIntro || featureHelpOpen))return;
    if(!onMap) {endPointer(null,true);endPan();touchId=null;ignoreTouches=false;}
    ui.restart.hidden=onMap;
    ui.mapSettingsControls.hidden=ui.mapSettingsFooter.hidden=ui.mapSettingsDebug.hidden=!onMap;
    ui.mapSettingsLanguage.hidden=false;
    if(typeof refreshSettingsConnection==='function')refreshSettingsConnection();
    syncAudioControls();
    ui.stageDebugDisplay.hidden=onMap || !debugMode;
    syncDebugSwipeControls();
    for(const [key,control] of Object.entries(debugDisplayControls))control.checked=debugDisplay[key];
    ui.mapDebugMode.checked=debugMode;
    syncDebugCourseControls();
    settingsOpen=true;
    ui.settingsDialog.showModal?.();
    requestGameRender();
}
ui.settingsButton.onclick=openSettings;
ui.mapSettingsButton.onclick=openSettings;
ui.dailySettingsButton.onclick=openSettings;
ui.mapEditCharacter.onclick=()=>{if(['map','daily'].includes(state) && settingsOpen)showCharacterEditor();};
ui.closeSettings.onclick=hideSettings;
ui.settingsDialog.addEventListener('cancel',e=>{e.preventDefault();ui.closeSettings.onclick();});
ui.settingsDialog.addEventListener('close',()=>{settingsOpen=false;});
dismissOutside(ui.settingsDialog,()=>ui.closeSettings.onclick());

// The dialog fills the viewport so tapping the card or its surrounding area continues.
ui.featureHelpDialog.onclick=dismissStageHelp;
ui.featureHelpDialog.addEventListener('cancel',e=>{e.preventDefault();dismissStageHelp();});
