'use strict';
// Owner-approved pages. English intentionally uses the same Japanese copy;
// mark its language explicitly rather than inventing an unapproved translation.
const TUTORIAL_CONFIG={version:'9',steps:[
    {id:'intro-welcome',when:{event:'start'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.intro.welcome"),image:'assets/tutorial-swipe-78-v1.png'},
    {id:'intro-movement',when:{event:'start'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.intro.movement"),image:'assets/tutorial-feet-limit-78-v2.png'},
    {id:'intro-goal',when:{event:'start'},language:'ja',title:gameText("tutorial.title.play"),text:gameText("tutorial.intro.goal"),image:'assets/tutorial-goal-hands-78-v2.png'},
    {id:'center-wide',when:{event:'hold',hold:'center'},language:'ja',title:gameText("tutorial.title.wide"),text:gameText("tutorial.wide"),image:'assets/hold-wide-flat.webp'},
    {id:'goal-fixed',when:{event:'goal'},language:'ja',title:gameText("tutorial.title.complete"),text:gameText("tutorial.goal.fixed"),image:'assets/tutorial-goal-feet-78-v2.png'},
    {id:'goal-finish',when:{event:'goal'},language:'ja',title:gameText("tutorial.title.complete"),text:gameText("tutorial.goal.finish"),image:'assets/settings-gear.svg'}
]};
function isTutorialRun(){return tutorialRun!==null;}
function tutorialPending(){return globalThis.AscentTutorialState?.pending()===true;}
function tutorialInstructionsOpen(){return !!tutorialRun?.explanation;}
function startTutorialRun() {
    if(state!=='choosing' || isTutorialRun() || !tutorialPending())return false;
    tutorialRun={seen:new Set(),queue:[],explanation:null,centerHoldId:null,introReady:false,timing:false,paused:false,pendingOutcome:null,transition:null,transitionTimer:null,imageLoading:false,imageTicket:0};
    try {
        endDebugCourseTrial();leaveDailyRun();debugAttempt=false;
        hideStageStart();cancelMapReveal();
        ui.wall.classList.toggle('title-open',false);
        restartInput(0);
        tutorialRun.centerHoldId=activeCourseGeneration.report.centerHoldId;
        canvas.setAttribute('tabindex','0');
        refreshLives();
        // The camera intro owns the start trigger, at the playable boundary.
        canvas.focus();
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
// Invoked synchronously by advanceCameraIntro before the next input event.
function tutorialReadyToPlay() {
    if(!isTutorialRun() || state!=='playing' || cameraIntro || tutorialRun.introReady)return;
    tutorialRun.introReady=true;
    tutorialTrigger('start');
    if(tutorialInstructionsOpen())runElapsedMs=0; // No opening/reading time charged.
}
function hideTutorialExplanation() {
    if(!tutorialRun)return;
    clearTimeout(tutorialRun.transitionTimer);
    tutorialRun.imageTicket++;tutorialRun.imageLoading=false;
    tutorialRun.transitionTimer=null;tutorialRun.transition=null;
    document.getElementById('tutorialDialog').classList.remove('tutorial-page-closing');
    document.getElementById('tutorialDialog').classList.remove('explanation-image-loading');
    document.getElementById('tutorialContent').setAttribute('aria-busy','false');
    document.getElementById('tutorialContinue').disabled=false;
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
    if(event==='start' && (!tutorialRun.introReady || cameraIntro))return;
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
function showNextTutorialExplanation(whenReady=null) {
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
    const run=tutorialRun,ticket=++run.imageTicket;
    run.imageLoading=true;
    const dialog=document.getElementById('tutorialDialog');
    dialog.classList.add('explanation-image-loading');
    document.getElementById('tutorialContinue').disabled=true;
    document.getElementById('tutorialContent').setAttribute('aria-busy','true');
    requestExplanationImage(step.image,image=>{
        if(tutorialRun!==run || run.imageTicket!==ticket || state!=='playing')return;
        mountExplanationImage(picture,image,{id:'tutorialImage',alt:step.alt||''});
        run.imageLoading=false;
        dialog.classList.remove('explanation-image-loading');
        if(!dialog.open)dialog.showModal?.();
        if(!run.transition) {
            document.getElementById('tutorialContinue').disabled=false;
            document.getElementById('tutorialContent').setAttribute('aria-busy','false');
        }
        // Mount the already-decoded node before revealing/focusing the card.
        document.getElementById('tutorialContent').focus();requestGameRender();
        whenReady?.();
    });
}
// Keep the native modal's input shield open while the card visibly closes,
// stays absent for 80ms, and reopens. No input/timer gap or native close race.
const TUTORIAL_PAGE_TRANSITION={closeMs:120,gapMs:80,openMs:160};
function transitionTutorialExplanation() {
    const run=tutorialRun,dialog=document.getElementById('tutorialDialog');
    run.transition='closing';
    document.getElementById('tutorialContinue').disabled=true;
    document.getElementById('tutorialContent').setAttribute('aria-busy','true');
    dialog.classList.add('tutorial-page-closing');
    run.transitionTimer=setTimeout(()=>{
        if(tutorialRun!==run || state!=='playing')return;
        run.transition='loading';run.explanation=null;
        showNextTutorialExplanation(()=>{
            run.transition='opening';dialog.classList.remove('tutorial-page-closing');
            run.transitionTimer=setTimeout(()=>{
                if(tutorialRun!==run || state!=='playing')return;
                run.transition=null;run.transitionTimer=null;
                document.getElementById('tutorialContinue').disabled=false;
                document.getElementById('tutorialContent').setAttribute('aria-busy','false');
            },TUTORIAL_PAGE_TRANSITION.openMs);
        });
    },TUTORIAL_PAGE_TRANSITION.closeMs+TUTORIAL_PAGE_TRANSITION.gapMs);
}
function dismissTutorialExplanation() {
    if(!tutorialInstructionsOpen() || tutorialRun.transition || tutorialRun.imageLoading)return;
    playSound('move'); // Same confirmation cue as committing limb placement.
    if(tutorialRun.queue.length){transitionTutorialExplanation();return;}
    const timing=tutorialRun.timing;
    hideTutorialExplanation();
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

// Start requests during title preparation, but retain the playable-boundary trigger.
preloadExplanationImages([...TUTORIAL_CONFIG.steps.map(step=>step.image),COURSE_HEART_IMAGE_SRC,'assets/hold-hazard-source.webp']);
