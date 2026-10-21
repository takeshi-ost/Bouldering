"use strict";
// DOM、ゲーム状態、移動・吸着・勝敗の処理。
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = Object.fromEntries([
    "rewardDialog", "rewardWheel", "rewardStop", "rewardStatus", "rewardResult", "goalEffects", "closeLife", "closeResult", "staminaGauge", "lifeStatus", "lifeDialog", "lifeQuestion", "lifeWatchAd", "lifeCancel", "dummyAd", "adCounter", "adComplete", "featureHelpDialog", "featureHelpContent", "wall", "level", "stamina", "progress", "overlay", "resultStars",
    "stageStartDialog", "closeStageStart", "stageStartTitle", "stageStartLives", "stageStartDifficulty", "stageStartLength", "stageStartStamina", "stageStartButton", "stageHeartOwned", "stageHeartCount", "stageHeartValue", "stageHeartReset", "stageDebugDisplay", "debugRoute", "debugHoldNumbers", "debugCourseInfo", "resultTitle", "resultTap", "resultRanking", "resultLeaderboard", "resultDifficulty", "resultStats", "next", "retry", "restart", "hud", "settingsButton", "settingsDialog", "closeSettings", "mapSettingsButton", "mapSettingsControls", "mapEditCharacter", "mapDebugMode",
    "dailyCalendar", "dailyMonthViewport", "dailySettingsButton", "dailyPlate", "dailySkyDate", "dailyClearRecord", "dailyClearStars", "dailyClearStats", "dailyStartTitle", "dailyStartGift", "dailyStartLabel", "dailyStartDifficulty", "dailyStartLength", "dailyStartButton", "openDaily", "dailyEntryDate", "dailyBack", "dailyMonthTitle", "dailyPrev", "dailyNext", "dailyGrid", "dailyError", "levelMap", "mapCourse", "mapError", "mapScroll", "mapTrack", "mapScenery", "mapRoad", "mapNodes", "mapMarker", "mapPrev", "mapNext", "mapCourses", "mapButton", "debugControls", "debugStage", "debugPlay",
    "characterEditor", "playerName", "playerNameError", "editorPreview", "stripeCount", "stripeCountValue", "bodyStripeControls", "editorPalette", "selectedStripeLabel", "paletteSwatches", "customColor", "editorConfirm", "editorCancel", "appearanceStatus",
    "titleScreen", "releaseVersion", "playerUuid", "titleTap", "prototypeCourse", "prototypeDescription", "showHelp", "helpDialog", "closeHelp"
].map(id => [id, document.getElementById(id)]));

