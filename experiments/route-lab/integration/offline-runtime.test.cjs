'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../public/game'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
let clock=2000;const performance={now:()=>clock};const elements={};
const document={getElementById(id){return elements[id] ||= {style:{},events:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},showModal(){this.open=true},close(){this.open=false},addEventListener(k,f){this.events[k]=f},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}}}};
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};
`;
function context(){const c=vm.createContext({console,assert,atob,Uint8Array,URL,setTimeout:()=>0,clearTimeout(){},location:{protocol:'https:'},crypto:require('node:crypto').webcrypto});Object.defineProperty(c,'localStorage',{configurable:true,get(){throw Error('native storage touched')}});vm.runInContext(env+source,c);return c;}
test('trial runtime clears baseline through real touch events and blocks online/prototype',async()=>{
 const c=context();vm.runInContext(`
 assert.equal(state,'choosing');assert.equal(online.uid,null);assert.equal(online.ready,false);assert.equal(onlineScores.pending.size,0);
 startCourse('prototype');assert.equal(courseMode,'existing');assert.equal(state,'choosing');setDebugMode(true);assert.equal(debugMode,false);
 startCourse('existing');assert.equal(state,'map');
 function finger(p){return {identifier:7,clientX:p.x,clientY:p.y-camera};}
 function touch(name,point,ended=false){const t=finger(point);canvas.events[name]({touches:ended?[]:[t],changedTouches:[t],preventDefault(){}});}
 for(let n=1;n<=3;n++){
  reset(n);cameraIntro=null;hideStageHelp();characterAnimation=null;
  for(let i=1;i<route.length;i++){
   camera=clamp(body.y-H*.6,0,HEIGHT-H);const from={...body},to=route[i];
   touch('touchstart',from);
   for(let step=1;step<=10;step++)touch('touchmove',{x:from.x+(to.x-from.x)*step/10,y:from.y+(to.y-from.y)*step/10});
   touch('touchend',to,true);assert.equal(moveCount,i,'stage '+n+' move '+i);clock+=300;
  }
  assert.equal(state,'won');assert(bothHandsOnGoal());assert.equal(onlineScores.pending.size,0);
 }
 playsSinceAd=0;lives.count=LIFE_MAX;reset(1);cameraIntro=null;finish(false);ui.retry.onclick();assert(stageStartContext?.retry);ui.closeStageStart.onclick();assert.equal(state,'map');
 mapPreparing=false;mapTransition=null;openSettings();setGameLanguage('en');setGameLanguage('ja');assert.equal(debugMode,false);assert(ui.prototypeCourse.hidden);assert(ui.titleTransfer.hidden);hideSettings();
 localStorage.setItem('lab-check','temporary');assert.equal(localStorage.getItem('lab-check'),'temporary');
 `,c,{timeout:120000});
 await assert.rejects(vm.runInContext("fetch('https://example.com/')",c),/disabled/);
 await assert.rejects(vm.runInContext("fetch('/game/assets/audio/launch.wav')",c),/disabled/);
 const bytes=await vm.runInContext("fetch('assets/audio/launch.wav?v=abc123').then(r=>r.arrayBuffer())",c);assert.equal(bytes.byteLength,110294);
 const fresh=context();assert.equal(vm.runInContext("localStorage.getItem('lab-check')",fresh),null);assert.equal(vm.runInContext('stageProgress.existing.cleared',fresh),0);
});
