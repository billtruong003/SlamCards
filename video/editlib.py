"""
The edit model shared by the five shorts (shorts5.py) and the trailer (trailer.py): a video is a list of clips (windows
of the filmed takes) and overlays (type, stamps, cards, the end card...) drawn by edit/src/Shorts5.tsx, plus a mix
(mix5.json-style) for audio_mix.py.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
FOOT = os.path.join(HERE, "edit", "public", "footage")
EV = {}


def events(reel):
    if reel not in EV: EV[reel] = json.load(open(os.path.join(FOOT, reel + ".json"), encoding="utf-8"))
    return EV[reel]


class _Thumps(dict):
    def __missing__(self, reel):
        self[reel] = [s["t"] for s in events(reel)["sounds"] if s["kind"] == "thump"]
        return self[reel]


THUMPS = _Thumps()
# Slow motion below ~0.4x runs out of real frames (60 a second): these windows of a reel were interpolated to 240 fps
# (ffmpeg minterpolate, motion-compensated); a clip inside one is cut from it instead.
#   ffmpeg -ss 73.25 -t 0.85 -i s-main.mp4 -vf "minterpolate=fps=240:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" s-main-i1.mp4
INTERP = [("s-main", 73.25, 0.85, "s-main-i1"), ("s-main", 66.05, 0.9, "s-main-i2"), ("s-ong2", 23.95, 1.0, "s-ong2-i1")]


def interp(reel, t_in, t_last):
    """A 240 fps window around [t_in, t_last] of a reel (made once, kept next to the footage)."""
    for r, a, d, f in INTERP:
        if r == reel and a <= t_in and t_last <= a + d - 0.02: return f, t_in - a
    a = round(t_in - 0.08, 2); d = round(t_last - t_in + 0.2, 2); f = f"{reel}-i{int(a * 100)}"
    out = os.path.join(FOOT, f + ".mp4")
    if not os.path.exists(out):
        import subprocess
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-t", str(d), "-i", os.path.join(FOOT, reel + ".mp4"), "-vf",
                        "minterpolate=fps=240:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1", "-c:v", "libx264", "-crf", "14", out], check=True)
    INTERP.append((reel, a, d, f))
    return f, t_in - a


def takes(reel):
    """The posed takes of a reel: index, the slam's sound time, the outcome (cap / near / flip / off) and how far it went."""
    ev = events(reel); th = THUMPS[reel]; out = {}
    for m in ev["marks"]:
        out.setdefault(m["take"], {})[m["label"]] = m
    res = []
    for i, t in sorted(out.items()):
        hit = next((x for x in th if t["take"]["t"] - 0.1 < x < t["take"]["t"] + 2), None)
        if hit is not None and "result" in t: res.append(dict(i=i, thump=hit, kind=t["result"]["kind"], dist=t["result"]["dist"]))
    return res


def mark(reel, label, n=0):
    return [m["t"] for m in events(reel)["marks"] if m["label"] == label][n]


def thump_after(reel, t):
    return min(x for x in THUMPS[reel] if x > t)


END = 78  # the end card, 2.6 s
SYNC = 0.02  # the picture of a hit trails the logged sound by ~1 frame at 60 fps (slowed capture): the hit sounds follow the picture


class Short:
    def __init__(self, id, W=1080, H=1920, lang="vi"):
        self.v = dict(id=id, W=W, H=H, fps=FPS, clips=[], over=[], lang=lang)
        self.sfx = []; self.music = []; self.f = 0

    def clip(self, reel, t_in, t_out=None, rate=1.0, frames=None, z=(1.0, 1.0), c=(0.5, 0.5), slam=True, big=False, name="", **fx):
        n = frames if frames is not None else round((t_out - t_in) / rate * FPS)
        src, t_src = reel, t_in
        t_last = t_in + n / FPS * rate
        if 0.05 < rate <= 0.6: src, t_src = interp(reel, t_in, t_last)  # slow motion past the real frames: interpolated
        cl = dict(src=f"footage/{src}.mp4", from_=self.f, dur=n, t_in=t_src, rate=rate, z=list(z), c=list(c), name=name, **fx)
        if src != reel: cl["t_reel"] = t_in
        self.v["clips"].append(cl)
        if slam:
            t_end = t_in + n / FPS * rate
            for t in THUMPS[reel]:
                if t_in - 0.02 <= t < t_end:
                    at = self.f + round((t + SYNC - t_in) / rate * FPS)
                    self.sfx += [(at - max(4, round(5 / rate * 0.6)), "whoosh", -11), (at, "thump_big" if big else "thump", 2 if big else 2)]
        self.f += n
        return cl

    def hold(self, reel, t, frames, **kw):
        return self.clip(reel, t, rate=0.001, frames=frames, slam=False, **kw)

    def at(self, cl, t):
        return cl["from_"] + round((t - cl.get("t_reel", cl["t_in"])) / cl["rate"] * FPS)

    def over(self, kind, f0, f1, **kw):
        self.v["over"].append(dict(kind=kind, from_=f0, dur=f1 - f0, **kw))

    def chunk(self, f0, f1, t, x, y, size, rot, delay=0):
        self.over("chunk", f0, f1, t=t, x=x, y=y, size=size, rot=rot, delay=delay)

    def stamp(self, f0, f1, t, y, size, rot, color="#FFC93C", x=None):
        self.over("stamp", f0, f1, t=t, x=x, y=y, size=size, rot=rot, color=color)

    def end(self, line):
        f0 = self.f; self.f += END
        self.over("end", f0, self.f, line=line)
        self.sfx += [(f0, "thump_big", -2), (f0 + 26, "chime_found", -9)]
        return f0

    def done(self):
        for m in self.music:
            if m["end"] is None: m["end"] = self.f
        self.v["frames"] = self.f
        mix = dict(id=self.v["id"], frames=self.f, lufs=-15, ceiling=-1.6, music=self.music, shots=[dict(id="all", start=0, end=self.f, sfx=[
            dict(id=i, at=max(0, a), gain=g) for a, i, g in sorted(self.sfx)])])
        return self.v, mix


GAME = dict(id="music:game-loop", seek=0.251)
MENU = dict(id="music:menu-loop", seek=0.230)
