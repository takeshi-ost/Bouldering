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
        inspecting=true;
        pan={edge:true,side:p.x<W/2?'left':'right',scrolling:false,mouse:e.identifier===undefined,ids:e.identifier===undefined?[]:[e.identifier],y:e.clientY,camera};
        return;
    }
    const visible=characterPose(performance.now()).body;
    if (Math.abs(p.x-visible.x)<=TORSO.width/2+TORSO.hitPadding &&
        Math.abs(p.y-visible.y)<=TORSO.height/2+TORSO.hitPadding) {
        bodyTap={event:{clientX:e.clientX,clientY:e.clientY},start:performance.now()};
    } else down(e);
}
function movePointer(e) {
    if (bodyTap) {
        const r=canvas.getBoundingClientRect(),origin=bodyTap.event;
        const moved=Math.hypot((e.clientX-origin.clientX)*W/r.width,(e.clientY-origin.clientY)*H/r.height);
        if (moved<INPUT_CONFIG.dragThreshold) return;
        bodyTap=null;
        down(origin);
    }
    move(e);
}
function endPointer(e=null,cancel=false) {
    if (!cancel && e) movePointer(e);
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
canvas.addEventListener('keydown', e => {
    if (!canScrollStage()) return;
    const max=HEIGHT-H;
    const positions={ArrowUp:camera-40,ArrowDown:camera+40,PageUp:camera-H,PageDown:camera+H,Home:cameraTop(),End:max};
    if (!(e.key in positions)) return;
    e.preventDefault();endPointer(null,true);inspecting=true;
    camera=clamp(positions[e.key],cameraTop(),max);
});
canvas.addEventListener('wheel', e => {
    if (!canScrollStage() || pan) return;
    e.preventDefault();endPointer(null,true);inspecting=true;
    const scale=e.deltaMode===1 ? 16 : e.deltaMode===2 ? H : H/canvas.getBoundingClientRect().height;
    camera=clamp(camera+e.deltaY*scale,cameraTop(),HEIGHT-H);
}, {passive:false});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && !pan) { e.preventDefault(); beginPointer(e); }
});
function moveEdgePan(e) {
    if(!pan?.edge || !canScrollStage())return;
    const dy=(e.clientY-pan.y)*H/canvas.getBoundingClientRect().height;
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
    if (drag || bodyTap) touchId = t.identifier;
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
        camera=clamp(pan.camera-(y-pan.y)*H/canvas.getBoundingClientRect().height,cameraTop(),HEIGHT-H);
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
    bodyTap=null;endPan(); touchId = null; ignoreTouches = false; reset(n,staminaBonus);showStageHelp();
}
ui.next.onclick = () => {
    if(dailyRun && ['won','lost'].includes(state))continueDailyResult();
    else if(state==='won')continueNormalClear();
};
ui.retry.onclick=()=>{
    if(state!=='lost')return;
    if(dailyRun)continueDailyResult(true);
    else continueAfterNormalAd(()=>restartNormalStage());
};
ui.restart.onclick=()=>{
    if(state!=='playing')return;
    finish(false);
};
function returnFromStage() {
    if(!['playing','won','lost'].includes(state))return;
    if(dailyRun) {
        if(state==='won')continueDailyResult();else returnDailyWithoutClear();
    } else if(state==='won')continueNormalClear({advance:false});
    else continueAfterNormalAd(()=>showLevelMap({target:level}));
}

function showTitleScreen() {
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
    canvas.setAttribute('tabindex', '-1');
    beginTitlePreparation();
}
function startCourse(mode) {
    if (mode !== 'existing' && mode !== 'prototype') return;
    courseMode = mode;
    showLevelMap();
}
ui.prototypeCourse.onclick = () => {
    if(debugMode && ['map','daily'].includes(state) && settingsOpen)startCourse(courseMode==='prototype'?'existing':'prototype');
};
function syncDebugCourseControls() {
    if(typeof updateDeleteUserButton==='function')updateDeleteUserButton();
    ui.prototypeCourse.hidden=!debugMode;
    ui.prototypeCourse.textContent=courseMode==='prototype'?gameText("input.syncDebugCourseControls.2"):gameText("input.syncDebugCourseControls");
    ui.prototypeDescription.hidden=!debugMode;
}

ui.showHelp.onclick = () => {
    if (mapPreparing || !settingsOpen || !['map','daily','playing'].includes(state) || ui.helpDialog.open) return;
    ui.helpDialog.showModal();
    ui.helpScroll.scrollTop = 0;
};
ui.closeHelp.onclick = () => ui.helpDialog.close();
ui.helpDialog.onclick = e => {if(e.target===ui.helpDialog && ui.helpDialog.open)ui.helpDialog.close();};
ui.helpDialog.addEventListener('close', () => ui.showHelp.focus());

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
ui.overlay.addEventListener('keydown',e=>{
    if(state==='won' && (e.key==='Enter' || e.key===' ')) {
        e.preventDefault();
        if(!e.repeat && !ui.overlay.hidden)ui.next.onclick();
    }
});
ui.closeStageStart.onclick=closeStageStart;
ui.stageStartDialog.addEventListener('cancel',e=>{e.preventDefault();closeStageStart();});
dismissOutside(ui.stageStartDialog,closeStageStart);
ui.closeLife.onclick=cancelLifePrompt;
dismissOutside(ui.lifeDialog,cancelLifePrompt,true);

function setDebugMode(enabled) {
    debugMode=enabled;
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
function openSettings() {
    const onMap=['map','daily'].includes(state);
    if(settingsOpen || stageStartContext || (onMap ? !!mapTransition || mapPreparing : state!=='playing' || cameraIntro || featureHelpOpen))return;
    if(!onMap) {endPointer(null,true);endPan();touchId=null;ignoreTouches=false;}
    ui.restart.hidden=onMap;
    ui.mapSettingsControls.hidden=ui.mapSettingsFooter.hidden=!onMap;
    ui.stageDebugDisplay.hidden=onMap || !debugMode;
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
ui.closeSettings.onclick=()=>{hideSettings();if(state==='map')ui.mapSettingsButton.focus({preventScroll:true});else if(state==='daily')ui.dailySettingsButton.focus({preventScroll:true});else canvas.focus();};
ui.settingsDialog.addEventListener('cancel',e=>{e.preventDefault();ui.closeSettings.onclick();});
ui.settingsDialog.addEventListener('close',()=>{settingsOpen=false;});
dismissOutside(ui.settingsDialog,()=>ui.closeSettings.onclick());

// The dialog fills the viewport so tapping the card or its surrounding area continues.
ui.featureHelpDialog.onclick=dismissStageHelp;
ui.featureHelpDialog.addEventListener('cancel',e=>{e.preventDefault();dismissStageHelp();});

ui.featureHelpDialog.addEventListener('keydown',e=>{
    if(e.key==='Enter' || e.key===' ') {e.preventDefault();dismissStageHelp();}
});
