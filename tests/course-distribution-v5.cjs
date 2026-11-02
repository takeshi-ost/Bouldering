'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),context=vm.createContext({});
// Freeze the historical v5/v6 data as well as its named RNG algorithm.
vm.runInContext(fs.readFileSync(path.join(root,'js/course-distribution-config.js'),'utf8'),context);
vm.runInContext("CourseDistributionConfig.version='6'; CourseDistributionConfig.tables.spikes.rows[1].score=5;",context);
vm.runInContext(fs.readFileSync(path.join(root,'js/course-distribution.js'),'utf8'),context);
// Golden digest generated from the approved Site41 original sampler, before
// renaming its public globals. Includes all101 scores and256 fixed seeds each.
const hash=crypto.createHash('sha256');
for(let score=0;score<=100;score++)for(let seed=0;seed<256;seed++)hash.update(JSON.stringify(context.CourseDistribution.sampleLegacyV5(score,seed))+'\n');
assert.equal(hash.digest('hex'),'449bac085479a90d9273c07cf09fcfd83f0bd7139eff1b75af5165bb4d2fcdf3');
console.log('PASS Site41 v5 exact sampler parity: 25,856 score/seed recipes, unchanged length/profile/composition/heart/spike draws');
