'use strict';
// Adaptive six-pair selector. Route generation retains its recorded baseline input model.
const SixPairSelection = (() => {
    const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
    // Stable diagnostic identifiers; localized UI names belong to the catalogs.
    const labels=['both-feet','right-hand-right-foot','right-hand-left-foot','left-hand-right-foot','left-hand-left-foot','both-hands'];
    const tau=Math.PI*2,width=Math.PI/9;
    let cached=null,baselineDepth=0;
    function withBaseline(fn){baselineDepth++;try{return fn();}finally{baselineDepth--;}}
    function withCurrent(fn){const saved=baselineDepth;baselineDepth=0;try{return fn();}finally{baselineDepth=saved;}}
    const wrap=a=>(a%tau+tau)%tau;
    function forward() {
        let nearest=Infinity,result=-Math.PI/2;
        for(let i=1;i<route.length;i++) {
            const a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
            if(len2<1e-9)continue;
            const t=Math.max(0,Math.min(1,((committed.x-a.x)*dx+(committed.y-a.y)*dy)/len2));
            const d=(committed.x-a.x-t*dx)**2+(committed.y-a.y-t*dy)**2;
            if(d<nearest){nearest=d;result=Math.atan2(dy,dx);}
        }
        return result;
    }
    const N=3600, span=200, step=tau/N;
    let pending=null, ticket=0;
    function same(snapshot) {return snapshot && snapshot.HEIGHT===HEIGHT && snapshot.holds===holds && snapshot.route===route && snapshot.x===committed.x && snapshot.y===committed.y && snapshot.grips.every((h,i)=>h===startGrips[i]);}
    function snapshot() {return {holds,route,HEIGHT,x:committed.x,y:committed.y,grips:[...startGrips],direction:forward(),samples:[],goal:[]};}
    function scan(job,count=N) {
        const saved={committed,startGrips,holds,route,HEIGHT};
        try {
            committed={x:job.x,y:job.y};startGrips=job.grips;holds=job.holds;route=job.route;HEIGHT=job.HEIGHT;
            const end=Math.min(N,job.samples.length+count);
            while(job.samples.length<end) {
                const i=job.samples.length,a=job.direction-Math.PI+i*step,ux=Math.cos(a),uy=Math.sin(a),pair=selectAnchorBaseline(ux,uy);
                job.samples.push(pairs.findIndex(p=>p[0]===pair[0]&&p[1]===pair[1]));
                job.goal.push(Number.isFinite(goalSupportDistance(pair,ux,uy,supportPairReach(pair,ux,uy))));
            }
        } finally {({committed,startGrips,holds,route,HEIGHT}=saved);}
    }
    function finish(job) {
        // k means baseline pairs with a continuous >=20-degree witness wholly
        // inside the FINAL retained region. It does not count injected pairs.
        function natural(k) {
            const retainedCells=1440+360*k,lo=(N-retainedCells)/2,hi=lo+retainedCells;
            const found=[];
            for(let index=0;index<6;index++) {
                let run=0,best=-1,bestCost=Infinity;
                for(let i=lo;i<=(k===6?N+span:hi);i++) {
                    run=job.samples[i%N]===index?run+1:0;
                    if(run<span+1)continue;
                    const start=(i-span)%N,cost=Math.abs(Math.atan2(Math.sin((start+span/2)*step-Math.PI),Math.cos((start+span/2)*step-Math.PI)));
                    if(cost<bestCost){best=start;bestCost=cost;}
                }
                if(best>=0)found.push({start:wrap(job.direction-Math.PI+best*step),width:span*step,pair:[...pairs[index]],index,moving:labels[index]});
            }
            return found;
        }
        // F(k) is monotone: wider retained regions cannot remove a witness.
        // Starting at 6 gives a nonincreasing sequence in {0,...,6}, terminating
        // at the greatest fixed point in at most seven evaluations.
        let k=6,protectedSectors,iterations=0;
        for(;;) {
            protectedSectors=natural(k);iterations++;
            const next=protectedSectors.length;
            if(next===k)break;
            k=next;
        }
        const retainedWidth=(144+36*k)*Math.PI/180;
        const missing=pairs.map((_,i)=>i).filter(i=>!protectedSectors.some(s=>s.index===i));
        const sectors=missing.map((index,j)=>({start:wrap(job.direction+retainedWidth/2+j*Math.PI/5),width:Math.PI/5,pair:[...pairs[index]],index,moving:labels[index]}));
        return {...job,protectedSectors,sectors,missing,conflict:[],k,retainedWidth,iterations};
    }
    function plan() {
        if(same(cached))return cached;
        const job=same(pending)?pending:snapshot();
        ticket++;pending=null; // A synchronous completion supersedes scheduled chunks.
        // Rare first-touch/rapid-repeat fallback: finish outstanding work once,
        // never silently revert to old selection while the map is incomplete.
        scan(job);cached=finish(job);return cached;
    }
    function prepare() {
        if(!committed || !startGrips?.every(Boolean) || same(cached) || same(pending))return;
        const job=snapshot(),id=++ticket;pending=job;
        const next=()=>{
            if(id!==ticket || same(cached))return;
            scan(job,120);
            if(job.samples.length===N){cached=finish(job);if(pending===job)pending=null;}
            else setTimeout(next,0);
        };
        setTimeout(next,0);
    }
    function reservation(map,a) {return [...map.protectedSectors,...map.sectors].find(s=>wrap(a-s.start)<s.width-1e-12);}
    function directionSamples() {
        const map=plan(),start=map.direction-Math.PI;
        return {start,indices:map.samples.map((baseline,i)=>{
            const angle=start+i*step,a=wrap(Math.atan2(Math.sin(angle),Math.cos(angle)));
            return (SixPairSelection.enabled?reservation(map,a)?.index:undefined)??baseline;
        })};
    }
    function select(dx,dy) {
        if(Math.hypot(dx,dy)<1e-12)return selectAnchorBaseline(dx,dy);
        const a=wrap(Math.atan2(dy,dx)),map=plan();
        // Both kinds of witnesses are authoritative. Sampled natural runs
        // alone cannot prove what baseline does between the sampled directions.
        const sector=reservation(map,a);
        return sector?[...sector.pair]:selectAnchorBaseline(dx,dy);
    }
    return {enabled:true,get useBaseline(){return baselineDepth>0;},withBaseline,withCurrent,plan,prepare,select,directionSamples,pairs,labels,clear:()=>{cached=null;pending=null;ticket++;}};
})();
