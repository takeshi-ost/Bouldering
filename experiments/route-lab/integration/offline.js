'use strict';
// Integration-only facade: production SDK, identity, queues, transfer and deletion are absent.
const online = Object.freeze({ uid: null, adapter: null, ready: false, status: '試遊内のみ・オンライン未接続' });
const onlineScores = Object.freeze({ pending: new Map() });
function queueOnlineProfileSave() {}
function queueOnlineScore() { return false; }
function onlineMapPlayers() { return []; }
function onlineStageScores() { const rows=[]; rows.rankingReady=false; return rows; }
function stageScoreStatus() { return GAME_TEXT_LANGUAGE==='en' ? 'This session only · Rankings disconnected' : 'この試遊内の記録のみ・ランキング未接続'; }
function setOnlineStatus() { const el=document.getElementById('onlineStatus'); if(el)el.textContent=stageScoreStatus(); }
function updateTitleUid() { ui.playerUuid.textContent='ROUTE LAB · OFFLINE'; }
function transferBusy() { return false; }
function transferElement(id) { return document.getElementById(id); }
function refreshOpenScoreViews() {
  if(state==='won' && !dailyRun)renderStageLeaderboard();
  if(stageStartContext)renderStageStartRecord(stageStartContext);
}
const labStartCourse = startCourse;
startCourse = function(mode) { if(mode!=='existing')return false; return labStartCourse('existing'); };
syncDebugCourseControls = function() {
  debugMode=false; courseMode='existing';
  for(const id of ['mapDebugModeRow','mapDebugMode','prototypeCourse','prototypeDescription','debugControls','debugDeleteUser','titleTransfer','transferDialog','deleteUserDialog']) {
    const el=document.getElementById(id); if(el){el.hidden=true;el.disabled=true;}
  }
  ui.mapDebugMode.checked=false;
};
setDebugMode = function() { syncDebugCourseControls(); updateUI(); };
ui.prototypeCourse.onclick=()=>false;
ui.mapDebugMode.onchange=()=>setDebugMode(false);
ui.titleTransfer.onclick=()=>false;
syncDebugCourseControls();
// Existing ads.js is a local timer only; make that unmistakable to the tester.
const labAdLabel=document.getElementById('labAdLabel');
if(labAdLabel)labAdLabel.textContent='試遊用のダミー広告です（通信・購入なし）';
