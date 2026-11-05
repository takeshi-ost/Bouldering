'use strict';
// Focused Web checks only. Fixed shards partition the same complete registry;
// no test filters, environment-based exclusions, or per-file timeout changes.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const shardCount=2;
const suites=['pages-formal-runtime','pages-storage-deletion','formal-debug-ranking','formal-v4-preservation','course-version-compat','score-metadata','online','online-progress-generation','online-scores','firebase-client','account-deletion','transfer','settings-connection','settings-layout','language','initial-language','text','button-theme','pointer-only-ui','title-centering','tutorial-course','tutorial-lifecycle','tutorial-modals','tutorial-localization','tutorial-clear-sound','explanation-image-readiness','hazard-image-readiness','hazard-game-rendering','explanation-feedback','feature-help','feature-help-localization','help-dialog','help-document','help-owner-copy','help-layout','stage-start','failure-return','level-map','map-players','daily','rewards','ads','ads-early-stages','course-progression','formal-course-seed-offset','formal-course-seed-offset-daily-march','formal-course-seed-offset-daily-january-zero','formal-course-seed-offset-daily-january-high'];
// Profile synchronization has its own scope and must not imply score completion.
suites.push('profile-sync-status','release-050-ui','bgm','audio-settings','audio-files','audio');
suites.push('hazard-modal-rendering','render-scheduling');
Object.freeze(suites);
function parseArguments(args) {
 const options={list:false,shard:null};
 for(let i=0;i<args.length;i++) {
  const arg=args[i];
  if(arg==='--list'&&!options.list)options.list=true;
  else if(arg==='--shard'&&!options.shard) {
   const value=args[++i],match=/^([1-9][0-9]*)\/([1-9][0-9]*)$/.exec(value||'');
   if(!match||Number(match[2])!==shardCount||Number(match[1])>shardCount)
    throw Error('Expected --shard 1/2 or --shard 2/2');
   options.shard={index:Number(match[1]),count:shardCount};
  } else throw Error('Unknown or repeated argument: '+arg);
 }
 return options;
}
function selection(options) {
 return {scope:options.shard?'shard':'all',shard:options.shard,totalAvailable:suites.length,
  suites:suites.filter((_,index)=>!options.shard||index%shardCount===options.shard.index-1)};
}
function main(args=process.argv.slice(2)) {
 let options;
 try {options=parseArguments(args);}catch(error){console.error(error.message);process.exitCode=1;return;}
 const selected=selection(options);
 if(options.list){console.log(JSON.stringify(selected,null,2));return;}
 const label=options.shard?'Web integration shard '+options.shard.index+'/'+shardCount:'Web integration (all suites)';
 console.log(label+': '+selected.suites.length+' selected / '+suites.length+' total suites; 180s per file');
 const results=[];
 for(const suite of selected.suites){
  console.log('\n== '+suite+' ==');const start=Date.now(),run=spawnSync(process.execPath,['tests/'+suite+'.cjs'],{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:12*1024*1024});
  process.stdout.write(run.stdout||'');process.stderr.write(run.stderr||'');
  results.push({suite,passed:run.status===0&&!run.error&&!run.signal,exitCode:run.status,error:run.error?.message||null,signal:run.signal||null,seconds:Number(((Date.now()-start)/1000).toFixed(2))});
 }
 const report={release:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,
  scope:selected.scope,shard:selected.shard,totalAvailable:suites.length,
  passed:results.filter(r=>r.passed).length,total:selected.suites.length,results,
  limitations:['No browser/device/audio verification','No live Firebase calls, Rules retrieval/deployment, or real emulator','No native build in this Web-only test runner','No full401-stage sweep',
   ...(options.shard?['This report covers only shard '+options.shard.index+'/'+shardCount+'; all shards are required for complete Web coverage']:[])]};
 const filename=options.shard?'results-shard-'+options.shard.index+'-of-'+shardCount+'.json':'results.json';
 const dir=path.join(root,'build/web-integration');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,filename),JSON.stringify(report,null,2)+'\n');
 console.log('\n'+label+': '+report.passed+'/'+report.total+' selected suites passed; build/web-integration/'+filename);process.exitCode=report.passed===report.total?0:1;
}
module.exports={suites,shardCount,parseArguments,selection,main};
if(require.main===module)main();