let debugMode = false;
const debugDisplay={route:true,holdNumbers:true,courseInfo:true};
let settingsOpen = false;
function hideSettings() {
    settingsOpen=false;
    if(typeof requestGameRender==='function')requestGameRender();
    if(ui.settingsDialog.open)ui.settingsDialog.close?.();
}
// First encounters are shared by both courses and retained across launches.
const FEATURE_HELP_KEY='ascent.feature-help.v1';
function readFeatureHelpSeen() {
    try {
        const saved=JSON.parse(globalThis.localStorage?.getItem(FEATURE_HELP_KEY)||'null');
        return {heart:saved?.heart===true,hazard:saved?.hazard===true};
    } catch(_) {return {heart:false,hazard:false};}
}
let featureHelpSeen=readFeatureHelpSeen();
let featureHelpOpen=false;
let pendingFeatureHelp=[];
function hideStageHelp() {
    featureHelpOpen=false;pendingFeatureHelp=[];
    if(ui.featureHelpDialog.open)ui.featureHelpDialog.close?.();
}
function showStageHelp() {
    if(state!=='playing' || featureHelpOpen)return;
    const features=[];
    if(hearts.length && !featureHelpSeen.heart)features.push('heart');
    if(holds.some(h=>h.type==='hazard') && !featureHelpSeen.hazard)features.push('hazard');
    if(!features.length)return;
    pendingFeatureHelp=features;featureHelpOpen=true;
    renderStageHelp();
    ui.featureHelpDialog.showModal?.();
}
function renderStageHelp() {
    const heart=pendingFeatureHelp[0]==='heart';
    const icon=heart ? `<img class="course-heart-icon" src="${COURSE_HEART_IMAGE_SRC}" width="36" height="36" alt="">` : '<canvas class="feature-hold-image" width="128" height="128" aria-hidden="true"></canvas>';
    ui.featureHelpContent.innerHTML=`<div class="feature-help-icon" aria-hidden="true">${icon}</div><h1 id="featureHelpTitle">${heart?'回復ハート':'紫ホールド'}</h1><p>${heart?'ボディで触れるとスタミナが2回復する':'新しく手足を固定するとスタミナを追加で1消費する'}</p><div class="modal-tap">TAP</div>`;
    if(!heart)paintHazardHelpIcon(ui.featureHelpContent.querySelector?.('.feature-hold-image'));
}
function dismissStageHelp() {
    if(!featureHelpOpen)return;
    featureHelpSeen[pendingFeatureHelp.shift()]=true;
    try {globalThis.localStorage?.setItem(FEATURE_HELP_KEY,JSON.stringify(featureHelpSeen));}
    catch(_) { /* Remember for this session if storage is unavailable. */ }
    if(pendingFeatureHelp.length) {
        renderStageHelp();
        return;
    }
    hideStageHelp();
    requestGameRender();
    // Start the full opening sequence on the next frame, excluding reading time.
    if(cameraIntro)cameraIntro.start=null;
    canvas.focus();
}
let dailyRun=null;
function courseSeed(n=level) {return dailyRun ? dailyRun.seed : n;}
function leaveDailyRun() {
    if(dailyRun) {courseMode=dailyRun.returnCourse;dailyRun=null;}
}
let courseMode = 'existing';
let level = 1;
let difficulty = 0;
let holds = [];
let route = [];
let hearts = [];
let heartPopups = [];
let anchorRings = [];
let hazardShakeStart = null;
let HEIGHT = H;
// Extra space above high goals belongs to the camera, preserving course geometry.
function cameraTop() {
    const goal=holds.find(h=>h.type==='goal');
    return goal ? Math.min(0,goal.y-CAMERA_CONFIG.goalTopPadding) : 0;
}
let initialGrips = [];
let body;
let committed;
let grips = [];
let startGrips = [];
let stamina = 0;
let moveCount = 0;
let camera = 0;
let cameraIntro = null;
let playerPath = [];
let inspecting = false;
let drag = null;
let bodyTap = null;
let state = "choosing";
let warning = 0;
let densityStats = null;
let undoSnapshot = null;
let moveSnapshot = null;
let lifeAttemptId=0;
let adClearRecorded=false;
let runStartedAt = null;
let runElapsedMs = 0;
function runTimeMs(now=performance.now()) {
    return runStartedAt===null ? runElapsedMs : Math.max(0,now-runStartedAt);
}
function formatClearTime(ms) {
    const ticks=Math.floor(Math.max(0,ms)/10);
    return [Math.floor(ticks/6000),Math.floor(ticks/100)%60,ticks%100]
        .map(n=>String(n).padStart(2,'0')).join(':');
}
function formatStageRecord(record) { return `${record.moves}手 ${formatClearTime(record.timeMs)}`; }
function hideResultModal() {
    if(ui.overlay.open)ui.overlay.close?.();
    ui.overlay.hidden=true;
}
function showResultModal() {
    requestGameRender();
    ui.overlay.hidden=false;
    if(!ui.overlay.open)ui.overlay.showModal?.();
    (state==='won'?ui.overlay:dailyRun?ui.next:ui.retry).focus();
}


function generate(n) {
    ({ holds, route, HEIGHT, initialGrips, densityStats } = stageGenerator.generate(n,false,courseSeed(n)));
}

// Anatomical reach is measured from the shoulder/hip, not the torso center.
function limbReachable(p, h, i) {
    const root = limbRoot(p, i);
    const reach = distance(root, h);
    return reach <= LIMB_LENGTHS[i] + 1e-7 && (i < 2 || (
        h.y >= p.y - 1e-7 &&
        (h.y >= root.y - 1e-7 || reach >= LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO - 1e-7)
    ));
}

