# Profile synchronization presentation — 0.5.0

The common settings HTML now places `onlineStatus` and the separate pending-score
message after all normal/context/debug controls, matching the native settings
layout. Native wrapping preserves that order, visibility gates and attributes.
No queue, persistence key, network, identity or synchronization policy changes.

Web profile states explicitly say “プロフィール同期中… / Syncing profile…”,
“プロフィール同期済み / Profile synced”, and “プロフィール未同期（通信を確認してください） /
Profile not synced (check your connection)”. Preparation, connection and offline
messages also name the profile. Success follows the existing profile response;
failure keeps the existing dirty/retry behavior. Scores have their separate queue
and status; lives, inventory and other local data are not claimed synchronized.
Native Debug diagnostics still describe their controller and pending-score queue;
ordinary native Release diagnostics remain hidden.

Shared source/package and Web release: **0.5.0**, as requested. Native Xcode source:
**0.5.0/build 15**, aligned in both configurations; existing identity/signing is
unchanged. Installed iPhone remains game **0.4.61**, native metadata **0.4.6/build 14**,
from `4f49d775fd2837dfbebd10b8ec6069a9c3e8e28a`. No physical update is part of this work.
Historical score provenance is retained; generation versions stay normal v4/Daily v3.

Focused tests exercise actual profile queue pending/success/failure/retry and
language changes while a score remains pending, plus shared/native settings order
and aligned metadata. The prior full aggregate 105/116 with eleven baseline
failures/timeouts is separate; this update does not claim those failures fixed.

The same 0.5.0 update also enlarges both pre-stage Start labels to 24px/weight900
with a 2px white text outline (no button border), and result Tips to 16px.
The first course-heart explanation alone is titled スタミナ+2 / Stamina +2;
other inventory names and recovery amount remain unchanged.

BGM balance changes fixed gains from .42 to .60 (main, +3.10dB) and .75
(stage, +5.04dB). Existing track files, looping/fades, master .18, user music/SE
sliders, stored volume values and mute behavior are unchanged. Apple-decoded PCM
whole-file effective RMS at full user volume is -33.36/-33.34dBFS; isolated music
peaks .10565/.12711 with no clipped samples. A conservative peak bound combining
music with twelve hazard cues spaced40ms is .41636 (<1). This is a measured
selected mix, not a guarantee for arbitrary overlapping audio or a listening
assessment. The agent has not auditioned the audio; perceived balance on speakers
or headphones remains a user listening check.
