"use strict";
// Replace this local source with stage leaderboard records when networking is added.
function dummyStageScores(expectedMoves,stage=level) {
    const names=['AOI','ロックねこ','山のぼり','Haru','MOMO','そら','KAI','チョーク職人','NAGI','ぽん','RIN','クライマー'];
    return names.map((name,i)=>({id:`dummy-${i}`,name,
        moves:Math.max(1,expectedMoves-1+Math.floor(i/3)),
        timeMs:20000+i*9137+(stage%7)*1100,avatar:i,isPlayer:false}));
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
function renderStageLeaderboard(expectedMoves) {
    const rows=stageLeaderboardRows({name:playerName,moves:moveCount,timeMs:runElapsedMs},dummyStageScores(expectedMoves));
    ui.resultLeaderboard.innerHTML=rows.map(row=>`<li class="score-row${row.isPlayer?' is-player':''}"${row.isPlayer?' aria-current="true"':''}><span class="score-rank">${row.rank}</span>${scoreAvatar(row)}<span class="score-name" title="${scoreText(row.name)}">${scoreText(row.name)}</span><span class="score-moves">${row.moves}手</span><span class="score-time">${formatClearTime(row.timeMs)}</span></li>`).join('');
}
