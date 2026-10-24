"use strict";
// One reusable, gapless music buffer, independent of screens and the SE voice limit.
const BACKGROUND_MUSIC={src:'assets/audio/bgm-loop.wav?v=d6dfae503385',volume:.42};
let bgmLoading=null,bgmBytes=null,bgmFailed=false,bgmDecoding=null,bgmDecodingContext=null;
let bgmBuffer=null,bgmBufferContext=null,bgmPlayback=null,bgmOffset=0;
let bgmPageActive=!document.hidden;
async function prepareBackgroundMusic(retry=false) {
    if(!soundEnabled || typeof globalThis.fetch!=='function')return;
    if(!bgmLoading || (retry && bgmFailed)) {
        bgmFailed=false;
        bgmLoading=(async()=>{
            const response=await globalThis.fetch(BACKGROUND_MUSIC.src);
            if(!response.ok)throw new Error('Music unavailable');
            bgmBytes=await response.arrayBuffer();
        })().catch(()=>{bgmFailed=true;});
    }
    await bgmLoading;
    const context=soundContext;
    if(!bgmBytes || !context || typeof context.decodeAudioData!=='function')return;
    if(bgmBufferContext===context && bgmBuffer)return;
    if(bgmDecodingContext!==context) {
        bgmDecodingContext=context;
        bgmDecoding=Promise.resolve().then(()=>context.decodeAudioData(bgmBytes.slice(0))).then(buffer=>{
            if(soundContext===context && context.state!=='closed') {
                bgmBuffer=buffer;bgmBufferContext=context;syncBackgroundMusic();
            }
        }).catch(()=>{});
    }
    await bgmDecoding;
}
function pauseBackgroundMusic() {
    const playback=bgmPlayback;
    if(!playback)return;
    bgmPlayback=null;
    bgmOffset=(playback.offset+Math.max(0,playback.context.currentTime-playback.started))%playback.duration;
    try {playback.source.stop();}catch(_){}
    playback.source.disconnect();playback.gain.disconnect();
}
function syncBackgroundMusic() {
    if(!soundEnabled || !bgmPageActive || document.hidden) {pauseBackgroundMusic();return;}
    if(bgmPlayback && bgmPlayback.context!==soundContext)pauseBackgroundMusic();
    if(!soundContext || soundContext.state!=='running' || bgmPlayback)return;
    if(bgmBufferContext!==soundContext || !bgmBuffer) {void prepareBackgroundMusic();return;}
    if(!(bgmBuffer.duration>0))return;
    try {
        const context=soundContext,source=context.createBufferSource(),gain=context.createGain();
        const offset=bgmOffset%bgmBuffer.duration;
        source.buffer=bgmBuffer;source.loop=true;source.loopStart=0;source.loopEnd=bgmBuffer.duration;
        source.connect(gain);gain.connect(soundMaster);
        gain.gain.setValueAtTime(.0001,context.currentTime);
        gain.gain.exponentialRampToValueAtTime(BACKGROUND_MUSIC.volume,context.currentTime+.03);
        source.start(context.currentTime,offset);
        bgmPlayback={source,gain,context,offset,started:context.currentTime,duration:bgmBuffer.duration};
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
window.addEventListener('online',()=>{void prepareBackgroundMusic(true);});
// Fetch asynchronously at boot; AudioContext and playback still require a gesture.
void prepareBackgroundMusic();
