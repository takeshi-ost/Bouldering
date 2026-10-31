"use strict";
// Separate from SE voices: screen changes select tracks without render/audio polling.
// One second of cyclic audio at each end keeps encoder padding outside the loop.
const BACKGROUND_MUSIC={
    main:{src:'assets/audio/bgm-loop.mp3?v=30c3fda2ce8a',volume:.42,loopStart:1,loopSeconds:64},
    stage:{src:'assets/audio/bgm-stage-loop.mp3?v=21690a060444',volume:.42,loopStart:1,loopSeconds:3704399/44100}
};
const bgmCache=new Map();
let bgmTrack='main',bgmPlayback=null,bgmOffset=0,bgmFadeSeconds=.03,bgmFadeElapsed=0;
let bgmPageActive=!document.hidden,bgmAdBlocked=false,bgmAfterAdPending=false,bgmSceneUpdateQueued=false;
async function prepareBackgroundMusic(retry=false,name=bgmTrack) {
    if(!musicEnabled || typeof ASCENT_TRIAL_AUDIO_FETCH!=='function')return;
    let entry=bgmCache.get(name);
    if(!entry){entry={};bgmCache.set(name,entry);}
    if(!entry.loading || (retry && entry.failed)) {
        entry.failed=false;
        entry.loading=(async()=>{
            const response=await ASCENT_TRIAL_AUDIO_FETCH(BACKGROUND_MUSIC[name].src);
            if(!response.ok)throw new Error('Music unavailable');
            entry.bytes=await response.arrayBuffer();
        })().catch(()=>{entry.failed=true;});
    }
    await entry.loading;
    const context=soundContext;
    if(!entry.bytes || !context || typeof context.decodeAudioData!=='function')return;
    if(entry.context===context && entry.buffer)return;
    if(entry.decodingContext!==context) {
        entry.decodingContext=context;
        entry.decoding=Promise.resolve().then(()=>context.decodeAudioData(entry.bytes.slice(0))).then(buffer=>{
            if(soundContext===context && context.state!=='closed') {
                entry.buffer=buffer;entry.context=context;syncBackgroundMusic();
            }
        }).catch(()=>{});
    }
    await entry.decoding;
}
function pauseBackgroundMusic() {
    const playback=bgmPlayback;
    if(!playback)return;
    bgmPlayback=null;
    const elapsed=Math.max(0,playback.context.currentTime-playback.started);
    bgmOffset=(playback.offset+elapsed)%playback.duration;
    bgmFadeElapsed=Math.min(bgmFadeSeconds,playback.fadeElapsed+elapsed);
    try {playback.source.stop();}catch(_){}
    playback.source.disconnect();playback.gain.disconnect();
}
function setBackgroundMusicTrack(name,{restart=false,fadeSeconds=1}={}) {
    if(!BACKGROUND_MUSIC[name] || (!restart && bgmTrack===name))return;
    pauseBackgroundMusic();
    bgmTrack=name;bgmOffset=0;bgmFadeSeconds=fadeSeconds;bgmFadeElapsed=0;
    syncBackgroundMusic();
}
function startStageBackgroundMusic() {
    setBackgroundMusicTrack('stage',{restart:true,fadeSeconds:5});
}
function backgroundMusicScene() {
    // Standalone audio tests can run without the game state script.
    if(typeof state==='undefined')return bgmTrack;
    const scene=state==='life-prompt' && typeof lifePrompt!=='undefined'?lifePrompt?.previousState:state;
    return ['playing','won','lost'].includes(scene)?'stage':'main';
}
function queueBackgroundMusicScene() {
    if(bgmSceneUpdateQueued)return;
    bgmSceneUpdateQueued=true;
    // Resolve after navigation/ad callbacks finish, never on a temporary restored state.
    Promise.resolve().then(()=>{
        bgmSceneUpdateQueued=false;
        if(bgmAdBlocked)return;
        const afterAd=bgmAfterAdPending;bgmAfterAdPending=false;
        setBackgroundMusicTrack(backgroundMusicScene(),{restart:afterAd,fadeSeconds:1});
    });
}
function stopBackgroundMusicForAd() {
    bgmAdBlocked=true;bgmAfterAdPending=false;
    pauseBackgroundMusic();bgmOffset=0;bgmFadeElapsed=0;
}
function resumeBackgroundMusicAfterAd() {
    bgmAdBlocked=false;bgmAfterAdPending=true;queueBackgroundMusicScene();
}
function syncBackgroundMusic() {
    if(!musicEnabled || !bgmPageActive || document.hidden || bgmAdBlocked || bgmAfterAdPending) {pauseBackgroundMusic();return;}
    if(bgmPlayback && bgmPlayback.context!==soundContext)pauseBackgroundMusic();
    if(!soundContext || soundContext.state!=='running' || bgmPlayback)return;
    const entry=bgmCache.get(bgmTrack);
    if(entry?.context!==soundContext || !entry?.buffer) {void prepareBackgroundMusic();return;}
    const buffer=entry.buffer;
    if(!(buffer.duration>0))return;
    try {
        const context=soundContext,source=context.createBufferSource(),gain=context.createGain();
        const track=BACKGROUND_MUSIC[bgmTrack],duration=track.loopSeconds;
        const offset=bgmOffset%duration,volume=track.volume;
        if(buffer.duration<track.loopStart+duration)return;
        const remaining=Math.max(0,bgmFadeSeconds-bgmFadeElapsed);
        source.buffer=buffer;source.loop=true;source.loopStart=track.loopStart;source.loopEnd=track.loopStart+duration;
        source.connect(gain);gain.connect(musicMaster);
        gain.gain.setValueAtTime(remaining?volume*bgmFadeElapsed/bgmFadeSeconds:0,context.currentTime);
        gain.gain.linearRampToValueAtTime(volume,context.currentTime+(remaining || .03));
        source.start(context.currentTime,track.loopStart+offset);
        bgmPlayback={source,gain,context,offset,started:context.currentTime,duration,track:bgmTrack,fadeElapsed:bgmFadeElapsed};
    }catch(_) { /* Music must never block game startup or input. */ }
}
function resumeBackgroundMusic() {
    bgmPageActive=!document.hidden;
    if(bgmPageActive && soundContext && soundPrimed)unlockSound();
}
document.addEventListener?.('visibilitychange',()=>{
    if(document.hidden){bgmPageActive=false;pauseBackgroundMusic();}
    else resumeBackgroundMusic();
});
for(const event of ['blur','pagehide'])window.addEventListener(event,()=>{bgmPageActive=false;pauseBackgroundMusic();});
for(const event of ['focus','pageshow'])window.addEventListener(event,resumeBackgroundMusic);
function preloadBackgroundMusic(retry=false) {
    for(const name of Object.keys(BACKGROUND_MUSIC))void prepareBackgroundMusic(retry,name);
}
window.addEventListener('online',()=>preloadBackgroundMusic(true));
// Fetch asynchronously at boot; AudioContext and playback still require a gesture.
preloadBackgroundMusic();
