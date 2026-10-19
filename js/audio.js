"use strict";
// Small synthesized effects: no downloads, music, or timing dependencies in gameplay.
const SOUND_KEY='ascent.sound-enabled.v1';
let soundEnabled=true;
try {soundEnabled=globalThis.localStorage?.getItem(SOUND_KEY)!=='false';} catch(_) {}
let soundContext=null,soundMaster=null,soundPrimed=false,pendingSound=null;
const soundVoices=new Set(),soundLastPlayed=new Map();
const SOUND_NOTES={
    tap:[[720,480,0,.045,'sine',.45]],
    move:[[0,0,0,.055,'noise',.65],[1100,650,0,.025,'triangle',.14]],
    blocked:[[150,90,0,.09,'sine',.45]],
    pickup:[[660,660,0,.11,'sine',.5],[990,990,.065,.16,'sine',.45]],
    hazard:[[250,140,0,.14,'triangle',.5],[185,105,.035,.12,'sine',.4]],
    undo:[[700,420,0,.10,'sine',.45],[420,280,.07,.12,'sine',.4]],
    start:[[392,392,0,.09,'triangle',.35],[523,523,.09,.16,'sine',.5]],
    clear:[[523,523,0,.14,'triangle',.4],[659,659,.11,.14,'triangle',.4],[784,784,.22,.15,'triangle',.4],[1047,1047,.34,.3,'sine',.5]],
    fail:[[330,220,0,.2,'triangle',.35],[220,110,.17,.32,'sine',.5]],
    life:[[523,523,0,.12,'sine',.5],[784,784,.08,.22,'sine',.45]],
    step:[[260,180,0,.06,'sine',.5],[340,230,.075,.06,'sine',.35]],
    page:[[420,620,0,.07,'sine',.25]],
    confirm:[[523,523,0,.08,'sine',.4],[784,784,.06,.15,'sine',.4]],
};
function stopSounds() {
    for(const voice of soundVoices) {try {voice.stop();} catch(_) {}}
    soundVoices.clear();soundLastPlayed.clear();pendingSound=null;
}
function flushPendingSound() {
    if(!soundEnabled || soundContext?.state!=='running' || !pendingSound)return;
    const pending=pendingSound;pendingSound=null;
    if(Date.now()-pending.at<250)playSound(pending.name);
}
function unlockSound() {
    if(!soundEnabled || document.hidden)return;
    try {
        if(soundContext?.state==='closed') {soundContext=null;soundMaster=null;soundPrimed=false;}
        if(!soundContext) {
            const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;
            if(!Audio)return;
            soundContext=new Audio();
            soundMaster=soundContext.createGain();soundMaster.gain.value=.18;
            soundMaster.connect(soundContext.destination);
        }
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
            resumed?.then(flushPendingSound).catch(()=>{});
        }
        flushPendingSound();
    } catch(_) { /* Audio failure must never interrupt a game or a button action. */ }
}
function setSoundEnabled(enabled) {
    soundEnabled=!!enabled;
    try {globalThis.localStorage?.setItem(SOUND_KEY,String(soundEnabled));} catch(_) {}
    if(soundEnabled){unlockSound();playSound('tap');}else stopSounds();
}
function playSound(name) {
    if(!soundEnabled || !soundContext || document.hidden)return false;
    if(soundContext.state!=='running') {
        if(SOUND_NOTES[name])pendingSound={name,at:Date.now()};
        return false;
    }
    const notes=SOUND_NOTES[name],now=soundContext.currentTime;
    if(!notes || now-(soundLastPlayed.get(name)??-Infinity)<.04)return false;
    soundLastPlayed.set(name,now);
    try {
        for(const [from,to,delay,duration,type,volume] of notes) {
            if(soundVoices.size>=12) {const oldest=soundVoices.values().next().value;oldest.stop();soundVoices.delete(oldest);}
            const oscillator=type==='noise'?soundContext.createBufferSource():soundContext.createOscillator(),gain=soundContext.createGain(),start=now+delay;
            if(type==='noise') {
                // A bright, dry contact sound: remove low-end weight from white noise.
                const buffer=soundContext.createBuffer(1,Math.ceil(soundContext.sampleRate*duration),soundContext.sampleRate);
                const samples=buffer.getChannelData(0);let previous=0;
                for(let i=0;i<samples.length;i++) {const sample=Math.random()*2-1;samples[i]=(sample-previous)*.5;previous=sample;}
                oscillator.buffer=buffer;
            } else {
                oscillator.type=type;
                oscillator.frequency.setValueAtTime(from,start);
                oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);
            }
            gain.gain.setValueAtTime(.0001,start);
            gain.gain.exponentialRampToValueAtTime(volume,start+(type==='noise'?.002:.006));
            gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
            oscillator.connect(gain);gain.connect(soundMaster);
            soundVoices.add(oscillator);
            oscillator.onended=()=>{soundVoices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
            oscillator.start(start);oscillator.stop(start+duration+.01);
        }
        return true;
    } catch(_) {return false;}
}
const soundControl=document.getElementById('soundEnabled');
if(soundControl){soundControl.checked=soundEnabled;soundControl.onchange=()=>setSoundEnabled(soundControl.checked);}
for(const event of ['pointerdown','pointerup','touchstart','touchend','mousedown','mouseup'])
    document.addEventListener?.(event,unlockSound,{capture:true,passive:true});
document.addEventListener?.('keydown',unlockSound,{capture:true});
document.addEventListener?.('click',e=>{
    unlockSound();
    const button=e.target.closest?.('button');
    if(!button || button.disabled || button.closest('#dummyAd') || ['dailyPrev','dailyNext','editorConfirm'].includes(button.id))return;
    playSound('tap');
},{capture:true});
document.addEventListener?.('visibilitychange',()=>{if(document.hidden)stopSounds();});
window.addEventListener('pagehide',stopSounds);
window.addEventListener('blur',stopSounds);
