'use strict';
// Exercise the real stage -> draw path, with both loaded sprite and fallback.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
 .map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const calls=[];
function context(){return new Proxy({drawImage(image,...args){calls.push({image,args});},
 getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4).fill(255)};},
 createLinearGradient(){return {addColorStop(){}};}
},{get(o,k){return o[k]||function(){};}});}
const elements={};const document={createElement(){return {width:0,height:0,getContext:context};},
 getElementById(id){return elements[id]||={style:{},classList:{toggle(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},getContext:context,getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}};}};
class Image {constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}addEventListener(){}}
const window={devicePixelRatio:1,addEventListener(){}};function requestAnimationFrame(){};function setTimeout(){return 0;}function clearTimeout(){}
`;
new Function('assert',env+source+`
for(const stage of [7,10,16]){
 reset(stage);cameraIntro=null;hideStageHelp();settingsOpen=false;state='playing';
 const expected=holds.filter(h=>h.type==='hazard');assert.equal(expected.length,2);
 assert.deepEqual(expected.map(h=>h.id).sort((a,b)=>a-b),[...activeCourseGeneration.report.spikes.selectedIds].sort((a,b)=>a-b));
 // Unloaded/failed images must retain an obvious vector marker, not disappear.
 hazardHoldImage.complete=false;hazardHoldImage.naturalWidth=0;
 const vector=[],nativeJagged=drawJaggedHold;drawJaggedHold=(...args)=>{vector.push(args);nativeJagged(...args);};
 draw();drawJaggedHold=nativeJagged;
 for(const h of expected)assert(vector.some(([x,y,r,fill])=>x===h.x&&y===h.y&&fill==='#9442be'));
 // A completed real-size source uses the game atlas for every visible hazard.
 hazardHoldImage.complete=true;hazardHoldImage.naturalWidth=hazardHoldImage.naturalHeight=128;
 calls.length=0;draw();assert(hazardHoldTintAtlas);assert.equal(hazardHoldTintAtlas.width,128);assert.equal(hazardHoldTintAtlas.height,128);
 const sprites=calls.filter(c=>c.image===hazardHoldTintAtlas&&c.args[2]===21.6&&c.args[3]===21.6);
 assert.equal(sprites.length,expected.length);
 assert.equal(holds.filter(h=>h.type==='hazard').length,2,'Rendering must not mutate generated hazards');
}
console.log('PASS actual STAGE7/10/16 hazard generation -> full game draw, loaded sprite and failed/loading image vector fallback (controlled Canvas/Image, not iOS pixel QA)');
`)(assert);
