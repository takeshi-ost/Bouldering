'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.env.BASELINE_ROOT || path.join(__dirname,'../..'));
const manifest=require('./baseline-manifest.json'),policy=require('./policy.cjs');
const target=path.join(__dirname,'public/game');
const exclude=new Set(['js/firebase-client.js','js/online.js','js/online-scores.js','js/account-deletion.js','js/transfer.js','js/prototype.js']);
for(const [file,sha] of Object.entries(manifest.files)) {
 const bytes=fs.readFileSync(path.join(root,file));
 const hash=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
 if(hash!==sha)throw Error(`Baseline changed: ${file}. Expected ${manifest.commit}; do not silently import a new version.`);
}
fs.rmSync(target,{recursive:true,force:true}); fs.mkdirSync(target,{recursive:true});
for(const file of Object.keys(manifest.files)) {
 if(exclude.has(file)||file==='index.html'||file.startsWith('assets/audio/'))continue;
 const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);
}
const audio=Object.fromEntries(Object.keys(manifest.files).filter(f=>f.startsWith('assets/audio/')).map(f=>[f,fs.readFileSync(path.join(root,f)).toString('base64')]));
fs.writeFileSync(path.join(target,'audio-bundle.js'),'"use strict";globalThis.ASCENT_LAB_AUDIO_B64=Object.freeze('+JSON.stringify(audio)+');\n');
for(const file of ['bootstrap.js','offline.js','offline.css'])fs.copyFileSync(path.join(__dirname,'integration',file),path.join(target,file));
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/\s*<script[^>]+src="([^"?]+)(?:\?[^"\s]*)?"[^>]*><\/script>/g,(tag,file)=>exclude.has(file)?'':tag);
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">\n    <meta http-equiv="Content-Security-Policy" content="'+policy.game+'">\n    <meta name="referrer" content="no-referrer">\n    <meta name="robots" content="noindex,nofollow">');
html=html.replace('    <!-- classic scripts','    <link rel="stylesheet" href="offline.css">\n    <script src="audio-bundle.js" defer></script>\n    <script src="bootstrap.js" defer></script>\n    <!-- classic scripts');
html=html.replace(/(    <script src="js\/main\.js)/,'    <script src="offline.js" defer></script>\n$1');
html=html.replace(/(<[^>]*id="dummyAd"[^>]*>)/,'$1<p id="labAdLabel"></p>');
fs.writeFileSync(path.join(target,'index.html'),html);
const shell=fs.readFileSync(path.join(__dirname,'public/index.html'),'utf8').replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(">)/,'$1'+policy.shell+'$2');
fs.writeFileSync(path.join(__dirname,'public/index.html'),shell);
console.log(`Built offline baseline ${manifest.commit}: ${Object.keys(manifest.files).length} verified source files; no production modules copied.`);
