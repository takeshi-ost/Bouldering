"use strict";
// A reusable interstitial: callers supply grant/return callbacks, not a destination screen.
// Map milestones are earned once per stage, independently of daily rewards.
const MAP_REWARDS_KEY='ascent.map-rewards.v1';
const MAP_REWARD_INTERVAL=4;
function readMapRewards() {
    const records={};
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(MAP_REWARDS_KEY)||'null');
        if(saved && typeof saved==='object' && !Array.isArray(saved))
            for(const [key,value] of Object.entries(saved)) {
                const n=Number(key);
                // Preserve already earned rewards from the former 10-stage interval.
                if(!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(n) || n>=Number.MAX_SAFE_INTEGER || (n%MAP_REWARD_INTERVAL!==0 && n%10!==0))continue;
                if(value?.status==='pending' || value?.status==='claimed')
                    records[key]={status:value.status,adRequired:value.adRequired===true,adCompleted:value.adCompleted===true};
            }
    } catch(_) { /* Keep milestone rewards usable without storage. */ }
    return records;
}
let mapRewards=readMapRewards();
function saveMapRewards() {
    try {globalThis.localStorage?.setItem(MAP_REWARDS_KEY,JSON.stringify(mapRewards));}catch(_) {}
}
function hasMapReward(n) {
    return courseMode==='existing' && n%MAP_REWARD_INTERVAL===0 && mapRewards[n]?.status!=='claimed';
}
function recordMapRewardClear() {
    if(dailyRun || debugAttempt || !hasMapReward(level) || mapRewards[level])return;
    mapRewards[level]={status:'pending',adRequired:clearsSinceAd>=5,adCompleted:false};
    saveMapRewards();
}
function startMapClearReward(n,onReturn=()=>showLevelMap({target:n+1})) {
    const record=mapRewards[n];
    if(courseMode!=='existing' || record?.status!=='pending' || rewardSequence || state==='ad')return false;
    const launch=()=>startRewardSequence({
        onGrant:()=>{record.status='claimed';saveMapRewards();},onReturn
    });
    if(!record.adRequired || record.adCompleted)return launch();
    return startDummyAd({onComplete:()=>{
        resetAdClearCount();record.adCompleted=true;saveMapRewards();
    },onReturn:launch});
}
function resumePendingMapReward() {
    if(courseMode!=='existing' || mapTransition || stageStartContext)return false;
    const pending=Object.keys(mapRewards).map(Number).sort((a,b)=>a-b).find(n=>mapRewards[n].status==='pending');
    return pending===undefined?false:startMapClearReward(pending);
}
function continueNormalClear({advance=true}={}) {
    const n=level,resume=()=>showLevelMap(advance?{advanceFrom:n}:{target:n});
    if(!debugAttempt && startMapClearReward(n,resume))return;
    if(courseMode==='existing' && !debugAttempt && clearsSinceAd>=5)
        startDummyAd({onComplete:resetAdClearCount,onReturn:resume});
    else resume();
}
const ROULETTE_OPTIONS=Object.freeze([
    Object.freeze({kind:'hearts',amount:1,label:'ハート+1',weight:2}),
    Object.freeze({kind:'hearts',amount:5,label:'ハート+5',weight:2}),
    Object.freeze({kind:'hearts',amount:10,label:'ハート+10',weight:1}),
    Object.freeze({kind:'life',amount:1,label:'ライフ+1',weight:1})
]);
const ROULETTE_SEGMENTS=Object.freeze(ROULETTE_OPTIONS.map((item,i)=>{
    const total=ROULETTE_OPTIONS.reduce((sum,option)=>sum+option.weight,0);
    const start=ROULETTE_OPTIONS.slice(0,i).reduce((sum,option)=>sum+option.weight,0)*360/total;
    const end=start+item.weight*360/total;
    return Object.freeze({start,end,center:(start+end)/2});
}));
const ROULETTE_SPEED=.42,ROULETTE_BRAKE_MS=2600,REWARD_RESULT_MS=1400;
let rewardSequence=null,rewardFrame=null,rewardReturnTimer=null;
function rewardIndex(angle) {
    const phase=((-angle%360)+360)%360;
    return ROULETTE_SEGMENTS.findIndex(segment=>phase<segment.end);
}
function rewardWheelMarkup() {
    const r=144,icon=createPlayerIcon({colors:playerColors,headColor:playerHeadColor});
    const point=degrees=>{const a=degrees*Math.PI/180;return [160+r*Math.cos(a),160+r*Math.sin(a)];};
    return `<svg viewBox="0 0 320 320" aria-hidden="true">${ROULETTE_OPTIONS.map((item,i)=>{
        const segment=ROULETTE_SEGMENTS[i],theta=-90+segment.center;
        const [x1,y1]=point(-90+segment.start),[x2,y2]=point(-90+segment.end);
        const a=theta*Math.PI/180,x=160+98*Math.cos(a),y=160+98*Math.sin(a);
        const fill=item.kind==='life'?'#e8bd64':i%2?'#f6decc':'#dce9d8';
        const player=icon.src?`<image href="${icon.src}" x="-23" y="-20" width="27" height="36"/>`:
            `<g transform="translate(-23 -20)"><circle cx="12" cy="6" r="5.5" fill="${playerHeadColor}"/><rect x="3" y="12" width="18" height="20" rx="4" fill="${playerColors[0]}"/></g>`;
        const label=item.kind==='life'?`${player}<text x="14" y="0" text-anchor="middle" dominant-baseline="middle">+1</text>`:
            `<image href="${HEART_ITEM_IMAGE_SRC}" x="-24" y="-18" width="32" height="32"/><text x="2" y="14" text-anchor="start" stroke="#fffaf0" stroke-width="3" stroke-linejoin="round" paint-order="stroke">+${item.amount}</text>`;
        return `<path d="M160 160 L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}Z" fill="${fill}" stroke="#fffaf0" stroke-width="2"/><g transform="translate(${x} ${y}) rotate(${theta+90})">${label}</g>`;
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
        ui.rewardResult.textContent=sequence.reward.kind==='hearts'?`ハート +${sequence.reward.amount}`:
            sequence.reward.amount?'ライフ +1':`ライフは上限${LIFE_MAX}です`;
        if(sequence.reward.kind==='hearts')
            ui.rewardResult.innerHTML=`<span class="heart-item-stack">${heartItemIconMarkup()}<span class="heart-item-quantity">+${sequence.reward.amount}</span></span>`;
        if(sequence.reward.kind==='life' && sequence.reward.amount) {
            const icon=playerIconMarkup('reward-player-icon');
            if(icon)ui.rewardResult.innerHTML=`${icon}<span>+1</span>`;
        }
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
