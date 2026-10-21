"use strict";
// Scores belong to one generation version, course mode and stage.
function compareStageScores(a,b) {return a.moves-b.moves || a.timeMs-b.timeMs;}
function currentStageScores(stage,mode,expectedMoves) {
    return onlineStageScores(stage,mode);
}
// Map profiles have a separate cache from stage scores.
function currentMapPlayers(first,last,mode) {
    return onlineMapPlayers(first,last,mode);
}

function stageLeaderboardRows(record,others) {
    const uid=online.uid || 'local-self';
    const remote=others.find(row=>row.id===uid);
    let own=record;
    if(remote && (!own || compareStageScores(remote,own)<0))own=remote;
    const sorted=others.filter(row=>row.id!==uid).map(row=>({...row,isPlayer:false}));
    if(own)sorted.push({...own,id:uid,name:playerName,isPlayer:true});
    sorted.sort((a,b)=>compareStageScores(a,b) ||
        (a.id && b.id?(a.id<b.id?-1:a.id>b.id?1:0):Number(a.isPlayer)-Number(b.isPlayer)));
    const rows=sorted.map((row,i)=>({...row,rank:i+1})),player=rows.find(row=>row.isPlayer);
    if(player?.rank>100)player.rank='100+';
    return !player || (typeof player.rank==='number' && player.rank<=5)?rows.slice(0,5):[...rows.slice(0,4),player];
}

function scoreText(value) {
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function scoreAvatar(row) {
    if(row.isPlayer) {
        const icon=playerIconMarkup('score-player-icon');
        if(icon)return icon;
    }
    const appearance=row.isPlayer?{colors:playerColors,headColor:playerHeadColor}:(row.appearance || {colors:[DEFAULT_BODY_COLOR],headColor:DEFAULT_HEAD_COLOR});
    const stripes=appearance.colors.map((color,i)=>
        `<rect x="0" y="${20*i/appearance.colors.length}" width="18" height="${20/appearance.colors.length}" fill="${color}"/>`).join('');
    return `<svg class="score-player-icon" viewBox="0 0 24 32" aria-hidden="true"><circle cx="12" cy="6" r="5.5" fill="${appearance.headColor}" stroke="#fff7e9"/><svg x="3" y="12" width="18" height="20" viewBox="0 0 18 20" style="overflow:hidden;border-radius:4px">${stripes}</svg><rect x="3" y="12" width="18" height="20" rx="4" fill="none" stroke="#fff7e9" stroke-width="2"/></svg>`;
}
function stageLeaderboardMarkup(record,others) {
    const rows=stageLeaderboardRows(record,others);
    if(others.rankingReady===false)rows.forEach(row=>row.rank='—');
    return rows.map(row=>`<li class="score-row${row.isPlayer?' is-player':''}"${row.isPlayer?' aria-current="true"':''}><span class="score-rank">${row.rank}</span>${scoreAvatar(row)}<span class="score-name" title="${scoreText(row.name)}">${scoreText(row.name)}</span><span class="score-moves">${row.moves}手</span><span class="score-time">${formatClearTime(row.timeMs)}</span></li>`).join('');
}

function renderStageLeaderboard(expectedMoves) {
    const record=stageRecords[courseMode][level];
    const own=!debugAttempt && record?.version===COURSE_VERSION?record:null;
    ui.resultLeaderboard.innerHTML=stageLeaderboardMarkup(own,currentStageScores(level,courseMode,expectedMoves));
    document.getElementById('resultScoreStatus').textContent=debugAttempt?'デバッグの記録は送信しません':stageScoreStatus(level,courseMode);
}
function renderStageStartRecord(context) {
    const record=context.n<=stageProgress[context.mode].cleared?stageRecords[context.mode][context.n]:null;
    ui.stageStartStars.hidden=!record?.stars;
    ui.stageStartStars.textContent=record?.stars?'⭐️'.repeat(record.stars):'';
    ui.stageStartStars.setAttribute('aria-label',record?.stars?`${record.stars}つ星`:'');
    ui.stageStartRanking.hidden=context.n>stageProgress[context.mode].cleared;
    ui.stageStartLeaderboard.innerHTML='';
    document.getElementById('stageScoreStatus').textContent='';
    if(ui.stageStartRanking.hidden)return;
    ui.stageStartLeaderboard.innerHTML=stageLeaderboardMarkup(record?.version===COURSE_VERSION?record:null,
        currentStageScores(context.n,context.mode));
    document.getElementById('stageScoreStatus').textContent=stageScoreStatus(context.n,context.mode);
}
