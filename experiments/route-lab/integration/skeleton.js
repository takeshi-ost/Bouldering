'use strict';
// Route Lab only. Original files are copied byte-for-byte; no movement rule is replaced.
const LAB_SKELETON_VERSION='0.2.0';
function labReadConfig(search) {
 const q=new URLSearchParams(search); if(!q.has('lab'))return null;
 if(q.get('lab')!=='1')throw Error('無効な試遊モードです。入口で選び直してください。');
 const type=q.get('type'),length=q.get('length'),raw=q.get('seed');
 if(!['straight','meander','branch'].includes(type)||!['short','middle','long'].includes(length)||!/^\d{1,10}$/.test(raw||'')||Number(raw)>4294967295)throw Error('骨格・長さ・seed の設定が無効です。入口で選び直してください。');
 return Object.freeze({type,length,seed:Number(raw),guide:q.get('guide')==='1'});
}
let labSkeletonConfig=null,labSkeletonReport=null;
function labGenerateSkeleton(config) {
 // Deliberately separate from the archived prototype and tutorial generation.
 // level=1 only waives the old solver's mandatory horizontal traverse gate.
 // Geometry below uses no tutorial stations; lengths are real 700/1400/2100px walls.
 level=1;difficulty=0;HEIGHT={short:700,middle:1400,long:2100}[config.length];
 if(!HEIGHT||!['straight','meander','branch'].includes(config.type)||!Number.isInteger(config.seed)||config.seed<0||config.seed>4294967295)throw Error('無効な骨格設定です。');
 holds=[];route=[];generatedCourse=null;densityStats={};
 const random=mulberry32(config.seed),mirror=random()<.5?-1:1,offset=(random()-.5)*12;
 const amplitude=72+random()*6,period=350+random()*20,branchAmplitude=124+random()*6;
 const base=config.type==='branch'?200-mirror*50:200+offset;
 const start={x:base,y:HEIGHT-140};let id=0;
 const add=(x,y,type='normal',wide=false)=>{const h={id:id++,x,y,type,wide};holds.push(h);return h;};
 const band=Math.min(400,start.y-190),mid=(start.y+170)/2,upper=mid-band/2,lower=mid+band/2;
 const center=y=>config.type==='meander'?base+mirror*amplitude*Math.sin((start.y-y)/period*Math.PI*2):
  config.type==='branch'?base+(y>upper&&y<lower?mirror*branchAmplitude*Math.sin((lower-y)/band*Math.PI):0):base;
 const hand=add(start.x,start.y-68,'start',true);
 initialGrips=[hand,hand,add(start.x-70,HEIGHT-50,'start'),add(start.x+70,HEIGHT-50,'start')];
 // Two narrow rows per station, not full-wall filler. The branch has contacts only
 // in its local band and rejoins the SAME primary line; there is exactly one goal.
 for(let y=HEIGHT-100;y>=110;y-=40)for(const cx of config.type==='branch'?[base,center(y+68)]:[center(y+68)])for(const dx of [-45,45]) {
  const p={x:cx+dx,y};if(!insideStartTriangle(p,initialGrips)&&!holds.some(h=>distance(h,p)<15))add(p.x,p.y);
 }
 const goal=add(config.type==='branch'?base:center(170),100,'goal');
 const primary=[start],alternative=[start];
 for(let y=start.y-40;y>170;y-=40){primary.push({x:config.type==='branch'?base:center(y),y});alternative.push({x:center(y),y});}
 primary.push({x:goal.x,y:170});alternative.push({x:goal.x,y:170});
 const solved=solveRoute(primary,60);
 if(!solved)throw Error('指定した骨格のルートを検証できませんでした。別seedを試してください。');
 route=solved;
 const before=routeConsumption(route);
 route=optimizeRoute(route,{maxTransitions:500,passes:1});
 if(!validateRouteBudget(route))throw Error('最終ルートの接触・スタミナ検証に失敗しました。別seedを試してください。');
 let other=null;
 if(config.type==='branch') {
  other=solveRoute(alternative,60);
  const excursion=other?Math.max(...other.map(p=>mirror*(p.x-base))):0;
  // A second solver result is not automatically a branch: it must actually use
  // the side lane and return to the common goal within the original stamina rule.
  if(!other||excursion<65||!samePairRoute(other,replayRoute(other))||!routeResources(other,{pickups:[],budget:routeStamina(route)}).valid)
   throw Error('本線と寄り道の両方を検証できませんでした。別seedを試してください。');
 }
 densityStats.fixedSupports=2;updateStageDensity();
 labSkeletonReport={type:config.type,length:config.length,seed:config.seed,version:LAB_SKELETON_VERSION,height:HEIGHT,movesBefore:before,movesAfter:routeConsumption(route),budget:routeStamina(route),holds:holds.length,validated:true,search:'bounded',optimizationLimit:500,
  routeSpan:Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)),travelX:route.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-route[i].x),0),branchMoves:other?other.length-1:null,branchRoute:other,branchBand:other?{upper,lower,base,mirror}:null};
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
 labPostStatus(`経路検証済み · ${r.movesBefore}→${r.movesAfter}手（限定探索） · スタミナ${r.budget}${r.branchMoves?` · 寄り道${r.branchMoves}手`:''}`);
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
