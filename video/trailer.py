"""
The trailer v3, 16:9, in Vietnamese and English (python trailer.py [vi] [en] -> edit/src/trailer.json + mixtrailer.json;
audio_mix.py mixtrailer.json; Remotion TRAILER / TRAILER-EN). The English cut uses the -en reels, filmed with LANG_UI=en.
Every shot is placed from the match's own marks and slam sounds, so each language cuts from its own takes.
Planned on the canvas (design/trailer/frames.py, "Trailer v3"): the copy is Bill's, in loose tilted chunks (Nunito
Black, one word in yellow, sometimes on taped paper), the game's letters only for the logo and stamps; the studio comes
in twice: the graphite ident after the hook and the logo on the one end card.

  hook (slow slam, no words) · ident · "Dích hình, đập hình… Bằng dép?" the slipper squashes the words · the logo
  · càng đông càng vui (lobby, link, chat) · the rules (đập hình cho bài di chuyển, ăn hình) · the match, the tease
  · nhẹ tay (off the table) · người lạ · tủ đồ (24 pets, the honeycomb slipper painted) · the end card
"""
import json, os
from editlib import HERE, FPS, SYNC, Short, events, GAME, MENU, mark, thump_after

TONE = {880: "chime_ready", 1175: "chime_ready", 988: "chime_react", 1319: "chime_react", 523: "chime_found",
        659: "chime_found", 784: "chime_found", 1047: "chime_found", 392: "chime_out", 330: "chime_out", 262: "chime_out"}
END = 150  # the end card, 5 s


class Trailer(Short):
    def shot(self, reel, t_in, t_out=None, rate=1.0, frames=None, z=(1.0, 1.04), c=(0.5, 0.5), hero=(), memes=True, name="", **fx):
        """A window of a filmed match; the game's own sounds in it come along (slams, chimes, meme stingers)."""
        cl = self.clip(reel, t_in, t_out, rate=rate, frames=frames, z=z, c=c, slam=False, name=name, **fx)
        t_end = t_in + cl["dur"] / FPS * rate
        at = lambda t: cl["from_"] + round((t + SYNC - t_in) / rate * FPS)
        seen = []
        for s in events(reel)["sounds"]:
            if not (t_in - 0.05 <= s["t"] < t_end): continue
            if s["kind"] == "thump":
                big = any(abs(s["t"] - h) < 0.15 for h in hero)
                self.sfx += [(at(s["t"]) - 5, "whoosh", -11), (at(s["t"]), "thump_big" if big else "thump", 2)]
            elif s["kind"] == "tone":
                kind = TONE.get(round(s["hz"]))
                if kind and not any(abs(s["t"] - t) < 0.4 and k == kind for t, k in seen):
                    seen.append((s["t"], kind)); self.sfx.append((at(s["t"]), kind, -5))
            elif s["kind"] == "clip" and memes:
                self.sfx.append((at(s["t"]), "meme:" + s["url"].split("/")[-1].rsplit(".", 1)[0], -9))
        return cl


VI = dict(sfx="", cta="Đập hình cùng <b>chúng mình</b> nhé!", t=[
    "Dích hình,", "đập <b>hình…</b>", "Bằng <b>dép?</b>", "Càng đông", "càng <b>vui!</b>", "Gửi link", "khỏi <b>cài app</b>",
    "ê còn nhớ vụ t ăn hình m hông =))", "nhớ chớ. vô đây t trả thù", "Đập hình", "cho bài <b>di chuyển</b>", "<b>Ăn hình</b>",
    "= nằm đè lên bài đối thủ", "Nhẹ tay nhé!", "Mạnh tay quá là <b>ra khỏi bàn</b> đấy.", "Bạn không có bạn?",
    "Thử chơi cùng <b>người lạ</b> nhé?", "<b>24</b> pet,", "đa dạng", "màu custom", "cho đôi <b>tổ ong</b>", "thần <b>sầu?</b>"])
