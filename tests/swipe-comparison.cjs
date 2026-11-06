'use strict';
const assert=require('node:assert/strict'),run=require('./coupled-production-harness.cjs');
const result=run(String.raw`
const identity=JSON.stringify(fingerInputIdentity());
assert.equal(fingerAimGain(),1.5);
assert.equal(fingerAimTarget(0,{model:FINGER_AIM_MODEL,originGrips:[{x:100,y:200}],dx:20,dy:-40,gain:fingerAimGain()}).x,130);
assert.equal(fingerAimTarget(0,{model:FINGER_AIM_MODEL,originGrips:[{x:100,y:200}],dx:20,dy:-40,gain:fingerAimGain()}).y,140);
assert(validFingerAction(fingerAction([{dx:20,dy:-40}],4.5)));
assert(!validFingerAction(fingerAction([{dx:20,dy:-40}],4.51)));
assert.equal(fingerAction([{dx:20,dy:-40}],1).gain,1,'Historical explicit replay gain remains intact');
function settings(steps,mode){debugMode=true;debugSwipeComparison.steps=steps;debugSwipeComparison.mode=mode;}
let checks=0;
for(const mode of ['limbs','body'])for(const steps of [5,20,30,60])for(const n of [1,10,60]){
 fixture();settings(steps,mode);rankingAssistanceUsed=false;
 const origin={...body},stance=[...grips],points=sample(30,-70,n),scale=steps/20;
 const expectedAction=fingerAction(points.map(p=>({dx:p.dx*(mode==='body'?scale:1),dy:p.dy*(mode==='body'?scale:1)})),1.5*(mode==='limbs'?scale:1));
 const expected=fingerGestureReplay(origin,stance,expectedAction);
 const actual=live(points);
 nearly(actual.p,expected.p);assert.deepEqual(actual.stance,ids(expected.stance));
 assert.equal(actual.record.action.gain,expectedAction.gain);assert.equal(actual.record.action.bodyMotion,expectedAction.bodyMotion);assert.equal(actual.record.action.points.length,expectedAction.points.length);actual.record.action.points.forEach((p,i)=>{assert(Math.abs(p.dx-expectedAction.points[i].dx)<1e-9);assert(Math.abs(p.dy-expectedAction.points[i].dy)<1e-9);});assert.equal(actual.record.accepted,expected.valid);
 assert.equal(rankingAssistanceUsed,steps!==20);assert.equal(JSON.stringify(fingerInputIdentity()),identity);
 if(actual.record.accepted){assert(undoMove());nearly(body,origin);assert.deepEqual(ids(grips),ids(stance));assert.equal(rankingAssistanceUsed,steps!==20);}
 checks++;
}
// Snapshot at pointer-down. Edits cannot alter a gesture that has started.
for(const mode of ['limbs','body']){
 fixture();settings(30,mode);const e=eventAtScreen(100,200);down(e);settings(60,mode==='body'?'limbs':'body');
 move(movedEvent(e,{dx:30,dy:-70}));release();
 assert.equal(lastFingerGesture.action.gain,mode==='limbs'?2.25:1.5);
 assert.deepEqual(lastFingerGesture.action.points,[{dx:mode==='body'?45:30,dy:mode==='body'?-105:-70}]);
 fixture();down(e);assert.equal(drag.swipeComparison.multiplier,3);release(true);
}
// Debug-off is exactly standard even after a high multiplier was selected.
fixture();settings(60,'body');debugMode=false;let e=eventAtScreen(100,200);down(e);
assert.equal(drag.swipeComparison.multiplier,1);assert.equal(drag.fingerAction.gain,1.5);release(true);
// UI guards, exact integer stepping, bounds, reset and mode.
fixture();settings(20,'limbs');openSettings();assert(settingsOpen);assert.equal(ui.stageDebugDisplay.hidden,false);
for(let i=0;i<10;i++)ui.debugSwipeMore.onclick();assert.equal(ui.debugSwipeValue.textContent,'1.50×');
ui.debugSwipeMode.value='body';ui.debugSwipeMode.onchange();assert.equal(debugSwipeComparison.mode,'body');
for(let i=0;i<100;i++)ui.debugSwipeMore.onclick();assert.equal(debugSwipeComparison.steps,60);assert(ui.debugSwipeMore.disabled);
for(let i=0;i<100;i++)ui.debugSwipeLess.onclick();assert.equal(debugSwipeComparison.steps,5);assert(ui.debugSwipeLess.disabled);
ui.debugSwipeReset.onclick();assert.equal(debugSwipeComparison.steps,20);assert.equal(debugSwipeComparison.mode,'body');
hideSettings();ui.debugSwipeMore.onclick();assert.equal(debugSwipeComparison.steps,20);
// Session setting is not part of reset, recipe, route or replay identity.
settings(30,'body');const configBefore=JSON.stringify([CourseProgressionConfig,CourseDistributionConfig]);
fixture();assert.equal(debugSwipeComparison.steps,30);assert.equal(debugSwipeComparison.mode,'body');
assert.equal(JSON.stringify([CourseProgressionConfig,CourseDistributionConfig]),configBefore);assert.equal(JSON.stringify(fingerInputIdentity()),identity);
// Real retry must retain settings while restoring identical generated content.
fixture();debugMode=false;
tutorialRun={seen:new Set(TUTORIAL_CONFIG.steps.map(step=>step.id)),queue:[],explanation:null};reset(0);cameraIntro=null;
const course=JSON.stringify({holds,route,hearts,stamina,HEIGHT});
settings(30,'body');rankingAssistanceUsed=true;restartInput(0);
assert.equal(debugSwipeComparison.steps,30);assert.equal(debugSwipeComparison.mode,'body');assert.equal(rankingAssistanceUsed,false);
assert.equal(JSON.stringify({holds,route,hearts,stamina,HEIGHT}),course);
assert(route.slice(1).every(p=>p.action.gain===1.5));
return {checks};
`);
assert.equal(result.checks,24);console.log('PASS swipe comparison '+JSON.stringify(result));
