"use strict";

const VERIFICATION_STAGES = [
    { base: 7, name: '遠方の軸ホールド', step: 6 },
    { base: 8, name: '低位置の単一足場', step: 10 },
    { base: 14, name: '近接ホールドの高さ選択', step: 9 },
    { base: 5, name: '毒の足場', step: 9 },
    { base: 2, name: '魅惑のデッドエンド', step: 2 },
    { base: 2, name: '視覚的孤立ホールド', step: 1 },
];

function verificationArea(step, name, points, extras = []) {
    const ids = new Set(points.flatMap(p => p.grips || []));
    const sites = [...points, ...extras, ...holds.filter(h => ids.has(h.id))];
    const left = clamp(Math.min(...sites.map(p => p.x)) - 22, 12, W - 25);
    const right = clamp(Math.max(...sites.map(p => p.x)) + 22, left + 10, W - 12);
    const top = clamp(Math.min(...sites.map(p => p.y)) - 22, 12, HEIGHT - 25);
    const bottom = clamp(Math.max(...sites.map(p => p.y)) + 22, top + 10, HEIGHT - 12);
    return { x: left, y: top, width: right - left, height: bottom - top, name, step };
}

function extendVerificationDeadEnd() {
    const first = falseBranch.end, original = holds;
    const id = Math.max(...holds.map(h => h.id)) + 1;
    for (const rise of [40, 60, 80, 100]) for (const dx of [-30, -15, 0, 15, 30]) {
        const target = {x: first.x + dx, y: first.y - rise};
        if (target.x < 25 || target.x > W - 25 || target.y < 80) continue;
        for (const hand of [0, 1]) for (const offset of [-30, -15, 0, 15, 30]) {
            const h = {id, x: target.x + limbs[hand].x + offset, y: target.y + limbs[hand].y, type: 'normal', row: null};
            if (h.x < 24 || h.x > W - 24 || h.y < 28 || original.some(p => distance(p,h) < 30)) continue;
            holds = [...original, h];
            const replay = replayRoute(route);
            if (!replay || replay.length !== route.length || replay.some((p,i) => JSON.stringify(p.grips) !== JSON.stringify(route[i].grips))) continue;
            const entry = inspectSwipe(first, target);
            if (!entry || entry.cancelled || !entry.pose.every(Boolean) || !entry.pose.some(p => p.id === id)) continue;
            if (route.slice(falseBranch.step + 2).some(p => { const jump = inspectSwipe(entry.result,p); return jump && !jump.cancelled && jump.pose.every(Boolean); })) continue;
            falseBranch.second = entry.result;
            falseBranch.holdIds.push(id);
            densityStats.total = holds.length;
            return;
        }
    }
    holds = original;
    throw new Error('Two-step dead end could not be generated');
}

function refreshVerificationDensity() {
    const windows = [0, HEIGHT - H, ...holds.map(h => clamp(h.y - H, 0, HEIGHT - H))];
    const peak = Math.max(...windows.map(y => holds.filter(h => h.y >= y && h.y <= y + H).length));
    densityStats = {...densityStats, total: holds.length, peak, converged: peak <= densityStats.target};
}

function removeVerificationNoise(n) {
    const routeIds = new Set([...initialGrips.map(h => h.id), ...route.flatMap(p => p.grips || [])]);
    const intentional = new Set();
    if (n === 3) intentional.add(holds.find(h => h.y === 172).id);
    if (n === 4) intentional.add(densityStats.poison.id);
    if (n === 5) {
        falseBranch.holdIds.forEach(id => intentional.add(id));
        [falseBranch.end, falseBranch.second].forEach(p => p.grips.forEach(id => intentional.add(id)));
    }
    const before = holds.length;
    holds = holds.filter(h => routeIds.has(h.id) || intentional.has(h.id));
    const played = replayRoute(route);
    if (!played || played.length !== route.length ||
        played.some((p,i) => JSON.stringify(p.grips) !== JSON.stringify(route[i].grips)))
        throw new Error('Noise removal changed the verified route');
    densityStats = {...densityStats,routeRemoved:densityStats.routeRemoved + before - holds.length,
        branchCount:holds.filter(h => !routeIds.has(h.id)).length,coreCount:routeIds.size};
}

