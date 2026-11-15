"use strict";
// One record season, independent of app releases and course generation.
// Never adopt untagged/older records automatically. Keep their namespaces intact.
const RECORD_VERSION='r1';
const ONLINE_PROGRESS_VERSION=RECORD_VERSION;
const REWARD_HISTORY_SCOPE_KEY='ascent.reward-history-scope.v1';
function recordStorageKey(key) {return `${key}.${RECORD_VERSION}`;}
function currentRecord(value) {return value?.recordVersion===RECORD_VERSION;}
function currentOnlineProgress(profile) {return currentRecord(profile) && profile.progressVersion===RECORD_VERSION;}
function recordScoreBoard(version,mode,stage) {return `${RECORD_VERSION}_${version}_${mode}_${stage}`;}
function scoreBoardParts(board) {const parts=board.split('_');return parts.length===4?parts.slice(1):parts;}
// Imported wallets replace the destination wallet. Preserve destination history
// bytes, but never treat another account's old receipts as the imported rights.
function rewardHistoryKeys() {
    const bases=['ascent.map-rewards.v1','ascent.daily-records.v1','ascent.reward-claims.v1'];
    const keys=new Set([...bases,...bases.map(recordStorageKey)]),storage=globalThis.localStorage;
    for(let i=0;i<(storage?.length||0);i++) {
        const key=storage.key(i);
        if(/^ascent\.(map-rewards|daily-records|reward-claims)\.v1(?:\.r[1-9][0-9]*)?$/.test(key))keys.add(key);
    }
    return [...keys];
}
// Entitlement history travels with backups, separate from playable records.
function rewardClaimHistory(kindFilter=null) {
    const storage=globalThis.localStorage,result={map:[],daily:[]};
    const scope=JSON.parse(storage?.getItem(REWARD_HISTORY_SCOPE_KEY)||'null');
    if(scope!==null && (!scope || typeof scope.ownerUid!=='string' || !scope.ownerUid || !Array.isArray(scope.excludedKeys) ||
        scope.excludedKeys.some(key=>typeof key!=='string' || !/^ascent\.(map-rewards|daily-records|reward-claims)\.v1(?:\.r[1-9][0-9]*)?$/.test(key))))
        throw Error('Invalid reward history scope');
    const excluded=new Set(scope?.excludedKeys||[]);
    const active=new Set(['ascent.map-rewards.v1','ascent.daily-records.v1','ascent.reward-claims.v1'].map(recordStorageKey));
    const ownHistory=key=>active.has(key) || !excluded.has(key);
    const bases={'ascent.map-rewards.v1':'map','ascent.daily-records.v1':'daily'};
    const keys=new Set(Object.keys(bases));
    for(let i=0;i<(storage?.length||0);i++)keys.add(storage.key(i));
    // Imported entitlement receipts may be the only surviving evidence on a
    // replacement device. Read every season's receipts before a future rollover.
    keys.add('ascent.reward-claims.v1');
    keys.add(recordStorageKey('ascent.reward-claims.v1'));
    for(const key of keys) {
        if(!ownHistory(key) || !/^ascent\.reward-claims\.v1(?:\.r[1-9][0-9]*)?$/.test(key))continue;
        const inherited=JSON.parse(storage?.getItem(key)||'null');
        if(inherited!==null && (!inherited || typeof inherited!=='object' || Array.isArray(inherited) ||
            !Array.isArray(inherited.map) || !Array.isArray(inherited.daily) ||
            inherited.map.some(id=>typeof id!=='string' || !/^[1-9][0-9]*$/.test(id)) ||
            inherited.daily.some(id=>typeof id!=='string' || !/^[1-9][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(id))))
            throw Error('Invalid reward receipts');
        for(const kind of ['map','daily'])if(Array.isArray(inherited?.[kind]))result[kind].push(...inherited[kind]);
    }
    for(const key of keys)for(const [base,kind] of Object.entries(bases)) {
        if(!ownHistory(key) || (kindFilter && kind!==kindFilter))continue;
        if(key!==base && !new RegExp('^'+base.replaceAll('.','\\.')+'\\.r[1-9][0-9]*$').test(key))continue;
        const records=JSON.parse(storage?.getItem(key)||'null');
        for(const [id,value] of Object.entries(records||{}))
            if((kind==='daily'?value?.rewardStatus:value?.status)==='claimed')result[kind].push(id);
    }
    return {map:[...new Set(result.map)],daily:[...new Set(result.daily)]};
}
function previouslyClaimedReward(base,key,daily=false) {
    try {return rewardClaimHistory(daily?'daily':'map')[daily?'daily':'map'].includes(String(key));}
    catch(_) {return true;} // Unreadable entitlement evidence must not mint a second grant.
}
// Explicit generations: retired prototype scores remain valid historical data only.
function supportedCourseVersion(version) {return version==='v1' || version==='v2' || version==='v3' || version==='v4' || version==='v5';}
// Local history is broader than upload eligibility. Trial provenance never
// becomes a formal score merely because its course happens to be equivalent.
function historicalCourseVersion(version) {
    if(supportedCourseVersion(version) || version==='trial-d6-0.4.12')return true;
    const match=typeof version==='string' && /^trial-d7-offset([1-9][0-9]{0,9})$/.exec(version);
    return !!match && Number(match[1])<=4294967295;
}
function supportedScoreBoard(board) {
    return typeof board==='string' && new RegExp('^'+RECORD_VERSION+'_v[12345]_existing_[1-9][0-9]{0,5}$').test(board);
}
function scoreMatchesBoard(board,score) {
    return supportedScoreBoard(board) && currentRecord(score) && score?.scoreSpecVersion===scoreBoardParts(board)[0];
}
// Missing historical metadata stays unknown; never infer it from the current app
// or the board's legacy version field during load, retry or server readback.
function scoreMetadata(score) {
    const text=(value,max)=>typeof value==='string' && value.length>0 && value.length<=max?value:null;
    return {recordVersion:text(score?.recordVersion,32),appVersion:text(score?.appVersion,64),buildNumber:text(score?.buildNumber,32),
        platform:text(score?.platform,32),scoreSpecVersion:text(score?.scoreSpecVersion,32)};
}
function currentScoreMetadata(specVersion=typeof COURSE_VERSION==='string'?COURSE_VERSION:null) {
    const native=globalThis.ASCENT_IOS_BUILD;
    return scoreMetadata({recordVersion:RECORD_VERSION,appVersion:typeof RELEASE_VERSION==='string'?RELEASE_VERSION:null,
        buildNumber:native?.buildNumber,platform:native?'iOS':'Web',
        // COURSE_VERSION already identifies incompatible course/gameplay rules.
        // Reuse that generation; an app release does not advance it.
        scoreSpecVersion:specVersion});
}
// Daily generation is unchanged by a normal-stage progression-only revision.
function currentDailyScoreMetadata() {
    return currentScoreMetadata(typeof DAILY_COURSE_VERSION==='string'?DAILY_COURSE_VERSION:
        typeof COURSE_VERSION==='string'?COURSE_VERSION:null);
}
if(typeof module!=='undefined' && module.exports)module.exports={REWARD_HISTORY_SCOPE_KEY,rewardHistoryKeys,rewardClaimHistory,previouslyClaimedReward,RECORD_VERSION,recordStorageKey,currentRecord,recordScoreBoard,scoreBoardParts,ONLINE_PROGRESS_VERSION,currentOnlineProgress,scoreMetadata,currentScoreMetadata,currentDailyScoreMetadata,supportedCourseVersion,historicalCourseVersion,supportedScoreBoard,scoreMatchesBoard};
