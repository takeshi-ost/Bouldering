"use strict";
// A reusable interstitial: callers supply grant/return callbacks, not a destination screen.
const ROULETTE_OPTIONS=Object.freeze([
    ...Array.from({length:11},(_,amount)=>Object.freeze({kind:'hearts',amount,label:`❤️+${amount}`})),
    Object.freeze({kind:'life',amount:1,label:'ライフ+1'})
]);
const ROULETTE_SPEED=.42,ROULETTE_BRAKE_MS=2600,REWARD_RESULT_MS=1400;
let rewardSequence=null,rewardFrame=null,rewardReturnTimer=null;
function rewardIndex(angle) {
    const n=ROULETTE_OPTIONS.length;
    return ((Math.round(-angle/(360/n))%n)+n)%n;
}
function rewardWheelMarkup() {
    const n=ROULETTE_OPTIONS.length,r=144;
    const point=degrees=>{const a=degrees*Math.PI/180;return [160+r*Math.cos(a),160+r*Math.sin(a)];};
    return `<svg viewBox="0 0 320 320" aria-hidden="true">${ROULETTE_OPTIONS.map((item,i)=>{
        const theta=-90+i*360/n,[x1,y1]=point(theta-180/n),[x2,y2]=point(theta+180/n);
        const a=theta*Math.PI/180,x=160+108*Math.cos(a),y=160+108*Math.sin(a);
        const fill=item.kind==='life'?'#e8bd64':i%2?'#f6decc':'#dce9d8';
        const label=item.kind==='life'?`<tspan x="${x}" dy="-6">ライフ</tspan><tspan x="${x}" dy="14">+1</tspan>`:item.label;
        return `<path d="M160 160 L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}Z" fill="${fill}" stroke="#fffaf0" stroke-width="2"/><text x="${x}" y="${y}" transform="rotate(${theta+90} ${x} ${y})" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
    }).join('')}<circle cx="160" cy="160" r="23" fill="#f8f6ee" stroke="#637966" stroke-width="4"/></svg>`;
}
function requestRewardFrame() {
    if(rewardSequence && rewardSequence.phase!=='result' && !document.hidden && rewardFrame===null)
        rewardFrame=requestAnimationFrame(advanceRewardSequence);
}
function startRewardSequence({onGrant=()=>{},onReturn=null}={}) {
    if(typeof onGrant!=='function' || (onReturn!==null && typeof onReturn!=='function'))
        throw new TypeError('Reward callbacks must be functions');
    if(rewardSequence || state==='ad' || state==='life-prompt' || (state==='map' && (mapPreparing || mapTransition || stageStartContext)))return false;
    const previousState=state,wasResultOpen=!!ui.overlay.open,wasTiming=runStartedAt!==null;
    if(wasTiming){runElapsedMs=runTimeMs();runStartedAt=null;}
    release(true);endPan();bodyTap=null;touchId=null;ignoreTouches=false;
    hideSettings();hideResultModal();
    rewardSequence={phase:'spinning',angle:Math.random()*360,lastTime:performance.now(),
        previousState,wasResultOpen,wasTiming,onGrant,onReturn};
    state='reward';
    ui.rewardWheel.innerHTML=rewardWheelMarkup();
    ui.rewardWheel.style.transform=`rotate(${rewardSequence.angle}deg)`;
    ui.rewardStatus.textContent='タップでストップ';ui.rewardResult.hidden=true;
    ui.rewardStop.hidden=false;ui.rewardStop.disabled=false;ui.rewardStop.textContent='タップしてストップ';
    ui.rewardDialog.hidden=false;ui.rewardDialog.showModal?.();ui.rewardStop.focus();
    requestGameRender();schedulePresentationUpdates();requestRewardFrame();
    return true;
}
function stopRewardSequence(now=performance.now()) {
    const sequence=rewardSequence;
    if(!sequence || sequence.phase!=='spinning' || document.hidden)return false;
    // Include the interval since the last frame so the visible stopping point follows the tap.
    if(sequence.lastTime!==null)sequence.angle+=Math.max(0,now-sequence.lastTime)*ROULETTE_SPEED;
    sequence.lastTime=now;sequence.from=sequence.angle;sequence.brakeElapsed=0;sequence.phase='braking';
    ui.rewardStop.disabled=true;ui.rewardStop.textContent='ストップ…';ui.rewardStatus.textContent='';
    requestRewardFrame();return true;
}
function applyRouletteReward(option) {
    if(!ROULETTE_OPTIONS.some(item=>item.kind===option?.kind && item.amount===option?.amount))
        throw new TypeError('Invalid roulette reward');
    if(option.kind==='hearts') {
        const before=heartItems;heartItems=Math.min(Number.MAX_SAFE_INTEGER,heartItems+option.amount);
        saveHeartItems();playSound('pickup');
        return {...option,amount:heartItems-before};
    }
    recoverLives();const before=lives.count;grantLife();
    return {...option,amount:lives.count-before};
}
function scheduleRewardReturn(delay=REWARD_RESULT_MS) {
    if(rewardReturnTimer!==null)window.clearTimeout?.(rewardReturnTimer);
    rewardReturnTimer=null;
    const sequence=rewardSequence;
    if(!sequence || sequence.phase!=='result')return;
    sequence.returnRemaining=delay;sequence.returnStarted=performance.now();
    if(!document.hidden)rewardReturnTimer=window.setTimeout?.(()=>{
        rewardReturnTimer=null;
        if(rewardSequence===sequence)finishRewardSequence();
    },delay)??null;
}
function advanceRewardSequence(now=performance.now()) {
    rewardFrame=null;
    const sequence=rewardSequence;
    if(!sequence || document.hidden || sequence.phase==='result')return;
    const delta=sequence.lastTime===null?0:Math.max(0,now-sequence.lastTime);sequence.lastTime=now;
    if(sequence.phase==='spinning')sequence.angle=(sequence.angle+delta*ROULETTE_SPEED)%360;
    else {
        sequence.brakeElapsed=Math.min(ROULETTE_BRAKE_MS,sequence.brakeElapsed+delta);
        const t=sequence.brakeElapsed/ROULETTE_BRAKE_MS;
        sequence.angle=sequence.from+ROULETTE_SPEED*ROULETTE_BRAKE_MS/3*(1-(1-t)**3);
    }
    ui.rewardWheel.style.transform=`rotate(${sequence.angle}deg)`;
    if(sequence.phase==='braking' && sequence.brakeElapsed===ROULETTE_BRAKE_MS) {
        sequence.phase='result';
        sequence.reward=applyRouletteReward(ROULETTE_OPTIONS[rewardIndex(sequence.angle)]);
        sequence.onGrant(sequence.reward);
        ui.rewardStop.hidden=true;ui.rewardResult.hidden=false;
        ui.rewardResult.textContent=sequence.reward.kind==='hearts'?`❤️ +${sequence.reward.amount}`:
            sequence.reward.amount?'ライフ +1':`ライフは上限${LIFE_MAX}です`;
        ui.rewardStatus.textContent='獲得！';
        scheduleRewardReturn();return;
    }
    requestRewardFrame();
}
function finishRewardSequence() {
    const sequence=rewardSequence;
    if(!sequence || sequence.phase!=='result')return false;
    rewardSequence=null;
    if(rewardReturnTimer!==null)window.clearTimeout?.(rewardReturnTimer);rewardReturnTimer=null;
    ui.rewardDialog.close?.();ui.rewardDialog.hidden=true;state=sequence.previousState;
    if(sequence.wasTiming)runStartedAt=performance.now()-runElapsedMs;
    if(sequence.onReturn)sequence.onReturn(sequence.reward);
    else if(sequence.wasResultOpen)showResultModal();else canvas.focus();
    requestGameRender();schedulePresentationUpdates();return true;
}
ui.rewardDialog.addEventListener('click',()=>stopRewardSequence());
ui.rewardDialog.addEventListener('cancel',e=>e.preventDefault());
ui.rewardDialog.addEventListener('keydown',e=>{
    if(e.key==='Enter' || e.key===' '){e.preventDefault();stopRewardSequence();}
});
document.addEventListener?.('visibilitychange',()=>{
    const sequence=rewardSequence;if(!sequence)return;
    if(document.hidden) {
        if(rewardFrame!==null)window.cancelAnimationFrame?.(rewardFrame);rewardFrame=null;
        sequence.lastTime=null;
        if(sequence.phase==='result') {
            sequence.returnRemaining=Math.max(0,sequence.returnRemaining-(performance.now()-sequence.returnStarted));
            if(rewardReturnTimer!==null)window.clearTimeout?.(rewardReturnTimer);rewardReturnTimer=null;
        }
    } else if(sequence.phase==='result')scheduleRewardReturn(sequence.returnRemaining);
    else {sequence.lastTime=performance.now();requestRewardFrame();}
});
