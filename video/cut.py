"""
The cut of the two launch videos from the filmed footage (python cut.py -> edit/src/edl.json + mix.json).

Footage: qa/capture/*.mjs films real matches (copied to edit/public/footage/<name>.mp4 + .json with every sound the game
started). Shots are written in beats of the music under them, so every cut lands on a beat; a shot is a window of a
take (seconds), optionally slowed, zoomed on its action (z from..to, centre c in 0..1 of the picture).
Remotion (edit/src) draws the cut and the motion graphics from edl.json; audio_mix.py mixes and masters mix.json
(the music plus every game sound that falls inside a shot, moved to its frame in the edit, plus the edit's own sounds).

Story: Bill and Tèo were kids playing "dích hình". 15 years later Tèo brings up the card he won, Bill sends a link,
revenge: Bill takes Tèo's card, gloats "Run chưa?", slams his own card off the table, Tèo wins. "Ván nữa. Ván cuối. Thật."
The rules are never told: the first two seconds show them. The matches were filmed with the game's meme pictures off
(other people's art) and the room link showing the live address; the meme sounds are added back in the mix.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FOOT = os.path.join(HERE, "edit", "public", "footage")
FPS = 30
GAME = dict(file="game-loop", bpm=130.0, kick=0.251)
MENU = dict(file="menu-loop", bpm=145.0, kick=0.230)
TONE = {880: "chime_ready", 1175: "chime_ready", 988: "chime_react", 1319: "chime_react", 523: "chime_found",
        659: "chime_found", 784: "chime_found", 1047: "chime_found", 392: "chime_out", 330: "chime_out", 262: "chime_out"}
EV = {n: json.load(open(os.path.join(FOOT, n + ".json"), encoding="utf-8")) for n in
      ["p-hook", "d-hook", "p-match", "d-match", "d-guest", "d-quick", "d-ward"]}
GUEST_OFFSET = 6.75  # d-guest second 0 = d-match second 6.75


class Cut:
    def __init__(self, id, W, H):
        self.v = dict(id=id, W=W, H=H, fps=FPS, clips=[], texts=[], chats=[], taps=[], flashes=[], shakes=[], splits=[], ends=[])
        self.sfx = []      # (frame, id, gain)
        self.music = []
        self.f = 0         # the edit's playhead (frames)
        self.beat = None   # frames per beat of the music playing

    def music_in(self, track, gain, fade_in=2):
        self.beat = 60 / track["bpm"] * FPS
        self.music.append(dict(id="music:" + track["file"], start=self.f, end=None, seek=track["kick"], gain=gain, fade_in=fade_in, fade_out=12, duck_at=[]))

    def music_out(self, fade=12):
        self.music[-1]["end"] = self.f + fade // 2; self.music[-1]["fade_out"] = fade

    def frames(self, beats=None, seconds=None):
        return round(beats * self.beat) if beats is not None else round(seconds * FPS)

    def shot(self, name, take, t_in, beats=None, seconds=None, rate=1.0, z=(1.0, 1.04), c=(0.5, 0.5), hero=(), keep_memes=True, extra=()):
        """A window of a take from t_in, `beats` long (or `seconds`); its game sounds come along. Returns the clip."""
        n = self.frames(beats, seconds)
        clip = dict(id=f"{self.v['id']}-{len(self.v['clips']) + 1:02d}", name=name, src=f"footage/{take}.mp4", from_=self.f, dur=n,
                    t_in=t_in, rate=rate, z=list(z), c=list(c))
        self.v["clips"].append(clip)
        t_out = t_in + n / FPS * rate
        at = lambda t: self.f + round((t - t_in) / rate * FPS)
        seen = []
        for s in EV[take]["sounds"]:
            if not (t_in - 0.05 <= s["t"] < t_out): continue
            if s["kind"] == "thump":
                big = any(abs(s["t"] - h) < 0.15 for h in hero)
                self.sfx.append((at(s["t"]) - 5, "whoosh", -8 if not big else -3))
                self.sfx.append((at(s["t"]), "thump_big" if big else "thump", 0 if big else -1))
            elif s["kind"] == "tone":
                kind = TONE.get(round(s["hz"]))
                if kind and not any(abs(s["t"] - t) < 0.4 and k == kind for t, k in seen):
                    seen.append((s["t"], kind)); self.sfx.append((at(s["t"]), kind, -5))
            elif s["kind"] == "clip" and keep_memes:
                self.sfx.append((at(s["t"]), "meme:" + s["url"].split("/")[-1].rsplit(".", 1)[0], -9))
        for t, id, gain in extra: self.sfx.append((at(t), id, gain))
        self.f += n
        return clip

    def at(self, clip, t):
        return clip["from_"] + round((t - clip["t_in"]) / clip["rate"] * FPS)

    def text(self, t, a, b, y, style="stamp", size=110, hl=False, tilt=0):
        self.v["texts"].append(dict(t=t, from_=a, dur=b - a, y=y, style=style, size=size, hl=hl, tilt=tilt))

    def chat(self, who, t, a, b, sound=True):
        self.v["chats"].append(dict(who=who, t=t, from_=a, dur=b - a))
        if sound: self.sfx.append((a, "msg", -3))

    def tap(self, clip, t, x, y):
        f = self.at(clip, t); self.v["taps"].append(dict(clip=clip["id"], at=f, x=x, y=y)); self.sfx.append((f, "tap", -2))

    def stamp_hit(self, clip, t, word, y, size=150, tilt=-4, hl=True, sound="flip"):
        f = self.at(clip, t); self.text(word, f, clip["from_"] + clip["dur"], y, size=size, tilt=tilt, hl=hl)
        if sound: self.sfx.append((f, sound, -10 if sound.startswith("meme:") else -4))

    def silence_before(self, clip, t, frames=15):
        f = self.at(clip, t); self.music[-1]["duck_at"].append([f - frames, f + 2, -30])

    def done(self):
        if self.music and self.music[-1]["end"] is None: self.music[-1]["end"] = self.f
        self.v["frames"] = self.f
        mix = dict(id=self.v["id"], frames=self.f, music=self.music,
                   shots=[dict(id=c["id"][-2:], start=c["from_"], end=c["from_"] + c["dur"], sfx=[]) for c in self.v["clips"]])
        for f, id, g in sorted(self.sfx):
            sh = next((s for s in reversed(mix["shots"]) if s["start"] <= f), mix["shots"][0])
            sh["sfx"].append(dict(id=id, at=max(0, f), gain=g))
        return self.v, mix


# ============================================================ SHORT · 9:16
S = Cut("SHORT", 1080, 1920)
S.beat = 60 / GAME["bpm"] * FPS
# the hook, no music yet: the slipper comes down, the tiger card flips onto Tèo's panda card
h = S.shot("Móc: ăn hình", "p-hook", 0.72, beats=4, z=(1.0, 1.08), hero=[1.01])
S.text("Hồi đó dích hình\ncó *thua ai* chưa?", 3, h["dur"], 0.15, style="head", size=92)
S.stamp_hit(h, 1.95, "ĂN HÌNH!", 0.7, size=190, sound="meme:capture-boom")
S.v["flashes"].append(S.at(h, 1.01)); S.v["shakes"].append([S.at(h, 1.01), 7, 22])
S.music_in(GAME, -9)
c = S.shot("Rủ: Mời bạn, Tèo vào phòng", "p-match", 3.75, beats=8, z=(1.0, 1.04), c=(0.5, 0.35), extra=[(6.9, "chime_found", -6)])
S.tap(c, 3.94, 0.5, 0.235)
S.text("Gửi link là vô. *Khỏi cài app*", c["from_"] + S.frames(3), c["from_"] + c["dur"], 0.905, style="head", size=78)
# the chat: Tèo's line comes in, cut to Bill typing his reply, then hold the last frame so the reply reads in full;
# the real chat is at the bottom of the sheet, the same lines show big in its empty middle
a = S.shot("Chat thật: Tèo khơi chuyện cũ", "p-match", 11.98, beats=4, z=(1.07, 1.08), c=(0.5, 1.0))
b = S.shot("Chat thật: Bill gõ trả lời", "p-match", 14.05, beats=6, z=(1.08, 1.09), c=(0.5, 1.0))
hold = S.shot("Giữ khung cho đọc hết", "p-match", 16.78, beats=2, rate=0.05, z=(1.09, 1.09), c=(0.5, 1.0))
S.chat("teo", "ê còn nhớ vụ t\năn hình m hông =))", S.at(a, 12.13), hold["from_"] + hold["dur"])
S.v["chats"].append(dict(who="bill", row=1, t="nhớ chớ. vô đây t trả thù", from_=S.at(b, 15.5), dur=hold["from_"] + hold["dur"] - S.at(b, 15.5)))
S.sfx.append((S.at(b, 15.5), "msg", -3))
c = S.shot("Tù xì", "p-match", 20.86, beats=4, z=(1.5, 1.56), c=(0.5, 0.43))
S.tap(c, 21.74, 0.33, 0.44)
c = S.shot("Bill kéo ngắm, dích", "p-match", 27.47, beats=4, z=(1.9, 2.0), c=(0.5, 0.4))
S.text("Phục thù\n*15 năm*", c["from_"] + 2, c["from_"] + c["dur"], 0.78, size=110, tilt=-3)
S.v["shakes"].append([S.at(c, 28.95), 5, 12])
S.shot("Tèo: Vô lẹ! rồi dích", "p-match", 31.64, beats=4, z=(1.8, 1.9), c=(0.5, 0.6), extra=[(31.88, "chime_react", -3)])
c = S.shot("Bill ăn hình", "p-match", 35.91, beats=7, z=(1.95, 1.15), c=(0.5, 0.38), hero=[37.65], extra=[(38.31, "meme:capture-boom", -9)])
S.v["shakes"].append([S.at(c, 37.65), 6, 16])
S.shot("Khoe: Run chưa?", "p-match", 55.12, beats=4, z=(1.7, 1.8), c=(0.64, 0.37), extra=[(55.34, "chime_react", -3)])
c = S.shot("Quay xe: rớt bàn", "p-match", 59.49, beats=10, z=(1.75, 1.15), c=(0.5, 0.38), hero=[61.18], extra=[(62.79, "meme:fall-bruh", -8)])
S.silence_before(c, 61.18)
S.v["shakes"].append([S.at(c, 61.18), 8, 24]); S.v["flashes"].append(S.at(c, 61.18))
S.text("Mạnh tay quá là *ăn hành*", S.at(c, 61.99), c["from_"] + c["dur"], 0.9, style="head", size=86)
S.shot("Tèo ăn lại", "p-match", 87.37, beats=6, z=(1.7, 1.15), c=(0.5, 0.52), extra=[(89.37, "meme:capture-damage", -10)])
c = S.shot("Tèo thắng, ván nữa", "p-match", 93.2, beats=10, z=(1.15, 1.2), c=(0.5, 0.5), extra=[(93.3, "meme:match-lose", -12)])
S.text("Ván nữa. Ván cuối. *Thật.*", c["from_"] + S.frames(5), c["from_"] + c["dur"], 0.8, style="head", size=86)
end = S.f
S.shot("Kết", "p-hook", 2.4, beats=8, z=(1.1, 1.18))
S.v["ends"].append(dict(from_=end, dur=S.f - end))
S.sfx += [(end, "thump", -2), (end + 6, "chime_found", -6)]
S.music[-1]["fade_out"] = 45
short, short_mix = S.done()

# ============================================================ LONG · 16:9
L = Cut("LONG", 1920, 1080)
L.beat = 60 / GAME["bpm"] * FPS
# the hook in slow motion around the flip
L.shot("Móc", "d-hook", 0.55, seconds=0.27)
b = L.shot("Móc (quay chậm)", "d-hook", 0.82, seconds=1.6, rate=0.5, z=(1.0, 1.1), hero=[0.86])
L.v["shakes"].append([L.at(b, 0.86), 7, 20]); L.v["flashes"].append(L.at(b, 0.86))
c = L.shot("Móc: lá nằm yên", "d-hook", 1.62, seconds=0.83, z=(1.1, 1.14))
L.stamp_hit(c, 1.7, "ĂN HÌNH!", 0.78, size=170, sound="meme:capture-boom")
L.music_in(MENU, -10)
c = L.shot("Tạo phòng", "d-match", 0.35, beats=8, z=(1.0, 1.04), c=(0.5, 0.5))
L.text("15 năm sau…", c["from_"] + 2, c["from_"] + c["dur"], 0.88, style="head", size=80)
L.shot("Mời bạn: copy link", "d-match", 3.7, beats=7, z=(1.9, 2.0), c=(0.42, 0.32))
sp = L.f
c = L.shot("Chia đôi: Tèo mở link trên đt", "d-match", 6.85, beats=12)
L.v["splits"].append(dict(from_=sp, dur=c["dur"], left=dict(src="footage/d-match.mp4", t_in=6.85), right=dict(src="footage/d-guest.mp4", t_in=6.85 - GUEST_OFFSET),
                          labels=["Bill · máy tính", "Tèo · điện thoại"]))
L.text("Gửi link là vô. *Khỏi cài app*", c["from_"] + L.frames(2), c["from_"] + c["dur"], 0.92, style="head", size=68)
c = L.shot("Chat thật: Tèo khơi chuyện cũ", "d-match", 11.1, beats=12, z=(2.4, 2.45), c=(0.91, 0.82), extra=[(14.25, "msg", -3)])
# the dock is small on a 1920 screen: the same lines, big, beside it
L.chat("teo", "ê còn nhớ vụ t\năn hình m hông =))", c["from_"] + 2, c["from_"] + c["dur"])
L.v["chats"].append(dict(who="bill", row=1, t="nhớ chớ. vô đây t trả thù", from_=L.at(c, 14.25), dur=c["from_"] + c["dur"] - L.at(c, 14.25)))
L.music_out(10)
L.sfx.append((L.f - 40, "riser", -12))
L.music_in(GAME, -9)
L.shot("Tù xì", "d-match", 20.3, beats=6, z=(1.6, 1.66), c=(0.5, 0.45))
c = L.shot("Bill rê chuột ngắm, dích", "d-match", 23.95, beats=8, z=(2.0, 2.15), c=(0.34, 0.45))
L.text("Rê ngắm, bấm là *dích*", c["from_"] + 4, c["from_"] + c["dur"], 0.88, style="head", size=76)
L.shot("Tèo: Vô lẹ! rồi dích", "d-match", 29.36, beats=4, z=(2.0, 2.1), c=(0.7, 0.42), extra=[(29.64, "chime_react", -3)])
c = L.shot("Bill ăn hình", "d-match", 33.2, beats=8, z=(1.9, 1.25), c=(0.42, 0.42), hero=[34.49], extra=[(35.32, "meme:capture-boom", -9)])
L.v["shakes"].append([L.at(c, 34.49), 6, 14])
L.shot("Khoe: Run chưa?", "d-match", 50.29, beats=6, z=(2.0, 2.1), c=(0.3, 0.42), extra=[(50.61, "chime_react", -3)])
c = L.shot("Quay xe: rớt bàn", "d-match", 54.12, beats=8, z=(1.7, 1.2), c=(0.36, 0.45), hero=[55.58], extra=[(57.22, "meme:fall-oidoioi", -8)])
L.silence_before(c, 55.58)
L.v["shakes"].append([L.at(c, 55.58), 8, 22]); L.v["flashes"].append(L.at(c, 55.58))
L.text("Mạnh tay quá là *ăn hành*", L.at(c, 56.42), c["from_"] + c["dur"], 0.88, style="head", size=80)
L.shot("Tèo ăn lại", "d-match", 71.41, beats=6, z=(1.8, 1.25), c=(0.58, 0.43), extra=[(73.31, "meme:capture-damage", -10)])
c = L.shot("Tèo thắng", "d-match", 77.46, beats=9, z=(1.5, 1.55), c=(0.5, 0.45), extra=[(77.56, "meme:match-lose", -12)])
L.text("Ván nữa. Ván cuối. *Thật.*", c["from_"] + L.frames(4), c["from_"] + c["dur"], 0.88, style="head", size=80)
c = L.shot("Chơi ngay: tìm người lạ", "d-quick", 6.0, beats=6, z=(1.3, 1.36), c=(0.5, 0.45))
L.text("Hết bạn? *Dích với người lạ*", c["from_"] + 2, c["from_"] + c["dur"] + L.frames(6), 0.88, style="head", size=78)
L.shot("Bàn 4 người", "d-quick", 13.2, beats=6, z=(1.35, 1.45), c=(0.5, 0.45))
c = L.shot("Tủ đồ: pet", "d-ward", 2.2, beats=6, z=(1.6, 1.66), c=(0.5, 0.5))
L.text("Đổi dép *đổi vận*", c["from_"] + 2, c["from_"] + c["dur"] + L.frames(6), 0.88, style="head", size=80)
for t in (2.348, 3.706, 5.067): L.sfx.append((L.at(c, t), "tap", -4))
c = L.shot("Tủ đồ: màu dép", "d-ward", 9.0, beats=6, z=(1.6, 1.66), c=(0.5, 0.5))
for t in (9.198, 10.246, 11.293): L.sfx.append((L.at(c, t), "tap", -4))
end = L.f
L.shot("Kết", "d-hook", 2.3, beats=12, z=(1.12, 1.2))
L.v["ends"].append(dict(from_=end, dur=L.f - end))
L.sfx += [(end, "thump", -2), (end + 6, "chime_found", -6)]
L.music[-1]["fade_out"] = 60
long, long_mix = L.done()

json.dump(dict(videos=[short, long], covers={}, live="billthedevstudio.io.vn/slam-cards"),
          open(os.path.join(HERE, "edit", "src", "edl.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(dict(fps=FPS, videos=[short_mix, long_mix]), open(os.path.join(HERE, "mix.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for v in (short, long):
    print(v["id"], f"{v['frames'] / FPS:.1f}s", len(v["clips"]), "clips")
