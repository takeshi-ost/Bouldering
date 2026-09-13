"use strict";
function footCompetition(path) {
    for(let i=1;i<path.length-1;i++) {
        const a=path[i-1], b=path[i], c=path[i+1];
        if(!a.grips)continue;
        for(const foot of [2,3]) for(const hand of [0,1]) {
            const id=a.grips[foot];
            if(c.grips[hand]!==id || b.grips.includes(id))continue;
            const h=holds.find(h=>h.id===id);
            if(h.type!=='normal')continue;
            const direct=inspectSwipe(a,c);
            if(!direct || direct.anchor!==foot || !direct.cancelled)continue;
            const p=direct.position;
            // With only this exclusivity rule relaxed, a complete ordered pose
            // exists: the fixed foot and reaching hand would share this hold.
            if(!limbReachable(p,h,hand))continue;
            const otherHand=1-hand, otherFoot=5-foot;
            const alternative=holds.some(x=>x!==h && limbReachable(p,x,otherHand) &&
                holds.some(y=>y!==h && y!==x && limbReachable(p,y,otherFoot) &&
                    h.y>=x.y && y.y>=h.y && y.y>=x.y));
            if(alternative)return {step:i,holdId:id,foot,hand,parkingHoldId:b.grips[foot],target:{x:c.x,y:c.y}};
        }
    }
    return null;
}

function preparePuzzlePatterns() {
    const base={holds,route,stats:{...densityStats}};
    let selected=null;
    // Insert a preparation pose beside the next route point. Move only the
    // old direct support slightly down, so the direct ascent loses its reach.
    search: for(let i=2;i<base.route.length-2;i++) {
        const source=base.route[i-1], old=base.route[i];
        const supportId=source.grips[old.anchor];
        const sign=Math.sign(old.x-source.x)||1;
        for(const width of [50,80,110]) for(const dy of [0,20]) for(const drop of [15,30]) {
            const mid={x:old.x-sign*width,y:old.y-dy};
            if(mid.x<30||mid.x>W-30||mid.y<80)continue;
            holds=base.holds.map(h=>h.type==='normal'?{...h}:h);
            const support=holds.find(h=>h.id===supportId);
            if(support.type!=='normal')continue;
            support.y+=drop;
            if(holds.some(h=>holds.some(k=>k.id!==h.id&&distance(h,k)<18)))continue;
            const entry=inspectSwipe(source,mid);
            if(!entry || entry.cancelled || inspectSwipe(entry.result,old)?.cancelled!==false)continue;
            const candidate=[...base.route.slice(0,i),mid,...base.route.slice(i)];
            const replay=replayRoute(candidate);
            if(!replay||replay.length!==candidate.length)continue;
            if(challengeTransfer(replay[i-1],replay[i+1]))continue;
            let quality=null;
            if(base.stats.challenge) {
                const step=base.stats.challenge.step+(base.stats.challenge.step>=i?1:0);
                quality=challengeQuality(replay,step);
                if(!quality)continue;
            }
            route=replay;densityStats={...base.stats,challenge:quality};falseBranch=null;
            prepareFalseBranch([i]);
            if(!falseBranch)continue;
            selected={step:i+1,branchStep:i,dy};
            break search;
        }
    }
    if(!selected) {holds=base.holds;route=base.route;densityStats=base.stats;falseBranch=null;}
    if(!selected && level>1 && !footCompetition(route)) prepareFootParking();
    densityStats.patterns={traverse:selected,competition:footCompetition(route),goalTrap:null};
}

function prepareFootParking() {
    const base={holds,route,stats:{...densityStats}};
    // Build a parking move before transferring a foot's hold to a hand.
    for(let i=2;i<base.route.length-2;i++) for(const foot of [2,3]) {
        const source=base.route[i], h=base.holds.find(h=>h.id===source.grips[foot]);
        if(h.type!=='normal')continue;
        for(const dx of [-120,-100,-80,80,100,120]) for(const dy of [0,30]) {
            const mid={x:source.x+dx,y:source.y+dy};
            if(mid.x<25||mid.x>W-25||mid.y>HEIGHT-40)continue;
            const parking={x:mid.x+limbs[foot].x,y:mid.y+limbs[foot].y,
                id:Math.max(...base.holds.map(h=>h.id))+1,type:'normal',row:null};
            if(parking.x<24||parking.x>W-24||parking.y>HEIGHT-40||base.holds.some(p=>distance(p,parking)<30))continue;
            for(const offset of [-30,0,30]) {
                const exit={x:h.x+offset,y:h.y+68};
                holds=[...base.holds,parking];
                const entry=inspectSwipe(source,mid);
                if(!entry || entry.cancelled)continue;
                const leave=inspectSwipe(entry.result,exit);
                if(!leave || leave.cancelled || !footCompetition([source,entry.result,leave.result]))continue;
                const candidate=[...base.route.slice(0,i+1),mid,exit,...base.route.slice(i+1)];
                let replay=replayRoute(candidate);
                if(!replay||replay.length!==candidate.length)continue;
                const used=new Set([...initialGrips.map(h=>h.id),...replay.flatMap(p=>p.grips||[])]);
                holds=holds.filter(h=>used.has(h.id));
                replay=replayRoute(replay);
                if(!replay||!footCompetition(replay))continue;
                // Reject a parking loop that can simply be omitted in full.
                if(challengeTransfer(replay[i],replay[i+3]))continue;
                let quality=null;
                if(base.stats.challenge) {
                    const step=base.stats.challenge.step+(base.stats.challenge.step>i?2:0);
                    quality=challengeQuality(replay,step);
                    if(!quality)continue;
                }
                route=replay; densityStats={...base.stats,challenge:quality,
                    total:holds.length,branchCount:0,coreCount:holds.length,
                    routeRemoved:base.stats.routeRemoved+base.holds.length-holds.length};
                return;
            }
        }
    }
    holds=base.holds;route=base.route;densityStats=base.stats;
}

