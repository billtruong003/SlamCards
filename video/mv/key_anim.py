"""
Green key -> alpha for the MV's animated cut-outs: qa/out/mv-anim/<pet>-<pose>/NN.png -> video/edit/public/mv/anim/<pet>-<pose>/NN.webp
Every frame of a loop is cropped to the loop's union box (so the pet never jumps), and a manifest of frame counts is written to
video/edit/src/mvanim.json for the Pet component. python video/mv/key_anim.py
"""
import glob, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "qa", "out", "mv-anim2")
OUT = os.path.join(HERE, "..", "edit", "public", "mv", "anim")
MAX_H = 900
LINE = 9  # silhouette line width at MAX_H (px), ink #241418: the clean outline instead of the game's hull


def key(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = np.clip(g - np.maximum(r, b), 0, 1)
    alpha = np.clip(1 - (spill - 0.08) / 0.45, 0, 1)
    g2 = np.where(spill > 0.02, np.minimum(g, np.maximum(r, b)), g)
    return Image.fromarray((np.dstack([r, g2, b, alpha]) * 255).astype(np.uint8), "RGBA")


def silhouette(img):
    from scipy import ndimage
    pad = LINE + 2
    big = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0)); big.paste(img, (pad, pad))
    a = np.asarray(big)[..., 3].astype(np.float32) / 255
    yy, xx = np.mgrid[-LINE:LINE + 1, -LINE:LINE + 1]
    ring = ndimage.grey_dilation(a, footprint=(xx * xx + yy * yy) <= LINE * LINE)
    ink = Image.new("RGBA", big.size, (36, 20, 24, 0)); ink.putalpha(Image.fromarray((np.clip(ring, 0, 1) * 255).astype(np.uint8)))
    ink.alpha_composite(big)
    return ink


manifest = {}
for d in sorted(glob.glob(os.path.join(SRC, "*-*"))):
    frames = [key(f) for f in sorted(glob.glob(os.path.join(d, "*.png")))]
    if not frames:
        continue
    boxes = [f.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox() for f in frames]
    boxes = [b for b in boxes if b]
    box = (min(b[0] for b in boxes) - 8, min(b[1] for b in boxes) - 8, max(b[2] for b in boxes) + 8, max(b[3] for b in boxes) + 8)
    name = os.path.basename(d)
    od = os.path.join(OUT, name)
    os.makedirs(od, exist_ok=True)
    for k, f in enumerate(frames):
        c = f.crop(box)
        if c.height > MAX_H:
            c = c.resize((round(c.width * MAX_H / c.height), MAX_H), Image.LANCZOS)
        c = silhouette(c)
        c.save(os.path.join(od, f"{k:02d}.webp"), quality=86)
    manifest[name] = len(frames)
json.dump(manifest, open(os.path.join(HERE, "..", "edit", "src", "mvanim.json"), "w"), indent=0)
print(len(manifest), "loops,", sum(manifest.values()), "frames")
