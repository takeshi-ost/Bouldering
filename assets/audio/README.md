# Short event sounds

Replace these PCM WAV files with your own finished audio:

| File | Trigger |
| --- | --- |
| `stage-start.wav` | Beginning of the stage intro, before controls unlock |
| `stage-clear.wav` | Successful ascent |
| `stage-fail.wav` | Failed ascent or retirement |

The included files are audible synthesized placeholders. Recommended delivery: **WAV (.wav), linear PCM, 16-bit, 44.1 kHz, mono**. Export with minimal leading silence. Short clips of roughly 0.3–3 seconds work well; game progression does not wait for playback to end. No loop is used.

Files are fetched once and decoded into reusable Web Audio buffers after a user gesture. They share the sound setting/master volume, voice limit, mute and visibility cleanup with other effects. The game never waits for a download or decoding; a short fallback cue is played if the file is unavailable or not ready. The same event is not replayed when loading finishes. Failed downloads can retry when the connection returns.

After replacing a file, run `python scripts/version-assets.py` and commit both the file and updated JS/HTML. Content hashes refresh the browser cache automatically. Per-file gain can be adjusted in `SOUND_FILES` in `js/audio.js`.

## Background music

`bgm-loop.wav` is the approved 64-second loop of **a_curious_calibration**, PCM WAV, 16-bit, 44.1 kHz, stereo. It uses the original 40–104 second section with an 80 ms seam crossfade and 0.48 dB of headroom adjustment. The exact loop duration is 2,822,400 stereo frames.

`bgm-stage-loop-1.bin` and `bgm-stage-loop-2.bin` together form the unchanged WAV of the approved **the_measured_pendulum** loop, original 24–108 second section, 3,704,399 stereo frames (approximately 84 seconds), PCM16 at 44.1 kHz. Its seam has an 80 ms crossfade and 0.43 dB of headroom adjustment.

The stage WAV is split into two byte-identical delivery parts to fit upload limits. Both parts are joined before a single decode; there is no playback boundary between parts.

`js/bgm.js` fetches both tracks asynchronously and starts native Web Audio buffer loops only after activation. Main-screen music covers title, maps/calendar, editor and roulette; stage music covers normal/daily play and results. Each stage attempt restarts stage music at zero gain with a 5-second linear fade. Ads block both tracks until the ad cover is removed and navigation resolves, then the destination track restarts from zero with a 1-second fade, including direct ad-to-stage transitions. Same-track screen changes continue playback. Mute/background pause preserves position and fade progress. BGM voices are independent of the SE voice limit. Downloads and decoding never block game flow; reconnect retries failed downloads. Per-track gain is configured in `BACKGROUND_MUSIC`. Run `python scripts/version-assets.py` after replacements.
