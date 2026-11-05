'use strict';
// Preserve 0.5.1 service/save boundaries while changing only climbing mechanics.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const baseline={
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
for(const [file,hash]of Object.entries(baseline))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,'0.5.1 boundary '+file);
for(const file of ['js/finger-aim.js','js/finger-route.js','js/game.js','js/course.js','js/course-generator-core.js']){
 const s=fs.readFileSync(file,'utf8');assert(!/ASCENT_FINGER_TRIAL|prepareFrozenFingerTrialCourse|currentFingerTrialReport|memoryStorage|build-coupled-trial/.test(s),'No isolated-trial runtime '+file);
}
const html=fs.readFileSync('index.html','utf8');assert(html.includes('js/finger-aim.js'));assert(html.includes('js/finger-route.js'));assert(html.includes('js/firebase-client.js'));assert(!html.includes('coupled-trial'));
const cfg=fs.readFileSync('js/config.js','utf8');assert(cfg.includes("const COURSE_VERSION = 'v4'"));assert(cfg.includes("const DAILY_COURSE_VERSION = 'v3'"));
assert(!fs.readFileSync('.github/workflows/pages.yml','utf8').includes('coupled-production-integration'));
console.log('PASS coupled production boundary: unchanged 0.5.1 online, saves, ads, audio, Rules and native adapters; no trial runtime; no deployment trigger or reset');
