"use strict";
// DOM、ゲーム状態、移動・吸着・勝敗の処理。
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = Object.fromEntries([
    "level", "stamina", "progress", "scrollRail", "scrollThumb", "overlay", "resultTag",
    "resultTitle", "resultText", "next", "retry", "restart", "showPath", "density",
    "courseMenu", "existingCourse", "prototypeCourse", "undo", "courseError"
].map(id => [id, document.getElementById(id)]));

let courseMode = 'existing';
let level = 1;
let holds = [];
let route = [];
let HEIGHT = H;
let initialGrips = [];
let body;
let committed;
let grips = [];
let startGrips = [];
let stamina = 0;
let bonusStamina = 0;
let stageBonus = 0;
let moveCount = 0;
let camera = 0;
let cameraIntro = null;
let playerPath = [];
let inspecting = false;
let drag = null;
let state = "choosing";
let warning = 0;
let densityStats = null;
let undoSnapshot = null;
let moveSnapshot = null;

function generate(n) {
    ({ holds, route, HEIGHT, initialGrips, densityStats } = stageGenerator.generate(n));
}

// Anatomical reach is measured from the shoulder/hip, not the torso center.
function limbReachable(p, h, i) {
    const root = limbRoot(p, i);
    const reach = distance(root, h);
    return reach <= LIMB_LENGTHS[i] + 1e-7 && (i < 2 || (
        h.y >= p.y - 1e-7 &&
        (h.y >= root.y - 1e-7 || reach >= LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO - 1e-7)
    ));
}

// Raised fixed feet create a non-convex reachable area. Stop at the FIRST
// invalid interval, even when the endpoint itself is reachable again.
function supportMotionFraction(from, to, pair, stance = startGrips) {
    if (!isSupportPair(pair) || !pair.every(i => stance[i] && limbReachable(from, stance[i], i))) return 0;
    const dx = to.x - from.x, dy = to.y - from.y;
    const length2 = dx * dx + dy * dy;
    if (length2 < 1e-16) return 1;
    const cuts = [0, 1];
    const add = t => { if (t > 0 && t < 1) cuts.push(t); };
    for (const i of pair) {
        const h = stance[i], root = limbRoot(from, i);
        const x = root.x - h.x, y = root.y - h.y;
        const circle = radius => {
            const b = 2 * (x * dx + y * dy);
            const c = x * x + y * y - radius * radius;
            const discriminant = b * b - 4 * length2 * c;
            if (discriminant < 0) return;
            const q = Math.sqrt(discriminant);
            add((-b - q) / (2 * length2));
            add((-b + q) / (2 * length2));
        };
        circle(LIMB_LENGTHS[i]);
        if (i >= 2) {
            circle(LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO);
            if (Math.abs(dy) > 1e-12) {
                add((h.y - from.y) / dy);
                add((h.y - TORSO.height / 2 - from.y) / dy);
            }
        }
    }
    cuts.sort((a, b) => a - b);
    for (let k = 1; k < cuts.length; k++) {
        const t = (cuts[k - 1] + cuts[k]) / 2;
        const p = { x: from.x + dx * t, y: from.y + dy * t };
        if (!pair.every(i => limbReachable(p, stance[i], i))) return cuts[k - 1];
    }
    return 1;
}

function supportPairReach(pair, ux, uy) {
    const limit = Math.max(...pair.map(i => LIMB_LENGTHS[i])) * 2;
    return limit * supportMotionFraction(committed,
        { x: committed.x + ux * limit, y: committed.y + uy * limit }, pair);
}

// A moving limb should have a hold ahead of its current contact in the
// initial Body movement direction. This only checks whether such a
// possibility exists; it does not decide which hold the limb will use.
function movingLimbHasForwardHold(i, pair, ux, uy, pairReach) {
    const current = startGrips[i];
    if (!current)
        return false;

    // Sample several Body positions along the support pair's reachable range.
    // The actual hold remains undecided and will still be selected in real time
    // by attachMoving() during the drag.
    const samples = [0.25, 0.5, 0.75, 1.0];

    for (const ratio of samples) {
        const p = {
            x: committed.x + ux * pairReach * ratio,
            y: committed.y + uy * pairReach * ratio
        };

        for (const h of holds) {
            // Staying on the same hold is not a new movement opportunity.
            if (h === current)
                continue;

            // A support hold is occupied and cannot normally be reused.
            // The goal is the one exception: both hands may share it.
            const occupiedBySupport = pair.some(j =>
                startGrips[j] === h &&
                !canShareHold(h, i, j)
            );

            if (occupiedBySupport)
                continue;

            // Only count holds that lie ahead of the limb's current contact
            // in the initial drag direction.
            const forward =
                (h.x - current.x) * ux +
                (h.y - current.y) * uy;

            if (forward <= 0)
                continue;

            if (limbReachable(p, h, i))
                return true;
        }
    }

    return false;
}

