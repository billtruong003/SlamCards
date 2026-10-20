"""
Mockup frames and animatics for the launch videos, drawn from timeline.json (python render.py [stills|animatic] [SHORT|LONG]).
  stills    out/<shot>.jpg at full size (1080x1920 / 1920x1080): the frame the camera must match, for the storyboard
  animatic  out/<video>_animatic.mp4 at 2/3 size, 30 fps, every motion in place, with out/<video>_soundtrack.wav
Pictures are real captures of the game (qa/out/story); the 2D layer (type, chat, taps, share sheet, flashes, shake, the end
card) is what the edit adds on top. One type system for both videos:
  stamp  Baloo 2 Bold, cream, thick ink outline, ink drop shadow (the game's own "BỐP!" stamp), pops in with an overshoot
  head   the same letters a size down, slides up; *starred* words in the game's yellow
"""
import json, math, os, subprocess, sys
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHOTS = os.path.join(ROOT, "qa", "out", "story")
PETS = os.path.join(ROOT, "proto", "public", "pets", "thumbs")
OUT = os.path.join(HERE, "out"); os.makedirs(OUT, exist_ok=True)
FONT = os.path.join(HERE, "fonts", "Baloo2-Bold.ttf")
INK = (42, 20, 24); CREAM = (255, 251, 240); YEL = (255, 201, 60); PINK = (163, 78, 113); BLUE = (28, 113, 154)
PAPER = (246, 238, 219)
TL = json.load(open(os.path.join(HERE, "timeline.json"), encoding="utf-8"))
FPS = TL["fps"]


@lru_cache(None)
def font(px): return ImageFont.truetype(FONT, max(8, int(px)))


# the local test server's address shows in the lobby's link field: covered with the live address for the mockups
PATCH = {"p-lobby-invite": [((142, 590, 538, 678), 40)], "p-lobby-joined": [((142, 590, 538, 678), 40)],
         "d-lobby-invite": [((600, 345, 812, 383), 19)], "d-lobby-joined": [((600, 345, 812, 383), 19)]}
LIVE = "billthedevstudio.io.vn/slam…"


@lru_cache(None)
def source(key):
    im = Image.open(os.path.join(SHOTS, key + ".png")).convert("RGB")
    d = ImageDraw.Draw(im)
    for (x0, y0, x1, y1), px in PATCH.get(key, []):
        d.rectangle([x0, y0, x1, y1], fill=(255, 255, 255))
        f = font(px); d.text(((x0 + x1) / 2 - f.getlength(LIVE) / 2, (y0 + y1) / 2 - px * 0.62), LIVE, font=f, fill=INK)
    return im


@lru_cache(64)
def blurred(key, r, sc):
    im = source(key)
    small = im.resize((max(1, int(im.width * sc / 2)), max(1, int(im.height * sc / 2))), Image.BILINEAR)
    return small.filter(ImageFilter.GaussianBlur(r * sc / 2))


def view(im, W, H, zoom, cx, cy):
    """The picture filling W x H, zoomed around (cx, cy) in 0..1 of the picture, never past its edges."""
    s = max(W / im.width, H / im.height) * zoom
    w, h = W / s, H / s
    x = min(max(cx * im.width - w / 2, 0), im.width - w); y = min(max(cy * im.height - h / 2, 0), im.height - h)
    return im.resize((W, H), Image.BILINEAR, box=(x, y, x + w, y + h))


def ease_out(t): return 1 - (1 - t) ** 3


def lerp(a, b, t): return a + (b - a) * t


# ------------------------------------------------------------------ type

def words(line):
    """'Gửi *khỏi cài*' -> [('Gửi', False), ('khỏi', True), ('cài', True)]"""
    out, hl = [], False
    for w in line.split(" "):
        start = w.startswith("*"); w2 = w.strip("*") if w.count("*") else w
        if start: hl = True
        out.append((w2.replace("*", ""), hl or w.endswith("*")))
        if w.endswith("*"): hl = False
    return out


