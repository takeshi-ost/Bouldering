const originalTimezone=process.env.TZ;process.env.TZ='UTC';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
let nowIso='2026-10-17T23:59:59.000Z',clock=1000;
const NativeDate=globalThis.Date;const Date=class extends NativeDate {constructor(...args){super(...(args.length?args:[nowIso]));}static now(){return new NativeDate(nowIso).getTime();}};
const performance={now:()=>clock};
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},addEventListener(k,fn){this.events[k]=fn;},setAttribute(){},contains(){return true;},
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
assert.equal(utcToday(),'2026-10-17');assert.equal(utcToday(new Date('2026-10-18T08:00:00+09:00')),'2026-10-17');
for(const bad of ['',null,'2026-2-02','2026-02-30','2025-02-29','2026-13-01','2026-00-01','2026-10-00','2026-10-17x','__proto__'])assert(!validDailyDate(bad));
assert(validDailyDate('2024-02-29'));assert.deepEqual(dailyProfile('2026-10-17'),dailyProfile('2026-10-17'));
const counts={0:0,1:0,2:0,3:0};for(let i=0;i<366;i++){const key=utcToday(new Date(Date.UTC(2024,0,1+i)));counts[dailyProfile(key).difficulty]++;}
for(const count of Object.values(counts))assert(count>65 && count<120,'Unbalanced daily categories');
startCourse('existing');ui.openDaily.onclick();assert.equal(state,'daily');assert(ui.levelMap.hidden && !ui.dailyCalendar.hidden && ui.hud.hidden);assert(!canScrollStage());
assert(ui.dailyGrid.innerHTML.includes('data-date="2026-10-17"'));assert(!ui.dailyGrid.innerHTML.includes('data-date="2026-10-18"'));assert(ui.dailyNext.disabled);assert(ui.dailyGrid.innerHTML.includes('data-calendar-date="2026-10-18"'));
assert(!selectDailyDate('2026-10-18'));assert(!selectDailyDate('2026-02-30'));assert.equal(state,'daily');
nowIso='2026-10-18T00:00:00Z';refreshDailyCalendar();assert(ui.dailyGrid.innerHTML.includes('data-date="2026-10-18"'));assert(!ui.dailyGrid.innerHTML.includes('data-date="2026-10-19"'));assert(ui.dailyGrid.innerHTML.includes('data-calendar-date="2026-10-19"'));assert(!ui.dailyGrid.innerHTML.includes('data-calendar-date="2026-10-18"'));
dailyMonth='2024-02';renderDailyCalendar();assert.equal((ui.dailyGrid.innerHTML.match(/data-date=/g)||[]).length,29);
ui.dailyPrev.onclick();assert.equal(dailyMonth,'2024-01');ui.dailyNext.onclick();assert.equal(dailyMonth,'2024-02');
nowIso='2026-12-31T23:59:59Z';dailyMonth='2026-12';renderDailyCalendar();nowIso='2027-01-01T00:00:00Z';refreshDailyCalendar();assert.equal(dailyMonth,'2027-01');assert.equal((ui.dailyGrid.innerHTML.match(/data-date=/g)||[]).length,1);
nowIso='2026-10-17T12:00:00Z';dailyMonth='2026-01';renderDailyCalendar();
function finishAds(){if(state==='ad'){clock+=10000;advanceDummyAd(clock);assert(completeDummyAd());}}
const normalBefore=JSON.stringify({stageProgress,stageRecords});
const dates=new Map();for(let day=1;day<=31;day++){const key='2026-01-'+String(day).padStart(2,'0');if(!dates.has(dailyProfile(key).difficulty))dates.set(dailyProfile(key).difficulty,key);}
assert.equal(dates.size,4);
const snapshot=()=>JSON.stringify({holds,route,hearts,HEIGHT,initialGrips,stamina,seed:dailyRun.seed});
function play(i){camera=clamp(body.y-H*.6,0,HEIGHT-H);const e=p=>({clientX:p.x,clientY:p.y-camera});down(e(body));move(e(route[i]));release();assert.equal(moveCount,i);}
for(const [rating,key] of dates){
 assert(selectDailyDate(key));finishAds();assert.equal(level,DIFFICULTY_RULES[rating].referenceStage);assert.equal(difficulty,rating);assert.equal(courseMode,'existing');assert(dailyRun && ui.dailyCalendar.hidden);assert(ui.level.textContent.startsWith('DAILY'));
 const first=snapshot();restartInput(level);assert.equal(snapshot(),first,'Daily retry changed the date seed');
 while(featureHelpOpen)dismissStageHelp();advanceCameraIntro(clock);clock+=10000;advanceCameraIntro(clock);assert(!cameraIntro);
 if(rating<2)assert(!holds.some(h=>h.type==='hazard'));
 if(rating===3){const ratio=holds.filter(h=>h.type==='hazard').length/holds.length;assert(ratio>=.3 && ratio<=.5);}
 for(let i=1;i<route.length;i++){clock+=100;play(i);}
 assert.equal(state,'won');assert.equal(dailyRecords[key].stars,2);assert(!ui.next.hidden && ui.retry.hidden);assert.equal(ui.next.textContent,'カレンダーへ');
 assert.equal(JSON.stringify({stageProgress,stageRecords}),normalBefore,'Daily clear polluted normal progress');
 assert.equal(dailyRecords[key].moves,moveCount);assert(ui.overlay.open);
 ui.next.onclick();finishAds();assert.equal(state,'daily');assert(!dailyRun && ui.overlay.hidden && !ui.dailyCalendar.hidden);assert(ui.dailyGrid.innerHTML.includes('daily-stars'));
 assert(selectDailyDate(key));finishAds();assert.equal(snapshot(),first,'Re-entering changed the daily course');while(featureHelpOpen)dismissStageHelp();
 finish(false);assert(!ui.retry.hidden && !ui.next.hidden);ui.next.onclick();finishAds();assert.equal(state,'daily');assert.equal(dailyRecords[key].stars,2);
}
assert.deepEqual(readDailyRecords(),dailyRecords);
const key=dates.get(0);assert(selectDailyDate(key));finishAds();moveCount=route.length-2;runElapsedMs=100;recordDailyClear();assert.equal(dailyRecords[key].stars,3);moveCount=route.length+2;recordDailyClear();assert.equal(dailyRecords[key].stars,3);
const savedSet=storage.setItem;storage.setItem=()=>{throw Error('full');};assert.doesNotThrow(recordDailyClear);storage.setItem=savedSet;
showDailyCalendar();ui.dailyBack.onclick();assert.equal(state,'map');assert.equal(courseMode,'existing');assert.equal(JSON.stringify({stageProgress,stageRecords}),normalBefore);
// The calendar always generates the public course, then returns to its original map.
startCourse('prototype');ui.openDaily.onclick();assert(selectDailyDate(key));finishAds();assert.equal(courseMode,'existing');showDailyCalendar();ui.dailyBack.onclick();assert.equal(courseMode,'prototype');assert.equal(state,'map');
// An interrupted generation reports an error on the calendar, without normal progress changes.
ui.openDaily.onclick();const originalReset=reset;reset=()=>{throw Error('fixture failure');};const oldError=console.error;console.error=()=>{};setDailyEntryAdPending(false);dailyAttempts[key]=2;assert(!selectDailyDate(key));console.error=oldError;reset=originalReset;assert.equal(state,'daily');assert(!ui.dailyError.hidden && !dailyRun);
const saved=data[DAILY_RECORDS_KEY];data[DAILY_RECORDS_KEY]='{bad';assert.deepEqual(readDailyRecords(),{});
data[DAILY_RECORDS_KEY]=JSON.stringify({'2026-02-30':{moves:1,timeMs:2,stars:3},'2026-01-01':{moves:0,timeMs:2,stars:3},'2026-01-02':{moves:1,timeMs:-1,stars:3},'2026-01-03':{moves:1,timeMs:2,stars:4}});assert.deepEqual(readDailyRecords(),{});data[DAILY_RECORDS_KEY]=saved;
const savedGet=storage.getItem;storage.getItem=()=>{throw Error('blocked');};assert.deepEqual(readDailyRecords(),{});storage.getItem=savedGet;
// A rejected seed retries deterministically within its original category.
const originalPrepare=prepareStage,originalHazards=addHazardHolds;
dailyRun={...dailyProfile('2026-01-01'),returnCourse:'existing'};level=dailyRun.referenceStage;difficulty=dailyRun.difficulty;
let attempts=[];prepareStage=()=>{attempts.push(dailyRun.seed);if(dailyRun.seed===dailyRun.baseSeed)throw Error('first layout');};addHazardHolds=()=>{};
prepareCurrentStage();const accepted=dailyRun.seed;assert.equal(attempts.length,2);
attempts=[];prepareCurrentStage();assert.equal(dailyRun.seed,accepted);assert.equal(attempts.length,2);
attempts=[];prepareStage=()=>{attempts.push(dailyRun.seed);throw Error('no route');};assert.throws(prepareCurrentStage);assert.equal(attempts.length,16);
prepareStage=originalPrepare;addHazardHolds=originalHazards;leaveDailyRun();
console.log('PASS daily calendar: local midnight/year/leap boundaries, past/future cells, equal difficulty draw, real difficulty 0–3 date-seeded replay/clear, retry determinism, no normal-progress pollution, result/calendar returns, records/stars/storage errors');
`)(assert,storage,data);
// Local unlock dates never alter the selected date's UTC course seed.
for(const [zone,before,after] of [
 ['Asia/Tokyo','2026-10-31T14:59:59Z','2026-10-31T15:00:00Z'],
 ['America/Los_Angeles','2026-11-01T06:59:59Z','2026-11-01T07:00:00Z']
]) {
 process.env.TZ=zone;
 new Function('assert','before','after',env+source+`
 nowIso=before;startCourse('existing');showDailyCalendar({openFromMap:true});
 assert.equal(localToday(),'2026-10-31');assert.equal(dailyMonth,'2026-10');
 const seed=dailyProfile('2026-11-01');assert.equal(seed.baseSeed,20261101);
 nowIso=after;refreshDailyCalendar();assert.equal(localToday(),'2026-11-01');assert.equal(dailyMonth,'2026-11');
 assert(ui.dailyGrid.innerHTML.includes('data-date="2026-11-01"'));
 assert(!ui.dailyGrid.innerHTML.includes('data-date="2026-11-02"'));
 assert.deepEqual(dailyProfile('2026-11-01'),seed);
 assert(!ui.dailyToday.textContent.includes('UTC'));
 `)(assert,before,after);
}
process.env.TZ='UTC';
new Function('assert',env+source+`assert(Object.keys(dailyRecords).length===4);assert(Object.values(dailyRecords).some(r=>r.stars===3));`)(assert);
}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
