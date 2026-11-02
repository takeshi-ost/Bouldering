'use strict';
const CourseDistribution=(()=>{
 const config=CourseDistributionConfig;
 function scoreValue(value){
  if(!/^(?:0|[1-9]\d?|100)$/.test(String(value)))throw Error('Invalid course distribution setting (1)');
  return Number(value);
 }
 function seedValue(value){
  if(!/^\d{1,10}$/.test(String(value))||Number(value)>4294967295)throw Error('Invalid course distribution setting (2)');
  return Number(value);
 }
 function probabilities(value,name){
  const score=scoreValue(value),table=config.tables[name];
  if(!table||!Array.isArray(table.values)||!table.values.length||!table.rows?.length)throw Error('Invalid course distribution setting (3)');
  const normalized=table.rows.map((row,i)=>{
   if(!Number.isFinite(row.score)||(i&&row.score<=table.rows[i-1].score)||row.weights.length!==table.values.length||row.weights.some(w=>!Number.isFinite(w)||w<0))throw Error('Invalid course distribution setting (3)');
   const sum=row.weights.reduce((a,b)=>a+b,0);if(sum<=0)throw Error('Invalid course distribution setting (4)');
   return {score:row.score,weights:row.weights.map(w=>w/sum)};
  });
  let low=normalized[0],high=normalized.at(-1);
  if(score<=low.score)return low.weights.slice();
  if(score>=high.score)return high.weights.slice();
  for(let i=1;i<normalized.length;i++)if(score<=normalized[i].score){low=normalized[i-1];high=normalized[i];break;}
  const t=(score-low.score)/(high.score-low.score);
  return low.weights.map((w,i)=>w+(high.weights[i]-w)*t);
 }
 // Base tables stay unchanged. These are the actual whole-course joint events.
 function baseJoint(score){
  const q=(1-probabilities(score,'length')[0])*(1-probabilities(score,'hearts')[0]**2);
  const z=1-probabilities(score,'spikes')[0];
  return categories(q,z,q*z);
 }
 function categories(q,z,b){return {heartOnly:q-b,spikeOnly:z-b,both:b,neither:1-q-z+b};}
 function jointProbabilities(value){
  const score=scoreValue(value),trial=config.jointTrial;
  if(!trial||score<trial.startScore||score>=trial.rejoinScore)return baseJoint(score);
  const lower=score<=trial.endScore?categories(trial.start.heart,trial.start.spike,trial.start.both):categories(trial.end.heart,trial.end.spike,trial.end.both);
  const upper=score<=trial.endScore?categories(trial.end.heart,trial.end.spike,trial.end.both):baseJoint(trial.rejoinScore);
  const t=score<=trial.endScore?(score-trial.startScore)/(trial.endScore-trial.startScore):(score-trial.endScore)/(trial.rejoinScore-trial.endScore);
  const result=Object.fromEntries(Object.keys(lower).map(k=>[k,lower[k]+(upper[k]-lower[k])*t]));
  const values=Object.values(result),q=result.heartOnly+result.both,m=1-probabilities(score,'length')[0];
  if(values.some(p=>!Number.isFinite(p)||p<0||p>1)||Math.abs(values.reduce((a,b)=>a+b,0)-1)>1e-12||q>m+1e-12)throw Error('Invalid course distribution setting (5)');
  return result;
 }
 // Preserve the old pair distribution conditional on at least one heart.
 // A direct 15-cell draw avoids rejection loops and guarantees a positive pair.
 function positiveHeartPairs(value){
  const p=probabilities(value,'hearts'),normalizer=1-p[0]**2;
  if(normalizer<=0)return [];
  return p.flatMap((a,i)=>p.map((b,j)=>({first:config.tables.hearts.values[i],second:config.tables.hearts.values[j],probability:a*b/normalizer})).filter(pair=>pair.first+pair.second>0));
 }
 function choose(weights,values,r){
  let total=0;for(let i=0;i<weights.length;i++){total+=weights[i];if(r<total)return values[i];}
  // Floating point accumulation may end just below 1. Never pick a zero cell.
  for(let i=weights.length-1;i>=0;i--)if(weights[i]>0)return values[i];
  throw Error('Invalid course distribution setting (4)');
 }
 // Independent named substreams keep later choices stable if another draw is added.
 function random(seed,name){
  let hash=(seed^2166136261)>>>0;
  for(const c of 'ascent-distribution-v'+(config.randomVersion??config.version)+':'+name)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  let t=(hash+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 }
 function sampleLegacyV5(value,seedInput){
  const score=scoreValue(value),seed=seedValue(seedInput);
  const pick=(table,stream)=>{
   const weights=probabilities(score,table),r=random(seed,stream);let total=0;
   for(let i=0;i<weights.length;i++){total+=weights[i];if(r<total)return config.tables[table].values[i];}
   return config.tables[table].values.at(-1);
  };
  const length=pick('length','length'),composition=length==='short'?'single':pick('composition','composition');
  const result={type:pick('profile','profile-first'),length,seed:String(seed),heartsFirst:length==='short'?0:pick('hearts','hearts-first'),heartsSecond:length==='short'?0:pick('hearts','hearts-second'),spikePercent:pick('spikes','spikes'),generationScore:score,distributionVersion:'5'};
  if(composition==='pair')Object.assign(result,{composition,secondType:pick('profile','profile-second')});
  const trial=config.jointTrial;
  if(trial&&score>=trial.startScore&&score<trial.rejoinScore){
   const joint=jointProbabilities(score),q=joint.heartOnly+joint.both,m=1-probabilities(score,'length')[0];
   const hasHeart=length!=='short'&&random(seed,'joint-heart-presence')<q/m;
   result.heartsFirst=0;result.heartsSecond=0;result.spikePercent=0;
   if(hasHeart){
    const pairs=positiveHeartPairs(score),pair=choose(pairs.map(p=>p.probability),pairs,random(seed,'joint-heart-pair'));
    result.heartsFirst=pair.first;result.heartsSecond=pair.second;
   }
   const spikeChance=hasHeart?joint.both/q:joint.spikeOnly/(1-q);
   if(random(seed,'joint-spike-presence')<spikeChance){
    const p=probabilities(score,'spikes'),sum=1-p[0];
    result.spikePercent=choose(p.slice(1).map(w=>w/sum),config.tables.spikes.values.slice(1),random(seed,'joint-spike-level'));
   }
  }
  return result;
 }
 // These are conditional probabilities on an already-drawn short course.
 // When the old global marginals cannot fit, reduce both proportionally.
 function shortFeatureProbabilities(value){
  const score=scoreValue(value),short=probabilities(score,'length')[0];
  const joint=jointProbabilities(score),q=joint.heartOnly+joint.both,z=joint.spikeOnly+joint.both;
  const divisor=Math.max(short,q+z);
  const heart=divisor>0?q/divisor:0,spike=divisor>0?z/divisor:0;
  return {heart,spike,neither:Math.max(0,1-heart-spike)};
 }
 function sample(value,seedInput){
  const result=sampleLegacyV5(value,seedInput),score=result.generationScore,seed=Number(result.seed);
  result.distributionVersion=config.version;
  if(score<=config.balance.exclusiveMaxScore){
   result.heartsFirst=0;result.heartsSecond=0;result.spikePercent=0;
   if(result.length==='short'){
    const p=shortFeatureProbabilities(score);
    const feature=choose([p.heart,p.spike,p.neither],['heart','spike','neither'],random(seed,'v6-short-exclusive-feature'));
    if(feature==='heart')result.heartsFirst=config.balance.shortHeartCap;
    if(feature==='spike'){
     const weights=probabilities(score,'spikes'),sum=1-weights[0];
     result.spikePercent=choose(weights.slice(1).map(w=>w/sum),config.tables.spikes.values.slice(1),random(seed,'v6-short-exclusive-spike-level'));
    }
   }
  }else if(result.length==='short'){
   result.heartsFirst=random(seed,'v6-short-heart-presence')<1-probabilities(score,'hearts')[0]?config.balance.shortHeartCap:0;
   result.heartsSecond=0;
  }
  return result;
 }
 return Object.freeze({probabilities,jointProbabilities,positiveHeartPairs,shortFeatureProbabilities,sampleLegacyV5,sample,scoreValue,version:config.version});
})();
globalThis.CourseDistribution=CourseDistribution;
