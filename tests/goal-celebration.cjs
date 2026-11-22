'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {boot}=require('./tutorial-modals.cjs');

function setup(reduced=false){
    const b=boot(new Map([['ascent.progress.v1.r1','{"recordVersion":"r1","existing":{"cleared":4}}']]));
    const overlay=b.node('overlay'),canvas=b.node('goalCelebration'),wall=b.node('wall');
    const sounds=[];
    b.node('test-internals').noteSound=(name,time,burstStart)=>sounds.push({name,time,burstStart});
    b.run("const originalPlaySound=playSound;playSound=(name,...args)=>{document.getElementById('test-internals').noteSound(name,performance.now(),goalCelebration?.start);return originalPlaySound(name,...args);};");
    const frames=new Map();
    let count=0, current, particle=null;
    const trace={paper:[],stars:[],setup:[]};
    wall.clientWidth=400;wall.clientHeight=840;
    canvas.hidden=true;
    canvas.getContext=type=>{
        assert.equal(type,'2d');
        return {
            setTransform: (...args)=>trace.setup.push(args),
            clearRect(){trace.paper=[];trace.stars=[];},
            save(){particle={};},restore(){particle=null;},
            translate(x,y){current=particle;Object.assign(current,{x,y});},
            rotate(angle){current.angle=angle;},
            scale(flip){current.flip=flip;},
            beginPath(){current.pathCount=0;},
            moveTo(){current.pathCount++;},lineTo(){current.pathCount++;},
            closePath(){},stroke(){},
            fill(){trace.stars.push(current);},
            fillRect(){trace.paper.push(current);},
        };
    };
    b.node('test-internals').request=fn=>{frames.set(++count,fn);return count;};
    b.node('test-internals').cancel=id=>frames.delete(id);
    b.node('test-internals').reduced=reduced;
    b.run(`
        window.devicePixelRatio=3;
        window.matchMedia=()=>({matches:document.getElementById('test-internals').reduced});
        requestAnimationFrame=document.getElementById('test-internals').request;
        globalThis.cancelAnimationFrame=document.getElementById('test-internals').cancel;
        CourseProgressionConfig.stageSegments=[{fromStage:1,toStage:150,fromScore:1,toScore:1}];
        CourseProgressionConfig.daily.minScore=CourseProgressionConfig.daily.maxScore=1;
        CourseDistributionConfig.tables.length.rows=[{score:0,weights:[1,0,0]}];
        CourseDistributionConfig.tables.composition.rows=[{score:0,weights:[1,0]}];
    `);
    const shot=ms=>{
        const id=b.run('goalCelebration.frame');
        const fn=frames.get(id);assert(fn,'effect has a scheduled frame');
        frames.delete(id);
        b.advance(ms);fn(b.run('performance.now()'));
        return {paper:[...trace.paper],stars:[...trace.stars]};
    };
    const normal=()=>{
        b.run('showLevelMap({target:1});cancelMapReveal();mapPreparing=false;mapTransition=null;assert(selectStage(1));cameraIntro=null;hideStageHelp();');
    };
    const daily=()=>{
        b.run('showDailyCalendar();dailyMonth="2026-01";dailySelectedDate="2026-01-01";dailyPlayAdState={plays:0,adPaid:false};assert(selectDailyDate(dailySelectedDate));cameraIntro=null;hideStageHelp();');
    };
    const play=(index=1)=>{
        b.run(`SixPairSelection.withBaseline(()=>{const target=route[${index}];assert(validFingerAction(target.action));down({clientX:200,clientY:500});for(const p of target.action.points)move({clientX:200+p.dx,clientY:500+p.dy});release();});`);
    };
    const clear=()=>{
        for(let i=1,n=b.run('route.length');i<n;i++){
            if(i===n-1)b.run('runStartedAt=performance.now()-3456.75;');
            play(i);
        }
        assert.equal(b.run('state'),'won');
    };
    const active=()=>Boolean(b.run('goalCelebration'));
    return {b,canvas,overlay,frames,trace,shot,normal,daily,play,clear,active,sounds};
}

