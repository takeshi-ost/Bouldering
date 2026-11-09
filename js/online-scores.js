"use strict";
const ONLINE_SCORES_KEY='ascent.pending-scores.v1';
const onlineScores={pending:new Map(),owner:null,saving:false,boards:new Map(),blocked:null};
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
    if(!COURSE_RANKINGS_ENABLED) {
        const status=document.getElementById('onlineScoreStatus');
        status.hidden=true;status.textContent='';return;
    }
    // Unsafe restored payloads remain byte-for-byte in their original key.
    if(!onlineScores.blocked)try {globalThis.localStorage?.setItem(ONLINE_SCORES_KEY,JSON.stringify({uid:onlineScores.owner,items:[...onlineScores.pending]}));}catch(_) {}
    const status=document.getElementById('onlineScoreStatus');
    status.hidden=!onlineScores.blocked && onlineScores.pending.size===0;
    status.textContent=onlineScores.blocked?gameText('online-scores.pendingBlocked'):onlineScores.pending.size?gameText("online-scores.persistPendingScores", {value0: onlineScores.pending.size}):'';
}
function readPendingScores() {
    try {
        const raw=globalThis.localStorage?.getItem(ONLINE_SCORES_KEY);
        if(raw==null)return;
        const saved=JSON.parse(raw);
        if(!saved || !Array.isArray(saved.items) || saved.items.length>10000 ||
            !(saved.uid==null || (typeof saved.uid==='string' && saved.uid.length>0))) {
            onlineScores.blocked='invalid-pending-envelope';return;
        }
        onlineScores.owner=saved.uid??null;
        const restored=new Map();
        for(const entry of saved.items) {
            if(!Array.isArray(entry) || entry.length!==2 || !validScoreBoard(entry[0]) ||
                !validStageScore(entry[1]) || !scoreMatchesBoard(entry[0],entry[1]) || restored.has(entry[0])) {
                onlineScores.blocked='invalid-pending-entry';return;
            }
            restored.set(entry[0],{moves:entry[1].moves,timeMs:entry[1].timeMs,...scoreMetadata(entry[1])});
        }
        onlineScores.pending=restored;
    } catch(_) {onlineScores.blocked='unreadable-pending';}
}
readPendingScores();
persistPendingScores();
function connectOnlineScores(uid) {
    if(!COURSE_RANKINGS_ENABLED)return;
    // Do not submit another guest account's pending records under a new identity.
    if(onlineScores.owner && onlineScores.owner!==uid) {
        onlineScores.blocked='pending-owner-mismatch';persistPendingScores();refreshOpenScoreViews();return;
    }
    if(onlineScores.blocked==='pending-owner-mismatch')onlineScores.blocked=null;
    if(onlineScores.blocked)return;
    onlineScores.owner=uid;persistPendingScores();void flushOnlineScores();refreshOpenScoreViews();
}
function queueOnlineScore(stage,mode,score) {
    if(!COURSE_RANKINGS_ENABLED)return false;
    if(onlineScores.blocked || score?.rankingEligible===false)return false;
    if(stage<1 || (typeof isTutorialRun==='function' && isTutorialRun()))return false;
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
    if(!COURSE_RANKINGS_ENABLED)return;
    if(onlineScores.blocked || accountDeletion.marker || !online.ready || !online.adapter.saveScore || onlineScores.saving || (typeof transferBusy==='function' && transferBusy()))return;
    onlineScores.saving=true;
    try {
        while(onlineScores.pending.size && !accountDeletion.marker && !(typeof transferBusy==='function' && transferBusy())) {
            // Retain retired-mode entries locally, without sending or blocking normal scores.
            const next=[...onlineScores.pending].find(([key])=>validScoreBoard(key) && key.split('_')[1]==='existing');
            if(!next)break;
            const [board,score]=next;
            if(onlineScores.owner!==online.uid)return;
            const connectionTicket=globalThis.ASCENT_SETTINGS_CONNECTION?.ticket();
            const saved=await online.adapter.saveScore(online.uid,board,score);
            if(accountDeletion.marker)return;
            if(!validStageScore(saved) || !scoreMatchesBoard(board,saved))throw new Error('Invalid saved score');
            globalThis.ASCENT_SETTINGS_CONNECTION?.success(connectionTicket);
            if(onlineScores.pending.get(board)===score)onlineScores.pending.delete(board);
            const [version,mode,n]=board.split('_'),stage=Number(n);
            // A legacy upload must never replace a newer-generation local best.
            if(version===COURSE_VERSION) {
                const previous=stageRecords[mode][stage];
                const best=previous?.version===version && compareStageScores(previous,saved)<=0?previous:saved;
                const previousVersions={...previous?.previousVersions};
                if(previous && historicalCourseVersion(previous.version) && previous.version!==version) {
                    const {previousVersions:ignored,...historical}=previous;
                    previousVersions[previous.version]=historical;
                }
                stageRecords[mode][stage]={moves:best.moves,timeMs:best.timeMs,...scoreMetadata(best),version,...(best.rankingEligible===false?{rankingEligible:false}:{}),...(previous?.version===version && previous?.stars?{stars:previous.stars}:{}),...(Object.keys(previousVersions).length?{previousVersions}:{})};
                try {globalThis.localStorage?.setItem(RECORDS_KEY,JSON.stringify(stageRecords));}catch(_) {}
            }
            persistPendingScores();
            const cached=onlineScores.boards.get(board);if(cached){cached.at=0;cached.retry=cached.pending;}
            refreshOpenScoreViews(board);
        }
    } catch(error) {
        globalThis.ASCENT_SETTINGS_CONNECTION?.failure();
        console.warn('Online score save:',error?.code || error?.message);
    } finally {onlineScores.saving=false;persistPendingScores();refreshOpenScoreViews();}
}
function stageScoreStatus(stage,mode) {
    if(onlineScores.blocked)return gameText('online-scores.pendingBlocked');
    const board=scoreBoardKey(stage,mode),page=onlineScores.boards.get(board);
    if(onlineScores.pending.has(board))return onlineScores.saving?gameText("online-scores.stageScoreStatus.6"):gameText("online-scores.stageScoreStatus.5");
    if(!online.ready)return gameText("online-scores.stageScoreStatus.4");
    if(page?.error)return gameText("online-scores.stageScoreStatus.3");
    if(page?.pending && !page.rows.length)return gameText("online-scores.stageScoreStatus.2");
    return page?.rows.length?'':gameText("online-scores.stageScoreStatus");
}
function onlineStageScores(stage,mode) {
    if(!COURSE_RANKINGS_ENABLED)return [];
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
        }).catch(error=>{page.error=true;globalThis.ASCENT_SETTINGS_CONNECTION?.failure();console.warn('Online ranking:',error?.message || error?.code);})
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
