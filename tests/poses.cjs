const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=['config','utils','game','renderer'].map(f=>fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8')).join('\n');
new Function('assert',`const paint=[];const context2d=new Proxy({fillRect(x,y,w,h){if(w===40&&h===72)paint.push('torso');}},{get(o,k){return o[k]||function(){};}});const document={getElementById(){return {style:{},classList:{toggle(){}},setAttribute(){},getContext(){return context2d;},getBoundingClientRect(){return {width:400,height:700}}};}};const window={devicePixelRatio:1};function requestAnimationFrame(){};\n`+source+`
const p={x:200,y:300};
const minimum=110*Math.sin(75*Math.PI/180);
for(const i of [2,3]) {
    const r=limbRoot(p,i), sign=i===2?-1:1;
    const x=r.x+sign*Math.sqrt((minimum+.1)**2-36**2);
    assert(limbReachable(p,{x,y:p.y},i),'Straight foot at body midpoint rejected');
    assert(!limbReachable(p,{x,y:p.y-.01},i),'Foot above midpoint accepted');
    assert(!limbReachable(p,{x:r.x+sign*30,y:r.y-10},i),'Bent high foot accepted');
    assert(limbReachable(p,{x:r.x+sign*30,y:r.y},i),'Foot at hip height rejected');
    assert(limbReachable(p,{x:r.x,y:r.y+110},i),'Downward reach reduced');
    const nearAngle={x:r.x+sign*Math.sqrt((minimum-.1)**2-20**2),y:r.y-20};
    assert(!limbReachable(p,nearAngle,i),'Knee below 150 degrees accepted');
    nearAngle.x=r.x+sign*Math.sqrt(minimum**2-20**2);
    assert(limbReachable(p,nearAngle,i),'150 degree boundary rejected');
}
assert(limbReachable(p,{x:180,y:164},0),'Arm reach reduced');
// Valid endpoints separated by a forbidden bent-high-foot interval.
startGrips=[null,null,{x:75,y:336},{x:325,y:336}];
const from={x:200,y:299},to={x:200,y:330};
assert(supportsReachable(from,[2,3])&&supportsReachable(to,[2,3]));
assert(!supportsReachable({x:200,y:308},[2,3]));
assert(Math.abs(supportMotionFraction(from,to,[2,3])-1/31)<1e-6,'Movement tunnels through forbidden interval');
assert(supportMotionFraction({x:200,y:300},to,[2,3])<1e-6,'Movement skips forbidden region at start');
// Settling must not cross the same forbidden interval.
body={x:200,y:300};grips=[{x:148,y:232},{x:252,y:232},startGrips[2],startGrips[3]];
startPoseSettle();assert(characterAnimation.target.y<=body.y+1e-6,'Settle crosses raised-foot boundary');
// Sweep all directions, including full extension and coincident endpoints.
const origin={x:0,y:0};
for(let i=0;i<4;i++)for(let angle=0;angle<Math.PI*2;angle+=.07)for(const ratio of [0,.1,.4,.8,.99,1]) {
    const tip={x:Math.cos(angle)*LIMB_LENGTHS[i]*ratio,y:Math.sin(angle)*LIMB_LENGTHS[i]*ratio};
    const before=JSON.stringify({origin,tip}),j=limbJoint(origin,tip,i),half=LIMB_LENGTHS[i]/2;
    assert(Math.abs(distance(origin,j)-half)<1e-5,'Proximal length changes');
    assert(Math.abs(distance(tip,j)-half)<1e-5,'Distal length changes');
    const mirror=limbJoint(origin,{x:-tip.x,y:tip.y},i^1);
    assert(Math.abs(j.x+mirror.x)<1e-5&&Math.abs(j.y-mirror.y)<1e-5,'Asymmetric pose');
    assert.equal(JSON.stringify({origin,tip}),before,'Contact moved by rendering');
}
// Contacts estimated from IMG_6208 / 6207 / 6206, in torso-relative units.
// Test both bend histories: prior inward poses must not trap the new selection.
for (const [i,x,y] of [[2,24,54],[2,28,68],[0,-10,30],[0,-11,5]]) {
    for (const previous of [null,{x:45,y:10},{x:-45,y:-10}]) {
        const j=limbJoint(origin,{x,y},i,previous);
        assert(j.x<0,'Reported left limb remains inward');
    }
}
// New reports and the former outward-only exception: knees must stay above feet,
// including extended legs and cross-body contacts. Check both bend histories.
for(const [i,x,y] of [[3,103,-20],[2,86,39],[3,-20,8],[2,13,34]]) {
    const tip={x,y};
    for(const previous of [null,{x:-45,y:45},{x:45,y:45}]) {
        const j=limbJoint(origin,tip,i,previous);
        assert(j.y<=tip.y+1,'Knee remains below foot');
    }
}
// A knee below the hip but above the foot has no knee-height violation or cost.
const relaxed=jointPoseEvaluation(origin,{x:0,y:100},2,{x:-20,y:50});
assert.equal(relaxed.kneeViolations,0);
// If neither rigid branch can put the knee above a high foot, retain fixed bones.
const highTip={x:0,y:-110}, highKnee=limbJoint(origin,highTip,3);
assert.equal(highKnee.y,-55);
assert.equal(jointPoseEvaluation(origin,highTip,3,highKnee).kneeViolations,1);
// Folding at hip height still lifts the knee when it can also stay open.
for (const i of [2,3]) {
    const tip={x:(i===2?-1:1)*20,y:0}, j=limbJoint(origin,tip,i);
    assert(j.y<0,'Hip-height folded knee points down');
}
// Ordinary low-hand poses retain a lowered elbow; close holds may need an exception.
assert(limbJoint(origin,{x:-35,y:55},0).y>=0);
// Every limb must be painted before the torso, including folded legs.
const originalDrawLimb=drawLimbSegments;
drawLimbSegments=(root,joint,tip,color)=>{paint.push(root.y===336 && tip.x===230 ? 'folded' : 'other');originalDrawLimb(root,joint,tip,color);};
body={x:200,y:300};grips=[{x:148,y:232},{x:252,y:232},{x:160,y:410},{x:230,y:336}];
state='playing';cameraIntro=null;camera=0;drag=null;holds=[];route=[];resetCharacterAnimation();
draw(0);
assert(paint.indexOf('torso')>=0 && paint.indexOf('folded')>=0 && paint.lastIndexOf('other')<paint.indexOf('torso') && paint.indexOf('folded')<paint.indexOf('torso'),'Limb drawn in front of torso');
console.log('PASS rigid bones, unified outward joints, knees above feet, midpoint/150-degree foot boundaries, no tunneling, safe settling, torso occlusion');
`)(assert);
