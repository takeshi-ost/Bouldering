"use strict";
const PLAYER_UUID_KEY='ascent.player-uuid.v1';
function readPlayerUuid() {
    const valid=value=>typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    try {const saved=globalThis.localStorage?.getItem(PLAYER_UUID_KEY);if(valid(saved))return saved;}
    catch(_) { /* Keep the generated identity in this session if storage is blocked. */ }
    const bytes=new Uint8Array(16);
    if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
    bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    const uuid=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    try {globalThis.localStorage?.setItem(PLAYER_UUID_KEY,uuid);}catch(_) {}
    return uuid;
}
const playerUuid=readPlayerUuid();
let titleReady=false,titlePreparation=0;
function prepareTitleMapLayout() {
    cancelMapReveal();
    mapSelected=unlockedLevel();mapPage=Math.floor((mapSelected-1)/MAP_PAGE_SIZE);mapTransition=null;
    ui.levelMap.hidden=false;
    ui.levelMap.inert=true;ui.levelMap.setAttribute('aria-hidden','true');
    renderLevelMap();
    const viewportHeight=ui.mapScroll.clientHeight||H;
    ui.mapScroll.scrollTop=Math.max(0,viewportHeight*.2+mapPoint(mapSelected).y-viewportHeight/2);
}
async function beginTitlePreparation() {
    const ticket=++titlePreparation;
    titleReady=false;ui.titleTap.hidden=true;
    ui.titleScreen.setAttribute('aria-disabled','true');
    ui.releaseVersion.textContent=`VERSION ${RELEASE_VERSION}`;
    ui.playerUuid.textContent=`UUID ${playerUuid}`;
    ui.wall.classList.toggle('title-open',true);
    prepareTitleMapLayout();refreshLives();
    const sources=[`assets/stage-map.webp?v=${MAP_BACKGROUND_VERSION}`,'assets/map-sky.webp','assets/daily-airship.webp',
        ...Object.keys(MAP_ICON_ASSETS).map(key=>`assets/stage-icons/${key}.webp?v=${MAP_ART_VERSION}`)];
    const tasks=typeof Image==='undefined'?[]:sources.map(src=>{
        const image=new Image();
        if(image.decode) {image.src=src;return image.decode();}
        return new Promise(resolve=>{image.onload=image.onerror=resolve;image.src=src;});
    });
    if(document.fonts?.ready)tasks.push(document.fonts.ready);
    // Missing cached artwork must not permanently lock the title offline.
    await Promise.allSettled(tasks);
    if(ticket!==titlePreparation || state!=='choosing')return;
    // Commit layout and give the browser a frame to prepare the decoded artwork.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(ticket!==titlePreparation || state!=='choosing')return;
    titleReady=true;ui.titleTap.hidden=false;
    ui.titleScreen.setAttribute('aria-disabled','false');
    ui.titleScreen.focus({preventScroll:true});
}
function enterPreparedMap() {
    if(state!=='choosing' || !titleReady)return;
    titleReady=false;titlePreparation++;
    state='map';ui.titleScreen.hidden=true;
    ui.levelMap.inert=false;ui.levelMap.removeAttribute?.('aria-hidden');
    ui.wall.classList.toggle('title-open',false);
    ui.wall.classList.toggle('map-open',true);
    refreshDailyEntry();refreshLives();focusMapLevel();
}
ui.titleScreen.onclick=enterPreparedMap;
ui.titleScreen.onkeydown=e=>{if(e.key==='Enter' || e.key===' '){e.preventDefault();enterPreparedMap();}};
showTitleScreen();
requestAnimationFrame(draw);
