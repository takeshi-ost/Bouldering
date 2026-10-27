'use strict';
// Route Lab only. Original files are copied byte-for-byte; no movement rule is replaced.
const LAB_SKELETON_VERSION='0.3.2';
function labReadConfig(search) {
 const q=new URLSearchParams(search); if(!q.has('lab'))return null;
 if(q.get('lab')!=='1')throw Error('無効な試遊モードです。入口で選び直してください。');
 const type=q.get('type'),length=q.get('length'),raw=q.get('seed');
 if(!['straight','meander','branch'].includes(type)||!['short','middle','long'].includes(length)||!/^\d{1,10}$/.test(raw||'')||Number(raw)>4294967295)throw Error('骨格・長さ・seed の設定が無効です。入口で選び直してください。');
 return Object.freeze({type,length,seed:Number(raw),guide:q.get('guide')==='1'});
}
let labSkeletonConfig=null,labSkeletonReport=null;
// The actual original placer is used, not a parallel grid or a new hold-adder.
// First calibrate with pristine STAGE 1, then override ONLY length/centerline.
function labStraightDirection(seed) {
 // Seed 1 remains the unchanged tutorial reference. Other seeds select the
 // centerline independently of the original placer RNG.
 return seed===1?0:Math.floor(mulberry32(seed ^ 0x72E5A491)()*3)-1;
}
function labCreateOriginalLayout(config) {
 const index={short:0,middle:1,long:2}[config.length];
 if(index===undefined||!['straight','meander','branch'].includes(config.type)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('無効な骨格設定です。');
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
function labGenerateArm(height,seed,side){
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse};
 const diagonal=Math.hypot(144,220),stem=120;
 try{
  stageLengthRule=()=>({category:'lab',height,climbHeight:200});
  makeStageCourse=()=>s=>{
   if(s<stem)return {x:200,y:-s,nx:1,ny:0};
   if(s<stem+diagonal){const t=(s-stem)/diagonal;return {x:200+side*144*t,y:-stem-220*t,nx:220/diagonal,ny:side*144/diagonal};}
   return {x:200+side*144,y:-stem-220-(s-stem-diagonal),nx:1,ny:0};
  };
  return generator.generate(2,false,seed,seed);
 }finally{stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;}
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
function labBranchSpread(points,paths,height){
 const segment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
 const distanceToRoute=p=>Math.min(...paths.flatMap(path=>path.slice(1).map((q,i)=>segment(p,path[i],q))));
 const scatter=points.filter(h=>h.row===null),distances=scatter.map(distanceToRoute).sort((a,b)=>a-b);
 const near=points.filter(h=>distanceToRoute(h)<25).length;
 return {holds:points.length,scatter:scatter.length,onRoute25:near,onRoute25Per100:near/(height/100),offRoute65:distances.filter(d=>d>=65).length,
  scatterDistanceP50:distances.length?distances[Math.floor(distances.length*.5)]:null,scatterDistanceP90:distances.length?distances[Math.floor(distances.length*.9)]:null,
  grid50x100Occupancy:new Set(points.map(h=>Math.floor(h.x/50)+','+Math.floor(h.y/100))).size,
  sideStats:[-1,1].map(side=>{const xs=scatter.filter(h=>side*(h.x-200)>0).map(h=>h.x),mean=xs.reduce((a,b)=>a+b,0)/(xs.length||1);return {side,count:xs.length,xStd:Math.sqrt(xs.reduce((sum,x)=>sum+(x-mean)**2,0)/(xs.length||1)),xRange:xs.length?Math.max(...xs)-Math.min(...xs):0};})};
}
// A small branch-only nudge of existing random scatter, never route supports.
// Round to whole holds (target one in eight), cap at two and one per 160px band.
// Both contact witnesses must remain byte-for-byte playable after each removal.
function labNudgeBranchScatter(correctSide,wrongPath,seed,cutoff){
 const paths=[route,wrongPath],used=new Set([...initialGrips.map(h=>h.id),...paths.flatMap(path=>path.flatMap(p=>p.grips||[]))]);
 const config={targetFraction:.125,maxRemoved:2,minRetainedScatter:4,bandHeight:160,sideOffsetMin:26,sideOffsetMax:166,topMargin:100,startMargin:180};
 const inSide=(h,side)=>side*(h.x-200)>=config.sideOffsetMin&&side*(h.x-200)<=config.sideOffsetMax;
 const isScatter=h=>h.row===null&&h.type==='normal';
 const trueScatter=holds.filter(h=>isScatter(h)&&inSide(h,correctSide));
 const eligible=holds.filter(h=>isScatter(h)&&!h.wide&&!used.has(h.id)&&inSide(h,correctSide)&&h.y>=config.topMargin&&h.y<=HEIGHT-config.startMargin);
 const window={yMin:cutoff+40,yMax:HEIGHT-config.startMargin,sideOffsetMin:config.sideOffsetMin,sideOffsetMax:config.sideOffsetMax};
 window.area=(window.yMax-window.yMin)*(window.sideOffsetMax-window.sideOffsetMin);
 const segment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
 const measure=()=>[-1,1].map(side=>{const path=side===correctSide?route:wrongPath,scatter=holds.filter(h=>isScatter(h)&&inSide(h,side)&&h.y>=window.yMin&&h.y<=window.yMax),extras=scatter.filter(h=>!used.has(h.id));
  const distances=extras.map(h=>Math.min(...path.slice(1).map((p,i)=>segment(h,path[i],p))));
  return {side,role:side===correctSide?'correct':'wrong',scatter:scatter.length,extra:extras.length,extraPer10000:extras.length/window.area*10000,distanceBands:[distances.filter(d=>d<45).length,distances.filter(d=>d>=45&&d<90).length,distances.filter(d=>d>=90).length]};});
 const before=measure(),target=Math.min(config.maxRemoved,Math.max(0,trueScatter.length-config.minRetainedScatter),Math.round(trueScatter.length*config.targetFraction));
 // Prefer the common-height comparison region; ties use a separate seeded stream.
 const ranked=eligible.map(h=>({h,common:h.y>=window.yMin&&h.y<=window.yMax,key:mulberry32(seed^0x4A17B3D9^h.id)()})).sort((a,b)=>Number(b.common)-Number(a.common)||a.key-b.key||a.h.id-b.h.id);
 const removed=[],replayRejected=[],bands=new Set();
 for(const {h} of ranked){
  if(removed.length>=target)break;
  const band=Math.floor(h.y/config.bandHeight);if(bands.has(band))continue;
  const previous=holds;holds=holds.filter(p=>p.id!==h.id);
  if(samePairRoute(route,replayRoute(route))&&samePairRoute(wrongPath,labReplayPartial(wrongPath))){removed.push(h.id);bands.add(band);}
  else {holds=previous;replayRejected.push(h.id);}
 }
 densityStats.selectionHoldIds=(densityStats.selectionHoldIds||[]).filter(id=>holds.some(h=>h.id===id));
 updateStageDensity();
 return {config,window,correctSide,wrongSide:-correctSide,mandatoryIds:[...used].sort((a,b)=>a-b),trueScatterBefore:trueScatter.length,trueScatterAfter:trueScatter.length-removed.length,eligibleIds:eligible.map(h=>h.id),target,removedIds:removed,replayRejectedIds:replayRejected,before,after:measure()};
}

function labGenerateDeadEnd(config){
 const height={short:700,middle:1400,long:2100}[config.length],seed=config.seed;
 if(!height||!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error('無効な分岐設定です。');
 const correctSide=mulberry32(seed^0xA511)()<.5?-1:1,wrongSide=-correctSide;
 const savedSeed=courseSeed;courseSeed=()=>seed;
 try{
  level=1;difficulty=0;generatedCourse=null;
  const correct=labGenerateArm(height,seed,correctSide),wrongLayout=labGenerateArm(height,seed,wrongSide);
  HEIGHT=height;initialGrips=correct.initialGrips;densityStats={...correct.densityStats};
  const cutoff=Math.max(160,height-600);
  holds=[...correct.holds];
  for(const h of wrongLayout.holds){
   if(h.type==='start'||holds.some(p=>distance(p,h)<52))continue;
   holds.push({...h,type:h.type==='goal'?'normal':h.type});
  }
  const mergedCount=holds.length;
  // Keep the original 2D scatter; truncate only the wrong-side normal endpoint.
  // No central strip is removed and no new lattice or hold placer is added.
  holds=holds.filter(h=>h.type==='goal'||!(wrongSide*(h.x-200)>20&&h.y<cutoff));
  holds.forEach((h,i)=>h.id=i);
  const filteredCount=holds.length;
  const placement={engine:'original-createStageGenerator',placedHolds:mergedCount,scatteredHolds:holds.filter(h=>h.row===null).length,
   densityInitial:correct.densityStats.initialTotal+wrongLayout.densityStats.initialTotal,
   densityRemoved:correct.densityStats.iterations+wrongLayout.densityStats.iterations,
   sourceHoldCounts:[correct.holds.length,wrongLayout.holds.length],postFilterRemoved:mergedCount-filteredCount,
   layoutFingerprint:holds.map(h=>[h.id,h.x,h.y,h.type,h.row]),mergeMinSpacing:52,geometryFilter:{centralGapApplied:false,wrongSide,wrongCutoff:cutoff}};
  route=correct.route;assignWideHolds(route);
  const primary=solveRoute(correct.route,60);
  if(!primary)throw Error('このseedでは左右分岐の正解経路を検証できませんでした。別seedを試してください。');
  const wrongGuide=wrongLayout.route.filter(p=>p.y>=cutoff+70);
  wrongGuide.push({x:200+wrongSide*140,y:cutoff+60});
  const wrong=labPartialSearch(wrongGuide,{stop:(p,contacts,path)=>wrongSide*(p.x-200)>90&&p.y<=cutoff+75&&path.length>=4});
  if(!wrong.found||wrong.limitReached)throw Error('このseedでは通常ホールドの行き止まりへ到達する経路を検証できませんでした。');
  route=primary;const labPointSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
  const labRouteDistance=h=>Math.min(...[primary,wrong.path].flatMap(path=>path.slice(1).map((q,i)=>labPointSegment(h,path[i],q))));
  const buckets=new Set(),protectedScatter=new Set();
  const candidates=holds.filter(h=>h.row===null&&labRouteDistance(h)>=45).map(h=>({h,key:mulberry32(seed^0x77F0^h.id)()})).sort((a,b)=>a.key-b.key||a.h.id-b.h.id);
  for(const {h} of candidates){const key=(h.x<200?'L':'R')+Math.floor(h.y/160);if(buckets.has(key))continue;buckets.add(key);protectedScatter.add(h.id);}
  placement.protectedScatterIds=[...protectedScatter].sort((a,b)=>a-b);
  placement.protectedScatterCount=protectedScatter.size;
  placement.scatterRetention={source:'original-row-null',minimumBodyRouteDistance:45,bandHeight:160,maxPerSidePerBand:1};
  placement.spreadBefore=labBranchSpread(holds,[primary,wrong.path],HEIGHT);
  const originalSame=samePairRoute;
  try{samePairRoute=(a,b)=>originalSame(a,b)&&[...protectedScatter].every(id=>holds.some(h=>h.id===id))&&originalSame(wrong.path,labReplayPartial(wrong.path));pruneUnusedHolds();}
  finally{samePairRoute=originalSame;}
  const before=route.length-1;route=optimizeRoute(route);densityStats.fixedSupports=2;updateStageDensity();
  if(!validateRouteBudget(route)||!samePairRoute(wrong.path,labReplayPartial(wrong.path)))throw Error('分岐の最終接触検証に失敗しました。');
  const endpoint=wrong.path.at(-1),stance=endpoint.grips.map(id=>holds.find(h=>h.id===id));
  if(stance.some(h=>h.type==='goal'))throw Error('行き止まりにゴールが混入しました。');
  // Endpoint reachability is validated. Returning or crossing is not an admission rule.
  const separation=correctSide<0?endpoint.x-Math.min(...route.map(p=>p.x)):Math.max(...route.map(p=>p.x))-endpoint.x;
  if(separation<200)throw Error('左右の経路の間隔が不足しています。');
  placement.pruneRemoved=filteredCount-holds.length;
  placement.densityBias=labNudgeBranchScatter(correctSide,wrong.path,seed,cutoff);
  placement.protectedScatterIds=placement.protectedScatterIds.filter(id=>holds.some(h=>h.id===id));
  placement.protectedScatterCount=placement.protectedScatterIds.length;
  placement.spreadFinal=labBranchSpread(holds,[route,wrong.path],HEIGHT);
  return {primary:route,wrong:wrong.path,before,placement,details:{kind:'dead-end',correctSide,wrongSide,cutoff,bodySeparation:separation,endpoint,
   search:{transitions:wrong.transitions,expanded:wrong.expanded,limit:wrong.limit,maxMoves:wrong.maxMoves,beamWidth:wrong.beamWidth},
   deadEnd:{scope:'endpoint-only',returnRequired:false,crossoverExcluded:false}}};
 }finally{courseSeed=savedSeed;}
}

function labGenerateBranchSkeleton(config) {
 const branch=labGenerateDeadEnd(config);
 finalizeCourseGeneration('basic');
 if(!validateRouteBudget(route)||!samePairRoute(branch.wrong,labReplayPartial(branch.wrong)))throw Error('分岐の最終配置検証に失敗しました。別seedを試してください。');
 if(routeStamina(route)<branch.wrong.length)throw Error('誤側の先端まで進むスタミナが不足する配置です。別seedを試してください。');
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:branch.before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,
  orientation:null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:branch.wrong.length-1,branchRoute:branch.wrong,branchDetails:branch.details,optimizationAccepted:true,placement:branch.placement};
 return labSkeletonReport;
}
function labGenerateSkeleton(config) {
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
 if(!solved)throw Error('従来式の配置で経路を検証できませんでした。別seedを試してください。');
 route=solved;
 const before=routeConsumption(route);
 pruneUnusedHolds();
 densityStats.fixedSupports=2;
 route=optimizeRoute(route);
 // Keep original no-feature finalization (recipe binding, resource replay and
 // density stats), rather than replacing it with a solver-only success flag.
 finalizeCourseGeneration('basic');
 if(!validateRouteBudget(route))throw Error('最終配置の接触・スタミナ検証に失敗しました。別seedを試してください。');
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,
  orientation:config.type==='straight'?(['left','vertical','right'][labStraightDirection(config.seed)+1]):null,routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:null,branchRoute:null,branchDetails:null,optimizationAccepted:true,
  placement:{engine:'original-createStageGenerator',placedHolds,scatteredHolds,densityInitial:densityStats.initialTotal,densityRemoved:densityStats.iterations,pruneRemoved:densityStats.routeRemoved,layoutFingerprint}};
 return labSkeletonReport;
}
function labPostStatus(text) {
 if(globalThis.parent && globalThis.parent!==globalThis)globalThis.parent.postMessage({kind:'ascent-lab-status',text},globalThis.location.origin);
}
function labBootSkeleton() {
 let config;
 try {config=labReadConfig(globalThis.location?.search||'');}
 catch(error){labFailSkeleton(error);return;}
 if(!config)return;
 labSkeletonConfig=config;
 const originalPrepare=prepareCurrentStage;
 prepareCurrentStage=function(){if(!labSkeletonConfig)return originalPrepare();difficulty=0;level=1;labGenerateSkeleton(labSkeletonConfig);};
 const originalSeed=courseSeed;
 courseSeed=function(n=level){return labSkeletonConfig?labSkeletonConfig.seed:originalSeed(n);};
 const originalHearts=createHearts;
 createHearts=function(...args){return labSkeletonConfig?[]:originalHearts(...args);};
 const originalDrawPath=drawPath;
 drawPath=function(){
  const previous=debugMode;if(labSkeletonConfig?.guide)debugMode=true;
  try {originalDrawPath();if(labSkeletonConfig?.guide&&labSkeletonReport?.branchRoute){ctx.save();ctx.setLineDash([4,7]);const path=labSkeletonReport.branchRoute;for(let i=1;i<path.length;i++)line(path[i-1],path[i],'#b47326bd',2.5);const end=path.at(-1);ctx.setLineDash([]);line({x:end.x-7,y:end.y},{x:end.x+7,y:end.y},'#a26925',2);ctx.font='bold 11px system-ui';ctx.textAlign=end.x>W/2?'right':'left';ctx.fillStyle='#87581e';ctx.fillText('枝の先端',end.x+(end.x>W/2?-12:12),end.y-8);ctx.restore();}}
  finally{debugMode=previous;}
 };
 const originalUpdate=updateUI;
 updateUI=function(){originalUpdate();if(labSkeletonConfig)ui.level.textContent=({straight:'STRAIGHT',meander:'MEANDER',branch:'BRANCH'})[labSkeletonConfig.type];};
 const originalFinish=finish;
 finish=function(won){originalFinish(won);ui.resultRanking.hidden=true;ui.overlay.classList.toggle('has-ranking',false);ui.resultStats.hidden=false;ui.resultStats.textContent=`${moveCount}手 / seed ${labSkeletonConfig.seed}`;ui.resultTap.textContent='TAP：同じ条件でもう一度';ui.resultTipText.textContent='骨格を比べるには上の「比較へ」。最短手数・同じ難しさを保証するものではありません。';};
 recordStageClear=()=>{};recordMapRewardClear=()=>{};recordAdPlay=()=>{};
 const restart=()=>{try{endPointer(null,true);endPan();touchId=null;ignoreTouches=false;reset(1);labReportReady();}catch(error){labFailSkeleton(error);}};
 ui.retry.onclick=restart;ui.next.onclick=restart;ui.closeResult.onclick=restart;
 returnFromStage=restart;
 titlePreparation++;titleReady=false;cancelMapReveal();hideStageStart();
 ui.wall.classList.toggle('title-open',false);
 restart();
}
function labReportReady(){
 const r=labSkeletonReport;if(!r)return;
 labPostStatus(`従来配置 ${r.placement.placedHolds}→${r.holds}個 · 経路検証済み · ${r.movesBefore}→${r.movesAfter}手（限定探索） · スタミナ${r.budget}${r.orientation?' · '+({left:'左斜め',vertical:'垂直',right:'右斜め'})[r.orientation]:''}${r.branchMoves?` · 誤側先端${r.branchMoves}手（帰還判定なし）`:''}`);
}
function labFailSkeleton(error){
 titlePreparation++;titleReady=false;cameraIntro=null;state='choosing';
 ui.titleScreen.hidden=true;ui.levelMap.hidden=true;ui.hud.hidden=true;
 ui.wall.classList.toggle('title-open',false);ui.wall.classList.toggle('map-open',false);
 hideResultModal();hideSettings();
 let box=document.getElementById('labGenerationError');
 if(!box && document.createElement){box=document.createElement('div');box.id='labGenerationError';box.setAttribute('role','alert');box.style.cssText='position:absolute;inset:20% 10% auto;padding:24px;background:#fff7ed;color:#653f32;border:2px solid #bd7e66;border-radius:12px;z-index:100';ui.wall.append(box);}
 const message='生成できませんでした。'+String(error.message||error)+' 上の「比較へ」から設定を変更できます。';
 if(box){box.hidden=false;box.textContent=message;}labPostStatus(message);
}
labBootSkeleton();
