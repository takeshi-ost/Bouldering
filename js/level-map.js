"use strict";
// Consumable hearts are separate from life and the hearts picked up on a course.
const HEART_ITEMS_KEY='ascent.heart-items.v1';
function readHeartItems() {
    try {
        const count=JSON.parse(globalThis.localStorage?.getItem(HEART_ITEMS_KEY)||'null');
        if(Number.isSafeInteger(count) && count>=0)return count;
    } catch(_) {}
    return 5;
}
let heartItems=readHeartItems();
function renderMapInventory() {
    const count=String(heartItems);
    if(ui.mapItemCount.textContent!==count)ui.mapItemCount.textContent=count;
    ui.mapInventory.setAttribute('aria-label',gameText("level-map.renderMapInventory", {value0: count}));
}
function saveHeartItems() {
    try {globalThis.localStorage?.setItem(HEART_ITEMS_KEY,JSON.stringify(heartItems));}catch(_) {}
    renderMapInventory();
}
saveHeartItems();
const PROGRESS_KEY = 'ascent.progress.v1';
const MAP_PAGE_SIZE = 20;
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
                    Number.isSafeInteger(value?.timeMs) && value.timeMs>=0) {
                    result[mode][key]={moves:value.moves,timeMs:value.timeMs,...scoreMetadata(value)};
                    if(value.version===COURSE_VERSION)result[mode][key].version=value.version;
                    if(Number.isInteger(value.stars) && value.stars>=1 && value.stars<=3)
                        result[mode][key].stars=value.stars;
                }
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
let mapPreparing=false,mapRevealTicket=0;
function cancelMapReveal() {
    mapRevealTicket++;mapPreparing=false;
    ui.levelMap.classList.toggle('map-preparing',false);
    ui.levelMap.inert=false;
}
function prepareMapReveal() {
    const ticket=++mapRevealTicket;
    const reveal=()=>{
        if(ticket!==mapRevealTicket || state!=='map')return;
        // Keep the previous screen until the map's final placement is ready.
        ui.mapTrack.getBoundingClientRect();
        ui.dailyCalendar.hidden=ui.characterEditor.hidden=ui.titleScreen.hidden=ui.hud.hidden=true;
        hideResultModal();hideSettings();
        ui.wall.classList.toggle('map-open',true);
        mapPreparing=false;
        ui.levelMap.classList.toggle('map-preparing',false);
        ui.levelMap.inert=false;
        ui.levelMap.removeAttribute?.('aria-hidden');
        finishDummyAdCover();finishRewardCover();
        requestGameRender();
        if(!mapTransition){focusMapLevel();resumePendingMapReward();}
    };
    const images=Array.from(ui.mapNodes.querySelectorAll?.('img')||[]);
    if(!images.length){reveal();return;}
    const ready=images.map(image=>{
        if(image.decode)return image.decode();
        if(image.complete)return Promise.resolve();
        return new Promise(resolve=>{
            image.addEventListener('load',resolve,{once:true});
            image.addEventListener('error',resolve,{once:true});
        });
    });
    Promise.allSettled(ready).then(()=>{
        if(ticket!==mapRevealTicket || state!=='map')return;
        requestAnimationFrame(()=>requestAnimationFrame(reveal));
    });
}
let debugAttempt = false;
function recordStageClear() {
    if(dailyRun) {recordDailyClear();return;}
    if (debugAttempt) return;
    if(moveCount>0) {
        const stars=Math.max(stageRecords[courseMode][level]?.stars||0,clearStars(moveCount,routeExpectedMoves()));
        const candidate={moves:moveCount,timeMs:Math.floor(runElapsedMs),version:COURSE_VERSION,...currentScoreMetadata()};
        const previous=stageRecords[courseMode][level];
        const best=previous?.version===COURSE_VERSION && compareStageScores(previous,candidate)<=0?previous:candidate;
        stageRecords[courseMode][level]={...best,stars};
        queueOnlineScore(level,courseMode,candidate);
    }
    stageProgress[courseMode].cleared = Math.max(stageProgress[courseMode].cleared,level);
    try { globalThis.localStorage?.setItem(PROGRESS_KEY,JSON.stringify(stageProgress)); }
    catch (_) { /* Completing a level must still work without storage. */ }
    try {globalThis.localStorage?.setItem(RECORDS_KEY,JSON.stringify(stageRecords));}
    catch(_) { /* Keep records in memory when storage is unavailable. */ }
    queueOnlineProfileSave();
}
function unlockedLevel() { return stageProgress[courseMode].cleared + 1; }
function mapBounds() {
    return {first:mapPage*MAP_PAGE_SIZE+1,last:(mapPage+1)*MAP_PAGE_SIZE};
}
function canBrowseNextMap() {
    return Number.isSafeInteger((mapPage+2)*MAP_PAGE_SIZE) &&
        (debugMode || mapBounds().last<unlockedLevel());
}
function mapHeight() {
    return (ui.mapTrack.clientWidth||400)*MAP_IMAGE_HEIGHT/MAP_IMAGE_WIDTH+MAP_EDGE_SPACE+MAP_BOTTOM_SPACE;
}
function mapPoint(n) {
    if(n===mapPage*MAP_PAGE_SIZE)return {x:MAP_ENTRY_X/MAP_IMAGE_WIDTH*100,y:MAP_ENTRY_Y/MAP_IMAGE_WIDTH*(ui.mapTrack.clientWidth||400)};
    const point=mapTrailPoint((n-mapPage*MAP_PAGE_SIZE-1)/(MAP_PAGE_SIZE-1));
    return {x:point.x/MAP_IMAGE_WIDTH*100,y:MAP_EDGE_SPACE+point.y/MAP_IMAGE_WIDTH*(ui.mapTrack.clientWidth||400)};
}
function positionMapMarker(point) {
    ui.mapMarker.style.left = `calc(${point.x}% + 22px)`;
    ui.mapMarker.style.top = (point.y+12)+'px';
    ui.mapMarker.style.zIndex = String(mapPlayerDepth(point.y+12));
}
// Feet lower on the map paint over higher figures, including the local climber.
function mapPlayerDepth(y) { return 1+Math.round(y*100); }
function layoutMapPlayers(players) {
    const {first,last}=mapBounds(),width=ui.mapTrack.clientWidth||400;
    // Leave the local marker's upper-right spot free, and keep stage numbers clear.
    const slots=[[-25,12],[-40,28],[-12,36],[17,40],[42,31]];
    const counts=new Map(),seen=new Set(),placed=[];
    for(const player of players) {
        const n=player.reachedLevel,count=counts.get(n)||0;
        if(player.isPlayer || seen.has(player.id) || !Number.isSafeInteger(n) || n<first || n>last || count>=slots.length)continue;
        const p=mapPoint(n),[dx,dy]=slots[count];
        const x=clamp(p.x*width/100+dx,12,width-12),y=p.y+dy;
        placed.push({...player,x,y,depth:mapPlayerDepth(y)});
        counts.set(n,count+1);seen.add(player.id);
    }
    return placed.sort((a,b)=>a.y-b.y || a.x-b.x);
}
let mapPlayerNameHold=null,mapPlayerNameTimer=null;
function hideMapPlayerName() {
    if(mapPlayerNameTimer!==null)clearTimeout(mapPlayerNameTimer);
    mapPlayerNameTimer=null;
    if(!mapPlayerNameHold)return;
    mapPlayerNameHold.element.classList.toggle('is-name-visible',false);
    mapPlayerNameHold=null;
}
function showMapPlayerName(element,event) {
    hideMapPlayerName();
    element.classList.toggle('is-name-visible',true);
    mapPlayerNameHold={element,pointerId:event.pointerId,x:event.clientX,y:event.clientY};
}
function releaseMapPlayerName() {
    if(!mapPlayerNameHold || mapPlayerNameTimer!==null)return;
    mapPlayerNameHold.pointerId=null;
    mapPlayerNameTimer=setTimeout(()=>{
        mapPlayerNameTimer=null;hideMapPlayerName();
    },1000);
}
ui.mapPlayers.addEventListener('pointerdown',event=>{
    const element=event.target.closest?.('.map-opponent');
    if(state!=='map' || settingsOpen || mapPreparing || !element || (event.button!==undefined && event.button!==0))return;
    showMapPlayerName(element,event);
});
window.addEventListener('pointerup',event=>{
    if(mapPlayerNameHold?.pointerId===event.pointerId)releaseMapPlayerName();
});
window.addEventListener('pointercancel',hideMapPlayerName);
window.addEventListener('pointermove',event=>{
    const hold=mapPlayerNameHold;
    if(hold && hold.pointerId===event.pointerId && Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>8)hideMapPlayerName();
});
window.addEventListener('blur',hideMapPlayerName);
ui.mapScroll.addEventListener('scroll',hideMapPlayerName,{passive:true});
ui.mapPlayers.addEventListener('keydown',event=>{
    const element=event.target.closest?.('.map-opponent');
    if(!element || !['Enter',' '].includes(event.key))return;
    event.preventDefault();if(!event.repeat)showMapPlayerName(element,event);
});
ui.mapPlayers.addEventListener('keyup',event=>{
    if(['Enter',' '].includes(event.key))releaseMapPlayerName();
});
ui.mapPlayers.addEventListener('focusout',hideMapPlayerName);
ui.mapPlayers.addEventListener('contextmenu',event=>event.preventDefault());
function renderMapPlayers() {
    hideMapPlayerName();
    const {first,last}=mapBounds(),width=ui.mapTrack.clientWidth||400;
    const players=layoutMapPlayers(currentMapPlayers(first,last,courseMode));
    ui.mapPlayers.innerHTML=players.map(player=>
        `<span class="map-marker map-opponent" role="button" tabindex="0" aria-label="${gameText("level-map.renderMapPlayers", {value0: scoreText(player.name)})}" data-player="${scoreText(player.id)}" data-reached-level="${player.reachedLevel}" data-name-side="${player.x>width/2?'left':'right'}" style="left:${player.x}px;top:${player.y}px;z-index:${player.depth}">${scoreAvatar(player)}<span class="map-player-name" aria-hidden="true">${scoreText(player.name)}</span></span>`).join('');
}
function renderLevelMap() {
    const {first,last} = mapBounds();
    const cleared = stageProgress[courseMode].cleared;
    const unlocked = unlockedLevel();
    const height = mapHeight();
    ui.mapTrack.style.height = height+'px';
    ui.mapScenery.setAttribute('viewBox',`0 0 400 ${height}`);
    ui.mapScenery.innerHTML=mapSceneryMarkup(height);
    ui.mapRoad.setAttribute('viewBox',`0 0 400 ${height}`);
    const nodes=[];
    // The route is painted into the approved wallpaper; never draw a replacement road.
    for (let n=first;n<=last;n++) {
        const p=mapPoint(n),locked=!debugMode && n>unlocked,done=n<=cleared;
        const record=done && stageRecords[courseMode][n];
        const stars=record?.stars || 0;
        const rating=stars ? `<span class="map-node-stars" aria-hidden="true">${'⭐️'.repeat(stars)}</span>` : '';
        const hasReward=hasMapReward(n);
        const gift=hasReward?'<img class="reward-gift-icon map-reward-gift" src="assets/reward-gift.png" width="30" height="30" alt="" aria-hidden="true" draggable="false">':'';
        const reward=hasReward?'<span class="goal-effects map-reward-effects" aria-hidden="true"><i></i><i></i><i></i><i></i></span>':'';
        nodes.push(`<button class="map-node ${done?'is-cleared':locked?'is-locked':'is-ready'}" style="left:${p.x}%;top:${p.y}px" data-level="${n}" aria-label="${gameText("level-map.renderLevelMap.7", {value4: n, value5: done?gameText("level-map.renderLevelMap.3"):locked?gameText("level-map.renderLevelMap.2"):gameText("level-map.renderLevelMap"), value6: stars?' '+stars+gameText("level-map.renderLevelMap.4", {value0: stars}):'', value7: hasReward?gameText("level-map.renderLevelMap.5"):''})}" ${n===mapSelected?'aria-current="step"':''} ${locked||mapTransition?'disabled':''}>${mapWallMarkup(n,done?'cleared':locked?'unplayed':'active')}<small>${done?'✓':locked?gameText("level-map.renderLevelMap.2"):gameText("level-map.renderLevelMap.6")}</small>${rating}${reward}${gift}</button>`);
    }
    ui.mapRoad.innerHTML = '';
    ui.mapNodes.innerHTML = nodes.join('');
    renderMapPlayers();
    // The page-boundary hop starts on the entry path, without duplicating a stage button.
    ui.mapMarker.hidden = (mapSelected<first || mapSelected>last) && !mapTransition;
    if (!ui.mapMarker.hidden) positionMapMarker(mapPoint(mapSelected));
    if(typeof updateMapAppearance==='function')updateMapAppearance();
    ui.mapCourse.hidden=courseMode!=='prototype';
    ui.mapCourse.textContent=courseMode==='prototype'?gameText("input.syncDebugCourseControls"):'';
    ui.mapPrev.hidden=mapPage===0;
    ui.mapNext.hidden=!canBrowseNextMap();
    ui.mapPrev.disabled = ui.mapPrev.hidden || !!mapTransition;
    ui.mapNext.disabled = ui.mapNext.hidden || !!mapTransition;
    ui.mapCourses.disabled = !!mapTransition;
    ui.mapSettingsButton.disabled = !!mapTransition;
    ui.openDaily.disabled=!!mapTransition;
    refreshDailyEntry();
    ui.debugStage.disabled = ui.debugPlay.disabled = !!mapTransition;
    ui.debugControls.hidden = !debugMode;
}
function focusMapLevel() {
    const button=ui.mapNodes.querySelector?.(`[data-level="${mapSelected}"]`);
    button?.focus({preventScroll:true});
}
function showLevelMap({target=unlockedLevel(),advanceFrom=null}={}) {
    hideStageStart();
    cancelMapReveal();mapPreparing=true;
    ui.levelMap.classList.toggle('map-preparing',true);
    ui.levelMap.inert=true;ui.levelMap.setAttribute('aria-hidden','true');
    ui.wall.classList.toggle('title-open',false);
    settleLifeAttempt(false);
    leaveDailyRun();
    release(true);endPan();touchId=null;ignoreTouches=false;
    drag=null;bodyTap=null;cameraIntro=null;heartPopups=[];hazardShakeStart=null;
    if (debugAttempt) { advanceFrom=null; target=unlockedLevel(); }
    debugAttempt=false;
    hideStageHelp();
    state='map';
    const destination=clamp(advanceFrom===null?target:advanceFrom+1,1,unlockedLevel());
    mapSelected=advanceFrom===null?destination:advanceFrom;
    mapPage=Math.floor((destination-1)/MAP_PAGE_SIZE);
    mapTransition=advanceFrom!==null && destination!==advanceFrom
        ? {from:advanceFrom,to:destination,start:null} : null;
    ui.levelMap.hidden=false;
    ui.mapError.hidden=true;
    ui.restart.disabled=true;
    canvas.setAttribute('tabindex','-1');
    renderLevelMap();
    const viewportHeight=ui.mapScroll.clientHeight||H;
    ui.mapScroll.scrollTop=Math.max(0,viewportHeight*.2+mapPoint(destination).y-viewportHeight/2);
    prepareMapReveal();
}
function advanceLevelMap(now) {
    if (state!=='map' || mapPreparing || !mapTransition) return;
    if (mapTransition.start===null) {mapTransition.start=now;return;}
    const t=clamp((now-mapTransition.start)/MAP_HOP_DURATION,0,1),s=t*t*(3-2*t);
    const from=mapPoint(mapTransition.from),to=mapPoint(mapTransition.to);
    if(mapTransition.from>mapPage*MAP_PAGE_SIZE) {
        const point=mapTrailPoint((mapTransition.from-mapPage*MAP_PAGE_SIZE-1+s)/(MAP_PAGE_SIZE-1));
        positionMapMarker({x:point.x/MAP_IMAGE_WIDTH*100,y:MAP_EDGE_SPACE+point.y/MAP_IMAGE_WIDTH*(ui.mapTrack.clientWidth||400)});
    } else positionMapMarker({x:from.x+(to.x-from.x)*s,y:from.y+(to.y-from.y)*s});
    if (t===1) {
        mapSelected=mapTransition.to;mapTransition=null;
        playSound('page');
        renderLevelMap();focusMapLevel();
        openStageStart(mapSelected,false,null,500);
    }
}
let stageStartContext=null,stageStartTimer=null;
function renderStageHeartItems() {
    const context=stageStartContext;if(!context)return;
    ui.stageHeartValue.textContent=String(context.hearts).padStart(2,'0');
    ui.stageHeartCount.setAttribute('aria-label',gameText("level-map.renderStageHeartItems.2", {value0: context.hearts}));
    ui.stageHeartCount.disabled=context.hearts===heartItems;
    ui.stageHeartReset.disabled=context.hearts===0;
    ui.stageStartStamina.textContent=previewStaminaText(context.n,context.mode).replace('❤️','');
    ui.stageStartStamina.setAttribute('aria-label',gameText("level-map.renderStageHeartItems", {value0: ui.stageStartStamina.textContent}));
}
function setStageHeartItems(value) {
    if(!stageStartContext || !ui.stageStartDialog.open)return;
    const count=Number(value);
    stageStartContext.hearts=Number.isFinite(count)?clamp(Math.trunc(count),0,heartItems):0;
    renderStageHeartItems();
}
ui.stageHeartCount.onclick=()=>setStageHeartItems((stageStartContext?.hearts??0)+1);
ui.stageHeartReset.onclick=()=>setStageHeartItems(0);
function canSelectStage(n,debug=false,retry=false) {
    if(debug && !DEBUG_FEATURES_ALLOWED)return false;
    if(retry)return state==='lost' && !dailyRun && !stageStartContext && n===level && debug===debugAttempt;
    return state==='map' && !mapPreparing && !mapTransition && !stageStartContext &&
        Number.isSafeInteger(n) && n>=1 && n<Number.MAX_SAFE_INTEGER &&
        (debug?debugMode:n<=unlockedLevel());
}
function hideStageStart() {
    if(stageStartTimer!==null)clearTimeout(stageStartTimer);
    stageStartTimer=null;
    stageStartContext?.button?.classList.toggle('is-tapped',false);
    stageStartContext=null;
    if(ui.stageStartDialog.open)ui.stageStartDialog.close?.();
    if(typeof requestGameRender==='function')requestGameRender();
}
function closeStageStart() {
    const selected=stageStartContext?.n,retry=stageStartContext?.retry;
    hideStageStart();
    if(retry){showLevelMap({target:selected});return;}
    if(state==='map')ui.mapNodes.querySelector?.(`[data-level="${selected}"]`)?.focus({preventScroll:true});
}
function openStageStart(n,debug=false,button=null,delay=0,retry=false) {
    if(!canSelectStage(n,debug,retry))return false;
    recoverLives();
    if(courseMode==='existing' && !debug && lives.count===0) {
        requestLifeStart(()=>openStageStart(n,debug,null,0,retry),{onCancel:retry?()=>showLevelMap({target:n}):null});
        return !!lifePrompt;
    }
    if(debug)ui.debugStage.blur?.();
    if(retry)hideResultModal();
    const context={n,debug,mode:courseMode,button,hearts:0,retry};
    stageStartContext=context;
    const show=()=>{
        stageStartTimer=null;
        if(stageStartContext!==context || state!==(retry?'lost':'map') || courseMode!==context.mode)return;
        // Let the arrival color/effects paint during the delay before solving the course.
        ui.stageStartTitle.textContent=gameText("label.stage", {value0: n});
        ui.stageStartTitle.setAttribute('aria-label',gameText("label.stage", {value0: n}));
        renderStageHeartItems();
        renderStageStartRecord(context);
        refreshLives();
        ui.stageStartDifficulty.textContent=difficultyLabel(difficultyForStage(n));
        ui.stageStartLength.textContent={short:gameText("course.short"),medium:gameText("course.medium"),long:gameText("course.long")}[stageLengthInfo(n).category];
        ui.stageStartButton.disabled=false;
        ui.stageStartDialog.showModal?.();
        requestGameRender();
    };
    if(button || delay>0) {
        button?.classList.toggle('is-tapped',true);
        stageStartTimer=setTimeout(show,button?140:delay);
    } else show();
    return true;
}
ui.stageStartButton.onclick=()=>{
    const context=stageStartContext;
    if(!context || !ui.stageStartDialog.open || ui.stageStartButton.disabled)return;
    playSound('launch');
    ui.stageStartButton.disabled=true;
    hideStageStart();
    if(context.mode===courseMode)selectStage(context.n,context.debug,context.hearts,context.retry);
};
function selectStage(n,debug=false,heartsUsed=0,retry=false) {
    if(!canSelectStage(n,debug,retry) || !Number.isSafeInteger(heartsUsed) || heartsUsed<0 || heartsUsed>heartItems)return false;
    // Dismiss the numeric keyboard before generating and opening the stage.
    if(debug)ui.debugStage.blur?.();
    const launch=()=>{
        if(heartsUsed>heartItems)return false;
        cancelMapReveal();
        try {
            debugAttempt=debug;
            restartInput(n,heartsUsed);
            beginLifeAttempt();
            ui.titleScreen.hidden=true;ui.levelMap.hidden=true;
            canvas.setAttribute('tabindex','0');
            if(!featureHelpOpen)canvas.focus();
            heartItems-=heartsUsed;saveHeartItems();
            return true;
        } catch (error) {
            showLevelMap({target:n});
            ui.mapError.textContent=gameText("level-map.selectStage");
            ui.mapError.hidden=false;
            console.error(error);
            return false;
        }
    };
    recoverLives();
    // Reconfirm items and stage details after recovery, even if lives ran out while this dialog was open.
    if(courseMode==='existing' && !debug && lives.count===0)
        return requestLifeStart(()=>openStageStart(n,debug,null,0,retry),{onCancel:retry?()=>showLevelMap({target:n}):null});
    return launch();
}
ui.mapNodes.onclick = e => {
    const button=e.target.closest('button[data-level]');
    if (button && ui.mapNodes.contains(button)) {
        const n=Number(button.dataset.level);
        openStageStart(n,debugMode && n>unlockedLevel(),button);
    }
};
ui.mapCourses.onclick=()=>{if(!mapTransition)showTitleScreen();};
ui.mapPrev.onclick=()=>{
    if (state!=='map' || mapPreparing || stageStartContext || mapTransition || mapPage===0) return;
    mapPage--;renderLevelMap();ui.mapScroll.scrollTop=0;
};
ui.mapNext.onclick=()=>{
    if (state!=='map' || mapPreparing || stageStartContext || mapTransition || !canBrowseNextMap()) return;
    mapPage++;renderLevelMap();ui.mapScroll.scrollTop=ui.mapTrack.clientHeight;
};

ui.debugControls.onsubmit=e=>{
    e.preventDefault();
    const n=Number(ui.debugStage.value);
    if (!Number.isSafeInteger(n) || n<1 || n>=Number.MAX_SAFE_INTEGER) {
        ui.mapError.textContent=gameText("level-map");
        ui.mapError.hidden=false;
        return;
    }
    openStageStart(n,true);
};

// Recalculate both artwork height and hit targets when the viewport changes.
window.addEventListener('resize',()=>{if(state==='map')renderLevelMap();else if(state==='choosing')prepareTitleMapLayout();});
