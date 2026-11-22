'use strict';

// One screen-space burst, independent of camera, score, rewards, and game drawing.
let goalCelebration = null;
const GOAL_PAPER_COLORS = [
    ['#ffcc60', '#d48937'], ['#f69894', '#bc5368'], ['#90decc', '#3f948a'],
    ['#8fcbf4', '#4f7eb8'], ['#d3b8f6', '#8968bd'], ['#fff4cd', '#ded69a'],
];
function stopGoalCelebration() {
    const burst=goalCelebration;
    if(!burst)return;
    goalCelebration=null;
    cancelAnimationFrame(burst.frame);
    burst.canvas.hidden=true;
}
function startGoalCelebration(overlay) {
    stopGoalCelebration();
    if(!overlay.open || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const canvas=overlay.querySelector('#goalCelebration');
    const ctx=canvas?.getContext?.('2d');
    if(!ctx)return;
    const width=overlay.clientWidth, height=overlay.clientHeight;
    if(!width || !height)return;
    const dpr=Math.min(2, Math.max(1,window.devicePixelRatio||1));
    canvas.width=Math.round(width*dpr);
    canvas.height=Math.round(height*dpr);
    ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    const particles=[];
    // Local random stream: adding a visual effect cannot change subsequent game RNG.
    let seed=(performance.now()*1000)>>>0;
    function between(min,max) {
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        return min+(max-min)*(seed/4294967296);
    }
    for(const side of [-1,1]){
        for(let i=0;i<38;i++){
            const star=i<10;
            particles.push({
                side, star,
                x:side===1?between(.012,.035):between(.965,.988),
                y:between(.86,.91),
                spread:between(.028,i%4===0?.36:.2),
                rise:star?between(.13,.7):between(.19,.68),
                delay:between(0,star?.045:.11),
                ascent:star?between(.34,.54):between(.46,.72),
                life:star?between(.48,.75):between(1.58,2.38),
                size:star?between(4,10):between(3,6.5),
                angle:between(0,Math.PI*2),
                spin:between(-5,5),
                frequency:between(9,19),
                sway:between(4,18),
                color:star?(i%3===0?'#fff9dd':'#ffd467'):GOAL_PAPER_COLORS[(i+(side===1?0:3))%6],
            });
        }
    }
    const burst=goalCelebration={canvas, frame:0, start:performance.now()};
    canvas.hidden=false;
    function animate(now) {
        if(goalCelebration!==burst)return;
        if(overlay.hidden || !overlay.open){ stopGoalCelebration(); return; }
        const elapsed=(now-burst.start)/1000;
        ctx.clearRect(0,0,width,height);
        let active=false;
        for(const p of particles){
            const t=elapsed-p.delay;
            if(t>=p.life)continue;
            active=true;
            if(t<0)continue;
            const up=Math.min(t/p.ascent,1), down=Math.max(0,(t-p.ascent)/(p.life-p.ascent));
            const flight=1-(1-up)**2;
            const flutter=Math.cos(p.angle+t*p.frequency);
            const x=width*(p.x+p.side*p.spread*(1-Math.exp(-5*t)))+
                (p.star?0:Math.sin(p.angle+t*5)*p.sway*Math.min(1,t));
            const y=height*(p.y-p.rise*flight+(p.rise+.07)*down**1.4*(p.star?.08:1));
            ctx.save();
            ctx.translate(x,y);
            ctx.rotate(p.angle+p.spin*t+(p.star?0:Math.sin(t*5+p.angle)*.5));
            const fadeOut=Math.min(1,(p.life-t)/(p.star?.29:.34));
            ctx.globalAlpha=fadeOut*(p.star?Math.min(1,.65+t*10):.94);
            if(p.star){
                ctx.fillStyle=p.color;
                ctx.strokeStyle='#c7833c';
                ctx.lineWidth=1;
                ctx.lineJoin='round';
                ctx.beginPath();
                for(let i=0;i<10;i++){
                    const angle=i*Math.PI/5-Math.PI/2, r=p.size*(i%2?.48:1);
                    if(i===0)ctx.moveTo(Math.cos(angle)*r,Math.sin(angle)*r);
                    else ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                // Alternating paper face and foreshortening suggest a tumble, with no 3D canvas.
                ctx.scale(.18+Math.abs(flutter)*.82,1);
                ctx.fillStyle=p.color[flutter<0?1:0];
                ctx.fillRect(-p.size/2,-p.size*.84,p.size,p.size*1.68);
            }
            ctx.restore();
        }
        if(active)burst.frame=requestAnimationFrame(animate);
        else stopGoalCelebration();
    }
    burst.frame=requestAnimationFrame(animate);
}
