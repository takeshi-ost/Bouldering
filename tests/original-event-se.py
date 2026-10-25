"""Validate deterministic originals, delivery format, gain/edges and hop length."""
from pathlib import Path
import hashlib
import math
import re
import struct
import subprocess
import sys
import tempfile
import wave

root = Path(__file__).resolve().parents[1]
levels = {'heart-recovery.wav': 1.5, 'hazard-fix.wav': 3, 'stage-clear.wav': 1.15, 'map-steps.wav': 1}
effective_peaks = []
with tempfile.TemporaryDirectory(prefix='ascent-original-se-') as temp:
    subprocess.run([sys.executable, str(root / 'scripts/synthesize-event-se.py'), '--output', temp], check=True)
    for name, level in levels.items():
        p = root / 'assets/audio' / name
        assert hashlib.sha256(p.read_bytes()).digest() == hashlib.sha256((Path(temp) / name).read_bytes()).digest(), name
        with wave.open(str(p), 'rb') as w:
            assert (w.getnchannels(), w.getsampwidth(), w.getframerate()) == (1, 2, 44100)
            count = w.getnframes()
            x = [v / 32768 for v in struct.unpack('<' + 'h' * count, w.readframes(count))]
        peak = max(map(abs, x)) * level
        effective_peaks.append(peak)
        rms = math.sqrt(sum(v * v for v in x) / len(x)) * level
        if name == 'hazard-fix.wav':
            assert .20 < peak * .18 < .30 and -16 < 20 * math.log10(rms) < -12, name
        else:
            assert .30 < peak <= .61 and -25 < 20 * math.log10(rms) < -20, name
        assert abs(x[0]) < .0001 and abs(x[-1]) < .0001, name
        active = [i for i, v in enumerate(x) if abs(v) > .001]
        assert active[0] / 44100 < .01 and (count - active[-1]) / 44100 < .06, name
        if name == 'map-steps.wav':
            hop_ms = int(re.search(r'const MAP_HOP_DURATION = (\d+);', (root / 'js/level-map.js').read_text()).group(1))
            assert count == round(hop_ms / 1000 * 44100)
        # Each is a one-shot source; four simultaneous new cues retain headroom
        # through the existing .18 master (not a proof for all legacy/BGM mixes).
    assert sum(effective_peaks) * .18 < .6
print('PASS original SE: sample-free deterministic regeneration, PCM delivery, calibrated peaks/RMS, short edges, 650ms hop and four-cue headroom')
