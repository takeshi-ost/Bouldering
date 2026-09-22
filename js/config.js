"use strict";
// 表示サイズと可動域。単位はゲーム内の論理pxです。
const W = 400;
const H = 700;
const R = 112;
const MAX_HEIGHT = H * 2;
const TORSO = { width: 40, height: 72, hitPadding: 8 };
const limbs = [
    { x: -52, y: -68, name: "左手" },
    { x: 52, y: -68, name: "右手" },
    { x: -40, y: 78, name: "左足" },
    { x: 40, y: 78, name: "右足" },
];
const LIMB_LENGTHS = [100, 100, 110, 110];
const POSE_CONFIG = {
    highFootMinKneeAngle: 150,
    jointWeights: { inward: 4, spread: 1, overlap: 4, lowHand: .75, kneeBelowFoot: 4, continuity: .03 }
};
const HIGH_FOOT_REACH_RATIO = Math.sin(POSE_CONFIG.highFootMinKneeAngle * Math.PI / 360);
const limbArrows = ["↖", "↗", "↙", "↘"];
// 初期配置の生成。実際の想定手数は現行ルールで探索して決定します。
const STAGE_CONFIG = {
    introGuideSteps: 5,
    baseMoves: 20,
    movesPerLevel: 2,
    growthLevels: 3,
    spareMoves: 1,
    stationSpacing: 40,
    supportSpan: 5,
    introStations: [6.5, 7.5, 8.5, 11.5, 14.5],
    horizontalAmplitude: 160,
    traverseDrop: 20,
    climbHeight: 290,
    climbVariation: 20,
    verticalPadding: 220,
    bottomMargin: 80,
    holdOffset: 8,
};
// 追加ホールドの候補配置。
const HOLD_SPACING = 52;
const HOLD_CONFIG = {
    passes: 5,
    gridStep: 40,
    jitter: 38,
    sideMargin: 24,
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
// 操作と描画。
const INPUT_CONFIG = { dragThreshold: 5, aimDistance: 100, reachSearchSteps: 24 };
const CAMERA_CONFIG = { bodyScreenRatio: 0.6, followRate: 0.08 };
const RENDER_CONFIG = { maxPixelRatio: 2 };
