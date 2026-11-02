"use strict";
// Generic seeded draw over stable item IDs. Invalid definitions/ratios fail closed.
function weightedItemId(items,weights,seed) {
    const validId=id=>typeof id==='string' && /^[a-z][a-z0-9_-]*$/i.test(id) || Number.isSafeInteger(id) && id>=0;
    if(!Array.isArray(items) || !items.length || Array.from(items).some(item=>!item || !validId(item.id)) || new Set(items.map(item=>item.id)).size!==items.length)
        throw new RangeError('Weighted items require unique valid IDs');
    if(!Array.isArray(weights) || weights.length!==items.length || Array.from(weights).some(w=>typeof w!=='number' || !Number.isFinite(w) || w<0))
        throw new RangeError('Weights must match items and be nonnegative finite numbers');
    if(!Number.isSafeInteger(seed))throw new RangeError('Invalid draw seed');
    const sum=weights.reduce((a,b)=>a+b,0);
    if(!Number.isFinite(sum))throw new RangeError('Weight total must be finite');
    const equal=sum===0,total=equal?items.length:sum,target=mulberry32(seed)()*total;
    let cumulative=0,last=null;
    for(let i=0;i<items.length;i++) {
        const weight=equal?1:weights[i];if(weight>0)last=items[i].id;
        cumulative+=weight;if(target<cumulative)return items[i].id;
    }
    return last;
}
function difficultyRule(id) {
    const rule=DIFFICULTY_RULES.find(item=>item?.id===id);
    if(!rule || typeof rule.hearts!=='boolean' || !['none','optional','dense'].includes(rule.hazards) || !Number.isSafeInteger(rule.referenceStage) || rule.referenceStage<1)
        throw new RangeError('Undefined or invalid difficulty rule');
    return rule;
}
// Weight positions follow stable IDs (numeric IDs first), never declaration order.
function courseTypeDefinitions() {
    return [...COURSE_TYPES].sort((a,b)=>typeof a.id==='number'&&typeof b.id==='number'?a.id-b.id:
        typeof a.id==='number'?-1:typeof b.id==='number'?1:String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0);
}
function courseTypeRule(id) {
    const type=COURSE_TYPES.find(t=>t?.id===id);
    if(!type || !['basic','choice','consumption','recovery','mixed'].includes(type.intent) || typeof type.name!=='string' || !type.name || typeof type.labelKey!=='string' || !type.labelKey)throw new RangeError('Invalid course type');
    difficultyRule(type.generationDifficulty);
    return type;
}
function courseTypeLabel(id) { return gameText(courseTypeRule(id).labelKey); }
function weightedCourseType(weights,seed) {
    const id=weightedItemId(courseTypeDefinitions(),weights,seed);courseTypeRule(id);return id;
}
function validateCourseDistribution(distribution) {
    if(!distribution || typeof distribution!=='object')throw new RangeError('Missing course distribution');
    // Validate both ratios together, including bands that are not selected yet.
    weightedItemId(courseTypeDefinitions(),distribution.difficulty,0);
    for(const type of COURSE_TYPES)courseTypeRule(type.id);
    const lengths=Array.isArray(STAGE_CONFIG.lengthRules)?STAGE_CONFIG.lengthRules.map(r=>({id:r?.category})):[];
    weightedItemId(lengths,distribution.length,0);
    return distribution;
}
// Used only by the retained native placer and explicitly isolated debug trials.
function stageDistribution(n) {
    if(!Number.isSafeInteger(n) || n<0)throw new RangeError('Invalid stage number');
    return validateCourseDistribution(DIFFICULTY_CONFIG.calibration);
}
function dailyDistribution() { return validateCourseDistribution(DIFFICULTY_CONFIG.calibration); }
function generationTypeForScore(score) {
    return {EASY:0,NORMAL:2,HARD:6}[CourseProgression.labelForScore(score)];
}
function courseTypeForStage(n) {
    return generationTypeForScore(CourseProgression.stageScore(n));
}
// Internal legacy family only; never used to sample a normal/Daily recipe.
function difficultyForStage(n) { return courseTypeRule(courseTypeForStage(n)).generationDifficulty; }
