# Swipe comparison debug controls (0.5.5)

Based on verified public 0.5.3 source, `7a252629db67582296375c2e9c000588550bf64b`.
The unpublished 0.5.4 change (`b34c783390a8274e42a63c4178a87ab7caca5665`)
only fixed live aiming gain at 1.5. This update replaces that fixed override with
session-only comparison controls. Do not reset or force-push the shared branch.
If publication is approved, use a normal child commit of its verified current
head and preserve any intervening changes.

Enable DEBUG from map settings, start a stage, and open settings during play.
Use the 48px minus/plus buttons to change sensitivity by 0.05 (0.25–3.00).
Reset restores 1.00 without changing the chosen mode. Modes are limb aiming
only and include body. At 1.00 both exactly use the released 0.5.3 input mapping.
Changes are captured at the next pointer-down; an existing gesture cannot pick
up a new multiplier. Retrying retains settings, reloading restores defaults.
Disabling DEBUG forces standard input regardless of the retained controls.

The comparison only adapts live input. Limb mode supplies explicit action gain;
body mode scales the stored screen-displacement polyline with gain 1. Existing
replay consumes the actual resulting action, never a mutable global setting.
Generation, search, support/legality rules, course versions, recipe configuration,
expected route data, and `fingerInputIdentity` retain their standard behavior.
The generated worker is rebuilt because its manifest includes game/UI sources,
not because course generation semantics have changed.

A nonstandard active swipe latches the existing ranking-assistance flag for the
attempt, like showing the expected route. Undo/resetting sensitivity does not
make that attempt eligible again. Normal local progress, records, stars and Daily
rewards retain existing save behavior. This is not a separate disposable save
profile; local best records can be updated. No stored records are deleted or
migrated. Comparison settings themselves are never persisted.

Tests: `tests/swipe-comparison.cjs` covers both modes, four multipliers, 1/10/60
input samples, replay/undo, next-gesture snapshot, DEBUG-off standard behavior,
UI guards/bounds/reset and unchanged generation input identity. It is included
in `test:coupled` for both shared Web and native source transforms. These are
not physical-device or real-browser gesture checks. No iOS installation or
online production mutation is part of this work.
