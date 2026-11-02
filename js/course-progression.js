'use strict';
// Pure resolver: no storage, clock, player identity, network, or game state.
const CourseProgression = (() => {
    const integer = (n, min, max, label) => {
        if (!Number.isSafeInteger(n) || n < min || n > max)
            throw new RangeError('Invalid ' + label);
        return n;
    };
    function validate(config) {
        if (!config || typeof config.version !== 'string' || !config.version || config.rounding !== 'nearest')
            throw new RangeError('Invalid course progression version or rounding');
        integer(config.normalSeedOffset === undefined ? 0 : config.normalSeedOffset, 0, 4294967295, 'normal seed offset');
        if (!Array.isArray(config.stageSegments) || !config.stageSegments.length)
            throw new RangeError('Stage segments must cover stage 1 onward');
        let next = 1;
        for (const segment of config.stageSegments) {
            integer(segment.fromStage, 1, Number.MAX_SAFE_INTEGER, 'segment start');
            integer(segment.toStage, segment.fromStage, Number.MAX_SAFE_INTEGER - 1, 'segment end');
            if (segment.fromStage !== next) throw new RangeError('Stage segments must be ordered without gaps or overlap');
            const anchor = segment.interpolationFromStage ?? segment.fromStage;
            integer(anchor, 1, segment.fromStage, 'interpolation anchor');
            integer(segment.fromScore, 1, 100, 'start score');
            integer(segment.toScore, 1, 100, 'end score');
            if (anchor === segment.toStage && segment.fromScore !== segment.toScore)
                throw new RangeError('A one-stage segment needs a single score');
            next = segment.toStage + 1;
        }
        integer(config.afterLastStageScore, 1, 100, 'final score');
        const daily = config.daily;
        if (!daily || (daily.version !== undefined && (typeof daily.version !== 'string' || !daily.version)) || typeof daily.randomVersion !== 'string' || !daily.randomVersion)
            throw new RangeError('Invalid Daily random version');
        integer(daily.minScore, 1, 100, 'Daily minimum score');
        integer(daily.maxScore, daily.minScore, 100, 'Daily maximum score');
        if (!Array.isArray(config.difficultyBands) || !config.difficultyBands.length || config.difficultyBands[0].fromScore !== 1)
            throw new RangeError('Difficulty bands must start at score 1');
        let previous = 0;
        for (const band of config.difficultyBands) {
            integer(band.fromScore, previous + 1, 100, 'difficulty threshold');
            if (!['EASY', 'NORMAL', 'HARD'].includes(band.label)) throw new RangeError('Invalid difficulty label');
            previous = band.fromScore;
        }
        return config;
    }
    function stageValue(stage, config) {
        integer(stage, 1, Number.MAX_SAFE_INTEGER, 'stage');
        const segment = config.stageSegments.find(row => stage <= row.toStage);
        if (!segment) return config.afterLastStageScore;
        const anchor = segment.interpolationFromStage ?? segment.fromStage;
        if (segment.toStage === anchor) return segment.fromScore;
        return segment.fromScore + (segment.toScore - segment.fromScore) *
            ((stage - anchor) / (segment.toStage - anchor));
    }
    function stageScore(stage, config = CourseProgressionConfig) {
        return Math.round(stageValue(stage, validate(config)));
    }
    function dateSeed(date) {
        if (typeof date !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date))
            throw new RangeError('Invalid Daily date');
        const parsed = new Date(date + 'T00:00:00Z');
        if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
            throw new RangeError('Invalid Daily date');
        return Number(date.replaceAll('-', ''));
    }
    function dailyScore(date, config = CourseProgressionConfig) {
        validate(config); dateSeed(date);
        // A dedicated named stream does not consume or perturb the distribution
        // or geometry RNGs. Date keys, never locale/timezone/UID, are hashed.
        let hash = 2166136261;
        for (const c of 'ascent-daily-score-v' + config.daily.randomVersion + ':' + date)
            hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
        let t = (hash + 0x6D2B79F5) >>> 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        const random = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        return config.daily.minScore + Math.floor(random * (config.daily.maxScore - config.daily.minScore + 1));
    }
    function labelForScore(score, config = CourseProgressionConfig) {
        validate(config); integer(score, 1, 100, 'difficulty score');
        return config.difficultyBands.findLast(band => band.fromScore <= score).label;
    }
    function resolveStage(stage, config = CourseProgressionConfig) {
        const score = stageScore(stage, config);
        // Reduce the safe-integer stage before addition to avoid precision loss.
        // Missing offset preserves old editable configurations; Daily never uses it.
        return {kind: 'stage', stage, score, seed: ((stage >>> 0) + (config.normalSeedOffset ?? 0)) >>> 0,
            difficultyLabel: labelForScore(score, config), progressionVersion: config.version};
    }
    function resolveDaily(date, config = CourseProgressionConfig) {
        const score = dailyScore(date, config);
        return {kind: 'daily', date, score, seed: dateSeed(date),
            difficultyLabel: labelForScore(score, config), progressionVersion: config.daily.version ?? config.version};
    }
    function recipe(resolved) {
        // v6 retains v5 length/profile/composition draws and applies the
        // explicitly versioned trial feature constraints; no stage-1 override.
        return {...CourseDistribution.sample(resolved.score, resolved.seed), seed: resolved.seed};
    }
    return Object.freeze({validate, stageScore, dailyScore, dateSeed, labelForScore, resolveStage, resolveDaily, recipe});
})();
globalThis.CourseProgression = CourseProgression;
