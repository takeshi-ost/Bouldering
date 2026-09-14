"use strict";

const VERIFICATION_STAGES = [
    { name: 'ストレッチ', steps: 2, focus: 1 },
    { name: '近接経由', steps: 3, focus: 2 },
    { name: '最下部足場の強制選択', steps: 3, focus: 2 },
    { name: 'ぎりぎり届かない偽コース', steps: 3, focus: 1 },
    { name: '逆方向への移動', steps: 5, focus: 1 },
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

function verificationDensity() {
    const windows = [0, HEIGHT - H, ...holds.map(h => clamp(h.y - H, 0, HEIGHT - H))];
    const peak = Math.max(...windows.map(y => holds.filter(h => h.y >= y && h.y <= y + H).length));
    densityStats = { ...densityStats, total: holds.length, peak, target: peak,
        converged: true, iterations: 0, branchCount: holds.filter(h => h.type === 'decoy').length };
}

function preparePatternVerificationStage(n) {
    const definition = VERIFICATION_STAGES[n - 1];
    if (!definition) throw new RangeError('Verification stages are 1–5');
    let extras = [];
    let points;
    {
        if (n <= 4) {
            ({holds, route, HEIGHT, initialGrips, densityStats} = generateBackwardStage(definition.steps));
            if (n === 3) holds.find(h => h.id === 5).y = 462;
            if (n === 4) {
                holds.filter(h => h.id <= 7).forEach(h => h.x += 40);
                route.slice(1).forEach(p => { p.x += 40; });
                const core = replayRoute(route);
                if (!core) throw new Error('False-course core cannot be replayed');
                route = core;
                const branchHold = {id:12,x:332,y:482,type:'decoy',row:null};
                holds.push(branchHold);
                const entry = inspectSwipe(route[0], {x:240,y:550});
                if (!entry || entry.cancelled || !entry.pose.some(h => h?.id === branchHold.id))
                    throw new Error('False-course entry failed');
                const root = limbRoot(entry.result, 1);
                const length = LIMB_LENGTHS[1] + 3;
                const connector = {id:13,x:root.x + length * Math.cos(-Math.PI/6),
                    y:root.y - length * Math.sin(Math.PI/6),type:'decoy',row:null};
                holds.push(connector);
                falseBranch = {step:0,end:entry.result,holdIds:[branchHold.id],nearMiss:connector.id};
                if (relaxedGoalPossible(entry.result, definition.steps - 1))
                    throw new Error('False course may still reach the goal');
                extras = [entry.result, connector];
                points = [route[0], route[1]];
                densityStats = {...densityStats,falseCourse:{branchHoldId:12,connectorId:13,overreach:3}};
            } else {
                points = n === 1 ? route.slice(0, 2) : route.slice(1, 3);
            }
        } else {
            const positions = [[300,80],[50,630],[200,650],[30,680],[190,690],
                [24,635],[55,635],[70,640],[90,400],[190,400],
                [230,260],[330,260],[250,400],[300,380],
                [250,160],[350,200],[260,250],[340,250],[250,360]];
            holds = positions.map(([x,y],id) => ({id,x,y,type:id===0?'goal':id<=4?'start':'normal',row:null}));
            initialGrips = [holds[1],holds[2],holds[3],holds[4]];
            HEIGHT = H;
            route = [{x:140,y:600,grips:[1,2,3,4]},{x:50,y:620},{x:120,y:520},
                {x:200,y:377.5},{x:300,y:240},{x:300,y:200}];
            densityStats = {target:0,total:holds.length,peak:0,iterations:0,converged:true,
                routeRemoved:0,branchCount:0,coreCount:holds.length};
            points = route.slice(0, 2);
        }
        const played = replayRoute(route);
        if (!played || played.length !== route.length) throw new Error('Verification route failed: ' + n);
        route = played;
        const intentional = new Set(n === 4 ? [12, 13] : []);
        const coreIds = new Set([...initialGrips.map(h => h.id), ...route.flatMap(p => p.grips || [])]);
        const before = holds.length;
        holds = holds.filter(h => coreIds.has(h.id) || intentional.has(h.id));
        const idMap = new Map(holds.map((h,i) => [h.id,i]));
        holds.forEach((h,i) => { h.id = i; });
        route.forEach(p => { p.grips = p.grips.map(id => idMap.get(id)); });
        if (falseBranch) {
            falseBranch.end.grips = falseBranch.end.grips.map(id => idMap.get(id));
            falseBranch.holdIds = falseBranch.holdIds.map(id => idMap.get(id));
            falseBranch.nearMiss = idMap.get(falseBranch.nearMiss);
            densityStats.falseCourse = {...densityStats.falseCourse,
                branchHoldId:idMap.get(12),connectorId:idMap.get(13)};
        }
        const checked = replayRoute(route);
        if (!checked || checked.length !== route.length ||
            checked.some((p,i) => JSON.stringify(p.grips) !== JSON.stringify(route[i].grips)))
            throw new Error('Verification hold pruning changed the route: ' + n);
        route = checked;
        const proof = certifySupportSequence(holds, route[0].grips, HEIGHT);
        if (proof.minimum !== definition.steps || (n <= 4 && !proof.certified))
            throw new Error('Verification support certificate failed: ' + n);
        densityStats = {...densityStats,routeRemoved:before-holds.length,coreCount:coreIds.size,
            supportCertificate:proof};
        verificationDensity();
        points = n === 4 ? [route[0], route[1], falseBranch.end] :
            n === 1 || n === 5 ? route.slice(0, 2) : route.slice(1, 3);
    }
    return verificationArea(definition.focus, definition.name, points, extras);
}
