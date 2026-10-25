#!/usr/bin/env python3
"""Hazard candidates 3/4: original sample-free catch/impact synthesis.

No reference file is loaded. Writes an ignored audition WAV, not a game asset.
Python standard library only. Reference observation: broadband initial impact,
secondary swell near 80ms, noisy mid/high body, short decay; no stable melody.
"""
from pathlib import Path
import argparse
import array
import math
import random
import wave

SR = 44100


def bandpass(samples, hz, q):
    w = 2 * math.pi * hz / SR
    alpha = math.sin(w) / (2 * q)
    b0, b1, b2 = alpha / (1 + alpha), 0, -alpha / (1 + alpha)
    a1, a2 = -2 * math.cos(w) / (1 + alpha), (1 - alpha) / (1 + alpha)
    x1 = x2 = y1 = y2 = 0
    result = []
    for x in samples:
        y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, x, y1, y
        result.append(y)
    return result


def synthesize_v3():
    rng = random.Random(2026102503)
    count = round(.38 * SR)
    noise = [rng.uniform(-1, 1) for _ in range(count)]
    bands = [bandpass(noise, hz, q) for hz, q in [(720, .7), (1700, .8), (3100, 1.1), (4600, .9), (8200, .7)]]
    signal = []
    for i in range(count):
        t = i / SR
        attack = min(1, t / .00035)
        # A broadband slap, followed by a diffuse second pressure pulse.
        initial = noise[i] * .58 * math.exp(-t / .0035)
        swell = .72 * math.exp(-t / .087) + .53 * math.exp(-((t - .078) / .018) ** 2)
        body = sum(bands[j][i] * gain for j, gain in enumerate([.24, .48, .65, .43, .12]))
        low = .035 * math.sin(2 * math.pi * (155 * t - 75 * t * t)) * math.exp(-t / .045)
        # Rounded cutoff after the ~350ms perceptual tail, no padded silence.
        fade = min(1, max(0, (.38 - t) / .035))
        signal.append(attack * fade * (initial + body * swell + low))
    # Calibrate transient peak in the ACTUAL game path: file*1.5*.18.
    # Effective pre-master peak .78 yields .1404 at full Effects volume.
    scale = (.78 / 1.5) / max(map(abs, signal))
    return [v * scale for v in signal]


def synthesize_v4():
    # User feedback: a clearly pitched LOW initial hit, not a noise-led tail.
    # Fundamental bends 210->105Hz; upper partials retain its identity on small
    # speakers. Noise is a restrained texture, not the main onset/body.
    rng = random.Random(2026102504)
    count = round(.34 * SR)
    noise = [rng.uniform(-1, 1) for _ in range(count)]
    bands = [bandpass(noise, hz, q) for hz, q in [(850, .7), (1800, .8), (3200, 1.0), (4600, .9)]]
    signal = []
    for i in range(count):
        t = i / SR
        attack = min(1, t / .0008)
        phase = 2 * math.pi * (105 * t + 105 * .012 * (1 - math.exp(-t / .012)))
        hit = .90 * math.sin(phase) * math.exp(-t / .055)
        for harmonic, gain, decay in [(2, .56, .043), (3, .28, .034), (4, .13, .026)]:
            hit += gain * math.sin(harmonic * phase) * math.exp(-t / decay)
        cavity = (.18 * math.sin(2 * math.pi * 290 * t) + .11 * math.sin(2 * math.pi * 455 * t)) * math.exp(-t / .060)
        initial = noise[i] * .12 * math.exp(-t / .0025)
        texture = sum(bands[j][i] * gain for j, gain in enumerate([.18, .24, .26, .12]))
        tail = texture * (.36 * math.exp(-t / .065) + .13 * math.exp(-((t - .072) / .015) ** 2))
        fade = min(1, max(0, (.34 - t) / .035))
        signal.append(attack * fade * (hit + cavity + initial + tail))
    # Keep the same transient peak as v3; improve low-hit composition, not gain.
    scale = (.78 / 1.5) / max(map(abs, signal))
    return [v * scale for v in signal]


def write(destination, revision):
    signal = synthesize_v4() if revision == 4 else synthesize_v3()
    pcm = array.array('h', (round(v * 32767) for v in signal))
    if __import__('sys').byteorder != 'little':
        pcm.byteswap()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(destination), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    peak = max(map(abs, signal))
    rms = math.sqrt(sum(v * v for v in signal) / len(signal))
    print(f'candidate{revision}: {len(signal)/SR:.3f}s; file peak {peak:.3f}; effective peak {peak*1.5:.3f}; actual full-volume output peak {peak*1.5*.18:.4f}; effective RMS {20*math.log10(rms*1.5):.1f}dBFS')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--revision', type=int, choices=[3, 4], default=4)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    destination = args.output or Path(__file__).resolve().parents[1] / f'build/se-review/hazard-v{args.revision}.wav'
    write(destination, args.revision)
