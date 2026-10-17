"use strict";
// Approved raster artwork; mirror the art only, keeping the live stage number upright.
const MAP_ICON_ASSETS={"active-100":{"width":512,"height":512,"renderWidth":73.306,"renderHeight":73.306,"left":-5.011,"top":-15.209},"active-125":{"width":512,"height":512,"renderWidth":72.98,"renderHeight":72.98,"left":-4.704,"top":-18.624},"active-150":{"width":512,"height":512,"renderWidth":76.028,"renderHeight":76.028,"left":-6.088,"top":-23.572},"cleared-100":{"width":512,"height":512,"renderWidth":73.143,"renderHeight":73.143,"left":-4.857,"top":-15.206},"cleared-125":{"width":512,"height":512,"renderWidth":74.642,"renderHeight":74.642,"left":-5.54,"top":-21.355},"unplayed-100":{"width":512,"height":512,"renderWidth":72.98,"renderHeight":72.98,"left":-4.704,"top":-14.918},"unplayed-125":{"width":512,"height":512,"renderWidth":74.813,"renderHeight":74.813,"left":-5.553,"top":-20.349},"unplayed-150":{"width":512,"height":512,"renderWidth":76.92,"renderHeight":76.92,"left":-6.61,"top":-24.737},"cleared-150":{"width":512,"height":512,"renderWidth":77.649,"renderHeight":77.649,"left":-7.28,"top":-23.929}};
function mapStageVariant(n) {
    const index=(n-1)%6;
    return {height:['100','125','150'][Math.floor(index/2)],mirrored:index%2===1};
}
function mapWallMarkup(n,status='active') {
    const variant=mapStageVariant(n),key=`${status}-${variant.height}`;
    const asset=MAP_ICON_ASSETS[key];
    if(!asset)return '';
    return `<span class="map-wall" data-variant="${variant.height}-${variant.mirrored?'right':'left'}" data-status="${status}" aria-hidden="true">
        <span class="map-icon-art"${variant.mirrored?' style="transform:scaleX(-1)"':''}>
            <img class="map-icon-image" src="assets/stage-icons/${key}.webp" alt="" draggable="false" width="${asset.width}" height="${asset.height}" style="width:${asset.renderWidth}px;height:${asset.renderHeight}px;left:${asset.left}px;top:${asset.top}px">
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
    return `<defs><image id="map-artwork" href="assets/stage-map.webp" x="0" y="0" width="400" height="${imageHeight}" preserveAspectRatio="none"/></defs>
        <use href="#map-artwork" transform="translate(0 ${MAP_EDGE_SPACE}) scale(1 -4)"/>
        <use href="#map-artwork" transform="translate(0 ${MAP_EDGE_SPACE+imageHeight*2}) scale(1 -1)"/>
        <use href="#map-artwork" transform="translate(0 ${MAP_EDGE_SPACE})"/>`;
}
