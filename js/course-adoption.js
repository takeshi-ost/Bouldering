'use strict';
// Production-only adapter. Does not replace persistence, network, UI, rewards,
// normal retry/navigation, native services or player identity.
const COURSE_STAMINA_CONFIG = {version:'1', rules:'0:3'};
// Versioned geometry-only retry policy: original seed counts as attempt 1.
// The core already bounds each search; this cap also bounds the outer retry.
const COURSE_RETRY_CONFIG = Object.freeze({version:'1',maxAttempts:32});
let activeCourseGeneration = null;
// Session-only validated geometry. No storage, account, reward or live run state.
// Bump this schema when adding generation inputs or changing the snapshot shape.
const ADOPTED_COURSE_CACHE_VERSION='2';
const ADOPTED_COURSE_CACHE_CAPACITY=12;
const adoptedCourseCache=new Map();
const adoptedCourseFunctionIds=new WeakMap();
let adoptedCourseNextFunctionId=1;
let adoptedCourseLastSignature=null;
function clearAdoptedCourseCache(){
    adoptedCourseCache.clear();
    if(typeof stagePreviewCache!=='undefined')stagePreviewCache.clear();
}
function refreshAdoptedCourseCacheDependencies(){
    const signature=adoptedCourseCacheSignature();
    if(signature!==adoptedCourseLastSignature){
        clearAdoptedCourseCache();adoptedCourseLastSignature=signature;
    }
    return signature;
}
function adoptedCourseClone(value,seen=new Map()) {
    if(!value||typeof value!=='object')return value;
    if(seen.has(value))return seen.get(value);
    const copy=Array.isArray(value)?[]:{};seen.set(value,copy);
    for(const key of Object.keys(value))copy[key]=adoptedCourseClone(value[key],seen);
    return copy;
}
function freezeAdoptedCourse(value,seen=new Set()) {
    if(!value||typeof value!=='object'||seen.has(value))return value;
    seen.add(value);Object.values(value).forEach(item=>freezeAdoptedCourse(item,seen));
    return Object.freeze(value);
}
function adoptedCourseCacheInputs() {
    // Historical baseline fixtures intentionally omit the new input modules.
    // Keep their uncached generation path unchanged, including injected hooks.
    if(typeof fingerAimEnabled!=='function'||!fingerAimEnabled()||
        typeof coupledBodyEnabled!=='function'||!coupledBodyEnabled())return null;
    // Reference identities invalidate hot-swapped test/diagnostic hooks, including
    // lower-level physics and solver helpers, before a hit can skip validation.
    const inputs=[ADOPTED_COURSE_CACHE_VERSION,COURSE_VERSION,DAILY_COURSE_VERSION,
        LAB_SKELETON_VERSION,FINGER_AIM_MODEL,COUPLED_BODY_MODEL,COUPLED_BODY_CONFIG,
        fingerAimEnabled(),coupledBodyEnabled(),fingerRouteSearchStrategy,fingerInputIdentity(),fingerAimGain(),W,H,R,MAX_HEIGHT,STAGE_SAFE_WIDTH,
        TORSO,LIMB_LENGTHS,limbs,POSE_CONFIG,HIGH_FOOT_REACH_RATIO,HOLD_SPACING,
        STAGE_CONFIG,DIFFICULTY_CONFIG,DIFFICULTY_RULES,COURSE_TYPES,HOLD_CONFIG,
        DENSITY_CONFIG,HEART_CONFIG,HAZARD_CONFIG,INPUT_CONFIG,CAMERA_CONFIG,
        COURSE_GENERATION_CONFIG,ROUTE_COST_SEARCH_CONFIG,ROUTE_OPTIMIZATION_CONFIG,
        CourseProgressionConfig,CourseDistributionConfig,COURSE_STAMINA_CONFIG,
        COURSE_RETRY_CONFIG,STRAIGHT_SUPPORT_CONFIG,labHasStraightProfile,labStraightSupportOwned,labStraightSupportDistance,labStraightSupportIds,labRecordStraightSupports,labTrimStraightSupports,labHalfStraightSupportSelection,labThinStraightSupports,CourseProgression,CourseDistribution,LabStaminaSettings,
        mulberry32,gripAim,isTraverse,insideStartTriangle,weightedItemId,
        difficultyRule,courseTypeDefinitions,courseTypeRule,courseTypeLabel,weightedCourseType,
        validateCourseDistribution,stageDistribution,dailyDistribution,generationTypeForScore,courseTypeForStage,
        difficultyForStage,makeStageCourse,stageLengthRule,courseLengthLabel,stageLayout,
        resolvedCourseLengthInfo,stageLengthInfo,createStageGenerator,fingerAimEnabled,fingerAimGain,
        withFingerAimDisabled,fingerInputIdentity,fingerAimTarget,fingerAction,validFingerAction,
        fingerGestureStep,fingerGestureReplay,coupledBodyEnabled,coupledInputPath,coupledSupportGeometry,
        coupledBodyStep,coupledGestureReplay,fingerRouteInitial,fingerRouteAction,fingerResampledAction,
        fingerRouteSampleStable,fingerRouteEntry,fingerRouteTraceMask,fingerRouteTouchesHeart,fingerReplayRoute,
        fingerSamePairRoute,fingerRouteCandidates,fingerRouteProgress,withFingerRouteSearchStrategy,fingerPartialSearchBounded,fingerPartialSearch,fingerSolveRoute,
        fingerSolveCostRoute,fingerOptimizeRoute,fingerValidateDragReference,fingerFindCourseHeartMove,fingerFindHazardMove,
        requiresLegacyTraverse,solveRoute,replayRoute,optimizeRoute,prepareStage,
        samePairRoute,pruneUnusedHolds,updateStageDensity,assignWideHolds,hasHazardFallbackCandidates,
        reserveDenseCandidates,solveCostRoute,validateRouteBudget,bitCount,coursePickupMask,
        routeResources,chooseCourseIntent,findCourseHeartMove,recipeHearts,bindCourseRecipe,
        snapshotCourse,restoreCourse,applyRouteHazards,classifyCourse,finalizeCourseGeneration,
        finalizeConvertedCourse,findHazardMove,addHazardHolds,convertDenseHazards,classifyNativeCourseGeometryRejection,
        labPrepareSpikes,labStraightDirection,labCreateOriginalLayout,labReplayPartial,labPartialSearch,
        labColumnPartialSearch,labColumnNaturalScatter,labColumnSideSearch,labColumnOffsets,labGenerateBranchSkeleton,
        labContrastGuideCenter,labContrastSpreadMetrics,labContrastProtectedSample,labGenerateContrastSkeleton,labCompositeOriginalLayout,
        labRepairBranchJoin,labGenerateCompositeSourceSkeleton,labGenerateCompositeSkeleton,labSwitchbackSearch,labCreateSwitchbackLayout,labSwitchbackPathFeatures,
        labBuildSwitchbackWitness,labValidateRecoveryDragReference,labAssertRecoveryDragReference,labRecoverSwitchbackWitness,labSwitchbackCompositeGeometry,
        labSolveCompositeSwitchbacks,labCompositeSwitchbackFeatures,labGenerateSwitchbackSkeleton,labGenerateSkeleton,labPrepareHearts,
        labHeartStaminaAdjustment,labPrepareStaminaAdjustment,generateCourseFromRecipe,courseSeed,cameraTop,
        limbReachable,supportMotionFraction,supportPairReach,movingLimbHasForwardHold,goalSupportDistance,
        selectAnchor,selectAnchorBaseline,
        ...(typeof SixPairSelection!=='undefined'?[SixPairSelection.select,SixPairSelection.plan]:[]),canShareHold,attachMoving,stageStamina,newHazardContacts,
        routeHazardCosts,routeMoveCost,routeConsumption,routeExpectedMoves,routeStamina,
        createHearts,makeRouteHearts,torsoTouchesHeart,limbRoot,bothHandsOnGoal,
        sameContacts,isSupportPair,supportsReachable,
        adoptedCourseCacheInputs,adoptedCourseRequest,adoptedCourseSnapshot,
        adoptedCourseCacheKey,cacheAdoptedCourseSnapshot,restoreAdoptedCourseCache,
        adoptedCourseClone,freezeAdoptedCourse,prepareAdoptedCourse,
        coursePreparationIdentity,coursePreparationRuntimeConfig,validatePreparedCourse,assertPreparedCourse,
    ];
    return inputs;
}
function adoptedCourseCacheSignature() {
    const inputs=adoptedCourseCacheInputs();
    if(inputs===null)return null;
    return JSON.stringify(inputs,(_key,value)=>{
        if(typeof value!=='function')return value;
        if(!adoptedCourseFunctionIds.has(value))adoptedCourseFunctionIds.set(value,adoptedCourseNextFunctionId++);
        return {courseFunction:adoptedCourseFunctionIds.get(value)};
    });
}
// Shared, state-free identity used by previews, the worker and launch leases.
function resolveDebugScoreCourse(profile){
    if(!Number.isInteger(profile.score)||profile.score<1||profile.score>100||profile.seed!==profile.score+10)throw new RangeError('Invalid debug score');
    return {kind:'debug-score',score:profile.score,seed:profile.seed,difficultyLabel:CourseProgression.labelForScore(profile.score),progressionVersion:CourseProgressionConfig.version};
}
function adoptedCourseRequest(n,profile=null) {
    const resolved=profile?.kind==='score'?resolveDebugScoreCourse(profile):profile?CourseProgression.resolveDaily(profile.date):CourseProgression.resolveStage(n);
    const typeId=profile?.typeId??courseTypeForStage(n);
    return {level:n,difficulty:courseTypeRule(typeId).generationDifficulty,courseTypeId:typeId,
        mode:'existing',date:profile?.date??null,resolved,
        sampled:{...CourseProgression.recipe(resolved),stage:profile && profile.kind!=='score'?1:n,staminaRules:COURSE_STAMINA_CONFIG.rules}};
}
function adoptedCourseCacheKey(request,signature=refreshAdoptedCourseCacheDependencies()) {
    return signature===null?null:JSON.stringify([signature,request.resolved,request.sampled,
        request.level,request.difficulty,request.courseTypeId,request.mode,request.date]);
}
function adoptedCourseSnapshot() {
    return {holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,
        activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
}
function cacheAdoptedCourseSnapshot(key,snapshot) {
    if(key===null)return;
    adoptedCourseCache.delete(key);
    if(adoptedCourseCache.size>=ADOPTED_COURSE_CACHE_CAPACITY)
        adoptedCourseCache.delete(adoptedCourseCache.keys().next().value);
    adoptedCourseCache.set(key,snapshot);
}
let adoptedCourseLaunchLease=null;
function restoreAdoptedCourseCache(snapshot) {
    // Clone the whole graph so shared holds/report nodes remain shared within
    // this generation, but never with another run or the frozen cache entry.
    const fresh=adoptedCourseClone(snapshot);
    ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,
        activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=fresh);
    Object.freeze(activeCourseGeneration.recipe);Object.freeze(activeCourseGeneration.retry);
    if(generatedCourse)generatedCourse.holds=holds;
}