// Raised fixed feet create a non-convex reachable area. Stop at the FIRST
// invalid interval, even when the endpoint itself is reachable again.
function supportMotionFraction(from, to, pair, stance = startGrips) {
    if (!isSupportPair(pair) || !pair.every(i => stance[i] && limbReachable(from, stance[i], i))) return 0;
    const dx = to.x - from.x, dy = to.y - from.y;
    const length2 = dx * dx + dy * dy;
    if (length2 < 1e-16) return 1;
    const cuts = [0, 1];
    const add = t => { if (t > 0 && t < 1) cuts.push(t); };
    for (const i of pair) {
        const h = stance[i], root = limbRoot(from, i);
        const x = root.x - h.x, y = root.y - h.y;
        const circle = radius => {
            const b = 2 * (x * dx + y * dy);
            const c = x * x + y * y - radius * radius;
            const discriminant = b * b - 4 * length2 * c;
            if (discriminant < 0) return;
            const q = Math.sqrt(discriminant);
            add((-b - q) / (2 * length2));
            add((-b + q) / (2 * length2));
        };
        circle(LIMB_LENGTHS[i]);
        if (i >= 2) {
            circle(LIMB_LENGTHS[i] * HIGH_FOOT_REACH_RATIO);
            if (Math.abs(dy) > 1e-12) {
                add((h.y - from.y) / dy);
                add((h.y - TORSO.height / 2 - from.y) / dy);
            }
        }
    }
    cuts.sort((a, b) => a - b);
    for (let k = 1; k < cuts.length; k++) {
        const t = (cuts[k - 1] + cuts[k]) / 2;
        const p = { x: from.x + dx * t, y: from.y + dy * t };
        if (!pair.every(i => limbReachable(p, stance[i], i))) return cuts[k - 1];
    }
    return 1;
}

function supportPairReach(pair, ux, uy) {
    const limit = Math.max(...pair.map(i => LIMB_LENGTHS[i])) * 2;
    return limit * supportMotionFraction(committed,
        { x: committed.x + ux * limit, y: committed.y + uy * limit }, pair);
}

// A moving limb should have a hold ahead of its current contact in the
// initial Body movement direction. This only checks whether such a
// possibility exists; it does not decide which hold the limb will use.
function movingLimbHasForwardHold(i, pair, ux, uy, pairReach) {
    const current = startGrips[i];
    if (!current)
        return false;

    // Sample several Body positions along the support pair's reachable range.
    // The actual hold remains undecided and will still be selected in real time
    // by attachMoving() during the drag.
    const samples = [0.25, 0.5, 0.75, 1.0];

    for (const ratio of samples) {
        const p = {
            x: committed.x + ux * pairReach * ratio,
            y: committed.y + uy * pairReach * ratio
        };

        for (const h of holds) {
            // Staying on the same hold is not a new movement opportunity.
            if (h === current)
                continue;

            // A support hold is occupied and cannot normally be reused.
            // The goal is the one exception: both hands may share it.
            const occupiedBySupport = pair.some(j =>
                startGrips[j] === h &&
                !canShareHold(h, i, j)
            );

            if (occupiedBySupport)
                continue;

            // Only count holds that lie ahead of the limb's current contact
            // in the initial drag direction.
            const forward =
                (h.x - current.x) * ux +
                (h.y - current.y) * uy;

            if (forward <= 0)
                continue;

            if (limbReachable(p, h, i))
                return true;
        }
    }

    return false;
}

function selectAnchor(dx, dy) {
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;

    const supportPairs = [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [1, 3],
        [2, 3]
    ];

    let bestPair = supportPairs[0];
    let bestMovingCount = -1;
    let bestReach = -1;

    for (const pair of supportPairs) {
        const reach = supportPairReach(pair, ux, uy);
        const moving = [0, 1, 2, 3].filter(i => !pair.includes(i));

        let movingCount = 0;

        for (const i of moving) {
            if (movingLimbHasForwardHold(i, pair, ux, uy, reach))
                movingCount++;
        }

        // First prefer the support pair that gives more moving limbs
        // a useful forward destination.
        //
        // If the number of useful moving limbs is the same, preserve
        // the original philosophy and prefer the pair that lets Body
        // travel farther in the requested direction.
        if (
            movingCount > bestMovingCount ||
            (movingCount === bestMovingCount && reach > bestReach)
        ) {
            bestPair = pair;
            bestMovingCount = movingCount;
            bestReach = reach;
        }
    }

    return [...bestPair];
}

