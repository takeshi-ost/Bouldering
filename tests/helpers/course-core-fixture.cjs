'use strict';
// Isolated native-function fixture: no boot, SDK, browser storage or network.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const engineFiles=['config','utils','difficulty','stage','game','route','course','hazards'];
const environment=`
const gameText=key=>key,performance={now:()=>2000};
const document={getElementById(){return {getContext(){return {};}}}};
`;
function create({engineRoot=root,engineSources=null,coreSource=null,staminaSource=null,productionBoundary=false}={}) {
 const modern=!engineSources&&fs.existsSync(path.join(engineRoot,'js/difficulty-config.js'));
 const files=modern?['config','course-progression-config','course-distribution-config','course-distribution','course-progression','difficulty-config',...engineFiles.slice(1)]:engineFiles;
 const source=files.map(name=>engineSources?.['js/'+name+'.js']??fs.readFileSync(path.join(engineRoot,'js',name+'.js'),'utf8')).join('\n');
 const core=coreSource??fs.readFileSync(path.join(root,'js/course-generator-core.js'),'utf8');
 const stamina=staminaSource??fs.readFileSync(path.join(root,'js/course-stamina-settings.js'),'utf8');
 return new Function('globalThis','productionBoundary',environment+source+'\n'+stamina+'\n'+core+'\n'+(modern?fs.readFileSync(path.join(engineRoot,'js/course-adoption.js'),'utf8'):'')+`
 const fixtureGenerate=function(config){
  const savedSeed=courseSeed;
  try {
   labHeartsCache=null;labStaminaCache=null;hearts=[];generatedCourse=null;difficulty=0;level=1;
   courseSeed=()=>config.seed;
   if(productionBoundary)generateCourseFromRecipe(config);
   else {labGenerateSkeleton(config);labPrepareSpikes(config);labPrepareHearts(config);labPrepareStaminaAdjustment(config);}
   if(!samePairRoute(route,replayRoute(route)))throw Error('Final route does not replay');
   return JSON.parse(JSON.stringify({holds,route,HEIGHT,initialGrips,hearts:labHeartsCache,stamina:labStaminaCache,report:labSkeletonReport}));
  } finally {courseSeed=savedSeed;}
 };
 fixtureGenerate.identityContract=function(config,fail=false){
  level=207;difficulty=3;courseMode='prototype';dailyRun={date:'2026-10-31',seed:20261031};
  const previousActive=typeof activeCourseGeneration!=='undefined'?{previousCourse:true}:undefined;
  if(previousActive)activeCourseGeneration=previousActive;
  const before={level,difficulty,courseMode,dailyRun,courseSeed,holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,labSkeletonReport,labHeartsCache,labStaminaCache};
  const originalPrepare=labPrepareHearts;let result,error;
  if(fail)labPrepareHearts=()=>{throw Error('injected post-generation failure');};
  try {result=generateCourseFromRecipe(config);}catch(e){error=e.message;}finally{labPrepareHearts=originalPrepare;}
  return {result,error,holdsBound:!!generatedCourse&&generatedCourse.holds===holds,previousActiveRestored:previousActive===undefined||activeCourseGeneration===previousActive,identityRestored:level===before.level&&difficulty===before.difficulty&&courseMode===before.courseMode&&dailyRun===before.dailyRun&&courseSeed===before.courseSeed,
   geometryRestored:holds===before.holds&&route===before.route&&HEIGHT===before.HEIGHT&&initialGrips===before.initialGrips&&densityStats===before.densityStats&&generatedCourse===before.generatedCourse&&labSkeletonReport===before.labSkeletonReport&&labHeartsCache===before.labHeartsCache&&labStaminaCache===before.labStaminaCache,
   recipeIdentity:generatedCourse?{level:generatedCourse.level,difficulty:generatedCourse.difficulty,mode:generatedCourse.mode,seed:generatedCourse.seed}:null};
 };
 fixtureGenerate.postBindReplay=function(config){
  const contract=fixtureGenerate.identityContract(config);
  if(contract.error)return contract;
  activeCourseGeneration={report:contract.result.report};
  return {...contract,replays:samePairRoute(route,replayRoute(route)),geometry:JSON.parse(JSON.stringify({holds,route,HEIGHT,initialGrips,hearts:labHeartsCache,stamina:labStaminaCache,report:labSkeletonReport}))};
 };
 fixtureGenerate.errorContract=function(config,kind=null){
  const saved={solveRoute,labSwitchbackSearch};let injected,calls=0,caught;
  if(kind==='typed')injected=new CourseGeometryRejection('injected finite rejection');
  if(kind==='programming'||kind==='switchback-programming')injected=new TypeError('injected programming failure');
  if(kind==='native')injected=Error('Two-support final replay failed');
  if(kind==='native-type')injected=new TypeError('Two-support final replay failed');
  if(kind==='switchback-programming'){
   solveRoute=()=>null;labSwitchbackSearch=()=>{calls++;throw injected;};
  }else if(injected)solveRoute=()=>{calls++;throw injected;};
  try{generateCourseFromRecipe(config);}catch(error){caught=error;}
  finally{({solveRoute,labSwitchbackSearch}=saved);}
  return {caught:!!caught,typed:caught instanceof CourseGeometryRejection,name:caught?.name,message:caught?.message,same:caught===injected,causeSame:caught?.cause===injected,calls};
 };
 return fixtureGenerate;
 `)({},productionBoundary);
}
module.exports={create};
