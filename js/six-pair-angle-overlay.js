'use strict';
// Read-only debug angle display: a short WALL tap toggles a read-only angular map. Body tap stays Undo.
const SixPairAngleOverlay=(()=>{
    const colors=['#ad3627','#1769b2','#158147','#a52b83','#796000','#6b45c4'];
    let pending=null,view=null;
    const invalidate=()=>{if(typeof requestStageArtworkRender==='function')requestStageArtworkRender();};
    function hide(){view=null;invalidate();}
    function enabled(){
        if(DEBUG_FEATURES_ALLOWED && debugMode)return true;
        if(pending || view)reset();
        return false;
    }
    function begin(e){if(!enabled())return;pending={event:{clientX:e.clientX,clientY:e.clientY},start:performance.now()};}
    function move(e){
        if(!enabled() || !pending)return null;
        const r=canvas.getBoundingClientRect(),p=pending.event;
        if(Math.hypot(viewportClientDelta(e.clientX-p.clientX,r),viewportClientDelta(e.clientY-p.clientY,r))<INPUT_CONFIG.dragThreshold)return null;
        pending=null;hide();return p;
    }
    function toggle(){
        if(!enabled())return;
        if(view){hide();return;}
        if(state!=='playing'||!body||!grips.every(Boolean))return;
        const saved={committed,startGrips};
        try {
            committed={...body};startGrips=[...grips];
            const map=SixPairSelection.directionSamples();
            view={...map,body:{...body},holds,grips:[...grips],enabled:SixPairSelection.enabled};
        } finally {({committed,startGrips}=saved);}
        invalidate();
    }
    function end(cancel){if(!enabled())return;const tap=pending;pending=null;if(cancel){hide();return;}if(tap&&performance.now()-tap.start<=INPUT_CONFIG.tapMaxDuration)toggle();}
    function reset(){pending=null;hide();}
    function draw(){
        if(!enabled() || !view)return;
        if(state!=='playing'||holds!==view.holds||body.x!==view.body.x||body.y!==view.body.y||!grips.every((h,i)=>h===view.grips[i])||SixPairSelection.enabled!==view.enabled){hide();return;}
        if(settingsOpen||featureHelpOpen||!ui.overlay.hidden||cameraIntro)return;
        const visual=characterPose(performance.now()).body;
        const outer=Math.max(16,Math.min(104,visual.x-8,W-visual.x-8,
            visual.y-(camera-stageViewPadding())-8,camera+H+stageViewPadding()-visual.y-8));
        const inner=outer*.75,labelRadius=outer*.875,step=Math.PI*2/view.indices.length;
        ctx.save();ctx.lineWidth=1;
        const sectors=view.sectors||(()=>{const result=[];for(let i=0;i<view.indices.length;){let end=i+1;while(end<view.indices.length&&view.indices[end]===view.indices[i])end++;result.push({index:view.indices[i],start:view.start+i*step,width:(end-i)*step});i=end;}return result;})();
        for(const sector of sectors){
            const {index,start:a,width}=sector,b=a+width;
            ctx.beginPath();ctx.arc(visual.x,visual.y,outer,a,b);ctx.arc(visual.x,visual.y,inner,b,a,true);ctx.closePath();
            ctx.fillStyle=colors[index];ctx.globalAlpha=.55;ctx.fill();ctx.globalAlpha=.85;ctx.strokeStyle='#fff';ctx.stroke();
            if(width>=Math.PI/18){
                const middle=(a+b)/2;ctx.globalAlpha=1;ctx.font='bold '+Math.max(9,Math.min(13,outer/8))+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.fillStyle=colors[index];
                const x=visual.x+labelRadius*Math.cos(middle),y=visual.y+labelRadius*Math.sin(middle);ctx.strokeText(String(index+1),x,y);ctx.fillText(String(index+1),x,y);ctx.lineWidth=1;
            }
        }
        // Compact temporary legend; no DOM/pointer hit region and no permanent HUD.
        const top=camera+94;ctx.globalAlpha=.9;ctx.fillStyle='#fbf9f1';ctx.fillRect(30,top,340,67);ctx.globalAlpha=1;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='bold 11px system-ui';ctx.fillStyle='#263d34';
        ctx.fillText(gameText("debug.pair.title"),40,top+15);
        ctx.font='11px system-ui';
        [gameText("debug.pair.feet"),gameText("debug.pair.right"),gameText("debug.pair.rightLeft"),gameText("debug.pair.leftRight"),gameText("debug.pair.left"),gameText("debug.pair.hands")].forEach((label,i)=>{ctx.fillStyle=colors[i];ctx.fillText((i+1)+' '+label,40+(i%3)*109,top+32+Math.floor(i/3)*15);});
        ctx.fillStyle='#555';ctx.font='9px system-ui';ctx.fillText(gameText("debug.pair.hint"),40,top+61);
        ctx.restore();
    }
    return {begin,move,end,reset,hide,toggle,draw,get enabled(){return enabled();},get pending(){return enabled()?pending:null;},get visible(){return enabled() && !!view;},get snapshot(){return enabled()?view:null;}};
})();

