const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=['config','utils','stage','game','renderer'].map(f=>fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8')).join('\n');
new Function('assert',`const document={getElementById(){return {style:{},getContext(){return {}}};}};\n`+source+`
const heights=[];
for(let n=1;n<=100;n++) {
 const stage=createStageGenerator().generate(n,true);
 HEIGHT=stage.HEIGHT;body={...stage.route[0]};grips=stage.initialGrips;
 const snapshot=JSON.stringify({body,grips});startInitialPose();
 const visual=characterPose(performance.now());
 assert.equal(JSON.stringify({body,grips}),snapshot,'Opening pose changes logical start');
 assert(visual.body.y>=body.y,'Opening pose rises');
 assert(grips.every((h,i)=>limbReachable(visual.body,h,i)),'Crouch loses a contact');
 assert(!grips.every((h,i)=>limbReachable({...visual.body,y:visual.body.y+.01},h,i)),'Body could crouch lower');
 assert.equal(grips[0],grips[1]);assert(grips[0].wide);
 const feetWidth=grips[3].x-grips[2].x;
 assert(feetWidth>0 && feetWidth<=TORSO.width,'Opening feet too wide');
 const knees=[2,3].map(i=>limbJoint(limbRoot(visual.body,i),grips[i],i));
 assert(feetWidth<=Math.abs(knees[1].x-knees[0].x)+1e-6,'Feet exceed opening knee spread');
 const bound=TORSO.width+(LIMB_LENGTHS[2]+LIMB_LENGTHS[3])/2;
 assert(feetWidth<=bound,'Feet exceed maximum possible knee spread');
 assert(HEIGHT<=H*3);if(n%5)assert(HEIGHT<H*2);
 heights.push(HEIGHT);
}
for(let i=0;i<=heights.length-5;i++) assert(heights.slice(i,i+5).filter(h=>h>=2*H).length<=1);
assert(heights.some(h=>h>2*H),'No extended stages generated');
// Intro finishes by distance, including shorter travel and three-screen travel.
state='playing';densityStats={prototype:true,total:0};
for(const [from,to] of [[0,80],[0,700],[0,1400],[100,700]]) {
 cameraIntro={from,to,start:null};camera=from;
 advanceCameraIntro(100);
 const duration=(to-from)/CAMERA_CONFIG.introSpeed*1000;
 advanceCameraIntro(100+duration/2);assert(cameraIntro);assert(Math.abs(camera-(from+to)/2)<1e-6);
 advanceCameraIntro(101+duration);assert.equal(cameraIntro,null);assert.equal(camera,to);
}
console.log('PASS 100 starts: reachable lowest crouch, feet within knee span, long-stage frequency <= 1/5, 3-screen cap; distance-based intro');
console.log('Heights 1-20:',heights.slice(0,20).join(','));
`)(assert);
