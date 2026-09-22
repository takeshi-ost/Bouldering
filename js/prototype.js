"use strict";
// Share only the initial guide. No wall filling or density convergence is used.
function preparePrototypeStage() {
    ({ holds, route, HEIGHT, initialGrips } = stageGenerator.generate(level, true));
    const guide = route.map(p => ({ x: p.x, y: p.y }));
    // A separate seeded stream keeps retries identical and leaves the shared guide alone.
    const random = mulberry32(level ^ 0x51A7C0DE);
    const jitter = (value, radius, low, high) => {
        const center = clamp(value, low, high);
        const from = Math.max(low, center - radius);
        const to = Math.min(high, center + radius);
        // Sample inside the bounds instead of clamping afterwards: no rows at the edge.
        return from + random() * (to - from);
    };
    // The original guide contacts also form straight columns; vary only normal holds.
    // The three starting holds and the goal keep their original coordinates.
    const normalBottom = initialGrips[2].y - 24;
    for (const hold of holds) {
        if (hold.type !== 'normal') continue;
        hold.x = jitter(hold.x, 14, 24, W - 24);
        hold.y = jitter(hold.y, 16, 28, normalBottom);
    }
    let nextId = Math.max(...holds.map(h=>h.id)) + 1;
    for (let step = 1; step < guide.length; step++) {
        const a = guide[step - 1], b = guide[step];
        const length = distance(a, b);
        let travelled = 0;
        while (travelled < length) {
            travelled = Math.min(length, travelled + 28 + random() * 28);
            const t = travelled / length;
            const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            for (const limb of limbs) {
                const h = { x: jitter(p.x + limb.x, 16, 24, W - 24),
                    y: jitter(p.y + limb.y, 18, 28, normalBottom) };
                if (holds.every(other => distance(other, h) >= 24))
                    holds.push({ ...h, id: nextId++, type: 'normal', row: null });
            }
        }
    }
    assignWideHolds(guide);
    const candidateCount = holds.length;
    route = solveRoute(guide);
    if (!route) throw new Error('Prototype route search failed for level ' + level);

    // Keep the body path, but allow different supports/contacts after each removal.
    // A hold is necessary only if removing it prevents this entire path replaying.
    let removed;
    do {
        removed = false;
        for (const hold of [...holds]) {
            if (hold.type !== 'normal') continue;
            const previous = holds;
            holds = holds.filter(h => h !== hold);
            const played = replayRoute(route);
            if (played && played.length === route.length) {
                route = played;
                removed = true;
            } else holds = previous;
        }
    } while (removed);
    densityStats = { prototype: true, candidateCount, target: 0, iterations: 0,
        converged: true, routeRemoved: candidateCount - holds.length, fixedSupports: 2 };
    const used = new Set([...initialGrips.map(h => h.id), ...route.flatMap(p => p.grips || [])]);
    densityStats.selectionHoldIds = holds.filter(h => !used.has(h.id)).map(h => h.id);
    updateStageDensity();
}
