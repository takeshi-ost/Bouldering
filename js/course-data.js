'use strict';
// Approved isolated course-data feed; unavailable updates never block play.
const COURSE_DATA_CONFIG=Object.freeze({minGenerationVersion:'0.5.0',bundleManifest:'course-data/manifest.json',remoteManifest:'https://takeshi-ost.github.io/Bouldering/test-course-data/stages-101-150/manifest.json'});
let courseDataStore=null;
function courseData(){
 if(!courseDataStore&&globalThis.AscentCourseData&&typeof globalThis.fetch==='function'&&globalThis.document?.baseURI)
  courseDataStore=globalThis.AscentCourseData.create({buildId:globalThis.ASCENT_COURSE_BUILD?.id,...COURSE_DATA_CONFIG,
   runtimeSignature:()=>coursePreparationPortableSignature(),baseURL:document.baseURI,onUpdate:()=>clearAdoptedCourseCache()});
 if(!courseDataStore)return null;
 return {lookup:(request,validate,portable)=>courseDataStore.lookup(request,s=>validate(restoreCompactCourse(s,request)),portable),update:()=>courseDataStore.update()};
}
function checkCourseDataUpdates(){return courseData()?.update();}
function restoreCompactCourse(snapshot,request){
 if(!snapshot?.labSkeletonReport?.diagnosticsOmitted)return snapshot;
 validatePreparedCourse({...snapshot,route:snapshot.route?.map(p=>({...p,trace:[{x:p.x,y:p.y}]}))},request);
 const saved=adoptedCourseSnapshot(),settings={level,difficulty,courseTypeId,courseMode,dailyRun,tutorialRun,debugCourseTrial,debugMode,debugAttempt};
 try {
  ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=snapshot);
  level=request.level;difficulty=request.difficulty;courseTypeId=request.courseTypeId;courseMode='existing';
  dailyRun=request.date?{date:request.date,seed:request.resolved.seed,typeId:request.courseTypeId,difficulty:request.difficulty,referenceStage:1}:null;tutorialRun=null;debugCourseTrial=null;debugMode=false;debugAttempt=false;
  const replay=SixPairSelection.withBaseline(()=>fingerReplayRoute(route));
  if(!replay||replay.length!==route.length)throw Error('Stored route replay failed');
  for(let i=0;i<route.length;i++){
   const {trace:unused,...actual}=replay[i],{trace:ignored,...expected}=route[i];
   if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Stored route replay mismatch');
  }
  return {...snapshot,route:replay};
 }finally{
  ({holds,route,HEIGHT,initialGrips,densityStats,generatedCourse,activeCourseGeneration,labSkeletonReport,labHeartsCache,labStaminaCache}=saved);
  ({level,difficulty,courseTypeId,courseMode,dailyRun,tutorialRun,debugCourseTrial,debugMode,debugAttempt}=settings);
 }
}
