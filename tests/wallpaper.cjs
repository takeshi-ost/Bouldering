const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../js/renderer.js'),'utf8');
new Function('assert',`
const calls=[],ctx={drawImage(...args){calls.push(args);}};
const W=400;let HEIGHT=700,top=0;function cameraTop(){return top;}
class Image{constructor(){this.complete=false;this.naturalWidth=0;}}
`+source+`
assert.equal(gameWallImage.src,'assets/game-wall.webp');
drawWallBackground();assert.equal(calls.length,0);
gameWallImage.complete=true;drawWallBackground();assert.equal(calls.length,0);
gameWallImage.naturalWidth=793;
for(const height of [700,1400,2100])for(const inset of [0,-180]) {
 HEIGHT=height;top=inset;drawWallBackground();
 assert.deepEqual(calls.at(-1),[gameWallImage,0,top,400,height-top]);
}
`)(assert);
new Function(source+`drawWallBackground();`)();
assert(fs.statSync(path.join(__dirname,'../assets/game-wall.webp')).size>0);
console.log('PASS game wallpaper: unloaded/missing image fallback, 1–3 screen world coverage and goal headroom');
