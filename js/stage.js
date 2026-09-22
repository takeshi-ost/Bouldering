"use strict";
// 生成中の状態をゲーム本体から分離します。戻り値だけをゲームへ渡します。
function createStageGenerator() {
    let holds = [];
    let route = [];
    let HEIGHT = H;
    let initialGrips = [];
    let densityReference = null;
    let densityStats = null;
    function makeCourse(length, mirror, climbHeight) {
        // Piecewise-linear centerline; sample by arc length without smoothing
        // the corners. Traverses are horizontal or slightly descending.
        const samples = [{ x: W / 2 + mirror * STAGE_CONFIG.horizontalAmplitude, y: 0, s: 0 }];
        let side=mirror, segment=0;
        while(samples[samples.length-1].s<length) {
            const previous=samples[samples.length-1];
            const p=segment%2===0
                ? {x:previous.x,y:previous.y-climbHeight}
                : {x:W/2-side*STAGE_CONFIG.horizontalAmplitude,y:previous.y+STAGE_CONFIG.traverseDrop};
            samples.push({...p,s:previous.s+distance(previous,p)});
            if(segment%2===1)side=-side;
            segment++;
        }
        return s => {
            let low = 0, high = samples.length - 1;
            while (high - low > 1) {
                const mid = (low + high) >> 1;
                if (samples[mid].s < s)
                    low = mid;
                else
                    high = mid;
            }
            const a = samples[low], b = samples[high], t = clamp((s - a.s) / (b.s - a.s), 0, 1), d = distance(a, b);
            return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx: -(b.y - a.y) / d, ny: (b.x - a.x) / d };
        };
    }
    function generate(n, guideOnly = false) {
        // Calibrate from Level 1 even when a debug tool opens another level first.
        // This uses its unchanged seeded layout, rather than a hard-coded count.
        if (!guideOnly && n !== 1 && !densityReference)
            generate(1);
        const random = mulberry32(n);
        holds = [];
        route = [];
        let nextHoldId = 0;
        const add = (x, y, type = 'normal', row = null) => {
            const h = { x, y, type, row, id: nextHoldId++ };
            holds.push(h);
            return h;
        };
        // A finite wall cannot accumulate an unlimited number of distinct holds.
        // Add traverses within the two-screen budget, then vary the seeded layout.
        const guideSteps = n === 1 ? STAGE_CONFIG.introGuideSteps : STAGE_CONFIG.baseMoves + Math.min(n - 2, STAGE_CONFIG.growthLevels) * STAGE_CONFIG.movesPerLevel, rows = [0, 1, 2, 3], support = [...rows];
        // "row" is a station every 40px ALONG the course, not a vertical grid row.
        // Four supports span at most 200px of arc. The torso at its midpoint is
        // within 100px + the 8px hold offset of all four supports (R = 112px).
        for (let i = 0; i < guideSteps; i++) {
            support.shift();
            const next = support[0] + STAGE_CONFIG.supportSpan;
            rows.push(next);
            support.push(next);
        }
        // Keep the intro guide compact; its actual move count is solved with two supports.
        // Actual playability is checked later by route.js, not this station model.
        if (n === 1)
            rows.splice(4, STAGE_CONFIG.introGuideSteps, ...STAGE_CONFIG.introStations);
        const lastStation = rows[rows.length - 1] * STAGE_CONFIG.stationSpacing;
        const rawCourse = n === 1 ? s => ({ x: W / 2, y: -s, nx: 1, ny: 0 }) : makeCourse(lastStation, random() < .5 ? -1 : 1, STAGE_CONFIG.climbHeight + random() * STAGE_CONFIG.climbVariation);
        const rise = -rawCourse(lastStation).y;
        HEIGHT = n === 1 ? H : Math.min(MAX_HEIGHT, Math.max(H, Math.ceil(rise) + STAGE_CONFIG.verticalPadding));
        const scaleY = n === 1 ? 1 : Math.min(1, (HEIGHT - STAGE_CONFIG.verticalPadding) / rise);
        const course = s => {
            const p = rawCourse(s);
            return { ...p, y: p.y * scaleY, ny: p.ny * scaleY };
        };
        const bottom = HEIGHT - STAGE_CONFIG.bottomMargin;
        rows.forEach((row, i) => {
            const p = course(row * STAGE_CONFIG.stationSpacing), offset = (row % 2 ? 1 : -1) * STAGE_CONFIG.holdOffset;
            add(p.x + p.nx * offset, bottom + p.y + p.ny * offset, i < 4 ? 'start' : i === rows.length - 1 ? 'goal' : 'normal', row);
        });
        initialGrips = [holds[2], holds[3], holds[0], holds[1]];
        const pose = stance => {
            const first = Math.min(...stance.map(h => h.row)), last = Math.max(...stance.map(h => h.row));
            const p = course((first + last) * STAGE_CONFIG.stationSpacing / 2);
            return { x: p.x, y: bottom + p.y };
        };
        route.push(pose(initialGrips));
        const stance = [...initialGrips];
        for (let i = 4; i < rows.length; i++) {
            const moving = stance.indexOf(stance.reduce((a, b) => a.row < b.row ? a : b));
            stance[moving] = holds[i];
            route.push({ ...pose(stance), hold: holds[i], limb: moving });
        }
        // Keep the original guide, but use three physical starting holds:
        // a shared hand bar above the shoulders and two feet on the bottom row.
        const startBody = route[0], hand = holds[2], removedHand = holds[3];
        hand.x = startBody.x; hand.y = startBody.y - 68; hand.wide = true;
        initialGrips = [hand, hand, holds[0], holds[1]];
        for (const i of [2,3]) {
            initialGrips[i].x = clamp(startBody.x + limbs[i].x,24,W-24);
            initialGrips[i].y = HEIGHT - HOLD_CONFIG.bottomMargin;
        }
        holds = holds.filter(h=>h !== removedHand);
        if (guideOnly)
            return { holds, route, HEIGHT, initialGrips };
        fillWall(random, add);
        if (n === 1)
            densityReference = measureDensity(holds, HEIGHT);
        densityStats = convergeDensity();
        return { holds, route, HEIGHT, initialGrips, densityStats };
    }
    function fillWall(random, add) {
        // A 52px spacing (formerly 36px) roughly halves the wall's hold count.
        // Apply it across the wall, including alongside the preserved solution.
        // Small snap-target guards preserve the example solution; unlike the old
        // R+12 corridor, they do not exclude all reachable alternative holds.
        const targets = route.slice(1).map((p, i) => ({ p, aim: gripAim(p, route[i]), score: distance(p.hold, gripAim(p, route[i])) }));
        const top = Math.min(...holds.map(h => h.y)) + HOLD_CONFIG.topMargin, bottom = HEIGHT - HOLD_CONFIG.bottomMargin;
        const allowed = p => p.y <= initialGrips[2].y - 24 && !holds.some(h => distance(h, p) < HOLD_SPACING) && !targets.some(t => distance(t.p, p) <= R && distance(t.aim, p) < t.score + HOLD_CONFIG.snapGuard);
        // Repeated jittered grids fill gaps rather than scattering only at edges.
        // Existing route holds participate in the same minimum-distance check.
        for (let pass = 0; pass < HOLD_CONFIG.passes; pass++)
            for (let y = top; y <= bottom; y += HOLD_CONFIG.gridStep)
                for (let x = HOLD_CONFIG.sideMargin; x <= W - HOLD_CONFIG.sideMargin; x += HOLD_CONFIG.gridStep) {
                    const p = { x: clamp(x + (random() - .5) * HOLD_CONFIG.jitter, HOLD_CONFIG.sideMargin, W - HOLD_CONFIG.sideMargin), y: clamp(y + (random() - .5) * HOLD_CONFIG.jitter, top, bottom) };
                    if (allowed(p))
                        add(p.x, p.y);
                }
    }
    function measureDensity(points, height) {
        // Every possible scroll position is covered: a window's count can only
        // increase when a hold enters at its lower edge. Include both wall ends.
        const limit = height - H, starts = [...new Set([0, limit, ...points.map(p => clamp(p.y - H, 0, limit))])];
        const windows = starts.map(y => ({ y, count: points.filter(p => p.y >= y && p.y <= y + H).length }));
        const top = Math.min(...points.map(p => p.y)) + HOLD_CONFIG.topMargin, coverage = [];
        // Local empty-space checks prevent pruning a whole region to satisfy
        // the screen-wide count. Record second-nearest distances for removals.
        for (let y = top; y <= height - HOLD_CONFIG.bottomMargin; y += DENSITY_CONFIG.sampleStep)
            for (let x = HOLD_CONFIG.sideMargin; x <= W - HOLD_CONFIG.sideMargin; x += DENSITY_CONFIG.sampleStep) {
                let nearest = Infinity, second = Infinity, owner = null;
                for (const p of points) {
                    const d = distance(p, { x, y });
                    if (d < nearest) {
                        second = nearest;
                        nearest = d;
                        owner = p;
                    }
                    else if (d < second)
                        second = d;
                }
                coverage.push({ nearest, second, owner });
            }
        return { total: points.length, peak: Math.max(...windows.map(w => w.count)), windows, coverage, maxGap: Math.max(...coverage.map(p => p.nearest)) };
    }
    function convergeDensity() {
        const target = densityReference.peak, gapLimit = Math.max(densityReference.maxGap * DENSITY_CONFIG.gapScale, R * DENSITY_CONFIG.gapReachRatio);
        let measured = measureDensity(holds, HEIGHT), iterations = 0;
        const initialTotal = measured.total, initialPeak = measured.peak, history = [initialPeak];
        const maxIterations = holds.filter(h => h.row === null).length;
        while (measured.peak > target && iterations < maxIterations) {
            let chosen = null, best = -Infinity;
            for (const h of holds) {
                if (h.row !== null)
                    continue; // Preserve guide holds here; route.js validates later removals.
                if (measured.coverage.some(p => p.owner === h && p.second > gapLimit))
                    continue;
                let improvement = 0;
                for (const w of measured.windows) {
                    if (h.y < w.y || h.y > w.y + H || w.count <= target)
                        continue;
                    const excess = w.count - target;
                    improvement += excess * excess - (excess - 1) * (excess - 1);
                }
                if (improvement === 0)
                    continue;
                // Prefer redundant holds in crowded neighborhoods when reductions
                // have a similar effect on the over-budget screen windows.
                const crowding = holds.reduce((sum, p) => sum + (p === h ? 0 : Math.max(0, 1 - distance(p, h) / DENSITY_CONFIG.crowdRadius)), 0);
                const score = improvement / measured.windows.length + crowding * DENSITY_CONFIG.crowdWeight;
                if (score > best) {
                    best = score;
                    chosen = h;
                }
            }
            if (!chosen)
                break;
            holds = holds.filter(h => h !== chosen);
            iterations++;
            measured = measureDensity(holds, HEIGHT);
            history.push(measured.peak);
        }
        return { target, total: measured.total, peak: measured.peak, maxGap: measured.maxGap, gapLimit, initialTotal, initialPeak, iterations, history, converged: measured.peak <= target };
    }
    return { generate };
}
const stageGenerator = createStageGenerator();
