"""
The three shorts (python shorts.py -> edit/src/shorts.json + mixshorts.json; then audio_mix.py mixshorts.json, Remotion).

All three are cut from one portrait take reel (qa/capture/shorts.mjs: a low film camera, Bill's card at the back, Tèo's in
front, the mouse's aim ring, posed local slams; 48 takes, each logged as cap / near / flip). Style: "vở học trò"
(school notebook): paper labels with tape, ink stamps, ruled pages for the nostalgia bookends.

  STRESS      3 near misses that get worse, a heartbeat that speeds up, then the 4th lands in slow motion. Loops.
  CLIFF       the deciding slam, slowed until it freezes mid-flip; "ăn hình hay úp lại?" — part 2 tomorrow.
  NOSTALGIA   a notebook page from break time; the paper slipper falls and match-cuts into the game's slam.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
EV = json.load(open(os.path.join(HERE, "edit", "public", "footage", "s-takes.json"), encoding="utf-8"))
THUMPS = [s["t"] for s in EV["sounds"] if s["kind"] == "thump"]
SRC = "footage/s-takes.mp4"


class Short:
    def __init__(self, id):
        self.v = dict(id=id, W=1080, H=1920, fps=FPS, clips=[], pages=[], over=[])
        self.sfx = []; self.music = []; self.f = 0

    def clip(self, t_in, t_out=None, rate=1.0, frames=None, z=(1.0, 1.0), c=(0.5, 0.5), slam=True, big=False, name=""):
        n = frames if frames is not None else round((t_out - t_in) / rate * FPS)
        cl = dict(src=SRC, from_=self.f, dur=n, t_in=t_in, rate=rate, z=list(z), c=list(c), name=name)
        self.v["clips"].append(cl)
        if slam:
            t_end = t_in + n / FPS * rate
            for t in THUMPS:
                if t_in - 0.02 <= t < t_end:
                    at = self.f + round((t - t_in) / rate * FPS)
                    self.sfx += [(at - max(4, round(5 / rate * 0.6)), "whoosh", -6), (at, "thump_big" if big else "thump", 0 if big else -1)]
        self.f += n
        return cl

    def hold(self, t, frames, **kw):
        return self.clip(t, rate=0.001, frames=frames, slam=False, **kw)

    def at(self, cl, t):
        return cl["from_"] + round((t - cl["t_in"]) / cl["rate"] * FPS)

    def over(self, kind, f0, f1, **kw):
        self.v["over"].append(dict(kind=kind, from_=f0, dur=f1 - f0, **kw))

    def page(self, kind, frames, **kw):
        self.v["pages"].append(dict(kind=kind, from_=self.f, dur=frames, **kw)); self.f += frames

    def done(self):
        for m in self.music:
            if m["end"] is None: m["end"] = self.f
        self.v["frames"] = self.f
        mix = dict(id=self.v["id"], frames=self.f, music=self.music, shots=[dict(id="all", start=0, end=self.f, sfx=[
            dict(id=i, at=max(0, a), gain=g) for a, i, g in sorted(self.sfx)])])
        return self.v, mix


GAME = dict(id="music:game-loop", seek=0.251)
MENU = dict(id="music:menu-loop", seek=0.230)

# ============================================================ STRESS · ức chế giữ chân
A = Short("STRESS")
A.music.append(dict(**GAME, start=0, end=None, gain=-12, fade_in=2, fade_out=20, duck_at=[]))
tries = [  # (take: t_in, t_out, verdict stamp, meme)
    (28.95, 30.75, "XÍU NỮA!", "meme:pass-huh"),
    (9.12, 11.0, "ỨC GHÊ!", "meme:fall-bruh"),
    (64.66, 66.45, "ÚP LẠI?!", "meme:fall-oidoioi"),
]
beats = []
for i, (a, b, stamp, meme) in enumerate(tries):
    cl = A.clip(a, b, name=f"Lần {i + 1}")
    h = A.hold(b, 16 if i < 2 else 20, name=f"Lần {i + 1} · {stamp}")
    A.over("tally", cl["from_"], h["from_"] + h["dur"], n=i + 1)
    A.over("stamp", h["from_"], h["from_"] + h["dur"], t=stamp, y=0.24, size=190, tilt=-6 + i * 5, color="pink")
    A.over("vignette", h["from_"], h["from_"] + h["dur"], strength=0.22 + i * 0.1)
    A.sfx.append((h["from_"], meme, -10))
    beats.append(h)
A.over("label", 0, 40, t="Ăn 1 lá thôi mà…", y=0.09)
# the heartbeat comes in on the second try and speeds up
hb_from = A.v["clips"][2]["from_"]
step = 26
f = hb_from
while f < A.f:
    A.sfx.append((f, "heartbeat", -4)); A.over("pulse", f, f + 8); f += step; step = max(14, step - 2)
# the 4th: music drops out, the flight in slow motion, the landing hits
A.music[0]["duck_at"].append([A.f - 4, A.f + 140, -40])
c1 = A.clip(41.33, 41.70, name="Lần 4 · dích")
c2 = A.clip(41.70, 42.27, rate=0.3, big=True, name="Lần 4 · quay chậm")
for f in range(c2["from_"], c2["from_"] + c2["dur"], 20): A.sfx.append((f, "heartbeat", -3)); A.over("pulse", f, f + 8)
A.over("tally", c1["from_"], c2["from_"] + c2["dur"], n=4)
A.over("vignette", c1["from_"], c2["from_"] + c2["dur"], strength=0.32)
land = A.f
c3 = A.clip(42.27, 42.9, name="Lần 4 · đáp")
h4 = A.hold(42.9, 40, name="ĂN HÌNH!")
A.over("flash", land, land + 5); A.over("shake", land, land + 8, amp=20)
A.over("stamp", land, A.f, t="ĂN HÌNH!", y=0.24, size=200, tilt=-5, color="yellow")
A.over("tape", land + 14, A.f, t="Dép Lào Tuổi Thơ · chơi trên web", y=0.9)
A.sfx += [(land, "thump_big", 0), (land + 2, "meme:capture-boom", -8), (land, "chime_found", -6)]
A.music.append(dict(**GAME, start=land, end=None, gain=-9, fade_in=1, fade_out=14, duck_at=[]))
A.music[0]["end"] = land; A.music[0]["fade_out"] = 2
stress, stress_mix = A.done()

# ============================================================ CLIFF · cliffhanger
B = Short("CLIFF")
B.music.append(dict(**GAME, start=0, end=None, gain=-13, fade_in=2, fade_out=10, duck_at=[]))
c0 = B.clip(11.70, 12.20, name="Bàn: lượt cuối")
c1 = B.clip(12.20, 13.44, rate=0.72, z=(1.0, 1.06), c=(0.5, 0.45), name="Ngắm chậm")
B.over("label", 0, c1["from_"] + c1["dur"], t="Ván quyết định · 1 – 1", y=0.09)
B.over("tally", 0, c1["from_"] + c1["dur"], n=0, score=True)
for f in range(0, c1["from_"] + c1["dur"], 14): B.sfx.append((f, "tick", -6))
B.over("count", c1["from_"] + c1["dur"] - 45, c1["from_"] + c1["dur"], t=["3", "2", "1"])
c2 = B.clip(13.44, 13.78, z=(1.06, 1.08), c=(0.5, 0.45), big=True, name="Dích")
c3 = B.clip(13.78, 13.92, rate=0.15, z=(1.08, 1.16), c=(0.5, 0.42), name="Quay chậm dần")
B.music[0]["duck_at"].append([c3["from_"], B.f + 400, -40])
freeze = B.hold(13.92, 105, z=(1.16, 1.2), c=(0.5, 0.42), name="Đóng băng")
B.over("dim", freeze["from_"], B.f, strength=0.45)
B.over("pause", freeze["from_"] + 6, freeze["from_"] + 40)
B.over("question", freeze["from_"] + 10, B.f, a="ĂN HÌNH", b="hay ÚP LẠI?")
for f in range(freeze["from_"], B.f, 18): B.sfx.append((f, "heartbeat", -3)); B.over("pulse", f, f + 8)
end = B.hold(13.92, 75, z=(1.2, 1.22), c=(0.5, 0.42), name="Đoán đi")
B.over("dim", end["from_"], B.f, strength=0.6)
B.over("stamp", end["from_"], B.f, t="ĐOÁN ĐI 👇", y=0.42, size=150, tilt=-4, color="yellow")
B.over("label", end["from_"] + 8, B.f, t="Phần 2 mai đăng", y=0.58)
B.over("tape", end["from_"] + 14, B.f, t="Dép Lào Tuổi Thơ · chơi trên web", y=0.9)
B.sfx += [(end["from_"], "sticker", -3), (end["from_"] + 8, "msg", -6)]
cliff, cliff_mix = B.done()

# ============================================================ NOSTALGIA · hoài niệm
C = Short("NOSTALGIA")
C.music.append(dict(**MENU, start=0, end=None, gain=-11, fade_in=10, fade_out=40, duck_at=[]))
C.page("intro", 112)          # 0–3.7s: the notebook page, the question, the bell
C.sfx += [(2, "bell", -7), (30, "sticker", -6), (44, "sticker", -6)]
drop = C.f
C.page("drop", 26)            # the paper slipper falls onto the taped cards
C.sfx += [(drop + 6, "whoosh", -4)]
mc = C.f
f1 = C.clip(88.43, 88.62, z=(1.12, 1.1), c=(0.5, 0.45), big=True, slam=False, name="Match-cut: dép chạm")
C.sfx += [(mc, "thump_big", 0)]
C.over("flash", mc, mc + 5); C.over("shake", mc, mc + 7, amp=16)
f2 = C.clip(88.62, 89.1, rate=0.4, z=(1.1, 1.04), c=(0.5, 0.45), name="Quay chậm")
f3 = C.clip(89.1, 90.0, name="Đáp")
land = f3["from_"]
C.over("stamp", land, C.f + 20, t="ĂN HÌNH!", y=0.26, size=190, tilt=-5, color="yellow")
C.sfx += [(land, "flip", -3), (land + 2, "meme:capture-boom", -9)]
h = C.hold(90.0, 20, name="Giữ")
C.over("label", mc + 10, C.f, t="15 năm sau…", y=0.09)
g = C.clip(13.0, 15.0, name="Vẫn dích")
C.over("label", g["from_"], C.f, t="…vẫn dích như hồi đó", y=0.09)
C.over("stamp", C.at(g, 14.25), C.f, t="ĂN!", y=0.26, size=190, tilt=6, color="yellow")
C.page("end", 120)
C.sfx += [(C.f - 120, "sticker", -4), (C.f - 104, "chime_found", -8)]
nost, nost_mix = C.done()

json.dump(dict(videos=[stress, cliff, nost]), open(os.path.join(HERE, "edit", "src", "shorts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(dict(fps=FPS, videos=[stress_mix, cliff_mix, nost_mix]), open(os.path.join(HERE, "mixshorts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for v in (stress, cliff, nost): print(v["id"], f"{v['frames'] / FPS:.1f}s", len(v["clips"]), "clips")
