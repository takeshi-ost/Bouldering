"use strict";
const LIVES_KEY='ascent.lives.v1';
const LIFE_INITIAL=3,LIFE_MAX=5,LIFE_RECOVERY_CAP=3,LIFE_RECOVERY_MS=30*60*1000;
function readLives(now=Date.now()) {
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(LIVES_KEY)||'null');
        if(Number.isInteger(saved?.count) && saved.count>=0 && saved.count<=LIFE_MAX) {
            const recoveryAt=saved.count<LIFE_RECOVERY_CAP && Number.isFinite(saved.recoveryAt) && saved.recoveryAt>=0
                ? Math.min(now,saved.recoveryAt) : saved.count<LIFE_RECOVERY_CAP ? now : null;
            return {count:saved.count,recoveryAt,inProgress:saved.inProgress===true,
                attemptAt:Number.isFinite(saved.attemptAt) && saved.attemptAt>=0?Math.min(now,saved.attemptAt):now};
        }
    } catch(_) { /* Start with the initial lives when storage is unavailable. */ }
    return {count:LIFE_INITIAL,recoveryAt:null,inProgress:false};
}
let lives=readLives();
let lifeRunId=null;
let lifePrompt=null;
function saveLives() {
    try {globalThis.localStorage?.setItem(LIVES_KEY,JSON.stringify(lives));}
    catch(_) { /* Lives and recovery remain usable within the session. */ }
}
function recoverLives(now=Date.now()) {
    if(lives.count>=LIFE_RECOVERY_CAP){lives.recoveryAt=null;return;}
    if(lives.recoveryAt===null || lives.recoveryAt>now) {lives.recoveryAt=now;saveLives();return;}
    const recovered=Math.floor((now-lives.recoveryAt)/LIFE_RECOVERY_MS);
    if(recovered>0) {
        lives.count=Math.min(LIFE_RECOVERY_CAP,lives.count+recovered);
        lives.recoveryAt=lives.count<LIFE_RECOVERY_CAP ? lives.recoveryAt+recovered*LIFE_RECOVERY_MS : null;
        saveLives();
    }
}
function consumeLife(now=Date.now()) {
    recoverLives(now);
    lives.count=Math.max(0,lives.count-1);
    if(lives.count<LIFE_RECOVERY_CAP && lives.recoveryAt===null)lives.recoveryAt=now;
    saveLives();refreshLives();
}
function grantLife() {
    recoverLives();lives.count=Math.min(LIFE_MAX,lives.count+1);
    if(lives.count>=LIFE_RECOVERY_CAP)lives.recoveryAt=null;
    saveLives();refreshLives();
}
// An unfinished normal attempt is a non-clear when the app is reopened.
if(lives.inProgress){lives.inProgress=false;consumeLife(lives.attemptAt);}
else {recoverLives();saveLives();}
function beginLifeAttempt() {
    if(dailyRun || debugAttempt || courseMode!=='existing')return;
    lifeRunId=lifeAttemptId;lives.inProgress=true;lives.attemptAt=Date.now();saveLives();refreshLives();
}
function settleLifeAttempt(won) {
    if(!lives.inProgress || lifeRunId===null)return;
    const current=lifeRunId===lifeAttemptId;
    lives.inProgress=false;lifeRunId=null;
    if(current && !won)consumeLife();else saveLives();
}
function refreshLives() {
    recoverLives();
    ui.lifeStatus.classList.toggle('title-lives',state==='choosing');
    const inGame=['playing','won','lost'].includes(state);
    ui.lifeStatus.classList.toggle('game-lives',inGame);
    ui.lifeStatus.setAttribute('aria-label',`ライフ ${lives.count} / ${LIFE_MAX}`);
    ui.lifeStatus.hidden=!!dailyRun || !['choosing','map','playing','won','lost'].includes(state) || courseMode==='prototype' || debugAttempt;
    const seconds=lives.recoveryAt===null ? null : Math.max(0,Math.ceil((LIFE_RECOVERY_MS-(Date.now()-lives.recoveryAt))/1000));
    const text=inGame
        ? `<span class="life-players" aria-hidden="true" style="--head-color:${playerHeadColor};--body-stripes:${bodyStripeGradient()}">${Array.from({length:lives.count},()=>'<span class="life-player"><span class="map-marker"><i></i><b></b></span></span>').join('')}</span>`
        : `LIFE ${lives.count}/${LIFE_MAX}`+(seconds===null?'':`<small>回復まで ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}</small>`);
    if(ui.lifeStatus.innerHTML!==text)ui.lifeStatus.innerHTML=text;
    if(lifePrompt) {
        ui.lifeWatchAd.textContent=lives.count>0?'ステージを開始':'広告を見る';
        ui.lifeQuestion.textContent=lives.count>0?'ライフが回復しました。ステージを開始しますか？':'ライフがありません。広告を見てライフを増やしますか？';
    }
}
function requestLifeStart(launch,{enabled=true,onCancel=null}={}) {
    if(lifePrompt || state==='ad')return false;
    recoverLives();
    if(!enabled || lives.count>0)return launch();
    const previousState=state,wasResultOpen=!!ui.overlay.open;
    hideSettings();hideResultModal();
    lifePrompt={launch,onCancel,previousState,wasResultOpen};state='life-prompt';
    ui.lifeDialog.hidden=false;ui.lifeDialog.showModal?.();refreshLives();ui.lifeWatchAd.focus();
    return false;
}
function closeLifePrompt() {
    const prompt=lifePrompt;if(!prompt)return null;
    lifePrompt=null;ui.lifeDialog.close?.();ui.lifeDialog.hidden=true;state=prompt.previousState;
    return prompt;
}
function cancelLifePrompt() {
    const prompt=closeLifePrompt();if(!prompt)return;
    if(prompt.onCancel)prompt.onCancel();
    else if(prompt.wasResultOpen){showResultModal();ui.retry.focus();}
    else focusMapLevel();
    refreshLives();
}
function restartNormalStage() {
    if(!['playing','won','lost'].includes(state))return false;
    const n=level;
    settleLifeAttempt(state==='won');
    return requestLifeStart(()=>{
        try {restartInput(n);beginLifeAttempt();return true;}
        catch(error) {
            showLevelMap({target:n});ui.mapError.textContent='ステージを生成できませんでした。もう一度選んでください。';
            ui.mapError.hidden=false;console.error(error);return false;
        }
    },{
        enabled:courseMode==='existing' && !debugAttempt,
        onCancel:()=>showLevelMap({target:n})
    });
}
ui.lifeCancel.onclick=cancelLifePrompt;
ui.lifeDialog.addEventListener('cancel',e=>{e.preventDefault();cancelLifePrompt();});
ui.lifeWatchAd.onclick=()=>{
    if(!lifePrompt)return;
    recoverLives();const prompt=closeLifePrompt();
    if(lives.count>0){prompt.launch();return;}
    startDummyAd({onComplete:grantLife,onReturn:prompt.launch});
};
window.addEventListener('focus',refreshLives);

window.addEventListener('pagehide',()=>{if(lives.inProgress){lives.attemptAt=Date.now();saveLives();}});
