const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{setProperty(k,v){this[k]=v;}},classList:{toggle(){}},focus(){this.focused=true;},setAttribute(){},events:{},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;},contains(){return true;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try {
new Function('assert','storage','data',env+source+`
assert.equal(state,'choosing');
const firstAppearance={colors:[...playerColors],headColor:playerHeadColor};
assert(playerColors.length>=1 && playerColors.length<=8 && playerColors.every(validBodyColor));assert(validBodyColor(playerHeadColor));
assert.deepEqual(JSON.parse(data[APPEARANCE_KEY]),firstAppearance);assert.deepEqual(readAppearance(),firstAppearance);
for(let n=1;n<=8;n++) {
 let draws=0;const a=randomAppearance(()=>draws++===0?(n-.5)/8:.1);
 assert.equal(a.colors.length,n);assert(a.colors.every(validBodyColor) && validBodyColor(a.headColor));
 assert(a.colors.every((c,i)=>!i || c!==a.colors[i-1]));
}
// A deterministic legacy palette keeps the remaining editor checks reproducible.
playerColors=['#39785b'];playerHeadColor=DEFAULT_HEAD_COLOR;
data[APPEARANCE_KEY]=JSON.stringify({colors:playerColors,headColor:playerHeadColor});
const originalSave=data[APPEARANCE_KEY];
const physics=JSON.stringify({body,holds,grips,route});
startCourse('existing');showCharacterEditor();assert.equal(state,'editing');assert(!ui.characterEditor.hidden && ui.titleScreen.hidden);
assert(ui.editorPalette.hidden);assert.equal(ui.stripeCount.value,'1');
const unchangedName=ui.playerName.value;
for(let n=1;n<=8;n++) {
 let draws=0;assert(randomizeEditorAppearance(()=>draws++===0?(n-.5)/8:.1));
 assert.equal(draftStripeCount,n);assert(draftColors.every(validBodyColor));assert(validBodyColor(draftHeadColor));
 assert(ui.editorPalette.hidden && !ui.editorPalette.open);assert.equal(ui.playerName.value,unchangedName);
 assert.deepEqual(playerColors,['#39785b']);assert.equal(data[APPEARANCE_KEY],originalSave);
}
let prior=JSON.stringify({colors:draftColors,headColor:draftHeadColor});ui.editorRandom.onclick();
assert.notEqual(JSON.stringify({colors:draftColors,headColor:draftHeadColor}),prior);
randomizeEditorAppearance(()=>.3);prior=JSON.stringify({colors:draftColors,headColor:draftHeadColor});
randomizeEditorAppearance(()=>.3);assert.notEqual(JSON.stringify({colors:draftColors,headColor:draftHeadColor}),prior);
assert(draftColors.every((color,i)=>!i || color!==draftColors[i-1]));
selectEditorStripe(0);const colorBeforeCancel=draftColors[0];let canceled=false;
ui.editorPalette.events.cancel({preventDefault(){canceled=true;}});
assert(canceled && ui.editorPalette.hidden && !ui.editorPalette.open);assert.equal(draftColors[0],colorBeforeCancel);
selectEditorHead();ui.editorPalette.events.click({target:ui.editorPalette,clientX:-1,clientY:-1});
assert(ui.editorPalette.hidden && !ui.editorPalette.open);
ui.editorCancel.onclick();showCharacterEditor();assert.equal(draftStripeCount,1);

for(const n of [0,-1,9,1.5,NaN])assert.equal(resizeEditorStripes(n),false);
for(let n=1;n<=8;n++) {
 ui.stripeCount.value=String(n);ui.stripeCount.oninput();
 const bands=[...ui.editorPreview.innerHTML.matchAll(/<rect data-stripe="(\\d+)"[^>]*y="([^"]+)"[^>]*height="([^"]+)"/g)];
 assert.equal(bands.length,n);assert.equal(ui.stripeCountValue.textContent,String(n));
 assert(Math.abs(bands.reduce((sum,m)=>sum+Number(m[3]),0)-TORSO.height)<1e-8);
 assert(!/NaN|Infinity/.test(ui.editorPreview.innerHTML));
 assert.equal(Number(bands[0][2]),-TORSO.height/2);
}
assert.equal(EDITOR_POSES.length,8);assert.equal(new Set(EDITOR_POSES.map(p=>p.name)).size,8);
assert.equal(new Set(EDITOR_POSES.map(p=>JSON.stringify(p))).size,8);
for(let n=1;n<=8;n++) {
 resizeEditorStripes(n);assert(ui.editorPreview.innerHTML.includes('data-pose="'+n+'"'));
 assert.equal((ui.editorPreview.innerHTML.match(/<path d="M/g)||[]).length,9,'Two segments per limb and one neck');
 assert.equal((ui.editorPreview.innerHTML.match(/data-editor-root=/g)||[]).length,4,'Only shoulder/hip dots');
 assert(!ui.editorPreview.innerHTML.includes('#fff9ed'),'No white stripe borders');
 assert(ui.editorPreview.innerHTML.includes(PLAYER_SILHOUETTE_STYLE.color));
 for(let i=0;i<4;i++) {
  const limbIndex=ui.editorPreview.innerHTML.indexOf('data-editor-limb="'+i+'"');
  assert(limbIndex>=0 && limbIndex<ui.editorPreview.innerHTML.indexOf('data-stripe="0"'),'Every arm and leg must be behind the body in all eight poses');
 }
 const pose=EDITOR_POSES[n-1];
 for(let i=0;i<4;i++) {
  const root=editorPoseRoot(i,pose),[x,y,tx,ty]=pose.limbs[i];
  for(const p of [root,{x,y},{x:tx,y:ty}])assert(p.x*1.5+105>4 && p.x*1.5+105<206 && p.y*1.5+140>6 && p.y*1.5+140<364,'Pose clipped by preview');
 }
 selectEditorHead();paintEditorColor('#765432');assert(ui.editorPreview.innerHTML.includes('data-pose="'+n+'"'));
}
resizeEditorStripes(8);
assert.deepEqual(playerColors,['#39785b']);
ui.editorPreview.onclick({target:{closest(){return {dataset:{stripe:'3'}};}}});
assert.equal(selectedStripe,3);assert(!ui.editorPalette.hidden);
assert.equal((ui.paletteSwatches.innerHTML.match(/data-color=/g)||[]).length,16);
paintEditorColor('#1234AB');assert.equal(draftColors[3],'#1234ab');assert(ui.editorPalette.hidden && !ui.editorPalette.open);selectEditorStripe(3);
ui.paletteSwatches.onclick({target:{closest(){return {dataset:{color:'#df865a'}};}}});assert.equal(draftColors[3],'#df865a');assert(ui.editorPalette.hidden && !ui.editorPalette.open);
assert.equal(paintEditorColor('red'),false);assert.equal(paintEditorColor('#000000;bad'),false);
assert.equal(selectEditorStripe(8),false);
const bodyDraftBefore=[...draftColors];
ui.editorPreview.onclick({target:{closest(){return {dataset:{part:'head'}};}}});
assert.equal(selectedPart,'head');assert.equal(selectedStripe,null);assert(!ui.bodyStripeControls.hidden);
assert(!ui.editorPalette.hidden);
paintEditorColor('#765432');assert.equal(draftHeadColor,'#765432');assert.deepEqual(draftColors,bodyDraftBefore);selectEditorHead();
ui.paletteSwatches.onclick({target:{closest(){return {dataset:{color:'#263849'}};}}});assert.equal(draftHeadColor,'#263849');
let headKey=false;ui.editorPreview.onkeydown({key:'Enter',preventDefault(){headKey=true;},target:{closest(){return {dataset:{part:'head'}};}}});assert(headKey && selectedPart==='head' && ui.editorPalette.open);
resizeEditorStripes(2);assert.equal(draftHeadColor,'#263849');resizeEditorStripes(8);
selectEditorStripe(3);assert(!ui.bodyStripeControls.hidden);
resizeEditorStripes(1);assert.equal(selectedStripe,0);resizeEditorStripes(8);assert.equal(draftColors[3],'#df865a');
let prevented=false;ui.editorPreview.onkeydown({key:'Enter',preventDefault(){prevented=true;},target:{closest(){return {dataset:{stripe:'4'}};}}});
assert(prevented && ui.editorPalette.open);assert.equal(selectedStripe,4);
assert.equal(JSON.stringify({body,holds,grips,route}),physics,'Editor must not change game geometry');
ui.editorCancel.onclick();assert.equal(state,'map');assert(ui.characterEditor.hidden);assert.deepEqual(playerColors,['#39785b']);assert.equal(data[APPEARANCE_KEY],originalSave);assert.equal(playerHeadColor,DEFAULT_HEAD_COLOR);
// Confirm creates precisely the chosen three-color palette, not hidden draft slots.
showCharacterEditor();resizeEditorStripes(3);
const chosen=['#112233','#abcdef','#f0a040'];chosen.forEach((c,i)=>{selectEditorStripe(i);paintEditorColor(c);});
selectEditorHead();paintEditorColor('#334455');assert(ui.editorPreview.innerHTML.includes('fill="#334455"'));assert.equal(playerHeadColor,DEFAULT_HEAD_COLOR);
let paints=[];ctx.fillRect=(x,y,w,h)=>paints.push({x,y,w,h,color:ctx.fillStyle});draw(0);assert.equal(paints.length,0,'Editor must not run the game renderer');
ui.editorConfirm.onclick();assert.equal(state,'map');assert(ui.characterEditor.hidden);assert.deepEqual(playerColors,chosen);
assert.deepEqual(JSON.parse(data[APPEARANCE_KEY]),{colors:chosen,headColor:'#334455'});assert.deepEqual(readAppearance(),{colors:chosen,headColor:'#334455'});
showCharacterEditor();assert.equal(draftStripeCount,3);selectEditorStripe(0);paintEditorColor('#000000');ui.editorCancel.onclick();assert.deepEqual(playerColors,chosen);
startCourse('existing');assert(ui.mapMarker.style['--body-stripes'].includes('#112233 0%'));
assert(ui.mapMarker.style['--body-stripes'].includes('#abcdef'));assert(ui.mapMarker.style['--body-stripes'].includes('#f0a040'));assert.equal(ui.mapMarker.style['--head-color'],'#334455');
const mapReturn={page:mapPage,selected:mapSelected,scrollTop:173};ui.mapScroll.scrollTop=173;
ui.mapSettingsButton.onclick();ui.mapEditCharacter.onclick();assert.equal(state,'editing');assert(!settingsOpen && !ui.settingsDialog.open && ui.levelMap.hidden);
selectEditorStripe(0);paintEditorColor('#abcdef');ui.editorCancel.onclick();assert.equal(state,'map');assert.deepEqual(playerColors,chosen);assert.equal(ui.mapScroll.scrollTop,mapReturn.scrollTop);
assert.equal(mapPage,mapReturn.page);assert.equal(mapSelected,mapReturn.selected);
ui.mapSettingsButton.onclick();ui.mapEditCharacter.onclick();selectEditorHead();paintEditorColor('#445566');assert(confirmCharacterEditor());assert.equal(state,'map');assert.equal(playerHeadColor,'#445566');assert.equal(ui.mapMarker.style['--head-color'],'#445566');assert.equal(ui.mapScroll.scrollTop,173);
playerHeadColor='#334455';updateMapAppearance();
assert(selectStage(1));cameraIntro=null;
const fills=[];ctx.fill=()=>fills.push(ctx.fillStyle);
paints=[];draw(0);assert(fills.includes('#334455'));chosen.forEach(c=>assert(paints.some(p=>p.color===c && p.w===TORSO.width && Math.abs(p.h-TORSO.height/3)<1e-8)));
warning=1;paints=[];draw(0);chosen.forEach(c=>assert(paints.some(p=>p.color===c && p.w===TORSO.width),'Blocked movement must keep saved body colors'));warning=0;
const savedPhysics=JSON.stringify({body,grips,route,stamina,moveCount});
paints=[];drawBodyFill(10,20,40,72,true);assert.equal(paints.length,3);assert(paints.every((p,i)=>p.color!==chosen[i]));
assert.equal(JSON.stringify({body,grips,route,stamina,moveCount}),savedPhysics);
paints=[];drawBodyFill(10,20,40,72);assert.deepEqual(paints.map(p=>p.color),chosen);
assert.equal(paints[0].y,20);assert.equal(paints.at(-1).y+paints.at(-1).h,92);
startCourse('existing');showCharacterEditor();resizeEditorStripes(8);ui.editorConfirm.onclick();assert.equal(playerColors.length,8);
showCharacterEditor();resizeEditorStripes(1);selectEditorStripe(0);paintEditorColor('#ffffff');selectEditorHead();paintEditorColor('#556677');ui.editorConfirm.onclick();assert.deepEqual(playerColors,['#ffffff']);
// Legacy/malformed saves and blocked storage cannot corrupt rendering or stop play.
const saved=data[APPEARANCE_KEY];
for(const value of ['{bad','null',JSON.stringify({colors:[]}),JSON.stringify({colors:Array(9).fill('#ffffff')}),JSON.stringify({colors:['#ffffff','invalid']}),JSON.stringify({colors:['<script>']})]) {
 data[APPEARANCE_KEY]=value;assert.equal(readAppearance(),null);
}
data[APPEARANCE_KEY]=JSON.stringify({colors:['#ABCDEF']});assert.deepEqual(readAppearance(),{colors:['#abcdef'],headColor:DEFAULT_HEAD_COLOR});data[APPEARANCE_KEY]=saved;
const get=storage.getItem;storage.getItem=()=>{throw Error('blocked');};assert.equal(readAppearance(),null);storage.getItem=get;
const set=storage.setItem;storage.setItem=()=>{throw Error('full');};
showCharacterEditor();selectEditorStripe(0);paintEditorColor('#123456');assert(confirmCharacterEditor());assert.deepEqual(playerColors,['#123456']);assert(!ui.mapError.hidden);storage.setItem=set;
assert.equal(data[APPEARANCE_KEY],saved);
`)(assert,storage,data);
new Function('assert','Math',env+source+`
assert.deepEqual(playerColors,['#ffffff']);assert.equal(playerHeadColor,'#556677');startCourse('existing');showCharacterEditor();assert.equal(draftStripeCount,1);
assert(ui.editorPreview.innerHTML.includes('fill="#ffffff"'));
ui.editorCancel.onclick();startCourse('prototype');assert(ui.mapMarker.style['--body-stripes'].includes('#ffffff'));assert.equal(ui.mapMarker.style['--head-color'],'#556677');
`)(assert,Object.assign(Object.create(Math),{random(){throw Error('Saved appearance must not rerandomize');}}));
const savedAppearance=data['ascent.appearance.v1'];data['ascent.appearance.v1']=JSON.stringify({colors:['#cc1122','#334455']});
new Function('assert','Math',env+source+`assert.deepEqual(playerColors,['#cc1122','#334455']);assert.equal(playerHeadColor,'#e0b99b');`)(assert,Object.assign(Object.create(Math),{random(){throw Error('Legacy appearance must not rerandomize');}}));
data['ascent.appearance.v1']=savedAppearance;
new Function('assert','data','storage',env+source+`
assert.equal(playerName,JSON.parse(data[PLAYER_NAME_KEY]));assert.equal(nameCharacters(playerName).length,8);
startCourse('existing');showCharacterEditor();const savedName=playerName;
ui.playerName.value='  ';assert(!confirmCharacterEditor());assert(!ui.playerNameError.hidden);assert.equal(state,'editing');assert.equal(playerName,savedName);
ui.playerName.value='岳志1234567890';ui.playerName.oninput({isComposing:false});assert.equal(ui.playerName.value,'岳志12345678');
ui.playerName.value='新しい名前';ui.editorCancel.onclick();assert.equal(playerName,savedName);
showCharacterEditor();assert.equal(ui.playerName.value,savedName);
ui.playerName.value='👨‍👩‍👧‍👦'.repeat(11);ui.playerName.oninput({isComposing:true});assert.equal(nameCharacters(ui.playerName.value).length,11);
ui.playerName.oncompositionend();assert.equal(nameCharacters(ui.playerName.value).length,10);
assert(confirmCharacterEditor());assert.equal(playerName,'👨‍👩‍👧‍👦'.repeat(10));assert.equal(readPlayerName(),playerName);
showCharacterEditor();ui.playerName.value='  岳志  ';assert(confirmCharacterEditor());assert.equal(playerName,'岳志');
const old=data[PLAYER_NAME_KEY];data[PLAYER_NAME_KEY]='{bad';assert.equal(readPlayerName(),'');data[PLAYER_NAME_KEY]=old;
const set=storage.setItem;storage.setItem=()=>{throw Error('full');};showCharacterEditor();ui.playerName.value='Guest';assert(confirmCharacterEditor());assert.equal(playerName,'Guest');assert(!ui.mapError.hidden);storage.setItem=set;
assert.equal(readPlayerName(),'岳志');
`)(assert,data,storage);
new Function('assert',env+source+`assert.equal(playerName,'岳志');startCourse('existing');showCharacterEditor();assert.equal(ui.playerName.value,'岳志');`)(assert);
console.log('PASS character editor: randomized saved first run, single head color, legacy body migration, map entry and same-map return, 1-8 equal stripes, mouse/keyboard one-tap modal palette, random drafts, hidden slot retention, draft/cancel/confirm, game and map fills, press feedback, reload, malformed/blocked storage, unchanged physics');
} finally {
 if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);
 else delete globalThis.localStorage;
}