@lru_cache(256)
def type_img(t, size, hl_all, sc):
    """A stamp: cream letters, ink outline and drop shadow; starred words (or all, hl_all) in yellow."""
    px = size * sc; f = font(px); stroke = max(2, int(px * 0.09)); shadow = max(2, int(px * 0.07))
    lines = [words(l) for l in t.split("\n")]
    space = f.getlength(" ")
    widths = [sum(f.getlength(w) for w, _ in l) + space * (len(l) - 1) for l in lines]
    lh = px * 1.02
    Wd = int(max(widths) + stroke * 2 + 8); Hd = int(lh * len(lines) + px * 0.35 + stroke * 2 + shadow)
    im = Image.new("RGBA", (Wd, Hd), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for pass_ in ("shadow", "fill"):
        for i, l in enumerate(lines):
            x = (Wd - widths[i]) / 2; y = stroke + i * lh
            for w, hl in l:
                if pass_ == "shadow":
                    d.text((x, y + shadow), w, font=f, fill=INK, stroke_width=stroke, stroke_fill=INK)
                else:
                    d.text((x, y), w, font=f, fill=YEL if (hl or hl_all) else CREAM, stroke_width=stroke, stroke_fill=INK)
                x += f.getlength(w) + space
    return im


@lru_cache(64)
def scrim(w, h, sc):
    pad = int(60 * sc)
    im = Image.new("RGBA", (w + pad * 4, h + pad * 3), (0, 0, 0, 0))
    ImageDraw.Draw(im).rounded_rectangle([pad * 2, pad * 1.5, w + pad * 2, h + pad * 1.5], int(40 * sc), fill=INK + (170,))
    return im.filter(ImageFilter.GaussianBlur(pad * 0.6))


def place(fr, im, cx, cy, scale=1.0, rot=0.0, alpha=1.0):
    if scale != 1.0: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BILINEAR)
    if rot: im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1:
        a = im.getchannel("A").point(lambda v: int(v * alpha)); im = im.copy(); im.putalpha(a)
    fr.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


def draw_text(fr, tx, f, W, H, sc):
    if not (tx["at"] <= f < tx["until"]): return
    k = f - tx["at"]; left = tx["until"] - f
    im = type_img(tx["t"], tx["size"], bool(tx.get("hl")), sc)
    cx, cy = W / 2, tx["y"] * H
    out = min(1.0, left / 4) if left < 4 else 1.0
    if tx["style"] == "stamp":
        s = 1.45 - 0.55 * ease_out(min(k / 5, 1)) if k < 5 else 0.9 + 0.1 * math.cos(min((k - 5) / 5, 1) * math.pi) * -1 + 0.0
        s = {0: 1.45, 1: 1.25, 2: 1.08, 3: 0.97, 4: 0.95, 5: 0.98, 6: 1.0}.get(k, 1.0)
        place(fr, im, cx, cy, scale=s * (0.92 + 0.08 * out), rot=tx.get("tilt", 0), alpha=min(1, (k + 1) / 2) * out)
    else:
        t = ease_out(min(k / 7, 1))
        # a soft ink band behind the line so it reads over any game screen
        band = scrim(im.width, im.height, sc)
        place(fr, band, cx, cy + (1 - t) * 40 * sc, alpha=t * out * 0.75)
        place(fr, im, cx, cy + (1 - t) * 40 * sc, alpha=t * out)


# ------------------------------------------------------------------ chat, taps, share sheet, split, end card

