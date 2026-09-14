"use strict";
let touchId = null;
let pan = null;
let ignoreTouches = false;
function endPan() {
    const previous = pan;
    pan = null;
    if (previous && ui.scrollRail.hasPointerCapture(previous.id))
        ui.scrollRail.releasePointerCapture(previous.id);
}
ui.scrollRail.addEventListener('pointerdown', e => {
    if (e.button !== 0 || pan || HEIGHT <= H) return;
    e.preventDefault();
    release(true);
    touchId = null;
    inspecting = true;
    pan = { id: e.pointerId, y: e.clientY, camera };
    ui.scrollRail.setPointerCapture(e.pointerId);
});
ui.scrollRail.addEventListener('pointermove', e => {
    if (!pan || e.pointerId !== pan.id) return;
    e.preventDefault();
    const scale = HEIGHT / ui.scrollRail.getBoundingClientRect().height;
    camera = clamp(pan.camera + (e.clientY - pan.y) * scale, 0, HEIGHT - H);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    ui.scrollRail.addEventListener(type, e => {
        if (pan?.id === e.pointerId) endPan();
    });
}
ui.scrollRail.addEventListener('keydown', e => {
    const max = HEIGHT - H;
    const positions = {
        ArrowUp: camera - 40, ArrowDown: camera + 40,
        PageUp: camera - H, PageDown: camera + H, Home: 0, End: max
    };
    if (!(e.key in positions) || max <= 0) return;
    e.preventDefault();
    release(true);
    inspecting = true;
    camera = clamp(positions[e.key], 0, max);
});
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
    if (e.touches.length !== 1 || pan || ignoreTouches) {
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
    if (pan || ignoreTouches) return;
    const t = Array.from(e.changedTouches).find(t => t.identifier === touchId);
    if (t) move(t);
}, { passive: false });
function touchEnd(e, cancel) {
    if (Array.from(e.changedTouches).some(t => t.identifier === touchId)) {
        release(cancel);
        touchId = null;
    }
    if (e.touches.length === 0) ignoreTouches = false;
}
canvas.addEventListener('touchend', e => touchEnd(e, false));
canvas.addEventListener('touchcancel', e => touchEnd(e, true));
function restartInput(n) {
    endPan(); touchId = null; ignoreTouches = false; reset(n);
}
ui.next.onclick = () => restartInput(courseMode==='verification' && level===VERIFICATION_STAGES.length ? 1 : level + 1);
ui.retry.onclick = ui.restart.onclick = () => restartInput(level);
