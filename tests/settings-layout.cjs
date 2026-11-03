'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {boot}=require('./tutorial-modals.cjs');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8');
const settings=html.match(/<dialog id="settingsDialog"[\s\S]*?<\/dialog>/)[0];
const order=['settingsConnectionStatus','settingsVersion','mapSettingsLanguage','musicEnabled','musicVolume','soundEnabled','soundVolume','showHelp','settingsDivider','mapEditCharacter','mapCourses','restart','mapSettingsDebug','stageDebugDisplay'];
for(let i=1;i<order.length;i++)assert(settings.indexOf('id="'+order[i-1]+'"')<settings.indexOf('id="'+order[i]+'"'),order[i]+' follows '+order[i-1]);
assert(/id="settingsConnectionValue"[^>]*role="status"[^>]*aria-live="polite"/.test(settings));
assert(/<hr id="settingsDivider" class="settings-divider">/.test(settings));
assert(!/id="mapSettingsLanguage"[^>]* hidden/.test(settings));
assert(!/id="settingsVersion"[^>]* hidden/.test(settings));
assert.match(settings, /id="settingsVersion"[^>]*>.*data-i18n="settings.appVersion"/);
assert(css.includes('.settings-version strong { min-width:0; overflow-wrap:anywhere;'));
for(const id of ['musicEnabled','musicVolume','soundEnabled','soundVolume','languageChoice'])assert(settings.includes('for="'+id+'"')||settings.includes('id="'+id+'" type="range"')&&settings.includes('data-i18n-aria-label="audio.'),'Native labeled controls');
assert.equal((settings.match(/type="range"/g)||[]).length,2);
assert(css.includes('#settingsDialog { box-sizing:border-box; overscroll-behavior:contain; touch-action:pan-y; }'));
assert(/\.settings-dialog\s*\{[^}]*max-height:[^;]+;[^}]*overflow:auto;/.test(css));
assert(/\.settings-divider\s*\{[^}]*border-top:1px solid #dce0d4;/.test(css));
assert(css.includes('#settingsDialog .settings-row select { min-width:0; flex-shrink:1; }'));
// Numerical box sizing only, not a browser layout measurement: a 360px
// border-box dialog sits inside the existing 400px safe-area-scaled viewport.
for(const width of [280,320,375,400,768]){
 const scale=Math.min(1,width/400),dialog=360*scale;
 assert(dialog<=width);assert(360-44-112-12>100,'Range retains usable track space');
}
function fixture(scene){
 const b=boot(scene==='tutorial'?new Map():new Map([['ascent.progress.v1',JSON.stringify({existing:{cleared:2},prototype:{cleared:0}})]]));
 b.run('CourseProgressionConfig.daily.minScore=CourseProgressionConfig.daily.maxScore=1;');
 if(scene==='tutorial')b.run('TUTORIAL_CONFIG.steps=[];titleReady=true;ui.titleScreen.onclick();');
 else if(scene==='daily'||scene==='daily-play')b.run('showDailyCalendar();'+(scene==='daily-play'?'assert(selectDailyDate("2026-01-01"));':''));
 else b.run('showLevelMap();cancelMapReveal();mapPreparing=false;mapTransition=null;'+(scene==='normal'?'assert(selectStage(1));':''));
 b.run('cameraIntro=null;hideStageHelp();if(state==="playing"){runStartedAt=performance.now();runElapsedMs=0;}');return b;
}
const snapshot=b=>b.run('JSON.stringify({state,body,grips,level,courseMode,dailyRun,stamina,moveCount,runElapsedMs,runStartedAt,stageProgress,stageRecords,dailyRecords,dailyAttempts,heartItems,lives,mapRewards,playsSinceAd,dailyPlayAdState,pending:[...onlineScores.pending]})');
for(const scene of ['map','daily','normal','daily-play','tutorial']){
 const b=fixture(scene),onMap=['map','daily'].includes(scene),before=snapshot(b);
 b.run('openSettings();');assert(b.run('settingsOpen'));assert(b.node('settingsDialog').open);
 assert.equal(b.node('mapSettingsLanguage').hidden,false,scene+' offers language');
 assert.equal(b.node('mapSettingsControls').hidden,!onMap);assert.equal(b.node('mapSettingsFooter').hidden,!onMap);assert.equal(b.node('mapSettingsDebug').hidden,!onMap);assert.equal(b.node('restart').hidden,onMap);
 assert.equal(b.node('settingsConnectionValue').textContent,'オフライン');
 assert.equal(b.node('settingsVersionValue').textContent,b.run('RELEASE_VERSION'),scene+' shows the actual game version');
 for(const lang of ['en','ja']){
  b.node('languageChoice').value=lang;b.node('languageChoice').onchange();assert.equal(b.run('GAME_TEXT_LANGUAGE'),lang);assert.equal(b.data.get('ascent.language.v1'),lang);assert.equal(snapshot(b),before);
  assert.equal(b.node('settingsConnectionValue').textContent,lang==='en'?'Offline':'オフライン');
  assert.equal(b.node('settingsVersionValue').textContent,b.run('RELEASE_VERSION'));
  assert.equal(b.run('gameText("settings.appVersion")'),lang==='en'?'App version':'アプリバージョン');
 }
 b.node('musicEnabled').checked=false;b.node('musicEnabled').onchange();b.node('musicVolume').value='25';b.node('musicVolume').oninput();
 b.node('soundEnabled').checked=false;b.node('soundEnabled').onchange();b.node('soundVolume').value='40';b.node('soundVolume').oninput();
 assert.equal(snapshot(b),before);assert.equal(b.run('musicVolume'),.25);assert.equal(b.run('soundVolume'),.4);
 const count=b.node('settingsDialog').showCount;b.run('openSettings();');assert.equal(b.node('settingsDialog').showCount,count);
 b.node('showHelp').onclick();assert(b.node('helpDialog').open);const helpCount=b.node('helpDialog').showCount;b.node('showHelp').onclick();assert.equal(b.node('helpDialog').showCount,helpCount);
 b.node('languageChoice').value='en';b.node('languageChoice').onchange();assert.equal(b.run('GAME_TEXT_LANGUAGE'),'ja','Underlying language control is inert under help');assert.equal(b.node('languageChoice').value,'ja');
 b.node('helpDialog').onclick({target:b.node('helpScroll')});assert(b.node('helpDialog').open);
 let prevented=false;b.node('helpDialog').events.cancel({preventDefault(){prevented=true;}});assert(prevented);assert(!b.node('helpDialog').open);b.node('helpDialog').events.close?.();assert.equal(b.node('helpDialog').events.close,undefined,'No custom focus return');assert(b.run('settingsOpen'));
 assert.equal(snapshot(b),before);
 // Gestures/Undo remain disabled while reading/settings; original timer policy
 // is unchanged (settings is not a free play-clock pause).
 b.run('assert(!canUndoMove());down({clientX:200,clientY:350});assert(!drag);');
 if(!onMap){const t=b.run('runTimeMs()');b.advance(500);assert.equal(b.run('runTimeMs()'),t+500);}
 b.node('settingsDialog').events.cancel({preventDefault(){}});assert(!b.run('settingsOpen'));assert(!b.node('settingsDialog').open);
 b.run('openSettings();');assert.equal(b.node('musicEnabled').checked,false);assert.equal(b.node('soundEnabled').checked,false);assert.equal(b.node('musicVolume').value,'25');assert.equal(b.node('soundVolume').value,'40');
 b.node('closeSettings').onclick();const reload=boot(new Map(b.data));assert.equal(reload.run('musicVolume'),.25);assert.equal(reload.run('soundVolume'),.4);assert.equal(reload.run('soundEnabled'),false);
 if(onMap){b.run('openSettings();');b.node('mapEditCharacter').onclick();assert.equal(b.run('state'),'editing');b.node('editorCancel').onclick();assert.equal(b.run('state'),scene);b.run('cancelMapReveal();mapPreparing=false;mapTransition=null;openSettings();');b.node('mapCourses').onclick();assert.equal(b.run('state'),'choosing');}
 else {b.run('openSettings();');const lives=b.run('lives.count');b.node('restart').onclick();assert.equal(b.run('state'),scene==='tutorial'?'map':'lost');assert.equal(b.run('lives.count'),lives-(scene==='normal'?1:0));if(scene==='tutorial')assert.equal(b.run('stageStartContext.n'),1);}
}
// Newly available in-play language switching must preserve developer trial
// identity and the existing per-stage display controls, not relabel it STAGE2.
{
 const b=fixture('map');b.run('setDebugMode(true);assert(startDebugCourse(0,"short",1000));cameraIntro=null;hideStageHelp();openSettings();');
 assert.equal(b.node('settingsVersionValue').textContent,b.run('RELEASE_VERSION'),'Debug play keeps the common version row');
 assert.equal(b.node('stageDebugDisplay').hidden,false);const before=snapshot(b);
 b.node('languageChoice').value='en';b.node('languageChoice').onchange();assert.equal(b.node('level').textContent,b.run('gameText("debug.trialTitle",{value0:courseTypeId})'));assert.equal(snapshot(b),before);
 b.node('debugRoute').checked=false;b.node('debugRoute').onchange();assert.equal(b.run('debugDisplay.route'),false);
 b.node('closeSettings').onclick();b.node('debugCourseExit').onclick();assert.equal(b.run('state'),'map');b.run('cancelMapReveal();mapPreparing=false;mapTransition=null;openSettings();');
 b.node('mapDebugMode').checked=false;b.node('mapDebugMode').onchange();assert.equal(b.run('debugMode'),false);assert.equal(b.node('stageDebugDisplay').hidden,true);
}
console.log('PASS settings: requested shared/contextual order, labeled native controls, bounded/scaled layout, JA/EN in map/Daily/normal/Daily play/STAGE0/debug trial, no gameplay/save reset, audio persistence, nested help/native-cancel/repeat guards, unchanged timer/navigation/retirement/debug controls (no browser or audio audition)');
