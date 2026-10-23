"use strict";
// A recipe is fixed before the final search. Search/preview never relocates pickups.
let generatedCourse=null;
const COURSE_INTENTS=['basic','choice','consumption','recovery','mixed'];
function bitCount(mask) {
    let count=0;for(;mask;mask&=mask-1)count++;return count;
}
function coursePickupMask(pickups,mask,from,to) {
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
function chooseCourseIntent() {
    const rating=dailyRun?.difficulty??difficultyForStage(level);
    const weights=COURSE_GENERATION_CONFIG.intentWeights[rating];
    const random=mulberry32(courseSeed() ^ 0x6A48E903);
    let target=random()*weights.reduce((a,b)=>a+b,0);
    for(let i=0;i<weights.length;i++) {target-=weights[i];if(target<0)return COURSE_INTENTS[i];}
    return 'basic';
}
// A pickup may occur while dragging even if the player cancels the release.
// Check a reachable drag segment, using the same support/snapping rules as play.
function findCourseHeartMove(heart,path) {
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
function recipeHearts(path,intent,salt=0) {
    if(!DIFFICULTY_RULES[difficulty].hearts || intent==='basic' || intent==='consumption')return [];
    if(intent==='choice')return makeRouteHearts(level,path,difficulty).map(heart=>{
        const index=path.findIndex(p=>p.x===heart.x && p.y===heart.y);
        const p=path[Math.max(1,index)],from=path[Math.max(0,index-1)];
        const length=distance(from,p)||1,dx=-(p.y-from.y)/length,dy=(p.x-from.x)/length;
        for(const offset of [48,-48,64,-64]) {
            const candidate={...heart,x:clamp(p.x+dx*offset,30,W-30),y:clamp(p.y+dy*offset,80,HEIGHT-40)};
            if(!path.slice(1).some((q,i)=>torsoTouchesHeart(path[i],q,candidate)) && findCourseHeartMove(candidate,path))return candidate;
        }
        return heart;
    });
    const count=intent==='mixed'?2:1;
    const random=mulberry32(courseSeed() ^ 0x7C1A83D5 ^ salt);
    const moves=path.length-1;
    return Array.from({length:count},(_,id)=>{
        const fraction=(id+1)/(count+2);
        const step=Math.max(1,Math.min(moves-1,Math.floor(moves*fraction)+(random()<.5?0:1)));
        return {id,x:path[step].x,y:path[step].y,collected:false};
    });
}
function bindCourseRecipe(intent,path,salt=0) {
    generatedCourse={level,seed:courseSeed(),difficulty,mode:courseMode,holds,intent,
        hearts:recipeHearts(path,intent,salt),hazardPlacement:{routeIds:[],optionalIds:[]}};
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
function applyRouteHazards(path,intent,salt) {
    const rules=DIFFICULTY_RULES[difficulty];
    if(rules.hazards==='none')return false;
    const random=mulberry32(courseSeed() ^ 0x34F62B91 ^ Math.imul(salt+1,0x9E3779B9));
    const protectedIds=new Set(initialGrips.map(h=>h.id));
    const used=new Set(path.flatMap(p=>p.grips||[]));
    const candidates=holds.filter(h=>h.type==='normal' && !h.wide && !protectedIds.has(h.id));
    const ordered=candidates.filter(h=>used.has(h.id)).map(h=>({h,key:random()}))
        .sort((a,b)=>a.key-b.key || a.h.id-b.h.id);
    const lower=intent==='consumption'?1:intent==='mixed'?5:4;
    const upper=intent==='consumption'?3:intent==='mixed'?7:5;
    for(const {h} of ordered) {
        h.type='hazard';
        const cost=routeHazardCosts(path).at(-1)||0;
        if(cost>upper){h.type='normal';continue;}
        if(cost>=lower)break;
    }
    const paid=routeHazardCosts(path).at(-1)||0;
    if(paid<lower || paid>upper)return false;
    const routeIds=holds.filter(h=>h.type==='hazard').map(h=>h.id);
    // Difficulty 2 keeps its existing route-consumption recipes.
    const optionalIds=[];
    generatedCourse.hazardPlacement={routeIds,optionalIds};
    densityStats.hazardCount=routeIds.length+optionalIds.length;
    return true;
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
function finalizeCourseGeneration(intent=chooseCourseIntent()) {
    if(DIFFICULTY_RULES[difficulty].hazards==='dense')return finalizeConvertedCourse(intent);
    const began=performance.now(),base=route,baseHolds=[...holds],baseTypes=holds.map(h=>h.type);
    densityStats.initialRouteOptimization=densityStats.routeOptimization;
    const failures=[];let searchFallback=false,safeFeatureFallback=false;
    // Retain a genuinely cleared safe recipe before attempting any varied recipe.
    bindCourseRecipe(intent==='basic'?'basic':'choice',base);
    if(!validateRouteBudget(base))throw new Error('Initial route cannot clear its base budget');
    const plain=snapshotCourse(base);
    try {
        if(DIFFICULTY_RULES[difficulty].hazards==='dense' || ['basic','choice'].includes(intent))addHazardHolds();
        if(!validateRouteBudget(base))throw new Error('Initial recipe cannot clear its base budget');
    } catch(error) {failures.push(String(error.message||error));safeFeatureFallback=true;restoreCourse(plain);}
    const safe=snapshotCourse(base);
    let selected=safe,attempts=0;
    if(['consumption','recovery','mixed'].includes(intent)) {
        for(let attempt=0;attempt<COURSE_GENERATION_CONFIG.recipeAttempts;attempt++) {
            attempts++;
            holds=[...baseHolds];holds.forEach((h,i)=>h.type=baseTypes[i]);route=base;
            try {
                bindCourseRecipe(intent,base,attempt);
                if(!applyRouteHazards(base,intent,attempt) || !validateRouteBudget(base))continue;
                selected=snapshotCourse(base);break;
            } catch(error) {failures.push(String(error.message||error));}
        }
    }
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
        usedSafeFallback:safeFeatureFallback || (selected===safe && !['basic','choice'].includes(intent)),
        searchFallback,failures,elapsedMs:performance.now()-began};
    densityStats.routeBudgetValidated=true;
    densityStats.hazardCount=holds.filter(h=>h.type==='hazard').length;
    updateStageDensity();
}

// Difficulty 3: freeze ordinary geometry and pickups first, then sample types.
// Never reject a sample just because the original witness now exceeds its budget:
// search the converted layout first, then validate the path actually selected.
function finalizeConvertedCourse(intent) {
    const began=performance.now(),base=route;
    densityStats.initialRouteOptimization=densityStats.routeOptimization;
    bindCourseRecipe(intent,base);
    if(!validateRouteBudget(base))throw new Error('Initial route cannot clear its base budget');
    const plain=snapshotCourse(base),failures=[];
    let accepted=false,attempts=0,searchFallback=false;
    const tryLayout=()=>{
        const solved=solveCostRoute(base,base.length-1+COURSE_GENERATION_CONFIG.maxDetourMoves);
        if(!solved)return false;
        route=optimizeRoute(solved);
        return validateRouteBudget(route);
    };
    for(let attempt=0;attempt<COURSE_GENERATION_CONFIG.recipeAttempts;attempt++) {
        attempts++;
        restoreCourse(plain);
        try {
            if(convertDenseHazards(base,attempt) && tryLayout()){accepted=true;break;}
        } catch(error) {failures.push(String(error.message||error));searchFallback=true;}
    }
    const usedSafeFallback=!accepted;
    if(!accepted) {
        restoreCourse(plain);
        // Same fixed hearts/geometry and the same percentage bounds. Preserve a
        // playable witness only after the ordinary random samples were searched.
        if(!convertDenseHazards(base,attempts,true))throw new Error('Not enough safe holds for fallback hazard ratio');
        const safe=snapshotCourse(base);
        try {accepted=tryLayout();}
        catch(error){failures.push(String(error.message||error));searchFallback=true;}
        if(!accepted)restoreCourse(safe);
    }
    if(!validateRouteBudget(route))throw new Error('Final converted course cannot clear its actual base budget');
    generatedCourse.requestedIntent=intent;
    const classification=classifyCourse(route);
    classification.requested=intent;
    densityStats.courseGeneration={...classification,recipeAttempts:attempts,recipeLimit:COURSE_GENERATION_CONFIG.recipeAttempts,
        usedSafeFallback,searchFallback,failures,elapsedMs:performance.now()-began};
    densityStats.routeBudgetValidated=true;
    densityStats.hazardCount=holds.filter(h=>h.type==='hazard').length;
    updateStageDensity();
}
