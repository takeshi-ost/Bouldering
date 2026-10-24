'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nativeSource=require('../scripts/native-bundle-source.cjs');
const listeners={},voices=[],contexts=[],saved=new Map(),timers=new Map();let allow=true,rejectNext=false,timerId=0;
saved.set('ascent.music-settings.v1',JSON.stringify({enabled:true,volume:.3}));
saved.set('ascent.sound-volume.v1','0.7');
function on(k,fn){(listeners[k] ||= []).push(fn);}
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
class Audio {
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination={};this.listeners=[];contexts.push(this);}
 addEventListener(k,fn){if(k==='statechange')this.listeners.push(fn);}
 change(state){this.state=state;this.onstatechange?.();for(const fn of this.listeners)fn();}
 resume(){if(rejectNext){rejectNext=false;return Promise.reject(Object.assign(Error('Failed to start the audio device'),{name:'InvalidStateError'}));}if(allow)this.change('running');return Promise.resolve();}
 close(){this.change('closed');return Promise.resolve();}
 createGain(){return {gain:param(),connect(){},disconnect(){}};}
 createBuffer(channels,n){return {length:n,getChannelData:()=>new Float32Array(n)};}
 createBufferSource(){const s={frequency:param(),connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(s);return s;}
 createOscillator(){return this.createBufferSource();}
 async decodeAudioData(){return {duration:90};}
}
const document={hidden:false,getElementById:()=>null,addEventListener:on};
const c=vm.createContext({assert,ASCENT_IOS_BUILD:Object.freeze({configuration:'Debug',debugAllowed:true,audioDiagnosticsEnabled:true}),performance:{now:()=>Date.now()},AudioContext:Audio,document,window:{addEventListener:on,setTimeout:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)},
 localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},
 fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
