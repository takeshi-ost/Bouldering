# Current progress adoption (0.4.54, not deployed)

## Decision and minimal implementation

The current Pages trial save is the formal game's starting point. Historical
cloud test progress must not unlock extra stages. No database cleanup, new
Firebase project, migration chooser, alternate collection or local-save reset is
introduced.

Existing `players/{uid}` profiles gain the optional field
`progressVersion: 'v4'`. `ONLINE_PROGRESS_VERSION` is deliberately independent of
`COURSE_VERSION`; a future course rebalance must not automatically reset progress.

- A new Web profile is built from the current local save. A legacy cloud profile
  without this field does **not** contribute either reached-level value. For
  example, 20 local clears plus legacy reached level 31 yields reached level 21,
  not 31. The first successful sync updates this owner's existing profile with
  the current values and marker; it does not archive the obsolete reached values.
- Once both profiles have the current marker, maximum reached levels synchronize
  as before. Every transaction/retry applies the check, including saves triggered
  by a new clear, not only initial login. A defensive readback guard also ignores
  an unversioned profile's progress.
- Existing Auth UID and local storage scope are unchanged. Web's existing first
  adoption behavior uses the trial name/colors; a matching current checkpoint
  still restores cloud appearance. Native's existing remote-name protection
  remains unchanged unless the player explicitly edits the name.
- Native automatic sync rejects unversioned profile submissions. A preexisting
  unversioned pending profile remains stored but is not sent/relabelled and does
  not block eligible queued scores. A newly queued current local profile can
  replace it. Native's existing authentication, transfer and deletion restrictions
  have not changed; this does not add cloud-progress download to its write flow.
- The current map queries profiles with `progressVersion == 'v4'` **before** the
  six-result limit, and checks the marker again before displaying them. Unadopted
  old players are absent from the new map until their current app syncs. Other
  users see the new current reached level after adoption, not the former test
  reached level. Old clients retain their own old map UI.
- Normal rankings remain `v4_existing_*`; no v1/v2/v3/trial score is promoted or
  deleted. Existing names/colors may still be used to display a historical score
  profile where a historical board is explicitly read. Daily v3 records remain
  local. SEED +10, gameplay, lives, items, rewards and DEBUG ranking exclusion are
  unchanged.

The app does not attempt to reverse historical inflation already saved locally:
that cannot be distinguished reliably from legitimate current play. Public
0.4.45 was permanently offline, so this change prevents first online adoption
from importing the old cloud reach while preserving that trial save in place.

## Transfer files

New exports include `data.progressVersion: 'v4'`. Imports with a missing or other
progress generation are refused before authentication or local writes, with a
Japanese/English explanation. The source file and current save are untouched.
This closes the explicit old-file-import path that could otherwise relabel old
reached levels as current at the next sync. Current-generation transfer still
carries the same profile, records, inventory, Daily state, settings and UID.
There is no partial legacy-file migration.

## Rules deployment dependency

The production Rules revision whose Console readback was reported by the operator
is the static `5812c12` fixture. It rejects the new profile field. This update's
Rules are a **local draft** and must be applied before publishing this app.

The only Rules changes are:

1. Allow optional `progressVersion`, restricted to literal `'v4'`; all six
   existing fields, bounds, auth and ownership checks remain required.
2. Allow adopting an old profile with a lower reached level.
3. After adoption, reject updates that remove/change the marker. Known old
   clients use whole-profile replacement, so their stale saves cannot undo it.

Old unmarked profiles remain writable by old clients until adoption. After
adoption, those old clients' profile writes fail; current clients continue. Score
permissions, reads, account locks and owner deletion are unchanged. This is not
anti-cheat or proof of progression: an authenticated owner can still construct
an in-range profile claiming v4. Owner deletion remains possible by the existing
explicit deletion flow; no deletion is executed by this change.

The map's two equality filters can use automatic single-field index merging
([Firebase index documentation](https://firebase.google.com/docs/firestore/query-data/index-overview)).
No index configuration is added. Production field exemptions/index readiness,
Anonymous Auth, Email/Password (for transfer), API-key restrictions and App Check
have not been verified from this executor, which is not logged into Console.
Emulator success cannot establish production index readiness or real sign-in.

## Verification

- Local loopback-only emulator: **483 assertions**, synthetic data in four demo
  projects. Historical, supplied Console snapshot, operator-confirmed deployed
  snapshot, and new Rules are compared. Includes lower-reach adoption, same-marker
  updates, marker stripping/null/future rejection, map query, cross-owner/guest
  rejection, timestamp/bounds, deletion locks and unchanged v1–v4 score behavior.
- Actual Web bootstrap/profile/adapter code with mocked SDK: trial-first adoption,
  UID reuse, stable checkpoint/no redundant write, same-generation maximum,
  repeated clears/reconnect, failed-write retry, legacy-map exclusion and unknown
  marker safe rejection. No live service call is made.
- Transfer tests: old/missing/future markers rejected before identity/save change,
  Japanese/English file-picker explanation, current transfer and storage/auth
  rollback retained.
- Native controller/queue/emitted entry/status/SDK packaging tests and complete
  offline native bundle validate current marker handling and prior restrictions.
- The ordinary Web integration matrix passed **32/32 suites**, including the new
  progress suite. Affected profile/transfer/text/language tests were rerun after
  final edits. Exact
  local run results are recorded in `build/web-integration/results.json`.

No current-commit browser/audio/device/Xcode test, production connection test,
Firebase setting change, Rules deployment, GitHub push or Pages publication has
been performed for this update. Earlier 0.4.53 CI/WebKit results apply only to
that previous revision, not this change.
