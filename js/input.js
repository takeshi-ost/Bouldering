"use strict";
let touchId = null;
let pan = null;
let ignoreTouches = false;
function endPan() { pan = null; }
function canScrollStage() { return !featureHelpOpen && !settingsOpen && ['playing','won','lost'].includes(state) && ui.overlay.hidden && characterAnimation?.kind!=='fall' && !cameraIntro && HEIGHT > H; }
// Delay a body gesture until it becomes a drag, preserving the visible pose on tap.
function beginPointer(e) {
    if (featureHelpOpen || settingsOpen || !ui.overlay.hidden || bodyTap || drag || cameraIntro || !['playing','won','lost'].includes(state)) return;
    const p=point(e),visible=characterPose(performance.now()).body;
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
    const positions={ArrowUp:camera-40,ArrowDown:camera+40,PageUp:camera-H,PageDown:camera+H,Home:0,End:max};
    if (!(e.key in positions)) return;
    e.preventDefault();endPointer(null,true);inspecting=true;
    camera=clamp(positions[e.key],0,max);
});
canvas.addEventListener('wheel', e => {
    if (!canScrollStage() || pan) return;
    e.preventDefault();endPointer(null,true);inspecting=true;
    const scale=e.deltaMode===1 ? 16 : e.deltaMode===2 ? H : H/canvas.getBoundingClientRect().height;
    camera=clamp(camera+e.deltaY*scale,0,HEIGHT-H);
}, {passive:false});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && !pan) { e.preventDefault(); beginPointer(e); }
});
window.addEventListener('mousemove', e => { if (!pan) movePointer(e); });
window.addEventListener('mouseup', e => { if (e.button === 0 && !pan) endPointer(e); });
window.addEventListener('blur', () => {
    endPointer(null,true); endPan(); touchId = null; ignoreTouches = false;
});
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 2 && !pan && !ignoreTouches && canScrollStage()) {
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
    if (pan) {
        const fingers=pan.ids.map(id=>Array.from(e.touches).find(t=>t.identifier===id));
        if (e.touches.length!==2 || fingers.some(t=>!t)) { endPan(); return; }
        const y=(fingers[0].clientY+fingers[1].clientY)/2;
        camera=clamp(pan.camera-(y-pan.y)*H/canvas.getBoundingClientRect().height,0,HEIGHT-H);
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
    if (pan && (e.touches.length!==2 || pan.ids.some(id=>!Array.from(e.touches).some(t=>t.identifier===id)))) {
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
function restartInput(n) {
    bodyTap=null;endPan(); touchId = null; ignoreTouches = false; reset(n);showStageHelp();
}
ui.next.onclick = () => { if (state === 'won') showLevelMap({advanceFrom:level}); };
ui.retry.onclick = ui.restart.onclick = () => { if (['playing','won','lost'].includes(state)) restartInput(level); };
ui.mapButton.onclick = () => { if (['playing','won','lost'].includes(state)) showLevelMap({target:level}); };

function showTitleScreen() {
    endPointer(null,true);
    endPan();
    touchId = null;
    ignoreTouches = false;
    drag = null;
    cameraIntro = null;
    hideStageHelp();
    state = 'choosing';
    ui.characterEditor.hidden=true;
    ui.appearanceStatus.hidden=true;
    mapTransition = null;
    ui.levelMap.hidden = true;
    ui.wall.classList.toggle('map-open',false);
    ui.mapButton.disabled = true;
    hideResultModal();
    ui.titleScreen.hidden = false;
    ui.courseError.hidden = true;
    ui.restart.disabled = true;
    bodyTap = null;
    hideSettings();
    ui.hud.hidden=true;
    ui.debugMode.checked=debugMode;
    syncTitleDebugControls();
    canvas.setAttribute('tabindex', '-1');
    ui.existingCourse.focus();
}
function startCourse(mode) {
    if (mode !== 'existing' && mode !== 'prototype') return;
    courseMode = mode;
    showLevelMap();
}
ui.existingCourse.onclick = () => startCourse('existing');
ui.prototypeCourse.onclick = () => {if(debugMode)startCourse('prototype');};
function syncTitleDebugControls() {
    ui.prototypeCourse.hidden=!debugMode;
    ui.prototypeDescription.hidden=!debugMode;
}


ui.showHelp.onclick = () => {
    if (state !== 'choosing' || ui.helpDialog.open) return;
    ui.helpDialog.showModal();
    ui.helpDialog.scrollTop = 0;
};
ui.closeHelp.onclick = () => ui.helpDialog.close();
ui.helpDialog.addEventListener('close', () => ui.showHelp.focus());

// Results stay modal until Retry or Next is chosen. Native dialog traps focus.
ui.overlay.addEventListener('cancel',e=>e.preventDefault());

ui.debugMode.onchange=()=>{
    if(state!=='choosing') {ui.debugMode.checked=debugMode;return;}
    debugMode=ui.debugMode.checked;
    syncTitleDebugControls();
    updateUI();
};
ui.settingsButton.onclick=()=>{
    if(state!=='playing' || cameraIntro || settingsOpen || featureHelpOpen) return;
    endPointer(null,true);endPan();touchId=null;ignoreTouches=false;
    settingsOpen=true;
    ui.settingsDialog.showModal?.();
};
ui.closeSettings.onclick=()=>{hideSettings();canvas.focus();};
ui.settingsDialog.addEventListener('cancel',e=>{e.preventDefault();ui.closeSettings.onclick();});
ui.settingsDialog.addEventListener('close',()=>{settingsOpen=false;});

// The dialog fills the viewport so tapping the card or its surrounding area continues.
ui.featureHelpDialog.onclick=dismissStageHelp;
ui.featureHelpDialog.addEventListener('cancel',e=>{e.preventDefault();dismissStageHelp();});

ui.featureHelpDialog.addEventListener('keydown',e=>{
    if(e.key==='Enter' || e.key===' ') {e.preventDefault();dismissStageHelp();}
});
