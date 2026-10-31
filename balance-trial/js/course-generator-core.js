'use strict';
// Extracted from Site41 / trial 0.11.8, source be2145d9b9fb6865f3fcb398d533e8c29b28f86f.
// Generation helpers only: no trial boot, URL, UI, storage or network overrides.
// This legacy engine mutates the game geometry globals and temporarily uses
// level 1/2 and difficulty 0; its caller must restore the real run identity.
const LAB_SKELETON_VERSION='0.11.5';
// Only expected finite geometry failures permit deterministic seed retries.
// Keep Error.name unchanged for legacy diagnostic compatibility; use instanceof.
class CourseGeometryRejection extends Error {}
function classifyNativeCourseGeometryRejection(error) {
 const messages=[
  'Guide did not reach selected course height',
  'Two-support final replay failed',
  'Initial route cannot clear its base budget',
  'Initial recipe cannot clear its base budget',
  'Final course cannot clear its actual base budget'
 ];
 if(error?.constructor===Error && messages.includes(error.message))
  return new CourseGeometryRejection(error.message,{cause:error});
 return error;
}
let labSkeletonReport=null,labHeartsCache=null,labStaminaCache=null;
// For nonzero spikes, postpone native unused-hold pruning until the final
// normal-only reference is known. This also applies to sources of a two-part
// course, so their candidates are not lost before the combined search.
const labGenerateSkeletonNative=labGenerateSkeleton;
let labPruningDeferred=false;
labGenerateSkeleton=function(config){
 if(labPruningDeferred||!(config.spikePercent>0))return labGenerateSkeletonNative(config);
 const nativePrune=pruneUnusedHolds;
 labPruningDeferred=true;
 try{
  pruneUnusedHolds=function(){densityStats.routeRemoved=0;updateStageDensity();};
  return labGenerateSkeletonNative(config);
 }finally{pruneUnusedHolds=nativePrune;labPruningDeferred=false;}
};
// BEGIN typed native boundary: no changes to generation choices or draws.
const labGenerateSkeletonUnclassified=labGenerateSkeleton;
labGenerateSkeleton=function(config){
 try{return labGenerateSkeletonUnclassified(config);}
 catch(error){throw classifyNativeCourseGeometryRejection(error);}
};
// END typed native boundary.
// Change unused normal holds after the final normal-only reference search.
// Selected candidates become spikes; the other unused holds are pruned.
// At 0% retain the established no-spike profile generation byte-for-byte.
// Distance is to the body trajectory's line segments, not the original placer guide.
function labPrepareSpikes(config){
 const percent=config.spikePercent??0;
 if(![0,10,20,30].includes(percent))throw Error('Spike scatter must be 0, 10, 20 or 30 percent.');
 if(!Object.prototype.hasOwnProperty.call(config,'spikePercent'))return null;
 const protectedIds=new Set(initialGrips.map(h=>h.id));
 for(const p of route)for(const id of p.grips||[])protectedIds.add(id);
 const distanceToRoute=h=>{
  let best=Infinity;
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
   const t=den?clamp(((h.x-a.x)*dx+(h.y-a.y)*dy)/den,0,1):0;
   best=Math.min(best,Math.hypot(h.x-a.x-t*dx,h.y-a.y-t*dy));
  }
  return best;
 };
 const candidates=holds.filter(h=>h.type==='normal'&&!h.wide&&!protectedIds.has(h.id)).map(h=>({hold:h,distance:distanceToRoute(h)})).sort((a,b)=>a.distance-b.distance||a.hold.id-b.hold.id);
 const count=Math.floor(candidates.length*percent/100),selected=candidates.slice(0,count);
 const beforeHolds=[...holds],beforeRoute=route;
 for(const {hold} of selected)hold.type='hazard';
 if(percent>0){
  const selectedIds=new Set(selected.map(v=>v.hold.id)),previous=holds;
  // Remove the whole unused group first: selectors can depend on pairs of
  // unused holds even when no individual removal preserves the replay.
  holds=holds.filter(h=>h.type!=='normal'||protectedIds.has(h.id)||selectedIds.has(h.id));
  if(!samePairRoute(route,replayRoute(route))){holds=previous;pruneUnusedHolds();}
  updateStageDensity();
 }
 const retainedIds=new Set(holds.map(h=>h.id)),deletedIds=beforeHolds.filter(h=>!retainedIds.has(h.id)).map(h=>h.id);
 const retainedUnselectedIds=candidates.slice(count).filter(v=>retainedIds.has(v.hold.id)).map(v=>v.hold.id);
 const replay=replayRoute(route),unchanged=!!replay&&samePairRoute(route,replay),cost=routeHazardCosts(route).at(-1)||0;
 if(!unchanged||cost!==0){holds=beforeHolds;route=beforeRoute;for(const {hold} of selected)hold.type='normal';throw new CourseGeometryRejection('Spike placement did not preserve the reference route.');}
 if(percent>0){densityStats.hazardCount=selected.length;densityStats.routeRemoved=deletedIds.length;updateStageDensity();}
 const report={percent,candidateCount:candidates.length,count,deletedIds,deletedCount:deletedIds.length,retainedUnselectedIds,
  prunePolicy:percent>0?'nearest-fraction-to-spikes-rest-native-safe-delete':'legacy-zero-percent',rounding:'floor',denominator:'unused-normal-holds',distanceMetric:'minimum-distance-to-reference-body-segments',
  selectedIds:selected.map(v=>v.hold.id),candidates:candidates.map(v=>({id:v.hold.id,distance:v.distance})),protectedIds:[...protectedIds],
  referenceContactsUnchanged:unchanged,referenceHazardCost:cost,placementStage:'after-normal-reference-before-hearts'};
 if(labSkeletonReport){labSkeletonReport.spikes=report;labSkeletonReport.holds=holds.length;if(percent>0&&labSkeletonReport.placement)labSkeletonReport.placement.pruneRemoved=deletedIds.length;}
 return report;
}
// The actual original placer is used, not a parallel grid or a new hold-adder.
// First calibrate with pristine STAGE 1, then override ONLY length/centerline.
function labStraightDirection(seed) {
 // Seed 1 remains the unchanged tutorial reference. Other seeds select the
 // centerline independently of the original placer RNG.
 return seed===1?0:Math.floor(mulberry32(seed ^ 0x72E5A491)()*3)-1;
}
function labCreateOriginalLayout(config) {
 const index={short:0,middle:1,long:2}[config.length];
 if(config.type==='switchback'){if(index===undefined||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Invalid switchback configuration.');return labCreateSwitchbackLayout(config,STAGE_CONFIG.lengthRules[index].height);}
 if(index===undefined||!['straight','meander','branch'].includes(config.type)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Invalid skeleton configuration.');
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse};
 const direction=config.type==='straight'?labStraightDirection(config.seed):0;
 const tutorial=config.type!=='meander' && config.length==='short' && direction===0;
 try {
  stageLengthRule=(n,seed)=>n===1?saved.stageLengthRule(n,seed):STAGE_CONFIG.lengthRules[index];
  if(config.type!=='meander'){
   const rise=STAGE_CONFIG.lengthRules[index].height-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin;
   const dx=direction*180,span=Math.hypot(rise,dx),ux=dx/span,uy=-rise/span;
   makeStageCourse=()=>s=>({x:W/2-dx/2+s*ux,y:s*uy,nx:-uy,ny:ux});
  }
  return generator.generate(tutorial?1:2,false,config.seed,config.seed);
 } finally {stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;}
}
function labReplayPartial(path){
 const saved={committed,startGrips};let stance=[...initialGrips];
 for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>stance[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>stance[i]=sorted[j]);}
 try{
  if(!stance.every((h,i)=>limbReachable(path[0],h,i)))return null;
  const result=[path[0]];
  for(let i=1;i<path.length;i++){
   committed=path[i-1];startGrips=stance;const p=path[i],anchor=selectAnchor(p.x-committed.x,p.y-committed.y);
   if(!supportsReachable(p,anchor)||supportMotionFraction(committed,p,anchor)<1-1e-9)return null;
   stance=attachMoving(p,anchor);
   if(!stance?.every(Boolean)||sameContacts(stance,startGrips))return null;
   result.push({...p,anchor,grips:stance.map(h=>h.id)});
  }
  return result;
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
function labPartialSearch(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false}={}){
 const saved={committed,startGrips};const first=stance||[...initialGrips];
 if(!stance)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>first[i]=sorted[j]);}
 const origin=start||guide[0];let transitions=0,expanded=0,best=null;
 const progress=p=>{let best=Infinity,index=0;guide.forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});return index*100-best;};
 let beam=[{p:origin,stance:first,path:[origin],score:progress(origin)}];const visited=new Set();
 try{
  for(let depth=0;depth<maxMoves&&transitions<limit;depth++){
   const next=[];
   for(const node of beam){
    expanded++;committed=node.p;startGrips=node.stance;
    const candidates=[];
    for(const q of guide)if(distance(node.p,q)<=230)for(const t of [.5,.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
    for(const dx of [-90,-60,-30,0,30,60,90])for(const dy of [-90,-45,0,20,40])candidates.push({x:node.p.x+dx,y:node.p.y+dy});
    for(const p of candidates){
     if(transitions++>=limit)break;
     if(p.x<36||p.x>364||p.y<80||p.y>HEIGHT-40||distance(p,node.p)<5||(forwardOnly&&p.y>origin.y+60+1e-7))continue;
     const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
     if(!supportsReachable(p,anchor)||supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
     const contacts=attachMoving(p,anchor);if(!contacts?.every(Boolean)||sameContacts(contacts,node.stance))continue;
     const key=Math.round(p.x/6)+','+Math.round(p.y/6)+':'+contacts.map(h=>h.id).join(',');if(visited.has(key))continue;visited.add(key);
     const path=[...node.path,{...p,anchor,grips:contacts.map(h=>h.id)}];
     const entry={p,stance:contacts,path,score:progress(p)};
     if(!best||p.y<best.p.y)best=entry;
     if(stop(p,contacts,path))return {path,transitions,expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:false,found:true};
     next.push(entry);
    }
   }
   next.sort((a,b)=>b.score-a.score);beam=next.slice(0,12);if(!beam.length)break;
  }
  return {path:best?.path||null,transitions:Math.min(transitions,limit),expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found:false};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
// Local column choice followed by an edge-concentrated native-contact section.
// Only normal source IDs in the local window are mapped. No new holds/physics.
function labColumnPartialSearch(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false}={}){
 const saved={committed,startGrips};const first=stance||[...initialGrips];
 if(!stance)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>first[i]=sorted[j]);}
 const origin=start||guide[0];let transitions=0,expanded=0,best=null;
 const progress=p=>{let best=Infinity,index=0;guide.forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});return index*100-best;};
 let beam=[{p:origin,stance:first,path:[origin],score:progress(origin)}];const visited=new Set();
 try{
  for(let depth=0;depth<maxMoves&&transitions<limit;depth++){
   const next=[];
   for(const node of beam){
    expanded++;committed=node.p;startGrips=node.stance;
    const candidates=[];
    for(const q of guide)if(distance(node.p,q)<=230)for(const t of [.5,.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
    for(const dx of [-90,-60,-30,0,30,60,90])for(const dy of [-90,-45,0,20,40])candidates.push({x:node.p.x+dx,y:node.p.y+dy});
    for(const p of candidates){
     if(transitions++>=limit)break;
     if(p.x<36||p.x>364||p.y<80||p.y>HEIGHT-40||distance(p,node.p)<5||(forwardOnly&&p.y>origin.y+60+1e-7))continue;
     const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
     if(!supportsReachable(p,anchor)||supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
     const contacts=attachMoving(p,anchor);if(!contacts?.every(Boolean)||sameContacts(contacts,node.stance))continue;
     const key=Math.round(p.x/6)+','+Math.round(p.y/6)+':'+contacts.map(h=>h.id).join(',');if(visited.has(key))continue;visited.add(key);
     const path=[...node.path,{...p,anchor,grips:contacts.map(h=>h.id)}];
     const entry={p,stance:contacts,path,score:progress(p)};
     if(!best||p.y<best.p.y)best=entry;
     if(stop(p,contacts,path))return {path,transitions,expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:false,found:true};
     next.push(entry);
    }
   }
   next.sort((a,b)=>b.score-a.score);beam=next.slice(0,12);if(!beam.length)break;
  }
  return {path:best?.path||null,transitions:Math.min(transitions,limit),expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found:false};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
function labColumnNaturalScatter(points,cap,seed){
 const chosen=[],remaining=[...points].sort((a,b)=>a.id-b.id);
 while(chosen.length<cap&&remaining.length){let best=0,score=-Infinity;remaining.forEach((h,i)=>{const value=chosen.length?Math.min(...chosen.map(q=>distance(h,q))):mulberry32(seed^h.id)();if(value>score){best=i;score=value;}});chosen.push(remaining.splice(best,1)[0]);}
 return chosen.map(h=>h.id);
}
function labColumnSideSearch(primary,solveGuide,column,side,edgeIds,forestBottom,forestTop,band){
 let checkpointIndex=0;primary.forEach((p,i)=>{if(p.y>band.yMax)checkpointIndex=i;});
 const checkpoint=primary[checkpointIndex],initial=[...initialGrips],byId=new Map(holds.map(h=>[h.id,h]));
 if(!checkpointIndex)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>initial[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>initial[i]=sorted[j]);}
 const stance=checkpointIndex?checkpoint.grips.map(id=>byId.get(id)):initial;
 const columnIds=new Set(column.ids),gate={xMin:column.x-48,xMax:column.x+48,yMin:forestTop-60,yMax:forestTop+32};
 const partial=labColumnPartialSearch([checkpoint,{x:column.x,y:forestBottom-36},{x:column.x,y:forestTop-36}],{start:checkpoint,stance,limit:10000,maxMoves:24,stop:(p,c)=>p.x>=gate.xMin&&p.x<=gate.xMax&&p.y>=gate.yMin&&p.y<=gate.yMax&&c.some(h=>columnIds.has(h.id))&&c[0].x<=c[1].x&&c[2].x<=c[3].x});
 const result={side,columnIndex:column.index,found:false,moves:null,path:null,entryIndex:null,checkpointIndex,commonPrefixMoves:checkpointIndex,withinPrimaryBudget:false,contactedColumnIds:[],usedEdgeIds:[],reason:null,gate,search:{limit:10000,maxMoves:24,transitions:partial.transitions,expanded:partial.expanded,limitReached:partial.limitReached,ascentMaxMoves:70}};
 if(!partial.found||partial.limitReached){result.reason=partial.limitReached?'entry-search-limit':'entry-not-found';return result;}
 const entry=partial.path.at(-1),savedInitial=initialGrips;let ascent;
 try{initialGrips=entry.grips.map(id=>byId.get(id));ascent=solveRoute([entry,...solveGuide.filter(p=>p.y<entry.y)],70);}
 finally{initialGrips=savedInitial;}
 if(!ascent){result.reason='goal-not-found';return result;}
 const combined=[...primary.slice(0,checkpointIndex+1),...partial.path.slice(1),...ascent.slice(1)],played=replayRoute(combined);
 if(!played){result.reason='joined-replay-failed';return result;}
 const used=new Set(played.flatMap(p=>p.grips||[]));
 if(!edgeIds.some(id=>used.has(id))){result.reason='edge-section-not-used';return result;}
 result.found=true;result.path=played;result.moves=routeConsumption(played);result.entryIndex=checkpointIndex+partial.path.length-1;result.withinPrimaryBudget=result.moves<=routeStamina(primary);result.contactedColumnIds=column.ids.filter(id=>used.has(id));result.usedEdgeIds=edgeIds.filter(id=>used.has(id));return result;
}
function labColumnOffsets(seed,column,count,spacing){
 const random=mulberry32(seed^0x3C7A91E5^column),start=(random()-.5)*10,end=(random()-.5)*10,bend=(random()<.5?-1:1)*(14+random()*8);
 const weights=Array.from({length:count-1},()=>.65+random()*.7),total=weights.reduce((a,b)=>a+b,0);let sum=0;
 return Array.from({length:count},(_,row)=>{if(row)sum+=weights[row-1];const t=row/(count-1);return {dx:clamp(start*(1-t)+end*t+bend*Math.sin(Math.PI*t)+(random()-.5)*8,-26,26),dy:sum/total*(count-1)*spacing};});
}
function labGenerateBranchSkeleton(config){
 const savedSeed=courseSeed;
 try{
  courseSeed=()=>config.seed;
  const base=labCreateOriginalLayout({...config,type:'straight'});
  level=1;difficulty=0;generatedCourse=null;
  ({holds,route,HEIGHT,initialGrips,densityStats}=base);
  const guide=base.route,source=holds.map(h=>({...h})),rowCount={short:3,middle:4,long:5}[config.length],edgeCount=rowCount,spacing=config.length==='short'?40:52,gap=config.length==='short'?52:64;
  const random=mulberry32(config.seed^0x5B71D3),requestedColumns=random()<.5?3:4,edgeSide=random()<.5?-1:1,edgeX=edgeSide<0?36:W-36;
  const localSpan=(rowCount-1)*spacing+gap+(edgeCount-1)*spacing,forestBottom=Math.min(HEIGHT*.52+localSpan/2,guide[0].y-84),forestTop=forestBottom-(rowCount-1)*spacing,edgeBottom=forestTop-gap,edgeTop=edgeBottom-(edgeCount-1)*spacing;
  const band={xMin:16,xMax:W-16,yMin:edgeTop-24,yMax:forestBottom+24};
  const inside=h=>h.y>=band.yMin&&h.y<=band.yMax;
  const local=holds.filter(h=>h.type==='normal'&&inside(h));
  const columnCount=local.length>=requestedColumns*rowCount+edgeCount?requestedColumns:3,required=columnCount*rowCount+edgeCount;
  if(local.length<required)throw new CourseGeometryRejection('Insufficient source holds for local columns at this seed.');
  // Wide selection sees exactly the original pool before any local mapping.
  assignWideHolds(guide);
  const byId=new Map(holds.map(h=>[h.id,h])),available=[...local].sort((a,b)=>b.y-a.y||a.id-b.id),columns=[],edgeIds=[],mapping=[];
  const mapped=[];let used=0;
  for(let col=0;col<columnCount;col++){
   const nominalX=58+(W-116)*col/(columnCount-1),x=nominalX+(mulberry32(config.seed^0x6E17^col)()-.5)*6,ids=[],offsets=labColumnOffsets(config.seed,col,rowCount,spacing);
   for(let row=0;row<rowCount;row++){
    const original=available[used++],h={...byId.get(original.id),x:x+offsets[row].dx,y:forestBottom-offsets[row].dy+(mulberry32(config.seed^0x44A7^original.id)()-.5)*8};
    if(insideStartTriangle(h,initialGrips))throw new CourseGeometryRejection('Column overlaps the starting stance.');
    mapped.push(h);ids.push(h.id);mapping.push({id:h.id,source:{x:original.x,y:original.y,row:original.row},mapped:{x:h.x,y:h.y},group:'column',column:col,row});
   }
   const ys=mapped.filter(h=>ids.includes(h.id)).map(h=>h.y);columns.push({index:col,x,nominalX,ids,count:ids.length,yMin:Math.min(...ys),yMax:Math.max(...ys),nominalYMin:forestTop,nominalYMax:forestBottom});
  }
  for(let row=0;row<edgeCount;row++){
   const original=available[used++],h={...byId.get(original.id),x:edgeX,y:edgeBottom-row*spacing+(mulberry32(config.seed^0x44A7^original.id)()-.5)*8};
   mapped.push(h);edgeIds.push(h.id);mapping.push({id:h.id,source:{x:original.x,y:original.y,row:original.row},mapped:{x:h.x,y:h.y},group:'edge',row});
  }
  holds=[...holds.filter(h=>h.type!=='normal'||!inside(h)),...mapped].sort((a,b)=>a.id-b.id);
  const protectedBeforeIds=labColumnNaturalScatter(holds.filter(h=>h.type==='normal'&&h.row===null&&h.y>band.yMax),4,config.seed^0x2B45),protectedAfterIds=labColumnNaturalScatter(holds.filter(h=>h.type==='normal'&&h.row===null&&h.y<band.yMin),4,config.seed^0x7C19);
  const protectedIds=new Set([...mapped.map(h=>h.id),...protectedBeforeIds,...protectedAfterIds]),removedIds=available.slice(used).map(h=>h.id),entryY=forestBottom-36,edgeBodyX=edgeX-edgeSide*34;
  const localGuide=[];
  for(let row=0;row<rowCount;row++){
   const t=row/(rowCount-1);localGuide.push({x:guide[0].x+(edgeBodyX-guide[0].x)*t,y:forestBottom-row*spacing-36});
  }
  for(let row=0;row<edgeCount;row++)localGuide.push({x:edgeBodyX,y:edgeBottom-row*spacing-36});
  const solveGuide=[...guide.filter(p=>p.y>entryY),...localGuide,...guide.filter(p=>p.y<edgeTop-36)];
  const solved=solveRoute(solveGuide,70);
  if(!solved)throw new CourseGeometryRejection('No validated column-to-edge route at this seed.');
  route=solved;const before=routeConsumption(route),prePrune=holds.length,nativeSame=samePairRoute;
  try{samePairRoute=(a,b)=>[...protectedIds].every(id=>holds.some(h=>h.id===id))&&nativeSame(a,b);pruneUnusedHolds();}
  finally{samePairRoute=nativeSame;}
  densityStats.fixedSupports=2;route=optimizeRoute(route);finalizeCourseGeneration('basic');
  if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final column contact and stamina validation failed.');
  const usedIds=new Set(route.flatMap(p=>p.grips||[]));
  if(!columns.some(c=>c.ids.some(id=>usedIds.has(id)))||!edgeIds.some(id=>usedIds.has(id)))throw new CourseGeometryRejection('No route using both the column and edge section.');
  const sideSearches=[labColumnSideSearch(route,solveGuide,columns[0],-1,edgeIds,forestBottom,forestTop,band),labColumnSideSearch(route,solveGuide,columns.at(-1),1,edgeIds,forestBottom,forestTop,band)];
  const alternative=sideSearches.filter(s=>s.found&&s.withinPrimaryBudget&&JSON.stringify(s.path.map(p=>[p.x,p.y]))!==JSON.stringify(route.map(p=>[p.x,p.y]))).sort((a,b)=>a.moves-b.moves)[0]||null;
  const edgeYs=holds.filter(h=>edgeIds.includes(h.id)).map(h=>h.y);
  labSkeletonReport={type:'branch',length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:edgeSide<0?'left':'right',routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:alternative?.moves??null,branchRoute:alternative?.path??null,branchDetails:{kind:'local-columns-to-edge',band,requestedColumns,columnCount,rowCount,columns,edge:{side:edgeSide,x:edgeX,ids:edgeIds,count:edgeCount,yMin:Math.min(...edgeYs),yMax:Math.max(...edgeYs),nominalYMin:edgeTop,nominalYMax:edgeBottom},spacing,gap,jitter:{columnXAmplitude:3,holdYAmplitude:4,columnSalt:0x6E17,holdSalt:0x44A7},columnVariation:{kind:'seeded-curved-lanes',laneHalfWidth:26,endpointOffset:5,bendRange:[14,22],holdXNoise:4,gapWeights:[.65,1.35],salt:0x3C7A91E5},protectedIds:[...protectedIds],naturalRetention:{capPerRegion:4,protectedBeforeIds,protectedAfterIds,policy:'seeded-first-then-farthest-native-scatter'},usedColumnIds:columns.flatMap(c=>c.ids.filter(id=>usedIds.has(id))),usedEdgeIds:edgeIds.filter(id=>usedIds.has(id)),sideSearches,minimumRouteProven:false},optimizationAccepted:true,
  placement:{engine:'original-createStageGenerator',placedHolds:source.length,scatteredHolds:source.filter(h=>h.row===null).length,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations,pruneRemoved:prePrune-holds.length,layoutFingerprint:source.map(h=>[h.id,h.x,h.y,h.type,h.row]),mapping,localRemovedIds:removedIds,extraIds:[],coordinatesMapped:true}};
  return labSkeletonReport;
 }finally{courseSeed=savedSeed;}
}

// Contrast uses ONE native scatter pool. Only concentration-band row-null
// coordinates are mapped radially; native start/goal/row supports stay fixed.
function labContrastGuideCenter(guide,y){
 let a=guide[0],b=guide[1];
 if(y<=guide.at(-1).y){a=guide.at(-2);b=guide.at(-1);}
 else for(let i=0;i<guide.length-1;i++)if(y<=guide[i].y&&y>=guide[i+1].y){a=guide[i];b=guide[i+1];break;}
 const t=(y-a.y)/(b.y-a.y||1);return {x:a.x+(b.x-a.x)*t,y};
}
function labContrastSpreadMetrics(points,band,guide,used=null){
 const center=labContrastGuideCenter(guide,(band.yMin+band.yMax)/2),rx=(band.xMax-band.xMin)/2,ry=(band.yMax-band.yMin)/2;
 const a=guide[0],b=guide.at(-1),dx=b.x-a.x,dy=b.y-a.y,span=Math.hypot(dx,dy);
 const inside=p=>p.x>=band.xMin&&p.x<=band.xMax&&p.y>=band.yMin&&p.y<=band.yMax;
 const group=list=>{const xs=list.map(h=>h.x),ys=list.map(h=>h.y),mx=xs.reduce((s,x)=>s+x,0)/(xs.length||1),my=ys.reduce((s,y)=>s+y,0)/(ys.length||1);
  const distances=list.map(h=>Math.abs(dx*(h.y-a.y)-dy*(h.x-a.x))/span).sort((a,b)=>a-b),radii=list.map(h=>Math.hypot((h.x-center.x)/rx,(h.y-center.y)/ry)).sort((a,b)=>a-b),avg=v=>v.reduce((s,x)=>s+x,0)/(v.length||1),q=(v,p)=>v.length?v[Math.floor((v.length-1)*p)]:null;
  return {count:list.length,xSpan:xs.length?Math.max(...xs)-Math.min(...xs):0,ySpan:ys.length?Math.max(...ys)-Math.min(...ys):0,xStd:Math.sqrt(avg(xs.map(x=>(x-mx)**2))),yStd:Math.sqrt(avg(ys.map(y=>(y-my)**2))),guideDistanceMean:avg(distances),guideDistanceP50:q(distances,.5),guideDistanceP90:q(distances,.9),normalizedGuideDistanceMean:avg(distances)/rx,ellipseRadiusMean:avg(radii),ellipseRadiusP50:q(radii,.5),ellipseRadiusP90:q(radii,.9)};};
 const normal=points.filter(h=>h.type==='normal'&&inside(h)),scatter=normal.filter(h=>h.row===null);
 return {center,normalization:{xRadius:rx,yRadius:ry,guideDistanceScale:rx},allNormal:group(normal),scatter:group(scatter),...(used?{usedScatter:group(scatter.filter(h=>used.has(h.id)))}:{})};
}
function labContrastProtectedSample(points,count,sourceById,band,guide){
 const center=labContrastGuideCenter(guide,(band.yMin+band.yMax)/2),rx=(band.xMax-band.xMin)/2,ry=(band.yMax-band.yMin)/2;
 const p=h=>{const s=sourceById.get(h.id);return {x:(s.x-center.x)/rx,y:(s.y-center.y)/ry};},chosen=[];
 const remaining=[...points].sort((a,b)=>a.id-b.id);
 while(chosen.length<count&&remaining.length){let best=0,score=-Infinity;
  remaining.forEach((h,i)=>{const q=p(h),value=chosen.length?Math.min(...chosen.map(k=>{const r=p(k);return (q.x-r.x)**2+(q.y-r.y)**2;})):q.x*q.x+q.y*q.y;if(value>score){best=i;score=value;}});
  chosen.push(remaining.splice(best,1)[0]);
 }
 return chosen.map(h=>h.id);
}
function labGenerateContrastSkeleton(config){
 const savedSeed=courseSeed;
 try{
 courseSeed=()=>config.seed;
 const nativeConfig={...config,type:'straight'},base=labCreateOriginalLayout(nativeConfig);
 level=1;difficulty=0;generatedCourse=null;
 ({holds,route,HEIGHT,initialGrips,densityStats}=base);
 const guide=base.route,rise=HEIGHT-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin,bandHeight=Math.min(200,Math.floor(rise*.3));
 const rect=progress=>{const y=HEIGHT-STAGE_CONFIG.bottomMargin-rise*progress;return {xMin:16,xMax:384,yMin:y-bandHeight/2,yMax:y+bandHeight/2,area:368*bandHeight};};
 const diffusion=rect(.72),concentration=rect(.4),inRect=(h,r)=>h.x>=r.xMin&&h.x<=r.xMax&&h.y>=r.yMin&&h.y<=r.yMax;
 const source=holds.map(h=>({...h})),sourceById=new Map(source.map(h=>[h.id,h])),center=labContrastGuideCenter(guide,(concentration.yMin+concentration.yMax)/2);
 const eligible=holds.filter(h=>h.type==='normal'&&h.row===null&&inRect(h,concentration)),fixed=holds.filter(h=>!eligible.includes(h)),mapped=[],mapping=[],collisionDrops=[];
 const scales=[.4,.55,.7,.85,1],minSpacing=24;
 for(const h of eligible){let accepted=null,scale=null;
  for(const candidateScale of scales){const p={...h,x:center.x+(h.x-center.x)*candidateScale,y:center.y+(h.y-center.y)*candidateScale};
   if([...fixed,...mapped].some(q=>distance(p,q)<minSpacing))continue;accepted=p;scale=candidateScale;break;
  }
  if(accepted){mapped.push(accepted);mapping.push({id:h.id,source:{x:h.x,y:h.y},mapped:{x:accepted.x,y:accepted.y},scale});}
  else collisionDrops.push({id:h.id,x:h.x,y:h.y});
 }
 holds=[...fixed,...mapped].sort((a,b)=>a.id-b.id);
 const placedHolds=source.length,scatteredHolds=source.filter(h=>h.row===null).length,layoutFingerprint=source.map(h=>[h.id,h.x,h.y,h.type,h.row]);
 const beforeMapping={diffusion:labContrastSpreadMetrics(source,diffusion,guide),concentration:labContrastSpreadMetrics(source,concentration,guide)};
 const afterMapping={diffusion:labContrastSpreadMetrics(holds,diffusion,guide),concentration:labContrastSpreadMetrics(holds,concentration,guide)};
 const diffuseScatter=holds.filter(h=>h.type==='normal'&&h.row===null&&inRect(h,diffusion)),concentratedScatter=holds.filter(h=>h.type==='normal'&&h.row===null&&inRect(h,concentration));
 const protectionCap=8,protectedCount=Math.min(protectionCap,diffuseScatter.length,concentratedScatter.length);
 const protectedDiffusionIds=labContrastProtectedSample(diffuseScatter,protectedCount,sourceById,diffusion,guide),protectedConcentrationIds=labContrastProtectedSample(concentratedScatter,protectedCount,sourceById,concentration,guide),protectedIds=new Set([...protectedDiffusionIds,...protectedConcentrationIds]);
 assignWideHolds(guide);const solved=solveRoute(guide,60);
 if(!solved)throw new CourseGeometryRejection('No validated contrast-scatter route at this seed.');
 route=solved;const before=routeConsumption(route),filteredHolds=holds.length;
 const nativeSame=samePairRoute;
 try{samePairRoute=(a,b)=>[...protectedIds].every(id=>holds.some(h=>h.id===id))&&nativeSame(a,b);pruneUnusedHolds();}
 finally{samePairRoute=nativeSame;}
 densityStats.fixedSupports=2;route=optimizeRoute(route);finalizeCourseGeneration('basic');
 if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final contrast contact and stamina validation failed.');
 const used=new Set([...initialGrips.map(h=>h.id),...route.flatMap(p=>p.grips||[])]),metrics={diffusion:labContrastSpreadMetrics(holds,diffusion,guide,used),concentration:labContrastSpreadMetrics(holds,concentration,guide,used)};
 const validation={minimumScatterPoints:3,maxMeanRadiusRatio:.85,ratio:metrics.concentration.scatter.ellipseRadiusMean/metrics.diffusion.scatter.ellipseRadiusMean,appliesTo:'final-row-null-scatter'};
 if(metrics.diffusion.scatter.count<validation.minimumScatterPoints||metrics.concentration.scatter.count<validation.minimumScatterPoints||!Number.isFinite(validation.ratio)||validation.ratio>validation.maxMeanRadiusRatio)throw new CourseGeometryRejection('Scatter spread contrast could not be validated at this seed.');
 validation.validated=true;
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,optimizationAccepted:true,
  contrast:{kind:'single-pool-radial-spread',diffusion,concentration,center,mapping:{kind:'isotropic-2d',scales,minSpacing,eligibleIds:eligible.map(h=>h.id),records:mapping,collisionDrops},retention:{policy:'equal-cap-maximin-original-source-ellipse',cap:protectionCap,selectedPerBand:protectedCount,protectedDiffusionIds,protectedConcentrationIds},beforeMapping,afterMapping,metrics,validation,countDifferenceIsNotAcceptanceCriterion:true},
  placement:{engine:'original-createStageGenerator',placedHolds,scatteredHolds,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations,pruneRemoved:filteredHolds-holds.length,layoutFingerprint,nativeSources:[{seed:config.seed,holds:source.length,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations}],extraIds:[],collisionRemoved:collisionDrops.length,coordinatesMapped:true}};
 return labSkeletonReport;
 }finally{courseSeed=savedSeed;}
}

// Composition-only adapter: native-sized sections, translated (never scaled).
function labCompositeOriginalLayout(config,height){
 if(config.type==='switchback')return labCreateSwitchbackLayout(config,height);
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse},index={short:0,middle:1,long:2}[config.length];
 try{
  stageLengthRule=(n,seed)=>n===1?saved.stageLengthRule(n,seed):{...STAGE_CONFIG.lengthRules[index],height};
  if(config.type!=='meander'){
   const rise=height-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin,dx=labStraightDirection(config.seed)*180,span=Math.hypot(rise,dx),ux=dx/span,uy=-rise/span;
   makeStageCourse=()=>s=>({x:W/2-dx/2+s*ux,y:s*uy,nx:-uy,ny:ux});
  }
  return generator.generate(2,false,config.seed,config.seed);
 }finally{stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;}
}
// Only a previously rejected branch/branch mandatory collision is repairable.
// Move one retained ordinary native scatter, never a column/edge/start/goal/wide
// hold. The same ID/count is kept and the final course still uses native solve,
// contact replay, pruning, optimization, budget validation and player controls.
function labRepairBranchJoin(points,sectionReports,mandatory,sourceSection,seam,initialPairs){
 if(sectionReports.length!==2||sectionReports.some(s=>s.type!=='branch'))return null;
 const conflicts=initialPairs.filter(p=>p.distance<24&&mandatory.has(p.a.id)&&mandatory.has(p.b.id));
 if(conflicts.length!==1)return null;
 const pair=conflicts[0],candidates=[];
 const isRetainedScatter=h=>{const origin=sourceSection.get(h.id),d=sectionReports[origin.section].sourceReport.branchDetails;return h.type==='normal'&&h.row===null&&!h.wide&&[...d.naturalRetention.protectedBeforeIds,...d.naturalRetention.protectedAfterIds].includes(origin.sourceId);};
 // Do not move even the scatter neighbor of a structural mandatory hold.
 if(![pair.a,pair.b].every(isRetainedScatter))return null;
 for(const h of [pair.a,pair.b]){
  const origin=sourceSection.get(h.id),s=sectionReports[origin.section],d=s.sourceReport.branchDetails,b=s.ownedBounds;
  const natural=[...d.naturalRetention.protectedBeforeIds,...d.naturalRetention.protectedAfterIds];
  if(h.type!=='normal'||h.row!==null||h.wide||!natural.includes(origin.sourceId))continue;
  const inOwn=p=>p.x>=b.xMin&&p.x<=b.xMax&&p.y>=b.yMin&&p.y<=b.yMax;
  const inJoin=p=>p.y>=seam-120&&p.y<=seam+120;
  const before=d.naturalRetention.protectedBeforeIds.includes(origin.sourceId),regionEdge=(before?d.band.yMax:d.band.yMin)+s.offsetY;
  const sameRegion=p=>before?p.y>regionEdge:p.y<regionEdge;
  if(!inOwn(h)||!inJoin(h)||!sameRegion(h))continue;
  for(let dy=-16;dy<=16;dy++)for(let dx=-16;dx<=16;dx++){
   const displacement=Math.hypot(dx,dy);if(!displacement||displacement>16)continue;
   const p={x:h.x+dx,y:h.y+dy};if(!inOwn(p)||!inJoin(p)||!sameRegion(p))continue;
   if(points.some(q=>q.id!==h.id&&distance(p,q)<24))continue;
   candidates.push({h,origin,ownedBounds:{...b},sourceRegion:before?'before-branch-band':'after-branch-band',from:{x:h.x,y:h.y},to:p,dx,dy,displacement});
  }
 }
 candidates.sort((a,b)=>a.displacement-b.displacement||a.h.id-b.h.id||a.dy-b.dy||a.dx-b.dx);
 const chosen=candidates[0];if(!chosen)return null;
 const {h,origin,ownedBounds,sourceRegion,from,to,dx,dy,displacement}=chosen;h.x=to.x;h.y=to.y;
 return {kind:'single-retained-scatter-translation',trigger:'previously-rejected-mandatory-collision',candidatePolicy:'integer-grid-minimum-displacement-then-id-dy-dx',maxDisplacement:16,minSpacing:24,spacingScope:'moved-hold-against-entire-merged-input',candidates:candidates.length,conflict:{ids:[pair.a.id,pair.b.id],beforeDistance:pair.distance},moves:[{id:h.id,...origin,ownedBounds,sourceRegion,from,to,dx,dy,displacement}],allInputIdsPreserved:true,featureCoordinatesUnchanged:true};
}

function labGenerateCompositeSkeleton(config){
 labSkeletonReport=null;
 if(config.composition!=='pair'||!['middle','long'].includes(config.length)||!['straight','meander','branch','contrast','switchback'].includes(config.type)||!['straight','meander','branch','contrast','switchback'].includes(config.secondType)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Composition requires two sections and middle or long length.');
 const saved={courseSeed,labCreateOriginalLayout,labColumnSideSearch},height=STAGE_CONFIG.lengthRules[config.length==='middle'?1:2].height,sectionHeight=height/2+120,sectionLength=config.length==='middle'?'short':'middle';
 const types=[config.type,config.secondType],sections=[],hasSwitchback=types.includes('switchback');
 try{
  labCreateOriginalLayout=c=>labCompositeOriginalLayout(c,sectionHeight);
  labColumnSideSearch=()=>({found:false,reason:'not-run-in-section-source'});
  for(let i=0;i<2;i++){
   const seed=(config.seed^(i?0x7F4A7C15:0x243F6A88))>>>0,c={type:types[i],length:sectionLength,seed};courseSeed=()=>seed;
   let report;try{report=labGenerateSkeleton(c);}catch(e){if(!(e instanceof CourseGeometryRejection))throw e;throw new CourseGeometryRejection(`Section ${i+1} (${types[i]}): ${e.message}`,{cause:e});}
   sections.push({type:types[i],seed,height:HEIGHT,report:JSON.parse(JSON.stringify(report)),holds:holds.map(h=>({...h})),route:route.map(p=>({...p,grips:p.grips?[...p.grips]:undefined})),initialIds:initialGrips.map(h=>h.id),density:JSON.parse(JSON.stringify(densityStats))});
  }
  labCreateOriginalLayout=saved.labCreateOriginalLayout;labColumnSideSearch=saved.labColumnSideSearch;courseSeed=()=>config.seed;
  const all=[],protectedIds=new Set(),sectionReports=[],converted=[];let nextId=0;
  for(let i=0;i<2;i++){
   const s=sections[i],dy=i===0?height-sectionHeight:0,map=new Map();
   for(const h of s.holds){const id=nextId++;map.set(h.id,id);if((i===0&&h.type==='goal')||(i===1&&h.type==='start'))converted.push({id,section:i,sourceId:h.id,from:h.type,to:'normal',wide:!!h.wide||h.type==='goal'});all.push({...h,id,y:h.y+dy,type:(i===0&&h.type==='goal')||(i===1&&h.type==='start')?'normal':h.type, ...(i===0&&h.type==='goal'?{wide:true}:{})});}
   s.idMap=map;s.dy=dy;s.worldRoute=s.route.map(p=>({x:p.x,y:p.y+dy}));
   const preserve=s.report.branchDetails?.protectedIds||[...(s.report.contrast?.retention.protectedDiffusionIds||[]),...(s.report.contrast?.retention.protectedConcentrationIds||[])];preserve.forEach(id=>protectedIds.add(map.get(id)));
   sectionReports.push({index:i,type:s.type,seed:s.seed,height:s.height,offsetY:dy,idMap:[...map],sourceReport:s.report,sourceHolds:s.holds,sourceRoute:s.route,ownedBounds:{xMin:16,xMax:W-16,yMin:i===0?height/2:0,yMax:i===0?height:height/2},protectedIds:preserve.map(id=>map.get(id))});
  }
  const seam=height/2,sourceSection=new Map(sectionReports.flatMap(s=>s.idMap.map(([sourceId,id])=>[id,{section:s.index,sourceId}]))),joinDrops=[];
  const mandatory=new Set([...protectedIds,...sections[0].initialIds.map(id=>sections[0].idMap.get(id)),...all.filter(h=>h.type==='goal').map(h=>h.id)]);
  const crossPairs=points=>{
   const left=points.filter(h=>sourceSection.get(h.id).section===0),right=points.filter(h=>sourceSection.get(h.id).section===1);
   return left.flatMap(a=>right.map(b=>({a,b,distance:distance(a,b)}))).sort((a,b)=>a.distance-b.distance||a.a.id-b.a.id||a.b.id-b.b.id);
  };
  const initialPairs=crossPairs(all),joinRepair=labRepairBranchJoin(all,sectionReports,mandatory,sourceSection,seam,initialPairs),mergePairs=joinRepair?crossPairs(all):initialPairs,removed=new Set();
  for(const pair of mergePairs){
   if(pair.distance>=24)break;if(removed.has(pair.a.id)||removed.has(pair.b.id))continue;
   const pa=mandatory.has(pair.a.id),pb=mandatory.has(pair.b.id);
   if(pa&&pb)throw new CourseGeometryRejection('Required seam holds are too close for composition.');
   let drop,keep;
   if(pa||pb){drop=pa?pair.b:pair.a;keep=pa?pair.a:pair.b;}
   else{const da=Math.max(0,seam-pair.a.y),db=Math.max(0,pair.b.y-seam);drop=da>=db?pair.a:pair.b;keep=drop===pair.a?pair.b:pair.a;}
   removed.add(drop.id);joinDrops.push({id:drop.id,...sourceSection.get(drop.id),keptId:keep.id,distance:pair.distance,reason:pa||pb?'mandatory-neighbor':'outside-owned-half-priority'});
  }
  holds=all.filter(h=>!removed.has(h.id));HEIGHT=height;initialGrips=sections[0].initialIds.map(id=>holds.find(h=>h.id===sections[0].idMap.get(id)));level=1;difficulty=0;generatedCourse=null;
  densityStats={...sections[0].density,initialTotal:sections.reduce((n,s)=>n+s.density.initialTotal,0),iterations:sections.reduce((n,s)=>n+s.density.iterations,0)};
  const postMergeMin=crossPairs(holds)[0]?.distance??null;
  const guide=[...sections[0].worldRoute.filter(p=>p.y>=seam),...sections[1].worldRoute.filter(p=>p.y<seam)];
  const switchbackWitness=hasSwitchback?labSolveCompositeSwitchbacks(guide,sectionReports):null;
  const solved=hasSwitchback?switchbackWitness.route:solveRoute(guide,90);if(!solved)throw new CourseGeometryRejection('Bounded search could not validate a continuous two-section route.');route=solved;
  const before=routeConsumption(route),beforeCount=holds.length,nativeSame=samePairRoute;
  try{samePairRoute=(a,b)=>[...protectedIds].every(id=>holds.some(h=>h.id===id))&&nativeSame(a,b);pruneUnusedHolds();}finally{samePairRoute=nativeSame;}
  densityStats.fixedSupports=2;const preOptimization=route,optimized=optimizeRoute(route),compositeOptimizationAccepted=!hasSwitchback||labCompositeSwitchbackFeatures(optimized,sectionReports).validated;route=compositeOptimizationAccepted?optimized:preOptimization;finalizeCourseGeneration('basic');
  if(!validateRouteBudget(route))throw new CourseGeometryRejection('Composed contact and stamina validation failed.');
  const recoveryDragReference=switchbackWitness?.variantLimit===4||sections.some(s=>s.report.switchback?.variantLimit===4)?labAssertRecoveryDragReference(route):null;
  const compositeSwitchbackFeatures=hasSwitchback?labCompositeSwitchbackFeatures(route,sectionReports):null;
  if(hasSwitchback&&!compositeSwitchbackFeatures.validated)throw new CourseGeometryRejection('Composed switchback amplitude and legs could not be validated.');
  const used=new Set(route.flatMap(p=>p.grips||[]));
  const finalIds=new Set(holds.map(h=>h.id));
  for(const s of sectionReports){
   const idMap=new Map(s.idMap),ids=new Set(idMap.values()),worldPoints=holds.filter(h=>ids.has(h.id)),localPoints=worldPoints.map(h=>({...h,y:h.y-s.offsetY}));
   s.usedIds=worldPoints.filter(h=>used.has(h.id)).map(h=>h.id);s.finalIds=worldPoints.map(h=>h.id);s.collisionRemovedIds=joinDrops.filter(d=>d.section===s.index).map(d=>d.id);s.prunedIds=s.idMap.map(p=>p[1]).filter(id=>!finalIds.has(id)&&!removed.has(id));
   const pathPoints=route.filter(p=>p.y>=s.ownedBounds.yMin&&p.y<=s.ownedBounds.yMax),xs=pathPoints.map(p=>p.x);
   s.finalGeometry={holds:worldPoints.length,sourceHolds:s.sourceHolds.length,routeSpan:xs.length?Math.max(...xs)-Math.min(...xs):0,travelX:pathPoints.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-pathPoints[i].x),0),routePoints:pathPoints.length};
   if(!s.usedIds.length)throw new CourseGeometryRejection(`Section ${s.index+1} has no validated contacts.`);
   if(s.type==='branch'){
    const d=s.sourceReport.branchDetails,mapIds=a=>a.map(id=>idMap.get(id));
    const columns=d.columns.map(c=>({...c,ids:mapIds(c.ids),yMin:c.yMin+s.offsetY,yMax:c.yMax+s.offsetY,nominalYMin:c.nominalYMin+s.offsetY,nominalYMax:c.nominalYMax+s.offsetY})),edge={...d.edge,ids:mapIds(d.edge.ids),yMin:d.edge.yMin+s.offsetY,yMax:d.edge.yMax+s.offsetY,nominalYMin:d.edge.nominalYMin+s.offsetY,nominalYMax:d.edge.nominalYMax+s.offsetY};
    const usedColumnIds=columns.flatMap(c=>c.ids).filter(id=>used.has(id)),usedEdgeIds=edge.ids.filter(id=>used.has(id));
    if(!columns.every(c=>c.ids.every(id=>finalIds.has(id)))||!edge.ids.every(id=>finalIds.has(id))||!usedColumnIds.length||!usedEdgeIds.length)throw new CourseGeometryRejection(`Section ${s.index+1} column and edge shape/contact validation failed.`);
    s.features={kind:'local-columns-to-edge',columns,edge,usedColumnIds,usedEdgeIds};
   }else if(s.type==='contrast'){
    const d=s.sourceReport.contrast;
    // The radial metric guide is straight. Recover its exact centerline from
    // the two recorded native band centers, not the solved wandering route.
    const guide=[d.metrics.concentration.center,d.metrics.diffusion.center].sort((a,b)=>b.y-a.y);
    const visiblePoints=holds.map(h=>({...h,y:h.y-s.offsetY}));
    const metrics={diffusion:labContrastSpreadMetrics(visiblePoints,d.diffusion,guide,used),concentration:labContrastSpreadMetrics(visiblePoints,d.concentration,guide,used)};
    const bands={};for(const key of ['diffusion','concentration']){
     const b=d[key],within=worldPoints.filter(h=>h.type==='normal'&&h.x>=b.xMin&&h.x<=b.xMax&&h.y>=b.yMin+s.offsetY&&h.y<=b.yMax+s.offsetY);
     const visible=holds.filter(h=>h.type==='normal'&&h.x>=b.xMin&&h.x<=b.xMax&&h.y>=b.yMin+s.offsetY&&h.y<=b.yMax+s.offsetY);
     bands[key]={...b,yMin:b.yMin+s.offsetY,yMax:b.yMax+s.offsetY,ids:within.map(h=>h.id),visibleIds:visible.map(h=>h.id),usedIds:within.filter(h=>used.has(h.id)).map(h=>h.id)};
    }
    const ratio=metrics.concentration.scatter.ellipseRadiusMean/metrics.diffusion.scatter.ellipseRadiusMean;
    if(metrics.diffusion.scatter.count<3||metrics.concentration.scatter.count<3||!Number.isFinite(ratio)||ratio>.85||!bands.diffusion.usedIds.length||!bands.concentration.usedIds.length)throw new CourseGeometryRejection(`Section ${s.index+1} density contrast and dual-region contacts failed.`);
    s.features={kind:'single-pool-radial-spread',metricScope:'all-visible-merged-holds-in-world-windows',bands,metrics,ratio,maxRatio:.85,minimumScatterPoints:3};
   }else if(s.type==='switchback'){
    const geometry=labSwitchbackCompositeGeometry([s]),features=labCompositeSwitchbackFeatures(route,[s]);
    if(!features.validated)throw new CourseGeometryRejection(`Section ${s.index+1} switchback amplitude validation failed.`);
    s.features={kind:'wide-switchback',geometry,features,metricScope:'final-world-route-within-owned-section',shapeNecessityProven:false};
   }else{
    // 140px is only a visual reference (about half the native guide width),
    // not an original movement rule or a reason to reject a playable course.
    s.features={kind:s.type,orientation:s.sourceReport.orientation,usedIds:s.usedIds,referenceWidth:s.type==='meander'?140:null,meetsReferenceWidth:s.type==='meander'?s.finalGeometry.routeSpan>=140:null,shapeNecessityProven:false};
   }
  }

  labSkeletonReport={type:config.type,secondType:config.secondType,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,contrast:null,optimizationAccepted:compositeOptimizationAccepted,...(hasSwitchback?{switchback:{geometry:labSwitchbackCompositeGeometry(sectionReports),features:compositeSwitchbackFeatures,...(recoveryDragReference?{recoveryDragReference}:{}),variant:switchbackWitness.variant,attempts:switchbackWitness.attempts,unconstrained:{scope:'pre-prune-merged-holds',found:!!switchbackWitness.free,moves:switchbackWitness.free?routeConsumption(switchbackWitness.free):null,features:switchbackWitness.freeFeature,path:switchbackWitness.free,finalReplay:switchbackWitness.free?replayRoute(switchbackWitness.free):null},optimization:{accepted:compositeOptimizationAccepted,moves:routeConsumption(optimized),features:labCompositeSwitchbackFeatures(optimized,sectionReports),path:optimized}}}:{}),composition:{kind:'two-sections',types,sectionHeight,sectionLength,seedSalts:[0x243F6A88,0x7F4A7C15],junction:{seam,overlap:240,yMin:seam-120,yMax:seam+120,converted,...(joinRepair?{repair:joinRepair}:{}),removedJoinIds:[...removed],collisionPolicy:{minCrossSourceSpacing:24,mandatoryIds:[...mandatory],priority:'protected-then-owned-half; equal-penalty-keeps-upper-source',drops:joinDrops,beforeMinDistance:initialPairs[0]?.distance??null,postMergeMinDistance:postMergeMin,finalMinDistance:crossPairs(holds)[0]?.distance??null}},sections:sectionReports,solverMaxMoves:90,intermediateGoal:'converted-to-normal-wide',upperStart:'converted-to-normal',verticalScaling:false,staminaResets:0,singleModeUnchanged:true},placement:{engine:'original-createStageGenerator',nativeSources:sections.map(s=>({type:s.type,seed:s.seed,height:s.height,placedHolds:s.report.placement.placedHolds,sourceFinalHolds:s.holds.length,densityInitial:s.report.placement.densityInitial,densityRemoved:s.report.placement.densityRemoved})),placedHolds:sections.reduce((n,s)=>n+s.report.placement.placedHolds,0),scatteredHolds:sections.reduce((n,s)=>n+s.report.placement.scatteredHolds,0),densityInitial:sections.reduce((n,s)=>n+s.report.placement.densityInitial,0),densityRemoved:sections.reduce((n,s)=>n+s.report.placement.densityRemoved,0),mergedSourceHolds:all.length,collisionRemoved:removed.size,mergedInputHolds:beforeCount,pruneRemoved:beforeCount-holds.length,translationOnly:!joinRepair,...(joinRepair?{joinCoordinatesMapped:true}:{}),extraIds:[]}};
  return labSkeletonReport;
 }catch(error){labSkeletonReport=null;generatedCourse=null;throw error;}finally{courseSeed=saved.courseSeed;labCreateOriginalLayout=saved.labCreateOriginalLayout;labColumnSideSearch=saved.labColumnSideSearch;}
}

