'use strict';
// Frozen pre-optimization boundary enumeration as an exact regression oracle.
// Compare entire traces, contacts, action budgets, and cached canonical nodes.
const run=require('./coupled-production-harness.cjs');
run(`
function referenceSupportGeometry(pair,stance) {
    const circles=[],lines=[{axis:'x',v:25},{axis:'x',v:W-25},{axis:'y',v:80},{axis:'y',v:HEIGHT-40}];
    for(const i of pair) {
        const root=limbRoot({x:0,y:0},i),h=stance[i],center={x:h.x-root.x,y:h.y-root.y};
        circles.push({...center,r:LIMB_LENGTHS[i]});
        if(i>=2) {
            circles.push({...center,r:LIMB_LENGTHS[i]*HIGH_FOOT_REACH_RATIO,inner:true});
            lines.push({axis:'y',v:h.y},{axis:'y',v:h.y-root.y});
        }
    }
    return {circles,lines};
}
function referenceBodyStep(from,raw,pair,stance,geometry) {
    const gap=distance(from,raw);
    if(gap<1e-10)return {...from};
    const step=Math.min(COUPLED_BODY_CONFIG.inputStep,gap),desired={x:from.x+(raw.x-from.x)*step/gap,y:from.y+(raw.y-from.y)*step/gap};
    const legal=p=>p.x>=25-1e-8&&p.x<=W-25+1e-8&&p.y>=80-1e-8&&p.y<=HEIGHT-40+1e-8&&
        pair.every(i=>limbReachable(p,stance[i],i))&&supportMotionFraction(from,p,pair,stance)>=1-1e-9;
    if(legal(desired))return desired;
    let best={...from},cost=step*step;
    const consider=p=>{
        if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||distance(from,p)>step+1e-7)return;
        const next=(p.x-desired.x)**2+(p.y-desired.y)**2;
        if(next<cost-1e-12&&legal(p)){cost=next;best=p;}
    };
    const circles=geometry.circles,lines=geometry.lines;
    // The exact first obstruction is always a valid candidate.
    const fraction=supportMotionFraction(from,desired,pair,stance);
    consider({x:from.x+(desired.x-from.x)*fraction,y:from.y+(desired.y-from.y)*fraction});
    for(const line of lines)consider({...desired,[line.axis]:line.v});
    for(let a=0;a<lines.length;a++)for(let b=a+1;b<lines.length;b++)
        if(lines[a].axis!==lines[b].axis)consider({[lines[a].axis]:lines[a].v,[lines[b].axis]:lines[b].v});
    for(let a=0;a<circles.length;a++) {
        const c=circles[a],d=distance(c,desired);
        if(d>1e-12)consider({x:c.x+(desired.x-c.x)*c.r/d,y:c.y+(desired.y-c.y)*c.r/d});
        // A chord between points on a forbidden inner circle cuts through the
        // hole. Its supporting tangent, in contrast, stays outside throughout.
        if(c.inner) {
            const radius=distance(c,from);
            if(radius>=c.r-1e-7&&radius>1e-12) {
                const nx=(from.x-c.x)/radius,ny=(from.y-c.y)/radius,
                    dot=(desired.x-c.x)*nx+(desired.y-c.y)*ny;
                if(dot<c.r)consider({x:desired.x+nx*(c.r-dot),y:desired.y+ny*(c.r-dot)});
            }
        }
        for(const line of lines) {
            const other=line.axis==='x'?'y':'x',v=line.v-c[line.axis],disc=c.r*c.r-v*v;
            if(disc>=-1e-8)for(const sign of [-1,1])consider({[line.axis]:line.v,[other]:c[other]+sign*Math.sqrt(Math.max(0,disc))});
        }
        for(let b=a+1;b<circles.length;b++) {
            const q=circles[b],length=distance(c,q);
            if(length<1e-12||length>c.r+q.r+1e-8||length<Math.abs(c.r-q.r)-1e-8)continue;
            const along=(c.r*c.r-q.r*q.r+length*length)/(2*length),height=Math.sqrt(Math.max(0,c.r*c.r-along*along));
            const ux=(q.x-c.x)/length,uy=(q.y-c.y)/length;
            for(const sign of [-1,1])consider({x:c.x+along*ux-sign*height*uy,y:c.y+along*uy+sign*height*ux});
        }
    }
    return best;
}

const optimizedGeometry=coupledSupportGeometry,optimizedStep=coupledBodyStep;
let seed=281019;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
let cases=0,referenceMs=0,optimizedMs=0;
for(const data of [null,reconstructed]) {
 const f=fixture(data);
 const inputs=[...Array.from({length:120},()=>Array.from({length:1+Math.floor(random()*4)},()=>({dx:(random()-.5)*800,dy:(random()-.5)*800}))),
 [{dx:0,dy:-3000}],[{dx:3000,dy:0}],[{dx:0,dy:3000}],
 [{dx:0,dy:0}],[{dx:.2,dy:-.1}],[{dx:80,dy:-80},{dx:0,dy:0}]];
 for(const pair of pairs)for(const points of inputs) {
  const a=fingerAction(points);
  coupledSupportGeometry=referenceSupportGeometry;coupledBodyStep=referenceBodyStep;
  let begin=Date.now();const before=coupledGestureReplay(f.p,f.stance,a,pair);referenceMs+=Date.now()-begin;
  coupledSupportGeometry=optimizedGeometry;coupledBodyStep=optimizedStep;
  begin=Date.now();const after=coupledGestureReplay(f.p,f.stance,a,pair);optimizedMs+=Date.now()-begin;
  assert.deepEqual(after,before,'exact replay parity case '+cases);cases++;
 }
}
console.log('PASS exact coupled-motion parity '+JSON.stringify({cases,referenceMs,optimizedMs,speedup:referenceMs/optimizedMs}));
`);