function selectAnchor(dx, dy) {
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;

    const supportPairs = [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [1, 3],
        [2, 3]
    ];

    let bestPair = supportPairs[0];
    let bestMovingCount = -1;
    let bestReach = -1;

    for (const pair of supportPairs) {
        const reach = supportPairReach(pair, ux, uy);
        const moving = [0, 1, 2, 3].filter(i => !pair.includes(i));

        let movingCount = 0;

        for (const i of moving) {
            if (movingLimbHasForwardHold(i, pair, ux, uy, reach))
                movingCount++;
        }

        // First prefer the support pair that gives more moving limbs
        // a useful forward destination.
        //
        // If the number of useful moving limbs is the same, preserve
        // the original philosophy and prefer the pair that lets Body
        // travel farther in the requested direction.
        if (
            movingCount > bestMovingCount ||
            (movingCount === bestMovingCount && reach > bestReach)
        ) {
            bestPair = pair;
            bestMovingCount = movingCount;
            bestReach = reach;
        }
    }

    return [...bestPair];
}

function canShareHold(hold, a, b) {
    return a !== b && ((hold.type === 'goal' && a < 2 && b < 2) ||
        (hold.wide === true && Math.floor(a / 2) === Math.floor(b / 2)));
}

function attachMoving(p, anchor) {
    const result = Array(4).fill(null);
    const fixed = anchor;

    if (!supportsReachable(p, anchor))return null;

    fixed.forEach(i => result[i] = startGrips[i]);

    const moving = [0, 1, 2, 3].filter(i => !fixed.includes(i));

    const candidates = moving.map(i => {
        const target = {
            x: p.x + limbs[i].x,
            y: p.y + limbs[i].y
        };

        const available = holds;

        return available
            .filter(h =>
                fixed.every(j => h !== result[j] || canShareHold(h, i, j)) &&
                limbReachable(p, h, i)
            )
            .map(h => ({
                h,
                cost:
                    distance(h, target) ** 2 -
                    (h.type === 'goal' ? 4 * R * R : 0)
            }))
            .sort((a, b) =>
                a.cost - b.cost ||
                a.h.id - b.h.id
            );
    });

    // Sharing is pairwise: a wide hold accepts two hands OR two feet, never a mix.
    let best = [...result];
    let bestCount = -1;
    let bestCost = Infinity;

    function assign(slot, count, cost) {
        if (slot === moving.length) {
            const hands = result.slice(0, 2).filter(Boolean);
            const feet = result.slice(2).filter(Boolean);

            if (feet.some(foot => hands.some(hand => foot.y < hand.y)))
                return;

            if (
                count > bestCount ||
                (count === bestCount && cost < bestCost)
            ) {
                best = [...result];
                bestCount = count;
                bestCost = cost;
            }

            return;
        }

        const i = moving[slot];

        for (const candidate of candidates[slot]) {
            if (
                result.some((h, j) =>
                    j !== i &&
                    h === candidate.h &&
                    !canShareHold(h, i, j)
                )
            )
                continue;

            result[i] = candidate.h;
            assign(slot + 1, count + 1, cost + candidate.cost);
        }

        result[i] = null;
        assign(slot + 1, count, cost);
    }

    assign(0, 0, 0);

    return bestCount < 0 ? null : best;
}

