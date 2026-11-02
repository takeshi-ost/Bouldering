'use strict';
// Presentation only: no queue mutation, persistence, network or identity output.
function createNativeSyncStatus({document,policy,language=()=> 'ja',connectionSignals=()=>globalThis.ASCENT_SETTINGS_CONNECTION}) {
    let report={},stats={},seenSuccesses=0,reportError='',syncError='',verified=false,verifiedEpoch=null;
    function acceptSignals() {
        const signal=connectionSignals(),count=report.connectionSuccesses;
        const fresh=Number.isSafeInteger(count)&&count>seenSuccesses;
        if(fresh)seenSuccesses=count;
        // Consume each controller response once. A language/settings repaint is
        // never evidence of a new request and must not revive an old success.
        const failed=(report.lastError&&report.lastError!==reportError)||(stats.syncError&&stats.syncError!==syncError);
        reportError=report.lastError||'';syncError=stats.syncError||'';
        if(failed){verified=false;verifiedEpoch=null;signal?.failure();return;}
        if(!fresh)return;
        const epoch=report.connectionEpoch;
        if(signal && (!Number.isSafeInteger(epoch)||epoch<0||epoch!==signal.ticket()))return;
        verified=true;verifiedEpoch=epoch;signal?.success(epoch);
    }
    function refresh() {
        const p=policy()||{},allowed=p.configuration==='Debug' && p.syncStatusAllowed===true;
        const connection=document?.getElementById('onlineStatus'),pending=document?.getElementById('onlineScoreStatus');
        const en=language()==='en';
        const signal=connectionSignals();if(signal && verifiedEpoch!==signal.ticket())verified=false;
        const rawError=stats.syncError || report.lastError || '';
        const code=/^(auth|firestore|native-firebase|native-sync)\/[a-z0-9-]{1,64}$/.test(rawError)?rawError:'';
        if(connection) {
            connection.hidden=!allowed;
            const state=rawError?(en?'Sync error':'同期エラー'):!p.firebaseEnabled?(en?'Offline':'オフライン'):
                stats.profilePending || stats.freshPending?(en?'Sync pending':'同期保留'):
                verified?(en?'Online sync':'オンライン同期'):(en?'Connecting':'接続確認中');
            connection.textContent=allowed?state+(code?' ('+code+')':''):'';
        }
        if(pending) {
            pending.hidden=!allowed || p.firebaseMode!=='auto-sync';
            const count=Number.isSafeInteger(stats.freshPending)&&stats.freshPending>=0?String(stats.freshPending):(en?'checking':'確認中');
            pending.textContent=pending.hidden?'':(en?'Scores waiting to upload: ':'スコアの送信待ち：')+count+(en?'':'件')+
                (stats.profilePending?(en?' / Profile pending':' / プロフィール同期待ち'):'');
        }
    }
    refresh();
    return Object.freeze({update:(nextReport,nextStats)=>{report={...nextReport};stats={...nextStats};acceptSignals();refresh();},refresh});
}
module.exports={createNativeSyncStatus};
