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
 assert(v.body.y>=body.y && v.body.y<=body.y+8,'Settle outside allowed offset');
 assert(grips.every((h,i)=>limbReachable(v.body,h,i)),'Settle exceeds a limb reach');
 assert(v.contacts===grips,'Settle moved a contact');
 v.contacts.forEach((h,i)=>assert(Math.abs(distance(limbJoint(limbRoot(v.body,i),h,i),h)-LIMB_LENGTHS[i]/2)<1e-5,'Settle changes distal length'));
}
assert(characterPose(start+240).body.y>body.y+7,'Slack pose did not settle');
assert(JSON.stringify({body,committed,grips,playerPath})===before,'Animation modified game state');
grips[0]={x:180,y:164};startPoseSettle();assert(characterAnimation.drop<.001,'Taut limb allowed settling');
const goal={x:200,y:232,type:'goal'};grips=[goal,goal,{x:160,y:378},{x:240,y:378}];
const wonPose=JSON.stringify({body,grips,playerPath});startGoalHang();const began=characterAnimation.start;
for(const ms of [0,160,325,650,1000,2000]){
 const v=characterPose(began+ms);
 assert(v.contacts[0].x===goal.x && v.contacts[0].y===goal.y && v.contacts[1].y===goal.y,'Hands left goal');
 assert(v.contacts.every((h,i)=>limbReachable(v.body,h,i)),'Hang stretches limb beyond reach');
 assert(v.pivot.x===goal.x && v.pivot.y===goal.y,'Wrong pendulum pivot');
 v.contacts.forEach((h,i)=>assert(Math.abs(distance(limbJoint(limbRoot(v.body,i),h,i),h)-LIMB_LENGTHS[i]/2)<1e-5,'Hang changes distal length'));
}
const hanging=characterPose(began+1000);
assert(hanging.contacts[2].y>hanging.body.y+100,'Legs did not extend');
assert(Math.abs(hanging.angle)>.01,'No hanging sway');
assert(JSON.stringify({body,grips,playerPath})===wonPose,'Hang modified actual contacts');
resetCharacterAnimation();assert(characterAnimation===null && characterPose(0).body.y===body.y,'Animation reset failed');
`,context);
console.log('PASS pose settling, reach limits, goal hanging, unchanged physics');
