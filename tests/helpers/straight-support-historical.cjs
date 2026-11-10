'use strict';
// Historical-test-only ablation and source normalization. Never loaded by runtime.
// Exact approved implementation: trial 2c2fc9f1aa6bf2bc5f26cf446e3069619667bf73.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const predicate="function labHasStraightProfile(config){return config.type==='straight'||config.composition==='pair'&&config.secondType==='straight';}";
function once(text,before,after,label){
 assert.equal(text.split(before).length,2,'one exact approved '+label);
 return text.replace(before,after);
}
function disableStraightSupport(text){
 const disabled='function labHasStraightProfile(config){return false;}';
 const result=once(text,predicate,disabled,'straight-profile predicate');
 assert.equal(result.replace(disabled,predicate),text,'ablation reverses byte-for-byte');
 return result;
}
function withoutStraightSupport(text){
 const start='\n// BEGIN straight-support prototype.',end='// END straight-support prototype.\n';
 assert.equal(text.split(start).length,2);assert.equal(text.split(end).length,2);
 const block=text.slice(text.indexOf(start),text.indexOf(end)+end.length);
 assert.equal(crypto.createHash('sha256').update(block).digest('hex'),'d07ac7a764b45f31703dc86809d94aeea879fb0d5a7524a073b019b6c808fe0f','approved straight-support block only');
 text=once(text,block,'','straight-support block');
 const edits=[
  [" if(labHasStraightProfile(config)&&labSkeletonReport?.straightSupports?.thinning?.configSignature===JSON.stringify(config))return labSkeletonReport.spikes||null;\n", ""],
  [" if(!Object.prototype.hasOwnProperty.call(config,'spikePercent')){if(labHasStraightProfile(config))labThinStraightSupports({config,sections:labSkeletonReport?.composition?.sections||null});return null;}\n const supportContext={config,sections:labSkeletonReport?.composition?.sections||null,defer:false};\n const supportIds=labStraightSupportIds(route,supportContext);", " if(!Object.prototype.hasOwnProperty.call(config,'spikePercent'))return null;"],
  ["  holds=holds.filter(h=>h.type!=='normal'||protectedIds.has(h.id)||selectedIds.has(h.id)||supportIds.has(h.id));", "  holds=holds.filter(h=>h.type!=='normal'||protectedIds.has(h.id)||selectedIds.has(h.id));"],
  ["  if(!samePairRoute(route,replayRoute(route))){\n   holds=previous;const previousContext=labStraightSupportContext;\n   try{labStraightSupportContext=labHasStraightProfile(config)?supportContext:null;pruneUnusedHolds();}\n   finally{labStraightSupportContext=previousContext;}\n  }", "  if(!samePairRoute(route,replayRoute(route))){holds=previous;pruneUnusedHolds();}"],
  [" if(labHasStraightProfile(config))labRecordStraightSupports(supportContext,labSkeletonReport?.straightSupports?.candidateIds||[...supportIds]);\n", ""],
  [" if(labHasStraightProfile(config)){\n  labThinStraightSupports(supportContext);\n  const finalIds=new Set(holds.map(h=>h.id));\n  report.deletedIds=beforeHolds.filter(h=>!finalIds.has(h.id)).map(h=>h.id);report.deletedCount=report.deletedIds.length;\n  report.retainedUnselectedIds=candidates.slice(count).filter(v=>finalIds.has(v.hold.id)).map(v=>v.hold.id);\n }\n", ""],
  ["  if(labStraightSupportContext)labStraightSupportContext.sections=sectionReports;\n", ""]
 ];
 edits.forEach(([before,after],i)=>{text=once(text,before,after,'straight-support integration edit '+i);});
 return text;
}
module.exports={disableStraightSupport,withoutStraightSupport};
