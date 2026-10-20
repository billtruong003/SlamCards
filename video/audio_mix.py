"""
Renders each video's soundtrack from timeline.json, frame-accurate (Spotify pedalboard for the mix).
Copied from Casual Game/Design/DuckDrip_Motion/audio_mix.py; here the clips are the game's music loops (music:<name> ->
proto/public/audio/<name>.mp3, started `seek` seconds in so a kick lands on the music's start frame), its meme stingers
(meme:<name> -> proto/public/memes/<name>.mp3) and its synthesized effects rendered by sfx.py (<name> -> sfx/<name>.wav).
python audio_mix.py   -> out/<video>_soundtrack.wav (48 kHz) + out/<video>_soundtrack.png (the cues over the shots)

Music tracks with fades and their own ducks, beds (room tone, the duck's water) between frames, every SFX at its frame
with its gain and pitch, the music ducked under the SFX (sidechain-style, smoothed), then a master chain (gentle
compressor, small room reverb, limiter at -1 dBFS, -14 LUFS-ish for social video).
Change a frame in timeline.json, run this again: the sound follows the picture.
"""
import json, os, subprocess, wave
import numpy as np
from pedalboard import Pedalboard, Compressor, Reverb, Limiter, HighpassFilter, LowpassFilter, PitchShift
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(os.path.dirname(HERE), "proto", "public")
SR = 48000
OUT = os.path.join(HERE, "out", "build"); os.makedirs(OUT, exist_ok=True)
FONT = ImageFont.truetype(os.path.join(HERE, "fonts", "Baloo2-Bold.ttf"), 16)
_cache = {}


def path_of(cid):
    kind, _, name = cid.rpartition(":")
    if kind == "music": return os.path.join(PUB, "audio", name + ".mp3")
    if kind == "meme": return os.path.join(PUB, "memes", name + ".mp3")
    return os.path.join(HERE, "sfx", name + ".wav")


def clip(cid):
    if cid not in _cache:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path_of(cid), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
        _cache[cid] = np.frombuffer(raw, np.float32).astype(np.float32)
    return _cache[cid]


def db(g): return 10 ** (g / 20)


def place(track, sig, start):
    if start >= len(track): return
    n = min(len(sig), len(track) - start)
    track[start:start + n] += sig[:n]


def looped(sig, n):
    return np.tile(sig, int(np.ceil(n / max(1, len(sig)))))[:n] if len(sig) else np.zeros(n, np.float32)


