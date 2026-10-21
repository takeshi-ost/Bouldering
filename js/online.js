"use strict";
// Public profiles. Scores have their own queue; inventory/lives/rewards stay local.
const ONLINE_PROFILE_KEY='ascent.online-profile.v1',ONLINE_CACHE_MS=60000;
const online={adapter:null,uid:null,ready:false,connecting:false,saving:false,dirty:false,
    revision:0,pages:new Map(),status:'オンライン接続を準備中…'};
function onlineProfile() {
    // Firestore's string bound counts code points, while the editor counts graphemes.
    const name=Array.from(normalizedPlayerName(playerName)).slice(0,40).join('');
    return {name,colors:[...playerColors],headColor:playerHeadColor,
        reachedLevel:Math.min(1000000,stageProgress.existing.cleared+1),
        reachedPrototypeLevel:Math.min(1000000,stageProgress.prototype.cleared+1)};
}
function onlineProfileFrom(data) {
    if(!data || typeof data.name!=='string' || !normalizedPlayerName(data.name) ||
        Array.from(data.name).length>40 || !Array.isArray(data.colors) ||
        data.colors.length<1 || data.colors.length>8 || !data.colors.every(validBodyColor) ||
        !validBodyColor(data.headColor) || ![data.reachedLevel,data.reachedPrototypeLevel]
            .every(n=>Number.isSafeInteger(n) && n>=1 && n<=1000000))return null;
    return {name:normalizedPlayerName(data.name),colors:data.colors.map(c=>c.toLowerCase()),
        headColor:data.headColor.toLowerCase(),reachedLevel:data.reachedLevel,
        reachedPrototypeLevel:data.reachedPrototypeLevel};
}
function onlineProfileKey(profile) {return JSON.stringify(profile);}
function readOnlineCheckpoint() {
    try {return JSON.parse(globalThis.localStorage?.getItem(ONLINE_PROFILE_KEY)||'null');}
    catch(_) {return null;}
}
function saveOnlineCheckpoint(profile) {
    try {globalThis.localStorage?.setItem(ONLINE_PROFILE_KEY,JSON.stringify({uid:online.uid,key:onlineProfileKey(profile)}));}
    catch(_) { /* Local gameplay remains usable with storage disabled. */ }
}
function setOnlineStatus(message) {
    online.status=message;
    document.getElementById('onlineStatus').textContent=message;
    if(online.uid)ui.playerUuid.textContent=`UID ${online.uid}`;
}
function onlineError(error) {
    setOnlineStatus('オンライン保存を待っています');
    console.warn('Online profile:',error?.code || error?.message || 'connection unavailable');
}
function mergeOnlineProfile(local,remote,preferLocal) {
    if(!remote)return local;
    return {...(preferLocal?local:remote),
        reachedLevel:Math.max(local.reachedLevel,remote.reachedLevel),
        reachedPrototypeLevel:Math.max(local.reachedPrototypeLevel,remote.reachedPrototypeLevel)};
}
function applyOnlineProfile(profile,keepAppearance=false) {
    if(!keepAppearance) {
        playerName=profile.name;playerColors=[...profile.colors];playerHeadColor=profile.headColor;
        savePlayerName(playerName);saveAppearance({colors:playerColors,headColor:playerHeadColor});
        updateMapAppearance();
    }
    const before=JSON.stringify(stageProgress);
    stageProgress.existing.cleared=Math.max(stageProgress.existing.cleared,profile.reachedLevel-1);
    stageProgress.prototype.cleared=Math.max(stageProgress.prototype.cleared,profile.reachedPrototypeLevel-1);
    try {globalThis.localStorage?.setItem(PROGRESS_KEY,JSON.stringify(stageProgress));}catch(_) {}
    if(before!==JSON.stringify(stageProgress)) {
        if(state==='choosing')prepareTitleMapLayout();
        else if(state==='map' && !mapTransition && !stageStartContext && !mapPreparing) {
            mapSelected=unlockedLevel();mapPage=Math.floor((mapSelected-1)/MAP_PAGE_SIZE);
            renderLevelMap();
        }
    }
}
function queueOnlineProfileSave() {
    online.revision++;online.dirty=true;
    void flushOnlineProfile();
}
async function flushOnlineProfile(preferLocal=true) {
    if(!online.ready || online.saving)return;
    online.saving=true;
    try {
        while(online.dirty) {
            const revision=online.revision,profile=onlineProfile();online.dirty=false;
            setOnlineStatus('オンラインに保存中…');
            const saved=await online.adapter.sync(online.uid,profile,preferLocal);
            // A delayed first download must not replace an edit/clear made while loading.
            const changed=revision!==online.revision || onlineProfileKey(profile)!==onlineProfileKey(onlineProfile());
            const keepAppearance=changed || state==='editing';
            applyOnlineProfile(saved,keepAppearance);
            saveOnlineCheckpoint(saved);
            online.dirty=changed || (keepAppearance && onlineProfileKey(saved)!==onlineProfileKey(onlineProfile()));
            preferLocal=true;
        }
        setOnlineStatus('オンラインに保存済み');
    } catch(error) {online.dirty=true;onlineError(error);}
    finally {online.saving=false;}
}
async function startOnline(adapter) {
    if(online.connecting || online.ready)return;
    online.connecting=true;online.adapter=adapter;
    try {
        setOnlineStatus('オンラインに接続中…');
        const user=await adapter.authenticate();online.uid=user.uid;
        const checkpoint=readOnlineCheckpoint();
        const preferLocal=checkpoint?.uid!==user.uid || checkpoint?.key!==onlineProfileKey(onlineProfile());
        online.ready=true;online.dirty=true;
        await flushOnlineProfile(preferLocal);
        connectOnlineScores(user.uid);
        renderMapPlayers();
    } catch(error) {onlineError(error);}
    finally {online.connecting=false;}
}
function onlineMapPlayers(first,last,mode) {
    if(!online.ready)return [];
    const key=`${mode}:${first}:${last}`,now=Date.now();
    let page=online.pages.get(key);
    if(!page) {
        page={players:[],at:0,pending:false};online.pages.set(key,page);
        // Bounded cache; a slow old request cannot change a newly visited page.
        if(online.pages.size>6)online.pages.delete(online.pages.keys().next().value);
    }
    if(!page.pending && now-page.at>=ONLINE_CACHE_MS) {
        page.pending=true;page.at=now;
        void online.adapter.players(first,last,mode).then(rows=>{
            const counts=new Map();
            page.players=rows.flatMap(row=>{
                const profile=onlineProfileFrom(row),n=mode==='prototype'?profile?.reachedPrototypeLevel:profile?.reachedLevel;
                if(!profile || typeof row.id!=='string' || row.id===online.uid || n<first || n>last || (counts.get(n)||0)>=5)return [];
                counts.set(n,(counts.get(n)||0)+1);
                return [{id:row.id,name:profile.name,appearance:{colors:profile.colors,headColor:profile.headColor},reachedLevel:n,isPlayer:false}];
            });
            if(online.pages.get(key)===page && (state==='map' || state==='choosing')) {
                const bounds=mapBounds();
                if(courseMode===mode && bounds.first===first && bounds.last===last)renderMapPlayers();
            }
        }).catch(error=>console.warn('Online map:',error?.code || 'connection unavailable'))
            .finally(()=>{page.pending=false;});
    }
    return page.players.filter(row=>row.id!==online.uid);
}
function resumeOnline() {
    if(!online.adapter)return;
    if(!online.ready)void startOnline(online.adapter);
    else {if(online.dirty)void flushOnlineProfile();void flushOnlineScores();refreshOpenScoreViews();if(state==='map' || state==='choosing')renderMapPlayers();}
}
window.addEventListener('online',resumeOnline);
window.addEventListener('focus',resumeOnline);
