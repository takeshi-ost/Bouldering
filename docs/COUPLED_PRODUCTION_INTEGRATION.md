# Coupled climbing integration, development 0.5.2

Status: isolated integration branch, validation in progress. Do not treat this document as publication approval or an all-stage pass.

## Recovery first

The stable shared source is 0.5.1, commit `f63757a8b26f29859f1feef7ca1c52798a16855a`, tree `465677d8efdd58965998207bf4f2140fe91c3308`. The remote branch `rollback/0.5.1-before-coupled` was created at and reread as that exact commit before integration. The published source branch is `feature/formal-integration`; `main` is historical and is not the recovery target.

Exact-commit successful baseline CI:
- Pages: https://github.com/takeshi-ost/Bouldering/actions/runs/41869322781
- Offline integration: https://github.com/takeshi-ost/Bouldering/actions/runs/41869322521
- Offline iOS simulator: https://github.com/takeshi-ost/Bouldering/actions/runs/41869322673

Preserved recovery artifacts (SHA-256):
- `ascent-0.5.1-source-rollback.tar`: `4fe8b7436dd6bac0428c01430cead44f6824c3c590a136de806b576debce847e`
- `ascent-0.5.1-rollback-site.tar.gz`: `063e0e0eef4ed6c09ff045acc914c4f7329de6379cf10309022e7849b941a436`
- `ascent-0.5.1-rollback-native-assets.tar.gz`: `c2e6e97c62155841ac74a4134cac37d68240b81762bd88a714211ee5ccc46600`

The Web archive includes the root redirect and `balance-trial/`, not just the game subdirectory. Its clean formal manifest identifies the exact baseline commit and all 100 listed file hashes were verified. Native assets were rebuilt in `auto-sync` mode and passed bundle-only validation. They are not a signed IPA. The previously installed 0.5.1/build 15 signed Debug product has separate Mac verification; no installation is performed by this branch.

## Restore procedure

1. Inspect current status and preserve any uncommitted/user work. Do not reset the active checkout or user data.
2. Restore a **fresh checkout** at the remote recovery commit, and verify the exact commit/tree above. Alternatively extract the verified source archive into an empty directory.
3. To remove this integration from a later shared history, revert the complete integration commit(s), then compare the resulting tracked tree with the baseline. Removing only support-slide leaves finger-origin enabled and is not 0.5.1.
4. Source restoration and deployed-asset restoration are separate. Rebuilding from a revert commit changes provenance metadata even when the source files match. Use the preserved full Web artifact when byte-exact asset restoration is required. Re-publication still needs authorization.
5. Native rollback requires a rebuild/overwrite install using the existing identity and signing, with `auto-sync` assets. Never uninstall as a rollback shortcut. Device deployment requires separate authorization and a connected Mac.
6. None of these operations restores, deletes, or migrates saved records. Development records written under new controls can remain after code rollback.

## Scope and version policy

Release 0.5.2 is one requested production-development update from 0.5.1. Trial-only 0.5.2/0.5.3 labels are not the production release sequence. Normal `v4` and Daily `v3` score identities and the existing Pages storage prefix remain unchanged under the user's explicit acceptance of mixed development records. No reset occurs. A coordinated prerelease reset/version change is a separate future action; a config-only version bump would conflict with metadata, transfer/history, packager guards and Firestore Rules.

Finger-origin aiming, support-constrained body motion, action-aware generation/replay, the tutorial witness, responsive course preparation and associated tests are integrated. Production fixed limb-aim gain is 1.5 from 0.5.8 (see FORMAL_LIMB_GAIN_058.md); body input remains 1:1. No trial global, frozen-layout route, memory-only storage, trial overlay, disabled audio/ads/accounts, or offline-only bootstrap enters the game. Existing online, save, ads, audio, Rules and native recovery adapters remain byte-for-byte unchanged. `tests/coupled-production-boundary.cjs` also records narrow reviewed exceptions for preparation UI and worker packaging, pins the unchanged map records/inventory section, and preserves the exact native launch transaction and Daily counter/ad boundaries.

Every accepted body segment still passes the native support checks. The initial support pair remains locked. Equal support reaches now retain the original support-pair order within 1e-7 logical units: browser screen-coordinate roundoff of about 1e-14 previously selected a different mathematically tied pair. This correction is limited to the new input mode; historical baseline fixture mode stays exact. A 252-case real-input matrix covers the failing generated stances across seven sample counts, four viewport widths and three origins. Return to input origin and input overflow cancel without cost, retaining collected hearts under the existing game rules. Replay carries explicit pointer actions and canonical body traces; heart sweeps follow the actual trace.

## Search and performance

Boundary intersections invariant within a gesture are precomputed in their original candidate order. The optimization is compared against a frozen original algorithm using 1,512 deep replay comparisons, including complete traces, contacts and limits, on Web and native-transformed sources. No collision/reach rule is relaxed.

