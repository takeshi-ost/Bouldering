# Current game integration — shared game 0.4.61

Pages now builds and deploys this shared branch through Actions. See
[shared release workflow](SHARED_RELEASE_WORKFLOW.md) for current publication,
Web-to-iOS steps, platform differences and verification limits. Historical native
verification notes below describe their original checkpoints, not the current
iPhone installation result.

The current game is the formal development baseline. Use the existing GitHub
repository and Firebase project `bouldering-7482d`; no second service environment.
This branch starts at public main `24d4267495d1a496cf950a6f90697ea3559d7bfb`.
Only reviewed source files are applied, not private development commit ancestry.

## One Web build

```sh
npm run test:web
npm run build:web -- /absolute/new-output-directory
```

The builder requires committed source; `--allow-dirty` is for local tests only.
Use the built output for Pages (the existing `/balance-trial/` path and root URL
can remain unchanged). Raw source `index.html` is a development input, not the
Pages deployment artifact: the builder adds the existing storage key adapter.
The branch push, Pages release, and Firebase Rules deployment are separate actions.
The current `pages.yml` workflow packages and publishes the same committed source.

## Existing save and online behavior

- Continue `ascent.pages-trial.0.4.12.d6.*` in place. No save selection, new storage
  generation, copying, backup/journal, or startup migration/lock is needed.
- Existing progress, inventory, lives, Daily completion/rewards and settings remain.
  Raw keys from the older formal tests are not imported or deleted.
- Normal Firebase startup/reconnect is restored. SDK or network failure does not
  block local TAP/gameplay. No new consent/connection-policy wrapper is introduced.
- Firebase restores its existing browser identity. Normal profile sync can raise
  local progress to that account's cloud progress; names/colors use the existing
  edit/checkpoint merge rules. Lives/items remain local.
- Old trial bests stay local history and are not backfilled as official scores.
  New normal scores use v4; Daily uses v3 and remains local/date-keyed.
- DEBUG is in ordinary settings. Normal SEED is stage+10. The settings-only SEED
  input affects subsequent explicit test attempts; Daily is unchanged.
- An attempt that displays the planned path is not ranked, even after switching
  the display off or Undo. Ordinary unlocked-stage local progression/item use is
  unchanged. A new attempt resets the assistance latch.
- Existing self-deletion UI/retry behavior is retained. The key adapter maps
  cross-tab deletion events and scopes local cleanup; no old/raw saves are erased.
  Deleted-state guards and server deletion locks retain their prior behavior.

## Scope and release checks

Source includes the adopted generator/progression, current tutorial/help/artwork,
UI/flow improvements, Web integration, and tests. Distribution 7, progression 5,
short-heart cap and low-score exclusivity remain unchanged. No rebalance.

Private policy/support drafts, local release identity settings and private commit
ancestry are not introduced. Existing public `balance-trial/`, native project,
old documents, logs and metadata are left unchanged. The native project remains
public-baseline 0.4.6/build14, not a new native release. Current game-to-native
source adapters and the queue support formal course generations; see
[NATIVE_INTEGRATION.md](NATIVE_INTEGRATION.md) for remaining limits. Later private
native work is retained separately; signing and identity are not imported. The
approved AppIcon and launch artwork were subsequently restored in source 0.4.58;
see [ios-branding.md](ios-branding.md). This changes resources only, not the native
identity or build metadata.

`firestore.rules` is an additive draft for v4. Its v1–v4 suite passed 129
assertions in the GitHub demo emulator (see [CI scope](FIRESTORE_RULES_CI.md)).
Before public online play, review the actual deployed Rules and deploy changes
only with authority. No live Rules/accounts/data were accessed or changed.
Locked official test dependencies are installed for CI and local mocked builds.

The focused `test:web` command tests the packaged runtime using mocks/VM, save
continuation, fresh STAGE0, deletion/reload, settings/SEED/ranking isolation,
profiles/queues/transfer, tutorial, Daily, ads, and actual stages1–20 generation.
It is not the entire legacy/native test aggregate. Browser/device/audio and
actual Firebase access remain unperformed; current native scope is documented
separately and is not a signed/Xcode-compiled release.

Current focused result: **31/31 Web suites passed**, alongside the native checks
listed above. The initial Web-only integration result is retained separately:
[verification/web-integration-0.4.47.json](verification/web-integration-0.4.47.json).
