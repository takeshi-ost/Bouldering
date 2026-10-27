'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Serve an explicit allowlist, never the repository root or its game/Firebase code.
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);
const policy = "default-src 'none'; style-src 'self'; script-src 'none'; connect-src 'none'; img-src 'none'; font-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

function createServer() {
  return http.createServer((req, res) => {
    res.setHeader('Content-Security-Policy', policy + "; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    const file = files.get((req.url || '').split('?')[0]);
    if (!file) { res.writeHead(404); return res.end(); }
    const body = fs.readFileSync(path.join(__dirname, 'public', file[0]));
    res.writeHead(200, { 'Content-Type': file[1] });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  createServer().listen(port, host, () => console.log(`ASCENT Route Lab: http://${host}:${port}`));
}
module.exports = { createServer, policy };
