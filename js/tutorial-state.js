'use strict';
// Runs before any game module can create its initial save. A pending marker
// wins over those later automatic writes, including after a reload/interruption.
(() => {
    const KEY='ascent.tutorial-stage0.v1';
    const legacyKeys=[
        'ascent.player-uuid.v1','ascent.progress.v1','ascent.records.v1',
        'ascent.heart-items.v1','ascent.lives.v1','ascent.map-rewards.v1',
        'ascent.appearance.v1','ascent.player-name.v1','ascent.feature-help.v1',
        'ascent.daily-records.v1','ascent.daily-attempts.v1','ascent.daily-play-ad.v1',
        'ascent.online-profile.v1','ascent.pending-scores.v1','ascent.transfer-identity.v1',
        'ascent.ad-plays.v1','ascent.ad-plays.v2','ascent.ad-clears.v1','ascent.daily-entry-ad.v1',
        'ascent.sound-enabled.v1','ascent.music-settings.v1','ascent.sound-volume.v1','ascent.language.v1',
        'ascent.account-deletion.v1'
    ];
    let record,persisted=false,firstUse=false;
    function save() {
        try {
            if(!globalThis.localStorage)return persisted=false;
            globalThis.localStorage.setItem(KEY,JSON.stringify(record));
            return persisted=true;
        } catch(_) {return persisted=false;}
    }
    try {
        const storage=globalThis.localStorage;
        if(!storage)throw Error('Storage unavailable');
        const raw=storage.getItem(KEY);
        if(raw!==null) {
            try {
                const value=JSON.parse(raw);
                if(value?.version===1 && ['pending','completed','skipped'].includes(value.status))
                    record={version:1,status:value.status,reason:String(value.reason||'saved')};
            } catch(_) {}
            // Unknown/corrupt markers must not unexpectedly onboard an old user.
            record??={version:1,status:'skipped',reason:'unrecognized-marker'};
            persisted=true;
        } else {
            const existing=legacyKeys.some(key=>storage.getItem(key)!==null);
            firstUse=!existing;
            record={version:1,status:existing?'skipped':'pending',reason:existing?'legacy-save':'new-player'};
            save();
        }
    } catch(_) {
        // No reliable first-use evidence: do not interrupt an existing player.
        firstUse=false;record={version:1,status:'skipped',reason:'storage-unavailable'};
    }
    const api=Object.freeze({KEY,
        pending:()=>record.status==='pending',
        snapshot:()=>Object.freeze({...record,persisted,firstUse}),
        complete(won) {
            if(record.status!=='pending')return false;
            record={version:1,status:'completed',reason:won?'cleared':'failed'};
            save();return true;
        },
        skipExisting(reason='existing-player') {
            if(record.status!=='pending')return false;
            record={version:1,status:'skipped',reason};save();return true;
        }
    });
    Object.defineProperty(globalThis,'AscentTutorialState',{value:api,configurable:true});
})();
