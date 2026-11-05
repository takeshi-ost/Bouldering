'use strict';
// Production-mode gates, including exact oracle parity and real resource play.
const {spawnSync}=require('node:child_process');
const results=[];
const boundary=spawnSync(process.execPath,['tests/coupled-production-boundary.cjs'],{stdio:'inherit'});
if(boundary.status!==0)process.exit(1);
for(const native of [false,true])for(const file of ['coupled-limb-order','finger-aim','coupled-anchor-ties','coupled-body','finger-route','coupled-search-prepasses','coupled-source-search-policy','coupled-motion-performance','coupled-course-cache','coupled-production-population']){
 const env={...process.env,ASCENT_NATIVE_TEST:native?'1':'0',ASCENT_POPULATION_STAGES:'0,1',ASCENT_POPULATION_DATES:'none',ASCENT_POPULATION_TAG:'ci-smoke'};
 const start=Date.now();const result=spawnSync(process.execPath,['tests/'+file+'.cjs'],{stdio:'inherit',env,timeout:180000});
 results.push({native,file,passed:result.status===0&&!result.error,ms:Date.now()-start,error:result.error?.message});
}
console.log(JSON.stringify({coupled:true,results},null,2));if(results.some(r=>!r.passed))process.exitCode=1;
