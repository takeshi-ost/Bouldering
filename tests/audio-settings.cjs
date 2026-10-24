const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/audio.js','utf8')+'\n'+fs.readFileSync('js/bgm.js','utf8');
function fixture(data={}){
 const controls={},events={},voices=[],contexts=[];
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.target=v;},exponentialRampToValueAtTime(v){this.target=v;}});
 class Audio{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=44100;this.destination={};contexts.push(this);}
  resume(){this.state='running';return Promise.resolve();}
  createGain(){return {gain:param(),connect(to){this.to=to;},disconnect(){}};}
  createBuffer(channels,n){return {length:n,getChannelData:()=>new Float32Array(n)};}
  createBufferSource(){const s={frequency:param(),connect(to){this.to=to;},disconnect(){},start(){},stop(){this.stopped=true;}};voices.push(s);return s;}
  createOscillator(){return this.createBufferSource();}
  async decodeAudioData(){return {duration:100};}
 }
 const c=vm.createContext({assert,AudioContext:Audio,localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v},document:{getElementById:id=>controls[id] ||= {},addEventListener:(k,f)=>events[k]=f},window:{addEventListener(){}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
 vm.runInContext(source,c);return {run:s=>vm.runInContext(s,c),controls,events,data,voices,contexts};
}
(async()=>{
 const h=fixture();h.events.pointerdown();await new Promise(r=>setImmediate(r));
 const music=h.run('bgmPlayback.source');assert(music);
 h.controls.soundVolume.value='35';h.controls.soundVolume.oninput();h.run('assert.equal(soundVolume,.35);assert.equal(soundEffectsGain.gain.value,.35);assert.equal(musicMaster.gain.value,1);');
 h.controls.musicVolume.value='60';h.controls.musicVolume.oninput();h.run('assert.equal(musicVolume,.6);assert.equal(musicMaster.gain.value,.6);assert.equal(soundEffectsGain.gain.value,.35);');assert.equal(h.run('bgmPlayback.source'),music);
 h.controls.soundEnabled.checked=false;h.controls.soundEnabled.onchange();h.run("assert.equal(playSound('move'),false);assert(musicEnabled);");assert.equal(h.run('bgmPlayback.source'),music);assert(!music.stopped);
 const reloaded=fixture(h.data);reloaded.run('assert.equal(soundEnabled,false);assert.equal(musicEnabled,true);assert.equal(soundVolume,.35);assert.equal(musicVolume,.6);');
 h.controls.soundEnabled.checked=true;h.controls.soundEnabled.onchange();h.controls.musicEnabled.checked=false;h.controls.musicEnabled.onchange();assert(music.stopped);h.run("assert(soundEnabled);assert.equal(bgmPlayback,null);soundContext.currentTime=1;assert(playSound('move'));");
 const effect=h.voices.at(-1);h.controls.musicVolume.value='20';h.controls.musicVolume.oninput();assert(!effect.stopped);h.run('assert.equal(soundEffectsGain.gain.value,.35);');
 h.controls.musicEnabled.checked=true;h.controls.musicEnabled.onchange();const resumed=h.run('bgmPlayback.source');assert(resumed && resumed!==music);
 h.controls.musicVolume.value='0';h.controls.musicVolume.oninput();h.run('assert.equal(musicMaster.gain.value,0);');assert.equal(h.run('bgmPlayback.source'),resumed);
 h.controls.soundVolume.value='0';h.controls.soundVolume.oninput();h.run('assert.equal(soundEffectsGain.gain.value,0);assert.equal(musicMaster.gain.value,0);');
 h.run('setSoundVolume(NaN);setMusicVolume(-1);setMusicVolume(Infinity);assert.equal(soundVolume,0);assert.equal(musicVolume,0);');
 const legacy=fixture({'ascent.sound-enabled.v1':'false'});legacy.run('assert(!musicEnabled && !soundEnabled);setSoundEnabled(true);');const migrated=fixture(legacy.data);migrated.run('assert(soundEnabled && !musicEnabled);');
 const invalid=fixture({'ascent.music-settings.v1':'{broken','ascent.sound-volume.v1':'0.4'});invalid.run('assert(musicEnabled);assert.equal(musicVolume,1);assert.equal(soundVolume,.4);');
 const html=fs.readFileSync('index.html','utf8');assert(!html.includes('ui.mapSettingsControls.label.span"'));assert.equal((html.slice(html.indexOf('id="settingsDialog"'),html.indexOf('id="deleteUserDialog"')).match(/type="range"/g)||[]).length,2);
 assert(html.indexOf('id="musicEnabled"')>html.indexOf('id="mapEditCharacter"'));assert(html.indexOf('id="musicEnabled"')<html.indexOf('id="mapSettingsLanguage"'));
 console.log('PASS independent audio: checkbox/slider events, separate live gain buses, music/SE-only modes, zero-volume phase retention, migration/reload, invalid settings and shared modal controls');
})().catch(e=>{console.error(e);process.exitCode=1;});
