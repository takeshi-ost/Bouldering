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

The suite accepts only `127.0.0.1:8089` and uses the synthetic `demo-score-legacy`
and `demo-score-metadata` projects. The CLI also uses a `demo-` ID. Authenticated
contexts are mocks, not real Firebase sign-ins. Full Git history is checked out
because the legacy Rules fixture comes from public commit `795bc083`.

## Scope

The tests compare historical Rules with the current repository file, including
v1–v4 score generations, metadata compatibility, ownership, anonymous rejection,
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
