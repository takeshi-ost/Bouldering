"use strict";
// Independent expected shape shared by result/import tests. Never infer a
// historical record's provenance from the app version running the test.
function scoreFixture(record, metadata = {}) {
    return {appVersion:null,buildNumber:null,platform:null,scoreSpecVersion:null,...record,...metadata};
}
module.exports = {scoreFixture};
