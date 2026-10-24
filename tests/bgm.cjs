const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/audio.js','utf8')+'\n'+fs.readFileSync('js/bgm.js','utf8');
function fixture({muted=false,offline=false,blocked=false}={}) {
 const listeners={},voices=[],contexts=[],requests=[];let release,allowResume=!blocked;
 const ready=new Promise(r=>release=r),param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Audio {
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination={};contexts.push(this);}
  resume(){if(allowResume){this.state='running';this.onstatechange?.();}return Promise.resolve();}
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createBuffer(channels,n){return {length:n,getChannelData:()=>new Float32Array(n)};}
  createBufferSource(){const s={frequency:param(),connect(){},disconnect(){},start(at,offset){this.at=at;this.offset=offset;},stop(){this.stopped=true;}};voices.push(s);return s;}
  createOscillator(){return this.createBufferSource();}
  async decodeAudioData(){this.decodes=(this.decodes||0)+1;return {duration:64};}
 }
 function on(k,fn){(listeners[k] ||= []).push(fn);}
 const document={hidden:false,getElementById:()=>null,addEventListener:on};
 const c=vm.createContext({assert,AudioContext:Audio,document,window:{addEventListener:on},localStorage:{getItem:()=>muted?'false':null,setItem(){}},
  fetch:async url=>{requests.push(url);if(!url.includes('bgm-loop'))return {ok:false};await ready;return {ok:!offline,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 vm.runInContext(source,c);
 const run=s=>vm.runInContext(s,c),emit=k=>{for(const fn of listeners[k]||[])fn();};
 return {run,emit,release,voices,contexts,requests,document,allow:()=>allowResume=true,online:()=>offline=false};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const h=fixture();assert.equal(h.contexts.length,0);assert.equal(h.requests.filter(s=>s.includes('bgm-loop')).length,1);
 h.release();await tick();assert.equal(h.voices.length,0,'No music/context before a gesture');
 h.emit('pointerdown');await tick();h.run('assert(bgmPlayback);assert.equal(bgmPlayback.source.loop,true);assert.equal(bgmPlayback.source.loopStart,0);assert.equal(bgmPlayback.source.loopEnd,64);');
 const first=h.run('bgmPlayback.source');
 for(let i=0;i<20;i++){h.emit('pointerup');h.run("soundContext.currentTime+=.1;playSound('tap');");}
 assert.equal(h.run('bgmPlayback.source'),first,'Gestures and SE voice eviction never restart music');assert(!first.stopped);
 h.run('soundContext.currentTime=70;');h.document.hidden=true;h.emit('visibilitychange');assert(first.stopped);h.run('assert.equal(bgmOffset,6);assert.equal(bgmPlayback,null);');
 h.document.hidden=false;h.emit('visibilitychange');await tick();h.run('assert.equal(bgmPlayback.offset,6);');
 h.run('soundContext.currentTime=75;setSoundEnabled(false);assert.equal(bgmOffset,11);assert.equal(bgmPlayback,null);');
 h.run('setSoundEnabled(true);assert.equal(bgmPlayback.offset,11);');
 h.run('soundContext.currentTime=80;');h.emit('blur');h.run('assert.equal(bgmPlayback,null);');h.emit('focus');await tick();h.run('assert.equal(bgmPlayback.offset,16);');
 h.emit('pagehide');h.emit('pageshow');await tick();h.run('assert.equal(bgmPlayback.offset,16);');
 h.run('soundContext.state="closed";unlockSound();');await tick();h.run('assert(bgmPlayback);assert.equal(bgmPlayback.offset,16);');
 assert.equal(h.contexts.length,2);assert(h.contexts.every(c=>c.decodes===1));assert.equal(h.requests.filter(s=>s.includes('bgm-loop')).length,1);
 // A download completing after mute/blur must remain silent until explicitly resumed.
 const delayed=fixture();delayed.emit('pointerdown');delayed.run('setSoundEnabled(false)');delayed.emit('blur');delayed.release();await tick();delayed.run('assert.equal(bgmPlayback,null);');
 delayed.emit('focus');delayed.run('assert.equal(bgmPlayback,null);setSoundEnabled(true);');await tick();delayed.run('assert(bgmPlayback);');
 const muted=fixture({muted:true});muted.release();muted.emit('pointerdown');await tick();assert.equal(muted.contexts.length,0);assert.equal(muted.requests.length,0);
 const safari=fixture({blocked:true});safari.release();safari.emit('pointerdown');await tick();safari.run('assert.equal(bgmPlayback,null)');safari.allow();safari.emit('touchend');await tick();safari.run('assert(bgmPlayback);');
 const offline=fixture({offline:true});offline.release();offline.emit('pointerdown');await tick();offline.run('assert.equal(bgmPlayback,null)');offline.online();offline.emit('online');await tick();offline.run('assert(bgmPlayback);');
 const wav=fs.readFileSync('assets/audio/bgm-loop.wav');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(20),1);assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(34),16);assert.equal((wav.length-44)/(44100*4),64);
 console.log('PASS BGM: 64s stereo WAV, no autoplay, one continuous loop independent of SE/gestures, async readiness, mute, hidden/blur/BFCache phase resume, closed context cache, Safari activation and offline retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
