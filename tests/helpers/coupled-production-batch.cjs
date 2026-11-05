'use strict';
// Exactly two balanced child processes. Run only after gameplay source is frozen.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=process.env.ASCENT_POPULATION_OUT||path.join(root,'build/coupled-population');fs.mkdirSync(out,{recursive:true});
const dates=require('../coupled-production-harness.cjs')(`const byFamily=new Map();for(let d=1;d<=365;d++){const date=new Date(Date.UTC(2026,0,d)).toISOString().slice(0,10),r=CourseProgression.recipe(CourseProgression.resolveDaily(date)),key=r.type+':'+r.composition+':'+r.secondType;if(!byFamily.has(key))byFamily.set(key,date);}return [...new Set(['2026-01-16','2026-10-23','2026-11-05',...byFamily.values()])];`);
const tag=process.env.ASCENT_POPULATION_BATCH_TAG||'final',children=[];
const shards=process.env.ASCENT_POPULATION_SHARD===undefined?[0,1]:[Number(process.env.ASCENT_POPULATION_SHARD)];if(shards.some(p=>p!==0&&p!==1))throw Error('ASCENT_POPULATION_SHARD must be0 or1');
Promise.all(shards.map(parity=>new Promise(resolve=>{
 const name=tag+'-'+(parity?'odd':'even'),stages=Array.from({length:201},(_,i)=>i*2+parity),subset=dates.filter((_,i)=>i%2===parity),file=path.join(out,name+'.log'),fd=fs.openSync(file,'w');
 const child=spawn(process.execPath,['tests/coupled-production-population.cjs'],{cwd:root,env:{...process.env,ASCENT_POPULATION_STAGES:stages.join(','),ASCENT_POPULATION_DATES:subset.join(','),ASCENT_POPULATION_TAG:name,ASCENT_POPULATION_OUT:out,ASCENT_POPULATION_SNAPSHOTS:'1'},stdio:['ignore',fd,fd]});children.push(child);fs.closeSync(fd);
 console.log(JSON.stringify({shard:name,pid:child.pid,stages:stages.length,dates:subset.length,log:file}));
 child.on('error',error=>resolve({shard:name,error:String(error),exitCode:1}));child.on('exit',(code,signal)=>resolve({shard:name,exitCode:code??1,signal}));
}))).then(results=>{fs.writeFileSync(path.join(out,tag+'-'+shards.join('')+'-batch-result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));if(results.some(r=>r.exitCode!==0))process.exitCode=1;});
process.on('SIGINT',()=>{for(const child of children)child.kill('SIGINT');});
