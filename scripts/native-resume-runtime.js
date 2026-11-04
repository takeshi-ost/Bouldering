'use strict';
// Runs after the classic game definitions and before main's title bootstrap.
(() => {
    const resume=globalThis.ASCENT_NATIVE_RESUME;
    if(!resume)return;
    let pausedAt=null,timerWasRunning=false;
    resume.configure({
        language(){return GAME_TEXT_LANGUAGE;},
        snapshot(spent){return {spent,itemsBefore:heartItems,
            chargeLife:!dailyRun && !debugAttempt && courseMode==='existing' && !isTutorialRun()};},
        pause(){
            if(pausedAt!==null)return;
            pausedAt=performance.now();timerWasRunning=runStartedAt!==null;
            if(timerWasRunning){runElapsedMs=runTimeMs(pausedAt);runStartedAt=null;}
        },
        resume(){
            if(pausedAt===null)return;
            const now=performance.now(),delay=Math.max(0,now-pausedAt);
            if(timerWasRunning)runStartedAt=now-runElapsedMs;
            if(cameraIntro && cameraIntro.start!==null)cameraIntro.start+=delay;
            pausedAt=null;timerWasRunning=false;requestGameRender();
        }
    });
})();
