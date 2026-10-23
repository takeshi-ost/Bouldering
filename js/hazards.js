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

// Convert only existing geometry, after heart placement and before cost search.
// The initial sample treats route and off-route contacts identically. A protected
// sample first keeps the witness free, then accepts only resource-valid changes.
function convertDenseHazards(path=route,salt=0,safeFallback=false) {
    const random=mulberry32(courseSeed() ^ 0x3C61D52A ^ Math.imul(salt+1,0x9E3779B9));
    const used=new Set(path.flatMap(p=>p.grips||[]));
    const protectedIds=new Set(initialGrips.map(h=>h.id));
    const candidates=holds.filter(h=>h.type==='normal' && !h.wide && !protectedIds.has(h.id))
        .map(h=>({h,key:random()})).sort((a,b)=>
            (safeFallback?Number(used.has(a.h.id))-Number(used.has(b.h.id)):0) || a.key-b.key || a.h.id-b.h.id);
    const min=Math.ceil(holds.length*HAZARD_CONFIG.minRatio);
    const max=Math.min(candidates.length,Math.floor(holds.length*HAZARD_CONFIG.maxRatio));
    if(max<min)return false;
    const target=min+Math.floor(random()*(max-min+1));
    const selected=[];
    for(const {h} of candidates) {
        if(selected.length>=target)break;
        h.type='hazard';
        if(!safeFallback || routeResources(path).valid)selected.push(h.id);
        else h.type='normal';
    }
    if(selected.length<min)return false;
    generatedCourse.hazardPlacement={routeIds:selected.filter(id=>used.has(id)),
        optionalIds:selected.filter(id=>!used.has(id)),total:holds.length,min,max,target:selected.length,safeFallback};
    densityStats.hazardCount=selected.length;
    return true;
}
