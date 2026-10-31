"use strict";
// Explicit generations: retired prototype scores remain valid historical data only.
function supportedCourseVersion(version) {return version==="trial-d6-0.4.12";}
function supportedScoreBoard(board) {
    return false; // This artifact has no online board.
    return typeof board==='string' && /^(?:v1_(?:existing|prototype)|v[23]_existing)_[1-9][0-9]{0,5}$/.test(board);
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
if(typeof module!=='undefined' && module.exports)module.exports={scoreMetadata,currentScoreMetadata,currentDailyScoreMetadata,supportedCourseVersion,supportedScoreBoard,scoreMatchesBoard};
