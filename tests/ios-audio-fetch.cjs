'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync('scripts/native-audio-fetch.js', 'utf8');
const payload = Uint8Array.from([73, 68, 51, 1, 2, 3]);
const raw = (status = 0, type = 'basic', bytes = payload) => ({status, type, ok: status === 200,
    headers: new Headers({'Content-Type': 'audio/mpeg'}), arrayBuffer: async () => bytes.buffer});
function setup(protocol = 'capacitor:', response = raw()) {
    const originalFetch = async () => response;
    const env = {location: {protocol, hostname: 'localhost', port: '', href: `${protocol}//localhost/index.html`},
        URL, Response, fetch: originalFetch};
    vm.runInNewContext(source, env);return {env, originalFetch, response};
}
(async () => {
    const {env} = setup();
    const result = await env.fetch('assets/audio/bgm-loop.mp3?v=hash');
    assert.equal(result.status, 200);assert(result.ok);
    assert.deepEqual(new Uint8Array(await result.arrayBuffer()), payload);
    assert.equal(result.headers.get('Content-Type'), 'audio/mpeg');
    assert.equal(env.ASCENT_NATIVE_AUDIO.normalized[0].rawStatus, 0);
    for (const name of ['bgm-stage-loop.mp3', 'move.wav', 'launch.wav', 'stage-start.wav', 'stage-clear.wav', 'stage-fail.wav']) {
        assert((await env.fetch(`assets/audio/${name}`)).ok);
    }
    for (const [url, init] of [['https://example.invalid/assets/audio/bgm-loop.mp3'],
        ['capacitor://foreign/assets/audio/bgm-loop.mp3'], ['assets/audio/not-listed.mp3'],
        ['_capacitor_http_interceptor_'], ['assets/audio/bgm-loop.mp3', {method: 'POST'}]]) {
        const test = setup();assert.equal(await test.env.fetch(url, init), test.response);
    }
    for (const response of [raw(404), raw(403), raw(200), raw(0, 'opaque')]) {
        const test = setup('capacitor:', response);assert.equal(await test.env.fetch('assets/audio/bgm-loop.mp3'), response);
    }
    const empty = setup('capacitor:', raw(0, 'basic', new Uint8Array()));
    await assert.rejects(empty.env.fetch('assets/audio/bgm-loop.mp3'), /Empty bundled audio/);
    const web = setup('https:');assert.equal(web.env.fetch, web.originalFetch, 'Never alter the Web version');
    console.log('PASS native audio fetch: local status-0 media bytes, both BGM/WAVs, query hashes; external/opaque/errors/unknown paths unchanged, empty files rejected, Web untouched');
})().catch(error => {console.error(error);process.exitCode = 1;});
