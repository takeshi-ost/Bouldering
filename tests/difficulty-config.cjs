'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>m[1]);
assert.equal(scripts.filter(p=>p==='js/difficulty-config.js').length,1);
assert(scripts.indexOf('js/config.js')<scripts.indexOf('js/difficulty-config.js'));
assert(scripts.indexOf('js/difficulty-config.js')<scripts.indexOf('js/difficulty.js'));
for(const file of ['course-progression-config','course-distribution-config','course-distribution','course-progression'])assert.equal(scripts.filter(p=>p==='js/'+file+'.js').length,1);
assert(scripts.indexOf('js/course-progression-config.js')<scripts.indexOf('js/course-progression.js'));
assert(scripts.indexOf('js/course-distribution-config.js')<scripts.indexOf('js/course-distribution.js'));
assert(scripts.indexOf('js/course-distribution.js')<scripts.indexOf('js/course-progression.js'));
assert(scripts.indexOf('js/course-progression.js')<scripts.indexOf('js/difficulty.js'));

const config=fs.readFileSync(path.join(root,'js/config.js'),'utf8');assert(!config.includes('const DIFFICULTY_CONFIG'));
const env=`const nodes={};const document={getElementById(id){return nodes[id]||=( {style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false},getContext(){return new Proxy({},{get:(o,k)=>o[k]||(()=>{})})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}})}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
const probe=`
assert.equal(DIFFICULTY_CONFIG.stageBands,undefined,'Retired stage table must not return');
assert.equal(DIFFICULTY_CONFIG.daily,undefined,'Daily no longer samples legacy type weights');
assert.equal(CourseProgressionConfig.version,'5');assert.equal(CourseProgressionConfig.daily.version,'1');assert.equal(CourseDistribution.version,'7');
for(let n=1;n<10001;n++){
 const resolved=CourseProgression.resolveStage(n),recipe=CourseProgression.recipe(resolved);
 assert.equal(courseTypeLabel(courseTypeForStage(n)),resolved.difficultyLabel);
 assert.equal(stageLengthInfo(n).category,recipe.length==='middle'?'medium':recipe.length);
 assert.equal(stageLengthInfo(n).height,{short:H,middle:H*2,long:MAX_HEIGHT}[recipe.length]);
}
for(let i=1;i<=28;i++){const date='2026-02-'+String(i).padStart(2,'0'),p=dailyProfile(date),resolved=CourseProgression.resolveDaily(date);assert.equal(p.generationScore,resolved.score);assert.equal(p.seed,resolved.seed);assert.equal(courseTypeLabel(p.typeId),resolved.difficultyLabel);}
const original=JSON.stringify(CourseProgressionConfig),daily=CourseProgression.dailyScore('2026-02-01');
CourseProgressionConfig.stageSegments[0].toScore=5;assert.equal(CourseProgression.stageScore(20),5);assert.equal(CourseProgression.dailyScore('2026-02-01'),daily);Object.assign(CourseProgressionConfig,JSON.parse(original));
`;
const source=scripts.map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');new Function('assert',env+source+probe)(assert);
console.log('PASS editable formal score config: no old stage table, 10000 score/recipe length checks, editable interpolation independent of Daily, 28 date mappings, classic script order');
