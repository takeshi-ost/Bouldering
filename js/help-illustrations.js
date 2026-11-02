'use strict';
// Optional, decorative help art: all instructions remain ordinary selectable text.
// Paint decoded sources to separate canvases; never move the tutorial's cached
// image nodes out of their live modal, nor mutate world/gameplay render state.
const helpIllustrationStates=new WeakMap();
function paintHelpIllustration(canvas,kind,image) {
    if(!image?.naturalWidth || !image.naturalHeight)return false;
    const paint=canvas.getContext('2d');if(!paint)return false;
    const w=canvas.width,h=canvas.height;
    paint.clearRect(0,0,w,h);
    if(kind==='hazard') {
        const atlas=createHoldTintAtlases(image,[HAZARD_HOLD_TINT_RGB])[0];
        paintHazardAtlasTo(paint,w/2,h/2,Math.min(w,h)*.8,atlas);
        return true;
    }
    let source=image,sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight;
    if(kind==='normal') {
        // First real atlas shape, in the game's first pastel tint.
        source=createHoldTintAtlases(image,[HOLD_TINT_RGB[0]])[0];sw=sh=128;
    } else if(kind==='wide')source=createHoldTintAtlases(image,[HOLD_TINT_RGB[0]])[0];
    else if(kind==='goal'){source=createMetallicGoalAtlas(image);sw=sh=128;}
    // Tutorial artwork fills its original 78px plate; game icons have 10% inset.
    const inset=kind==='image'?1:.8,scale=Math.min(w/sw,h/sh)*inset;
    const width=sw*scale,height=sh*scale;
    paint.drawImage(source,sx,sy,sw,sh,(w-width)/2,(h-height)/2,width,height);
    return true;
}
function prepareHelpIllustrations() {
    for(const canvas of document.querySelectorAll?.('[data-help-image]')||[]) {
        const previous=helpIllustrationStates.get(canvas);
        if(previous==='pending' || previous==='ready')continue;
        canvas.hidden=true;helpIllustrationStates.set(canvas,'pending');
        requestExplanationImage(canvas.getAttribute('data-help-image'),image=>{
            let painted=false;
            try {painted=paintHelpIllustration(canvas,canvas.getAttribute('data-help-art'),image);}
            catch(_) { /* Canvas/image failure must never block reading or closing. */ }
            canvas.hidden=!painted;
            helpIllustrationStates.set(canvas,painted?'ready':'failed');
        });
    }
}
// Begin early without delaying help or game startup. Two bounded load/decode
// attempts use the existing policy; reopening retries failed (not ready) art.
prepareHelpIllustrations();
