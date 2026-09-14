"use strict";
// Local, deterministic search. The ordinary generator remains the fallback.
function poseWidths(p) {
    const h = p.grips.map(id => holds.find(h => h.id === id));
    return [distance(h[0], h[1]), distance(h[2], h[3]),
        (h[2].y + h[3].y - h[0].y - h[1].y) / 2];
}
function compressionAt(path, i) {
    const a = poseWidths(path[i-1]), b = poseWidths(path[i]), c = poseWidths(path[i+1]);
    return Math.max(...b.map((v,k) => Math.min(a[k],c[k]) - v));
}
function challengeTransfer(from, to, fixed = null) {
    if (to.x<25 || to.x>W-25 || to.y<80 || to.y>HEIGHT-40 || distance(from,to)<5) return null;
    committed = from;
    startGrips = from.grips.map(id => holds.find(h => h.id === id));
    const anchor = fixed ?? selectAnchor(to.x-from.x,to.y-from.y);
    if (!limbReachable(to,startGrips[anchor],anchor)) return null;
    const pose = attachMoving(to,anchor);
    return pose?.every(Boolean) && !sameContacts(pose,startGrips) ? pose : null;
}
function challengeKey(path, i) {
    const from=path[i], to=path[i+1];
    const goal=holds.find(h=>h.type==='goal');
    const stance=from.grips.map(id=>holds.find(h=>h.id===id));
    committed=from; startGrips=stance;
    const limb=selectAnchor(to.x-from.x,to.y-from.y);
    const distances=stance.map(h=>distance(h,goal));
    const closest=Math.min(...distances);
    // Require a visible difference, not a floating-point tie.
    if (distances[limb]-closest<8) return null;
    if (!challengeTransfer(from,to)) return null;
    const nearest=distances.map((d,k)=>d<=closest+1e-7?k:-1).filter(k=>k>=0);
    let stable=0;
    for (const dx of [-10,0,10]) for (const dy of [-10,0,10]) {
        const p={x:to.x+dx,y:to.y+dy};
        // Counterfactual fixed supports are used only for analysis, not gameplay.
        if (nearest.some(k=>challengeTransfer(from,p,k))) return null;
        committed=from; startGrips=stance;
        if (selectAnchor(p.x-from.x,p.y-from.y)===limb && challengeTransfer(from,p)) stable++;
    }
    return stable>=6 ? {limb,holdId:stance[limb].id,nearest,goalDistanceGap:distances[limb]-closest,exitStable:stable} : null;
}
function challengeQuality(path, i) {
    const shrink = compressionAt(path,i);
    if (path[i].anchor === path[i+1].anchor) return null;
    const saved = {committed,startGrips};
    try {
        const key=challengeKey(path,i);
        if (!key) return null;
        // Check multiple exit positions, not just the exact recorded endpoint.
        for (const dx of [-10,0,10]) for (const dy of [-10,0,10]) {
            if (challengeTransfer(path[i-1],{x:path[i+1].x+dx,y:path[i+1].y+dy})) return null;
        }
        let stable = 0;
        for (const dx of [-5,0,5]) for (const dy of [-5,0,5]) {
            const p = {x:path[i].x+dx,y:path[i].y+dy};
            if (p.x<25 || p.x>W-25 || p.y<80 || p.y>HEIGHT-40) continue;
            const stance = challengeTransfer(path[i-1],p);
            if (!stance) continue;
            const mid = {...p,grips:stance.map(h=>h.id)};
            if (challengeTransfer(mid,path[i+1])) stable++;
        }
        if (stable < 6) return null;
        // Compare two-move alternatives which omit the key limb/hold pair.
        // Bounded local search, not a proof over the continuous state space.
        for (const dx of [-40,-20,0,20,40]) for (const dy of [-40,-20,0,20,40]) {
            const p={x:path[i].x+dx,y:path[i].y+dy};
            if (p.x<25 || p.x>W-25 || p.y<80 || p.y>HEIGHT-40) continue;
            const stance=challengeTransfer(path[i-1],p);
            if (!stance) continue;
            const mid={...p,grips:stance.map(h=>h.id)};
            const exit=challengeTransfer(mid,path[i+1]);
            if (exit && (mid.grips[key.limb]!==key.holdId || selectAnchor(path[i+1].x-mid.x,path[i+1].y-mid.y)!==key.limb)) return null;

        }
        return {step:i,shrink,stable,key,score:shrink+stable*2+Math.min(key.goalDistanceGap,60)};
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
function prepareChallengeStage() {
    const originalHolds = holds, originalRoute = route;
    const turns = [];
    for (let i=2;i<route.length-1;i++) {
        turns.push(i);
    }
    const random = mulberry32(level+71003);
    let best = null;
    for (const i of turns) {
        holds=originalHolds;
        for (let attempt=0;attempt<100;attempt++) {
            holds = originalHolds.map(h=>h.type==='normal'?{...h}:h);
            const selected = originalRoute[i].grips;
            const pair = attempt%2===0 ? selected.slice(0,2) : selected.slice(2,4);
            const a=holds.find(h=>h.id===pair[0]), b=holds.find(h=>h.id===pair[1]);
            const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
            for (const h of [a,b]) {
                if (h.type!=='normal') continue;
                const scale=.65+random()*.3;
                h.x=clamp(center.x+(h.x-center.x)*scale+(random()-.5)*12,24,W-24);
                h.y=center.y+(h.y-center.y)*scale+(random()-.5)*12;
            }
            if (holds.some(h=>holds.some(p=>p.id!==h.id && distance(h,p)<18))) continue;
            const candidate=originalRoute.map(p=>({...p}));
            if (attempt>=40) {
                candidate[i].x=clamp(candidate[i].x+(random()-.5)*60,25,W-25);
                candidate[i].y=clamp(candidate[i].y+(random()-.5)*60,80,HEIGHT-40);
            }
            let replay=replayRoute(candidate);
            if (!replay || replay.length!==originalRoute.length) continue;
            const used=new Set([...initialGrips.map(h=>h.id),...replay.flatMap(p=>p.grips||[])]);
            holds=holds.filter(h=>used.has(h.id));
            replay=replayRoute(replay);
            if (!replay || replay.length!==originalRoute.length) continue;
            const quality=challengeQuality(replay,i);
            if (quality && (!best || quality.score>best.quality.score)) best={holds,route:replay,quality};
        }
    }
    holds=best?.holds || originalHolds;
    route=best?.route || originalRoute;
    densityStats.challenge=best ? best.quality : null;
    densityStats.routeRemoved += originalHolds.length-holds.length;
    densityStats.total=holds.length;
    if (best) {densityStats.coreCount=holds.length; densityStats.branchCount=0;}
    // Positions changed, so refresh the visible-window count.
    const windows=[0,HEIGHT-H,...holds.map(h=>clamp(h.y-H,0,HEIGHT-H))];
    densityStats.peak=Math.max(...windows.map(y=>holds.filter(h=>h.y>=y&&h.y<=y+H).length));
}

// Separate pipeline: the old single-support difficulty mutations are not used.
function preparePairChallengeStage() {
    generate(level);
    preparePlayableStage();
    densityStats.fixedSupports=2;
}
