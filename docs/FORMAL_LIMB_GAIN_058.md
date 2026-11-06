# Formal limb aiming sensitivity (0.5.8)

Baseline: published 0.5.7, `8adbd76709145dec5d14a5bc558222651b508db0`.

Formal finger-origin target displacement is now 1.5 times screen displacement.
Body input, activation threshold, anchor choice, reach limits, support geometry,
collision rules and stamina formulas are unchanged. Final body positions can
still differ indirectly when changed aiming selects different contacts.

Live play, generated/search actions, authored tutorial, replay and the worker
use the same formal gain. Existing input/cache identities include this gain;
old prepared results cannot be reused as the new rules. Historical explicit
replay actions retain their own gain rather than silently being rewritten.

Debug 1.00 means the new formal default. Limb-only mode multiplies 1.5 by the
selected comparison factor. Body mode scales input displacement while keeping
formal aiming gain 1.5. The existing 0.25–3.00 factor range therefore needs
explicit gains through 4.5. The setting is captured at pointer-down, stays
session-only, and DEBUG-off restores the formal default. Non-1.00 input keeps
latching ranking assistance even after undo/reset. Formal 1.00 remains eligible.

No save, online, leaderboard, progress-generation or Firestore Rules changes
are included. Old records are not deleted, migrated, or relabeled. Normal v4
and Daily v3 boards remain, so old/new scores may reflect different control
conditions. Course recipes/seeds and stamina formulas remain, but the new
solver can choose different paths, pruning, resources and resulting layouts.
Identical course difficulty or old/new score comparability is not guaranteed.
A separate score generation would require coordinated score/Rules migration.

The tutorial uses the same six authored gesture deltas at gain 1.5, replays
its positions/contacts from those actions, and still starts at stamina 14 and
wins in six moves with 8 remaining. No runtime tutorial search is introduced.

Publication must be reviewed separately: pushing feature/formal-integration
triggers the public Pages workflow. This preparation does not publish itself.

## Verification scope

Web integration: 58/59 passed in the aggregate run. The one failure was native
marketing-version alignment; it passes after aligning source metadata to 0.5.8.
Coupled Web/native suites: 22/22 passed. Real-input generation checks passed for
stages 0,1 (both source platforms),2,20,100,401 and Daily 2026-11-06 (Web).
Web build and native auto-sync bundle checks passed. Worker freshness and
whitespace checks passed. Browser/device gesture QA, Xcode app/simulator build,
full 401-stage coverage and production Firebase were not performed.

The broader 138-file legacy aggregate is NOT green: 113 passed in its first run.
Twelve initial failures pass after targeted test corrections, primarily replaying
recorded finger actions instead of treating resulting body positions as input.
Thirteen remain. Three timed out at the unchanged 180-second limit (course-types,
ios-assets, native-resume-game). Historical retry fixtures expect stages 117/148
to reject their first seed, but gain 1.5 now solves them immediately (gain 1 control
probes still retry). Hazards' exact-three fixture also fails with baseline gain 1.
Other remaining checks concern old renderer/UI/mock fixtures, bonus-vs-default
preview stamina, and a route-pruning minimality assertion (stage 7/hold 4) whose
baseline/gain attribution remains unresolved. No failing check was excluded and
no timeout or gameplay constraint was relaxed. See the JSON verification record.
