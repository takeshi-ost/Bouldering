'use strict';
// Deployment envelope only; shared game input remains index.html/js/styles/assets.
const fs=require('node:fs'),path=require('node:path');
const {buildPagesFormal}=require('./build-pages-formal.cjs');
// Optional, isolated test feed. Never copy unrelated files or old checkpoints.
function copyTestCourseData(root,out){
 const relative='test-course-data/stages-101-150',source=path.join(root,relative);
 if(!fs.existsSync(source))return;
 const read=name=>{
  const file=path.join(source,name);
  if(!fs.lstatSync(file).isFile()||fs.realpathSync(file)!==file)throw Error('Test course data must be regular local files');
  return fs.readFileSync(file);
 };
 const manifestBytes=read('manifest.json'),manifest=JSON.parse(manifestBytes);
 if(manifest.schema!==1||!Array.isArray(manifest.packs)||manifest.packs.length!==1)throw Error('Invalid test course manifest');
 const p=manifest.packs[0];
 if(p.id!=='stages-00001-01000'||p.start!==1||p.end!==1000||p.count!==50||!/^stages-00001-01000-[a-f0-9]{12}\.json$/.test(p.file))throw Error('Invalid test course pack descriptor');
 const bytes=read(p.file),hash=require('node:crypto').createHash('sha256').update(bytes).digest('hex'),pack=JSON.parse(bytes);
 if(bytes.length!==p.bytes||hash!==p.sha256||!p.file.endsWith(hash.slice(0,12)+'.json')||pack.schema!==1||pack.id!==p.id||pack.generatedAt!==p.generatedAt||!Array.isArray(pack.courses)||pack.courses.length!==50)throw Error('Test course pack integrity mismatch');
 const levels=pack.courses.map(c=>{if(c.request?.date!==null)throw Error('Test feed must contain stages only');return c.request.level;}).sort((a,b)=>a-b);
 if(levels.some((n,i)=>n!==101+i))throw Error('Test feed must contain exactly STAGE101-150');
 const destination=path.join(out,relative);fs.mkdirSync(destination,{recursive:true});
 fs.writeFileSync(path.join(destination,p.file),bytes);fs.writeFileSync(path.join(destination,'manifest.json'),manifestBytes);
}
const args=process.argv.slice(2);
if(args.length!==1)throw Error('Usage: node scripts/build-pages-site.cjs /absolute/new-site-directory');
const out=path.resolve(args[0]);
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Site directory must be new or empty');
const {manifest}=buildPagesFormal({outputDir:path.join(out,'balance-trial')});
copyTestCourseData(path.resolve(__dirname,'..'),out);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'"><meta http-equiv="refresh" content="0;url=./balance-trial/"><title>ASCENT ${manifest.release}</title></head><body><p><a href="./balance-trial/">ASCENT ${manifest.release}を開く</a></p><p>現在のブラウザ内の進行を引き継ぎ、接続時にオンラインへ同期します。</p></body></html>
`);
console.log(JSON.stringify({release:manifest.release,commit:manifest.commit,outputDir:out,storagePrefix:manifest.storagePrefix}));
