"use strict";
const ACCOUNT_DELETION_KEY='ascent.account-deletion.v1';
function readAccountDeletion() {
    try {
        const value=JSON.parse(ASCENT_TRIAL_STORAGE?.getItem(ACCOUNT_DELETION_KEY)||'null');
        if(value && typeof value.uid==='string' && ['pending','done'].includes(value.phase))return value;
    } catch(_) {}
    return null;
}
const accountDeletion={marker:readAccountDeletion(),busy:false,restoreBusy:false};
function markAccountDeletion(uid,phase) {
    return false; // Artifact-only safety gate.
    accountDeletion.marker={uid,phase};
    try {ASCENT_TRIAL_STORAGE?.setItem(ACCOUNT_DELETION_KEY,JSON.stringify(accountDeletion.marker));}catch(_) {}
}
function deleteUserElement(id) {return document.getElementById(id);}
function updateDeleteUserButton() {
    deleteUserElement('debugDeleteUser').hidden=true;deleteUserElement('debugDeleteUser').disabled=true;return; // Artifact-only safety gate.
    const button=deleteUserElement('debugDeleteUser');
    button.hidden=!debugMode;
    button.disabled=!online.uid || !online.adapter?.deleteAccount || accountDeletion.busy;
}
function showDeleteUserDialog() {
    return false; // Artifact-only safety gate.
    const done=accountDeletion.marker?.phase==='done';
    deleteUserElement('deleteUserSummary').textContent=done?gameText("account-deletion.showDeleteUserDialog.3"):gameText("account-deletion.identitySummary", {value0: playerName, value1: online.uid || accountDeletion.marker?.uid || ''});
    deleteUserElement('deleteUserWarning').hidden=done;
    deleteUserElement('deleteUserConfirm').hidden=done;
    deleteUserElement('deleteUserNew').hidden=!done;
    deleteUserElement('deleteUserCancel').hidden=!!accountDeletion.marker;
    deleteUserElement('deleteUserConfirm').disabled=accountDeletion.busy || !online.uid || !online.adapter?.deleteAccount;
    deleteUserElement('deleteUserStatus').textContent=done?
        gameText("account-deletion.showDeleteUserDialog.2"):
        accountDeletion.marker?gameText("account-deletion.showDeleteUserDialog"):'';
    const dialog=deleteUserElement('deleteUserDialog');if(!dialog.open)dialog.showModal?.();
}
async function restoreDeletionSession(adapter) {
    return false; // Artifact-only safety gate.
    if(accountDeletion.restoreBusy || accountDeletion.marker?.phase==='done')return;
    accountDeletion.restoreBusy=true;online.adapter=adapter;
    try {
        const user=await adapter.authenticate(false);
        if(user?.uid!==accountDeletion.marker.uid)throw new Error('Original authentication is unavailable');
        online.uid=user.uid;online.ready=false;
        setOnlineStatus(gameText("account-deletion"));showDeleteUserDialog();
    } catch(error) {
        setOnlineStatus(gameText("account-deletion.restoreDeletionSession"));
        console.warn('Account deletion restore:',error?.code || error?.message);
    } finally {accountDeletion.restoreBusy=false;updateDeleteUserButton();}
}
async function waitForAccountWrites() {
    const deadline=Date.now()+30000;
    while(online.saving || onlineScores.saving) {
        if(Date.now()>deadline)throw new Error('Existing save has not finished');
        await new Promise(resolve=>setTimeout(resolve,50));
    }
}
function clearLocalGameData() {
    // Leave other applications on the same GitHub Pages origin untouched.
    const keys=[APPEARANCE_KEY,PLAYER_NAME_KEY,PLAYER_UUID_KEY,ONLINE_PROFILE_KEY,ONLINE_SCORES_KEY,
        PROGRESS_KEY,RECORDS_KEY,HEART_ITEMS_KEY,LIVES_KEY,MAP_REWARDS_KEY,FEATURE_HELP_KEY,SOUND_KEY,MUSIC_KEY,SOUND_VOLUME_KEY,
        LANGUAGE_KEY,AD_PLAYS_KEY,DAILY_RECORDS_KEY,DAILY_ATTEMPTS_KEY,DAILY_PLAY_AD_KEY,
        'ascent.ad-clears.v1','ascent.ad-plays.v1','ascent.daily-entry-ad.v1','ascent.transfer-identity.v1'];
    for(const key of keys)ASCENT_TRIAL_STORAGE?.removeItem(key);
}
async function deleteCurrentAccount() {
    return false; // Artifact-only safety gate.
    if(accountDeletion.busy || accountDeletion.marker?.phase==='done' || !online.uid || !online.adapter?.deleteAccount)return;
    if(!accountDeletion.marker && (!debugMode || !settingsOpen || !['map','daily'].includes(state)))return;
    const uid=accountDeletion.marker?.uid || online.uid;
    if(online.uid!==uid)return;
    accountDeletion.busy=true;markAccountDeletion(uid,'pending');online.ready=false;
    const confirm=deleteUserElement('deleteUserConfirm'),cancel=deleteUserElement('deleteUserCancel'),status=deleteUserElement('deleteUserStatus');
    confirm.disabled=cancel.disabled=true;cancel.hidden=true;updateDeleteUserButton();
    try {
        status.textContent=gameText("account-deletion.deleteCurrentAccount.6");
        await online.adapter.lockDeletion(uid);
        await waitForAccountWrites();
        await online.adapter.deleteAccount(uid,count=>{status.textContent=gameText("account-deletion.deleteCurrentAccount.5", {value0: count});});
        // Server deletion is complete even if local storage is unavailable.
        markAccountDeletion(uid,'done');online.uid=null;online.dirty=false;
        onlineScores.pending.clear();onlineScores.boards.clear();online.pages.clear();persistPendingScores();
        try {clearLocalGameData();}catch(error){console.warn('Local cleanup:',error?.message);}
        markAccountDeletion(uid,'done');setOnlineStatus(gameText("account-deletion.deleteCurrentAccount.4"));
        ui.playerUuid.textContent=gameText("account-deletion.deleteCurrentAccount.3");showDeleteUserDialog();
    } catch(error) {
        status.textContent=error?.code==='auth/requires-recent-login'?
            gameText("account-deletion.deleteCurrentAccount.2"):
            gameText("account-deletion.deleteCurrentAccount");
        console.warn('Account deletion:',error?.code || error?.message);
    } finally {
        accountDeletion.busy=false;confirm.disabled=cancel.disabled=false;updateDeleteUserButton();
    }
}
deleteUserElement('debugDeleteUser').onclick=()=>{
    if(debugMode && settingsOpen && ['map','daily'].includes(state) && online.uid && online.adapter?.deleteAccount)showDeleteUserDialog();
};
deleteUserElement('deleteUserConfirm').onclick=deleteCurrentAccount;
deleteUserElement('deleteUserCancel').onclick=()=>{if(!accountDeletion.busy && !accountDeletion.marker)deleteUserElement('deleteUserDialog').close?.();};
deleteUserElement('deleteUserDialog').addEventListener('cancel',event=>{
    if(accountDeletion.busy || accountDeletion.marker)event.preventDefault();
});
deleteUserElement('deleteUserNew').onclick=()=>{
    return false; // Artifact-only safety gate.
    if(accountDeletion.busy || accountDeletion.marker?.phase!=='done')return;
    try {clearLocalGameData();ASCENT_TRIAL_STORAGE?.removeItem(ACCOUNT_DELETION_KEY);}
    catch(_) {deleteUserElement('deleteUserStatus').textContent=gameText("account-deletion.2");return;}
    accountDeletion.marker=null;globalThis.location?.reload();
};
window.addEventListener('storage',event=>{
    if(event.key!==ACCOUNT_DELETION_KEY || !event.newValue)return;
    const marker=readAccountDeletion();
    if(marker && (!online.uid || marker.uid===online.uid)) {
        accountDeletion.marker=marker;online.ready=false;
        setOnlineStatus(gameText("account-deletion"));
        if(marker.phase==='done'){online.dirty=false;onlineScores.pending.clear();onlineScores.boards.clear();online.pages.clear();showDeleteUserDialog();}
    }
});
