'use strict';
// Read-only regression: restored guide geometry plus real trace-based resource accounting.
const fs=require('fs'),root=process.cwd(),run=require(root+'/tests/coupled-production-harness.cjs');const m=JSON.parse(fs.readFileSync('course-data/manifest.json'));const p=JSON.parse(fs.readFileSync('course-data/'+m.packs.find(p=>p.id.startsWith('daily')).file));const c=p.courses.find(c=>c.request.date==='2026-12-08');run(`
const c=${JSON.stringify(c)};const snapshot=restoreCompactCourse(globalThis.AscentCourseData.decode(c.snapshot),c.request);
({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=snapshot);
level=1;difficulty=2;courseTypeId=2;courseMode='existing';dailyRun=dailyProfile(c.request.date);tutorialRun=null;debugCourseTrial=null;debugMode=false;debugAttempt=false;
hearts=createHearts(level,route,difficulty);const budget=activeCourseGeneration.initialStamina;
const resources=routeResources(route,{pickups:hearts,budget});let mask=0,remaining=budget;const pickups=[];let firstDepletion=null;
for(let i=1;i<route.length;i++){const next=coursePickupMask(hearts,mask,route[i-1],route[i]);const acquired=bitCount(next)-bitCount(mask);remaining+=acquired*HEART_CONFIG.recovery-1-(route[i].penalty||0);if(acquired)pickups.push({move:i,mask:next,remaining});if(remaining<=0&&firstDepletion===null)firstDepletion=i;mask=next;}
assert.equal(resources.valid,true);assert.equal(resources.moves,74);assert.equal(resources.remaining,2);assert.equal(firstDepletion,null);assert.deepEqual(pickups.map(p=>p.move),[9,20]);
console.log(JSON.stringify({date:c.request.date,budget,resources,pickups,firstDepletion,heartPositions:hearts},null,2));
`);