function labSwitchbackSearch(guide,{start=null,stance=null,limit=18000,maxMoves=45,stop,forwardOnly=false,accept=()=>true}={}){
 const saved={committed,startGrips};const first=stance||[...initialGrips];
 if(!stance)for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>first[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>first[i]=sorted[j]);}
 const origin=start||guide[0];let transitions=0,expanded=0,best=null;
 const progress=p=>{let best=Infinity,index=0;guide.forEach((q,i)=>{const d=distance(p,q);if(d<best){best=d;index=i;}});return index*100-best;};
 let beam=[{p:origin,stance:first,path:[origin],score:progress(origin)}];const visited=new Set();
 try{
  for(let depth=0;depth<maxMoves&&transitions<limit;depth++){
   const next=[];
   for(const node of beam){
    expanded++;committed=node.p;startGrips=node.stance;
    const candidates=[];
    for(const q of guide)if(distance(node.p,q)<=230)for(const t of [.5,.75,1])candidates.push({x:node.p.x+(q.x-node.p.x)*t,y:node.p.y+(q.y-node.p.y)*t});
    for(const dx of [-90,-60,-30,0,30,60,90])for(const dy of [-90,-45,0,20,40])candidates.push({x:node.p.x+dx,y:node.p.y+dy});
    for(const p of candidates){
     if(transitions++>=limit)break;
     if(!accept(p,node.path)||p.x<36||p.x>364||p.y<80||p.y>HEIGHT-40||distance(p,node.p)<5||(forwardOnly&&p.y>origin.y+60+1e-7))continue;
     const anchor=selectAnchor(p.x-node.p.x,p.y-node.p.y);
     if(!supportsReachable(p,anchor)||supportMotionFraction(node.p,p,anchor)<1-1e-9)continue;
     const contacts=attachMoving(p,anchor);if(!contacts?.every(Boolean)||sameContacts(contacts,node.stance))continue;
     const key=Math.round(p.x/6)+','+Math.round(p.y/6)+':'+contacts.map(h=>h.id).join(',');if(visited.has(key))continue;visited.add(key);
     const path=[...node.path,{...p,anchor,grips:contacts.map(h=>h.id)}];
     const entry={p,stance:contacts,path,score:progress(p)};
     if(!best||p.y<best.p.y)best=entry;
     if(stop(p,contacts,path))return {path,transitions,expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:false,found:true};
     next.push(entry);
    }
   }
   next.sort((a,b)=>b.score-a.score);beam=next.slice(0,12);if(!beam.length)break;
  }
  return {path:best?.path||null,transitions:Math.min(transitions,limit),expanded,limit,maxMoves,beamWidth:12,retreatAllowance:forwardOnly?60:null,limitReached:transitions>=limit,found:false};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
// Local column choice followed by an edge-concentrated native-contact section.
// Only normal source IDs in the local window are mapped. No new holds/physics.
// New switchback only. Native station placement/scatter/density and contacts.
function labCreateSwitchbackLayout(config,height){
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse,stageLayout};
 const rise=height-STAGE_CONFIG.bottomMargin-STAGE_CONFIG.goalTopMargin,swings=height>=1400?2:1,side=mulberry32(config.seed^0x57C4B3)()<.5?-1:1,x0=W/2+side*144;
 const samples=[{x:x0,y:0,s:0}],turnStations=[];let x=x0;
 for(let i=1;i<=swings;i++){
  const y=-rise*i/(swings+1),last=samples.at(-1),a={x,y,s:last.s+distance(last,{x,y})};samples.push(a);
  x=W-x;const b={x,y,s:a.s+Math.abs(x-a.x)};samples.push(b);turnStations.push({startS:a.s,endS:b.s,side:x<W/2?-1:1});
 }
 const end={x,y:-rise-300};end.s=samples.at(-1).s+distance(samples.at(-1),end);samples.push(end);
 const raw=s=>{let i=0;while(i<samples.length-2&&samples[i+1].s<s)i++;const a=samples[i],b=samples[i+1],t=(s-a.s)/(b.s-a.s),d=distance(a,b);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,nx:-(b.y-a.y)/d,ny:(b.x-a.x)/d};};let nativeLayout;
 try{
  stageLengthRule=(n,seed)=>n===1?saved.stageLengthRule(n,seed):{category:config.length,height,climbHeight:rise/(swings+1)};
  makeStageCourse=()=>raw;stageLayout=function(n,...args){const r=saved.stageLayout(n,...args);if(n===2)nativeLayout=r;return r;};
  const base=generator.generate(2,false,config.seed,config.seed),bottom=height-STAGE_CONFIG.bottomMargin;
  base.switchback={side,swings,shapeKind:swings===1?'crank':'u-switchback',rawCourseVertices:samples.map(p=>({...p,y:p.y+bottom})),turns:turnStations.map(t=>{const a=nativeLayout.course(t.startS),b=nativeLayout.course(t.endS);return {side:t.side,start:{x:a.x,y:a.y+bottom},end:{x:b.x,y:b.y+bottom}};})};return base;
 }finally{stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;stageLayout=saved.stageLayout;}
}
function labSwitchbackPathFeatures(path,geometry){
 const legs=[];let begin=0;
 for(const turn of geometry.turns){
  let found=null;
  for(let i=begin;i<path.length-1&&!found;i++){
   const a=path[i];if(turn.bounds&&(a.y<turn.bounds.yMin||a.y>turn.bounds.yMax))continue;if(turn.side*(a.x-W/2)>-65||a.y<turn.end.y-130||a.y>turn.end.y+80)continue;
   let ymin=a.y,ymax=a.y;
   for(let j=i+1;j<path.length;j++){
    const b=path[j];if(turn.bounds&&(b.y<turn.bounds.yMin||b.y>turn.bounds.yMax))break;ymin=Math.min(ymin,b.y);ymax=Math.max(ymax,b.y);if(ymax-ymin>100)break;
    const dx=turn.side*(b.x-a.x),dy=b.y-a.y;if(dx>=200&&Math.abs(dy)<=80){found={sectionIndex:turn.sectionIndex,entryIndex:i,exitIndex:j,entry:{x:a.x,y:a.y},exit:{x:b.x,y:b.y},side:turn.side,span:dx,deltaY:dy,yRange:ymax-ymin,slope:Math.abs(dy)/dx};break;}
   }
  }
  if(!found)return {validated:false,reason:'ordered-near-horizontal-leg-not-found',legs,minimumAmplitude:200,maxDeltaY:80,maxYRange:100};legs.push(found);begin=found.exitIndex;
 }
 return {validated:true,minimumAmplitude:200,maxDeltaY:80,maxYRange:100,legs,minimumObservedAmplitude:Math.min(...legs.map(g=>g.span)),allPathsRequired:false};
}
function labBuildSwitchbackWitness(guide,geometry){
 const free=solveRoute(guide,90),freeFeature=free?labSwitchbackPathFeatures(free,geometry):null;
 if(freeFeature?.validated)return {route:free,free,freeFeature,variant:'unconstrained',attempts:[]};
 const attempts=[];
 for(const variant of ['native-guide','side-approach']){
  let current=guide[0],stance=null,joined=[{x:current.x,y:current.y}],searches=[];
  try{
   const byId=()=>new Map(holds.map(h=>[h.id,h]));
   for(const turn of geometry.turns){
    const target={x:turn.end.x,y:turn.end.y-40},entryTarget={x:turn.start.x,y:turn.start.y-40};
    const approachGuide=guide.filter(p=>p.y<current.y&&p.y>entryTarget.y+(variant==='side-approach'?60:0)&&(variant!=='side-approach'||turn.side*(p.x-W/2)<=-65));
    const approach=labSwitchbackSearch([current,...approachGuide,entryTarget],{start:current,stance,limit:10000,maxMoves:32,stop:p=>turn.side*(p.x-W/2)<=-100&&Math.abs(p.y-entryTarget.y)<=40&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax)),accept:p=>p.y>=entryTarget.y-50});
    searches.push({phase:'approach',...approach,path:undefined});if(!approach.found)throw new CourseGeometryRejection('approach');
    joined.push(...approach.path.slice(1));current=joined.at(-1);let ids=byId();stance=current.grips.map(id=>ids.get(id));const entry={x:current.x,y:current.y};
    const cross=labSwitchbackSearch([current,{x:turn.end.x,y:entry.y},target],{start:current,stance,limit:10000,maxMoves:24,stop:(p,grips)=>turn.side*(p.x-entry.x)>=200&&grips[0].x<=grips[1].x&&grips[2].x<=grips[3].x,accept:p=>Math.abs(p.y-entry.y)<=40&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax))});
    searches.push({phase:'cross',...cross,path:undefined});if(!cross.found)throw new CourseGeometryRejection('cross');
    joined.push(...cross.path.slice(1));current=joined.at(-1);ids=byId();stance=current.grips.map(id=>ids.get(id));
   }
   const originalInitial=initialGrips;let suffix;
   try{initialGrips=stance;suffix=solveRoute([current,...guide.filter(p=>p.y<current.y)],90);}finally{initialGrips=originalInitial;}
   if(!suffix)throw new CourseGeometryRejection('goal');joined.push(...suffix.slice(1));const replay=replayRoute(joined);
   if(!replay||!labSwitchbackPathFeatures(replay,geometry).validated)throw new CourseGeometryRejection('full-replay-or-shape');
   attempts.push({variant,found:true,searches});return {route:replay,free,freeFeature,variant,attempts};
  }catch(error){if(!(error instanceof CourseGeometryRejection))throw error;attempts.push({variant,found:false,reason:error.message,searches});}
 }
 return labRecoverSwitchbackWitness(guide,geometry,free,attempts);
}
// Failure-only recovery; preserves the two original successful search results.
// Uses actual native goal continuations as approach checkpoints, never a fake
// goal or a substituted stance. Every accepted whole path is replayed from start.
// Reference acceptance only: finite native drag simulation, not new controls.
// Replays the standard ten-sample body drag at logical 400px width, including
// the anchor lock when the original 5px threshold is first crossed.
function labValidateRecoveryDragReference(path){
 const saved={committed,startGrips},byId=new Map(holds.map(h=>[h.id,h]));
 let stance=[...initialGrips];for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>stance[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>stance[i]=sorted[j]);}
 const fail=(step,reason,extra={})=>({valid:false,step,reason,samples:10,viewportWidth:400,...extra});
 try{
  for(let i=1;i<path.length;i++){
   const from=path[i-1],to=path[i],cam=clamp(from.y-H*CAMERA_CONFIG.bodyScreenRatio,cameraTop(),HEIGHT-H),origin={x:from.x,y:(from.y-cam)+cam};
   committed={x:from.x,y:from.y};startGrips=stance;let actual={...committed},attached=stance,anchor=null;
   const offset={x:from.x-origin.x,y:from.y-origin.y};
   for(const step of [1,2,3,4,5,6,7,8,9,10,10]){
    const t=step/10,p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t},raw={x:p.x+offset.x,y:((p.y-cam)+cam)+offset.y};
    if(anchor===null){if(distance(raw,committed)<INPUT_CONFIG.dragThreshold)continue;anchor=selectAnchor(raw.x-committed.x,raw.y-committed.y);}
    const target={x:clamp(raw.x,25,W-25),y:clamp(raw.y,80,HEIGHT-40)},fraction=supportMotionFraction(actual,target,anchor),next={x:actual.x+(target.x-actual.x)*fraction,y:actual.y+(target.y-actual.y)*fraction},nextContacts=attachMoving(next,anchor);
    if(nextContacts){actual=next;attached=nextContacts;}
   }
   if(!isSupportPair(anchor)||!attached.every(Boolean)||!anchor.every(j=>attached[j]===stance[j]&&limbReachable(actual,attached[j],j))||sameContacts(attached,stance))return fail(i,'native-drag-release-rejected',{expectedAnchor:to.anchor,actualAnchor:anchor});
   if(distance(actual,to)>1e-7||!to.grips?.every((id,j)=>attached[j].id===id))return fail(i,'native-drag-reference-mismatch',{expectedAnchor:to.anchor,actualAnchor:anchor,actualBody:actual,actualGrips:attached.map(h=>h.id),expectedGrips:to.grips});
   stance=attached;
  }
  return {valid:true,samples:10,viewportWidth:400,moves:path.length-1};
 }finally{committed=saved.committed;startGrips=saved.startGrips;}
}
function labAssertRecoveryDragReference(path){
 const result=labValidateRecoveryDragReference(path);
 if(!result.valid){const error=new CourseGeometryRejection('Recovery-route native drag validation failed.');error.details={inputReferenceValidation:result};throw error;}
 return result;
}

