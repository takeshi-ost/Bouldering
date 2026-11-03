# STAGE0 and first encounters (0.4.56)

## STAGE0

The free first-use course remains short and straight, with no hearts or spikes. Its three START contacts and yellow goal are unchanged. The nine ordinary holds now alternate left/right: x=150,250 and y=460 through 140 in 40px steps. The START hand contact is the only wide hold. The yellow goal is a distinct goal type, not an ordinary wide hold, and still requires two hands and fixed feet to finish.

The fixed body route is replayed through the live contact solver before play. It takes eight moves. The normal budget is eleven (eight reference moves plus three), with the approved extra five giving sixteen initial stamina; the reference route finishes with eight. Runtime validation checks replay and resources, and restores previous state if validation fails. This is a demonstrated winning route, not a guarantee that every gesture sequence succeeds. No normal/Daily geometry or ranking generation changes.

STAGE0 now has five pages: three at the playable boundary after the camera intro, then two at valid goal. It no longer shows the large-hold lesson in mid-course. Existing intro/goal copy, artwork, queued animation, image readiness, input/timing pause, clear sound, and free success/failure return to Stage1 remain. Generic explicit-ID hold triggers remain available; there is no mandatory-center assumption.

## First large hold

At the earliest stage-help processing point, the session's persisted seen flags are checked before feature detection. Seen kinds do not inspect their course data, and all-seen exits without inspecting any geometry/items. Unseen large holds are detected in final generated `holds`, not a recipe: an ordinary wide hold that is not an initial grip. START and yellow goal do not count. Heart and spike detection use the same short-circuit ordering.

The large-hold lesson reuses its existing Japanese text and image (78px square plate with contained 2:1 artwork). It appears at stage beginning, before the camera intro, and queues before heart and spike lessons when several are new. It shares one `wide` flag in the existing `ascent.feature-help.v1` state across normal and Daily. Existing saves without `wide` see it once on first encounter; a prior STAGE0 completion does not suppress it. Acknowledgment marks it seen. Leaving before acknowledgment does not. Storage failure still remembers it for this session; existing debug-attempt persistence semantics remain.

The same-generation transfer format accepts the optional Boolean wide flag, retains it on export/import, and treats older files without it as unseen. No save namespace, progress, item balance, score version, Firebase rules, or service calls are changed.

## Verification boundary

Automated tests cover actual contact/input replay, failure/interrupt/duplicate flows, image loading and decoding, feature ordering and per-kind scan bypass. DOM/event doubles are not physical touch/mouse or real-browser visual/audio checks. The offline native runtime smoke script is updated for the new five-page route; executing it in a simulator is a separate validation step.
