'use strict';
// Temporary CI harness only. Inject after the real offline native game scripts.
// DOM automation and programmatic gameplay, NOT physical touch/accessibility QA.
(async()=>{
    if(globalThis.__ascentRuntimeSmokeStarted)return;
    globalThis.__ascentRuntimeSmokeStarted=true;
    const bridge=globalThis.webkit?.messageHandlers?.ascentRuntimeSmoke;
    if(!bridge)return;
    const checks=[],captures=[],started=performance.now(),deadline=started+90000;
    let finished=false,phase='startup',restoreWorkerObservation=()=>{};
    const post=value=>bridge.postMessage(value);
    const finish=(ok,error='')=>{
        if(finished)return;finished=true;clearTimeout(watchdog);restoreWorkerObservation();
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
    const nonConsumables=()=>JSON.stringify({stageProgress,stageRecords,playsSinceAd,mapRewards,dailyRecords,pending:[...onlineScores.pending]});
    const pose=()=>JSON.stringify({x:body.x,y:body.y,grips:grips.map(h=>h?.id??null),stamina,moveCount});
    // Observe actual platform Workers only in this disposable harness. Forward
    // the original URL, options, requests and results unchanged; never synthesize
    // a ready message, geometry, input witness or a worker implementation.
    function observeCourseWorkers(){
        const NativeWorker=globalThis.Worker,observed=[];
        ensure(typeof NativeWorker==='function','native-worker-api-missing');
        function ObservedWorker(url,options){
            const worker=new NativeWorker(url,options);
            const entry={worker,url:new URL(String(url),document.baseURI),options,messages:[],errors:0,terminations:0};
            ensure(worker instanceof NativeWorker,'native-worker-instance-missing');
            observed.push(entry);
            worker.addEventListener('message',event=>entry.messages.push(event.data));
            worker.addEventListener('error',()=>entry.errors++);
            worker.addEventListener('messageerror',()=>entry.errors++);
            const terminate=worker.terminate;
            worker.terminate=function(){entry.terminations++;return terminate.call(worker);};
            return worker;
        }
        Object.setPrototypeOf(ObservedWorker,NativeWorker);ObservedWorker.prototype=NativeWorker.prototype;
        globalThis.Worker=ObservedWorker;
        restoreWorkerObservation=()=>{if(globalThis.Worker===ObservedWorker)globalThis.Worker=NativeWorker;};
        return observed;
    }
    function verifyWorkerOrigin(entry){
        const base=new URL(document.baseURI),expected=new URL('js/course-worker.js?v='+globalThis.ASCENT_COURSE_BUILD.id,base);
        ensure(base.protocol==='capacitor:'&&entry.url.protocol===base.protocol&&entry.url.host===base.host&&entry.url.href===expected.href,'worker-not-same-origin-capacitor-bundle');
        ensure(entry.options?.name==='ascent-course-preparation'&&(!entry.options.type||entry.options.type==='classic'),'worker-not-classic-course-bundle');
    }
    function client(p){const rect=canvas.getBoundingClientRect(),scale=rect.width/400,padding=Math.max(0,(rect.height/scale-700)/2);return {clientX:rect.left+p.x*scale,clientY:rect.top+(p.y-camera+padding)*scale};}
    async function readyPage(id){
        await wait(()=>tutorialRun?.explanation?.id===id&&!tutorialRun.transition&&!tutorialRun.imageLoading&&node('tutorialDialog').open&&!node('tutorialContinue').disabled,'tutorial-page-timeout');
        const image=node('tutorialImage');
        ensure(image&&!image.hidden&&image.complete&&image.naturalWidth>0,'tutorial-art-not-decoded');
        ensure(node('tutorialTitle').textContent.length>0&&node('tutorialText').textContent.length>0,'tutorial-copy-empty');
        const step=tutorialRun.explanation,selectedLanguage=GAME_TEXT_LANGUAGE;
        const beforePose=pose(),beforeResources=resources();
        ensure(selectedLanguage==='ja'||selectedLanguage==='en','tutorial-selected-language');
        // Exercise both real translations on every page, then restore the
        // device-selected language. A Japanese-only assertion hid this path.
        for(const language of ['ja','en']){
            setGameLanguage(language);
            ensure(node('tutorialTitle').lang===language&&node('tutorialText').lang===language,'tutorial-copy-language');
            ensure(node('tutorialTitle').textContent===GAME_TEXT_LOCALES[language][step.titleKey],'tutorial-title-translation');
            ensure(node('tutorialText').textContent===GAME_TEXT_LOCALES[language][step.textKey],'tutorial-text-translation');
        }
        setGameLanguage(selectedLanguage);
        ensure(GAME_TEXT_LANGUAGE===selectedLanguage&&node('tutorialTitle').lang===selectedLanguage,'tutorial-language-restore');
        ensure(tutorialRun.explanation===step&&pose()===beforePose&&resources()===beforeResources,'tutorial-language-mutated-gameplay');
    }
    async function tapPage(id){await readyPage(id);node('tutorialContinue').click();}
    try {
        phase='title';
        await wait(()=>typeof titleReady!=='undefined'&&titleReady&&typeof state!=='undefined'&&state==='choosing','title-not-ready',20000);
        ensure(globalThis.ASCENT_IOS_BUILD?.firebaseEnabled!==true,'not-offline-build');
        ensure(tutorialPending(),'fresh-simulator-required');
        const preferredLanguage=globalThis.ASCENT_IOS_BUILD?.preferredLanguage;
        ensure(typeof preferredLanguage==='string','native-language-metadata-missing');
        const expectedLanguage=/^ja(?:-|$)/i.test(preferredLanguage.trim().replace(/_/g,'-'))?'ja':'en';
        ensure(GAME_TEXT_LANGUAGE===expectedLanguage,'native-initial-language-selection');
        ensure(localStorage.getItem('ascent.language.v1')===expectedLanguage,'native-initial-language-persistence');
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
        node('tutorialDialog').click();
        ensure(tutorialRun.explanation.id==='intro-welcome','transition-repeat-skipped-page');
        ensure(pose()===frozen,'transition-mutated-gameplay');
        await readyPage('intro-movement');await tapPage('intro-movement');await readyPage('intro-goal');await tapPage('intro-goal');
        await wait(()=>!tutorialInstructionsOpen()&&!featureHelpOpen,'intro-not-dismissed');
        checks.push('three-decoded-intro-pages-pause-repeat-guard','native-initial-language-and-ja-en-page-translations');
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
        let goalSeen=false,moveHelpSeen=false;
        ensure(!holds.some(h=>h.wide&&h.type!=='start'),'tutorial-nonstart-wide');
        ensure(stamina===activeCourseGeneration.report.initialStamina,'tutorial-stamina-mismatch');
        const routePoints=route.slice(1);ensure(routePoints.length>0&&routePoints.length<=20,'unexpected-tutorial-route');
        for(const target of routePoints){
            ensure(state==='playing'&&!tutorialInstructionsOpen(),'route-state-invalid');
            const beforeMoves=moveCount;
            ensure(validFingerAction(target.action)&&target.action.bodyMotion===COUPLED_BODY_MODEL,'missing-coupled-gesture-witness');
            const origin=client(body),scale=canvas.getBoundingClientRect().width/W;
            down(origin);
            for(const delta of target.action.points)move({clientX:origin.clientX+delta.dx*scale,clientY:origin.clientY+delta.dy*scale});
            release();
            await wait(()=>moveCount===beforeMoves+1,'programmatic-move-not-committed',3000);
            ensure(grips.every((h,index)=>h?.id===target.grips[index]&&limbReachable(body,h,index)),'programmatic-route-contacts-mismatch');
            if(moveCount<4)ensure(!tutorialInstructionsOpen(),'move-help-opened-before-four');
            if(moveCount===4){
                ensure(!moveHelpSeen,'move-help-repeated');
                phase='fourth-move-help';
                const helpPose=pose(),helpResources=resources();
                for(const [id,imagePath] of [
                    ['move-cancel','assets/tutorial-two-finger-cancel-78-v1.png'],
                    ['move-undo','assets/help-body-tap-78-v1.png']]){
                    await readyPage(id); // Includes JA/EN title/text and decoded image assertions.
                    ensure(new URL(node('tutorialImage').src).pathname.endsWith('/'+imagePath),'move-help-image-mismatch');
                    ensure(moveCount===4&&pose()===helpPose&&resources()===helpResources,'move-help-mutated-gameplay');
                    const helpElapsed=runTimeMs();await delay(200);
                    undoMove();down(client(body));release();tutorialTrigger('move');
                    ensure(pose()===helpPose&&resources()===helpResources&&runTimeMs()===helpElapsed,'move-help-input-not-paused');
                    ensure(tutorialRun.explanation.id===id,'move-help-order-changed');
                    node('tutorialContinue').click();
                    node('tutorialDialog').click();node('tutorialDialog').click();
                    ensure(tutorialRun.explanation.id===id,'move-help-repeat-skipped-page');
                }
                await wait(()=>!tutorialInstructionsOpen(),'move-help-not-dismissed');
                ensure(pose()===helpPose&&resources()===helpResources,'move-help-dismiss-mutated-gameplay');
                moveHelpSeen=true;
                checks.push('fourth-confirmed-move-two-help-pages-ja-en-decoded-pause-repeat-guard');
                phase='programmatic-gameplay';
            }
            if(tutorialRun?.explanation?.id==='goal-fixed'){
                await tapPage('goal-fixed');await readyPage('goal-finish');goalSeen=true;await tapPage('goal-finish');break;
            }
            await delay(200);
        }
        ensure(moveHelpSeen&&goalSeen,'required-route-pages-missing');
        ensure(stamina===8,'tutorial-route-stamina-margin');
        phase='map';await wait(()=>state==='map'&&stageStartContext?.n===1&&node('stageStartDialog').open,'map-stage1-not-ready',15000);
        ensure(!isTutorialRun()&&!tutorialPending(),'tutorial-not-completed');
        ensure(globalThis.AscentTutorialState.snapshot().reason==='cleared','tutorial-not-cleared');
        ensure(resources()===originalResources,'tutorial-changed-free-resources');
        ensure(stageRecords.existing[0]===undefined,'stage0-record-created');
        checks.push('programmatic-alternating-route-and-two-goal-pages','map-stage1-prestart-free-resources-preserved');
        await capture('map-start');

        phase='normal-stage-cold-preparation';
        ensure(typeof clearAdoptedCourseCache==='function'&&typeof prepareCourseAsync==='function','course-preparation-api-missing');
        // Tutorial arrival may already have warmed Stage 1. Close that job and
        // use the supported geometry+preview invalidation API, never reset saves,
        // resources, generator settings, seed, stamina or the prepared result.
        node('closeStageStart').click();
        ensure(!stageStartContext&&!node('stageStartDialog').open&&coursePreparationJobs.size===0,'arrival-preparation-not-cancelled');
        clearAdoptedCourseCache();
        ensure(adoptedCourseCache.size===0&&stagePreviewCache.size===0,'cold-course-caches-not-cleared');
        ensure(resources()===originalResources,'cold-cache-clear-changed-resources');
        const workerObservations=observeCourseWorkers(),normalResources=resources(),normalNonConsumables=nonConsumables();
        const normalItems=heartItems,normalLives=lives.count,normalAttempt=lifeAttemptId;
        ensure(normalItems>=2&&normalLives>0&&!lives.inProgress&&lifeRunId===null,'normal-stage-starting-resources-invalid');
        ensure(openStageStart(1),'cold-stage1-modal-not-opened');
        const cancelledContext=stageStartContext,cancelledJob=cancelledContext.preparation;
        ensure(workerObservations.length===1&&cancelledJob?.worker===workerObservations[0].worker,'cold-stage1-did-not-start-worker');
        const cancelledWorker=workerObservations[0];verifyWorkerOrigin(cancelledWorker);
        ensure(node('stageStartDialog').open&&node('stageStartButton').disabled&&!cancelledContext.prepared,'cold-stage1-start-not-gated');
        ensure(node('stageStartStamina').textContent==='—'&&!node('stagePreparationStatus').hidden&&node('stagePreparationStatus').textContent.length>0,'cold-stage1-pending-ui-missing');
        await wait(()=>cancelledJob.ready||cancelledContext.error,'cold-worker-bootstrap-timeout',17000);
        ensure(cancelledJob.ready&&!cancelledContext.error&&!cancelledContext.prepared,'cold-worker-not-pending-after-bootstrap');
        const startup=cancelledWorker.messages.filter(message=>message?.type==='ready');
        ensure(startup.length===1&&startup[0].protocol===COURSE_PREPARATION_PROTOCOL&&startup[0].buildId===globalThis.ASCENT_COURSE_BUILD.id,'native-worker-bootstrap-not-confirmed');
        // A real timer must run after the bundle boots and while generation is
        // still pending. Counting a callback only after ready would hide a stall.
        let heartbeatWhilePending=false;
        await new Promise(resolve=>setTimeout(()=>{
            heartbeatWhilePending=stageStartContext===cancelledContext&&cancelledJob.ready&&
                !!cancelledJob.worker&&!cancelledContext.prepared&&!cancelledContext.error&&
                node('stageStartDialog').open&&node('stageStartButton').disabled;
            resolve();
        },0));
        ensure(heartbeatWhilePending,'cold-worker-blocked-ui-heartbeat');
        ensure(resources()===normalResources&&lifeAttemptId===normalAttempt,'pending-worker-charged-resources');
        node('stageStartButton').click();
        ensure(stageStartContext===cancelledContext&&resources()===normalResources,'pending-start-was-not-blocked');
        checks.push('same-origin-capacitor-worker-bootstrap','cold-worker-pending-ui-timer-heartbeat');

        phase='normal-stage-cancel-reopen';
        const cancellation=cancelledJob.promise.then(()=>false,error=>error.code==='COURSE_PREPARATION_CANCELLED');
        node('closeStageStart').click();
        ensure(await cancellation,'pending-worker-cancel-did-not-reject');
        ensure(cancelledJob.cancelled&&cancelledJob.worker===null&&cancelledJob.snapshot===null&&cancelledWorker.terminations===1,'pending-worker-not-terminated');
        ensure(!stageStartContext&&!node('stageStartDialog').open&&coursePreparationJobs.size===0,'cancelled-modal-still-active');
        await delay(0);
        ensure(resources()===normalResources&&lifeAttemptId===normalAttempt&&adoptedCourseCache.size===0&&stagePreviewCache.size===0,'cancelled-worker-changed-state');
        ensure(openStageStart(1),'stage1-reopen-failed');
        const readyContext=stageStartContext,readyJob=readyContext.preparation;
        ensure(readyContext!==cancelledContext&&readyJob!==cancelledJob&&readyJob.requestId!==cancelledJob.requestId,'stage1-reopen-reused-cancelled-job');
        ensure(workerObservations.length===2&&readyJob.worker===workerObservations[1].worker,'stage1-reopen-did-not-start-worker');
        const readyWorker=workerObservations[1];verifyWorkerOrigin(readyWorker);
        await wait(()=>!!readyContext.prepared||!!readyContext.error,'stage1-worker-generation-timeout',45000);
        ensure(!readyContext.error&&stageStartContext===readyContext&&readyContext.prepared===readyJob,'stage1-worker-generation-failed');
        const responses=readyWorker.messages.filter(message=>message?.type!=='ready');
        ensure(readyJob.ready&&readyWorker.messages.filter(message=>message?.type==='ready').length===1&&responses.length===1,'stage1-worker-response-sequence-invalid');
        ensure(responses[0].protocol===COURSE_PREPARATION_PROTOCOL&&responses[0].buildId===globalThis.ASCENT_COURSE_BUILD.id&&responses[0].requestId===readyJob.requestId&&responses[0].snapshot===readyJob.snapshot,'stage1-ready-not-from-real-worker-response');
        ensure(readyWorker.errors===0&&readyWorker.terminations===1&&readyJob.worker===null&&coursePreparationJobs.size===0,'ready-worker-not-cleanly-terminated');
        ensure(Object.isFrozen(readyJob.snapshot)&&Object.isFrozen(readyJob.snapshot.route),'stage1-ready-snapshot-not-frozen');
        ensure(cancelledWorker.errors===0&&cancelledWorker.messages.every(message=>message?.type==='ready')&&cancelledWorker.terminations===1&&cancelledJob.cancelled&&cancelledJob.snapshot===null&&!cancelledContext.prepared,'cancelled-worker-returned-stale-result');
        ensure(node('stageStartDialog').open&&!node('stageStartButton').disabled&&node('stagePreparationStatus').hidden,'stage1-ready-ui-missing');
        ensure(node('stageStartStamina').textContent===String(readyJob.snapshot.activeCourseGeneration.initialStamina).padStart(2,'0'),'stage1-ready-stamina-mismatch');
        ensure(resources()===normalResources&&lifeAttemptId===normalAttempt,'ready-worker-charged-resources');
        checks.push('pending-worker-close-terminates-without-resource-spend','cancelled-worker-remains-inert-after-reopen','stage1-genuine-worker-result-ready');

        phase='normal-stage-start-once';
        node('stageHeartCount').click();node('stageHeartCount').click();
        ensure(readyContext.hearts===2&&resources()===normalResources,'stage1-item-selection-charged-early');
        const preparedInitialStamina=readyJob.snapshot.activeCourseGeneration.initialStamina;
        node('stageStartButton').click();
        // Deliver a queued duplicate event too; a disabled button's click() alone
        // would suppress dispatch before the production handler can guard it.
        node('stageStartButton').dispatchEvent(new MouseEvent('click',{bubbles:true}));
        await wait(()=>state==='playing'&&level===1&&globalThis.ASCENT_NATIVE_RESUME?.ready===true,'normal-stage1-did-not-start');
        ensure(!isTutorialRun()&&!dailyRun&&!debugAttempt&&!stageStartContext&&!node('stageStartDialog').open,'normal-stage1-start-context-invalid');
        ensure(lifeAttemptId===normalAttempt+1&&lifeRunId===lifeAttemptId&&lives.inProgress&&lives.count===normalLives,'normal-stage1-life-start-not-once');
        ensure(heartItems===normalItems-2&&stamina===preparedInitialStamina+2&&moveCount===0,'normal-stage1-items-not-spent-once');
        ensure(activeCourseGeneration.initialStamina===preparedInitialStamina&&JSON.stringify(route)===JSON.stringify(readyJob.snapshot.route),'normal-stage1-did-not-use-prepared-course');
        ensure(JSON.parse(localStorage.getItem(HEART_ITEMS_KEY))===heartItems&&JSON.parse(localStorage.getItem(LIVES_KEY)).inProgress===true,'normal-stage1-resource-spend-not-persisted');
        ensure(nonConsumables()===normalNonConsumables&&workerObservations.length===2,'normal-stage1-start-regenerated-or-mutated-records');
        const launchedResources=resources();await delay(0);
        node('stageStartButton').dispatchEvent(new MouseEvent('click',{bubbles:true}));
        ensure(resources()===launchedResources&&lifeAttemptId===normalAttempt+1,'queued-start-duplicated-resources');
        checks.push('ready-start-spends-selected-items-and-begins-life-once');

        phase='normal-stage-coupled-dom-input';
        // A fresh normal course may introduce wide holds or pickups. Acknowledge
        // each real decoded help page instead of bypassing its input shield.
        for(let page=0;featureHelpOpen&&page<3;page++){
            await wait(()=>!featureHelpImageLoading&&node('featureHelpDialog').open,'normal-feature-help-not-ready');
            node('featureHelpDialog').click();
        }
        ensure(!featureHelpOpen,'normal-feature-help-not-dismissed');
        await wait(()=>!cameraIntro,'normal-camera-intro-not-complete',15000);
        const target=route[1];
        ensure(target&&validFingerAction(target.action)&&target.action.bodyMotion===COUPLED_BODY_MODEL,'normal-route-coupled-witness-missing');
        const beforeMoves=moveCount,origin=client(characterPose(performance.now()).body),scale=canvas.getBoundingClientRect().width/W;
        const pointer=(type,position,buttons)=>new MouseEvent(type,{bubbles:true,cancelable:true,button:0,buttons,...position});
        canvas.dispatchEvent(pointer('mousedown',origin,1));
        for(const delta of target.action.points)window.dispatchEvent(pointer('mousemove',{clientX:origin.clientX+delta.dx*scale,clientY:origin.clientY+delta.dy*scale},1));
        const last=target.action.points.at(-1);
        window.dispatchEvent(pointer('mouseup',{clientX:origin.clientX+last.dx*scale,clientY:origin.clientY+last.dy*scale},0));
        await wait(()=>moveCount===beforeMoves+1,'normal-dom-coupled-move-not-committed',3000);
        ensure(lastFingerGesture?.accepted&&!lastFingerGesture.canceled&&lastFingerGesture.action.bodyMotion===COUPLED_BODY_MODEL,'normal-dom-input-did-not-use-coupled-model');
        ensure(grips.every((hold,index)=>hold?.id===target.grips[index]&&limbReachable(body,hold,index))&&Math.hypot(body.x-target.x,body.y-target.y)<1e-6,'normal-dom-coupled-route-mismatch');
        ensure(state==='playing'&&lives.inProgress&&heartItems===normalItems-2&&nonConsumables()===normalNonConsumables,'normal-coupled-move-changed-resources');
        checks.push('normal-stage1-coupled-action-through-dom-input');

        phase='normal-stage-return';
        node('settingsButton').click();await wait(()=>settingsOpen&&node('settingsDialog').open,'normal-settings-not-open');
        node('restart').click();await wait(()=>state==='lost'&&node('overlay').open,'normal-retire-not-settled');
        ensure(!lives.inProgress&&lifeRunId===null&&lives.count===normalLives-1&&heartItems===normalItems-2,'normal-retire-life-not-settled-once');
        node('closeResult').click();
        await wait(()=>state==='map'&&!mapPreparing&&!mapTransition&&!stageStartContext&&!node('overlay').open,'normal-return-map-not-ready',15000);
        ensure(!lives.inProgress&&lifeRunId===null&&lives.count===normalLives-1&&heartItems===normalItems-2&&lifeAttemptId===normalAttempt+1,'normal-return-double-charged-resources');
        ensure(nonConsumables()===normalNonConsumables&&coursePreparationJobs.size===0&&workerObservations.length===2,'normal-return-mutated-records-or-leaked-worker');
        ensure(JSON.parse(localStorage.getItem(LIVES_KEY)).count===normalLives-1&&JSON.parse(localStorage.getItem(LIVES_KEY)).inProgress===false,'normal-return-life-settlement-not-persisted');
        checks.push('normal-stage1-return-settles-one-life-without-stale-worker');
        finish(true);
    } catch(error){
        // Do not return exception messages, URLs, identifiers or saved data.
        const code=typeof error?.message==='string'&&/^[a-z0-9-]{1,70}$/.test(error.message)?error.message:'unexpected-runtime-error';
        finish(false,code);
    }
})();
