'use strict';
// Native SDK/control only. Not the complete game wrapper or an Xcode build.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'ascent-native-sdk-'));
try {
  require('../scripts/build-native-firebase.cjs')(root,out,'offline');
  const metadata=JSON.parse(fs.readFileSync(path.join(out,'native-firebase-mode.json'),'utf8'));
  assert.deepEqual(metadata,{mode:'offline',sdkVersion:'12.11.0'});
  const sdk=fs.readFileSync(path.join(out,'vendor/firebase-sdk.js'),'utf8');
  const controller=fs.readFileSync(path.join(out,'js/native-firebase-control.js'),'utf8');
  assert(sdk.length>100000,'Real Firebase SDK must have been bundled by esbuild');
  assert(!/deleteUser:/.test(sdk),'Offline SDK excludes account deletion');
  assert(!/import\s*\(\s*['"]https?:/.test(sdk));
  assert(!/apiKey\s*:|config = \{/.test(controller),'Offline bundle must not include connection configuration');
  const run=spawnSync(process.execPath,['tests/native-firebase-bundle.cjs'],{
    cwd:root,env:{...process.env,ASCENT_NATIVE_TEST_DIR:out},encoding:'utf8',timeout:30000
  });
  process.stdout.write(run.stdout||'');process.stderr.write(run.stderr||'');
  assert.equal(run.error,undefined);assert.equal(run.status,0);
  for(const mode of ['read-only','auto-sync']) {
    require('../scripts/build-native-firebase.cjs')(root,out,mode);
    const connectedSdk=fs.readFileSync(path.join(out,'vendor/firebase-sdk.js'),'utf8');
    assert.match(connectedSdk,/signInAnonymously:/,mode+' must ship the actual anonymous sign-in SDK function');
    assert.equal(/deleteUser:/.test(connectedSdk),mode==='auto-sync','Deletion SDK ships only with auto-sync');
    const connectedController=fs.readFileSync(path.join(out,'js/native-firebase-control.js'),'utf8');
    assert.match(connectedController,/createAnonymous: true/);
  }
  console.log('PASS native SDK packaging: real esbuild/Firebase dependency; offline VM gates; read-only/auto-sync anonymous SDK included; NOT an Xcode build or device verification');
} finally {fs.rmSync(out,{recursive:true,force:true});}
