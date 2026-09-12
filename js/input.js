"use strict";
// マウス・タッチと画面ボタンのイベント登録。
canvas.addEventListener('mousedown', e => {
    if (e.button === 0) {
        e.preventDefault();
        down(e);
    }
});
window.addEventListener('mousemove', move);
window.addEventListener('mouseup', () => release());
window.addEventListener('blur', () => release(true));
let touchId = null;
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (touchId !== null)
        return;
    const t = e.changedTouches[0];
    down(t);
    if (drag)
        touchId = t.identifier;
}, { passive: false });
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = Array.from(e.changedTouches).find(t => t.identifier === touchId);
    if (t)
        move(t);
}, { passive: false });
function touchEnd(e, cancel) {
    if (Array.from(e.changedTouches).some(t => t.identifier === touchId)) {
        release(cancel);
        touchId = null;
    }
}
canvas.addEventListener('touchend', e => touchEnd(e, false));
canvas.addEventListener('touchcancel', e => touchEnd(e, true));
ui.next.onclick = () => {
    touchId = null;
    reset(level + 1);
};
ui.retry.onclick = ui.restart.onclick = () => {
    touchId = null;
    reset(level);
};
