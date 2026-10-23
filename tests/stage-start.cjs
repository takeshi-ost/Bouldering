const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(!/stageItem[123]|stage-start-items/.test(html));
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={},timers=[];
const performance={now:()=>1000};
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
for(const [n,label] of [[2,'EASY'],[5,'NORMAL'],[20,'NORMAL'],[40,'HARD']]) {
 assert(openStageStart(n));assert.equal(ui.stageStartLength.textContent,{short:'ショート',medium:'ミドル',long:'ロング'}[stageLengthInfo(n).category]);assert.equal(ui.stageStartDifficulty.textContent,label);assert.match(ui.stageStartStamina.textContent,/^[0-9]{2,}$/);closeStageStart();
}
let pulsing=false;const button={classList:{toggle(_,on){pulsing=on;}}};
assert(openStageStart(1,false,button));assert(pulsing && !ui.stageStartDialog.open);assert.equal(timers.at(-1).ms,140);
timers.at(-1).fn();assert(ui.stageStartDialog.open);ui.stageStartButton.onclick();
assert.equal(state,'playing');assert.equal(level,1);assert(!stageStartContext && !ui.stageStartDialog.open && !pulsing);assert(lives.inProgress);assert.equal(stamina,routeStamina(route));assert.equal(ui.stageStartStamina.textContent,String(stamina).padStart(2,'0'));
const attempt=lifeAttemptId;ui.stageStartButton.onclick();assert.equal(lifeAttemptId,attempt,'Double Start must not restart');
showLevelMap();lives.count=0;lives.recoveryAt=Date.now();
assert(openStageStart(1));assert.equal(state,'life-prompt');assert(ui.lifeDialog.open);assert(!ui.stageStartDialog.open && !stageStartContext);
assert(!openStageStart(1));assert(!selectStage(1));ui.lifeCancel.onclick();assert.equal(state,'map');assert(!stageStartContext && !ui.stageStartDialog.open);
assert(openStageStart(1));ui.lifeWatchAd.onclick();assert.equal(state,'ad');assert(!ui.stageStartDialog.open);assert(!lives.inProgress);
advanceDummyAd(dummyAd.start+10000);assert(completeDummyAd());
assert.equal(state,'map');assert.equal(lives.count,1);assert(ui.stageStartDialog.open);assert.equal(stageStartContext.n,1);assert(!lives.inProgress);
closeStageStart();assert.equal(lives.count,1);
// Natural recovery while the offer is open skips the ad and still opens stage confirmation.
lives.count=0;lives.recoveryAt=Date.now();assert(openStageStart(1));
lives.recoveryAt=Date.now()-LIFE_RECOVERY_MS;refreshLives();assert.equal(lives.count,1);
ui.lifeWatchAd.onclick();assert.equal(state,'map');assert(ui.stageStartDialog.open);assert(!dummyAd);closeStageStart();
// A last-moment depletion repeats confirmation after recovery instead of launching.
assert(openStageStart(1));lives.count=0;lives.recoveryAt=Date.now();ui.stageStartButton.onclick();assert.equal(state,'life-prompt');assert(!ui.stageStartDialog.open);ui.lifeCancel.onclick();assert.equal(state,'map');
assert(!openStageStart(99,true));setDebugMode(true);assert(openStageStart(1,true));ui.stageStartButton.onclick();assert.equal(state,'playing');assert(debugAttempt);assert.equal(lives.count,0);
showLevelMap();lives.count=3;lives.recoveryAt=null;assert(openStageStart(1,false,button));const stale=timers.at(-1).fn;showTitleScreen();stale();assert(!stageStartContext && !ui.stageStartDialog.open);assert.equal(state,'choosing');
startCourse('existing');stageProgress.existing.cleared=21;lives.count=3;lives.recoveryAt=null;
const hopPreview=stagePreview;let hopPreviewCalls=0;stagePreview=(...args)=>{hopPreviewCalls++;return hopPreview(...args);};
showLevelMap({advanceFrom:20});advanceLevelMap(100);advanceLevelMap(750);assert.equal(hopPreviewCalls,0,'Arrival must paint before stamina calculation');
assert.equal(mapSelected,21);assert.equal(mapPage,1);assert.equal(stageStartContext.n,21);assert(!ui.stageStartDialog.open);assert.equal(timers.at(-1).ms,500);
assert(!openStageStart(20));ui.mapPrev.onclick();assert.equal(mapPage,1);
timers.at(-1).fn();assert.equal(hopPreviewCalls,1);stagePreview=hopPreview;assert(ui.stageStartDialog.open);assert.equal(ui.stageStartTitle.textContent,'STAGE 21');assert.equal(state,'map');
ui.stageStartButton.onclick();assert.equal(level,21);assert.equal(state,'playing');
showLevelMap({advanceFrom:20});advanceLevelMap(1000);advanceLevelMap(1650);const delayedNext=timers.at(-1).fn;showTitleScreen();delayedNext();assert(!ui.stageStartDialog.open && !stageStartContext);
// Cleared-stage preview uses saved player data and freshly selected opponents.
startCourse('existing');stageProgress.existing.cleared=1;
stageRecords.existing[1]={moves:5,timeMs:12345,stars:3,version:COURSE_VERSION};
const savedSource=currentStageScores;let reads=0;
currentStageScores=(n,mode,expected)=>{
 assert.equal(n,1);assert.equal(mode,'existing');reads++;
 return Array.from({length:8},(_,i)=>({name:'Fresh'+reads+'-'+i,moves:reads===1?1:20,timeMs:1000+i,avatar:i}));
};
assert(openStageStart(1));assert.equal(reads,1);
assert(!ui.stageStartStars.hidden && !ui.stageStartRanking.hidden);
assert.equal(ui.stageStartStars.textContent,'⭐️⭐️⭐️');
assert.equal((ui.stageStartLeaderboard.innerHTML.match(/class="score-row/g)||[]).length,5);
assert(ui.stageStartLeaderboard.innerHTML.includes('score-rank">9</span>'));
assert(ui.stageStartLeaderboard.innerHTML.includes('00:12:34'));
assert(ui.stageStartLeaderboard.innerHTML.includes('Fresh1-0'));
setStageHeartItems(1);assert.equal(reads,1,'Item adjustments do not refetch scores');
closeStageStart();assert(openStageStart(1));assert.equal(reads,2);
assert(ui.stageStartLeaderboard.innerHTML.includes('Fresh2-0'));
assert(!ui.stageStartLeaderboard.innerHTML.includes('Fresh1-0'));
assert(ui.stageStartLeaderboard.innerHTML.startsWith('<li class="score-row is-player"'));
assert.deepEqual(stageRecords.existing[1],{moves:5,timeMs:12345,stars:3,version:COURSE_VERSION});
closeStageStart();assert(openStageStart(2));assert.equal(reads,2);
assert(ui.stageStartRanking.hidden && ui.stageStartStars.hidden);assert.equal(ui.stageStartLeaderboard.innerHTML,'');
closeStageStart();currentStageScores=savedSource;
console.log('PASS stage start: correct stage/difficulty/length, no item elements, close/backdrop/Escape no life cost, visible tap pulse, Start-only launch and life gate, double-start guard, debug launch and canceled delayed opening');
`)(assert);
