# 0.5.11 straight support and debug display integration

## Source and scope

Production base: `351a8f9d850d50159520c76f965dc7a88582d3e5` (0.5.10), `takeshi-ost/Bouldering`, `feature/formal-integration`.
Approved straight-support source: `2c2fc9f1aa6bf2bc5f26cf446e3069619667bf73`, saved Site version 2 of `ascent-straight-support-playtest`.
The trial baseline `route.js`, `course-generator-core.js`, and `course-adoption.js` matched the formal base byte for byte. These three approved prototype files are adopted unchanged. No trial launcher, comparison UI, storage replacement, Firebase removal, or other offline isolation code is imported.

Release metadata is 0.5.11, native build 18. Course Worker and cache-busted assets are regenerated. No production deployment, GitHub branch update, Site publication, Rules deployment, record reset, or installed-app update is performed.

## Support contract

- Retain unused normal support holds within a horizontal band of 80 logical pixels on either side of the actual final reference body trace at the hold's y coordinate. This is not distance from the screen centre or the nominal straight guide.
- Only straight profiles qualify. Compound courses use source ID provenance and the straight section's owned half; the seam belongs to the lower section.
- Thin the previous trial's final qualifying normal-support pool to `floor(N / 2)` after spike selection. Height strata and alternating side preference are deterministic by seed and do not consume generation RNG.
- The ratio and width do not depend on difficulty. Route contacts, hazards and out-of-scope/nonstraight source IDs are protected. Existing replay-safety fallback may retain exceptions when necessary; no such exceptions occurred in the 14 checked stages.
- Generation and reference/resource witnesses retain the baseline selector. Current live play still uses the six continuous pair sectors. Test-only adapted input witnesses do not alter generated data or runtime generation.
- Initial support preservation can change route selection in mixed courses, including indirectly in their nonstraight half. This is inherited from the approved trial, not introduced by the 50% thinning step. Stage 21 changes from 30 holds / 28 reference moves to 34 holds / 19 moves. The other tested single/mixed stages also preserve the trial exactly.

## Debug display

Normal mode bypasses the overlay's pending wall-tap gesture and never renders the pair-distribution diagram. The usual wall swipe, body-tap Undo, edge and two-finger panning remain. Debug mode preserves short-wall-tap toggle, swipe transition, cancel, blur and posture invalidation. Disabling debug clears visible and pending overlay state. All direct overlay entry points and getters also enforce the debug permission. Native Release keeps its immutable debug-off policy.

## Existing saves and release decision

Normal course identity remains v5 and Daily remains v4. Existing saves, progress, stars, profile synchronization, storage keys, pending score queues, course-ranking pause and service adapters remain unchanged. No record is deleted or relabelled.

The geometry cache is session-local and has no persisted old layout. Its signature includes the new support configuration and helpers. Worker build IDs and cache-busted URLs change with the source, and mismatched Worker replies are rejected. A tab left open on 0.5.10 continues to use its already-loaded old game until reloaded.

Record compatibility is different from cache compatibility. A saved v5 best score remains a current best under 0.5.11, although the layout can differ. On the next clear, the old best can beat the new candidate and its stars are retained by max comparison; no new historical archive is created within v5. Daily records are keyed by date; an already-cleared date remains cleared and unavailable for another attempt, regardless of the generator change. Different app releases can therefore show different geometry while sharing the same record generation. A release-time reset or separate record-generation migration needs its own explicit decision. The planned pre-release record reset is not executed by this integration.

## Verification

Focused checks completed:

- 14 approved-trial stage fixtures match exact holds, reference body/anchors/grips, hearts, retry metadata and support reports. Adapted trial action/trace witnesses are deliberately excluded from fixture equality; original generated references independently replay with the baseline selector. Nonstraight controls 12/17/18/23/30 match both the trial and 0.5.10.
- Stages 1/6/7/21/22/29/98 win with current six-pair controls at both 1- and 10-sample input playback. Stage 6 collects its single heart using the authored pickup trace; mixed stages 21/22 collect all 3/4 hearts. These test-only input prefixes do not modify generated geometry. Spikes are present in representative stages, but this is not a dedicated spike-contact penalty probe or exhaustive population guarantee.
- Actual Daily adoption/cache checks pass for 2026-01-02 (straight, 10% spikes, 6→3 supports) and 2026-03-13 (switchback→straight, 10% spikes, 3→1 supports). Both keep their original date seed and pass baseline replay, ownership/band, cache replay/mutation isolation and context cleanup. These are not additional live six-pair gameplay checks.
- Fast support tests cover actual horizontal trace geometry, seam/source ownership, floor rounding, deterministic seed selection, difficulty independence, no layout RNG use, protected contacts/hazards, idempotence and context cleanup.
- Web/native-transformed overlay tests and actual native Release-policy tests pass. The Release branch never assigns to its immutable debug-off flag.
- Appearance, title-startup and rules fixtures explicitly dismiss course-dependent first-encounter feature help before testing active rendering/settings/input. Their original color, settings and mechanics expectations remain unchanged. The rules fixture now explicitly expects immediate normal-mode drag and no pending debug overlay; its remaining pan/cancel/Undo/budget/heart/ad assertions all pass.
- The routes fixture now dismisses first-encounter help, validates/exempts only approved straight support IDs from its historical minimality assertion, and compares collected hearts against the recorded finger trace instead of a straight endpoint chord. Its original timing, exact collection and all other minimality assertions remain. It reaches the same retained stage7/id4 assertion as the base; stages after that assertion are not claimed verified by this suite.
- Historical core parity retains the immutable archive, every old exact full comparison and strict nonstraight equality. A single reversible, exact-matched support-predicate ablation isolates the intentional generation change. Hash-guarded normalization permits only the approved source block and seven explicit integration edits. Unmodified current production is checked separately against the 14 approved-trial fixtures and current replay/invariants.
- Local desktop Chrome QA confirmed version 0.5.11, Worker preparation, normal wall-tap non-display, debug six-sector display/toggle, swipe dismissal, navigation, then normal non-display again after disabling debug. The final QA preview disabled only its local Firebase bootstrap; production remains unchanged. No physical-device or full browser-course-clear claim is made.

Aggregate verification:

- Web integration: **66/66 pass** on 0.5.11.
- Coupled integration: **36/36 pass**, plus the production-boundary check. This is a distinct aggregate from the ordinary registry below.
- Core historical parity: **27/27 pass**, retaining every archived comparison.
- Ordinary registry: all **149 files executed** under their unchanged 300-second timeout. Final reconciled result: **136 pass, 13 pre-existing failures, zero timeouts**. Initial outcomes (130 pass / 19 fail) and all correction/rerun evidence are preserved in the handoff verification report. A failure is classified as pre-existing only after reproducing its assertion on the exact 0.5.10 base. The remaining failures are `course-types`, `formal-course-retry`, `formal-course-retry-regression`, `hazards`, `ios-floor`, `player-icon`, `prototype`, `retired-mode`, `route-cost`, `route-optimization`, `routes`, `results`, and `native-sync-status`. This is not a fully green repository.
- Native source/assets checks pass after the documented offline asset build and Capacitor copy prerequisites. The full iOS-assets test completes within the unchanged timeout. No Xcode compilation, signing, physical iPhone/Safari testing, or exhaustive 401-stage population claim is made.

Local logs are under `build/straight-integration/` and the existing aggregate report directories. The handoff ZIP includes selected logs, structured results, and a summary of remaining failures.
