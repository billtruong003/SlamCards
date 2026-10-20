"""
The five shorts, one concept each, in Vietnamese and in English (python shorts5.py -> edit/src/shorts5.json + mix5.json;
then audio_mix.py mix5.json, Remotion). Planned frame by frame on the canvas (design/shorts/boards.py).
Cut from the portrait take reels (qa/capture/shorts.mjs, filmed slowed, LANG_UI=en for the English game):
  s-main  Bill's dép lào          s-off2  the set at the table's near edge, hard slams: the card flies off
  s-le2   Bill in dép lê          s-ong2  Bill in dép tổ ong                (English reels: <name>-en)
Every clip is placed from the moment its slipper lands (the take's slam sound), so a language's cut only needs its own
takes: the Vietnamese ones were picked by eye, the English ones by outcome (pick()), then checked on contact sheets.
Every video ends on the same card: logo, line, link, credits, BillTheDev Studio.

  S1 XIU     Xíu nữa thôi / Just one card: three misses that get worse, the 4th in slow motion lands.
  S2 CLIFF   Ván quyết định / Match point: 1–1, the last slam freezes mid-air: guess. P2 opens on that frame and lands it.
  S3 RECESS  Giờ ra chơi / Recess: a notebook page, "Bằng dép?", a paper slipper squashes the words, match-cut into the game.
  S4 DEPS    Dép nào mạnh nhất? / Which slipper hits hardest?: three slippers as fighters, one real take each (the
             slipper is only looks in the game, so the stats are looks too, and the result says what these takes did).
  S5 FRIEND  Bạn thân cấp 1 / Your childhood best friend: the old friend writes, Bill sends the link, the friend is in, revenge.
"""
import json, os
from editlib import HERE, FPS, SYNC, Short, GAME, MENU, takes, mark

PINK = "#ff5d8f"

VI = dict(
    sfx="", cta="Đập hình cùng <b>chúng mình</b> nhé!",
    s1=["Ăn 1 lá", "thôi <b>mà…</b>", "XÍU NỮA!", "(tay run rồi đó)", "lần <b>2</b>", "ỨC GHÊ!", "lần <b>3</b>", "RA KHỎI", "BÀN?!",
        "(thở đi bạn)", "lần <b>4</b>…", "ĂN HÌNH!", "Bạn mất mấy lần? 👇"],
    s2=["Ván <b>quyết định</b>", "Bill – Tèo", "BỐP!", "Ăn hình…", "hay <b>ra khỏi bàn?</b>", "ĐOÁN ĐI!", "Phần 2 <b>tối nay</b> 👇",
        "<b>Phần 2</b> · kết quả", "Ăn hình… hay <b>ra khỏi bàn?</b>", "ĂN HÌNH!", "Bill thắng <b>2 – 1</b>", "Ai đoán <b>đúng?</b> 👇"],
    s3=["Giờ ra chơi…", "Dích hình,", "đập <b>hình…</b>", "(mất 10 lá 1 buổi 😭)", "Bằng <b>dép?</b>", "(dép lào huyền thoại)", "BỐP!",
        "ĂN HÌNH!", "15 năm sau…", "vẫn <b>ức</b> như hồi đó"],
    s4=["Dép nào", "<b>mạnh nhất?</b>", ["DÉP LÀO", "DÉP LÊ", "TỔ ONG"], [[("Huyền thoại", 5), ("Độ êm", 2)], [("Sang chảnh", 4), ("Độ êm", 4)],
        [("Thoáng mát", 5), ("Độ ngầu", 3)]], ["ĂN!", "LỆCH!", "BAY XA!"], "Lá bay xa nhất:", "TỔ ONG!", "dép lào ăn <b>chuẩn</b> nhất",
        "(dép nào cũng cùng lực, chỉ khác độ ngầu 😎)", "Team dép nào? 👇", ["lào", "lê", "tổ ong"]],
    s5=["15 năm sau…", "ê còn nhớ vụ t ăn hình m hông =))", "nhớ chớ. vô đây t trả thù", "Gửi <b>link</b>", "khỏi tải app", "là <b>vào bàn</b>",
        "PHỤC THÙ!", "Gửi cho <b>đứa bạn cấp 1</b> 👇"],
)
EN = dict(
    sfx="-EN", cta="Come <b>slap cards</b> with us!",
    s1=["Just ONE", "<b>card…</b>", "SO CLOSE!", "(hands shaking)", "try <b>2</b>", "ARGH!", "try <b>3</b>", "OFF THE", "TABLE?!",
        "(breathe…)", "try <b>4</b>…", "GOT IT!", "How many tries would YOU need? 👇"],
    s2=["<b>Match</b> point", "Bill – Teo", "SLAP!", "Capture…", "or <b>off the table?</b>", "GUESS!", "Part 2 <b>tonight</b> 👇",
        "<b>Part 2</b> · the result", "Capture… or <b>off the table?</b>", "CAPTURED!", "Bill wins <b>2 – 1</b>", "Who <b>called it?</b> 👇"],
    s3=["Recess…", "Flip cards,", "slap <b>cards…</b>", "(lost 10 cards in one recess 😭)", "With a <b>slipper?</b>",
        "(a Vietnamese schoolyard classic)", "SLAP!", "CAPTURED!", "15 years later…", "still <b>salty</b> about it"],
    s4=["Which slipper", "<b>hits hardest?</b>", ["FLIP-FLOP", "SLIDE", "HONEYCOMB"], [[("Legendary", 5), ("Comfort", 2)],
        [("Fancy", 4), ("Comfort", 4)], [("Airflow", 5), ("Swag", 3)]], ["GOT IT!", "MISSED!", "SENT IT!"], "Flew the farthest:",
        "HONEYCOMB!", "the flip-flop is the <b>most accurate</b>", "(same power for all, only the swag differs 😎)", "Which team are you? 👇",
        ["flip-flop", "slide", "honeycomb"]],
    s5=["15 years later…", "remember when i took your card lol", "oh i remember. get in, revenge time", "Send a <b>link</b>",
        "no app to install", "and <b>they're in</b>", "REVENGE!", "Send this to your <b>childhood best friend</b> 👇"],
)


