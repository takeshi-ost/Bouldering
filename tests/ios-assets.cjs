'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const nativeSource = require('../scripts/native-bundle-source.cjs');
const bundle = path.join(root, 'www');
const read = name => fs.readFileSync(path.join(bundle, name), 'utf8');
const html = read('index.html');
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
const nativeDirectories = ['ios/App/App/public'];
const configuration=process.argv.includes('--release')?'Release':'Debug';
const builtApp=`build/DerivedData/Build/Products/${configuration}-iphonesimulator/App.app`;
if (process.argv.includes('--built')) nativeDirectories.push(`${builtApp}/public`);
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
    if(relative.startsWith('build/')) {
        assert.equal(fs.readFileSync(path.join(root,builtApp,'ascent-build-configuration.txt'),'utf8').trim(),configuration);
        const expected=configuration==='Release'?read('js/game.js').replace('let debugMode = false;','const debugMode = false;'):read('js/game.js');
        assert.equal(fs.readFileSync(path.join(nativePublic,'js/game.js'),'utf8'),expected,'Wrong native debug mutability for this configuration');
    }
}
console.log('PASS iOS bundle: '+firebaseMode+' Firebase gates, exact CSP/resources, no Web bootstrap, verified native adaptations and synced HTML');
