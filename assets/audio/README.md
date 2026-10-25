# Short event sounds

Replace these PCM WAV files with your own finished audio:

| File | Trigger |
| --- | --- |
| `move.wav` | Move/Undo/invalid-move contact, processed from the supplied plug insertion reference (0.33 s) |
| `launch.wav` | Accepted title TAP and normal/daily Start taps, processed from confirmation button 47 (1.25 s) |
| `stage-start.wav` | Beginning of the stage intro, before controls unlock |
| `stage-clear.wav` | Successful ascent; original synthesized bright cadence (1.03 s) |
| `heart-recovery.wav` | Stage heart +2 pickup; original rising sparkle (1.00 s) |
| `hazard-fix.wav` | Newly confirmed jagged hazard contact; original bright onset and swelling low pulses, revision 2 (0.67 s) |
| `map-steps.wav` | Next-level map hop begins; original four-step one-shot (0.65 s) |
| `stage-fail.wav` | Failed ascent or retirement |

Start/fail are audible synthesized placeholders; move/launch are processed user-supplied references (mono, normalized peak 0.6 with short edge fades). Recommended delivery: **WAV (.wav), linear PCM, 16-bit, 44.1 kHz, mono**. Export with minimal leading silence. Short clips of roughly 0.3–3 seconds work well; game progression does not wait for playback to end. No loop is used.

Files are fetched once and decoded into reusable Web Audio buffers after a user gesture. They share the Effects enable/volume bus, voice limit, mute and visibility cleanup with other effects. Music uses a separate enable/volume bus. Both settings are persisted and included in transfer files, with backward-compatible defaults for older files. The game never waits for a download or decoding; a short fallback cue is played if the file is unavailable or not ready. The same event is not replayed when loading finishes. Failed downloads can retry when the connection returns.

After replacing a file, run `python scripts/version-assets.py` and commit both the file and updated JS/HTML. Content hashes refresh the browser cache automatically. Per-file gain can be adjusted in `SOUND_FILES` in `js/audio.js`. `SOUND_LEVELS` calibrates cue loudness against the launch reference (launch/start stay at 1); the same calibration applies to decoded files, synthesized cues and file fallbacks, upstream of the independent user Effects volume. Quiet tap/contact/roulette cues receive the largest boosts. Music and saved slider values are unaffected.

## Background music

| Delivery file | Music | Loop duration | File size |
| --- | --- | --- | --- |
| `bgm-loop.mp3` | a_curious_calibration (original 40–104 s) | 64 s / 2,822,400 source frames | 1,321,318 bytes |
| `bgm-stage-loop.mp3` | the_measured_pendulum (original 24–108 s) | 3,704,399 / 44,100 s | 1,721,514 bytes |

Both are 160 kbps CBR MP3, 44.1 kHz, stereo, encoded with libmp3lame and a Xing/LAME gapless header. The approved loop WAV masters remain the source of truth outside the repository. The uncompressed delivery assets were removed to reduce deployment size.

Before encoding, prepend the last one second of the loop and append the first one second (no fade to silence). `BACKGROUND_MUSIC.loopStart` is 1 second and `loopSeconds` retains the exact original sample duration. Playback starts at `loopStart + savedOffset`; the native buffer loop ends at `loopStart + loopSeconds`. Encoder lead/tail padding stays outside this cyclic region, including decoders retaining a short encoder delay. The one-second guards are not extra musical content. Fade and saved playback positions are measured relative to the loop, not the file. Do not replace a guarded asset with an ordinary MP3 without updating the loop range.

Encoding: `ffmpeg -i guarded.wav -c:a libmp3lame -b:a 160k -write_xing 1 -map_metadata -1 output.mp3`. Validate decoded length, seam continuity, and peak level before publishing. The original approved 80 ms seam smoothing is retained in the audio, not applied again at runtime.

`js/bgm.js` fetches both tracks asynchronously and starts native Web Audio buffer loops only after activation. Main-screen music covers title, maps/calendar, editor and roulette; stage music covers normal/daily play and results. Each stage attempt restarts stage music at zero gain with a 5-second linear fade. Ads block both tracks until the ad cover is removed and navigation resolves, then the destination track restarts from zero with a 1-second fade, including direct ad-to-stage transitions. Same-track screen changes continue playback. Music mute/background pause preserves position and fade progress. Effects mute leaves music running, and live music volume changes do not restart the loop or its fade. BGM voices are independent of the SE voice limit. Downloads and decoding never block game flow; reconnect retries failed downloads. Per-track gain is configured in `BACKGROUND_MUSIC`. Run `python scripts/version-assets.py` after replacements.

