// Execute the browser scripts together in a native function for fast geometry tests.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)]
    .map(m => fs.readFileSync(path.join(root, m[1]), 'utf8')).join('\n');
const environment = `
const elements = {};
const document = {getElementById(id) { return elements[id] ||= {
    style: {}, classList: {toggle(){}}, focus(){}, addEventListener(){}, setAttribute(){},
    getContext(){return new Proxy({}, {get(o,k){return o[k] || function(){};}})},
    getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
}; }};
const window = {addEventListener(){}, devicePixelRatio:1};
function requestAnimationFrame(){}
`;
new Function('assert', environment + source + `
assert.equal(state, 'choosing');
draw(0); down({clientX:200,clientY:400}); assert.equal(drag,null);
ui.prototypeCourse.onclick();
assert.equal(courseMode,'prototype'); assert.equal(state,'playing');
const report=[];
for (let n=1;n<=20;n++) {
    reset(n);
    const snapshot=JSON.stringify({holds,route});
    const bodyPath=route.map(p=>({x:p.x,y:p.y}));
    assert(replayRoute(route));
    const complete=holds;
    for (const hold of complete) {
        if (hold.type !== 'normal') continue;
        holds=complete.filter(h=>h!==hold);
        const replayed=replayRoute(route);
        assert(!replayed || replayed.length!==route.length, 'Redundant hold '+n+'/'+hold.id);
    }
    holds=complete;
    assert.deepEqual(route.map(p=>({x:p.x,y:p.y})),bodyPath);
    advanceCameraIntro(0);advanceCameraIntro(1650);
    for(let i=1;i<route.length;i++) {
        camera=clamp(body.y-H*.6,0,HEIGHT-H);
        const origin={...body}, target=route[i], before=[...grips];
        const event=p=>({clientX:p.x,clientY:p.y-camera});
        down(event(body));
        for(let t=1;t<=10;t++) {
            move(event({x:origin.x+(target.x-origin.x)*t/10,y:origin.y+(target.y-origin.y)*t/10}));
            if(drag.anchor) assert(drag.anchor.every(k=>grips[k]===before[k] && limbReachable(body,grips[k],k)));
        }
        assert(grips.every((h,k)=>h && limbReachable(body,h,k)), 'Foot above shoulders or unreachable contact');
        assert.deepEqual(drag.anchor,target.anchor);
        draw(2000);release();
        assert.equal(moveCount,i,'Failed move '+n+'/'+i);
        assert.deepEqual(grips.map(h=>h.id),target.grips);
    }
    assert.equal(state,'won');assert.equal(stamina,STAGE_CONFIG.spareMoves);
    ui.retry.onclick();assert.equal(JSON.stringify({holds,route}),snapshot);
    report.push({level:n,holds:holds.length,moves:route.length-1});
}
ui.next.onclick();assert.equal(level,21);assert.equal(courseMode,'prototype');
ui.changeCourse.onclick();assert.equal(state,'choosing');assert.equal(drag,null);
ui.existingCourse.onclick();assert.equal(courseMode,'existing');assert.equal(level,1);
const original=JSON.stringify({holds,route});
ui.changeCourse.onclick();ui.prototypeCourse.onclick();
ui.changeCourse.onclick();ui.existingCourse.onclick();
assert.equal(JSON.stringify({holds,route}),original,'Prototype contaminated existing course');
// Guide-only generation returns the exact same pre-search guide and start/goal.
for(let n=1;n<=20;n++) {
    const generator=createStageGenerator();
    const existing=generator.generate(n), prototype=generator.generate(n,true);
    assert.deepEqual(prototype.route,existing.route);
    assert.deepEqual(prototype.initialGrips,existing.initialGrips);
    assert.deepEqual(prototype.holds.find(h=>h.type==='goal'),existing.holds.find(h=>h.type==='goal'));
    assert.equal(prototype.HEIGHT,existing.HEIGHT);
}
console.log('PASS prototype: 20 levels, real input, irreducible holds, shared guides, retry and course switching');
console.log(JSON.stringify(report));
`)(assert);
