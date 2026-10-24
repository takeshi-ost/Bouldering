"use strict";
// Short synthesized cues and replaceable PCM WAV files; gameplay never waits for audio.
const SOUND_KEY='ascent.sound-enabled.v1';
const MUSIC_KEY='ascent.music-settings.v1',SOUND_VOLUME_KEY='ascent.sound-volume.v1';
let soundEnabled=true;
try {soundEnabled=globalThis.localStorage?.getItem(SOUND_KEY)!=='false';} catch(_) {}
let musicEnabled=soundEnabled,musicVolume=1,soundVolume=1;
function validAudioVolume(value){return typeof value==='number' && Number.isFinite(value) && value>=0 && value<=1;}
try {
    const music=JSON.parse(globalThis.localStorage?.getItem(MUSIC_KEY)||'null');
    if(typeof music?.enabled==='boolean')musicEnabled=music.enabled;
    if(validAudioVolume(music?.volume))musicVolume=music.volume;
}catch(_){}
try {
    const effects=JSON.parse(globalThis.localStorage?.getItem(SOUND_VOLUME_KEY)||'null');
    if(validAudioVolume(effects))soundVolume=effects;
}catch(_){}
let soundContext=null,soundMaster=null,soundEffectsGain=null,musicMaster=null,soundPrimed=false,pendingSound=null;
const soundVoices=new Set(),soundLastPlayed=new Map();
// Match other cues to the launch sound; keep music and the user's volume separate.
const SOUND_LEVELS=Object.freeze({
    launch:1,start:1,
    tap:3,move:2,contact:8.5,roulette:6,
    heart:1.5,pickup:1.1,hazard:1.5,page:1.4,clear:1.15,fail:1.15
});
// Seven synthesized cues; move/launch/start/clear/fail use audio files.
const SOUND_NOTES={
    // Reference: a dry ~800 Hz strike, then a lighter ~1200 Hz click 70 ms later.
    tap:[[800,760,0,.026,'triangle',.48],[550,520,0,.022,'sine',.2],[0,0,0,.012,'noise',.12],[1200,1160,.072,.023,'triangle',.24],[0,0,.072,.009,'noise',.07]],
    contact:[[1500,1000,0,.015,'triangle',.16]],
    heart:[[880,1175,0,.12,'sine',.4],[1320,1320,.07,.15,'sine',.3]],
    roulette:[[1500,1000,0,.018,'triangle',.22]],
    pickup:[[523,523,0,.55,'triangle',.32],[659,659,0,.55,'triangle',.26],[784,784,0,.6,'triangle',.24],[1047,1047,0,.65,'sine',.2]],
    hazard:[[250,140,0,.14,'triangle',.5],[185,105,.035,.12,'sine',.4]],
    page:[[0,0,0,.14,'swoosh',.65]],
};
// Replace these files with externally produced sounds. Run version-assets.py after replacement.
const SOUND_FILES=Object.freeze({
    move:{src:'assets/audio/move.wav?v=7ce4a0435ed9',volume:1},
    launch:{src:'assets/audio/launch.wav?v=b249caf6daf6',volume:1},
    start:{src:'assets/audio/stage-start.wav?v=a118bc59616d',volume:1},
    clear:{src:'assets/audio/stage-clear.wav?v=fea78574b882',volume:1},
    fail:{src:'assets/audio/stage-fail.wav?v=ebca63cdb2cb',volume:1}
});
// Missing, undecodable, or not-yet-ready files use a short cue immediately, never a late replay.
const SOUND_FILE_FALLBACKS={
    move:[[0,0,0,.055,'noise',.65],[1100,650,0,.025,'triangle',.14]],
    launch:[[523,523,0,.15,'triangle',.35],[659,659,.06,.18,'sine',.3],[784,784,.12,.3,'sine',.3]],
    start:[[392,392,0,.09,'triangle',.35],[523,523,.09,.16,'sine',.5]],
    clear:[[523,523,0,.14,'triangle',.4],[659,659,.11,.14,'triangle',.4],[784,784,.22,.15,'triangle',.4],[1047,1047,.34,.3,'sine',.5]],
    fail:[[330,220,0,.2,'triangle',.35],[220,110,.17,.32,'sine',.5]],
};
const soundFileCache=new Map();
async function prepareSoundFile(name,retry=false) {
    if(typeof globalThis.fetch!=='function')return null;
    let entry=soundFileCache.get(name);
    if(!entry){entry={};soundFileCache.set(name,entry);}
    if(!entry.loading || (retry && entry.failed)) {
        entry.failed=false;
        entry.loading=(async()=>{
            const response=await globalThis.fetch(SOUND_FILES[name].src);
            if(!response.ok)throw new Error('Sound file unavailable');
            entry.bytes=await response.arrayBuffer();
        })().catch(()=>{entry.failed=true;});
    }
    await entry.loading;
    const context=soundContext;
    if(!entry.bytes || !context || typeof context.decodeAudioData!=='function')return null;
    if(entry.context===context && entry.buffer)return entry.buffer;
    if(entry.decodingContext!==context) {
        entry.decodingContext=context;
        entry.decoding=Promise.resolve().then(()=>context.decodeAudioData(entry.bytes.slice(0))).then(buffer=>{
            if(soundContext===context && context.state!=='closed'){entry.buffer=buffer;entry.context=context;}
            return buffer;
        }).catch(()=>null);
    }
    return entry.decoding;
}
function preloadSoundFiles(retry=false) {
    if(!soundEnabled)return;
    for(const name of Object.keys(SOUND_FILES))void prepareSoundFile(name,retry);
}
function connectSoundVoice(source,gain) {
    if(soundVoices.size>=12) {
        const oldest=soundVoices.values().next().value;
        try {oldest.stop();}catch(_){}soundVoices.delete(oldest);
    }
    source.connect(gain);gain.connect(soundEffectsGain);soundVoices.add(source);
    source.onended=()=>{soundVoices.delete(source);source.disconnect();gain.disconnect();};
}
function stopSoundEffects() {
    for(const voice of soundVoices) {try {voice.stop();} catch(_) {}}
    soundVoices.clear();soundLastPlayed.clear();pendingSound=null;
}
function stopSounds() {
    stopSoundEffects();
    if(typeof pauseBackgroundMusic==='function')pauseBackgroundMusic();
}
function flushPendingSound() {
    if(!soundEnabled || soundContext?.state!=='running' || !pendingSound)return;
    const pending=pendingSound;pendingSound=null;
    if(Date.now()-pending.at<250)playSound(pending.name);
}
function unlockSound() {
    if((!soundEnabled && !musicEnabled) || document.hidden)return;
    try {
        if(soundContext?.state==='closed') {soundContext=null;soundMaster=null;soundEffectsGain=null;musicMaster=null;soundPrimed=false;}
        if(!soundContext) {
            const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;
            if(!Audio)return;
            soundContext=new Audio();
            soundMaster=soundContext.createGain();soundMaster.gain.value=.18;
            soundMaster.connect(soundContext.destination);
            soundEffectsGain=soundContext.createGain();soundEffectsGain.gain.value=soundVolume;soundEffectsGain.connect(soundMaster);
            musicMaster=soundContext.createGain();musicMaster.gain.value=musicVolume;musicMaster.connect(soundMaster);
            soundContext.onstatechange=()=>{if(typeof syncBackgroundMusic==='function')syncBackgroundMusic();};
        }
        preloadSoundFiles();
        // A real source is started synchronously inside the gesture. In Safari,
        // pointerdown alone may precede activation, so touchend/click retry this.
        if((!soundPrimed || soundContext.state!=='running') && soundContext.createBufferSource) {
            const source=soundContext.createBufferSource();
            source.buffer=soundContext.createBuffer(1,1,22050);
            source.connect(soundContext.destination);
            source.onended=()=>source.disconnect();source.start(0);soundPrimed=true;
        }
        if(soundContext.state==='suspended' || soundContext.state==='interrupted') {
            const resumed=soundContext.resume();
            resumed?.then(()=>{flushPendingSound();if(typeof syncBackgroundMusic==='function')syncBackgroundMusic();}).catch(()=>{});
        }
        flushPendingSound();
        if(typeof syncBackgroundMusic==='function')syncBackgroundMusic();
    } catch(_) { /* Audio failure must never interrupt a game or a button action. */ }
}
function setSoundEnabled(enabled) {
    // Freeze the migrated music preference before changing the legacy SE flag.
    saveMusicSettings();
    soundEnabled=!!enabled;
    try {globalThis.localStorage?.setItem(SOUND_KEY,String(soundEnabled));} catch(_) {}
    if(soundEnabled){unlockSound();playSound('tap');}else stopSoundEffects();
    syncAudioControls();
}
function playSound(name,delaySeconds=0) {
    if(!soundEnabled || !soundContext || document.hidden)return false;
    if(soundContext.state!=='running') {
        if(SOUND_NOTES[name] || SOUND_FILES[name])pendingSound={name,at:Date.now()};
        return false;
    }
    const notes=SOUND_NOTES[name] || SOUND_FILE_FALLBACKS[name],now=soundContext.currentTime+Math.max(0,Number.isFinite(delaySeconds)?delaySeconds:0);
    if(!notes || now-(soundLastPlayed.get(name)??-Infinity)<.04)return false;
    soundLastPlayed.set(name,now);
    const level=SOUND_LEVELS[name] ?? 1;
    try {
        const file=SOUND_FILES[name],cached=soundFileCache.get(name);
        if(file && cached?.buffer && cached.context===soundContext) {
            const source=soundContext.createBufferSource(),gain=soundContext.createGain();
            source.buffer=cached.buffer;gain.gain.value=file.volume*level;
            connectSoundVoice(source,gain);source.start(now);return true;
        }
        if(file)void prepareSoundFile(name);
        for(const [from,to,delay,duration,type,volume] of notes) {
            const isNoise=type==='noise' || type==='swoosh';
            const oscillator=isNoise?soundContext.createBufferSource():soundContext.createOscillator(),gain=soundContext.createGain(),start=now+delay;
            if(isNoise) {
                // Dry clicks emphasize high frequencies; page swishes use softened noise.
                const buffer=soundContext.createBuffer(1,Math.ceil(soundContext.sampleRate*duration),soundContext.sampleRate);
                const samples=buffer.getChannelData(0);let previous=0,soft=0;
                for(let i=0;i<samples.length;i++) {
                    const sample=Math.random()*2-1;
                    soft+=.35*(sample-soft);
                    samples[i]=type==='swoosh'?soft*1.8:(sample-previous)*.5;
                    previous=sample;
                }
                oscillator.buffer=buffer;
            } else {
                oscillator.type=type;
                oscillator.frequency.setValueAtTime(from,start);
                oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);
            }
            gain.gain.setValueAtTime(.0001*level,start);
            gain.gain.exponentialRampToValueAtTime(volume*level,start+(type==='swoosh'?.035:type==='noise'?.002:.006));
            gain.gain.exponentialRampToValueAtTime(.0001*level,start+duration);
            connectSoundVoice(oscillator,gain);
            oscillator.start(start);oscillator.stop(start+duration+.01);
        }
        return true;
    } catch(_) {return false;}
}
function saveMusicSettings() {
    try {globalThis.localStorage?.setItem(MUSIC_KEY,JSON.stringify({enabled:musicEnabled,volume:musicVolume}));}catch(_){}
}
function setMusicEnabled(enabled) {
    musicEnabled=!!enabled;saveMusicSettings();
    if(musicEnabled)unlockSound();else if(typeof pauseBackgroundMusic==='function')pauseBackgroundMusic();
    syncAudioControls();
}
function setSoundVolume(value) {
    if(!validAudioVolume(value))return;
    soundVolume=value;
    try {globalThis.localStorage?.setItem(SOUND_VOLUME_KEY,JSON.stringify(value));}catch(_){}
    if(soundEffectsGain)soundEffectsGain.gain.value=value;
    syncAudioControls();
}
function setMusicVolume(value) {
    if(!validAudioVolume(value))return;
    musicVolume=value;saveMusicSettings();
    if(musicMaster)musicMaster.gain.value=value;
    syncAudioControls();
}
function syncAudioControls() {
    for(const [id,value] of [['soundEnabled',soundEnabled],['musicEnabled',musicEnabled],['soundVolume',soundVolume],['musicVolume',musicVolume]]) {
        const control=document.getElementById(id);if(!control)continue;
        if(id.endsWith('Enabled'))control.checked=value;else control.value=String(Math.round(value*100));
    }
}
for(const [id,setter] of [['soundEnabled',setSoundEnabled],['musicEnabled',setMusicEnabled]]) {
    const control=document.getElementById(id);if(control)control.onchange=()=>setter(control.checked);
}
for(const [id,setter] of [['soundVolume',setSoundVolume],['musicVolume',setMusicVolume]]) {
    const control=document.getElementById(id);if(control)control.oninput=()=>setter(Number(control.value)/100);
}
syncAudioControls();
for(const event of ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup'])
    document.addEventListener?.(event,unlockSound,{capture:true,passive:true});
document.addEventListener?.('keydown',unlockSound,{capture:true});
document.addEventListener?.('click',e=>{
    unlockSound();
    const button=e.target.closest?.('button');
    if(!button || button.disabled || button.closest('#dummyAd') || ['dailyPrev','dailyNext','editorConfirm','stageStartButton','dailyStartButton'].includes(button.id))return;
    playSound('tap');
},{capture:true});
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)stopSounds();});
window.addEventListener('pagehide',stopSounds);
window.addEventListener('blur',stopSounds);

preloadSoundFiles();
window.addEventListener('online',()=>preloadSoundFiles(true));
