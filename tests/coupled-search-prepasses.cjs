'use strict';
// Search ordering must preserve every physical constraint and original fallback.
const assert=require('node:assert/strict'),fs=require('fs');const s=fs.readFileSync(require('node:path').join(__dirname,'../js/finger-route.js'),'utf8'),wrapper=s.slice(s.indexOf('function fingerPartialSearch(guide,'),s.indexOf('function fingerSolveRoute('));
const stop=()=>true,accept=()=>false,guide=[{x:100,y:200}],start=guide[0],stance=[1,2,3,4];
function run(options,foundAt=-1){const calls=[];const search=new Function('fingerPartialSearchBounded',"let fingerRouteSearchStrategy='hybrid';\n"+wrapper+';return fingerPartialSearch;')((g,o)=>{calls.push(o);assert.strictEqual(g,guide);return {found:calls.length===foundAt,transitions:calls.length,beamWidth:o.beamWidth??12,path:null}});const result=search(guide,options);return {calls,result};}
const options={start,stance,limit:10000,maxMoves:24,stop,accept,forwardOnly:true,needsTraverse:true};
for(const preferGreedy of [false,true]){const {calls,result}=run({...options,preferGreedy});assert.equal(calls.length,3);assert.deepEqual(calls.map(o=>o.beamWidth??12),preferGreedy?[3,1,12]:[1,3,12]);assert.deepEqual(calls.map(o=>o.limit),preferGreedy?[2400,3600,10000]:[3600,2400,10000]);for(const o of calls)for(const key of ['start','stance','maxMoves','stop','accept','forwardOnly','needsTraverse'])assert.strictEqual(o[key],options[key]);assert.equal(result.totalTransitions,6);assert.deepEqual(result.prepasses.map(p=>p.name),preferGreedy?['greedy','narrow','full']:['narrow','greedy','full']);}
for(const foundAt of [1,2,3]){const {calls,result}=run(options,foundAt);assert.equal(calls.length,foundAt);assert.equal(result.found,true);assert.equal(result.totalTransitions,foundAt*(foundAt+1)/2);}
assert.equal(run({...options,beamWidth:1}).calls.length,1);
for(const preferGreedy of [false,true]){const {calls}=run({...options,preferGreedy,greedy:true});assert.equal(calls.at(-1).greedy,false);assert.equal(calls.find(o=>o.beamWidth===1).greedy,false);}
assert.equal(run({...options,beamWidth:1,greedy:true}).calls[0].greedy,false);
for(const {limit} of run({...options,limit:50}).calls)assert.equal(limit,50);
console.log('PASS prepass order, bounded fallback, callback/constraint identity, limits, early success, aggregate transition counts');
