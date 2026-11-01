'use strict';
// Owner-approved pages. English intentionally uses the same Japanese copy;
// mark its language explicitly rather than inventing an unapproved translation.
const TUTORIAL_CONFIG={version:'7',steps:[
    {id:'intro-welcome',when:{event:'start'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.intro.welcome"),image:'assets/tutorial-swipe-78-v1.png'},
    {id:'intro-movement',when:{event:'start'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.intro.movement"),image:'assets/tutorial-feet-limit-78-v1.png'},
    {id:'intro-goal',when:{event:'start'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.intro.goal"),image:'assets/tutorial-goal-hands-78-v1.png'},
    {id:'center-wide',when:{event:'hold',hold:'center'},language:'ja',title:gameText("tutorial.title.wide"),text:gameText("tutorial.wide"),image:'assets/hold-wide-flat.webp'},
    {id:'goal-fixed',when:{event:'goal'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.goal.fixed"),image:'assets/tutorial-goal-feet-78-v1.png'},
    {id:'goal-finish',when:{event:'goal'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.goal.finish"),image:'assets/settings-gear.svg'}
]};
function isTutorialRun(){return tutorialRun!==null;}
function tutorialPending(){return globalThis.AscentTutorialState?.pending()===true;}
function tutorialInstructionsOpen(){return !!tutorialRun?.explanation;}
function startTutorialRun() {
    if(state!=='choosing' || isTutorialRun() || !tutorialPending())return false;
    tutorialRun={seen:new Set(),queue:[],explanation:null,centerHoldId:null,timing:false,paused:false,pendingOutcome:null};
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
    if(!tutorialRun)return;
    tutorialRun.explanation=null;tutorialRun.paused=false;featureHelpOpen=false;
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
    // Keep the first terminal outcome while queued pages are being read.
    won=tutorialRun.pendingOutcome??!!won;
    if(won)tutorialTrigger('goal');
    if(tutorialInstructionsOpen() || tutorialRun.queue.length) {
        tutorialRun.pendingOutcome??=won;return true;
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
// Steps are data: {id,when:{event:'start'|'move'|'hold'|'goal',count?,hold?},
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
        if(event==='goal' && (!bothHandsOnGoal(grips) || grips.length!==4 || !grips.every((h,i)=>h && limbReachable(body,h,i))))continue;
        if(!['start','move','hold','goal'].includes(event))continue;
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
    if(!tutorialRun.paused) {
        tutorialRun.timing=runStartedAt!==null;
        if(tutorialRun.timing){runElapsedMs=runTimeMs();runStartedAt=null;}
        tutorialRun.paused=true;
    }
    featureHelpOpen=true;
    const title=document.getElementById('tutorialTitle'),text=document.getElementById('tutorialText'),picture=document.getElementById('tutorialImage');
    title.textContent=step.title||'';title.hidden=!step.title;
    text.textContent=step.text||'';text.hidden=!step.text;
    const language=step.language||GAME_TEXT_LANGUAGE;
    title.setAttribute('lang',language);text.setAttribute('lang',language);
    // Keep the empty image slot in the same grid as the existing heart help.
    picture.hidden=!step.image;
    if(step.image){picture.src=step.image;picture.alt=step.alt||'';}else picture.removeAttribute?.('src');
    const dialog=document.getElementById('tutorialDialog');
    if(!dialog.open)dialog.showModal?.();
    // Read the new page first; keep TAP in the normal Tab order without
    // automatically highlighting its full-width hit target on every page.
    document.getElementById('tutorialContent').focus();requestGameRender();
}
function dismissTutorialExplanation() {
    if(!tutorialInstructionsOpen())return;
    tutorialRun.explanation=null;
    // Consecutive pages replace content inside the SAME open modal. Do not
    // resume timing/input, release focus, or close/reopen the top layer between.
    if(tutorialRun.queue.length){showNextTutorialExplanation();return;}
    const timing=tutorialRun.timing;
    hideTutorialExplanation();
    if(cameraIntro)cameraIntro.start=null;
    if(tutorialRun.pendingOutcome!==null) {finishTutorialRun(tutorialRun.pendingOutcome);return;}
    if(timing)runStartedAt=performance.now()-runElapsedMs;
    canvas.focus();requestGameRender();
}
function advanceTutorialExplanation(event) {
    event?.preventDefault?.();event?.stopPropagation?.();
    dismissTutorialExplanation();
}
document.getElementById('tutorialContinue').onclick=advanceTutorialExplanation;
document.getElementById('tutorialDialog').onclick=advanceTutorialExplanation;
document.getElementById('tutorialDialog').addEventListener('cancel',advanceTutorialExplanation);
document.getElementById('tutorialDialog').addEventListener('keydown',event=>{
    if(event.key==='Enter' || event.key===' ') {
        event.preventDefault();event.stopPropagation?.();
        if(!event.repeat)dismissTutorialExplanation();
    }
});
document.getElementById('tutorialDialog').addEventListener('close',()=>{
    // Ignore delayed close events after a newer modal has opened. An unexpected
    // external close must not leave hidden instructions locking gameplay.
    if(document.getElementById('tutorialDialog').open || !tutorialInstructionsOpen())return;
    showTitleScreen();
});
