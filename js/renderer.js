"use strict";
// Canvas描画。ゲーム状態は読み取り、カメラだけを追従更新します。
function circle(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}

function line(a, b, color, width) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

// Shortening is shared 8:1 between the proximal and distal segments.
// Search both bend directions while keeping the root and contact unchanged.
function limbJoint(root, tip, index) {
    const half = LIMB_LENGTHS[index] / 2;
    const d = distance(root, tip);
    const outward = index % 2 ? 1 : -1;
    if (d >= half * 2) return { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 };
    if (d === 0) {
        return { x: root.x, y: root.y + (index < 2 ? half : -half) };
    }
    const ux = (tip.x - root.x) / d, uy = (tip.y - root.y) / d;
    const left = root.x - (index % 2 ? TORSO.width : 0);
    const top = root.y - (index < 2 ? 0 : TORSO.height);
    const padding = Math.min(7, d * .45); // Reduce the margin at almost coincident contacts.
    const desired = {
        x: root.x + outward * half * .65 * Math.min(1, d / half),
        y: index < 2 ? root.y + half * .55 : Math.min(root.y + half * .25, tip.y - 6)
    };
    // a = half - 8*s, b = half - s. Triangle inequalities bound s.
    const maximum = Math.max(0, Math.min(half / 8, (2 * half - d) / 9, d / 7));
    function candidate(s, side) {
        const a = half - 8 * s;
        // Stable form of (a*a - b*b + d*d)/(2*d), also for almost coincident tips.
        const along = d / 2 - 7 * s * (2 * half - 9 * s) / (2 * d);
        const bend = Math.sqrt(Math.max(0, a * a - along * along));
        const p = { x: root.x + ux * along - uy * bend * side,
            y: root.y + uy * along + ux * bend * side };
        const overlap = Math.max(0, Math.min(
            p.x - (left - padding), left + TORSO.width + padding - p.x,
            p.y - (top - padding), top + TORSO.height + padding - p.y
        ));
        const lowKnee = index < 2 ? 0 : Math.max(0, p.y - tip.y + 6);
        const score = (p.x - desired.x) ** 2 + (p.y - desired.y) ** 2 +
            400 * overlap ** 2 + 64 * lowKnee ** 2;
        return { p, score };
    }
    let best = null;
    const samples = 32;
    for (const side of [-1, 1]) {
        let selected = 0, branchBest = null;
        for (let step = 0; step <= samples; step++) {
            const current = candidate(maximum * step / samples, side);
            if (!branchBest || current.score < branchBest.score) {
                branchBest = current;
                selected = step;
            }
        }
        // Refine the best sampled interval so changes in pose do not snap to a grid.
        let low = maximum * Math.max(0, selected - 1) / samples;
        let high = maximum * Math.min(samples, selected + 1) / samples;
        for (let step = 0; step < 20; step++) {
            const a = low + (high - low) / 3, b = high - (high - low) / 3;
            if (candidate(a, side).score < candidate(b, side).score) high = b;
            else low = a;
        }
        const refined = candidate((low + high) / 2, side);
        if (refined.score < branchBest.score) branchBest = refined;
        if (!best || branchBest.score < best.score) best = branchBest;
    }
    return best.p;
}

// Free limbs hang under gravity; animation affects only drawing, not grip selection.
function danglingTip(p, index, time) {
    const root = limbRoot(p, index);
    const angle = Math.sin(time * 2.4 + index * 1.7) * 0.045;
    const length = LIMB_LENGTHS[index] * 0.98;

    return {
        x: root.x + Math.sin(angle) * length,
        y: root.y + Math.cos(angle) * length
    };
}

