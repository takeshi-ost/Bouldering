"use strict";
const DAILY_RECORDS_KEY='ascent.daily-records.v1';
function utcToday(now=new Date()) {return now.toISOString().slice(0,10);}
function validDailyDate(key) {
    if(typeof key!=='string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(key))return false;
    const date=new Date(key+'T00:00:00Z');
    return Number.isFinite(date.getTime()) && utcToday(date)===key;
}
function dailyProfile(key) {
    if(!validDailyDate(key))throw new Error('Invalid daily date');
    const baseSeed=Number(key.replaceAll('-',''));
    const random=mulberry32(baseSeed ^ 0x44A17C39);
    return {date:key,baseSeed,seed:baseSeed,tier:[5,20,40][Math.floor(random()*3)]};
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
let dailyMonth=utcToday().slice(0,7);
let dailyCalendarToday=null;
let dailyReturnCourse='existing';
function recordDailyClear() {
    if(!dailyRun || moveCount<1)return;
    const date=dailyRun.date;
    const stars=Math.max(dailyRecords[date]?.stars||0,clearStars(moveCount,route.length-1));
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
    const today=utcToday();dailyCalendarToday=today;
    const [year,month]=monthParts();
    const firstDay=new Date(Date.UTC(year,month-1,1)).getUTCDay();
    const days=new Date(Date.UTC(year,month,0)).getUTCDate();
    const cells=Array.from({length:firstDay},()=>'<div class="daily-cell" aria-hidden="true"></div>');
    for(let day=1;day<=days;day++) {
        const key=dailyMonth+'-'+String(day).padStart(2,'0');
        if(key>today) {cells.push('<div class="daily-cell" aria-hidden="true"></div>');continue;}
        const record=dailyRecords[key];
        cells.push(`<button class="daily-day ${record?'is-cleared':''} ${key===today?'is-today':''}" data-date="${key}" aria-label="${year}年${month}月${day}日 ${record?'クリア済み '+record.stars+'つ星':'プレイできます'}" ${key===today?'aria-current="date"':''}><span>${day}</span>${record?`<span class="daily-stars" aria-hidden="true">${'⭐️'.repeat(record.stars)}</span>`:''}</button>`);
    }
    while(cells.length%7)cells.push('<div class="daily-cell" aria-hidden="true"></div>');
    ui.dailyGrid.innerHTML=cells.join('');
    ui.dailyMonthTitle.textContent=`${year}年 ${month}月`;
    ui.dailyToday.textContent=`今日：${today.replaceAll('-','/')}（UTC）`;
    ui.dailyPrev.disabled=dailyMonth<='1000-01';
    ui.dailyNext.disabled=dailyMonth>=today.slice(0,7);
}
function refreshDailyCalendar() {
    if(state!=='daily')return;
    const today=utcToday();
    if(today===dailyCalendarToday)return;
    if(dailyMonth===dailyCalendarToday?.slice(0,7))dailyMonth=today.slice(0,7);
    renderDailyCalendar();
}
function showDailyCalendar({openFromMap=false}={}) {
    if(openFromMap) {
        if(state!=='map' || mapTransition)return;
        dailyReturnCourse=courseMode;dailyMonth=utcToday().slice(0,7);
    }
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
    (ui.dailyGrid.querySelector?.(`[data-date="${utcToday()}"]`)||ui.dailyBack).focus();
}
function selectDailyDate(key) {
    if(state!=='daily' || !validDailyDate(key) || key>utcToday())return false;
    const profile=dailyProfile(key);
    try {
        dailyRun={...profile,returnCourse:dailyReturnCourse};
        courseMode='existing';debugAttempt=false;
        restartInput(profile.tier);
        canvas.setAttribute('tabindex','0');
        if(!featureHelpOpen)canvas.focus();
        return true;
    } catch(error) {
        showDailyCalendar();
        ui.dailyError.textContent='コースを生成できませんでした。もう一度日付を選んでください。';
        ui.dailyError.hidden=false;
        console.error(error);
        return false;
    }
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
    if(state!=='daily' || dailyMonth>=utcToday().slice(0,7))return;
    dailyMonth=shiftedDailyMonth(1);renderDailyCalendar();
};
ui.dailyGrid.onclick=e=>{
    const button=e.target.closest('button[data-date]');
    if(button && ui.dailyGrid.contains(button))selectDailyDate(button.dataset.date);
};
window.addEventListener('focus',refreshDailyCalendar);
