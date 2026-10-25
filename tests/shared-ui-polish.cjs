'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(m[1],'utf8')).join('\n');
const fixture=`
let clock=0;const performance={now:()=>clock};const rects=[];
const paint=new Proxy({rect(...a){rects.push(a);}},{get(o,k){return o[k]||function(){};}});
const elements={};const document={getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},events:{},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;},getContext(){return paint;},getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};
const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};
`;
new Function('assert',fixture+source+`
hideStageStart();reset(1);cameraIntro=null;settingsOpen=false;state='playing';inspecting=true;
const wide={id:0,x:200,y:300,wide:true,type:'normal'},left={id:1,x:170,y:440,type:'normal'},right={id:2,x:230,y:440,type:'normal'};
holds=[wide,left,right];grips=[wide,wide,left,right];startGrips=[...grips];body={x:200,y:380};committed={...body};HEIGHT=700;camera=0;characterAnimation=null;drag=null;
assert(canShareHold(wide,0,1));assert(canShareHold(wide,2,3));assert(!canShareHold(wide,0,2));assert(!canShareHold(left,0,1));
drawWideHoldSprite=()=>true;drawHoldSprite=()=>true;
const circles=[];circle=(...a)=>circles.push(a);
const geometry=JSON.stringify({body,committed,grips,holds,HEIGHT,route});draw(0);
const markers=circles.filter(a=>a[2]===14 && a[4]==='#84a78c');
assert.equal(markers.length,4);assert.equal(markers.filter(a=>a[0]===200 && a[1]===300).length,2,'Shared hands use their real common contact, with no invented offsets');
assert(!rects.some(a=>a[2]===68 && a[3]===34),'No wide active rectangle');
assert.equal(JSON.stringify({body,committed,grips,holds,HEIGHT,route}),geometry);
wide.type='goal';circles.length=0;draw(1);assert.equal(circles.filter(a=>a[0]===200 && a[1]===300 && a[2]===18 && a[4]==='#cfaa48').length,2,'Keep gold contact meaning');
// Post-clear presentation does not iterate actual/planned routes unless explicit
// debug route display is enabled. Generation/shortest route data is retained.
state='won';debugMode=false;const lines=[];line=(...a)=>lines.push(a);circles.length=0;drawPath();assert.equal(lines.length,0);assert.equal(circles.length,0);
debugMode=true;debugDisplay.route=true;route=[{x:150,y:300},{x:200,y:250}];drawPath();assert(lines.some(a=>a[2]==='#527faa9c'));assert(!lines.some(a=>a[2]==='#d14479'));
debugDisplay.route=false;lines.length=0;drawPath();assert.equal(lines.length,0);debugMode=false;
// Failure button translation changes without re-running a clear or modifying scores.
state='lost';dailyRun=null;const records=JSON.stringify({stageRecords,dailyRecords});
setGameLanguage('ja');refreshGameLanguage('en');assert.equal(ui.retry.textContent,'もういちど');
setGameLanguage('en');assert.equal(ui.retry.textContent,'RETRY');
dailyRun={date:'2026-10-25'};setGameLanguage('ja');assert.equal(ui.retry.textContent,'もういちど');setGameLanguage('en');assert.equal(ui.retry.textContent,'Retry');
assert.equal(JSON.stringify({stageRecords,dailyRecords}),records);
`)(assert);
assert(!/playerPath/.test(fs.readFileSync('js/game.js','utf8')),'No display-only move history allocation/copy on commit or Undo');
const css=fs.readFileSync('styles.css','utf8');
assert(css.includes('-webkit-tap-highlight-color:transparent; appearance:none;'));
assert(css.includes('.daily-airship:active > .daily-airship-body { transform:scale(1.04); }'));
assert(css.includes('.daily-airship:focus-visible { outline:3px solid'));
assert(!/#(?:openDaily|dailyBack):active\s*\{[^}]*transform/.test(css),'Hit target/scene animation must not scale');
assert.equal((html.match(/class="daily-airship-body"/g)||[]).length,2);
console.log('PASS shared UI: real per-limb wide circles/shared grip rules/gold semantics; no post-clear path or move history; debug planned route retained; bilingual retry; airship artwork-only press and keyboard focus');
