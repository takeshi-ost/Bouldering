"use strict";
// A recipe is fixed before the final search. Search/preview never relocates pickups.
let generatedCourse=null;
function bitCount(mask) {
    let count=0;for(;mask;mask&=mask-1)count++;return count;
}
function coursePickupMask(pickups,mask,from,to) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled()&&to.action&&Array.isArray(to.trace))return fingerRouteTraceMask(pickups,mask,to.trace);
    for(let i=0;i<pickups.length;i++)if(!(mask&(1<<i)) && torsoTouchesHeart(from,to,pickups[i]))mask|=1<<i;
    return mask;
}
function routeResources(path,{pickups=createHearts(level,path,difficulty),budget=null}={}) {
    const moves=path.length-1,costs=routeHazardCosts(path);
    const allowance=budget??routeStamina(path);
    let mask=0,net=0,required=1,valid=allowance>0;
    for(let i=1;i<path.length;i++) {
        if(allowance-net<=0)valid=false;
        const next=coursePickupMask(pickups,mask,path[i-1],path[i]);
        net+=1+costs[i]-costs[i-1]-(bitCount(next)-bitCount(mask))*HEART_CONFIG.recovery;
        required=Math.max(required,net+(i===path.length-1?0:1));
        if(net>allowance)valid=false;
        mask=next;
    }
    return {valid:valid && required<=allowance,moves,cost:moves+(costs.at(-1)||0),
        penalties:costs.at(-1)||0,pickupMask:mask,pickups:bitCount(mask),required,
        budget:allowance,remaining:allowance-net};
}
// A pickup may occur while dragging even if the player cancels the release.
// Check a reachable drag segment, using the same support/snapping rules as play.
function findCourseHeartMove(heart,path) {
    if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerFindCourseHeartMove(heart,path);
    const saved={committed,startGrips},byId=new Map(holds.map(h=>[h.id,h]));
    const nearby=path.slice(0,-1).map((p,i)=>({p,i})).sort((a,b)=>distance(a.p,heart)-distance(b.p,heart));
    let checks=0;
    try {
        for(const {p,i} of nearby) {
            committed=p;startGrips=i?p.grips.map(id=>byId.get(id)):[...initialGrips];
            for(const pair of [[0,1],[2,3]])if(!i) {
                const sorted=pair.map(j=>startGrips[j]).sort((a,b)=>a.x-b.x);
                pair.forEach((j,k)=>startGrips[j]=sorted[k]);
            }
            for(const q of [{x:(p.x+heart.x)/2,y:(p.y+heart.y)/2},heart]) {
                if(checks++>=COURSE_GENERATION_CONFIG.heartPlacementChecks)return null;
                if(q.x<STAGE_SAFE_WIDTH+TORSO.width/2 || q.x>W-STAGE_SAFE_WIDTH-TORSO.width/2 || q.y<80 || q.y>HEIGHT-40)continue;
                const anchor=selectAnchor(q.x-p.x,q.y-p.y);
                if(supportsReachable(q,anchor) && supportMotionFraction(p,q,anchor)>=1-1e-9 &&
                    attachMoving(q,anchor)?.every(Boolean) && torsoTouchesHeart(p,q,heart))return {from:p,to:q,anchor};
            }
        }
        return null;
    } finally {committed=saved.committed;startGrips=saved.startGrips;}
}
function bindCourseRecipe(intent,path) {
    generatedCourse={level,seed:courseSeed(),difficulty,typeId:courseTypeId,mode:courseMode,holds,intent,
        hearts:[],hazardPlacement:{routeIds:[],optionalIds:[]}};
}
function snapshotCourse(path) {
    return {holds:[...holds],types:holds.map(h=>h.type),path,
        recipe:{...generatedCourse,hearts:generatedCourse.hearts.map(h=>({...h}))}};
}
function restoreCourse(snapshot) {
    holds=snapshot.holds;
    holds.forEach((h,i)=>h.type=snapshot.types[i]);
    route=snapshot.path;
    generatedCourse={...snapshot.recipe,holds,hearts:snapshot.recipe.hearts.map(h=>({...h}))};
}
function classifyCourse(path) {
    const resources=routeResources(path),budget=routeStamina(path);
    const config={maxTransitions:COURSE_GENERATION_CONFIG.comparisonTransitions,beamWidth:ROUTE_COST_SEARCH_CONFIG.beamWidth};
    const primary=densityStats.costSearch,comparisons={};
    const compare=(name,options)=>{
        const maxMoves=budget+(options.noHearts?0:generatedCourse.hearts.length*HEART_CONFIG.recovery);
        try {
            const alternative=solveCostRoute(path,maxMoves,config,{budget,...options});
            comparisons[name]={...densityStats.costSearch,found:!!alternative,status:'bounded-search'};
            return !!alternative;
        } catch(error) {
            comparisons[name]={found:null,status:'error',limit:config.maxTransitions,transitions:0,error:String(error.message||error)};
            return null;
        }
    };
    let heart='unnecessary',hazard='unnecessary';
    if(resources.pickupMask) {const found=compare('withoutHearts',{noHearts:true});heart=found===null?'unknown':found?'optional':'required-in-search';}
    else if(generatedCourse.hearts.length)heart='optional';
    if(resources.penalties)
        {const found=compare('withoutHazards',{noHazards:true});hazard=found===null?'unknown':found?'optional':'required-in-search';}
    else if(holds.some(h=>h.type==='hazard'))hazard='optional';
    densityStats.costSearch=primary;
    let actual=heart==='required-in-search'?(hazard==='required-in-search'?'mixed':'recovery'):
        hazard==='required-in-search'?'consumption':generatedCourse.hearts.length || holds.some(h=>h.type==='hazard')?'choice':'basic';
    if(generatedCourse.intent==='basic' && heart!=='required-in-search' && hazard!=='required-in-search')actual='basic';
    if(generatedCourse.intent==='recovery' && heart==='required-in-search')actual='recovery';
    if(heart==='unknown' || hazard==='unknown')actual='unclassified';
    return {requested:generatedCourse.intent,actual,heart,hazard,resources,comparisons,
        // Absence in a bounded search is not a mathematical necessity proof.
        necessityScope:'bounded-search',heartResourceRequired:!routeResources(path,{pickups:[],budget}).valid};
}
function finalizeCourseGeneration(intent='basic') {
    // Feature placement is owned by the formal post-process. TYPE-selected
    // consumption/recovery/dense recipes are retired, not silently reclassified.
    if(intent!=='basic')throw new RangeError('Legacy TYPE recipes are retired');
    const began=performance.now(),base=route;
    densityStats.initialRouteOptimization=densityStats.routeOptimization;
    const failures=[];let searchFallback=false,safeFeatureFallback=false;
    // Retain a genuinely cleared safe recipe before attempting any varied recipe.
    bindCourseRecipe(intent,base);
    if(!validateRouteBudget(base))throw new Error('Initial route cannot clear its base budget');
    const plain=snapshotCourse(base);
    try {
        addHazardHolds();
        if(!validateRouteBudget(base))throw new Error('Initial recipe cannot clear its base budget');
    } catch(error) {failures.push(String(error.message||error));safeFeatureFallback=true;restoreCourse(plain);}
    const safe=snapshotCourse(base);
    let selected=safe,attempts=0;
    restoreCourse(selected);
    const fallback=route;
    if(holds.some(h=>h.type==='hazard') || generatedCourse.hearts.length) {
        try {
            const solved=solveCostRoute(route,route.length-1+COURSE_GENERATION_CONFIG.maxDetourMoves);
            route=optimizeRoute(solved||fallback);
        } catch(error) {failures.push(String(error.message||error));searchFallback=true;restoreCourse(selected);}
    }
    if(!validateRouteBudget(route)) {
        restoreCourse(selected);
        if(!validateRouteBudget(route))restoreCourse(safe);
    }
    if(!validateRouteBudget(route))throw new Error('Final course cannot clear its actual base budget');
    generatedCourse.requestedIntent=intent;
    const classification=classifyCourse(route);
    classification.requested=intent;
    densityStats.courseGeneration={...classification,recipeAttempts:attempts,recipeLimit:COURSE_GENERATION_CONFIG.recipeAttempts,
        usedSafeFallback:safeFeatureFallback,
        searchFallback,failures,elapsedMs:performance.now()-began};
    densityStats.routeBudgetValidated=true;
    densityStats.hazardCount=holds.filter(h=>h.type==='hazard').length;
    updateStageDensity();
}
