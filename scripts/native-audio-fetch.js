'use strict';
// WKURLSchemeHandler serves bundled media as URLResponse, without an HTTP
// status. Fetch exposes status 0 / ok=false even when it returns the file bytes.
// Normalize only known local audio GETs; never enable native/external HTTP.
(() => {
    if (location.protocol !== 'capacitor:') return;
    const originalFetch = globalThis.fetch.bind(globalThis);
    const paths = new Set([
        '/assets/audio/bgm-loop.mp3', '/assets/audio/bgm-stage-loop.mp3',
        '/assets/audio/move.wav', '/assets/audio/launch.wav',
        '/assets/audio/stage-start.wav', '/assets/audio/stage-clear.wav',
        '/assets/audio/stage-fail.wav'
    ]);
    const diagnostics = globalThis.ASCENT_NATIVE_AUDIO = {normalized: []};
    globalThis.fetch = async (input, init) => {
        const response = await originalFetch(input, init);
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        const method = String(init?.method || input?.method || 'GET').toUpperCase();
        if (response.status !== 0 || response.type === 'opaque' || method !== 'GET' ||
            url.protocol !== 'capacitor:' || url.hostname !== location.hostname ||
            url.port !== location.port || url.username || url.password || !paths.has(url.pathname)) return response;
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength) throw new Error('Empty bundled audio');
        if (diagnostics.normalized.length < 16) diagnostics.normalized.push({path: url.pathname, rawStatus: response.status, bytes: bytes.byteLength});
        return new Response(bytes, {status: 200, headers: {'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream'}});
    };
})();