function labRecoverSwitchbackWitness(guide,geometry,free,priorAttempts){
 const attempts=[...priorAttempts],byId=new Map(holds.map(h=>[h.id,h]));
 for(const profile of [{name:'checkpoint-minus40',plane:-40},{name:'checkpoint-minus20',plane:-20}]){
  let current=guide[0],stance=null,joined=[{x:current.x,y:current.y}],searches=[];
  try{
   for(const turn of geometry.turns){
    const target={x:turn.end.x,y:turn.end.y+profile.plane},entryTarget={x:turn.start.x,y:turn.start.y+profile.plane};
    const savedInitial=initialGrips;let continuation;
    try{if(stance)initialGrips=stance;continuation=stance?solveRoute([current,...guide.filter(p=>p.y<current.y)],90):free;}finally{initialGrips=savedInitial;}
    let checkpoint=0;
    if(continuation){for(let i=1;i<continuation.length;i++){if(continuation[i].y<entryTarget.y+100)break;checkpoint=i;}
     if(checkpoint){joined.push(...continuation.slice(1,checkpoint+1));current=joined.at(-1);stance=current.grips.map(id=>byId.get(id));}
    }
    searches.push({phase:'checkpoint',found:!!continuation,nativeMaxMoves:90,prefixMoves:checkpoint,position:{x:current.x,y:current.y},grips:stance?stance.map(h=>h.id):initialGrips.map(h=>h.id)});
    const approachGuide=guide.filter(p=>p.y<current.y&&p.y>entryTarget.y);
    const approach=labSwitchbackSearch([current,...approachGuide,entryTarget],{start:current,stance,limit:10000,maxMoves:32,stop:p=>turn.side*(p.x-W/2)<=-100&&Math.abs(p.y-entryTarget.y)<=30&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax)),accept:p=>p.y>=entryTarget.y-40});
    searches.push({phase:'approach',...approach,path:undefined});if(!approach.found)throw new CourseGeometryRejection('approach');
    joined.push(...approach.path.slice(1));current=joined.at(-1);stance=current.grips.map(id=>byId.get(id));const entry={x:current.x,y:current.y};
    const cross=labSwitchbackSearch([current,{x:turn.end.x,y:entry.y},target],{start:current,stance,limit:10000,maxMoves:24,stop:(p,grips)=>turn.side*(p.x-entry.x)>=200&&grips[0].x<=grips[1].x&&grips[2].x<=grips[3].x,accept:p=>Math.abs(p.y-entry.y)<=40&&(!turn.bounds||(p.y>=turn.bounds.yMin&&p.y<=turn.bounds.yMax))});
    searches.push({phase:'cross',...cross,path:undefined});if(!cross.found)throw new CourseGeometryRejection('cross');
    joined.push(...cross.path.slice(1));current=joined.at(-1);stance=current.grips.map(id=>byId.get(id));
   }
   const savedInitial=initialGrips;let suffix;
   try{
    initialGrips=stance;suffix=solveRoute([current,...guide.filter(p=>p.y<current.y)],90);searches.push({phase:'goal',guide:'section-guide',nativeMaxMoves:90,found:!!suffix});
    if(!suffix){const goal=holds.find(h=>h.type==='goal');suffix=solveRoute([current,{x:goal.x,y:goal.y+70}],90);searches.push({phase:'goal',guide:'goal-only',nativeMaxMoves:90,found:!!suffix});}
   }finally{initialGrips=savedInitial;}
   if(!suffix)throw new CourseGeometryRejection('goal');joined.push(...suffix.slice(1));const replay=replayRoute(joined);
   if(!replay||!labSwitchbackPathFeatures(replay,geometry).validated)throw new CourseGeometryRejection('full-replay-or-shape');
   attempts.push({variant:profile.name,found:true,searches});return {route:replay,free,freeFeature:free?labSwitchbackPathFeatures(free,geometry):null,variant:profile.name,attempts,variantLimit:4};
  }catch(error){if(!(error instanceof CourseGeometryRejection))throw error;attempts.push({variant:profile.name,found:false,reason:error.message,searches});}
 }
 const error=new CourseGeometryRejection('Bounded search could not validate a 200px switchback and continuous goal route.');error.details={attempts};throw error;
}

