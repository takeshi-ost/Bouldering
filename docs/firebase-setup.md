# Minimal online profiles

The game remains on GitHub Pages. Firebase project `bouldering-7482d` provides anonymous Authentication and the default Firestore database. No Functions, Storage uploads, Analytics or Hosting are used. The browser Firebase config in `js/firebase-client.js` identifies the project; it is not an administrator credential.

## Console setup

1. Register a Web app, without Firebase Hosting.
2. Enable Authentication > Sign-in method > Anonymous.
3. Create Firestore Standard `(default)` in `asia-northeast1`, starting in production mode.
4. Publish the contents of `firestore.rules` in the Firestore Rules tab. The repo copy matches the rules supplied during setup; GitHub Pages does not deploy these rules.

## Data contract

Each `players/{Firebase Auth UID}` document contains **only public display data**:

| Field | Value |
| --- | --- |
| `name` | Display name, editor limit 10 graphemes, storage limit 40 code points |
| `colors` | 1–8 hex body colors |
| `headColor` | Hex head color |
| `reachedLevel` | Next unlocked normal stage (`cleared + 1`) |
| `reachedPrototypeLevel` | Next unlocked prototype stage |
| `updatedAt` | Firestore server timestamp |

The old local UUID is retained solely for offline display. Auth uses Firebase's persisted credentials, never a client-supplied UID. The title shows `UID` after successful authentication. Clearing authentication storage or changing devices creates another anonymous identity; recovery/account linking is outside this phase.

On first online use, the local profile and progress are imported. On later clean loads the server appearance is restored; changes pending in local storage take precedence. Progress merges by maximum inside a transaction. A local checkpoint is written after successful sync, so failed changes retry on the next edit/clear, reconnect, focus or reload. Concurrent edits during sync are saved afterward. An unconfirmed editor draft is not replaced by an incoming profile.

A page fetches at most six documents for each of its 20 stages, with four simultaneous single-field queries. After excluding self it displays up to five real opponents per stage. Six pages are cached in memory for one minute; there are no realtime subscriptions or per-frame requests. SDK downloads are dynamic and do not delay local title readiness. Map opponents are empty until data arrives, with no invented users. Ranking fixtures remain unchanged.

Lives, items, star ratings, clear scores, times and rewards remain local. Reached stages are client-reported in this phase; ownership/shape rules are **not proof of a valid clear**. Verified rankings and server-authoritative inventory require later server processing.

## Verification

- Run `node tests/online.cjs`, `node tests/firebase-client.cjs`, `node tests/map-players.cjs`, `node tests/appearance.cjs`, `node tests/title-startup.cjs`, `node tests/map-presentation.cjs`, `node tests/input.cjs`, `node tests/daily.cjs`, `node tests/level-map.cjs`, and `node tests/player-icon.cjs`.
- The online tests inject an adapter/SDK. They do not create cloud accounts or prove deployed rules through the real service.
- In the published game, open Settings and check `オンラインに保存済み`.
- Authentication > Users should contain an anonymous UID matching the title's UID; Firestore > Data should contain `players/{same UID}`.
- Confirm a name/color edit, then reload. Confirm the same UID and appearance persist.
- A second browser/profile creates another user. After its initial save, refocus the first browser after the cache expires; the other profile should appear at its next unlocked stage.
- To diagnose a setup error, inspect the browser console for `Firebase setup:`, `Online profile:` or `Online map:`. Gameplay stays available when the service is unreachable.
