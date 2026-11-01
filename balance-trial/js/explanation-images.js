'use strict';
// Decode before mounting the actual image node, not merely a second URL copy.
// A page waits at most two 4-second attempts; failure permits text-only help.
const EXPLANATION_IMAGE_POLICY={timeoutMs:4000,attempts:2};
const explanationImageCache=new Map();
function requestExplanationImage(src,ready) {
    if(!src || typeof Image!=='function'){ready(null);return;}
    const previous=explanationImageCache.get(src);
    if(previous && !previous.image){previous.listeners.push(ready);return;}
    // Re-check decode even for a warm node: a browser may discard decoded pixels
    // while the player reads/climbs. Reuse the same image, not a fresh URL clone.
    const cached=previous?.image;
    const entry={image:null,listeners:[ready]};explanationImageCache.set(src,entry);
    const complete=image=>{
        if(explanationImageCache.get(src)!==entry)return;
        if(image)entry.image=image;
        else explanationImageCache.delete(src); // A later display may retry.
        const listeners=entry.listeners.splice(0);
        for(const listener of listeners)listener(image);
    };
    const attempt=(count,reuse=null)=>{
        const image=reuse||new Image();let settled=false,decoding=false;
        const finish=ok=>{
            if(settled)return;settled=true;clearTimeout(timer);
            image.onload=image.onerror=null;
            if(ok)complete(image);
            else if(count<EXPLANATION_IMAGE_POLICY.attempts)attempt(count+1);
            else complete(null);
        };
        const loaded=()=>{
            if(settled || decoding)return;
            if(!image.naturalWidth){finish(false);return;}
            decoding=true;
            if(typeof image.decode!=='function'){finish(true);return;}
            try {Promise.resolve(image.decode()).then(()=>finish(true),()=>finish(false));}
            catch(_){finish(false);}
        };
        const timer=setTimeout(()=>finish(false),EXPLANATION_IMAGE_POLICY.timeoutMs);
        image.onload=loaded;image.onerror=()=>finish(false);
        image.decoding='async';if(!reuse)image.src=src;
        if(image.complete && image.naturalWidth)loaded();
    };
    attempt(1,cached);
}
function preloadExplanationImages(sources) {
    for(const src of new Set(sources.filter(Boolean)))requestExplanationImage(src,()=>{});
}
function mountExplanationImage(picture,image,{id='',className='',width=78,height=78,alt=''}={}) {
    if(!picture)return;
    if(!image){picture.hidden=true;return;} // Never reveal a late failed request.
    image.id=id;image.className=className;image.width=width;image.height=height;image.alt=alt;image.hidden=false;
    if(typeof picture.replaceWith==='function')picture.replaceWith(image);
    else {picture.src=image.src;picture.alt=alt;picture.hidden=false;} // Minimal/non-DOM hosts.
}