def pick(reel, kind, used, key):
    """An English take by outcome, not one used by another video yet."""
    c = [t for t in takes(reel) if t["kind"] == kind and (reel, t["i"]) not in used]
    t = sorted(c, key=key)[0]; used.add((reel, t["i"]))
    return reel, t["thump"]


def en_takes():
    used = set(); r = lambda n: n + "-en"
    return dict(
        s1a=pick(r("s-main"), "near", used, lambda t: abs(t["dist"] - 1.0)), s1b=pick(r("s-main"), "near", used, lambda t: abs(t["dist"] - 0.9)),
        s1c=pick(r("s-off2"), "off", used, lambda t: t["dist"]), s1d=pick(r("s-main"), "cap", used, lambda t: t["dist"]),
        s2=pick(r("s-main"), "cap", used, lambda t: abs(t["dist"] - 0.4)), s3=pick(r("s-main"), "cap", used, lambda t: abs(t["dist"] - 0.5)),
        s4a=pick(r("s-main"), "cap", used, lambda t: t["dist"]), s4b=pick(r("s-le2"), "near", used, lambda t: abs(t["dist"] - 0.9)),
        s4c=pick(r("s-ong2"), "flip", used, lambda t: -t["dist"]), s5=pick(r("s-main"), "cap", used, lambda t: t["dist"]),
        lobby="p-match-en")


VI_TAKES = dict(s1a=("s-main", 24.76), s1b=("s-main", 28.46), s1c=("s-off2", 22.47), s1d=("s-main", 73.35), s2=("s-main", 66.16),
                s3=("s-main", 58.2), s4a=("s-main", 13.37), s4b=("s-le2", 28.3), s4c=("s-ong2", 24.07), s5=("s-main", 51.04), lobby="p-match")
# per-language nudges found on the contact sheets: the frozen mid-air frame of S2 (seconds after the hit)
FREEZE = {"vi": 0.41, "en": 0.41}


