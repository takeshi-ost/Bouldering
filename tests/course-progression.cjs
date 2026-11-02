'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const context=vm.createContext({});
for(const file of ['course-progression-config','course-distribution-config','course-distribution','course-progression'])
    vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),context);
const api=context.CourseProgression,config=context.CourseProgressionConfig;
test('approved v3 endpoints, round-nearest, intentional 80→81 and 200→201 score drops',()=>{
    for(const [stage,score] of [[1,1],[2,2],[3,3],[20,20],[21,21],[80,40],[81,35],[200,45],[201,40],[210,41],[399,50],[400,50],[401,50],[100000,50]])
        assert.equal(api.stageScore(stage),score,'stage '+stage);
    for(let stage=1;stage<=10000;stage++)assert(Number.isInteger(api.stageScore(stage)));
    for(const invalid of [0,-1,1.2,NaN,Infinity,'1',null,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>api.stageScore(invalid));
});
test('data supports decreasing intervals and rejects malformed coverage',()=>{
    const editable=JSON.parse(JSON.stringify(config));
    editable.stageSegments=[{fromStage:1,toStage:11,fromScore:30,toScore:20}];
    assert.equal(api.stageScore(1,editable),30);assert.equal(api.stageScore(6,editable),25);assert.equal(api.stageScore(11,editable),20);
    for(const mutate of [c=>c.stageSegments[1].fromStage=20,c=>c.stageSegments[1].fromStage=22,c=>c.stageSegments[0].fromScore=101,
        c=>c.stageSegments[0].toStage=0,c=>c.daily.maxScore=19,c=>c.rounding='floor',c=>c.difficultyBands[0].fromScore=2]) {
        const bad=JSON.parse(JSON.stringify(config));mutate(bad);assert.throws(()=>api.validate(bad));
    }
});
test('labels use the sampled integer score',()=>{
    for(const [score,label] of [[1,'EASY'],[5,'EASY'],[6,'NORMAL'],[30,'NORMAL'],[31,'HARD'],[100,'HARD']])assert.equal(api.labelForScore(score),label);
});
test('Daily date-only stream includes both 20 and 40, stable regardless of calls',()=>{
    const values=new Set();
    for(let i=0;i<366;i++) {
        const date=new Date(Date.UTC(2028,0,i+1)).toISOString().slice(0,10),score=api.dailyScore(date);
        assert(score>=20&&score<=40&&Number.isInteger(score));values.add(score);
        api.stageScore(i+1);assert.equal(api.dailyScore(date),score);
    }
    assert.equal(values.size,21);
    for(const date of ['2026-02-29','2026-04-31','2026-2-01','2026-10-31T00:00:00Z','0000-01-01',null])assert.throws(()=>api.dailyScore(date));
    assert.doesNotThrow(()=>api.dailyScore('2028-02-29'));
});
test('recipe uses the versioned sampler with offset normal seed identity',()=>{
    for(let stage=1;stage<=1000;stage++) {
        const resolved=api.resolveStage(stage),actual=api.recipe(resolved);
        const expected=context.CourseDistribution.sample(resolved.score,resolved.seed);
        assert.equal(JSON.stringify(actual),JSON.stringify({...expected,seed:resolved.seed}));
    }
    assert.equal(config.version,'5');assert.equal(context.CourseDistribution.version,'7');
});

test('stage-only v3 update preserves every sampled Daily recipe and its data identity',()=>{
    const previous=JSON.parse(JSON.stringify(config));previous.version='1';delete previous.daily.version;
    previous.stageSegments=[{fromStage:1,toStage:20,fromScore:1,toScore:10},{fromStage:21,toStage:80,fromScore:11,toScore:30},{fromStage:81,toStage:200,fromScore:30,toScore:40},{fromStage:201,toStage:400,interpolationFromStage:200,fromScore:35,toScore:45}];previous.afterLastStageScore=45;
    for(let i=0;i<366;i++){const date=new Date(Date.UTC(2028,0,i+1)).toISOString().slice(0,10);
        const before=api.resolveDaily(date,previous),after=api.resolveDaily(date);
        assert.deepEqual(JSON.parse(JSON.stringify(after)),JSON.parse(JSON.stringify(before)));
        assert.equal(JSON.stringify(api.recipe(after)),JSON.stringify(api.recipe(before)));
    }
    assert.equal(api.resolveStage(200).progressionVersion,'5');
    assert.equal(api.resolveDaily('2026-01-16').progressionVersion,'1');
});


test('normal offset is editable uint32 data, wraps safely, and defaults to legacy zero',()=>{
    const copy=()=>JSON.parse(JSON.stringify(config));
    for(const [stage,seed] of [[1,11],[14,24],[20,30],[4294967285,4294967295],[4294967286,0],[4294967295,9],[4294967296,10],[Number.MAX_SAFE_INTEGER,9]])
        assert.equal(api.resolveStage(stage).seed,seed,'stage '+stage);
    const priorOffset=copy();priorOffset.normalSeedOffset=100;priorOffset.version='3';
    for(const [stage,seed] of [[1,101],[14,114],[4294967196,0],[Number.MAX_SAFE_INTEGER,99]])assert.equal(api.resolveStage(stage,priorOffset).seed,seed);
    const prior200=copy();prior200.normalSeedOffset=200;prior200.version='4';
    for(const [stage,seed] of [[1,201],[14,214],[20,220],[4294967096,0],[Number.MAX_SAFE_INTEGER,199]])assert.equal(api.resolveStage(stage,prior200).seed,seed);
    const legacy=copy();delete legacy.normalSeedOffset;
    for(const stage of [1,14,200,201,4294967296,Number.MAX_SAFE_INTEGER])
        assert.equal(api.resolveStage(stage,legacy).seed,stage>>>0);
    const largest=copy();largest.normalSeedOffset=4294967295;
    assert.equal(api.resolveStage(1,largest).seed,0);
    assert.equal(api.resolveStage(Number.MAX_SAFE_INTEGER,largest).seed,4294967294);
    for(const value of [-1,4294967296,1.5,NaN,Infinity,'100',null,false]){
        const invalid=copy();invalid.normalSeedOffset=value;
        assert.throws(()=>api.validate(invalid),/normal seed offset/);
    }
    for(let stage=1;stage<=10000;stage++){
        assert.equal(api.stageScore(stage),api.stageScore(stage,legacy));
        assert.equal(api.resolveStage(stage).difficultyLabel,api.resolveStage(stage,legacy).difficultyLabel);
    }
});
test('offset and normal version update leave Daily score, seed, label, identity and sampled recipe exact',()=>{
    for(const offset of [0,100,200]){
        const previous=JSON.parse(JSON.stringify(config));previous.version=offset===200?'4':offset===100?'3':'2';previous.normalSeedOffset=offset;
        for(let i=0;i<366;i++){
            const date=new Date(Date.UTC(2028,0,i+1)).toISOString().slice(0,10);
            const before=api.resolveDaily(date,previous),after=api.resolveDaily(date);
            assert.equal(JSON.stringify(after),JSON.stringify(before));
            assert.equal(JSON.stringify(api.recipe(after)),JSON.stringify(api.recipe(before)));
        }
    }
});
