'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const input=fs.readFileSync('js/input.js','utf8');
const handlers=input.slice(input.indexOf('ui.showHelp.onclick ='),input.indexOf('// Full-screen dialogs'));
let focused=0,opened=0;
const events={};
const dialog={open:false,showModal(){this.open=true;opened++;},close(){this.open=false;events.close();},addEventListener(name,fn){events[name]=fn;}};
const env={mapPreparing:false,settingsOpen:true,state:'map',ui:{
    helpDialog:dialog,helpScroll:{scrollTop:0},closeHelp:{},showHelp:{focus(){focused++;}}}};
vm.runInNewContext(handlers,env);
for(const scene of ['map','daily','playing']) {
    env.state=scene;env.ui.helpScroll.scrollTop=250;
    env.ui.showHelp.onclick();assert(dialog.open);assert.equal(env.ui.helpScroll.scrollTop,0);
    const count=opened;env.ui.showHelp.onclick();assert.equal(opened,count,'Do not reopen the active modal');
    env.ui.helpScroll.scrollTop=500;
    dialog.onclick({target:env.ui.helpScroll});assert(dialog.open,'Reading/scrolling inside must not dismiss');
    const before=focused;env.ui.closeHelp.onclick();assert(!dialog.open);assert.equal(focused,before+1);
    assert.equal(env.state,scene);assert(env.settingsOpen,'Closing help must return to settings');
    env.ui.showHelp.onclick();assert(dialog.open);assert.equal(env.ui.helpScroll.scrollTop,0,'Reopen at the beginning');
    dialog.onclick({target:dialog});assert(!dialog.open);assert.equal(env.state,scene);
}
for(const overrides of [{settingsOpen:false},{mapPreparing:true},{state:'choosing'},{state:'ad'}]) {
    Object.assign(env,{settingsOpen:true,mapPreparing:false,state:'map'},overrides);
    const count=opened;env.ui.showHelp.onclick();assert.equal(opened,count);assert(!dialog.open);
}
console.log('PASS help: map/daily/stage opening, inner interaction, close/focus return, repeat-open scroll reset and blocked scenes');
