"use strict";
// DOM、ゲーム状態、移動・吸着・勝敗の処理。
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = Object.fromEntries([
    "level", "stamina", "progress", "scrollRail", "scrollThumb", "overlay", "resultTag",
    "resultTitle", "resultText", "next", "retry", "restart", "showPath", "density",
    "courseMenu", "existingCourse", "prototypeCourse", "changeCourse", "courseError"
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
let moveCount = 0;
let camera = 0;
let cameraIntro = null;
let playerPath = [];
let inspecting = false;
let drag = null;
let state = "choosing";
let warning = 0;
let densityStats = null;

function generate(n) {
    ({ holds, route, HEIGHT, initialGrips, densityStats } = stageGenerator.generate(n));
}

// Anatomical reach is measured from the shoulder/hip, not the torso center.
function limbReachable(p, h, i) {
    // Feet may rise to shoulder height, including when they are fixed supports.
    return (i < 2 || h.y >= p.y - TORSO.height / 2 - 1e-7) &&
        distance(limbRoot(p, i), h) <= LIMB_LENGTHS[i] + 1e-7;
}

// Return how far Body can move in the initial drag direction while
// every limb in the support pair keeps its current hold.
function supportPairReach(pair, ux, uy) {
    let low = 0;
    let high = Math.max(...pair.map(i => LIMB_LENGTHS[i])) * 2;

    for (let step = 0; step < INPUT_CONFIG.reachSearchSteps; step++) {
        const t = (low + high) / 2;
        const p = {
            x: committed.x + ux * t,
            y: committed.y + uy * t
        };

        if (pair.every(i =>
            startGrips[i] &&
            limbReachable(p, startGrips[i], i)
        )) {
            low = t;
        } else {
            high = t;
        }
    }

    return low;
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
                !canShareGoal(h, i, j)
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

function canShareGoal(hold, a, b) {
    return hold.type === 'goal' && a < 2 && b < 2 && a !== b;
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
                fixed.every(j => h !== result[j] || canShareGoal(h, i, j)) &&
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

    // Only the two hands can share the goal; the selected anchor never changes.
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
                    !canShareGoal(h, i, j)
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

function reset(n) {
    resetCharacterAnimation();
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

    stamina = route.length - 1 + STAGE_CONFIG.spareMoves;

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

    cameraIntro = {
        from: camera,
        to: clamp(
            body.y - H * CAMERA_CONFIG.bodyScreenRatio,
            0,
            HEIGHT - H
        ),
        start: null
    };

    inspecting = false;
    drag = null;
    state = 'playing';
    warning = 0;

    ui.overlay.hidden = true;
    ui.restart.disabled = false;

    ui.level.innerHTML = `Level ${level}<span>${courseMode === 'prototype' ? '試作コース' : '既存コース'} · 2点固定</span>`;
    ui.next.textContent = 'NEXT STAGE →';

    updateUI();
}

function updateUI() {
    ui.stamina.textContent = stamina;
    ui.stamina.style.color =
        stamina <= 4
            ? '#bc5144'
            : '#25372f';

    ui.progress.textContent =
        `${moveCount} 手 / 想定 ${route.length - 1} 手`;

    if (densityStats.prototype) {
        ui.density.textContent = `試作：必要ホールド ${densityStats.total} 個 · 想定 ${route.length - 1} 手`;
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

    const reachable = q =>
        supportsReachable(q, drag.anchor);

    // Keep the selected support throughout this gesture.
    const previousBody = { ...body };
    const blocked = !reachable(target);

    if (blocked) {
        let low = 0;
        let high = 1;

        const origin = {
            ...(reachable(body)
                ? body
                : committed)
        };

        for (
            let i = 0;
            i < INPUT_CONFIG.reachSearchSteps;
            i++
        ) {
            const t = (low + high) / 2;

            const q = {
                x:
                    origin.x +
                    (target.x - origin.x) * t,

                y:
                    origin.y +
                    (target.y - origin.y) * t
            };

            if (reachable(q))
                low = t;
            else
                high = t;
        }

        body = {
            x:
                origin.x +
                (target.x - origin.x) * low,

            y:
                origin.y +
                (target.y - origin.y) * low
        };
    } else {
        body = target;
    }

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
        playerPath.push({
            x: body.x,
            y: body.y
        });

        stamina--;
        moveCount++;

        committed = { ...body };
        startPoseSettle();

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
            ? `Level ${level} を ${moveCount} 手でクリア。残り ${stamina} 手。`
            : 'スタミナがなくなりました。同じ壁でルートを見直してみよう。';

    (won ? ui.next : ui.retry).focus();
}

// RAF time is injected so tests can advance the opening without real waits.
function advanceCameraIntro(now) {
    if (!cameraIntro || state !== 'playing')
        return;

    if (cameraIntro.start === null)
        cameraIntro.start = now;

    const t = clamp(
        (now - cameraIntro.start - 450) / 1200,
        0,
        1
    );

    camera =
        cameraIntro.from +
        (cameraIntro.to - cameraIntro.from) *
        t * t * (3 - 2 * t);

    if (t === 1)
        cameraIntro = null;
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