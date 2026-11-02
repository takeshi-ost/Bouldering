'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const elements={},events={},document={getElementById:id=>elements[id]||=( {textContent:'',hidden:false})};
let language='ja',unexpected=0;
const context=vm.createContext({document,navigator:{onLine:true},window:{addEventListener:(name,fn)=>events[name]=fn},
 gameText:key=>({ja:{'settings.online':'オンライン','settings.offline':'オフライン'},en:{'settings.online':'Online','settings.offline':'Offline'}})[language][key],
 fetch(){unexpected++;throw Error('No probes allowed');},localStorage:new Proxy({},{get(){unexpected++;throw Error('No persistence allowed');}})});
vm.runInContext(fs.readFileSync('js/settings-connection.js','utf8'),context);
const value=()=>elements.settingsConnectionValue.textContent,signal=context.ASCENT_SETTINGS_CONNECTION;
assert.equal(value(),'オフライン','navigator true is not service verification');
signal.success();assert.equal(value(),'オンライン');
language='en';context.refreshSettingsConnection();assert.equal(value(),'Online');
context.navigator.onLine=false;events.offline();assert.equal(value(),'Offline');
context.navigator.onLine=true;events.online();assert.equal(value(),'Offline','Reconnection waits for verified request');
signal.success();signal.failure();assert.equal(value(),'Offline');
const oldTicket=signal.ticket();events.offline();events.online();signal.success(oldTicket);assert.equal(value(),'Offline','Delayed acknowledgement from old network epoch is ignored');
context.ASCENT_TRIAL={};signal.success();assert.equal(value(),'Offline','Public trial stays offline');delete context.ASCENT_TRIAL;
context.ASCENT_IOS_BUILD={firebaseEnabled:false};signal.success();assert.equal(value(),'Offline');delete context.ASCENT_IOS_BUILD;
signal.failure();assert.equal(unexpected,0);
// Web integration only; unchanged native baseline is verified separately.
 const online=fs.readFileSync('js/online.js','utf8'),scores=fs.readFileSync('js/online-scores.js','utf8');
 assert(online.includes('const saved=await online.adapter.sync(online.uid,profile,preferLocal);\n            globalThis.ASCENT_SETTINGS_CONNECTION?.success(connectionTicket);'));
 assert(scores.includes("if(!validStageScore(saved) || !scoreMatchesBoard(board,saved))throw new Error('Invalid saved score');\n            globalThis.ASCENT_SETTINGS_CONNECTION?.success(connectionTicket);"));
 assert(!online.match(/players\([^\n]+\)\.then\(rows=>\{\s*globalThis.ASCENT_SETTINGS_CONNECTION\?\.success/),'Cache-eligible Web reads must not claim verification');
console.log('PASS Web settings connection: initial/cache conservative, verified response signals, offline/reconnect/stale epochs, JA/EN; no network/auth/storage probes');
