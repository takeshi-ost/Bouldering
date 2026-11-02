# Firestore Rules CI

The `feature/formal-integration` branch runs the existing score Rules suite on a
standard GitHub-hosted Ubuntu runner. It does not change main, GitHub Pages,
Firebase projects, deployed Rules, or real user data. This is normal repository CI,
not a bypass of another computer's network or execution permissions.

## Reproduce

Use Node 24.22.1 and Java 21, then run from the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
node tests/firestore-config.cjs
npm run test:rules
```

The npm lockfile fixes Firebase 12.11.0, rules-unit-testing 5.0.0 (compatible with
Firebase 12), Firebase CLI 15.34.2, and transitive packages. GitHub actions are pinned
to commit SHAs. Installation downloads packages and the CLI downloads the official
Firestore emulator; this is not a network-free job. No Firebase authentication,
production secrets, service account or OIDC permission is supplied.

The suite accepts only `127.0.0.1:8089` and uses the synthetic `demo-score-legacy`,
`demo-score-console` and `demo-score-metadata` projects. The CLI also uses a `demo-` ID. Authenticated
contexts are mocks, not real Firebase sign-ins. Full Git history is checked out
because the legacy Rules fixture comes from public commit `795bc083`, and the
owner-provided Console snapshot matches public commit `a5ffb19`.
See [the snapshot comparison](FIRESTORE_CONSOLE_REVIEW_2026-11-02.md).

## Scope

The tests compare historical, owner-provided Console and current repository Rules, including
v1–v4 score generations, metadata compatibility, ownership, unauthenticated rejection,
numeric/timestamp validation, improved-record updates and deletion locks.
They do not verify currently deployed production Rules, real connectivity,
anonymous-account creation/deletion, a browser, or native SDK integration.
Passing this job is not authorization to deploy Rules or connect public gameplay.

The workflow uses `contents: read`, does not persist checkout credentials, and has
no deploy/write step. Standard public-repository runners are used; no larger
runner, artifact upload or dependency cache is requested. Logs and summaries are
public and contain only synthetic test data. A 15-minute job limit bounds failures.
Only pushes to this work branch trigger it; main does not need a workflow change.

Actual run status and the tested commit are available in GitHub Actions. The final
step records the checked Rules SHA-256 and the explicitly excluded verification.

The same job also runs `test:web` (31 focused suites, including mocked online
adapters/queues and save continuation), native authentication/queue/connection
mocks, and `tests/native-sdk-packaging.cjs`. The SDK test builds the real Firebase
SDK/control with esbuild into a disposable directory, then executes the offline
controller in a VM that rejects SDK imports, network access and storage writes.
It does not run Firebase authentication or touch the application's saved data.

The workflow also validates the actual emitted native entry with mocked SDK
operations, and the complete generated offline game bundle with
`tests/ios-assets.cjs --bundle-only`. Current source transforms, v4 scoring,
v3 local Daily records, assisted-score exclusion and connection state are covered.
This does not compile Xcode, sync/install to a device or change signing settings.
The native project version/build remains 0.4.6/build14, and existing fresh-auto-sync,
transfer and deletion restrictions remain. See [NATIVE_INTEGRATION.md](NATIVE_INTEGRATION.md).

The emulator config lives at the repository root so its `firestore.rules` path
stays inside the CLI project directory. An initial CI attempt rejected the old
nested config path before running any Rules assertions; no permission bypass is used.
