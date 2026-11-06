"use strict";
// Runtime-only trials never create an online board, save entry, or life attempt.
let debugCourseChoiceSignature='';
let debugCourseLastSeed=null;
let debugScorePreparation=null;
function renderDebugCourseChoices() {
    if(!DEBUG_FEATURES_ALLOWED || !debugMode)return;
    const signature=JSON.stringify([COURSE_TYPES,STAGE_CONFIG.lengthRules,GAME_TEXT_LANGUAGE]);
    if(signature===debugCourseChoiceSignature)return;
    debugCourseChoiceSignature=signature;
    const oldType=ui.debugCourseType.value,oldLength=ui.debugCourseLength.value;
    ui.debugCourseType.innerHTML=courseTypeDefinitions().map(t=>`<option value="${scoreText(String(t.id))}">${scoreText(t.id+' '+t.name+' · '+courseTypeLabel(t.id))}</option>`).join('');
    ui.debugCourseLength.innerHTML=STAGE_CONFIG.lengthRules.map(r=>`<option value="${scoreText(r.category)}">${scoreText(courseLengthLabel(r.category))}</option>`).join('');
    ui.debugCourseType.value=COURSE_TYPES.some(t=>String(t.id)===oldType)?oldType:String(COURSE_TYPES[0].id);
    ui.debugCourseLength.value=STAGE_CONFIG.lengthRules.some(r=>r.category===oldLength)?oldLength:STAGE_CONFIG.lengthRules[0].category;
}
function debugCourseDistribution() {
    const trial=activeDebugCourse();if(!trial)throw new Error('No authorized debug trial');
    return {difficulty:courseTypeDefinitions().map(t=>Number(t.id===trial.typeId)),length:STAGE_CONFIG.lengthRules.map(r=>Number(r.category===trial.lengthCategory))};
}
function newDebugCourseSeed() {
    let seed;
    if(globalThis.crypto?.getRandomValues)seed=globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
    else seed=Math.floor(Math.random()*4294967296);
    if(seed===debugCourseLastSeed)seed=(seed+1)>>>0;
    debugCourseLastSeed=seed;return seed;
}
function startDebugCourse(typeId,lengthCategory,seed=null) {
    if(!DEBUG_FEATURES_ALLOWED || !debugMode || debugScorePreparation || settingsOpen || mapPreparing || mapTransition || stageStartContext || dailyRun ||
        !(state==='map' || activeDebugCourse() && ['playing','won','lost'].includes(state)))return false;
    try {
        if(seed===null)seed=newDebugCourseSeed();
        courseTypeRule(typeId);
        if(!STAGE_CONFIG.lengthRules.some(r=>r.category===lengthCategory) || !Number.isSafeInteger(seed) || seed<0 || seed>0xffffffff)throw new RangeError('Invalid debug trial selection');
        if(!debugHelpBefore)debugHelpBefore={...featureHelpSeen};
        debugAttempt=true;debugCourseTrial={typeId,lengthCategory,seed};
        hideStageStart();hideResultModal();
        // Stage 2 avoids the STAGE1-only straight layout; seed is fully independent.
        restartInput(2);
        ui.titleScreen.hidden=true;ui.levelMap.hidden=true;
        updateDebugCourseReport();return true;
    } catch(error) {
        showLevelMap();ui.mapError.textContent=gameText('debug.trialError',{value0:String(error.message||error)});ui.mapError.hidden=false;return false;
    }
}
function updateDebugCourseReport() {
    const trial=activeDebugCourse();ui.debugCourseStatus.hidden=!trial;
    if(!trial)return;
    ui.debugScoreNext.hidden=!activeDebugScoreTrial();
    ui.debugScoreNext.disabled=trial.score>=100;
    ui.debugRegenerate.textContent=activeDebugScoreTrial()?gameText('debug.score.retry'):gameText('debug.regenerate');
    if(activeDebugScoreTrial()){
        ui.debugCourseSummary.textContent=debugCourseTitle();
        ui.debugCourseVerdict.textContent=CourseProgression.labelForScore(trial.score);
        ui.debugCourseReport.textContent=JSON.stringify({score:trial.score,seed:trial.seed,recipe:activeCourseGeneration?.recipe,retry:activeCourseGeneration?.retry});
        return;
    }
    const type=courseTypeRule(trial.typeId),result=densityStats?.courseGeneration;
    const matchesRequested=result?.actual===type.intent;
    ui.debugCourseVerdict.textContent=matchesRequested?gameText("debug.typeMatched"):gameText("debug.typeMismatch");
    ui.debugCourseSummary.textContent='TYPE '+type.id+' / '+ui.debugCourseVerdict.textContent;
    ui.debugCourseReport.textContent=JSON.stringify({seed:trial.seed,typeId:type.id,name:type.name,label:courseTypeLabel(type.id),
        generationDifficulty:type.generationDifficulty,length:trial.lengthCategory,requested:type.intent,
        actual:result?.actual??'unclassified',matchesRequested,safeFallback:result?.usedSafeFallback??null,searchFallback:result?.searchFallback??null,
        necessityScope:result?.necessityScope??null});
}
function endDebugCourseTrial() {
    const job=debugScorePreparation;debugScorePreparation=null;job?.cancel();
    if(ui.debugScoreLoading.open)ui.debugScoreLoading.close();
    if(debugHelpBefore){featureHelpSeen={...debugHelpBefore};debugHelpBefore=null;}
    debugCourseTrial=null;ui.debugCourseStatus.hidden=true;
}
ui.debugGenerate.onclick=()=>{
    const type=COURSE_TYPES.find(t=>String(t.id)===ui.debugCourseType.value);
    if(type)startDebugCourse(type.id,ui.debugCourseLength.value);
};
ui.debugRegenerate.onclick=()=>{const trial=activeDebugCourse();if(activeDebugScoreTrial())startDebugScoreTrial(trial.score);else if(trial)startDebugCourse(trial.typeId,trial.lengthCategory);};
ui.debugCourseExit.onclick=()=>{if(activeDebugCourse())showLevelMap();};

