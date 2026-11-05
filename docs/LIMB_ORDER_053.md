# Moving-limb order, development 0.5.3

This update is based on published source `a4a4553ddfab39f00262420b717fcbb4fab84d64` (0.5.2). It adds one legality condition to `attachMoving`: when both moving contacts are hands or both are feet, the left contact may not have a greater x coordinate than the right contact. The condition applies before assignment ranking, in live play, generation, replay, and goal look-ahead.

The order is absolute at the destination. A crossed starting pose can uncross. Equal-x contacts remain legal, including existing large-hold and goal sharing. Partial contacts, fixed crossed supports, mixed hand/foot moves, cross-body reach, support selection, reach, height, hazard, goal-priority and resource rules retain their existing semantics. No optional mode or mutable setting is added.

No generation optimization is included. Normal v4, Daily v3, Pages storage prefix, records, Firebase Rules and existing accounts are unchanged. The development user accepts mixed records; no migration or deletion occurs.

## Verification

- `tests/coupled-limb-order.cjs` independently enumerates 432 assignments per Web/native transform, checks direct crossing, uncrossing, equal-x, legal sharing, one/zero-contact partial poses and fixed crossed supports, and compares actual input with replay/undo at 1, 10 and 60 samples. The focused test fails on the unmodified 0.5.2 source.
- `tests/finger-aim.cjs` retains independent reach/sharing/height/goal-priority and input lifecycle coverage with the new legality condition.
- `tests/course-generator-core.cjs` keeps the frozen archived-source hashes and original/extracted comparisons. Latest-source comparisons use a separate archived engine with only an independently expressed order restriction. Unique insertion and exact byte restoration are asserted.
- `tests/failure-return.cjs` retains real generation, original identities and lifecycle assertions while bounding its isolated flow fixtures to short/single walls. No production distribution changes.
- `tests/helpers/coupled-production-validation.cjs` checks the reference contacts and actual live samples, including authored canceled heart-pickup detours. Production population runs also verify exact cold regeneration, fresh warm-cache objects, exact replay, real 1/10-sample play and unmodified budgets.
- Aggregate commands: `npm run test:coupled`, `npm run test:web`, `node tests/course-generator-core.cjs`, Worker/preparation/native recovery tests, and formal Web/native asset checks.
- The release population uses stages 0,1,11,12,17,18,21,22,23,25,30,37,41,45,46,52,55,59,60,62,71,73,82,84,87,94,95,108,126,155,195,400,401 and Daily 2026-01-16,2026-03-13,2026-10-23,2026-11-05 on both source transforms. These cover all five single and twenty-five ordered composite shape families. This is not an all-stage or all-date sweep.

Each run must be judged by its exit code and final report. Source transforms do not prove physical-device input or online behavior. Publication uses the existing `feature/formal-integration` workflow and URL, after checking exact-commit CI and the deployed manifest and assets. Preserve the 0.5.2 source/site as rollback material; never delete saved records as a code rollback shortcut.
