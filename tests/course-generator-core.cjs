'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {create}=require('./helpers/course-core-fixture.cjs');
const root=path.resolve(__dirname,'..'),fixtureDir=path.join(__dirname,'fixtures');
const manifest=require('./fixtures/course-generator-site41.manifest.json');
const archive=fs.readFileSync(path.join(fixtureDir,'course-generator-site41.json.gz'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
assert.equal(sha(archive),manifest.archiveSha256);
const original=JSON.parse(zlib.gunzipSync(archive));
for(const [file,text] of Object.entries(original))assert.equal(sha(text),manifest.files[file],file+' provenance');
const core=fs.readFileSync(path.join(root,'js/course-generator-core.js'),'utf8');
const nativeCore=original['skeleton.js'].slice(0,original['skeleton.js'].indexOf('function labPostStatus('));
const extract=source=>source.slice(source.indexOf('// For nonzero spikes'),source.indexOf('function labPostStatus(')<0?source.indexOf('// Explicit production boundary.'):source.indexOf('function labPostStatus(')).trim();
const originalRun=create({engineSources:original,coreSource:nativeCore,staminaSource:original['stamina-settings.js']});
const extractedRun=create({engineSources:original,productionBoundary:true});
function expectedV6(config){
 const expected=originalRun(config);
 if(config.length==='short'){
  assert.equal(config.heartsFirst+config.heartsSecond,0,'Legacy geometry parity uses zero-heart shorts');
  assert.equal(expected.report.hearts.disabledReason,'short-hearts-disabled');
  // v6 no longer disables all short pickups; only this diagnostic changes for 0 hearts.
  expected.report.hearts.disabledReason=null;
 }
 return expected;
}
// The trial adds explicit guarded dispatch and trace-aware resource checks.
// Normalize only these reviewed exact edits for this historical source identity
// assertion; the native behavior parity cases below still execute unchanged.
function withoutFingerHooks(text){
 for(const [before,after] of [
  [" if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerReplayRoute(path,{partial:true});\n",''],
  [" if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerPartialSearch(guide,{start,stance,limit,maxMoves,stop,forwardOnly});\n",''],
  [" if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerPartialSearch(guide,{start,stance,limit,maxMoves,stop,forwardOnly,accept});\n",''],
  [" if(typeof fingerAimEnabled==='function'&&fingerAimEnabled())return fingerValidateDragReference(path);\n",''],
  ["typeof fingerAimEnabled==='function'&&fingerAimEnabled()?fingerRouteTouchesHeart(route[i],q,point):torsoTouchesHeart(route[i],q,point)",'torsoTouchesHeart(route[i],q,point)'],
  ["grips:contactIds,...(reachable.action?{action:reachable.action,trace:reachable.trace}: {})",'grips:contactIds'],
  [`   const trace=typeof fingerAimEnabled==='function'&&fingerAimEnabled()&&route[i].action?route[i].trace:[route[i-1],route[i]];
   for(let j=1;j<trace.length;j++){
    const a=trace[j-1],b=trace[j],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
    const t=den?clamp(((h.x-a.x)*dx+(h.y-a.y)*dy)/den,0,1):0;
    best=Math.min(best,Math.hypot(h.x-a.x-t*dx,h.y-a.y-t*dy));
   }`, `   const a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
   const t=den?clamp(((h.x-a.x)*dx+(h.y-a.y)*dy)/den,0,1):0;
   best=Math.min(best,Math.hypot(h.x-a.x-t*dx,h.y-a.y-t*dy));`]
 ])text=text.replaceAll(before,after);
 return text;
}
test('native generator math remains identical after reviewed isolated finger hooks and prior approved changes; no trial boot/transport hooks',()=>{
 const withoutDiagnostics=text=>text
  // The only v6 core math change is the approved short pickup cap policy.
  .replace(/ \/\/ Short trials explicitly disable pickups;[\s\S]*?const disabledReason=config.length==='short'\?'short-hearts-disabled':null,effectiveRequested=disabledReason\?\{first:0,second:0\}:requested;/, ' SHORT_HEART_POLICY;')
  .replace(/ \/\/ v6 allows a single pickup[\s\S]*?const disabledReason=null,effectiveRequested=requested;/, ' SHORT_HEART_POLICY;')
  .replace(/\/\/ BEGIN typed native boundary:[\s\S]*?\/\/ END typed native boundary\.\n/g,'')
  .replaceAll('new CourseGeometryRejection(', 'Error(')
  .replaceAll('if(!(e instanceof CourseGeometryRejection))throw e;', '')
  .replaceAll('if(!(error instanceof CourseGeometryRejection))throw error;', '')
  .replaceAll(',{cause:e}', '')
  .replace(/Error\((['`])[\s\S]*?\1\)/g, 'Error("diagnostic")');
 assert.equal(withoutDiagnostics(withoutFingerHooks(extract(core))),withoutDiagnostics(extract(original['skeleton.js'])));
 for(const forbidden of ['function labBootSkeleton','labBootSkeleton();','function labReadConfig','function labPostStatus','postMessage(', 'localStorage','sessionStorage','function labFailSkeleton','recordStageClear=','finish=function','reset=function','document.'])assert(!core.includes(forbidden),forbidden);
});
const cases=[];
for(const type of ['straight','meander','contrast','branch','switchback'])cases.push({type,length:'middle',seed:42,heartsFirst:2,heartsSecond:2,spikePercent:30});
for(const [type,secondType] of [['straight','meander'],['branch','contrast'],['switchback','straight'],['switchback','switchback'],['meander','branch']])cases.push({type,secondType,composition:'pair',length:'long',seed:42,heartsFirst:2,heartsSecond:1,spikePercent:10});
cases.push({type:'straight',length:'short',seed:1,heartsFirst:0,heartsSecond:0,spikePercent:0});
for(const config of cases)test(`original/extracted parity: ${config.type}/${config.secondType??'single'} ${config.length} seed ${config.seed}`,()=>{
 const expected=expectedV6(config),actual=extractedRun(config);
 assert.deepEqual(actual,expected,'same geometry, route, contacts, actual hearts, stamina and full diagnostic report');
 assert.equal(actual.report.validated,true);
 assert.equal(actual.stamina.initialStamina,actual.stamina.baseBudget-actual.stamina.appliedReduction);
});
test('production boundary restores real stage/daily identity and exposes immutable reports',()=>{
 const config={type:'straight',length:'short',seed:1,heartsFirst:0,heartsSecond:0,spikePercent:0};
 const check=extractedRun.identityContract(config);
 assert.equal(check.identityRestored,true);assert.equal(check.error,undefined);assert.equal(check.holdsBound,true);assert.equal(check.previousActiveRestored,true);
 assert.deepEqual(check.recipeIdentity,{level:207,difficulty:3,mode:'prototype',seed:1});
 assert(Object.isFrozen(check.result));assert(Object.isFrozen(check.result.report));assert(Object.isFrozen(check.result.stamina));assert(Object.isFrozen(check.result.hearts));assert(Object.isFrozen(check.result.report.placement));
 const failed=extractedRun.identityContract(config,true);
 assert.equal(failed.error,'injected post-generation failure');assert.equal(failed.identityRestored,true);assert.equal(failed.geometryRestored,true);assert.equal(failed.previousActiveRestored,true);
 for(const seed of ['',null,false,-1,1.5,4294967296])assert.match(extractedRun.identityContract({...config,seed}).error,/Invalid course recipe seed/);
});
// Test the extracted engine against the latest production/Mac physics separately
// from frozen-source equivalence. Restore a real non-tutorial identity, bind the
// formal course, then verify the final route still replays under that identity.
for(const config of cases)test(`latest native engine and bound replay: ${config.type}/${config.secondType??'single'} ${config.length}`,()=>{
 const expected=expectedV6(config),check=create({productionBoundary:true}).postBindReplay(config);
 assert.equal(check.error,undefined,'fixed regression configuration must generate; never replace the seed');
 assert.equal(check.identityRestored,true);assert.equal(check.replays,true,'real stage 207 must not reimpose the retired traverse rule');
 assert.deepEqual(check.geometry,expected,'latest native generator must preserve approved trial geometry/route/hearts/stamina');
});

test('v6 short heart cap allows one and rejects two instead of silent disabling',()=>{
 const helper=create({productionBoundary:true});
 const base={type:'contrast',length:'short',seed:22,heartsFirst:1,heartsSecond:0,spikePercent:0};
 assert.equal(helper(base).hearts.length,1);
 assert.throws(()=>helper({...base,heartsSecond:1}),/Short course heart caps must total at most 1/);
});

test('latest native wrapper preserves prior active course and binds final post-spike holds',()=>{
 const config={type:'meander',length:'middle',seed:42,heartsFirst:2,heartsSecond:2,spikePercent:30};
 const helper=create({productionBoundary:true}),expected=originalRun(config);
 const check=helper.identityContract(config);
 assert.equal(check.error,undefined);assert.equal(check.holdsBound,true);assert.equal(check.previousActiveRestored,true);assert.equal(check.identityRestored,true);
 assert.deepEqual(check.result.report,expected.report,'prior active course must not change internal legacy solver constraints');
 const failure=helper.identityContract(config,true);
 assert.equal(failure.error,'injected post-generation failure');assert.equal(failure.previousActiveRestored,true);assert.equal(failure.geometryRestored,true);
});

test('only expected geometry rejections are retryable and composite causes survive',()=>{
 const helper=create({engineSources:original,productionBoundary:true});
 const short={type:'straight',length:'short',seed:1,heartsFirst:0,heartsSecond:0,spikePercent:0};
 const pair={...short,length:'middle',composition:'pair',secondType:'straight'};
 const rejected=helper.errorContract({type:'switchback',length:'middle',seed:201,heartsFirst:2,heartsSecond:3,spikePercent:0});
 assert.equal(rejected.typed,true);assert.equal(rejected.name,'Error');
 for(const config of [{...short,type:'invalid'},{...short,heartsFirst:4},{...short,spikePercent:11},{...short,staminaRules:'bad'}]){
  const error=helper.errorContract(config);assert.equal(error.caught,true);assert.equal(error.typed,false);
 }
 const wrapped=helper.errorContract(pair,'typed');assert.equal(wrapped.typed,true);assert.equal(wrapped.causeSame,true);assert.match(wrapped.message,/Section 1/);
 const programming=helper.errorContract(pair,'programming');assert.equal(programming.typed,false);assert.equal(programming.same,true);assert.equal(programming.calls,1);
 const native=helper.errorContract(short,'native');assert.equal(native.typed,true);assert.equal(native.causeSame,true);
 const nativeType=helper.errorContract(short,'native-type');assert.equal(nativeType.typed,false);assert.equal(nativeType.same,true);
 const recovery=helper.errorContract({...short,type:'switchback',length:'middle'},'switchback-programming');
 assert.equal(recovery.typed,false);assert.equal(recovery.same,true);assert.equal(recovery.calls,1,'internal variants must not hide programming errors');
});
