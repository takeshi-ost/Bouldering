const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const renderer=read('js/renderer.js');
const dependencies=['js/text-ja.js','js/text-en.js','js/text-dev-ja.js','js/text.js','js/config.js','js/viewport.js'].map(read).join('\n');
new Function('assert',`
const calls=[],ctx={drawImage(...args){calls.push(args);}};
const document={},window={};let HEIGHT=700,top=0,camera=0;
const canvas={getBoundingClientRect(){return {width:400,height:700};}};
function cameraTop(){return top;}
class Image{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}}
`+dependencies+renderer+`
assert.equal(gameWallImage.src,'assets/game-wall.webp');
drawWallBackground();assert.equal(calls.length,0);
gameWallImage.complete=true;drawWallBackground();assert.equal(calls.length,0);
gameWallImage.naturalWidth=793;gameWallImage.naturalHeight=1400;
for(const height of [700,1400,2100])for(const inset of [0,-180])for(const viewHeight of [700,900,1100]) {
 HEIGHT=height;top=inset;globalThis.ASCENT_VIEWPORT=viewportMetrics(400,viewHeight);
 for(const scroll of [top,(height-H)/2,height-H]) {
  camera=scroll;calls.length=0;drawWallBackground();
  assert.deepEqual(calls[0],[gameWallImage,0,top,400,height-top]);
  const padding=(viewHeight-H)/2,viewTop=camera-padding,viewBottom=camera+H+padding;
  const expected=[[gameWallImage,0,top,400,height-top]];
  if(viewTop<top)expected.push([gameWallImage,0,0,793,1,0,viewTop,400,top-viewTop]);
  if(viewBottom>height)expected.push([gameWallImage,0,1399,793,1,0,height,400,viewBottom-height]);
  assert.deepEqual(calls,expected,'World image and edge extensions must cover the expanded viewport without gaps');
 }
}
delete globalThis.ASCENT_VIEWPORT;
`)(assert);
new Function(renderer+`drawWallBackground();`)();
assert(fs.statSync(path.join(root,'assets/game-wall.webp')).size>0);
console.log('PASS wallpaper: actual config/viewport dependencies, missing/unloaded images, 1–3 screen worlds, negative headroom and 700/900/1100 logical-height edge coverage');
