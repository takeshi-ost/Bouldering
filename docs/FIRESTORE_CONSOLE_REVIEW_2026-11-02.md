# Console Rules snapshot → formal v4 review (2026-11-02)

## Evidence and scope

The owner pasted the complete currently displayed Firebase Console Rules into the
conversation on 2026-11-02. This is trusted owner-provided text, **not** an
independent authenticated read of the deployed release. It matches the public
`firestore.rules` at `a5ffb19ad5d3bce368f27d7bd682ef74e698ca57` (LF with final LF):

- Console snapshot SHA-256: `e9b4ef2a8178bd95dfbcf0d111f33c842ed6bafc9b55f0bcaa991ee48b0537c9`
- Integration Rules SHA-256: `d7366b85d5c07578f39ef2d9889a31eea1937fa1cc7f7eeb5f73a0c836b7fc41`

The integration file is unchanged by this review. The historical file is retained
in Git and loaded by exact commit in the emulator test. The test pins its hash and
asserts that applying only the following generation extension produces the entire
current file byte-for-byte. No additional Firebase project, migration layer,
production access, Rules deployment or user-data cleanup is introduced.

## Exact extension already on the integration branch

1. Accepted board path:
   - Before: `^v1_(existing|prototype)_[1-9][0-9]{0,5}$`
   - After: `^(v1_(existing|prototype)|v[234]_existing)_[1-9][0-9]{0,5}$`
2. Optional `scoreSpecVersion`: `v1` → `v1`, `v2`, `v3`, `v4`.
3. When that metadata is present and non-null, its version must match the board's
   prefix. Missing/null metadata remains accepted for historical compatibility.

All other lines are unchanged: authentication, owner-only writes/deletes, deletion
locks, allowed fields, profile validation, server timestamps, move/time bounds,
strictly-better updates, read/query permissions and query limits.

Current normal gameplay uses `v4_existing_<stage>` with metadata `v4`. The pasted
Rules reject these writes even if metadata is removed, because the board path is
not v1. Reading an authenticated board/profile can still succeed: read rules are
not gated by the write-generation predicate. A successful read/online label alone
therefore does not prove that v4 scores can be saved.

`v2_existing` and `v3_existing` remain accepted for existing historical pending
scores; new normal attempts use v4. Old `v1_existing` and `v1_prototype` records and
clients are preserved. v2–v4 prototype, v5, trial-prefixed boards and STAGE0 are not
permitted score write destinations. This does not copy older records to v4.

Daily's current `v3` describes **local** Daily records. `recordDailyClear()` writes
browser/device storage; it does not enqueue Firestore leaderboard entries. There
is no Daily leaderboard write enabled by this extension.

## Security boundaries (existing, not newly introduced)

- Signed-in users, including anonymous authenticated accounts, can read profiles
  and stage scores. Bounded lists allow up to 100 documents per query; this is not
  a rate limit or a total enumeration limit.
- The recursive `/{path=**}/entries/{uid}` list permission applies to **every**
  collection named `entries`. Do not put private data in a same-named collection
  elsewhere. The emulator explicitly demonstrates this existing behavior.
- A deletion lock prevents profile/score create/update, not normal read or owner
  delete. Only its owner can create/read their lock; clients cannot update/delete
  that lock. The existing staged cleanup contract is unchanged.
- Rules validate ownership, payload shape/ranges, server timestamp and score
  improvement. They do **not** independently prove legitimate gameplay, a course
  seed, lack of DEBUG assistance, or the authenticity of client-supplied version
  metadata. The approved path-display exclusion is enforced by the game and
  native/Web queues, not authoritative replay validation in Rules.
- Optional version metadata can be absent/null. Board paths still separate score
  generations, but this is compatibility behavior, not cryptographic provenance.

These are explicit limits rather than reasons to introduce a new backend or
change existing permissions without a product request.

## Validation

`npm run test:rules` uses three loopback-only synthetic demo projects:

- `demo-score-legacy`: historical pre-metadata Rules (`795bc083`).
- `demo-score-console`: the owner-provided v1 metadata snapshot (`a5ffb19`).
- `demo-score-metadata`: current integration Rules.

The suite checks v1 old/new/null/partial metadata interoperability, v2/v3/v4
rejection under the Console snapshot and acceptance under current Rules, mismatched
metadata, trial/prototype/future/zero boards, authentication/ownership, numeric and
time bounds, server timestamps, strictly-better writes and deletion locks. It also
compares unchanged profile read/write validation, list limit/no-limit behavior,
recursive entries reads and owner/non-owner deletion. Deletes are confined to
synthetic emulator documents; no real user data is used or changed.

Mock authentication is not real Firebase sign-in. An emulator pass does not prove
that the Console still has this snapshot, that production indexes/provider/domain
settings are correct, or that the app can reach/save to production. Current exact
commit results are in the branch's GitHub Actions runs. No production deployment
or live connectivity has been performed by this review.

## Later deployment impact / order (not executed)

1. Immediately before any authorized deployment, verify the actual project and
   compare its displayed Rules with the reviewed snapshot. Preserve that exact
   pre-deployment text/history. Do not overwrite a newer unrelated change.
2. Publish only the reviewed `firestore.rules` through the existing project. No
   data migration, old-record deletion or UID/name reset is required. Updating
   Rules changes permissions, not stored documents.
3. Confirm the active release's text, then perform separately authorized real-app
   checks with an identified test account: existing profile restore, normal v4
   read/create/improvement, rejected other-owner writes, and offline retry. A
   local demo test alone is not that production check.
4. Prefer Rules first, app rollout second: otherwise v4 uploads are rejected and
   remain pending. The current queues retain failed uploads; approved v4 pending
   scores can later retry, without relabelling old/trial scores.
5. Restoring the snapshot is a permission rollback, not deletion of v4 documents.
   It blocks subsequent v2–v4 writes (including pending retries); existing score
   reads remain authenticated as before. Allow for Firebase Rules propagation
   rather than assuming all existing listeners switch instantly (up to a minute
   for new queries/listeners and up to 10 minutes for active listeners, per the
   [official deployment guide](https://firebase.google.com/docs/firestore/security/get-started#deploying_rules)).

References: [Firestore rule structure](https://firebase.google.com/docs/firestore/security/rules-structure),
[query rules](https://firebase.google.com/docs/firestore/security/rules-query),
[emulator testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator).
