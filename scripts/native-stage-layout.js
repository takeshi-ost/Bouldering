'use strict';
// Native-only: the world retains W=400/H=700, with extra view above and below.
(() => {
    const wall = document.getElementById('wall');
    const game = document.getElementById('game');
    const hud = document.getElementById('hud');
    const update = () => {
        const frame = wall.getBoundingClientRect();
        const rect = game.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        for (const [key,value] of Object.entries({top:rect.top-frame.top,left:rect.left-frame.left,width:rect.width,height:rect.height})) {
            wall.style.setProperty(`--native-screen-${key}`, `${value}px`);
        }
        const padding = Math.max(0, (rect.height * 400 / rect.width - 700) / 2);
        const changed = globalThis.ASCENT_STAGE_VIEWPORT?.padding !== padding;
        globalThis.ASCENT_STAGE_VIEWPORT = Object.freeze({padding});
        wall.toggleAttribute('data-native-stage', !hud.hidden);
        if (hud.hidden) {
            for (const key of ['top','left','width']) wall.style.removeProperty(`--native-stage-${key}`);
        } else {
            wall.style.setProperty('--native-stage-top', `${rect.top - frame.top}px`);
            wall.style.setProperty('--native-stage-left', `${rect.left - frame.left}px`);
            wall.style.setProperty('--native-stage-width', `${rect.width}px`);
        }
        if (changed && typeof requestGameRender === 'function') requestGameRender();
    };
    new ResizeObserver(update).observe(game);
    new MutationObserver(update).observe(hud, {attributes:true, attributeFilter:['hidden']});
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    update();
})();
