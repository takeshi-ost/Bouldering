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

Only finger-origin aiming, support-constrained body motion, action-aware generation/replay, tutorial witness and associated tests are integrated. Production fixed gain is 1. No trial global, frozen-layout route, memory-only storage, trial overlay, disabled audio/ads/accounts, or offline-only bootstrap enters the game. Existing online, save, ads, audio, Rules, native recovery and packaging boundaries are pinned byte-for-byte by `tests/coupled-production-boundary.cjs`.

Every accepted body segment still passes the native support checks. The initial support pair remains locked. Equal support reaches now retain the original support-pair order within 1e-7 logical units: browser screen-coordinate roundoff of about 1e-14 previously selected a different mathematically tied pair. This correction is limited to the new input mode; historical baseline fixture mode stays exact. A 252-case real-input matrix covers the failing generated stances across seven sample counts, four viewport widths and three origins. Return to input origin and input overflow cancel without cost, retaining collected hearts under the existing game rules. Replay carries explicit pointer actions and canonical body traces; heart sweeps follow the actual trace.

## Search and performance

Boundary intersections invariant within a gesture are precomputed in their original candidate order. The optimization is compared against a frozen original algorithm using 1,512 deep replay comparisons, including complete traces, contacts and limits, on Web and native-transformed sources. No collision/reach rule is relaxed.

Route search first tries a deterministic one-node beam, then retains the original bounded search on failure. Both use the same live edge validation. New valid witnesses can change geometry pruning, moves, stamina and selected retry seeds; no shortest-route claim is made. This improves measured generation but some complex courses remain slow. Timing on a cloud CPU is not an iPhone latency benchmark.

## Verification commands and limits

- `npm run test:web`: existing integration, save, online mocks, tutorial/UI, audio/ad behavior.
- `npm run test:coupled`: production default input/replay/oracle tests and small real-generation smoke on Web/native source transforms.
- `npm run test:population`: all 0–401 and representative Daily dates, full generation twice, exact replay, unchanged recipe/retry identity, and actual 1/10-sample gameplay.
- Population resource validation includes explicit reachable pickup detours with canceled release before continuing the reference. The existing stamina policy can require off-reference hearts; direct reference-only budget validity is recorded separately rather than silently assuming it.
- The integration branch triggers offline checks and unsigned iOS simulator CI only. Pages remains restricted to `feature/formal-integration`.

No live Firebase call, data deletion/reset, device installation, public game update or signing change is part of this integration validation. Native source-transform tests do not substitute for actual Xcode/WebKit or physical-touch checks. Final population/CI results must be recorded before rollout is considered.
