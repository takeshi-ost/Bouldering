'use strict';
// Self-contained classic Worker: no dynamic imports, Blob URLs or importScripts.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const files=['text-ja','text-en','text-dev-ja','config','course-progression-config','course-distribution-config',
 'course-distribution','course-progression','difficulty-config','utils','difficulty','stage','finger-aim','finger-route',
 'six-pair-selection','game','route','course','hazards','course-stamina-settings','course-generator-core','course-adoption','tutorial-course','course-preparation'].map(n=>'js/'+n+'.js');
function buildCourseWorker({write=false}={}){
 const sources=files.map(file=>({file,source:fs.readFileSync(path.join(ROOT,file),'utf8')}));
 const text=fs.readFileSync(path.join(ROOT,'js/text.js'),'utf8');
 const textFunction=text.slice(text.indexOf('function gameText('),text.indexOf('\nfunction translateExistingGameText('));
 if(!textFunction.startsWith('function gameText(')||!textFunction.endsWith('}'))throw Error('Worker translation anchor changed');
 const entry=fs.readFileSync(path.join(ROOT,'scripts/course-worker-entry.js'),'utf8');
 const dependencies=[...sources,{file:'js/text.js',source:text},{file:'scripts/course-worker-entry.js',source:entry},
  {file:'scripts/build-course-worker.cjs',source:fs.readFileSync(__filename,'utf8')}];
 const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
 const manifest={protocol:1,id:hash(dependencies.map(s=>s.file+'\n'+s.source).join('\n')),
  sources:dependencies.map(s=>({path:s.file,sha256:hash(s.source)}))};
 const buildSource="'use strict';\nglobalThis.ASCENT_COURSE_BUILD=Object.freeze("+JSON.stringify(manifest)+');\n';
 const translation="const GAME_TEXT_LOCALES=Object.freeze({ja:GAME_TEXT_JA,en:GAME_TEXT_EN});\nlet GAME_TEXT_LANGUAGE='ja';\n"+textFunction;
 const worker=buildSource+"globalThis.ASCENT_COURSE_WORKER=true;\nlet debugAttempt=false;\nfunction isTutorialRun(){return tutorialRun!==null;}\n"+
  sources.map((s,i)=>'\n// '+s.file+'\n'+s.source+(i===2?'\n'+translation:'')).join('\n')+'\n'+entry;
 const output={'js/course-worker.js':worker,'js/course-preparation-build.js':buildSource};
 if(write)for(const [file,source]of Object.entries(output))fs.writeFileSync(path.join(ROOT,file),source);
 return {output,manifest};
}
module.exports={buildCourseWorker};
if(require.main===module){const result=buildCourseWorker({write:!process.argv.includes('--check')});
 if(process.argv.includes('--check'))for(const [file,source]of Object.entries(result.output))
  if(fs.readFileSync(path.join(ROOT,file),'utf8')!==source)throw Error('Stale course worker: '+file);
 console.log('Course worker '+result.manifest.id);}
