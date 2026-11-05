'use strict';
// Headless current game, no network, storage, or real account side effects.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const nativeSource=require('../scripts/native-bundle-source.cjs');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>{
 const s=fs.readFileSync(path.join(root,m[1]),'utf8');return process.env.ASCENT_NATIVE_TEST==='1'?nativeSource(path.basename(m[1]),s):s;
}).join('\n');
const env=`
let clock=10000;const performance={now:()=>clock};let testRect={left:0,top:0,width:400,height:700};
const elements={};const document={getElementById(id){return elements[id]||={style:{setProperty(){}},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},events:{},addEventListener(name,fn){this.events[name]=fn;},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){}}})},getBoundingClientRect(){return testRect}}}};
const window={devicePixelRatio:1,events:{},addEventListener(name,fn){const prev=this.events[name];this.events[name]=prev?e=>{prev(e);fn(e)}:fn;}};
function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;

module.exports=function run(script){const failures=[];return new Function('assert','failures','globalThis',env+source+`
const resultRows=[];
function check(name,fn){try{fn();console.log('PASS finger aim: '+name);}catch(e){failures.push({name,message:e.stack});console.error('FAIL finger aim: '+name+'\\n'+e.stack);}}
const ids=stance=>stance?.map(h=>h?.id??null);
const nearly=(a,b,label='point')=>assert(Math.abs(a.x-b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6,label+': '+JSON.stringify([a,b]));
const action=points=>fingerAction(points);
const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
function sample(dx,dy,n=1){return Array.from({length:n},(_,i)=>({dx:dx*(i+1)/n,dy:dy*(i+1)/n}));}
function fixture(custom=null){
 const base=custom||{origin:{x:200,y:500},HEIGHT:1400,gripIds:[1,2,3,4],holds:[
  {id:1,x:140,y:425,type:'normal'},{id:2,x:260,y:430,type:'normal'},
  {id:3,x:150,y:580,type:'normal'},{id:4,x:250,y:580,type:'normal'},
  ...[110,170,230,290].map((x,i)=>({id:5+i,x,y:400,type:'normal'})),
  ...[120,180,220,280].map((x,i)=>({id:9+i,x,y:540,type:'normal'})),
  {id:13,x:150,y:620,type:'normal'},{id:14,x:250,y:620,type:'normal'},
  {id:15,x:200,y:100,type:'goal'}]};
 holds=base.holds.map(h=>({...h}));HEIGHT=base.HEIGHT;body={...base.origin};committed={...body};
 grips=base.gripIds.map(id=>holds.find(h=>h.id===id));startGrips=[...grips];initialGrips=[...grips];
 route=[{...body,grips:ids(grips)}];hearts=[];stamina=100;moveCount=0;state='playing';drag=null;bodyTap=null;pan=null;touchId=null;ignoreTouches=false;
 cameraIntro=null;settingsOpen=false;featureHelpOpen=false;camera=80;warning=0;undoSnapshot=moveSnapshot=null;runStartedAt=null;runElapsedMs=0;
 level=1;courseTypeId=0;difficulty=0;dailyRun=null;tutorialRun=null;debugCourseTrial=null;generatedCourse=activeCourseGeneration=null;
 ui.overlay.hidden=true;ui.overlay.open=false;heartPopups=[];anchorRings=[];resetCharacterAnimation();jointHistory.fill(null);
 finish=won=>{state=won?'won':'lost';};
 return {p:{...body},stance:[...grips]};
}
function eventAtScreen(x,y){const s=testRect.width/400,padding=Math.max(0,(testRect.height/s-700)/2);return {clientX:testRect.left+x*s,clientY:testRect.top+(y+padding)*s,button:0,preventDefault(){}};}
function movedEvent(e,p){const s=testRect.width/400;return {...e,clientX:e.clientX+p.dx*s,clientY:e.clientY+p.dy*s};}
function live(points,{origin={x:100,y:200},cancel=false,releaseNow=true}={}){
 const e=eventAtScreen(origin.x,origin.y);down(e);assert(drag,'Visible playable origin starts gesture');
 points.forEach(p=>move(movedEvent(e,p)));const preview={p:{...body},stance:ids(grips),anchor:drag.anchor&&[...drag.anchor]};
 if(releaseNow)release(cancel);
 return {...preview,after:{p:{...body},stance:ids(grips),moves:moveCount,stamina},record:lastFingerGesture};
}
const reconstructed={HEIGHT:2100,origin:{x:297.7,y:340.6},gripIds:[43,45,47,48],holds:[
 {id:38,x:147.6071911928134,y:289,type:'normal'},
 {id:41,x:51.80130924563855,y:225.78542827592733,type:'normal'},
 {id:43,x:259.012774865143,y:255.07783325399774,type:'normal'},
 {id:44,x:208.37408035760745,y:297.22063052618444,type:'normal'},
 {id:45,x:340.6946150553413,y:302.8428386395009,type:'normal'},
 {id:46,x:46,y:358.46974550617426,type:'normal'},
 {id:47,x:364,y:420.2499584216624,type:'normal'},
 {id:48,x:364,y:475.9364247895777,type:'normal'},
 {id:62,x:313.62358621740714,y:250.43552329588252,type:'normal'},
 // Display label 44 in the reconstructed screenshot, not raw ID 44.
 {id:42,x:342.6485503409058,y:196.60729175444263,type:'normal'}]};

assert(fingerAimEnabled());assert(coupledBodyEnabled());assert.equal(fingerAimGain(),1);
`+script)(require('node:assert/strict'),failures,{});};
