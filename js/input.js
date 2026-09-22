"use strict";
let touchId = null;
let pan = null;
let ignoreTouches = false;
function endPan() { pan = null; }
function canScrollStage() { return state !== 'choosing' && !cameraIntro && HEIGHT > H; }
function beginTouchPan(touches) {
    if (!canScrollStage() || touches.length !== 2) return;
    release(true);
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
    e.preventDefault();release(true);inspecting=true;
    camera=clamp(positions[e.key],0,max);
});
canvas.addEventListener('wheel', e => {
    if (!canScrollStage() || pan) return;
    e.preventDefault();release(true);inspecting=true;
    const scale=e.deltaMode===1 ? 16 : e.deltaMode===2 ? H : H/canvas.getBoundingClientRect().height;
    camera=clamp(camera+e.deltaY*scale,0,HEIGHT-H);
}, {passive:false});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && !pan) { e.preventDefault(); down(e); }
});
window.addEventListener('mousemove', e => { if (!pan) move(e); });
window.addEventListener('mouseup', e => { if (e.button === 0 && !pan) release(); });
window.addEventListener('blur', () => {
    release(true); endPan(); touchId = null; ignoreTouches = false;
});
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 2 && !pan && !ignoreTouches && canScrollStage()) {
        beginTouchPan(e.touches);
        return;
    }
    if (e.touches.length !== 1 || pan || ignoreTouches) {
        endPan();
        release(true);
        touchId = null;
        ignoreTouches = true;
        return;
    }
    if (touchId !== null) return;
    const t = e.changedTouches[0];
    down(t);
    if (drag) touchId = t.identifier;
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
    if (t) move(t);
}, { passive: false });
function touchEnd(e, cancel) {
    if (pan && (cancel || e.touches.length!==2 || pan.ids.some(id=>!Array.from(e.touches).some(t=>t.identifier===id)))) {
        endPan(); touchId=null;
    }
    if (Array.from(e.changedTouches).some(t => t.identifier === touchId)) {
        release(cancel);
        touchId = null;
    }
    if (e.touches.length === 0) ignoreTouches = false;
}
canvas.addEventListener('touchend', e => touchEnd(e, false));
canvas.addEventListener('touchcancel', e => touchEnd(e, true));
function restartInput(n, bonus = 0) {
    endPan(); touchId = null; ignoreTouches = false; reset(n, bonus);
}
ui.next.onclick = () => { if (state === 'won') restartInput(level + 1, stamina); };
ui.retry.onclick = ui.restart.onclick = () => restartInput(level, stageBonus);

function showCourseMenu() {
    release(true);
    endPan();
    touchId = null;
    ignoreTouches = false;
    drag = null;
    cameraIntro = null;
    state = 'choosing';
    ui.overlay.hidden = true;
    ui.courseMenu.hidden = false;
    ui.courseError.hidden = true;
    ui.restart.disabled = true;
    ui.undo.disabled = true;
    ui.showPath.disabled = true;
    canvas.setAttribute('tabindex', '-1');
    ui.level.textContent = 'コース選択';
    ui.existingCourse.focus();
}
function startCourse(mode) {
    if (mode !== 'existing' && mode !== 'prototype') return;
    courseMode = mode;
    ui.showPath.checked = false;
    try {
        restartInput(1);
        ui.courseMenu.hidden = true;
        ui.showPath.disabled = false;
        canvas.setAttribute('tabindex', '0');
        ui.restart.focus();
    } catch (error) {
        showCourseMenu();
        ui.courseError.textContent = 'コースを生成できませんでした。もう一度選択してください。';
        ui.courseError.hidden = false;
        console.error(error);
    }
}
ui.existingCourse.onclick = () => startCourse('existing');
ui.prototypeCourse.onclick = () => startCourse('prototype');
ui.undo.onclick = () => {
    endPan(); touchId = null; ignoreTouches = false;
    undoMove();
};

ui.showHelp.onclick = () => {
    if (state !== 'choosing' || ui.helpDialog.open) return;
    ui.helpDialog.showModal();
    ui.helpDialog.scrollTop = 0;
};
ui.closeHelp.onclick = () => ui.helpDialog.close();
ui.helpDialog.addEventListener('close', () => ui.showHelp.focus());
