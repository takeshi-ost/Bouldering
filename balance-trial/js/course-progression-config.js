'use strict';
// Editable data, not a stage lookup table. Change version AND COURSE_VERSION
// whenever an edit changes normal courses. Daily keeps an independent data and
// score version; change daily.version AND DAILY_COURSE_VERSION only when its
// date score, recipe or gameplay changes. Never relabel saved historical scores.
const CourseProgressionConfig = globalThis.CourseProgressionConfig = {
    version: '3',
    normalSeedOffset: 100, // Uint32 offset; Daily remains date-seeded.
    rounding: 'nearest', // Math.round: positive half-integers round upward.
    stageSegments: [
        {fromStage: 1, toStage: 20, fromScore: 1, toScore: 20},
        {fromStage: 21, toStage: 80, fromScore: 21, toScore: 40},
        {fromStage: 81, toStage: 200, fromScore: 35, toScore: 45},
        // Stage 200 belongs to the previous segment (score 45). The next
        // segment starts at 201 but interpolates from the independent 200=40
        // anchor. A downward jump or overlapping SCORE ranges is intentional.
        {fromStage: 201, toStage: 400, interpolationFromStage: 200, fromScore: 40, toScore: 50}
    ],
    afterLastStageScore: 50,
    daily: {version: '1', minScore: 20, maxScore: 40, randomVersion: '1'},
    difficultyBands: [
        {fromScore: 1, label: 'EASY'},
        {fromScore: 6, label: 'NORMAL'},
        {fromScore: 31, label: 'HARD'}
    ]
};