function canShareHold(hold, a, b) {
    return a !== b && ((hold.type === 'goal' && a < 2 && b < 2) ||
        (hold.wide === true && Math.floor(a / 2) === Math.floor(b / 2)));
}

function attachMoving(p, anchor) {
    const result = Array(4).fill(null);
    const fixed = anchor;

    if (!supportsReachable(p, anchor))return null;

    fixed.forEach(i => result[i] = startGrips[i]);

    const moving = [0, 1, 2, 3].filter(i => !fixed.includes(i));

    const candidates = moving.map(i => {
        const target = {
            x: p.x + limbs[i].x,
            y: p.y + limbs[i].y
        };

        const available = holds;

        return available
            .filter(h =>
                fixed.every(j => h !== result[j] || canShareHold(h, i, j)) &&
                limbReachable(p, h, i)
            )
            .map(h => ({
                h,
                cost:
                    distance(h, target) ** 2 -
                    (h.type === 'goal' ? 4 * R * R : 0)
            }))
            .sort((a, b) =>
                a.cost - b.cost ||
                a.h.id - b.h.id
            );
    });

    // Sharing is pairwise: a wide hold accepts two hands OR two feet, never a mix.
    let best = [...result];
    let bestCount = -1;
    let bestCost = Infinity;

    function assign(slot, count, cost) {
        if (slot === moving.length) {
            const hands = result.slice(0, 2).filter(Boolean);
            const feet = result.slice(2).filter(Boolean);

            if (feet.some(foot => hands.some(hand => foot.y < hand.y)))
                return;

            if (
                count > bestCount ||
                (count === bestCount && cost < bestCost)
            ) {
                best = [...result];
                bestCount = count;
                bestCost = cost;
            }

            return;
        }

        const i = moving[slot];

        for (const candidate of candidates[slot]) {
            if (
                result.some((h, j) =>
                    j !== i &&
                    h === candidate.h &&
                    !canShareHold(h, i, j)
                )
            )
                continue;

            result[i] = candidate.h;
            assign(slot + 1, count + 1, cost + candidate.cost);
        }

        result[i] = null;
        assign(slot + 1, count, cost);
    }

    assign(0, 0, 0);

    return bestCount < 0 ? null : best;
}

function clearStars(moves,expectedMoves) {
    return moves<=expectedMoves ? 3 : moves<=expectedMoves+2 ? 2 : 1;
}
function stageStamina(moves) {
    return moves + 3;
}

// Share the live per-limb contact rule with route budgeting.
function newHazardContacts(stance,previous) {
    return new Set(stance.filter((h,i)=>h?.type==='hazard' && h!==previous[i]));
}
function routeHazardCosts(path) {
    const byId=new Map(holds.map(h=>[h.id,h]));
    let previous=[...initialGrips],total=0;
    for(const pair of [[0,1],[2,3]]) {
        const sorted=pair.map(i=>previous[i]).sort((a,b)=>(a?.x||0)-(b?.x||0));
        pair.forEach((i,j)=>previous[i]=sorted[j]);
    }
    return path.map((p,step)=>{
        if(step) {
            const stance=(p.grips||[]).map(id=>byId.get(id));
            total+=newHazardContacts(stance,previous).size*HAZARD_CONFIG.penalty;
            previous=stance;
        }
        return total;
    });
}
function routeExpectedMoves(path=route) {
    return path.length-1+(routeHazardCosts(path).at(-1)||0);
}
function routeStamina(path) {
    return stageStamina(routeExpectedMoves(path));
}