function drawPath() {
    if (!ui.showPath.checked)
        return;

    ctx.save();

    ctx.setLineDash([6, 5]);

    for (let i = 1; i < route.length; i++) {
        const a = route[i - 1];
        const b = route[i];

        if (
            Math.max(a.y, b.y) < camera - 24 ||
            Math.min(a.y, b.y) > camera + H + 24
        )
            continue;

        line(
            a,
            b,
            '#527faa9c',
            state === 'won' ? 5 : 2
        );

        // Arrowheads indicate the direction of travel, including lateral turns.
        const angle = Math.atan2(
            b.y - a.y,
            b.x - a.x
        );

        const mid = {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        };

        ctx.setLineDash([]);

        for (const offset of [-.55, .55]) {
            line(
                mid,
                {
                    x: mid.x - 7 * Math.cos(angle + offset),
                    y: mid.y - 7 * Math.sin(angle + offset)
                },
                '#527faa9c',
                1.5
            );
        }

        ctx.setLineDash([6, 5]);
    }

    ctx.setLineDash([]);
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    route.forEach((p, i) => {
        if (
            p.y < camera - 24 ||
            p.y > camera + H + 24
        )
            return;

        ctx.lineWidth = 1.5;

        circle(
            p.x,
            p.y,
            4,
            '#f3f0e7',
            '#527faa'
        );

        const labelX =
            p.x > W - 65
                ? p.x - 20
                : p.x + 20;

        circle(
            labelX,
            p.y,
            11,
            '#eef3f7ee'
        );

        ctx.fillStyle = '#527faa';
        ctx.fillText(
            String(i),
            labelX,
            p.y
        );
    });

    if (
        state === 'won' &&
        playerPath.length > 1
    ) {
        ctx.setLineDash([6, 5]);

        for (
            let i = 1;
            i < playerPath.length;
            i++
        ) {
            const a = playerPath[i - 1];
            const b = playerPath[i];

            line(
                a,
                b,
                '#d14479',
                2
            );

            const angle = Math.atan2(
                b.y - a.y,
                b.x - a.x
            );

            const mid = {
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2
            };

            ctx.setLineDash([]);

            for (const offset of [-.55, .55]) {
                line(
                    mid,
                    {
                        x: mid.x - 7 * Math.cos(angle + offset),
                        y: mid.y - 7 * Math.sin(angle + offset)
                    },
                    '#d14479',
                    1.5
                );
            }

            ctx.setLineDash([6, 5]);
        }

        ctx.setLineDash([]);

        playerPath.forEach((p, i) => {
            circle(
                p.x,
                p.y,
                3,
                '#f3f0e7',
                '#d14479'
            );

            // Put actual move numbers opposite the planned move numbers.
            const x =
                p.x > W - 65
                    ? p.x + 20
                    : p.x - 20;

            circle(
                x,
                p.y,
                11,
                '#fff0f5ee'
            );

            ctx.fillStyle = '#d14479';
            ctx.textAlign = 'center';

            ctx.fillText(
                String(i),
                x,
                p.y
            );
        });

        const end =
            playerPath[playerPath.length - 1];

        ctx.fillStyle = '#d14479';
        ctx.textAlign = 'left';

        ctx.fillText(
            '実際のルート',
            clamp(
                end.x + 30,
                10,
                W - 90
            ),
            end.y - 16
        );
    }

    ctx.restore();
}

// Presentation state only: never writes body, grips, committed or playerPath.
let characterAnimation = null;
function resetCharacterAnimation() { characterAnimation=null; }
function startPoseSettle() {
    let low=0,high=8;
    for(let i=0;i<24;i++) {
        const mid=(low+high)/2;
        if(grips.every((h,k)=>h && limbReachable({x:body.x,y:body.y+mid},h,k)))low=mid;
        else high=mid;
    }
    characterAnimation={kind:'settle',start:performance.now(),drop:low};
}
function startGoalHang() {
    characterAnimation={kind:'hang',start:performance.now(),origin:{x:body.x,y:body.y},
        contacts:grips.map(h=>({x:h.x,y:h.y})),goal:{x:grips[0].x,y:grips[0].y}};
}
function characterPose(now) {
    const pose={body:{x:body.x,y:body.y},contacts:grips,angle:0,pivot:null};
    const a=characterAnimation;
    if(!a)return pose;
    const elapsed=Math.max(0,now-a.start);
    if(a.kind==='settle') {
        const t=clamp(elapsed/240,0,1);
        pose.body.y+=a.drop*(1-Math.pow(1-t,3));
    } else {
        const t=clamp(elapsed/650,0,1),ease=t*t*(3-2*t);
        const target={x:a.goal.x,y:a.goal.y+TORSO.height/2+Math.sqrt(LIMB_LENGTHS[0]**2-(TORSO.width/2)**2)-2};
        pose.body={x:a.origin.x+(target.x-a.origin.x)*ease,y:a.origin.y+(target.y-a.origin.y)*ease};
        pose.contacts=a.contacts.map((p,i)=>i<2?a.goal:{
            x:p.x+(target.x+(i===2?-1:1)*(TORSO.width/2+3)-p.x)*ease,
            y:p.y+(target.y+TORSO.height/2+LIMB_LENGTHS[i]*.98-p.y)*ease});
        pose.pivot=a.goal;
        pose.angle=Math.sin(elapsed/520)*.055*ease;
    }
    return pose;
}

