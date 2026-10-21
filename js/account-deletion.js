"use strict";
const ACCOUNT_DELETION_KEY='ascent.account-deletion.v1';
function readAccountDeletion() {
    try {
        const value=JSON.parse(globalThis.localStorage?.getItem(ACCOUNT_DELETION_KEY)||'null');
        if(value && typeof value.uid==='string' && ['pending','done'].includes(value.phase))return value;
    } catch(_) {}
    return null;
}
const accountDeletion={marker:readAccountDeletion(),busy:false,restoreBusy:false};
function markAccountDeletion(uid,phase) {
    accountDeletion.marker={uid,phase};
    try {globalThis.localStorage?.setItem(ACCOUNT_DELETION_KEY,JSON.stringify(accountDeletion.marker));}catch(_) {}
}
function deleteUserElement(id) {return document.getElementById(id);}
function updateDeleteUserButton() {
    const button=deleteUserElement('debugDeleteUser');
    button.hidden=!debugMode;
    button.disabled=!online.uid || !online.adapter?.deleteAccount || accountDeletion.busy;
}
function showDeleteUserDialog() {
    const done=accountDeletion.marker?.phase==='done';
    deleteUserElement('deleteUserSummary').textContent=done?'ユーザーデータを削除しました。':`${playerName}\nUID: ${online.uid || accountDeletion.marker?.uid || ''}`;
    deleteUserElement('deleteUserWarning').hidden=done;
    deleteUserElement('deleteUserConfirm').hidden=done;
    deleteUserElement('deleteUserNew').hidden=!done;
    deleteUserElement('deleteUserCancel').hidden=!!accountDeletion.marker;
    deleteUserElement('deleteUserConfirm').disabled=accountDeletion.busy || !online.uid || !online.adapter?.deleteAccount;
    deleteUserElement('deleteUserStatus').textContent=done?
        'このウィンドウを閉じてください。新しいユーザーは自動作成しません。':
        accountDeletion.marker?'前回の削除は完了していません。「削除する」で再試行してください。':'';
    const dialog=deleteUserElement('deleteUserDialog');if(!dialog.open)dialog.showModal?.();
}
async function restoreDeletionSession(adapter) {
    if(accountDeletion.restoreBusy || accountDeletion.marker?.phase==='done')return;
    accountDeletion.restoreBusy=true;online.adapter=adapter;
    try {
        const user=await adapter.authenticate(false);
        if(user?.uid!==accountDeletion.marker.uid)throw new Error('Original authentication is unavailable');
        online.uid=user.uid;online.ready=false;
        setOnlineStatus('ユーザーデータの削除を待っています');showDeleteUserDialog();
    } catch(error) {
        setOnlineStatus('削除を再開できません。元の認証情報が必要です');
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
        PROGRESS_KEY,RECORDS_KEY,HEART_ITEMS_KEY,LIVES_KEY,MAP_REWARDS_KEY,FEATURE_HELP_KEY,SOUND_KEY,
        AD_CLEARS_KEY,DAILY_RECORDS_KEY,DAILY_ATTEMPTS_KEY,DAILY_ENTRY_AD_KEY];
    for(const key of keys)globalThis.localStorage?.removeItem(key);
}
async function deleteCurrentAccount() {
    if(accountDeletion.busy || accountDeletion.marker?.phase==='done' || !online.uid || !online.adapter?.deleteAccount)return;
    if(!accountDeletion.marker && (!debugMode || !settingsOpen || !['map','daily'].includes(state)))return;
    const uid=accountDeletion.marker?.uid || online.uid;
    if(online.uid!==uid)return;
    accountDeletion.busy=true;markAccountDeletion(uid,'pending');online.ready=false;
    const confirm=deleteUserElement('deleteUserConfirm'),cancel=deleteUserElement('deleteUserCancel'),status=deleteUserElement('deleteUserStatus');
    confirm.disabled=cancel.disabled=true;cancel.hidden=true;updateDeleteUserButton();
    try {
        status.textContent='削除中…このウィンドウを閉じずにお待ちください。';
        await online.adapter.lockDeletion(uid);
        await waitForAccountWrites();
        await online.adapter.deleteAccount(uid,count=>{status.textContent=`スコアを削除中… ${count}件`;});
        // Server deletion is complete even if local storage is unavailable.
        markAccountDeletion(uid,'done');online.uid=null;online.dirty=false;
        onlineScores.pending.clear();onlineScores.boards.clear();online.pages.clear();persistPendingScores();
        try {clearLocalGameData();}catch(error){console.warn('Local cleanup:',error?.message);}
        markAccountDeletion(uid,'done');setOnlineStatus('ユーザーデータを削除しました');
        ui.playerUuid.textContent='ユーザーデータ削除済み';showDeleteUserDialog();
    } catch(error) {
        status.textContent=error?.code==='auth/requires-recent-login'?
            '認証の再確認が必要です。表示中のUIDを控え、Firebase管理画面で認証アカウントを削除してください。':
            '削除が完了していません。接続とFirestoreのルールを確認して再試行してください。';
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
    if(accountDeletion.busy || accountDeletion.marker?.phase!=='done')return;
    try {clearLocalGameData();globalThis.localStorage?.removeItem(ACCOUNT_DELETION_KEY);}
    catch(_) {deleteUserElement('deleteUserStatus').textContent='端末の保存データを初期化できませんでした。';return;}
    accountDeletion.marker=null;globalThis.location?.reload();
};
window.addEventListener('storage',event=>{
    if(event.key!==ACCOUNT_DELETION_KEY || !event.newValue)return;
    const marker=readAccountDeletion();
    if(marker && (!online.uid || marker.uid===online.uid)) {
        accountDeletion.marker=marker;online.ready=false;
        setOnlineStatus('ユーザーデータの削除を待っています');
        if(marker.phase==='done'){online.dirty=false;onlineScores.pending.clear();onlineScores.boards.clear();online.pages.clear();showDeleteUserDialog();}
    }
});
