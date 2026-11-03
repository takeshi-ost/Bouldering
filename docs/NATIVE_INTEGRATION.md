# Native source integration — 0.4.58

This adapts the existing native JavaScript wrapper to the current game. It changes the ordinary native Firebase build mode to auto-sync. It does
not change signing, team, bundle ID, app metadata, native storage
namespace or device installation. Native project metadata remains
0.4.6/build14; this is not a signed native release.

Source 0.4.58 additionally restores the previously approved AppIcon and native
launch artwork omitted from the integration. See [ios-branding.md](ios-branding.md)
for exact image hashes and verification limits. Native project identity and
version/build settings remain unchanged.

## Integrated behavior

- Exact source transforms match current quarantined Web pending/status code.
  Native startup still leaves historical Web queue bytes unchanged.
- Normal clears use current COURSE_VERSION (v4), including the startup leaderboard
  request. Daily remains v3/local and never enters the normal queue.
- A challenge that displayed the path keeps its existing ineligible latch. Local
  progression/items/best behave as before, but its native score event is rejected.
  A later eligible run sends that run, not an assisted local best.
- Existing owner/UID checks and ledger keys remain. Valid old v1–v3 normal pending
  events can finish on their original boards with their original metadata.
  Malformed, unsupported/future, retired prototype, mismatched or assisted events
  remain untouched in the ledger without preventing valid events from being sent.
- New ledger/profile initialization never manufactures a test player name. A
  remote profile name is retained unless the player explicitly edits their name.
  Explicit pending edits survive later appearance-only edits.
- Settings reports Online only after a completed server operation. Auth restoration
  is not proof of connectivity. Epoch tickets prevent a late response or language
  repaint from reviving a connection invalidated by an offline/failure event.

## First use and reconnection

- Ordinary Debug/Release assets and Xcode builds now default to `auto-sync`.
  Explicit `offline` and `read-only` modes remain available. CI simulator runs
  continue to override both asset generation and Xcode with `offline`.
- Both connected modes bundle the anonymous-auth function. Persisted Firebase
  authentication is restored first. A genuinely new install may create one
  anonymous user; a saved UID, checkpoint, previous queue owner or identity
  mismatch cannot silently become a replacement account.
- The existing native queue accepts fresh clears and profile edits before first
  authentication, with a null owner. It cannot authenticate or write until startup
  binds the verified UID. Its original storage key and historical entries remain.
- Startup retries on online/focus/native-resume, with one flight at a time. It
  retries SDK/auth restoration and the whole connection sequence, not merely a
  queue flush. Missing connection never gates local play or saving.
- A known offline browser skips anonymous creation without consuming the attempt
  marker. If an actual sign-up request has an uncertain response and no persisted
  identity is recovered, the durable marker still prevents a second account.
  This intentionally remains a fail-stop requiring identity/recovery investigation;
  reconnect is not a promise that every unknown Auth result resolves itself.
- A deletion marker disables native connection permissions, including if it appears
  while authentication is restoring. No transfer or deletion operation is added.

## Restrictions deliberately unchanged

Native transfer, deletion and legacy Web-queue write APIs remain disabled. These
are existing trial-native restrictions, not a complete formal product flow.
Missing storage, UID mismatch or uncertain authentication does not create a
replacement UID. Native storage is independent of the Pages browser namespace;
this change neither imports Pages saves nor deletes any old native data.

## Verification

Run native auth, auto-sync and status mocks, build-policy.cjs, native-sdk-packaging.cjs and
native-entry-formal.cjs; then run `npm run build:ios-assets` with
`ASCENT_FIREBASE_MODE=offline` and `node tests/ios-assets.cjs --bundle-only`.
Also generate default auto-sync and explicit read-only bundles and verify their
resources/CSP with the same bundle-only check, without launching them.
The entry test executes real esbuild output, substituting only SDK loading with
in-memory mocks. Bundle-only checks full generated game resources, CSP and source
transforms without writing to the Xcode project's copied assets. Web integration
and online mocks continue through `npm run test:web`.

These are not live Firebase access, deployed-Rules inspection, Xcode/Swift
compilation, device/browser/audio verification or authorization to publish an app.
