"""
Green key -> alpha for the MV cut-outs: qa/out/mv-cutouts/*.png -> video/edit/public/mv/pets/*.png (cropped to the pet,
green spill pulled out of the edges). python video/mv/key.py
"""
import glob, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "qa", "out", "mv-cutouts")
OUT = os.path.join(HERE, "..", "edit", "public", "mv", "pets")
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    a = np.asarray(Image.open(f).convert("RGB")).astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # how much greener than the other two channels: 0 on the pet, ~1 on the key
    spill = np.clip(g - np.maximum(r, b), 0, 1)
    alpha = np.clip(1 - (spill - 0.08) / 0.45, 0, 1)
    g2 = np.minimum(g, np.maximum(r, b))            # despill: green never above the other two
    rgb = np.stack([r, np.where(spill > 0.02, g2, g), b], -1)
    img = Image.fromarray((np.dstack([rgb, alpha]) * 255).astype(np.uint8), "RGBA")
    box = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        pad = 12
        box = (max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad))
        img = img.crop(box)
    img.thumbnail((900, 900))
    img.save(os.path.join(OUT, os.path.basename(f)))
print(len(glob.glob(os.path.join(OUT, "*.png"))), "cut-outs in", OUT)