// Use an independent stream: retries preserve both holds and items.
function createHearts(n, path, selectedDifficulty=dailyRun?.difficulty ?? difficultyForStage(n)) {
    const moves = path.length - 1;
    if (!DIFFICULTY_RULES[selectedDifficulty].hearts || moves < HEART_CONFIG.minMoves) return [];
    const random = mulberry32(courseSeed(n) ^ 0x48EA27B1);
    const count = Math.floor(random() * (HEART_CONFIG.maxCount + 1));
    const costs = routeHazardCosts(path);
    const initialBudget = routeStamina(path);
    let previousStep = 0;
    return Array.from({length:count}, (_,id) => {
        // Recover before the late climb: one item by halfway, or two by 1/3 and 2/3.
        // Also reserve stamina before pickup where the short-stage budget permits it.
        const routeDeadline = Math.floor(moves * (id + 1) / (count + 1));
        const budgetDeadline = initialBudget + id * HEART_CONFIG.recovery - 1;
        let latest = Math.max(previousStep + 1,
            Math.min(routeDeadline,budgetDeadline,moves - (count - id)));
        while(latest>previousStep+1 && latest+costs[latest]>budgetDeadline)latest--;
        const step = previousStep + 1 + Math.floor(random() * (latest - previousStep));
        previousStep = step;
        return {id, x:path[step].x, y:path[step].y, collected:false};
    });
}

// Sweep the torso rectangle along each actual movement segment so fast drags
// cannot skip an item. Limbs, camera movement and pose-only settling do not collect.
function torsoTouchesHeart(from, to, heart) {
    const halfWidth = TORSO.width / 2 + HEART_CONFIG.radius;
    const halfHeight = TORSO.height / 2 + HEART_CONFIG.radius;
    let enter = 0, exit = 1;
    for (const [axis,half] of [['x',halfWidth],['y',halfHeight]]) {
        const delta = to[axis] - from[axis];
        const offset = from[axis] - heart[axis];
        if (Math.abs(delta) < 1e-12) {
            if (Math.abs(offset) > half) return false;
        } else {
            const a = (-half-offset)/delta, b = (half-offset)/delta;
            enter = Math.max(enter,Math.min(a,b));
            exit = Math.min(exit,Math.max(a,b));
            if (enter > exit) return false;
        }
    }
    return true;
}
function collectHearts(from, to) {
    for (const heart of hearts) {
        if (!heart.collected && torsoTouchesHeart(from,to,heart)) {
            heart.collected = true;
            playSound('pickup');
            stamina += HEART_CONFIG.recovery;
            heartPopups.push({x:heart.x,y:heart.y,start:performance.now()});
        }
    }
}
// Pickups persist for the whole attempt, including canceled moves and Undo.
function restoreMoveStamina(saved) {
    const newPickups = hearts.filter((heart,i) => heart.collected && !saved.collectedHearts[i]).length;
    stamina = saved.stamina + newPickups * HEART_CONFIG.recovery;
}

