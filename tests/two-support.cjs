// Challenge-only regression; ordinary and verification courses are not tested.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),context=vm.createContext({performance});
vm.runInContext(`const elements={};const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`,context);
for(const match of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)" defer><\/script>/g))
    vm.runInContext(fs.readFileSync(path.join(root,match[1]),'utf8'),context,{filename:match[1]});
console.log(vm.runInContext(`
function check(v,m){if(!v)throw Error(m);}
courseMode='challenge';const report=[];
for(let n=1;n<=20;n++){
    reset(n);advanceCameraIntro(0);advanceCameraIntro(1650);
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
            check(drag.anchor.every(k=>grips[k]===before[k]&&limbReachable(body,grips[k],k)),'Fixed support moved');
        }
        check(selected,'Gesture never selected supports');
        // Rendering must handle both fixed limbs and their intersecting disks.
        draw(2000);
        release();
        check(moveCount===i,'Commit failed '+n+'/'+i);
        check(grips.every((h,k)=>h.id===target.grips[k]),'Different contact sequence');
        check(playerPath.length===i+1,'Committed path incorrect');
    }
    check(state==='won'&&bothHandsOnGoal()&&stamina===STAGE_CONFIG.spareMoves,'Goal or budget failed');
    report.push({level:n,moves:moveCount,holds:holds.length});
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
JSON.stringify(report);
`,context));
