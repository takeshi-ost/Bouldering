"use strict";
// A straight swipe, including the fixed-limb clamp and release/rollback result.
// Pure with respect to gameplay state; does not focus buttons or update the UI.
function inspectSwipe(from, target) {
    const saved={committed,startGrips};
    try {
        committed=from;
        startGrips=from.grips.map(id=>holds.find(h=>h.id===id));
        if (!startGrips.every(Boolean) || distance(from,target)<INPUT_CONFIG.dragThreshold) return null;
        const anchor=selectAnchor(target.x-from.x,target.y-from.y);
        let p={x:clamp(target.x,25,W-25),y:clamp(target.y,80,HEIGHT-40)};
        if (!supportsReachable(p,anchor)) {
            let low=0,high=1;
            for(let k=0;k<INPUT_CONFIG.reachSearchSteps;k++) {
                const t=(low+high)/2, q={x:from.x+(p.x-from.x)*t,y:from.y+(p.y-from.y)*t};
                if(supportsReachable(q,anchor))low=t;else high=t;
            }
            p={x:from.x+(p.x-from.x)*low,y:from.y+(p.y-from.y)*low};
        }
        const pose=attachMoving(p,anchor);
        const cancelled=!pose || pose.some(h=>!h) || sameContacts(pose,startGrips);
        return {position:p,pose,anchor,cancelled,cost:cancelled?0:1,
            result:cancelled?from:{...p,anchor,grips:pose.map(h=>h.id)},
            won:!cancelled && bothHandsOnGoal(pose)};
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}

// Conservative reachability certificate. Each cell over-approximates all torso
// positions in its rectangle. Ignore assignment costs, ordering and exclusivity;
// unioning contacts loses correlations and permits MORE moves than the game.
// Therefore false proves impossibility; true means unknown, not a solution.
function relaxedGoalPossible(from, budget) {
    const goal=holds.find(h=>h.type==='goal');
    if(from.grips[0]===goal.id && from.grips[1]===goal.id)return true;
    let reachable=from.grips.map(id=>new Set([id]));
    const cells=[];
    for(let x=25;x<W-25;x+=20) for(let y=80;y<HEIGHT-40;y+=20) {
        const lists=[0,1,2,3].map(i=>holds.filter(h=>{
            const root=limbRoot({x,y},i), xmax=Math.min(x+20,W-25)-x, ymax=Math.min(y+20,HEIGHT-40)-y;
            return Math.hypot(h.x-clamp(h.x,root.x,root.x+xmax),h.y-clamp(h.y,root.y,root.y+ymax))<=LIMB_LENGTHS[i]+1e-7;
        }).map(h=>h.id));
        if(lists.every(a=>a.length))cells.push(lists);
    }
    for(let depth=0;depth<budget;depth++) {
        const next=reachable.map(s=>new Set(s));
        for(const lists of cells) {
            if(!lists.some((ids,i)=>ids.some(id=>reachable[i].has(id))))continue;
            if(lists[0].includes(goal.id)&&lists[1].includes(goal.id)) {
                const feet=[2,3].map(i=>lists[i].filter(id=>id!==goal.id && holds.find(h=>h.id===id).y>=goal.y));
                const handFixed=reachable[0].has(goal.id)||reachable[1].has(goal.id);
                if(feet[0].some(a=>feet[1].some(b=>a!==b &&
                    (handFixed || reachable[2].has(a) || reachable[3].has(b)))))return true;
            }
            lists.forEach((ids,i)=>ids.forEach(id=>next[i].add(id)));
        }
        reachable=next;
    }
    return false;
}
// Search with the same support selection and grip assignment used during play.
// Temporary state is restored before returning to the caller.
function solveRoute(guide, maxMoves = 40) {
    const saved = { committed, startGrips };
    const needsTraverse = level !== 1 && courseMode !== 'verification';
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
            if (won) return level===1 || courseMode==='verification' ||
                result.slice(1).some((q,j)=>isTraverse(result[j],q)) ? result : null;
        }
        return null;
    } finally { committed = saved.committed; startGrips = saved.startGrips; moveCount=saved.moveCount; }
}

