'use strict';
// Explanations are deliberately empty until the owner supplies their content
// and timing. This is a local onboarding mode, never a ranked normal stage 0.
const TUTORIAL_CONFIG={version:'1',steps:[]};
function isTutorialRun(){return tutorialRun!==null;}
function tutorialPending(){return globalThis.AscentTutorialState?.pending()===true;}
function tutorialInstructionsOpen(){return !!tutorialRun?.explanation;}
function startTutorialRun() {
    if(state!=='choosing' || isTutorialRun() || !tutorialPending())return false;
    tutorialRun={seen:new Set(),queue:[],explanation:null,centerHoldId:null,timing:false,pendingOutcome:null};
    try {
        endDebugCourseTrial();leaveDailyRun();debugAttempt=false;
        hideStageStart();cancelMapReveal();
        ui.wall.classList.toggle('title-open',false);
        restartInput(0);
        tutorialRun.centerHoldId=activeCourseGeneration.report.centerHoldId;
        canvas.setAttribute('tabindex','0');
        refreshLives();
        tutorialTrigger('start');
        if(!tutorialInstructionsOpen())canvas.focus();
        return true;
    } catch(error) {
        interruptTutorialRun();
        showTitleScreen();
        const notice=document.getElementById('titleTutorialError');
        notice.textContent=gameText('level-map.selectStage');notice.hidden=false;
        console.error(error);
        return false;
    }
}
function hideTutorialExplanation() {
    if(!tutorialRun?.explanation)return;
    tutorialRun.explanation=null;featureHelpOpen=false;
    const dialog=document.getElementById('tutorialDialog');
    if(dialog.open)dialog.close?.();
}
function interruptTutorialRun() {
    if(!isTutorialRun())return false;
    hideTutorialExplanation();tutorialRun=null;
    // The durable pending marker is intentionally untouched. Reload or return
    // to the title restarts the free tutorial, never charges a suspended attempt.
    undoSnapshot=moveSnapshot=null;runStartedAt=null;level=1;
    return true;
}
function finishTutorialRun(won) {
    if(!isTutorialRun() || state!=='playing')return false;
    if(tutorialInstructionsOpen() || tutorialRun.queue.length) {
        tutorialRun.pendingOutcome??=!!won;return true;
    }
    playSound(won?'clear':'fail');
    runElapsedMs=Math.floor(runTimeMs());runStartedAt=null;
    globalThis.AscentTutorialState?.complete(won);
    hideTutorialExplanation();tutorialRun=null;
    undoSnapshot=moveSnapshot=null;drag=null;cameraIntro=null;level=1;
    hideResultModal();
    showLevelMap({target:1,onReady:()=>openStageStart(1)});
    return true;
}
// Steps are data: {id,when:{event:'start'|'move'|'hold',count?,hold?},
// title?,text?,image?,alt?}. hold:'center' selects the protected central hold.
// No content means no modal. Text uses textContent, never HTML injection.
function tutorialTrigger(event) {
    if(!isTutorialRun() || state!=='playing')return;
    for(const step of TUTORIAL_CONFIG.steps) {
        if(!step || typeof step.id!=='string' || tutorialRun.seen.has(step.id))continue;
        const when=step.when;
        if(!when || when.event!==event)continue;
        if(event==='move' && (!Number.isSafeInteger(when.count) || when.count!==moveCount))continue;
        if(event==='hold') {
            const id=when.hold==='center'?tutorialRun.centerHoldId:when.hold;
            // "Grabbed" is a hand contact, not a foot merely standing on it.
            if(!grips.slice(0,2).some(h=>h?.id===id))continue;
        }
        if(!['start','move','hold'].includes(event))continue;
        const hasText=[step.title,step.text].some(value=>typeof value==='string' && value.trim());
        const validImage=typeof step.image==='string' && /^assets\/[a-zA-Z0-9/_-]+\.(png|webp|svg|jpg|jpeg)$/.test(step.image);
        if(!hasText && !validImage)continue;
        tutorialRun.seen.add(step.id);tutorialRun.queue.push({...step,image:validImage?step.image:null});
    }
    showNextTutorialExplanation();
}
function showNextTutorialExplanation() {
    if(!isTutorialRun() || tutorialRun.explanation || !tutorialRun.queue.length || state!=='playing')return;
    const step=tutorialRun.queue.shift();tutorialRun.explanation=step;
    tutorialRun.timing=runStartedAt!==null;
    if(tutorialRun.timing){runElapsedMs=runTimeMs();runStartedAt=null;}
    featureHelpOpen=true;
    const title=document.getElementById('tutorialTitle'),text=document.getElementById('tutorialText'),picture=document.getElementById('tutorialImage');
    title.textContent=step.title||'';title.hidden=!step.title;
    text.textContent=step.text||'';text.hidden=!step.text;
    picture.hidden=!step.image;
    if(step.image){picture.src=step.image;picture.alt=step.alt||'';}else picture.removeAttribute?.('src');
    document.getElementById('tutorialDialog').showModal?.();
    document.getElementById('tutorialContinue').focus();requestGameRender();
}
function dismissTutorialExplanation() {
    if(!tutorialInstructionsOpen())return;
    const timing=tutorialRun.timing;
    hideTutorialExplanation();
    if(cameraIntro)cameraIntro.start=null;
    if(timing)runStartedAt=performance.now()-runElapsedMs;
    showNextTutorialExplanation();
    if(!tutorialInstructionsOpen() && tutorialRun.pendingOutcome!==null) {finishTutorialRun(tutorialRun.pendingOutcome);return;}
    if(!tutorialInstructionsOpen())canvas.focus();requestGameRender();
}
document.getElementById('tutorialContinue').onclick=dismissTutorialExplanation;
document.getElementById('tutorialDialog').addEventListener('cancel',event=>{event.preventDefault();dismissTutorialExplanation();});
