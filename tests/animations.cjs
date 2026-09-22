const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),context=vm.createContext({performance});
vm.runInContext(`const document={getElementById(){return {style:{},classList:{toggle(){}},focus(){},setAttribute(){},addEventListener(){},getContext(){return {}},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}};}};const window={addEventListener(){}};function requestAnimationFrame(){}`,context);
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)" defer><\/script>/g))vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),context);
vm.runInContext(`
function assert(v,m){if(!v)throw Error(m);}
body={x:200,y:300};committed={...body};
grips=limbs.map(p=>({x:body.x+p.x,y:body.y+p.y}));
playerPath=[{...body}];const before=JSON.stringify({body,committed,grips,playerPath});
startPoseSettle();const start=characterAnimation.start;
for(const ms of [0,60,120,240,800]){
 const v=characterPose(start+ms);

 assert(grips.every((h,i)=>limbReachable(v.body,h,i)),'Settle exceeds a limb reach');
 assert(v.contacts===grips,'Settle moved a contact');
 v.contacts.forEach((h,i)=>{const r=limbRoot(v.body,i),j=v.joints?.[i] || limbJoint(r,h,i),half=LIMB_LENGTHS[i]/2;assert(Math.abs(half-distance(r,j))<1e-5 && Math.abs(half-distance(h,j))<1e-5,'Settle changes bone lengths');});
}
const settled=characterPose(start+240).body;
const initialValue=bodyPoseEvaluation(body,grips),settledValue=bodyPoseEvaluation(settled,grips);
assert(comparePoseEvaluation(settledValue,initialValue)<=0,'Settling worsens pose');
assert(JSON.stringify({body,committed,grips,playerPath})===before,'Animation modified game state');
// Four fully extended limbs pin the body: no reachable improvement exists.
grips=[{x:180,y:164},{x:220,y:164},{x:180,y:446},{x:220,y:446}];
startPoseSettle();assert(distance(characterAnimation.target,body)<1e-5,'Pinned pose moved');
// A close, tucked stance has conflicting knees/elbows which body motion can resolve.
grips=[[-35.57,-72.16],[87.63,36.08],[65.98,74.74],[0,43.81]].map(([x,y])=>({x:body.x+x,y:body.y+y}));
const bad=bodyPoseEvaluation(body,grips);startPoseSettle();
const improved=bodyPoseEvaluation(characterAnimation.target,grips);
assert(improved.kneeViolations===0 && improved.violations<bad.violations,'Body motion did not improve the reported stance');
for(let ms=0;ms<=240;ms+=4){
 const v=characterPose(characterAnimation.start+ms);
 assert(grips.every((h,i)=>limbReachable(v.body,h,i)),'Adjustment detached a limb');
}

// Deterministic varied contact sets: improvements must stay connected and reachable.
let seed=917, improvedCount=0;
const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
for(let sample=0;sample<40;sample++) {
 const contacts=[0,1,2,3].map(i=>{
  const root=limbRoot(body,i);
  for(;;){
   const angle=random()*Math.PI*2, radius=LIMB_LENGTHS[i]*random();
   const h={x:root.x+Math.cos(angle)*radius,y:root.y+Math.sin(angle)*radius};
   if(limbReachable(body,h,i))return h;
  }
 });
 const target=settledBodyPosition(body,contacts);
 const oldValue=bodyPoseEvaluation(body,contacts),newValue=bodyPoseEvaluation(target,contacts);
 assert(comparePoseEvaluation(newValue,oldValue)<=0,'Increased requirement violations');
 if(newValue.kneeViolations===oldValue.kneeViolations && newValue.violations===oldValue.violations)assert(newValue.cost<=oldValue.cost+1e-7,'Worsened joint cost');
 if(newValue.violations<oldValue.violations)improvedCount++;
 assert(supportMotionFraction(body,target,[0,1],contacts)>1-1e-7 && supportMotionFraction(body,target,[2,3],contacts)>1-1e-7,'Unsafe transition interval');
 for(let t=0;t<=1;t+=.05){
  const p={x:body.x+(target.x-body.x)*t,y:body.y+(target.y-body.y)*t};
  assert(contacts.every((h,i)=>limbReachable(p,h,i)),'Sampled transition loses contact');
 }
}
assert(improvedCount>0,'Search never resolves conflicting requirements');
console.log('Body search improved requirement counts in '+improvedCount+'/40 varied poses');
const goal={x:200,y:232,type:'goal'};grips=[goal,goal,{x:160,y:378},{x:240,y:378}];
const wonPose=JSON.stringify({body,grips,playerPath});startGoalHang();const began=characterAnimation.start;
for(const ms of [0,160,325,650,1000,2000]){
 const v=characterPose(began+ms);
 assert(v.contacts[0].x===goal.x && v.contacts[0].y===goal.y && v.contacts[1].y===goal.y,'Hands left goal');
 assert(v.contacts.every((h,i)=>limbReachable(v.body,h,i)),'Hang stretches limb beyond reach');
 assert(v.pivot===null && v.angle===0,'Hang rotates the entire skeleton');
 v.contacts.forEach((h,i)=>{const r=limbRoot(v.body,i),j=v.joints?.[i] || limbJoint(r,h,i),half=LIMB_LENGTHS[i]/2;assert(Math.abs(half-distance(r,j))<1e-5 && Math.abs(half-distance(h,j))<1e-5,'Hang changes bone lengths');});
}
const hanging=characterPose(began+1000);
assert(hanging.contacts[2].y>hanging.body.y+100,'Legs did not extend');
assert(Math.abs(hanging.body.x-goal.x)>1,'No suspended body sway');
const hip=limbRoot(hanging.body,2),knee=hanging.joints[2],foot=hanging.contacts[2];
const thighAngle=Math.atan2(knee.x-hip.x,knee.y-hip.y),calfAngle=Math.atan2(foot.x-knee.x,foot.y-knee.y);
assert(Math.abs(thighAngle-calfAngle)>.01,'Knee segment moves rigidly with thigh');
const nextHang=characterPose(began+1200);
assert(distance(nextHang.joints[2],knee)>1,'Knee does not follow the swing');
assert(JSON.stringify({body,grips,playerPath})===wonPose,'Hang modified actual contacts');
resetCharacterAnimation();assert(characterAnimation===null && characterPose(0).body.y===body.y,'Animation reset failed');
`,context);
console.log('PASS pose settling, reach limits, goal hanging, unchanged physics');
