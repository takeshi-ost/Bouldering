"use strict";
(() => {
    // This configuration must contain an owner-approved bundled terms document.
    // Absent configuration blocks entry; never fabricate approved terms.
    const config=globalThis.ASCENT_REVIEWED_TERMS;
    if(!config) {
        ui.titleScreen.onclick=()=>{ui.titleTap.textContent='利用規約の準備中です / Terms are not available yet';};
        return;
    }
    const original=ui.titleScreen.onclick;
    const key='ascent.terms.accepted.v1';
    const continueKey='ascent.terms.continue-after-reload.v1';
    const flow=createFirstRun({version:config.version,
        read:()=>globalThis.ASCENT_TERMS_NETWORK?.accepted===true?localStorage.getItem(key):null,write:v=>localStorage.setItem(key,v),
        requestPrivacy:()=>{const ads=globalThis.Capacitor?.Plugins?.AscentAds;
            if(typeof ads?.beginFirstRunPrivacy!=='function')return Promise.reject(Error('privacy_unavailable'));
            return ads.beginFirstRunPrivacy();}});
    let showing=false;
    ui.titleScreen.onclick=async()=>{
        if(showing || !titleReady || state!=='choosing')return;
        showing=true;
        try {await globalThis.ASCENT_NATIVE_ACCOUNT_DELETION?.completeConfirmedDeletion();}
        catch(_){showing=false;ui.titleTap.textContent="削除後の処理を再試行してください / Please retry the post-deletion reset";return;}
        try {await globalThis.ASCENT_TERMS_NETWORK.refresh();}
        catch(_){showing=false;ui.titleTap.textContent="利用規約の確認を再試行してください / Please retry the terms check";return;}
        const en=typeof GAME_TEXT_LANGUAGE!=='undefined'&&GAME_TEXT_LANGUAGE==='en';
        const dialog=document.createElement('dialog');
        dialog.style.cssText='width:360px;box-sizing:border-box;height:min(500px,calc(var(--viewport-height,700px) - 56px));padding:18px;border:0;border-radius:18px;background:#f8f6ee;color:#25372f;display:flex;flex-direction:column;gap:12px;overflow:hidden';
        const scroll=document.createElement('div'),copy=document.createElement('div'),status=document.createElement('p');
        scroll.style.cssText='flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;text-align:left';
        copy.textContent=en?config.en:config.ja;
        copy.style.cssText='white-space:pre-wrap;text-align:left';
        status.setAttribute('role','status');
        const explanation=document.createElement('p');
        explanation.style.cssText='font-size:13px;line-height:1.5';
        explanation.textContent=en?'After acceptance, usage analytics starts to help improve the game. Usage analytics is part of accepting the Terms and cannot be disabled in the game. Advertising privacy choices are handled separately.':'同意後は、ゲーム改善のための利用状況の分析が有効になります。利用状況の分析は利用規約への同意に含まれ、ゲーム内では停止できません。広告に関する選択は別に確認します。';
        scroll.append(copy,explanation);
        const policyWeb=document.createElement('button');policyWeb.type='button';
        policyWeb.textContent=en?'Privacy Policy (website)':'プライバシーポリシー（Webサイト）';
        policyWeb.style.cssText='flex:none;border:0;background:transparent;color:#145a92;text-decoration:underline;padding:4px;font-size:14px';
        policyWeb.onclick=async()=>{
            policyWeb.disabled=true;
            try {
                if(globalThis.navigator?.onLine===false)throw Error('offline');
                const result=await globalThis.Capacitor?.Plugins?.AscentAnalytics?.openPrivacyPolicy({language:en?'en':'ja'});
                if(result?.opened!==true) {
                    status.textContent=result?.reason==='revision_not_published'
                      ?(en?'The revised Privacy Policy is not available yet. Please try again later.':'改訂版はサイト未公開です。しばらくしてから再試行してください。')
                      :(en?'Unable to open the website. Please try again.':'サイトを開けません。再試行してください。');
                }
            } catch(_) {status.textContent=en?'Offline or unable to open the website. Check your connection and try again.':'オフライン、またはサイトを開けません。再試行してください。';}
            finally {policyWeb.disabled=false;}
        };
        const accept=document.createElement('button'),cancel=document.createElement('button'),offline=document.createElement('button');
        accept.textContent=en?'Agree and continue':'同意して進む';
        cancel.textContent=en?'Back to title':'タイトルに戻る';
        offline.textContent=en?'Continue without ads':'広告なしで進む';offline.hidden=true;
        let presented=false;
        const present=()=>{if(!presented){document.body.appendChild(dialog);dialog.showModal();presented=true;}};
        const close=()=>{if(presented)dialog.close();dialog.remove();showing=false;};
        const enter=()=>{close();original();};
        const run=async consent=>{
            accept.disabled=true;cancel.disabled=true;offline.hidden=true;
            try {
                if(consent || flow.accepted()) {
                    const restart=consent===true && globalThis.ASCENT_NATIVE_ACCOUNT_DELETION?.prepareTermsRestart();
                    const native = await globalThis.Capacitor?.Plugins?.AscentAnalytics?.acceptTerms({version:config.version,explicitAcceptance:consent===true});
                    if(native?.accepted!==true)throw Error('terms_required');
                    if(restart){
                        localStorage.setItem(key,config.version);if(localStorage.getItem(key)!==config.version)throw Error('terms_storage_failed');
                        // Preserve this title tap, not a standing permission to skip the title.
                        // Consume once on the next document and re-check native consent there.
                        const continuation=JSON.stringify({version:config.version,at:Date.now()});
                        globalThis.sessionStorage.setItem(continueKey,continuation);
                        if(globalThis.sessionStorage.getItem(continueKey)!==continuation)throw Error('terms_storage_failed');
                        localStorage.removeItem('ascent.native-deletion.reconsent-reload.v1');globalThis.location.reload();return;
                    }
                    await globalThis.ASCENT_TERMS_NETWORK.refresh();
                }
            } catch (_) {
                status.textContent=en?'Unable to confirm terms. Please retry.':'利用規約の確認を保存できませんでした。再試行してください。';
                accept.disabled=false;cancel.disabled=false;present();return;
            }
            const result=await flow.proceed(consent);
            accept.disabled=false;cancel.disabled=false;
            if(result.allow){enter();return;}
            present();
            if(result.status==='privacy_unavailable') {
                status.textContent=en?'Ad privacy could not be checked. Ads remain disabled.':'広告設定を確認できませんでした。広告は停止したままです。';offline.hidden=false;
                accept.textContent=en?'Retry':'再試行';
            } else if(result.status==='storage_failed')status.textContent=en?'Could not save. Please retry.':'保存できませんでした。再試行してください。';
        };
        cancel.onclick=close;dialog.oncancel=()=>{dialog.remove();showing=false;};
        accept.onclick=()=>run(true);offline.onclick=()=>{if(flow.continueWithoutAds().allow)enter();};
        const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex:none';
        accept.style.flex='1';cancel.style.flex='1';actions.append(cancel,accept);
        status.style.cssText='margin:0;font-size:13px;line-height:1.4';
        dialog.append(scroll,policyWeb,status,offline,actions);
        if(!config.version || !copy.textContent){status.textContent=en?'Terms are not available.':'利用規約を確認できません。';accept.disabled=true;}
        if(flow.accepted()){copy.hidden=true;explanation.hidden=true;policyWeb.hidden=true;scroll.hidden=true;accept.textContent=en?'Continue':'進む';await run(false);}
        else present();
    };
    let continuePending=false;
    try {
        const value=JSON.parse(globalThis.sessionStorage?.getItem(continueKey)||'null');
        continuePending=value?.version===config.version && Number.isFinite(value.at) && Date.now()-value.at>=0 && Date.now()-value.at<60000;
        globalThis.sessionStorage?.removeItem(continueKey);
    } catch(_) {continuePending=false; /* Unreadable/unconsumed intent never bypasses the title gate. */ }
    const continueTitleTap=async()=>{
        if(!continuePending || !titleReady || state!=='choosing' || showing)return;
        continuePending=false;
        try {await globalThis.ASCENT_TERMS_NETWORK.refresh();}catch(_){return;}
        if(flow.accepted() && !showing && state==='choosing' && typeof tutorialPending==='function' && tutorialPending())await ui.titleScreen.onclick();
    };
    globalThis.addEventListener?.('ascent-title-ready',continueTitleTap);
    void continueTitleTap();
})();