function labSwitchbackCompositeGeometry(sectionReports){
 const turns=sectionReports.filter(s=>s.type==='switchback').flatMap(s=>s.sourceReport.switchback.geometry.turns.map(t=>({...t,start:{x:t.start.x,y:t.start.y+s.offsetY},end:{x:t.end.x,y:t.end.y+s.offsetY},sectionIndex:s.index,bounds:s.ownedBounds})));
 return {shapeKind:'composite-switchbacks',swings:turns.length,turns};
}
function labSolveCompositeSwitchbacks(guide,sectionReports){return labBuildSwitchbackWitness(guide,labSwitchbackCompositeGeometry(sectionReports));}
function labCompositeSwitchbackFeatures(path,sectionReports){return labSwitchbackPathFeatures(path,labSwitchbackCompositeGeometry(sectionReports));}
function labGenerateSwitchbackSkeleton(config,height=null){
 const savedSeed=courseSeed;try{
  courseSeed=()=>config.seed;const h=height??STAGE_CONFIG.lengthRules[{short:0,middle:1,long:2}[config.length]].height,base=height===null?labCreateOriginalLayout(config):labCreateSwitchbackLayout(config,h);
  level=1;difficulty=0;generatedCourse=null;({holds,route,HEIGHT,initialGrips,densityStats}=base);const guide=base.route,geometry=base.switchback,source=holds.map(h=>({...h}));assignWideHolds(guide);
  const witness=labBuildSwitchbackWitness(guide,geometry);route=witness.route;
  const before=routeConsumption(route),initialFeature=labSwitchbackPathFeatures(route,geometry);if(!initialFeature.validated)throw new CourseGeometryRejection('Actual switchback route has insufficient horizontal span.');
  const beforeCount=holds.length;pruneUnusedHolds();densityStats.fixedSupports=2;
  const savedRoute=route,optimized=optimizeRoute(route),feature=labSwitchbackPathFeatures(optimized,geometry),optimizationAccepted=feature.validated;route=optimizationAccepted?optimized:savedRoute;
  finalizeCourseGeneration('basic');if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final switchback contact and budget validation failed.');
  const recoveryDragReference=witness.variantLimit===4?labAssertRecoveryDragReference(route):null;
  const finalFeature=labSwitchbackPathFeatures(route,geometry);if(!finalFeature.validated)throw new CourseGeometryRejection('Final switchback span validation failed.');
  labSkeletonReport={type:'switchback',length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,orientation:geometry.side<0?'left':'right',routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,contrast:null,optimizationAccepted,switchback:{geometry,features:finalFeature,...(recoveryDragReference?{recoveryDragReference}:{}),unconstrained:{scope:'pre-prune-source-holds',found:!!witness.free,moves:witness.free?routeConsumption(witness.free):null,features:witness.freeFeature,path:witness.free,finalReplay:witness.free?replayRoute(witness.free):null},optimization:{accepted:optimizationAccepted,moves:routeConsumption(optimized),features:feature,path:optimized},variant:witness.variant,attempts:witness.attempts,placementGuide:guide.map(p=>({x:p.x,y:p.y})),phaseMaxTransitions:10000,approachMaxMoves:32,crossMaxMoves:24,suffixMaxMoves:90,variantLimit:witness.variantLimit??2},placement:{engine:'original-createStageGenerator',placedHolds:source.length,scatteredHolds:source.filter(h=>h.row===null).length,densityInitial:base.densityStats.initialTotal,densityRemoved:base.densityStats.iterations,pruneRemoved:beforeCount-holds.length,layoutFingerprint:source.map(h=>[h.id,h.x,h.y,h.type,h.row]),coordinatesMapped:false,extraIds:[]}};
  return labSkeletonReport;
 }catch(e){labSkeletonReport=null;generatedCourse=null;throw e;}finally{courseSeed=savedSeed;}
}

