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
                Number.isInteger(record?.stars) && record.stars>=1 && record.stars<=3)
                records[date]={moves:record.moves,timeMs:record.timeMs,stars:record.stars};
        }
    } catch(_) { /* Keep the calendar usable without persistent storage. */ }
    return records;
}
let dailyRecords=readDailyRecords();
let dailyMonth=localToday().slice(0,7);
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
    try {globalThis.localStorage?.setItem(DAILY_RECORDS_KEY,JSON.stringify(dailyRecords));}
    catch(_) { /* Preserve the earned stars within this session. */ }
}
function monthParts(month=dailyMonth) {return month.split('-').map(Number);}
function shiftedDailyMonth(delta) {
    const [year,month]=monthParts();
    return new Date(Date.UTC(year,month-1+delta,1)).toISOString().slice(0,7);
}
function renderDailyCalendar() {
    const today=localToday();dailyCalendarToday=today;
    const [year,month]=monthParts();
    const firstDay=new Date(Date.UTC(year,month-1,1)).getUTCDay();
    const days=new Date(Date.UTC(year,month,0)).getUTCDate();
    const cells=Array.from({length:firstDay},()=>'<div class="daily-cell" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++) {
        const key=dailyMonth+'-'+String(day).padStart(2,'0');
        if(key>today) {cells.push(`<div class="daily-cell daily-future" data-calendar-date="${key}" aria-label="${year}年${month}月${day}日">${day}</div>`);continue;}
        const record=dailyRecords[key];
        cells.push(`<div class="daily-cell daily-playable"><button class="daily-day ${record?'is-cleared':''} ${key===today?'is-today':''}" data-date="${key}" aria-label="${year}年${month}月${day}日 ${record?'クリア済み '+record.stars+'つ星・再挑戦できません':'プレイできます'}" ${record?'disabled':''} ${key===today?'aria-current="date"':''}><span>${day}</span>${record?`<span class="daily-stars" aria-hidden="true">${'⭐️'.repeat(record.stars)}</span>`:''}</button></div>`);
    }
    while(cells.length%7)cells.push('<div class="daily-cell" aria-hidden="true"></div>');
    ui.dailyGrid.innerHTML=cells.join('');
    ui.dailyMonthTitle.textContent=`${year}年 ${month}月`;
    ui.dailyToday.textContent=`今日：${today.replaceAll('-','/')}（端末時刻）`;
    ui.dailyPrev.disabled=dailyMonth<='1000-01';
    ui.dailyNext.disabled=dailyMonth>=today.slice(0,7);
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
        if(state!=='map' || mapPreparing || mapTransition)return;
        dailyReturnCourse=courseMode;dailyMonth=localToday().slice(0,7);
    }
    cancelMapReveal();
    release(true);endPan();touchId=null;ignoreTouches=false;
    drag=null;bodyTap=null;cameraIntro=null;heartPopups=[];hazardShakeStart=null;
    runElapsedMs=Math.floor(runTimeMs());runStartedAt=null;
    leaveDailyRun();hideStageHelp();hideSettings();hideResultModal();
    state='daily';mapTransition=null;
    ui.titleScreen.hidden=ui.characterEditor.hidden=ui.levelMap.hidden=ui.hud.hidden=true;
    ui.dailyCalendar.hidden=false;ui.dailyError.hidden=true;
    ui.wall.classList.toggle('map-open',true);
    ui.restart.disabled=ui.mapButton.disabled=true;
    canvas.setAttribute('tabindex','-1');
    renderDailyCalendar();
    (ui.dailyGrid.querySelector?.(`[data-date="${localToday()}"]:not(:disabled)`)||ui.dailyBack).focus();
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
    if(state!=='daily' || !validDailyDate(key) || key>localToday() || dailyRecords[key])return false;
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
    if(state!=='daily')return;
    courseMode=dailyReturnCourse;showLevelMap();
};
ui.dailyPrev.onclick=()=>{
    if(state!=='daily' || dailyMonth<='1000-01')return;
    dailyMonth=shiftedDailyMonth(-1);renderDailyCalendar();
};
ui.dailyNext.onclick=()=>{
    if(state!=='daily' || dailyMonth>=localToday().slice(0,7))return;
    dailyMonth=shiftedDailyMonth(1);renderDailyCalendar();
};
ui.dailyGrid.onclick=e=>{
    const button=e.target.closest('button[data-date]');
    if(button && ui.dailyGrid.contains(button))selectDailyDate(button.dataset.date);
};
window.addEventListener('focus',refreshDailyCalendar);