{
    const f=setup();f.normal();
    assert(!f.active());assert(f.canvas.hidden);
    f.clear();
    assert(f.active());assert(!f.canvas.hidden);
    assert(f.overlay.hidden && !f.overlay.open,'Burst launches before the result is visible');
    const clearSounds=()=>f.sounds.filter(s=>s.name==='goalClear' || s.name==='clear');
    assert.deepEqual(clearSounds(),[{name:'goalClear',time:1000,burstStart:1000}]);
    assert.equal(f.b.node('resultTap').hidden,false);
    const timer=f.b.run('pendingGoalResult.timer');
    const record=f.b.run('JSON.stringify(stageRecords)');
    const normalTime=()=>f.b.run('[runElapsedMs,runTimeMs(),stageRecords.existing[1].timeMs].join(",")');
    assert.equal(normalTime(),'3456,3456,3456','Goal commit freezes and saves elapsed time before celebration');
    f.b.run('beginPointer({clientX:200,clientY:420});beginPointer({clientX:4,clientY:420});assert(!bodyTap && !drag && !pan);assert(!canUndoMove());assert(!canScrollStage());ui.next.onclick();returnFromStage();showResultModal();finish(true);');
    f.overlay.events.click({target:f.b.node('resultTap')});
    f.overlay.events.cancel({preventDefault(){}});
    assert.equal(f.b.run('state'),'won');assert.equal(f.b.run('pendingGoalResult.timer'),timer);
    assert.equal(f.b.run('JSON.stringify(stageRecords)'),record,'Early input and re-entry do not mutate the saved clear');
    assert(f.overlay.hidden && !f.overlay.open);
    assert.deepEqual([f.canvas.width,f.canvas.height],[800,1680]);
    assert.deepEqual(f.trace.setup,[[2,0,0,2,0,0]]);
    const launch=f.shot(140), peak=f.shot(480), drift=f.shot(620);
    assert.equal(launch.stars.length,20);assert.equal(launch.paper.length,56);
    assert(launch.stars.every(p=>p.pathCount===10),'Draws five-pointed stars');
    assert(launch.paper.some(p=>p.x<60 && p.y>630),'Launch from lower left');
    assert(launch.paper.some(p=>p.x>340 && p.y>630),'Launch from lower right');
    assert(peak.paper.some((p,i)=>p.y<launch.paper[i].y-50),'Paper rises after launch');
    assert(peak.paper.some((p,i)=>p.x<20 && launch.paper[i].x>200),'Right-side spray reaches the left edge');
    assert(peak.paper.some((p,i)=>p.x>380 && launch.paper[i].x<200),'Left-side spray reaches the right edge');
    assert(drift.paper.some((p,i)=>p.y>peak.paper[i].y && Math.abs(p.flip-peak.paper[i].flip)>.2),'Paper falls and changes apparent width');
    assert.equal(drift.stars.length,0);assert.equal(drift.paper.length,56);
    f.b.advance(759);assert(f.overlay.hidden && !f.overlay.open,'Still hidden at 1999ms');
    f.b.fireTimer(timer);assert.equal(f.b.run('performance.now()'),3000,'Opens at 2000ms after clear');
    assert(f.overlay.open && !f.overlay.hidden);
    assert.equal(clearSounds().length,1,'No old or repeated cue as result opens');
    assert.equal(normalTime(),'3456,3456,3456','Normal result delay is not part of the clear time');
    assert.equal(f.b.run('ui.resultStats.textContent'),f.b.run('formatStageRecord({moves:moveCount,timeMs:3456})'));
    assert(!f.active());assert(f.canvas.hidden);
    f.b.run('showResultModal()');assert(!f.active(),'Reopening a result does not replay the burst');
    f.b.node('overlay').events.click({target:f.b.node('resultTap')});
    assert.equal(f.b.run('state'),'map');
    f.normal();f.clear();
    assert(f.active(),'A new clear can fire a new burst');
    const id=f.b.run('goalCelebration.frame'),stale=f.frames.get(id);
    const nextTimer=f.b.run('pendingGoalResult.timer'),queued=f.b.timerCallback(nextTimer);
    f.b.run('showTitleScreen()');
    assert(!f.frames.has(id),'Leaving stage cancels the pending frame');
    assert.equal(f.b.timerCallback(nextTimer),undefined,'Leaving stage cancels the modal timer');
    assert(!f.active());assert(f.canvas.hidden);
    stale(f.b.run('performance.now()'));queued();assert(f.canvas.hidden);assert(f.overlay.hidden && !f.overlay.open);
}
{
    const f=setup();f.daily();f.clear();
    assert(f.active(),'Daily clear shares the celebration');
    assert.deepEqual(f.sounds.filter(s=>s.name==='goalClear'||s.name==='clear'),[{name:'goalClear',time:1000,burstStart:1000}]);
    assert.equal(f.b.node('resultTap').hidden,false);
    assert(f.overlay.hidden && !f.overlay.open);
    const dailyTime=()=>f.b.run('[runElapsedMs,runTimeMs(),dailyRecords["2026-01-01"].timeMs].join(",")');
    assert.equal(dailyTime(),'3456,3456,3456','Daily goal records elapsed time immediately');
    f.b.fireTimer(f.b.run('pendingGoalResult.timer'));
    assert.equal(dailyTime(),'3456,3456,3456','Daily result delay is not part of the clear time');
    assert.equal(f.b.run('ui.resultStats.textContent'),f.b.run('formatStageRecord({moves:moveCount,timeMs:3456})'));
    assert(f.overlay.open && !f.overlay.hidden);
    assert(!f.active(),'Showing the Daily result ends the burst');assert(f.canvas.hidden);
}
{
    const f=setup();f.normal();
    f.b.run('stamina=1;');f.play();
    assert.equal(f.b.run('state'),'lost');assert(!f.active());assert(f.canvas.hidden);assert(f.overlay.open && !f.overlay.hidden);
    assert.deepEqual(f.sounds.filter(s=>['goalClear','clear','fail'].includes(s.name)).map(s=>s.name),['fail']);
}
{
    const f=setup(true);f.normal();f.clear();
    assert(f.overlay.hidden && !f.overlay.open);assert(!f.active(),'Respects reduced motion');assert(f.canvas.hidden);
    f.b.fireTimer(f.b.run('pendingGoalResult.timer'));assert(f.overlay.open && !f.overlay.hidden);
}
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8');
assert.match(html,/<section[^>]+id="wall"[^>]*>\s*<canvas id="game"[^>]*><\/canvas>\s*<canvas id="goalCelebration" aria-hidden="true" hidden><\/canvas>/);
assert.match(css,/#wall > #goalCelebration\s*{[^}]*pointer-events:none;\s*z-index:2;/);
console.log('PASS goal celebration: normal/Daily clear, lower emitters and opposite-side reach, flutter/fall, 1999/2000ms dialog boundary, early input shielding, stale callback cancellation, immediate failure and reduced motion');
