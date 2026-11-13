'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');require('../js/course-data-store.js');
module.exports=function courseDataFiles(root){
 const dir=path.join(root,'course-data'),file=path.join(dir,'manifest.json');if(!fs.existsSync(file))return [];
 const bytes=fs.readFileSync(file),m=JSON.parse(bytes);if(!globalThis.AscentCourseData.compatibleGeneration(m)||!Array.isArray(m.packs))throw Error('Incompatible bundled course metadata');
 const files=[['course-data/manifest.json',bytes]];
 for(const d of m.packs){
  if(!/^[\w.-]+\.json$/.test(d.file))throw Error('Invalid pack name');
  const b=fs.readFileSync(path.join(dir,d.file));if(b.length!==d.bytes||crypto.createHash('sha256').update(b).digest('hex')!==d.sha256||!globalThis.AscentCourseData.compatibleGeneration(JSON.parse(b)))throw Error('Invalid bundled course pack');
  files.push(['course-data/'+d.file,b]);
 }return files;
};