def build(L, T, lang):
    out = []
    X = L["sfx"]; CTA = L["cta"]

    # ============================================================ S1 · Xíu nữa thôi (ức chế giữ chân)
    s = L["s1"]; A = Short("S1-XIU" + X, lang=lang)
    A.music.append(dict(**GAME, start=0, end=None, gain=-15, fade_in=1, fade_out=3, duck_at=[]))
    r, t = T["s1a"]
    A.clip(r, t - 0.58, t + 1.12, name="1")
    A.chunk(0, 30, s[0], 90, 150, 130, -6)
    A.chunk(0, 30, s[1], 420, 1500, 130, 5, delay=7)
    h = A.hold(r, t + 1.12, 18, name="1 · stamp")
    A.stamp(h["from_"], A.f, s[2], 300, 170, -7, PINK)
    A.chunk(h["from_"], A.f, s[3], 380, 540, 60, 4, delay=4)
    A.sfx.append((h["from_"], "meme:pass-huh", -10))
    r, t = T["s1b"]
    c2 = A.clip(r, t - 0.63, t + 1.37, name="2")
    A.chunk(c2["from_"], c2["from_"] + 26, s[4], 700, 300, 90, 6)
    h = A.hold(r, t + 1.37, 18, name="2 · stamp")
    A.stamp(h["from_"], A.f, s[5], 300, 190, 5, PINK)
    A.over("vignette", h["from_"], A.f, strength=0.35)
    A.sfx.append((h["from_"], "meme:fall-bruh", -10))
    hb_from = c2["from_"]
    r, t = T["s1c"]
    c3 = A.clip(r, t - 0.43, t + 0.02, name="3")
    A.chunk(c3["from_"], c3["from_"] + 14, s[6], 700, 300, 90, -5)
    c3b = A.clip(r, t + 0.02, t + 0.97, rate=0.55, name="3 · off the table")
    h = A.hold(r, t + 1.12, 26, name="3 · stamp")
    A.stamp(c3b["from_"] + 44, A.f, s[7], 250, 160, -5, PINK)
    A.stamp(c3b["from_"] + 48, A.f, s[8], 420, 170, 4, PINK)
    A.over("vignette", c3b["from_"], A.f, strength=0.45)
    A.chunk(h["from_"], A.f, s[9], 520, 660, 60, -3, delay=4)
    A.sfx.append((c3b["from_"] + 44, "meme:fall-oidoioi", -10))
    A.music[0]["end"] = h["from_"] + 6
    r, t = T["s1d"]
    c4 = A.clip(r, t - 0.46, t + 0.04, name="4")
    A.chunk(c4["from_"], c4["from_"] + 60, s[10], 90, 1500, 140, -4)
    c4b = A.clip(r, t + 0.04, t + 0.61, rate=0.3, big=True, name="4 · slow")
    A.over("vignette", c4["from_"], A.f, strength=0.5)
    f = hb_from; step = 26
    while f < c4b["from_"] + c4b["dur"]:
        A.sfx.append((f, "heartbeat", -4)); A.over("pulse", f, f + 8); f += step; step = max(14, step - 2)
    land = A.f
    A.clip(r, t + 0.61, t + 1.24, name="4 · land")
    A.hold(r, t + 1.24, 44, name="4 · captured")
    A.over("flash", land, land + 5); A.over("shake", land, land + 8, amp=20)
    A.stamp(land, A.f, s[11], 280, 200, -5)
    A.over("paper", land + 22, A.f, t=s[12], x=None, y=1590, size=70 if lang == "vi" else 56, rot=3, delay=0)
    A.sfx += [(land, "thump_big", 0), (land + 2, "meme:capture-boom", -8), (land, "chime_found", -6), (land + 22, "sticker", -5)]
    A.music.append(dict(**GAME, start=land, end=None, gain=-12, fade_in=0.3, fade_out=20, duck_at=[]))
    A.end(CTA)
    out.append(A.done())

    # ============================================================ S2 · Ván quyết định (cliffhanger) + phần 2
    s = L["s2"]; B = Short("S2-CLIFF" + X, lang=lang)
    r, t = T["s2"]; fr = t + FREEZE[lang]
    B.music.append(dict(**GAME, start=0, end=None, gain=-16, fade_in=1, fade_out=6, duck_at=[]))
    B.clip(r, t - 1.50, t - 0.21, rate=0.72, z=(1.0, 1.05), c=(0.5, 0.4), name="last turn · slow aim")
    B.over("paper", 0, B.f, t=s[0], x=70, y=150, size=84, rot=-3, delay=0)
    B.over("sticky", 0, B.f, a=s[1], b="1 – 1", x=730, y=1430, rot=5, delay=6)
    for f in range(0, B.f, 14): B.sfx.append((f, "tick", -6))
    B.over("count", B.f - 45, B.f, t=["3", "2", "1"], y=1450)
    B.sfx += [(B.f - 45, "tick", -2), (B.f - 30, "tick", -2), (B.f - 15, "tick", -2)]
    B.clip(r, t - 0.21, t + 0.05, z=(1.05, 1.07), c=(0.5, 0.4), big=True, name="slam")
    c2 = B.clip(r, t + 0.05, fr, rate=0.22, z=(1.07, 1.07), c=(0.5, 0.36), slam=False, name="slowing down")
    B.stamp(c2["from_"], c2["from_"] + c2["dur"], s[2], 1470, 190, -8)
    B.over("shake", c2["from_"], c2["from_"] + 8, amp=18)
    B.music[0]["duck_at"].append([c2["from_"], B.f + 400, -40])
    fz = B.hold(r, fr, 100, z=(1.07, 1.1), c=(0.5, 0.36), name="freeze")
    B.over("dim", fz["from_"], B.f, strength=0.45)
    B.over("pause", fz["from_"] + 4, fz["from_"] + 36)
    B.chunk(fz["from_"] + 10, B.f, s[3], 90, 230, 140, -5)
    B.chunk(fz["from_"] + 10, B.f, s[4], 70, 1530, 100 if lang == "vi" else 90, 4, delay=12)
    B.sfx += [(fz["from_"], "sticker", -4)]
    for f in range(fz["from_"], B.f + 70, 18): B.sfx.append((f, "heartbeat", -3)); B.over("pulse", f, f + 8)
    q = B.hold(r, fr, 66, z=(1.1, 1.12), c=(0.5, 0.36), name="guess")
    B.over("dim", q["from_"], B.f, strength=0.62)
    B.stamp(q["from_"], B.f, s[5], 640, 190, -4)
    B.over("paper", q["from_"] + 10, B.f, t=s[6], x=None, y=960, size=78, rot=3, delay=0)
    B.sfx += [(q["from_"], "thump_big", -4), (q["from_"] + 10, "sticker", -5)]
    B.end(CTA)
    out.append(B.done())

    P = Short("S2-P2" + X, lang=lang)
    P.music.append(dict(**GAME, start=0, end=None, gain=-14, fade_in=1, fade_out=20, duck_at=[]))
    P.hold(r, fr, 30, z=(1.1, 1.08), c=(0.5, 0.36), name="the frozen frame again")
    P.over("dim", 0, 30, strength=0.4)
    P.over("paper", 0, 30, t=s[7], x=70, y=150, size=84, rot=-3, delay=0)
    P.chunk(0, 30, s[8], None, 1590, 76, 3, delay=4)
    P.sfx += [(0, "sticker", -4), (16, "heartbeat", -3)]
    P.music[0]["duck_at"].append([0, 30, -40])
    r1 = P.clip(r, fr, t + 0.70, rate=0.4, z=(1.08, 1.04), c=(0.5, 0.4), slam=False, name="on, slowly")
    P.sfx += [(r1["from_"], "whoosh", -6)]
    land = P.f
    P.clip(r, t + 0.70, t + 1.35, z=(1.04, 1.0), c=(0.5, 0.4), slam=False, name="lands")
    P.over("flash", land, land + 5); P.over("shake", land, land + 8, amp=18)
    P.sfx += [(land, "flip", -2), (land, "thump", -3), (land + 2, "meme:capture-boom", -8), (land, "chime_found", -6)]
    P.hold(r, t + 1.35, 60, name="captured")
    P.stamp(land, P.f, s[9], 230, 200 if lang == "vi" else 175, -5)
    P.chunk(land + 12, P.f, s[10], None, 490, 72, 4)
    P.over("paper", land + 26, P.f, t=s[11], x=None, y=1660, size=80, rot=-3, delay=0)
    P.sfx += [(land + 12, "sticker", -6), (land + 26, "msg", -6)]
    P.end(CTA)
    out.append(P.done())

    # ============================================================ S3 · Giờ ra chơi (hoài niệm)
    s = L["s3"]; C = Short("S3-RECESS" + X, lang=lang)
    C.music.append(dict(**MENU, start=0, end=None, gain=-14, fade_in=12, fade_out=24, duck_at=[]))
    PAGE = 118
    C.over("ruled", 0, PAGE, push=0.06)
    C.f = PAGE
    C.over("pen", 0, 66, t=s[0], x=200, y=190, size=84, rot=-3, write=16)
    C.chunk(12, 66, s[1], 140, 560, 150 if lang == "vi" else 140, -6)
    C.chunk(12, 66, s[2], 400 if lang == "vi" else 280, 800, 124 if lang == "vi" else 112, 4, delay=14)
    C.over("sticker", 0, 66, src="media/cut-card-tiger.png", x=150, y=1060, w=330, rot=-8, delay=34)
    C.over("sticker", 0, 66, src="media/cut-card-panda-back.png", x=580, y=1110, w=300, rot=9, delay=42)
    C.over("pen", 34, 66, t=s[3], x=200 if lang == "vi" else 120, y=1560, size=56 if lang == "vi" else 48, rot=-2, color="#e0457b", write=18)
    C.sfx += [(2, "bell", -6), (12, "sticker", -7), (26, "sticker", -7), (34, "sticker", -8), (42, "sticker", -8)]
    C.over("squash", 66, PAGE, t=s[4], y=860, size=165 if lang == "vi" else 118, hit=30)
    C.over("pen", 66, PAGE, t=s[5], x=230 if lang == "vi" else 120, y=1340, size=60 if lang == "vi" else 50, rot=-4, write=20)
    C.sfx += [(66, "sticker", -5), (66 + 20, "whoosh", -6), (66 + 30, "thump_big", 2)]
    C.music[0]["duck_at"].append([66 + 26, 66 + 44, -14])
    r, t = T["s3"]
    mc = C.f
    C.clip(r, t - 0.08, t + 0.02, slam=False, name="match-cut: the slipper comes down")
    hit = C.f
    C.clip(r, t + 0.02, t + 0.57, rate=0.45, z=(1.06, 1.02), c=(0.5, 0.4), slam=False, name="slow")
    C.sfx += [(mc, "whoosh", -10), (hit, "thump_big", 2)]
    C.over("flash", hit, hit + 4); C.over("shake", hit, hit + 8, amp=18)
    C.stamp(hit, hit + 30, s[6], 1520, 190, -8)
    C.clip(r, t + 0.57, t + 1.09, rate=0.7, slam=False, name="lands")
    land = C.f
    C.hold(r, t + 1.09, 96, name="captured")
    C.over("flash", land, land + 4)
    C.stamp(land, C.f, s[7], 220, 190 if lang == "vi" else 165, -5)
    C.chunk(land + 26, C.f, s[8], 110, 470, 92, -3)
    C.chunk(land + 26, C.f, s[9], 250 if lang == "vi" else 150, 610, 84, 3, delay=14)
    C.sfx += [(land, "flip", -3), (land, "thump", -2), (land + 2, "meme:capture-boom", -9), (land + 26, "sticker", -7)]
    C.end(CTA)
    out.append(C.done())

    # ============================================================ S4 · Dép nào mạnh nhất? (so sánh)
    s = L["s4"]; D = Short("S4-DEPS" + X, lang=lang)
    D.music.append(dict(**GAME, start=0, end=None, gain=-14, fade_in=1, fade_out=20, duck_at=[]))
    SEL = 54
    D.over("graphite", 0, SEL)
    D.chunk(0, SEL, s[0], 130 if lang == "vi" else 70, 230, 150 if lang == "vi" else 120, -6)
    D.chunk(0, SEL, s[1], 220 if lang == "vi" else 120, 420, 130 if lang == "vi" else 110, 4, delay=6)
    for i, (src, x, y, w, rot) in enumerate([("dep_lao", -110, 640, 760, -24), ("dep_le", 200, 960, 760, 6), ("dep_to_ong", 430, 620, 760, 24)]):
        D.over("cut", 0, SEL, src=f"media/cut-dep-{src}.png", x=x, y=y, w=w, rot=rot, delay=14 + i * 8, sway=3)
        D.sfx.append((14 + i * 8, "tap", -4))
    D.sfx += [(0, "thump", -6), (6, "sticker", -7)]
    D.f = SEL
    # each fighter: the card alone over the held, dimmed aim (1.7 s, enough to read), then the real slam
    for k, (role, slow, dep) in enumerate([("s4a", None, "dep_lao"), ("s4b", None, "dep_le"), ("s4c", 0.6, "dep_to_ong")]):
        r, t = T[role]; name = s[2][k]; stamp = s[4][k]
        a, b = (t - 0.28, t + 1.22) if k == 0 else (t - 0.33, t + 1.47) if k == 1 else (t - 0.46, t + 0.79)
        f0 = D.f
        card = D.hold(r, a, 50, z=(1.0, 1.03), name=name + " · card")
        D.over("dim", card["from_"], D.f, strength=0.55)
        if slow:
            D.clip(r, a, t - 0.01, name=name); D.clip(r, t - 0.01, b, rate=slow, name=name + " · slow")
        else:
            D.clip(r, a, b, name=name)
        D.hold(r, b, 14, name=name + " · " + stamp)
        D.over("stat", f0, f0 + 50, name=name, rows=s[3][k], y=700, big=True, rot=-2 if k % 2 == 0 else 2, delay=0, img=f"media/cut-dep-{dep}.png")
        D.stamp(D.f - 24, D.f, stamp, 260, 170, -6 if k != 1 else 5, PINK if k == 1 else "#FFC93C")
        D.sfx += [(f0, "sticker", -6), (D.f - 24, "tap", -3)]
    RES = D.f
    D.over("graphite", RES, RES + 66)
    D.chunk(RES, RES + 66, s[5], 110, 240, 90, -3)
    D.stamp(RES + 6, RES + 66, s[6], 380, 190 if lang == "vi" else 150, -6)
    D.chunk(RES + 18, RES + 66, s[7], 150 if lang == "vi" else 60, 700, 76 if lang == "vi" else 60, 3)
    D.over("cut", RES + 10, RES + 66, src="media/cut-dep-dep_to_ong.png", x=110, y=760, w=860, rot=14, delay=0, sway=4)
    D.over("pen", RES + 30, RES + 66, t=s[8], x=80 if lang == "vi" else 60, y=1520, size=44 if lang == "vi" else 40, rot=-2, color="#D7AF83", write=16)
    D.sfx += [(RES, "thump", -4), (RES + 6, "thump_big", -2), (RES + 6, "chime_found", -8), (RES + 18, "sticker", -7)]
    D.f = RES + 66
    TEAM = D.f
    D.over("graphite", TEAM, TEAM + 56)
    D.over("paper", TEAM, TEAM + 56, t=s[9], x=None, y=280, size=84 if lang == "vi" else 70, rot=-3, delay=0)
    for i, (src, x, y, w, rot, lx) in enumerate([("dep_lao", -120, 520, 640, -20, 120 if lang == "vi" else 40), ("dep_le", 220, 900, 640, 8, 480 if lang == "vi" else 420),
                                                 ("dep_to_ong", 520, 520, 640, 22, 690 if lang == "vi" else 580)]):
        D.over("cut", TEAM, TEAM + 56, src=f"media/cut-dep-{src}.png", x=x, y=y, w=w, rot=rot, delay=6 + i * 6, sway=3)
        D.chunk(TEAM, TEAM + 56, f"<b>{i + 1}</b> · {s[10][i]}", lx, y + 470, 70 if lang == "vi" else 60, -4 + i * 4, delay=10 + i * 6)
        D.sfx.append((6 + TEAM + i * 6, "tap", -4))
    D.sfx.append((TEAM, "sticker", -5))
    D.f = TEAM + 56
    D.end(CTA)
    out.append(D.done())

    # ============================================================ S5 · Bạn thân cấp 1 (rủ bạn)
    s = L["s5"]; E = Short("S5-FRIEND" + X, lang=lang)
    E.music.append(dict(**MENU, start=0, end=None, gain=-14, fade_in=6, fade_out=6, duck_at=[]))
    CH = 84
    E.over("graphite", 0, CH)
    E.chunk(0, CH, s[0], 110, 230, 110, -4)
    E.over("chat", 10, CH, who="teo", t=s[1], y=560)
    E.over("chat", 44, CH, who="bill", t=s[2], y=1050)
    E.over("shake", 10, 18, amp=10)
    E.sfx += [(10, "msg", -3), (44, "msg", -3), (0, "sticker", -8)]
    E.f = CH
    lob = T["lobby"]; inv_t = mark(lob, "invite"); join_t = mark(lob, "join")
    Z, CC = (1.35, 1.38), (0.5, 0.22)
    inv = E.clip(lob, inv_t - 0.48, inv_t + 1.12, z=Z, c=CC, slam=False, name="invite")
    tap = E.at(inv, inv_t)
    E.over("tap", tap - 6, tap + 10, x=540, y=621)
    E.sfx += [(tap, "tap", -2), (tap + 8, "chime_ready", -8)]
    E.over("shade", inv["from_"], inv["from_"] + inv["dur"], **{"from": 50})
    E.chunk(inv["from_"] + 14, E.f, s[3], 140, 1180, 150 if lang == "vi" else 120, -5)
    E.over("paper", inv["from_"] + 26, E.f, t=s[4], x=440 if lang == "vi" else 300, y=1420, size=84 if lang == "vi" else 70, rot=3, delay=0)
    E.sfx.append((inv["from_"] + 26, "sticker", -7))
    jn = E.clip(lob, join_t - 0.73, join_t + 0.92, z=Z, c=CC, slam=False, name="the friend is in")
    inn = E.at(jn, join_t + 0.05)
    E.over("shade", jn["from_"], jn["from_"] + jn["dur"], **{"from": 68})
    E.over("timer", jn["from_"], inn + 1, to=5, x=70, y=1470, size=150, rot=-4)
    E.over("stamp", inn + 1, E.f, t="00:05", x=70, y=1470, size=160, rot=-4, color="#FFC93C")
    E.chunk(inn + 6, E.f, s[5], 600 if lang == "vi" else 520, 1520, 86 if lang == "vi" else 62, 4)
    E.sfx += [(inn, "chime_found", -5), (inn + 6, "sticker", -7)]
    for f in range(jn["from_"], inn, 4): E.sfx.append((f, "tick", -8))
    E.music[0]["end"] = E.f; E.music[0]["fade_out"] = 3
    r, t = T["s5"]
    rv = E.clip(r, t - 0.39, t + 1.06, name="revenge")
    land = E.at(rv, t + 0.61)
    E.hold(r, t + 1.06, 40, name="revenge · captured")
    E.stamp(land, E.f, s[6], 250, 175, -5)
    E.over("flash", land, land + 4)
    E.sfx += [(land, "meme:capture-boom", -8), (land, "chime_found", -7)]
    E.music.append(dict(**GAME, start=rv["from_"], end=None, gain=-13, fade_in=1, fade_out=20, duck_at=[]))
    E.end(s[7])
    out.append(E.done())
    return out


if __name__ == "__main__":
    import sys
    langs = sys.argv[1:] or ["vi", "en"]
    built = []
    for lang in langs:
        T = VI_TAKES if lang == "vi" else en_takes()
        if lang == "en": print("English takes:", {k: (v if isinstance(v, str) else (v[0], round(v[1], 2))) for k, v in T.items()})
        built += build(VI if lang == "vi" else EN, T, lang)
    videos = [v for v, m in built]; mixes = [m for v, m in built]
    json.dump(dict(videos=videos), open(os.path.join(HERE, "edit", "src", "shorts5.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(dict(fps=FPS, videos=mixes), open(os.path.join(HERE, "mix5.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for v in videos: print(v["id"], f"{v['frames'] / FPS:.1f}s", len(v["clips"]), "clips")
