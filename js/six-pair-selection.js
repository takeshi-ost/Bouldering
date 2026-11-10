'use strict';
// Adaptive six-pair selector. Route generation retains its recorded baseline input model.
const SixPairSelection = (() => {
    const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
    // Stable diagnostic identifiers; localized UI names belong to the catalogs.
    const labels=['both-feet','right-hand-right-foot','right-hand-left-foot','left-hand-right-foot','left-hand-left-foot','both-hands'];
    const tau=Math.PI*2;
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
    const N=3600, step=tau/N;
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
    // Screen directions for MOVING limbs (pair stores the complementary anchors).
    const preferredAngles=[Math.PI/2,0,3*Math.PI/4,Math.PI/4,Math.PI,-Math.PI/2];
    function finish(job) {
        const counts=Array(6).fill(0),sx=Array(6).fill(0),sy=Array(6).fill(0),origin=job.direction-Math.PI;
        job.samples.forEach((index,i)=>{const a=origin+(i+.5)*step;counts[index]++;sx[index]+=Math.cos(a);sy[index]+=Math.sin(a);});
        const missing=counts.map((n,i)=>n? -1:i).filter(i=>i>=0),remaining=tau-6*Math.PI/5;
        const targets=counts.map((n,index)=>{
            if(!n)return wrap(preferredAngles[index]);
            if(Math.hypot(sx[index],sy[index])/n>=1e-6)return wrap(Math.atan2(sy[index],sx[index]));
            // A directionless circular average uses the longest natural run.
            // Ties choose the smallest screen angle, independent of scan origin.
            let bestLength=-1,bestAngle=Infinity;
            for(let i=0;i<N;i++)if(job.samples[i]===index&&job.samples[(i+N-1)%N]!==index){
                let length=1;while(length<N&&job.samples[(i+length)%N]===index)length++;
                const angle=wrap(origin+(i+length/2)*step);
                if(length>bestLength||length===bestLength&&angle<bestAngle){bestLength=length;bestAngle=angle;}
            }
            return Number.isFinite(bestAngle)?bestAngle:wrap(preferredAngles[index]);
        });
        const total=counts.reduce((sum,n)=>sum+n,0);
        const widths=counts.map(n=>Math.PI/5+remaining*(total?n/total:1/6));
        const delta=a=>wrap(a+Math.PI)-Math.PI;
        let best=null;
        function evaluate(order){
            let cursor=0;const offsets=order.map(i=>{const mid=cursor+widths[i]/2;cursor+=widths[i];return mid;});
            const breaks=[0,tau,...order.map((i,j)=>wrap(targets[i]-offsets[j]+Math.PI))].sort((a,b)=>a-b);
            for(let q=0;q<breaks.length-1;q++){
                const lo=breaks[q],hi=breaks[q+1],mid=(lo+hi)/2;
                const desired=order.map((i,j)=>mid-delta(mid+offsets[j]-targets[i]));
                const rotation=Math.max(lo,Math.min(hi,desired.reduce((a,b)=>a+b,0)/6));
                const cost=order.reduce((sum,i,j)=>sum+delta(rotation+offsets[j]-targets[i])**2,0);
                if(!best||cost<best.cost-1e-12){best={order:[...order],rotation:wrap(rotation),cost};}
            }
        }
        // Fix pair 0 first to remove equivalent circular permutations (5! =120).
        function permute(order,left){if(!left.length){evaluate(order);return;}for(const i of left)permute([...order,i],left.filter(j=>j!==i));}
        permute([0],[1,2,3,4,5]);
        let cursor=0;const sectors=best.order.map((index,j)=>{
            const width=j===5?tau-cursor:widths[index],start=wrap(best.rotation+cursor);cursor+=width;
            return {start,width,index,pair:[...pairs[index]],moving:labels[index],preferredAngle:targets[index],natural:counts[index]>0};
        });
        return {...job,sectors,protectedSectors:[],missing,k:6-missing.length,counts,targets,rotation:best.rotation,placementCost:best.cost,iterations:120};
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
    function reservation(map,a) {
        const local=wrap(a-map.rotation);let end=0;
        for(let i=0;i<map.sectors.length;i++){end+=map.sectors[i].width;if(local<end||i===map.sectors.length-1)return map.sectors[i];}
    }
    function directionSamples() {
        const map=plan(),start=map.direction-Math.PI;
        return {start,sectors:SixPairSelection.enabled?map.sectors.map(s=>({...s})):null,indices:map.samples.map((baseline,i)=>
            SixPairSelection.enabled?reservation(map,wrap(start+i*step)).index:baseline)};
    }
    function select(dx,dy) {
        if(Math.hypot(dx,dy)<1e-12)return selectAnchorBaseline(dx,dy);
        const a=wrap(Math.atan2(dy,dx)),map=plan();
        // Exact half-open sectors tile the circle; never fall back between samples.
        const sector=reservation(map,a);
        return sector?[...sector.pair]:selectAnchorBaseline(dx,dy);
    }
    return {enabled:true,get useBaseline(){return baselineDepth>0;},withBaseline,withCurrent,plan,prepare,select,directionSamples,pairs,labels,clear:()=>{cached=null;pending=null;ticket++;}};
})();
