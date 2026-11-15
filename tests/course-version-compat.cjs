'use strict';
// Course revisions remain comparable only on their own boards inside a record generation.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const m=require('../js/score-metadata.js');
for(const version of ['v1','v2','v3','v4','v5']) {
 assert(m.supportedCourseVersion(version));assert(m.historicalCourseVersion(version));
 const board=m.recordScoreBoard(version,'existing',1);
 assert(m.supportedScoreBoard(board));
 assert(m.scoreMatchesBoard(board,{recordVersion:m.RECORD_VERSION,scoreSpecVersion:version}));
 assert(!m.scoreMatchesBoard(board,{scoreSpecVersion:version}));
 assert(!m.supportedScoreBoard(version+'_existing_1'));
 for(const other of ['v1','v2','v3','v4','v5'])assert.equal(m.scoreMatchesBoard(board,{recordVersion:m.RECORD_VERSION,scoreSpecVersion:other}),version===other);
}
for(const id of ['trial-d6-0.4.12','trial-d7-offset10']){assert(m.historicalCourseVersion(id));assert(!m.supportedScoreBoard(m.recordScoreBoard(id,'existing',1)));}
for(const bad of ['r0_v5_existing_1','r2_v5_existing_1','r1_v6_existing_1','r1_v5_prototype_1','r1_v5_existing_0','r1_v5_existing_1000000'])assert(!m.supportedScoreBoard(bad));
const c=vm.createContext({});vm.runInContext(fs.readFileSync('js/score-metadata.js','utf8'),c);
assert.equal(vm.runInContext("recordStorageKey('ascent.records.v1')",c),'ascent.records.v1.r1');
console.log('PASS course compatibility: course v1–v5 independent of record generation; strict board/spec matching; legacy and future record boards excluded; trial provenance remains historical');