// One fixed sample per integer score, independent of normal stage/SEED settings.
function startDebugScoreTrial(score=1) {
    if(!DEBUG_FEATURES_ALLOWED || !debugMode || !Number.isInteger(score) || score<1 || score>100 ||
        debugScorePreparation || settingsOpen || mapPreparing || mapTransition || stageStartContext || dailyRun || tutorialRun ||
        lifePrompt || dummyAd || adCoverPending || rewardSequence || rewardCoverPending ||
        !(state==='map' || activeDebugScoreTrial() && ['playing','won','lost'].includes(state)))return false;
    try {
        if(!debugHelpBefore)debugHelpBefore={...featureHelpSeen};
        debugAttempt=true;
        debugCourseTrial={kind:'score',score,seed:score+10,typeId:generationTypeForScore(score)};
        hideStageStart();hideResultModal();
        const launch=lease=>{
            if(lease)restartPreparedCourse(lease,2,0,debugCourseTrial);else restartInput(2);
            ui.titleScreen.hidden=true;ui.levelMap.hidden=true;updateDebugCourseReport();
        };
        if(coursePreparationInteractive()){
            const job=prepareCourseAsync(2,debugCourseTrial);debugScorePreparation=job;ui.debugScoreLoading.showModal();
            job.promise.then(lease=>{
                if(debugScorePreparation!==job)return;
                debugScorePreparation=null;ui.debugScoreLoading.close();launch(lease);
            }).catch(error=>{
                if(job.cancelled)return;
                debugScorePreparation=null;showLevelMap();ui.mapError.textContent=gameText('debug.trialError',{value0:String(error.message||error)});ui.mapError.hidden=false;
            });
        }else launch(null);
        return true;
    } catch(error) {
        showLevelMap();ui.mapError.textContent=gameText('debug.trialError',{value0:String(error.message||error)});ui.mapError.hidden=false;return false;
    }
}
ui.debugScoreStart.onclick=()=>startDebugScoreTrial(1);
ui.debugScoreNext.onclick=()=>{if(activeDebugScoreTrial())startDebugScoreTrial(debugCourseTrial.score+1);};

ui.debugScoreCancel.onclick=()=>{if(debugScorePreparation)showLevelMap();};
ui.debugScoreLoading.addEventListener('cancel',event=>{event.preventDefault();ui.debugScoreCancel.onclick();});
