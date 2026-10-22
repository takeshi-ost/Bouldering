const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{},classList:{toggle(){}},focus(){},events:{},setAttribute(){},addEventListener(k,fn){this.events[k]=fn;},
 showModal(){this.open=true;},close(){this.open=false;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
new Function('assert','fs','path','root',env+source+`
const expected=['spring','summer','autumn','winter','spring','summer'];
const trail=JSON.stringify(MAP_TRAIL),positions=[];
stageProgress.existing.cleared=120;
for(let page=0;page<expected.length;page++) {
 const first=page*20+1,last=first+19;
 for(const level of [first,last]) {
  showLevelMap({target:level});assert.equal(mapPage,page);
  assert.equal(mapBackground().season,expected[page]);
  assert(ui.mapScenery.innerHTML.includes('href="'+mapBackgroundSource()+'"'));
  assert(fs.existsSync(path.join(root,mapBackground().src)));
 }
 const coords=Array.from({length:20},(_,i)=>mapPoint(first+i));
 if(!page)positions.push(...coords);else assert.deepEqual(coords,positions);
 assert.equal(JSON.stringify(MAP_TRAIL),trail);
}
// Completion hops switch when entering stage 21/41/61/81, and retain one marker.
for(const [cleared,season] of [[20,'summer'],[40,'autumn'],[60,'winter'],[80,'spring']]) {
 stageProgress.existing.cleared=cleared;showLevelMap({advanceFrom:cleared});
 assert.equal(mapBackground().season,season);
 assert.deepEqual([mapTransition.from,mapTransition.to],[cleared,cleared+1]);
 assert.equal(ui.mapMarker.hidden,false);
 advanceLevelMap(0);advanceLevelMap(MAP_HOP_DURATION);closeStageStart();
 assert.equal(mapSelected,cleared+1);
 ui.mapPrev.onclick();assert.equal(mapBackground().season,expected[cleared/20-1]);
 ui.mapNext.onclick();assert.equal(mapBackground().season,season);
}
// Reload/title preparation derives the season from saved progress, not a new counter.
stageProgress.existing.cleared=60;showTitleScreen();
assert.equal(mapPage,3);assert.equal(mapBackground().season,'winter');
stageProgress.prototype.cleared=40;courseMode='prototype';showLevelMap();
assert.equal(mapBackground().season,'autumn');
`)(assert,fs,path,root);
console.log('PASS seasons: page ranges, 20/40/60/80 hops, winter-to-spring wrap, back/forward, restored progress, unchanged icon positions and prototype isolation');