function preparePatternVerificationStage(n) {
    const definition = VERIFICATION_STAGES[n - 1];
    if (!definition) throw new RangeError('Verification stages are 1–6');
    const displayLevel = level;
    try {
        level = definition.base;
        generate(definition.base);
        preparePlayableStage();
        if (n === 2) {
            holds.find(h => h.id === 31).x = 160;
            holds.find(h => h.id === 36).x = 150;
            holds.find(h => h.id === 37).y = 240;
            holds.find(h => h.id === 37).x = 350;
            const source = route[9], goal = route[11];
            let played = null;
            search: for (const dy of [30, 20, 40, 50, 60]) for (const dx of [40, 50, 60, 70, 80, 90, 100]) {
                const crouch = {x: source.x + dx, y: source.y + dy};
                const candidate = replayRoute([...route.slice(0, 10), crouch, goal]);
                if (!candidate || candidate.length !== route.length ||
                    candidate[11].grips[0] !== candidate[11].grips[1] ||
                    inspectSwipe(candidate[9], goal)?.won) continue;
                played = candidate;
                break search;
            }
            if (!played) throw new Error('Crouch-and-reach route failed');
            route = played;
            densityStats = {...densityStats,crouch:{step:10,lowFootId:36}};
        }
        if (n === 3) {
            holds.find(h => h.id === 26).y = 158;
            holds.find(h => h.id === 30).y = 166;
            holds.find(h => h.id === 38).x = 350;
            holds.find(h => h.id === 37).x = 80;
            holds = holds.filter(h => h.id !== 31);
            const decoy = {id: Math.max(...holds.map(h => h.id)) + 1, x: 190, y: 172, type: 'normal', row: null};
            holds.push(decoy);
            const played = replayRoute(route);
            if (!played || played.length !== route.length) throw new Error('Height-choice route failed');
            route = played;
            densityStats = {...densityStats,total:holds.length};
        }
        if (n === 4) {
            const poison = {id: Math.max(...holds.map(h => h.id)) + 1, x: 270, y: 150, type: 'normal', row: null};
            holds.push(poison);
            const played = replayRoute(route);
            if (!played || played.length !== route.length) throw new Error('Poison-foot solution changed');
            route = played;
            const from = route[9], to = route[10];
            const entry = inspectSwipe(from, {x: from.x - 20, y: from.y - 40});
            const blocked = entry && !entry.cancelled && entry.pose[3] === poison && inspectSwipe(entry.result, to)?.cancelled;
            if (!blocked) throw new Error('Poison foot is not a verified trap');
            densityStats = {...densityStats,total:holds.length,poison:{id:poison.id,entry:entry.result}};
        }
        if (n === 5) {
            const used = new Set([...initialGrips.map(h => h.id), ...route.flatMap(p => p.grips || [])]);
            holds = holds.filter(h => used.has(h.id));
            densityStats = {...densityStats,total:holds.length,branchCount:0};
            preparePuzzlePatterns();
            if (!falseBranch) throw new Error('Dead-end branch could not be generated');
            extendVerificationDeadEnd();
            densityStats = {...densityStats,deadEnd:{...falseBranch}};
        }
        if (n === 6) {
            const oldCount = holds.length;
            const retained = route.slice(2);
            const used = new Set(retained.flatMap(p => p.grips || []));
            holds = holds.filter(h => used.has(h.id));
            initialGrips = retained[0].grips.map(id => holds.find(h => h.id === id));
            if (!initialGrips.every(Boolean)) throw new Error('Missing isolated-hold starting contact');
            initialGrips.slice(0, 2).sort((a,b) => a.x - b.x).forEach((h,i) => initialGrips[i] = h);
            retained[0] = {...retained[0],grips:initialGrips.map(h => h.id)};
            initialGrips.forEach(h => { if (h.type !== 'goal') h.type = 'start'; });
            const played = replayRoute(retained);
            if (!played || played.length !== retained.length ||
                !isTraverse(played[0], played[1])) throw new Error('Isolated-hold route failed');
            route = played;
            densityStats = {...densityStats,total:holds.length,routeRemoved:densityStats.routeRemoved+oldCount-holds.length};
        }
    } finally {
        level = displayLevel;
    }
    removeVerificationNoise(n);
    refreshVerificationDensity();
    const step = n === 5 ? falseBranch.step : definition.step;
    const points = n === 5 ? [route[step], falseBranch.end, falseBranch.second]
        : n === 3 ? [route[9]]
        : n === 2 ? route.slice(9, 12)
        : route.slice(step - 1, step + 1);
    const extras = n === 3 ? [holds.find(h => h.y === 172)]
        : n === 4 ? [holds.find(h => h.id === densityStats.poison.id)] : [];
    return verificationArea(step, definition.name, points, extras);
}
