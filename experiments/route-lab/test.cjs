'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createServer}=require('./server.cjs'),policy=require('./policy.cjs'),manifest=require('./baseline-manifest.json');
const game=path.join(__dirname,'public/game'),html=fs.readFileSync(path.join(game,'index.html'),'utf8');
test('built baseline has no production modules and retains gameplay bytes',()=>{
 for(const name of ['firebase-client','online','online-scores','account-deletion','transfer','prototype']) {
  assert(!fs.existsSync(path.join(game,'js',name+'.js')));assert(!html.includes('js/'+name+'.js'));
 }
 for(const [file,sha] of Object.entries(manifest.files)) {
  if(file==='index.html'||file.startsWith('assets/audio/'))continue;
  const b=fs.readFileSync(path.join(game,file));assert.equal(crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),sha,file);
 }
 assert(html.includes(`content="${policy.game}"`));
 assert(html.indexOf('bootstrap.js')<html.indexOf('js/text-ja.js'));
 assert(html.indexOf('offline.js')<html.indexOf('js/main.js'));
 const shell=fs.readFileSync(path.join(__dirname,'public/shell.js'),'utf8');
 assert(shell.includes("setAttribute('sandbox','allow-scripts allow-same-origin')"));
 assert(!/localStorage|sessionStorage|fetch\(|https?:/.test(shell));
 for(const m of html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)) {
  if(m[1].startsWith('#'))continue;
  assert(!m[1].includes('://'),m[1]);assert(fs.existsSync(path.join(game,m[1])),m[1]);
 }
});
test('only trial public files are served; writes and production source are rejected',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 try {
  for(const p of ['/','/shell.js','/game/index.html','/game/bootstrap.js','/game/js/input.js','/game/audio-bundle.js']){
   const r=await fetch(url+p);assert.equal(r.status,200,p);assert(r.headers.get('content-security-policy').includes("connect-src 'none'"));assert.equal(r.headers.get('set-cookie'),null);await r.arrayBuffer();
  }
  for(const p of ['/js/main.js','/game/js/firebase-client.js','/game/js/prototype.js','/.git/config','/README.md','/%2e%2e%2findex.html'])assert.equal((await fetch(url+p)).status,404,p);
  assert.equal((await fetch(url,{method:'POST'})).status,405);
 }finally{await new Promise(r=>server.close(r));}
});
