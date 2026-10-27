'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer, policy } = require('./server.cjs');

test('publishable files are a static, disconnected shell only', () => {
  const directory = path.join(__dirname, 'public');
  assert.deepEqual(fs.readdirSync(directory).sort(), ['index.html', 'styles.css']);
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(directory, 'styles.css'), 'utf8');
  assert.ok(html.includes(`content="${policy}"`));
  assert.match(html, /3728558/);
  assert.match(html, /まだ実装していません/);
  assert.doesNotMatch(html, /<script|<iframe|<form|https?:|localStorage|sessionStorage|indexedDB|serviceWorker/i);
  assert.doesNotMatch(css, /@import|url\s*\(/i);
  assert.deepEqual([...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]), ['./styles.css']);
});

test('server serves only the trial, rejecting production paths, traversal, and writes', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const target of ['/', '/index.html', '/styles.css']) {
      const response = await fetch(origin + target);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-security-policy'), policy + "; frame-ancestors 'none'");
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('set-cookie'), null);
    }
    for (const target of ['/js/firebase-client.js', '/js/main.js', '/js/prototype.js', '/package.json', '/README.md', '/%2e%2e%2findex.html', '/.git/config', '//index.html']) {
      assert.equal((await fetch(origin + target)).status, 404, target);
    }
    assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
    const head = await fetch(origin, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
