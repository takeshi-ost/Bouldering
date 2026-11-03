const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
assert(/\.feature-help-icon \.feature-wide-image\s*\{[^}]*width:78px;[^}]*height:78px;[^}]*object-fit:contain;/.test(css),'Reuse the tutorial 78px plate without stretching the 2:1 artwork');
assert(/\.feature-help-icon \.feature-wide-image\[hidden\]\s*\{[^}]*display:none;/.test(css),'Image failure must stay text-only');
const env=`
let clock=0;const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(k,fn){this.events[k]=fn;},setAttribute(){},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try {
new Function('assert','storage','data',env+source+`
reset(1);showStageHelp();assert(!featureHelpOpen,'No item means no explanation');
hearts=[{x:200,y:300}];showStageHelp();assert(featureHelpOpen && ui.featureHelpDialog.open);
assert(ui.featureHelpContent.innerHTML.includes(COURSE_HEART_IMAGE_SRC));assert(!ui.featureHelpContent.innerHTML.includes('❤️'));
assert(ui.featureHelpContent.innerHTML.includes('width="96" height="96"'));
assert(ui.featureHelpContent.innerHTML.indexOf('<h1')<ui.featureHelpContent.innerHTML.indexOf('class="feature-help-icon"'));
assert(ui.featureHelpContent.innerHTML.indexOf('class="feature-help-icon"')<ui.featureHelpContent.innerHTML.indexOf('<p>'));
assert.deepEqual(pendingFeatureHelp,['heart']);assert(ui.featureHelpContent.innerHTML.includes('2回復'));
const oldCamera=camera;clock=90000;advanceCameraIntro(clock);assert.equal(camera,oldCamera);assert.equal(cameraIntro.start,null);assert.equal(runTimeMs(),0);
let labels=[];ctx.fillText=t=>labels.push(t);drawStageIntro();assert.equal(labels.length,0);
beginPointer({clientX:200,clientY:400});assert(!drag && !bodyTap);assert(!canScrollStage());
assert.equal(featureHelpSeen.heart,false,'Mark seen only when dismissed');
ui.featureHelpDialog.onclick();assert(!featureHelpOpen && !ui.featureHelpDialog.open);
assert.deepEqual(readFeatureHelpSeen(),{wide:false,heart:true,hazard:false});
advanceCameraIntro(clock);drawStageIntro();assert(labels.some(t=>t.startsWith('STAGE')));
clock+=999;advanceCameraIntro(clock);assert(cameraIntro);clock++;advanceCameraIntro(clock);assert(!cameraIntro);assert.equal(runTimeMs(),0);
showStageHelp();assert(!featureHelpOpen,'Do not repeat a heart explanation');
reset(1);holds.push({type:'hazard'});showStageHelp();assert.deepEqual(pendingFeatureHelp,['hazard']);
assert(ui.featureHelpContent.innerHTML.includes('追加で1消費'));assert(ui.featureHelpContent.innerHTML.includes('feature-hold-image'));assert(!ui.featureHelpContent.innerHTML.includes('<svg'));assert(!ui.featureHelpContent.innerHTML.includes('<small>'));
assert(ui.featureHelpContent.innerHTML.includes('width="128" height="128"'));
assert(ui.featureHelpContent.innerHTML.indexOf('<h1')<ui.featureHelpContent.innerHTML.indexOf('class="feature-help-icon"'));
ui.featureHelpDialog.events.cancel({preventDefault(){}});assert(!featureHelpOpen);assert(readFeatureHelpSeen().hazard);
courseMode='existing';reset(1);hearts=[{}];holds.push({type:'hazard'});showStageHelp();assert(!featureHelpOpen,'Seen items shared across courses');
featureHelpSeen={wide:false,heart:false,hazard:false};showStageHelp();assert.deepEqual(pendingFeatureHelp,['heart','hazard']);
showLevelMap();assert(!featureHelpOpen && !ui.featureHelpDialog.open);assert(!featureHelpSeen.heart,'Leaving without acknowledging does not mark seen');
reset(1);hearts=[{}];holds.push({type:'hazard'});showStageHelp();
assert(!ui.featureHelpContent.innerHTML.includes('小さくとがったホールド'));
ui.featureHelpDialog.onclick();assert(featureHelpOpen && ui.featureHelpDialog.open);
assert(featureHelpSeen.heart && !featureHelpSeen.hazard);assert.deepEqual(pendingFeatureHelp,['hazard']);
assert(ui.featureHelpContent.innerHTML.includes('小さくとがったホールド'));assert.equal(cameraIntro.start,null);assert.equal(runTimeMs(),0);
assert.deepEqual(readFeatureHelpSeen(),{wide:false,heart:true,hazard:false});
const savedSet=storage.setItem;storage.setItem=()=>{throw Error('blocked');};assert.doesNotThrow(dismissStageHelp);assert(featureHelpSeen.heart && featureHelpSeen.hazard);storage.setItem=savedSet;
showStageHelp();assert(!featureHelpOpen,'Remember within session when storage blocked');
data[FEATURE_HELP_KEY]='bad json';assert.deepEqual(readFeatureHelpSeen(),{wide:false,heart:false,hazard:false});
data[FEATURE_HELP_KEY]=JSON.stringify({heart:'true',hazard:1});assert.deepEqual(readFeatureHelpSeen(),{wide:false,heart:false,hazard:false});
const savedGet=storage.getItem;storage.getItem=()=>{throw Error('blocked');};assert.deepEqual(readFeatureHelpSeen(),{wide:false,heart:false,hazard:false});storage.getItem=savedGet;
data[FEATURE_HELP_KEY]=JSON.stringify({heart:true,hazard:true});
`)(assert,storage,data);
new Function('assert',env+source+`
assert.deepEqual(featureHelpSeen,{wide:false,heart:true,hazard:true});reset(1);hearts=[{}];holds.push({type:'hazard'});showStageHelp();assert(!featureHelpOpen,'Seen state survives a fresh launch');
`)(assert);
new Function('assert','storage','data',env+source+`
// Old saves retain heart/spike acknowledgments; wide is new and remains unread.
data[FEATURE_HELP_KEY]=JSON.stringify({heart:true,hazard:true});featureHelpSeen=readFeatureHelpSeen();
assert.deepEqual(featureHelpSeen,{wide:false,heart:true,hazard:true});
reset(1);assert.equal(stageHasLargeHold(),false);showStageHelp();assert(!featureHelpOpen);
reset(3);assert(stageHasLargeHold(),'Final generated stage 3 contains a real ordinary wide hold');
assert.equal(generatedCourse.holds,holds);
const resources=()=>JSON.stringify({stamina,moveCount,heartItems,lives,playsSinceAd,stageRecords,dailyRecords});
const before=resources();showStageHelp();assert.deepEqual(pendingFeatureHelp,['wide']);
assert(ui.featureHelpContent.innerHTML.includes(gameText('tutorial.title.wide')));
assert(ui.featureHelpContent.innerHTML.includes(gameText('tutorial.wide')));
assert(ui.featureHelpContent.innerHTML.includes('feature-wide-image'));
assert(!featureHelpSeen.wide);dismissStageHelp();assert(readFeatureHelpSeen().wide);assert.equal(resources(),before);
reset(3);showStageHelp();assert(!featureHelpOpen,'Acknowledged wide is not repeated');
// Reordering and cloning starting contacts must not change their exclusion.
const actualHolds=holds,actualStarts=initialGrips;
const start={id:700,type:'normal',wide:true},goal={id:701,type:'goal',wide:true};
initialGrips=[{...start}];holds=[goal,{id:702,type:'normal'},start];
assert(!stageHasLargeHold(),'Start identity is its ID, not array position; yellow goal never qualifies');
holds.unshift({id:703,type:'normal',wide:true});assert(stageHasLargeHold());
initialGrips=actualStarts;holds=actualHolds;
// All seen: no detection reads whatsoever. Each seen kind also short-circuits.
const savedDetection=stageHasLargeHold,savedHolds=holds,savedHearts=hearts;
const trap=new Proxy([], {get(){throw Error('seen feature was inspected');}});
featureHelpSeen={wide:true,heart:true,hazard:true};holds=hearts=trap;
stageHasLargeHold=()=>{throw Error('seen wide was inspected');};assert.doesNotThrow(showStageHelp);
featureHelpSeen={wide:false,heart:true,hazard:true};let wideChecks=0;
stageHasLargeHold=()=>{wideChecks++;return false;};showStageHelp();assert.equal(wideChecks,1);
featureHelpSeen={wide:true,heart:false,hazard:true};hearts=[];showStageHelp();
featureHelpSeen={wide:true,heart:true,hazard:false};hearts=trap;let hazardChecks=0;
holds={some(fn){hazardChecks++;assert(fn({type:'hazard'}));return false;}};showStageHelp();assert.equal(hazardChecks,1);
stageHasLargeHold=savedDetection;holds=savedHolds;hearts=savedHearts;
// Queue all three while keeping the opening camera, timer and resources paused.
featureHelpSeen={wide:false,heart:false,hazard:false};hearts=[{}];holds.push({type:'hazard'});
showStageHelp();assert.deepEqual(pendingFeatureHelp,['wide','heart','hazard']);
const queuedResources=resources();let cues=[];playSound=name=>cues.push(name);
dismissStageHelp();assert.deepEqual(pendingFeatureHelp,['heart','hazard']);assert(featureHelpSeen.wide);
dismissStageHelp();assert.deepEqual(pendingFeatureHelp,['hazard']);
ui.featureHelpDialog.events.cancel({preventDefault(){}});dismissStageHelp();assert.deepEqual(cues,['move','move','move']);
assert.equal(resources(),queuedResources);assert.equal(cameraIntro.start,null);assert.equal(runTimeMs(),0);
// Daily uses the same final-hold detection and the same durable acknowledgment.
dailyRun={date:'2026-10-18',...dailyProfile('2026-10-18')};reset(1);
assert.equal(stageHasLargeHold(),holds.some(h=>h.type==='normal' && h.wide===true && !initialGrips.some(s=>s.id===h.id)));
assert(stageHasLargeHold(),'Fixed real Daily fixture must contain an ordinary wide hold');
showStageHelp();assert(!featureHelpOpen,'Normal acknowledgment applies to Daily');
featureHelpSeen.wide=false;showStageHelp();assert.deepEqual(pendingFeatureHelp,['wide']);dismissStageHelp();
dailyRun=null;reset(3);showStageHelp();assert(!featureHelpOpen,'Daily acknowledgment applies to normal');
// Debug trial retains its existing snapshot semantics and does not write durable state.
featureHelpSeen.wide=false;debugHelpBefore={...featureHelpSeen};debugAttempt=true;
const persisted=data[FEATURE_HELP_KEY];showStageHelp();dismissStageHelp();assert(featureHelpSeen.wide);
assert.equal(data[FEATURE_HELP_KEY],persisted);endDebugCourseTrial();assert.equal(featureHelpSeen.wide,false);debugAttempt=false;
showStageHelp();showLevelMap();assert.equal(featureHelpSeen.wide,false,'Interrupted explanation is not acknowledged');
`)(assert,storage,data);
console.log('PASS first encounters: final-generated normal/Daily wide presence, yellow/start exclusion, seen-kind scan short circuits, debug isolation, sequential/separate items, input/camera/title/timer pause, tap/Escape continuation, full intro, cross-course persistence, interrupted flow, reload and blocked/invalid storage');
} finally {
 if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;
}
