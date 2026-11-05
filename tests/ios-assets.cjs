'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const flags = new Set(process.argv.slice(2));
for (const flag of flags) assert(['--built', '--bundle-only', '--release', '--artifact-only'].includes(flag), 'Unknown iOS asset option: '+flag);
const artifactOnly = flags.has('--artifact-only');
assert(!artifactOnly || (flags.has('--bundle-only') && !flags.has('--built') && !flags.has('--release')),
    '--artifact-only requires --bundle-only and cannot replace a built-app verification');

// Native branding lives outside www. Include it in every bundle/build check so
// a valid-looking Capacitor template cannot silently replace the approved art.
require('./ios-branding.cjs');
const nativeSource = require('../scripts/native-bundle-source.cjs');
const builtVerification = process.argv.includes('--built');
// These suites execute source, not the compiled application's copied assets.
// Simulator CI runs them in the default copy check before both builds. Linux
// CI runs all three explicitly before both --bundle-only --artifact-only checks.
// --built verifies every shipped JS file below instead of repeating cold VMs.
if (!builtVerification && !artifactOnly) {
    require('./native-resume-store.cjs');
    require('./native-resume-adapter.cjs');
    require('./native-resume-game.cjs');
} else if (artifactOnly) {
    console.log('SKIP --artifact-only duplicate source-only suites: native-resume-store.cjs, native-resume-adapter.cjs, native-resume-game.cjs. CI runs all three explicitly before both bundle-only checks. All bundle content checks still run below.');
} else {
    console.log('SKIP --built duplicate source-only suites: native-resume-store.cjs, native-resume-adapter.cjs, native-resume-game.cjs. Run node tests/ios-assets.cjs first; CI enforces this prerequisite. Built JS bytes are verified below.');
}
const bundle = path.join(root, 'www');
const read = name => fs.readFileSync(path.join(bundle, name), 'utf8');
const html = read('index.html');
const {createNativeResumeStore}=require('../scripts/native-resume-store.cjs');
const {installNativeResume}=require('../scripts/native-resume-adapter.cjs');
assert.equal(read('js/native-resume-preboot.js'),`'use strict';\n(${installNativeResume.toString()})(${createNativeResumeStore.toString()});\n`);
assert.equal(read('js/native-resume-runtime.js'),fs.readFileSync(path.join(root,'scripts/native-resume-runtime.js'),'utf8'));
assert(html.indexOf('js/native-resume-preboot.js')<html.indexOf('js/tutorial-state.js'),'Recovery must run before saved-resource reads');
assert(html.indexOf('js/native-resume-runtime.js')>html.indexOf('js/tutorial.js'),'Runtime sees all game definitions');
assert(html.indexOf('js/native-resume-runtime.js')<html.indexOf('js/main.js'),'Runtime binds before title bootstrap');
const nativeSettings=html.match(/<dialog id="settingsDialog"[\s\S]*?<\/dialog>/)?.[0];
assert(nativeSettings);
for(const [before,after] of [['settingsConnectionStatus','settingsVersion'],['settingsVersion','mapSettingsLanguage'],['stageDebugDisplay','onlineStatus'],['onlineStatus','onlineScoreStatus']])
    assert(nativeSettings.indexOf('id="'+before+'"')<nativeSettings.indexOf('id="'+after+'"'),after+' follows '+before+' in the native settings');
