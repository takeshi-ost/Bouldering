'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const bundle = path.join(root, 'www');
const read = name => fs.readFileSync(path.join(bundle, name), 'utf8');
const html = read('index.html');
assert(!fs.existsSync(path.join(bundle, 'js/firebase-client.js')), 'Never ship Firebase bootstrap/config');
assert(!html.includes('firebase-client.js'));
assert(html.indexOf('js/native-audio-fetch.js') >= 0 && html.indexOf('js/native-audio-fetch.js') < html.indexOf('js/audio.js'), 'Native audio adapter must load before audio preload');
assert.equal(read('js/native-audio-fetch.js'), fs.readFileSync(path.join(root, 'scripts/native-audio-fetch.js'), 'utf8'));
const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
assert(policy, 'Native bundle must have a CSP');
for (const directive of ["default-src 'self'", "script-src 'self'", "connect-src 'self'", "frame-src 'none'", "form-action 'none'"]) {
    assert(policy.split(';').some(part => part.trim() === directive));
}
assert(!/https?:|\*|unsafe-eval/.test(policy));
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const ref = match[1].split('?')[0];
    if (ref.startsWith('#')) continue;
    assert(!/^(?:[a-z]+:|\/\/)/i.test(ref), `External resource: ${ref}`);
    assert(fs.existsSync(path.join(bundle, ref)), `Missing bundled resource: ${ref}`);
}
for (const name of fs.readdirSync(path.join(bundle, 'js'))) {
    const source = read(`js/${name}`);
    assert(!/https?:\/\//i.test(source), `External endpoint in ${name}`);
    assert(!/initializeApp\(|signInAnonymously\(|bootFirebase\(/.test(source), `Firebase bootstrap in ${name}`);
}
// Exercise the shipped offline bootstrap, without allowing a network primitive.
const calls = [];
const env = {ui: {playerUuid: {}}, setOnlineStatus: text => calls.push(text),
    fetch: () => { throw Error('Offline bootstrap attempted a request'); }};
vm.runInNewContext(read('js/native-offline.js'), env);
assert.equal(env.ASCENT_NATIVE_OFFLINE, true);
assert.match(env.ui.playerUuid.textContent, /Offline test/);
assert.equal(calls.length, 1);
// Every bundled game script and audio/image asset stays byte-for-byte Web source.
for (const name of fs.readdirSync(path.join(root, 'js'))) {
    if (!name.endsWith('.js') || name === 'firebase-client.js') continue;
    assert.deepEqual(fs.readFileSync(path.join(bundle, 'js', name)), fs.readFileSync(path.join(root, 'js', name)));
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
    assert.equal(fs.readFileSync(path.join(nativePublic, 'js/native-offline.js'), 'utf8'), read('js/native-offline.js'));
    assert.equal(fs.readFileSync(path.join(nativePublic, 'js/native-audio-fetch.js'), 'utf8'), read('js/native-audio-fetch.js'));
    if(relative.startsWith('build/')) {
        assert.equal(fs.readFileSync(path.join(root,builtApp,'ascent-build-configuration.txt'),'utf8').trim(),configuration);
        const expected=configuration==='Release'?read('js/game.js').replace('let debugMode = false;','const debugMode = false;'):read('js/game.js');
        assert.equal(fs.readFileSync(path.join(nativePublic,'js/game.js'),'utf8'),expected,'Wrong native debug mutability for this configuration');
    }
}
console.log('PASS iOS bundle: Firebase absent, local-only CSP/resources, offline bootstrap, unchanged game scripts and synced HTML');
