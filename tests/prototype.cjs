// Execute the browser scripts together in a native function for fast geometry tests.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
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
assert.equal(state,'choosing');
assert.equal(typeof ui.prototypeCourse,'undefined');
assert.equal(typeof preparePrototypeStage,'undefined');
startCourse('prototype');assert.equal(courseMode,'existing');
assert.equal(state,'map');assert(selectStage(1));
const ordinary=JSON.stringify({holds,route,hearts});
showTitleScreen();startCourse('existing');assert(selectStage(1));
assert.equal(JSON.stringify({holds,route,hearts}),ordinary,'Retired name must use formal generation');
assert(SixPairSelection.withBaseline(()=>samePairRoute(route,replayRoute(route))));
console.log('PASS retired prototype entry point: absent controls, legacy-name normalization and formal generation parity');
`)(assert);