def render(video, fps):
    F = lambda f: int(round(f / fps * SR))
    N = F(video["frames"])
    music = np.zeros(N, np.float32); beds = np.zeros(N, np.float32); sfx = np.zeros(N, np.float32)
    for m in video.get("music", []):
        a, b = F(m["start"]), F(m["end"])
        src = clip(m["id"]); sk = int(m.get("seek", 0) * SR)
        sig = looped(np.concatenate([src[sk:], src[:sk]]), b - a) * db(m["gain"])
        e = np.ones(b - a, np.float32)
        fi, fo = F(m.get("fade_in", 0)), F(m.get("fade_out", 0))
        if fi: e[:fi] = np.linspace(0, 1, fi)
        if fo: e[-fo:] *= np.linspace(1, 0, fo)
        for d0, d1, g in m.get("duck_at", []):  # an authored dip (a silence before a hit)
            s0, s1 = max(0, F(d0) - a), min(b - a, F(d1) - a)
            ramp = min(F(4), max(1, (s1 - s0) // 4))
            dip = np.ones(b - a, np.float32); dip[s0:s1] = db(g)
            dip[s0:s0 + ramp] = np.linspace(1, db(g), ramp); dip[s1 - ramp:s1] = np.linspace(db(g), 1, ramp)
            e *= dip
        music[a:b] += sig * e
    for bd in video.get("beds", []):
        a, b = F(bd["start"]), F(bd["end"])
        e = np.ones(b - a, np.float32); r = min(F(10), (b - a) // 3)
        e[:r] = np.linspace(0, 1, r); e[-r:] = np.linspace(1, 0, r)
        beds[a:b] += looped(clip(bd["id"]), b - a) * db(bd["gain"]) * e
    for shot in video["shots"]:
        for c in shot.get("sfx", []):
            sig = clip(c["id"])
            if c.get("pitch", 1.0) != 1.0:
                sig = Pedalboard([PitchShift(semitones=12 * np.log2(c["pitch"]))])(sig[None, :], SR)[0]
            place(sfx, sig * db(c.get("gain", 0)), F(c["at"]))
    # music ducks under the SFX: an envelope follower on the SFX, 6 dB at most, smooth attack/release
    env = np.abs(sfx)
    k = int(0.08 * SR); env = np.convolve(env, np.ones(k) / k, mode="same")
    duck = 1 - np.clip(env / (env.max() or 1) * 1.6, 0, 1) * (1 - db(-6))
    # and clears the way for every slam: 10 dB down from 20 ms before the hit, back over 0.25 s (the "bốp" must crack)
    for shot in video["shots"]:
        for c in shot.get("sfx", []):
            if not c["id"].startswith("thump"): continue
            a = max(0, F(c["at"]) - int(0.02 * SR)); n = min(N - a, int(0.27 * SR))
            if n <= 0: continue
            dip = 1 - (1 - db(-10)) * np.clip(np.linspace(1.6, 0, n), 0, 1)
            duck[a:a + n] = np.minimum(duck[a:a + n], dip)
    mix = music * duck + beds + sfx
    mix = Pedalboard([HighpassFilter(cutoff_frequency_hz=40), LowpassFilter(cutoff_frequency_hz=16000), Compressor(threshold_db=-16, ratio=2.5, attack_ms=10, release_ms=150),
                      Reverb(room_size=0.18, wet_level=0.08, dry_level=1.0), Limiter(threshold_db=-1.0)])(mix[None, :], SR)[0]
    # to -14 LUFS (social video) with true peaks under -1 dBFS: measure, set the gain, limit the hits, measure again
    import re
    def loudness(sig):
        tmp = os.path.join(OUT, "_m.wav"); write(tmp, sig)
        r = subprocess.run(["ffmpeg", "-nostats", "-i", tmp, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, errors="ignore").stderr
        os.remove(tmp)
        return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]), float(re.findall(r"Peak:\s+(-?[\d.inf]+) dBFS", r)[-1])
    mix = mix / (np.max(np.abs(mix)) or 1) * 0.25
    target, ceiling = video.get("lufs", -14), video.get("ceiling", -2.6)  # the shorts: -15 LUFS, a higher ceiling, so the slams keep their crack
    for _ in range(7):
        lufs, peak = loudness(mix)
        if abs(lufs - target) < 0.3 and peak <= -1.0: break
        mix = limit(mix * db(target - lufs), db(ceiling))
    if peak > -1.0:  # inter-sample overs left (clipped meme sources): the peak wins over the last few tenths of loudness
        mix = mix * db(-1.0 - peak - 0.2); lufs, peak = loudness(mix)
    print(f"  {video['id']}: {lufs:.1f} LUFS, true peak {peak:.1f} dBFS")
    path = os.path.join(OUT, f"{video['id']}_soundtrack.wav"); write(path, mix)
    picture(video, fps, music * duck, beds, sfx, mix, N)
    return path, len(mix) / SR


def limit(x, ceiling, look_ms=3, release_ms=90):
    """A brickwall limiter that only turns down: the gain each sample needs, held over a short lookahead, released
    smoothly (pedalboard's Limiter adds make-up gain, which fights the loudness target)."""
    need = np.minimum(1.0, ceiling / np.maximum(np.abs(x), 1e-9))
    w = max(1, int(look_ms / 1000 * SR))
    held = np.lib.stride_tricks.sliding_window_view(np.concatenate([need, np.ones(w - 1)]), w).min(axis=1)
    a = np.exp(-1 / (release_ms / 1000 * SR)); g = np.empty_like(held); cur = 1.0
    for i, v in enumerate(held):
        cur = v if v < cur else v + (cur - v) * a
        g[i] = cur
    return (x * g).astype(np.float32)


def write(path, sig):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(sig, -1, 1) * 32767).astype(np.int16).tobytes())


def picture(video, fps, music, beds, sfx, mix, N):
    W, H = 1600, 430
    im = Image.new("RGB", (W, H), (246, 241, 232)); d = ImageDraw.Draw(im)
    X = lambda s: 70 + s / N * (W - 90)
    for i, shot in enumerate(video["shots"]):
        a, b = shot["start"] / fps * SR, shot["end"] / fps * SR
        d.rectangle([X(a), 26, X(b), H - 30], fill=(214, 236, 247) if i % 2 == 0 else (196, 226, 243))
        d.text((X(a) + 4, 28), shot["id"], font=FONT, fill=(43, 34, 32))
        for c in shot.get("sfx", []):
            x = X(c["at"] / fps * SR); d.line([(x, 300), (x, 318)], fill=(200, 70, 70), width=2)
    def row(sig, y, h, col, label):
        step = max(1, len(sig) // (W - 90)); pk = np.abs(sig[: (len(sig) // step) * step]).reshape(-1, step).max(1); pk = pk / (pk.max() or 1)
        for i, v in enumerate(pk): d.line([(70 + i, y - v * h), (70 + i, y + v * h)], fill=col)
        d.text((6, y - 9), label, font=FONT, fill=(43, 34, 32))
    row(music, 90, 30, (40, 110, 190), "music"); row(beds, 160, 22, (60, 140, 90), "beds"); row(sfx, 230, 34, (220, 140, 30), "sfx")
    d.text((6, 300), "cues", font=FONT, fill=(200, 70, 70)); row(mix, 375, 30, (43, 34, 32), "MIX")
    for s in range(0, int(N / SR) + 1, 2 if N / SR < 40 else 5):
        d.text((X(s * SR) - 6, H - 26), f"{s}s", font=FONT, fill=(120, 100, 90))
    im.save(os.path.join(OUT, f"{video['id']}_soundtrack.png"))


if __name__ == "__main__":
    import sys
    # python audio_mix.py [mix.json]: the cut of the filmed footage (cut.py); timeline.json is the old still-frame mockup
    tl = json.load(open(os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else "timeline.json"), encoding="utf-8"))
    for v in tl["videos"]:
        p, s = render(v, tl["fps"])
        print(f"{v['id']}: {s:.2f}s -> {p}")
