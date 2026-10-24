'use strict';
// Changes only copied iOS assets. Exact anchors fail closed on upstream changes.
function replaceOnce(source, before, after) {
    if (source.split(before).length !== 2) throw Error('Native source anchor changed: '+before.slice(0,60));
    return source.replace(before, after);
}
module.exports = function nativeSource(name, source) {
    if (name === 'audio.js') {
        source = replaceOnce(source, 'const resumed=soundContext.resume();',
            "globalThis.ASCENT_AUDIO_TRACE?.('resume-attempt');\n            const resumed=soundContext.resume();");
        source = replaceOnce(source,
            "resumed?.then(()=>{flushPendingSound();if(typeof syncBackgroundMusic==='function')syncBackgroundMusic();}).catch(()=>{});",
            "resumed?.then(()=>{globalThis.ASCENT_AUDIO_TRACE?.('resume-resolved');flushPendingSound();if(typeof syncBackgroundMusic==='function')syncBackgroundMusic();}).catch(error=>{globalThis.ASCENT_AUDIO_TRACE?.('resume-rejected',{name:error?.name,message:error?.message});});");
        source = replaceOnce(source, 'if((!soundEnabled && !musicEnabled) || document.hidden)return;',
            'if((!soundEnabled && !musicEnabled) || document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE===false)return;');
        source = replaceOnce(source, 'if(!soundEnabled || !soundContext || document.hidden)return false;',
            'if(!soundEnabled || !soundContext || document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE===false)return false;');
    }
    if (name === 'bgm.js') source = replaceOnce(source,
        'if(!musicEnabled || !bgmPageActive || document.hidden || bgmAdBlocked || bgmAfterAdPending)',
        'if(!musicEnabled || !bgmPageActive || document.hidden || globalThis.ASCENT_NATIVE_AUDIO_ACTIVE===false || bgmAdBlocked || bgmAfterAdPending)');
    if (name === 'game.js') source = replaceOnce(source,
        'y: (e.clientY - r.top) * H / r.height + camera',
        'y: (e.clientY - r.top) * W / r.width - (globalThis.ASCENT_STAGE_VIEWPORT?.padding || 0) + camera');
    if (name === 'input.js') {
        if (source.split('H/canvas.getBoundingClientRect().height').length !== 4) throw Error('Native pan scale anchors changed');
        source = source.replaceAll('H/canvas.getBoundingClientRect().height', 'W/canvas.getBoundingClientRect().width');
        source = replaceOnce(source, '(e.clientY-origin.clientY)*H/r.height', '(e.clientY-origin.clientY)*W/r.width');
    }
    if (name === 'renderer.js') {
        source = replaceOnce(source, '"use strict";', '"use strict";\nfunction nativeStagePadding(){return globalThis.ASCENT_STAGE_VIEWPORT?.padding || 0;}');
        source = replaceOnce(source, "const gymFloorImage=typeof Image==='function'?new Image():null;",
            `const nativeFloorExtensionImage=typeof Image==='function'?new Image():null;
if(nativeFloorExtensionImage){nativeFloorExtensionImage.src='assets/native/gym-floor-extended.png';nativeFloorExtensionImage.addEventListener?.('load',()=>{if(typeof requestGameRender==='function')requestGameRender();});}
const gymFloorImage=typeof Image==='function'?new Image():null;`);
        source = replaceOnce(source, '        ctx.fillRect(0,top,W,height);\n    }\n}',
            `        ctx.fillRect(0,top,W,height);
    }
    // Preserve the original floor and foot margin; draw only the outpainted
    // continuation below HEIGHT, with the source band's existing scale.
    if(nativeFloorExtensionImage?.complete && nativeFloorExtensionImage.naturalWidth) {
        const image=nativeFloorExtensionImage,band=image.naturalWidth/8;
        ctx.drawImage(image,0,band,image.naturalWidth,image.naturalHeight-band,
            0,HEIGHT,W,HOLD_CONFIG.bottomMargin*(image.naturalHeight-band)/band);
    }
}`);
        source = replaceOnce(source, 'if (canvas.width !== W * ratio) {',
            'const viewportHeight = H + nativeStagePadding()*2;\n    if (canvas.width !== W * ratio || canvas.height !== Math.round(viewportHeight * ratio)) {');
        source = replaceOnce(source, 'canvas.height = H * ratio;', 'canvas.height = Math.round(viewportHeight * ratio);');
        source = replaceOnce(source, '        ratio,\n        0,\n        0\n    );',
            '        ratio,\n        0,\n        nativeStagePadding()*ratio\n    );');
        source = replaceOnce(source, "ctx.fillStyle = '#deddda';\n    ctx.fillRect(\n        0,\n        0,\n        W,\n        H\n    );",
            "ctx.fillStyle = '#deddda';\n    ctx.fillRect(0, -nativeStagePadding(), W, viewportHeight);");
        source = replaceOnce(source, "(goal.y-camera)*rect.height/H", "(goal.y-camera+nativeStagePadding())*rect.width/W");
        source = replaceOnce(source, "ctx.fillStyle='#f3f0e780';\n    ctx.fillRect(0,0,W,H);",
            "ctx.fillStyle='#f3f0e780';\n    ctx.fillRect(0,-nativeStagePadding(),W,H+nativeStagePadding()*2);");
        source = replaceOnce(source, "ctx.fillRect(pan.side==='left'?0:W-STAGE_SAFE_WIDTH,0,STAGE_SAFE_WIDTH,H);",
            "ctx.fillRect(pan.side==='left'?0:W-STAGE_SAFE_WIDTH,-nativeStagePadding(),STAGE_SAFE_WIDTH,H+nativeStagePadding()*2);");
        // Rendering culling only: keep all camera motion, fall limits and rules at H=700.
        source = source.replace(/camera\s*\+\s*H\s*\+\s*(20|24|30|35|200)\b/g, 'camera + H + nativeStagePadding() + $1');
        source = source.replace(/camera\s*-\s*(20|24|30|35)\b/g, 'camera - nativeStagePadding() - $1');
        source = replaceOnce(source, '    ctx.drawImage(gameWallImage,0,top,W,HEIGHT-top);',
            `    ctx.drawImage(gameWallImage,0,top,W,HEIGHT-top);
    const viewTop=camera-nativeStagePadding(),viewBottom=camera+H+nativeStagePadding();
    if(viewTop<top)ctx.drawImage(gameWallImage,0,0,gameWallImage.naturalWidth,1,0,viewTop,W,top-viewTop);
    if(viewBottom>HEIGHT)ctx.drawImage(gameWallImage,0,gameWallImage.naturalHeight-1,gameWallImage.naturalWidth,1,0,HEIGHT,W,viewBottom-HEIGHT);`);
    }
    return source;
};
