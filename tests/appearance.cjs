const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
const env=`
const elements={};const document={getElementById(id){return elements[id] ||= {
 style:{setProperty(k,v){this[k]=v;}},classList:{toggle(){}},focus(){this.focused=true;},setAttribute(){},addEventListener(){},contains(){return true;},
 getContext(){return new Proxy({},{get(o,k){return o[k]||function(){};}});},
 getBoundingClientRect(){return {left:0,top:0,width:400,height:700};}
};}};const window={addEventListener(){},devicePixelRatio:1};function requestAnimationFrame(){}
`;
const data={},storage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
try {
new Function('assert','storage','data',env+source+`
assert.equal(state,'choosing');assert.deepEqual(playerColors,['#39785b']);
const physics=JSON.stringify({body,holds,grips,route});
ui.editCharacter.onclick();assert.equal(state,'editing');assert(!ui.characterEditor.hidden && ui.courseMenu.hidden);
assert(ui.editorPalette.hidden);assert.equal(ui.stripeCount.value,'1');
for(const n of [0,-1,9,1.5,NaN])assert.equal(resizeEditorStripes(n),false);
for(let n=1;n<=8;n++) {
 ui.stripeCount.value=String(n);ui.stripeCount.oninput();
 const bands=[...ui.editorPreview.innerHTML.matchAll(/<rect data-stripe="(\\d+)"[^>]*y="([^"]+)"[^>]*height="([^"]+)"/g)];
 assert.equal(bands.length,n);assert.equal(ui.stripeCountValue.textContent,String(n));
 assert(Math.abs(bands.reduce((sum,m)=>sum+Number(m[3]),0)-TORSO.height)<1e-8);
 assert(!/NaN|Infinity/.test(ui.editorPreview.innerHTML));
 assert.equal(Number(bands[0][2]),-TORSO.height/2);
}
assert.deepEqual(playerColors,['#39785b']);
ui.editorPreview.onclick({target:{closest(){return {dataset:{stripe:'3'}};}}});
assert.equal(selectedStripe,3);assert(!ui.editorPalette.hidden);
assert.equal((ui.paletteSwatches.innerHTML.match(/data-color=/g)||[]).length,16);
ui.customColor.value='#1234AB';ui.customColor.oninput();assert.equal(draftColors[3],'#1234ab');
ui.paletteSwatches.onclick({target:{closest(){return {dataset:{color:'#df865a'}};}}});assert.equal(draftColors[3],'#df865a');
assert.equal(paintEditorStripe('red'),false);assert.equal(paintEditorStripe('#000000;bad'),false);
assert.equal(selectEditorStripe(8),false);
resizeEditorStripes(1);assert.equal(selectedStripe,0);resizeEditorStripes(8);assert.equal(draftColors[3],'#df865a');
let prevented=false;ui.editorPreview.onkeydown({key:'Enter',preventDefault(){prevented=true;},target:{closest(){return {dataset:{stripe:'4'}};}}});
assert(prevented && ui.customColor.focused);assert.equal(selectedStripe,4);
assert.equal(JSON.stringify({body,holds,grips,route}),physics,'Editor must not change game geometry');
ui.editorCancel.onclick();assert.equal(state,'choosing');assert(ui.characterEditor.hidden);assert.deepEqual(playerColors,['#39785b']);assert.equal(data[APPEARANCE_KEY],undefined);
// Confirm creates precisely the chosen three-color palette, not hidden draft slots.
showCharacterEditor();resizeEditorStripes(3);
const chosen=['#112233','#abcdef','#f0a040'];chosen.forEach((c,i)=>{selectEditorStripe(i);paintEditorStripe(c);});
let paints=[];ctx.fillRect=(x,y,w,h)=>paints.push({x,y,w,h,color:ctx.fillStyle});draw(0);assert.equal(paints.length,0,'Editor must not run the game renderer');
ui.editorConfirm.onclick();assert.equal(state,'choosing');assert(ui.characterEditor.hidden);assert.deepEqual(playerColors,chosen);
assert.deepEqual(JSON.parse(data[APPEARANCE_KEY]),{colors:chosen});assert.deepEqual(readAppearance(),chosen);
showCharacterEditor();assert.equal(draftStripeCount,3);selectEditorStripe(0);paintEditorStripe('#000000');ui.editorCancel.onclick();assert.deepEqual(playerColors,chosen);
startCourse('existing');assert(ui.mapMarker.style['--body-stripes'].includes('#112233 0%'));
assert(ui.mapMarker.style['--body-stripes'].includes('#abcdef'));assert(ui.mapMarker.style['--body-stripes'].includes('#f0a040'));
assert.equal(showCharacterEditor(),false,'Editor may only open from the start screen');
assert(selectStage(1));cameraIntro=null;
paints=[];draw(0);chosen.forEach(c=>assert(paints.some(p=>p.color===c && p.w===TORSO.width && Math.abs(p.h-TORSO.height/3)<1e-8)));
const savedPhysics=JSON.stringify({body,grips,route,stamina,moveCount});
paints=[];drawBodyFill(10,20,40,72,true);assert.equal(paints.length,3);assert(paints.every((p,i)=>p.color!==chosen[i]));
assert.equal(JSON.stringify({body,grips,route,stamina,moveCount}),savedPhysics);
paints=[];drawBodyFill(10,20,40,72);assert.deepEqual(paints.map(p=>p.color),chosen);
assert.equal(paints[0].y,20);assert.equal(paints.at(-1).y+paints.at(-1).h,92);
showCourseMenu();showCharacterEditor();resizeEditorStripes(8);ui.editorConfirm.onclick();assert.equal(playerColors.length,8);
showCharacterEditor();resizeEditorStripes(1);selectEditorStripe(0);paintEditorStripe('#ffffff');ui.editorConfirm.onclick();assert.deepEqual(playerColors,['#ffffff']);
// Legacy/malformed saves and blocked storage cannot corrupt rendering or stop play.
const saved=data[APPEARANCE_KEY];
for(const value of ['{bad','null',JSON.stringify({colors:[]}),JSON.stringify({colors:Array(9).fill('#ffffff')}),JSON.stringify({colors:['#ffffff','invalid']}),JSON.stringify({colors:['<script>']})]) {
 data[APPEARANCE_KEY]=value;assert.deepEqual(readAppearance(),['#39785b']);
}
data[APPEARANCE_KEY]=JSON.stringify({colors:['#ABCDEF']});assert.deepEqual(readAppearance(),['#abcdef']);data[APPEARANCE_KEY]=saved;
const get=storage.getItem;storage.getItem=()=>{throw Error('blocked');};assert.deepEqual(readAppearance(),['#39785b']);storage.getItem=get;
const set=storage.setItem;storage.setItem=()=>{throw Error('full');};
showCharacterEditor();selectEditorStripe(0);paintEditorStripe('#123456');assert(confirmCharacterEditor());assert.deepEqual(playerColors,['#123456']);assert(!ui.appearanceStatus.hidden);storage.setItem=set;
assert.equal(data[APPEARANCE_KEY],saved);
`)(assert,storage,data);
new Function('assert',env+source+`
assert.deepEqual(playerColors,['#ffffff']);ui.editCharacter.onclick();assert.equal(draftStripeCount,1);
assert(ui.editorPreview.innerHTML.includes('fill="#ffffff"'));
ui.editorCancel.onclick();startCourse('prototype');assert(ui.mapMarker.style['--body-stripes'].includes('#ffffff'));
`)(assert);
console.log('PASS character editor: start-only entry, 1-8 equal stripes, mouse/keyboard palette and custom colors, hidden slot retention, draft/cancel/confirm, game and map fills, press feedback, reload, malformed/blocked storage, unchanged physics');
} finally {
 if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);
 else delete globalThis.localStorage;
}
