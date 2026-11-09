"use strict";
// Progress adoption is separate from score/course revisions. Do not increment
// this for a balance change: same-generation devices keep their progress sync.
const ONLINE_PROGRESS_VERSION='v4';
function currentOnlineProgress(profile) {return profile?.progressVersion===ONLINE_PROGRESS_VERSION;}
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
    return typeof board==='string' && /^(?:v1_(?:existing|prototype)|v[2345]_existing)_[1-9][0-9]{0,5}$/.test(board);
}
function scoreMatchesBoard(board,score) {
    return supportedScoreBoard(board) && (score?.scoreSpecVersion==null || score.scoreSpecVersion===board.split('_')[0]);
}
// Missing historical metadata stays unknown; never infer it from the current app
// or the board's legacy version field during load, retry or server readback.
function scoreMetadata(score) {
    const text=(value,max)=>typeof value==='string' && value.length>0 && value.length<=max?value:null;
    return {appVersion:text(score?.appVersion,64),buildNumber:text(score?.buildNumber,32),
        platform:text(score?.platform,32),scoreSpecVersion:text(score?.scoreSpecVersion,32)};
}
function currentScoreMetadata(specVersion=typeof COURSE_VERSION==='string'?COURSE_VERSION:null) {
    const native=globalThis.ASCENT_IOS_BUILD;
    return scoreMetadata({appVersion:typeof RELEASE_VERSION==='string'?RELEASE_VERSION:null,
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
if(typeof module!=='undefined' && module.exports)module.exports={ONLINE_PROGRESS_VERSION,currentOnlineProgress,scoreMetadata,currentScoreMetadata,currentDailyScoreMetadata,supportedCourseVersion,historicalCourseVersion,supportedScoreBoard,scoreMatchesBoard};
