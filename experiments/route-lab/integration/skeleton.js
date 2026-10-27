'use strict';
// Route Lab only. Original files are copied byte-for-byte; no movement rule is replaced.
const LAB_SKELETON_VERSION='0.2.1';
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
function labCreateOriginalLayout(config) {
 const index={short:0,middle:1,long:2}[config.length];
 if(index===undefined||!['straight','meander','branch'].includes(config.type)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('無効な骨格設定です。');
 const generator=createStageGenerator();generator.generate(1);
 const saved={stageLengthRule,makeStageCourse};
 const tutorial=config.type!=='meander' && config.length==='short';
 try {
  stageLengthRule=(n,seed)=>n===1?saved.stageLengthRule(n,seed):STAGE_CONFIG.lengthRules[index];
  if(config.type!=='meander')makeStageCourse=()=>s=>({x:W/2,y:-s,nx:1,ny:0});
  return generator.generate(tutorial?1:2,false,config.seed,config.seed);
 } finally {stageLengthRule=saved.stageLengthRule;makeStageCourse=saved.makeStageCourse;}
}
function labLocalizeAlternative(primary,alternative){
 const windows=[];
 for(let a=0;a<primary.length-2;a++)for(let b=a+2;b<primary.length;b++){
  const rise=primary[a].y-primary[b].y;
  if(rise<160||rise>500)continue;
  const middle=(primary[a].y+primary[b].y)/2,target=(primary[0].y+primary.at(-1).y)/2;
  if(Math.abs(middle-target)>250)continue;
  windows.push({a,b,rise,score:Math.abs(middle-target)});
 }
 windows.sort((a,b)=>a.score-b.score||a.rise-b.rise);
 for(const {a,b} of windows.slice(0,96)){
  const points=alternative.slice(1,-1).filter(p=>p.y<primary[a].y-1&&p.y>primary[b].y+1);
  if(points.length<2)continue;
  const candidate=[...primary.slice(0,a+1),...points,...primary.slice(b)];
  if(candidate.length>primary.length+3)continue;
  const played=replayRoute(candidate);if(!played||played.length!==candidate.length)continue;
  if(!routeResources(played,{pickups:[],budget:routeStamina(primary)}).valid)continue;
  const suffix=a+1+points.length;
  const same=(x,y)=>JSON.stringify(x.grips)===JSON.stringify(y.grips)&&JSON.stringify(x.anchor)===JSON.stringify(y.anchor);
  let join=null;
  for(let j=b;j<primary.length;j++){
   if(primary.slice(j).every((p,k)=>same(p,played[suffix+j-b+k]))){join=j;break;}
  }
  // A shared real goal is a valid rejoin for short courses even with different feet.
  if(join===null&&HEIGHT===700&&bothHandsOnGoal(played.at(-1).grips.map(id=>holds.find(h=>h.id===id))))join=primary.length-1;
  if(join===null||primary[a].y-primary[join].y>500)continue;
  const region=played.slice(a+1,suffix+join-b+1);
  const excursion=Math.max(...region.map(p=>Math.abs(p.x-200)));
  const newIds=new Set(region.flatMap(p=>p.grips||[]).filter(id=>!primary.some(p=>(p.grips||[]).includes(id))));
  const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
  const separation=Math.max(...region.map(p=>Math.min(...primary.slice(1).map((q,i)=>segmentDistance(p,primary[i],q)))));
  if(excursion<65||separation<45||newIds.size<2)continue;
  return {route:played,details:{departureIndex:a,rejoinIndex:join,alternateRejoinIndex:suffix+join-b,upper:primary[join].y,lower:primary[a].y,excursion,separation,newContacts:newIds.size}};
 }
 return null;
}
// Branch contacts come from the original fillWall scatter, never a second lane
// placer. Search at most six guide biases; splice only a local middle segment.
function labFindOriginalBranch(primary) {
 const bottom=primary[0].y,top=primary.at(-1).y,band=Math.min(460,bottom-top-40),mid=(bottom+top)/2,upper=mid-band/2,lower=mid+band/2;
 let attempts=0;
 for(const amplitude of [90,-90,110,-110,70,-70]) {
  attempts++;
  const guide=primary.map(p=>({...p,x:p.x+(p.y<lower&&p.y>upper?amplitude*Math.sin((lower-p.y)/band*Math.PI):0)}));
  const full=solveRoute(guide,60),local=full&&labLocalizeAlternative(primary,full);
  if(local)return {...local,attempts};
 }
 throw Error('従来式の配置から、局所で合流する別経路を検証できませんでした（探索上限6回）。別seedを試してください。');
}
function labPruneBothRoutes(alternative) {
 const originalSame=samePairRoute;
 try {
  // Run ORIGINAL pruning, vetoing a removal only if it changes the second
  // witness. This also protects selector-lookahead holds, not just used IDs.
  samePairRoute=(expected,actual)=>originalSame(expected,actual)&&originalSame(alternative,replayRoute(alternative));
  pruneUnusedHolds();
 } finally {samePairRoute=originalSame;}
}

function labGenerateSkeleton(config) {
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
 let branch=config.type==='branch'?labFindOriginalBranch(route):null;
 if(branch)labPruneBothRoutes(branch.route);else pruneUnusedHolds();
 densityStats.fixedSupports=2;
 const prunedPrimary=route,optimized=optimizeRoute(route);
 let optimizationAccepted=true;
 if(branch) {
  const revised=labLocalizeAlternative(optimized,branch.route);
  if(revised) {route=optimized;branch={...branch,...revised};}
  else {route=prunedPrimary;optimizationAccepted=false;}
 } else route=optimized;
 // Keep original no-feature finalization (recipe binding, resource replay and
 // density stats), rather than replacing it with a solver-only success flag.
 finalizeCourseGeneration('basic');
 if(branch && (!samePairRoute(branch.route,replayRoute(branch.route))||!routeResources(branch.route,{pickups:[],budget:routeStamina(route)}).valid))throw Error('分岐の最終接触・スタミナ検証に失敗しました。別seedを試してください。');
 if(!validateRouteBudget(route))throw Error('最終配置の接触・スタミナ検証に失敗しました。別seedを試してください。');
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:ROUTE_OPTIMIZATION_CONFIG.maxTransitions,
  routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:branch?branch.route.length-1:null,branchRoute:branch?.route||null,branchBand:branch?.details||null,branchAttempts:branch?.attempts||0,optimizationAccepted,
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
  try {originalDrawPath();if(labSkeletonConfig?.guide&&labSkeletonReport?.branchRoute){ctx.save();ctx.setLineDash([4,7]);const path=labSkeletonReport.branchRoute;for(let i=1;i<path.length;i++)line(path[i-1],path[i],'#b473269c',2);ctx.restore();}}
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
 labPostStatus(`従来配置 ${r.placement.placedHolds}→${r.holds}個 · 経路検証済み · ${r.movesBefore}→${r.movesAfter}手（限定探索） · スタミナ${r.budget}${r.branchMoves?` · 寄り道${r.branchMoves}手`:''}`);
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
