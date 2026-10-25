'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const values=new Map(),events={},visualEvents={};
const visual={width:390,height:844,offsetLeft:0,offsetTop:0,addEventListener:(k,f)=>visualEvents[k]=f};
const portal=[{id:'overlay'},{id:'settingsDialog'}],appended=[];
const env={document:{querySelectorAll(){return portal;},documentElement:{style:{setProperty:(k,v)=>values.set(k,v)}},
 createElement:()=>({setAttribute(){}}),body:{append(node){appended.push(node);}}},
 getComputedStyle:()=>({paddingTop:'47px',paddingBottom:'34px',paddingLeft:'0px',paddingRight:'0px'}),
 window:{visualViewport:visual,addEventListener:(k,f)=>events[k]=f},canvas:{getBoundingClientRect:()=>({width:390,height:763})}};
const code=fs.readFileSync('js/viewport.js','utf8');
const swift=fs.readFileSync('ios/App/App/SceneDelegate.swift','utf8');
assert(!swift.includes('ASCENT_VIEWPORT_DIAGNOSTICS') && !swift.includes('ascent-viewport-geometry.json') && !code.includes("kind:'report'"),'Temporary geometry logging must not ship');vm.runInNewContext(code,env);assert.deepEqual(appended.slice(0,2),portal);
for(const [w,h,insets] of [[400,700,{}],[390,844,{top:47,bottom:34}],[1366,768,{}],[844,390,{left:47,right:47,bottom:21}],[320,568,{}],[430,932,{}],[390,390,{}]]) {
 const m=env.viewportMetrics(w,h,insets);
 assert.equal(m.width,400);assert(m.height>=700-1e-9);
 assert(Math.abs(m.height*m.scale-m.cssHeight)<1e-9);
 assert(m.left>=0 && m.top>=0 && m.left+m.cssWidth<=w+1e-9);
 for(const camera of [0,-180,1400])for(const p of [{x:0,y:camera-m.padding},{x:200,y:camera+350},{x:399,y:camera+700+m.padding}]) {
  const rect={left:m.left,top:m.top,width:m.cssWidth,height:m.cssHeight};
  const q=env.viewportClientPoint({clientX:rect.left+p.x*m.scale,clientY:rect.top+(p.y-camera+m.padding)*m.scale},rect,camera);
  assert(Math.abs(p.x-q.x)<1e-8 && Math.abs(p.y-q.y)<1e-8);
  assert(Math.abs(env.viewportClientDelta(48*m.scale,rect)-48)<1e-8);
 }
}
assert.equal(parseFloat(values.get('--viewport-height')),763/.975);
visual.width=844;visual.height=390;events.resize();assert.equal(env.ASCENT_VIEWPORT.height,700);
visual.height=300;visual.offsetTop=12;visualEvents.resize();assert.equal(env.ASCENT_VIEWPORT.height,700);assert.equal(env.ASCENT_VIEWPORT.top,47);
assert.equal(env.viewportUiDelta(48*env.ASCENT_VIEWPORT.scale),48);
// Real native safe rect wins when WK CSS env initially returns zero. A shell
// which already insets its WebView supplies a full local safe rect: no second cut.
const full={width:390,height:844},native={width:390,height:844,safe:{left:0,top:47,right:390,bottom:810}};
let m=env.viewportSafeFrame(full,{left:0,top:0,...full},{},native);
assert.equal(m.top,47);assert.equal(m.cssHeight,763);assert.equal(m.safeSource,'native');
m=env.viewportSafeFrame(full,{left:0,top:0,width:390,height:500},{top:47,bottom:34},native);
assert.equal(m.top,47);assert.equal(m.cssHeight,453,'Keyboard bottom is not charged the home-indicator inset again');
m=env.viewportSafeFrame(full,{left:0,top:60,width:390,height:440},{top:47,bottom:34},native);
assert.equal(m.top,60);assert.equal(m.cssHeight,440,'Visible origin and safe origin intersect, not add');
m=env.viewportSafeFrame({width:390,height:763},{left:0,top:0,width:390,height:763},{top:47,bottom:34},
 {width:390,height:763,safe:{left:0,top:0,right:390,bottom:763}});
assert.equal(m.top,0);assert.equal(m.cssHeight,763,'Already-inset native shell does not double subtract CSS env');
for(const nativeMode of [false,true])for(const [w,h,edge] of [[390,844,{top:47,bottom:34}],[844,390,{left:47,right:47,bottom:21}],[320,568,{}]]) {
 const safe={left:edge.left||0,top:edge.top||0,right:w-(edge.right||0),bottom:h-(edge.bottom||0)};
 const frame=env.viewportSafeFrame({width:w,height:h},{left:0,top:0,width:w,height:h},edge,nativeMode?{width:w,height:h,safe}:undefined);
 assert(frame.left>=safe.left && frame.top>=safe.top && frame.left+frame.cssWidth<=safe.right+1e-9 && frame.top+frame.cssHeight<=safe.bottom+1e-9);
}
// Actual bridge delivery after the first layout must remeasure the common frame.
env.ASCENT_NATIVE_SAFE_AREA=native;visual.width=390;visual.height=844;visual.offsetTop=0;events['ascent-native-safe-area']();
assert.equal(env.ASCENT_VIEWPORT.top,47);assert.equal(env.ASCENT_VIEWPORT.cssHeight,763);
// Deterministic geometry must not depend on viewport size/platform/DPR.
const root=process.cwd();
const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
function snapshot(width,height) {
 const fixture=`const document={getElementById(){return {style:{},classList:{toggle(){}},events:{},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},getContext(){return new Proxy({},{get(){return function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:${width},height:${height}};}};}};const window={devicePixelRatio:3,addEventListener(){}};function requestAnimationFrame(){};`;
 return new Function(fixture+scripts+`hideStageStart();reset(10);return JSON.stringify({W,H,version:COURSE_VERSION,HEIGHT,holds,route,initialGrips});`)();
}
const reference=snapshot(400,700);
// Verified against main 9d4c0b4, before this viewport change.
assert.equal(require('node:crypto').createHash('sha256').update(reference).digest('hex'),'594f457a801f03109c6ea6ed7250ee7aa5d14e3c74632c8559b64b8e4d445d87');assert.equal(snapshot(390,763),reference);assert.equal(snapshot(219,383.25),reference);
console.log('PASS viewport: safe areas, portrait/landscape/keyboard/resize, input inverse, gesture scale, fixed course v1 geometry');
