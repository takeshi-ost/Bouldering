'use strict';
// Preserve 0.5.1 service/save boundaries while changing only climbing mechanics.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const baseline={
  "js/appearance.js": "ba9e13d0cb98d33fac172377b8a424417c69ed14cfe6e1cc5ff01360ce99ec2c",
  "js/firebase-client.js": "ec72992009810056c41edd4fa6a6273f0fd34e02b61f09d64d1266f3d223c7a6",
  "js/online.js": "5dbe4738c12d064f3e3c26d04107508487cf65263f2cf05d0151f6c09f26ee5b",
  "js/online-scores.js": "ed4c420f25370bdc555abdc56f1b283029e443ee5d411f3a1e6f575a8a49c57b",
  "js/score-metadata.js": "ad0e02f921ca4e7f505e114dc998bb862d60fd18dc0c24c83871517ca7dd5cb0",
  "js/account-deletion.js": "a26b680d9a8b5e40464d9ade5f6e4a2c8f36a8152009d49164daa1354b12da9d",
  "js/transfer.js": "f4d72039a7c95b4cfeee758d797207ac4344aca23b625126e4b9b4da4d9ee6a4",
  "js/lives.js": "43566a05fc33a0ba6d071180f8ad86a775219064b30df1746847e85d69fdbd3b",
  "js/ads.js": "10c96c8913f3c448a8de43f12602ef874dfe7512e019be285287f85d61f5e935",
  "js/audio.js": "993cf413c7fade055cf6668a2ca4ec59dcbfc2885bb0b4d421de2c31ab99bc48",
  "js/bgm.js": "f62ff99b237fa0765a81faa40c00cd0d1f04a00986aa000a7cae22bd63366449",
  "js/level-map.js": "aaf46d7940781be9f7b6b8561c5afbbc75b169900ca4352e1fd32f6a87c787ff",
  "js/rewards.js": "bca1d0759442ad7345cb30df8825a542ad0c32080559f6be7bc9bccd0c068970",
  "js/daily.js": "261aec3ab5212e4c711b4b08ad9035f039fecf79e62375ba5b8a4b88395b4306",
  "scripts/pages-storage.js": "6e3f3bf0f9abbfce8a080e1c0ffc2abfc9d9bae3ca759483da631840bdf02dae",
  "scripts/native-bundle-source.cjs": "24a83aa80bea25ab6b63c6d5a11abfbd3cdc306f243122e00fb55b1de9a68333",
  "scripts/native-resume-adapter.cjs": "f527882bc56d5cae3549d0b897fd9c8b9bc0a4b069eb54170772947e51db629b",
  "scripts/native-resume-store.cjs": "8c11fb0dd6e8cb25cd3308c33fdb086246bd3e1d1cd36fb96cec843518be1337",
  "scripts/build-native-firebase.cjs": "4879ac792a800531d0cfa198319885cbb685d6a82a91a3e41cf891cc969a759e",
  "scripts/build-ios-assets.cjs": "b911823eeb752e98c10e66d9c5c62030e77f132ceecd273650b102df16232b6d",
  "scripts/build-pages-formal.cjs": "9880b22adf36e892cd5d390c2892ae407e1ee7b288e800f522dff252fd7dcdd8",
  "firestore.rules": "afabe280a59efdd8b569a70107cb8d5739dc3a90462ff45ad98ba2f62fcb0260",
  "capacitor.config.json": "241eed1591ea9bbdd698d973ec9fe74802e186512f0c4f10b3de9377fb548863"
};
// Reviewed preparation-only exceptions. Original service baselines remain above.
// Map: dialog readiness and guarded launch lease; Daily: readiness before the
// existing ad/attempt transaction. Builders: current same-origin worker asset,
// Character editor: cancel pending Daily work on navigation. Builders add
// provenance and worker-src 'self'. No persistence/service adapter was changed.
const preparationExceptions={
  "js/appearance.js": "97d112b38c0ee3a1bc78abb78a932aadd2f6141b8b07ba719fbbc35b29cbdbb8",
  "js/level-map.js": "f7609d5cca825e39ca9ba4e5eedc88b24448c410f16c5a4bee542f8e6daf3323",
  "js/daily.js": "7585efffc8e284c26cc54c0d8b680d3f4a4e2ae84c84dc89294827ea00c2f291",
  "scripts/build-ios-assets.cjs": "3654c6984d382d562f60c8819e915e80ae3551a587e0490c5c0401a377c8d8e2",
  "scripts/build-pages-formal.cjs": "0d821629436ae809db7f7d44689167acc961f5d128d064a92cc746c3a4f184f0"
};

