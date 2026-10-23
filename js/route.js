"use strict";
// Search, replay and pruning share live reach checks, including mid-body foot height and straight raised legs.
function solveRoute(guide, maxMoves = 40) {
    if(holds.some(h=>h.type==='hazard'))return solveCostRoute(guide,maxMoves);
    const saved = { committed, startGrips };
    const needsTraverse = level !== 1;
    const start = { ...guide[0] };
    const first = [...initialGrips];
    for (const pair of [[0, 1], [2, 3]]) {
        const sorted = pair.map(i => first[i]).sort((a, b) => a.x - b.x);
        pair.forEach((i, j) => first[i] = sorted[j]);
    }
    if (!first.every((h, i) => h && limbReachable(start, h, i))) return null;
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
                    if (p.x < STAGE_SAFE_WIDTH + TORSO.width/2 || p.x > W - STAGE_SAFE_WIDTH - TORSO.width/2 || p.y < 80 || p.y > HEIGHT - 40 || distance(p, node.p) < 5) continue;
                    const anchor = selectAnchor(p.x - node.p.x, p.y - node.p.y);
                    if (!supportsReachable(p,anchor) || supportMotionFraction(node.p,p,anchor)<1-1e-9) continue;
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
        if (!stance.every((h, i) => h && limbReachable(path[0], h, i))) return null;
        const result = [path[0]];
        for (let i = 1; i < path.length; i++) {
            committed = path[i - 1]; startGrips = stance;
            const p = path[i], anchor = selectAnchor(p.x - committed.x, p.y - committed.y);
            if (!supportsReachable(p,anchor) || supportMotionFraction(committed,p,anchor)<1-1e-9) return null;
            stance = attachMoving(p, anchor);
            if (!stance) return null;
            const won = bothHandsOnGoal(stance) && stance.every(Boolean);
            if (!won && (!stance.every(Boolean) || (sameContacts(stance, startGrips) && !newHazardContacts(stance,startGrips).size))) return null;
            result.push({ ...p, anchor, grips: stance.map(h => h?.id ?? null) });
            if (won) return level===1 ||
                result.slice(1).some((q,j)=>isTraverse(result[j],q)) ? result : null;
        }
        return null;
    } finally { committed = saved.committed; startGrips = saved.startGrips; moveCount=saved.moveCount; }
}

// Re-search the finished hold layout by bypassing intermediate body positions.
// Every accepted shortcut replays its suffix with the live selector/snapping rules;
// a changed contact is allowed only when the rest still reaches the goal.
function optimizeRoute(path, config = ROUTE_OPTIMIZATION_CONFIG) {
    const saved = { committed, startGrips };
    const byId = new Map(holds.map(h => [h.id, h]));
    const first = [...initialGrips];
    for (const pair of [[0,1],[2,3]]) {
        const sorted = pair.map(i => first[i]).sort((a,b) => a.x-b.x);
        pair.forEach((i,j) => first[i] = sorted[j]);
    }
    let best = path, bestCost=routeConsumption(path), transitions = 0;
    const began = performance.now();
    const maxSpan = Math.max(...LIMB_LENGTHS)*2;
    const hasTraverse = candidate => level === 1 || candidate.slice(1).some((p,i) => isTraverse(candidate[i],p));
    const attempt = (from, to) => {
        if (transitions >= config.maxTransitions) return null;
        transitions++;
        if (distance(from,to)<5) return null;
        const anchor = selectAnchor(to.x-from.x,to.y-from.y);
        if (supportMotionFraction(from,to,anchor) < 1-1e-9) return null;
        const stance = attachMoving(to,anchor);
        if (!stance?.every(Boolean) || (!bothHandsOnGoal(stance) && sameContacts(stance,startGrips) && !newHazardContacts(stance,startGrips).size)) return null;
        return { ...to, anchor, grips: stance.map(h => h.id) };
    };
    try {
        for (let pass = 0; pass < config.passes && transitions < config.maxTransitions; pass++) {
            const before = best;
            for (let i = 0; i < best.length-2 && transitions < config.maxTransitions; i++) {
                for (let j = best.length-1; j > i+1 && transitions < config.maxTransitions; j--) {
                    // A fixed limb cannot span more than twice its full length.
                    if (distance(best[i],best[j]) > maxSpan) continue;
                    // Nearby body positions explore other support pairs/contacts,
                    // instead of only following the original guide's endpoints.
                    const q = best[j];
                    const targets = [q, {x:q.x-24,y:q.y}, {x:q.x+24,y:q.y},
                        {x:q.x,y:q.y+24}, {x:q.x,y:q.y-24}];
                    let improved = false;
                    for (const target of targets) {
                        if (target.x<STAGE_SAFE_WIDTH+TORSO.width/2 || target.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || target.y<80 || target.y>HEIGHT-40) continue;
                        const candidate = best.slice(0,i+1);
                        committed = best[i];
                        startGrips = i ? best[i].grips.map(id => byId.get(id)) : first;
                        let complete = false;
                        for (let k = j; k < best.length; k++) {
                            const step = attempt(committed,k===j ? target : best[k]);
                            if (!step) break;
                            candidate.push(step);
                            committed = step;
                            startGrips = step.grips.map(id => byId.get(id));
                            if (bothHandsOnGoal(startGrips)) { complete = true; break; }
                        }
                        const cost=complete?routeConsumption(candidate):Infinity;
                        if (complete && routeResources(candidate).valid && (cost<bestCost || (cost===bestCost && candidate.length<best.length)) && hasTraverse(candidate)) {
                            best = candidate;bestCost=cost;
                            improved = true;
                            break;
                        }
                    }
                    if (improved) break;
                }
            }
            if (best === before) break;
        }
        densityStats.routeOptimization = { before: path.length-1, after: best.length-1,
            costBefore:routeConsumption(path),costAfter:bestCost,
            transitions, limit: config.maxTransitions, elapsedMs: performance.now()-began };
        return best;
    } finally { committed = saved.committed; startGrips = saved.startGrips; }
}


