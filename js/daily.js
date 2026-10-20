"use strict";
const DAILY_RECORDS_KEY='ascent.daily-records.v1';
const DAILY_ATTEMPTS_KEY='ascent.daily-attempts.v1';
const DAILY_ENTRY_AD_KEY='ascent.daily-entry-ad.v1';
function utcToday(now=new Date()) {return now.toISOString().slice(0,10);}
function localToday(now=new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
function validDailyDate(key) {
    if(typeof key!=='string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(key))return false;
    const date=new Date(key+'T00:00:00Z');
    return Number.isFinite(date.getTime()) && utcToday(date)===key;
}
function readDailyAttempts() {
    const attempts={};
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(DAILY_ATTEMPTS_KEY)||'null');
        if(saved && typeof saved==='object' && !Array.isArray(saved))
            for(const [key,count] of Object.entries(saved))
                if(validDailyDate(key) && Number.isSafeInteger(count) && count>0 && count<Number.MAX_SAFE_INTEGER)
                    attempts[key]=count;
    } catch(_) { /* Keep daily ads available when storage is unavailable. */ }
    return attempts;
}
let dailyAttempts=readDailyAttempts();
function saveDailyAttempts() {
    try {globalThis.localStorage?.setItem(DAILY_ATTEMPTS_KEY,JSON.stringify(dailyAttempts));}
    catch(_) { /* Use session-local attempt counts if persistence fails. */ }
}
function readDailyEntryAdPending() {
    try {return JSON.parse(globalThis.localStorage?.getItem(DAILY_ENTRY_AD_KEY)||'false')===true;}
    catch(_) {return false;}
}
let dailyEntryAdPending=readDailyEntryAdPending();
function setDailyEntryAdPending(pending) {
    dailyEntryAdPending=pending;
    try {globalThis.localStorage?.setItem(DAILY_ENTRY_AD_KEY,JSON.stringify(pending));}
    catch(_) { /* Keep the deferred ad within this session. */ }
}
function returnDailyWithoutClear() {
    if(!dailyRun || !['playing','lost'].includes(state))return;
    setDailyEntryAdPending(true);showDailyCalendar();
}
function dailyDateLabel(key) {
    const weekday='日月火水木金土'[new Date(key+'T00:00:00Z').getUTCDay()];
    return `${key.slice(5,7)}月${key.slice(8,10)}日(${weekday})`;
}
function dailyProfile(key) {
    if(!validDailyDate(key))throw new Error('Invalid daily date');
    const baseSeed=Number(key.replaceAll('-',''));
    const difficulty=weightedDifficulty(DIFFICULTY_CONFIG.dailyWeights,baseSeed ^ 0x44A17C39);
    return {date:key,baseSeed,seed:baseSeed,difficulty,referenceStage:DIFFICULTY_RULES[difficulty].referenceStage};
}
function readDailyRecords() {
    const records={};
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(DAILY_RECORDS_KEY)||'null');
        if(!saved || typeof saved!=='object' || Array.isArray(saved))return records;
        for(const [date,record] of Object.entries(saved)) {
            if(validDailyDate(date) && Number.isSafeInteger(record?.moves) && record.moves>0 &&
                Number.isSafeInteger(record?.timeMs) && record.timeMs>=0 &&
                Number.isInteger(record?.stars) && record.stars>=1 && record.stars<=3) {
                records[date]={moves:record.moves,timeMs:record.timeMs,stars:record.stars};
                if(record.rewardStatus==='pending' || record.rewardStatus==='claimed') {
                    records[date].rewardStatus=record.rewardStatus;
                    if(record.rewardAdCompleted===true)records[date].rewardAdCompleted=true;
                }
            }
        }
    } catch(_) { /* Keep the calendar usable without persistent storage. */ }
    return records;
}
let dailyRecords=readDailyRecords();
function saveDailyRecords() {
    try {globalThis.localStorage?.setItem(DAILY_RECORDS_KEY,JSON.stringify(dailyRecords));}
    catch(_) { /* Keep earned records and rewards in this session. */ }
}
function startDailyClearReward(date) {
    const record=dailyRecords[date];
    if(record?.rewardStatus!=='pending' || rewardSequence || state==='ad')return false;
    const launch=()=>startRewardSequence({
        onGrant:()=>{record.rewardStatus='claimed';saveDailyRecords();},
        onReturn:()=>showDailyCalendar()
    });
    if(record.rewardAdCompleted)return launch();
    return startDummyAd({onComplete:()=>{
        record.rewardAdCompleted=true;saveDailyRecords();
        if(dailyRun?.date===date)dailyRun.resultAdCompleted=true;
    },onReturn:launch});
}
let dailyMonth=localToday().slice(0,7);
let dailySelectedDate=null;
let dailyCalendarToday=null;
let dailyEntryToday=null;
let dailyReturnCourse='existing';
function refreshDailyEntry() {
    const today=localToday();
    ui.openDaily.classList.toggle('is-unfinished',!dailyRecords[today]);
    if(today===dailyEntryToday)return;
    dailyEntryToday=today;
    ui.dailyEntryDate.textContent=today.slice(5).replace('-','/');
    ui.openDaily.setAttribute('aria-label',`デイリーチャレンジ ${today.replaceAll('-','/')}`);
}
function recordDailyClear() {
    if(!dailyRun || moveCount<1 || dailyRecords[dailyRun.date])return;
    const date=dailyRun.date;
    const stars=clearStars(moveCount,routeExpectedMoves());
    dailyRecords[date]={moves:moveCount,timeMs:Math.floor(runElapsedMs),stars};
    if(date===localToday())dailyRecords[date].rewardStatus='pending';
    saveDailyRecords();
}
function monthParts(month=dailyMonth) {return month.split('-').map(Number);}
function shiftedDailyMonth(delta) {
    const [year,month]=monthParts();
    return new Date(Date.UTC(year,month-1+delta,1)).toISOString().slice(0,7);
}
let dailyMonthScroll=null;
function finishDailyMonthScroll() {
    const motion=dailyMonthScroll;dailyMonthScroll=null;
    if(!motion)return;
    motion.animations.forEach(animation=>animation.cancel());
    motion.previous.remove();
}
function renderDailyCalendar() {
    finishDailyMonthScroll();
    const today=localToday();dailyCalendarToday=today;
    if(dailySelectedDate && (dailySelectedDate.slice(0,7)!==dailyMonth || dailySelectedDate>today))dailySelectedDate=null;
    const [year,month]=monthParts();
    const firstDay=new Date(Date.UTC(year,month-1,1)).getUTCDay();
    const days=new Date(Date.UTC(year,month,0)).getUTCDate();
    const cells=Array.from({length:firstDay},()=>'<div class="daily-cell" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++) {
        const key=dailyMonth+'-'+String(day).padStart(2,'0');
        if(key>today) {cells.push(`<div class="daily-cell daily-future" data-calendar-date="${key}" aria-label="${year}年${month}月${day}日">${day}</div>`);continue;}
        const record=dailyRecords[key];
        cells.push(`<div class="daily-cell daily-playable"><button type="button" class="daily-day ${record?'is-cleared':''} ${key===dailySelectedDate?'is-selected':''}" data-date="${key}" aria-pressed="${key===dailySelectedDate}" aria-label="${year}年${month}月${day}日 ${record?'クリア済み '+record.stars+'つ星・再挑戦できません':'選択できます'}" ${key===today?'aria-current="date"':''}>${record?'<span class="daily-clear-icon" aria-hidden="true">✓</span>':day}</button></div>`);
    }
    while(cells.length<42)cells.push('<div class="daily-cell" aria-hidden="true"></div>');
    ui.dailyGrid.innerHTML=cells.join('');
    ui.dailyPlate.style.height=(6*43+86)+'px';
    ui.dailyGrid.style.gridTemplateRows='repeat(6,minmax(0,1fr))';
    ui.dailyMonthTitle.textContent=`${year}年 ${month}月`;
    ui.dailyPrev.disabled=dailyMonth<='1000-01';
    ui.dailyNext.disabled=dailyMonth>=today.slice(0,7);
    ui.dailySkyDate.textContent=today.slice(5).replace('-','/');
    renderDailyStart();
}
function renderDailyStart() {
    const profile=dailySelectedDate?dailyProfile(dailySelectedDate):null;
    ui.dailyStartLabel.textContent=profile?`DAILY ${profile.date.slice(0,4)}`:'日付を選択';
    ui.dailyStartTitle.textContent=profile?dailyDateLabel(profile.date):'—';
    ui.dailyStartTitle.setAttribute('aria-label',profile?`${profile.date.slice(0,4)}年${dailyDateLabel(profile.date)}`:'日付を選択');
    ui.dailyStartDifficulty.textContent=profile?difficultyLabel(profile.difficulty):'—';
    ui.dailyStartLength.textContent=profile?{short:'ショート',medium:'ミドル',long:'ロング'}[stageLengthInfo(profile.referenceStage,profile.seed).category]:'—';
    const record=profile && dailyRecords[profile.date];
    ui.dailyStartButton.hidden=!!record;
    ui.dailyStartButton.disabled=!profile || !!record;
    ui.dailyClearRecord.hidden=!record;
    ui.dailyClearStars.textContent=record?'⭐️'.repeat(record.stars):'';
    ui.dailyClearStars.setAttribute('aria-label',record?`${record.stars}つ星`:'');
    ui.dailyClearStats.textContent=record?formatStageRecord(record):'';
}
function chooseDailyDate(key) {
    if(state!=='daily' || settingsOpen || !validDailyDate(key) || key.slice(0,7)!==dailyMonth || key>localToday())return false;
    if(key===dailySelectedDate)return true;
    finishDailyMonthScroll();
    const previous=ui.dailyGrid.querySelector?.(`[data-date="${dailySelectedDate}"]`);
    previous?.classList.toggle('is-selected',false);
    previous?.setAttribute('aria-pressed','false');
    dailySelectedDate=key;
    ui.dailyError.hidden=true;
    const selected=ui.dailyGrid.querySelector?.(`[data-date="${key}"]`);
    selected?.classList.toggle('is-selected',true);
    selected?.setAttribute('aria-pressed','true');
    renderDailyStart();
    selected?.focus({preventScroll:true});
    return true;
}
function refreshDailyCalendar() {
    if(state==='map') {refreshDailyEntry();return;}
    if(state!=='daily')return;
    const today=localToday();
    if(today===dailyCalendarToday)return;
    if(dailyMonth===dailyCalendarToday?.slice(0,7))dailyMonth=today.slice(0,7);
    renderDailyCalendar();
}
function showDailyCalendar({openFromMap=false}={}) {
    if(openFromMap) {
        if(state!=='map' || mapPreparing || stageStartContext || mapTransition)return;
        dailyReturnCourse=courseMode;dailyMonth=localToday().slice(0,7);
        dailySelectedDate=localToday();
    }
    dailySwipe=null;dailySwipeConsumed=false;
    hideStageStart();
    cancelMapReveal();
    release(true);endPan();touchId=null;ignoreTouches=false;
    drag=null;bodyTap=null;cameraIntro=null;heartPopups=[];hazardShakeStart=null;
    runElapsedMs=Math.floor(runTimeMs());runStartedAt=null;
    leaveDailyRun();hideStageHelp();hideSettings();hideResultModal();
    state='daily';mapTransition=null;
    requestGameRender();
    ui.titleScreen.hidden=ui.characterEditor.hidden=ui.levelMap.hidden=ui.hud.hidden=true;
    ui.dailyCalendar.hidden=false;ui.dailyError.hidden=true;
    ui.wall.classList.toggle('map-open',true);
    ui.restart.disabled=ui.mapButton.disabled=true;
    canvas.setAttribute('tabindex','-1');
    renderDailyCalendar();
    (ui.dailyGrid.querySelector?.(`[data-date="${localToday()}"]:not(:disabled)`)||ui.dailyBack).focus();
    const pending=Object.keys(dailyRecords).sort().find(date=>dailyRecords[date].rewardStatus==='pending');
    if(pending)startDailyClearReward(pending);
}
function reportDailyGenerationError(error) {
    showDailyCalendar();
    ui.dailyError.textContent='コースを生成できませんでした。もう一度日付を選んでください。';
    ui.dailyError.hidden=false;
    console.error(error);
    return false;
}
function launchDailyAttempt(profile,attempt) {
    if(dailyRecords[profile.date]){showDailyCalendar();return false;}
    try {
        dailyRun={...profile,returnCourse:dailyReturnCourse,attempt,resultAdCompleted:false};
        courseMode='existing';debugAttempt=false;
        restartInput(profile.referenceStage);
        dailyAttempts[profile.date]=attempt;saveDailyAttempts();
        canvas.setAttribute('tabindex','0');
        if(!featureHelpOpen)canvas.focus();
        return true;
    } catch(error) {return reportDailyGenerationError(error);}
}
function selectDailyDate(key,{adAlreadyShown=false}={}) {
    if(state!=='daily' || settingsOpen || !validDailyDate(key) || key>localToday() || dailyRecords[key])return false;
    try {
        const profile=dailyProfile(key);
        const attempt=(dailyAttempts[key]||0)+1;
        if((dailyEntryAdPending || attempt%2===0) && !adAlreadyShown)
            return startDummyAd({onComplete:()=>setDailyEntryAdPending(false),onReturn:()=>launchDailyAttempt(profile,attempt)});
        return launchDailyAttempt(profile,attempt);
    } catch(error) {return reportDailyGenerationError(error);}
}
function continueDailyResult(retry=false) {
    if(!dailyRun || !['won','lost'].includes(state))return;
    if(retry && (state==='won' || dailyRecords[dailyRun.date]))return;
    if(!retry && state==='lost'){returnDailyWithoutClear();return;}
    const run=dailyRun;
    if(!retry && state==='won' && dailyRecords[run.date]?.rewardStatus==='pending') {
        startDailyClearReward(run.date);return;
    }
    const needsAd=run.attempt===1 && !run.resultAdCompleted;
    const resume=()=>{
        showDailyCalendar();
        if(retry)selectDailyDate(run.date,{adAlreadyShown:needsAd});
    };
    if(needsAd)startDummyAd({onComplete:()=>{run.resultAdCompleted=true;},onReturn:resume});
    else resume();
}
ui.openDaily.onclick=()=>showDailyCalendar({openFromMap:true});
ui.dailyBack.onclick=()=>{
    if(state!=='daily' || settingsOpen)return;
    finishDailyMonthScroll();
    courseMode=dailyReturnCourse;showLevelMap();
};
function changeDailyMonth(delta) {
    if(state!=='daily' || settingsOpen || (delta!==-1 && delta!==1) ||
        (delta<0?dailyMonth<='1000-01':dailyMonth>=localToday().slice(0,7)))return false;
    finishDailyMonthScroll();
    const previous=ui.dailyGrid.cloneNode?.(true);
    playSound('page');
    dailyMonth=shiftedDailyMonth(delta);
    const [year,month]=monthParts();
    const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
    dailySelectedDate=dailyMonth<localToday().slice(0,7)?`${dailyMonth}-${String(lastDay).padStart(2,'0')}`:localToday();
    renderDailyCalendar();
    if(previous && ui.dailyGrid.animate && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        previous.removeAttribute('id');previous.removeAttribute('aria-label');
        previous.setAttribute('aria-hidden','true');previous.inert=true;
        previous.classList.add('daily-month-outgoing');
        ui.dailyMonthViewport.append(previous);
        const options={duration:280,easing:'cubic-bezier(.22,.7,.25,1)'};
        const outgoing=previous.animate([{transform:'translateX(0)'},{transform:`translateX(${-delta*100}%)`}],options);
        const incoming=ui.dailyGrid.animate([{transform:`translateX(${delta*100}%)`},{transform:'translateX(0)'}],options);
        const motion={previous,animations:[outgoing,incoming]};dailyMonthScroll=motion;
        incoming.onfinish=()=>{if(dailyMonthScroll===motion)finishDailyMonthScroll();};
    }
    return true;
}
ui.dailyPrev.onclick=()=>changeDailyMonth(-1);
ui.dailyNext.onclick=()=>changeDailyMonth(1);
let dailySwipe=null,dailySwipeConsumed=false;
ui.dailyPlate.addEventListener('pointerdown',e=>{
    dailySwipeConsumed=false;
    if(state!=='daily' || settingsOpen || e.isPrimary===false || (e.button!==undefined && e.button!==0) || dailySwipe) {dailySwipe=null;return;}
    dailySwipe={id:e.pointerId,x:e.clientX,y:e.clientY};
});
ui.dailyPlate.addEventListener('pointerup',e=>{
    const start=dailySwipe;dailySwipe=null;
    if(!start || e.pointerId!==start.id || state!=='daily' || settingsOpen)return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if(Math.abs(dx)<48 || Math.abs(dx)<=Math.abs(dy)*1.4)return;
    dailySwipeConsumed=true;
    changeDailyMonth(dx<0?1:-1);
});
ui.dailyPlate.addEventListener('pointercancel',()=>{dailySwipe=null;});
ui.dailyPlate.addEventListener('click',e=>{
    if(!dailySwipeConsumed)return;
    dailySwipeConsumed=false;e.preventDefault();e.stopPropagation();
},true);
ui.dailyGrid.onclick=e=>{
    const button=e.target.closest('button[data-date]');
    if(button && ui.dailyGrid.contains(button))chooseDailyDate(button.dataset.date);
};
ui.dailyStartButton.onclick=()=>{
    if(state!=='daily' || settingsOpen || ui.dailyStartButton.disabled || !dailySelectedDate)return;
    ui.dailyStartButton.disabled=true;
    if(!selectDailyDate(dailySelectedDate))renderDailyCalendar();
};
window.addEventListener('focus',refreshDailyCalendar);
