"use strict";
// Find a real, optional move that grabs a hazard. The ordinary route never uses it.
function findHazardMove(hold,path=route) {
    const saved={committed,startGrips};
    const byId=new Map(holds.map(h=>[h.id,h]));
    try {
        for (let step=0;step<path.length-1;step++) {
            const from=path[step];
            if (distance(from,hold)>220) continue;
            const stance=step===0 ? [...initialGrips] : path[step].grips.map(id=>byId.get(id));
            if (step===0) for (const pair of [[0,1],[2,3]]) {
                const sorted=pair.map(i=>stance[i]).sort((a,b)=>a.x-b.x);
                pair.forEach((i,j)=>stance[i]=sorted[j]);
            }
            committed=from;startGrips=stance;
            for (const dx of [-48,-24,0,24,48]) for (const dy of [-48,-24,0,24,48]) {
                if (dx===0 && dy===0) continue;
                const to={x:from.x+dx,y:from.y+dy};
                if (to.x<STAGE_SAFE_WIDTH+TORSO.width/2 || to.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || to.y<80 || to.y>HEIGHT-40) continue;
                const anchor=selectAnchor(dx,dy);
                if (supportMotionFraction(from,to,anchor)<1-1e-9) continue;
                const attached=attachMoving(to,anchor);
                if (attached?.every(Boolean) && attached.includes(hold) && !sameContacts(attached,stance))
                    return {step,to,anchor,grips:attached.map(h=>h.id)};
            }
        }
        return null;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
function addHazardHolds() {
    const mode=DIFFICULTY_RULES[difficulty].hazards;
    if (mode==='none') return;
    if (mode==='dense') {
        convertDenseHazards();
        return;
    }
    const random=mulberry32(courseSeed() ^ 0x3C61D52A);
    const target=Math.floor(random()*(HAZARD_CONFIG.maxCount+1));
    let count=0,nextId=Math.max(...holds.map(h=>h.id))+1;
    for (let attempt=0;attempt<HAZARD_CONFIG.attempts && count<target;attempt++) {
        const step=1+Math.floor(random()*(route.length-2));
        const a=route[step],b=route[Math.min(step+1,route.length-1)];
        const t=random(),limb=limbs[Math.floor(random()*4)];
        // Between route stations and slightly to either side: tempting stepping stones.
        const h={id:nextId,type:'hazard',
            x:a.x+(b.x-a.x)*t+limb.x+(random()-.5)*72,
            y:a.y+(b.y-a.y)*t+limb.y+(random()-.5)*56};
        if (h.x<HOLD_CONFIG.sideMargin || h.x>W-HOLD_CONFIG.sideMargin ||
            h.y<HOLD_CONFIG.topMargin || h.y>=initialGrips[2].y-24 ||
            insideStartTriangle(h,initialGrips) ||
            holds.some(other=>distance(other,h)<(other.wide?32:HAZARD_CONFIG.spacing))) continue;
        holds.push(h);
        // Adding a hold can change automatic support selection as well as attachment.
        // Reject it unless the complete original contact sequence remains penalty-free.
        if (samePairRoute(route,replayRoute(route)) && findHazardMove(h)) {
            count++;nextId++;
        } else holds.pop();
    }
    densityStats.hazardCount=count;
    updateStageDensity();
}

// Convert a few reachable alternatives; never fill a percentage of the wall.
// Existing geometry is unchanged, so the reference contact sequence stays valid.
function addOptionalRouteHazards(path,random) {
    const protectedIds=new Set([...initialGrips.map(h=>h.id),...path.flatMap(p=>p.grips||[])]);
    const candidates=holds.filter(h=>h.type==='normal' && !h.wide && !protectedIds.has(h.id))
        .map(h=>({h,key:random()})).sort((a,b)=>a.key-b.key || a.h.id-b.h.id);
    const target=Math.floor(random()*(HAZARD_CONFIG.optionalMaxCount+1));
    const selected=[];
    let checks=0;
    for(const {h} of candidates) {
        if(selected.length>=target || checks>=HAZARD_CONFIG.optionalCandidateChecks)break;
        if(holds.some(other=>other.type==='hazard' && distance(other,h)<HAZARD_CONFIG.optionalSpacing))continue;
        checks++;
        h.type='hazard';
        if(findHazardMove(h,path))selected.push(h.id);
        else h.type='normal';
    }
    return selected;
}
// Keep a free validated fallback. Search/shortening runs again after conversion.
function convertDenseHazards() {
    const random=mulberry32(courseSeed() ^ 0x3C61D52A);
    const optionalIds=addOptionalRouteHazards(route,random);
    generatedCourse.hazardPlacement={routeIds:[],optionalIds};
    if(!samePairRoute(route,replayRoute(route)))throw new Error('Optional hazard route replay failed');
    densityStats.hazardCount=optionalIds.length;
    updateStageDensity();
}
