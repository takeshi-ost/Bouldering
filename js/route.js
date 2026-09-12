"use strict";
// Search with the same support selection and grip assignment used during play.
// Temporary state is restored before returning to the caller.
function solveRoute(guide, maxMoves = 40) {
    const saved = { committed, startGrips };
    const start = { ...guide[0] };
    const first = [...initialGrips];
    for (const pair of [[0, 1], [2, 3]]) {
        const sorted = pair.map(i => first[i]).sort((a, b) => a.x - b.x);
        pair.forEach((i, j) => first[i] = sorted[j]);
    }
    const goal = holds.find(h => h.type === 'goal');
    const targets = [...guide.slice(1), { x: goal.x, y: goal.y + 70 }];
    const progress = p => {
        let best = Infinity, index = 0;
        targets.forEach((q, i) => {
            const d = distance(p, q);
            if (d < best) { best = d; index = i; }
        });
        return index * 100 - best;
    };
    let beam = [{ p: start, stance: first, path: [start], score: progress(start) }];
    const visited = new Set();
    try {
        for (let depth = 0; depth < maxMoves; depth++) {
            const next = [];
            for (const node of beam) {
                committed = node.p;
                startGrips = node.stance;
                const candidates = [];
                for (const q of targets) {
                    if (distance(node.p, q) > 230) continue;
                    for (const t of [0.5, 0.75, 1])
                        candidates.push({ x: node.p.x + (q.x - node.p.x) * t, y: node.p.y + (q.y - node.p.y) * t });
                }
                for (const dx of [-60, -30, 0, 30, 60])
                    for (const dy of [-90, -45, 0])
                        candidates.push({ x: node.p.x + dx, y: node.p.y + dy });
                for (const p of candidates) {
                    if (p.x < 25 || p.x > W - 25 || p.y < 80 || p.y > HEIGHT - 40 || distance(p, node.p) < 5) continue;
                    const anchor = selectAnchor(p.x - node.p.x, p.y - node.p.y);
                    if (!limbReachable(p, node.stance[anchor], anchor)) continue;
                    const stance = attachMoving(p, anchor);
                    if (!stance) continue;
                    const won = stance[0]?.type === 'goal' && stance[0] === stance[1];
                    if (!won && !stance.every(Boolean)) continue;
                    const key = Math.round(p.x / 8) + ',' + Math.round(p.y / 8) + ':' + stance.map(h => h?.id).join(',');
                    if (visited.has(key)) continue;
                    visited.add(key);
                    const path = [...node.path, { ...p, anchor, grips: stance.map(h => h?.id ?? null) }];
                    if (won) return path;
                    next.push({ p, stance, path, score: progress(p) });
                }
            }
            next.sort((a, b) => b.score - a.score);
            beam = next.slice(0, 12);
            if (!beam.length) break;
        }
        return null;
    } finally {
        committed = saved.committed;
        startGrips = saved.startGrips;
    }
}
function preparePlayableStage() {
    const guide = route;
    let verified = solveRoute(guide);
    if (!verified) throw new Error('Playable route could not be generated for level ' + level);
    const original = [...holds];
    const protectedIds = new Set([...initialGrips.map(h => h.id), ...verified.flatMap(p => p.grips || [])]);
    // Remove unused holds across the whole wall, not just beside the path.
    holds = holds.filter(h => h.type !== 'normal' || protectedIds.has(h.id));
    verified = replayRoute(verified);
    if (!verified) throw new Error('Core route replay failed');
    const core = [...holds];
    const branchHolds = [];
    // Any two holds used in the same pose must lie within this conservative
    // distance (two limb lengths plus the separation between torso corners).
    const transferSpan = 2 * Math.max(...LIMB_LENGTHS) + Math.hypot(TORSO.width, TORSO.height);
    const candidates = original.filter(h => !holds.includes(h)).map(h => {
        const nearby = verified.map((p, i) => ({ i, d: distance(p, h) })).sort((a, b) => a.d - b.d);
        return { h, station: nearby[0].i, d: nearby[0].d };
    }).filter(c => c.station > 0 && c.station < verified.length - 1 && c.d < 125);
    candidates.sort((a, b) => a.station - b.station || a.d - b.d || a.h.id - b.h.id);
    for (const candidate of candidates) {
        if (branchHolds.length >= 4) break;
        const touching = branchHolds.filter(b => distance(b.h, candidate.h) <= transferSpan);
        // One pocket has at most two off-route holds, associated with at most
        // two consecutive route steps. Different pockets cannot link directly.
        if (touching.length > 1 || touching.some(b => Math.abs(b.station - candidate.station) > 1)) continue;
        if (touching.some(b => branchHolds.some(other => other !== b && distance(b.h, other.h) <= transferSpan))) continue;
        const before = holds;
        holds = [...holds, candidate.h];
        const replay = replayRoute(verified);
        // An added branch must not change the core solution's grip assignment.
        if (!replay || replay.some((p, i) => JSON.stringify(p.grips) !== JSON.stringify(verified[i].grips))) {
            holds = before;
            continue;
        }
        verified = replay;
        branchHolds.push(candidate);
    }
    const removed = original.length - holds.length;
    route = verified;
    const windows = [0, HEIGHT - H, ...holds.map(h => clamp(h.y - H, 0, HEIGHT - H))];
    densityStats = { ...densityStats, total: holds.length, peak: Math.max(...windows.map(y => holds.filter(h => h.y >= y && h.y <= y + H).length)), routeRemoved: removed, branchCount: branchHolds.length, coreCount: core.length };
}
function replayRoute(path) {
    const saved = { committed, startGrips };
    try {
        let stance = [...initialGrips];
        for (const pair of [[0, 1], [2, 3]]) {
            const sorted = pair.map(i => stance[i]).sort((a, b) => a.x - b.x);
            pair.forEach((i, j) => stance[i] = sorted[j]);
        }
        const result = [path[0]];
        for (let i = 1; i < path.length; i++) {
            committed = path[i - 1]; startGrips = stance;
            const p = path[i], anchor = selectAnchor(p.x - committed.x, p.y - committed.y);
            if (!limbReachable(p, stance[anchor], anchor)) return null;
            stance = attachMoving(p, anchor);
            if (!stance) return null;
            const won = stance[0]?.type === 'goal' && stance[0] === stance[1];
            if (!won && !stance.every(Boolean)) return null;
            result.push({ ...p, anchor, grips: stance.map(h => h?.id ?? null) });
            if (won) return result;
        }
        return null;
    } finally { committed = saved.committed; startGrips = saved.startGrips; }
}