## Original event SE study (local draft)

Regenerate the four original signals with `python3 scripts/synthesize-event-se.py`; Python standard library only, no input sound files or sample libraries. Output is mono PCM16 WAV at 44.1 kHz. The script synthesizes oscillators, inharmonic partials, filtered seeded noise, envelopes and impulses. `--output DIR` supports byte-for-byte reproduction tests without changing assets.

The supplied 回復魔法1, 決定ボタンを押す15, 決定ボタンを押す24, アスファルトの上を走る2 are reference-only. Their signals were decoded outside the repository for envelope/frequency analysis; no samples, converted clips, cut-ups or pitch-shifted copies enter these assets. Existing move/launch provenance above is unchanged. Reference assignment was verified by actual filenames.

| Event | New effective peak / RMS dBFS before existing .18 master | Construction |
| --- | --- | --- |
| heart +2 | .482 / -21.4 | Interlaced rising chirps and staggered bell grains |
| hazard fixed, adopted revision 4 | 1.560 / -13.9 | Low struck fundamental/upper partials, short cavity body, reduced noise tail; file gain2 |
| clear | .434 / -20.9 | New four-note cadence/timing with inharmonic bell partials |
| map hop | .505 / -23.1 | Four independently seeded low thumps and dry filtered grit |

Launch reference RMS is -21.4 dBFS before master, peak .600. Individual user Effects gain/mute and lifecycle recovery remain unchanged. Edge fades remove discontinuities; active leading silence is below 1 ms and trailing quiet space below 60 ms. Four new cues together have conservative peak headroom through the .18 master; this does not claim every possible mix with legacy cues/BGM cannot clip. Actual perceived balance, harshness and repeated-play comfort need user listening.

Hazards suppress the normal provisional contact cue, including mixed normal/hazard limb pairs. A committed new hazard uses the existing hazard event instead of the normal move event; unchanged contacts, cancel/Undo and clear/failure priorities retain existing behavior. The map cue starts when visible hop animation starts after map preparation, is a finite 650 ms one-shot matching MAP_HOP_DURATION, and has no arrival page cue. Calendar/page navigation retains its existing page swish. Background/mute cleanup still stops voices; no loop or replay-on-decode is added.

Validation: `python3 tests/original-event-se.py` checks deterministic reproduction, PCM, effective levels, edge padding, four-cue peak budget and exact hop duration. Audio file/settings/lifecycle tests cover caching, missing-file fallback, independent gain/mute and context recreation. Real event tests cover pickup once, clear once, hazard without contact/move doubling and one map-step cue at animation start.

Local QA URL: http://127.0.0.1:8794/ (server required). Ignored build/se-review contains individual auditions, legacy comparison, four repeated hazard hits and four scene fixtures. It removes Firebase bootstrap and blocks external connections with CSP. Scene fixtures call actual gameplay event handlers but use synthetic local-only state, not a natural full playthrough. No diagnostic UI is added to the product index. Chrome playback-start/event traces are observations of execution, not a claim of human listening approval.

### Jagged-hold revision 2

User approved the other three sounds, but found the first jagged-hold cue unlike the reference. Re-examined the actual decoded 決定ボタンを押す15 waveform (0.807 s): first ~20 ms has predominantly 3.5–8 kHz energy; after ~40 ms the dominant energy is below 300 Hz (typical peaks 60–90 Hz), with envelope swells around 0.09/0.19/0.30 s and a diminishing low tail. The initial 0.22 s draft instead emphasized an immediate ~150 Hz knock plus 3680/2470 Hz bells, removed most of the tail and changed the rhythm. That numerical mismatch explains the design correction; this is not a claim of subjective listening equivalence.

Revision 2 removes the bells, synthesizes a brief filtered-noise attack and three slower low pulses at new timings, with a ~99→57 Hz exponential pitch bend and a rounded 0.67 s tail. It reads no reference samples. Hazard SOUND_LEVELS=1.5 and file volume=1 remain unchanged; effective RMS stays -22.5 dBFS, peak drops from .455 to .253. Reproduction/PCM/clipping/edge tests pass. Byte hashes prove heart-recovery.wav, stage-clear.wav and map-steps.wav are unchanged; their event code and gains were not edited for this revision.

