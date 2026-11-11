"use strict";
// Runtime-only trials never create an online board, save entry, or life attempt.
let debugScorePreparation=null;
function updateDebugCourseReport() {
    const trial=activeDebugCourse();ui.debugCourseStatus.hidden=!trial;
    if(!trial)return;
    ui.debugScoreNext.hidden=false;
    ui.debugScoreNext.disabled=trial.score>=100;
    ui.debugRegenerate.textContent=gameText('debug.score.retry');
    ui.debugCourseSummary.textContent=debugCourseTitle();
    ui.debugCourseVerdict.textContent=CourseProgression.labelForScore(trial.score);
    ui.debugCourseReport.textContent=JSON.stringify({score:trial.score,seed:trial.seed,recipe:activeCourseGeneration?.recipe,retry:activeCourseGeneration?.retry});
}
function endDebugCourseTrial() {
    const job=debugScorePreparation;debugScorePreparation=null;job?.cancel();
    if(ui.debugScoreLoading.open)ui.debugScoreLoading.close();
    if(debugHelpBefore){featureHelpSeen={...debugHelpBefore};debugHelpBefore=null;}
    debugCourseTrial=null;ui.debugCourseStatus.hidden=true;
}
ui.debugRegenerate.onclick=()=>{const trial=activeDebugCourse();if(trial){hideSettings();startDebugScoreTrial(trial.score);}};
ui.debugCourseExit.onclick=()=>{if(activeDebugCourse()){hideSettings();showLevelMap();}};

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
ui.debugScoreNext.onclick=()=>{if(activeDebugScoreTrial() && debugCourseTrial.score<100){hideSettings();startDebugScoreTrial(debugCourseTrial.score+1);}};

ui.debugScoreCancel.onclick=()=>{if(debugScorePreparation)showLevelMap();};
ui.debugScoreLoading.addEventListener('cancel',event=>{event.preventDefault();ui.debugScoreCancel.onclick();});