assert(/id="onlineScoreStatus"[^>]*hidden[^>]*><\/p>\s*<\/dialog>$/.test(nativeSettings), 'Native diagnostics must be the final content without a permanent footer spacer');
assert(/<p hidden id="onlineStatus"/.test(nativeSettings), 'Native diagnostics stay hidden before the policy is applied');
const firebaseMode=JSON.parse(read('native-firebase-mode.json')).mode;
assert(['offline','read-only','auto-sync'].includes(firebaseMode));
assert(fs.existsSync(path.join(bundle,'vendor/firebase-sdk.js')));
assert(!/import\s*\(['"]https?:/.test(read('vendor/firebase-sdk.js')));
if(firebaseMode==='offline')assert(!/apiKey\s*:/.test(read('js/native-firebase-control.js')),'Offline must not include connection config');
assert(!fs.existsSync(path.join(bundle, 'js/firebase-client.js')), 'Never ship Firebase bootstrap/config');
assert.deepEqual(fs.readFileSync(path.join(bundle,'assets/gym-floor-extended.png')),fs.readFileSync(path.join(root,'assets/gym-floor-extended.png')));
assert(!html.includes('firebase-client.js'));
assert(html.indexOf('js/native-audio-fetch.js') >= 0 && html.indexOf('js/native-audio-fetch.js') < html.indexOf('js/audio.js'), 'Native audio adapter must load before audio preload');
assert.equal(read('js/native-audio-fetch.js'), fs.readFileSync(path.join(root, 'scripts/native-audio-fetch.js'), 'utf8'));
assert(!html.includes('native-stage-layout'));
assert.equal(read('js/viewport.js'), fs.readFileSync(path.join(root,'js/viewport.js'),'utf8'));
const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
assert(policy, 'Native bundle must have a CSP');
const connects="connect-src 'self'"+(firebaseMode!=='offline'?' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com':'');
for (const directive of ["default-src 'self'", "script-src 'self'", connects, "frame-src 'none'", "form-action 'none'"]) {
    assert(policy.split(';').some(part => part.trim() === directive));
}
assert(!/\*|unsafe-eval/.test(policy));
if(firebaseMode==='offline')assert(!/https?:/.test(policy));
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const ref = match[1].split('?')[0];
    if (ref.startsWith('#')) continue;
    assert(!/^(?:[a-z]+:|\/\/)/i.test(ref), `External resource: ${ref}`);
    assert(fs.existsSync(path.join(bundle, ref)), `Missing bundled resource: ${ref}`);
}
for (const name of fs.readdirSync(path.join(bundle, 'js'))) {
    const source = read(`js/${name}`);
    assert(!/https?:\/\//i.test(source), `External endpoint in ${name}`);
    if(name!=='native-firebase-control.js')assert(!/initializeApp\(|signInAnonymously\(|bootFirebase\(/.test(source), `Firebase bootstrap in ${name}`);
}
// Exercise the shipped offline bootstrap, without allowing a network primitive.
const calls = [];
const env = {ui: {playerUuid: {}}, setOnlineStatus: text => calls.push(text),
    fetch: () => { throw Error('Offline bootstrap attempted a request'); }};
vm.runInNewContext(read('js/native-offline.js'), env);
assert.equal(env.ASCENT_NATIVE_OFFLINE, true);
assert.match(env.ui.playerUuid.textContent, /Offline test/);
assert.equal(calls.length, 1);
// Only explicitly anchored native adaptations may differ from the Web source.
for (const name of fs.readdirSync(path.join(root, 'js'))) {
    if (!name.endsWith('.js') || name === 'firebase-client.js') continue;
    assert.equal(read(`js/${name}`), nativeSource(name, fs.readFileSync(path.join(root, 'js', name),'utf8')));
}
assert.deepEqual(fs.readFileSync(path.join(bundle, 'styles.css')), fs.readFileSync(path.join(root, 'styles.css')));
for (const entry of fs.readdirSync(path.join(root, 'assets'), {recursive: true, withFileTypes: true})) {
    if (!entry.isFile()) continue;
    const source = path.join(entry.parentPath, entry.name);
    const relative = path.relative(root, source);
    assert.deepEqual(fs.readFileSync(path.join(bundle, relative)), fs.readFileSync(source), `Changed asset: ${relative}`);
}
// CI can verify the complete generated bundle without syncing or changing an
// Xcode project. Default behavior still verifies the synced native copy too.
const nativeDirectories = process.argv.includes('--bundle-only')?[]:['ios/App/App/public'];
const configuration=process.argv.includes('--release')?'Release':'Debug';
const builtApp=`build/DerivedData/Build/Products/${configuration}-iphonesimulator/App.app`;
if (builtVerification) nativeDirectories.push(`${builtApp}/public`);
const bundledJavaScript=fs.readdirSync(bundle,{recursive:true,withFileTypes:true})
    .filter(entry=>entry.isFile() && entry.name.endsWith('.js'))
    .map(entry=>path.relative(bundle,path.join(entry.parentPath,entry.name))).sort();
assert(bundledJavaScript.includes(path.join('js','game.js')));
for (const relative of nativeDirectories) {
    const nativePublic = path.join(root, relative);
    assert(fs.existsSync(nativePublic), `Missing native bundle: ${relative}`);
    assert.equal(fs.readFileSync(path.join(nativePublic, 'index.html'), 'utf8'), html, 'Run sync after rebuilding');
    assert(!fs.existsSync(path.join(nativePublic, 'js/firebase-client.js')));
    assert.equal(fs.readFileSync(path.join(nativePublic,'native-firebase-mode.json'),'utf8'),read('native-firebase-mode.json'));
    for(const file of ['js/native-firebase-control.js','vendor/firebase-sdk.js'])assert.equal(fs.readFileSync(path.join(nativePublic,file),'utf8'),read(file));
    assert.deepEqual(fs.readFileSync(path.join(nativePublic,'assets/gym-floor-extended.png')),fs.readFileSync(path.join(root,'assets/gym-floor-extended.png')));
    assert.equal(fs.readFileSync(path.join(nativePublic, 'js/native-offline.js'), 'utf8'), read('js/native-offline.js'));
    assert.equal(fs.readFileSync(path.join(nativePublic, 'js/native-audio-fetch.js'), 'utf8'), read('js/native-audio-fetch.js'));
    assert.equal(fs.readFileSync(path.join(nativePublic, 'js/native-audio-lifecycle.js'), 'utf8'), read('js/native-audio-lifecycle.js'));
    for(const name of ['native-resume-preboot','native-resume-runtime'])assert.equal(fs.readFileSync(path.join(nativePublic,'js/'+name+'.js'),'utf8'),read('js/'+name+'.js'));
    // Include all classic modules, native adapters, vendor files and workers,
    // including scripts loaded indirectly rather than listed in index.html.
    for(const file of bundledJavaScript) {
        let expected=fs.readFileSync(path.join(bundle,file));
        if(relative.startsWith('build/') && configuration==='Release' && file===path.join('js','game.js'))
            expected=Buffer.from(expected.toString('utf8').replace('let debugMode = false;','const debugMode = false;'));
        assert.deepEqual(fs.readFileSync(path.join(nativePublic,file)),expected,`Changed native JavaScript: ${relative}/${file}`);
    }
    if(relative.startsWith('build/')) {
        assert.equal(fs.readFileSync(path.join(root,builtApp,'ascent-build-configuration.txt'),'utf8').trim(),configuration);
        const expected=configuration==='Release'?read('js/game.js').replace('let debugMode = false;','const debugMode = false;'):read('js/game.js');
        assert.equal(fs.readFileSync(path.join(nativePublic,'js/game.js'),'utf8'),expected,'Wrong native debug mutability for this configuration');
    }
}
console.log('PASS iOS bundle: '+firebaseMode+' Firebase gates, exact CSP/resources, no Web bootstrap, verified native adaptations'+
    (process.argv.includes('--bundle-only')?' (bundle only; no Xcode/device/synced-copy verification)':' and synced HTML'));
