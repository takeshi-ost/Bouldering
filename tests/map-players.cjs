const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
assert(html.includes('id="mapPlayers"'));assert(/\.map-players,\.map-players \*\s*\{\s*pointer-events:none/.test(css));
assert(/\.map-players\s*\{[^}]*position:absolute/.test(css));
assert(/\.map-opponent\s*\{\s*width:19\.2px;\s*height:25\.6px;/.test(css),'Opponents must be 80% of the 24x32 local marker');
const env=`const elements={};const document={getElementById(id){return elements[id]||={
 style:{},classList:{toggle(){}},focus(){},addEventListener(){},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
const appearances=dummyStageScores(1).map(profile=>{
 const appearance=dummyPlayerAppearance(profile.avatar);
 assert.deepEqual(dummyPlayerAppearance(profile.avatar),appearance,'Dummy appearance rerolled');
 assert(appearance.colors.length>=2 && appearance.colors.length<=8);
 assert(appearance.colors.every((color,i)=>validBodyColor(color) && (!i || color!==appearance.colors[i-1])));
 const icon=scoreAvatar(profile);
 assert.equal((icon.match(/<rect x="0"/g)||[]).length,appearance.colors.length);
 for(const color of appearance.colors)assert(icon.includes('fill="'+color+'"'));
 return appearance;
});
assert(new Set(appearances.map(a=>a.colors.length)).size>1,'Stripe counts need visual variety');
assert(new Set(appearances.map(a=>JSON.stringify(a.colors))).size>1,'Stripe colors need visual variety');
const physics=JSON.stringify({holds,route,body,grips,stageProgress,stageRecords});
for(const mode of ['existing','prototype'])for(const page of [0,1,49]) {
 courseMode=mode;mapPage=page;const {first,last}=mapBounds();
 const roster=currentMapPlayers(first,last,mode);
 assert.deepEqual(currentMapPlayers(first,last,mode),roster,'Roster rerolled');
 assert.equal(new Set(roster.map(p=>p.id)).size,roster.length);
 const placements=layoutMapPlayers(roster);
 const counts=new Map();
 for(let i=0;i<placements.length;i++) {
  const p=placements[i];counts.set(p.reachedLevel,(counts.get(p.reachedLevel)||0)+1);
  assert(p.reachedLevel>=first && p.reachedLevel<=last);
  assert.equal(p.depth,mapPlayerDepth(p.y));
  if(i)assert(placements[i-1].y<=p.y && placements[i-1].depth<=p.depth);
  assert.equal(scoreAvatar(p),scoreAvatar(dummyStageScores(1).find(r=>r.avatar===p.avatar)),'Ranking icon mismatch');
 }
 assert(placements.length>0 && placements.length<=100);
 assert([...counts.values()].every(n=>n<=5));
 assert(counts.size<MAP_PAGE_SIZE,'Sparse fixture must include empty stages');
 assert(placements.length<40,'Sparse fixture should average fewer than two opponents per stage');
 renderLevelMap();const markup=ui.mapPlayers.innerHTML;
 assert.equal((markup.match(/class="map-marker map-opponent"/g)||[]).length,placements.length);
 renderLevelMap();assert.equal(ui.mapPlayers.innerHTML,markup);
}
mapPage=0;courseMode='existing';
const fixtures=Array.from({length:12},(_,i)=>({id:'p'+i,name:'Player '+i,avatar:i,reachedLevel:6}));
fixtures.splice(1,0,{...fixtures[0]});
fixtures.push({id:'self',reachedLevel:6,isPlayer:true},{id:'past',reachedLevel:0},
 {id:'future',reachedLevel:21},{id:'invalid',reachedLevel:NaN});
for(const width of [320,390,768]) {
 ui.mapTrack.clientWidth=width;const placed=layoutMapPlayers(fixtures);
 assert.equal(placed.length,5);assert.equal(new Set(placed.map(p=>p.id)).size,5);
 assert(placed.every(p=>p.x>=12 && p.x<=width-12));
 for(const p of placed) {
  positionMapMarker({x:50,y:p.y-13});assert(Number(ui.mapMarker.style.zIndex)<p.depth);
  positionMapMarker({x:50,y:p.y-11});assert(Number(ui.mapMarker.style.zIndex)>p.depth);
 }
}
// Names/IDs use the same escaping as rankings, and never become interactive targets.
const originalSource=currentMapPlayers;
currentMapPlayers=()=>[{id:'\"<x>',name:'<img onerror=bad>',avatar:1,reachedLevel:6}];
renderMapPlayers();assert(!ui.mapPlayers.innerHTML.includes('<img onerror'));
assert(ui.mapPlayers.innerHTML.includes('&lt;img onerror=bad&gt;'));
assert(!ui.mapPlayers.innerHTML.includes('data-level='));currentMapPlayers=originalSource;
assert.equal(JSON.stringify({holds,route,body,grips,stageProgress,stageRecords}),physics);
// Moving the local icon updates depth every animation frame, not just on rerender.
state='map';mapPreparing=false;mapTransition={from:6,to:7,start:null};
advanceLevelMap(0);advanceLevelMap(325);
assert.equal(Number(ui.mapMarker.style.zIndex),mapPlayerDepth(parseFloat(ui.mapMarker.style.top)));
assert(mapTransition,'Halfway hop should still be in progress');
console.log('PASS map players: seeded ranking avatars, pages/courses, five-per-stage cap, deduplication, responsive bounds, y-ordered DOM/z-index including live hops, escaping, no game/progress changes');
`)(assert);
