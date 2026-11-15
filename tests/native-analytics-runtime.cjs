'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../scripts/native-analytics-runtime.js'),'utf8');
async function fixture(enabled=true){
 const events=[],children=[],listeners={};let response={enabled,available:true,epoch:0};
 const ctx={Promise,addEventListener:(n,f)=>listeners[n]=f,document:{getElementById:()=>({appendChild:e=>children.push(e)}),createElement:()=>({setAttribute(){}})},Capacitor:{Plugins:{AscentAnalytics:{status:async()=>response,event:async e=>events.push(e)}}},state:'map',level:1,dailyRun:null,moveCount:3,isTutorialRun:()=>false,activeDebugCourse:()=>false,reset(n){ctx.level=n;ctx.state='playing'},finish(won){ctx.state=won?'won':'lost'}};
 vm.createContext(ctx);vm.runInContext(source,ctx);await Promise.resolve();await Promise.resolve();return{ctx,events,children,set:r=>response=r,refresh:()=>listeners['ascent-terms-ready']()};
}
(async()=>{
 let f=await fixture(false);f.ctx.reset(78);f.ctx.finish(true);assert.equal(f.events.length,0);assert.equal(f.children.length,0);
 f=await fixture();f.ctx.reset(78);f.ctx.finish(true);f.ctx.finish(true);assert.equal(f.events.length,2);assert.equal(f.events[1].parameters.success,1);
 f=await fixture();f.ctx.activeDebugCourse=()=>true;f.ctx.reset(78);f.ctx.finish(true);assert.equal(f.events.length,0);
 f=await fixture();f.ctx.isTutorialRun=()=>true;f.ctx.reset(0);f.ctx.finish(true);assert.equal(f.events.length,0);
 f=await fixture();f.ctx.dailyRun={date:'2026-11-15'};f.ctx.reset(88);f.ctx.finish(false);assert.equal(f.events[0].parameters.mode,'daily');assert(!JSON.stringify(f.events).includes('2026'));
 f=await fixture(false);f.set({enabled:true,available:true,epoch:1});await f.refresh();f.ctx.reset(1);f.ctx.finish(true);assert.equal(f.events.length,2);
 f=await fixture();f.ctx.Capacitor.Plugins.AscentAnalytics.event=()=>{throw Error('bridge unavailable')};assert.doesNotThrow(()=>{f.ctx.reset(1);f.ctx.finish(true)});
 f=await fixture();f.ctx.reset(1);f.ctx.Capacitor.Plugins.AscentAnalytics.status=async()=>{throw Error('bridge')};await f.refresh();f.ctx.finish(true);assert.equal(f.events.length,1);
 const swift=fs.readFileSync('ios/App/App/AscentAnalyticsPlugin.swift','utf8');assert(!swift.includes('@objc func privacy('));assert(!swift.includes('func choose('));assert(!source.includes('plugin.privacy'));assert(!source.includes('createElement'));
 console.log('PASS native analytics: preconsent OFF, acceptance ON, events/tutorial/daily/SDK failures; no settings toggle or native withdrawal API');
})().catch(e=>{console.error(e);process.exitCode=1});
