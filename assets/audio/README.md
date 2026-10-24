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

| Delivery file | Music | Loop duration | File size |
| --- | --- | --- | --- |
| `bgm-loop.mp3` | a_curious_calibration (original 40–104 s) | 64 s / 2,822,400 source frames | 1,321,318 bytes |
| `bgm-stage-loop.mp3` | the_measured_pendulum (original 24–108 s) | 3,704,399 / 44,100 s | 1,721,514 bytes |

Both are 160 kbps CBR MP3, 44.1 kHz, stereo, encoded with libmp3lame and a Xing/LAME gapless header. The approved loop WAV masters remain the source of truth outside the repository. The uncompressed delivery assets were removed to reduce deployment size.

Before encoding, prepend the last one second of the loop and append the first one second (no fade to silence). `BACKGROUND_MUSIC.loopStart` is 1 second and `loopSeconds` retains the exact original sample duration. Playback starts at `loopStart + savedOffset`; the native buffer loop ends at `loopStart + loopSeconds`. Encoder lead/tail padding stays outside this cyclic region, including decoders retaining a short encoder delay. The one-second guards are not extra musical content. Fade and saved playback positions are measured relative to the loop, not the file. Do not replace a guarded asset with an ordinary MP3 without updating the loop range.

Encoding: `ffmpeg -i guarded.wav -c:a libmp3lame -b:a 160k -write_xing 1 -map_metadata -1 output.mp3`. Validate decoded length, seam continuity, and peak level before publishing. The original approved 80 ms seam smoothing is retained in the audio, not applied again at runtime.

`js/bgm.js` fetches both tracks asynchronously and starts native Web Audio buffer loops only after activation. Main-screen music covers title, maps/calendar, editor and roulette; stage music covers normal/daily play and results. Each stage attempt restarts stage music at zero gain with a 5-second linear fade. Ads block both tracks until the ad cover is removed and navigation resolves, then the destination track restarts from zero with a 1-second fade, including direct ad-to-stage transitions. Same-track screen changes continue playback. Mute/background pause preserves position and fade progress. BGM voices are independent of the SE voice limit. Downloads and decoding never block game flow; reconnect retries failed downloads. Per-track gain is configured in `BACKGROUND_MUSIC`. Run `python scripts/version-assets.py` after replacements.
