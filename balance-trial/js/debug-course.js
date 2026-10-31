"use strict";
// Runtime-only trials never create an online board, save entry, or life attempt.
let debugCourseChoiceSignature='';
let debugCourseLastSeed=null;
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
    if(!DEBUG_FEATURES_ALLOWED || !debugMode || settingsOpen || mapPreparing || mapTransition || stageStartContext || dailyRun ||
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
        canvas.setAttribute('tabindex','0');if(!featureHelpOpen)canvas.focus();
        updateDebugCourseReport();return true;
    } catch(error) {
        showLevelMap();ui.mapError.textContent=gameText('debug.trialError',{value0:String(error.message||error)});ui.mapError.hidden=false;return false;
    }
}
function updateDebugCourseReport() {
    const trial=activeDebugCourse();ui.debugCourseStatus.hidden=!trial;
    if(!trial)return;
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
    if(debugHelpBefore){featureHelpSeen={...debugHelpBefore};debugHelpBefore=null;}
    debugCourseTrial=null;ui.debugCourseStatus.hidden=true;
}
ui.debugGenerate.onclick=()=>{
    const type=COURSE_TYPES.find(t=>String(t.id)===ui.debugCourseType.value);
    if(type)startDebugCourse(type.id,ui.debugCourseLength.value);
};
ui.debugRegenerate.onclick=()=>{const trial=activeDebugCourse();if(trial)startDebugCourse(trial.typeId,trial.lengthCategory);};
ui.debugCourseExit.onclick=()=>{if(activeDebugCourse())showLevelMap();};