function labGenerateSkeleton(config) {
 if(config.composition!==undefined||config.secondType!==undefined){
  if(config.composition!=='pair'||!['middle','long'].includes(config.length)||!['straight','meander','branch','contrast','switchback'].includes(config.type)||!['straight','meander','branch','contrast','switchback'].includes(config.secondType)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('Invalid two-section configuration; use middle/long and two valid profiles.');
  return labGenerateCompositeSkeleton(config);
 }
 if(config.type==='switchback')return labGenerateSwitchbackSkeleton(config);
 if(config.type==='contrast')return labGenerateContrastSkeleton(config);
 if(config.type==='branch')return labGenerateBranchSkeleton(config);
 const generated=labCreateOriginalLayout(config);
 // The legacy solver requires a traverse for normal non-intro stages. Keep that
 // for the existing meander, waive only for the straight/branch experiment.
 level=config.type==='meander'?2:1;difficulty=0;generatedCourse=null;
 ({holds,route,HEIGHT,initialGrips,densityStats}=generated);
 const placedHolds=holds.length,scatteredHolds=holds.filter(h=>h.row===null).length;
 const layoutFingerprint=holds.map(h=>[h.id,h.x,h.y,h.type,h.row]);
 assignWideHolds(route);
 const solved=solveRoute(route);
 if(!solved)throw new CourseGeometryRejection('Original placement route validation failed at this seed.');
 route=solved;
 const before=routeConsumption(route);
 pruneUnusedHolds();
 densityStats.fixedSupports=2;
 route=optimizeRoute(route);
 // Keep original no-feature finalization (recipe binding, resource replay and
 // density stats), rather than replacing it with a solver-only success flag.
 finalizeCourseGeneration('basic');
 if(!validateRouteBudget(route))throw new CourseGeometryRejection('Final layout contact and stamina validation failed.');
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,
  orientation:config.type==='straight'?(['left','vertical','right'][labStraightDirection(config.seed)+1]):null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,optimizationAccepted:true,
  placement:{engine:'original-createStageGenerator',placedHolds,scatteredHolds,densityInitial:densityStats.initialTotal,densityRemoved:densityStats.iterations,pruneRemoved:densityStats.routeRemoved,layoutFingerprint}};
 return labSkeletonReport;
}
// Pickups are a post-process only: the original heart-free route, holds and
// moves+3 budget are already final. No recipe finalizer/search runs after this.
function labPrepareHearts(config){
 const keys=['heartsFirst','heartsSecond'],specified=keys.some(key=>Object.prototype.hasOwnProperty.call(config,key));
 for(const key of keys)if(Object.prototype.hasOwnProperty.call(config,key)&&(!Number.isInteger(config[key])||config[key]<0||config[key]>3))throw Error('Each section heart cap must be an integer from 0 to 3.');
 labHeartsCache=[];
 if(generatedCourse)generatedCourse.hearts=[];
 if(labSkeletonReport)delete labSkeletonReport.hearts;
 if(!specified)return null;
 const requested={first:config.heartsFirst??0,second:config.heartsSecond??0},moves=route.length-1,budget=routeStamina(route);
 // v6 allows a single pickup across the whole short course, not one per half.
 if(config.length==='short'&&requested.first+requested.second>1)throw Error('Short course heart caps must total at most 1.');
 const disabledReason=null,effectiveRequested=requested;
 const split=labSkeletonReport?.composition?{kind:'composition-seam',y:labSkeletonReport.composition.junction.seam}:{kind:'reference-move-halves',move:Math.floor(moves/2)};
 if(split.kind==='composition-seam'&&!Number.isFinite(split.y))throw Error('Heart section boundary is invalid.');
 const regionFor=(p,step)=>split.kind==='composition-seam'?(p.y>=split.y?'first':'second'):(step<=split.move?'first':'second');
 const minimumDistance=2*HEART_CONFIG.radius+4,candidateStepLimit=16,placements=[],regions={};
 // Native choice hearts end no later than floor(moves*2/3) (two pickups).
 // Retain that global latest deadline for the expanded per-half caps; never
 // apply it independently to the second half or stretch it with the new count.
 const latestReferenceStep=Math.floor(moves*2/3);
 // Unlike makeRouteHearts' global random count/deadlines, each requested half
 // has a seeded ordering of its reference body positions. This limited count
 // extension restores the native latest route deadline, but does not add a
 // budget deadline or reduce the already-fixed initial budget.
 for(const [region,salt] of [['first',0],['second',0x7C1A83D5]]){
  const random=mulberry32(config.seed^0x48EA27B1^salt);
  const eligible=route.slice(1,-1).map((p,i)=>({p,step:i+1})).filter(v=>v.step<=latestReferenceStep&&regionFor(v.p,v.step)===region);
  const ordered=eligible.map(v=>({...v,key:random()})).sort((a,b)=>a.key-b.key||a.step-b.step);
  let checked=0,reachabilityCalls=0,actual=0;const rejected={ownership:0,witnessOwnership:0,overlap:0,onReferenceOffset:0,unreachable:0,lateWitness:0};
  for(const {p,step} of ordered.slice(0,candidateStepLimit)){
   if(actual>=effectiveRequested[region])break;
   checked++;
   const from=route[step-1],length=distance(from,p)||1,dx=-(p.y-from.y)/length,dy=(p.x-from.x)/length;
   for(const offset of [48,-48,64,-64,0]){
    const point={x:offset?clamp(p.x+dx*offset,30,W-30):p.x,y:offset?clamp(p.y+dy*offset,80,HEIGHT-40):p.y};
    if(regionFor(point,step)!==region){rejected.ownership++;continue;}
    if(placements.some(h=>distance(h,point)<minimumDistance-1e-9)){rejected.overlap++;continue;}
    const onReference=route.slice(1).some((q,i)=>torsoTouchesHeart(route[i],q,point));
    if(offset&&onReference){rejected.onReferenceOffset++;continue;}
    reachabilityCalls++;
    const reachable=findCourseHeartMove(point,route);
    if(!reachable){rejected.unreachable++;continue;}
    const fromStep=route.indexOf(reachable.from);
    if(fromStep<0)throw Error('Heart reachability witness does not reference the expected route.');
    if(fromStep>latestReferenceStep){rejected.lateWitness++;continue;}
    if(regionFor(reachable.from,fromStep)!==region){rejected.witnessOwnership++;continue;}
    let contactIds=fromStep?[...route[fromStep].grips]:initialGrips.map(h=>h.id);
    if(!fromStep){const orderedInitial=[...initialGrips];for(const pair of [[0,1],[2,3]]){const sorted=pair.map(i=>orderedInitial[i]).sort((a,b)=>a.x-b.x);pair.forEach((i,j)=>orderedInitial[i]=sorted[j]);}contactIds=orderedInitial.map(h=>h.id);}
    placements.push({id:placements.length,region,referenceStep:step,offset,offReference:!onReference,...point,
     witness:{fromStep,from:{x:reachable.from.x,y:reachable.from.y},to:{x:reachable.to.x,y:reachable.to.y},anchor:[...reachable.anchor],grips:contactIds}});
    actual++;break;
   }
  }
  regions[region]={eligibleSteps:eligible.map(v=>v.step),candidateStepsChecked:checked,candidateStepLimit,reachabilityCalls,actual,requested:effectiveRequested[region],shortfall:effectiveRequested[region]-actual,rejected,
   shortageReason:actual<effectiveRequested[region]?(ordered.length>candidateStepLimit?'bounded-candidate-search-exhausted':'eligible-candidates-exhausted'):null};
 }
 labHeartsCache=placements.map(({id,x,y})=>({id,x,y,collected:false}));
 // Keep the native recipe and reset's visible pickup list identical even when
 // meander's internal level is2 but reset was called with1. Classification in
 // densityStats remains the already-completed heart-free reference analysis.
 if(generatedCourse)generatedCourse.hearts=labHeartsCache.map(h=>({...h}));
 const report={requested,effectiveRequested,disabledReason,actual:{first:regions.first.actual,second:regions.second.actual,total:placements.length},shortfall:{first:regions.first.shortfall,second:regions.second.shortfall},split,
  recovery:HEART_CONFIG.recovery,budgetBefore:budget,budgetAfter:routeStamina(route),budgetFixed:true,referenceMoves:moves,
  lateClimbGuard:{kind:'global-reference-step-deadline',latestReferenceStep,numerator:2,denominator:3,source:'native-choice-maximum-count-two',scope:'reference-step-and-witness; not-spatial-goal-distance'},
  placementStage:'after-heart-free-finalization',selection:'seeded-reference-steps-per-region',seedSalt:0x48EA27B1,secondRegionSalt:0x7C1A83D5,
  offsets:[48,-48,64,-64],fallback:'original-reference-body-point',minimumDistance,candidateStepLimit,reachabilityChecksPerCandidate:COURSE_GENERATION_CONFIG.heartPlacementChecks,
  reachabilityScope:'reachable-drag-from-reference-stance; release-or-return-not-required',completionAfterDetourGuaranteed:false,classificationScope:'heart-free-reference',regions,placements};
 if(labSkeletonReport)labSkeletonReport.hearts=report;
 return report;
}
// Independent seeded draws run only after the final pickup list exists. This
// changes the live initial allowance, never routeStamina or generation budgets.
// Keep the same stage-selected bonus for the base budget. The reduction cap is
// 2N+1, independent of that bonus. Zero pickups still draw zero reduction.
function labHeartStaminaAdjustment(seed,heartCount,baseBudget,bonus=LabStaminaSettings.DEFAULT_BONUS){
 if(!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isInteger(heartCount)||heartCount<0||heartCount>6||!Number.isFinite(baseBudget)||!Number.isSafeInteger(bonus)||bonus<0||!Number.isSafeInteger(heartCount*2+bonus))throw Error('Invalid stamina adjustment configuration.');
 const seedSalt=0x59D2F6A7,random=mulberry32(seed^seedSalt);
 const draws=Array.from({length:heartCount},()=>2+Math.floor(random()*2));
 const rawReduction=draws.reduce((sum,n)=>sum+n,0),cap=heartCount*2+1,appliedReduction=Math.min(rawReduction,cap);
 const initialStamina=baseBudget-appliedReduction;
 return {heartCount,draws,rawReduction,cap,appliedReduction,baseBudget,initialStamina,seedSalt,
  distribution:'independent-uniform-integers-2-to-3',allHeartsRecovery:heartCount*HEART_CONFIG.recovery,
  allHeartsReferenceRemainder:bonus+heartCount*HEART_CONFIG.recovery-appliedReduction,
  startAllowed:initialStamina>0,placementStage:'after-final-heart-placement',
  scope:'arithmetic-only; pickup-access-and-clear-not-guaranteed'};
}
function labPrepareStaminaAdjustment(config){
 const setting=LabStaminaSettings.normalize(config),h=labSkeletonReport?.hearts;
 const referenceValidationBudget=routeStamina(route),baseBudget=routeExpectedMoves(route)+setting.bonus;
 if(!Number.isSafeInteger(baseBudget))throw Error('Base stamina exceeds the safe integer range.');
 const adjustment=labHeartStaminaAdjustment(config.seed,labHeartsCache?.length??0,baseBudget,setting.bonus);
 labStaminaCache=adjustment;labSkeletonReport.budget=baseBudget;
 if(h){
  h.budgetBefore=baseBudget;h.staminaAdjustment=adjustment;h.budgetAfter=adjustment.initialStamina;
  h.referenceBudgetFixed=true;h.budgetFixed=adjustment.appliedReduction===0;
 }
 if(setting.explicit){
  const {explicit,...resolved}=setting;
  if(h)h.referenceValidationBudget=referenceValidationBudget;
  labSkeletonReport.stamina={...resolved,referenceValidationBudget,baseBudget,adjustment};
  labSkeletonReport.budget=baseBudget;
 }
 return adjustment;
}

