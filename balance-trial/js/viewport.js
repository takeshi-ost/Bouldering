"use strict";
// Layout coordinates are 400 units wide; course/camera rules stay 400 x 700.
function viewportMetrics(width,height,insets={}) {
    const left=Math.max(0,insets.left||0),top=Math.max(0,insets.top||0);
    const availableWidth=Math.max(1,width-left-Math.max(0,insets.right||0));
    const availableHeight=Math.max(1,height-top-Math.max(0,insets.bottom||0));
    const scale=Math.min(availableWidth/400,availableHeight/700);
    const logicalHeight=availableHeight/scale;
    return {scale,width:400,height:logicalHeight,padding:(logicalHeight-700)/2,
        left:left+(availableWidth-400*scale)/2,top,cssWidth:400*scale,cssHeight:availableHeight};
}
// Intersect the visible viewport with the safe rectangle in layout CSS pixels.
// Keyboard/browser occlusion is already represented by visualViewport; do not
// subtract the bottom safe inset a second time from that smaller rectangle.
function viewportSafeFrame(layout,visual,insets={},native) {
    const validNative=native && native.width>0 && native.height>0 && native.safe;
    const unit=validNative?layout.width/native.width:1;
    const safe=validNative?{left:native.safe.left*unit,top:native.safe.top*unit,
        right:native.safe.right*unit,bottom:native.safe.bottom*unit}:
        {left:insets.left||0,top:insets.top||0,right:layout.width-(insets.right||0),bottom:layout.height-(insets.bottom||0)};
    const left=Math.max(visual.left,safe.left),top=Math.max(visual.top,safe.top);
    const right=Math.max(left+1,Math.min(visual.left+visual.width,safe.right));
    const bottom=Math.max(top+1,Math.min(visual.top+visual.height,safe.bottom));
    const frame=viewportMetrics(right-left,bottom-top);
    frame.left+=left;frame.top+=top;
    return {...frame,safeSource:validNative?'native':'css',safe};
}
function stageViewPadding() {
    if(globalThis.ASCENT_VIEWPORT)return globalThis.ASCENT_VIEWPORT.padding;
    const rect=canvas.getBoundingClientRect();
    return Math.max(0,(rect.height*400/rect.width-700)/2);
}
function viewportClientPoint(event,rect,worldCamera=0) {
    const scale=rect.width/400,padding=Math.max(0,(rect.height/scale-700)/2);
    return {x:(event.clientX-rect.left)/scale,y:(event.clientY-rect.top)/scale-padding+worldCamera};
}
function viewportClientDelta(value,rect) {return value*400/rect.width;}
function viewportUiDelta(value) {return value/(globalThis.ASCENT_VIEWPORT?.scale||1);}
// CSS zoom keeps DOM clientWidth/scrollTop in logical units and leaves native
// scrolling, hit testing and focus intact. Top-layer dialogs need their own zoom.
(() => {
    if(typeof document.querySelectorAll!=='function' || !document.documentElement?.style)return;
    // A top-layer dialog must not inherit the wall's zoom as well as its own.
    // Keep every dialog in one unscaled portal; IDs and event handlers are unchanged.
    for(const dialog of document.querySelectorAll('dialog')||[])document.body.append(dialog);
    const root=document.documentElement,probe=document.createElement('div');
    probe.className='viewport-safe-probe';probe.setAttribute('aria-hidden','true');document.body.append(probe);
    function updateViewport() {
        const visual=window.visualViewport,style=getComputedStyle(probe);
        const insets=Object.fromEntries(['top','right','bottom','left'].map(side=>[side,parseFloat(style['padding'+side[0].toUpperCase()+side.slice(1)])||0]));
        const layout={width:window.innerWidth||visual?.width,height:window.innerHeight||visual?.height};
        const visible={left:visual?.offsetLeft||0,top:visual?.offsetTop||0,width:visual?.width||layout.width,height:visual?.height||layout.height};
        const m=viewportSafeFrame(layout,visible,insets,globalThis.ASCENT_NATIVE_SAFE_AREA);
        globalThis.ASCENT_VIEWPORT=Object.freeze(m);
        for(const [name,value] of Object.entries({scale:m.scale,height:m.height+'px',left:m.left+'px',top:m.top+'px',
            'dialog-left':m.left/m.scale+'px','dialog-top':m.top/m.scale+'px',
            'dialog-center-x':(m.left/m.scale+200)+'px','dialog-center-y':(m.top/m.scale+m.height/2)+'px'}))root.style.setProperty('--viewport-'+name,String(value));
        if(typeof requestGameRender==='function')requestGameRender();

    }
    window.addEventListener('resize',updateViewport);
    window.addEventListener('ascent-native-safe-area',updateViewport);
    if(typeof ResizeObserver==='function')new ResizeObserver(updateViewport).observe(probe);
    window.requestAnimationFrame?.(updateViewport);
    window.visualViewport?.addEventListener('resize',updateViewport);
    window.visualViewport?.addEventListener('scroll',updateViewport);
    updateViewport();
    window.webkit?.messageHandlers?.ascentViewport?.postMessage({kind:'request'});
})();
