'use strict';
// Changes only copied iOS assets. Exact anchors fail closed on upstream changes.
function replaceOnce(source, before, after) {
    if (source.split(before).length !== 2) throw Error('Native source anchor changed: '+before.slice(0,60));
    return source.replace(before, after);
}
function wrapNativeEnd(source,name) {
    return replaceOnce(source,'function '+name+'(',
        'function '+name+'(...args) {\n    const commit=()=>nativeResume_'+name+'(...args);\n    return globalThis.ASCENT_NATIVE_RESUME ? globalThis.ASCENT_NATIVE_RESUME.endAttempt(commit) : commit();\n}\nfunction nativeResume_'+name+'(');
}
module.exports = function nativeSource(name, source) {
    if(name==='level-map.js') {
        source=replaceOnce(source,'function saveHeartItems() {',"function saveHeartItems() {\n    if(globalThis.ASCENT_NATIVE_RESUME?.ready===false)return;");
        const before=`            restartInput(n,heartsUsed);
            beginLifeAttempt();
            ui.titleScreen.hidden=true;ui.levelMap.hidden=true;
            heartItems-=heartsUsed;saveHeartItems();
            return true;`;
        const after=`            const commit=()=>{
                try {
                    restartInput(n,heartsUsed);
                    beginLifeAttempt();
                    ui.titleScreen.hidden=true;ui.levelMap.hidden=true;
                    heartItems-=heartsUsed;saveHeartItems();
                    return true;
                } catch(error) {
                    showLevelMap({target:n});
                    ui.mapError.textContent=gameText("level-map.selectStage");ui.mapError.hidden=false;
                    console.error(error);return false;
                }
            };
            return globalThis.ASCENT_NATIVE_RESUME ? globalThis.ASCENT_NATIVE_RESUME.beginAttempt(heartsUsed,commit) : commit();`;
        source=replaceOnce(source,before,after);
        source=wrapNativeEnd(source,'showLevelMap');
    }
    if(name==='lives.js') {
        source=replaceOnce(source,'function saveLives() {',"function saveLives() {\n    if(globalThis.ASCENT_NATIVE_RESUME?.ready===false)return;");
        source=replaceOnce(source,'function recoverLives(now=Date.now()) {',"function recoverLives(now=Date.now()) {\n    if(globalThis.ASCENT_NATIVE_RESUME?.ready===false)return;");
        source=replaceOnce(source,`if(lives.inProgress){lives.inProgress=false;consumeLife(lives.attemptAt);}
else {recoverLives();saveLives();}`,`if(globalThis.ASCENT_NATIVE_RESUME?.ready!==false) {
    if(lives.inProgress){lives.inProgress=false;consumeLife(lives.attemptAt);}
    else {recoverLives();saveLives();}
}`);
    }
    if(name==='game.js') {
        source=wrapNativeEnd(source,'finish');
        for(const signature of ['function down(e) {','function move(e) {','function release(cancel = false) {','function advanceCameraIntro(now) {','function canUndoMove() {'])
            source=replaceOnce(source,signature,signature+"\n    if(globalThis.ASCENT_NATIVE_RESUME?.ready===false)return;");
    }
    if(name==='input.js') {
        source=replaceOnce(source,"function canScrollStage() { return","function canScrollStage() { if(globalThis.ASCENT_NATIVE_RESUME?.ready===false)return false;return");
        for(const name of ['returnFromStage','showTitleScreen'])source=wrapNativeEnd(source,name);
    }
    if(name==='renderer.js')source=replaceOnce(source,'function draw(now = 0) {',
        'function draw(now = 0) {\n    if(globalThis.ASCENT_NATIVE_RESUME?.ready===false){gameFrame=null;return;}');
    if(name==='online.js') {
        source=replaceOnce(source,"    document.getElementById('onlineStatus').textContent=message;", "    const nativeStatus=document.getElementById('onlineStatus');nativeStatus.hidden=true;nativeStatus.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();");
        source=replaceOnce(source,'function queueOnlineProfileSave() {',"function queueOnlineProfileSave() {\n    if(globalThis.ASCENT_NATIVE_SYNC){globalThis.ASCENT_NATIVE_SYNC.queueProfile(onlineProfile());return;}");
        source=replaceOnce(source,'async function startOnline(adapter) {',"async function startOnline(adapter) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().legacySync!==true)return;");
        source=replaceOnce(source,'async function flushOnlineProfile(preferLocal=true) {',"async function flushOnlineProfile(preferLocal=true) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().profileWrites!==true)return;");
    }
    if(name==='online-scores.js') {
        // Rankings-off returns before the legacy presenter below. Refresh the
        // native diagnostics there too; this does not enable score uploads.
        source=replaceOnce(source,"        status.hidden=true;status.textContent='';return;",
            "        status.hidden=true;status.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();return;");
        // Native uses its separate post-enable ledger. Never rewrite historical
        // Web queues, even while loading/normalizing old optional metadata.
        source=replaceOnce(source,"    if(!onlineScores.blocked)try {globalThis.localStorage?.setItem(ONLINE_SCORES_KEY,JSON.stringify({uid:onlineScores.owner,items:[...onlineScores.pending]}));}catch(_) {}",'    // Historical pending storage is immutable in the native wrapper.');
        source=replaceOnce(source,`    const status=document.getElementById('onlineScoreStatus');
    status.hidden=!onlineScores.blocked && onlineScores.pending.size===0;
    status.textContent=onlineScores.blocked?gameText('online-scores.pendingBlocked'):onlineScores.pending.size?gameText("online-scores.persistPendingScores", {value0: onlineScores.pending.size}):'';`,"    const status=document.getElementById('onlineScoreStatus');status.hidden=true;status.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();");
        source=replaceOnce(source,'function queueOnlineScore(stage,mode,score) {',"function queueOnlineScore(stage,mode,score) {\n    if(globalThis.ASCENT_NATIVE_SYNC)return false;");
        source=replaceOnce(source,'function connectOnlineScores(uid) {',"function connectOnlineScores(uid) {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().pendingScores!==true)return;");
        source=replaceOnce(source,'async function flushOnlineScores() {',"async function flushOnlineScores() {\n    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().pendingScores!==true)return;");
        source=replaceOnce(source,'function stageScoreStatus(stage,mode) {',"function stageScoreStatus(stage,mode) {\n    if(globalThis.ASCENT_IOS_BUILD?.configuration!=='Debug' || globalThis.ASCENT_IOS_BUILD?.syncStatusAllowed!==true)return '';" );
        source=replaceOnce(source,'if(onlineScores.pending.has(board))', 'if(globalThis.ASCENT_NATIVE_SYNC?.pendingForBoard?.(board))');
    }
    if(name==='language.js') {
        source=replaceOnce(source,`    const pending=document.getElementById('onlineScoreStatus');
    pending.textContent=onlineScores.blocked?gameText('online-scores.pendingBlocked'):onlineScores.pending.size?gameText("online-scores.persistPendingScores",{value0:onlineScores.pending.size}):'';`,"    const pending=document.getElementById('onlineScoreStatus');pending.hidden=true;pending.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();");
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
        source=replaceOnce(source,"error?.code==='auth/requires-recent-login'?","['auth/requires-recent-login','native-firebase/deletion-auth-unconfirmed'].includes(error?.code)?");
        source=replaceOnce(source,'function markAccountDeletion(uid,phase) {',`function markAccountDeletion(uid,phase) {
    globalThis.ASCENT_NATIVE_ACCOUNT_DELETION?.persistMarker(uid,phase);`);
        source=replaceOnce(source,"button.disabled=!online.uid || !online.adapter?.deleteAccount || accountDeletion.busy;", "button.disabled=globalThis.ASCENT_NATIVE_FIREBASE?.permissions().deletion!==true || !online.uid || !online.adapter?.deleteAccount || accountDeletion.busy;");
        source=replaceOnce(source,'async function restoreDeletionSession(adapter) {',`async function restoreDeletionSession(adapter) {
    if(globalThis.ASCENT_NATIVE_ACCOUNT_DELETION)return globalThis.ASCENT_NATIVE_ACCOUNT_DELETION.restore();
    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().deletion!==true)return;`);
        source=replaceOnce(source,'async function deleteCurrentAccount() {',`async function deleteCurrentAccount() {
    if(globalThis.ASCENT_NATIVE_FIREBASE?.permissions().deletion!==true)return;`);
        source=replaceOnce(source,"    accountDeletion.busy=true;markAccountDeletion(uid,'pending');online.ready=false;",`    try {markAccountDeletion(uid,'pending');}
    catch(error){deleteUserElement('deleteUserStatus').textContent=gameText("account-deletion.deleteCurrentAccount");return;}
    accountDeletion.busy=true;online.ready=false;`);
        source=replaceOnce(source,'        await online.adapter.lockDeletion(uid);',`        await globalThis.ASCENT_NATIVE_ACCOUNT_DELETION?.beforeDelete();
        await online.adapter.lockDeletion(uid);`);
        source=replaceOnce(source,'function clearLocalGameData() {',`function clearLocalGameData() {
    globalThis.ASCENT_NATIVE_ACCOUNT_DELETION?.clearLocal();`);
        source=replaceOnce(source,'    for(const key of keys)globalThis.localStorage?.removeItem(key);',`    for(const key of keys){
        globalThis.localStorage?.removeItem(key);
        if(globalThis.localStorage?.getItem(key)!==null)throw Error('Local game reset was not persisted');
    }`);
        source=replaceOnce(source,'try {clearLocalGameData();globalThis.localStorage?.removeItem(ACCOUNT_DELETION_KEY);}',`try {clearLocalGameData();
        if(globalThis.ASCENT_NATIVE_ACCOUNT_DELETION)globalThis.ASCENT_NATIVE_ACCOUNT_DELETION.startNewUser();
        else globalThis.localStorage?.removeItem(ACCOUNT_DELETION_KEY);}`);
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
