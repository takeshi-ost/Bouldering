'use strict';
// Production-only adapter. Does not replace persistence, network, UI, rewards,
// normal retry/navigation, native services or player identity.
const COURSE_STAMINA_CONFIG = {version:'1', rules:'0:3'};
// Versioned geometry-only retry policy: original seed counts as attempt 1.
// The core already bounds each search; this cap also bounds the outer retry.
const COURSE_RETRY_CONFIG = Object.freeze({version:'1',maxAttempts:32});
let activeCourseGeneration = null;
function prepareAdoptedCourse() {
    const resolved=dailyRun?CourseProgression.resolveDaily(dailyRun.date):CourseProgression.resolveStage(level);
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
                labGenerateSkeleton(recipe);
                labPrepareSpikes(recipe);
                labPrepareHearts(recipe);
                labPrepareStaminaAdjustment(recipe);
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