@lru_cache(None)
def avatar(who, px):
    pet = {"teo": "panda", "bill": "tiger"}[who]
    a = Image.open(os.path.join(PETS, pet + ".png")).convert("RGBA").resize((px, px), Image.LANCZOS)
    disc = Image.new("RGBA", (px + 8, px + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(disc)
    d.ellipse([0, 0, px + 7, px + 7], fill=(BLUE if who == "teo" else PINK) + (255,), outline=INK + (255,), width=4)
    disc.alpha_composite(a, (4, 4))
    return disc


@lru_cache(64)
def bubble(who, t, maxw, sc, portrait_hint=True):
    px = (60 if portrait_hint else 54) * sc; f = font(px); pad = 28 * sc
    ws, lines, cur = t.split(" "), [], ""
    for w in ws:
        test = (cur + " " + w).strip()
        if f.getlength(test) > maxw * sc - pad * 2 and cur: lines.append(cur); cur = w
        else: cur = test
    lines.append(cur)
    tw = max(f.getlength(l) for l in lines); lh = px * 1.18
    bw, bh = int(tw + pad * 2), int(lh * len(lines) + pad * 1.4)
    name_h = int(44 * sc)
    im = Image.new("RGBA", (bw + 10, bh + name_h + 10), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    mine = who == "bill"
    fill = PINK if mine else CREAM
    d.rounded_rectangle([4, name_h + 8, bw + 4, bh + name_h + 8], 30 * sc, fill=INK)
    d.rounded_rectangle([0, name_h, bw, bh + name_h], 30 * sc, fill=fill, outline=INK, width=max(2, int(5 * sc)))
    nm = "Tèo" if who == "teo" else "Bill"; fn = font(34 * sc)
    d.text((pad * 0.6 if not mine else bw - pad * 0.6 - fn.getlength(nm), 0), nm, font=fn, fill=CREAM, stroke_width=max(2, int(4 * sc)), stroke_fill=INK)
    for i, l in enumerate(lines):
        d.text((pad, name_h + pad * 0.55 + i * lh), l, font=f, fill=(255, 255, 255) if mine else INK)
    return im


def draw_chat(fr, chat, f, W, H, sc):
    if f >= chat.get("until", 10 ** 9): return
    portrait = H > W
    colw = (W * 0.86) if portrait else (W * 0.5)
    x0 = (W - colw) / 2 if portrait or chat.get("side") != "right" else W - colw - 60 * sc
    if not portrait and chat.get("side") != "right": x0 = (W - colw) / 2
    y = H * (0.3 if portrait else 0.16)
    av = int((124 if portrait else 112) * sc)
    for m in chat["msgs"]:
        if f < m["at"]: break
        k = f - m["at"]
        b = bubble(m["who"], m["t"], int(colw / sc - av / sc - 40), sc, portrait)
        s = {0: 0.6, 1: 0.85, 2: 1.04, 3: 1.0}.get(k, 1.0); a = min(1, (k + 1) / 2)
        mine = m["who"] == "bill"
        ax = x0 + (colw - av / 2 - 8 * sc if mine else av / 2)
        bx = x0 + (colw - av - 16 * sc - b.width / 2 if mine else av + 16 * sc + b.width / 2)
        place(fr, avatar(m["who"], av), ax, y + b.height - av / 2, scale=s, alpha=a)
        place(fr, b, bx, y + b.height / 2, scale=s, alpha=a)
        y += b.height + 36 * sc


def draw_tap(fr, tp, f, W, H, sc):
    k = f - tp["at"]
    if not (-5 <= k < 10): return
    d = ImageDraw.Draw(fr); x, y = tp["x"] * W, tp["y"] * H
    r = 34 * sc
    if k < 4:
        a = int(200 * (1 - max(0, k) / 4) if k >= 0 else 200)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a), outline=INK + (a,), width=max(2, int(5 * sc)))
    if k >= 0:
        R = r + k * 9 * sc; a = int(255 * (1 - k / 10))
        d.ellipse([x - R, y - R, x + R, y + R], outline=(255, 255, 255, a), width=max(2, int(7 * sc)))


def draw_share(fr, sh, f, W, H, sc):
    if not (sh["at"] <= f < sh["until"]): return
    k = f - sh["at"]; t = ease_out(min(k / 6, 1))
    hh = 520 * sc; top = H - hh * t
    dim = Image.new("RGBA", fr.size, (0, 0, 0, int(90 * t))); fr.alpha_composite(dim)
    d = ImageDraw.Draw(fr)
    d.rounded_rectangle([0, top, W, H + 40 * sc], 44 * sc, fill=(250, 250, 250, 255))
    d.rounded_rectangle([W / 2 - 60 * sc, top + 18 * sc, W / 2 + 60 * sc, top + 28 * sc], 6 * sc, fill=(200, 200, 200, 255))
    d.text((60 * sc, top + 52 * sc), "Chia sẻ link phòng", font=font(44 * sc), fill=(30, 30, 30, 255))
    apps = [("Zalo", (0, 104, 255)), ("Messenger", (160, 51, 255)), ("Tin nhắn", (52, 199, 89)), ("Copy", (142, 142, 147))]
    for i, (name, col) in enumerate(apps):
        cx = W * (0.17 + i * 0.22); cy = top + 220 * sc
        d.rounded_rectangle([cx - 62 * sc, cy - 62 * sc, cx + 62 * sc, cy + 62 * sc], 30 * sc, fill=col + (255,))
        f2 = font(30 * sc); d.text((cx - f2.getlength(name) / 2, cy + 76 * sc), name, font=f2, fill=(40, 40, 40, 255))


def frame_in(im, W, H, x, y, w, h, radius, sc):
    """A picture in a rounded ink frame (used for the split screen)."""
    pic = view(im, int(w), int(h), 1.0, 0.5, 0.5).convert("RGBA")
    mask = Image.new("L", pic.size, 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, pic.width - 1, pic.height - 1], radius, fill=255)
    return pic, mask


