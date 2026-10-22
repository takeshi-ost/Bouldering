const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const title=html.slice(html.indexOf('id="titleScreen"'),html.indexOf('<section id="characterEditor"'));
assert(!/<(?:button|input|label)\b/.test(title));
assert(!/id="(?:existingCourse|editCharacter|debugMode)"/.test(html));
assert(html.indexOf('id="showHelp"')>html.indexOf('id="settingsDialog"'));
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={},frames=[],pendingImages=[];
const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},events:{},focus(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},
 addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};
class Image {decode(){return new Promise(resolve=>pendingImages.push(resolve));}}
function requestAnimationFrame(fn){if(fn.name!=='draw')frames.push(fn);}
`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
(async()=>{try{
await new Function('assert','data',env+source+`;return (async()=>{
assert.equal(state,'choosing');assert(!titleReady && ui.titleTap.hidden);
assert(ui.levelMap.inert && !ui.levelMap.hidden);assert.equal((ui.mapNodes.innerHTML.match(/data-level=/g)||[]).length,20);
assert.equal(ui.releaseVersion.textContent,'VERSION '+RELEASE_VERSION);assert.equal(ui.playerUuid.textContent,'UUID '+playerUuid);
assert.equal(readPlayerUuid(),playerUuid);assert.equal(data[PLAYER_UUID_KEY],playerUuid);
ui.titleScreen.onclick();assert.equal(state,'choosing');assert.equal(pendingImages.length,13);
const markup=ui.mapNodes.innerHTML;pendingImages.splice(0).forEach(resolve=>resolve());
for(let i=0;i<5;i++)await Promise.resolve();
assert(!titleReady && ui.titleTap.hidden);assert.equal(frames.length,1);
frames.shift()();assert(!titleReady);frames.shift()();await Promise.resolve();
assert(titleReady && !ui.titleTap.hidden);ui.titleScreen.onclick();
assert.equal(state,'map');assert(ui.titleScreen.hidden && !ui.levelMap.inert);assert.equal(ui.mapNodes.innerHTML,markup);
ui.mapSettingsButton.onclick();ui.showHelp.onclick();assert(ui.settingsDialog.open && ui.helpDialog.open);assert.equal(state,'map');
ui.closeHelp.onclick();assert(!ui.helpDialog.open && settingsOpen);ui.closeSettings.onclick();
assert(selectStage(1));cameraIntro=null;ui.settingsButton.onclick();ui.showHelp.onclick();assert(ui.helpDialog.open && settingsOpen);assert.equal(state,'playing');
ui.closeHelp.onclick();ui.closeSettings.onclick();showLevelMap();
ui.mapSettingsButton.onclick();ui.mapDebugMode.checked=true;ui.mapDebugMode.onchange();assert(!ui.prototypeCourse.hidden);
ui.prototypeCourse.onclick();assert.equal(courseMode,'prototype');assert.equal(state,'map');
showTitleScreen();assert.equal(courseMode,'existing');assert.equal(ui.playerUuid.textContent,'UUID '+playerUuid);assert(ui.titleTap.hidden);
console.log('PASS title: no controls, UUID/version, hidden prepared 20-stage map, asset + two-frame TAP gate, ignored early tap, reuse prepared markup, help from map/stage settings, debug course entrance, normal title return');
})();`)(assert,data);
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}})().catch(e=>{console.error(e);process.exitCode=1;});
