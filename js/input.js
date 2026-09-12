"use strict";
let touchId = null;
let pan = null;
let touchView = null;
function beginPan(y, mode) {
    release(true);
    touchId = null;
    inspecting = true;
    pan = { y, camera, mode };
}
function movePan(y) {
    if (!pan) return;
    const scale = H / canvas.getBoundingClientRect().height;
    camera = clamp(pan.camera - (y - pan.y) * scale, 0, HEIGHT - H);
}
// Trackpads deliver two-finger scrolling as wheel events.
canvas.addEventListener('wheel', e => {
    if (e.ctrlKey) return; // Leave pinch-to-zoom to the browser.
    e.preventDefault();
    if (drag || pan || e.deltaY === 0) return;
    const height = canvas.getBoundingClientRect().height;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1;
    inspecting = true;
    camera = clamp(camera + e.deltaY * unit * H / height, 0, HEIGHT - H);
}, { passive: false });
canvas.addEventListener('mousedown', e => {
    if (e.button === 0 && !pan) { e.preventDefault(); down(e); }
});
window.addEventListener('mousemove', e => {
    if (!pan) move(e);
});
window.addEventListener('mouseup', e => {
    if (e.button === 0 && !pan) release();
});
window.addEventListener('blur', () => { release(true); pan = null; touchId = null; touchView = null; });
function touchCenter(touches) {
    return (touches[0].clientY + touches[1].clientY) / 2;
}
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length >= 2) {
        const view = touchView ?? camera;
        beginPan(touchCenter(e.touches), 'touch');
        camera = view;
        pan.camera = view;
        return;
    }
    if (pan || touchId !== null) return;
    const t = e.changedTouches[0];
    touchView = camera;
    down(t);
    if (drag) touchId = t.identifier;
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (pan?.mode === 'touch') {
        if (e.touches.length >= 2) movePan(touchCenter(e.touches));
        return;
    }
    const t = Array.from(e.changedTouches).find(t => t.identifier === touchId);
    if (t) move(t);
}, { passive: false });
function touchEnd(e, cancel) {
    if (pan?.mode === 'touch') {
        // Ignore the remaining finger until all fingers have been lifted.
        if (e.touches.length === 0) { pan = null; touchView = null; }
        return;
    }
    if (Array.from(e.changedTouches).some(t => t.identifier === touchId)) {
        release(cancel);
        touchId = null;
        touchView = null;
    }
}
canvas.addEventListener('touchend', e => touchEnd(e, false));
canvas.addEventListener('touchcancel', e => touchEnd(e, true));
function restartInput(n) { pan = null; touchId = null; touchView = null; reset(n); }
ui.next.onclick = () => restartInput(level + 1);
ui.retry.onclick = ui.restart.onclick = () => restartInput(level);
