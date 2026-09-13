"use strict";
// One short upward branch at a sideways turn. All checks use normal transfers.
function validateFalseBranch(branch) {
    const saved={committed,startGrips};
    try {
        const source=route[branch.step], end=branch.end;
        const entry=challengeTransfer(source,end);
        if (!entry || !entry.some(h=>branch.holdIds.includes(h.id))) return false;
        const pose={...end,grips:entry.map(h=>h.id)};
        const back=challengeTransfer(pose,source);
        if (!back || back.some((h,k)=>h.id!==source.grips[k])) return false;
        // Body adjustments are allowed; continuing to a higher hold is not.
        const top=Math.min(...entry.map(h=>h.y));
        for (const dx of [-120,-90,-60,-30,0,30,60,90,120])
            for (const dy of [-30,-60,-90,-120,-150])
                {
                    if (Math.abs(dx)>Math.abs(dy)*.5) continue;
                    const next=challengeTransfer(pose,{x:end.x+dx,y:end.y+dy});
                    if (next && next.some(h=>h.y<top-10)) return false;
                }
        // Rejoining the next main step costs an extra move; skipping it is forbidden.
        for (let j=branch.step+2;j<route.length;j++)
            if (challengeTransfer(pose,route[j])) return false;
        branch.end=pose;
        return true;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
function prepareFalseBranch(preferredSteps = null) {
    if (level===1) return;
    const saved={committed,startGrips}, original=holds;
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    if (holds.filter(h=>!used.has(h.id)).length>=4) return;
    const corners=[];
    for (let i=2;i<route.length-2;i++) {
        if (preferredSteps && !preferredSteps.includes(i)) continue;
        const a=route[i-1], b=route[i], c=route[i+1];
        if (isTraverse(b,c,50) && !isTraverse(a,b,50)) corners.push(i);
    }
    try {
        for (const step of corners) for (const rise of [30,40,60,80,100,120]) for (const side of [-60,-40,-20,0,20,40,60]) {
            if (Math.abs(side)>rise*.75) continue;
            const source=route[step], end={x:source.x+side,y:source.y-rise};
            for (const hand of [0,1]) for (const offset of [-40,-20,0,20,40]) {
                const h={id:Math.max(...original.map(h=>h.id))+1,
                    x:end.x+limbs[hand].x+offset,y:end.y+limbs[hand].y,type:'normal',row:null};
                if (h.x<24 || h.x>W-24 || h.y<28 || original.some(p=>distance(p,h)<35)) continue;
                holds=[...original,h];
                const replay=replayRoute(route);
                if (!replay || replay.length!==route.length || replay.some((p,k)=>JSON.stringify(p.grips)!==JSON.stringify(route[k].grips))) continue;
                const branch={step,end,holdIds:[h.id]};
                if (!validateFalseBranch(branch)) continue;
                if (densityStats.challenge && !challengeQuality(route,densityStats.challenge.step)) continue;
                falseBranch=branch;
                densityStats.total=holds.length;
                densityStats.branchCount++;
                densityStats.routeRemoved--;
                const windows=[0,HEIGHT-H,...holds.map(p=>clamp(p.y-H,0,HEIGHT-H))];
                densityStats.peak=Math.max(...windows.map(y=>holds.filter(p=>p.y>=y&&p.y<=y+H).length));
                return;
            }
        }
        holds=original;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
