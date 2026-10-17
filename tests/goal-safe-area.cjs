const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(k,f){this.events[k]=f;},setAttribute(){},contains(){return true;},
 showModal(){this.open=true;},close(){this.open=false;},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
function check(n){
 reset(n);const goal=holds.find(h=>h.type==='goal');const geometry=JSON.stringify({holds,route,initialGrips,HEIGHT});
 assert(goal.y-camera>=CAMERA_CONFIG.goalTopPadding-1e-8,'Intro goal lacks headroom');
 assert.equal(cameraTop(),Math.min(0,goal.y-CAMERA_CONFIG.goalTopPadding));
 cameraIntro=null;hideStageHelp();state='playing';settingsOpen=false;hideResultModal();
 assert(canScrollStage(),'High goal must be scrollable even in one-screen stage');
 canvas.events.keydown({key:'Home',preventDefault(){}});assert.equal(camera,cameraTop());
 assert(goal.y-camera>=CAMERA_CONFIG.goalTopPadding);
 canvas.events.keydown({key:'End',preventDefault(){}});assert.equal(camera,HEIGHT-H);
 canvas.events.wheel({deltaY:-100000,deltaMode:0,preventDefault(){}});assert.equal(camera,cameraTop());
 canvas.events.wheel({deltaY:100000,deltaMode:0,preventDefault(){}});assert.equal(camera,HEIGHT-H);
 const e={clientX:body.x,clientY:body.y-camera};beginTouchPan([{...e,identifier:1},{...e,identifier:2,clientY:e.clientY+30}]);
 canvas.events.touchmove({touches:[{...e,identifier:1,clientY:e.clientY+100000},{...e,identifier:2,clientY:e.clientY+100030}],changedTouches:[],preventDefault(){}});assert.equal(camera,cameraTop());endPan();ignoreTouches=false;
 body={...route.at(-1)};inspecting=false;camera=HEIGHT-H;for(let i=0;i<200;i++)draw(i*16);
 assert(goal.y-camera>=CAMERA_CONFIG.goalTopPadding-.001,'Automatic follow leaves goal under HUD');
 assert.equal(JSON.stringify({holds,route,initialGrips,HEIGHT}),geometry,'Safe area changed course geometry');
}
check(1);assert.equal(HEIGHT,H);assert(cameraTop()<0);
check(2);check(5);courseMode='prototype';check(1);
courseMode='existing';dailyRun={...dailyProfile('2026-01-01'),returnCourse:'existing'};check(dailyRun.referenceStage);
console.log('PASS goal safe area: intro/automatic follow, Home/End/wheel/two-finger pan, scrollable STAGE1, normal/prototype/daily, unchanged route geometry');
`)(assert);