The same localhost audition page uses a fresh hazard content hash and updated audio.js query, and labels the clip 第2案 / 0.67秒. Subjective reference resemblance and preferred loudness remain the user's listening decision. No commit/Push/main update or device build is part of this local revision.

### Normal-play page and QA click isolation

User reported the basic click obscuring audition. The product document capture click handler calls tap for generic buttons before the QA onclick runs; the QA trace was reset afterward and therefore hid that earlier sound. Fixed only ignored QA: a window-capture flag identifies buttons inside its data-se-qa panel and the QA playSound wrapper suppresses their extra tap. Actual Chrome audition showed hazard plus QA-click-suppressed=1. Product click handling and all approved gains/assets remain unchanged.

Normal-play URL: http://127.0.0.1:8794/play.html . This is the actual current index/scripts/assets with only Firebase bootstrap removed and external connections blocked, without the QA script/panel or forced stage state. Chrome was left on its normal stage map. The test origin's progress is isolated from Pages/iOS. For jagged holds (normal STAGE20 onward), the existing Web Debug stage chooser is available through Settings; no save import or progress unlocking was performed for the normal-play page.

Additional actual-input proof: on ignored input-check.html, a fixed geometry fixture placed a reachable jagged foot hold, but no movement functions were called by the fixture. A native Chrome mouse drag from the torso to 10 logical px below drove mousedown/move/up through normal canvas input. Stamina changed 10→8 and its trace contained hazard only, with no tap/contact/move. This proves the actual pointer path for the fixture, not natural STAGE20 completion or subjective sound approval. Jagged-hold timbre is still unapproved.

### Jagged-hold candidate 3 — new reference, audition only

User explicitly rejected revision 2 as quiet and unlike the reference. It is not approved. New reference: ボールをミットでキャッチ2.mp3, obtained and read through the current Library transfer flow outside the repository; 25,344 bytes, stereo MP3 48 kHz. Analysis-only PCM decode is 1.007 s, peak .701 at ~1.6 ms. The perceptual body ends around .35–.386 s; the remaining reference file is quiet padding. Unlike the old reference, its initial energy is broadband (about 31% at 1–3.5 kHz and 26% at 3.5–8 kHz in the first window), with a secondary envelope swell near 80 ms, then noisy mid/high decay and no stable pitched melody. The agent cannot directly listen to these sounds and does not assert perceptual similarity from numerical data.

New independent generator: scripts/synthesize-hazard-candidate.py. Standard-library seeded noise, original bandpass resonances, a submillisecond attack, a diffuse ~78 ms secondary pressure pulse, and a rounded 0.38 s decay. No sample/reference file is loaded or transformed. The candidate writes only ignored build/se-review/hazard-v3.wav. Game assets and mappings are NOT replaced in this audition step: the game still contains unapproved revision 2. Approved heart/clear/footstep assets remain byte-identical.

Candidate file peak .520, effective event peak .780 at existing hazard gain 1.5, full-volume master output peak .1404 at master .18. This raises transient output about 9.8 dB versus revision 2 (.253 effective, .0455 output), while active mid/high content replaces the sub-bass emphasis. Whole-file effective RMS is -21.7 dBFS, but peak, band content and active duration are used rather than RMS alone. Existing launch output peak is .108; the new reference at comparison gain1/master.18 is ~.126. These are numeric calibration observations, not a guarantee of equal perceived loudness.

Validation: deterministic regeneration is byte-identical, mono PCM16/44.1 kHz, edges/DC/peak checked. Four triggers 450 ms apart peak .1404, 12 triggers 40 ms apart peak .1885, no clipped samples. No product event or click handlers were changed for candidate 3.

Audition URL: http://127.0.0.1:8794/hazard-v3.html . This standalone page has no game scripts, generic click sound or BGM. It presents the exact new reference for comparison and the newly synthesized 第3案, one at a time; saved Effects volume is respected. Candidate uses actual game-equivalent gain .18*1.5, reference .18*1.0. Original reference is copied only into ignored local QA for this explicitly requested comparison, never product assets/Git. Audio fetches use no-store plus a new candidate hash. Chrome confirmed reference1.007s/gain.180 and candidate.380s/gain.270 playback start with no additional click source. Click-to-stop cancels all voices including queued repeat sources. Subjective similarity and approval remain pending; no commit/Push/main/deployment/device update.

### Jagged-hold candidate 4 — low initial hit, audition only