function prepareAdoptedCourse() {
    if(adoptedCourseLaunchLease) {
        assertPreparedCourse(adoptedCourseLaunchLease,level,activeDebugScoreTrial()?debugCourseTrial:dailyRun);
        restoreAdoptedCourseCache(adoptedCourseLaunchLease.snapshot);
        if(dailyRun)dailyRun.seed=adoptedCourseLaunchLease.request.resolved.seed;
        return;
    }
    const resolved=activeDebugScoreTrial()?resolveDebugScoreCourse(debugCourseTrial):
        dailyRun?CourseProgression.resolveDaily(dailyRun.date):CourseProgression.resolveStage(level);
    // Sample exactly once. Never let a rejected placement resample its score,
    // length, profiles/composition, heart caps, spikes or stamina bonus rules.
    const sampled=Object.freeze({...CourseProgression.recipe(resolved),stage:dailyRun?1:level,
        staminaRules:COURSE_STAMINA_CONFIG.rules});
    const identity={level,difficulty,courseTypeId,courseSeed};
    const previous={holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,hearts,
        activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache};
    const restorePrevious=()=>{
        ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,hearts,
            activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=previous);
    };
    try {
        const signature=refreshAdoptedCourseCacheDependencies();
        const cacheKey=signature===null?null:JSON.stringify([signature,resolved,sampled,
            identity.level,identity.difficulty,identity.courseTypeId,courseMode,dailyRun?.date??null]);
        if(cacheKey!==null&&adoptedCourseCache.has(cacheKey)) {
            const snapshot=adoptedCourseCache.get(cacheKey);
            restoreAdoptedCourseCache(snapshot);
            adoptedCourseCache.delete(cacheKey);adoptedCourseCache.set(cacheKey,snapshot);
            if(dailyRun)dailyRun.seed=resolved.seed;
            return;
        }
        let failure;
        for(let attempt=0;attempt<COURSE_RETRY_CONFIG.maxAttempts;attempt++) {
            restorePrevious();
            ({level,difficulty,courseTypeId}=identity);
            activeCourseGeneration=null;generatedCourse=null;
            labSkeletonReport=null;labHeartsCache=null;labStaminaCache=null;
            const geometrySeed=(resolved.seed+attempt)>>>0;
            const recipe=Object.freeze({...sampled,seed:geometrySeed});
            const retry=Object.freeze({version:COURSE_RETRY_CONFIG.version,initialSeed:resolved.seed,
                geometrySeed,attempts:attempt+1,maxAttempts:COURSE_RETRY_CONFIG.maxAttempts});
            courseSeed=()=>geometrySeed;
            try {
                // All placement/postprocessing randomness uses the same effective
                // seed. The core's temporary level 1/2 and difficulty 0 may not
                // escape to stage/day identity, score records or progression.
                const build=()=>{
                    labGenerateSkeleton(recipe);
                    labPrepareSpikes(recipe);
                    labPrepareHearts(recipe);
                    labPrepareStaminaAdjustment(recipe);
                };
                // Generation and its recorded witnesses intentionally retain the
                // baseline selection model. A changed live input direction alone
                // is not a reason to reject/reseed an otherwise valid layout.
                // Alternative live input is verified separately, not searched here.
                if(typeof SixPairSelection==='undefined')build();
                else SixPairSelection.withBaseline(build);
            } catch(error) {
                // Configuration/programming failures must not be disguised as a
                // rejected seed. Only explicitly classified finite rejections retry.
                if(!(error instanceof CourseGeometryRejection))throw error;
                failure=error;
                if(attempt+1<COURSE_RETRY_CONFIG.maxAttempts)continue;
                const exhausted=new Error('Course generation exhausted '+retry.attempts+
                    ' deterministic seed attempts: '+failure.message,{cause:failure});
                exhausted.code='COURSE_GENERATION_EXHAUSTED';exhausted.retry=retry;
                throw exhausted;
            }
            activeCourseGeneration={resolved,recipe,retry,report:labSkeletonReport,
                initialStamina:labStaminaCache.initialStamina};
            if(generatedCourse)Object.assign(generatedCourse,{level:identity.level,difficulty:identity.difficulty,
                typeId:identity.courseTypeId,holds,seed:resolved.seed,geometrySeed,
                generationRetryVersion:retry.version,mode:'existing',generationScore:resolved.score});
            // Capture only after every validation/postprocess succeeds. Live
            // hearts and resources are deliberately left to the normal reset.
            if(cacheKey!==null) {
                const snapshot=freezeAdoptedCourse(adoptedCourseClone(adoptedCourseSnapshot()));
                cacheAdoptedCourseSnapshot(cacheKey,snapshot);
            }
            if(dailyRun)dailyRun.seed=resolved.seed;
            return;
        }
    } catch(error) {
        restorePrevious();
        throw error; // Existing normal/Daily launch handlers show failure, not another recipe.
    } finally {
        ({level,difficulty,courseTypeId,courseSeed}=identity);
    }
}
function currentCourseInitialStamina() {
    return activeCourseGeneration?activeCourseGeneration.initialStamina:routeStamina(route);
}
