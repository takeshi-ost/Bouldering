"use strict";
// Replace this local source with stage leaderboard records when networking is added.
function dummyStageScores(expectedMoves,stage=level) {
    const names=['AOI','ロックねこ','山のぼり','Haru','MOMO','そら','KAI','チョーク職人','NAGI','ぽん','RIN','クライマー'];
    return names.map((name,i)=>({id:`dummy-${i}`,name,
        moves:Math.max(1,expectedMoves-1+Math.floor(i/3)),
        timeMs:20000+i*9137+(stage%7)*1100,avatar:i,isPlayer:false}));
}
// Called on every result/selection; never persist opponents with the player record.
function currentStageScores(stage,mode,expectedMoves) {
    return dummyStageScores(expectedMoves,stage);
}
// Page-scoped fixture roster: stable identities/arrival stages across rerenders.
// Reuse ranking names and avatar colors; no course generation or PNG encoding.
function currentMapPlayers(first,last,mode) {
    const profiles=dummyStageScores(1,first);
    const random=mulberry32(first ^ (mode==='prototype'?0x53A7C91B:0x2B8D104F));
    const count=(last-first+1)*4;
    return Array.from({length:count},(_,i)=>{
        const profile=profiles[i%profiles.length],group=Math.floor(i/profiles.length);
        return {id:`map-${mode}-${first}-${i}`,name:profile.name+(group?` ${group+1}`:''),
            avatar:profile.avatar,isPlayer:false,reachedLevel:first+Math.floor(random()*(last-first+1))};
    });
}
function stageLeaderboardRows(record,others) {
    const sorted=[...others.map(row=>({...row,isPlayer:false})),{...record,isPlayer:true}]
        .sort((a,b)=>a.moves-b.moves || a.timeMs-b.timeMs || Number(a.isPlayer)-Number(b.isPlayer))
        .map((row,i)=>({...row,rank:i+1}));
    const player=sorted.find(row=>row.isPlayer);
    return player.rank<=5?sorted.slice(0,5):[...sorted.slice(0,4),player];
}
function scoreText(value) {
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function scoreAvatar(row) {
    if(row.isPlayer) {
        const icon=playerIconMarkup('score-player-icon');
        if(icon)return icon;
    }
    const colors=['#4e9685','#d78c6b','#718db3','#ac82b6','#cbad58','#7e9c63'];
    const color=row.isPlayer?playerColors[0]:colors[row.avatar%colors.length];
    const head=row.isPlayer?playerHeadColor:'#f3e4cd';
    return `<svg class="score-player-icon" viewBox="0 0 24 32" aria-hidden="true"><circle cx="12" cy="6" r="5.5" fill="${head}" stroke="#fff7e9"/><rect x="3" y="12" width="18" height="20" rx="4" fill="${color}" stroke="#fff7e9" stroke-width="2"/></svg>`;
}
function stageLeaderboardMarkup(record,others) {
    const rows=stageLeaderboardRows({...record,name:playerName},others);
    return rows.map(row=>`<li class="score-row${row.isPlayer?' is-player':''}"${row.isPlayer?' aria-current="true"':''}><span class="score-rank">${row.rank}</span>${scoreAvatar(row)}<span class="score-name" title="${scoreText(row.name)}">${scoreText(row.name)}</span><span class="score-moves">${row.moves}手</span><span class="score-time">${formatClearTime(row.timeMs)}</span></li>`).join('');
}

function renderStageLeaderboard(expectedMoves) {
    ui.resultLeaderboard.innerHTML=stageLeaderboardMarkup(
        {moves:moveCount,timeMs:runElapsedMs},currentStageScores(level,courseMode,expectedMoves));
}
function renderStageStartRecord(context) {
    const record=context.n<=stageProgress[context.mode].cleared?stageRecords[context.mode][context.n]:null;
    ui.stageStartStars.hidden=!record?.stars;
    ui.stageStartStars.textContent=record?.stars?'⭐️'.repeat(record.stars):'';
    ui.stageStartStars.setAttribute('aria-label',record?.stars?`${record.stars}つ星`:'');
    ui.stageStartRanking.hidden=!record;
    ui.stageStartLeaderboard.innerHTML='';
    if(!record)return;
    // Course metadata may be cached; opponents are fetched anew for this selection.
    const expectedMoves=stagePreview(context.n,context.mode).expectedMoves;
    ui.stageStartLeaderboard.innerHTML=stageLeaderboardMarkup(record,
        currentStageScores(context.n,context.mode,expectedMoves));
}
