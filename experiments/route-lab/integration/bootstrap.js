'use strict';
// Runs before all baseline scripts. Never reads native storage or sends a request.
(function (g) {
  const values = new Map();
  const memoryStorage = Object.freeze({
    getItem: key => values.has(String(key)) ? values.get(String(key)) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key)), clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    get length() { return values.size; }
  });
  for (const key of ['localStorage', 'sessionStorage'])
    Object.defineProperty(g, key, { value: memoryStorage, configurable: false, writable: false });
  const audio = g.ASCENT_LAB_AUDIO_B64 || Object.freeze({});
  Object.defineProperty(g, 'fetch', { configurable: false, writable: false, value: async input => {
    if (typeof input !== 'string' || !/^assets\/audio\/[a-z-]+\.(wav|mp3)(\?v=[a-f0-9]+)?$/.test(input))
      throw new TypeError('Route Lab: external requests are disabled');
    const encoded = audio[input.split('?')[0]];
    if (!encoded) throw new TypeError('Route Lab: audio asset not bundled');
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    return { ok: true, arrayBuffer: async () => bytes.buffer.slice(0) };
  }});
  for (const key of ['XMLHttpRequest', 'WebSocket', 'EventSource'])
    Object.defineProperty(g, key, { configurable: false, writable: false, value: class { constructor() { throw new TypeError('Route Lab: network disabled'); } } });
  if (g.navigator) try { Object.defineProperty(g.navigator, 'sendBeacon', {value: () => false}); } catch (_) {}
})(globalThis);
