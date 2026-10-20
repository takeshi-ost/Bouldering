const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!/stageItem[123]|stage-start-items/.test(html));
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
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
startCourse('existing');const initialLives=lives.count,initialAttempt=lifeAttemptId,initialHeight=HEIGHT;
const initialState=JSON.stringify({level,difficulty,courseMode,dailyRun,holds,route,HEIGHT,initialGrips,densityStats,committed,startGrips,moveCount}),originalGenerator=stageGenerator;
assert.equal(openStageStart(2),false);assert.equal(openStageStart(1.5),false);
assert(openStageStart(1));assert(ui.stageStartDialog.open);assert.equal(state,'map');
assert.equal(ui.stageStartTitle.textContent,'STAGE 1');assert.equal(ui.stageStartDifficulty.textContent,'EASY');assert.equal(ui.stageStartLength.textContent,'ショート');
assert.equal((ui.stageStartLives.innerHTML.match(/class="life-player"/g)||[]).length,initialLives);
assert.equal(lives.count,initialLives);assert.equal(lifeAttemptId,initialAttempt);assert.equal(HEIGHT,initialHeight);assert.equal(stageGenerator,originalGenerator);assert.equal(JSON.stringify({level,difficulty,courseMode,dailyRun,holds,route,HEIGHT,initialGrips,densityStats,committed,startGrips,moveCount}),initialState);
assert(!openStageStart(1));assert(!selectStage(1));ui.mapSettingsButton.onclick();assert(!settingsOpen);
ui.stageStartDialog.events.click({target:ui.stageStartTitle,clientX:10,clientY:10});assert(ui.stageStartDialog.open);
ui.closeStageStart.onclick();assert(!ui.stageStartDialog.open && !stageStartContext);assert.equal(lives.count,initialLives);
assert(openStageStart(1));
ui.stageStartDialog.events.click({target:ui.stageStartDialog,clientX:-1,clientY:-1});assert(!stageStartContext);
assert(openStageStart(1));let canceled=false;ui.stageStartDialog.events.cancel({preventDefault(){canceled=true;}});assert(canceled && !stageStartContext);
stageProgress.existing.cleared=40;
for(const [n,length,label] of [[2,'ミドル','EASY'],[5,'ロング','NORMAL'],[20,'ロング','NORMAL'],[40,'ロング','HARD']]) {
 assert(openStageStart(n));assert.equal(ui.stageStartLength.textContent,length);assert.equal(ui.stageStartDifficulty.textContent,label);assert.match(ui.stageStartStamina.textContent,/^[0-9]{2,}$/);closeStageStart();
}
let pulsing=false;const button={classList:{toggle(_,on){pulsing=on;}}};
assert(openStageStart(1,false,button));assert(pulsing && !ui.stageStartDialog.open);assert.equal(timers.at(-1).ms,140);
timers.at(-1).fn();assert(ui.stageStartDialog.open);ui.stageStartButton.onclick();
assert.equal(state,'playing');assert.equal(level,1);assert(!stageStartContext && !ui.stageStartDialog.open && !pulsing);assert(lives.inProgress);assert.equal(stamina,routeStamina(route));assert.equal(ui.stageStartStamina.textContent,String(stamina).padStart(2,'0'));
const attempt=lifeAttemptId;ui.stageStartButton.onclick();assert.equal(lifeAttemptId,attempt,'Double Start must not restart');
showLevelMap();lives.count=0;lives.recoveryAt=Date.now();
assert(openStageStart(1));assert.match(ui.stageStartLives.innerHTML,/30:00/);
lives.recoveryAt=Date.now()-LIFE_RECOVERY_MS;refreshLives();assert.equal(lives.count,1);assert.match(ui.stageStartLives.innerHTML,/life-player/);
lives.count=0;lives.recoveryAt=Date.now();refreshLives();assert.equal(state,'map');assert(!lifePrompt);ui.stageStartButton.onclick();assert.equal(state,'life-prompt');assert(!ui.stageStartDialog.open);ui.lifeCancel.onclick();assert.equal(state,'map');assert.equal(lives.count,0);
assert(!openStageStart(99,true));setDebugMode(true);assert(openStageStart(1,true));ui.stageStartButton.onclick();assert.equal(state,'playing');assert(debugAttempt);assert.equal(lives.count,0);
showLevelMap();assert(openStageStart(1,false,button));const stale=timers.at(-1).fn;showTitleScreen();stale();assert(!stageStartContext && !ui.stageStartDialog.open);assert.equal(state,'choosing');
startCourse('existing');stageProgress.existing.cleared=21;lives.count=3;lives.recoveryAt=null;
const hopPreview=stagePreview;let hopPreviewCalls=0;stagePreview=(...args)=>{hopPreviewCalls++;return hopPreview(...args);};
showLevelMap({advanceFrom:20});advanceLevelMap(100);advanceLevelMap(750);assert.equal(hopPreviewCalls,0,'Arrival must paint before stamina calculation');
assert.equal(mapSelected,21);assert.equal(mapPage,1);assert.equal(stageStartContext.n,21);assert(!ui.stageStartDialog.open);assert.equal(timers.at(-1).ms,500);
assert(!openStageStart(20));ui.mapPrev.onclick();assert.equal(mapPage,1);
timers.at(-1).fn();assert.equal(hopPreviewCalls,1);stagePreview=hopPreview;assert(ui.stageStartDialog.open);assert.equal(ui.stageStartTitle.textContent,'STAGE 21');assert.equal(state,'map');
ui.stageStartButton.onclick();assert.equal(level,21);assert.equal(state,'playing');
showLevelMap({advanceFrom:20});advanceLevelMap(1000);advanceLevelMap(1650);const delayedNext=timers.at(-1).fn;showTitleScreen();delayedNext();assert(!ui.stageStartDialog.open && !stageStartContext);
console.log('PASS stage start: correct stage/difficulty/length, no item elements, close/backdrop/Escape no life cost, visible tap pulse, Start-only launch and life gate, double-start guard, debug launch and canceled delayed opening');
`)(assert);
