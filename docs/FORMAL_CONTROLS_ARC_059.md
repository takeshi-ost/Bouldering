# 0.5.9 formal control / reference-route integration

## Scope and provenance

Base: `020ddd90c4cbaf0a4a334ac6a7394587ea5c7318` (0.5.8).
Rollback remains this commit; all changes are isolated on `feature/formal-controls-arc-059`.
No deployment, Firestore rules deployment, device installation, or saved-record reset is part of this change.

- Adaptive guaranteed-six-pair selector source: trial commit `2f7bc80329802b6c532f6395eaf5c813e8ce48be`.
- Arc-distance progress source: trial commit `d750a80798a8af3f571088743719eaafd6676e34`, `source/finger-route.js`.
- Limb aim stays 1.5, body response stays 1.0. Existing developer sensitivity controls remain.
- Reference path numbers move to colored limb-specific hold corners; the torso path line remains.
- Wall tap toggles an angle map. A swipe hides it. Body tap remains Undo; the map adds no persistent HUD.

## Important integration boundary (latest user direction)

Generation and all in-generation reference/heart validation intentionally use the baseline selector. Live input and explicit simulation of live input use the new selector. The direct recipe API and formal preparation both scope all four generation phases to baseline selection. A mismatch when replaying the old straight swipe with the new selector does **not** reject the course or advance its seed.

An earlier integration experiment required exact new-selector reproduction before acceptance and regenerated layouts on mismatch. That experiment was withdrawn after representative old routes were reproduced with different legal inputs: move 6 logical pixels toward the desired pair's guaranteed sector, return the finger to its origin without releasing, then perform the original motion. This retains the original target body/contacts and move count. It is an offline diagnostic, **not** a new runtime conversion/search step.

The guarantee is therefore explicitly scoped: generated witnesses prove baseline-control feasibility, not that each old input direction will execute unchanged under the new controls. Six-pair availability does not by itself prove every physical move; separate representative tests check alternative live inputs, heart pickups and stamina. Full equivalence for every course/input and physical-device input ergonomics have not been proven.

No course skeleton/distribution rules or heart/stamina rules are replaced. Existing limits of the stamina allowance and off-route/canceled heart-pickup witnesses remain.

## Identity / data preservation

Normal course generation is v5, Daily is v4; progress stays v4. Historical score metadata and queues remain supported. The Firestore rule diff adds v5 boards/specs without deleting old generations. It must be deployed and verified before publishing clients that submit v5 scores. The existing storage namespace, progress/rewards/inventory, native recovery protocol and old records are preserved.

## Verification

Focused Web/native tests cover six-pair positive-width reservations for 20 baseline distributions and real postures, baseline scope restoration, tap/drag/cancel/long-press/blur/pan/Undo interaction, and route hold markers/body line. Current worker bundle checks pass. Full tests and representative live population checks are recorded in `build/` during preparation; final results must be read before claiming all-green readiness.

Representative alternative-input diagnostics preserve original seeds/layouts:

| Stage | Original seed | Moves | Changed move inputs |
|---|---:|---:|---:|
| 1 | 11 | 6 | 1 |
| 26 | 36 | 16 | 1 |
| 22 | 32 | 24 | 1 |
| 62 | 72 | 33 | 5 |
| 78 | 88 | 34 | 2 |

All five completed exact/ten-sample geometry replay using 6-pixel selection excursions. With the original heart placement and budget unchanged, actual down/move/release tests at 1 and 10 samples cleared all five: remaining stamina 3/2/2/2/2 respectively. Stage 62 additionally required one alternate heart-pickup input. These tests do not prove universal input equivalence. An older rejecting-gate population run is obsolete for final seed/timing expectations.

Native asset packaging is separate from Xcode compilation or physical-device QA, which have not been performed here. No publication readiness is inferred from focused tests alone.

## Regression follow-up

