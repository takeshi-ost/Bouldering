"use strict";
// Shared stage asset: numbers and state colors belong to the button, not the artwork.
function mapWallMarkup(n) {
    return `<svg class="map-wall" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M8 74 62 53 96 74 42 97Z" fill="#727d76"/>
        <path d="M8 70 62 49 96 70 42 93Z" fill="var(--mat-color,#929d92)"/>
        <path d="M8 70 42 93V97L8 74Z" fill="#65716a"/>
        <path d="M16 64 23 14 29 19 23 68Z" fill="#596b6b"/>
        <path d="M23 14 75 34 75 75 23 55Z" fill="var(--wall-color,#eeeee5)"/>
        <path d="M75 34 81 31 81 73 75 75Z" fill="#9da9a4"/>
        <path d="M23 14 29 11 81 31 75 34Z" fill="#faf8ef"/>
        <g fill="#91a7af"><path d="m33 26 5-2 4 4-2 5-6-2Z"/><path d="m61 52 5-1 4 5-3 4-5-2Z"/></g>
        <g fill="#c4a569"><path d="m54 33 5-2 4 5-3 4-6-2Z"/><path d="m32 45 5-2 3 4-1 4-6-1Z"/></g>
        <path d="m49 45 5-1 4 4-3 5-5-2Z" fill="#bc9077"/>
        <text x="53" y="82" transform="rotate(-21 53 82)" text-anchor="middle" fill="var(--number-color,#fffdf3)" font-size="22" font-weight="800" font-family="system-ui,sans-serif">${n}</text>
    </svg>`;
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