def draw_split(fr, sp, f, W, H, sc):
    if f < sp["at"]: return
    k = f - sp["at"]; t = ease_out(min(k / 8, 1))
    fr.paste(Image.new("RGBA", fr.size, PAPER + (255,)))
    d = ImageDraw.Draw(fr)
    lw, lh = W * 0.6, W * 0.6 * 9 / 16; lx, ly = W * 0.05 - (1 - t) * 200 * sc, (H - lh) / 2 - 40 * sc
    ph_h = H * 0.78; ph_w = ph_h * 9 / 16; px_, py = W * 0.7 + (1 - t) * 200 * sc, (H - ph_h) / 2 - 40 * sc
    for (key, x, y, w, h, r) in ((sp["left"], lx, ly, lw, lh, 22 * sc), (sp["right"], px_, py, ph_w, ph_h, 40 * sc)):
        d.rounded_rectangle([x + 8 * sc, y + 10 * sc, x + w + 8 * sc, y + h + 10 * sc], r, fill=INK)
        pic, mask = frame_in(source(key), W, H, x, y, w, h, r, sc)
        fr.paste(pic, (int(x), int(y)), mask)
        d.rounded_rectangle([x, y, x + w, y + h], r, outline=INK, width=max(3, int(8 * sc)))
    f2 = font(34 * sc)
    for label, x, w in (("Bill · máy tính", lx, lw), ("Tèo · điện thoại", px_, ph_w)):
        d.text((x + w / 2 - f2.getlength(label) / 2, ly + lh + 30 * sc if x == lx else py - 52 * sc), label, font=f2, fill=INK)


def draw_end(fr, en, f, W, H, sc):
    k = f - en["at"]
    if k < 0: return
    portrait = H > W
    base = H * (0.36 if portrait else 0.34)
    def pop(kk): return {0: 1.4, 1: 1.2, 2: 1.05, 3: 0.97}.get(kk, 1.0)
    title = type_img("Dép Lào\nTuổi Thơ", 170 if portrait else 150, False, sc)
    place(fr, title, W / 2, base, scale=pop(k), rot=-3)
    if k >= 6:
        sub = type_img("chơi *free* trên web", 70 if portrait else 60, False, sc)
        place(fr, sub, W / 2, base + title.height / 2 + 70 * sc, scale=pop(k - 6))
    if k >= 10:
        url = "billthedevstudio.io.vn/slam-cards"; f2 = font((44 if portrait else 40) * sc)
        w = f2.getlength(url) + 60 * sc; h = 84 * sc; y = base + title.height / 2 + 190 * sc
        pill = Image.new("RGBA", (int(w + 10 * sc), int(h + 10 * sc)), (0, 0, 0, 0)); d = ImageDraw.Draw(pill)
        d.rounded_rectangle([6 * sc, 8 * sc, w + 6 * sc, h + 8 * sc], h / 2, fill=INK)
        d.rounded_rectangle([0, 0, w, h], h / 2, fill=PINK, outline=INK, width=max(2, int(5 * sc)))
        d.text((30 * sc, h / 2 - f2.size * 0.62), url, font=f2, fill=(255, 255, 255))
        place(fr, pill, W / 2, y, scale=pop(k - 10))
    if k >= 16:
        f3 = font((40 if portrait else 34) * sc); d = ImageDraw.Draw(fr)
        for i, l in enumerate(["Ý tưởng game: ThuanBui (David)", "Làm game: BillTheDev"]):
            y = base + title.height / 2 + (300 + i * 56) * sc
            d.text((W / 2 - f3.getlength(l) / 2, y), l, font=f3, fill=CREAM, stroke_width=max(2, int(4 * sc)), stroke_fill=INK)