// Explicit production boundary. The extracted solver uses tutorial identities
// internally; neither those identities nor a failed partial layout may leak to
// progression, daily rewards, ranking, preview or a later retry.
function generateCourseFromRecipe(recipe) {
 if(!recipe||!['number','string'].includes(typeof recipe.seed)||!/^\d{1,10}$/.test(String(recipe.seed))||Number(recipe.seed)>4294967295)throw Error('Invalid course recipe seed');
 const config={...recipe,seed:Number(recipe.seed)};
 const hasActiveGeneration=typeof activeCourseGeneration!=='undefined';
 const previousActiveGeneration=hasActiveGeneration?activeCourseGeneration:null;
 const saved={level,difficulty,dailyRun,courseMode,courseSeed,holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,
  labSkeletonReport,labHeartsCache,labStaminaCache};
 const immutable=value=>{
  if(value&&typeof value==='object'){Object.values(value).forEach(immutable);Object.freeze(value);}
  return value;
 };
 const copy=value=>immutable(JSON.parse(JSON.stringify(value)));
 try {
  if(hasActiveGeneration)activeCourseGeneration=null;
  level=1;difficulty=0;dailyRun=null;courseMode='existing';courseSeed=()=>config.seed;
  labHeartsCache=null;labStaminaCache=null;labSkeletonReport=null;generatedCourse=null;
  labGenerateSkeleton(config);labPrepareSpikes(config);labPrepareHearts(config);labPrepareStaminaAdjustment(config);
  if(generatedCourse)Object.assign(generatedCourse,{level:saved.level,difficulty:saved.difficulty,mode:saved.courseMode,seed:config.seed,holds});
  return Object.freeze({recipe:copy(config),report:copy(labSkeletonReport),hearts:copy(labHeartsCache),stamina:copy(labStaminaCache)});
 } catch(error) {
  ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,labSkeletonReport,labHeartsCache,labStaminaCache}=saved);
  throw error;
 } finally {
  ({level,difficulty,dailyRun,courseMode,courseSeed}=saved);
  if(hasActiveGeneration)activeCourseGeneration=previousActiveGeneration;
 }
}
