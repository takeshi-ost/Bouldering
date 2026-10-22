const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),audio=fs.readFileSync(path.join(root,'js/audio.js'),'utf8');
const data={},control={},events={},voices=[];let contexts=0;
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
class Audio {
 constructor(){contexts++;this.state='suspended';this.currentTime=0;this.destination={};this.sampleRate=44100;}
 resume(){this.state='running';return Promise.resolve();}
 createBuffer(channels,length){return {length,getChannelData:()=>new Float32Array(length)};}
 createBufferSource(){const voice={connect(){},disconnect(){},start(){this.started=true;if(this.buffer?.length===1)this.stopped=true;},stop(){this.stopped=true;}};voices.push(voice);return voice;}
 createGain(){return {gain:param(),connect(){},disconnect(){}};}
 createOscillator(){const voice={frequency:param(),connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(voice);return voice;}
}
const env={assert,AudioContext:Audio,localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v},document:{getElementById:()=>control,addEventListener:(k,fn)=>events[k]=fn},window:{addEventListener:(k,fn)=>events[k]=fn}};
const c=vm.createContext(env);vm.runInContext(audio,c);
assert.equal(contexts,0,'No sound context or autoplay before a user gesture');assert(control.checked);
vm.runInContext("assert.equal(playSound('clear'),false)",c);events.pointerdown();assert.equal(contexts,1);
vm.runInContext("assert(playSound('move'));assert.equal(playSound('move'),false);soundContext.currentTime+=.1;assert(playSound('pickup'));",c);
assert(voices.every(v=>v.started));const count=voices.length;
control.checked=false;control.onchange();assert.equal(data['ascent.sound-enabled.v1'],'false');assert(voices.every(v=>v.stopped));
vm.runInContext("assert.equal(playSound('clear'),false)",c);assert.equal(voices.length,count);
control.checked=true;control.onchange();assert.equal(contexts,1);assert.equal(data['ascent.sound-enabled.v1'],'true');assert(voices.length>count);
events.visibilitychange();events.blur();assert(voices.every(v=>v.stopped));
// The setting survives reload; missing/blocked Web Audio and storage are harmless.
data['ascent.sound-enabled.v1']='false';const second=vm.createContext({...env});vm.runInContext(audio,second);assert.equal(control.checked,false);
const unsupported=vm.createContext({assert,document:env.document,window:env.window,localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
vm.runInContext(audio+";assert.doesNotThrow(unlockSound);assert.doesNotThrow(()=>setSoundEnabled(false));assert.equal(playSound('tap'),false);",unsupported);
// Safari-like activation: pointerdown cannot resume, but touchend can. A real
// buffer must be started in that gesture, and interrupted contexts can recover.
let activated=false,primers=0,safariEvents={};
class SafariAudio extends Audio {
 createBuffer(){return {};}
 createBufferSource(){return {connect(){},disconnect(){},start(){primers++;}};}
 resume(){if(activated)this.state='running';return Promise.resolve();}
}
const safari=vm.createContext({assert,AudioContext:SafariAudio,document:{getElementById:()=>({}),addEventListener:(k,fn)=>safariEvents[k]=fn},window:{addEventListener(){}}});
vm.runInContext(audio,safari);safariEvents.pointerdown();
vm.runInContext("assert.equal(soundContext.state,'suspended');assert.equal(playSound('tap'),false);assert(pendingSound);",safari);
activated=true;safariEvents.touchend();assert(primers>=2);
vm.runInContext("assert.equal(soundContext.state,'running');assert.equal(pendingSound,null);assert(soundVoices.size>0);soundContext.state='interrupted';",safari);
safariEvents.touchend();vm.runInContext("assert.equal(soundContext.state,'running');setSoundEnabled(false);soundContext.state='interrupted';",safari);
safariEvents.touchend();vm.runInContext("assert.equal(soundContext.state,'interrupted');assert.equal(pendingSound,null);",safari);
// Exercise the actual game hooks, without a sound device or changing game rules.
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
new Function('assert',`
const elements={};const document={getElementById(id){return elements[id] ||= {style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};
const window={addEventListener(){}};function requestAnimationFrame(){}
`+source+`
const sounds=[];playSound=name=>{sounds.push(name);};
reset(1);advanceCameraIntro(0);advanceCameraIntro(2000);assert(sounds.includes('start'));
sounds.length=0;const beforeMove=route.length;
for(let i=1;i<route.length;i++){camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});down(e(body));move(e(route[i]));release();}
assert.equal(state,'won');assert.equal(sounds.filter(s=>s==='clear').length,1);assert.equal(sounds.filter(s=>s==='move').length,beforeMove-2);
finish(true);assert.equal(sounds.filter(s=>s==='clear').length,1);
reset(1);cameraIntro=null;camera=clamp(body.y-H*.6,0,HEIGHT-H);const pointFor=p=>({clientX:p.x,clientY:p.y-camera});down(pointFor(body));move(pointFor(route[1]));release();assert(undoMove());assert.equal(sounds.filter(s=>s==='undo').length,1);hearts=[{x:body.x,y:body.y,collected:false}];collectHearts(body,body);collectHearts(body,body);assert.equal(sounds.filter(s=>s==='pickup').length,1);
finish(false);assert.equal(sounds.filter(s=>s==='fail').length,1);
`)(assert);
console.log('PASS audio: gesture unlock/no autoplay, sound toggle persistence, mute stops voices, unsupported APIs/storage, cooldown, actual stage start/move/pickup/clear/fail hooks and no duplicate result cues');
