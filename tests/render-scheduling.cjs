const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const nativeTest=process.env.ASCENT_NATIVE_TEST==='1',nativeSource=require('../scripts/native-bundle-source.cjs');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
 .filter(m=>m[1]!=='js/main.js').map(m=>{const s=fs.readFileSync(path.join(root,m[1]),'utf8');return nativeTest?nativeSource(path.basename(m[1]),s):s;}).join('\n');
new Function('assert','nativeTest',`
let clock=0,sequence=0,clears=0;
const frames=new Map(),timers=new Map(),events={},windowEvents={};
const epoch=Date.UTC(2026,9,20,12);
const RealDate=Date;const TestDate=class extends RealDate {
 constructor(...args){super(...(args.length?args:[epoch+clock]));}
 static now(){return epoch+clock;}
};
const performance={now:()=>clock};
const paint=new Proxy({fillRect(x,y,w,h){if(x===0&&y===0&&w===400&&h===700)clears++;}},
 {get(o,k){return o[k]||function(){};}});
const elements={},document={hidden:false,getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},events:{},hidden:true,focus(){},setAttribute(){},removeAttribute(){},
 addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return paint;},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};},addEventListener(k,fn){(events[k] ||= []).push(fn);}};
const window={devicePixelRatio:2,addEventListener(k,fn){(windowEvents[k] ||= []).push(fn);},
 setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,at:clock+delay});return id;},
 clearTimeout(id){timers.delete(id);},cancelAnimationFrame(id){frames.delete(id);}};
function requestAnimationFrame(fn){const id=++sequence;frames.set(id,fn);return id;}
function frame(){const batch=[...frames.values()];frames.clear();clock+=17;batch.forEach(fn=>fn(clock));}
function drain(){let n=0;while(frames.size){assert(n++<500,'Animation failed to stop');frame();}}
function advance(ms){clock+=ms;for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}}
function fire(name){for(const fn of events[name]||[])fn({target:{closest(){return null;}}});}
return (function(Date){
`+source+`
reset(1);startPresentation();drain();assert(clears>0);assert(!cameraIntro);
const idle=clears;advance(2000);assert.equal(clears,idle);assert.equal(frames.size,0,'Static stage must not poll RAF');
assert.equal(timers.size,0,'Full lives and an active stage need no UI polling');
requestGameRender();requestGameRender();requestGameRender();assert.equal(frames.size,1,'Coalesce invalidations');drain();assert.equal(clears,idle+1);
bodyTap={start:clock};requestGameRender();drain();assert.equal(frames.size,0,'Holding a still finger is not animation');bodyTap=null;
startPoseSettle();requestGameRender();drain();assert.equal(frames.size,0);
openSettings();drain();const modal=clears;fire('click');drain();assert.equal(clears,modal,'Modal controls must not repaint the stage behind them');advance(2000);assert.equal(clears,modal);assert.equal(frames.size,0);
hideSettings();drain();state='won';showResultModal();drain();const result=clears;advance(2000);assert.equal(clears,result);
hideResultModal();state='map';requestGameRender();drain();assert.equal(frames.size,0);assert.equal(timers.size,1,'Only the midnight deadline is needed on an idle map');
lives.count=0;lives.recoveryAt=TestDate.now()-LIFE_RECOVERY_MS+1500;refreshLives();
const mapClears=clears;advance(1000);assert.equal(lives.count,0);assert.equal(frames.size,0);assert.equal(clears,mapClears);
advance(500);assert.equal(lives.count,1,'Recovery works without RAF');
const previousDate=localToday();const midnight=new TestDate();midnight.setHours(24,0,0,0);
advance(midnight.getTime()-TestDate.now()+1);assert.notEqual(localToday(),previousDate);assert.equal(dailyEntryToday,localToday(),'Midnight changes the date without RAF');assert.equal(frames.size,0);
assert(startDummyAd());drain();const adClears=clears;
advance(1000);assert.equal(dummyAd.remaining,9);assert.equal(frames.size,0);assert.equal(clears,adClears);
requestGameRender();document.hidden=true;fire('visibilitychange');assert.equal(frames.size,0);assert.equal(timers.size,0);
advance(10000);document.hidden=false;fire('visibilitychange');drain();
assert.equal(dummyAd.remaining,0,'Visible again: the ad deadline must be reconciled immediately');
assert.equal(frames.size,0);assert.equal(clears,adClears);
console.log('PASS render scheduling: idle/modal/result RAF stop, coalesced input, finite motion, recovery/ad deadlines, midnight timer, hidden cancellation and foreground catch-up');
if(nativeTest) {
 document.hidden=false;presentationEnabled=false;hideStageStart();hideSettings();hideResultModal();
 reset(1);cameraIntro=null;state='playing';inspecting=true;
 const goal=holds.find(h=>h.type==='goal');camera=goal.y-100;
 canvas.getBoundingClientRect=()=>({left:0,top:0,width:400,height:800});
 let matrix,background;paint.setTransform=(...args)=>matrix=args;
 const oldFill=paint.fillRect;paint.fillRect=(...args)=>{if(args[1]===-50)background=args;oldFill(...args);};
 const rules=JSON.stringify({W,H,HEIGHT,holds,route,stamina,moveCount,body,camera});
 draw(0);
 assert.equal(canvas.width,800);assert.equal(canvas.height,1600);
 assert.deepEqual(matrix,[2,0,0,2,0,100]);assert.deepEqual(background,[0,-50,400,800]);
 assert.equal(ui.goalEffects.style.top,'150px');
 assert.equal(JSON.stringify({W,H,HEIGHT,holds,route,stamina,moveCount,body,camera}),rules);
 const overlays=[];paint.fillRect=(...args)=>overlays.push(args);
 cameraIntro={from:camera,to:camera,start:0};drawStageIntro();
 assert.deepEqual(overlays,[[0,-50,400,800]],'Intro tint covers the entire extended viewport without old-boundary bands');
 cameraIntro=null;ui.overlay.hidden=true;pan={edge:true,scrolling:true,side:'left'};draw(1);
 assert(overlays.some(a=>a[0]===0 && a[1]===-50 && a[2]===STAGE_SAFE_WIDTH && a[3]===800),'Scroll assistance extends uniformly too');
 pan=null;
 delete globalThis.ASCENT_STAGE_VIEWPORT;
 console.log('PASS native viewport: uniform render scale, extended backing height/background, goal DOM alignment; world geometry and camera unchanged');
}
})(TestDate);
`)(assert,nativeTest);
