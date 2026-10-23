"use strict";
// Refresh presentation only: never reset a course, replay a result, or write scores.
function refreshGameLanguage(previous) {
    const tipIndex=GAMEPLAY_TIPS.indexOf(ui.resultTipText.textContent);
    GAMEPLAY_TIPS.splice(0,GAMEPLAY_TIPS.length,...GAMEPLAY_TIP_KEYS.map(key=>gameText(key)));
    if(tipIndex>=0)ui.resultTipText.textContent=GAMEPLAY_TIPS[tipIndex];
    ui.languageChoice.value=GAME_TEXT_LANGUAGE;
    ui.releaseVersion.textContent=gameText("label.version",{value0:RELEASE_VERSION});
    setOnlineStatus(translateExistingGameText(online.status,previous));
    for(const element of [ui.mapError,ui.dailyError,transferElement('transferStatus')]) {
        if(element?.textContent)element.textContent=translateExistingGameText(element.textContent,previous);
    }
    const pending=document.getElementById('onlineScoreStatus');
    pending.textContent=onlineScores.pending.size?gameText("online-scores.persistPendingScores",{value0:onlineScores.pending.size}):'';
    syncDebugCourseControls();
    dailyEntryToday=null;refreshDailyEntry();
    if(state==='map')renderLevelMap();
    else if(state==='daily')renderDailyCalendar();
    else if(state==='editing')renderCharacterEditor();
    if(['playing','won','lost'].includes(state)) {
        ui.level.textContent=dailyRun?gameText("label.daily",{value0:dailyRun.date.slice(5).replace('-','/')}):gameText("label.stage",{value0:level});
        ui.retry.textContent=gameText(dailyRun?'action.retry':'action.retryEnglish');
        if(state==='won' || state==='lost') {
            ui.resultTitle.textContent=gameText(state==='won'?'result.success':'result.failure');
            if(state==='won') {
                ui.resultStats.textContent=formatStageRecord({moves:moveCount,timeMs:runElapsedMs});
                if(dailyRun)ui.resultDifficulty.textContent=dailyResultDateLabel(dailyRun.date);
            }
        }
    }
    if(stageStartContext) {
        renderStageHeartItems();renderStageStartRecord(stageStartContext);
        ui.stageStartLength.textContent=gameText('course.'+stageLengthInfo(stageStartContext.n).category);
    }
    refreshLives();refreshOpenScoreViews();updateUI();requestGameRender();
}
function dailyResultDateLabel(date) {
    const label=dailyDateLabel(date);
    return GAME_TEXT_LANGUAGE==='ja'?label.replace('(','（').replace(')','）'):label;
}
ui.languageChoice.onchange=()=>{
    if(!settingsOpen || !['map','daily'].includes(state) || transferBusy()) {
        ui.languageChoice.value=GAME_TEXT_LANGUAGE;return;
    }
    setGameLanguage(ui.languageChoice.value);
};
ui.languageChoice.value=GAME_TEXT_LANGUAGE;
