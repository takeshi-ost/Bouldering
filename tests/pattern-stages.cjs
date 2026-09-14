// Run with: node tests/pattern-stages.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(`const elements={}; const document={getElementById(id){return elements[id]||(elements[id]={style:{},classList:{toggle(){}},focus(){},addEventListener(){},getContext(){return new Proxy({}, {get(o,k){return o[k]||function(){};}})},getBoundingClientRect(){return {left:0,top:0,width:400,height:700}}});}}; const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`, context);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script src="([^"]+)" defer><\/script>/g))
    vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, {filename: match[1]});
console.log(vm.runInContext(`
function verify(condition, message) { if (!condition) throw Error(message); }
courseMode = 'verification';
const report = [];
for (let n = 1; n <= 6; n++) {
    reset(n);
    verify(level === n && verificationZone?.name === VERIFICATION_STAGES[n-1].name, 'Wrong stage or label: '+n);
    verify(verificationZone.width > 0 && verificationZone.height > 0, 'Missing rectangle: '+n);
    const replay = replayRoute(route);
    verify(replay && replay.length === route.length, 'Normal-rule solution failed: '+n);
    let framed = 0;
    ctx.strokeRect = () => { framed++; };
    ui.showPath.checked = true;
    drawPath();
    verify(framed === 1, 'Challenge rectangle not drawn: '+n);
    ui.showPath.checked = false;
    if (n === 1) {
        const from = route[5], to = route[6], support = holds.find(h => h.id === from.grips[to.anchor]);
        const hand = holds.find(h => h.id === to.grips[0]);
        verify(to.anchor === 2 && distance(support, hand) > 250 &&
            !limbReachable(from, hand, 0) && limbReachable(to, hand, 0), 'Remote foot axis missing');
    }
    if (n === 2) {
        const low = holds.find(h => h.id === 36), other = holds.find(h => h.id === 68);
        verify(route[10].y - route[9].y >= 20 && low.y > other.y &&
            route[10].grips.includes(low.id) && !inspectSwipe(route[9],route[11])?.won,
            'Crouch or low foothold missing');
    }
    if (n === 3) {
        const byId = id => holds.find(h => h.id === id), decoy = holds.find(h => h.y === 172);
        verify(byId(26).y < byId(30).y && byId(27).y < byId(30).y &&
            decoy.y > byId(30).y && route[9].grips.includes(26) &&
            route[9].grips.includes(27) && route[9].grips.includes(30),
            'Height boundary missing');
        const low = inspectSwipe(route[8],{x:route[9].x-50,y:route[9].y+40});
        verify(low?.pose[0]?.id === decoy.id && !low.pose.some(h => h?.id === 30),
            'Low hand does not exclude nearby foot');
    }
    if (n === 4) {
        const poison = holds.find(h => h.id === densityStats.poison.id);
        const entry = densityStats.poison.entry;
        verify(entry.grips[3] === poison.id && inspectSwipe(entry,route[10])?.cancelled &&
            !inspectSwipe(entry,route[11])?.won, 'Poison foot is harmless');
    }
    if (n === 5) {
        verify(falseBranch?.second && falseBranch.second.y < falseBranch.end.y &&
            falseBranch.end.y < route[falseBranch.step].y, 'Two-step upper dead end missing');
        const second = inspectSwipe(falseBranch.end,falseBranch.second);
        verify(second && !second.cancelled && second.pose.some(h => h.id === falseBranch.holdIds[1]),
            'Dead-end second step cannot be played');
    }
    if (n === 6) {
        const goal = holds.find(h => h.type === 'goal');
        verify(route[1].y >= route[0].y && distance(route[1],goal) > distance(route[0],goal) &&
            route[1].grips.includes(11), 'Isolated retreat missing');
        const saved = initialGrips;
        initialGrips = route[1].grips.map(id => holds.find(h => h.id === id));
        const suffix = solveRoute(route.slice(1), 5);
        initialGrips = saved;
        report.push({suffix: suffix?.length || null});
    }
    verify(state === 'playing' && moveCount === 0 && stamina === route.length,
        'Invalid initial play state: '+n);
    for (let i = 1; i < route.length; i++) {
        camera = clamp(body.y - H*.6,0,HEIGHT-H);
        const origin = {...body}, destination = route[i];
        const event = p => ({clientX:p.x,clientY:p.y-camera});
        down(event(body));
        for (let t = 1; t <= 10; t++) move(event({x:origin.x+(destination.x-origin.x)*t/10,y:origin.y+(destination.y-origin.y)*t/10}));
        release();
        verify(moveCount === i, 'Input replay stopped: '+n+'/'+i);
    }
    verify(state === 'won' && stamina === 1, 'Goal or budget failed: '+n);
    report.push({stage:n,pattern:verificationZone.name,moves:route.length-1,holds:holds.length});
}
reset(6); ui.next.onclick(); verify(level === 1, 'Stage 6 does not cycle to stage 1');
JSON.stringify(report)
`, context));
