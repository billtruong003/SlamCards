"""
The game's own sound effects, rendered to files for the video mix (python sfx.py -> sfx/*.wav, 48 kHz mono).
thump and the chimes are ports of proto/src/sound.js (the game makes them live with WebAudio, there are no files);
the rest are small edit sounds in the same family: a whoosh before a slam, a riser into a music change, a tap, a message pop.
"""
import os, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "sfx"); os.makedirs(OUT, exist_ok=True)
SR = 48000
rng = np.random.default_rng(7)


def write(name, sig):
    sig = np.asarray(sig, np.float32)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(sig, -1, 1) * 32767).astype(np.int16).tobytes())


def lowpass(x, hz):
    """One-pole lowpass run twice (12 dB/oct), close enough to the game's biquad for a noise burst."""
    a = np.exp(-2 * np.pi * hz / SR)
    for _ in range(2):
        y = np.empty_like(x); acc = 0.0
        for i, v in enumerate(x):
            acc = (1 - a) * v + a * acc; y[i] = acc
        x = y
    return x


def env(n, attack, decay_pow=3):
    t = np.arange(n) / n
    e = (1 - t) ** decay_pow
    a = int(attack * SR)
    if a: e[:a] *= np.linspace(0, 1, a)
    return e


# sound.js thump(): 0.18 s of white noise, (1 - i/n)^3 decay, biquad lowpass 900 Hz, gain 0.9. Rendered by the browser's
# own Web Audio (qa/capture/thump-render.mjs → sfx/game_thump_<i>.wav), so it is exactly the game's "bốp"
def read(name):
    with wave.open(os.path.join(OUT, name + ".wav")) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32767
thump = read("game_thump_5")
thump = thump[: int(SR * 0.22)]
write("thump", thump / np.max(np.abs(thump)) * 0.9)

# the hero slam: the same thump with a low body (a 70 -> 40 Hz drop) and a short crack on top
n = int(SR * 0.45)
t = np.arange(n) / SR
body = np.sin(2 * np.pi * np.cumsum(np.linspace(70, 40, n)) / SR) * np.exp(-t * 9)
crack = (rng.random(n) * 2 - 1) * np.exp(-t * 60)
big = body * 0.9 + crack * 0.35
big[: len(thump)] += thump * 1.2
write("thump_big", big / np.max(np.abs(big)) * 0.95)

# sound.js chime(): sine (triangle for 'out') notes, 12 ms attack, exponential fall
TONES = {
    "found": [(523, 0), (659, 0.09), (784, 0.18), (1047, 0.27)],
    "ready": [(880, 0), (1175, 0.07)],
    "out": [(392, 0), (330, 0.14), (262, 0.28)],
    "react": [(988, 0), (1319, 0.05)],
}
for kind, notes in TONES.items():
    out = np.zeros(int(SR * 0.8), np.float32)
    for f, at in notes:
        ln = 0.35 if kind == "found" and at > 0.2 else 0.09 if kind == "react" else 0.16
        m = int((ln + 0.02) * SR); tt = np.arange(m) / SR
        ph = 2 * np.pi * f * tt
        if kind == "out": ph = 2 * np.pi * np.cumsum(np.linspace(f, f * 0.94, m)) / SR
        wave_ = (2 / np.pi) * np.arcsin(np.sin(ph)) if kind == "out" else np.sin(ph)
        e = np.minimum(tt / 0.012, 1) * np.exp(-np.maximum(tt - 0.012, 0) / (ln / 6.9))
        s = int(at * SR); out[s:s + m] += (wave_ * e * 0.32).astype(np.float32)
    out = out[: int(SR * (max(a for _, a in notes) + 0.45))]
    write("chime_" + kind, out / np.max(np.abs(out)) * 0.7)

# whoosh: band-passed noise whose band rises then falls, 0.35 s (the slipper coming down)
n = int(SR * 0.35)
noise = rng.random(n) * 2 - 1
lo = lowpass(noise, 2400) - lowpass(noise, 500)
e = np.sin(np.linspace(0, np.pi, n)) ** 2
write("whoosh", lo * e / np.max(np.abs(lo * e)) * 0.8)

# riser: noise swelling and brightening for 1.5 s into a cut
n = int(SR * 1.5)
noise = rng.random(n) * 2 - 1
parts = [lowpass(noise, 600)]
bright = noise - lowpass(noise, 1500)
r = (parts[0] * np.linspace(1, 0.2, n) + bright * np.linspace(0, 1, n)) * np.linspace(0, 1, n) ** 2
write("riser", r / np.max(np.abs(r)) * 0.6)

# tap: a short soft click (a finger on glass)
n = int(SR * 0.04)
tap = lowpass(rng.random(n) * 2 - 1, 3000) * np.exp(-np.arange(n) / SR * 120)
write("tap", tap / np.max(np.abs(tap)) * 0.6)

# msg: a chat bubble arriving, the react chime a fifth lower and rounder
n = int(SR * 0.22); tt = np.arange(n) / SR
msg = np.zeros(n)
for f, at in ((660, 0), (990, 0.06)):
    s = int(at * SR); m = n - s
    msg[s:] += np.sin(2 * np.pi * f * tt[:m]) * np.minimum(tt[:m] / 0.008, 1) * np.exp(-tt[:m] * 22)
write("msg", msg / np.max(np.abs(msg)) * 0.6)

# card flip: a quick papery flick
n = int(SR * 0.09)
fl = (rng.random(n) * 2 - 1); fl = fl - lowpass(fl, 2500)
fl *= np.exp(-np.arange(n) / SR * 45)
write("flip", fl / np.max(np.abs(fl)) * 0.6)
print("sfx ->", OUT, sorted(os.listdir(OUT)))

# ---- for the shorts
# heartbeat: lub-dub, two low sine thumps
n = int(SR * 0.7); t = np.arange(n) / SR; hb = np.zeros(n)
for at, f, g in ((0.0, 58, 1.0), (0.17, 50, 0.75)):
    s = int(at * SR); tt = t[: n - s]
    hb[s:] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 18) * g
write("heartbeat", hb / np.max(np.abs(hb)) * 0.95)
# tick: a dry clock tick
n = int(SR * 0.05); tk = (rng.random(n) * 2 - 1) * np.exp(-np.arange(n) / SR * 260)
tk = tk - lowpass(tk, 1800)
write("tick", tk / np.max(np.abs(tk)) * 0.7)
# school bell: a struck bell (inharmonic partials), 1.6 s, rung twice
n = int(SR * 2.2); t = np.arange(n) / SR; bell = np.zeros(n)
for at in (0.0, 0.55):
    s = int(at * SR); tt = t[: n - s]
    for f, g, d in ((880, 1, 1.6), (1320 * 1.01, .5, 1.2), (2190, .35, .8), (2930, .2, .5)):
        bell[s:] += np.sin(2 * np.pi * f * tt) * g * np.exp(-tt / d * 3) * np.minimum(tt / 0.003, 1)
write("bell", bell / np.max(np.abs(bell)) * 0.6)
# sticker: a quick paper slap
n = int(SR * 0.12); st = (rng.random(n) * 2 - 1) * np.exp(-np.arange(n) / SR * 55)
st = lowpass(st, 3500) - lowpass(st, 300)
write("sticker", st / np.max(np.abs(st)) * 0.7)
print("shorts sfx ok")
