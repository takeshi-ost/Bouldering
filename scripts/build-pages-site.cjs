'use strict';
// Deployment envelope only; shared game input remains index.html/js/styles/assets.
const fs=require('node:fs'),path=require('node:path');
const {buildPagesFormal}=require('./build-pages-formal.cjs');
const args=process.argv.slice(2);
if(args.length!==1)throw Error('Usage: node scripts/build-pages-site.cjs /absolute/new-site-directory');
const out=path.resolve(args[0]);
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Site directory must be new or empty');
const {manifest}=buildPagesFormal({outputDir:path.join(out,'balance-trial')});
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta http-equiv="refresh" content="0;url=./balance-trial/"><title>ASCENT ${manifest.release}</title></head><body><p><a href="./balance-trial/">ASCENT ${manifest.release}を開く</a></p><p>現在のブラウザ内の進行を引き継ぎ、接続時にオンラインへ同期します。</p></body></html>
`);
console.log(JSON.stringify({release:manifest.release,commit:manifest.commit,outputDir:out,storagePrefix:manifest.storagePrefix}));