function reset(n, bonus = 0) {
    undoSnapshot = moveSnapshot = null;
    resetCharacterAnimation();
    jointHistory.fill(null);
    level = n;
    if (courseMode === 'prototype') preparePrototypeStage();
    else prepareStage();

    body = { ...route[0] };
    committed = { ...body };
    grips = [...initialGrips];

    for (const pair of [[0, 1], [2, 3]]) {
        const sorted = pair
            .map(i => grips[i])
            .sort((a, b) => a.x - b.x);

        pair.forEach((i, j) => grips[i] = sorted[j]);
    }

    startGrips = [...grips];
    startInitialPose();

    stageBonus = bonusStamina = Math.max(0,Math.floor(bonus));
    stamina = route.length - 1 + STAGE_CONFIG.spareMoves + bonusStamina;

    moveCount = 0;

    playerPath = [{
        x: body.x,
        y: body.y
    }];

    camera = clamp(
        holds.find(h => h.type === 'goal').y - H * .2,
        0,
        HEIGHT - H
    );

    const introTarget = HEIGHT - H;
    cameraIntro = camera < introTarget
        ? {from:camera,to:introTarget,start:null}
        : null;

    inspecting = false;
    drag = null;
    state = 'playing';
    warning = 0;

    ui.overlay.hidden = true;
    ui.restart.disabled = false;

    ui.level.innerHTML = `Level ${level}<span>${courseMode === 'prototype' ? 'ロジハラコース' : 'ノーマルコース'} · 2点固定</span>`;
    ui.next.textContent = 'NEXT STAGE →';

    updateUI();
}

function updateUI() {
    ui.undo.disabled = !undoSnapshot || !!drag || !!cameraIntro || state === 'choosing';
    ui.stamina.textContent = `${stamina-bonusStamina}+${bonusStamina}`;
    ui.stamina.setAttribute('aria-label',`通常 ${stamina-bonusStamina} 手、ボーナス ${bonusStamina} 手`);
    ui.stamina.style.color =
        stamina <= 4
            ? '#bc5144'
            : '#25372f';

    ui.progress.textContent =
        `${moveCount} 手 / 想定 ${route.length - 1} 手`;

    if (densityStats.prototype) {
        ui.density.textContent = `ロジハラ：必要ホールド ${densityStats.total} 個 · 想定 ${route.length - 1} 手`;
        return;
    }
    ui.density.textContent =
        `密度：最大 ${densityStats.peak} 個／画面 · ` +
        `基準 ${densityStats.target} 個 · ` +
        `全体 ${densityStats.total} 個 · ` +
        `${densityStats.iterations} 回調整` +
        `${densityStats.converged ? '' : '（制約により調整停止）'} · ` +
        `ルート検証で ${densityStats.routeRemoved} 個削減`;
}

function point(e) {
    const r = canvas.getBoundingClientRect();

    return {
        x: (e.clientX - r.left) * W / r.width,
        y: (e.clientY - r.top) * H / r.height + camera
    };
}

function limbRoot(p, index) {
    return {
        x:
            p.x +
            (index % 2 ? 1 : -1) *
            TORSO.width / 2,

        y:
            p.y +
            (index < 2 ? -1 : 1) *
            TORSO.height / 2
    };
}

function down(e) {
    if (
        state !== 'playing' ||
        cameraIntro ||
        drag
    )
        return;

    inspecting = false;

    camera = clamp(
        body.y - H * CAMERA_CONFIG.bodyScreenRatio,
        0,
        HEIGHT - H
    );

    const p = point(e);

    if (
        p.x < 0 ||
        p.x > W ||
        p.y < camera ||
        p.y > camera + H
    )
        return;

    // Preserve the visible settled pose as well as the logical move origin.
    moveSnapshot = {
        body:{...body}, grips:[...grips], stamina, bonusStamina, moveCount,
        playerPath:playerPath.map(p=>({...p})), camera,
        visibleBody:{...characterPose(performance.now()).body},
        joints:jointHistory.map(p=>p && ({...p}))
    };
    resetCharacterAnimation();
    drag = {
        dx: body.x - p.x,
        dy: body.y - p.y,
        anchor: null
    };

    committed = { ...body };
    startGrips = [...grips];

    updateUI();
}

function move(e) {
    if (!drag)
        return;

    const p = point(e);

    const raw = {
        x: p.x + drag.dx,
        y: p.y + drag.dy
    };

    const target = {
        x: clamp(raw.x, 25, W - 25),
        y: clamp(raw.y, 80, HEIGHT - 40)
    };

    const d = distance(raw, committed);

    if (drag.anchor === null) {
        if (d < INPUT_CONFIG.dragThreshold)
            return;

        drag.anchor = selectAnchor(
            raw.x - committed.x,
            raw.y - committed.y
        );
    }

    const previousBody = { ...body };
    const fraction = supportMotionFraction(body, target, drag.anchor);
    const blocked = fraction < 1 - 1e-9;
    body = { x: body.x + (target.x - body.x) * fraction,
        y: body.y + (target.y - body.y) * fraction };

    const attached =
        attachMoving(body, drag.anchor);

    if (attached)
        grips = attached;
    else
        body = previousBody;

    warning = blocked ? 1 : 0;

    updateUI();
}

