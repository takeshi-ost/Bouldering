const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/player-icon.js'),'utf8');
new Function('assert',`
let generated=0,blocked=false,created=0;
const fills=[],surfaces=[];
const paint=new Proxy({fillRect(x,y,w,h){fills.push({color:this.fillStyle,x,y,w,h});}},
 {get(o,k){return o[k]||function(){};}});
const document={createElement(tag){
 assert.equal(tag,'canvas');created++;if(blocked)throw Error('unavailable');
 const surface={getContext:()=>paint,toDataURL(type){
  assert.equal(type,'image/png');generated++;return 'data:image/png;base64,'+(generated===1?'AQ==':'Ag==');
 }};surfaces.push(surface);return surface;
}};
let playerColors=['#112233','#abcdef'],playerHeadColor='#445566';
`+source+`
const appearance=()=>({colors:playerColors,headColor:playerHeadColor});
const first=createPlayerIcon(appearance());
assert.equal(first.mimeType,'image/png');assert.equal(first.width,96);assert.equal(first.height,128);
assert.equal(surfaces[0].width,96);assert.equal(surfaces[0].height,128);
assert.match(first.src,/^data:image\\/png;base64,/);assert(Object.isFrozen(first));
assert.deepEqual(fills.map(f=>f.color),playerColors);
for(let i=0;i<100;i++)assert.equal(createPlayerIcon(appearance()),first);
assert.equal(generated,1);assert.equal(created,1);
const map=playerIconMarkup(),life=playerIconMarkup('life-player player-icon');
assert(map.includes(first.src) && life.includes(first.src));
assert(life.includes('class="life-player player-icon"'));assert(life.includes('alt=""'));
assert.equal(generated,1);
playerHeadColor='#778899';const second=createPlayerIcon(appearance());
assert.notEqual(second.key,first.key);assert.notEqual(second.src,first.src);assert.equal(generated,2);
playerColors=['#000000'];const third=createPlayerIcon(appearance());assert.equal(generated,3);
assert.equal(createPlayerIcon({colors:['#000000'],headColor:'#778899'}),third);
for(const value of [{colors:[],headColor:'#000000'},{colors:['bad'],headColor:'#000000'},
 {colors:Array(9).fill('#ffffff'),headColor:'#000000'},{colors:['#ffffff'],headColor:'<script>'}])
 assert.throws(()=>createPlayerIcon(value),TypeError);
blocked=true;playerColors=['#ffffff'];const fallback=createPlayerIcon(appearance());
assert.equal(fallback.src,null);const attempts=created;
assert.equal(playerIconMarkup(),'');assert.equal(created,attempts,'Do not retry a failed encoder every UI update');
blocked=false;playerHeadColor='#123456';assert(createPlayerIcon(appearance()).src);
assert.equal(generated,4);
console.log('PASS player icon: transparent Canvas PNG pipeline, 4x resolution, shared map/life source, appearance-key cache, saved-color changes, validation and cached fallback');
`)(assert);

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const appSource=[...html.matchAll(/<script src="([^"?]+)(?:\?[^"\s]*)?" defer><\/script>/g)]
 .map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
new Function('assert',"const globalThis={localStorage:{data:{},getItem(k){return this.data[k]??null;},setItem(k,v){this.data[k]=v;}}};\n\nconst elements={};const document={getElementById(id){return elements[id] ||= {\n style:{setProperty(k,v){this[k]=v;}},classList:{toggle(){}},focus(){this.focused=true;},setAttribute(){},addEventListener(){},contains(){return true;},\n getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},\n getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}\n};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}\n\nlet iconEncodeCount=0;\ndocument.createElement=()=>({getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},\n toDataURL(){iconEncodeCount++;const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';\n return 'data:image/png;base64,AA'+alphabet[Math.floor(iconEncodeCount/64)%64]+alphabet[iconEncodeCount%64];}});\n"+appSource+"\nconst first=playerIconCache;assert(first.src);assert.equal(iconEncodeCount,1);\nstartCourse('existing');refreshLives();\nassert(ui.mapMarker.innerHTML.includes(first.src));\nassert.equal((ui.lifeStatus.innerHTML.match(/<img /g)||[]).length,3);\nassert(ui.lifeStatus.innerHTML.includes(first.src));\nassert(openStageStart(1));assert(ui.stageStartLives.innerHTML.includes(first.src));closeStageStart();\nconst physics=JSON.stringify({body,grips,holds,route});\nshowCharacterEditor();selectEditorHead();paintEditorColor('#123456');ui.editorCancel.onclick();\nassert.equal(playerIconCache,first);assert.equal(iconEncodeCount,1);\nshowCharacterEditor();resizeEditorStripes(3);\n['#112233','#abcdef','#ffffff'].forEach((c,i)=>{selectEditorStripe(i);paintEditorColor(c);});\nselectEditorHead();paintEditorColor('#445566');assert(confirmCharacterEditor());\nconst second=playerIconCache;assert.notEqual(second.key,first.key);assert.equal(iconEncodeCount,2);\nassert(ui.mapMarker.innerHTML.includes(second.src));assert(ui.lifeStatus.innerHTML.includes(second.src));\nfor(let i=0;i<10;i++)refreshLives();assert.equal(iconEncodeCount,2);\nassert.equal(JSON.stringify({body,grips,holds,route}),physics);\nassert.deepEqual(JSON.parse(globalThis.localStorage.getItem(APPEARANCE_KEY)),{colors:['#112233','#abcdef','#ffffff'],headColor:'#445566'});\nassert(!globalThis.localStorage.getItem('ascent.player-icon'),'PNG is derived, not duplicated in persistent storage');\n")(assert);
console.log('PASS player icon integration: startup/save/cancel, shared PNG in map and life, no redundant encodes, persisted appearance and unchanged game geometry');
