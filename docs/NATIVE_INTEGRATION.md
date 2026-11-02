# Minimal native source integration — 0.4.50

This adapts the existing native JavaScript wrapper to the current game. It does
not change the Xcode project, signing, team, bundle ID, app metadata, native storage
namespace, launch artwork or device installation. Native project metadata remains
0.4.6/build14; this is not a signed native release.

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

## Restrictions deliberately unchanged

Auto-sync still requires an existing native identity; it does not create a new
anonymous user. Read-only mode retains its prior one-attempt anonymous-auth policy.
Native transfer, deletion and legacy Web-queue write APIs remain disabled. These
are existing trial-native restrictions, not a complete formal product flow;
changing them requires a separate explicit integration decision. Missing storage,
UID mismatch or uncertain authentication does not create a replacement UID.

## Verification

Run native auth, auto-sync and status mocks, native-sdk-packaging.cjs and
native-entry-formal.cjs; then run `npm run build:ios-assets` with
`ASCENT_FIREBASE_MODE=offline` and `node tests/ios-assets.cjs --bundle-only`.
The entry test executes real esbuild output, substituting only SDK loading with
in-memory mocks. Bundle-only checks full generated game resources, CSP and source
transforms without writing to the Xcode project's copied assets. Web integration
and online mocks continue through `npm run test:web`.

These are not live Firebase access, deployed-Rules inspection, Xcode/Swift
compilation, device/browser/audio verification or authorization to publish an app.
