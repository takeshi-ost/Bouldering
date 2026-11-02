'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot,page,play,settleTransition}=require('./tutorial-modals.cjs');
const event=(target,extra={})=>({target,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra});
function target(dialog,button=null){return {closest:selector=>selector==='button'?button:null,dialog};}
function button(dialog){return {id:'tutorialContinue',disabled:false,closest:selector=>selector==='#tutorialDialog,#featureHelpDialog'?dialog:null};}
function start(b){b.run('titleReady=true;');b.node('titleScreen').onclick();b.run('advanceCameraIntro(0);advanceCameraIntro(100000);');page(b,1);}
function click(b,{buttonTap=false,settle=true}={}){
 const dialog=b.node('tutorialDialog'),e=event(target(dialog,buttonTap?button(dialog):null));
 b.emitDocument('click',e); // Real capture phase precedes the button/dialog handler.
 if(buttonTap){b.node('tutorialContinue').onclick(e);if(!e.stopped)dialog.onclick(e);}else dialog.onclick(e);
 if(settle)settleTransition(b);
}
function trace(b){return JSON.parse(b.run('JSON.stringify(feedbackSounds)'));}
{
 const b=boot();start(b);b.run('var feedbackSounds=[];playSound=name=>feedbackSounds.push(name);');
 click(b,{buttonTap:true,settle:false});assert.deepEqual(trace(b),['move'],'TAP button must not add generic tap or bubble twice');
 click(b,{buttonTap:true,settle:false});click(b,{settle:false});b.node('tutorialDialog').events.keydown(event(null,{key:'Enter',repeat:true}));assert.deepEqual(trace(b),['move']);
 settleTransition(b);page(b,2);click(b);page(b,3);assert.deepEqual(trace(b),['move','move']);
 b.node('tutorialDialog').events.keydown(event(null,{key:'x'}));assert.deepEqual(trace(b),['move','move']);
 b.node('tutorialDialog').events.keydown(event(null,{key:' ',repeat:false}));assert.deepEqual(trace(b),['move','move','move']);assert(!b.run('tutorialInstructionsOpen()'));
 click(b);assert.equal(trace(b).length,3,'dismissed modal is silent');
 const center=b.run('route.findIndex(p=>p.grips?.slice(0,2).includes(tutorialRun.centerHoldId))');for(let i=1;i<=center;i++)play(b,i);
 page(b,4);b.run('feedbackSounds=[];');click(b);assert.deepEqual(trace(b),['move']);
 const length=b.run('route.length');for(let i=center+1;i<length;i++)play(b,i);
 page(b,5);assert.equal(trace(b).filter(name=>name==='clear').length,1);b.run('feedbackSounds=[];');click(b);page(b,6);assert.deepEqual(trace(b),['move']);click(b,{buttonTap:true});assert.deepEqual(trace(b),['move','move'],'Clear cue already played before goal pages; accepted TAPs retain one move cue each');
}
// Image-wait inputs cannot advance or produce sound. Heart/spike share the same
// confirmation cue, including supported keyboard/Escape, with no key-repeat cue.
{
 const b=boot();start(b);b.run('var feedbackSounds=[];playSound=name=>feedbackSounds.push(name);tutorialRun.imageLoading=true;');click(b,{settle:false});assert.deepEqual(trace(b),[]);b.run('showTitleScreen();reset(1);featureHelpSeen={heart:false,hazard:false};hearts=[{}];holds.push({type:"hazard"});showStageHelp();feedbackSounds=[];');
 b.run('featureHelpImageLoading=true;');b.node('featureHelpDialog').onclick();b.node('featureHelpDialog').events.keydown(event(null,{key:'Enter',repeat:false}));assert.deepEqual(trace(b),[]);assert.equal(b.run('pendingFeatureHelp.length'),2);
 b.run('featureHelpImageLoading=false;');b.node('featureHelpDialog').events.keydown(event(null,{key:'Enter',repeat:true}));assert.deepEqual(trace(b),[]);assert.equal(b.run('pendingFeatureHelp.length'),2);
 const e=event(target(b.node('featureHelpDialog')));b.emitDocument('click',e);b.node('featureHelpDialog').onclick(e);assert.deepEqual(trace(b),['move']);assert.equal(b.run('pendingFeatureHelp[0]'),'hazard');
 b.node('featureHelpDialog').events.cancel(event(null));assert.deepEqual(trace(b),['move','move']);b.node('featureHelpDialog').onclick();assert.deepEqual(trace(b),['move','move']);
 const ordinary={id:'closeSettings',disabled:false,closest:()=>null};b.emitDocument('click',event({closest:()=>ordinary}));assert.deepEqual(trace(b),['move','move','tap'],'Other modal buttons retain generic tap');
}
// Use the real audio path with a deterministic Web Audio double: the same move
// file/cache and gain buses are used, mute/zero volume still apply, no new asset.
{
 const voices=[];
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 class Audio {
  constructor(){this.state='running';this.currentTime=1;this.destination={};this.sampleRate=44100;}
  createGain(){return {gain:param(),connect(to){this.output=to;},disconnect(){}};}
  createBuffer(ch,n){return {length:n,getChannelData:()=>new Float32Array(n)};}
  createBufferSource(){const voice={connect(to){this.output=to;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(voice);return voice;}
  createOscillator(){throw Error('Only the existing cached move file should play');}
 }
 const b=boot(new Map(),{audioClass:Audio});start(b);
 b.run("musicEnabled=false;unlockSound();soundFileCache.set('move',{buffer:{approvedMove:true},context:soundContext});setSoundVolume(.25);");
 const count=()=>voices.filter(v=>v.buffer?.approvedMove).length;click(b,{buttonTap:true});assert.equal(count(),1);
 const voice=voices.find(v=>v.buffer?.approvedMove);assert.equal(voice.output.gain.value,b.run('SOUND_FILES.move.volume*SOUND_LEVELS.move'));assert.equal(voice.output.output.gain.value,.25);assert.equal(b.run('SOUND_FILES.move.src').split('?')[0],'assets/audio/move.wav');
 b.run('setSoundEnabled(false);');click(b);assert.equal(count(),1);assert(voice.stopped);
 b.run('soundEnabled=true;soundContext.currentTime+=1;setSoundVolume(0);');click(b);assert.equal(count(),2);assert.equal(voices.at(-1).output.output.gain.value,0);
}
const css=fs.readFileSync('styles.css','utf8');assert(/\.feature-help \.card h1\s*\{[^}]*text-align:center;/.test(css));assert(/\.feature-help \.card\s*\{[^}]*text-align:left;/.test(css));
console.log('PASS explanation feedback: STAGE0 six pages and heart/spike use one existing move-confirmation cue per accepted gesture; capture/bubble dedup, loading/transition/repeat guards, mute/volume routing, centered heading only and unrelated modal sounds retained (no browser/audio audition)');
