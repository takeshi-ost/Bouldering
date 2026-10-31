"use strict";
const ONLINE_SCORES_KEY='ascent.pending-scores.v1';
const onlineScores={pending:new Map(),owner:null,saving:false,boards:new Map()};
function scoreBoardKey(stage,mode) {
    return `${COURSE_VERSION}_${mode}_${stage}`;
}
function validStageScore(score) {
    return score && Number.isSafeInteger(score.moves) && score.moves>=1 && score.moves<=1000000 &&
        Number.isSafeInteger(score.timeMs) && score.timeMs>=0 && score.timeMs<=604800000;
}
function validScoreBoard(key) {
    return supportedScoreBoard(key);
}
function persistPendingScores() {
    try {ASCENT_TRIAL_STORAGE?.setItem(ONLINE_SCORES_KEY,JSON.stringify({uid:onlineScores.owner,items:[...onlineScores.pending]}));}catch(_) {}
    const status=document.getElementById('onlineScoreStatus');
    status.hidden=onlineScores.pending.size===0;
    status.textContent=onlineScores.pending.size?gameText("online-scores.persistPendingScores", {value0: onlineScores.pending.size}):'';
}
function readPendingScores() {
    try {
        const saved=JSON.parse(ASCENT_TRIAL_STORAGE?.getItem(ONLINE_SCORES_KEY)||'null');
        if(!saved || !Array.isArray(saved.items) || saved.items.length>10000)return;
        onlineScores.owner=typeof saved.uid==='string'?saved.uid:null;
        for(const entry of saved.items)if(Array.isArray(entry) && entry.length===2 && validScoreBoard(entry[0]) && validStageScore(entry[1]))
            onlineScores.pending.set(entry[0],{moves:entry[1].moves,timeMs:entry[1].timeMs,...scoreMetadata(entry[1])});
    } catch(_) {}
}
readPendingScores();
persistPendingScores();
function connectOnlineScores(uid) {
    return false; // Artifact-only safety gate.
    // Do not submit another guest account's pending records under a new identity.
    if(onlineScores.owner && onlineScores.owner!==uid)onlineScores.pending.clear();
    onlineScores.owner=uid;persistPendingScores();void flushOnlineScores();refreshOpenScoreViews();
}
function queueOnlineScore(stage,mode,score) {
    return false; // Artifact-only safety gate.
    if(accountDeletion.marker)return false;
    if(mode!=='existing')return false;
    const board=scoreBoardKey(stage,mode);
    if(!validScoreBoard(board) || !validStageScore(score) || !scoreMatchesBoard(board,score))return false;
    const existing=onlineScores.pending.get(board);
    if(!existing || compareStageScores(score,existing)<0)
        onlineScores.pending.set(board,{moves:score.moves,timeMs:score.timeMs,...scoreMetadata(score)});
    if(!onlineScores.owner)onlineScores.owner=online.uid || readOnlineCheckpoint()?.uid || null;
    persistPendingScores();
    const cached=onlineScores.boards.get(board);if(cached)cached.at=0;
    void flushOnlineScores();return true;
}
async function flushOnlineScores() {
    return false; // Artifact-only safety gate.
    if(accountDeletion.marker || !online.ready || !online.adapter.saveScore || onlineScores.saving || (typeof transferBusy==='function' && transferBusy()))return;
    onlineScores.saving=true;
    try {
        while(onlineScores.pending.size && !accountDeletion.marker && !(typeof transferBusy==='function' && transferBusy())) {
            // Retain retired-mode entries locally, without sending or blocking normal scores.
            const next=[...onlineScores.pending].find(([key])=>validScoreBoard(key) && key.split('_')[1]==='existing');
            if(!next)break;
            const [board,score]=next;
            if(onlineScores.owner!==online.uid)return;
            const saved=await online.adapter.saveScore(online.uid,board,score);
            if(accountDeletion.marker)return;
            if(!validStageScore(saved))throw new Error('Invalid saved score');
            if(onlineScores.pending.get(board)===score)onlineScores.pending.delete(board);
            const [version,mode,n]=board.split('_'),stage=Number(n);
            // A legacy upload must never replace a newer-generation local best.
            if(version===COURSE_VERSION) {
                const previous=stageRecords[mode][stage];
                const best=previous?.version===version && compareStageScores(previous,saved)<=0?previous:saved;
                const previousVersions={...previous?.previousVersions};
                if(previous && supportedCourseVersion(previous.version) && previous.version!==version) {
                    const {previousVersions:ignored,...historical}=previous;
                    previousVersions[previous.version]=historical;
                }
                stageRecords[mode][stage]={moves:best.moves,timeMs:best.timeMs,...scoreMetadata(best),version,...(previous?.stars?{stars:previous.stars}:{}),...(Object.keys(previousVersions).length?{previousVersions}:{})};
                try {ASCENT_TRIAL_STORAGE?.setItem(RECORDS_KEY,JSON.stringify(stageRecords));}catch(_) {}
            }
            persistPendingScores();
            const cached=onlineScores.boards.get(board);if(cached){cached.at=0;cached.retry=cached.pending;}
            refreshOpenScoreViews(board);
        }
    } catch(error) {
        console.warn('Online score save:',error?.code || error?.message);
    } finally {onlineScores.saving=false;persistPendingScores();refreshOpenScoreViews();}
}
function stageScoreStatus(stage,mode) {
    const board=scoreBoardKey(stage,mode),page=onlineScores.boards.get(board);
    if(onlineScores.pending.has(board))return onlineScores.saving?gameText("online-scores.stageScoreStatus.6"):gameText("online-scores.stageScoreStatus.5");
    if(!online.ready)return gameText("online-scores.stageScoreStatus.4");
    if(page?.error)return gameText("online-scores.stageScoreStatus.3");
    if(page?.pending && !page.rows.length)return gameText("online-scores.stageScoreStatus.2");
    return page?.rows.length?'':gameText("online-scores.stageScoreStatus");
}
function onlineStageScores(stage,mode) {
    return []; // Artifact-only safety gate.
    if(mode!=='existing')return [];
    const board=scoreBoardKey(stage,mode);
    if(!validScoreBoard(board))return [];
    let page=onlineScores.boards.get(board);
    if(!page) {
        page={rows:[],at:0,pending:false,error:false,retry:false,loaded:false};onlineScores.boards.set(board,page);
        if(onlineScores.boards.size>12)onlineScores.boards.delete(onlineScores.boards.keys().next().value);
    }
    if(online.ready && online.adapter.scores && !page.pending && Date.now()-page.at>=ONLINE_CACHE_MS) {
        page.pending=true;page.at=Date.now();page.error=false;
        void online.adapter.scores(online.uid,board).then(rows=>{
            page.rows=rows.filter(row=>typeof row.id==='string' && validStageScore(row)).map(row=>{
                const profile=onlineProfileFrom(row.profile);
                return {id:row.id,moves:row.moves,timeMs:row.timeMs,...scoreMetadata(row),name:profile?.name || gameText("online-scores.onlineStageScores"),
                    appearance:profile?{colors:profile.colors,headColor:profile.headColor}:null};
            });
            page.loaded=true;
        }).catch(error=>{page.error=true;console.warn('Online ranking:',error?.message || error?.code);})
        .finally(()=>{
            page.pending=false;
            if(page.retry){page.retry=false;page.at=0;}
            if(onlineScores.boards.get(board)===page)refreshOpenScoreViews(board);
        });
    }
    return Object.defineProperty([...page.rows],'rankingReady',{value:page.loaded});
}
function refreshOpenScoreViews(board=null) {
    if(state==='won' && !dailyRun && (!board || scoreBoardKey(level,courseMode)===board))renderStageLeaderboard();
    const context=stageStartContext;
    if(context && (!board || scoreBoardKey(context.n,context.mode)===board))renderStageStartRecord(context);
}
