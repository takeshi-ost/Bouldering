'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const renderer=fs.readFileSync('js/renderer.js','utf8');
const section=renderer.slice(renderer.indexOf('// A stable visual variant'),renderer.indexOf('function createMetallicGoalAtlas'));
const paintCalls=[];let wakeups=0,atlasCreates=0,saves=0,restores=0;
const ctx={save(){saves++;},translate(){},rotate(){},restore(){restores++;},drawImage(...args){paintCalls.push(args);},clearRect(){}};
class Image {
 constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this.decodeCalls=0;this.visible=false;}
 decode(){this.decodeCalls++;return this.pending??=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
}
const document={createElement(){atlasCreates++;let source;
 return {width:0,height:0,getContext(){return {drawImage(image){source=image;if(source.drawError)throw Error('Canvas draw failure');},getImageData(){if(source.readError)throw Object.assign(Error('readback'),{name:source.readError});return {data:new Uint8ClampedArray([100,100,100,source.visible?255:0])};},putImageData(){}};}};}};
const c=vm.createContext({Image,document,ctx,requestGameRender(){wakeups++;},Math,Promise});
const run=s=>vm.runInContext(s,c),flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
run(section);
(async()=>{
 // Reproduce the failing boundary: load metadata ready, decoded pixels pending.
 run('hazardHoldImage.complete=true;hazardHoldImage.naturalWidth=hazardHoldImage.naturalHeight=128;');
 assert.equal(run('drawHazardHoldSprite({x:200,y:400})'),false,'Never report an undecoded transparent sprite as drawn');
 assert.equal(atlasCreates,0,'Do not cache an empty atlas before decode');assert.equal(paintCalls.length,0);
 assert.equal(run('hazardHoldImage.decodeCalls'),1);
 run('drawHazardHoldSprite({x:220,y:420})');assert.equal(run('hazardHoldImage.decodeCalls'),1,'Single pending decode, not one promise per frame');
 run('hazardHoldImage.visible=true;hazardHoldImage.resolve();');await flush();assert.equal(wakeups,1);
 assert.equal(run('drawHazardHoldSprite({x:200,y:400})'),true);assert.equal(atlasCreates,1);assert.equal(paintCalls.length,1);
 run('drawHazardHoldSprite({x:220,y:420})');assert.equal(atlasCreates,1,'Reuse a valid atlas');
 // Fully transparent readback after decode also returns false, so draw() keeps
 // its vector fallback. A later valid draw retries instead of reusing the blank.
 run('var blank=new Image();blank.complete=true;blank.naturalWidth=blank.naturalHeight=128;');
 assert.equal(run('drawHazardSpriteTo(ctx,10,20,21.6,blank,true)'),false);
 const previous=paintCalls.length;assert.equal(run('drawHazardSpriteTo(ctx,10,20,21.6,blank,true)'),false);assert.equal(paintCalls.length,previous);
 run('blank.visible=true;');assert.equal(run('drawHazardSpriteTo(ctx,10,20,21.6,blank,true)'),true);
 // The decoded help source must not accidentally reuse another Image's atlas.
 run('var help=new Image();help.complete=true;help.naturalWidth=help.naturalHeight=128;help.visible=true;var icon={width:128,height:128,getContext:()=>ctx};');
 const before=atlasCreates;assert.equal(run('paintHazardHelpIcon(icon,help)'),true);assert.equal(atlasCreates,before+1);assert.equal(run('help.decodeCalls'),0);
 assert.equal(run('drawHazardHoldSprite({x:200,y:400})'),true);assert.equal(atlasCreates,before+2);
 // Rejected decoding never suppresses the fallback or starts an endless loop.
 run('var failed=new Image();failed.complete=true;failed.naturalWidth=failed.naturalHeight=128;drawHazardSpriteTo(ctx,1,2,21.6,failed);failed.reject(Error("decode"));');await flush();
 assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,failed)'),false);assert.equal(run('failed.decodeCalls'),1);
 run('var syncFailed=new Image();syncFailed.complete=true;syncFailed.naturalWidth=syncFailed.naturalHeight=128;syncFailed.decode=function(){this.decodeCalls++;throw Error("sync decode");};');
 assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,syncFailed)'),false);
 assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,syncFailed)'),false);assert.equal(run('syncFailed.decodeCalls'),1);
 // Decoding success is not enough if Canvas extraction/painting fails. Each
 // failure returns false, preserves transform state and permits a later retry.
 run('var broken=new Image();broken.complete=true;broken.naturalWidth=broken.naturalHeight=128;broken.visible=true;broken.drawError=true;');
 assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,broken,true)'),false);
 run('broken.drawError=false;broken.readError="InvalidStateError";');
 assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,broken,true)'),false);
 run('broken.readError="SecurityError";');
 assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,broken,true)'),false,'Unverified tainted hazard never suppresses the vector fallback');
 run('broken.readError=null;');
 const normalDraw=ctx.drawImage;ctx.drawImage=()=>{throw Error('destination draw');};
 assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,broken,true)'),false);
 assert.equal(restores,saves,'A failed destination draw must restore the Canvas transform');
 ctx.drawImage=normalDraw;assert.equal(run('drawHazardSpriteTo(ctx,1,2,21.6,broken,true)'),true);
 assert.equal(run('paintHazardHelpIcon({getContext(){throw Error("unavailable");}},broken)'),false);
 assert.equal(run('paintHazardHelpIcon({getContext(){return null;}},broken)'),false);
 console.log('PASS hazard decoded-pixel barrier, redraw, blank-atlas recovery, source identity, failed/synchronous decode, Canvas extraction/paint errors and balanced fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
