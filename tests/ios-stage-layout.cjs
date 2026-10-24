'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const values = new Map(), events = {}, viewportEvents = {};
let observer, mutation, observed, active, rect = {left:0, top:47, width:390, height:763};
const frame = {left:0, top:0};
const game = {getBoundingClientRect:() => rect};
const hud = {hidden:false};
const wall = {toggleAttribute:(name,value)=>{active=value;},getBoundingClientRect:() => frame, style:{setProperty:(k,v) => values.set(k,v),removeProperty:k=>values.delete(k)}};
const environment = {
    document:{getElementById:id => ({wall,game,hud})[id]},
    ResizeObserver:class {constructor(fn){observer=fn;} observe(target){observed=target;}},
    MutationObserver:class {constructor(fn){mutation=fn;} observe(target){assert.equal(target,hud);}},
    window:{addEventListener:(k,v)=>events[k]=v,
        visualViewport:{addEventListener:(k,v)=>viewportEvents[k]=v}}
};
vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/native-stage-layout.js'),'utf8'), environment);
assert.equal(observed,game);
function check() {
    assert.equal(parseFloat(values.get('--native-stage-top')),rect.top-frame.top);
    assert.equal(parseFloat(values.get('--native-stage-left')),rect.left-frame.left);
    assert.equal(parseFloat(values.get('--native-stage-width')),rect.width);
    // The 44px settings target and 64px stamina heart stay inside the canvas.
    const top=parseFloat(values.get('--native-stage-top'))+12;
    assert(top>=rect.top-frame.top && top+28+58<=rect.top-frame.top+rect.height);
}
check();
assert(environment.ASCENT_STAGE_VIEWPORT.padding>0);
// Stage -> map -> stage -> retry -> title -> stage. All stage variables reset
// while inactive, and the map-lives class is explicitly excluded in CSS.
for(const hidden of [true,false,false,true,false]) {
    hud.hidden=hidden;mutation();assert.equal(active,!hidden);
    if(hidden)assert([...values.keys()].every(k=>!k.startsWith('--native-stage-')));else check();
    assert.equal(values.get('--native-screen-top'),`${rect.top-frame.top}px`);
    assert.equal(values.get('--native-screen-height'),`${rect.height}px`);
}
// Rotation/side safe areas and a nonzero parent origin use actual DOM bounds.
rect={left:241,top:12,width:219,height:383.25};frame.left=5;frame.top=3;
events.resize();check();
rect={left:20,top:59,width:350,height:612.5};observer();check();
rect={left:20,top:44,width:350,height:612.5};viewportEvents.resize();check();
const before=[...values];rect={left:0,top:0,width:0,height:0};observer();assert.deepEqual([...values],before);
const css=fs.readFileSync(path.join(root,'scripts/native-stage-layout.css'),'utf8');
assert(css.includes('#wall[data-native-stage] > #hud') && css.includes('.game-lives:not(.map-lives)'));
assert(css.includes('#wall > #game:focus { border:0; outline:none; }'));
assert(!/overflow\s*:|\.title-screen|dialog/.test(css));
assert(css.includes('#wall > #levelMap, #wall > #dailyCalendar'));
assert(css.includes('#wall > #lifeStatus.map-lives') && css.includes('#levelMap > .map-inventory { top:42px;'));
assert(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('native-stage-layout'));
console.log('PASS native stage layout: expanded portrait, rotation, viewport resize, stage/map/retry/title reset, map-lives exclusion; Web unchanged');
