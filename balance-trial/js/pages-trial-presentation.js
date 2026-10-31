'use strict';
(function trialPresentation() {
 const label='BALANCE TRIAL '+ASCENT_TRIAL.release+' / distribution '+ASCENT_TRIAL.distribution+' / '+ASCENT_TRIAL.commit.slice(0,12)+(ASCENT_TRIAL.dirty?' (working tree)':'');
 const banner=document.getElementById('pagesTrialLabel');banner.textContent=label+' — オフライン・正式データとは別保存';
 for(const id of ['titleTransfer','transferDialog','deleteUserDialog','debugDeleteUser']){const node=document.getElementById(id);if(node){node.hidden=true;node.inert=true;node.setAttribute('aria-hidden','true');}}
 setOnlineStatus('試遊専用・オフライン（ランキング送信／引き継ぎなし）');
 document.getElementById('playerUuid').textContent='TRIAL — separate local save';
})();
