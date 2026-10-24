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

`js/bgm.js` fetches the file at boot and starts a single native Web Audio buffer loop after the first permitted user gesture. Screen transitions never restart it. Music has its own voice, outside the SE voice limit, and uses the shared sound toggle/master. Mute, blur and backgrounding retain its position for resumption. Download/decode never blocks the game; failed downloads retry on reconnect. No BGM fallback sound is played. Update `BACKGROUND_MUSIC.volume` to balance music against SE. Run `python scripts/version-assets.py` after replacing the file.
