"use strict";
// Canvas描画。ゲーム状態は読み取り、カメラだけを追従更新します。
// One background spans the world, so upward scrolling reveals its whiter upper end.
const gameWallImage=typeof Image==='function'?new Image():null;
if(gameWallImage)gameWallImage.src='assets/game-wall.webp';
function drawWallBackground() {
    if(!gameWallImage?.complete || !gameWallImage.naturalWidth)return;
    const top=cameraTop();
    ctx.drawImage(gameWallImage,0,top,W,HEIGHT-top);
}


const gymFloorImage=typeof Image==='function'?new Image():null;
if(gymFloorImage)gymFloorImage.src='assets/gym-floor.webp';
function drawGymFloor() {
    // Share the start-foot margin so both feet sit exactly on the floor's upper edge.
    const height=HOLD_CONFIG.bottomMargin,top=HEIGHT-height;
    if(gymFloorImage?.complete && gymFloorImage.naturalWidth) {
        ctx.drawImage(gymFloorImage,0,top,W,height);
    } else {
        ctx.fillStyle='#969e91';
        ctx.fillRect(0,top,W,height);
    }
}
function isFloorStartHold(h) {
    return h===initialGrips[2] || h===initialGrips[3];
}

// A stable visual variant uses coordinates only; gameplay geometry is unchanged.
const holdShapesImage=typeof Image==='function'?new Image():null;
if(holdShapesImage)holdShapesImage.src='assets/hold-shapes-gray-contrast.webp';
const wideHoldImage=typeof Image==='function'?new Image():null;
if(wideHoldImage)wideHoldImage.src='assets/hold-wide-flat.webp';
const hazardHoldImage=typeof Image==='function'?new Image():null;
if(hazardHoldImage)hazardHoldImage.src='assets/hold-hazard-source.webp';
const HAZARD_HOLD_TINT_RGB=[190,80,255];
// Midpoint between the previous palette and the original subtle multiply tints.
const HOLD_TINT_RGB=[[217,222,251],[244,219,249],[251,219,219],[251,248,217]];
const GOAL_HOLD_TINT_RGB=[255,228,150];
// Three warm-gray tones retain the source artwork's opaque darkest/lightest values.
const HOLD_TONE_RGB=[[82,78,77],[153,148,145],[223,218,214]];
const holdToneLuminance=HOLD_TONE_RGB.map(([r,g,b])=>r*.2126+g*.7152+b*.0722);
function holdToneRGB(r,g,b) {
    const luminance=r*.2126+g*.7152+b*.0722;
    const index=luminance<(holdToneLuminance[0]+holdToneLuminance[1])/2 ? 0 :
        luminance<(holdToneLuminance[1]+holdToneLuminance[2])/2 ? 1 : 2;
    return HOLD_TONE_RGB[index];
}
let holdTintAtlases=null,wideHoldTintAtlases=null,goalHoldTintAtlas=null,hazardHoldTintAtlas=null;
function multiplyHoldChannel(channel,tint) {
    // Source artwork already carries the restored original facet contrast.
    return Math.round(channel*tint/255);
}
function holdTintIndex(h) {
    // Separate, deterministic visual randomness avoids changing gameplay RNG or flickering.
    let hash=Math.imul(Math.round(h.x),73856093)^Math.imul(Math.round(h.y),19349663);
    hash=Math.imul(hash^(hash>>>16),0x45d9f3b);
    return ((hash^(hash>>>16))>>>0)%HOLD_TINT_RGB.length;
}
function createHoldTintAtlases(image,tints=HOLD_TINT_RGB) {
    return tints.map(tint=>{
        const atlas=document.createElement('canvas');
        atlas.width=image.naturalWidth;
        atlas.height=image.naturalHeight;
        const paint=atlas.getContext('2d');
        paint.drawImage(image,0,0);
        let pixels;
        try {pixels=paint.getImageData(0,0,atlas.width,atlas.height);}
        catch(error) {
            // Standalone file URLs may block pixel readback; retain playable original artwork.
            if(error.name==='SecurityError')return image;
            throw error;
        }
        for(let i=0;i<pixels.data.length;i+=4) {
            const tone=holdToneRGB(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);
            for(let c=0;c<3;c++)pixels.data[i+c]=multiplyHoldChannel(tone[c],tint[c]);
            // Preserve the original alpha, including antialiased transparent edges.
        }
        paint.putImageData(pixels,0,0);
        return atlas;
    });
}
function getHoldTintAtlases() {
    return holdTintAtlases ??= createHoldTintAtlases(holdShapesImage);
}
function drawWideHoldSprite(h) {
    if(!wideHoldImage?.complete || !wideHoldImage.naturalWidth)return false;
    wideHoldTintAtlases ??= createHoldTintAtlases(wideHoldImage);
    ctx.drawImage(wideHoldTintAtlases[holdTintIndex(h)],h.x-30,h.y-18,60,36);
    return true;
}

