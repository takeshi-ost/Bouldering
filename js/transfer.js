"use strict";
const TRANSFER_IDENTITY_KEY='ascent.transfer-identity.v1';
const TRANSFER_PROJECT='bouldering-7482d',TRANSFER_MAX_BYTES=4*1024*1024;
const transferState={busy:false,pendingReload:false,file:null,url:null,readTicket:0};
function transferElement(id){return document.getElementById(id);}
function transferBusy(){return transferState.busy || transferState.pendingReload;}
function transferObject(value){return !!value && typeof value==='object' && !Array.isArray(value);}
function transferInteger(value,min=0,max=Number.MAX_SAFE_INTEGER-1){return Number.isSafeInteger(value) && value>=min && value<=max;}
function validTransferIdentity(value) {
    return transferObject(value) && value.project===TRANSFER_PROJECT && typeof value.uid==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(value.uid) &&
        typeof value.email==='string' && /^transfer-[0-9a-f]{32}@bouldering-7482d\.firebaseapp\.com$/.test(value.email) &&
        typeof value.password==='string' && /^Aa1![0-9a-f]{64}$/.test(value.password);
}
function createTransferIdentity(uid) {
    if(!globalThis.crypto?.getRandomValues)throw Error(gameText("transfer.createTransferIdentity"));
    const hex=size=>Array.from(globalThis.crypto.getRandomValues(new Uint8Array(size)),b=>b.toString(16).padStart(2,'0')).join('');
    return {project:TRANSFER_PROJECT,uid,email:`transfer-${hex(16)}@bouldering-7482d.firebaseapp.com`,password:'Aa1!'+hex(32)};
}
function readTransferIdentity() {
    try {const value=JSON.parse(globalThis.localStorage?.getItem(TRANSFER_IDENTITY_KEY)||'null');return validTransferIdentity(value)?value:null;}
    catch(_){return null;}
}
function snapshotTransferData() {
    recoverLives();
    return JSON.parse(JSON.stringify({
        profile:{name:playerName,colors:[...playerColors],headColor:playerHeadColor},
        progress:stageProgress,records:stageRecords,dailyRecords,dailyAttempts,dailyPlayAdState,
        heartItems,lives:{...lives,inProgress:false},mapRewards,featureHelpSeen,soundEnabled,audioSettings:{musicEnabled,musicVolume,soundVolume},playsSinceAd,
        pendingScores:[...onlineScores.pending],localId:playerUuid
    }));
}
function validateTransferFile(value) {
    const fail=()=>{throw Error(gameText("transfer"));};
    if(new Blob([JSON.stringify(value)]).size>TRANSFER_MAX_BYTES)fail();
    if(!transferObject(value) || value.format!=='ascent-transfer' || value.version!==1 ||
        !validTransferIdentity(value.identity) || !transferObject(value.data))fail();
    const d=value.data,p=d.profile;
    if(!transferObject(p) || typeof p.name!=='string' || !normalizedPlayerName(p.name) || Array.from(p.name).length>40 ||
        !Array.isArray(p.colors) || p.colors.length<1 || p.colors.length>8 || !p.colors.every(validBodyColor) || !validBodyColor(p.headColor))fail();
    for(const mode of ['existing','prototype']) {
        if(!transferInteger(d.progress?.[mode]?.cleared,0,999999) || !transferObject(d.records?.[mode]))fail();
        for(const [key,record] of Object.entries(d.records[mode])) {
            if(!/^[1-9]\d*$/.test(key) || !transferInteger(Number(key),1,999999) || !validTransferRecord(record))fail();
        }
    }
    if(!transferObject(d.dailyRecords) || !transferObject(d.dailyAttempts))fail();
    for(const [date,record] of Object.entries(d.dailyRecords)) {
        if(!validDailyDate(date) || !validTransferRecord(record) || !transferInteger(record.stars,1,3) ||
            (record.clearedOn!==undefined && (!validDailyDate(record.clearedOn) || record.clearedOn<date)) ||
            (record.rewardStatus!==undefined && !['pending','claimed'].includes(record.rewardStatus)) ||
            (record.rewardAdCompleted!==undefined && typeof record.rewardAdCompleted!=='boolean'))fail();
    }
    for(const [date,count] of Object.entries(d.dailyAttempts))if(!validDailyDate(date) || !transferInteger(count,1))fail();
    if(!transferObject(d.dailyPlayAdState) || ![0,1].includes(d.dailyPlayAdState.plays) || typeof d.dailyPlayAdState.adPaid!=='boolean' ||
        !transferInteger(d.heartItems) || !transferObject(d.lives) || !transferInteger(d.lives.count,0,LIFE_MAX) || d.lives.inProgress!==false ||
        !(d.lives.recoveryAt===null || (Number.isFinite(d.lives.recoveryAt) && d.lives.recoveryAt>=0)) ||
        (d.lives.attemptAt!==undefined && (!Number.isFinite(d.lives.attemptAt) || d.lives.attemptAt<0)) ||
        !transferObject(d.mapRewards) || !transferObject(d.featureHelpSeen) ||
        typeof d.featureHelpSeen.heart!=='boolean' || typeof d.featureHelpSeen.hazard!=='boolean' ||
        typeof d.soundEnabled!=='boolean' || !transferInteger(d.playsSinceAd))fail();
    if(d.audioSettings!==undefined && (!transferObject(d.audioSettings) ||
        typeof d.audioSettings.musicEnabled!=='boolean' || !validAudioVolume(d.audioSettings.musicVolume) || !validAudioVolume(d.audioSettings.soundVolume)))fail();
    for(const [key,reward] of Object.entries(d.mapRewards)) {
        if(!/^[1-9]\d*$/.test(key) || !transferInteger(Number(key),1) || (Number(key)%4 && Number(key)%10) ||
            !transferObject(reward) || !['pending','claimed'].includes(reward.status) ||
            typeof reward.adRequired!=='boolean' || typeof reward.adCompleted!=='boolean')fail();
    }
    if(!Array.isArray(d.pendingScores) || d.pendingScores.length>10000 || d.pendingScores.some(entry=>
        !Array.isArray(entry) || entry.length!==2 || !validScoreBoard(entry[0]) || !validStageScore(entry[1])))fail();
    if(d.localId!==undefined && (typeof d.localId!=='string' || !/^[0-9a-f-]{36}$/i.test(d.localId)))fail();
    return value;
}
function validTransferRecord(value) {
    return transferObject(value) && transferInteger(value.moves,1) && transferInteger(value.timeMs) &&
        (value.stars===undefined || transferInteger(value.stars,1,3)) &&
        (value.version===undefined || (typeof value.version==='string' && value.version.length<=40));
}
function transferStorageEntries(file) {
    const d=file.data;
    return new Map([
        [APPEARANCE_KEY,{colors:d.profile.colors,headColor:d.profile.headColor}],[PLAYER_NAME_KEY,d.profile.name],
        [PROGRESS_KEY,d.progress],[RECORDS_KEY,d.records],[DAILY_RECORDS_KEY,d.dailyRecords],
        [DAILY_ATTEMPTS_KEY,d.dailyAttempts],[DAILY_PLAY_AD_KEY,d.dailyPlayAdState],[HEART_ITEMS_KEY,d.heartItems],
        [LIVES_KEY,d.lives],[MAP_REWARDS_KEY,d.mapRewards],[FEATURE_HELP_KEY,d.featureHelpSeen],
        [SOUND_KEY,d.soundEnabled],[MUSIC_KEY,{enabled:d.audioSettings?.musicEnabled ?? d.soundEnabled,volume:d.audioSettings?.musicVolume ?? 1}],
        [SOUND_VOLUME_KEY,d.audioSettings?.soundVolume ?? 1],[AD_PLAYS_KEY,d.playsSinceAd],
        [ONLINE_SCORES_KEY,{uid:file.identity.uid,items:d.pendingScores}],[TRANSFER_IDENTITY_KEY,file.identity],
        [ONLINE_PROFILE_KEY,undefined],...(d.localId?[[PLAYER_UUID_KEY,d.localId]]:[])
    ]);
}
function commitTransferFile(file) {
    const entries=transferStorageEntries(file),storage=globalThis.localStorage;
    if(!storage)throw Error(gameText("transfer.commitTransferFile.2"));
    const previous=new Map([...entries.keys()].map(key=>[key,storage.getItem(key)]));
    try {
        // Free the old save's space first. Only our explicit game keys are touched.
        for(const key of entries.keys())storage.removeItem(key);
        for(const [key,value] of entries)if(value!==undefined)
            storage.setItem(key,key===PLAYER_UUID_KEY?value:JSON.stringify(value));
    } catch(error) {
        for(const key of entries.keys())storage.removeItem(key);
        for(const [key,value] of previous)if(value!==null)storage.setItem(key,value);
        throw Error(gameText("transfer.commitTransferFile"));
    }
}
function renderTransferAvailability() {
    const ready=online.ready && !accountDeletion.marker && !transferBusy();
    transferElement('transferExport').disabled=!ready;
    transferElement('transferImport').disabled=!ready || !transferState.file;
    transferElement('transferFile').disabled=transferBusy() || !!accountDeletion.marker;
    transferElement('transferClose').disabled=transferBusy();
}
function transferMessage(message){transferElement('transferStatus').textContent=message;}
function transferErrorMessage(error) {
    if(error?.code==='auth/operation-not-allowed')return gameText("transfer.transferErrorMessage.4");
    if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/user-disabled'].includes(error?.code))return gameText("transfer.transferErrorMessage.3");
    if(error?.code==='auth/network-request-failed')return gameText("transfer.transferErrorMessage.2");
    return error?.message || gameText("transfer.transferErrorMessage");
}
async function withTransferLock(action) {
    if(transferBusy() || state!=='choosing' || accountDeletion.marker || !online.ready)throw Error(gameText("transfer.withTransferLock"));
    transferState.busy=true;const wasReady=online.ready;online.ready=false;renderTransferAvailability();
    try {await waitForAccountWrites();return await action();}
    finally {
        transferState.busy=false;
        if(!transferState.pendingReload)online.ready=wasReady;
        renderTransferAvailability();
        if(!transferState.pendingReload)resumeOnline();
    }
}
async function exportTransferFile() {
    return withTransferLock(async()=>{
        transferMessage(gameText("transfer.exportTransferFile.2"));
        let identity=readTransferIdentity();
        if(identity?.uid!==online.uid)identity=createTransferIdentity(online.uid);
        // Keep credentials durable before linking; a retry can recover from a
        // lost response without creating another account or rotating its password.
        try {globalThis.localStorage.setItem(TRANSFER_IDENTITY_KEY,JSON.stringify(identity));}
        catch(_){throw Error(gameText("transfer.exportTransferFile"));}
        await online.adapter.prepareTransferIdentity(identity);
        const file=validateTransferFile({format:'ascent-transfer',version:1,createdAt:new Date().toISOString(),identity,data:snapshotTransferData()});
        return file;
    });
}
async function importTransferFile(file) {
    validateTransferFile(file);
    return withTransferLock(async()=>{
        transferMessage(gameText("transfer.importTransferFile.3"));
        await online.adapter.importTransferIdentity(file.identity,()=>commitTransferFile(file));
        online.uid=file.identity.uid;updateTitleUid();transferState.pendingReload=true;
        transferMessage(gameText("transfer.importTransferFile.2"));
        transferElement('transferReload').hidden=false;
        try {window.location?.reload();}catch(_){transferMessage(gameText("transfer.importTransferFile"));}
    });
}
function closeTransferDialog() {
    if(transferBusy())return;
    transferElement('transferDialog').close?.();ui.wall.classList.toggle('transfer-open',false);
    if(transferState.url)URL.revokeObjectURL(transferState.url);
    transferState.url=null;transferState.file=null;transferState.readTicket++;
    transferElement('transferDownload').hidden=true;transferElement('transferPreview').hidden=true;
    transferElement('transferImport').hidden=true;transferElement('transferFile').value='';
    ui.titleTransfer.focus();requestGameRender();
}
ui.titleTransfer.onclick=e=>{
    e?.stopPropagation?.();
    if(state!=='choosing' || accountDeletion.marker)return;
    transferElement('transferDialog').showModal?.();ui.wall.classList.toggle('transfer-open',true);
    transferMessage(online.ready?'':online.status);renderTransferAvailability();
};
transferElement('transferClose').onclick=closeTransferDialog;
transferElement('transferDialog').addEventListener('cancel',e=>{e.preventDefault();closeTransferDialog();});
transferElement('transferExport').onclick=async()=>{
    try {
        const file=await exportTransferFile();
        if(transferState.url)URL.revokeObjectURL(transferState.url);
        transferState.url=URL.createObjectURL(new Blob([JSON.stringify(file)],{type:'application/json'}));
        const link=transferElement('transferDownload');link.href=transferState.url;
        link.download=`ASCENT-transfer-${localToday()}.json`;link.hidden=false;
        transferMessage(gameText("transfer.6"));
    } catch(error){transferMessage(transferErrorMessage(error));}
};
transferElement('transferFile').onchange=async e=>{
    const ticket=++transferState.readTicket;
    transferState.file=null;transferElement('transferPreview').hidden=true;transferElement('transferImport').hidden=true;
    try {
        const selected=e.target.files?.[0];if(!selected)return;
        if(selected.size>TRANSFER_MAX_BYTES)throw Error(gameText("transfer.5"));
        const text=await selected.text();if(text.length>TRANSFER_MAX_BYTES)throw Error(gameText("transfer.4"));
        const file=validateTransferFile(JSON.parse(text));
        if(ticket!==transferState.readTicket || !transferElement('transferDialog').open)return;
        transferState.file=file;
        transferElement('transferPreview').textContent=gameText("transfer.3", {value0: file.data.profile.name, value1: file.identity.uid, value2: file.data.progress.existing.cleared+1});
        transferElement('transferPreview').hidden=false;transferElement('transferImport').hidden=false;
        transferMessage(gameText("transfer.2"));
    } catch(_){if(ticket===transferState.readTicket)transferMessage(gameText("transfer"));}
    renderTransferAvailability();
};
transferElement('transferImport').onclick=async()=>{
    if(!transferState.file)return;
    try {await importTransferFile(transferState.file);}catch(error){transferMessage(transferErrorMessage(error));}
};
transferElement('transferReload').onclick=()=>window.location?.reload();
