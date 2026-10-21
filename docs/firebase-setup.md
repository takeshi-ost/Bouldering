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

A page fetches at most six documents for each of its 20 stages, with four simultaneous single-field queries. After excluding self it displays up to five real opponents per stage. Six pages are cached in memory for one minute; there are no realtime subscriptions or per-frame requests. SDK downloads are dynamic and do not delay local title readiness. Map opponents are empty until data arrives, with no invented users. Stage rankings use the separate score integration described below.

Lives, items, star ratings and rewards remain local. Stage best scores/times use the score integration below. Reached stages are client-reported in this phase; ownership/shape rules are **not proof of a valid clear**. Replay-verified rankings and server-authoritative inventory require later server processing.

## Verification

- Run `node tests/online.cjs`, `node tests/firebase-client.cjs`, `node tests/map-players.cjs`, `node tests/appearance.cjs`, `node tests/title-startup.cjs`, `node tests/map-presentation.cjs`, `node tests/input.cjs`, `node tests/daily.cjs`, `node tests/level-map.cjs`, and `node tests/player-icon.cjs`.
- The online tests inject an adapter/SDK. They do not create cloud accounts or prove deployed rules through the real service.
- In the published game, open Settings and check `オンラインに保存済み`.
- Authentication > Users should contain an anonymous UID matching the title's UID; Firestore > Data should contain `players/{same UID}`.
- Confirm a name/color edit, then reload. Confirm the same UID and appearance persist.
- A second browser/profile creates another user. After its initial save, refocus the first browser after the cache expires; the other profile should appear at its next unlocked stage.
- To diagnose a setup error, inspect the browser console for `Firebase setup:`, `Online profile:` or `Online map:`. Gameplay stays available when the service is unreachable.

## Stage score leaderboards

Stage scores now use `stageScores/{COURSE_VERSION}_{mode}_{stage}/entries/{uid}`. A document contains `moves`, integer `timeMs`, and `updatedAt` (server timestamp). The version is `v1`; normal/prototype are isolated. Generation/gameplay changes that make records incomparable must bump `COURSE_VERSION` **and** the allowed board version in `firestore.rules`.

Only new, non-debug normal/prototype clears are submitted. Older unversioned local records are not imported into the current leaderboard; replay a stage to establish its record. Daily scores remain outside this feature. Local stars retain their existing maximum, while current-version moves/time now retain the lexicographic best (fewest moves, then shortest time).

Score writes use transactions and the same best-only rule is enforced by Firestore Security Rules. Clients can create/update only their own UID document; equal or worse updates, invalid fields/ranges and client-supplied update times are rejected. **These remain self-reported scores**: there is no server replay verification.

Pending best records are saved locally and retried after authentication, reconnect, focus or reload. They are bound to the authenticated guest identity; records belonging to a lost/changed UID are not reassigned. Initial SDK/profile failures do not block local play. The score queue's status is separate from the profile-save status in Settings.

Ranking reads are limited to the first 100 scores (moves/time ascending) plus the player's own document. Profiles are fetched for at most five opponents. Ranking rows show the first five or top four plus self; if self is outside the fetched 100, its position is shown as `100+`, not an invented exact rank. Identical scores sort by UID. Requests are cached for one minute, up to 12 boards; save completion invalidates the current board. Loading/error ranks are not shown as confirmed first place. Late responses cannot repaint a different stage's modal.

### Additional console setup (manual)

GitHub Pages deploys the game but **does not deploy Firebase rules/indexes**.

1. Replace the Firestore Rules tab contents with the updated `firestore.rules` and publish. This preserves the existing profile rules and adds score ownership/validation/best-only rules.
2. In Firestore > Indexes > Composite, create a **Collection**-scope index for collection ID `entries`: `moves` Ascending, then `timeMs` Ascending. Wait for it to become enabled. `firestore.indexes.json` is the equivalent definition. No collection-group query is used.
3. In the normal browser, reload and replay a normal stage. Confirm Settings has no queued scores and Firestore contains `stageScores/v1_existing_N/entries/{title UID}`.
4. Clear the same stage as TEST in the private browser. Reload/reopen the normal browser's cleared-stage dialog; confirm both players, correct colors and moves/time ordering.
5. Replay more slowly or with more moves; verify the prior best remains. A lower move count beats a shorter time; for equal moves the shorter time wins.

Additional local validation: `node tests/online-scores.cjs`, `node tests/firebase-client.cjs`, `node tests/results.cjs` and `node tests/stage-start.cjs`. Tests inject SDK/transport and do not change cloud accounts or publish rules. Live rule/index verification is performed after console setup.