EN = dict(sfx="-en", cta="Come <b>slap cards</b> with us!", t=[
    "Flip cards,", "slap <b>cards…</b>", "With a <b>slipper?</b>", "The more,", "the <b>merrier!</b>", "Send a link", "no <b>app</b> to install",
    "remember when i took\nyour card lol", "oh i remember.\nget in, revenge time", "Slap the table,", "the <b>cards fly</b>", "<b>Capture</b>",
    "= land on top of their card", "Easy now!", "Hit too hard and you're <b>off the table</b>.", "No friends?",
    "Play with <b>strangers</b>!", "<b>24</b> pets,", "custom", "colors", "for your <b>honeycomb</b>", "<b>slippers!</b>"])


def build(L, lang):
    X = L["sfx"]; t = L["t"]; vi = lang == "vi"
    T = Trailer("TRAILER" + X.upper(), 1920, 1080, lang=lang)
    HOOK, MATCH, QUICK, WARD = "d-hook" + X, "d-match" + X, "d-quick" + X, "d-ward2" + X

    # ---- hook: the first take that captured, in slow motion, no words, only the hit
    ev = events(HOOK)["marks"]
    take = next(ev[i - 1]["t"] for i, m in enumerate(ev) if m["label"] == "result" and m.get("capture"))
    th = thump_after(HOOK, take)
    T.shot(HOOK, th - 0.31, th - 0.04, z=(1.0, 1.02), name="hook")
    h = T.shot(HOOK, th - 0.04, th + 0.76, rate=0.5, z=(1.02, 1.1), hero=[th], name="hook · slow")
    T.over("flash", T.at(h, th + 0.02), T.at(h, th + 0.02) + 5); T.over("shake", T.at(h, th + 0.02), T.at(h, th + 0.02) + 8, amp=20)
    T.shot(HOOK, th + 0.76, th + 1.44, z=(1.1, 1.14), name="hook · the card settles")
    T.sfx += [(T.f - 18, "flip", -4)]
    still = th + 1.44

    # ---- the studio ident (graphite, like the site)
    f0 = T.f; T.f += 60
    T.over("ident", f0, T.f)
    T.sfx += [(f0, "whoosh", -10), (f0 + 3, "chime_ready", -8), (f0 + 34, "riser", -16)]

    # ---- "Dích hình, đập hình… Bằng dép?" the slipper squashes the words, the logo lands
    T.music.append(dict(**MENU, start=T.f, end=None, gain=-14, fade_in=1, fade_out=10, duck_at=[]))
    BG = dict(blur=20, dark=0.4)
    c = T.clip(HOOK, still, rate=0.001, frames=50, z=(1.1, 1.13), slam=False, name="words", **BG)
    T.chunk(c["from_"], T.f, t[0], 300, 280, 170, -6)
    T.chunk(c["from_"], T.f, t[1], 860, 540, 130, 4, delay=12)
    T.sfx += [(c["from_"], "sticker", -6), (c["from_"] + 12, "sticker", -6)]
    c = T.clip(HOOK, still, rate=0.001, frames=52, z=(1.13, 1.15), slam=False, name="squash", **BG)
    T.over("squash", c["from_"], T.f, t=t[2], y=330, size=230 if vi else 200, hit=24)
    T.sfx += [(c["from_"], "sticker", -5), (c["from_"] + 14, "whoosh", -6), (c["from_"] + 24, "thump_big", 2)]
    T.music[0]["duck_at"].append([c["from_"] + 20, c["from_"] + 40, -12])
    c = T.clip(HOOK, still, rate=0.001, frames=78, z=(1.15, 1.18), slam=False, name="logo", blur=10, dark=0.35)
    T.over("logo", c["from_"], T.f, cx=960, cy=540, w=1300)
    T.over("shake", c["from_"], c["from_"] + 8, amp=14)
    T.sfx += [(c["from_"], "thump_big", 1), (c["from_"] + 2, "meme:capture-boom", -10), (c["from_"] + 8, "chime_found", -8)]

    # ---- càng đông càng vui: the room, the link, the chat
    I = mark(MATCH, "invite")
    c = T.shot(MATCH, I - 1.21, I - 0.21, rate=0.7, z=(1.6, 1.66), c=(0.6, 0.35), name="room")
    T.chunk(c["from_"], T.f, t[3], 1000, 300, 150, -5)
    T.over("paper", c["from_"], T.f, t=t[4], x=1260 if vi else 1180, y=540, size=100, rot=4, delay=12)
    T.sfx.append((c["from_"] + 12, "sticker", -6))
    c = T.shot(MATCH, I - 0.21, I + 2.34, z=(1.9, 2.0), c=(0.42, 0.32), name="invite: copy the link")
    T.over("tap", T.at(c, I) - 6, T.at(c, I) + 10, x=960, y=420)
    T.sfx.append((T.at(c, I), "tap", -2))
    T.chunk(c["from_"] + 10, T.f, t[5], 1330 if vi else 1360, 330, 130 if vi else 100, -4)
    T.over("paper", c["from_"] + 22, T.f, t=t[6], x=1360 if vi else 1380, y=560, size=80 if vi else 62, rot=3, delay=0)
    T.sfx.append((c["from_"] + 22, "sticker", -6))
    CT, CB = mark(MATCH, "chat-teo"), mark(MATCH, "chat-bill")
    c = T.shot(MATCH, CT - 0.24, CB + 1.67, z=(2.4, 2.45), c=(0.91, 0.82), memes=False, name="the real chat")
    T.over("dim", c["from_"], T.f, strength=0.35)
    T.over("chat", T.at(c, CT), T.f, who="teo", t=t[7], x=100 if vi else 40, w=920 if vi else 1000, y=250 if vi else 190, u=4.4 if vi else 3.2)
    T.over("chat", T.at(c, CB), T.f, who="bill", t=t[8], x=100 if vi else 40, w=920 if vi else 1000, y=600 if vi else 580, u=4.4 if vi else 3.2)
    T.sfx += [(T.at(c, CT), "msg", -3), (T.at(c, CB), "msg", -3)]
    T.music[0]["end"] = T.f + 6; T.music[0]["fade_out"] = 12
    T.sfx.append((T.f - 40, "riser", -12))

    # ---- the rules, on the slams themselves
    T.music.append(dict(**GAME, start=T.f, end=None, gain=-14, fade_in=1, fade_out=30, duck_at=[]))
    h1 = thump_after(MATCH, mark(MATCH, "slam-bill"))
    c = T.shot(MATCH, h1 - 1.4, h1 + 1.8, z=(2.0, 2.15), c=(0.34, 0.45), name="rule 1: slap")
    hit = T.at(c, h1)
    T.chunk(hit, T.f, t[9], 1080 if vi else 980, 140, 150 if vi else 120, 5)
    T.chunk(hit, T.f, t[10], 960, 360, 96, -3, delay=10)
    T.over("shake", hit, hit + 6, amp=10)
    hc = thump_after(MATCH, mark(MATCH, "slam-capture"))
    c = T.shot(MATCH, hc - 1.29, hc + 2.51, z=(1.9, 1.7), c=(0.42, 0.42), hero=[hc], name="rule 2: capture")
    hit = T.at(c, hc)
    T.over("shake", hit, hit + 8, amp=14)
    T.chunk(hit + 14, T.f, t[11], 150, 120, 170, -6)
    T.over("paper", hit + 14, T.f, t=t[12], x=150, y=380, size=70, rot=3, delay=10)
    T.sfx.append((hit + 24, "sticker", -6))

    # ---- the match: the tease
    R = mark(MATCH, "run-chua")
    T.shot(MATCH, R - 0.32, R + 2.28, z=(2.0, 2.1), c=(0.3, 0.42), name="the tease")

    # ---- nhẹ tay: the music stops, the hit, the card leaves the table
    hf = thump_after(MATCH, mark(MATCH, "slam-fall"))
    c = T.shot(MATCH, hf - 1.46, hf + 3.02, z=(1.7, 1.25), c=(0.36, 0.45), hero=[hf], name="easy now: off the table")
    hit = T.at(c, hf)
    T.music[-1]["duck_at"].append([hit - 15, hit + 2, -30])
    T.over("flash", hit, hit + 5); T.over("shake", hit, hit + 8, amp=22)
    T.chunk(T.at(c, hf + 1.02), T.f, t[13], 980, 130, 140, 6)
    T.chunk(T.at(c, hf + 1.02), T.f, t[14], 260 if vi else 200, 820, 76, -3, delay=18)

    # ---- người lạ
    M = mark(QUICK, "matched")
    c = T.shot(QUICK, M - 0.02, M + 2.78, z=(1.3, 1.36), c=(0.5, 0.5), name="quick match")
    T.chunk(c["from_"], T.f, t[15], 110, 95 if vi else 120, 110, -4)
    T.over("paper", c["from_"] + 30, T.f + 54, t=t[16], x=760 if vi else 900, y=880, size=70, rot=3, delay=0)
    T.sfx.append((c["from_"] + 30, "sticker", -6))
    S = mark(QUICK, "slam")
    T.shot(QUICK, S - 0.32, S + 1.48, z=(1.35, 1.45), c=(0.5, 0.45), name="four at the table")

    # ---- tủ đồ: 24 pets flipped fast, the honeycomb slipper picked and painted
    W = events(WARD)
    mk = {m["label"]: m["t"] for m in W["marks"]}
    WZ, WC = (1.75, 1.8), (0.5, 0.47)
    c = T.clip(WARD, mk["pets"] - 0.1, mk["pet-lion"] + 0.1, rate=1.6, z=WZ, c=WC, slam=False, name="wardrobe: pets")
    for m in W["marks"]:
        if m["label"].startswith("pet-") and mk["pets"] - 0.1 <= m["t"] < mk["pet-lion"] + 0.1: T.sfx.append((T.at(c, m["t"]), "tap", -6))
    T.chunk(c["from_"], T.f, t[17], 50, 300, 140 if vi else 120, -6)
    T.chunk(c["from_"] + 16, T.f, t[18], 1440, 300, 100, 4)
    T.chunk(c["from_"] + 22, T.f, t[19], 1350 if vi else 1420, 440, 96, -3)
    c = T.clip(WARD, mk["dep"] - 0.1, mk["end"] - 0.15, rate=1.2, z=WZ, c=WC, slam=False, name="wardrobe: the honeycomb slipper")
    for m in W["marks"]:
        if m["label"] in ("to-ong", "swatch"): T.sfx.append((T.at(c, m["t"]), "tap", -5))
    k = T.at(c, mk["to-ong"]) + 6
    T.over("paper", k, T.f, t=t[20], x=60 if vi else 30, y=330, size=74 if vi else 60, rot=-3, delay=0)
    T.chunk(k + 10, T.f, t[21], 50 if vi else 30, 520, 100 if vi else 84, 4)
    T.over("cut", k + 4, T.f, src="media/cut-dep-dep_to_ong.png", x=1380, y=300, w=560, rot=18, delay=0, sway=4)
    T.sfx += [(k, "sticker", -6), (k + 10, "sticker", -7)]

    # ---- the one end card
    f0 = T.f; T.f += END
    T.over("end", f0, T.f, line=L["cta"])
    T.sfx += [(f0, "thump_big", -2), (f0 + 26, "chime_found", -9)]
    v, m = T.done()
    m.update(lufs=-14.5, ceiling=-1.6)
    return v, m


if __name__ == "__main__":
    import sys
    built = [build(VI if lang == "vi" else EN, lang) for lang in (sys.argv[1:] or ["vi", "en"])]
    json.dump(dict(videos=[v for v, m in built]), open(os.path.join(HERE, "edit", "src", "trailer.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(dict(fps=FPS, videos=[m for v, m in built]), open(os.path.join(HERE, "mixtrailer.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for v, m in built: print(v["id"], f"{v['frames'] / FPS:.1f}s", len(v["clips"]), "clips")