function draw(now = 0) {
    if (state === 'choosing') {
        requestAnimationFrame(draw);
        return;
    }
    advanceCameraIntro(now);

    ui.overlay.classList.toggle(
        'reviewing',
        state === 'won'
    );

    const desired = clamp(
        body.y - H * CAMERA_CONFIG.bodyScreenRatio,
        0,
        HEIGHT - H
    );

    // Freeze camera while holding to keep the body directly under the pointer.
    if (
        !cameraIntro &&
        !drag &&
        !inspecting &&
        state === 'playing'
    ) {
        camera +=
            (desired - camera) *
            CAMERA_CONFIG.followRate;
    }

    ui.scrollThumb.style.height =
        (H / HEIGHT * 100) + '%';

    ui.scrollThumb.style.top =
        (camera / HEIGHT * 100) + '%';

    ui.scrollRail.setAttribute(
        'aria-valuemax',
        String(HEIGHT - H)
    );

    ui.scrollRail.setAttribute(
        'aria-valuenow',
        String(Math.round(camera))
    );

    ui.scrollRail.setAttribute(
        'aria-disabled',
        String(HEIGHT <= H)
    );

    const ratio = Math.min(
        window.devicePixelRatio || 1,
        RENDER_CONFIG.maxPixelRatio
    );

    if (canvas.width !== W * ratio) {
        canvas.width = W * ratio;
        canvas.height = H * ratio;
    }

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    ctx.fillStyle = '#f3f0e7';
    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    ctx.save();
    ctx.translate(
        0,
        -camera
    );

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#dfe1d6';

    for (
        let x = 20;
        x < W;
        x += 40
    ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }

    for (
        let y =
            10 +
            Math.max(
                0,
                Math.floor(
                    (camera - 10) / 40
                )
            ) * 40;
        y <
        Math.min(
            HEIGHT,
            camera + H + 40
        );
        y += 40
    ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    ctx.fillStyle = '#a6aea0';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'left';

    for (
        let y =
            210 +
            Math.max(
                0,
                Math.floor(
                    (camera - 210) / 200
                )
            ) * 200;
        y <
        Math.min(
            HEIGHT,
            camera + H + 200
        );
        y += 200
    ) {
        ctx.fillText(
            `${((HEIGHT - y) / 100).toFixed(0)} M`,
            12,
            y - 8
        );
    }

    drawPath();

    const visualAnchor =
        drag
            ? drag.anchor
            : null;

    const visualFixed =
        visualAnchor === null
            ? []
            : visualAnchor;

    if (
        drag &&
        visualAnchor !== null
    ) {
        const areas =
            visualFixed.map(i => {
                const root =
                    limbRoot(
                        {
                            x: 0,
                            y: 0
                        },
                        i
                    );

                const support =
                    startGrips[i];

                return {
                    x:
                        support.x -
                        root.x,
                    y:
                        support.y -
                        root.y,
                    r:
                        LIMB_LENGTHS[i]
                };
            });

        ctx.save();

        // A fixed foot limits the body center to foot.y + half the torso height.
        const footSupports = visualFixed.filter(i => i >= 2);
        const bodyBottom = footSupports.length
            ? Math.min(...footSupports.map(i => startGrips[i].y + TORSO.height / 2))
            : HEIGHT;
        ctx.beginPath();
        ctx.rect(0, 0, W, Math.max(0, bodyBottom));
        ctx.clip();
        for (const p of areas) {
            ctx.beginPath();
            ctx.arc(
                p.x,
                p.y,
                p.r,
                0,
                Math.PI * 2
            );
            ctx.clip();
        }

        ctx.fillStyle =
            '#709d7d19';

        ctx.fillRect(
            0,
            0,
            W,
            HEIGHT
        );

        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;

        for (const p of areas) {
            circle(
                p.x,
                p.y,
                p.r,
                null,
                '#7c9c7d90'
            );
        }

        ctx.restore();
    }

    for (const h of holds) {
        if (
            h.y < camera - 30 ||
            h.y > camera + H + 30
        )
            continue;

        const active =
            grips.includes(h);

        const gold =
            h.type === 'goal';

        const green =
            h.type === 'start';

        ctx.lineWidth = 1.5;

        if (active) {
            circle(
                h.x,
                h.y,
                14,
                '#70987920',
                gold
                    ? '#cfaa48'
                    : '#84a78c'
            );
        }

        circle(
            h.x,
            h.y + 2,
            gold ? 10 : 8,
            '#293c3020'
        );

        circle(
            h.x,
            h.y,
            gold ? 10 : 8,
            gold
                ? '#e4be58'
                : green
                    ? '#7ca486'
                    : active
                        ? '#75927b'
                        : '#b2b6aa'
        );

        circle(
            h.x - 2,
            h.y - 2,
            2,
            '#ffffff70'
        );

        if (gold) {
            ctx.fillStyle =
                '#9e7b2c';

            ctx.font =
                'bold 10px system-ui';

            ctx.textAlign =
                'center';

            ctx.fillText(
                'GOAL',
                h.x,
                h.y - 23
            );
        }
    }

    const visual=characterPose(performance.now());
    ctx.save();
    if(visual.pivot) {
        ctx.translate(visual.pivot.x,visual.pivot.y);
        ctx.rotate(visual.angle);
        ctx.translate(-visual.pivot.x,-visual.pivot.y);
    }
    ctx.lineCap = 'round';

    const animationTime =
        performance.now() / 1000;

    visual.contacts.forEach((grip, i) => {
        const moving =
            drag &&
            drag.anchor !== null &&
            !visualFixed.includes(i);

        const h =
            grip ||
            danglingTip(
                visual.body,
                i,
                animationTime
            );

        const root =
            limbRoot(
                visual.body,
                i
            );

        // Proximal/distal shortening is 8:1; keep joints clear of the torso.
        const joint =
            limbJoint(
                root,
                h,
                i
            );

        const color =
            moving
                ? '#c39037'
                : '#435c50';

        line(
            root,
            joint,
            color,
            6
        );

        line(
            joint,
            h,
            color,
            5
        );

        circle(
            joint.x,
            joint.y,
            3.5,
            '#f3f0e7'
        );

        circle(
            h.x,
            h.y,
            4,
            moving
                ? '#c39037'
                : '#2f5d46'
        );

        if (
            drag &&
            drag.anchor !== null &&
            !moving &&
            grip === startGrips[i]
        ) {
            ctx.fillStyle =
                '#526659';

            ctx.font =
                '9px system-ui';

            ctx.textAlign =
                'center';

            ctx.fillText(
                '固定',
                h.x,
                h.y + 24
            );
        }
    });

    const left =
        visual.body.x -
        TORSO.width / 2;

    const top =
        visual.body.y -
        TORSO.height / 2;

    line(
        {
            x: visual.body.x,
            y: top
        },
        {
            x: visual.body.x,
            y: top - 9
        },
        '#435c50',
        5
    );

    circle(
        visual.body.x,
        top - 13,
        10,
        '#e0b99b'
    );

    ctx.fillStyle =
        '#ffffff70';

    ctx.fillRect(
        left - 4,
        top - 4,
        TORSO.width + 8,
        TORSO.height + 8
    );

    ctx.fillStyle =
        warning > 0
            ? '#c56d57'
            : '#39785b';

    ctx.fillRect(
        left,
        top,
        TORSO.width,
        TORSO.height
    );

    ctx.lineWidth = 2;
    ctx.strokeStyle =
        '#fff9ed';

    ctx.strokeRect(
        left,
        top,
        TORSO.width,
        TORSO.height
    );

    for (
        let i = 0;
        i < 4;
        i++
    ) {
        const root =
            limbRoot(
                visual.body,
                i
            );

        circle(
            root.x,
            root.y,
            2.5,
            drag &&
            drag.anchor !== null &&
            !visualFixed.includes(i)
                ? '#c39037'
                : '#d9e9db'
        );
    }

    for (const x of [-4, 4]) {
        for (const y of [-6, 0, 6]) {
            circle(
                visual.body.x + x,
                visual.body.y + y,
                1.3,
                '#d9e9db'
            );
        }
    }

    ctx.restore();
    ctx.restore();

    requestAnimationFrame(draw);
}