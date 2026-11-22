'use strict';
// The former whole-file freeze predated terms/analytics and explicitly prohibited
// any record/storage change. Preserve unrelated boundaries byte-for-byte and
// exercise the authorized record/consent boundaries through functional suites.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const read=file=>fs.readFileSync(file,'utf8');
const protectedFiles={
 'js/appearance.js':'97d112b38c0ee3a1bc78abb78a932aadd2f6141b8b07ba719fbbc35b29cbdbb8',
 'js/lives.js':'43566a05fc33a0ba6d071180f8ad86a775219064b30df1746847e85d69fdbd3b',
 'js/bgm.js':'f62ff99b237fa0765a81faa40c00cd0d1f04a00986aa000a7cae22bd63366449',
 'scripts/pages-storage.js':'6e3f3bf0f9abbfce8a080e1c0ffc2abfc9d9bae3ca759483da631840bdf02dae',
 'scripts/native-resume-adapter.cjs':'f527882bc56d5cae3549d0b897fd9c8b9bc0a4b069eb54170772947e51db629b',
 'scripts/native-resume-store.cjs':'8c11fb0dd6e8cb25cd3308c33fdb086246bd3e1d1cd36fb96cec843518be1337',
 'capacitor.config.json':'241eed1591ea9bbdd698d973ec9fe74802e186512f0c4f10b3de9377fb548863'
};
for(const [file,hash]of Object.entries(protectedFiles))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,'Unrelated boundary changed: '+file);
// Protect the existing audio paths while allowing only the new goal cue.
const originalAudio=read('js/audio.js')
 .replace(/^    goalClear:[^\n]+\n/gm,'')
 .replace("        if(SOUND_FILES[name]?.queueWhenSuspended!==false && (SOUND_NOTES[name] || SOUND_FILES[name]))\n            pendingSound={name,at:Date.now()};","        if(SOUND_NOTES[name] || SOUND_FILES[name])pendingSound={name,at:Date.now()};");
assert.equal(crypto.createHash('sha256').update(originalAudio).digest('hex'),'993cf413c7fade055cf6668a2ca4ec59dcbfc2885bb0b4d421de2c31ab99bc48','Unrelated audio boundary changed');
// Preserve the reviewed failure-return ad policy and cadence exactly.
const originalAds=read('js/ads.js')
 .replace('// Result dismissal and retry share settlement; callers can suppress the ad\n// without resetting the accumulated play count.','// Result dismissal and retry share the same end-of-play ad gate.')
 .replace('function continueAfterNormalAd(onReturn,{showRegularAd=true}={}) {','function continueAfterNormalAd(onReturn) {')
 .replace('if(showRegularAd && level>=NORMAL_AD_FIRST_STAGE','if(level>=NORMAL_AD_FIRST_STAGE');
assert.equal(crypto.createHash('sha256').update(originalAds).digest('hex'),'10c96c8913f3c448a8de43f12602ef874dfe7512e019be285287f85d61f5e935');
const map=read('js/level-map.js'),daily=read('js/daily.js');
assert(map.includes('    ui.debugControls.hidden = !DEBUG_FEATURES_ALLOWED || !debugMode;'));
assert(!map.includes('renderDebugCourseChoices'));
const launch=`            restartInput(n,heartsUsed);
            beginLifeAttempt();
            ui.titleScreen.hidden=true;ui.levelMap.hidden=true;
            heartItems-=heartsUsed;saveHeartItems();
            return true;`;
assert.equal(map.split(launch).length,2,'Native resource transaction anchor remains exact');
const nativeSource=require('../scripts/native-bundle-source.cjs');
assert(nativeSource('level-map.js',map).includes('ASCENT_NATIVE_RESUME.beginAttempt(heartsUsed,commit)'));
assert(daily.includes(`        dailyAttempts[profile.date]=attempt;saveDailyAttempts();
        dailyPlayAdState={plays:(dailyPlayAdState.plays+1)%2,adPaid:false};saveDailyPlayAdState();`),'Daily attempt/ad accounting unchanged');
assert(daily.includes(`        if(dailyPlayAdState.plays===1 && !dailyPlayAdState.adPaid)
            return startDummyAd({onComplete:()=>{
                dailyPlayAdState.adPaid=true;saveDailyPlayAdState();
            },onReturn:()=>launchDailyAttempt(profile,attempt,prepared)});`),'Daily prestart ad transaction unchanged');
const html=read('index.html'),files=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
for(const file of files)nativeSource(file.split('/').at(-1),read(file)); // every copied-source exact anchor
assert(files.indexOf('js/score-metadata.js')<files.indexOf('js/tutorial-state.js'));
assert(files.indexOf('js/tutorial-state.js')<files.indexOf('js/level-map.js'));
for(const file of ['js/finger-aim.js','js/finger-route.js','js/game.js','js/course.js','js/course-generator-core.js'])
 assert(!/ASCENT_FINGER_TRIAL|prepareFrozenFingerTrialCourse|currentFingerTrialReport|memoryStorage|build-coupled-trial/.test(read(file)),'No isolated-trial runtime '+file);
assert(html.includes('js/finger-aim.js')&&html.includes('js/finger-route.js')&&html.includes('js/firebase-client.js'));
assert(!html.includes('coupled-trial'));
assert(read('js/config.js').includes("const COURSE_VERSION = 'v5'"));
assert(read('js/config.js').includes("const DAILY_COURSE_VERSION = 'v4'"));
const version=require('../js/score-metadata.js').RECORD_VERSION;
assert(read('firestore.rules').includes(`function currentRecordVersion() { return '${version}'; }`),'Client and Rules record generations agree');
assert(!read('.github/workflows/pages.yml').includes('coupled-production-integration'));
for(const suite of ['course-rankings-disabled','course-version-compat','record-reward-compat','native-service-gate','native-terms-preboot'])require('./'+suite+'.cjs');
console.log('PASS production boundary: unrelated resources/audio/ads/storage preserved; exact native/Daily transactions; record-generation/consent behavior; no trial runtime or deployment trigger');