The retained debug family/length generator had a separate entry from formal preparation. `prepareCurrentStage` now scopes **all** generation (including debug and the authored tutorial) to baseline controls; a dedicated test prevents six-pair direction scans from re-entering generation. Service/historical witness tests explicitly identify their baseline-control scope rather than claim unchanged live input directions.

A debug dense-hazard safe-fallback regression was also exposed by the changed route scoring: budget arithmetic alone did not prove that the old action still selected the same contacts after a hold type changed. Safe-fallback conversion now requires the existing complete replay-and-budget check. Ordinary hazard conversion is unchanged. The forced-search-error/resource regression passes with its original assertions.

The historical v2 retry fixture's expectation that stage 117 must reject its first seed also fails on the unmodified 0.5.8 base (`020ddd9`). It is not silently weakened or counted as a passing final regression.

Further regression evidence (2026-11-09): tutorial modal/lifecycle/clear-sound suites pass with actual new-control successful play; only their historical exhaustion-action fixture is explicitly baseline-scoped. Results/Undo historical witnesses are likewise distinguished from the new live-control tests. The angle legend now uses the JA/EN text catalogs. Native asset generation, Capacitor copy, bundle-only verification and all 125 copied assets' byte parity pass; this is not an Xcode build or device test.

Unmodified-base checks reproduce the existing failures in `course-types` (requested consumption vs choice fixture), `formal-course-retry` / `formal-course-retry-regression` (historical seeds no longer rejected), `player-icon`, retired `prototype` / `retired-mode`, `route-cost`, `route-optimization`, and `routes`. These assertions remain intact; neither an all-green full regression nor universal optimal/live-route equivalence is claimed. Longer native recovery tests passed at approximately 272 seconds, so the general runner now defaults to 300 seconds per file, configurable explicitly, rather than incorrectly timing out at 180 seconds.

Final additional regression classification: `hazards` also fails unchanged 0.5.8 on its historical stage 23 expectation of three hazards (actual zero). The assertion remains, with the generator witness now baseline-scoped; its later manual checks are not claimed executed by that early-failing suite. Dedicated dense-hazard, contact, image, feedback and coupled tests pass separately. Web `input` passes; optional native `input` fails its missing-storage reset fixture identically on 0.5.8. The native recovery/storage suites pass independently. These existing test debts are not silently removed from the runner.

Final coverage accounting: all 144 ordinary top-level test files were attempted across the full run and complementary shards, with corrected/long-running cases rerun separately. 133 pass; 11 retained failures reproduce on the unmodified 0.5.8 base: course-types, formal-course-retry, formal-course-retry-regression, hazards, ios-floor (isolated VM missing render callback), player-icon, prototype, retired-mode, route-cost, route-optimization, routes. This is consolidated coverage, not a single all-green run. Web integration completed 58/59 in its run; the one old v4 ranking expectation was corrected and passed separately, accounting for all 59. Coupled Web/native checks pass 32/32. The default iOS asset suite, including native recovery tests, passed in 239 seconds; no timeout remains in the complementary shards. Logs and the consolidated inventory are local under `build/`.

## Formal Web publication: course rankings paused

Per owner direction, normal STAGE ranking panels, retrieval, enqueueing and
sending are disabled by `COURSE_RANKINGS_ENABLED = false`. Both the Web queue
and Firebase adapter enforce this. Existing pending-score storage is retained
without normal startup/connection writes; no historical scores are deleted.
Local records/stars and profile/progress synchronization remain enabled.
Daily already has local records only and is unchanged. Explicit user account
deletion still cleans up that user's old scores as before.

No Firestore rules deployment is required for this Web release. The v5 rules
source remains prepared but is not deployed. Re-enabling ranking requires
reviewing/deploying the compatible rules first. Native iOS uses a separate
sync implementation and is not published or represented as ranking-disabled
by this Web-only release.

Rollback source: production 0.5.8 commit
`020ddd90c4cbaf0a4a334ac6a7394587ea5c7318`; preserve local records on rollback.
