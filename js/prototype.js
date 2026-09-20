"use strict";
// Share only the initial guide. No wall filling or density convergence is used.
function preparePrototypeStage() {
    ({ holds, route, HEIGHT, initialGrips } = stageGenerator.generate(level, true));
    const guide = route.map(p => ({ x: p.x, y: p.y }));
    // Supply natural hand/foot contacts along the guide, including between turns.
    let nextId = holds.length;
    for (let step = 1; step < guide.length; step++) {
        const a = guide[step - 1], b = guide[step];
        const count = Math.max(1, Math.ceil(distance(a, b) / 40));
        for (let sample = 1; sample <= count; sample++) {
            const p = { x: a.x + (b.x - a.x) * sample / count,
                y: a.y + (b.y - a.y) * sample / count };
            for (const limb of limbs) {
                const h = { x: clamp(p.x + limb.x, 24, W - 24),
                    y: clamp(p.y + limb.y, 28, HEIGHT - 28) };
                if (holds.every(other => distance(other, h) >= 24))
                    holds.push({ ...h, id: nextId++, type: 'normal', row: null });
            }
        }
    }
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
