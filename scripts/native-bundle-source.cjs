'use strict';
// Changes only copied iOS assets. Exact anchors fail closed on upstream changes.
function replaceOnce(source, before, after) {
    if (source.split(before).length !== 2) throw Error('Native source anchor changed: '+before.slice(0,60));
    return source.replace(before, after);
}
module.exports = function nativeSource(name, source) {
    if(name==='online.js') {
        source=replaceOnce(source,"    document.getElementById('onlineStatus').textContent=message;", "    const nativeStatus=document.getElementById('onlineStatus');nativeStatus.hidden=true;nativeStatus.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();");
        source=replaceOnce(source,'function queueOnlineProfileSave() {',"function queueOnlineProfileSave() {\n    if(globalThis.ASCENT_NATIVE_SYNC){globalThis.ASCENT_NATIVE_SYNC.queueProfile(onlineProfile());return;}");
        source=replaceOnce(source,'async function startOnline(adapter) {',"async function startOnline(adapter) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().legacySync!==true)return;");
        source=replaceOnce(source,'async function flushOnlineProfile(preferLocal=true) {',"async function flushOnlineProfile(preferLocal=true) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().profileWrites!==true)return;");
    }
    if(name==='online-scores.js') {
        // Native uses its separate post-enable ledger. Never rewrite historical
        // Web queues, even while loading/normalizing old optional metadata.
        source=replaceOnce(source,"    try {globalThis.localStorage?.setItem(ONLINE_SCORES_KEY,JSON.stringify({uid:onlineScores.owner,items:[...onlineScores.pending]}));}catch(_) {}",'    // Historical pending storage is immutable in the native wrapper.');
        source=replaceOnce(source,`    const status=document.getElementById('onlineScoreStatus');
    status.hidden=onlineScores.pending.size===0;
    status.textContent=onlineScores.pending.size?gameText("online-scores.persistPendingScores", {value0: onlineScores.pending.size}):'';`,"    const status=document.getElementById('onlineScoreStatus');status.hidden=true;status.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();");
        source=replaceOnce(source,'function queueOnlineScore(stage,mode,score) {',"function queueOnlineScore(stage,mode,score) {\n    if(globalThis.ASCENT_NATIVE_SYNC)return false;");
        source=replaceOnce(source,'function connectOnlineScores(uid) {',"function connectOnlineScores(uid) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().pendingScores!==true)return;");
        source=replaceOnce(source,'async function flushOnlineScores() {',"async function flushOnlineScores() {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().pendingScores!==true)return;");
        source=replaceOnce(source,'function stageScoreStatus(stage,mode) {',"function stageScoreStatus(stage,mode) {\n    if(globalThis.ASCENT_IOS_BUILD?.configuration!=='Debug' || globalThis.ASCENT_IOS_BUILD?.syncStatusAllowed!==true)return '';" );
        source=replaceOnce(source,'if(onlineScores.pending.has(board))', 'if(globalThis.ASCENT_NATIVE_SYNC?.pendingForBoard?.(board))');
    }
    if(name==='language.js') {
        source=replaceOnce(source,`    const pending=document.getElementById('onlineScoreStatus');
    pending.textContent=onlineScores.pending.size?gameText("online-scores.persistPendingScores",{value0:onlineScores.pending.size}):'';`,"    const pending=document.getElementById('onlineScoreStatus');pending.hidden=true;pending.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();");
    }
    if(name==='level-map.js')source=replaceOnce(source,'        queueOnlineScore(level,courseMode,candidate);',
        '        globalThis.ASCENT_NATIVE_SYNC?.recordClear(level,courseMode,candidate);\n        queueOnlineScore(level,courseMode,candidate);');
    if(name==='appearance.js') {
        source=replaceOnce(source,'    ui.playerName.blur?.();playerName=name;', '    const nativeNameWasEdited=name!==playerName;\n    ui.playerName.blur?.();playerName=name;');
        source=replaceOnce(source,'    queueOnlineProfileSave();','    if(globalThis.ASCENT_NATIVE_SYNC)globalThis.ASCENT_NATIVE_SYNC.profileEdited(onlineProfile(),nativeNameWasEdited);else queueOnlineProfileSave();');
    }
    if(name==='transfer.js') {
        source=replaceOnce(source,'const ready=online.ready &&',"const ready=globalThis.ASCENT_NATIVE_FIREBASE?.permissions().transfer===true && online.ready &&");
        source=replaceOnce(source,'async function withTransferLock(action) {',"async function withTransferLock(action) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().transfer!==true)throw Error('native-firebase/transfer-disabled');");
        source=replaceOnce(source,'function commitTransferFile(file) {',"function commitTransferFile(file) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().transfer!==true)throw Error('native-firebase/transfer-disabled');");
    }
    if(name==='account-deletion.js') {
        for(const anchor of ['async function restoreDeletionSession(adapter) {','async function deleteCurrentAccount() {','function clearLocalGameData() {']) {
            source=replaceOnce(source,anchor,anchor+"\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().deletion!==true)return;");
        }
    }
    if (name === 'audio.js') {
        source = replaceOnce(source, 'const resumed=soundContext.resume();',
            "globalThis.ASCENT_AUDIO_TRACE?.('resume-attempt');\n            const resumed=soundContext.resume();");
        source = replaceOnce(source,
            "resumed?.then(()=>{flushPendingSound();if(typeof syncBackgroundMusic==='function')syncBackgroundMusic();}).catch(()=>{});",
            "resumed?.then(()=>{globalThis.ASCENT_AUDIO_TRACE?.('resume-resolved');flushPendingSound();if(typeof syncBackgroundMusic==='function')syncBackgroundMusic();}).catch(error=>{globalThis.ASCENT_AUDIO_TRACE?.('resume-rejected',{name:error?.name,message:error?.message});});");
        source = replaceOnce(source, 'if((!soundEnabled && !musicEnabled) || document.hidden)return;',
            'if((!soundEnabled && !musicEnabled) || document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE===false)return;');
        source = replaceOnce(source, 'if(!soundEnabled || !soundContext || document.hidden)return false;',
            'if(!soundEnabled || !soundContext || document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE===false)return false;');
    }
    if (name === 'bgm.js') source = replaceOnce(source,
        'if(!musicEnabled || !bgmPageActive || document.hidden || bgmAdBlocked || bgmAfterAdPending)',
        'if(!musicEnabled || !bgmPageActive || document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE===false || bgmAdBlocked || bgmAfterAdPending)');

    return source;
};