function drawHazardSpriteTo(paint,x,y,size) {
    if(!hazardHoldImage?.complete || !hazardHoldImage.naturalWidth)return false;
    hazardHoldTintAtlas ??= createHoldTintAtlases(hazardHoldImage,[HAZARD_HOLD_TINT_RGB])[0];
    paint.save();
    paint.translate(x,y);
    // Shape five points right in the source; rotate its sharp corner upward.
    paint.rotate(-Math.PI/2);
    paint.drawImage(hazardHoldTintAtlas,-size/2,-size/2,size,size);
    paint.restore();
    return true;
}
function drawHazardHoldSprite(h) {
    return drawHazardSpriteTo(ctx,h.x,h.y,21.6);
}
function paintHazardHelpIcon(canvas) {
    if(!canvas || !hazardHoldImage)return;
    const render=()=>{
        if(!canvas.isConnected)return;
        const paint=canvas.getContext('2d');
        paint.clearRect(0,0,canvas.width,canvas.height);
        drawHazardSpriteTo(paint,canvas.width/2,canvas.height/2,canvas.width);
    };
    if(hazardHoldImage.complete && hazardHoldImage.naturalWidth)render();
    else hazardHoldImage.addEventListener('load',render,{once:true});
}

function createMetallicGoalAtlas() {
    const atlas=document.createElement('canvas');
    atlas.width=atlas.height=128;
    const paint=atlas.getContext('2d');
    paint.drawImage(holdShapesImage,0,0,128,128,0,0,128,128);
    let pixels;
    try {pixels=paint.getImageData(0,0,128,128);}
    catch(error) {
        if(error.name==='SecurityError')return createHoldTintAtlases(holdShapesImage,[GOAL_HOLD_TINT_RGB])[0];
        throw error;
    }
    const goldTones=[[99,60,9],[221,161,31],[255,235,139]];
    for(let i=0;i<pixels.data.length;i+=4) {
        const tone=HOLD_TONE_RGB.indexOf(holdToneRGB(pixels.data[i],pixels.data[i+1],pixels.data[i+2]));
        for(let c=0;c<3;c++)pixels.data[i+c]=goldTones[tone][c];
    }
    paint.putImageData(pixels,0,0);
    // Cache diagonal reflection bands inside the original silhouette, preserving alpha.
    paint.globalCompositeOperation='source-atop';
    const reflection=paint.createLinearGradient(0,0,128,128);
    for(const [at,color] of [[0,'#fff4b522'],[.28,'#fffbe000'],[.38,'#fffbe000'],
        [.44,'#ffffedee'],[.50,'#fffbe000'],[.61,'#5d350033'],[.7,'#fffbe000'],
        [.79,'#fff8c366'],[.88,'#fffbe000'],[1,'#58300022']])reflection.addColorStop(at,color);
    paint.fillStyle=reflection;
    paint.fillRect(0,0,128,128);
    return atlas;
}
function drawGoalHoldSprite(h) {
    if(!holdShapesImage?.complete || !holdShapesImage.naturalWidth)return false;
    goalHoldTintAtlas ??= createMetallicGoalAtlas();
    ctx.drawImage(goalHoldTintAtlas,0,0,128,128,h.x-15,h.y-15,30,30);
    return true;
}
// World-space effects follow the wall camera, without changing hit areas.
function drawGoalSparkles(h,now) {
    ctx.save();ctx.fillStyle='#fffbe0';ctx.strokeStyle='#d3aa4a';ctx.lineWidth=.65;
    for(let i=0;i<7;i++) {
        const phase=(now/1800+i*.173)%1;
        const pulse=Math.pow(Math.sin(Math.PI*phase),3);
        const angle=i*2.39996, radius=21+(i%3)*6;
        const x=h.x+Math.cos(angle)*radius,y=h.y+Math.sin(angle)*radius-phase*5;
        const size=(3+i%3)*pulse;
        ctx.globalAlpha=.9*pulse;ctx.beginPath();
        for(let j=0;j<8;j++) {
            const a=j*Math.PI/4,r=j%2?size*.23:size;
            const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
            if(j)ctx.lineTo(px,py);else ctx.moveTo(px,py);
        }
        ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.restore();
}
function drawAnchorRings(now) {
    anchorRings=anchorRings.filter(r=>now-r.start<300);
    ctx.save();
    for(const ring of anchorRings) {
        const t=clamp((now-ring.start)/300,0,1),radius=5+23*(1-(1-t)*(1-t));
        ctx.globalAlpha=(1-t)*.9;
        ctx.beginPath();ctx.arc(ring.x,ring.y,radius,0,Math.PI*2);
        ctx.lineWidth=3;ctx.strokeStyle='#fffdf0';ctx.stroke();
        ctx.lineWidth=1;ctx.strokeStyle='#78ac99';ctx.stroke();
    }
    ctx.restore();
}

function drawDebugHoldNumbers() {
    if(!debugMode)return;
    ctx.save();
    ctx.font='bold 10px system-ui';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineWidth=3;ctx.lineJoin='round';
    ctx.strokeStyle='#fffdf3';ctx.fillStyle='#26382f';
    for(const h of holds) {
        if(h.y<camera-35 || h.y>camera+H+35)continue;
        const text=String(h.id+1),x=clamp(h.x,12,W-12),y=Math.min(HEIGHT-7,h.y+(h.wide ? 26 : 21));
        ctx.strokeText(text,x,y);ctx.fillText(text,x,y);
    }
    ctx.restore();
}

function drawHoldSprite(h) {
    if(!holdShapesImage?.complete || !holdShapesImage.naturalWidth)return false;
    // The atlas contains the original first through fourth shapes.
    const variant=((Math.round(h.x)*31+Math.round(h.y)*17)%4+4)%4;
    const atlas=getHoldTintAtlases()[holdTintIndex(h)];
    ctx.drawImage(atlas,variant*128,0,128,128,h.x-12,h.y-12,24,24);
    return true;
}

const PLAYER_OUTLINE_COLOR='#435c50';
function drawSoftPlayerOutline() {
    // Stroke the current silhouette only, so body stripes do not cast individual shadows.
    ctx.save();
    ctx.lineWidth=1.5;
    ctx.strokeStyle='rgba(67,92,80,.22)';
    ctx.shadowColor='rgba(67,92,80,.28)';
    ctx.shadowBlur=3;
    ctx.shadowOffsetX=0;
    ctx.shadowOffsetY=1.5;
    ctx.stroke();
    ctx.restore();
}

function circle(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}

function line(a, b, color, width) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

// Split one dimension only. The same saved palette is used by the editor and map.
function drawBodyFill(x,y,width,height,pressed=false) {
    const colors=typeof playerColors==='undefined' ? ['#39785b'] : playerColors;
    colors.forEach((color,i)=>{
        if(color==='#39785b')ctx.fillStyle=pressed?'#5b9b72':color;
        else if(pressed) {
            const tint='#ffffff',amount=.25;
            ctx.fillStyle='#'+[1,3,5].map(k=>Math.round(parseInt(color.slice(k,k+2),16)*(1-amount)+parseInt(tint.slice(k,k+2),16)*amount).toString(16).padStart(2,'0')).join('');
        } else ctx.fillStyle=color;
        const top=y+height*i/colors.length,bottom=y+height*(i+1)/colors.length;
        ctx.fillRect(x,top,width,bottom-top);
    });
}

// All rigid IK candidates share one pose cost; no early bend-direction filters.
const jointHistory = [null, null, null, null];
function drawLimbSegments(root, joint, tip, color) {
    line(root, joint, color, 6);
    line(joint, tip, color, 5);
    circle(joint.x, joint.y, 3.5, '#f3f0e7');
    circle(tip.x, tip.y, 4, color === '#c39037' ? color : '#2f5d46');
}
function limbJoint(root, tip, index, previous = null) {
    const half = LIMB_LENGTHS[index] / 2;
    const d = distance(root, tip);
    const outward = index % 2 ? 1 : -1;
    const mid = { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 };
    const bend = Math.sqrt(Math.max(0, half * half - d * d / 4));
    // Coincident endpoints have a circle of valid joints, evaluated by the same cost.
    const candidates = d < 1e-9
        ? Array.from({length:16}, (_, k) => ({
            x: root.x + outward * half * Math.cos(k * Math.PI / 8),
            y: root.y + half * Math.sin(k * Math.PI / 8)
        }))
        : [-1, 1].map(side => ({
            x: mid.x - (tip.y-root.y) / d * bend * side,
            y: mid.y + (tip.x-root.x) / d * bend * side
        }));
    return candidates.map(joint => ({joint, value:jointPoseEvaluation(root,tip,index,joint,previous)}))
        .sort((a,b) => comparePoseEvaluation(a.value,b.value) || a.joint.y-b.joint.y)[0].joint;
}

// Shared by IK branch selection and the settled body's position search.
function jointPoseEvaluation(root, tip, index, joint, previous = null) {
    const outward = index % 2 ? 1 : -1;
    const left = root.x - (index % 2 ? TORSO.width : 0);
    const top = root.y - (index < 2 ? 0 : TORSO.height);
    const overlap = Math.max(0, Math.min(joint.x-left, left+TORSO.width-joint.x,
        joint.y-top, top+TORSO.height-joint.y));
    const spread = outward * (joint.x-root.x);
    const raisedElbow = index < 2 && tip.y >= root.y ? Math.max(0, root.y-joint.y) : 0;
    const loweredKnee = index >= 2 ? Math.max(0, joint.y-tip.y) : 0;
    const continuity = previous ? distance(joint, {x:root.x+previous.x,y:root.y+previous.y}) : 0;
    const weights = POSE_CONFIG.jointWeights;
    return {
        kneeViolations: loweredKnee > 1 ? 1 : 0,
        violations: [overlap, -spread, raisedElbow, loweredKnee].filter(v=>v>1).length,
        cost: weights.overlap * overlap + weights.inward * Math.max(0, -spread)
            - weights.spread * spread + weights.lowHand * raisedElbow
            + weights.kneeBelowFoot * loweredKnee + weights.continuity * continuity
    };
}
// The same lexicographic priorities apply to branches and whole-body candidates.
// Additive per-limb metrics mean independent branch minima also minimize the
// combined pose; no potentially better upper-knee branch is discarded by cost alone.
function comparePoseEvaluation(a, b) {
    return a.kneeViolations-b.kneeViolations || a.violations-b.violations || a.cost-b.cost;
}
function bodyPoseEvaluation(position, contacts) {
    return contacts.reduce((total, tip, index) => {
        const root = limbRoot(position, index);
        const result = jointPoseEvaluation(root, tip, index, limbJoint(root, tip, index));
        return {kneeViolations:total.kneeViolations+result.kneeViolations,
            violations:total.violations+result.violations, cost:total.cost+result.cost};
    }, {kneeViolations:0,violations:0,cost:0});
}
function settledBodyPosition(origin, contacts) {
    if (contacts.length !== 4 || !contacts.every((h,i)=>h && limbReachable(origin,h,i)))
        return {...origin};
    let best = {...origin}, bestValue = bodyPoseEvaluation(origin,contacts);
    const consider = target => {
        target = {x:clamp(target.x,25,W-25),y:clamp(target.y,80,HEIGHT-40)};
        const fraction = Math.min(supportMotionFraction(origin,target,[0,1],contacts),
            supportMotionFraction(origin,target,[2,3],contacts));
        const p = {x:origin.x+(target.x-origin.x)*fraction,
            y:origin.y+(target.y-origin.y)*fraction};
        if (!contacts.every((h,i)=>limbReachable(p,h,i))) return;
        const value = bodyPoseEvaluation(p,contacts);
        // A slight displacement cost breaks near-ties in favour of less movement.
        value.cost += distance(origin,p)*.05;
        if (comparePoseEvaluation({...value,cost:value.cost+.05},bestValue) < 0) {
            best=p; bestValue=value;
        }
    };
    // Sample the reachable region, then refine around its best point. Every
    // candidate's entire straight transition is checked from the original pose.
    for (const radius of [4,8,16,32,64,128,220])
        for (let i=0;i<32;i++) consider({x:origin.x+radius*Math.cos(i*Math.PI/16),
            y:origin.y+radius*Math.sin(i*Math.PI/16)});
    for (const radius of [8,4,2,.5]) {
        const center=best;
        for (let i=0;i<16;i++) consider({x:center.x+radius*Math.cos(i*Math.PI/8),
            y:center.y+radius*Math.sin(i*Math.PI/8)});
    }
    return best;
}

// Free limbs hang under gravity; animation affects only drawing, not grip selection.
function danglingTip(p, index, time) {
    const root = limbRoot(p, index);
    const angle = Math.sin(time * 2.4 + index * 1.7) * 0.045;
    const length = LIMB_LENGTHS[index] * 0.98;

    return {
        x: root.x + Math.sin(angle) * length,
        y: root.y + Math.cos(angle) * length
    };
}

function drawPath() {
    if (!debugMode && state !== 'won')
        return;

    ctx.save();

    if (debugMode) {
        ctx.setLineDash([6, 5]);

        for (let i = 1; i < route.length; i++) {
            const a = route[i - 1];
            const b = route[i];

            if (
                Math.max(a.y, b.y) < camera - 24 ||
                Math.min(a.y, b.y) > camera + H + 24
            )
                continue;

            line(
                a,
                b,
                '#527faa9c',
                state === 'won' ? 5 : 2
            );

            // Arrowheads indicate the direction of travel, including lateral turns.
            const angle = Math.atan2(
                b.y - a.y,
                b.x - a.x
            );

            const mid = {
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2
            };

            ctx.setLineDash([]);

            for (const offset of [-.55, .55]) {
                line(
                    mid,
                    {
                        x: mid.x - 7 * Math.cos(angle + offset),
                        y: mid.y - 7 * Math.sin(angle + offset)
                    },
                    '#527faa9c',
                    1.5
                );
            }

            ctx.setLineDash([6, 5]);
        }

        ctx.setLineDash([]);
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        route.forEach((p, i) => {
            if (
                p.y < camera - 24 ||
                p.y > camera + H + 24
            )
                return;

            ctx.lineWidth = 1.5;

            circle(
                p.x,
                p.y,
                4,
                '#f3f0e7',
                '#527faa'
            );

            const labelX =
                p.x > W - 65
                    ? p.x - 20
                    : p.x + 20;

            circle(
                labelX,
                p.y,
                11,
                '#eef3f7ee'
            );

            ctx.fillStyle = '#527faa';
            ctx.fillText(
                String(i),
                labelX,
                p.y
            );
        });
    }

    if (
        state === 'won' &&
        playerPath.length > 1
    ) {
        ctx.font = 'bold 10px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.setLineDash([6, 5]);

        for (
            let i = 1;
            i < playerPath.length;
            i++
        ) {
            const a = playerPath[i - 1];
            const b = playerPath[i];

            line(
                a,
                b,
                '#d14479',
                2
            );

            const angle = Math.atan2(
                b.y - a.y,
                b.x - a.x
            );

            const mid = {
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2
            };

            ctx.setLineDash([]);

            for (const offset of [-.55, .55]) {
                line(
                    mid,
                    {
                        x: mid.x - 7 * Math.cos(angle + offset),
                        y: mid.y - 7 * Math.sin(angle + offset)
                    },
                    '#d14479',
                    1.5
                );
            }

            ctx.setLineDash([6, 5]);
        }

        ctx.setLineDash([]);

        playerPath.forEach((p, i) => {
            circle(
                p.x,
                p.y,
                3,
                '#f3f0e7',
                '#d14479'
            );

            // Put actual move numbers opposite the planned move numbers.
            const x =
                p.x > W - 65
                    ? p.x + 20
                    : p.x - 20;

            circle(
                x,
                p.y,
                11,
                '#fff0f5ee'
            );

            ctx.fillStyle = '#d14479';
            ctx.textAlign = 'center';

            ctx.fillText(
                String(i),
                x,
                p.y
            );
        });

        const end =
            playerPath[playerPath.length - 1];

        ctx.fillStyle = '#d14479';
        ctx.textAlign = 'left';

        ctx.fillText(
            '実際のルート',
            clamp(
                end.x + 30,
                10,
                W - 90
            ),
            end.y - 16
        );
    }

    ctx.restore();
}

// Presentation state only: never writes body, grips, committed or playerPath.
let characterAnimation = null;
function resetCharacterAnimation() { characterAnimation=null; }
// Opening-only crouch, with all four holds unchanged throughout the descent.
function startInitialPose() {
    const target={x:body.x,y:HEIGHT-40};
    const fraction=Math.min(supportMotionFraction(body,target,[0,1],grips),
        supportMotionFraction(body,target,[2,3],grips));
    const lowest={x:body.x,y:body.y+(target.y-body.y)*fraction};
    characterAnimation={kind:'settle',start:performance.now(),origin:lowest,target:lowest};
}
function startPoseSettle() {
    const target = settledBodyPosition(body, grips);
    characterAnimation={kind:'settle',start:performance.now(),origin:{...body},target};
}
function startGoalHang() {
    const legAngles=[2,3].map(i=>{
        const root=limbRoot(body,i), tip=grips[i], joint=limbJoint(root,tip,i,jointHistory[i]);
        return [Math.atan2(joint.x-root.x,joint.y-root.y),Math.atan2(tip.x-joint.x,tip.y-joint.y)];
    });
    characterAnimation={kind:'hang',start:performance.now(),origin:{x:body.x,y:body.y},
        contacts:grips.map(h=>({x:h.x,y:h.y})),goal:{x:grips[0].x,y:grips[0].y},legAngles};
}
function startFall() {
    const now=performance.now(),visible=characterPose(now);
    const contacts=visible.contacts.map((h,i)=>({...(h || danglingTip(visible.body,i,now/1000))}));
    const joints=contacts.map((h,i)=>visible.joints?.[i] ||
        limbJoint(limbRoot(visible.body,i),h,i,jointHistory[i]));
    const top=Math.min(visible.body.y-TORSO.height/2-25,...contacts.map(h=>h.y),...joints.map(j=>j.y));
    characterAnimation={kind:'fall',start:now,origin:{...visible.body},contacts,joints,
        camera,maxDrop:Math.max(0,camera+H+FALL_CONFIG.clearance-top)};
}
function characterPose(now) {
    const pose={body:{x:body.x,y:body.y},contacts:grips,angle:0,pivot:null};
    const a=characterAnimation;
    if(!a)return pose;
    const elapsed=Math.max(0,now-a.start);
    if(a.kind==='settle') {
        const t=clamp(elapsed/240,0,1);
        const ease=1-Math.pow(1-t,3);
        pose.body={x:a.origin.x+(a.target.x-a.origin.x)*ease,
            y:a.origin.y+(a.target.y-a.origin.y)*ease};
    } else if(a.kind==='fall') {
        const drop=Math.min(a.maxDrop,FALL_CONFIG.gravity*(elapsed/1000)**2/2);
        pose.body={x:a.origin.x,y:a.origin.y+drop};
        pose.contacts=a.contacts.map(h=>({x:h.x,y:h.y+drop}));
        pose.joints=a.joints.map(j=>({x:j.x,y:j.y+drop}));
    } else {
        const t=clamp(elapsed/650,0,1),ease=t*t*(3-2*t);
        const seconds=elapsed/1000, damping=Math.exp(-seconds/6);
        const swing=Math.sin(seconds*2.4)*.03*damping;
        const suspension=Math.sqrt(LIMB_LENGTHS[0]**2-(TORSO.width/2+3)**2)-.15;
        const target={x:a.goal.x+Math.sin(swing)*suspension,
            y:a.goal.y+TORSO.height/2+Math.cos(swing)*suspension};
        pose.body={x:a.origin.x+(target.x-a.origin.x)*ease,y:a.origin.y+(target.y-a.origin.y)*ease};
        pose.contacts=[a.goal,a.goal,null,null];
        pose.joints=[null,null,null,null];
        const blendAngle=(from,to)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*ease;
        for(const i of [2,3]) {
            const side=i===2?-1:1, root=limbRoot(pose.body,i), half=LIMB_LENGTHS[i]/2;
            // Motion propagates from the hip through the knee with a phase delay.
            const thigh=blendAngle(a.legAngles[i-2][0],side*.05+Math.sin(seconds*2.4-.35)*.14*damping);
            const calf=blendAngle(a.legAngles[i-2][1],side*.025+Math.sin(seconds*2.4-.8)*.22*damping);
            const knee={x:root.x+Math.sin(thigh)*half,y:root.y+Math.cos(thigh)*half};
            pose.joints[i]=knee;
            pose.contacts[i]={x:knee.x+Math.sin(calf)*half,y:knee.y+Math.cos(calf)*half};
        }
    }
    return pose;
}

function hazardShakeOffset(now) {
    if (hazardShakeStart === null) return 0;
    const t = clamp((now-hazardShakeStart)/HAZARD_CONFIG.shakeDuration,0,1);
    if (t === 1) { hazardShakeStart = null; return 0; }
    return Math.sin(t*Math.PI*6)*(1-t)*HAZARD_CONFIG.shakeAmplitude;
}

function drawHeartPopups(now) {
    heartPopups = heartPopups.filter(popup => now-popup.start < HEART_CONFIG.popupDuration);
    ctx.save();
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c94661';
    ctx.strokeStyle = '#fff9ed';
    ctx.lineWidth = 3;
    for (const popup of heartPopups) {
        const t = clamp((now-popup.start)/HEART_CONFIG.popupDuration,0,1);
        const y = popup.y - HEART_CONFIG.popupRise*t;
        ctx.globalAlpha = 1-t;
        ctx.fillStyle = popup.color || '#c94661';
        ctx.strokeText(popup.text || '+2',popup.x,y);
        ctx.fillText(popup.text || '+2',popup.x,y);
    }
    ctx.restore();
}

function drawJaggedHold(x,y,r,fill,stroke) {
    ctx.beginPath();
    for (let i=0;i<16;i++) {
        const angle=i*Math.PI/8-Math.PI/2;
        const radius=r*(i%2 ? .66 : 1);
        const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;
        if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();
    if (fill) {ctx.fillStyle=fill;ctx.fill();}
    if (stroke) {ctx.strokeStyle=stroke;ctx.stroke();}
}

function drawStageIntro() {
    if (featureHelpOpen || !cameraIntro || state!=='playing') return;
    ctx.save();
    ctx.fillStyle='#f3f0e780';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#253f32';
    ctx.strokeStyle='#fffdf4';
    ctx.lineWidth=6;
    ctx.font='800 40px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    const title=dailyRun ? `DAILY ${dailyRun.date.slice(5).replace('-','/')}` : `STAGE ${String(level).padStart(3,'0')}`;
    ctx.strokeText(title,W/2,H/2);
    ctx.fillText(title,W/2,H/2);
    ctx.restore();
}

function draw(now = 0) {
    if(typeof refreshLives==='function')refreshLives();
    if(state==='life-prompt'){requestAnimationFrame(draw);return;}
    if(state==='ad') {advanceDummyAd(now);requestAnimationFrame(draw);return;}
    if (state === 'choosing' || state === 'editing' || state === 'map' || state === 'daily') {
        if (state === 'map') advanceLevelMap(now);
        if (state === 'daily' || state === 'map') refreshDailyCalendar();
        requestAnimationFrame(draw);
        return;
    }
    advanceCameraIntro(now);
    if(characterAnimation?.kind==='fall')camera=characterAnimation.camera;

    const desired = clamp(
        body.y - H * CAMERA_CONFIG.bodyScreenRatio,
        cameraTop(),
        HEIGHT - H
    );

    // Freeze camera while holding to keep the body directly under the pointer.
    if (
        !cameraIntro &&
        !drag &&
        !bodyTap &&
        !inspecting && !settingsOpen &&
        state === 'playing'
    ) {
        camera +=
            (desired - camera) *
            CAMERA_CONFIG.followRate;
    }

    const ratio = Math.min(
        window.devicePixelRatio || 1,
        RENDER_CONFIG.maxPixelRatio
    );

    if (canvas.width !== W * ratio) {
        canvas.width = W * ratio;
        canvas.height = H * ratio;
    }

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    ctx.fillStyle = '#deddda';
    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    ctx.save();
    ctx.translate(
        0,
        -camera
    );

    drawWallBackground();
    drawGymFloor();
    ctx.lineWidth = 1;

    ctx.fillStyle = '#a6aea0';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'left';

    for (
        let y =
            210 +
            Math.max(
                0,
                Math.floor(
                    (camera - 210) / 200
                )
            ) * 200;
        y <
        Math.min(
            HEIGHT,
            camera + H + 200
        );
        y += 200
    ) {
        ctx.fillText(
            `${((HEIGHT - y) / 100).toFixed(0)} M`,
            12,
            y - 8
        );
    }

    drawPath();

    const visualAnchor =
        drag
            ? drag.anchor
            : null;

    const visualFixed =
        visualAnchor === null
            ? []
            : visualAnchor;

    if (
        drag &&
        visualAnchor !== null
    ) {
        const areas =
            visualFixed.map(i => {
                const root =
                    limbRoot(
                        {
                            x: 0,
                            y: 0
                        },
                        i
                    );

                const support =
                    startGrips[i];

                return {
                    x:
                        support.x -
                        root.x,
                    y:
                        support.y -
                        root.y,
                    r:
                        LIMB_LENGTHS[i]
                };
            });

        ctx.save();

        // The foot cannot rise above the body midpoint.
        const footSupports = visualFixed.filter(i => i >= 2);
        const bodyBottom = footSupports.length
            ? Math.min(...footSupports.map(i => startGrips[i].y))
            : HEIGHT;
        ctx.beginPath();
        ctx.rect(0, 0, W, Math.max(0, bodyBottom));
        ctx.clip();
        for (const p of areas) {
            ctx.beginPath();
            ctx.arc(
                p.x,
                p.y,
                p.r,
                0,
                Math.PI * 2
            );
            ctx.clip();
        }

        // Exclude the bent-high-foot region (lower half of the inner reach disk).
        for (const i of footSupports) {
            const center = { x: startGrips[i].x - limbRoot({x:0,y:0},i).x,
                y: startGrips[i].y - TORSO.height / 2 };
            const radius = LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO;
            ctx.beginPath();
            ctx.rect(0, 0, W, HEIGHT);
            ctx.moveTo(center.x-radius, center.y);
            ctx.lineTo(center.x+radius, center.y);
            ctx.arc(center.x, center.y, radius, 0, Math.PI);
            ctx.closePath();
            ctx.clip('evenodd');
        }

        ctx.fillStyle =
            '#709d7d19';

        ctx.fillRect(
            0,
            0,
            W,
            HEIGHT
        );

        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;

        for (const p of areas) {
            circle(
                p.x,
                p.y,
                p.r,
                null,
                '#7c9c7d90'
            );
        }

        ctx.restore();
    }

    for (const h of holds) {
        // Invisible floor anchors remain available to the existing grip/snap logic.
        if(isFloorStartHold(h))continue;
        if (
            h.y < camera - 30 ||
            h.y > camera + H + 30
        )
            continue;

        const active =
            characterAnimation?.kind!=='fall' && grips.includes(h);

        const gold =
            h.type === 'goal';

        const green =
            h.type === 'start';
        const hazard = h.type === 'hazard';
        const radius = hazard ? HAZARD_CONFIG.radius : gold ? 10 : 8;

        ctx.lineWidth = 1.5;
        // Keep the existing active outline and unloaded-image fallback; contact geometry is unchanged.
        const holdShape = (x,y,r,fill,stroke) => {
            if (hazard) {drawJaggedHold(x,y,r,fill,stroke);return;}
            if (!h.wide) { circle(x,y,r,fill,stroke); return; }
            ctx.beginPath();
            ctx.rect(x-r*2,y-r,r*4,r*2);
            if (fill) { ctx.fillStyle=fill; ctx.fill(); }
            if (stroke) { ctx.strokeStyle=stroke; ctx.stroke(); }
        };

        if (active) {
            holdShape(
                h.x,
                h.y,
                hazard ? 11 : gold ? 18 : h.wide ? 17 : 14,
                hazard ? '#a34bd220' : '#70987920',
                gold
                    ? '#cfaa48'
                    : hazard ? '#a34bd2' : '#84a78c'
            );
        }

        const spriteDrawn = hazard ? drawHazardHoldSprite(h) :
            gold ? drawGoalHoldSprite(h) :
            h.wide ? drawWideHoldSprite(h) : !green && drawHoldSprite(h);
        if (!spriteDrawn) {
            holdShape(
                h.x,
                h.y + 2,
                radius,
                '#293c3020'
            );

            holdShape(
                h.x,
                h.y,
                radius,
                hazard
                    ? '#9442be'
                    : gold
                    ? '#e4be58'
                    : green
                        ? '#7ca486'
                        : active
                            ? '#75927b'
                            : '#b2b6aa'
            );

            (hazard ? circle : holdShape)(
                h.x - 2,
                h.y - 2,
                2,
                '#ffffff70'
            );
        }

        if(gold)drawGoalSparkles(h,now);
        if (gold || (green && h.wide)) {
            ctx.fillStyle = gold ? '#9e7b2c' : '#526659';

            ctx.font =
                'bold 10px system-ui';

            ctx.textAlign =
                'center';

            ctx.fillText(
                gold ? 'GOAL' : 'START',
                h.x,
                h.y - 23
            );
        }
    }

    // Vector heart avoids relying on an emoji font on each device.
    for (const heart of hearts) {
        if (heart.collected || heart.y < camera-20 || heart.y > camera+H+20) continue;
        const x=heart.x, y=heart.y, r=HEART_CONFIG.radius;
        ctx.beginPath();
        ctx.moveTo(x,y+r);
        ctx.bezierCurveTo(x-r*2,y, x-r,y-r*1.5, x,y-r*.5);
        ctx.bezierCurveTo(x+r,y-r*1.5, x+r*2,y, x,y+r);
        ctx.closePath();
        ctx.fillStyle='#d85869'; ctx.fill();
        ctx.strokeStyle='#fff6ed'; ctx.lineWidth=2; ctx.stroke();
    }

    const visual=characterPose(performance.now());
    ctx.save();
    if(visual.pivot) {
        ctx.translate(visual.pivot.x,visual.pivot.y);
        ctx.rotate(visual.angle);
        ctx.translate(-visual.pivot.x,-visual.pivot.y);
    }
    ctx.lineCap = 'round';

    const animationTime =
        performance.now() / 1000;

    visual.contacts.forEach((grip, i) => {
        const moving =
            drag &&
            drag.anchor !== null &&
            !visualFixed.includes(i);

        const h =
            grip ||
            danglingTip(
                visual.body,
                i,
                animationTime
            );

        const root =
            limbRoot(
                visual.body,
                i
            );

        // Both segments retain their original lengths.
        const joint = visual.joints?.[i] ||
            limbJoint(
                root,
                h,
                i,
                jointHistory[i]
            );
        jointHistory[i] = { x: joint.x - root.x, y: joint.y - root.y };

        const color =
            moving
                ? '#c39037'
                : PLAYER_OUTLINE_COLOR;

        drawLimbSegments(root, joint, h, color);
    });

    ctx.save();
    ctx.translate(hazardShakeOffset(performance.now()),0);
    const left =
        visual.body.x -
        TORSO.width / 2;

    const top =
        visual.body.y -
        TORSO.height / 2;

    line(
        {
            x: visual.body.x,
            y: top
        },
        {
            x: visual.body.x,
            y: top - 9
        },
        PLAYER_OUTLINE_COLOR,
        5
    );

    circle(
        visual.body.x,
        top - 13,
        10,
        typeof playerHeadColor==='undefined' ? '#e0b99b' : playerHeadColor
    );
    drawSoftPlayerOutline();

    const pressOffset=bodyTap ? 3 : 0;

    drawBodyFill(left,top+pressOffset,TORSO.width,TORSO.height,!!bodyTap);

    ctx.beginPath();
    ctx.rect(left,top+pressOffset,TORSO.width,TORSO.height);
    drawSoftPlayerOutline();

    for (
        let i = 0;
        i < 4;
        i++
    ) {
        const root =
            limbRoot(
                visual.body,
                i
            );

        circle(
            root.x,
            root.y,
            2.5,
            drag &&
            drag.anchor !== null &&
            !visualFixed.includes(i)
                ? '#c39037'
                : '#d9e9db'
        );
    }

    for (const x of [-4, 4]) {
        for (const y of [-6, 0, 6]) {
            circle(
                visual.body.x + x,
                visual.body.y + y + pressOffset,
                1.3,
                '#d9e9db'
            );
        }
    }

    ctx.restore();
    ctx.restore();
    drawDebugHoldNumbers();
    drawAnchorRings(now);
    drawHeartPopups(performance.now());
    ctx.restore();
    drawStageIntro();

    requestAnimationFrame(draw);
}
