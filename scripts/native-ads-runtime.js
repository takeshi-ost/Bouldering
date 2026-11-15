'use strict';
// Native-only adapter. Never substitutes a mock completion for a failed real ad.
// The native plugin owns SDK initialization and fails closed until privacy and
// Unity-only test configuration have been explicitly verified.
(() => {
    ui.lifeWatchAd.onclick=()=>{
        if(!lifePrompt)return;
        recoverLives();const prompt=closeLifePrompt();
        if(lives.count>0){prompt.launch();return;}
        startDummyAd({format:'rewarded',onComplete:grantLife,onReturn:prompt.launch,onUnavailable:()=>{
            lifePrompt=prompt;state='life-prompt';ui.lifeDialog.hidden=false;ui.lifeDialog.showModal?.();refreshLives();
        }});
    };
    // Test suite is entered deliberately from the existing Debug map controls,
    // never during a live run and never from ordinary production UI.
    if(ui.debugControls && typeof document?.createElement==='function') {
        const testButton=document.createElement('button');testButton.type='button';
        testButton.textContent='広告テスト / Ad test';
        const status=document.createElement('small');status.setAttribute('role','status');
        ui.debugControls.appendChild(testButton);ui.debugControls.appendChild(status);
        const gameTestButton=document.createElement('button');gameTestButton.type='button';
        gameTestButton.textContent='ゲーム内広告テスト / Game-ad test';
        ui.debugControls.appendChild(gameTestButton);
        gameTestButton.onclick=async()=>{
            if(!debugMode || state!=='map' || active || dummyAd || adCoverPending || gameTestButton.disabled || testButton.disabled)return;
            const plugin=globalThis.Capacitor?.Plugins?.AscentAds;
            if(typeof plugin?.authorizeDeveloperGameTest!=='function')return;
            gameTestButton.disabled=true;testButton.disabled=true;
            try {
                const result=await plugin.authorizeDeveloperGameTest();
                status.textContent=result?.status==='authorized'?
                    'この起動中はゲーム内テスト広告が有効です。終了にはアプリを完全終了してください / Game test enabled for this launch':
                    'キャンセルしました / Cancelled';
            } catch(_) {status.textContent='再起動またはテスト設定の確認が必要です / Restart or verify test settings';}
            finally {gameTestButton.disabled=false;testButton.disabled=false;}
        };
        testButton.onclick=async()=>{
            if(!debugMode || state!=='map' || active || dummyAd || adCoverPending || testButton.disabled)return;
            const plugin=globalThis.Capacitor?.Plugins?.AscentAds;
            if(typeof plugin?.openDeveloperTestSuite!=='function'){
                status.textContent='広告テストは未対応です / Ad test unavailable';return;
            }
            testButton.disabled=true;status.textContent='確認画面を開きます / Opening confirmation';
            stopBackgroundMusicForAd();
            try {
                const result=await plugin.openDeveloperTestSuite();
                status.textContent=['cancelled','declined'].includes(result?.status)?
                    'キャンセルしました / Cancelled':
                    result?.status==='blocked'?'テスト設定の確認が必要です / Test setup needs verification':
                    'テストを終了しました。通常広告の確認にはアプリを再起動してください / Restart the app before game-ad tests';
            } catch(_) {
                status.textContent='広告テストの安全設定が未確認、または初期化に失敗しました / Test configuration unavailable or initialization failed';
            } finally {testButton.disabled=false;resumeBackgroundMusicAfterAd();}
        };
    }
    // Native-only consent review entry. No automatic network request at launch.
    const privacySettings=typeof document.getElementById==='function'?document.getElementById('settingsDialog'):null;
    if(privacySettings) {
        const update=document.createElement('button'), options=document.createElement('button'), label=document.createElement('small');
        update.type=options.type='button'; update.className=options.className='secondary';
        update.textContent='広告プライバシーの確認 / Ad privacy';
        options.textContent='同意設定の変更 / Privacy choices';options.hidden=true;
        label.setAttribute('role','status');
        privacySettings.appendChild(update);privacySettings.appendChild(options);privacySettings.appendChild(label);
        async function run(method) {
            if(update.disabled || active || dummyAd || adCoverPending)return;
            const plugin=globalThis.Capacitor?.Plugins?.AscentAds;
            if(typeof plugin?.[method]!=='function')return;
            update.disabled=options.disabled=true;
            stopBackgroundMusicForAd();
            try {
                const result=await plugin[method]();
                if(result?.status!=='cancelled')options.hidden=!result?.privacyOptionsRequired;
                label.textContent=result?.status==='cancelled'?'キャンセルしました / Cancelled':
                    result?.adsEnabled ? '同意を確認しました。ゲーム内テスト広告が有効です / Consent checked. Game TEST ads enabled' : result?.status==='restart_required' ? '広告を停止しました。設定は保存済みです。アプリを完全終了してください / Ads stopped. Choices saved. Fully close the app' : '同意条件または対象地域が未確認のため広告は停止中です / Ads remain disabled: consent or region unavailable';
            } catch(_) {
                label.textContent='取得できませんでした。広告は無効のままです。再試行またはアプリ再起動が必要です / Unavailable. Ads remain disabled. Retry or restart.';
            } finally {update.disabled=options.disabled=false;resumeBackgroundMusicAfterAd();}
        }
        update.onclick=()=>run('updatePrivacy');options.onclick=()=>run('privacyOptions');
    }
    let loadingCover=null;
    function showLoadingCover() {
        const cover=document.createElement('div');
        cover.id='native-ad-loading';cover.setAttribute('role','status');
        cover.setAttribute('aria-live','polite');
        cover.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:16px sans-serif;touch-action:none;';
        cover.textContent=typeof GAME_TEXT_LANGUAGE!=='undefined' && GAME_TEXT_LANGUAGE==='en'?'Loading ad…':'広告を読み込み中…';
        loadingCover=cover;document.body.appendChild(cover);
    }
    function hideLoadingCover() {loadingCover?.remove();loadingCover=null;}
    // Wait for a visible paint before invoking SDK work. Hidden/background tabs
    // fail closed rather than start an ad behind an unpainted game screen.
    function loadingCoverPainted() {
        return new Promise((resolve,reject)=>{
            const timeout=setTimeout(()=>reject(Error('ad_cover_paint_timeout')),2000);
            requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timeout);resolve();}));
        });
    }
    let active = null, sequence = 0;
    const pendingRewards = new Map();
    let rewardListener = null;
    const oldAdvance = advanceDummyAd;
    const oldComplete = completeDummyAd;
    advanceDummyAd = function(now) { if (!active) return oldAdvance(now); };
    completeDummyAd = function() { return active ? false : oldComplete(); };
    startDummyAd = function({format='interstitial',onComplete=()=>{},onReturn=null,onUnavailable=null}={}) {
        if(active || dummyAd || adCoverPending)return false;
        const context={previousState:state,wasResultOpen:!!ui.overlay.open,
            wasTiming:runStartedAt!==null,settled:false,rewarded:false,granted:false,
            requestId:`ascent-${Date.now()}-${++sequence}`};
        const grant=()=>{if(context.granted)return;context.granted=true;onComplete();};
        if(format==='rewarded')pendingRewards.set(context.requestId,()=>{
            context.rewarded=true;
            if(context.settled){grant();refreshLives();}
        });
        active=context;
        if(context.wasTiming){runElapsedMs=runTimeMs();runStartedAt=null;}
        release(true);endPan();bodyTap=null;touchId=null;ignoreTouches=false;
        hideSettings();hideResultModal();
        // Reuse the existing input guards without exposing the mock-ad dialog.
        dummyAd={native:true,remaining:0,start:performance.now()};
        state='ad';stopBackgroundMusicForAd();
        requestGameRender();schedulePresentationUpdates();
        const finish=result=>{
            if(active!==context || context.settled)return;
            context.settled=true;active=null;dummyAd=null;
            state=context.previousState;
            if(context.wasTiming)runStartedAt=performance.now()-runElapsedMs;
            context.rewarded=context.rewarded || result?.rewarded===true;
            const earned=format==='rewarded'?context.rewarded:result?.shown===true;
            try {
                if(earned)grant();
                // Rewarded cancellation must not launch a run without a life.
                if(format==='rewarded' && !earned) {
                    if(onUnavailable)onUnavailable();
                    else if(context.wasResultOpen)showResultModal();
                } else if(onReturn)onReturn();
                else if(context.wasResultOpen)showResultModal();
            } finally {
                hideLoadingCover();
                resumeBackgroundMusicAfterAd();
                requestGameRender();schedulePresentationUpdates();
            }
        };
        // Synchronous exceptions, missing plugins and unavailable ads all restore
        // the game. No completion or reward is invented in any of these cases.
        Promise.resolve().then(async()=>{
            showLoadingCover();
            await loadingCoverPainted();
            const plugin=globalThis.Capacitor?.Plugins?.AscentAds;
            if(!plugin || typeof plugin.show!=='function')throw Error('Native ads unavailable');
            if(format==='rewarded' && !rewardListener){
                if(typeof plugin.addListener!=='function')throw Error('Reward listener unavailable');
                rewardListener=await plugin.addListener('reward',event=>{
                    const deliver=pendingRewards.get(event.requestId);
                    if(deliver){pendingRewards.delete(event.requestId);deliver();}
                });
            }
            return plugin.show({format,requestId:context.requestId});
        }).then(finish,()=>finish({shown:false,rewarded:false,status:'unavailable'}));
        return true;
    };
})();
