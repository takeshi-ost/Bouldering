# Legacy TYPE debug generation retirement

## Provenance and scope

This independent change is based on formal 0.5.11, commit `2f904713170937cb5e4efa6b64f7ad83866b9d6a`. It does not claim restoration of the unavailable unpublished 0.5.12/0.5.13 checkout or its earlier test logs. Those changes are being reconstructed and integrated separately. No GitHub push, site publication, user data reset, account action or native installation occurred.

The product diff removes the TYPE/length/random-generation UI and start API, forced-distribution path, non-score retry/report branches, and old consumption/recovery/dense recipe finalization. Non-basic calls to the retained shared finalizer reject explicitly rather than silently claiming a requested TYPE was generated. The internal `COURSE_TYPES` array and calibration helpers remain unchanged because formal placement still consumes them.

Normal, Daily and score trials use the existing formal generator. Tutorial generation remains separate. The shared resource replay, basic finalizer, `findCourseHeartMove`, post-process hearts/spikes, actual contact penalties, cancel and Undo are retained. Score arbitrary-start API, 1–100 sequence, retry, settings, cancel/late-result handling, exit and save suppression remain in place. This formal baseline has a button starting at score1; an unrelated prototype's arbitrary-start UI has not been imported.

Only valid score trial objects may override generation identity. Old TYPE-only and malformed objects are ignored and cleared at reset, restoring temporary help state without deleting storage. Native Release also hides map debug controls even if a stale runtime debug flag is true.

## Verification

`docs/verification/legacy-type-retirement.json` lists focused checks and per-row comparison hashes. Actual pre/post snapshots included holds, complete route, hearts, initial contacts, height, initial stamina, identity, formal recipe and retry metadata. Thirteen representative scenarios matched exactly:

- Normal stages1,4,23,55,100,148.
- Daily2026-02-04,2026-10-23,2026-11-11.
- Score1,37,55,100.

Every scenario also matched between its cold and warm cache runs. Combined content SHA256: `9726496c23db469e2b74b3e003c1213d9db40685f85b8cafb1506144626ab4ac`.

Real Node Worker/direct generation parity passed for normal offsets10,0,4294967295, Daily2026-11-05 at offset0, and score1. This checks the actual bundled worker, not an injected substitute. Separate asynchronous tests cover cancellation, late replies, retries and malformed results. Web and transformed native Debug/Release tests cover permission gates, stale TYPE objects and data invariance, not a physical iOS app.

The map preservation test initially failed its old hash after removing the selector render call and tightening visibility. Its reviewed exception verifies the entire map source is byte-identical to the previous version after reversing exactly those two changes. Existing records/rewards/inventory/transaction checks remain, not merely an updated expected hash.

## Test retirement and retained coverage

No test registry files were removed. `course-types`, `difficulty`, `course-generation`, `course-length`, `balance-items`, `dense-hazards`, `hazards`, `settings-layout` and `six-pair-generation-scope` now test current boundaries instead of forcing retired runtime TYPE objects. Obsolete TYPE quotas, mandatory consumption/recovery recipes and their full-course clears are explicitly retired; they are not reported as passing.

Hazard tests retain cancel, invalid contacts, one/two new hazards, sustained contacts, limb handoff, clamp, Undo, permanent heart recovery, shake, popup, vector fallback and sound assertions. Contact accounting uses explicit contact-boundary fixtures; separate deterministic real coupled-pointer gestures acquire a hazard and verify charging, Undo and audio. Existing dormant low-level sampling primitives are tested separately from formal sampled caps. Nonempty formal spike assertions prevent all-zero fixtures from vacuously passing.

Observed intermediate fixture failures were corrected, not hidden: old endpoint input assumptions produced `6 !== 5`; current pointer reach is found deterministically instead. A new classification failure-injection fixture lacked recipe level/seed/difficulty identity and initially reported optional rather than unknown; supplying the proper identity restored the intended error-path assertion.

## Existing limitations uncovered

1. STAGE22's formal baseline witness has24 moves, initial stamina18, and passes through none of its4 optional hearts. The unmodified formal commit reproduces this. The actual generation report labels stamina adjustment `arithmetic-only; pickup-access-and-clear-not-guaranteed`. This is not proof the stage is impossible: heart detours are outside that witness. The length test neither increases the budget nor claims all7 sampled witnesses clear;6 clear, and this witness correctly exhausts stamina at move18.
2. A Node Worker with `location.protocol='capacitor:'` and no `ASCENT_IOS_BUILD` policy reproduces `COURSE_PREPARATION_RESULT` for score1 in both the unmodified formal commit and this branch. The UI's native build policy may not be inherited by a real Worker. This is a confirmed simulated-policy failure, not physical-device evidence, and no speculative product fix is included.

The standalone branch has not run a new complete149-file aggregate. The final integrated reconstruction needs that run, final version/asset regeneration and browser review. No Safari/device/Xcode or full population-sweep claim is made.