// A date keeps its difficulty even if a layout needs a deterministic retry.
function prepareCurrentStage() {
    if(!dailyRun) {
        if(courseMode==='prototype')preparePrototypeStage();else prepareStage();
        addHazardHolds();return;
    }
    let failure;
    for(let attempt=0;attempt<16;attempt++) {
        dailyRun.seed=(dailyRun.baseSeed+Math.imul(attempt,0x9E3779B9))>>>0;
        try {prepareStage();addHazardHolds();return;}catch(error){failure=error;}
    }
    throw failure;
}
const stagePreviewCache=new Map();
function stagePreview(n,mode=courseMode,profile=null) {
    const selectedDifficulty=profile?.difficulty ?? difficultyForStage(n);
    const key=JSON.stringify([n,mode,profile?.date,selectedDifficulty,STAGE_CONFIG,HOLD_CONFIG,HAZARD_CONFIG]);
    if(stagePreviewCache.has(key))return stagePreviewCache.get(key);
    const saved={level,difficulty,courseMode,dailyRun,holds,route,HEIGHT,initialGrips,densityStats,stageGenerator,committed,startGrips,moveCount};
    try {
        level=n;difficulty=selectedDifficulty;courseMode=mode;dailyRun=profile?{...profile}:null;
        stageGenerator=createStageGenerator();
        prepareCurrentStage();
        const preview={stamina:routeStamina(route),height:HEIGHT,difficulty,seed:courseSeed()};
        if(stagePreviewCache.size>=64)stagePreviewCache.delete(stagePreviewCache.keys().next().value);
        stagePreviewCache.set(key,preview);return preview;
    } finally {
        ({level,difficulty,courseMode,dailyRun,holds,route,HEIGHT,initialGrips,densityStats,stageGenerator,committed,startGrips,moveCount}=saved);
    }
}
function previewStaminaText(n,mode=courseMode,profile=null,bonus=0) {
    try {return `❤️${String(stagePreview(n,mode,profile).stamina+bonus).padStart(2,'0')}`;}
    catch(_) {return '❤️—';}
}
function reset(n,staminaBonus=0) {
    lifeAttemptId++;
    adClearRecorded=false;
    hideStageHelp();
    runStartedAt=null;runElapsedMs=0;
    undoSnapshot = moveSnapshot = null;
    bodyTap = null;
    resetCharacterAnimation();
    jointHistory.fill(null);
    level = n;
    difficulty=dailyRun ? dailyRun.difficulty : difficultyForStage(n);
    prepareCurrentStage();

    body = { ...route[0] };
    committed = { ...body };
    grips = [...initialGrips];

    for (const pair of [[0, 1], [2, 3]]) {
        const sorted = pair
            .map(i => grips[i])
            .sort((a, b) => a.x - b.x);

        pair.forEach((i, j) => grips[i] = sorted[j]);
    }

    startGrips = [...grips];
    startInitialPose();

    hearts = createHearts(n,route,difficulty);
    heartPopups = [];
    anchorRings = [];
    hazardShakeStart = null;
    stamina = routeStamina(route)+staminaBonus;

    moveCount = 0;

    playerPath = [{
        x: body.x,
        y: body.y
    }];

    camera = clamp(
        holds.find(h => h.type === 'goal').y - CAMERA_CONFIG.goalTopPadding,
        cameraTop(),
        HEIGHT - H
    );

    const introTarget = HEIGHT - H;
    cameraIntro = {from:camera,to:introTarget,start:null};

    inspecting = false;
    drag = null;
    state = 'playing';
    warning = 0;

    hideResultModal();
    hideSettings();
    ui.hud.hidden=false;
    ui.titleScreen.hidden=true;
    ui.characterEditor.hidden=true;
    ui.restart.disabled = false;

    ui.level.textContent = dailyRun ? `DAILY ${dailyRun.date.slice(5).replace('-','/')}` : `STAGE ${level}`;
    ui.mapButton.textContent=dailyRun?'カレンダーにもどる':'MAPにもどる';
    ui.retry.hidden=false;
    ui.dailyCalendar.hidden=true;
    ui.levelMap.hidden = true;
    ui.wall.classList.toggle('map-open',false);
    ui.mapButton.disabled = false;

    updateUI();
}

function updateUI() {
    if(typeof requestGameRender==='function')requestGameRender();
    ui.settingsButton.disabled = !!cameraIntro || state!=='playing';
    ui.stamina.textContent = String(stamina);
    ui.stamina.setAttribute('aria-label',`スタミナ ${stamina} 手`);
    ui.stamina.style.color = '#fffaf0';
    ui.staminaGauge.style.color = stamina <= 4 ? '#bc5144' : '#cf6676';

    ui.progress.hidden=!(debugMode && debugDisplay.courseInfo);
    ui.progress.textContent =
        `${moveCount} 手 / 想定 ${routeExpectedMoves()} 手 / ${difficultyLabel(difficulty)}`;
}

function point(e) {
    const r = canvas.getBoundingClientRect();

    return {
        x: (e.clientX - r.left) * W / r.width,
        y: (e.clientY - r.top) * H / r.height + camera
    };
}

function limbRoot(p, index) {
    return {
        x:
            p.x +
            (index % 2 ? 1 : -1) *
            TORSO.width / 2,

        y:
            p.y +
            (index < 2 ? -1 : 1) *
            TORSO.height / 2
    };
}

