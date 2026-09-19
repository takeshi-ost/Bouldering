"use strict";
// Two-support route search and replay use the same physics as live play.
function solveRoute(guide, maxMoves = 40) {
    const saved = { committed, startGrips };
    const needsTraverse = level !== 1;
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
    let beam = [{ p: start, stance: first, path: [start], traversed: !needsTraverse, score: progress(start) }];
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
                    for (const dy of (needsTraverse ? [-90,-45,0,20,40] : [-90,-45,0]))
                        candidates.push({ x: node.p.x + dx, y: node.p.y + dy });
                for (const p of candidates) {
                    if (p.x < 25 || p.x > W - 25 || p.y < 80 || p.y > HEIGHT - 40 || distance(p, node.p) < 5) continue;
                    const anchor = selectAnchor(p.x - node.p.x, p.y - node.p.y);
                    if (!supportsReachable(p,anchor)) continue;
                    const stance = attachMoving(p, anchor);
                    if (!stance) continue;
                    const won = bothHandsOnGoal(stance) && stance.every(Boolean);
                    if (!won && (!stance.every(Boolean) || sameContacts(stance, node.stance))) continue;
                    const key = node.traversed + ':' + Math.round(p.x / 8) + ',' + Math.round(p.y / 8) + ':' + stance.map(h => h?.id).join(',');
                    if (visited.has(key)) continue;
                    visited.add(key);
                    const path = [...node.path, { ...p, anchor, grips: stance.map(h => h?.id ?? null) }];
                    const traversed=node.traversed || isTraverse(node.p,p);
                    if (won) {if(traversed)return path;else continue;}
                    next.push({ p, stance, path, traversed, score: progress(p) });
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
function replayRoute(path) {
    const saved = { committed, startGrips, moveCount };
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
            if (!supportsReachable(p,anchor)) return null;
            stance = attachMoving(p, anchor);
            if (!stance) return null;
            const won = bothHandsOnGoal(stance) && stance.every(Boolean);
            if (!won && (!stance.every(Boolean) || sameContacts(stance, startGrips))) return null;
            result.push({ ...p, anchor, grips: stance.map(h => h?.id ?? null) });
            if (won) return level===1 ||
                result.slice(1).some((q,j)=>isTraverse(result[j],q)) ? result : null;
        }
        return null;
    } finally { committed = saved.committed; startGrips = saved.startGrips; moveCount=saved.moveCount; }
}


function prepareStage() {
    generate(level);
    const solved=solveRoute(route);
    if(!solved)throw new Error('Two-support route search failed for level '+level);
    route=solved;
    pruneUnusedHolds();
    densityStats.fixedSupports=2;
}

// Unused contacts can still affect the six-pair selector's look-ahead.
// Remove a hold only if both the support pairs and all contacts replay exactly.
function samePairRoute(expected, actual) {
    return !!actual && actual.length===expected.length && actual.every((p,i)=>
        JSON.stringify(p.grips)===JSON.stringify(expected[i].grips) &&
        JSON.stringify(p.anchor)===JSON.stringify(expected[i].anchor));
}
function pruneUnusedHolds() {
    const before=holds.length;
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    let removed;
    do {
        removed=false;
        for(const h of [...holds]) {
            if(h.type!=='normal' || used.has(h.id))continue;
            const previous=holds;
            holds=holds.filter(p=>p!==h);
            const played=replayRoute(route);
            if(samePairRoute(route,played)) {route=played;removed=true;}
            else holds=previous;
        }
        // A later removal can make a formerly necessary selector hold removable.
        // Every successful iteration strictly reduces the finite hold set.
    } while(removed);
    if(!samePairRoute(route,replayRoute(route)))throw new Error('Two-support final replay failed');
    densityStats.routeRemoved=before-holds.length;
    densityStats.selectionHoldIds=holds.filter(h=>!used.has(h.id)).map(h=>h.id);
    updateStageDensity();
}

function updateStageDensity() {
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    const windows=[0,HEIGHT-H,...holds.map(h=>clamp(h.y-H,0,HEIGHT-H))];
    densityStats.total=holds.length;
    densityStats.coreCount=holds.filter(h=>used.has(h.id)).length;
    densityStats.branchCount=holds.length-densityStats.coreCount;
    densityStats.peak=Math.max(...windows.map(y=>holds.filter(h=>h.y>=y&&h.y<=y+H).length));
}
