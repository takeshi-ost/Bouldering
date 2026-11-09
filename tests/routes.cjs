// End-to-end regression for the existing two-support course.
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const environment=`let timerId=0;const timers=new Map();function setTimeout(fn){timers.set(++timerId,fn);return timerId;}function clearTimeout(id){timers.delete(id);}function flushTimers(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}const elements={};const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
const source=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
    .map(match=>fs.readFileSync(path.join(root,match[1]),'utf8')).join('\n');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!html.includes('id="titleTap"') || html.includes('id="prototypeCourse"'))throw Error('Current title/debug course controls missing');
// Same native-function fixture as the other geometry tests; no VM proxy overhead.
console.log(new Function(environment+source+`
// This suite checks the baseline generator and its recorded input witnesses.
// New live-control alternatives are verified independently.
return SixPairSelection.withBaseline(()=>{
function check(v,m){if(!v)throw Error(m);}
check(state==='choosing' && !cameraIntro && !ui.titleScreen.hidden,'Course menu startup failed');
startCourse('existing');check(state==='map','Course should open map');selectStage(1);
check(state==='playing' && cameraIntro && level===1 && courseMode==='existing','One-screen stage needs its title intro');
advanceCameraIntro(0);advanceCameraIntro(999);check(cameraIntro,'One-screen title vanished before 1s');
advanceCameraIntro(1000);check(!cameraIntro,'One-screen intro did not finish at 1s');
reset(2);check(cameraIntro,'Tall stage needs a scroll');
advanceCameraIntro(0);
const introEnd=Math.max(CAMERA_CONFIG.introMinDuration,(cameraIntro.to-cameraIntro.from)/CAMERA_CONFIG.introSpeed*1000);
advanceCameraIntro(introEnd/2);check(cameraIntro,'Introduction ended too early');
down({clientX:200,clientY:400});check(!drag,'Input during introduction');
advanceCameraIntro(introEnd+1);check(!cameraIntro && camera===HEIGHT-H,'Introduction did not finish at bottom');
check(!isSupportPair(0) && !isSupportPair([0]) && !isSupportPair([0,0]) && !isSupportPair([0,1,1]),'Non-pair supports accepted');
const report=[];
for(let n=1;n<=20;n++){
    try { reset(n); } catch(error) { throw Error('STAGE '+n+': '+error.message); }
    check(grips[0]===grips[1] && grips[0].wide,'Hands must share starting bar');
    check(grips[2]!==grips[3] && grips[2].y===grips[3].y,'Feet must have separate bottom holds');
    check(grips[2].y===HEIGHT-HOLD_CONFIG.bottomMargin,'Feet not on bottom row');
    check(holds.every(h=>h===grips[2] || h===grips[3] || h.y<grips[2].y),'Other hold below starting feet');
    check(grips.every((h,i)=>limbReachable(body,h,i)),'Unreachable starting limb');
    check(new Set(holds.map(h=>h.id)).size===holds.length,'Duplicate hold IDs');
    check(holds.every(h=>h.type==='start' || !insideStartTriangle(h,grips)),'Hold inside starting triangle');
    advanceCameraIntro(0);advanceCameraIntro(1650);
    check(samePairRoute(route,replayRoute(route)),'Support selection changed after pruning '+n);
    const finalHolds=holds;
    // Optional paid shortcuts may replace contacts; check pruning on the free base graph.
    // At zero spikes the adopted trial deliberately retains contrast/branch shape
    // scatter. Only those explicitly reported protected IDs escape minimality;
    // straight/meander/native selector holds and all other IDs remain checked.
    const profileReport=activeCourseGeneration.report;
    const shapeProtected=new Set(profileReport.spikes.percent===0?[
        ...(profileReport.branchDetails?.protectedIds||[]),
        ...(profileReport.contrast?.retention.protectedDiffusionIds||[]),
        ...(profileReport.contrast?.retention.protectedConcentrationIds||[]),
        ...(profileReport.composition?.sections.flatMap(s=>s.protectedIds)||[])
    ]:[]);
    for(const id of shapeProtected)check(finalHolds.some(h=>h.id===id),'Protected profile hold missing '+n+'/'+id);
    const ordinary=finalHolds.filter(h=>h.type!=='hazard');
    for(const id of densityStats.selectionHoldIds) {
        if(shapeProtected.has(id))continue;
        holds=ordinary.filter(h=>h.id!==id);
        check(!samePairRoute(route,replayRoute(route)),'Unnecessary selection hold retained '+n+'/'+id);
    }
    holds=finalHolds;
    check(replayRoute(route),'Two-support route replay failed '+n);
    check(HEIGHT<=MAX_HEIGHT,'Wall too tall');
    const reduction=activeCourseGeneration.report.hearts?.staminaAdjustment.appliedReduction||0;
    check(stamina===stageStamina(route.length-1)-reduction,'Adopted initial heart budget failed');
    // Reference-only replay is not a solvability claim after heart reductions.
    if(reduction){reset(n,reduction);cameraIntro=null;hideStageHelp();}
    const budget=stamina;
    for(let i=1;i<route.length;i++){
        camera=clamp(body.y-H*.6,0,HEIGHT-H);
        const before=[...grips],origin={x:body.x,y:body.y-camera},target=route[i];
        const event=p=>({clientX:origin.x+p.dx,clientY:origin.y+p.dy});
        check(validFingerAction(target.action),'Explicit reference action required');down(event({dx:0,dy:0}));
        let selected;
        for(const point of fingerResampledAction(target.action,10).points){
            move(event(point));
            if(drag.anchor===null)continue;
            check(Array.isArray(drag.anchor)&&new Set(drag.anchor).size===2,'Not two supports');
            selected??=JSON.stringify(drag.anchor);
            check(JSON.stringify(drag.anchor)===selected,'Supports switched during swipe');
            check(grips.every((h,k)=>!h || grips.every((other,j)=>j===k || h!==other || canShareHold(h,k,j))),'Invalid shared contact');
            check(drag.anchor.every(k=>grips[k]===before[k]&&limbReachable(body,grips[k],k)),'Fixed support moved');
        }
        check(grips.every((h,k)=>h && limbReachable(body,h,k)),'Unreachable contact or foot above shoulders');
        check(selected,'Gesture never selected supports');
        check(selected===JSON.stringify(target.anchor),'Live pair differs from generated pair');
        // Rendering must handle both fixed limbs and their intersecting disks.
        draw(2000);
        release();
        check(moveCount===i,'Commit failed '+n+'/'+i);
        check(grips.every((h,k)=>h.id===target.grips[k]),'Different contact sequence');
    }
    check(state==='won'&&bothHandsOnGoal()&&stamina===budget-(route.length-1)-routeHazardCosts(route).at(-1)+hearts.filter(h=>h.collected).length*HEART_CONFIG.recovery,'Goal or actual pickup/hazard budget failed '+n);
    const swept=hearts.filter(h=>route.slice(1).some((p,i)=>torsoTouchesHeart(route[i],p,h))).map(h=>h.id);
    check(JSON.stringify(hearts.filter(h=>h.collected).map(h=>h.id))===JSON.stringify(swept),'Validated route must collect all and only swept recoveries');
    check(holds.filter(h=>h.wide).length<=(activeCourseGeneration.recipe.composition==='pair'?6:3),'Too many wide holds');
    report.push({level:n,moves:moveCount,holds:holds.length,wide:holds.filter(h=>h.wide).length,selectionHolds:densityStats.selectionHoldIds.length});
}
// Keep native pruning coverage non-vacuous even when formal profile selectors
// are all intentionally protected: an unreachable unused normal hold is removed.
debugMode=true;debugAttempt=true;debugCourseTrial={typeId:0,lengthCategory:'short',seed:1};
reset(1);const nativeRoute=route,redundantId=Math.max(...holds.map(h=>h.id))+1;
holds.push({id:redundantId,x:-10000,y:HEIGHT+10000,type:'normal',row:null});
pruneUnusedHolds();
check(!holds.some(h=>h.id===redundantId),'Native pruning retained a provably redundant hold');
check(samePairRoute(nativeRoute,replayRoute(route)),'Native pruning changed the route');
for(const id of densityStats.selectionHoldIds){const saved=holds;holds=saved.filter(h=>h.id!==id);check(!samePairRoute(route,replayRoute(route)),'Native unnecessary selector retained '+id);holds=saved;}
debugMode=false;debugAttempt=false;debugCourseTrial=null;
reset(2);advanceCameraIntro(0);advanceCameraIntro(1650);
const origin={...body},before=[...grips],budget=stamina;
camera=clamp(body.y-H*.6,0,HEIGHT-H);
const event=p=>({clientX:p.x,clientY:p.y-camera});
down(event(body));move(event({x:body.x+20,y:body.y-40}));
const selected=[...drag.anchor];
for(const p of [{x:375,y:80},{x:25,y:80},{x:25,y:HEIGHT-40}]){
    move(event(p));
    check(selected.every(k=>grips[k]===before[k]&&limbReachable(body,grips[k],k)),'Overswipe released fixed support');
    check(JSON.stringify(drag.anchor)===JSON.stringify(selected),'Curved swipe changed supports');
}
release(true);
check(distance(body,origin)===0&&stamina===budget,'Cancel did not restore state');
// A no-op with a legitimate pair retains both the posture and stamina.
committed={...body};startGrips=[...grips];drag={anchor:[0,1]};release();
check(stamina===budget&&moveCount===0,'No-op consumed stamina');
// Goal still accepts both hands while the feet remain fixed.
const goal={id:0,x:200,y:232,type:'goal'},left={id:1,x:160,y:378,type:'normal'},right={id:2,x:240,y:378,type:'normal'};
holds=[goal,left,right];startGrips=[{x:148,y:232},{x:252,y:232},left,right];
const pose=attachMoving({x:200,y:300},[2,3]);
check(pose && pose[0]===goal && pose[1]===goal && pose[2]===left && pose[3]===right,'Two-support goal sharing failed');
check(attachMoving({x:200,y:300},2)===null,'Single-support attachment still permitted');
restartInput(1);const repeated=JSON.stringify({holds,route});
finish(false);playsSinceAd=0;lives.count=LIFE_MAX;ui.retry.onclick();check(stageStartContext?.retry && ui.stageStartDialog.open,'Retry confirmation missing');ui.stageStartButton.onclick();check(JSON.stringify({holds,route})===repeated && cameraIntro,'Retry failed');
state='won';recordStageClear();playsSinceAd=0;ui.next.onclick();check(state==='map','Next should open map');advanceLevelMap(0);advanceLevelMap(650);check(stageStartContext?.n===2,'Next stage confirmation missing');flushTimers();check(ui.stageStartDialog.open,'Next stage dialog missing');ui.stageStartButton.onclick();check(level===2 && cameraIntro,'Next stage failed');
return JSON.stringify(report);
});
`)());
