"use strict";
const PROGRESS_KEY = 'ascent.progress.v1';
const MAP_PAGE_SIZE = 20;
const MAP_STEP = 92;
const MAP_HOP_DURATION = 650;
function readStageProgress() {
    const result = {existing:{cleared:0},prototype:{cleared:0}};
    try {
        const saved = JSON.parse(globalThis.localStorage?.getItem(PROGRESS_KEY) || 'null');
        for (const mode of ['existing','prototype']) {
            const n = saved?.[mode]?.cleared;
            if (Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER)
                result[mode].cleared = n;
        }
    } catch (_) { /* Storage may be disabled; keep progress for this session. */ }
    return result;
}
const RECORDS_KEY='ascent.records.v1';
function readStageRecords() {
    const result={existing:{},prototype:{}};
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(RECORDS_KEY)||'null');
        for(const mode of ['existing','prototype']) {
            const records=saved?.[mode];
            if(!records || typeof records!=='object' || Array.isArray(records))continue;
            for(const [key,value] of Object.entries(records)) {
                const n=Number(key);
                if(!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(n) || n>=Number.MAX_SAFE_INTEGER)continue;
                if(Number.isSafeInteger(value?.moves) && value.moves>0 &&
                    Number.isSafeInteger(value?.timeMs) && value.timeMs>=0)
                    result[mode][key]={moves:value.moves,timeMs:value.timeMs};
            }
        }
    } catch(_) { /* Older saves or unavailable storage have no timed records. */ }
    return result;
}
let stageRecords=readStageRecords();
let stageProgress = readStageProgress();
let mapPage = 0;
let mapSelected = 1;
let mapTransition = null;
let debugAttempt = false;
function recordStageClear() {
    if (debugAttempt) return;
    if(moveCount>0)stageRecords[courseMode][level]={moves:moveCount,timeMs:Math.floor(runElapsedMs)};
    stageProgress[courseMode].cleared = Math.max(stageProgress[courseMode].cleared,level);
    try { globalThis.localStorage?.setItem(PROGRESS_KEY,JSON.stringify(stageProgress)); }
    catch (_) { /* Completing a level must still work without storage. */ }
    try {globalThis.localStorage?.setItem(RECORDS_KEY,JSON.stringify(stageRecords));}
    catch(_) { /* Keep records in memory when storage is unavailable. */ }
}
function unlockedLevel() { return stageProgress[courseMode].cleared + 1; }
function mapBounds() {
    // Include the previous page's final node so 20 -> 21 is also a single hop.
    return {first:Math.max(1,mapPage*MAP_PAGE_SIZE),last:(mapPage+1)*MAP_PAGE_SIZE};
}
function mapPoint(n) {
    return {x:50+26*Math.sin((n-1)*Math.PI/2),y:(mapBounds().last-n)*MAP_STEP+64};
}
function positionMapMarker(point) {
    ui.mapMarker.style.left = point.x+'%';
    ui.mapMarker.style.top = (point.y-37)+'px';
}
function renderLevelMap() {
    const {first,last} = mapBounds();
    const cleared = stageProgress[courseMode].cleared;
    const unlocked = unlockedLevel();
    const height = (last-first)*MAP_STEP+150;
    ui.mapTrack.style.height = height+'px';
    ui.mapRoad.setAttribute('viewBox',`0 0 400 ${height}`);
    const roads=[],nodes=[];
    for (let n=first;n<=last;n++) {
        const p=mapPoint(n),locked=n>unlocked,done=n<=cleared;
        if (n<last) {
            const q=mapPoint(n+1);
            roads.push(`<path d="M ${p.x*4} ${p.y} C ${p.x*4} ${p.y-46}, ${q.x*4} ${q.y+46}, ${q.x*4} ${q.y}" class="${n<unlocked?'map-road-open':'map-road-locked'}"/>`);
        }
        const record=done && stageRecords[courseMode][n];
        const stats=record ? formatStageRecord(record) : '';
        nodes.push(`<button class="map-node ${done?'is-cleared':locked?'is-locked':'is-ready'}" style="left:${p.x}%;top:${p.y}px" data-level="${n}" aria-label="レベル${n} ${done?'クリア済み':locked?'未解放':'挑戦できます'} ${stats}" ${n===mapSelected?'aria-current="step"':''} ${locked||mapTransition?'disabled':''}><span>${n}</span><small>${done?'✓':locked?'未解放':'PLAY'}</small></button>`);
        if(record)nodes.push(`<span class="map-record ${p.x>=50?'record-left':'record-right'}" style="left:${p.x}%;top:${p.y}px">${stats}</span>`);
    }
    ui.mapRoad.innerHTML = roads.join('');
    ui.mapNodes.innerHTML = nodes.join('');
    ui.mapMarker.hidden = mapSelected<first || mapSelected>last;
    if (!ui.mapMarker.hidden) positionMapMarker(mapPoint(mapSelected));
    if(typeof updateMapAppearance==='function')updateMapAppearance();
    ui.mapCourse.textContent = courseMode==='prototype'?'ロジハラコース':'ノーマルコース';
    ui.mapStatus.textContent = mapTransition ? '次のレベルへ進んでいます…' : `クリア ${cleared} ステージ · 次は Level ${unlocked}`;
    ui.mapRange.textContent = `${first}–${last}`;
    ui.mapPrev.disabled = mapPage===0 || !!mapTransition;
    ui.mapNext.disabled = last>=unlocked || !!mapTransition;
    ui.mapCourses.disabled = !!mapTransition;
    ui.debugStage.disabled = ui.debugPlay.disabled = !!mapTransition;
    ui.debugControls.hidden = !debugMode;
}
function focusMapLevel() {
    const button=ui.mapNodes.querySelector?.(`[data-level="${mapSelected}"]`);
    button?.focus({preventScroll:true});
}
function showLevelMap({target=unlockedLevel(),advanceFrom=null}={}) {
    release(true);endPan();touchId=null;ignoreTouches=false;
    drag=null;bodyTap=null;cameraIntro=null;heartPopups=[];hazardShakeStart=null;
    if (debugAttempt) { advanceFrom=null; target=unlockedLevel(); }
    debugAttempt=false;
    hideStageHelp();
    state='map';
    ui.characterEditor.hidden=true;
    ui.wall.classList.toggle('map-open',true);
    const destination=clamp(advanceFrom===null?target:advanceFrom+1,1,unlockedLevel());
    mapSelected=advanceFrom===null?destination:advanceFrom;
    mapPage=Math.floor((destination-1)/MAP_PAGE_SIZE);
    mapTransition=advanceFrom!==null && destination!==advanceFrom
        ? {from:advanceFrom,to:destination,start:null} : null;
    hideResultModal();ui.titleScreen.hidden=true;ui.levelMap.hidden=false;
    ui.mapError.hidden=true;
    hideSettings();ui.hud.hidden=true;
    ui.restart.disabled=ui.mapButton.disabled=true;
    canvas.setAttribute('tabindex','-1');
    renderLevelMap();
    ui.mapScroll.scrollTop=Math.max(0,mapPoint(destination).y-(ui.mapScroll.clientHeight||H)/2);
    if (!mapTransition) focusMapLevel();
}
function advanceLevelMap(now) {
    if (state!=='map' || !mapTransition) return;
    if (mapTransition.start===null) {mapTransition.start=now;return;}
    const t=clamp((now-mapTransition.start)/MAP_HOP_DURATION,0,1),s=t*t*(3-2*t);
    const from=mapPoint(mapTransition.from),to=mapPoint(mapTransition.to);
    positionMapMarker({x:from.x+(to.x-from.x)*s,y:from.y+(to.y-from.y)*s});
    if (t===1) {
        mapSelected=mapTransition.to;mapTransition=null;
        renderLevelMap();focusMapLevel();
    }
}
function selectStage(n,debug=false) {
    if (state!=='map' || mapTransition || !Number.isSafeInteger(n) || n<1 || n>=Number.MAX_SAFE_INTEGER || (debug ? !debugMode : n>unlockedLevel())) return false;
    // Dismiss the numeric keyboard before generating and opening the stage.
    if(debug)ui.debugStage.blur?.();
    try {
        debugAttempt=debug;
        restartInput(n);
        ui.titleScreen.hidden=true;ui.levelMap.hidden=true;
        canvas.setAttribute('tabindex','0');
        if(!featureHelpOpen)canvas.focus();
        return true;
    } catch (error) {
        showLevelMap({target:n});
        ui.mapError.textContent='ステージを生成できませんでした。もう一度選んでください。';
        ui.mapError.hidden=false;
        console.error(error);
        return false;
    }
}
ui.mapNodes.onclick = e => {
    const button=e.target.closest('button[data-level]');
    if (button && ui.mapNodes.contains(button)) selectStage(Number(button.dataset.level));
};
ui.mapCourses.onclick=()=>{if(!mapTransition)showTitleScreen();};
ui.mapPrev.onclick=()=>{
    if (state!=='map' || mapTransition || mapPage===0) return;
    mapPage--;renderLevelMap();ui.mapScroll.scrollTop=0;
};
ui.mapNext.onclick=()=>{
    if (state!=='map' || mapTransition || mapBounds().last>=unlockedLevel()) return;
    mapPage++;renderLevelMap();ui.mapScroll.scrollTop=ui.mapTrack.clientHeight;
};

ui.debugControls.onsubmit=e=>{
    e.preventDefault();
    const n=Number(ui.debugStage.value);
    if (!Number.isSafeInteger(n) || n<1 || n>=Number.MAX_SAFE_INTEGER) {
        ui.mapError.textContent='ステージ番号は1以上の整数を入力してください。';
        ui.mapError.hidden=false;
        return;
    }
    selectStage(n,true);
};
