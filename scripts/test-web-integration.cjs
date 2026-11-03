'use strict';
// Focused current Web integration checks. No Firebase/network or native build.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const suites=['pages-formal-runtime','pages-storage-deletion','formal-debug-ranking','formal-v4-preservation','course-version-compat','score-metadata','online','online-progress-generation','online-scores','firebase-client','account-deletion','transfer','settings-connection','settings-layout','language','text','button-theme','pointer-only-ui','title-centering','tutorial-course','tutorial-lifecycle','tutorial-modals','tutorial-clear-sound','explanation-image-readiness','hazard-image-readiness','hazard-game-rendering','explanation-feedback','feature-help','help-dialog','stage-start','failure-return','level-map','map-players','daily','rewards','ads','ads-early-stages','course-progression','formal-course-seed-offset'];
const results=[];
for(const suite of suites){
 console.log('\n== '+suite+' ==');const start=Date.now(),run=spawnSync(process.execPath,['tests/'+suite+'.cjs'],{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:12*1024*1024});
 process.stdout.write(run.stdout||'');process.stderr.write(run.stderr||'');
 results.push({suite,passed:run.status===0&&!run.error&&!run.signal,exitCode:run.status,error:run.error?.message||null,signal:run.signal||null,seconds:Number(((Date.now()-start)/1000).toFixed(2))});
}
const report={release:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,passed:results.filter(r=>r.passed).length,total:suites.length,results,limitations:['No browser/device/audio verification','No live Firebase calls, Rules retrieval/deployment, or real emulator','No native build in this Web-only test runner','No full401-stage sweep']};
const dir=path.join(root,'build/web-integration');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log('\nWeb integration: '+report.passed+'/'+report.total+' suites passed; build/web-integration/results.json');process.exitCode=report.passed===report.total?0:1;
