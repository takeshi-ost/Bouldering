if (process.argv.includes('--challenge')) { require('./two-support.cjs'); return; }
// Run with: node tests/routes.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({});
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (/<input[^>]*id="showPath"[^>]*checked/.test(html)) throw Error('Path must default to off');
vm.runInContext('const elements={}; const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},addEventListener(){},getContext(){return new Proxy({}, {get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}}; const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};\n\n\n\n\n\n\n\n\n\n', context);
for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)" defer><\/script>/g)) {
    vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
}
vm.runInContext("courseMode=" + JSON.stringify(process.argv.includes("--challenge") ? "challenge" : "classic"), context);
vm.runInContext('const resetWithIntro=reset;reset=function(n){resetWithIntro(n);advanceCameraIntro(0);advanceCameraIntro(1650);};',context);
console.log(vm.runInContext(`
function check(value, message) { if (!value) throw Error(message); }
// The six verification patterns have their own normal-input regression suite
// in tests/pattern-stages.cjs. This file continues to cover the two standard
// 20-level courses and shared movement rules.

// Release without changing the four contact positions must be a no-op.
reset(1);
const originalBody = { ...body }, originalGrips = [...grips], originalStamina = stamina;
for (const permutation of [[0,1,2,3], [1,0,3,2], [3,2,1,0]]) {
    committed = { ...originalBody };
    startGrips = [...originalGrips];
    body = { x: originalBody.x + 4, y: originalBody.y - 3 };
    grips = permutation.map(i => originalGrips[i]);
    drag = { anchor: 0 };
    release();
    check(stamina === originalStamina && moveCount === 0, 'No-op charged stamina');
    check(distance(body, originalBody) === 0 && grips.every((h,i) => h === originalGrips[i]), 'No-op did not restore pose');
}
const changed = [...originalGrips];
changed[0] = { ...changed[0], x: changed[0].x + 1 };
check(!sameContacts(changed, originalGrips), 'Changed contact ignored');
check(!sameContacts([originalGrips[0], originalGrips[0], originalGrips[2], originalGrips[3]], originalGrips), 'Duplicate count ignored');
committed = { ...body }; startGrips = [...originalGrips]; grips = changed; drag = { anchor: 1 };
release();
check(stamina === originalStamina - 1 && moveCount === 1, 'Real transfer was free');
const goal = { id: 9000, x: 200, y: 220, type: 'goal' };
const lowLeft = { id: 9001, x: 170, y: 380 }, lowRight = { id: 9002, x: 230, y: 380 };
const otherHand = { id: 9003, x: 245, y: 235 };
holds = [goal, lowLeft, lowRight, otherHand];
for (const anchor of [0, 1]) {
    startGrips = anchor === 0 ? [goal, otherHand, lowLeft, lowRight] : [otherHand, goal, lowLeft, lowRight];
    const pose = attachMoving({ x:200, y:300 }, anchor);
    check(pose[anchor] === startGrips[anchor], 'Goal anchor moved');
    check(bothHandsOnGoal(pose), 'Other hand cannot share fixed goal');
}
check(!bothHandsOnGoal([goal, otherHand, lowLeft, lowRight]), 'Single hand wins');
check(!canShareGoal(goal, 0, 2), 'Foot can share goal');
check(!canShareGoal({type:'normal'}, 0, 1), 'Normal hold shared');
// A foot must park before its old hold can be used by a hand.
{
    holds=[{x:160,y:140},{x:240,y:140},{x:200,y:300},{x:260,y:300},{x:280,y:220},{x:360,y:220},{x:280,y:378},{x:150,y:440},{x:200,y:60,type:'goal'}].map((h,id)=>({type:'normal',...h,id}));
    HEIGHT=700;
    const a={x:200,y:220,grips:[0,1,2,3]};
    const park=inspectSwipe(a,{x:320,y:300});
    const reach=inspectSwipe(park.result,{x:200,y:368});
    check(!park.cancelled && !reach.cancelled,'Parking sequence cannot be played');
    check(inspectSwipe(a,{x:200,y:368}).cancelled,'Competition can be skipped');
    const conflict=footCompetition([a,park.result,reach.result]);
    check(conflict && conflict.holdId===2 && conflict.foot===2 && conflict.hand===0,'Missing foot/hand competition');
}
// Goal attempt has geometric hand reach but loses a foot; real release rolls back.
{
    holds=[{x:200,y:180},{x:300,y:180},{x:160,y:340},{x:240,y:340},{x:200,y:100,type:'goal'}].map((h,id)=>({type:'normal',...h,id}));
    const dead={x:200,y:250,grips:[0,1,2,3]};
    const target={x:200,y:120};
    check(goalFootFailure(dead,target)?.reason==='reach','Foot failure not detected');
    check(relaxedGoalPossible(dead,2),'Potential escape incorrectly certified impossible');
    body={x:dead.x,y:dead.y};committed={...body};grips=dead.grips.map(id=>holds[id]);startGrips=[...grips];
    camera=0;state='playing';drag=null;stamina=5;moveCount=0;
    down({clientX:body.x,clientY:body.y});move({clientX:target.x,clientY:target.y});release();
    check(body.x===dead.x && body.y===dead.y && stamina===5 && moveCount===0,'Failed goal attempt did not roll back');
    check(grips.every((h,i)=>h.id===dead.grips[i]),'Rollback changed contact assignment');
    holds=[{x:200,y:100,type:'goal',id:4},...holds.slice(0,4).map(h=>({...h,y:h.y+300}))];
    check(!relaxedGoalPossible({...dead,y:550},3),'Impossible goal lacks a certificate');
}
const report = [];
for (let n = 1; n <= 20; n++) {
    reset(n);
    if (courseMode === 'challenge' && densityStats.challenge) {
        const q = challengeQuality(route,densityStats.challenge.step);
        check(q && q.stable >= 6 && q.key.goalDistanceGap >= 8 && q.key.exitStable >= 6, 'Invalid challenge');
    }
    if(n>1)check(route.slice(1).some((p,i)=>isTraverse(route[i],p)), 'Missing horizontal/descending traverse');
    const patterns=densityStats.patterns;
    if(patterns?.traverse) {
        const i=patterns.traverse.step;
        check(Math.abs(route[i].x-route[i-1].x)>=50 && route[i].y>=route[i-1].y && route[i].y-route[i-1].y<=20,'Invalid traverse');
        check(falseBranch && falseBranch.step===i-1,'Traverse lacks upward decoy');
        check(!challengeTransfer(route[i-2],route[i]),'Traverse preparation can be skipped');
    }
    if(patterns?.competition) check(footCompetition(route),'Competition disappeared');
    if(patterns?.goalTrap) {
        const trap=patterns.goalTrap, entry=inspectSwipe(route[trap.step],trap.dead);
        check(entry && !entry.cancelled && entry.pose.some(h=>h.id===trap.holdId),'Trap cannot be entered');
        check(goalFootFailure(entry.result,trap.failure.target),'Trap foot failure disappeared');
        check(!relaxedGoalPossible(entry.result,trap.remaining),'Trap has no stamina certificate');
    }
    if (falseBranch) check(validateFalseBranch(falseBranch), 'Invalid false branch');
    check(replayRoute(route), 'Route replay failed: ' + n);
    check(relaxedGoalPossible(route[route.length-3],2), 'Certificate rejected a known two-move solution');
    const coreIds = new Set([...initialGrips.map(h => h.id), ...route.flatMap(p => p.grips || [])]);
    const branches = holds.filter(h => !coreIds.has(h.id));
    check(branches.length <= 4, 'Too many off-route holds');
    const span = 2 * Math.max(...LIMB_LENGTHS) + Math.hypot(TORSO.width, TORSO.height);
    for (const h of branches) {
        const connected = branches.filter(other => other !== h && distance(h, other) <= span);
        check(connected.length <= 1, 'Long branch chain');
    }
    check(HEIGHT <= H * 2, 'Height limit');
    const expected = route.length - 1;
    for (let i = 1; i <= expected; i++) {
        camera = clamp(body.y - H * .6, 0, HEIGHT - H);
        const start = { ...body }, target = route[i];
        const event = p => ({ clientX: p.x, clientY: p.y - camera });
        down(event(body));
        for (let step = 1; step <= 10; step++) {
            move(event({ x: start.x + (target.x - start.x) * step / 10, y: start.y + (target.y - start.y) * step / 10 }));
            check(grips[drag.anchor] === startGrips[drag.anchor], 'Support moved');
            const attached = grips.filter(Boolean);
            check(new Set(attached).size === attached.length - (bothHandsOnGoal() ? 1 : 0), 'Invalid shared hold');

        }
        release();
        check(distance(body, target) < .001, 'Waypoint missed: ' + n);
        if (falseBranch && i===falseBranch.step) {
            const budget=stamina, count=moveCount, original=[...grips];
            for (const dest of [falseBranch.end,target]) {
                camera=clamp(body.y-H*.6,0,HEIGHT-H);
                const origin={...body};
                down(event(body));
                for (let t=1;t<=10;t++) move(event({x:origin.x+(dest.x-origin.x)*t/10,y:origin.y+(dest.y-origin.y)*t/10}));
                release();
                check(distance(body,dest)<.001,'Branch move failed');
            }
            check(grips.every((h,k)=>h===original[k]),'Branch return pose changed');
            check(stamina===budget-2 && moveCount===count+2,'Branch move budget');
            stamina=budget; moveCount=count;
        }
    }
    check(state === 'won' && bothHandsOnGoal(), 'Goal failed: ' + n);
    check(moveCount === expected && stamina === STAGE_CONFIG.spareMoves, 'Move budget');
    report.push({ level: n, moves: expected, holds: holds.length, traverses:route.slice(1).filter((p,i)=>isTraverse(route[i],p)).length, patterns:densityStats.patterns, branch: falseBranch, challenge: densityStats.challenge || null });
}
check(courseMode !== 'challenge' || report.some(p=>p.branch), 'No false branch generated');
check(courseMode !== 'challenge' || report.some(p=>p.traverses>0), 'No verified traverse generated');
JSON.stringify(report)
`, context));
