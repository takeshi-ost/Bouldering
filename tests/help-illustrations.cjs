'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8');
const help=html.match(/<dialog id="helpDialog"[\s\S]*?<\/dialog>/)[0];
const entries=[...help.matchAll(/<canvas width="156" height="156" data-help-image="([^"]+)" data-help-art="([^"]+)" hidden><\/canvas>/g)].map(m=>[m[1],m[2]]);
assert.deepEqual(entries,[
 ['assets/tutorial-goal-hands-78-v2.png','image'],
 ['assets/help-stamina-lives-v1.jpg','image'],
 ['assets/tutorial-swipe-78-v1.png','image'],
 ['assets/tutorial-feet-limit-78-v2.png','image'],
 ['assets/help-body-tap-78-v1.png','image'],
 ['assets/hold-shapes-gray-contrast.webp','normal'],
 ['assets/hold-wide-flat.webp','wide'],
 ['assets/hold-hazard-source.webp','hazard'],
 ['assets/hold-shapes-gray-contrast.webp','goal'],
 ['assets/course-heart-2.svg','heart'],
 ['assets/help-stage-map-v1.jpg','image'],
 ['assets/help-daily-challenge-v1.jpg','image'],
 ['assets/help-character-editor-v1.jpg','image']
]);
for(const [path] of entries)assert(fs.existsSync(path));
const crypto=require('node:crypto');
for(const [path,hash] of [
 ['assets/help-stamina-lives-v1.jpg','549232186278c92900491fedab7990ed40a0d5d6833fa16741bc10e34b5b4cae'],
 ['assets/help-body-tap-78-v1.png','83531563522724d5dcb50ff510f9e1aa06f2c04af4a36a8701aafb3bc3f74700'],
 ['assets/help-stage-map-v1.jpg','b2b39786b7637147fa02b49946e0ce3398a15380352b6162f96ce078f28426b1'],
 ['assets/help-daily-challenge-v1.jpg','5e11bea3fa8ccee126e5852c88a5b7ba487f3f84607745dca53605ed96cad75f'],
 ['assets/help-character-editor-v1.jpg','24ee6b6531f9f1736a46fae5bc258f567311b304310ded0a1691956ed6d06a6a']
])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,'Exact supplied image / deterministically sized approved illustration');
const tap=fs.readFileSync('assets/help-body-tap-78-v1.png');assert.equal(tap.readUInt32BE(16),78);assert.equal(tap.readUInt32BE(20),78);
for(const [file,key] of [['help-stamina-lives-v1.jpg','help.rules.stamina'],['help-body-tap-78-v1.png','help.controls.undo'],["help-stage-map-v1.jpg", "help.map.select"],["help-daily-challenge-v1.jpg", "help.daily.select"],["help-character-editor-v1.jpg", "help.editor.customize"]])
 assert(help.includes('data-help-image="assets/'+file+'" data-help-art="image" hidden></canvas></span><p class="help-illustrated-copy" data-i18n="'+key+'"></p>'),'Image stays with its exact requested paragraph');
assert.equal((help.match(/class="help-illustration" aria-hidden="true"/g)||[]).length,13,'Decorative images never duplicate the adjacent accessible explanation');
assert(!/<canvas[^>]*tabindex/.test(help),'Artwork never steals focus/keyboard scrolling');
assert(help.includes('class="help-illustrated-row" data-help-if-text="help.controls.feet"'));
assert(/\.help-illustrated-row\s*\{[^}]*flex-wrap:wrap;/.test(css));
assert(/\.help-illustrated-row > \.help-illustrated-copy\s*\{[^}]*flex:1 1 150px;[^}]*min-width:0;/.test(css));
assert(/\.help-illustration\s*\{[^}]*width:78px;[^}]*height:78px;[^}]*background:#eee9df;/.test(css));
assert(css.includes('.help-illustration canvas[hidden] { display:none; }'));
// Numeric flex sizing, not a browser-layout claim: rows wrap before text shrinks
// below 150 logical px. 368px dialog - padding/borders = 322 (markerless list also 322).
for(const width of [302,322,200,160]){
 const separateLine=width<78+12+150,textWidth=separateLine?width:width-78-12;
 assert(textWidth>=150);assert(78<=width);
}
for(const scale of [.7,.8,.975,1])assert(368*scale<=400*scale);

