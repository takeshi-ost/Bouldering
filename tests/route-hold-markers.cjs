'use strict';
require('./coupled-production-harness.cjs')(`
 fixture();debugMode=true;debugDisplay.route=true;rankingAssistanceUsed=false;
 const contacts=ids(grips),p0={x:200,y:500},p1={x:205,y:480},p2={x:210,y:460};
 route=[p0,{...p1,anchor:[2,3],grips:contacts},{...p2,anchor:[0,1],grips:contacts}];
 const lines=[],circles=[],labels=[];
 const oldLine=line,oldCircle=circle,oldFill=ctx.fillText;
 line=(a,b,color,width)=>lines.push({a:{...a},b:{...b},color,width});
 circle=(x,y,r,fill,stroke)=>circles.push({x,y,r,fill,stroke});
 ctx.fillText=(label,x,y)=>labels.push({label,x,y,color:ctx.fillStyle});
 try {
  drawPath();assert(rankingAssistanceUsed);assert.equal(labels.length,4);assert.equal(circles.length,4);
  assert.deepEqual(labels.map(x=>x.label),['1','1','2','2']);
  const offsets=[[-13,-13],[13,-13],[-13,13],[13,13]],colors=['#c34d43','#397cc1','#d18a22','#419663'];
  labels.forEach((entry,i)=>{assert.equal(entry.x,grips[i].x+offsets[i][0]);assert.equal(entry.y,grips[i].y+offsets[i][1]);assert.equal(entry.color,colors[i]);assert.equal(circles[i].stroke,colors[i]);assert.equal(circles[i].r,9);});
  assert(lines.some(l=>l.a.x===p0.x&&l.a.y===p0.y&&l.b.x===p1.x&&l.b.y===p1.y));
  assert(lines.some(l=>l.a.x===p1.x&&l.a.y===p1.y&&l.b.x===p2.x&&l.b.y===p2.y));
  assert(!labels.some(l=>[p0,p1,p2].some(p=>p.x===l.x&&p.y===l.y)),'No body-position numbers');
  const before=labels.length;route.push({...p1,anchor:[2,3],grips:contacts});drawPath();
  assert.equal(labels.at(-2).label,'3');assert.equal(labels.at(-1).label,'3');
  assert.notEqual(labels.at(-2).y,labels[0].y,'repeated same-limb/hold labels are stacked');
  labels.length=0;circles.length=0;lines.length=0;debugDisplay.route=false;drawPath();
  assert.equal(labels.length,0);assert.equal(circles.length,0);assert.equal(lines.length,0);
 } finally {line=oldLine;circle=oldCircle;ctx.fillText=oldFill;}
`);
console.log('PASS planned route: two moving-limb corner numbers, distinct colors, no torso labels, preserved trajectory, repeated-hold stacking, debug gate');
