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
