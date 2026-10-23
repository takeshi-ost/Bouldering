"use strict";
function difficultyLabel(value) {
    return [gameText("difficulty.easy"),gameText("difficulty.normal"),gameText("difficulty.normal"),gameText("difficulty.hard")][value];
}
function weightedDifficulty(weights,seed) {
    if(!Array.isArray(weights) || weights.length!==DIFFICULTY_RULES.length ||
        Array.from(weights).some(weight=>typeof weight!=='number' || !Number.isFinite(weight) || weight<0))
        throw new RangeError('Difficulty weights must be four nonnegative finite numbers');
    const total=weights.reduce((sum,weight)=>sum+weight,0);
    if(!Number.isFinite(total) || total<=0)throw new RangeError('Difficulty weights must have a positive finite total');
    const target=mulberry32(seed)()*total;
    let cumulative=0;
    for(let i=0;i<weights.length;i++) {
        cumulative+=weights[i];
        if(target<cumulative)return i;
    }
    return weights.findLastIndex(weight=>weight>0);
}
function difficultyForStage(n) {
    if(!Number.isSafeInteger(n) || n<0)throw new RangeError('Invalid stage number');
    let selected=null;
    for(const band of DIFFICULTY_CONFIG.stageBands) {
        if(!Number.isSafeInteger(band.fromStage) || band.fromStage<0)throw new RangeError('Invalid difficulty band');
        if(band.fromStage<=n && (!selected || band.fromStage>=selected.fromStage))selected=band;
    }
    if(!selected)throw new RangeError('No difficulty band covers this stage');
    return weightedDifficulty(selected.weights,n ^ 0x44A17C39);
}
