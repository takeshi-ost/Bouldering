'use strict';
// Production finger-origin aiming with support-constrained coupled body motion.
// Values are logical screen pixels (400-unit width), never camera/world deltas.
const FINGER_AIM_MODEL = 'finger-origin-v1';
let fingerAimSuspended = 0;
let lastFingerGesture = null;
function fingerAimEnabled() { return !fingerAimSuspended; }
// Formal limb target sensitivity; body displacement remains unscaled.
function fingerAimGain() { return 1.5; }
function withFingerAimDisabled(fn) {
    fingerAimSuspended++;
    try { return fn(); } finally { fingerAimSuspended--; }
}
function fingerInputIdentity() { return [FINGER_AIM_MODEL, fingerAimGain(), COUPLED_BODY_MODEL]; }
function fingerAimTarget(index, aim) {
    if (aim?.model !== FINGER_AIM_MODEL || !aim.originGrips?.[index] ||
        !Number.isFinite(aim.dx) || !Number.isFinite(aim.dy) ||
        !Number.isFinite(aim.gain) || aim.gain <= 0 || aim.gain > 4.5)
        throw new TypeError('Explicit finger-origin aiming context is required.');
    return { x: aim.originGrips[index].x + aim.dx * aim.gain,
        y: aim.originGrips[index].y + aim.dy * aim.gain };
}
function fingerAction(points, gain = fingerAimGain()) {
    return { version: 1, model: FINGER_AIM_MODEL, gain,
        ...(coupledBodyEnabled() ? {bodyMotion: COUPLED_BODY_MODEL} : {}),
        points: points.map(p => ({ dx: p.dx, dy: p.dy })) };
}
function validFingerAction(action) {
    return action?.version === 1 && action.model === FINGER_AIM_MODEL &&
        Number.isFinite(action.gain) && action.gain > 0 && action.gain <= 4.5 &&
        (action.bodyMotion === undefined || action.bodyMotion === COUPLED_BODY_MODEL) &&
        Array.isArray(action.points) && action.points.length > 0 &&
        (action.inputLimitExceeded === undefined || (action.inputLimitExceeded === true &&
            action.bodyMotion === COUPLED_BODY_MODEL && action.points.length === COUPLED_BODY_CONFIG.maxPoints)) &&
        action.points.every(p => Number.isFinite(p.dx) && Number.isFinite(p.dy));
}
// Shared live/search/replay transition. Supports lock on the first activated
// vector. Later turns change aiming, not the locked pair. The original selector
// intentionally receives no aiming context, including its goal look-ahead.
function fingerGestureStep(origin, originGrips, previousBody, previousStance, anchor, delta, gain = fingerAimGain()) {
    if (!Number.isFinite(delta.dx) || !Number.isFinite(delta.dy)) return null;
    if (anchor === null && Math.hypot(delta.dx, delta.dy) < INPUT_CONFIG.dragThreshold)
        return { p: {...previousBody}, stance: [...previousStance], anchor: null, active: false, blocked: false };
    const saved = { committed, startGrips };
    try {
        committed = origin; startGrips = originGrips;
        const fixed = anchor === null ? selectAnchor(delta.dx, delta.dy) : [...anchor];
        if (!isSupportPair(fixed)) return null;
        const target = { x: clamp(origin.x + delta.dx, 25, W - 25),
            y: clamp(origin.y + delta.dy, 80, HEIGHT - 40) };
        const fraction = supportMotionFraction(previousBody, target, fixed);
        const candidate = { x: previousBody.x + (target.x - previousBody.x) * fraction,
            y: previousBody.y + (target.y - previousBody.y) * fraction };
        const stance = attachMoving(candidate, fixed, { model: FINGER_AIM_MODEL,
            dx: delta.dx, dy: delta.dy, gain, originGrips });
        // Match live behavior: an impossible assignment rolls back only this
        // body's segment. Partial legal stances remain visible until release.
        return { p: stance ? candidate : {...previousBody},
            stance: stance || [...previousStance], anchor: fixed, active: true,
            blocked: fraction < 1 - 1e-9 };
    } finally { committed = saved.committed; startGrips = saved.startGrips; }
}
function fingerGestureReplay(origin, originGrips, action) {
    if (!validFingerAction(action) || !originGrips?.every((h, i) => h && limbReachable(origin, h, i))) return null;
    if (action.bodyMotion === COUPLED_BODY_MODEL) return coupledGestureReplay(origin, originGrips, action);
    let p = {...origin}, stance = [...originGrips], anchor = null, active = false, blocked = false;
    const trace = [{...p}];
    for (const delta of action.points) {
        const next = fingerGestureStep(origin, originGrips, p, stance, anchor, delta, action.gain);
        if (!next) return null;
        ({p, stance, anchor, active, blocked} = next);
        trace.push({...p});
    }
    const hazards = newHazardContacts(stance, originGrips);
    const valid = active && stance.every(Boolean) && isSupportPair(anchor) &&
        anchor.every(i => stance[i] === originGrips[i] && limbReachable(p, stance[i], i)) &&
        (!sameContacts(stance, originGrips) || hazards.size > 0);
    return {p, stance, anchor, trace, action: {...action,points:action.points.map(p=>({...p}))},
        active, blocked, valid, won: valid && bothHandsOnGoal(stance),
        penalty: hazards.size * HAZARD_CONFIG.penalty};
}
// A bounded, deterministic input polyline drives a
// closest-feasible local body step. Targeting remains finger-origin-v1.
const COUPLED_BODY_MODEL = 'support-slide-v1';
const COUPLED_BODY_CONFIG = Object.freeze({inputStep:1,maxTravel:2048,maxPoints:8192});
function coupledBodyEnabled() {
    return fingerAimEnabled();
}
// Redundant collinear samples must not change the integration grid. A turn or
// reversal remains an explicit waypoint. Arclength remainders carry across
// turns, so slow curved input cannot discard motion at every browser event.
function coupledInputPath(points) {
    const path=[{dx:0,dy:0}];
    for(const point of points) {
        const q={dx:point.dx,dy:point.dy},b=path.at(-1);
        if(Math.hypot(q.dx-b.dx,q.dy-b.dy)<1e-10)continue;
        if(path.length>1) {
            const a=path.at(-2),ux=b.dx-a.dx,uy=b.dy-a.dy,vx=q.dx-b.dx,vy=q.dy-b.dy;
            if(ux*vx+uy*vy>=0 && Math.abs(ux*vy-uy*vx)<=1e-9*Math.max(1,Math.hypot(ux,uy)*Math.hypot(vx,vy)))path.pop();
        }
        path.push(q);
    }
    return path;
}
// Exact boundaries of the existing support rules: outer reach circles, the
// raised-foot inner circles, hip-height and foot-height lines, and wall bounds.
// Candidate enumeration projects a desired one-pixel step onto these boundaries.
// Every accepted chord also passes supportMotionFraction, not just endpoint QA.
function coupledSupportGeometry(pair,stance) {
    const circles=[],lines=[{axis:'x',v:25},{axis:'x',v:W-25},{axis:'y',v:80},{axis:'y',v:HEIGHT-40}];
    for(const i of pair) {
        const root=limbRoot({x:0,y:0},i),h=stance[i],center={x:h.x-root.x,y:h.y-root.y};
        circles.push({...center,r:LIMB_LENGTHS[i]});
        if(i>=2) {
            circles.push({...center,r:LIMB_LENGTHS[i]*HIGH_FOOT_REACH_RATIO,inner:true});
            lines.push({axis:'y',v:h.y},{axis:'y',v:h.y-root.y});
        }
    }
    // These intersections depend only on the locked support contacts. Cache
    // them once, preserving the original enumeration and tie-breaking order.
    const lineIntersections=[];
    for(let a=0;a<lines.length;a++)for(let b=a+1;b<lines.length;b++)
        if(lines[a].axis!==lines[b].axis)lineIntersections.push({[lines[a].axis]:lines[a].v,[lines[b].axis]:lines[b].v});
    const circleIntersections=circles.map((c,a)=>{
        const points=[];
        for(const line of lines) {
            const other=line.axis==='x'?'y':'x',v=line.v-c[line.axis],disc=c.r*c.r-v*v;
            if(disc>=-1e-8)for(const sign of [-1,1])points.push({[line.axis]:line.v,[other]:c[other]+sign*Math.sqrt(Math.max(0,disc))});
        }
        for(let b=a+1;b<circles.length;b++) {
            const q=circles[b],length=distance(c,q);
            if(length<1e-12||length>c.r+q.r+1e-8||length<Math.abs(c.r-q.r)-1e-8)continue;
            const along=(c.r*c.r-q.r*q.r+length*length)/(2*length),height=Math.sqrt(Math.max(0,c.r*c.r-along*along));
            const ux=(q.x-c.x)/length,uy=(q.y-c.y)/length;
            for(const sign of [-1,1])points.push({x:c.x+along*ux-sign*height*uy,y:c.y+along*uy+sign*height*ux});
        }
        return points;
    });
    return {circles,lines,lineIntersections,circleIntersections};
}
function coupledBodyStep(from,raw,pair,stance,geometry) {
    const gap=distance(from,raw);
    if(gap<1e-10)return {...from};
    const step=Math.min(COUPLED_BODY_CONFIG.inputStep,gap),desired={x:from.x+(raw.x-from.x)*step/gap,y:from.y+(raw.y-from.y)*step/gap};
    const legal=p=>p.x>=25-1e-8&&p.x<=W-25+1e-8&&p.y>=80-1e-8&&p.y<=HEIGHT-40+1e-8&&
        pair.every(i=>limbReachable(p,stance[i],i))&&supportMotionFraction(from,p,pair,stance)>=1-1e-9;
    if(legal(desired))return desired;
    let best=from,cost=step*step;
    const consider=p=>{
        if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
        const next=(p.x-desired.x)**2+(p.y-desired.y)**2;
        // Cost and axis rejection are necessary conditions, not approximate
        // reach tests. Keep the original distance and full chord checks for
        // every candidate that can actually improve the selected point.
        if(!(next<cost-1e-12)||Math.abs(p.x-from.x)>step+1e-7||Math.abs(p.y-from.y)>step+1e-7)return;
        if(distance(from,p)<=step+1e-7&&legal(p)){cost=next;best=p;}
    };
    const circles=geometry.circles,lines=geometry.lines;
    // The exact first obstruction is always a valid candidate.
    const fraction=supportMotionFraction(from,desired,pair,stance);
    consider({x:from.x+(desired.x-from.x)*fraction,y:from.y+(desired.y-from.y)*fraction});
    for(const line of lines)consider(line.axis==='x'?{x:line.v,y:desired.y}:{x:desired.x,y:line.v});
    for(const p of geometry.lineIntersections)consider(p);
    for(let a=0;a<circles.length;a++) {
        const c=circles[a],d=distance(c,desired);
        if(d>1e-12)consider({x:c.x+(desired.x-c.x)*c.r/d,y:c.y+(desired.y-c.y)*c.r/d});
        // A chord between points on a forbidden inner circle cuts through the
        // hole. Its supporting tangent, in contrast, stays outside throughout.
        if(c.inner) {
            const radius=distance(c,from);
            if(radius>=c.r-1e-7&&radius>1e-12) {
                const nx=(from.x-c.x)/radius,ny=(from.y-c.y)/radius,
                    dot=(desired.x-c.x)*nx+(desired.y-c.y)*ny;
                if(dot<c.r)consider({x:desired.x+nx*(c.r-dot),y:desired.y+ny*(c.r-dot)});
            }
        }
        for(const p of geometry.circleIntersections[a])consider(p);
    }
    // Do not expose cached geometry points as mutable replay/body nodes.
    return {...best};
}
function coupledGestureReplay(origin,originGrips,action,lockedAnchor=null,motionCache=null) {
    if(!validFingerAction(action)||action.points.length>COUPLED_BODY_CONFIG.maxPoints||!originGrips?.every((h,i)=>h&&limbReachable(origin,h,i)))return null;
    const activation=action.points.find(q=>Math.hypot(q.dx,q.dy)>=INPUT_CONFIG.dragThreshold);
    const saved={committed,startGrips};
    try {
        committed=origin;startGrips=originGrips;
        const anchor=lockedAnchor||(activation?selectAnchor(activation.dx,activation.dy):null),trace=[{...origin}];
        let p={...origin},stance=[...originGrips],travel=0,limited=false;
        const inputNodes=[],bodyNodes=[];
        const reuse=motionCache&&distance(motionCache.origin,origin)<1e-10&&
            originGrips.every((h,i)=>h===motionCache.originGrips[i])&&JSON.stringify(anchor)===JSON.stringify(motionCache.anchor);
        let prefixReusable=!!reuse;
        if(anchor) {
            if(!isSupportPair(anchor))return null;
            const geometry=coupledSupportGeometry(anchor,originGrips),path=coupledInputPath(action.points);
            let remainder=0;
            outer:for(let i=1;i<path.length;i++) {
                const a=path[i-1],b=path[i],length=Math.hypot(b.dx-a.dx,b.dy-a.dy),steps=Math.floor((remainder+length+1e-8)/COUPLED_BODY_CONFIG.inputStep);
                for(let k=1;k<=steps;k++) {
                    if(travel>=COUPLED_BODY_CONFIG.maxTravel){limited=true;break outer;}
                    travel+=COUPLED_BODY_CONFIG.inputStep;
                    const t=Math.min(1,(k*COUPLED_BODY_CONFIG.inputStep-remainder)/length),raw={x:origin.x+a.dx+(b.dx-a.dx)*t,y:origin.y+a.dy+(b.dy-a.dy)*t};
                    const at=inputNodes.length,old=prefixReusable&&motionCache.inputNodes[at];
                    if(!old||distance(old,raw)>1e-9)prefixReusable=false;
                    const next=prefixReusable?motionCache.bodyNodes[at]:coupledBodyStep(p,raw,anchor,originGrips,geometry);
                    inputNodes.push(raw);bodyNodes.push(next);
                    if(distance(p,next)>1e-10){p=next;trace.push({...p});}
                }
                remainder=Math.max(0,remainder+length-steps*COUPLED_BODY_CONFIG.inputStep);
            }
            const delta=action.points.at(-1);
            stance=attachMoving(p,anchor,{model:FINGER_AIM_MODEL,originGrips,dx:delta.dx,dy:delta.dy,gain:action.gain});
            if(!stance)return null;
        }
        const last=action.points.at(-1),cancelAtOrigin=!!anchor&&Math.hypot(last.dx,last.dy)<INPUT_CONFIG.dragThreshold;
        const hazards=newHazardContacts(stance,originGrips),valid=!!anchor&&!cancelAtOrigin&&!action.inputLimitExceeded&&stance.every(Boolean)&&
            anchor.every(i=>stance[i]===originGrips[i]&&limbReachable(p,stance[i],i))&&(!sameContacts(stance,originGrips)||hazards.size>0);
        return {p,stance,anchor:anchor&&[...anchor],trace,action:{...action,points:action.points.map(q=>({...q}))},active:!!anchor,valid,
            blocked:distance(p,{x:origin.x+last.dx,y:origin.y+last.dy})>1.01,limited,travel,cancelAtOrigin,inputLimitExceeded:action.inputLimitExceeded===true,
            motionCache:{origin:{...origin},originGrips:[...originGrips],anchor:anchor&&[...anchor],inputNodes,bodyNodes},
            won:valid&&bothHandsOnGoal(stance),penalty:hazards.size*HAZARD_CONFIG.penalty};
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
