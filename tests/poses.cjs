const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const source = ['config', 'utils', 'game', 'renderer'].map(name =>
    fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8')).join('\n');
new Function('assert', `const document={getElementById(){return {getContext(){return {}}}}};\n` + source + `
const p={x:200,y:300}, shoulder=p.y-TORSO.height/2;
for(const i of [2,3]) {
    const x=limbRoot(p,i).x;
    assert(limbReachable(p,{x,y:shoulder},i),'Shoulder-height foot rejected');
    assert(!limbReachable(p,{x,y:shoulder-.01},i),'Foot above shoulders accepted');
    assert(limbReachable(p,{x,y:limbRoot(p,i).y+LIMB_LENGTHS[i]},i),'Downward reach was reduced');
}
assert(limbReachable(p,{x:180,y:shoulder-90},0),'Arm reach changed');
startGrips=[{x:148,y:232},{x:252,y:232},{x:180,y:shoulder},{x:220,y:shoulder}];
assert(supportsReachable(p,[2,3]));
assert(!supportsReachable({x:p.x,y:p.y+1},[2,3]),'Fixed feet allow body below shoulder limit');
// Moving feet must obey the same ceiling as fixed supports and route replay.
holds=[{id:0,x:160,y:shoulder-.1,type:'normal'},{id:1,x:240,y:shoulder-.1,type:'normal'}];
const attached=attachMoving(p,[0,1]);
assert(attached && !attached[2] && !attached[3],'Moving feet snapped above shoulders');
const origin={x:0,y:0};
for(const i of [0,1]) {
    const tip={x:(i?1:-1)*30,y:0};
    assert(limbJoint(origin,tip,i).y>0,'Close elbow points upward');
    let previous=null;
    for(let x=-5;x<=5;x+=.1) {
        const joint=limbJoint(origin,{x,y:0},i);
        if(previous)assert(distance(previous,joint)<1,'Elbow flips across shoulder');
        previous=joint;
    }
}
const closeJoint=limbJoint(origin,{x:30,y:0},1);
assert(distance(origin,closeJoint)<LIMB_LENGTHS[1]/2-.1,'Upper arm cannot shorten');
const knee=limbJoint(origin,{x:-76,y:-48},2);
assert(knee.y<=-48,'Raised foot knee still points downward');
for(let i=0;i<4;i++) {
    for(let angle=0;angle<Math.PI*2;angle+=.07) for(const ratio of [0,.1,.4,.8,.99,1]) {
        const tip={x:Math.cos(angle)*LIMB_LENGTHS[i]*ratio,y:Math.sin(angle)*LIMB_LENGTHS[i]*ratio};
        const before=JSON.stringify({origin,tip}), joint=limbJoint(origin,tip,i);
        assert(Number.isFinite(joint.x)&&Number.isFinite(joint.y),'Nonfinite joint');
        assert(distance(origin,joint)<=LIMB_LENGTHS[i]/2+1e-5,'Upper segment stretches');
        assert(Math.abs(distance(tip,joint)-LIMB_LENGTHS[i]/2)<1e-5,'Forearm/shin length changed');
        assert.equal(JSON.stringify({origin,tip}),before,'Joint rendering moves contacts');
        const mirror=limbJoint(origin,{x:-tip.x,y:tip.y},i^1);
        assert(Math.abs(joint.x+mirror.x)<1e-5 && Math.abs(joint.y-mirror.y)<1e-5,'Asymmetric limb pose');
    }
}
console.log('PASS shoulder boundary, fixed/moving feet, unchanged arm reach, close elbows, raised knees, fixed forearms/shins, upper-segment limits and symmetry');
`)(assert);