function down(e) {
    if (
        state !== 'playing' || settingsOpen || featureHelpOpen ||
        cameraIntro ||
        drag
    )
        return;

    inspecting = false;

    // Read the world point before camera recentering changes its screen mapping.
    const p = point(e);

    camera = clamp(
        body.y - H * CAMERA_CONFIG.bodyScreenRatio,
        cameraTop(),
        HEIGHT - H
    );

    if (
        p.x < 0 ||
        p.x > W ||
        p.y < camera ||
        p.y > camera + H
    )
        return;

    if(runStartedAt===null)runStartedAt=performance.now()-runElapsedMs;
    // Preserve the visible settled pose as well as the logical move origin.
    moveSnapshot = {
        body:{...body}, grips:[...grips], stamina, moveCount,
        collectedHearts:hearts.map(heart=>heart.collected),
        playerPath:playerPath.map(p=>({...p})), camera,
        visibleBody:{...characterPose(performance.now()).body},
        joints:jointHistory.map(p=>p && ({...p}))
    };
    resetCharacterAnimation();
    drag = {
        dx: body.x - p.x,
        dy: body.y - p.y,
        anchor: null
    };

    committed = { ...body };
    startGrips = [...grips];

    updateUI();
}

function move(e) {
    if (!drag)
        return;

    const p = point(e);

    const raw = {
        x: p.x + drag.dx,
        y: p.y + drag.dy
    };

    const target = {
        x: clamp(raw.x, 25, W - 25),
        y: clamp(raw.y, 80, HEIGHT - 40)
    };

    const d = distance(raw, committed);

    if (drag.anchor === null) {
        if (d < INPUT_CONFIG.dragThreshold)
            return;

        drag.anchor = selectAnchor(
            raw.x - committed.x,
            raw.y - committed.y
        );
    }

    const previousBody = { ...body };
    const fraction = supportMotionFraction(body, target, drag.anchor);
    const blocked = fraction < 1 - 1e-9;
    body = { x: body.x + (target.x - body.x) * fraction,
        y: body.y + (target.y - body.y) * fraction };

    const attached =
        attachMoving(body, drag.anchor);

    if (attached)
        grips = attached;
    else
        body = previousBody;

    collectHearts(previousBody,body);
    warning = blocked ? 1 : 0;

    updateUI();
}

function bothHandsOnGoal(stance = grips) {
    return (
        stance[0]?.type === 'goal' &&
        stance[0] === stance[1]
    );
}

// Compare contact positions as a multiset, independent of limb assignment.
function sameContacts(a, b) {
    if (
        a.length !== 4 ||
        b.length !== 4 ||
        !a.every(Boolean) ||
        !b.every(Boolean)
    )
        return false;

    const positions = list =>
        list
            .map(h => h.x + ',' + h.y)
            .sort();

    const left = positions(a);
    const right = positions(b);

    return left.every(
        (position, i) =>
            position === right[i]
    );
}

function release(cancel = false) {
    if (!drag)
        return;

    const invalid =
        grips.some(h => h === null) ||
        (
                (
                !isSupportPair(drag.anchor) ||
                !drag.anchor.every(i =>
                    grips[i] === startGrips[i] &&
                    limbReachable(
                        body,
                        grips[i],
                        i
                    )
                )
            )
        );

    const movingLimbs=[0,1,2,3].filter(i=>!drag.anchor?.includes(i));
    drag = null;

    // Continuity belongs to a limb/hold pair, not just an occupied hold.
    const newHazards = newHazardContacts(grips,startGrips);
    if (
        cancel ||
        invalid ||
        (sameContacts(grips, startGrips) && !newHazards.size)
    ) {
        if(invalid && !cancel)playSound('blocked');
        body = { ...committed };
        grips = [...startGrips];
    } else {
        const now=performance.now();
        anchorRings=movingLimbs.map(i=>({x:grips[i].x,y:grips[i].y,start:now}));
        undoSnapshot = moveSnapshot;
        playerPath.push({
            x: body.x,
            y: body.y
        });

        stamina = Math.max(0,stamina-1-newHazards.size*HAZARD_CONFIG.penalty);
        if (newHazards.size) {
            const now = performance.now();
            hazardShakeStart = now;
            for (const h of newHazards) heartPopups.push({x:h.x,y:h.y,start:now,
                kind:'hazard',text:`-${HAZARD_CONFIG.penalty}`,color:'#9442be'});
        }
        if(!bothHandsOnGoal() && stamina>0)playSound(newHazards.size?'hazard':'move');
        moveCount++;

        committed = { ...body };
        startPoseSettle();

        if (bothHandsOnGoal())
            finish(true);
        else if (stamina === 0)
            finish(false);
    }

    moveSnapshot = null;
    warning = 0;

    updateUI();
}

