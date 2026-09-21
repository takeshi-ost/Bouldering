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
startPoseSettle();assert(characterAnimation.drop<1e-6,'Settle crosses raised-foot boundary');
// Sweep all directions, including full extension and coincident endpoints.
const origin={x:0,y:0};
for(let i=0;i<4;i++)for(let angle=0;angle<Math.PI*2;angle+=.07)for(const ratio of [0,.1,.4,.8,.99,1]) {
    const tip={x:Math.cos(angle)*LIMB_LENGTHS[i]*ratio,y:Math.sin(angle)*LIMB_LENGTHS[i]*ratio};
    const before=JSON.stringify({origin,tip}),j=limbJoint(origin,tip,i),half=LIMB_LENGTHS[i]/2;
    assert(Math.abs(distance(origin,j)-half)<1e-5,'Proximal length changes');
    assert(Math.abs(distance(tip,j)-half)<1e-5,'Distal length changes');
    if(i<2&&tip.y>=-1e-7)assert(j.y>=-1e-7,'Elbow above shoulder for low hand');
    const mirror=limbJoint(origin,{x:-tip.x,y:tip.y},i^1);
    assert(Math.abs(j.x+mirror.x)<1e-5&&Math.abs(j.y-mirror.y)<1e-5,'Asymmetric pose');
    if(i>=2&&distance(origin,tip)>1e-9 && !isFoldedLeg(origin,tip,i)) {
        const other={x:tip.x-j.x,y:tip.y-j.y},out=i%2?1:-1;
        if(out*other.x>=0)assert(out*j.x>=-1e-7,'Inward knee chosen despite outward candidate');
    }
    if(isFoldedLeg(origin,tip,i))
        assert(j.y <= tip.y-j.y+1e-7,'Folded leg chose lower knee');
    assert.equal(JSON.stringify({origin,tip}),before,'Contact moved by rendering');
}
// Approximate hip-relative contacts in the four supplied screenshots, plus coincidence.
for(const [i,x,y] of [[3,10,0],[3,-20,0],[2,74,24],[3,0,0]]) {
    const tip={x,y},j=limbJoint(origin,tip,i);
    assert(isFoldedLeg(origin,tip,i));
    assert(j.y<0,'Screenshot folded knee does not rise above hip');
    assert(Math.abs(distance(origin,j)-55)<1e-5 && Math.abs(distance(tip,j)-55)<1e-5);
}
// Ensure folded legs remain visible in front of the torso, not merely raised behind it.
const originalDrawLimb=drawLimbSegments;
drawLimbSegments=(root,joint,tip,color)=>{paint.push(root.y===336 && tip.x===230 ? 'folded' : 'other');originalDrawLimb(root,joint,tip,color);};
body={x:200,y:300};grips=[{x:148,y:232},{x:252,y:232},{x:160,y:410},{x:230,y:336}];
state='playing';cameraIntro=null;camera=0;drag=null;holds=[];route=[];resetCharacterAnimation();
draw(0);
assert(paint.indexOf('torso')>=0 && paint.indexOf('folded')>paint.indexOf('torso'),'Folded leg drawn behind torso');
console.log('PASS rigid bones, low-hand elbows, raised folded knees, outward extended knees, midpoint/150-degree foot boundaries, no tunneling, safe settling, foreground folded legs');
`)(assert);
