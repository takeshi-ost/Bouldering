const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=['text-ja','text-en','text-dev-ja','text','config','utils','difficulty','stage','game','renderer'].map(f=>fs.readFileSync(path.join(__dirname,'..','js',f+'.js'),'utf8')).join('\n');
new Function('assert',`function playSound(){};const document={getElementById(){return {style:{},setAttribute(){},getContext(){return {}}};}};\n`+source+`
const triangle=[{x:0,y:0},{x:0,y:0},{x:-70,y:100},{x:70,y:100}];
assert(insideStartTriangle({x:0,y:60},triangle));
assert(insideStartTriangle({x:0,y:100},triangle));
assert(!insideStartTriangle({x:60,y:20},triangle));
assert(!insideStartTriangle({x:0,y:101},triangle));
assert(insideStartTriangle({x:0,y:60},[triangle[0],triangle[1],triangle[3],triangle[2]]));
const heights=[];
for(let n=1;n<=100;n++) {
 const stage=createStageGenerator().generate(n,true);
 assert(stage.holds.every(h=>h.x-(h.wide?30:12)>=STAGE_SAFE_WIDTH && h.x+(h.wide?30:12)<=W-STAGE_SAFE_WIDTH),'Hold sprite overlaps scroll safe area');
 assert(stage.route.every(p=>p.x>=STAGE_SAFE_WIDTH+TORSO.width/2 && p.x<=W-STAGE_SAFE_WIDTH-TORSO.width/2),'Guide body overlaps scroll safe area');
 HEIGHT=stage.HEIGHT;body={...stage.route[0]};grips=stage.initialGrips;
 const snapshot=JSON.stringify({body,grips});startInitialPose();
 const visual=characterPose(performance.now());
 assert.equal(JSON.stringify({body,grips}),snapshot,'Opening pose changes logical start');
 assert(visual.body.y>=body.y,'Opening pose rises');
 assert(grips.every((h,i)=>limbReachable(visual.body,h,i)),'Crouch loses a contact');
 assert(!grips.every((h,i)=>limbReachable({...visual.body,y:visual.body.y+.01},h,i)),'Body could crouch lower');
 assert(stage.holds.every(h=>h.type==='start' || !insideStartTriangle(h,grips)),'Hold inside starting triangle');
 if(n===1)assert.equal(grips[3].x-grips[2].x,140);
 assert.equal(grips[0],grips[1]);assert(grips[0].wide);
 const feetWidth=grips[3].x-grips[2].x;
 assert(feetWidth>0 && feetWidth<=140,'Opening feet too wide');
 const bound=TORSO.width+(LIMB_LENGTHS[2]+LIMB_LENGTHS[3])/2;
 assert(feetWidth<=bound,'Feet exceed maximum possible knee spread');
 const info=stageLengthInfo(n);assert.equal(HEIGHT,info.height);assert(HEIGHT<=H*3);
 if(info.category==='short')assert.equal(HEIGHT,H);
 if(info.category==='medium')assert(HEIGHT===H*2);
 if(info.category==='long')assert(HEIGHT===H*3);
 if(n!==1) {
  const goal=stage.holds.find(h=>h.type==='goal');
  assert(Math.abs(goal.y-STAGE_CONFIG.goalTopMargin)<=STAGE_CONFIG.holdOffset+1e-8,'Goal does not reach selected wall top');
  assert(stage.initialGrips[2].y-goal.y>=HEIGHT-160,'Course does not span its selected height');
 }
 heights.push(HEIGHT);
}
assert(heights.slice(1).some(h=>h===H),'No short stages after intro');
assert(heights.some((h,i)=>((i+1)%5!==0) && h>=2*H),'Long stages still restricted to multiples of 5');
assert(heights.some(h=>h>2*H),'No extended stages generated');
// Intro lasts at least 1s, and longer scrolls must still reach the bottom first.
state='playing';densityStats={prototype:true,total:0};
for(const [from,to] of [[0,0],[0,80],[0,700],[0,1400],[100,700]]) {
 cameraIntro={from,to,start:null};camera=from;
 advanceCameraIntro(100);
 const duration=Math.max(CAMERA_CONFIG.introMinDuration,(to-from)/CAMERA_CONFIG.introSpeed*1000);
 advanceCameraIntro(100+duration/2);assert(cameraIntro);assert(Math.abs(camera-Math.min(to,from+duration/2*CAMERA_CONFIG.introSpeed/1000))<1e-6);
 advanceCameraIntro(100+duration-1);assert(cameraIntro);
 advanceCameraIntro(101+duration);assert.equal(cameraIntro,null);assert.equal(camera,to);
}
console.log('PASS 100 starts: reachable lowest crouch, feet within 140px, clear starting triangle, independent short/medium/long draw, 3-screen cap; 1s minimum intro and bottom arrival');
console.log('Heights 1-20:',heights.slice(0,20).join(','));
`)(assert);
