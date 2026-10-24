const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/audio.js','utf8')+'\n'+fs.readFileSync('js/bgm.js','utf8');
function fixture({muted=false,offline=false,blocked=false}={}) {
 const listeners={},voices=[],contexts=[],requests=[];let release,allowResume=!blocked;
 const ready=new Promise(r=>release=r),param=()=>({value:0,sets:[],ramps:[],setValueAtTime(v,t){this.sets.push([v,t]);},linearRampToValueAtTime(v,t){this.ramps.push([v,t]);},exponentialRampToValueAtTime(){}});
 class Audio {
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination={};contexts.push(this);}
  resume(){if(allowResume){this.state='running';this.onstatechange?.();}return Promise.resolve();}
  createGain(){return {gain:param(),connect(){},disconnect(){}};}
  createBuffer(channels,n){return {length:n,getChannelData:()=>new Float32Array(n)};}
  createBufferSource(){const s={frequency:param(),connect(){},disconnect(){},start(at,offset){this.at=at;this.offset=offset;},stop(){this.stopped=true;}};voices.push(s);return s;}
  createOscillator(){return this.createBufferSource();}
  async decodeAudioData(bytes){this.decodes=(this.decodes||0)+1;return {duration:new Uint8Array(bytes)[0]+2};}
 }
 function on(k,fn){(listeners[k] ||= []).push(fn);}
 const document={hidden:false,getElementById:()=>null,addEventListener:on};
 const c=vm.createContext({assert,AudioContext:Audio,document,window:{addEventListener:on},localStorage:{getItem:()=>muted?'false':null,setItem(){}},
  fetch:async url=>{requests.push(url);if(!url.includes('bgm-'))return {ok:false};await ready;return {ok:!offline,arrayBuffer:async()=>new Uint8Array([url.includes('stage')?84:64]).buffer};}});
 vm.runInContext(source,c);
 const run=s=>vm.runInContext(s,c),emit=k=>{for(const fn of listeners[k]||[])fn();};
 return {run,emit,release,voices,contexts,requests,document,allow:()=>allowResume=true,online:()=>offline=false};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const h=fixture();assert.equal(h.contexts.length,0);assert.equal(h.requests.filter(s=>s.includes('bgm-loop')).length,1);
 h.release();await tick();assert.equal(h.voices.length,0,'No music/context before a gesture');
 h.emit('pointerdown');await tick();h.run('assert(bgmPlayback);assert.equal(bgmPlayback.source.loop,true);assert.equal(bgmPlayback.source.loopStart,1);assert.equal(bgmPlayback.source.loopEnd,65);');
 const first=h.run('bgmPlayback.source');
 for(let i=0;i<20;i++){h.emit('pointerup');h.run("soundContext.currentTime+=.1;playSound('tap');");}
 assert.equal(h.run('bgmPlayback.source'),first,'Gestures and SE voice eviction never restart music');assert(!first.stopped);
 h.run('soundContext.currentTime=70;');h.document.hidden=true;h.emit('visibilitychange');assert(first.stopped);h.run('assert.equal(bgmOffset,6);assert.equal(bgmPlayback,null);');
 h.document.hidden=false;h.emit('visibilitychange');await tick();h.run('assert.equal(bgmPlayback.offset,6);');
 h.run('soundContext.currentTime=75;setMusicEnabled(false);assert.equal(bgmOffset,11);assert.equal(bgmPlayback,null);');
 h.run('setMusicEnabled(true);assert.equal(bgmPlayback.offset,11);');
 h.run('soundContext.currentTime=80;');h.emit('blur');h.run('assert.equal(bgmPlayback,null);');h.emit('focus');await tick();h.run('assert.equal(bgmPlayback.offset,16);');
 h.emit('pagehide');h.emit('pageshow');await tick();h.run('assert.equal(bgmPlayback.offset,16);');
 h.run('soundContext.state="closed";unlockSound();');await tick();h.run('assert(bgmPlayback);assert.equal(bgmPlayback.offset,16);');
 assert.equal(h.contexts.length,2);assert(h.contexts.every(c=>c.decodes===1));assert.equal(h.requests.filter(s=>s.includes('bgm-loop')).length,1);
 // A download completing after mute/blur must remain silent until explicitly resumed.
 const delayed=fixture();delayed.emit('pointerdown');delayed.run('setMusicEnabled(false)');delayed.emit('blur');delayed.release();await tick();delayed.run('assert.equal(bgmPlayback,null);');
 delayed.emit('focus');delayed.run('assert.equal(bgmPlayback,null);setMusicEnabled(true);');await tick();delayed.run('assert(bgmPlayback);');
 const muted=fixture({muted:true});muted.release();muted.emit('pointerdown');await tick();assert.equal(muted.contexts.length,0);assert.equal(muted.requests.length,0);
 const safari=fixture({blocked:true});safari.release();safari.emit('pointerdown');await tick();safari.run('assert.equal(bgmPlayback,null)');safari.allow();safari.emit('touchend');await tick();safari.run('assert(bgmPlayback);');
 const offline=fixture({offline:true});offline.release();offline.emit('pointerdown');await tick();offline.run('assert.equal(bgmPlayback,null)');offline.online();offline.emit('online');await tick();offline.run('assert(bgmPlayback);');

 // Stage restarts begin at zero with a true five-second linear fade; pause retains fade progress.
 h.run("let state='playing';startStageBackgroundMusic();");await tick();
 h.run("assert.equal(bgmPlayback.track,'stage');assert.equal(bgmPlayback.offset,0);assert.equal(bgmPlayback.source.loopEnd,1+3704399/44100);assert.equal(JSON.stringify(bgmPlayback.gain.gain.sets),JSON.stringify([[0,0]]));assert.equal(JSON.stringify(bgmPlayback.gain.gain.ramps),JSON.stringify([[.42,5]]));");
 h.run('soundContext.currentTime=2;');h.emit('blur');h.emit('focus');await tick();
 h.run('assert.equal(bgmPlayback.offset,2);assert.equal(bgmPlayback.gain.gain.sets[0][0],.42*2/5);assert.equal(JSON.stringify(bgmPlayback.gain.gain.ramps),JSON.stringify([[.42,5]]));');
 const stageVoice=h.run('bgmPlayback.source');
 h.run("state='won';queueBackgroundMusicScene();");await tick();assert.equal(h.run('bgmPlayback.source'),stageVoice);
 h.run("state='lost';queueBackgroundMusicScene();");await tick();assert.equal(h.run('bgmPlayback.source'),stageVoice);
 h.run('startStageBackgroundMusic();assert.equal(bgmPlayback.offset,0);assert.equal(JSON.stringify(bgmPlayback.gain.gain.ramps),JSON.stringify([[.42,7]]));');
 h.run("state='map';queueBackgroundMusicScene();");await tick();h.run("assert.equal(bgmPlayback.track,'main');assert.equal(bgmPlayback.offset,0);");
 // Ads suppress all music, including delayed unlock/focus/decode callbacks, until the cover is gone.
 h.run("state='ad';stopBackgroundMusicForAd();assert.equal(bgmPlayback,null);unlockSound();");h.emit('focus');await tick();h.run('assert.equal(bgmPlayback,null);');
 h.run("state='playing';startStageBackgroundMusic();queueBackgroundMusicScene();");await tick();h.run('assert.equal(bgmPlayback,null);');
 h.run('resumeBackgroundMusicAfterAd();assert.equal(bgmPlayback,null);');await tick();
 h.run("assert.equal(bgmPlayback.track,'stage');assert.equal(bgmPlayback.offset,0);assert.equal(JSON.stringify(bgmPlayback.gain.gain.sets),JSON.stringify([[0,2]]));assert.equal(JSON.stringify(bgmPlayback.gain.gain.ramps),JSON.stringify([[.42,3]]));");
 h.run("state='ad';stopBackgroundMusicForAd();state='won';resumeBackgroundMusicAfterAd();state='reward';queueBackgroundMusicScene();");await tick();
 h.run("assert.equal(bgmPlayback.track,'main');assert.equal(bgmPlayback.offset,0);assert.equal(JSON.stringify(bgmPlayback.gain.gain.ramps),JSON.stringify([[.42,3]]));");
 h.run("state='ad';stopBackgroundMusicForAd();setMusicEnabled(false);state='map';resumeBackgroundMusicAfterAd();");await tick();h.run('assert.equal(bgmPlayback,null);setMusicEnabled(true);assert.equal(bgmPlayback.offset,0);assert.equal(JSON.stringify(bgmPlayback.gain.gain.ramps),JSON.stringify([[.42,3]]));');
 // A stage download finishing during an ad stays silent, then starts the correct scene at zero.
 const late=fixture();late.emit('pointerdown');late.run("let state='playing';startStageBackgroundMusic();state='ad';stopBackgroundMusicForAd();");late.release();await tick();late.run('assert.equal(bgmPlayback,null);');
 late.run("state='daily';resumeBackgroundMusicAfterAd();");await tick();late.run("assert.equal(bgmPlayback.track,'main');assert.equal(bgmPlayback.offset,0);assert.equal(bgmFadeSeconds,1);");
 // Both compact assets have an MP3 header and stay inside the combined size budget.
 const music=['assets/audio/bgm-loop.mp3','assets/audio/bgm-stage-loop.mp3'].map(p=>fs.readFileSync(p));
 for(const bytes of music)assert(bytes.toString('ascii',0,3)==='ID3' || (bytes[0]===255 && (bytes[1]&224)===224));
 assert(music.reduce((n,b)=>n+b.length,0)<3100000);
 h.run("assert.equal(bgmPlayback.source.offset,1);assert.equal(BACKGROUND_MUSIC.main.loopSeconds,64);assert.equal(BACKGROUND_MUSIC.stage.loopSeconds,3704399/44100);");
 console.log('PASS BGM: compressed stereo assets with guarded 64s/84s loop ranges, no autoplay, one continuous loop independent of SE/gestures, async readiness, mute, hidden/blur/BFCache phase resume, closed context cache, Safari activation offline retry, stage selection/retry/5s fade, paused envelope, ad silence/zero-offset 1s restart and async scene races');
})().catch(e=>{console.error(e);process.exitCode=1;});