function goalFootFailure(from, target) {
    const out=inspectSwipe(from,target);
    const goal=holds.find(h=>h.type==='goal');
    if(!out || !out.cancelled || !out.pose || !out.pose[0] || !out.pose[1] || !limbReachable(out.position,goal,0) || !limbReachable(out.position,goal,1))return null;
    const handY=Math.max(out.pose[0].y,out.pose[1].y);
    for(const foot of [2,3]) {
        if(out.pose[foot])continue;
        const available=holds.filter(h=>!out.pose.slice(0,2).includes(h));
        const reachable=available.filter(h=>limbReachable(out.position,h,foot));
        if(!reachable.length)return {target,foot,reason:'reach'};
        if(reachable.every(h=>h.y<handY))return {target,foot,reason:'order'};
    }
    return null;
}

function prepareGoalTrap() {
    const original=holds, goal=holds.find(h=>h.type==='goal');
    const patterns=densityStats.patterns;
    if(level===1)return;
    patterns.goalTrapRejected={entry:0,feet:0,budget:0};
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    for(const point of goalTrapCandidates(goal)) {
        const h={...point,id:Math.max(...original.map(h=>h.id))+1,type:'normal',row:null};
        holds=[...original,h];
        const extras=holds.filter(p=>!used.has(p.id));
        const span=2*Math.max(...LIMB_LENGTHS)+Math.hypot(TORSO.width,TORSO.height);
        if(extras.length>4 || extras.some(p=>extras.filter(q=>q!==p&&distance(p,q)<=span).length>1))continue;
        const replay=replayRoute(route);
        if(!replay || replay.length!==route.length || replay.some((p,i)=>JSON.stringify(p.grips)!==JSON.stringify(route[i].grips)))continue;
        const checkedBranch=falseBranch?{...falseBranch,end:{...falseBranch.end}}:null;
        if(checkedBranch && !validateFalseBranch(checkedBranch))continue;
        if(densityStats.challenge && !challengeQuality(route,densityStats.challenge.step))continue;
        const budgetChecks=new Map();
        for(const step of [route.length-4,route.length-3]) {
            if(step<1)continue;
            for(const dx of [-40,0,40]) for(const dy of [50,80,110]) {
                const entry=inspectSwipe(route[step],{x:h.x+dx,y:h.y+dy});
                if(!entry || entry.cancelled || !entry.pose.includes(h)) {patterns.goalTrapRejected.entry++;continue;}
                const dead=entry.result;
                let failure=null;
                for(const offset of [0,20,40,60,80,100]) {
                    failure=goalFootFailure(dead,{x:goal.x,y:goal.y+offset});
                    if(failure)break;
                }
                if(!failure){patterns.goalTrapRejected.feet++;continue;}
                const remaining=route.length-1+STAGE_CONFIG.spareMoves-step-1;
                const budgetKey=remaining+':'+dead.grips.join(',');
                if(!budgetChecks.has(budgetKey))budgetChecks.set(budgetKey,relaxedGoalPossible(dead,remaining));
                if(budgetChecks.get(budgetKey)){patterns.goalTrapRejected.budget++;continue;}
                if(checkedBranch)falseBranch=checkedBranch;
                patterns.goalTrap={holdId:h.id,step,dead,failure,remaining,certificate:'relaxed-cells'};
                densityStats.total=holds.length;densityStats.branchCount++;densityStats.routeRemoved--;
                return;
            }
        }
    }
    holds=original;
}

function refreshPuzzleDensity() {
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]);
    const windows=[0,HEIGHT-H,...holds.map(h=>clamp(h.y-H,0,HEIGHT-H))];
    densityStats.total=holds.length;
    densityStats.coreCount=holds.filter(h=>used.has(h.id)).length;
    densityStats.branchCount=holds.length-densityStats.coreCount;
    densityStats.peak=Math.max(...windows.map(y=>holds.filter(h=>h.y>=y&&h.y<=y+H).length));
}
