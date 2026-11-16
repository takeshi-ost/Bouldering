'use strict';
// Approved isolated course-data feed; unavailable updates never block play.
const COURSE_BUNDLED_MANIFEST={"schema":1,"generationVersion":"0.5.22","buildId":"523664c4086af8e111f2754448e54ed146d36843871e32ca3ebcebaab4d53198","generatedAt":"2026-11-16T07:12:39.014341+00:00","packs":[{"id":"daily-20001-21000","start":20001,"end":21000,"count":547,"generatedAt":"2026-11-16T03:15:22.520Z","file":"daily-20001-21000-b279e457c563.json","bytes":4921323,"sha256":"b279e457c5637526d6f8c66a01c164fe1dfc4cebbd023f840af95f10c3b5f928"},{"id":"daily-21001-22000","start":21001,"end":22000,"count":1000,"generatedAt":"2026-11-16T05:06:27.492Z","file":"daily-21001-22000-afdb2058841a.json","bytes":8932423,"sha256":"afdb2058841ae12a03602bd5d3385a3210b777dff25b82e3016e9ae1dabb5719"},{"id":"daily-22001-23000","start":22001,"end":23000,"count":453,"generatedAt":"2026-11-16T02:51:27.237Z","file":"daily-22001-23000-39a3ca9841b0.json","bytes":4015520,"sha256":"39a3ca9841b01eb984c4e39fc9550a7bbc4caaa8bf77b594dfd3f58d03c489ce"},{"id":"stages-00001-01000","start":1,"end":1000,"count":1000,"generatedAt":"2026-11-16T07:00:47.760Z","file":"stages-00001-01000-8ad00e1661e6.json","bytes":11022692,"sha256":"8ad00e1661e693d3ce4e32630956023207389cd9940255b60dd073447192a4f3"},{"id":"stages-01001-02000","start":1001,"end":2000,"count":1000,"generatedAt":"2026-11-16T07:12:25.447Z","file":"stages-01001-02000-7b570533f7f5.json","bytes":11325237,"sha256":"7b570533f7f507c1c23be5f4198d9ce78bda54bfe4ebcfbeefc3c44251ced0aa"}]};
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
