'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),context=vm.createContext({});
// Freeze the historical v5/v6 data as well as its named RNG algorithm.
vm.runInContext(fs.readFileSync(path.join(root,'js/course-distribution-config.js'),'utf8'),context);
vm.runInContext("CourseDistributionConfig.version='6'; CourseDistributionConfig.tables.spikes.rows[1].score=5;",context);
vm.runInContext(fs.readFileSync(path.join(root,'js/course-distribution.js'),'utf8'),context);
const distribution=context.CourseDistribution,plain=x=>JSON.parse(JSON.stringify(x));
test('v6 preserves all original v5 draws through the explicit legacy API',()=>{
 const hash=crypto.createHash('sha256');
 for(let score=0;score<=100;score++)for(let seed=0;seed<256;seed++)hash.update(JSON.stringify(distribution.sampleLegacyV5(score,seed))+'\n');
 assert.equal(hash.digest('hex'),'449bac085479a90d9273c07cf09fcfd83f0bd7139eff1b75af5165bb4d2fcdf3');
});
test('v6 is deterministic, exclusive at low scores, and preserves higher-score nonshort recipes exactly',()=>{
 let shortHearts=0,shortSpikes=0,middle=0;
 for(let score=0;score<=100;score++)for(let seed=0;seed<256;seed++){
  const actual=plain(distribution.sample(score,seed)),old=plain(distribution.sampleLegacyV5(score,seed));
  assert.deepEqual(actual,plain(distribution.sample(score,seed)));
  assert.equal(actual.distributionVersion,'6');
  for(const key of ['length','type','composition','secondType','seed','generationScore'])assert.equal(actual[key],old[key],key);
  if(actual.length==='short'){
   assert(actual.heartsFirst+actual.heartsSecond<=1);assert.equal(actual.heartsSecond,0);
   if(actual.heartsFirst)shortHearts++;
   if(actual.spikePercent)shortSpikes++;
   if(score>20)assert.equal(actual.spikePercent,old.spikePercent);
  }else if(score>20){assert.deepEqual(actual,{...old,distributionVersion:'6'});middle++;}
  if(score<=20)assert(Number(actual.length!=='short')+Number(actual.heartsFirst+actual.heartsSecond>0)+Number(actual.spikePercent>0)<=1);
  if(score<=3){assert.equal(actual.heartsFirst+actual.heartsSecond,0);assert.equal(actual.spikePercent,0);assert.equal(actual.type,'straight');}
 }
 assert(shortHearts>0&&shortSpikes>0&&middle>0);
});
test('exclusive probabilities preserve feasible whole-course marginals and scale infeasible ones equally',()=>{
 for(let score=0;score<=20;score++){
  const p=distribution.shortFeatureProbabilities(score),joint=distribution.jointProbabilities(score),s=distribution.probabilities(score,'length')[0],q=joint.heartOnly+joint.both,z=joint.spikeOnly+joint.both,scale=Math.min(1,s/(q+z||1));
  assert(Math.abs(p.heart*s-q*scale)<1e-12);assert(Math.abs(p.spike*s-z*scale)<1e-12);
  assert(Math.abs(p.heart+p.spike+p.neither-1)<1e-12);
 }
 const p=distribution.shortFeatureProbabilities(20);
 assert.equal(p.neither,0);assert(p.heart>0&&p.spike>0,'neither feature has priority');
});