// Normal-play pointer preview. Independent from the diagnostic tap-to-toggle map:
// it never owns a gesture or changes the original down/move/release lifecycle.
const TouchPairPreview=(()=>{
    const colors=['#2584e8','#e84646','#f2cf37','#36b86b','#995de0','#ef912f'];
    // Same screen-space order as limbs: left hand, right hand, left foot, right foot.
    const pipOffsets=[[-5,-5],[5,-5],[-5,5],[5,5]];
    // Display-only switch. Selection and the independent debug overlay stay active.
    let displayEnabled=false,view=null;
    const invalidate=()=>{if(typeof requestStageArtworkRender==='function')requestStageArtworkRender();};
    function hide(){if(view){view=null;invalidate();}}
    function available(){return displayEnabled && state==='playing' && !settingsOpen && !featureHelpOpen && ui.overlay.hidden && !cameraIntro && (typeof document==='undefined' || document.visibilityState!=='hidden');}
    function begin(e){
        hide();
        if(!available() || (DEBUG_FEATURES_ALLOWED && debugMode) || (!drag && !bodyTap) || !grips.every(Boolean))return;
        const saved={committed,startGrips};
        try {
            committed={...body};startGrips=[...grips];
            const map=SixPairSelection.directionSamples();
            view={event:{clientX:e.clientX,clientY:e.clientY},sectors:map.sectors,
                body:{...body},holds,grips:[...grips],gesture:drag||bodyTap};
        } finally {({committed,startGrips}=saved);}
        invalidate();
    }
    function move(e){
        if(!view)return;
        const r=canvas.getBoundingClientRect(),origin=view.event;
        if(Math.hypot(viewportClientDelta(e.clientX-origin.clientX,r),viewportClientDelta(e.clientY-origin.clientY,r))>=INPUT_CONFIG.dragThreshold)hide();
    }
    function draw(){
        if(!view)return;
        if(!available() || (DEBUG_FEATURES_ALLOWED && debugMode) || view.gesture!==(drag||bodyTap) ||
            holds!==view.holds || body.x!==view.body.x || body.y!==view.body.y || !grips.every((h,i)=>h===view.grips[i])){hide();return;}
        // Reproject the original client point: camera recentering must not move
        // the circle away from the finger. Canvas bounds clip without shifting it.
        const p=point(view.event),inner=52,outer=96;
        ctx.save();ctx.globalAlpha=1;
        for(const {index,start,width,pair} of view.sectors||[]){
            const end=start+width,color=colors[index];
            const fade=ctx.createRadialGradient(p.x,p.y,inner,p.x,p.y,outer);
            fade.addColorStop(0,color);fade.addColorStop(1,color+'00');
            ctx.beginPath();ctx.arc(p.x,p.y,outer,start,end);ctx.arc(p.x,p.y,inner,end,start,true);ctx.closePath();
            ctx.globalAlpha=.75;ctx.fillStyle=fade;ctx.fill();ctx.globalAlpha=1;
            const middle=start+width/2,radius=inner+12;
            const x=p.x+radius*Math.cos(middle),y=p.y+radius*Math.sin(middle);
            // sector.pair contains FIXED anchors; illuminate the two limbs that move.
            // Keep the four-dot glyph upright, regardless of the sector direction.
            pipOffsets.forEach(([dx,dy],limb)=>{
                ctx.beginPath();ctx.arc(x+dx,y+dy,3.5,0,Math.PI*2);
                ctx.fillStyle=pair.includes(limb)?'#26313d':'#fff';ctx.fill();
                ctx.lineWidth=1;ctx.strokeStyle='#26313d';ctx.stroke();
            });
        }
        ctx.restore();
    }
    if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='hidden')hide();});
    return {begin,move,hide,draw,setEnabled(enabled){displayEnabled=enabled===true;if(!displayEnabled)hide();},get enabled(){return displayEnabled;},get visible(){return !!view;},get snapshot(){return view;}};
})();
