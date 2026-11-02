'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),target='ios/App/App/SceneDelegate.swift';
function instrument(source,harness,script){
 const anchor='        super.capacitorDidLoad()';
 if(source.split(anchor).length!==2||source.includes('installAscentRuntimeSmoke'))throw Error('Unreviewed native runtime anchor');
 if(harness.split('__SCRIPT_BASE64__').length!==2)throw Error('Unreviewed smoke harness');
 const call='\n#if DEBUG && targetEnvironment(simulator)\n        installAscentRuntimeSmoke()\n#endif';
 return source.replace(anchor,anchor+call)+'\n'+harness.replace('__SCRIPT_BASE64__',Buffer.from(script).toString('base64'));
}
module.exports={instrument,target};
if(require.main===module){
 if(process.argv.length!==3||process.argv[2]!=='--apply'||process.env.GITHUB_ACTIONS!=='true'||process.env.RUNNER_OS!=='macOS'||process.env.ASCENT_FIREBASE_MODE!=='offline')throw Error('Only disposable GitHub macOS offline CI may instrument this copy');
 const p=path.join(root,target);
 fs.writeFileSync(p,instrument(fs.readFileSync(p,'utf8'),fs.readFileSync(path.join(root,'tests/ios-runtime-harness.swift'),'utf8'),fs.readFileSync(path.join(root,'tests/ios-runtime-smoke.js'),'utf8')));
 console.log('Instrumented only disposable CI native copy; production game sources unchanged');
}