// Reviewed v5 exception: additive score-board generation and matching metadata only;
// ONLINE_PROGRESS_VERSION stays v4, old records/queues and storage keys remain intact.
// Builder identity guard is advanced to normal v5 / Daily v4; no deployment occurs.
const courseGenerationExceptions={"js/score-metadata.js": "11f4ce6668c512d24a8c7fa77b518cf1e12fcca35e7258f8ad4e50dca572e472", "firestore.rules": "369166eeda40d6876f5e727d065246bec34fdd3335add93319eeccf18ce3f9b6", "scripts/build-pages-formal.cjs": "4dc2e325571a012a5aaa831bfde7cbccd12ee2009e46d81d9a95601ffd1a649c"};
// Owner-approved Web ranking pause: no score reads/writes; retain queues.
// Regression tests enforce the disabled service boundary rather than merely its hash.
const rankingPauseExceptions={"js/firebase-client.js": "bdd7a4650fe73137c41af7865bd44e9b6aca6c211bb0fb96435a6a182e8a96b9", "js/online-scores.js": "06d0567fa941c6a716013f897ced35a5ee6229f90131470d1ca6c1491494619b"};
require('./course-rankings-disabled.cjs');
// Reviewed TYPE retirement changes only the map's debug-control visibility and
// the removed selector-render call. Verify the remaining map bytes against the
// pre-retirement boundary after reversing exactly those two changes below.
const legacyTypeRetirementExceptions={"js/level-map.js":"023e1f59d9cdc80b602e760c1b9a6cbb86ea30f96a693564f11fbb7321ff5257"};
// Reviewed reconstruction: refresh the native diagnostics on the rankings-off
// early return. Assert the rest of the adapter is byte-identical to baseline.
const nativeDiagnosticRefresh=`        // Rankings-off returns before the legacy presenter below. Refresh the
        // native diagnostics there too; this does not enable score uploads.
        source=replaceOnce(source,"        status.hidden=true;status.textContent='';return;",
            "        status.hidden=true;status.textContent='';globalThis.ASCENT_NATIVE_SYNC_STATUS?.refresh();return;");
`;
const nativeAdapter=fs.readFileSync('scripts/native-bundle-source.cjs','utf8');
assert.equal(nativeAdapter.split(nativeDiagnosticRefresh).length,2);
assert.equal(crypto.createHash('sha256').update(nativeAdapter.replace(nativeDiagnosticRefresh,'')).digest('hex'),baseline['scripts/native-bundle-source.cjs']);
const nativeDiagnosticExceptions={'scripts/native-bundle-source.cjs':'de8a34d80d64ca83ab466bdceac062c3c1757611fa8b3d800b7a3fb0099e9920'};
for(const [file,hash]of Object.entries(baseline))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),nativeDiagnosticExceptions[file]||legacyTypeRetirementExceptions[file]||rankingPauseExceptions[file]||courseGenerationExceptions[file]||preparationExceptions[file]||hash,'0.5.1 boundary / reviewed preparation and v5 generation '+file);
const map=fs.readFileSync('js/level-map.js','utf8');
const currentDebugVisibility='    ui.debugControls.hidden = !DEBUG_FEATURES_ALLOWED || !debugMode;';
assert.equal(map.split(currentDebugVisibility).length,2);
assert(!map.includes('renderDebugCourseChoices'));
const originalMap=map.replace(currentDebugVisibility,'    ui.debugControls.hidden = !debugMode;\n    renderDebugCourseChoices();');
assert.equal(crypto.createHash('sha256').update(originalMap).digest('hex'),preparationExceptions['js/level-map.js'],'Only the two reviewed TYPE-control lines changed in map source');

assert.equal(crypto.createHash('sha256').update(originalMap.slice(0,originalMap.indexOf('let stageStartContext='))).digest('hex'),'bcd613a8c17fd53a4691055ee206bf2a8a043bbefad5cc325bd93589483eff40','Map records, rewards, inventory and navigation remain byte-identical outside reviewed debug-control retirement');
const launch=`            restartInput(n,heartsUsed);
            beginLifeAttempt();
            ui.titleScreen.hidden=true;ui.levelMap.hidden=true;
            heartItems-=heartsUsed;saveHeartItems();
            return true;`;
assert.equal(map.split(launch).length,2,'Native launch transformer retains its exact transaction anchor');
assert(require('../scripts/native-bundle-source.cjs')('level-map.js',map).includes('ASCENT_NATIVE_RESUME.beginAttempt(heartsUsed,commit)'));
const daily=fs.readFileSync('js/daily.js','utf8');
assert(daily.includes(`        dailyAttempts[profile.date]=attempt;saveDailyAttempts();
        dailyPlayAdState={plays:(dailyPlayAdState.plays+1)%2,adPaid:false};saveDailyPlayAdState();`),'Daily resource transaction unchanged');
assert(daily.includes(`        if(dailyPlayAdState.plays===1 && !dailyPlayAdState.adPaid)
            return startDummyAd({onComplete:()=>{
                dailyPlayAdState.adPaid=true;saveDailyPlayAdState();
            },onReturn:()=>launchDailyAttempt(profile,attempt,prepared)});`),'Daily ad timing unchanged after preparation');
for(const file of ['js/finger-aim.js','js/finger-route.js','js/game.js','js/course.js','js/course-generator-core.js']){
 const s=fs.readFileSync(file,'utf8');assert(!/ASCENT_FINGER_TRIAL|prepareFrozenFingerTrialCourse|currentFingerTrialReport|memoryStorage|build-coupled-trial/.test(s),'No isolated-trial runtime '+file);
}
const html=fs.readFileSync('index.html','utf8');assert(html.includes('js/finger-aim.js'));assert(html.includes('js/finger-route.js'));assert(html.includes('js/firebase-client.js'));assert(!html.includes('coupled-trial'));
const cfg=fs.readFileSync('js/config.js','utf8');assert(cfg.includes("const COURSE_VERSION = 'v5'"));assert(cfg.includes("const DAILY_COURSE_VERSION = 'v4'"));
assert(!fs.readFileSync('.github/workflows/pages.yml','utf8').includes('coupled-production-integration'));
console.log('PASS coupled production boundary: preserved 0.5.1 saves, ads, audio and adapters; reviewed preparation plus additive v5 score/rules and v4 Daily identity exceptions; no trial runtime; no deployment trigger or reset');
