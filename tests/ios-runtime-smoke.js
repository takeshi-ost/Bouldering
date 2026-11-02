'use strict';
// Temporary CI harness only. Inject after the real offline native game scripts.
// DOM automation and programmatic gameplay, NOT physical touch/accessibility QA.
(async()=>{
    if(globalThis.__ascentRuntimeSmokeStarted)return;
    globalThis.__ascentRuntimeSmokeStarted=true;
    const bridge=globalThis.webkit?.messageHandlers?.ascentRuntimeSmoke;
    if(!bridge)return;
    const checks=[],captures=[],started=performance.now(),deadline=started+90000;
    let finished=false,phase='startup';
    const post=value=>bridge.postMessage(value);
    const finish=(ok,error='')=>{
        if(finished)return;finished=true;clearTimeout(watchdog);
        post({kind:'result',report:{ok,checks,error,phase,captures,
            automation:'DOM events and programmatic gameplay; not physical touches',
            elapsedMs:Math.round(performance.now()-started)}});
    };
    const watchdog=setTimeout(()=>finish(false,'overall-timeout'),90000);
    const fail=code=>{throw new Error(code);};
    const ensure=(value,code)=>{if(!value)fail(code);};
    const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const node=id=>document.getElementById(id);
    async function wait(predicate,code,ms=10000){
        const end=Math.min(deadline,performance.now()+ms);
        while(!finished&&performance.now()<end){if(predicate())return;await delay(40);}
        fail(code);
    }
    async function frames(){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
    async function capture(name){
        ensure(!captures.includes(name),'duplicate-capture');await frames();
        globalThis.__ascentSmokeCaptureAck=null;
        post({kind:'capture',name});
        await wait(()=>globalThis.__ascentSmokeCaptureAck===name,'capture-ack-timeout',10000);
        captures.push(name);
    }
    const resources=()=>JSON.stringify({stageProgress,stageRecords,heartItems,lives,playsSinceAd,mapRewards,dailyRecords,pending:[...onlineScores.pending]});
    const pose=()=>JSON.stringify({x:body.x,y:body.y,grips:grips.map(h=>h?.id??null),stamina,moveCount});
    function client(p){const rect=canvas.getBoundingClientRect(),scale=rect.width/400,padding=Math.max(0,(rect.height/scale-700)/2);return {clientX:rect.left+p.x*scale,clientY:rect.top+(p.y-camera+padding)*scale};}
    async function readyPage(id){
        await wait(()=>tutorialRun?.explanation?.id===id&&!tutorialRun.transition&&!tutorialRun.imageLoading&&node('tutorialDialog').open&&!node('tutorialContinue').disabled,'tutorial-page-timeout');
        const image=node('tutorialImage');
        ensure(image&&!image.hidden&&image.complete&&image.naturalWidth>0,'tutorial-art-not-decoded');
        ensure(node('tutorialTitle').textContent.length>0&&node('tutorialText').textContent.length>0,'tutorial-copy-empty');
        ensure(node('tutorialTitle').lang==='ja','tutorial-copy-language');
    }
    async function tapPage(id){await readyPage(id);node('tutorialContinue').click();}
    try {
        phase='title';
        await wait(()=>typeof titleReady!=='undefined'&&titleReady&&typeof state!=='undefined'&&state==='choosing','title-not-ready',20000);
        ensure(globalThis.ASCENT_IOS_BUILD?.firebaseEnabled!==true,'not-offline-build');
        ensure(tutorialPending(),'fresh-simulator-required');
        ensure(canvas.width>0&&canvas.height>0,'canvas-empty');
        const unloaded=[...document.images].filter(img=>!img.hidden&&img.getClientRects().length&&img.getAttribute('src')&&(!img.complete||!img.naturalWidth));
        ensure(unloaded.length===0,'visible-title-asset-unloaded');
        checks.push('title-ready-visible-assets-offline');await capture('title');
        const originalResources=resources();
        node('titleScreen').click();
        await wait(()=>isTutorialRun()&&state==='playing','stage0-not-started');
        ensure(level===0,'not-stage0');
        await readyPage('intro-welcome');ensure(!cameraIntro,'camera-intro-not-complete');
        checks.push('natural-camera-intro-completed');await capture('intro-first');
        phase='intro';
        const frozen=pose(),elapsed=runTimeMs();await delay(200);
        ensure(pose()===frozen&&runTimeMs()===elapsed,'intro-not-paused');
        node('tutorialContinue').click();
        ensure(tutorialRun.transition==='closing','tutorial-transition-not-started');
        node('tutorialDialog').click();
        node('tutorialDialog').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true,cancelable:true}));
        ensure(tutorialRun.explanation.id==='intro-welcome','transition-repeat-skipped-page');
        ensure(pose()===frozen,'transition-mutated-gameplay');
        await readyPage('intro-movement');await tapPage('intro-movement');await readyPage('intro-goal');await tapPage('intro-goal');
        await wait(()=>!tutorialInstructionsOpen()&&!featureHelpOpen,'intro-not-dismissed');
        checks.push('three-decoded-intro-pages-pause-repeat-guard');
        phase='settings';
        node('settingsButton').click();await wait(()=>node('settingsDialog').open&&settingsOpen,'settings-not-open');
        const settingsPose=pose();
        const language=node('languageChoice'),oldLanguage=language.value;
        language.value=oldLanguage==='ja'?'en':'ja';language.dispatchEvent(new Event('change',{bubbles:true}));
        ensure(GAME_TEXT_LANGUAGE===language.value,'language-control-failed');
        language.value=oldLanguage;language.dispatchEvent(new Event('change',{bubbles:true}));
        const sound=node('soundEnabled'),oldSound=sound.checked;sound.click();ensure(soundEnabled===!oldSound,'sound-control-failed');sound.click();ensure(soundEnabled===oldSound,'sound-control-restore-failed');
        await capture('stage-settings');
        node('showHelp').click();await wait(()=>node('helpDialog').open,'help-not-open');
        const help=node('helpScroll');await wait(()=>help.scrollHeight>help.clientHeight,'help-not-scrollable');
        // Scrolling a real DOM container is programmatic, not a simulated touch.
        help.scrollTo({top:help.scrollHeight,behavior:'auto'});help.dispatchEvent(new Event('scroll'));await frames();ensure(help.scrollTop>0,'help-scroll-failed');
        await capture('help');node('closeHelp').click();await wait(()=>!node('helpDialog').open,'help-not-closed');
        ensure(node('settingsDialog').open&&pose()===settingsPose,'help-return-mutated-stage');
        node('closeSettings').click();await wait(()=>!settingsOpen&&!node('settingsDialog').open,'settings-not-closed');
        checks.push('stage-settings-language-sound-help-scroll-return');
        phase='programmatic-gameplay';
        let wideSeen=false,goalSeen=false;
        const routePoints=route.slice(1).map(p=>({x:p.x,y:p.y}));ensure(routePoints.length>0&&routePoints.length<=20,'unexpected-tutorial-route');
        for(const target of routePoints){
            ensure(state==='playing'&&!tutorialInstructionsOpen(),'route-state-invalid');
            const beforeMoves=moveCount;
            down(client(body));move(client(target));release();
            await wait(()=>moveCount===beforeMoves+1,'programmatic-move-not-committed',3000);
            if(tutorialRun?.explanation?.id==='center-wide'){await tapPage('center-wide');wideSeen=true;await wait(()=>!tutorialInstructionsOpen(),'wide-page-not-dismissed');}
            if(tutorialRun?.explanation?.id==='goal-fixed'){
                await tapPage('goal-fixed');await readyPage('goal-finish');goalSeen=true;await tapPage('goal-finish');break;
            }
            await delay(200);
        }
        ensure(wideSeen&&goalSeen,'required-route-pages-missing');
        phase='map';await wait(()=>state==='map'&&stageStartContext?.n===1&&node('stageStartDialog').open,'map-stage1-not-ready',15000);
        ensure(!isTutorialRun()&&!tutorialPending(),'tutorial-not-completed');
        ensure(globalThis.AscentTutorialState.snapshot().reason==='cleared','tutorial-not-cleared');
        ensure(resources()===originalResources,'tutorial-changed-free-resources');
        ensure(stageRecords.existing[0]===undefined,'stage0-record-created');
        checks.push('programmatic-route-wide-and-two-goal-pages','map-stage1-prestart-free-resources-preserved');
        await capture('map-start');finish(true);
    } catch(error){
        // Do not return exception messages, URLs, identifiers or saved data.
        const code=typeof error?.message==='string'&&/^[a-z0-9-]{1,70}$/.test(error.message)?error.message:'unexpected-runtime-error';
        finish(false,code);
    }
})();
