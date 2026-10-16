const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
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
assert.deepEqual(pendingFeatureHelp,['heart']);assert(ui.featureHelpContent.innerHTML.includes('2回復'));
const oldCamera=camera;clock=90000;advanceCameraIntro(clock);assert.equal(camera,oldCamera);assert.equal(cameraIntro.start,null);assert.equal(runTimeMs(),0);
let labels=[];ctx.fillText=t=>labels.push(t);drawStageIntro();assert.equal(labels.length,0);
beginPointer({clientX:200,clientY:400});assert(!drag && !bodyTap);assert(!canScrollStage());
assert.equal(featureHelpSeen.heart,false,'Mark seen only when dismissed');
ui.featureHelpDialog.onclick();assert(!featureHelpOpen && !ui.featureHelpDialog.open);
assert.deepEqual(readFeatureHelpSeen(),{heart:true,hazard:false});
advanceCameraIntro(clock);drawStageIntro();assert(labels.some(t=>t.startsWith('STAGE')));
clock+=999;advanceCameraIntro(clock);assert(cameraIntro);clock++;advanceCameraIntro(clock);assert(!cameraIntro);assert.equal(runTimeMs(),0);
showStageHelp();assert(!featureHelpOpen,'Do not repeat a heart explanation');
reset(1);holds.push({type:'hazard'});showStageHelp();assert.deepEqual(pendingFeatureHelp,['hazard']);
assert(ui.featureHelpContent.innerHTML.includes('追加で1消費'));assert(ui.featureHelpContent.innerHTML.includes('保持し続ける'));
ui.featureHelpDialog.events.cancel({preventDefault(){}});assert(!featureHelpOpen);assert(readFeatureHelpSeen().hazard);
courseMode='prototype';reset(1);hearts=[{}];holds.push({type:'hazard'});showStageHelp();assert(!featureHelpOpen,'Seen items shared across courses');
featureHelpSeen={heart:false,hazard:false};showStageHelp();assert.deepEqual(pendingFeatureHelp,['heart','hazard']);
showLevelMap();assert(!featureHelpOpen && !ui.featureHelpDialog.open);assert(!featureHelpSeen.heart,'Leaving without acknowledging does not mark seen');
reset(1);hearts=[{}];holds.push({type:'hazard'});showStageHelp();
const savedSet=storage.setItem;storage.setItem=()=>{throw Error('blocked');};assert.doesNotThrow(dismissStageHelp);assert(featureHelpSeen.heart && featureHelpSeen.hazard);storage.setItem=savedSet;
showStageHelp();assert(!featureHelpOpen,'Remember within session when storage blocked');
data[FEATURE_HELP_KEY]='bad json';assert.deepEqual(readFeatureHelpSeen(),{heart:false,hazard:false});
data[FEATURE_HELP_KEY]=JSON.stringify({heart:'true',hazard:1});assert.deepEqual(readFeatureHelpSeen(),{heart:false,hazard:false});
const savedGet=storage.getItem;storage.getItem=()=>{throw Error('blocked');};assert.deepEqual(readFeatureHelpSeen(),{heart:false,hazard:false});storage.getItem=savedGet;
data[FEATURE_HELP_KEY]=JSON.stringify({heart:true,hazard:true});
`)(assert,storage,data);
new Function('assert',env+source+`
assert.deepEqual(featureHelpSeen,{heart:true,hazard:true});reset(1);hearts=[{}];holds.push({type:'hazard'});showStageHelp();assert(!featureHelpOpen,'Seen state survives a fresh launch');
`)(assert);
console.log('PASS first encounters: actual presence, combined/separate items, input/camera/title/timer pause, tap/Escape continuation, full intro, cross-course persistence, interrupted flow, reload and blocked/invalid storage');
} finally {
 if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;
}
