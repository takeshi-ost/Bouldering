// End-to-end regression for the existing two-support course.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),context=vm.createContext({performance});
vm.runInContext(`const elements={};const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`,context);
for(const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)" defer><\/script>/g))
    vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),context,{filename:match[1]});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!html.includes('id="existingCourse"') || !html.includes('id="prototypeCourse"'))throw Error('Course choice missing');
console.log(vm.runInContext(`
function check(v,m){if(!v)throw Error(m);}
check(state==='choosing' && !cameraIntro && !ui.courseMenu.hidden,'Course menu startup failed');
ui.existingCourse.onclick();
check(state==='playing' && cameraIntro && level===1 && courseMode==='existing','Existing course startup failed');
advanceCameraIntro(0);advanceCameraIntro(450);
check(camera===cameraIntro.from,'Goal preview skipped');
down({clientX:200,clientY:400});check(!drag,'Input during introduction');
advanceCameraIntro(1650);check(!cameraIntro,'Introduction failed to finish');
check(!isSupportPair(0) && !isSupportPair([0]) && !isSupportPair([0,0]) && !isSupportPair([0,1,1]),'Non-pair supports accepted');
const report=[];
for(let n=1;n<=20;n++){
    try { reset(n); } catch(error) { throw Error('Level '+n+': '+error.message); }
    advanceCameraIntro(0);advanceCameraIntro(1650);
    check(samePairRoute(route,replayRoute(route)),'Support selection changed after pruning '+n);
    const finalHolds=holds;
    for(const id of densityStats.selectionHoldIds) {
        holds=finalHolds.filter(h=>h.id!==id);
        check(!samePairRoute(route,replayRoute(route)),'Unnecessary selection hold retained '+n+'/'+id);
    }
    holds=finalHolds;
    check(replayRoute(route),'Two-support route replay failed '+n);
    check(HEIGHT<=MAX_HEIGHT,'Wall too tall');
    const budget=stamina;
    for(let i=1;i<route.length;i++){
        camera=clamp(body.y-H*.6,0,HEIGHT-H);
        const before=[...grips],origin={...body},target=route[i];
        const event=p=>({clientX:p.x,clientY:p.y-camera});
        down(event(body));
        let selected;
        for(let t=1;t<=10;t++){
            move(event({x:origin.x+(target.x-origin.x)*t/10,y:origin.y+(target.y-origin.y)*t/10}));
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
        check(playerPath.length===i+1,'Committed path incorrect');
    }
    check(state==='won'&&bothHandsOnGoal()&&stamina===STAGE_CONFIG.spareMoves,'Goal or budget failed');
    check(holds.filter(h=>h.wide).length<=3,'Too many wide holds');
    report.push({level:n,moves:moveCount,holds:holds.length,wide:holds.filter(h=>h.wide).length,selectionHolds:densityStats.selectionHoldIds.length});
}
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
check(distance(body,origin)===0&&stamina===budget&&playerPath.length===1,'Cancel did not restore state');
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
ui.retry.onclick();check(JSON.stringify({holds,route})===repeated && cameraIntro && playerPath.length===1,'Retry failed');
ui.next.onclick();check(level===2 && cameraIntro,'Next stage failed');
JSON.stringify(report);
`,context));
