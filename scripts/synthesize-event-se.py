#!/usr/bin/env python3
"""Original deterministic event synthesis; reads NO reference/sample files.

Run with Python 3 (stdlib only). Output: 44.1 kHz mono PCM16 WAV.
Reference analysis informs descriptions, never signal data or transformed samples.
"""
from pathlib import Path
import array
import math
import random
import wave

SR = 44100
TAU = 2 * math.pi
OUT = Path(__file__).resolve().parents[1] / 'assets/audio'


def buffer(seconds):
    return [0.0] * round(seconds * SR)


def bell(x, at, frequency, duration, amplitude, decay=6):
    for i in range(round(duration * SR)):
        j = round(at * SR) + i
        if j >= len(x):
            break
        t = i / SR
        envelope = (1 - math.exp(-t / .003)) * math.exp(-decay * t / duration)
        # Independently synthesized partials, with a softer inharmonic sparkle.
        value = math.sin(TAU * frequency * t) + .23 * math.sin(TAU * frequency * 2.007 * t) + .08 * math.sin(TAU * frequency * 3.91 * t)
        x[j] += amplitude * envelope * value


def recovery():
    x = buffer(1.00)
    # Two interlaced, rising chirps; staggered bright grains and a soft new tail.
    for offset, gain in [(0, .34), (.074, .20), (.151, .11)]:
        for i in range(round(.70 * SR)):
            t = i / SR
            phase = TAU * (1740 * t + 1680 * t * t)
            env = min(1, t / .012) * math.exp(-4.5 * t) * (1 - t / .70)
            j = i + round(offset * SR)
            x[j] += gain * env * (math.sin(phase) + .18 * math.sin(phase * 2.013))
    for at, hz in [(0.04, 2349), (.17, 2794), (.31, 3520), (.47, 4186), (.62, 4699)]:
        bell(x, at, hz, .44, .13)
    return x


def clear():
    x = buffer(1.03)
    # Original rising cadence and timing, rather than a transformed button sample.
    for at, hz, amp in [(0, 1046.50, .28), (.095, 1567.98, .25), (.225, 2349.32, .23), (.365, 2093.00, .32)]:
        bell(x, at, hz, .64, amp, 5)
    bell(x, .365, 2637.02, .63, .09, 5)
    return x


def map_steps():
    x = buffer(.65)  # MAP_HOP_DURATION; never loops or outlives the hop.
    rng = random.Random(20261025)
    for at, amp, hz in [(0, .94, 96), (.16, .80, 113), (.325, .88, 101), (.49, .64, 119)]:
        soft = 0
        for i in range(round(.145 * SR)):
            t = i / SR
            j = round(at * SR) + i
            soft += .18 * (rng.uniform(-1, 1) - soft)
            attack = min(1, t / .002)
            x[j] += amp * attack * (.40 * math.sin(TAU * (hz * t - 60 * t * t)) * math.exp(-48 * t) + soft * .30 * math.exp(-55 * t))
    return x


def save(name, x, target_rms, effective_level):
    rms = math.sqrt(sum(v * v for v in x) / len(x))
    gain = min(target_rms / rms, (.60 / effective_level) / max(map(abs, x)))
    for i in range(len(x)):
        fade = min(1, i / (SR * .0015), (len(x) - 1 - i) / (SR * .008))
        x[i] *= gain * max(0, fade)
    pcm = array.array('h', (round(v * 32767) for v in x))
    if __import__('sys').byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(OUT / name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    peak = max(map(abs, x)) * effective_level
    loud = math.sqrt(sum(v * v for v in x) / len(x)) * effective_level
    print(f'{name}: {len(x)/SR:.3f}s, effective peak={peak:.3f}, RMS={20*math.log10(loud):.1f}dBFS, master gain excluded')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=OUT)
    OUT = parser.parse_args().output
    OUT.mkdir(parents=True, exist_ok=True)
    save('heart-recovery.wav', recovery(), .085 / 1.5, 1.5)
    import subprocess
    import sys
    subprocess.run([sys.executable, str(Path(__file__).with_name('synthesize-hazard-candidate.py')), '--revision', '4', '--output', str(OUT / 'hazard-fix.wav')], check=True)
    save('stage-clear.wav', clear(), .090 / 1.15, 1.15)
    save('map-steps.wav', map_steps(), .070, 1)