User heard candidate3 as missing the low initial hit and dominated by the later noise. Candidate4 adds a separately synthesized 210→105 Hz exponentially falling struck tone, with 2nd/3rd/4th partials and damped 290/455 Hz cavity modes, so the low impression is not dependent only on sub-bass. The noisy initial burst and mid/high tail are reduced; the secondary pressure texture is lighter and decay is shortened to 0.34 s. This changes composition rather than shifting the whole recording or merely raising volume. No reference samples are used.

Generator scripts/synthesize-hazard-candidate.py now accepts --revision 3 or 4 (default4); both reproduce byte-identically. Candidate4 writes ignored build/se-review/hazard-v4.wav. Its transient peak remains identical to candidate3: .520 file/.780 effective/.1404 at game master .18. Effective whole-file RMS is -19.9 dBFS because the low hit has more sustained body; this does not imply subjective loudness or similarity has been approved. Four isolated repeats peak .1404, twelve repeats40ms apart peak .1446, no clipping. PCM/edges and frozen hashes of the three approved sounds plus the game hazard2 asset pass. Product game assets/mappings remain unchanged.

Updated comparison URL http://127.0.0.1:8794/hazard-compare.html?revision=4 (old hazard-v3.html also displays4 to avoid an outdated page). UI and playback labels clearly say 第4案, WAV/JS cache identities changed. Chrome confirmed reference1.007s/gain.180 and candidate4 .340s/gain.270 playback-start separately with no click/BGM scripts. Direct listening remains unavailable to the agent; user listening is required. Still no commit/Push/publication/device update or game replacement.

### Adopted candidate4 into local game

User approved candidate4 timbre and requested greater presence than the ordinary limb contact. assets/audio/hazard-fix.wav is byte-identical to candidate4 (0.34s), with SOUND_FILES.hazard.volume=2 and unchanged SOUND_LEVELS.hazard=1.5. Only the file event gain changes; normal contact level8.5, other approved WAVs/gains, fallback gain, Effects slider/mute and lifecycle remain unchanged. synthesize-event-se.py delegates hazard generation to synthesize-hazard-candidate.py --revision4, without renormalizing/touching its approved timbre.

Actual Chrome OfflineAudioContext comparison used the existing contact triangle oscillator/chirp and exponential envelope plus the real decoded hazard WAV and source gain chain, Effects volume1, master.18. Contact peak .2220, RMS first10ms .04533 /20ms .03207 /50ms .02028. Adopted hazard peak .2808, RMS10ms .10769 /20ms .10580 /50ms .08689. Thus its transient peak is1.26x and first20ms RMS3.30x; this is render evidence, not proof of perceived loudness on every speaker. Repeated hazard12 at40ms spacing peaks .2892 with no clipping; approved three assets are byte-identical.

Actual native Chrome mouse drag through normal canvas input in the isolated fixed-geometry test emitted hazard once, decoded adopted WAV duration .34s, with no contact/move/tap sound. Audio files/settings/native-lifecycle and real game audio event tests pass, including independent sliders/mute, context recovery, no late replay and no doubled event. The fixed geometry is a local input fixture, not natural STAGE20 completion.

The normal game URL http://127.0.0.1:8794/play.html uses the new content hash for hazard and audio.js; Firebase is excluded, external requests blocked, diagnostic UI absent. Candidate comparison page also follows the adopted game gain (.54 after master) so its labels do not imply the older lower audition gain. Subjective play balance remains user confirmation. Still no commit/Push/main merge/public Web/device update.

### iOS bundled-file loading regression

The first device update contained all four approved WAVs, but the native status-0 fetch adapter's explicit local-path list omitted heart-recovery.wav, hazard-fix.wav and map-steps.wav. Those three downloads were rejected by prepareSoundFile and fell back to synthesized cues. This was not an asset cache diagnosis: the Capacitor-response integration test reproduced only 5 of 8 files decoding before the fix. The adapter now includes these three exact local paths, without broadening external/unknown-path handling. stage-clear.wav was already listed; this defect alone does not explain a report that its sound was unchanged.

Regression checks: node tests/ios-audio-fetch.cjs derives paths from SOUND_FILES; node tests/audio-files.cjs --native-status-zero runs the native adapter and real PCM loading/decoding/playback path together, alongside the ordinary Web test. The final package must match the generated bundle (including native lifecycle adaptations) and WAV hashes. Device installation/launch is distinct from the user's confirmation of actual sound.
