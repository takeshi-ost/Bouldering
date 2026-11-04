'use strict';
// Exercise asset completion through the real paused-stage render scheduler.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const nativeTest=process.env.ASCENT_NATIVE_TEST==='1',nativeSource=require('../scripts/native-bundle-source.cjs');
const readyBeforeStage=process.env.ASCENT_HAZARD_READY==='1';
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
 .filter(m=>m[1]!=='js/main.js').map(m=>{const text=fs.readFileSync(path.join(root,m[1]),'utf8');return nativeTest?nativeSource(path.basename(m[1]),text):text;}).join('\n');
let clock=0,sequence=0,stagePaints=0;
const frames=new Map(),timers=new Map(),calls=[],images=[],data=new Map();
const paint=()=>new Proxy({drawImage(image,...args){calls.push({image,args});},
 fillRect(x,y,w,h){if(x===0&&y===0&&w===400&&h===700)stagePaints++;},
 getImageData(){return {data:new Uint8ClampedArray([100,100,100,255])};},
 createLinearGradient(){return {addColorStop(){}};}
},{get(o,k){return o[k]||function(){};}});
function element(){return {style:{},hidden:true,open:false,width:128,height:128,
 classList:{toggle(){},add(){},remove(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},
 showModal(){this.open=true;},close(){this.open=false;},getContext:paint,
 querySelector(){return this.icon??=element();},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}
const elements={},document={hidden:false,createElement:element,addEventListener(){},
 getElementById(id){return elements[id]??=element();}};
class Image {
 constructor(){this.complete=false;this.naturalWidth=this.naturalHeight=0;this.listeners={};this.decodeCalls=0;images.push(this);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 load(){this.complete=true;this.naturalWidth=this.naturalHeight=128;this.onload?.();for(const fn of this.listeners.load||[])fn();}
 decode(){this.decodeCalls++;return this.decodingPromise??=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
}
function setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,delay});return id;}
function clearTimeout(id){timers.delete(id);}
const c=vm.createContext({console,Image,document,Uint8ClampedArray,performance:{now:()=>clock},
 localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},
 setTimeout,clearTimeout,requestAnimationFrame(fn){const id=++sequence;frames.set(id,fn);return id;},
 window:{devicePixelRatio:1,addEventListener(){},setTimeout,clearTimeout,cancelAnimationFrame:id=>frames.delete(id)}});
const run=s=>vm.runInContext(s,c),flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function frame(){clock+=17;const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(clock);}
const resources=()=>run('JSON.stringify({holds,grips,body,stamina,moveCount,lives,heartItems,playsSinceAd,stageRecords,dailyRecords,runStartedAt,runElapsedMs})');
const spriteCount=()=>calls.filter(call=>call.image===run('hazardHoldTintAtlas')&&call.args[2]===21.6).length;
run(source);
run('var poseTimes=[];var originalPose=characterPose;characterPose=time=>{poseTimes.push(time);return originalPose(time);};');
(async()=>{
 if(readyBeforeStage)run('hazardHoldImage.load();');
 run('featureHelpSeen={wide:true,heart:true,hazard:false};reset(7);showStageHelp();startPresentation();');
 assert.equal(run('featureHelpOpen'),true);frame();
 const expected=run('holds.filter(h=>h.type==="hazard").length');assert.equal(expected,2);
 const firstPaints=stagePaints,initialCamera=run('camera'),initialIntro=run('JSON.stringify(cameraIntro)');
 const saved=resources(),stored=JSON.stringify([...data]);
 // The help Image is decoded independently and displays before the game Image.
 const gameImage=run('hazardHoldImage'),helpImage=images.find(image=>image!==gameImage&&image.src==='assets/hold-hazard-source.webp');
 helpImage.load();helpImage.resolve();await flush();frame();
 assert.equal(run('ui.featureHelpDialog.open'),true);assert.equal(run('featureHelpImageLoading'),false);
 assert.equal(stagePaints,firstPaints,'Opening the modal must not restart background animation');
 assert.equal(spriteCount(),0,'The unloaded game image still uses the visible fallback');
 // Metadata arrives late. Its load invalidation must cross the modal freeze,
 // initiate exactly one decode, and keep the fallback while pixels are pending.
 clock+=2000;gameImage.load();frame();
 assert.equal(gameImage.decodeCalls,1,'A late image load must start decoding while help stays open');
 assert.equal(spriteCount(),0);assert.equal(run('ui.featureHelpDialog.open'),true);
 const beforeDecode=stagePaints;calls.length=0;gameImage.resolve();await flush();frame();
 assert.equal(stagePaints,beforeDecode+1,'Decoded artwork must repaint the paused stage once');
 assert.equal(spriteCount(),expected,'All visible sharp holds use real artwork before dismissal');
 assert.equal(run('camera'),initialCamera);assert.equal(run('JSON.stringify(cameraIntro)'),initialIntro);
 assert.equal(run('poseTimes.at(-1)'),run('poseTimes[0]'),'Asset repaint must retain the frozen character animation time');
 assert.equal(resources(),saved,'Artwork completion must not change gameplay, timers or resources');
 assert.equal(JSON.stringify([...data]),stored,'Artwork completion must not write save data');
 assert.equal(run('featureHelpSeen.hazard'),false,'Loading is not acknowledgment');
 assert.equal(frames.size,0,'No continuous animation behind the modal');
 const idle=stagePaints;run('requestGameRender();requestGameRender();');frame();assert.equal(stagePaints,idle);
 calls.length=0;run('dismissStageHelp();');frame();
 assert.equal(run('ui.featureHelpDialog.open'),false);assert.equal(run('featureHelpSeen.hazard'),true);
 assert.equal(spriteCount(),expected,'Artwork remains correct after dismissal');
 // A repeat first-encounter test with warm imagery must draw the sprite in its
 // first stage paint, retain the input shield and not charge an extra life.
 run('hideStageHelp();featureHelpSeen.hazard=false;reset(7);showStageHelp();');await flush();frame();
 assert.equal(run('ui.featureHelpDialog.open'),true);assert.equal(run('cameraIntro.start'),null);
 assert.equal(gameImage.decodeCalls,1,'Reuse already decoded game artwork');
 const warm=resources();run('dismissStageHelp();dismissStageHelp();');frame();
 assert.equal(resources(),warm,'Repeated dismissal cannot consume resources');
 // A decoding failure retains the visible vector marker and never spins RAF.
 run('hideStageHelp();featureHelpSeen.hazard=false;hazardImageDecodeStates.delete(hazardHoldImage);hazardHoldImage.decodingPromise=null;reset(7);showStageHelp();');
 await flush();frame();calls.length=0;gameImage.reject(Error('failed decode'));await flush();frame();
 assert.equal(run('ui.featureHelpDialog.open'),true);assert.equal(spriteCount(),0);assert.equal(frames.size,0);
 run('dismissStageHelp();');frame();assert.equal(run('ui.featureHelpDialog.open'),false,'Image failure must not block dismissal');
 console.log('PASS sharp-hold first-appearance modal ('+(readyBeforeStage?'loaded before first paint':'late load')+'): decode repaint before dismissal, warm repeat, failure fallback, frozen camera/pose/timer, idle RAF and unchanged saves/resources');
 if(!readyBeforeStage)require('node:child_process').execFileSync(process.execPath,[__filename],{cwd:root,env:{...process.env,ASCENT_HAZARD_READY:'1'},stdio:'inherit'});
})().catch(error=>{console.error(error);process.exitCode=1;});
