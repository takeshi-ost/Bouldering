"use strict";
const HEART_ITEM_IMAGE_SRC = 'assets/heart-item-chalk-bag.png';
function heartItemIconMarkup() {
    return `<img class="heart-item-icon" src="${HEART_ITEM_IMAGE_SRC}" width="52" height="48" alt="" aria-hidden="true" draggable="false">`;
}
const COURSE_HEART_IMAGE_SRC = 'assets/course-heart-2.svg';
const RELEASE_VERSION = '0.3.8';
const GAMEPLAY_TIP_KEYS = [
    'tips.scroll', 'tips.undo', 'tips.reach', 'tips.wideHold',
    'tips.goal', 'tips.heart', 'tips.sideways', 'tips.appearance'
];
const GAMEPLAY_TIPS = GAMEPLAY_TIP_KEYS.map(key=>gameText(key));
// Bump whenever generation/gameplay changes make stage scores incomparable.
const COURSE_VERSION = 'v1';
// 表示サイズと可動域。単位はゲーム内の論理pxです。
const W = 400;
const H = 700;
const STAGE_SAFE_WIDTH = 16;
const R = 112;
const MAX_HEIGHT = H * 3;
const TORSO = { width: 40, height: 72, hitPadding: 8 };
// Shared by the live Canvas player and the editor's SVG preview.
const PLAYER_SILHOUETTE_STYLE = { color:'rgba(67,92,80,.22)', width:1.5,
    shadowColor:'rgba(67,92,80,.28)', shadowBlur:3, shadowOffsetY:1.5,
    rootColor:'#d9e9db', rootRadius:2.5 };
const limbs = [
    { x: -52, y: -68 },
    { x: 52, y: -68 },
    { x: -40, y: 78 },
    { x: 40, y: 78 },
];
const LIMB_LENGTHS = [100, 100, 110, 110];
const POSE_CONFIG = {
    highFootMinKneeAngle: 150,
    jointWeights: { inward: 4, spread: 1, overlap: 4, lowHand: .75, kneeBelowFoot: 4, continuity: .03 }
};
const HIGH_FOOT_REACH_RATIO = Math.sin(POSE_CONFIG.highFootMinKneeAngle * Math.PI / 360);
const limbArrows = ["↖", "↗", "↙", "↘"];
// 初期配置の生成。実際の想定ムーブ数は現行ルールで探索して決定します。
const STAGE_CONFIG = {
    introGuideSteps: 5,
    maxGuideSteps: 100,
    stationSpacing: 40,
    supportSpan: 5,
    introStations: [6.5, 7.5, 8.5, 11.5, 14.5],
    horizontalAmplitude: 160 - STAGE_SAFE_WIDTH,
    traverseDrop: 20,
    climbVariation: 20,
    goalTopMargin: 100,
    bottomMargin: 80,
    startFootSpan: 140,
    // Independent seeded draw: short / medium / long = 2 / 5 / 3.
    lengthWeights: [2,5,3],
    lengthRules: [
        {category:'short',height:H,climbHeight:200},
        {category:'medium',height:H*2,climbHeight:290},
        {category:'long',height:MAX_HEIGHT,climbHeight:600},
    ],
    holdOffset: 8,
};
// Four independent rule sets. Array position is the difficulty number (0–3).
// referenceStage supplies a representative course shape for daily challenges only.
const DIFFICULTY_RULES = [
    {hearts:false,hazards:'none',referenceStage:4},
    {hearts:true,hazards:'none',referenceStage:5},
    {hearts:true,hazards:'optional',referenceStage:20},
    {hearts:true,hazards:'dense',referenceStage:40},
];
// Weights are [difficulty 0, 1, 2, 3]; they are normalized, so need not sum to 100.
// Each band starts inclusively and ends at the next fromStage (exclusively).
const DIFFICULTY_CONFIG = {
    stageBands:[
        {fromStage:0,weights:[100,0,0,0]},
        {fromStage:5,weights:[0,100,0,0]},
        {fromStage:20,weights:[0,0,100,0]},
        {fromStage:40,weights:[0,0,0,100]},
    ],
    dailyWeights:[25,25,25,25],
};
// 追加ホールドの候補配置。
const HOLD_SPACING = 52;
const HOLD_CONFIG = {
    passes: 5,
    gridStep: 40,
    jitter: 38,
    sideMargin: STAGE_SAFE_WIDTH + 30,
    topMargin: 28,
    bottomMargin: 50,
    snapGuard: 6,
};
// 密度評価。基準個数はステージ1を実際に生成して測定します。
const DENSITY_CONFIG = {
    sampleStep: 20,
    gapScale: 1.3,
    gapReachRatio: 0.7,
    crowdRadius: 110,
    crowdWeight: 8,
};
// コース固定の回復アイテム。取得時に回復し、開始予算からは差し引きません。
const HEART_CONFIG = { minMoves: 5, maxCount: 2, recovery: 2, radius: 10, popupDuration: 1000, popupRise: 30 };
// Difficulty 2 adds 0–5 hazards; difficulty 3 converts 10–30% after hearts are fixed.
const HAZARD_CONFIG = { maxCount: 5, minRatio: .1, maxRatio: .3, reserveCount: 6, penalty: 1, shakeDuration: 280, shakeAmplitude: 4, radius: 6, attempts: 140, spacing: 24 };
// 操作と描画。
const INPUT_CONFIG = { edgeScrollWidth: STAGE_SAFE_WIDTH, dragThreshold: 5, aimDistance: 100, reachSearchSteps: 24, tapMaxDuration: 400 };
// Deterministic work limits keep preview/retry budgets identical on slow devices.
const COURSE_GENERATION_CONFIG = {
    recipeAttempts:2, maxDetourMoves:3, comparisonTransitions:600, heartPlacementChecks:24,
    intentWeights:[ [100,0,0,0,0], [45,55,0,0,0], [0,45,25,20,10], [0,20,25,25,30] ],
};
const ROUTE_COST_SEARCH_CONFIG = {maxTransitions:1800,beamWidth:2};
const ROUTE_OPTIMIZATION_CONFIG = { maxTransitions: 900, passes: 2 };
const CAMERA_CONFIG = { goalTopPadding: 180, bodyScreenRatio: 0.6, followRate: 0.08, introSpeed: H * 1.5, introMinDuration: 1000 };
const FALL_CONFIG = { gravity: 1400, clearance: 180 };
const RENDER_CONFIG = { maxPixelRatio: 2, safeAreaColor: '#aeb8ac' };
