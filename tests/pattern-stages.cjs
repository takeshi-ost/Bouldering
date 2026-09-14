// Run with: node tests/pattern-stages.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(`const elements={};const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},addEventListener(){},getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`, context);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script src="([^"]+)" defer><\/script>/g))
    vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, {filename: match[1]});
vm.runInContext(`
courseMode='verification';reset(2);
if(!cameraIntro || camera!==0)throw Error('Opening must start at goal');
down({clientX:200,clientY:400});if(drag)throw Error('Input accepted during opening');
advanceCameraIntro(100);advanceCameraIntro(550);
if(camera!==0)throw Error('Goal hold duration missing');
advanceCameraIntro(1150);
if(!(camera>0 && camera<cameraIntro.to))throw Error('Opening did not scroll');
advanceCameraIntro(1750);
if(cameraIntro || camera!==clamp(body.y-H*.6,0,HEIGHT-H))throw Error('Opening did not finish');
const oldPath=JSON.stringify(playerPath);
down({clientX:body.x,clientY:body.y-camera});
move({clientX:body.x+10,clientY:body.y-camera-10});release(true);
if(JSON.stringify(playerPath)!==oldPath)throw Error('Cancelled trace retained');
playerPath.push({x:1,y:1});reset(1);
if(playerPath.length!==1)throw Error('Previous stage trail leaked');
`,context);
vm.runInContext('const resetWithIntro=reset;reset=function(n){resetWithIntro(n);advanceCameraIntro(0);advanceCameraIntro(1650);};',context);
console.log(vm.runInContext(`
function verify(condition, message) { if (!condition) throw Error(message); }
courseMode='verification';
const expected=['ストレッチ','近接経由','最下部足場の強制選択','ぎりぎり届かない偽コース','逆方向への移動'];
const report=[];
verify(VERIFICATION_STAGES.length===5,'Verification mode must contain exactly five stages');
for(let n=1;n<=5;n++){
    reset(n);
    verify(level===n&&verificationZone.name===expected[n-1], 'Wrong stage: '+n);
    verify(stamina===route.length-1&&route.length-1===VERIFICATION_STAGES[n-1].steps,
        'Stamina must be M+0: '+n);
    const proof=densityStats.supportCertificate;
    verify(proof.minimum===route.length-1&&(n===5||proof.certified),
        'Shortest-move certificate failed: '+n);
    const played=replayRoute(route);
    verify(played&&played.length===route.length&&
        played.every((p,i)=>JSON.stringify(p.grips)===JSON.stringify(route[i].grips)),
        'Normal-rule route replay failed: '+n);
    const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips)]);
    verify(holds.every(h=>used.has(h.id)||n===4&&h.type==='decoy'),
        'Unrelated hold remains: '+n);
    let frames=0;ctx.strokeRect=()=>{frames++;};ui.showPath.checked=true;drawPath();
    verify(frames===1&&verificationZone.width>0&&verificationZone.height>0,
        'Challenge rectangle missing: '+n);
    ui.showPath.checked=false;
    if(n===1){
        const pivot=holds.find(h=>h.id===route[0].grips[route[1].anchor]);
        const target=holds.find(h=>h.id===route[1].grips[0]);
        verify(route[1].anchor>=2&&distance(pivot,target)>200&&
            !limbReachable(route[0],target,0)&&limbReachable(route[1],target,0),
            'Stretch geometry missing');
    }
    if(n===2){
        const foot=holds.find(h=>h.x===160&&h.y===465);
        const hand=holds.find(h=>h.x===90&&h.y===440);
        verify(foot&&hand&&distance(foot,hand)<80&&route[1].grips.includes(foot.id)&&
            proof.supports[1][0]===foot.id&&!inspectSwipe(route[0],route[2])?.won,
            'Compact intermediate foothold missing');
    }
    if(n===3){
        const low=holds.find(h=>h.x===160&&h.y===462);
        const neighbors=holds.filter(h=>h.y===440);
        verify(low&&neighbors.length===2&&neighbors.every(h=>h.y<low.y)&&
            route[1].grips.includes(low.id)&&proof.supports[1][0]===low.id,
            'Lowest foothold is not mandatory');
    }
    if(n===4){
        const connector=holds.find(h=>h.id===falseBranch?.nearMiss);
        const excess=distance(limbRoot(falseBranch.end,1),connector)-LIMB_LENGTHS[1];
        const entered=inspectSwipe(route[0],falseBranch.end);
        verify(entered&&!entered.cancelled&&entered.pose.some(h=>falseBranch.holdIds.includes(h.id))&&
            Math.abs(excess-3)<0.01&&!relaxedGoalPossible(falseBranch.end,route.length-2),
            'Three-pixel false-course trap failed');
    }
    if(n===5){
        const goal=holds.find(h=>h.type==='goal');
        verify(route[1].x<route[0].x&&route[1].y>route[0].y&&
            distance(route[1],goal)>distance(route[0],goal)&&
            !solveRoute(route,route.length-2), 'Reverse opening or lower bound failed');
        const found=solveRoute(route,route.length-1);
        verify(found&&distance(found[1],goal)>distance(found[0],goal),
            'Automatic solver bypassed the retreat');
        const seenForward=new Set();
        for(let x=25;x<=375;x+=5)for(let y=450;y<=660;y+=5){
            const first=inspectSwipe(route[0],{x,y});
            if(!first||first.cancelled||!first.pose.every(Boolean)||
                distance(first.result,goal)>=distance(route[0],goal))continue;
            const key=first.result.grips.join(',')+':'+
                Math.round(first.result.x/10)+','+Math.round(first.result.y/10);
            if(seenForward.has(key))continue;
            seenForward.add(key);
            const savedInitial=initialGrips;
            initialGrips=first.pose;
            let forwardSolution;
            try {forwardSolution=solveRoute([first.result,...route.slice(2)],route.length-2);}
            finally {initialGrips=savedInitial;}
            verify(!forwardSolution,'Forward first move has a winning continuation: '+x+','+y);
            let at=first.result,valid=true;
            for(const target of route.slice(2)){
                const move=inspectSwipe(at,target);
                if(!move||move.cancelled||!move.pose.every(Boolean)){valid=false;break;}
                at=move.result;
            }
            verify(!valid||at.grips[0]!==goal.id||at.grips[1]!==goal.id,
                'Forward first move reaches the goal: '+x+','+y);
        }
        verify(seenForward.size>0,'Forward-opening audit did not sample a valid move');
    }
    for(let i=1;i<route.length;i++){
        camera=clamp(body.y-H*.6,0,HEIGHT-H);
        const origin={...body},destination=route[i];
        const event=p=>({clientX:p.x,clientY:p.y-camera});
        down(event(body));
        for(let t=1;t<=10;t++)move(event({x:origin.x+(destination.x-origin.x)*t/10,
            y:origin.y+(destination.y-origin.y)*t/10}));
        release();
        verify(moveCount===i,'Input replay stopped: '+n+'/'+i);
    }
    verify(state==='won'&&stamina===0,'Goal or M+0 budget failed: '+n);
    verify(playerPath.length===moveCount+1,'Path must contain only committed positions');
    verify(playerPath.every((p,i)=>distance(p,route[i])<0.01),'Committed path differs from played endpoints');
    report.push({stage:n,pattern:expected[n-1],moves:route.length-1,holds:holds.length});
}
reset(5);ui.next.onclick();verify(level===1,'Stage five must cycle to stage one');
JSON.stringify(report)
`, context));
