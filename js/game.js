"use strict";
// DOM、ゲーム状態、移動・吸着・勝敗の処理。
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = Object.fromEntries([
    "level", "stamina", "progress", "scrollRail", "scrollThumb", "overlay", "resultTag",
    "resultTitle", "resultText", "next", "retry", "restart", "showPath", "density"
].map(id => [id, document.getElementById(id)]));
let courseMode = "classic";
let level = 1;
let holds = [];
let route = [];
let HEIGHT = H;
let initialGrips = [];
let body;
let committed;
let grips = [];
let startGrips = [];
let stamina = STAGE_CONFIG.introMoves + STAGE_CONFIG.spareMoves;
let moveCount = 0;
let camera = 0;
let inspecting = false;
let drag = null;
let state = "playing";
let warning = 0;
let densityStats = null;
function generate(n) {
    ({ holds, route, HEIGHT, initialGrips, densityStats } = stageGenerator.generate(n));
}
// Anatomical reach is measured from the shoulder/hip, not the torso center.
function limbReachable(p, h, i) {
    return distance(limbRoot(p, i), h) <= LIMB_LENGTHS[i] + 1e-7;
}
function selectAnchor(dx, dy) {
    const length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
    let best = 0, reach = -1;
    startGrips.forEach((h, i) => {
        let low = 0, high = LIMB_LENGTHS[i] * 2;
        for (let step = 0; step < INPUT_CONFIG.reachSearchSteps; step++) {
            const t = (low + high) / 2;
            const p = { x: committed.x + ux * t, y: committed.y + uy * t };
            if (limbReachable(p, h, i)) low = t;
            else high = t;
        }
        if (low > reach) { reach = low; best = i; }
    });
    return best;
}
function canShareGoal(hold, a, b) {
    return hold.type === 'goal' && a < 2 && b < 2 && a !== b;
}
function attachMoving(p, anchor) {
    const result = Array(4).fill(null);
    result[anchor] = startGrips[anchor];
    const moving = [0, 1, 2, 3].filter(i => i !== anchor);
    const candidates = moving.map(i => {
        const target = { x: p.x + limbs[i].x, y: p.y + limbs[i].y };
        return holds.filter(h => (h !== result[anchor] || canShareGoal(h, i, anchor)) && limbReachable(p, h, i))
            .map(h => ({ h, cost: distance(h, target) ** 2 - (h.type === 'goal' ? 4 * R * R : 0) }))
            .sort((a, b) => a.cost - b.cost || a.h.id - b.h.id);
    });
    // Only the two hands can share the goal; the selected anchor never changes.
    let best = [...result], bestCount = -1, bestCost = Infinity;
    function assign(slot, count, cost) {
        if (slot === moving.length) {
            const hands = result.slice(0, 2).filter(Boolean), feet = result.slice(2).filter(Boolean);
            if (feet.some(foot => hands.some(hand => foot.y < hand.y))) return;
            if (count > bestCount || (count === bestCount && cost < bestCost)) {
                best = [...result]; bestCount = count; bestCost = cost;
            }
            return;
        }
        const i = moving[slot];
        for (const candidate of candidates[slot]) {
            if (result.some((h, j) => j !== i && h === candidate.h && !canShareGoal(h, i, j))) continue;
            result[i] = candidate.h;
            assign(slot + 1, count + 1, cost + candidate.cost);
        }
        result[i] = null;
        assign(slot + 1, count, cost);
    }
    assign(0, 0, 0);
    return bestCount < 0 ? null : best;
}
function reset(n) {
    level = n;
    generate(level);
    preparePlayableStage();
    if (courseMode === "challenge") prepareChallengeStage();
    body = { ...route[0] };
    committed = { ...body };
    grips = [...initialGrips];
    for (const pair of [[0, 1], [2, 3]]) {
        const sorted = pair.map(i => grips[i]).sort((a, b) => a.x - b.x);
        pair.forEach((i, j) => grips[i] = sorted[j]);
    }
    startGrips = [...grips];
    stamina = route.length - 1 + STAGE_CONFIG.spareMoves;
    moveCount = 0;
    camera = HEIGHT - H;
    inspecting = false;
    drag = null;
    state = 'playing';
    warning = 0;
    ui.overlay.hidden = true;
    ui.restart.disabled = false;
    ui.level.innerHTML = `Level ${level}<span>${courseMode === "challenge" ? "難関コース" : "従来コース"}</span>`;
    updateUI();
}
function updateUI() {
    ui.stamina.textContent = stamina;
    ui.stamina.style.color = stamina <= 4 ? '#bc5144' : '#25372f';
    ui.progress.textContent = `${moveCount} 手 / 想定 ${route.length - 1} 手`;
    ui.density.textContent = `密度：最大 ${densityStats.peak} 個／画面 · 基準 ${densityStats.target} 個 · 全体 ${densityStats.total} 個 · ${densityStats.iterations} 回調整${densityStats.converged ? '' : '（制約により調整停止）'} · ルート検証で ${densityStats.routeRemoved} 個削減`;

}
function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height + camera };
}
function limbRoot(p, index) {
    return { x: p.x + (index % 2 ? 1 : -1) * TORSO.width / 2, y: p.y + (index < 2 ? -1 : 1) * TORSO.height / 2 };
}
function down(e) {
    if (state !== 'playing' || drag)
        return;
    inspecting = false;
    camera = clamp(body.y - H * CAMERA_CONFIG.bodyScreenRatio, 0, HEIGHT - H);
    const p = point(e);
    if (p.x < 0 || p.x > W || p.y < camera || p.y > camera + H)
        return;
    drag = { dx: body.x - p.x, dy: body.y - p.y, anchor: null };
    committed = { ...body };
    startGrips = [...grips];
    updateUI();
}
function move(e) {
    if (!drag)
        return;
    const p = point(e), raw = { x: p.x + drag.dx, y: p.y + drag.dy };
    const target = { x: clamp(raw.x, 25, W - 25), y: clamp(raw.y, 80, HEIGHT - 40) };
    const d = distance(raw, committed);
    if (drag.anchor === null) {
        if (d < INPUT_CONFIG.dragThreshold)
            return;
        drag.anchor = selectAnchor(raw.x - committed.x, raw.y - committed.y);
    }
    const anchor = startGrips[drag.anchor];
    const reachable = q => limbReachable(q, anchor, drag.anchor);
    // Keep the selected support throughout this gesture.
    const previousBody = { ...body };
    const blocked = !reachable(target);
    if (blocked) {
        let low = 0, high = 1;
        const origin = { ...(reachable(body) ? body : committed) };
        for (let i = 0; i < INPUT_CONFIG.reachSearchSteps; i++) {
            const t = (low + high) / 2, q = { x: origin.x + (target.x - origin.x) * t, y: origin.y + (target.y - origin.y) * t };
            if (reachable(q))
                low = t;
            else
                high = t;
        }
        body = { x: origin.x + (target.x - origin.x) * low, y: origin.y + (target.y - origin.y) * low };
    }
    else
        body = target;
    const attached = attachMoving(body, drag.anchor);
    if (attached) grips = attached;
    else body = previousBody;
    warning = blocked ? 1 : 0;
    updateUI();
}
function bothHandsOnGoal(stance = grips) {
    return stance[0]?.type === 'goal' && stance[0] === stance[1];
}
// Compare contact positions as a multiset, independent of limb assignment.
function sameContacts(a, b) {
    if (a.length !== 4 || b.length !== 4 || !a.every(Boolean) || !b.every(Boolean)) return false;
    const positions = list => list.map(h => h.x + ',' + h.y).sort();
    const left = positions(a), right = positions(b);
    return left.every((position, i) => position === right[i]);
}
function release(cancel = false) {
    if (!drag)
        return;
    const invalid = grips.some(h => h === null);
    drag = null;
    if (cancel || invalid || sameContacts(grips, startGrips)) {
        body = { ...committed };
        grips = [...startGrips];
    }
    else {
        stamina--;
        moveCount++;
        committed = { ...body };
        if (bothHandsOnGoal())
            finish(true);
        else if (stamina === 0)
            finish(false);
    }
    warning = 0;
    updateUI();
}
function finish(won) {
    state = won ? 'won' : 'lost';
    ui.overlay.hidden = false;
    ui.next.hidden = !won;
    ui.resultTag.textContent = won ? 'TOP OUT / WELL CLIMBED' : 'TAKE A BREATH';
    ui.resultTitle.textContent = won ? '登頂成功！' : 'あと、もう少し。';
    ui.resultText.textContent = won ? `Level ${level} を ${moveCount} 手でクリア。残り ${stamina} 手。` : 'スタミナがなくなりました。同じ壁でルートを見直してみよう。';
    (won ? ui.next : ui.retry).focus();
}