Route search uses bounded deterministic prepasses: full-goal searches try a three-node greedily ordered beam first, while constrained partial searches try a one-node beam first. Either then tries the other prepass, and failure always retains the original full bounded search. Every phase uses the same live edge validation, stop/accept constraints and traversal requirements; reports count all transitions across phases. New valid witnesses can change geometry pruning, moves, stamina and selected retry seeds; no shortest-route claim is made. This improves measured generation but some complex courses remain slow. Timing on a cloud CPU is not an iPhone latency benchmark.

For paired `switchback → straight` courses only, the two source sections retain the canonical prepass-free partial search and original narrow/full goal search. Their witnesses affect which contacts survive pruning, so a faster source witness can make the merged problem much harder. The merged course still uses hybrid search. The strategy is restored in `finally`, including errors and nested scopes, and is part of cache/Worker identity. This is a recipe-family rule, not a special case for a stage or seed. In the 434-case representative matrix it affects six normal stages (59, 144, 202, 225, 239, 263) and Daily 2026-03-13; other Daily dates can share that recipe family.

The regression was observed at Stage 239: hybrid source witnesses took 395.827 seconds cold, rejecting seed 249 before accepting seed 250. The scoped canonical-source correction accepted seed 249 in 25.403 seconds (23.971-second independent cold repeat), with 47 moves and a verified 50-to-3 stamina plan. Those measurements include exact deterministic regeneration, resource checks and actual 1-/10-sample input validation; they are not a cross-device performance promise. Original and replacement population evidence is retained separately.

A bounded session-only cache stores fully validated geometry and its recipe/retry reports. Each reuse creates a fresh object graph and leaves live hearts, stamina, moves, lives, records, accounts and persistence to the normal reset path. Configuration, input models and generation/physics function identities invalidate the cache. Population checks explicitly clear this cache before each of two cold generations and separately assert an exact fresh-object warm reset. Warm-cache speed must never be reported as cold generation speed.

## Responsive preparation

Formal normal and Daily geometry is prepared in a self-contained same-origin classic Worker using the same production generation/physics sources. A generated source digest, portable configuration/model identity, independently resolved request/recipe and bounded graph validation guard every reply. The supported runtime DEBUG seed offset is transported explicitly. Workers receive no account, save, live resource or record state.

The stage dialog opens immediately with Start disabled until ready. Closing it, selecting another Daily date or leaving its calendar cancels and terminates pending work; stale replies cannot launch a course. A startup handshake has a 15-second deadline, separate from the longer bounded generation. Worker failure or lack of Worker support shows a retryable error rather than running expensive generation on the main thread. A ready snapshot remains pinned through cache eviction and the normal native transaction. A navigation epoch prevents an old deferred launch from resuming after leaving and returning to the same screen.

Preparation completes before ordinary life/item spending and Daily attempt counters. Native storage retry can still create its existing transient attempt receipt before a deferred continuation; an invalidated prepared lease rejects before reset/resource effects and uses the existing end/cleanup recovery path. No native recovery/store adapter was changed.

The authored tutorial stays synchronous because it performs no course search. Legacy custom type/length `startDebugCourse` remains synchronous and is not covered by the formal Worker path. This is a development limitation, not a claim that every diagnostic generator is responsive.

Node Worker tests verify real Stage 1 generation against direct generation with complete graph equality and fresh launch objects. A shared deterministic diagnostic clock is used only for equality of elapsed-time report fields; real-clock Worker startup is checked separately. Actual capacitor/WebKit startup, cancellation, normal launch and DOM input are required in the simulator smoke before rollout.

## Verification commands and limits

- `npm run test:web`: existing integration, save, online mocks, tutorial/UI, audio/ad behavior.
- `npm run test:coupled`: production default input/replay/oracle tests and small real-generation smoke on Web/native source transforms.
- `npm run test:population`: all 0–401 and representative Daily dates, two cold generations, separate warm-cache parity, exact replay, unchanged recipe/retry identity, and actual 1/10-sample gameplay. Loaded-source archives identify the precise engine validated by each shard. Final-source snapshot replays are additional coverage, not a claim of rerunning final-source cold generation.
- Population resource validation includes explicit reachable pickup detours with canceled release before continuing the reference. The existing stamina policy can require off-reference hearts; direct reference-only budget validity is recorded separately rather than silently assuming it.
- The integration branch triggers offline checks and unsigned iOS simulator CI only. Pages remains restricted to `feature/formal-integration`.

No live Firebase call, data deletion/reset, device installation, public game update or signing change is part of this integration validation. Native source-transform tests do not substitute for actual Xcode/WebKit or physical-touch checks. Final population/CI results must be recorded before rollout is considered.
