'use strict';
// Authored, isolated STAGE 0. No normal/Daily generator or RNG is changed.
const TUTORIAL_COURSE_CONFIG=Object.freeze({version:'1',seed:0,height:700,centerHoldId:5,extraStamina:5});
function tutorialCourseHolds(){
    return [
        {x:130,y:650,type:'start'},{x:270,y:650,type:'start'},
        {x:200,y:492,type:'start',wide:true},
        {x:260,y:500,type:'normal'},{x:140,y:500,type:'normal'},
        {x:200,y:350,type:'normal',wide:true},
        {x:260,y:400,type:'normal'},{x:140,y:400,type:'normal'},
        {x:140,y:200,type:'normal'},{x:180,y:200,type:'normal'},
        {x:220,y:200,type:'normal'},{x:260,y:200,type:'normal'},
        {x:208,y:40,type:'goal'}
    ].map((hold,id)=>({...hold,id,row:null}));
}
// Exhaustive finite OVERAPPROXIMATION of every legal continuous gesture.
// A node is a complete ordered limb/contact tuple. Project the four anatomical
// reach disks onto x/y; nonempty intersection is necessary, not sufficient.
// Omit circle curvature, raised-foot restrictions, snapping preferences, anchor
// selection, motion continuity and stamina: this adds states/edges, never removes
// a legal path. A release retains two identical limb/contact anchors, so joining
// all tuples sharing any exact limb pair includes every actual release edge.
// Canceled drags restore a node; Undo returns to an earlier node. Neither can
// escape this graph. Goal is checked only after a complete legal release.
function tutorialMandatoryHoldProof(layout,initial,removedId,forbiddenLimbs=[0,1,2,3]){
    if(!Array.isArray(layout)||layout.length>20||new Set(layout.map(h=>h.id)).size!==layout.length)
        throw Error('Invalid tutorial proof layout.');
    const candidates=layout,epsilon=1e-5;
    const roots=[0,1,2,3].map(i=>limbRoot({x:0,y:0},i));
    const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],nodes=[],buckets=new Map();
    const signature=(ids,pair)=>pair[0]+':'+ids[pair[0]]+'|'+pair[1]+':'+ids[pair[1]];
    function enumerate(stance,minX,maxX,minY,maxY){
        const i=stance.length;
        if(i===4){
            const ids=stance.map(h=>h.id),index=nodes.length;
            nodes.push({ids,goal:bothHandsOnGoal(stance)});
            for(const pair of pairs){const key=signature(ids,pair);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(index);}
            return;
        }
        for(const h of candidates){
            if(h.id===removedId&&forbiddenLimbs.includes(i))continue;
            if(stance.some((other,j)=>other===h&&!canShareHold(h,i,j)))continue;
            if(i>=2&&stance.slice(0,2).some(hand=>h.y<hand.y))continue;
            const radius=LIMB_LENGTHS[i]+epsilon,cx=h.x-roots[i].x,cy=h.y-roots[i].y;
            const x0=Math.max(minX,cx-radius),x1=Math.min(maxX,cx+radius);
            const y0=Math.max(minY,cy-radius),y1=Math.min(maxY,cy+radius,i>=2?h.y+epsilon:Infinity);
            if(x0>x1||y0>y1)continue;
            enumerate([...stance,h],x0,x1,y0,y1);
        }
    }
    // Bounds intentionally wider than all live clamped body positions.
    enumerate([],25-epsilon,W-25+epsilon,80-epsilon,TUTORIAL_COURSE_CONFIG.height-40+epsilon);
    const initialIds=initial.map(h=>h.id),start=nodes.findIndex(node=>node.ids.every((id,i)=>id===initialIds[i]));
    if(start<0)throw Error('Tutorial initial stance is absent from the proof graph.');
    const reached=new Set([start]),queue=[start],visitedPairs=new Set();
    for(let cursor=0;cursor<queue.length;cursor++)for(const pair of pairs){
        const key=signature(nodes[queue[cursor]].ids,pair);if(visitedPairs.has(key))continue;visitedPairs.add(key);
        for(const next of buckets.get(key)||[])if(!reached.has(next)){reached.add(next);queue.push(next);}
    }
    const goalStates=nodes.filter(node=>node.goal).length;
    const reachableGoalStates=queue.filter(index=>nodes[index].goal).length;
    return {method:'exhaustive-conservative-contact-graph-v1',restrictedHoldId:removedId,forbiddenLimbs:[...forbiddenLimbs],
        states:nodes.length,reachableStates:reached.size,goalStates,reachableGoalStates,
        mandatory:goalStates>0&&reachableGoalStates===0,tolerance:epsilon,
        scope:'every continuous legal gesture; mandatory contact by a forbidden limb',
        geometry:layout.map(h=>({id:h.id,x:h.x,y:h.y,type:h.type,wide:!!h.wide})),
        physics:{width:W,height:TUTORIAL_COURSE_CONFIG.height,limbLengths:[...LIMB_LENGTHS],roots}};
}
function prepareTutorialCourse(){
    const previous={holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,
        hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount};
    try{
        if(W!==400||H!==700)throw Error('Tutorial authored dimensions require review.');
        holds=tutorialCourseHolds();HEIGHT=TUTORIAL_COURSE_CONFIG.height;
        initialGrips=[holds[2],holds[2],holds[0],holds[1]];
        const proof=tutorialMandatoryHoldProof(holds,initialGrips,TUTORIAL_COURSE_CONFIG.centerHoldId,[0,1]);
        if(!proof.mandatory)throw Error('Tutorial center hold is not proven mandatory.');
        // Mark dedicated mode before replay: real STAGE 0 must not inherit the
        // legacy non-stage-1 traverse constraint. No level/difficulty mutation.
        activeCourseGeneration={tutorial:true,initialStamina:0};
        const authored=[{x:200,y:560},{x:200,y:455},{x:200,y:365},{x:200,y:300},
            {x:200,y:262.5},{x:200,y:150},{x:204,y:130}];
        route=replayRoute(authored);
        if(!route||!route.some(p=>p.grips?.slice(0,2).includes(TUTORIAL_COURSE_CONFIG.centerHoldId)))
            throw Error('Tutorial authored route no longer replays.');
        const referenceMoves=routeExpectedMoves(route),normalStamina=stageStamina(referenceMoves);
        const initialStamina=normalStamina+TUTORIAL_COURSE_CONFIG.extraStamina;
        const report={version:TUTORIAL_COURSE_CONFIG.version,seed:TUTORIAL_COURSE_CONFIG.seed,
            type:'straight',length:'short',height:HEIGHT,centerHoldId:TUTORIAL_COURSE_CONFIG.centerHoldId,
            referenceMoves,normalStamina,extraStamina:TUTORIAL_COURSE_CONFIG.extraStamina,initialStamina,
            hearts:0,spikes:0,mandatoryProof:proof,validated:true};
        generatedCourse={level:0,seed:TUTORIAL_COURSE_CONFIG.seed,difficulty:0,typeId:0,mode:'tutorial',
            holds,intent:'basic',hearts:[],hazardPlacement:{routeIds:[],optionalIds:[]}};
        activeCourseGeneration={tutorial:true,report,initialStamina};
        hearts=[];labHeartsCache=[];labStaminaCache=null;labSkeletonReport=null;
        densityStats={total:holds.length,coreCount:holds.length,branchCount:0,peak:holds.length,
            fixedSupports:2,routeBudgetValidated:true,hazardCount:0,tutorial:true};
        return report;
    }catch(error){
        ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,
            hearts,labSkeletonReport,labHeartsCache,labStaminaCache,committed,startGrips,moveCount}=previous);
        throw error;
    }
}
