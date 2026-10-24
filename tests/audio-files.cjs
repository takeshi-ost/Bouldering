const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/audio.js','utf8');
const events={},sources=[],requests=[],decoded=[];let release;
const ready=new Promise(resolve=>release=resolve);
class Audio {
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.sampleRate=44100;}
 resume(){this.state='running';return Promise.resolve();}
 createBuffer(channels,length){return {length,getChannelData:()=>new Float32Array(length)};}
 createBufferSource(){const s={kind:'buffer',connect(to){this.output=to;},disconnect(){},start(at){this.started=at;},stop(){this.stopped=true;}};sources.push(s);return s;}
 createOscillator(){const s={kind:'oscillator',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(at){this.started=at;},stop(){this.stopped=true;}};sources.push(s);return s;}
 createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 async decodeAudioData(bytes){
  const b=Buffer.from(bytes);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
  assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);
  let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert(peak>1000 && peak<32767,'Audible, unclipped dummy');
  decoded.push(bytes);return {duration:(b.length-44)/88200,decoded:true};
 }
}
const env={assert,AudioContext:Audio,document:{getElementById:()=>({}),addEventListener:(type,fn)=>events[type]=fn},window:{addEventListener:(type,fn)=>events[type]=fn},
 async fetch(url){requests.push(url);await ready;const bytes=fs.readFileSync(url.split('?')[0]);return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}};
const context=vm.createContext(env);vm.runInContext(source,context);
(async()=>{
 assert.equal(sources.length,0);assert.equal(requests.length,5);
 events.pointerdown();vm.runInContext("assert(playSound('start'));",context);
 assert(sources.some(s=>s.kind==='oscillator'),'Immediate fallback while downloading');
 vm.runInContext('setSoundEnabled(false)',context);const count=sources.length;release();
 await vm.runInContext("Promise.all(Object.keys(SOUND_FILES).map(name=>prepareSoundFile(name)))",context);
 assert.equal(decoded.length,5);assert.equal(sources.length,count,'A completed download must not replay a stale event');
 vm.runInContext("setSoundEnabled(true);soundContext.currentTime=1;assert(playSound('start'));soundContext.currentTime=2;assert(playSound('clear'));soundContext.currentTime=3;assert(playSound('fail'));soundContext.currentTime=4;assert(playSound('move'));soundContext.currentTime=5;assert(playSound('launch'));",context);
 const files=sources.filter(s=>s.buffer?.decoded);assert.equal(files.length,5);assert(files.every(s=>s.kind==='buffer' && s.buffer.duration>0));assert.equal(files[4].output.gain.value,1,'Launch reference volume is unchanged');assert(files[3].output.gain.value>files[4].output.gain.value,'Move receives its own gain boost before the user volume bus');
 await vm.runInContext("Promise.all(Object.keys(SOUND_FILES).map(name=>prepareSoundFile(name)))",context);
 assert.equal(requests.length,5);assert.equal(decoded.length,5,'One decode per file/context');
 events.blur();assert(files.every(s=>s.stopped));
 vm.runInContext('soundContext.state="closed";unlockSound();',context);
 await vm.runInContext("Promise.all(Object.keys(SOUND_FILES).map(name=>prepareSoundFile(name)))",context);
 assert.equal(requests.length,5);assert.equal(decoded.length,10,'Recreated context uses cached bytes');
 // Offline and invalid files remain non-blocking; retry downloads on connection recovery.
 const failedEvents={};let attempts=0;
 const offline=vm.createContext({assert,AudioContext:Audio,document:{getElementById:()=>({}),addEventListener:(t,fn)=>failedEvents[t]=fn},window:{addEventListener:(t,fn)=>failedEvents[t]=fn},fetch:async()=>{attempts++;return {ok:false};}});
 vm.runInContext(source,offline);await vm.runInContext('Promise.all([...soundFileCache.values()].map(e=>e.loading))',offline);
 failedEvents.pointerdown();vm.runInContext("assert(playSound('clear'));setSoundEnabled(false);assert(!playSound('fail'));",offline);assert.equal(attempts,5);
 vm.runInContext('setSoundEnabled(true)',offline);failedEvents.online();await vm.runInContext('Promise.all([...soundFileCache.values()].map(e=>e.loading))',offline);assert.equal(attempts,10);
 const corrupt=vm.createContext({...env,AudioContext:class extends Audio {async decodeAudioData(){throw Error('bad file');}}});
 vm.runInContext(source,corrupt);vm.runInContext('unlockSound()',corrupt);await vm.runInContext('Promise.all(Object.keys(SOUND_FILES).map(name=>prepareSoundFile(name)))',corrupt);vm.runInContext("assert(playSound('fail'));",corrupt);
 console.log('PASS file audio: actual PCM WAV headers/levels, deferred context, file-buffer playback, caching/recreated context, mute/blur, no late replay, offline retry and decode-error fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