function bothHandsOnGoal(stance = grips) {
    return (
        stance[0]?.type === 'goal' &&
        stance[0] === stance[1]
    );
}

// Compare contact positions as a multiset, independent of limb assignment.
function sameContacts(a, b) {
    if (
        a.length !== 4 ||
        b.length !== 4 ||
        !a.every(Boolean) ||
        !b.every(Boolean)
    )
        return false;

    const positions = list =>
        list
            .map(h => h.x + ',' + h.y)
            .sort();

    const left = positions(a);
    const right = positions(b);

    return left.every(
        (position, i) =>
            position === right[i]
    );
}

function release(cancel = false) {
    if (!drag)
        return;

    const invalid =
        grips.some(h => h === null) ||
        (
                (
                !isSupportPair(drag.anchor) ||
                !drag.anchor.every(i =>
                    grips[i] === startGrips[i] &&
                    limbReachable(
                        body,
                        grips[i],
                        i
                    )
                )
            )
        );

    drag = null;

    if (
        cancel ||
        invalid ||
        sameContacts(grips, startGrips)
    ) {
        body = { ...committed };
        grips = [...startGrips];
    } else {
        undoSnapshot = moveSnapshot;
        playerPath.push({
            x: body.x,
            y: body.y
        });

        if (bonusStamina > 0) bonusStamina--;
        stamina--;
        moveCount++;

        committed = { ...body };
        startPoseSettle();

        if (bothHandsOnGoal())
            finish(true);
        else if (stamina === 0)
            finish(false);
    }

    moveSnapshot = null;
    warning = 0;

    updateUI();
}

function undoMove() {
    if (!undoSnapshot || drag || cameraIntro || state === 'choosing') return false;
    const saved = undoSnapshot;
    undoSnapshot = moveSnapshot = null;
    body = {...saved.body}; committed = {...body};
    grips = [...saved.grips]; startGrips = [...grips];
    stamina = saved.stamina; bonusStamina = saved.bonusStamina; moveCount = saved.moveCount;
    playerPath = saved.playerPath.map(p=>({...p}));
    camera = saved.camera; inspecting = false; warning = 0; state = 'playing';
    resetCharacterAnimation();
    characterAnimation = {kind:'settle',start:performance.now(),
        origin:{...saved.visibleBody},target:{...saved.visibleBody}};
    saved.joints.forEach((p,i)=>jointHistory[i]=p && ({...p}));
    ui.overlay.hidden = true; ui.next.hidden = true;
    updateUI();
    return true;
}

function finish(won) {
    state = won ? 'won' : 'lost';
    if(won)startGoalHang();
    ui.overlay.hidden = false;
    ui.next.hidden = !won;

    ui.resultTag.textContent =
        won
            ? 'TOP OUT / WELL CLIMBED'
            : 'TAKE A BREATH';

    ui.resultTitle.textContent =
        won
            ? '登頂成功！'
            : 'あと、もう少し。';

    ui.resultText.textContent =
        won
            ? `Level ${level} を ${moveCount} 手でクリア。残り ${stamina} 手を次ステージのボーナスに。`
            : 'スタミナがなくなりました。同じ壁でルートを見直してみよう。';

    (won ? ui.next : ui.retry).focus();
}

// RAF time is injected so tests can advance the opening without real waits.
function advanceCameraIntro(now) {
    if (!cameraIntro || state !== 'playing')
        return;

    if (cameraIntro.start === null)
        cameraIntro.start = now;

    camera = Math.min(cameraIntro.to, cameraIntro.from +
        Math.max(0,now-cameraIntro.start) * CAMERA_CONFIG.introSpeed / 1000);
    if (camera >= cameraIntro.to) {
        cameraIntro = null;
        updateUI();
    }
}

function isSupportPair(pair) {
    return Array.isArray(pair) && pair.length===2 && pair[0]!==pair[1] &&
        pair.every(i=>Number.isInteger(i) && i>=0 && i<4);
}
function supportsReachable(p, anchor) {
    return isSupportPair(anchor) && anchor.every(i =>
        startGrips[i] &&
        limbReachable(
            p,
            startGrips[i],
            i
        )
    );
}