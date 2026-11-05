'use strict';
// Deterministic production action search. Nodes are committed body/contact/resource
// states; input witnesses belong to edges. Bounds are not shortest-path proofs.
function fingerRouteInitial() {
    const first=[...initialGrips];
    for(const pair of [[0,1],[2,3]]) {
        const sorted=pair.map(i=>first[i]).sort((a,b)=>(a?.x??0)-(b?.x??0));
        pair.forEach((i,j)=>first[i]=sorted[j]);
    }
    return first;
}
function fingerRouteAction(dx,dy) {
    return fingerAction([{dx,dy}]);
}
// Reference routes accept only straight actions whose one- and ten-sample
// executions agree in body, contacts, support lock and swept body geometry.
// This does not assert arbitrary curved/coalesced input equivalence.
function fingerResampledAction(action,samples=10) {
    const points=[];let previous={dx:0,dy:0};
    for(const point of action.points){for(let k=1;k<=samples;k++)points.push({dx:previous.dx+(point.dx-previous.dx)*k/samples,dy:previous.dy+(point.dy-previous.dy)*k/samples});previous=point;}
    return {...action,points};
}
function fingerRouteSampleStable(origin,stance,action,move,{requireRelease=true}={}) {
    const sampled=fingerGestureReplay(origin,stance,fingerResampledAction(action));
    if(!sampled||!sampled.active||(requireRelease&&!sampled.valid)||sampled.valid!==move.valid||distance(sampled.p,move.p)>1e-7||sampled.penalty!==move.penalty||
        JSON.stringify(sampled.anchor)!==JSON.stringify(move.anchor)||
        JSON.stringify(sampled.stance.map(h=>h?.id))!==JSON.stringify(move.stance.map(h=>h?.id)))return false;
    if(action.bodyMotion === COUPLED_BODY_MODEL) {
        return move.trace.length===sampled.trace.length&&move.trace.every((p,i)=>distance(p,sampled.trace[i])<1e-7);
    }
    for(let i=0;i<action.points.length;i++) {
        const a=move.trace[i],b=move.trace[i+1],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;let previous=-1e-7;
        for(let k=0;k<=10;k++) {
            const p=sampled.trace[i*10+k],t=den?((p.x-a.x)*dx+(p.y-a.y)*dy)/den:0;
            if(distance(p,{x:a.x+dx*clamp(t,0,1),y:a.y+dy*clamp(t,0,1)})>1e-6||t<previous-1e-7)return false;
            previous=t;
        }
    }
    return true;
}
function fingerRouteEntry(move) {
    return {...move.p,anchor:[...move.anchor],grips:move.stance.map(h=>h?.id??null),
        action:JSON.parse(JSON.stringify(move.action)),trace:move.trace.map(p=>({x:p.x,y:p.y})),penalty:move.penalty};
}
function fingerRouteTraceMask(pickups,mask,trace) {
    for(let i=1;i<trace.length;i++)mask=coursePickupMask(pickups,mask,trace[i-1],trace[i]);
    return mask;
}
function fingerRouteTouchesHeart(from,to,heart) {
    const trace=to.action&&Array.isArray(to.trace)?to.trace:[from,to];
    return trace.slice(1).some((p,i)=>torsoTouchesHeart(trace[i],p,heart));
}
function fingerReplayRoute(path,{partial=false}={}) {
    if(!Array.isArray(path)||!path.length)return null;
    let stance=fingerRouteInitial(),p={x:path[0].x,y:path[0].y};
    if(!stance.every((h,i)=>h&&limbReachable(p,h,i)))return null;
    const result=[{...path[0]}],withMasks=path.some(q=>q.pickupMask!==undefined);
    const pickups=withMasks?createHearts(level,path,difficulty):[];let mask=0;
    for(let i=1;i<path.length;i++) {
        // No inferred torso-to-finger conversion: legacy witnesses are separate.
        if(!path[i].action)return null;
        const move=fingerGestureReplay(p,stance,path[i].action);
        if(!move?.valid)return null;
        const entry=fingerRouteEntry(move);
        if(withMasks){mask=fingerRouteTraceMask(pickups,mask,move.trace);entry.pickupMask=mask;}
        result.push(entry);p=move.p;stance=move.stance;
        if(move.won)return partial||!requiresLegacyTraverse()||result.slice(1).some((q,j)=>isTraverse(result[j],q))?result:null;
    }
    return partial?result:null;
}
function fingerSamePairRoute(expected,actual) {
    const samePoint=(a,b)=>a&&b&&Math.abs(a.x-b.x)<=1e-7&&Math.abs(a.y-b.y)<=1e-7;
    return !!actual&&actual.length===expected.length&&actual.every((p,i)=>{
        const q=expected[i];
        return samePoint(p,q)&&JSON.stringify(p.grips)===JSON.stringify(q.grips)&&
            JSON.stringify(p.anchor)===JSON.stringify(q.anchor)&&
            JSON.stringify(p.action)===JSON.stringify(q.action)&&p.penalty===q.penalty&&
            p.pickupMask===q.pickupMask&&((!p.trace&&!q.trace)||(p.trace?.length===q.trace?.length&&p.trace.every((r,j)=>samePoint(r,q.trace[j]))));
    });
}
function fingerRouteCandidates(p,targets,{wide=false}={}) {
    const result=[],seen=new Set(),directions=[];
    const add=(dx,dy)=>{
        if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<INPUT_CONFIG.dragThreshold)return;
        const key=dx.toFixed(6)+','+dy.toFixed(6);if(seen.has(key))return;seen.add(key);
        result.push(fingerRouteAction(dx,dy));
    };
    for(const q of targets) {
        const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
        if(d>230||d<5)continue;
        for(const t of [.5,.75,1])add(dx*t,dy*t);
        directions.push({x:dx/d,y:dy/d});
    }
    // Preserve short/ordinary gestures, then explicitly explore travel past a
    // support clamp. No final-body displacement threshold is applied.
    for(const dx of (wide?[-90,-60,-30,0,30,60,90]:[-60,-30,0,30,60]))
        for(const dy of [-90,-45,0,20,40])add(dx,dy);
    for(const [x,y] of [[0,-1],[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1],[0,1]]) {
        const d=Math.hypot(x,y);directions.push({x:x/d,y:y/d});
    }
    for(const d of directions)for(const length of [120,180,240])add(d.x*length,d.y*length);
    return result;
}
function fingerRouteProgress(guide,p) {
    let best=Infinity,index=0;
    guide.forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});
    return index*100-best;
}
function fingerPartialSearchBounded(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false,accept=()=>true,beamWidth=12,needsTraverse=false,greedy=false}={}) {
    const origin=start||guide[0],first=stance||fingerRouteInitial();
    let transitions=0,expanded=0,best=null;
    const report=(path,found)=>({path,transitions,expanded,limit,maxMoves,beamWidth,
        retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found,search:'bounded-finger-actions'});
    if(!origin||!first.every((h,i)=>h&&limbReachable(origin,h,i)))return report(null,false);
    let beam=[{p:origin,stance:first,path:[{x:origin.x,y:origin.y}],score:fingerRouteProgress(guide,origin),traversed:!needsTraverse}];
    const visited=new Set();
    for(let depth=0;depth<maxMoves&&transitions<limit;depth++) {
        const next=[];
        for(const node of beam) {
            expanded++;
            let advances=0;
            const candidates=fingerRouteCandidates(node.p,guide,{wide:true});
            const ordered=greedy?candidates.map(action=>({action,score:fingerRouteProgress(guide,{
                x:node.p.x+action.points.at(-1).dx,y:node.p.y+action.points.at(-1).dy})}))
                .sort((a,b)=>b.score-a.score).map(entry=>entry.action):candidates;
            for(const action of ordered) {
                if(transitions>=limit)break;transitions++;
                const move=fingerGestureReplay(node.p,node.stance,action);
                if(!move?.valid)continue;
                const p=move.p;
                if(p.x<STAGE_SAFE_WIDTH+TORSO.width/2||p.x>W-STAGE_SAFE_WIDTH-TORSO.width/2||p.y<80||p.y>HEIGHT-40||
                    (forwardOnly&&p.y>origin.y+60+1e-7)||!accept(p,node.path))continue;
                const traversed=node.traversed||isTraverse(node.p,p);
                const key=traversed+':'+Math.round(p.x/6)+','+Math.round(p.y/6)+':'+move.stance.map(h=>h.id).join(',');
                if(visited.has(key)||!fingerRouteSampleStable(node.p,node.stance,action,move))continue;visited.add(key);
                const path=[...node.path,fingerRouteEntry(move)];
                const entry={p,stance:move.stance,path,traversed,score:fingerRouteProgress(guide,p)};
                if(!best||p.y<best.p.y)best=entry;
                if(traversed&&stop(p,move.stance,path))return report(path,true);
                // Winning ends the game; never continue moving beyond it.
                if(!move.won)next.push(entry);
                if(greedy&&entry.score>node.score+10&&++advances>=3)break;
            }
        }
        next.sort((a,b)=>b.score-a.score);beam=next.slice(0,beamWidth);if(!beam.length)break;
    }
    return report(best?.path||null,false);
}
// Fast searches only change exploration order. Every edge still passes the same
// physics, reach, one/ten-sample, acceptance and stop checks. A failed prepass
// always falls back to the original full beam and its original bounds.
let fingerRouteSearchStrategy='hybrid';
function withFingerRouteSearchStrategy(strategy,operation) {
    if(strategy!=='hybrid'&&strategy!=='canonical')throw new RangeError('Unknown finger route search strategy');
    const previous=fingerRouteSearchStrategy;fingerRouteSearchStrategy=strategy;
    try{return operation();}finally{fingerRouteSearchStrategy=previous;}
}
function fingerPartialSearch(guide,options={}) {
    if(fingerRouteSearchStrategy==='canonical'||options.beamWidth===1)return fingerPartialSearchBounded(guide,{...options,greedy:false});
    const maxMoves=options.maxMoves??45,phases=[];
    const quick=()=>fingerPartialSearchBounded(guide,{...options,greedy:false,beamWidth:1,
        limit:Math.min(options.limit??18000,Math.max(3000,maxMoves*150))});
    const greedy=()=>fingerPartialSearchBounded(guide,{...options,greedy:true,beamWidth:3,
        limit:Math.min(options.limit??18000,2400)});
    const report=result=>({...result,
        prepasses:phases.map(({name,result:r})=>({name,found:r.found,transitions:r.transitions})),
        totalTransitions:phases.reduce((n,p)=>n+p.result.transitions,0)});
    for(const [name,search] of (options.preferGreedy?[['greedy',greedy],['narrow',quick]]:[['narrow',quick],['greedy',greedy]])) {
        const result=search();phases.push({name,result});if(result.found)return report(result);
    }
    const result=fingerPartialSearchBounded(guide,{...options,greedy:false});phases.push({name:'full',result});return report(result);
}
function fingerSolveRoute(guide,maxMoves=40) {
    if(holds.some(h=>h.type==='hazard'))return fingerSolveCostRoute(guide,maxMoves);
    const goal=holds.find(h=>h.type==='goal');if(!goal)return null;
    const targets=[...guide,{x:goal.x,y:goal.y+70}],options={maxMoves,
        needsTraverse:requiresLegacyTraverse(),stop:(p,stance)=>bothHandsOnGoal(stance)};
    let result;
    if(fingerRouteSearchStrategy==='canonical') {
        // Source witnesses determine native pruning before sections are joined.
        // Preserve the original narrow/full goal sequence for that scoped phase.
        const quick=fingerPartialSearch(targets,{...options,beamWidth:1,limit:Math.max(3000,maxMoves*150)});
        result=quick.found?quick:fingerPartialSearch(targets,{...options,limit:Math.max(18000,maxMoves*1200)});
        densityStats.fingerSearch={...result,path:undefined,quickTransitions:quick.transitions,
            quickFound:quick.found,totalTransitions:quick.transitions+(result===quick?0:result.transitions)};
    }else{
        result=fingerPartialSearch(targets,{...options,preferGreedy:true,limit:Math.max(18000,maxMoves*1200)});
        densityStats.fingerSearch={...result,path:undefined};
    }
    return result.found?result.path:null;
}
function fingerSolveCostRoute(guide,maxMoves=40,config=ROUTE_COST_SEARCH_CONFIG,options={}) {
    const began=performance.now(),first=fingerRouteInitial(),start={x:guide[0].x,y:guide[0].y},goal=holds.find(h=>h.type==='goal');
    if(!goal||!first.every((h,i)=>h&&limbReachable(start,h,i)))return null;
    const pickups=createHearts(level,guide,difficulty),resourcePickups=options.noHearts?[]:pickups;
    const fixedBudget=options.budget??null,targets=[...guide.slice(1),...pickups,{x:goal.x,y:goal.y+70}];
    const fallback=fingerReplayRoute(guide),resources=fallback?routeResources(fallback,{pickups:resourcePickups,budget:fixedBudget}):null;
    let best=resources?.valid&&(!options.noHazards||!resources.penalties)&&(!options.noHearts||!routeResources(fallback,{pickups}).pickupMask)?fallback:null;
    let bestCost=best?routeConsumption(best):maxMoves+3+pickups.length*HEART_CONFIG.recovery,transitions=0;
    const buckets=[],visited=new Map();buckets[0]=[{p:start,stance:first,path:[start],traversed:!requiresLegacyTraverse(),score:fingerRouteProgress(guide,start),mask:0,net:0,required:1}];
    for(let cost=0;cost<=bestCost&&transitions<config.maxTransitions;cost++) {
        const groups=new Map();for(const node of buckets[cost]||[]){const group=groups.get(node.mask)||[];group.push(node);groups.set(node.mask,group);}
        const beam=[...groups.values()].flatMap(group=>group.sort((a,b)=>b.score-a.score||a.required-b.required).slice(0,config.beamWidth));
        for(const node of beam) {
            if(node.path.length-1>=maxMoves)continue;
            for(const action of fingerRouteCandidates(node.p,targets)) {
                if(transitions>=config.maxTransitions)break;transitions++;
                const move=fingerGestureReplay(node.p,node.stance,action);if(!move?.valid)continue;
                const p=move.p,edge=routeMoveCost(move.stance,node.stance),won=move.won;
                if(p.x<STAGE_SAFE_WIDTH+TORSO.width/2||p.x>W-STAGE_SAFE_WIDTH-TORSO.width/2||p.y<80||p.y>HEIGHT-40||options.noHazards&&edge>1)continue;
                const nextCost=cost+edge,moves=node.path.length;if(nextCost>bestCost)continue;
                const mask=fingerRouteTraceMask(pickups,node.mask,move.trace);if(options.noHearts&&mask)continue;
                const net=node.net+edge-(bitCount(mask)-bitCount(node.mask))*HEART_CONFIG.recovery;
                const required=Math.max(node.required,node.net+1,net+(won?0:1));if(required>(fixedBudget??maxMoves+3))continue;
                const traversed=node.traversed||isTraverse(node.p,p),ids=move.stance.map(h=>h.id);
                if(node.path.some((q,i)=>distance(q,p)<5&&(q.pickupMask||0)===mask&&(i?q.grips:first.map(h=>h.id)).every((id,j)=>id===ids[j])))continue;
                if(!fingerRouteSampleStable(node.p,node.stance,action,move))continue;
                const path=[...node.path,{...fingerRouteEntry(move),pickupMask:mask}];
                if(won){if(traversed&&required<=(fixedBudget??moves+3)&&(nextCost<bestCost||nextCost===bestCost&&(!best||path.length<best.length))){best=path;bestCost=nextCost;}continue;}
                const key=traversed+':'+Math.round(p.x/8)+','+Math.round(p.y/8)+':'+ids.join(',')+':'+mask+':'+moves;
                const labels=visited.get(key)||[];if(labels.some(label=>label.cost<=nextCost&&label.required<=required))continue;
                visited.set(key,[...labels.filter(label=>label.cost<nextCost||label.required<required),{cost:nextCost,required}]);
                if(nextCost<bestCost)(buckets[nextCost]||=[]).push({p,stance:move.stance,path,traversed,score:fingerRouteProgress(guide,p),mask,net,required});
            }
        }
    }
    densityStats.costSearch={transitions,limit:config.maxTransitions,limitReached:transitions>=config.maxTransitions,costBefore:fallback?routeConsumption(fallback):null,costAfter:best?routeConsumption(best):null,elapsedMs:performance.now()-began,search:'bounded-finger-actions'};
    return best;
}
function fingerOptimizeRoute(path,config=ROUTE_OPTIMIZATION_CONFIG) {
    const began=performance.now(),first=fingerRouteInitial(),byId=new Map(holds.map(h=>[h.id,h]));
    let best=fingerReplayRoute(path);if(!best)return path;
    let bestCost=routeConsumption(best),transitions=0;
    for(let pass=0;pass<config.passes&&transitions<config.maxTransitions;pass++) {
        const before=best;
        for(let i=0;i<best.length-2&&transitions<config.maxTransitions;i++) {
            for(let j=best.length-1;j>i+1&&transitions<config.maxTransitions;j--) {
                if(distance(best[i],best[j])>Math.max(...LIMB_LENGTHS)*2)continue;
                const stance=i?best[i].grips.map(id=>byId.get(id)):first;
                let improved=false;
                for(const action of fingerRouteCandidates(best[i],[best[j]])) {
                    if(transitions>=config.maxTransitions)break;transitions++;
                    const move=fingerGestureReplay(best[i],stance,action);if(!move?.valid||!fingerRouteSampleStable(best[i],stance,action,move))continue;
                    // The first shortcut action changes. Every following action
                    // is replayed unchanged from the resulting committed state.
                    const candidate=[...best.slice(0,i+1),fingerRouteEntry(move),...best.slice(j+1)];
                    const replay=fingerReplayRoute(candidate);if(!replay||!fingerValidateDragReference(replay).valid)continue;
                    const cost=routeConsumption(replay);
                    if(routeResources(replay).valid&&(cost<bestCost||cost===bestCost&&replay.length<best.length)){best=replay;bestCost=cost;improved=true;break;}
                }
                if(improved)break;
            }
        }
        if(best===before)break;
    }
    densityStats.routeOptimization={before:path.length-1,after:best.length-1,costBefore:routeConsumption(path),costAfter:bestCost,transitions,limit:config.maxTransitions,elapsedMs:performance.now()-began,search:'bounded-finger-actions'};
    return best;
}
function fingerValidateDragReference(path) {
    if(!path?.length)return {valid:false,step:0,reason:'missing-path',samples:10,viewportWidth:400};
    let stance=fingerRouteInitial(),p=path[0];
    for(let i=1;i<path.length;i++) {
        const action=path[i].action;if(!action)return {valid:false,step:i,reason:'missing-finger-action',samples:10,viewportWidth:400};
        const exact=fingerGestureReplay(p,stance,action);
        const move=fingerGestureReplay(p,stance,fingerResampledAction(action));
        if(!move?.valid||distance(move.p,path[i])>1e-7||JSON.stringify(move.stance.map(h=>h?.id))!==JSON.stringify(path[i].grips)||JSON.stringify(move.anchor)!==JSON.stringify(path[i].anchor)||!exact?.valid||!fingerRouteSampleStable(p,stance,action,exact))
            return {valid:false,step:i,reason:'finger-drag-reference-mismatch',samples:10,viewportWidth:400,actualBody:move?.p,actualGrips:move?.stance.map(h=>h?.id)};
        p=move.p;stance=move.stance;
    }
    return {valid:true,samples:10,viewportWidth:400,moves:path.length-1,model:'finger-origin-v1'};
}
function fingerFindCourseHeartMove(heart,path) {
    const byId=new Map(holds.map(h=>[h.id,h]));let checks=0;
    const nearby=path.slice(0,-1).map((p,i)=>({p,i})).sort((a,b)=>distance(a.p,heart)-distance(b.p,heart));
    for(const {p,i} of nearby) {
        const stance=i?p.grips.map(id=>byId.get(id)):fingerRouteInitial();
        const dx=heart.x-p.x,dy=heart.y-p.y;
        const actions=[path[i+1]?.action,fingerRouteAction(dx*.5,dy*.5),fingerRouteAction(dx,dy),fingerRouteAction(dx*1.5,dy*1.5)].filter(Boolean);
        for(const action of actions) {
            if(checks>=COURSE_GENERATION_CONFIG.heartPlacementChecks)return null;checks++;
            const move=fingerGestureReplay(p,stance,action);
            // Collection occurs during dragging, including an eventual canceled
            // release. Require a real activated trace, not a valid release.
            if(move?.active&&move.stance.every(Boolean)&&fingerRouteTraceMask([heart],0,move.trace)&&fingerRouteSampleStable(p,stance,action,move,{requireRelease:false}))
                return {from:p,to:move.p,anchor:move.anchor,action:move.action,trace:move.trace.map(q=>({x:q.x,y:q.y}))};
        }
    }
    return null;
}
function fingerFindHazardMove(hold,path=route) {
    const byId=new Map(holds.map(h=>[h.id,h]));
    for(let step=0;step<path.length-1;step++) {
        const from=path[step];if(distance(from,hold)>220)continue;
        const stance=step?from.grips.map(id=>byId.get(id)):fingerRouteInitial();
        for(const action of fingerRouteCandidates(from,[hold])) {
            const move=fingerGestureReplay(from,stance,action);
            if(move?.valid&&move.stance.includes(hold)&&fingerRouteSampleStable(from,stance,action,move))return {step,to:move.p,anchor:move.anchor,grips:move.stance.map(h=>h.id),action:move.action,trace:move.trace};
        }
    }
    return null;
}
