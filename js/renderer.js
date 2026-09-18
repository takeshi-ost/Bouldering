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

// Elbows prefer the outward bend.
// Knees prefer a position above the foot while still bending outward.
function limbJoint(root, tip, index) {
    const dx = tip.x - root.x;
    const dy = tip.y - root.y;
    const d = Math.hypot(dx, dy);
    const half = LIMB_LENGTHS[index] / 2;

    const bend = Math.sqrt(
        Math.max(0, half * half - d * d / 4)
    );

    // Left limbs: -1, right limbs: +1.
    const outward = index % 2 ? 1 : -1;

    if (d < 1e-7) {
        return index < 2
            ? {
                x: root.x + outward * half,
                y: root.y
            }
            : {
                x: root.x + outward * half / Math.SQRT2,
                y: root.y - half / Math.SQRT2
            };
    }

    // There are two geometrically valid joint positions.
    const midX = (root.x + tip.x) / 2;
    const midY = (root.y + tip.y) / 2;

    const offsetX = -dy / d * bend;
    const offsetY = dx / d * bend;

    const jointA = {
        x: midX + offsetX,
        y: midY + offsetY
    };

    const jointB = {
        x: midX - offsetX,
        y: midY - offsetY
    };

    function moreOutward(a, b) {
        return outward < 0
            ? (a.x < b.x ? a : b)
            : (a.x > b.x ? a : b);
    }

    // Arms:
    // always choose the elbow farther toward the outside of the body.
    if (index < 2) {
        return moreOutward(jointA, jointB);
    }

    // Legs:
    // Canvas Y increases downward, so a knee is above the foot
    // when knee.y <= tip.y.
    const aAboveFoot = jointA.y <= tip.y;
    const bAboveFoot = jointB.y <= tip.y;

    // If only one geometrically valid knee is above the foot,
    // use it even if the other solution is farther outward.
    if (aAboveFoot && !bAboveFoot)
        return jointA;

    if (bAboveFoot && !aAboveFoot)
        return jointB;

    // If both satisfy the height rule, choose the more outward knee.
    if (aAboveFoot && bAboveFoot)
        return moreOutward(jointA, jointB);

    // In an extreme pose neither geometrically valid knee can be
    // above the foot. Preserve limb lengths and fall back to the
    // outward solution rather than deforming the leg.
    return moreOutward(jointA, jointB);
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

    if (courseMode === 'verification' && verificationZone) {
        const z = verificationZone;
        ctx.setLineDash([8, 4]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#bd7042';
        ctx.strokeRect(z.x, z.y, z.width, z.height);
        ctx.setLineDash([]);
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#9d552e';
        ctx.fillText(z.name, z.x + 5, z.y + 15);
    }

    if (falseBranch) {
        const a = route[falseBranch.step];
        const b = falseBranch.end;

        ctx.setLineDash([4, 4]);
        line(a, b, '#bb7847', 2);

        if (falseBranch.second)
            line(b, falseBranch.second, '#bb7847', 2);

        ctx.setLineDash([]);

        const end = falseBranch.second || b;

        line(
            { x: end.x - 5, y: end.y - 5 },
            { x: end.x + 5, y: end.y + 5 },
            '#bb7847',
            2
        );

        line(
            { x: end.x + 5, y: end.y - 5 },
            { x: end.x - 5, y: end.y + 5 },
            '#bb7847',
            2
        );

        ctx.font = 'bold 10px system-ui';
        ctx.fillStyle = '#bb7847';
        ctx.fillText('分岐', end.x + 9, end.y);
    }

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

function draw(now = 0) {
    advanceCameraIntro(now);

    ui.overlay.classList.toggle(
        'reviewing',
        state === 'won' &&
        ui.showPath.checked
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
            : fixedLimbs(
                visualAnchor
            );

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

    ctx.lineCap = 'round';

    const animationTime =
        performance.now() / 1000;

    grips.forEach((grip, i) => {
        const moving =
            drag &&
            drag.anchor !== null &&
            !visualFixed.includes(i);

        const h =
            grip ||
            danglingTip(
                body,
                i,
                animationTime
            );

        const root =
            limbRoot(
                body,
                i
            );

        // Two equal rigid segments:
        // flex the elbow/knee instead of stretching.
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
        body.x -
        TORSO.width / 2;

    const top =
        body.y -
        TORSO.height / 2;

    line(
        {
            x: body.x,
            y: top
        },
        {
            x: body.x,
            y: top - 9
        },
        '#435c50',
        5
    );

    circle(
        body.x,
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
                body,
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
                body.x + x,
                body.y + y,
                1.3,
                '#d9e9db'
            );
        }
    }

    ctx.restore();

    requestAnimationFrame(draw);
}