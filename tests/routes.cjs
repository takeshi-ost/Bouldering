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
console.log(vm.runInContext(`
function check(value, message) { if (!value) throw Error(message); }
const report = [];
for (let n = 1; n <= 20; n++) {
    reset(n);
    check(replayRoute(route), 'Route replay failed: ' + n);
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
        }
        release();
        check(distance(body, target) < .001, 'Waypoint missed: ' + n);
    }
    check(state === 'won' && bothHandsOnGoal(), 'Goal failed: ' + n);
    check(moveCount === expected && stamina === STAGE_CONFIG.spareMoves, 'Move budget');
    report.push({ level: n, moves: expected, holds: holds.length });
}
JSON.stringify(report)
`, context));
