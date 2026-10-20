const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const storage={};const globalThis={localStorage:{getItem:k=>storage[k]??null,setItem:(k,v)=>storage[k]=v}};
const elements={},timers=[];
const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},events:{},focus(){},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];},contains(){return true;},
 addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
function setTimeout(fn,ms){timers.push({fn,ms});return timers.length;}
function clearTimeout(id){timers[id-1]=null;}
`;
new Function('assert',env+source+`
assert.equal(heartItems,20);assert.equal(readHeartItems(),20);
startCourse('existing');assert(openStageStart(1));
const base=stagePreview(1).stamina;
assert.equal(stageStartContext.hearts,0);assert(ui.stageHeartReset.disabled);assert.equal(ui.stageHeartOwned.textContent,'所持 20個');
ui.stageHeartCount.onclick();ui.stageHeartCount.onclick();assert.equal(ui.stageHeartOwned.textContent,'所持 18個');ui.stageHeartReset.onclick();assert.equal(stageStartContext.hearts,0);assert.equal(ui.stageHeartOwned.textContent,'所持 20個');ui.stageHeartCount.onclick();assert.equal(stageStartContext.hearts,1);
assert.equal(ui.stageStartStamina.textContent,String(base).padStart(2,'0'));
setStageHeartItems(999);assert.equal(stageStartContext.hearts,20);assert(ui.stageHeartCount.disabled);assert.equal(ui.stageHeartOwned.textContent,'所持 0個');ui.stageHeartReset.onclick();assert.equal(stageStartContext.hearts,0);assert.equal(ui.stageHeartOwned.textContent,'所持 20個');
setStageHeartItems(-1);assert.equal(stageStartContext.hearts,0);
setStageHeartItems(NaN);assert.equal(stageStartContext.hearts,0);
setStageHeartItems(3);assert.equal(stageStartContext.hearts,3);
closeStageStart();assert.equal(heartItems,20);assert.equal(readHeartItems(),20);
assert(openStageStart(1));assert.equal(stageStartContext.hearts,0);setStageHeartItems(3);ui.stageStartButton.onclick();
assert.equal(state,'playing');assert.equal(stamina,base+3);assert.equal(heartItems,17);assert.equal(readHeartItems(),17);
ui.stageStartButton.onclick();assert.equal(heartItems,17,'Double start never charges twice');
ui.restart.onclick();assert.equal(stamina,base,'Restart drops the bonus');assert.equal(heartItems,17);
showLevelMap();lives.count=3;assert(openStageStart(1));setStageHeartItems(2);ui.stageStartButton.onclick();assert.equal(stamina,base+2);
finish(false);ui.retry.onclick();assert.equal(stamina,base,'Retry drops the bonus');assert.equal(heartItems,15);
showLevelMap();lives.count=3;assert(openStageStart(1));setStageHeartItems(1);ui.stageStartButton.onclick();finish(true);
showLevelMap();assert(openStageStart(2));assert.equal(stageStartContext.hearts,0);ui.stageStartButton.onclick();assert.equal(stamina,routeStamina(route),'Clear never carries bonus to the next stage');assert.equal(heartItems,14);
showLevelMap();lives.count=0;lives.recoveryAt=Date.now();assert(openStageStart(1));setStageHeartItems(4);ui.stageStartButton.onclick();
assert.equal(state,'life-prompt');assert.equal(heartItems,14);ui.lifeCancel.onclick();assert.equal(heartItems,14);
assert(openStageStart(1));assert.equal(stageStartContext.hearts,0);setStageHeartItems(4);ui.stageStartButton.onclick();
grantLife();ui.lifeWatchAd.onclick();assert.equal(state,'playing');assert.equal(stamina,base+4);assert.equal(heartItems,10);
showLevelMap();lives.count=3;assert(openStageStart(1));setStageHeartItems(2);
const prepare=prepareCurrentStage,report=console.error;prepareCurrentStage=()=>{throw Error('intentional generation failure');};console.error=()=>{};
ui.stageStartButton.onclick();prepareCurrentStage=prepare;console.error=report;assert.equal(state,'map');assert.equal(heartItems,10,'Failed generation must not spend hearts');
assert(openStageStart(1));setStageHeartItems(10);ui.stageStartButton.onclick();assert.equal(heartItems,0);assert.equal(readHeartItems(),0);showLevelMap();assert(openStageStart(1));assert(ui.stageHeartCount.disabled);assert(ui.stageHeartReset.disabled);closeStageStart();
const profile=dailyProfile(localToday());assert(launchDailyAttempt(profile,1));assert.equal(stamina,routeStamina(route),'Daily receives no previous bonus');assert.equal(heartItems,0);
for(const value of ['-1','1.5','null','"20"','broken']){storage[HEART_ITEMS_KEY]=value;assert.equal(readHeartItems(),20);}
globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
assert.equal(readHeartItems(),20);assert.doesNotThrow(saveHeartItems);
console.log('PASS heart items: initial/persisted inventory, quantity bounds/preview, cancel/life gate/failure, once-only spend, retry/clear/map/daily isolation, empty inventory and unavailable storage');
`)(assert);
