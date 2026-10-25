"use strict";
// Missing historical metadata stays unknown; never infer it from the current app
// or the board's legacy version field during load, retry or server readback.
function scoreMetadata(score) {
    const text=(value,max)=>typeof value==='string' && value.length>0 && value.length<=max?value:null;
    return {appVersion:text(score?.appVersion,64),buildNumber:text(score?.buildNumber,32),
        platform:text(score?.platform,32),scoreSpecVersion:text(score?.scoreSpecVersion,32)};
}
function currentScoreMetadata() {
    const native=globalThis.ASCENT_IOS_BUILD;
    return scoreMetadata({appVersion:typeof RELEASE_VERSION==='string'?RELEASE_VERSION:null,
        buildNumber:native?.buildNumber,platform:native?'iOS':'Web',
        // COURSE_VERSION already identifies incompatible course/gameplay rules.
        // Reuse that generation; an app release does not advance it.
        scoreSpecVersion:typeof COURSE_VERSION==='string'?COURSE_VERSION:null});
}
if(typeof module!=='undefined' && module.exports)module.exports={scoreMetadata,currentScoreMetadata};