const source=['audio.js','bgm.js'].map(name=>nativeSource(name,fs.readFileSync('js/'+name,'utf8'))).join('\n');
vm.runInContext(source+'\n'+fs.readFileSync('scripts/native-audio-lifecycle.js','utf8'),c);
const run=s=>vm.runInContext(s,c),emit=k=>{for(const fn of listeners[k]||[])fn({target:{}});};
const tick=()=>new Promise(r=>setImmediate(r));
const loops=()=>voices.filter(s=>s.loop && s.started && !s.stopped).length;
function health(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}
(async()=>{
 emit('ascent-native-resume');await tick();assert.equal(contexts.length,0,'No autoplay before user activation');
 emit('touchend');await tick();run('assert(bgmPlayback);');assert.equal(loops(),1);
 const prefs=[...saved];
 for(let i=0;i<5;i++) {
  emit('ascent-native-pause');run("assert.equal(bgmPlayback,null);assert.equal(playSound('tap'),false);");assert.equal(loops(),0);
  contexts.at(-1).change(i%2?'suspended':'interrupted');
  emit('pointerdown');await tick();assert.equal(loops(),0,'Gesture/statechange cannot start audio while native backgrounded');
  emit('ascent-native-resume');await tick();assert.equal(loops(),1);assert.equal(contexts.length,1);
  emit('ascent-native-resume');await tick();assert.equal(loops(),1,'Repeated foreground notifications never duplicate music');
  run("assert.equal(soundVolume,.7);assert.equal(musicVolume,.3);assert.equal(soundEffectsGain.gain.value,.7);assert.equal(musicMaster.gain.value,.3);assert.equal(pendingSound,null);");
 }
 assert.deepEqual([...saved],prefs,'Lifecycle must never overwrite preferences');
 // Foreground interruptions resume without a visibility transition.
 contexts[0].change('interrupted');await tick();assert.equal(loops(),1);
 // Mute persists; lifecycle may not opt the user back in.
 run('setMusicEnabled(false);setSoundEnabled(false);');const muted=[...saved];
 emit('ascent-native-pause');contexts[0].change('suspended');emit('ascent-native-resume');await tick();assert.equal(loops(),0);
 run('assert.equal(musicEnabled,false);assert.equal(soundEnabled,false);');assert.deepEqual([...saved],muted);
 // A blocked resume remains silent until a later user gesture, without late SE.
 run('setMusicEnabled(true);setSoundEnabled(true);');await tick();emit('ascent-native-pause');contexts[0].change('suspended');allow=false;
 emit('ascent-native-resume');await tick();assert.equal(loops(),0);
 run("pendingSound={name:'clear',at:Date.now()};");allow=true;emit('touchend');await tick();assert.equal(loops(),1);run('assert.equal(pendingSound,null);');
 // A closed context is rebuilt only from the existing unlocked/preference state.
 emit('ascent-native-pause');contexts[0].change('closed');emit('ascent-native-resume');await tick();assert.equal(contexts.length,2);assert.equal(loops(),1);
 document.hidden=true;emit('visibilitychange');await tick();assert.equal(loops(),0);
 emit('ascent-native-resume');await tick();assert.equal(loops(),0);
 document.hidden=false;emit('visibilitychange');await tick();assert.equal(loops(),1);
 // Match the physical phone: device-start rejection, then resume resolves with
 // running state but a frozen clock. Exactly one graph replacement recovers it.
 emit('ascent-native-pause');const broken=contexts.at(-1);broken.change('interrupted');rejectNext=true;
 emit('ascent-native-resume');await tick();emit('ascent-native-resume');await tick();
 assert.equal(broken.state,'running');const before=contexts.length;health();await tick();
 assert.equal(contexts.length,before+1);assert.equal(broken.state,'closed');assert.equal(loops(),1);
 run("assert(ASCENT_AUDIO_TRACE_EVENTS.some(e=>e.event==='resume-rejected' && e.detail.name==='InvalidStateError'));assert.equal(ASCENT_AUDIO_GENERATION,1);assert.equal(soundVolume,.7);assert.equal(musicVolume,.3);assert.equal(pendingSound,null);");
 for(let i=0;i<8;i++){emit('ascent-native-resume');await tick();health();}
 assert.equal(contexts.length,before+1,'No endless context/resume recovery loop');
 // A healthy clock and a pending check canceled by backgrounding never rebuild.
 emit('ascent-native-pause');emit('ascent-native-resume');await tick();contexts.at(-1).currentTime+=1;health();await tick();assert.equal(contexts.length,before+1);
 emit('ascent-native-pause');emit('ascent-native-resume');await tick();emit('ascent-native-pause');health();await tick();assert.equal(contexts.length,before+1);assert.equal(loops(),0);
 // Both disabled stays disabled without creating a new audio engine.
 run('setMusicEnabled(false);setSoundEnabled(false);');emit('ascent-native-resume');await tick();health();assert.equal(contexts.length,before+1);assert.equal(loops(),0);
 // A normal Release never collects a diagnostic event, while lifecycle guards
 // remain active. No URL or storage flag is consulted for this policy.
 run("ASCENT_IOS_BUILD=Object.freeze({configuration:'Release',debugAllowed:false,audioDiagnosticsEnabled:false});ASCENT_AUDIO_TRACE_EVENTS.length=0;");
 emit('ascent-native-pause');emit('ascent-native-resume');await tick();
 run('assert.equal(ASCENT_AUDIO_TRACE_EVENTS.length,0);');
 run('setMusicEnabled(true);setSoundEnabled(true);');await tick();
 emit('ascent-native-pause');contexts.at(-1).change('interrupted');emit('ascent-native-resume');await tick();
 const releaseContexts=contexts.length;health();await tick();
 assert.equal(contexts.length,releaseContexts+1);assert.equal(loops(),1);
 run('assert.equal(ASCENT_AUDIO_TRACE_EVENTS.length,0);assert.equal(soundVolume,.7);assert.equal(musicVolume,.3);');
 console.log('PASS native audio: frozen running clock/device-start rejection recovers once; repeated interruption, no background/duplicate sound, preserved mute/volumes, healthy-clock and gesture fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
