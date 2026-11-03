const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
assert(html.includes('id="mapPlayers"'));assert(/\.map-players,\.map-players \*\s*\{\s*pointer-events:none/.test(css));
assert(/\.map-players\s*\{[^}]*position:absolute/.test(css));
assert(/\.map-opponent\s*\{\s*width:19\.2px;\s*height:25\.6px;/.test(css),'Opponents must be 80% of the 24x32 local marker');
const env=`const timers=[];function setTimeout(fn,ms){timers.push({fn,ms,canceled:false});return timers.length;}function clearTimeout(id){timers[id-1].canceled=true;}const elements={};const document={getElementById(id){return elements[id]||={
 style:{},events:{},classList:{toggle(){}},focus(){},addEventListener(k,fn){this.events[k]=fn;},setAttribute(){},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}})},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={events:{},addEventListener(k,fn){(this.events[k]||=[]).push(fn);},devicePixelRatio:1};function requestAnimationFrame(){};`;
new Function('assert',env+source+`
const appearances=Array.from({length:12},(_,i)=>({colors:[EDITOR_COLORS[i],EDITOR_COLORS[(i+3)%EDITOR_COLORS.length]],headColor:DEFAULT_HEAD_COLOR}));
for(const appearance of appearances) {
 const icon=scoreAvatar({appearance});
 for(const color of appearance.colors)assert(icon.includes('fill="'+color+'"'));
}
const physics=JSON.stringify({holds,route,body,grips,stageProgress,stageRecords});
assert.deepEqual(currentMapPlayers(1,20,'existing'),[],'Offline map must not invent opponents');
online.ready=true;online.uid='self';
for(const mode of ['existing'])for(const page of [0,1,49]) {
 courseMode=mode;mapPage=page;const {first,last}=mapBounds();
 const testPlayers=Array.from({length:21},(_,i)=>({id:mode+'-'+page+'-'+i,name:'Player '+i,
  appearance:appearances[i%appearances.length],reachedLevel:first+Math.floor(i/3)*2,isPlayer:false}));
 online.pages.set(mode+':'+first+':'+last,{players:testPlayers,at:Date.now(),pending:false});
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
  for(const color of p.appearance.colors)assert(scoreAvatar(p).includes(color),'Use the real profile colors');
 }
 assert(placements.length>0 && placements.length<=100);
 assert([...counts.values()].every(n=>n<=5));
 assert(counts.size<MAP_PAGE_SIZE,'Test roster includes empty stages');
 assert(placements.length<40,'Test roster should average fewer than two opponents per stage');
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
// Names/IDs are escaped and cannot become stage-selection targets.
const originalSource=currentMapPlayers;
currentMapPlayers=()=>[{id:'\"<x>',name:'<img onerror=bad>',avatar:1,reachedLevel:6}];
renderMapPlayers();assert(!ui.mapPlayers.innerHTML.includes('<img onerror'));
assert(ui.mapPlayers.innerHTML.includes('&lt;img onerror=bad&gt;'));
assert(!ui.mapPlayers.innerHTML.includes('data-level='));
assert(!ui.mapPlayers.innerHTML.includes('tabindex='),'Pointer-only player names need no tab stops');
currentMapPlayers=originalSource;
assert.equal(JSON.stringify({holds,route,body,grips,stageProgress,stageRecords}),physics);
// Names stay visible for two seconds after release; new holds cancel the old timer.
state='map';settingsOpen=false;mapPreparing=false;
let visible=false;const icon={classList:{toggle(name,value){assert.equal(name,'is-name-visible');visible=value;}}};
const press={target:{closest:()=>icon},pointerId:7,clientX:20,clientY:30,button:0};
const hold=()=>ui.mapPlayers.events.pointerdown(press);
hold();assert(visible);window.events.pointerup[0]({pointerId:8});assert(visible);
window.events.pointerup[0]({pointerId:7});assert(visible);assert.equal(timers.at(-1).ms,2000);
window.events.pointermove[0]({pointerId:7,clientX:100,clientY:100});assert(visible);
timers.at(-1).fn();assert(!visible);
hold();window.events.pointerup[0]({pointerId:7});const oldTimer=timers.at(-1);hold();assert(oldTimer.canceled && visible);
hold();window.events.pointermove[0]({pointerId:7,clientX:22,clientY:32});assert(visible);
window.events.pointermove[0]({pointerId:7,clientX:20,clientY:50});assert(!visible);
hold();window.events.pointercancel[0]({});assert(!visible);
hold();ui.mapScroll.events.scroll();assert(!visible);
hold();const heldMarkup=ui.mapPlayers.innerHTML;
renderMapPlayers();assert(visible);assert(mapPlayersRefreshPending);
assert.equal(ui.mapPlayers.innerHTML,heldMarkup,'Async refresh must not replace the pressed DOM');
window.events.pointerup[0]({pointerId:7});const releaseTimer=timers.at(-1);
renderMapPlayers();renderMapPlayers();assert(visible);
assert.equal(timers.at(-1),releaseTimer,'Refresh must not shorten or restart the two-second timer');
releaseTimer.fn();assert(!visible);assert(!mapPlayersRefreshPending);
// A second tap while a refresh is pending must retain the new event target.
hold();renderMapPlayers();window.events.pointerup[0]({pointerId:7});const previousTimer=timers.at(-1);
hold();assert(previousTimer.canceled && visible && mapPlayersRefreshPending);
window.events.pointerup[0]({pointerId:7});assert.equal(timers.at(-1).ms,2000);
timers.at(-1).fn();assert(!visible && !mapPlayersRefreshPending);
// Explicit page/layout changes still dismiss a name and apply any queued refresh.
hold();renderMapPlayers();renderLevelMap();assert(!visible && !mapPlayersRefreshPending);
for(const event of ['keydown','keyup','focusout'])assert.equal(ui.mapPlayers.events[event],undefined);
hold();window.events.blur.forEach(fn=>fn());assert(!visible);
settingsOpen=true;hold();assert(!visible);settingsOpen=false;
mapPreparing=true;hold();assert(!visible);mapPreparing=false;
state='playing';hold();assert(!visible);state='map';
ui.mapPlayers.events.pointerdown({...press,button:2});assert(!visible);
ui.mapPlayers.events.pointerdown({...press,target:{}});assert(!visible);

// Pointer switching keeps both original nodes attached until the latest name expires.
let domNodes=[],domMarkup='',domWrites=0;
const makeNode=id=>{
 const node={dataset:{player:id},visible:false,closest(){return this;},
  focus(){assert.fail('Map names must not move DOM focus');}};
 node.classList={toggle(name,value){assert.equal(name,'is-name-visible');node.visible=value;}};
 return node;
};
Object.defineProperty(ui.mapPlayers,'innerHTML',{configurable:true,get(){return domMarkup;},set(value){
 domWrites++;domMarkup=value;domNodes=[makeNode('pointer-a'),makeNode('pointer-b')];
}});
ui.mapPlayers.contains=node=>domNodes.includes(node);
ui.mapPlayers.querySelectorAll=()=>domNodes;
renderMapPlayers();let [a,b]=domNodes;
const outside={};document.activeElement=outside;
const pointer=node=>({...press,target:node});
const beforeSwitch=domWrites;
ui.mapPlayers.events.pointerdown(pointer(a));renderMapPlayers();
assert.equal(domWrites,beforeSwitch);assert.equal(domNodes[0],a);assert(a.visible);
window.events.pointerup[0]({pointerId:7});const firstExpiry=timers.at(-1);
ui.mapPlayers.events.pointerdown(pointer(b));
assert(firstExpiry.canceled && !a.visible && b.visible && mapPlayerNameHold.element===b);
assert.equal(domNodes[1],b);assert.equal(domWrites,beforeSwitch);
window.events.pointerup[0]({pointerId:7});const secondExpiry=timers.at(-1);
assert.equal(secondExpiry.ms,2000);renderMapPlayers();assert.equal(timers.at(-1),secondExpiry);
assert.equal(domWrites,beforeSwitch);assert(b.visible);
secondExpiry.fn();assert(!b.visible && !mapPlayerNameHold && !mapPlayersRefreshPending);
assert.equal(domWrites,beforeSwitch+1,'Queued online updates flush once after the latest name expires');
assert.notEqual(domNodes[0],a);assert.notEqual(domNodes[1],b);
assert.equal(document.activeElement,outside,'Pointer names leave unrelated controls alone');
// Gesture interruption applies queued updates without leaving detached names or timers.
for(const dismiss of [()=>ui.mapScroll.events.scroll(),()=>window.events.pointercancel[0]({}),
 ()=>window.events.blur.forEach(fn=>fn()),
 ()=>window.events.pointermove[0]({pointerId:7,clientX:50,clientY:30})]) {
 const node=domNodes[0],before=domWrites;
 ui.mapPlayers.events.pointerdown(pointer(node));renderMapPlayers();assert(node.visible);
 dismiss();assert(!node.visible && !mapPlayerNameHold && !mapPlayersRefreshPending);
 assert.equal(mapPlayerNameTimer,null);assert.equal(domWrites,before+1);
}

// Moving the local icon updates depth every animation frame, not just on rerender.
state='map';mapPreparing=false;mapTransition={from:6,to:7,start:null};
advanceLevelMap(0);advanceLevelMap(325);
assert.equal(Number(ui.mapMarker.style.zIndex),mapPlayerDepth(parseFloat(ui.mapMarker.style.top)));
assert(mapTransition,'Halfway hop should still be in progress');
console.log('PASS map players: real profile avatars, pages/courses, five-per-stage cap, deduplication, responsive bounds, y-ordered DOM/z-index including live hops, escaping, no game/progress changes');
`)(assert);
