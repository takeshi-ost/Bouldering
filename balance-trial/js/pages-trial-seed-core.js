'use strict';
// Artifact-only switching. Never mutate a running course or its score identity.
function trialSeedOffsetCanApply() {
    if(!DEBUG_FEATURES_ALLOWED || !debugMode || !['choosing','map'].includes(state))return false;
    if(stageStartContext || stageStartTimer!==null || lifePrompt || dummyAd || adCoverPending ||
        rewardSequence || rewardCoverPending || mapTransition || mapPreparing || dailyRun ||
        debugCourseTrial || featureHelpOpen)return false;
    // The trial control and settings dialogs are intentionally allowed.
    return !['stageStartDialog','lifeDialog','dummyAd','rewardDialog','overlay','featureHelpDialog',
        'helpDialog','editorPalette','transferDialog','deleteUserDialog'].some(id=>document.getElementById(id)?.open);
}
let trialSeedRecordsDirty=false;
function trialSeedPromoteRecords(version) {
    let changed=false;
    for(const records of Object.values(stageRecords))for(const [stage,previous] of Object.entries(records)) {
        if(previous.version===version)continue;
        const match=previous.previousVersions?.[version];
        if(!match || match.version!==version || !ASCENT_TRIAL_SEEDS.supported(version))continue;
        const history={...previous.previousVersions};
        delete history[version];
        if(ASCENT_TRIAL_SEEDS.supported(previous.version)) {
            const {previousVersions:ignored,...old}=previous;
            history[previous.version]=old;
        }
        const {previousVersions:ignored,...best}=match;
        records[stage]={...best,...(Object.keys(history).length?{previousVersions:history}:{})};
        changed=true;
    }
    trialSeedRecordsDirty ||= changed;
    if(trialSeedRecordsDirty)try {
        ASCENT_TRIAL_STORAGE.setItem(RECORDS_KEY,JSON.stringify(stageRecords));
        trialSeedRecordsDirty=false;
    }catch(_) { /* Retry on next apply, including the same offset. */ }
    return changed;
}
function applyTrialSeedOffset(raw) {
    const n=ASCENT_TRIAL_SEEDS.parse(raw);
    if(n===null)return {ok:false,error:'invalid-offset',persisted:false,offset:ASCENT_TRIAL_SEEDS.offset};
    if(!trialSeedOffsetCanApply())return {ok:false,error:'unsafe-state',persisted:false,offset:ASCENT_TRIAL_SEEDS.offset};
    const version=ASCENT_TRIAL_SEEDS.identity(n);
    CourseProgressionConfig.normalSeedOffset=n;
    COURSE_VERSION=version;
    stagePreviewCache.clear();
    trialSeedPromoteRecords(version);
    const preferencePersisted=ASCENT_TRIAL_SEEDS.persist(n);
    const persisted=preferencePersisted && !trialSeedRecordsDirty;
    renderLevelMap(); // The title also pre-renders the map for its entry transition.
    if(typeof requestGameRender==='function')requestGameRender();
    return {ok:true,error:null,persisted,offset:n};
}
// Defer scripts execute before input events: restore the saved offset's own bests
// before any trial control can expose the map. No score is relabelled.
if(trialSeedPromoteRecords(COURSE_VERSION))renderLevelMap();
