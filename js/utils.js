"use strict";
// 共通の座標計算とシード付き乱数。
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function gripAim(p, origin) {
    const d = distance(p, origin);
    return d < INPUT_CONFIG.dragThreshold ? p : { x: p.x + (p.x - origin.x) * INPUT_CONFIG.aimDistance / d, y: p.y + (p.y - origin.y) * INPUT_CONFIG.aimDistance / d };
}

// World Y increases downward. An ascending diagonal is not a traverse.
function isTraverse(a, b, minimum = 30) {
    return Math.abs(b.x-a.x)>=minimum && b.y>=a.y-1e-7;
}
