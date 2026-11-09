'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// YAML is already pinned transitively by the locked Firebase/Capacitor tooling.
const {parse}=require('yaml');
const config=JSON.parse(fs.readFileSync('firebase.emulator.json','utf8'));
assert.deepEqual(config.emulators.firestore,{host:'127.0.0.1',port:8089});
assert.equal(config.emulators.ui.enabled,false);
assert.equal(config.emulators.singleProjectMode,false); // Independent demo projects in the historical/current suite.
assert.equal(config.firestore.rules,'firestore.rules');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.dependencies.firebase,'12.11.0');
assert.equal(pkg.devDependencies['@firebase/rules-unit-testing'],'5.0.0');
assert.equal(pkg.devDependencies['firebase-tools'],'15.34.2');
assert.equal(pkg.scripts['test:rules'],'firebase emulators:exec --config firebase.emulator.json --project demo-ascent-rules --only firestore --non-interactive "node tests/firestore/score-metadata.mjs"');
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
for(const name of ['firebase','firebase-tools','@firebase/rules-unit-testing'])
  assert.equal(lock.packages['node_modules/'+name].version,pkg.dependencies[name]||pkg.devDependencies[name]);
const workflow=fs.readFileSync('.github/workflows/firestore-rules.yml','utf8');
const ci=parse(workflow);
const exactKeys=(value,keys,label)=>assert.deepEqual(Object.keys(value).sort(),keys.slice().sort(),label);
exactKeys(ci,['name','on','permissions','concurrency','jobs'],'No unreviewed top-level CI behavior');
assert.deepEqual(ci.on,{push:{branches:['feature/formal-integration','feature/coupled-production-integration']}});
assert.deepEqual(ci.permissions,{contents:'read'});
assert.deepEqual(ci.concurrency,{group:'firestore-rules-${{ github.ref }}','cancel-in-progress':true});
exactKeys(ci.jobs,['rules','web','coupled-native'],'Every independent scope remains required');
assert.deepEqual(ci.jobs.web.strategy,{'fail-fast':false,'max-parallel':2,matrix:{shard:['1/2','2/2']}});
const actions={
 checkout:'actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09',
 node:'actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444',
 java:'actions/setup-java@b6effb05e454b25005698d916606bdc6ffcbf961'
};
const commands={
 rules:['npm ci --ignore-scripts --no-audit --no-fund','node tests/firestore-config.cjs','npm run test:rules'],
 web:['npm ci --ignore-scripts --no-audit --no-fund','node tests/firestore-config.cjs',"npm run test:web -- --shard '${{ matrix.shard }}'"],
 'coupled-native':[
  'npm ci --ignore-scripts --no-audit --no-fund','node tests/firestore-config.cjs','npm run test:coupled',
  'node tests/coupled-course-preparation.cjs','node tests/coupled-course-worker.cjs --real',
  'node tests/native-firebase.cjs','node tests/native-deletion-controller.cjs','node tests/native-account-deletion.cjs',
  'node tests/native-auto-sync.cjs','node tests/native-sync-status.cjs','node tests/build-policy.cjs',
  'node tests/native-sdk-packaging.cjs','node tests/native-entry-formal.cjs',
  'node tests/native-resume-store.cjs','node tests/native-resume-adapter.cjs','node tests/native-resume-game.cjs',
  'npm run build:ios-assets','node tests/ios-assets.cjs --bundle-only --artifact-only',
  'npm run build:ios-assets',
  `node -e "require('assert/strict').equal(require('./www/native-firebase-mode.json').mode,'auto-sync')"`,
  'node tests/ios-assets.cjs --bundle-only --artifact-only'
 ]
};
for(const [id,job]of Object.entries(ci.jobs)) {
 exactKeys(job,['runs-on','timeout-minutes','env','steps',...(id==='web'?['strategy']:[])],id+' cannot override read-only permissions, target an environment, or skip/depend on another job');
 assert.equal(job['runs-on'],'ubuntu-24.04');assert.equal(job['timeout-minutes'],15);
 assert.deepEqual(job.env,id==='rules'?{CI:'true',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8089',GCLOUD_PROJECT:'demo-ascent-rules'}:{CI:'true'});
 const actionSteps=job.steps.filter(step=>step.uses);
 assert.deepEqual(actionSteps.map(step=>step.uses),id==='rules'?[actions.checkout,actions.node,actions.java]:[actions.checkout,actions.node]);
 for(const step of actionSteps)exactKeys(step,['name','uses','with']);
 assert.deepEqual(actionSteps[0].with,id==='rules'?{'fetch-depth':0,'persist-credentials':false}:{'persist-credentials':false});
 assert.deepEqual(actionSteps[1].with,{'node-version':'24.22.1','package-manager-cache':false});
 if(id==='rules')assert.deepEqual(actionSteps[2].with,{distribution:'temurin','java-version':'21'});
 const checks=job.steps.filter(step=>step.run && !step.if),summary=job.steps.at(-1);
 assert.deepEqual(checks.flatMap(step=>step.run.trim().split('\n')),commands[id],id+' must preserve every required check in order, with no exclusions or extra commands');
 for(const step of checks) {
  exactKeys(step,['name','run',...(step.env?['env']:[])]);
  if(step.env) {
   assert.equal(id,'coupled-native');
   assert.deepEqual(step.env,{ASCENT_FIREBASE_MODE:'offline'});
   assert.equal(step.run.trim(),'npm run build:ios-assets\nnode tests/ios-assets.cjs --bundle-only --artifact-only');
  }
 }
 assert.equal(checks.filter(step=>step.env).length,id==='coupled-native'?1:0);
 exactKeys(summary,['name','if','env','run']);assert.equal(summary.if,'always()');
 assert.deepEqual(summary.env,id==='web'?{TEST_RESULT:'${{ job.status }}',TEST_SHARD:'${{ matrix.shard }}'}:{TEST_RESULT:'${{ job.status }}'});
 assert.match(summary.run,/this result does not cover them/);
 assert.match(summary.run,/GITHUB_STEP_SUMMARY/);
 if(id==='web')assert.match(summary.run,/only the selected Web shard; both shards are required/);
 assert.equal(job.steps.length,actionSteps.length+checks.length+1,'No unverified steps or conditional checks');
}
assert(!/secrets\.|id-token:|write-all|contents: write|pages: write|pull_request_target:|workflow_dispatch:|firebase deploy|firebase login|upload-artifact|actions\/cache@|self-hosted/.test(workflow));
assert(!fs.readFileSync('.github/workflows/pages.yml','utf8').includes('coupled-production-integration'),'This integration branch must not deploy Pages');

// Independent exhaustive registry: the fixed shards must run every original Web
// suite plus all four semantic seed-offset partitions exactly once in their union.
const expectedWebSuites=`pages-formal-runtime pages-storage-deletion formal-debug-ranking formal-v4-preservation course-version-compat score-metadata online online-progress-generation online-scores firebase-client account-deletion transfer settings-connection settings-layout language initial-language text button-theme pointer-only-ui title-centering tutorial-course tutorial-lifecycle tutorial-modals tutorial-localization tutorial-clear-sound explanation-image-readiness hazard-image-readiness hazard-game-rendering explanation-feedback feature-help feature-help-localization help-dialog help-document help-owner-copy help-layout stage-start failure-return level-map map-players daily rewards ads ads-early-stages course-progression formal-course-seed-offset formal-course-seed-offset-daily-march formal-course-seed-offset-daily-january-zero formal-course-seed-offset-daily-january-high course-rankings-disabled profile-sync-status release-050-ui bgm audio-settings audio-files audio hazard-modal-rendering render-scheduling debug-score-trial coupled-course-preparation swipe-comparison`.split(' ');
const runner=require('../scripts/test-web-integration.cjs');
assert.deepEqual(runner.suites,expectedWebSuites);assert.equal(runner.shardCount,2);
assert.equal(new Set(expectedWebSuites).size,expectedWebSuites.length);
for(const name of expectedWebSuites)assert(fs.existsSync('tests/'+name+'.cjs'));
const lists=ci.jobs.web.strategy.matrix.shard.map(value=>runner.selection(runner.parseArguments(['--list','--shard',value])));
assert.deepEqual(lists.flatMap(list=>list.suites).sort(),expectedWebSuites.slice().sort(),'Both shards are an exact partition, not a reduced smoke set');
for(const list of lists)assert.deepEqual(list.suites,expectedWebSuites.filter((_,i)=>i%2===list.shard.index-1));
const invalidArguments=[['--shard'],['--shard','0/2'],['--shard','3/2'],['--shard','1/1'],['--shard','1/3'],['--shard','1/2/3'],['--shard','01/2'],['--shard','1/2','--shard','2/2'],['--list','--list'],['--exclude','daily'],['--unknown']];
for(const args of invalidArguments)assert.throws(()=>runner.parseArguments(args));

// Exercise the real runner orchestration with child execution stubbed, so this
// safety test cannot recursively run all Web suites or consume the CI budget.
const runnerPath=path.resolve('scripts/test-web-integration.cjs'),runnerSource=fs.readFileSync(runnerPath,'utf8');
function runWeb(args,failedSuite=null) {
 const calls=[],reports=[],logs=[],fakeModule={exports:{}};
 const fakeProcess={argv:['node',runnerPath,...args],execPath:process.execPath,stdout:{write(){}},stderr:{write(){}}};
 const fakeRequire=name=>name==='node:child_process'?{spawnSync(executable,argv,options){
  calls.push({executable,argv,options});return {status:argv[0]===failedSuite?1:0,stdout:'',stderr:''};
 }}:name==='node:fs'?{...fs,mkdirSync(){},writeFileSync(file,value){reports.push({file,value:JSON.parse(value)});}}:require(name);
 fakeRequire.main=fakeModule;
 vm.runInNewContext(runnerSource,{require:fakeRequire,module:fakeModule,__dirname:path.dirname(runnerPath),process:fakeProcess,console:{log:value=>logs.push(value),error:value=>logs.push(value)}});
 return {calls,reports,logs,exitCode:fakeProcess.exitCode};
}
for(const args of [[],['--shard','1/2'],['--shard','2/2']]) {
 const selected=runner.selection(runner.parseArguments(args)),result=runWeb(args);
 assert.equal(result.exitCode,0);assert.equal(result.reports.length,1);
 assert.deepEqual(result.calls.map(call=>call.argv[0]),selected.suites.map(name=>'tests/'+name+'.cjs'));
 for(const call of result.calls){assert.equal(call.executable,process.execPath);assert.equal(call.options.timeout,180000);assert.equal(call.options.maxBuffer,12*1024*1024);}
 const report=result.reports[0].value;
 assert.equal(report.scope,selected.scope);assert.deepEqual(report.shard,selected.shard);
 assert.equal(report.total,selected.suites.length);assert.equal(report.totalAvailable,expectedWebSuites.length);
 assert.deepEqual(report.results.map(item=>item.suite),selected.suites);
 if(selected.shard){assert.match(result.reports[0].file,new RegExp('results-shard-'+selected.shard.index+'-of-2\\.json$'));assert(report.limitations.some(value=>value.includes('only shard '+selected.shard.index+'/2')));}
}
const failed=runWeb(['--shard','1/2'],'tests/'+expectedWebSuites[0]+'.cjs');
assert.equal(failed.exitCode,1);assert.equal(failed.calls.length,lists[0].suites.length,'A failing suite must not suppress the remainder of its shard');
for(const args of invalidArguments){const rejected=runWeb(args);assert.equal(rejected.exitCode,1);assert.equal(rejected.calls.length,0);assert.equal(rejected.reports.length,0);}
for(const args of [['--list'],['--list','--shard','1/2'],['--list','--shard','2/2']]) {
 const result=runWeb(args);assert.equal(result.calls.length,0);assert.equal(result.reports.length,0);
 assert.deepEqual(JSON.parse(result.logs[0]),runner.selection(runner.parseArguments(args)));
}

// --artifact-only may skip only source suites and only in a bundle-only check.
// The exact command order above requires all three source suites before BOTH
// artifact-only invocations; default and bare --bundle-only retain full coverage.
const assetPath=path.resolve('tests/ios-assets.cjs'),assetSource=fs.readFileSync(assetPath,'utf8');
function assetSourceCoverage(args) {
 const loaded=[],logs=[],stop=Error('Reached artifact verification');
 const fakeRequire=name=>{
  if(name==='node:fs')return {readFileSync(){throw stop;}};
  if(name==='./ios-branding.cjs'||name==='../scripts/native-bundle-source.cjs')return {};
  if(name.startsWith('./native-resume-')){loaded.push(name);return {};}
  return require(name);
 };
 let stopped=false;
 try{vm.runInNewContext(assetSource,{require:fakeRequire,__dirname:path.dirname(assetPath),process:{argv:['node',assetPath,...args]},console:{log:value=>logs.push(value)}});}
 catch(error){if(error===stop)stopped=true;else throw error;}
 assert(stopped,'Every supported asset invocation must reach all artifact checks');
 return {loaded,logs};
}
const recovery=['./native-resume-store.cjs','./native-resume-adapter.cjs','./native-resume-game.cjs'];
for(const args of [[],['--bundle-only']])assert.deepEqual(assetSourceCoverage(args).loaded,recovery);
for(const args of [['--bundle-only','--artifact-only'],['--built'],['--built','--release']]) {
 const result=assetSourceCoverage(args);assert.deepEqual(result.loaded,[]);assert(result.logs.some(value=>value.includes('SKIP')&&value.includes('source-only')));
}
for(const args of [['--artifact-only'],['--artifact-only','--built'],['--artifact-only','--bundle-only','--built'],['--artifact-only','--bundle-only','--release'],['--unknown']])assert.throws(()=>assetSourceCoverage(args));
const suite=fs.readFileSync('tests/firestore/score-metadata.mjs','utf8');
assert.match(suite,/if\(host!=='127\.0\.0\.1:8089'\)throw Error/);
assert.match(suite,/projectId:`demo-score-\$\{label\}`/);
assert(!/bouldering-7482d|js\/firebase-client|firebase-admin/.test(suite));
console.log('PASS offline CI: fixed dependencies/actions, read-only independent jobs, exact complete Web shard union and 180s limits, full native source coverage before both artifact-only bundles; no production access');