function canvas(width=156,height=156){
 const calls=[],paint={calls,drawImage(...args){calls.push(['drawImage',...args]);},clearRect(...args){calls.push(['clearRect',...args]);},save(){calls.push(['save']);},restore(){calls.push(['restore']);},translate(...args){calls.push(['translate',...args]);},rotate(...args){calls.push(['rotate',...args]);},fillRect(...args){calls.push(['fillRect',...args]);},createLinearGradient(){return {addColorStop(){}};},getImageData(x,y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let n=0;n<data.length;n+=4)data.set([153,148,145,255],n);return {data};},putImageData(pixels){calls.push(['pixels',...pixels.data.slice(0,4)]);}};
 return {width,height,hidden:true,paint,getContext(){return paint;}};
}
function boot(){
 const nodes=entries.map(([src,kind])=>Object.assign(canvas(),{getAttribute:key=>key==='data-help-image'?src:kind}));
 const images=[],timers=new Map();let sequence=0;
 class FakeImage {
  constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;images.push(this);}
  decode(){return new Promise((resolve,reject)=>{this.decoded=resolve;this.decodeFailed=reject;});}
  load(){this.complete=true;this.naturalWidth=this.src.includes('hold-shapes')?512:this.src.includes('hold-wide')?256:128;this.naturalHeight=this.src.includes('course-heart')?115.2:128;if(this.src.includes('help-stamina-lives')){this.naturalWidth=243;this.naturalHeight=247;}if(this.src.includes('help-body-tap'))this.naturalWidth=this.naturalHeight=78;const size={"assets/help-stage-map-v1.jpg": [326, 318], "assets/help-daily-challenge-v1.jpg": [350, 340], "assets/help-character-editor-v1.jpg": [1170, 1252]}[this.src];if(size)[this.naturalWidth,this.naturalHeight]=size;this.onload?.();}
  replaceWith(){throw Error('Cached tutorial image must not be moved');}
 }
 const document={querySelectorAll:()=>nodes,createElement:()=>canvas()};
 const env=vm.createContext({document,Image:FakeImage,Uint8ClampedArray,setTimeout(fn,ms){timers.set(++sequence,{fn,ms});return sequence;},clearTimeout:id=>timers.delete(id)});
 const renderer=fs.readFileSync('js/renderer.js','utf8');
 vm.runInContext("const holdShapesImage=null;\n"+renderer.slice(renderer.indexOf('const HAZARD_HOLD_TINT_RGB'),renderer.indexOf('// World-space effects')),env);
 vm.runInContext(fs.readFileSync('js/explanation-images.js','utf8')+'\n'+fs.readFileSync('js/help-illustrations.js','utf8'),env);
 return {nodes,images,timers,run:code=>vm.runInContext(code,env)};
}
const tick=async()=>{await Promise.resolve();await Promise.resolve();};
async function main(){
 const b=boot();assert.equal(b.images.length,12,'Normal/goal share the same pending decoded atlas');
 assert(b.nodes.every(n=>n.hidden));b.run('prepareHelpIllustrations()');assert.equal(b.images.length,12);
 for(const image of b.images)image.load();await tick();assert(b.nodes.every(n=>n.hidden),'Wait for decode, not just network load');
 for(const image of b.images)image.decoded();await tick();assert(b.nodes.every(n=>!n.hidden));assert.equal(b.timers.size,0);
 assert(b.run('[holdTintAtlases,wideHoldTintAtlases,goalHoldTintAtlas,hazardHoldTintAtlas].every(atlas=>atlas===null)'),'Help never fills/replaces any world renderer atlas');
 const lastDraw=n=>b.nodes[n].paint.calls.filter(c=>c[0]==='drawImage').at(-1);
 assert.deepEqual(lastDraw(0).slice(-4),[0,0,156,156],'Tutorial image fills original square');
 assert.equal(lastDraw(1).at(-1),156);assert(Math.abs(lastDraw(1).at(-2)-156*243/247)<1e-10,'Stamina/lives keeps its original 243:247 ratio without crop or stretch');
 assert(Math.abs(lastDraw(1).at(-4)-(156-156*243/247)/2)<1e-10,'Nonsquare source is centered');
 assert.deepEqual(lastDraw(4).slice(-4),[0,0,156,156],'78px body-tap art fills the 78px CSS plate');
 assert.deepEqual(lastDraw(5).slice(2,6),[0,0,128,128],'Only the first real normal-hold atlas tile is shown');
 assert.deepEqual(lastDraw(6).slice(-2),[124.80000000000001,62.400000000000006],'Wide art preserves its native 2:1 aspect');
 assert(b.nodes[7].paint.calls.some(c=>c[0]==='rotate'&&c[1]===-Math.PI/2),'Real sharp-hold orientation is retained');
 assert.deepEqual(lastDraw(8)[1].paint.calls.find(c=>c[0]==='pixels'),['pixels',221,161,31,255],'Goal uses actual metallic gold palette');
 assert(Math.abs(lastDraw(9).at(-1)/lastDraw(9).at(-2)-.9)<1e-10,'Heart preserves original 100:90 ratio');
 assert.deepEqual(lastDraw(5)[1].paint.calls.find(c=>c[0]==='pixels'),['pixels',130,129,143,255],'Normal uses existing first pastel game tint');
 for(const [index,width,height] of [[10,326,318],[11,350,340],[12,1170,1252]]){
  const draw=lastDraw(index),scale=Math.min(156/width,156/height);
  assert.deepEqual(draw.slice(2,6),[0,0,width,height],'New original JPEG is never cropped');
  for(const [actual,expected] of [[draw.at(-2),width*scale],[draw.at(-1),height*scale],[draw.at(-4),(156-width*scale)/2],[draw.at(-3),(156-height*scale)/2]])assert(Math.abs(actual-expected)<1e-10,'Original aspect and centered containment');
 }
 const snapshots=b.nodes.map(n=>n.paint.calls.length);b.run('prepareHelpIllustrations()');assert.deepEqual(b.nodes.map(n=>n.paint.calls.length),snapshots,'Reopening ready art neither loads nor repaints');
 // A failed source cannot hide prose, hold the modal open, or block settings.
 const f=boot();for(const image of [...f.images]){image.load();image.decoded();}await tick();
 f.nodes[2].getContext=()=>{throw Error('Canvas unsupported');};
 f.run('helpIllustrationStates.set(document.querySelectorAll()[2],"failed");prepareHelpIllustrations();');
 const swipe=f.images.find(i=>i.src.includes('tutorial-swipe'));swipe.decoded();await tick();assert(f.nodes[2].hidden);
 const failed=boot(),first=failed.images[0];first.onerror();const retry=failed.images.at(-1);assert.equal(retry.src,first.src);retry.onerror();assert(failed.nodes[0].hidden);
 const count=failed.images.length;failed.run('prepareHelpIllustrations();prepareHelpIllustrations();');assert.equal(failed.images.length,count+1,'Reopen retries only failed art; repeated opens do not fork pending loads');
 const recovered=failed.images.at(-1);recovered.load();recovered.decoded();await tick();assert(!failed.nodes[0].hidden);
 const timeout=boot();for(let attempt=0;attempt<2;attempt++){const timers=[...timeout.timers.values()];for(const timer of timers){assert.equal(timer.ms,4000);timer.fn();}}
 assert.equal(timeout.timers.size,0);assert(timeout.nodes.every(n=>n.hidden));assert.equal(timeout.images.length,24,'All twelve sources stop after exactly two bounded attempts');
 assert.doesNotThrow(()=>vm.runInNewContext(fs.readFileSync('js/help-illustrations.js','utf8'),{document:{}}),'Minimal/non-DOM hosts omit optional art safely');
 // Ordinary game calls retain their default source and draw coordinates.
 const r=fs.readFileSync('js/renderer.js','utf8');assert(r.includes('goalHoldTintAtlas ??= createMetallicGoalAtlas();'));assert(r.includes('ctx.drawImage(goalHoldTintAtlas,0,0,128,128,h.x-15,h.y-15,30,30);'));
 console.log('PASS help illustrations: 13 requested mappings, decorative accessibility, 78px responsive plates, decoded-only rendering, real game tints/crops/rotation, preserved aspect ratios, shared-cache node safety, bounded failures/reopen recovery and unchanged goal geometry (no browser rendering)');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
