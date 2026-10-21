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
const PLAYER_NAME_KEY='ascent.player-name.v1';
function nameCharacters(value) {
    return Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value),part=>part.segment);
}
function normalizedPlayerName(value) {
    return typeof value==='string' ? nameCharacters(value.replace(/[\u0000-\u001f\u007f]/g,'').trim()).slice(0,10).join('') : '';
}
function randomPlayerName() {
    const letters='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({length:8},()=>letters[Math.floor(Math.random()*letters.length)]).join('');
}
function readPlayerName() {
    try {return normalizedPlayerName(JSON.parse(globalThis.localStorage?.getItem(PLAYER_NAME_KEY)||'null'));}
    catch(_) {return '';}
}
function savePlayerName(name) {
    try {if(globalThis.localStorage){globalThis.localStorage.setItem(PLAYER_NAME_KEY,JSON.stringify(name));return true;}}
    catch(_) { /* Keep the name in memory when storage is unavailable. */ }
    return false;
}
let playerName=readPlayerName();
if(!playerName){playerName=randomPlayerName();savePlayerName(playerName);}
function limitPlayerNameInput() {
    ui.playerName.value=nameCharacters(ui.playerName.value).slice(0,10).join('');
    ui.playerNameError.hidden=true;
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
    const markup=playerIconMarkup() || '<i></i><b></b>';
    if(ui.mapMarker.innerHTML!==markup)ui.mapMarker.innerHTML=markup;
    ui.mapMarker.style.setProperty?.('--body-stripes',bodyStripeGradient());
    ui.mapMarker.style.setProperty?.('--head-color',playerHeadColor);
}
// Editor-only fashion poses, inspired by the reference sheet; gameplay IK is unchanged.
// Each limb stores [elbow/knee x, y, hand/foot x, y] in preview coordinates.
const EDITOR_POSES=[
    {name:'自然に立つ',tilt:0,limbs:[[-30,10,-30,60],[30,10,30,60],[-23,85,-32,136],[23,85,32,136]]},
    {name:'片足に重心をかける',tilt:-7,limbs:[[-27,10,-20,61],[27,12,29,62],[-37,80,-20,135],[29,80,14,135]]},
    {name:'腰に手を当てる',tilt:6,limbs:[[-59,-5,-20,22],[35,14,30,64],[-25,83,-30,136],[27,86,38,136]]},
    {name:'前で手を組む',tilt:0,limbs:[[-43,3,-4,26],[44,4,4,26],[-27,87,-44,136],[20,86,19,136]]},
    {name:'頭に手を添える',tilt:10,limbs:[[-48,-18,-4,-53],[45,11,35,60],[-13,83,-18,134],[36,80,23,135]]},
    {name:'脚を交差して立つ',tilt:-4,limbs:[[-36,6,-10,22],[36,5,10,22],[-9,87,18,136],[34,84,-3,136]]},
    {name:'腕を組む',tilt:0,limbs:[[-37,6,19,-14],[37,7,-19,-9],[-23,86,-32,136],[23,86,35,136]]},
    {name:'脚を広げて胸に手を添える',tilt:-8,limbs:[[-47,11,-1,-2],[30,12,26,61],[-37,83,-67,133],[40,84,57,136]]}
];
function editorPoseRoot(i,pose) {
    const root=limbRoot({x:0,y:0},i),angle=pose.tilt*Math.PI/180;
    return {x:root.x*Math.cos(angle)-root.y*Math.sin(angle),y:root.x*Math.sin(angle)+root.y*Math.cos(angle)};
}
function previewLimb(i,pose) {
    const root=editorPoseRoot(i,pose),[x,y,tx,ty]=pose.limbs[i];
    return `<g pointer-events="none"><path d="M${root.x} ${root.y} L${x} ${y}" fill="none" stroke="${PLAYER_OUTLINE_COLOR}" stroke-width="6" stroke-linecap="round"/>
        <path d="M${x} ${y} L${tx} ${ty}" fill="none" stroke="${PLAYER_OUTLINE_COLOR}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="${x}" cy="${y}" r="3.5" fill="#f3f0e7"/><circle cx="${tx}" cy="${ty}" r="4" fill="#2f5d46"/></g>`;
}
function renderCharacterEditor() {
    const w=TORSO.width,h=TORSO.height,pose=EDITOR_POSES[draftStripeCount-1],outline=PLAYER_SILHOUETTE_STYLE;
    const bands=draftColors.slice(0,draftStripeCount).map((color,i)=>{
        const selected=selectedPart==='body' && i===selectedStripe;
        return `<rect data-stripe="${i}" x="${-w/2}" y="${-h/2+h*i/draftStripeCount}" width="${w}" height="${h/draftStripeCount}" fill="${color}" role="button" tabindex="0" aria-label="上から${i+1}番目の色 ${color}" aria-pressed="${selected}" aria-haspopup="dialog" aria-controls="editorPalette"/>`;
    }).join('');
    ui.editorPreview.setAttribute('aria-label',`${draftStripeCount}色・${pose.name}のキャラクター配色プレビュー`);
    ui.editorPreview.innerHTML=`<defs><filter id="editor-outline-shadow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="${outline.shadowOffsetY}" stdDeviation="${outline.shadowBlur/2}" flood-color="${outline.shadowColor}"/></filter></defs>
        <g data-pose="${draftStripeCount}" transform="translate(105 140) scale(1.5)">
        ${[2,3,0,1].map(i=>previewLimb(i,pose)).join('')}
        <g transform="rotate(${pose.tilt})">
        <path d="M0 ${-h/2} V${-h/2-9}" stroke="${PLAYER_OUTLINE_COLOR}" stroke-width="5"/>
        <circle data-part="head" cx="0" cy="${-h/2-13}" r="10" fill="${draftHeadColor}" role="button" tabindex="0" aria-label="頭の色 ${draftHeadColor}" aria-pressed="${selectedPart==='head'}" aria-haspopup="dialog" aria-controls="editorPalette"/>
        <circle cx="0" cy="${-h/2-13}" r="10" fill="none" stroke="${outline.color}" stroke-width="${outline.width}" filter="url(#editor-outline-shadow)" pointer-events="none"/>
        ${bands}<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" fill="none" stroke="${outline.color}" stroke-width="${outline.width}" filter="url(#editor-outline-shadow)" pointer-events="none"/>
        ${[0,1,2,3].map(i=>{const root=limbRoot({x:0,y:0},i);return `<circle data-editor-root="${i}" cx="${root.x}" cy="${root.y}" r="${outline.rootRadius}" fill="${outline.rootColor}" pointer-events="none"/>`;}).join('')}
        </g>
        </g>`;
    ui.stripeCount.value=String(draftStripeCount);
    ui.stripeCountValue.textContent=String(draftStripeCount);
    ui.bodyStripeControls.hidden=false;
    if(selectedPart!==null) {
        const color=selectedPart==='head'?draftHeadColor:draftColors[selectedStripe];
        ui.selectedStripeLabel.textContent=selectedPart==='head'?'頭の色（単色）':`上から${selectedStripe+1}番目の色`;
        ui.paletteSwatches.innerHTML=EDITOR_COLORS.map(c=>`<button type="button" data-color="${c}" style="background:${c}" aria-label="色 ${c}" aria-pressed="${c===color}"></button>`).join('');
    }
}
function openEditorPalette() {
    ui.editorPalette.hidden=false;
    if(!ui.editorPalette.open)ui.editorPalette.showModal?.();
    (ui.paletteSwatches.querySelector?.('[aria-pressed="true"]') || ui.paletteSwatches.querySelector?.('button'))?.focus({preventScroll:true});
}
function closeEditorPalette() {
    const selector=selectedPart==='head'?'[data-part="head"]':`[data-stripe="${selectedStripe}"]`;
    if(ui.editorPalette.open)ui.editorPalette.close?.();
    ui.editorPalette.hidden=true;selectedPart=null;selectedStripe=null;
    if(state==='editing') {
        renderCharacterEditor();
        ui.editorPreview.querySelector?.(selector)?.focus({preventScroll:true});
    }
}
function randomizeEditorAppearance(random=Math.random) {
    if(state!=='editing')return false;
    closeEditorPalette();
    const previous=JSON.stringify({colors:draftColors.slice(0,draftStripeCount),headColor:draftHeadColor});
    const next=randomAppearance(random);
    if(JSON.stringify(next)===previous) {
        next.colors[0]=EDITOR_COLORS.find(color=>color!==next.colors[0] && color!==next.colors[1]);
    }
    draftColors=[...next.colors];draftStripeCount=next.colors.length;draftHeadColor=next.headColor;
    renderCharacterEditor();return true;
}
let editorMapReturn=null;
function showCharacterEditor() {
    if(!['map','daily'].includes(state) || mapPreparing || stageStartContext || mapTransition)return false;
    editorMapReturn=state==='daily'?{daily:true}:{page:mapPage,selected:mapSelected,scrollTop:ui.mapScroll.scrollTop};
    cancelMapReveal();
    closeEditorPalette();
    hideSettings();ui.dailyCalendar.hidden=true;ui.levelMap.hidden=true;ui.wall.classList.toggle('map-open',false);
    draftColors=[...playerColors];draftHeadColor=playerHeadColor;draftStripeCount=playerColors.length;selectedStripe=null;selectedPart=null;
    ui.playerName.value=playerName;ui.playerNameError.hidden=true;
    state='editing';ui.titleScreen.hidden=true;ui.characterEditor.hidden=false;
    ui.appearanceStatus.hidden=true;
    ui.hud.hidden=true;
    renderCharacterEditor();ui.stripeCount.focus();
    return true;
}
function returnFromCharacterEditor() {
    closeEditorPalette();
    const destination=editorMapReturn;editorMapReturn=null;
    if(destination?.daily) {
        showDailyCalendar();ui.dailySettingsButton.focus({preventScroll:true});
    } else if(destination) {
        showLevelMap({target:destination.selected});
        mapPage=destination.page;mapSelected=destination.selected;
        renderLevelMap();ui.mapScroll.scrollTop=destination.scrollTop;
        ui.mapSettingsButton.focus({preventScroll:true});
    } else showLevelMap();
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
    selectedPart='body';selectedStripe=n;renderCharacterEditor();openEditorPalette();return true;
}
function selectEditorHead() {
    if(state!=='editing')return false;
    selectedPart='head';selectedStripe=null;renderCharacterEditor();openEditorPalette();return true;
}
function paintEditorColor(color) {
    if(state!=='editing' || selectedPart===null || !validBodyColor(color))return false;
    if(selectedPart==='head')draftHeadColor=color.toLowerCase();
    else draftColors[selectedStripe]=color.toLowerCase();
    closeEditorPalette();return true;
}
function confirmCharacterEditor() {
    if(state!=='editing')return false;
    const name=normalizedPlayerName(ui.playerName.value);
    if(!name){ui.playerNameError.hidden=false;ui.playerName.focus();return false;}
    ui.playerName.blur?.();playerName=name;
    const nameSaved=savePlayerName(playerName);
    playerColors=draftColors.slice(0,draftStripeCount);
    playerHeadColor=draftHeadColor;
    const appearanceSaved=saveAppearance({colors:playerColors,headColor:playerHeadColor});
    const saved=appearanceSaved && nameSaved;
    playSound('confirm');
    updateMapAppearance();returnFromCharacterEditor();refreshLives();
    ui.appearanceStatus.textContent=saved?'名前と配色を保存しました。':'名前と配色を適用しました。この端末への保存はできませんでした。';
    ui.appearanceStatus.hidden=true;
    if(!saved) {ui.mapError.textContent=ui.appearanceStatus.textContent;ui.mapError.hidden=false;}
    return true;
}
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
    }
};
ui.paletteSwatches.onclick=e=>{
    const swatch=e.target.closest('button[data-color]');
    if(swatch && ui.paletteSwatches.contains(swatch))paintEditorColor(swatch.dataset.color);
};
ui.editorPalette.addEventListener('cancel',e=>{e.preventDefault();closeEditorPalette();});
dismissOutside(ui.editorPalette,closeEditorPalette);
ui.editorRandom.onclick=()=>randomizeEditorAppearance();
ui.playerName.oninput=e=>{if(!e.isComposing)limitPlayerNameInput();};
ui.playerName.oncompositionend=limitPlayerNameInput;
ui.editorConfirm.onclick=confirmCharacterEditor;
ui.editorCancel.onclick=()=>{
    if(state==='editing')returnFromCharacterEditor();
};