function prepareStage() {
    generate(level);
    assignWideHolds(route);
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
    const reserved=reserveDenseCandidates(route);
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    let removed;
    do {
        removed=false;
        for(const h of [...holds]) {
            if(h.type!=='normal' || used.has(h.id) || reserved.has(h.id))continue;
            const previous=holds;
            holds=holds.filter(p=>p!==h);
            const played=replayRoute(route);
            if(samePairRoute(route,played) && hasHazardFallbackCandidates(played)) {route=played;removed=true;}
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

// Upgrade existing candidates before solving. Separate RNG preserves guide layout.
// Wide holds remain normal holds for density and pruning; removed ones stay removed.
function assignWideHolds(guide) {
    const random = mulberry32(courseSeed() ^ 0x6B1D2F43);
    const available = Math.max(0,3-holds.filter(h=>h.wide).length);
    const count = Math.floor(random() * (available+1));
    const candidates = holds.filter(h => h.type === 'normal').map(h => ({h,key:random()}));
    candidates.sort((a,b)=>a.key-b.key || a.h.id-b.h.id);
    let placed = 0;
    for (const {h} of candidates) {
        if (placed === count) break;
        if (!guide.some(p => [[0,1],[2,3]].some(pair=>pair.every(i=>limbReachable(p,h,i))))) continue;
        h.wide = true;
        placed++;
    }
}

// Keep enough existing alternatives for a valid minimum-ratio fallback.
function hasHazardFallbackCandidates(path) {
    if(DIFFICULTY_RULES[difficulty].hazards!=='dense')return true;
    const used=new Set([...initialGrips.map(h=>h.id),...path.flatMap(p=>p.grips||[])]);
    return holds.filter(h=>h.type==='normal' && !h.wide && !used.has(h.id)).length>=Math.ceil(holds.length*HAZARD_CONFIG.minRatio);
}

// Retain off-route geometry for varied recipes and a verified safe fallback.
// RNG and the retained count are deterministic.
function reserveDenseCandidates(path) {
    if(DIFFICULTY_RULES[difficulty].hazards!=='dense')return new Set();
    const used=new Set([...initialGrips.map(h=>h.id),...path.flatMap(p=>p.grips||[])]);
    const random=mulberry32(courseSeed() ^ 0x2E8CA17B);
    const candidates=holds.filter(h=>h.type==='normal' && !h.wide && !used.has(h.id))
        .map(h=>({h,key:random()})).sort((a,b)=>a.key-b.key || a.h.id-b.h.id);
    const count=HAZARD_CONFIG.reserveCount;
    return new Set(candidates.slice(0,count).map(({h})=>h.id));
}

// Bounded cost-layer beam search on the FINAL hold types. Each edge costs the
// same 1 + new hazard contacts as release(). A move using two hazards costs 3.
function solveCostRoute(guide,maxMoves=40,config=ROUTE_COST_SEARCH_CONFIG,options={}) {
    const saved={committed,startGrips};
    const began=performance.now(),first=[...initialGrips];
    for(const pair of [[0,1],[2,3]]) {
        const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);
        pair.forEach((i,j)=>first[i]=sorted[j]);
    }
    const start={...guide[0]},goal=holds.find(h=>h.type==='goal');
    if(!first.every((h,i)=>h && limbReachable(start,h,i)))return null;
    const pickups=createHearts(level,guide,difficulty);
    const resourcePickups=options.noHearts?[]:pickups;
    const fixedBudget=options.budget??null;
    const targets=[...guide.slice(1),...pickups,{x:goal.x,y:goal.y+70}];
    const progress=p=>{
        let best=Infinity,index=0;
        guide.slice(1).forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});
        return index*100-best;
    };
    const fallback=replayRoute(guide);
    const fallbackResources=fallback?routeResources(fallback,{pickups:resourcePickups,budget:fixedBudget}):null;
    let best=fallbackResources?.valid && (!options.noHazards || !fallbackResources.penalties) &&
        (!options.noHearts || !routeResources(fallback,{pickups}).pickupMask)?fallback:null;
    let bestCost=best?routeConsumption(best):maxMoves+3+pickups.length*HEART_CONFIG.recovery;
    let transitions=0,limitReached=false;
    const buckets=Array.from({length:bestCost+1},()=>[]),visited=new Map();
    buckets[0].push({p:start,stance:first,path:[start],traversed:level===1,score:progress(start),mask:0,net:0,required:1});
    try {
        for(let cost=0;cost<=bestCost && transitions<config.maxTransitions;cost++) {
            // Preserve different pickup states rather than discarding a heart detour.
            const groups=new Map();
            for(const node of buckets[cost]||[]) {
                const group=groups.get(node.mask)||[];group.push(node);groups.set(node.mask,group);
            }
            const beam=[...groups.values()].flatMap(group=>group.sort((a,b)=>b.score-a.score || a.required-b.required).slice(0,config.beamWidth));
            for(const node of beam) {
                if(transitions>=config.maxTransitions)break;
                if(node.path.length-1>=maxMoves)continue;
                committed=node.p;startGrips=node.stance;
                const candidates=[];
                for(const q of targets)if(distance(node.p,q)<=230)
                    for(const t of [.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
                for(const dx of [-60,0,60])for(const dy of [-90,-45,0])
                    candidates.push({x:node.p.x+dx,y:node.p.y+dy});
                for(const p of candidates) {
                    if(transitions>=config.maxTransitions)break;
                    transitions++;
                    if(p.x<STAGE_SAFE_WIDTH+TORSO.width/2 || p.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || p.y<80 || p.y>HEIGHT-40 || distance(p,node.p)<5)continue;
                    const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
                    if(!supportsReachable(p,anchor) || supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
                    const stance=attachMoving(p,anchor);
                    if(!stance?.every(Boolean))continue;
                    const won=bothHandsOnGoal(stance),edge=routeMoveCost(stance,node.stance);
                    if((options.noHazards && edge>1) || (!won && sameContacts(stance,node.stance) && edge===1))continue;
                    const nextCost=cost+edge,moves=node.path.length;
                    if(nextCost>bestCost)continue;
                    const mask=coursePickupMask(pickups,node.mask,node.p,p);
                    if(options.noHearts && mask)continue;
                    const net=node.net+edge-(bitCount(mask)-bitCount(node.mask))*HEART_CONFIG.recovery;
                    const required=Math.max(node.required,node.net+1,net+(won?0:1));
                    if(required>(fixedBudget??maxMoves+3))continue;
                    const traversed=node.traversed || isTraverse(node.p,p),ids=stance.map(h=>h.id);
                    // No idle loops to increase the eventual moves+3 allowance.
                    if(node.path.some((q,i)=>distance(q,p)<5 && (q.pickupMask||0)===mask &&
                        (i?q.grips:first.map(h=>h.id)).every((id,j)=>id===ids[j])))continue;
                    const path=[...node.path,{...p,anchor,grips:ids,pickupMask:mask}];
                    if(won) {
                        if(traversed && required<=(fixedBudget??moves+3) &&
                            (nextCost<bestCost || (nextCost===bestCost && (!best || path.length<best.length)))) {best=path;bestCost=nextCost;}
                        continue;
                    }
                    const key=traversed+':'+Math.round(p.x/8)+','+Math.round(p.y/8)+':'+ids.join(',')+':'+mask+':'+moves;
                    const labels=visited.get(key)||[];
                    if(labels.some(label=>label.cost<=nextCost && label.required<=required))continue;
                    visited.set(key,[...labels.filter(label=>label.cost<nextCost || label.required<required),{cost:nextCost,required}]);
                    if(nextCost<bestCost)(buckets[nextCost]||=[]).push({p,stance,path,traversed,score:progress(p),mask,net,required});
                }
            }
        }
        limitReached=transitions>=config.maxTransitions;
        densityStats.costSearch={transitions,limit:config.maxTransitions,limitReached,costBefore:fallback?routeConsumption(fallback):null,costAfter:best?routeConsumption(best):null,elapsedMs:performance.now()-began};
        return best;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}

// Contact replay and resource simulation must both succeed on the frozen layout.
function validateRouteBudget(path) {
    return samePairRoute(path,replayRoute(path)) && routeResources(path).valid;
}
