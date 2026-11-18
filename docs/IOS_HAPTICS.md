# iOS haptics: 0.5.26 / build 29 candidate

The iOS-only settings row is 振動 / Vibration. Default ON; the local preference
ascent.haptics-enabled.v1 persists independently from audio. Player identity,
progress, records and existing save keys are not reset.

- New provisional moving-limb contact: light. Unchanged contacts, detachment,
  support limbs and duplicate pointer frames are silent. Simultaneous contacts
  share one impact, including hazard contacts.
- Valid committed pose: stronger. Cancel, invalid release and unchanged pose
  do not emit confirmation. Final successful moves are included.
- Roulette: light each 45 degrees during spin and braking. Delayed frames
  coalesce missed boundaries into one impact rather than stale bursts. Existing
  sound cadence remains 90 degrees.
- Roulette result: stronger once after the grant eligibility check succeeds.

UIKit .light/.medium generators run on the main queue in the foreground and
only for the local Capacitor page. Missing bridge, muted preference and hidden
page are silent. No new SDK, network calls or permission prompt.

## Recovery and verification

The original local commit 564fa10f5284f58a66c4a4dc7dddf8e574af6aed was verified
on 2026-11-17, but its checkout and object could not be found in the later
cloud workspace. It was not on GitHub. This candidate is a reconstruction from
the same formal base 6e07b262cb3bcad028197b0d918ccbd09bfc89b6 and the recorded
approved implementation. The generated course-worker content hash matches the
original implementation: f1059c5b9fb4d3a3347fe8d95a0871bfb23a0384cd1a413bb8244cbd6d6994c7.

Reconstruction checks passed: native-haptics, text, score-metadata, audio
(actual gameplay contact/release hooks), rewards (45-degree and result hooks),
worker generation and diff whitespace. The earlier candidate passed settings
and offline/auto-sync native asset packaging; those are historical results,
not a fresh packaging run for this reconstructed commit.

Not verified: Swift/Xcode compilation, simulator or physical haptic feel.
No GitHub push, Web deployment, signing change or iPhone update was performed.
The broader Web suite is not claimed passed. Before installing, run native
asset packaging checks and Xcode build; verify touch feedback/mute on device.

## Tips integration: 0.5.27 / build 30

The feature/ios-haptics candidate now also includes the three additional
owner-supplied result Tips, English translations, a 12px Tips heading and
16px body text, both bold. The shared normal/Daily success/failure modal uses
all ten Tips. Haptics implementation and native plugin registration are retained.
The standalone feature/result-tips-20261118 branch remains available.

This is a candidate-branch integration only, not a formal-branch merge or Web
deployment. iPhone installation and UIKit haptic feel still need the Mac/device.
The integration's native packaging attempt could not start because this cloud
checkout lacked esbuild; this is not a successful packaging/build verification.

## Preview and light-click refinement: 0.5.30 / build 33

Normal-play touch preview uses six hues and an inner opacity of 75%, fading
outward to transparent. Four upright pips represent left/right hands above
left/right feet. Bright pips show the moving limbs, not the fixed anchors.
Only light provisional-contact/roulette-step impacts use intensity 0.25.
Committed-pose and roulette-result confirmations retain the default medium
impact. Trigger timing, persistence and mute behavior are unchanged.
This candidate has not been published or installed on a device; physical
haptic feel requires a later iPhone check.

## Light-click adjustment: 0.5.31 / build 34

After the owner reported no perceptible feedback at 0.25, light provisional
contact and roulette-step impacts now use intensity 0.5. Default medium
confirmations, timing, mute and persistence are unchanged. Physical feel
requires owner verification; the intensity number is not a perceived percentage.

## Light-click adjustment: 0.5.32 / build 35

The owner found 0.5 too weak and requested 0.8 for light provisional-contact
and roulette-step impacts. Default medium confirmations and all trigger,
mute, preference and save behavior remain unchanged. Physical feel remains
subject to owner verification.