function canUndoMove() {
    return !!undoSnapshot && !featureHelpOpen && !settingsOpen && !drag && !cameraIntro && ['playing','won','lost'].includes(state);
}
function undoMove() {
    if (!canUndoMove()) return false;
    playSound('undo');
    hazardShakeStart = null;
    anchorRings = [];
    heartPopups = heartPopups.filter(p => p.kind !== 'hazard');
    const elapsed=runTimeMs();
    const saved = undoSnapshot;
    undoSnapshot = moveSnapshot = null;
    body = {...saved.body}; committed = {...body};
    grips = [...saved.grips]; startGrips = [...grips];
    restoreMoveStamina(saved);
    moveCount = saved.moveCount;
    playerPath = saved.playerPath.map(p=>({...p}));
    camera = saved.camera; inspecting = false; warning = 0; state = 'playing';
    runElapsedMs=elapsed;runStartedAt=performance.now()-elapsed;
    resetCharacterAnimation();
    characterAnimation = {kind:'settle',start:performance.now(),
        origin:{...saved.visibleBody},target:{...saved.visibleBody}};
    saved.joints.forEach((p,i)=>jointHistory[i]=p && ({...p}));
    hideResultModal(); ui.next.hidden = true;
    updateUI();
    return true;
}

function finish(won) {
    if(state==='playing')playSound(won?'clear':'fail');
    settleLifeAttempt(won);
    runElapsedMs=Math.floor(runTimeMs());runStartedAt=null;
    state = won ? 'won' : 'lost';
    if(won) { recordStageClear(); recordAdClear(); recordMapRewardClear(); startGoalHang(); }
    else startFall();
    const showRanking=won && !dailyRun;
    ui.resultRanking.hidden=!showRanking;
    ui.overlay.classList.toggle('has-ranking',showRanking);
    ui.resultDifficulty.hidden=!won || showRanking;
    ui.resultDifficulty.textContent=won ? difficultyLabel(difficulty) : '';
    ui.resultStats.hidden=!won || showRanking;
    ui.resultStats.textContent=won ? formatStageRecord({moves:moveCount,timeMs:runElapsedMs}) : '';
    ui.next.hidden=won || !dailyRun;
    ui.next.textContent='カレンダーへ';
    ui.retry.hidden=won;
    ui.closeResult.hidden=won;
    ui.resultTap.hidden=!won;
    ui.overlay.classList.toggle('is-clear',won);
    ui.retry.textContent=dailyRun?'リトライ':'RETRY';

    const expectedMoves=routeExpectedMoves();
    const stars=clearStars(moveCount,expectedMoves);
    if(showRanking)renderStageLeaderboard(expectedMoves);
    ui.resultStars.hidden=!won;
    ui.resultStars.textContent=won ? '⭐️'.repeat(stars) : '';
    ui.resultStars.setAttribute('aria-label',won ? `${stars}つ星` : '');

    ui.resultTitle.textContent =
        won
            ? '登頂成功！'
            : 'あと、もう少し。';

    hideSettings();
    updateUI();
    showResultModal();
}

// RAF time is injected so tests can advance the opening without real waits.
function advanceCameraIntro(now) {
    if (featureHelpOpen || !cameraIntro || state !== 'playing')
        return;

    if (cameraIntro.start === null)
        cameraIntro.start = now;

    camera = Math.min(cameraIntro.to, cameraIntro.from +
        Math.max(0,now-cameraIntro.start) * CAMERA_CONFIG.introSpeed / 1000);
    if (camera >= cameraIntro.to && now-cameraIntro.start >= CAMERA_CONFIG.introMinDuration) {
        cameraIntro = null;
        playSound('start');
        runStartedAt=now;runElapsedMs=0;
        updateUI();
    }
}

function isSupportPair(pair) {
    return Array.isArray(pair) && pair.length===2 && pair[0]!==pair[1] &&
        pair.every(i=>Number.isInteger(i) && i>=0 && i<4);
}
function supportsReachable(p, anchor) {
    return isSupportPair(anchor) && anchor.every(i =>
        startGrips[i] &&
        limbReachable(
            p,
            startGrips[i],
            i
        )
    );
}
