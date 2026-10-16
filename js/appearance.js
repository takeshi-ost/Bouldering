"use strict";
const APPEARANCE_KEY='ascent.appearance.v1';
const DEFAULT_BODY_COLOR='#39785b';
const EDITOR_COLORS=[DEFAULT_BODY_COLOR,'#213e37','#8ba68c','#f4eee0','#d1ad53','#df865a','#bb555b','#814766',
    '#263849','#537fa2','#8bbdcc','#776b9b','#4d4544','#aca394','#ffffff','#222222'];
function validBodyColor(value) { return typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value); }
const DEFAULT_HEAD_COLOR='#e0b99b';
function readAppearance() {
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(APPEARANCE_KEY)||'null');
        const colors=saved?.colors;
        if(Array.isArray(colors) && colors.length>=1 && colors.length<=8 && colors.every(validBodyColor))
            return {colors:colors.map(c=>c.toLowerCase()),
                headColor:validBodyColor(saved.headColor)?saved.headColor.toLowerCase():DEFAULT_HEAD_COLOR};
    } catch(_) { /* Invalid or unavailable storage starts a new appearance. */ }
    return null;
}
function saveAppearance(appearance) {
    try {
        if(globalThis.localStorage) {
            globalThis.localStorage.setItem(APPEARANCE_KEY,JSON.stringify(appearance));return true;
        }
    } catch(_) { /* Apply for this session even if persistence is unavailable. */ }
    return false;
}
function randomAppearance(random=Math.random) {
    const count=1+Math.floor(random()*8),colors=[];
    for(let i=0;i<count;i++) {
        let index=Math.floor(random()*EDITOR_COLORS.length);
        if(EDITOR_COLORS[index]===colors.at(-1))index=(index+1)%EDITOR_COLORS.length;
        colors.push(EDITOR_COLORS[index]);
    }
    return {colors,headColor:EDITOR_COLORS[Math.floor(random()*EDITOR_COLORS.length)]};
}
let initialAppearance=readAppearance();
if(!initialAppearance) {initialAppearance=randomAppearance();saveAppearance(initialAppearance);}
let playerColors=initialAppearance.colors;
let playerHeadColor=initialAppearance.headColor;
let draftHeadColor=playerHeadColor;
let selectedPart=null;
let draftColors=[];
let draftStripeCount=1;
let selectedStripe=null;
function bodyStripeGradient(colors=playerColors) {
    return `linear-gradient(to bottom,${colors.map((c,i)=>`${c} ${i*100/colors.length}% ${(i+1)*100/colors.length}%`).join(',')})`;
}
function updateMapAppearance() {
    ui.mapMarker.style.setProperty?.('--body-stripes',bodyStripeGradient());
    ui.mapMarker.style.setProperty?.('--head-color',playerHeadColor);
}
function previewLimb(i) {
    const root=limbRoot({x:0,y:0},i),side=i%2?-1:1;
    const tip=i<2 ? {x:-side*52,y:55} : {x:-side*44,y:138};
    const joint=limbJoint(root,tip,i);
    return `<path d="M${root.x} ${root.y} L${joint.x} ${joint.y} L${tip.x} ${tip.y}" fill="none" stroke="#435c50" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${joint.x}" cy="${joint.y}" r="3.5" fill="#f3f0e7"/><circle cx="${tip.x}" cy="${tip.y}" r="4" fill="#2f5d46"/>`;
}
function renderCharacterEditor() {
    const w=TORSO.width,h=TORSO.height;
    const bands=draftColors.slice(0,draftStripeCount).map((color,i)=>{
        const selected=selectedPart==='body' && i===selectedStripe;
        return `<rect data-stripe="${i}" x="${-w/2}" y="${-h/2+h*i/draftStripeCount}" width="${w}" height="${h/draftStripeCount}" fill="${color}" stroke="${selected?'#d4a63d':'#fff9ed'}" stroke-width="${selected?1.5:.5}" role="button" tabindex="0" aria-label="上から${i+1}番目の色 ${color}" aria-pressed="${selected}"/>`;
    }).join('');
    ui.editorPreview.innerHTML=`<g transform="translate(160 140) scale(1.5)">
        ${[0,1,2,3].map(previewLimb).join('')}
        <path d="M0 ${-h/2} V${-h/2-9}" stroke="#435c50" stroke-width="5"/>
        <circle data-part="head" cx="0" cy="${-h/2-13}" r="10" fill="${draftHeadColor}" stroke="${selectedPart==='head'?'#d4a63d':'none'}" stroke-width="1.5" role="button" tabindex="0" aria-label="頭の色 ${draftHeadColor}" aria-pressed="${selectedPart==='head'}"/>
        ${bands}<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" fill="none" stroke="#fff9ed" stroke-width="1.5" pointer-events="none"/>
        ${[-4,4].flatMap(x=>[-6,0,6].map(y=>`<circle cx="${x}" cy="${y}" r="1.3" fill="#d9e9db" pointer-events="none"/>`)).join('')}
        </g>`;
    ui.stripeCount.value=String(draftStripeCount);
    ui.stripeCountValue.textContent=String(draftStripeCount);
    ui.bodyStripeControls.hidden=selectedPart==='head';
    ui.editorPalette.hidden=selectedPart===null;
    if(selectedPart!==null) {
        const color=selectedPart==='head'?draftHeadColor:draftColors[selectedStripe];
        ui.selectedStripeLabel.textContent=selectedPart==='head'?'頭の色（単色）':`上から${selectedStripe+1}番目の色`;
        ui.customColor.value=color;
        ui.paletteSwatches.innerHTML=EDITOR_COLORS.map(c=>`<button type="button" data-color="${c}" style="background:${c}" aria-label="色 ${c}" aria-pressed="${c===color}"></button>`).join('');
    }
}
function showCharacterEditor() {
    if(state!=='choosing')return false;
    draftColors=[...playerColors];draftHeadColor=playerHeadColor;draftStripeCount=playerColors.length;selectedStripe=null;selectedPart=null;
    state='editing';ui.courseMenu.hidden=true;ui.characterEditor.hidden=false;
    ui.appearanceStatus.hidden=true;
    ui.level.textContent='キャラエディット';
    renderCharacterEditor();ui.stripeCount.focus();
    return true;
}
function resizeEditorStripes(n) {
    if(state!=='editing' || !Number.isInteger(n) || n<1 || n>8)return false;
    while(draftColors.length<n)draftColors.push(draftColors.at(-1));
    draftStripeCount=n;
    if(selectedStripe!==null)selectedStripe=Math.min(selectedStripe,n-1);
    renderCharacterEditor();return true;
}
function selectEditorStripe(n) {
    if(state!=='editing' || !Number.isInteger(n) || n<0 || n>=draftStripeCount)return false;
    selectedPart='body';selectedStripe=n;renderCharacterEditor();return true;
}
function selectEditorHead() {
    if(state!=='editing')return false;
    selectedPart='head';selectedStripe=null;renderCharacterEditor();return true;
}
function paintEditorColor(color) {
    if(state!=='editing' || selectedPart===null || !validBodyColor(color))return false;
    if(selectedPart==='head')draftHeadColor=color.toLowerCase();
    else draftColors[selectedStripe]=color.toLowerCase();
    renderCharacterEditor();return true;
}
function confirmCharacterEditor() {
    if(state!=='editing')return false;
    playerColors=draftColors.slice(0,draftStripeCount);
    playerHeadColor=draftHeadColor;
    const saved=saveAppearance({colors:playerColors,headColor:playerHeadColor});
    updateMapAppearance();showCourseMenu();ui.editCharacter.focus();
    ui.appearanceStatus.textContent=saved?'配色を保存しました。':'配色を適用しました。この端末への保存はできませんでした。';
    ui.appearanceStatus.hidden=false;
    return true;
}
ui.editCharacter.onclick=showCharacterEditor;
ui.stripeCount.oninput=()=>resizeEditorStripes(Number(ui.stripeCount.value));
ui.editorPreview.onclick=e=>{
    const band=e.target.closest('[data-stripe], [data-part="head"]');
    if(band && ui.editorPreview.contains(band)) {
        if(band.dataset.part==='head')selectEditorHead();else selectEditorStripe(Number(band.dataset.stripe));
    }
};
ui.editorPreview.onkeydown=e=>{
    if(e.key!=='Enter' && e.key!==' ')return;
    const band=e.target.closest('[data-stripe], [data-part="head"]');
    if(band && ui.editorPreview.contains(band)) {
        e.preventDefault();
        if(band.dataset.part==='head')selectEditorHead();else selectEditorStripe(Number(band.dataset.stripe));
        ui.customColor.focus();
    }
};
ui.paletteSwatches.onclick=e=>{
    const swatch=e.target.closest('button[data-color]');
    if(swatch && ui.paletteSwatches.contains(swatch))paintEditorColor(swatch.dataset.color);
};
ui.customColor.oninput=()=>paintEditorColor(ui.customColor.value);
ui.editorConfirm.onclick=confirmCharacterEditor;
ui.editorCancel.onclick=()=>{
    if(state==='editing'){showCourseMenu();ui.editCharacter.focus();}
};
