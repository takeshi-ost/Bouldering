# Sequential score trial (introduced in 0.5.6, UI revised in 0.5.7)

Enable DEBUG in map settings, then use “Play scores 1–100 in order” on the map.
This tests difficulty scores, not normal STAGE numbers. Each integer score has
one deterministic sample (seed = score + 10), using the production distribution,
generator, geometry retries, stamina and pickup rules. No distribution or
normal/Daily seed configuration is modified. A single sample is not an estimate
of the full difficulty distribution at that score.

Clear and continue to the next score; score 100 returns to the map. Trial controls
and generation details are inside the existing settings dialog, never over the
climbing wall. The normal HUD shows the current score. Open the gear menu to skip
to the next score, retry, or leave. Retry uses the same score,
seed and geometry; sensitivity comparison settings remain in effect. Leaving
returns to the map, and starting again begins at 1. Trial progress is session-only.
Preparation runs in the existing geometry worker with a cancellable loading dialog;
no cold generation runs on the browser UI thread. Cancellation, stale responses and
worker errors return safely without starting a trial. The old forced-type trial remains available and retains its separate generator.

Trials use debugAttempt isolation: no normal records/progress, online score,
life attempt, ad play count, heart spending or map reward. Feature-help state is
restored on exit. Disabling DEBUG exits the trial. Production ranking versions,
normal courses, Daily and stored user data remain unchanged.

`tests/debug-score-trial.cjs` covers all 100 lifecycle transitions with inexpensive
geometry, persistence isolation, rejected launches, repeat-click handling,
retry/exit/debug-off, and a real score-1 production recipe and deterministic retry.
`tests/coupled-course-preparation.cjs` covers async launch, cancellation, stale
responses, warm retry and errors on shared Web/native transforms. The real worker
test compares score-1 generation and its launched state with the direct generator.
Actual generator sweep evidence is separate; the lifecycle loop is not a full
100-course generation or human-playability test. Existing swipe comparison tests
remain unchanged. No physical iOS build/install is part of this Web update.