# ------------------------------------------------------------------ one frame

def render_frame(v, f, sc):
    W, H = int(v["W"] * sc), int(v["H"] * sc)
    shot = max((s for s in v["shots"] if s["start"] <= f), key=lambda s: s["start"])
    pics = [p for p in shot["pics"] if p["start"] <= f < p["end"]] or [shot["pics"][-1]]
    p = pics[0]
    t = (f - p["start"]) / max(1, p["end"] - p["start"])
    z = lerp(p["z"][0], p["z"][1], ease_out(t) if p["z"][0] > p["z"][1] else t)
    dx = dy = 0
    for at, n, amp in shot.get("shake", []):
        if at <= f < at + n:
            k = f - at; fall = 1 - k / n
            dx = ((-1) ** k) * amp * fall * sc; dy = ((-1) ** (k // 2)) * amp * 0.7 * fall * sc
    if p.get("blur"):
        im = blurred(p["key"], p["blur"], sc)
        fr = view(im, W, H, z, p["c"][0], p["c"][1])
    else:
        fr = view(source(p["key"]), W, H, z, p["c"][0] + dx / W / z, p["c"][1] + dy / H / z)
    fr = fr.convert("RGBA")
    if p.get("dim"): fr.alpha_composite(Image.new("RGBA", fr.size, (20, 10, 12, int(255 * p["dim"]))))
    if "split" in shot: draw_split(fr, shot["split"], f, W, H, sc)
    if "chat" in shot: draw_chat(fr, shot["chat"], f, W, H, sc)
    if "share" in shot: draw_share(fr, shot["share"], f, W, H, sc)
    for tp in shot.get("taps", []): draw_tap(fr, tp, f, W, H, sc)
    for tx in shot.get("texts", []): draw_text(fr, tx, f, W, H, sc)
    if "endcard" in shot: draw_end(fr, shot["endcard"], f, W, H, sc)
    for at in shot.get("flash", []):
        if at <= f < at + 4: fr.alpha_composite(Image.new("RGBA", fr.size, (255, 255, 255, int(220 * (1 - (f - at) / 4)))))
    return fr.convert("RGB")


def key_frame(shot):
    """The frame a still shows: where the shot's main beat has landed (its first text, or 60% in)."""
    tx = shot.get("texts") or []
    if shot.get("still"): return shot["still"]
    if shot.get("endcard"): return shot["endcard"]["at"] + 24
    if shot.get("chat") and not tx: return max(m["at"] for m in shot["chat"]["msgs"]) + 6
    if tx: return min(tx[0]["at"] + 8, tx[0]["until"] - 1)
    return int(shot["start"] + (shot["end"] - shot["start"]) * 0.6)


def stills(v):
    for s in v["shots"]:
        render_frame(v, key_frame(s), 1.0).save(os.path.join(OUT, f"{s['id']}.jpg"), quality=90)
    print(v["id"], "stills ->", OUT)


def animatic(v, sc=2 / 3):
    W, H = int(v["W"] * sc), int(v["H"] * sc)
    path = os.path.join(OUT, f"{v['id']}_animatic.mp4")
    snd = os.path.join(OUT, f"{v['id']}_soundtrack.wav")
    args = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if os.path.exists(snd): args += ["-i", snd, "-c:a", "aac", "-b:a", "160k", "-shortest"]
    args += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "medium", "-movflags", "+faststart", path]
    enc = subprocess.Popen(args, stdin=subprocess.PIPE)
    for f in range(v["frames"]):
        enc.stdin.write(render_frame(v, f, sc).tobytes())
    enc.stdin.close(); enc.wait()
    print(v["id"], "->", path, f"{os.path.getsize(path) / 1e6:.1f} MB")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "stills"
    only = sys.argv[2] if len(sys.argv) > 2 else None
    for v in TL["videos"]:
        if only and v["id"] != only: continue
        (stills if what == "stills" else animatic)(v)
