"use strict";
// Generated once per saved appearance; the same PNG URL serves every UI instance.
const PLAYER_ICON_VERSION=1,PLAYER_ICON_WIDTH=96,PLAYER_ICON_HEIGHT=128;
let playerIconCache=null;
function createPlayerIcon(appearance) {
    const colors=appearance?.colors,headColor=appearance?.headColor;
    const valid=color=>typeof color==='string' && /^#[0-9a-f]{6}$/i.test(color);
    if(!Array.isArray(colors) || colors.length<1 || colors.length>8 ||
        !colors.every(valid) || !valid(headColor))throw new TypeError('Invalid player icon appearance');
    const key=JSON.stringify([PLAYER_ICON_VERSION,headColor.toLowerCase(),colors.map(c=>c.toLowerCase())]);
    if(playerIconCache?.key===key)return playerIconCache;
    const icon={key,version:PLAYER_ICON_VERSION,mimeType:'image/png',
        width:PLAYER_ICON_WIDTH,height:PLAYER_ICON_HEIGHT,src:null};
    try {
        const surface=document.createElement('canvas');
        surface.width=icon.width;surface.height=icon.height;
        const paint=surface.getContext('2d');
        paint.scale(icon.width/24,icon.height/32);
        paint.beginPath();paint.arc(12,6,5.5,0,Math.PI*2);
        paint.fillStyle=headColor;paint.fill();
        paint.strokeStyle='#fff7e9';paint.lineWidth=1;paint.stroke();
        const roundedBody=(x,y,w,h,top,bottom)=>{
            paint.beginPath();paint.moveTo(x+top,y);paint.lineTo(x+w-top,y);
            paint.quadraticCurveTo(x+w,y,x+w,y+top);
            paint.lineTo(x+w,y+h-bottom);paint.quadraticCurveTo(x+w,y+h,x+w-bottom,y+h);
            paint.lineTo(x+bottom,y+h);paint.quadraticCurveTo(x,y+h,x,y+h-bottom);
            paint.lineTo(x,y+top);paint.quadraticCurveTo(x,y,x+top,y);paint.closePath();
        };
        paint.save();roundedBody(3,12,18,20,5,3);paint.clip();
        colors.forEach((color,i)=>{
            paint.fillStyle=color;paint.fillRect(3,12+20*i/colors.length,18,20/colors.length);
        });
        paint.restore();roundedBody(4,13,16,18,4,2);
        paint.strokeStyle='#fff7e9';paint.lineWidth=2;paint.stroke();
        const src=surface.toDataURL('image/png');
        if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src))throw new Error('PNG encoding failed');
        icon.src=src;
    } catch(_) { /* Canvas/storage restrictions retain the existing CSS silhouette. */ }
    // Cache failed attempts too: an unavailable encoder must not retry on UI ticks.
    playerIconCache=Object.freeze(icon);
    return playerIconCache;
}
function playerIconMarkup(className='player-icon') {
    const icon=createPlayerIcon({colors:playerColors,headColor:playerHeadColor});
    return icon.src ? `<img class="${className}" src="${icon.src}" width="${icon.width}" height="${icon.height}" alt="" aria-hidden="true" decoding="async" draggable="false">` : '';
}