// Conservative contact graph: every legal committed pose and transition is
// included. Reach/selection correlations are relaxed, never used to exclude a
// possible solution. A unique shortest support word here also holds in play
// when an actual swipe replay attains that lower bound.
function certifySupportSequence(points, initial, height) {
    const count=points.length, poses=[], groups=Array.from({length:count*4},()=>[]);
    const disks=limbs.map((_,i)=>points.map(h=>{const root=limbRoot({x:0,y:0},i);
        return {x:h.x-root.x,y:h.y-root.y,r:LIMB_LENGTHS[i]+1e-5};}));
    function possible(ids) {
        let left=25,right=W-25,top=80,bottom=height-40;
        for(let i=0;i<ids.length;i++) {
            const a=disks[i][ids[i]];
            left=Math.max(left,a.x-a.r);right=Math.min(right,a.x+a.r);
            top=Math.max(top,a.y-a.r);bottom=Math.min(bottom,a.y+a.r);
            for(let j=0;j<i;j++) {const b=disks[j][ids[j]];if(distance(a,b)>a.r+b.r)return false;}
        }
        return left<=right && top<=bottom;
    }
    function enumerate(ids) {
        const i=ids.length;
        if(i===4) {const index=poses.length;poses.push(ids);ids.forEach((id,k)=>groups[id*4+k].push(index));return;}
        for(let id=0;id<count;id++) {
            if(ids.some((other,j)=>other===id && !(i===1 && j===0 && points[id].type==='goal')))continue;
            if(i>=2 && ids.slice(0,2).some(h=>points[id].y<points[h].y))continue;
            const next=[...ids,id];if(possible(next))enumerate(next);
        }
    }
    enumerate([]);
    const start=poses.findIndex(ids=>ids.every((id,i)=>id===initial[i]));
    const goals=poses.flatMap((ids,i)=>points[ids[0]].type==='goal' && ids[0]===ids[1]?[i]:[]);
    if(start<0 || !goals.length)return {certified:false,reason:'no-pose',states:poses.length};
    function distances(seeds) {
        const d=Array(poses.length).fill(Infinity), used=new Set(), queue=[...seeds];
        seeds.forEach(i=>d[i]=0);
        for(let q=0;q<queue.length;q++) {const at=queue[q];
            poses[at].forEach((id,i)=>{const key=id*4+i;if(used.has(key))return;used.add(key);
                for(const next of groups[key])if(d[next]===Infinity){d[next]=d[at]+1;queue.push(next);}
            });
        }
        return d;
    }
    const from=distances([start]), to=distances(goals), minimum=to[start];
    if(!Number.isFinite(minimum))return {certified:false,reason:'disconnected',states:poses.length};
    const choices=Array.from({length:minimum},()=>new Set());
    groups.forEach((members,key)=>{
        let a=Infinity,b=Infinity;for(const i of members){a=Math.min(a,from[i]);b=Math.min(b,to[i]);}
        if(a+1+b===minimum)choices[a].add(Math.floor(key/4));
    });
    return {certified:minimum>0 && choices.every(s=>s.size===1),minimum,
        supports:choices.map(s=>[...s]),states:poses.length,method:'conservative-contact-graph'};
}

// A lower bound alone is insufficient: require a normal-input witness with
// exactly that many moves and the certified support word. Never impose it on
// attachment or release; wrong moves remain legal and consume normal stamina.
function prepareVerificationStage() {
    const proof=certifySupportSequence(holds,route[0].grips,HEIGHT);
    const played=replayRoute(route);
    if(!proof.certified || !played || played.length-1!==proof.minimum ||
        !played.slice(1).every((p,i)=>played[i].grips[p.anchor]===proof.supports[i][0]))
        throw new Error('Verification course failed its support certificate or normal-rule replay');
    route=played;
    densityStats.supportCertificate=proof;
}
