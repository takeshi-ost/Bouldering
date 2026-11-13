'use strict';
// Approved isolated course-data feed; unavailable updates never block play.
const COURSE_BUNDLED_MANIFEST={"schema":1,"generationVersion":"0.5.17","buildId":"38cea959ad93c188251bda8dd8c12c9781a79722799b45d032eaac530e3a9973","generatedAt":"2026-11-13T05:22:03.925Z","packs":[{"id":"daily-20001-21000","start":20001,"end":21000,"count":61,"generatedAt":"2026-11-13T05:22:03.925Z","file":"daily-20001-21000-df44eed1bf08.json","bytes":516822,"sha256":"df44eed1bf08d5d1773f431baa5d932da450419c8016528859fb18180fdf9ad9"},{"id":"stages-00001-01000","start":1,"end":1000,"count":100,"generatedAt":"2026-11-13T05:22:03.925Z","file":"stages-00001-01000-d55450ae271d.json","bytes":817576,"sha256":"d55450ae271dcdadd4e3759b4de970d30b5d973720b44c6fff6f1b4af748ef3f"}]};
const COURSE_DATA_CONFIG=Object.freeze({minGenerationVersion:'0.5.0',bundleManifest:'course-data/manifest.json',bundledManifestData:COURSE_BUNDLED_MANIFEST,remoteManifest:'https://takeshi-ost.github.io/Bouldering/test-course-data/stages-101-150/manifest.json'});
let courseDataStore=null;
function courseData(){
 if(!courseDataStore&&globalThis.AscentCourseData&&typeof globalThis.fetch==='function'&&globalThis.document?.baseURI)
  courseDataStore=globalThis.AscentCourseData.create({buildId:globalThis.ASCENT_COURSE_BUILD?.id,...COURSE_DATA_CONFIG,
   runtimeSignature:()=>coursePreparationPortableSignature(),baseURL:document.baseURI,onUpdate:()=>clearAdoptedCourseCache()});
 if(!courseDataStore)return null;
 return {lookup:(request,validate,portable)=>courseDataStore.lookup(request,s=>validate(restoreCompactCourse(s,request)),portable),update:()=>courseDataStore.update()};
}
function checkCourseDataUpdates(){const data=courseData();if(courseDataStore?.warmup)void courseDataStore.warmup();return data?.update();}
// Creation-time verification owns action replay. Loading only validates the stored
// shape and identity; all route traces and debug markers are already included.
function restoreCompactCourse(snapshot,request){return validatePreparedCourse(snapshot,request);}
