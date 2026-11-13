'use strict';
// Administrator-only validation. Never included in the application bundle.
module.exports=String.raw`
// Match the established fingerSamePairRoute coordinate tolerance. Only body
// coordinates may differ by roundoff; inputs, grips and resource state stay exact.
function adminSameStoredCourseReplayPoint(actual,expected){
 const {x:ax,y:ay,trace:unused,...a}=actual,{x:ex,y:ey,trace:ignored,...e}=expected;
 return [ax,ay,ex,ey].every(Number.isFinite)&&Math.abs(ax-ex)<=1e-7&&Math.abs(ay-ey)<=1e-7&&JSON.stringify(a)===JSON.stringify(e);
}
function adminValidateStoredCourse(snapshot,request){

 validatePreparedCourse({...snapshot,route:snapshot.route?.map(p=>({...p,trace:[{x:p.x,y:p.y}]}))},request);
 const saved=adoptedCourseSnapshot(),settings={level,difficulty,courseTypeId,courseMode,dailyRun,tutorialRun,debugCourseTrial,debugMode,debugAttempt};
 try {
  ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=snapshot);
  level=request.level;difficulty=request.difficulty;courseTypeId=request.courseTypeId;courseMode='existing';
  dailyRun=request.date?{date:request.date,seed:request.resolved.seed,typeId:request.courseTypeId,difficulty:request.difficulty,referenceStage:1}:null;tutorialRun=null;debugCourseTrial=null;debugMode=false;debugAttempt=false;
  const replay=SixPairSelection.withBaseline(()=>fingerReplayRoute(route));
  if(!replay||replay.length!==route.length)throw Error('Stored route replay failed');
  for(let i=0;i<route.length;i++){
   if(!adminSameStoredCourseReplayPoint(replay[i],route[i]))throw Error('Stored route replay mismatch');
  }
  for(let i=0;i<route.length;i++)if(route[i].trace){
   if(route[i].trace.length!==replay[i].trace?.length||!route[i].trace.every((p,j)=>adminSameStoredCourseReplayPoint(p,replay[i].trace[j])))throw Error('Stored route trace mismatch');
  }
  // Preserve every saved route field, append only the verified trace.
  return {...snapshot,route:route.map((p,i)=>({...p,trace:replay[i].trace}))};
 }finally{
  ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=saved);
  ({level,difficulty,courseTypeId,courseMode,dailyRun,tutorialRun,debugCourseTrial,debugMode,debugAttempt}=settings);
 }
}
`;
