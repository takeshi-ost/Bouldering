"use strict";
// Approved raster artwork; mirror the art only, keeping the live stage number upright.
const MAP_ART_VERSION='white-outline-road-v1';
const MAP_BACKGROUND_VERSION='camping-v1';
const MAP_ICON_ASSETS={"active-100":{"width":512,"height":512,"renderWidth":72.818,"renderHeight":72.818,"left":-4.693,"top":-14.916},"active-125":{"width":512,"height":512,"renderWidth":72.656,"renderHeight":72.656,"left":-4.541,"top":-18.603},"active-150":{"width":512,"height":512,"renderWidth":75.502,"renderHeight":75.502,"left":-5.751,"top":-23.358},"cleared-100":{"width":512,"height":512,"renderWidth":72.496,"renderHeight":72.496,"left":-4.531,"top":-14.77},"cleared-125":{"width":512,"height":512,"renderWidth":74.136,"renderHeight":74.136,"left":-5.213,"top":-21.015},"cleared-150":{"width":512,"height":512,"renderWidth":77.283,"renderHeight":77.283,"left":-7.094,"top":-24.033},"unplayed-100":{"width":512,"height":512,"renderWidth":72.496,"renderHeight":72.496,"left":-4.531,"top":-14.628},"unplayed-125":{"width":512,"height":512,"renderWidth":74.473,"renderHeight":74.473,"left":-5.382,"top":-20.32},"unplayed-150":{"width":512,"height":512,"renderWidth":76.561,"renderHeight":76.561,"left":-6.28,"top":-24.238}};
function mapStageVariant(n) {
    const index=(n-1)%6,pointIndex=(n-1)%20;
    const from=MAP_TRAIL[pointIndex];
    // At a corner use the outgoing segment; the final node leads out of the image.
    const to=pointIndex===19?[400,0]:MAP_TRAIL[pointIndex+1];
    const mirrored=to[0]>from[0];
    return {height:['100','125','150'][Math.floor(index/2)],mirrored};
}
function mapWallMarkup(n,status='active') {
    const variant=mapStageVariant(n),key=`${status}-${variant.height}`;
    const asset=MAP_ICON_ASSETS[key];
    if(!asset)return '';
    return `<span class="map-wall" data-variant="${variant.height}-${variant.mirrored?'right':'left'}" data-status="${status}" aria-hidden="true">
        <span class="map-icon-art" style="transform:scaleX(${variant.mirrored?-1:1})">
            <img class="map-icon-image" src="assets/stage-icons/${key}.webp?v=${MAP_ART_VERSION}" alt="" draggable="false" width="${asset.width}" height="${asset.height}" style="width:${asset.renderWidth}px;height:${asset.renderHeight}px;left:${asset.left}px;top:${asset.top}px">
        </span>
        <span class="map-node-number" style="font-size:${n<1000?18:14}px">${n}</span>
    </span>`;
}
// Approved 20-clearing wallpaper. One or two equal steps between deep turns.
const MAP_IMAGE_WIDTH=739, MAP_IMAGE_HEIGHT=2129;
const MAP_EDGE_SPACE=88, MAP_BOTTOM_SPACE=28;
const MAP_TRAIL=[[100,1995],[280,1895],[460,1795],[280,1695],[460,1595],[280,1495],[100,1395],[280,1295],[460,1195],[280,1095],[460,995],[280,895],[100,795],[280,695],[460,595],[280,495],[460,395],[640,295],[460,195],[280,95]];
const MAP_TRAIL_LENGTHS=[0];
for(let i=1;i<MAP_TRAIL.length;i++) {
    const a=MAP_TRAIL[i-1],b=MAP_TRAIL[i];
    MAP_TRAIL_LENGTHS.push(MAP_TRAIL_LENGTHS[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));
}
function mapTrailPoint(t) {
    const distance=clamp(t,0,1)*MAP_TRAIL_LENGTHS[MAP_TRAIL_LENGTHS.length-1];
    let i=1;
    while(i<MAP_TRAIL.length-1 && MAP_TRAIL_LENGTHS[i]<distance)i++;
    const a=MAP_TRAIL[i-1],b=MAP_TRAIL[i];
    const f=(distance-MAP_TRAIL_LENGTHS[i-1])/(MAP_TRAIL_LENGTHS[i]-MAP_TRAIL_LENGTHS[i-1]||1);
    return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f};
}
function mapSceneryMarkup() {
    const width=ui.mapTrack.clientWidth||400;
    const imageHeight=width*MAP_IMAGE_HEIGHT/MAP_IMAGE_WIDTH;
    // Extend the image edges behind controls without duplicating stage clearings.
    return `<defs>
        <filter id="map-icon-white-outline" x="-100%" y="-200%" width="300%" height="500%" color-interpolation-filters="sRGB">
            <feComponentTransfer in="SourceGraphic" result="dark-channels">
                <feFuncR type="discrete" tableValues="1 0 0 0"/><feFuncG type="discrete" tableValues="1 0 0 0"/><feFuncB type="discrete" tableValues="1 0 0 0"/>
            </feComponentTransfer>
            <feColorMatrix in="dark-channels" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .333333 .333333 .333333 0 0"/>
            <feComponentTransfer result="outline-mask"><feFuncA type="discrete" tableValues="0 0 0 1"/></feComponentTransfer>
            <feComposite in="SourceGraphic" in2="outline-mask" operator="out" result="fill-only"/>
            <feComposite in="outline-mask" in2="SourceGraphic" operator="in" result="white-outline"/>
            <feMerge><feMergeNode in="fill-only"/><feMergeNode in="white-outline"/></feMerge>
        </filter>
        <image id="map-artwork" href="assets/stage-map.webp?v=${MAP_BACKGROUND_VERSION}" x="0" y="0" width="400" height="${imageHeight}" preserveAspectRatio="none"/></defs>
        <use href="#map-artwork" transform="translate(0 ${MAP_EDGE_SPACE}) scale(1 -4)"/>
        <use href="#map-artwork" transform="translate(0 ${MAP_EDGE_SPACE+imageHeight*2}) scale(1 -1)"/>
        <use href="#map-artwork" transform="translate(0 ${MAP_EDGE_SPACE})"/>`;
}
