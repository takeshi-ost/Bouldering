# 0.5.10 continuous six-pair integration

## Source and scope

Production base: `5648db581095e5843af857ed53f988f898a36fff` (0.5.9),
`feature/formal-integration` in `takeshi-ost/Bouldering`.
Selection and angle-overlay source: direction playtest 0.5.13,
`20aed7baa674dff7be9684dabdd0bd7c448130a3`.

Only the current pair-selection geometry and matching angular display are
adopted. The playtest bootstrap, offline/storage overrides, and score-start
controls are not imported. Production becomes 0.5.10; native metadata is
0.5.10 (17). The worker and cache-busted asset URLs are regenerated.

## Selection contract

- Sample the existing baseline selector in 3,600 directions at each posture.
- Each of the six moving-limb pairs receives one continuous sector of at
  least 36 degrees. The remaining 144 degrees is allocated proportionally
  to baseline occupancy. Even one occupied sample counts as natural.
- Natural representative angles use the circular mean of occupied cell
  centers. A near-zero resultant uses the midpoint of the longest circular
  run, with the smallest screen angle breaking ties. Full-circle and absent
  pairs use their specified clock directions.
- Evaluate all 120 distinct circular orders and solve the rotation exactly
  on each wrapped quadratic interval. The objective is the equal-weight
  sum of squared angular center errors. Deterministic ordering resolves ties.
- The six sectors cover the full circle without gaps. Input and the overlay
  use the same sector geometry. Trigonometric rounding at an exact endpoint
  can choose either adjacent pair; endpoint-side tests use finite offsets.

## Preserved behavior

Generation, reference validation and heart/stamina validation still run with
the baseline selector. There is no new generation rejection/reseed gate or
runtime input-conversion search. Original seed selection, layouts and budgets
remain unchanged. The old generation witnesses do not imply unchanged live
swipe directions under the new selector.

Limb aim remains 1.5 and body response 1.0. Existing tap/drag/cancel/pan/Undo
behavior and sensitivity controls remain. The wall-tap overlay uses exact
sectors when enabled and the sampled baseline when disabled.

Web course rankings remain disabled. Local records, pending score queues,
progress/profile synchronization, storage namespaces, Daily, ads, audio,
native recovery and all other production service code are unchanged. No
Firestore rules, account data or device installation is changed.

The budget assertions in `balance-items.cjs` are now explicitly scoped to
the baseline generation model. Its retained debug fixtures test generated
budgets, not the former direction-to-pair mapping. Separate live-input tests
exercise current selection and actual resource consumption.

## Verification

Results and timings are recorded under `build/pair-integration/` locally.
The new geometry suite covers 400 deterministic distributions, every pair's
minimum and proportional width, exact coverage, one cyclic run per pair,
representative-angle fallbacks, deterministic placement and both sides of all
boundaries. Cache tests cover chunked preparation, synchronous takeover,
cancellation, invalidation, repeated input and overlay/input agreement.
The overlay regression checks its six rendered arcs against input sectors.

Production checks completed:

- Web integration: 66/66 suites passed. The native build-number assertion
  was updated to 17 and passed again after the final metadata alignment.
- Coupled Web/native integration: 36/36 suites plus the production-boundary
  gate passed. The final Web run also includes the later exhaustive coarse
  placement oracle.
- Stages 1/26/22/62/78 retained seeds 11/36/32/72/88 and exact generated
  geometry. Current-control live replay at both 1 and 10 samples cleared all
  five with remaining stamina 3/2/2/2/2. Changed move inputs were 1/0/6/11/9;
  stage 22 needed two alternate heart witnesses. This remains representative,
  not universal, live-playability coverage.
- Current worker freshness, JS syntax, disabled Web rankings, service
  boundaries, and offline native asset packaging passed.
- 400-distribution finish timing: median 3.27 ms, p95 5.49 ms, maximum
  6.34 ms. Two real-posture cold-plan medians were 41/50 ms, versus 47/55 ms
  on the production base; 100,000 warm selections took 21/16 ms.

The full ordinary registry was covered with the unchanged 300-second per-file
limit: 134/147 passed, with 13 retained failures reproduced on the unmodified
0.5.9 base and zero timeouts. This is consolidated coverage from completed
runner files 1–73, exact complementary shards 74–100 and 101–147, and final
balance/metadata fixture reruns, not one all-green `npm test` run. The redundant
serial run was stopped after its completed prefix. Original failed attempts
and replacement results remain in `general-consolidated.json` and the logs.

Retained baseline failures: `course-types`, `formal-course-retry`,
`formal-course-retry-regression`, `hazards`, `ios-floor`, `player-icon`,
`prototype`, `retired-mode`, `route-cost`, `route-optimization`, `routes`,
`results`, and `native-sync-status`. They involve historical route/seed and
retired-mode expectations, isolated UI fixtures, and ranking/sync display
expectations. Their later assertions are not claimed verified after the first
failure. These debts are preserved rather than silently weakened or presented
as all-green coverage. The last two also reproduce on 0.5.9 and were not listed
in the earlier 0.5.8 regression report.

The full iOS asset test passed in 209.871 seconds, including native recovery
checks and the copied offline bundle. The independent native-resume-game test
passed in 203.277 seconds; adapter/store and native SDK packaging passed too.
No full 401-stage population sweep, Xcode compilation, live Firebase or Rules
deployment was performed.

Node timings are shared-cloud measurements, not iPhone performance.
The baseline scan still costs 3,600 selector evaluations on a cold posture;
warm input reuses the prepared map. Actual browser startup in this execution
environment is blocked by a socket restriction, so no browser screenshot or
physical-device UX verification is claimed. Native asset validation is not
an Xcode build, signed app or device test.

## Publication boundary

The prepared integration branch does not deploy. Pushing or merging into
`feature/formal-integration` automatically runs the GitHub Pages publication
workflow. This integration does not perform that merge/push or change the
existing trial/public URLs. Rollback source is the production base above;
preserve saved records if rolling back.
