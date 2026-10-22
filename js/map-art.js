"use strict";
// Approved raster artwork; mirror the art only, keeping the live stage number upright.
const MAP_ART_VERSION='wall-hold-count-v3';
const MAP_BACKGROUND_VERSION='sage-extended-v2';
// A page contains twenty stages; past pages keep their own season when revisited.
const MAP_BACKGROUNDS=[
    {season:'spring',src:'assets/stage-map.webp',version:MAP_BACKGROUND_VERSION,saturation:1.2},
    {season:'summer',src:'assets/stage-map-summer.webp',version:'summer-v1',saturation:0.7},
    {season:'autumn',src:'assets/stage-map-autumn.webp',version:'autumn-v1',saturation:0.7},
    {season:'winter',src:'assets/stage-map-winter.webp',version:'winter-v1',saturation:1}
];
function mapBackground(page=mapPage) { return MAP_BACKGROUNDS[page%MAP_BACKGROUNDS.length]; }
function mapBackgroundSource(background=mapBackground()) { return `${background.src}?v=${background.version}`; }
const MAP_ICON_ASSETS={"active-100":{"width":512,"height":512,"renderWidth":66.873,"renderHeight":66.873,"left":-1.437,"top":-11.308},"active-125":{"width":512,"height":512,"renderWidth":66.602,"renderHeight":66.602,"left":-1.301,"top":-15.221},"active-150":{"width":512,"height":614,"renderWidth":68.267,"renderHeight":81.867,"left":-2.133,"top":-30.853},"cleared-100":{"width":512,"height":512,"renderWidth":66.602,"renderHeight":66.602,"left":-1.301,"top":-11.058},"cleared-125":{"width":512,"height":512,"renderWidth":66.467,"renderHeight":66.467,"left":-1.168,"top":-15.088},"cleared-150":{"width":512,"height":614,"renderWidth":67.983,"renderHeight":81.527,"left":-1.992,"top":-30.518},"unplayed-100":{"width":512,"height":512,"renderWidth":66.602,"renderHeight":66.602,"left":-1.301,"top":-11.188},"unplayed-125":{"width":512,"height":512,"renderWidth":66.467,"renderHeight":66.467,"left":-1.168,"top":-15.088},"unplayed-150":{"width":512,"height":614,"renderWidth":67.983,"renderHeight":81.527,"left":-1.992,"top":-30.65}};
function mapStageVariant(n) {
    const pointIndex=(n-1)%20;
    const from=MAP_TRAIL[pointIndex];
    // At a corner use the outgoing segment; the final node leads out of the image.
    const to=pointIndex===19?[400,0]:MAP_TRAIL[pointIndex+1];
    const mirrored=to[0]>from[0];
    const height={short:'100',medium:'125',long:'150'}[stageLengthInfo(n).category];
    return {height,mirrored};
}
function mapWallMarkup(n,status='active') {
    const variant=mapStageVariant(n),key=`${status}-${variant.height}`;
    const asset=MAP_ICON_ASSETS[key];
    if(!asset)return '';
    return `<span class="map-wall" data-variant="${variant.height}-${variant.mirrored?'right':'left'}" data-status="${status}" aria-hidden="true">
        <span class="map-icon-art" style="transform:scaleX(${variant.mirrored?-1:1})">
            <img class="map-icon-image" src="assets/stage-icons/${key}.webp?v=${MAP_ART_VERSION}" alt="" draggable="false" width="${asset.width}" height="${asset.height}" style="width:${asset.renderWidth}px;height:${asset.renderHeight}px;left:${asset.left}px;top:${asset.top}px">
        </span>
        <span class="map-node-number" style="font-size:${n<10000?14:12}px">${n}</span>
    </span>`;
}
// Twenty clearings measured from the approved pale-sage wallpaper, bottom to top.
const MAP_IMAGE_WIDTH=724, MAP_IMAGE_HEIGHT=2650;
const MAP_EDGE_SPACE=0, MAP_BOTTOM_SPACE=0;
const MAP_ENTRY_X=75, MAP_ENTRY_Y=2580;
const MAP_TRAIL=[[143,2489],[296,2318],[452.5,2164],[297.5,2061],[466.5,1954],
    [311.5,1851],[125.5,1744],[302.5,1629],[492,1497],[316.5,1392],
    [481.5,1271],[303.5,1177],[131.5,1084.4],[282.5,957],[442.1,836.9],
    [283,739],[434.5,622],[575,508],[424,408],[283.5,306]];
function mapTrailPoint(t) {
    // Each integer stage stays on its painted clearing, even with variable segment lengths.
    const index=clamp(t,0,1)*(MAP_TRAIL.length-1),i=Math.min(Math.floor(index),MAP_TRAIL.length-2);
    const a=MAP_TRAIL[i],b=MAP_TRAIL[i+1],f=index-i;
    return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f};
}

function mapSceneryMarkup() {
    const background=mapBackground();
    const width=ui.mapTrack.clientWidth||400;
    const imageHeight=width*MAP_IMAGE_HEIGHT/MAP_IMAGE_WIDTH;
    // The asset includes drawn top/bottom scenery; never reflect or stretch edge copies.
    return `<defs>
        <filter id="map-palette" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="${background.saturation}"/></filter>
        <filter id="map-icon-soft-outline" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
            <feComponentTransfer in="SourceGraphic" result="dark-channels">
                <feFuncR type="discrete" tableValues="1 0 0 0"/><feFuncG type="discrete" tableValues="1 0 0 0"/><feFuncB type="discrete" tableValues="1 0 0 0"/>
            </feComponentTransfer>
            <feColorMatrix in="dark-channels" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .333333 .333333 .333333 0 0"/>
            <feComponentTransfer result="dark-mask"><feFuncA type="discrete" tableValues="0 0 0 1"/></feComponentTransfer>
            <feComposite in="dark-mask" in2="SourceAlpha" operator="in" result="outline-mask"/>
            <feComposite in="SourceGraphic" in2="dark-mask" operator="out" result="fill-only"/>
            <feFlood flood-color="#435c50" flood-opacity=".22"/>
            <feComposite in2="outline-mask" operator="in" result="soft-outline"/>
            <feGaussianBlur in="outline-mask" stdDeviation=".8"/>
            <feOffset dy="1" result="outline-shadow-mask"/>
            <feFlood flood-color="#435c50" flood-opacity=".28"/>
            <feComposite in2="outline-shadow-mask" operator="in" result="outline-shadow"/>
            <feMerge><feMergeNode in="outline-shadow"/><feMergeNode in="soft-outline"/><feMergeNode in="fill-only"/></feMerge>
        </filter>
        <image id="map-artwork" href="${mapBackgroundSource(background)}" x="0" y="0" width="400" height="${imageHeight}" preserveAspectRatio="none"/></defs>
        <use href="#map-artwork" filter="url(#map-palette)"/>`;
}
