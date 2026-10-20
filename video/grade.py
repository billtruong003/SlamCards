"""
The last pass of the launch videos: colour and finish (python grade.py [short|long] [--stills]).

1. Range: Remotion writes full-range JPEG colour (yuvj420p, BT.601) and most players and the social apps read video as
   limited-range BT.709, which blows the cream table and the white cards out and crushes the ink. Everything is read
   as what it is and written as limited-range BT.709, tagged.
2. Detail: a copy sharpened hard, then softened a little, multiplied over the picture at low opacity: edges and the
   ink lines gain weight and the flat bright areas lose their glare (Bill's trick).
3. Levels on the luma, then a light luma sharpen: whites pulled down, a gentle S in the mids, blacks kept; the colours keep their hue.
Reads out/build/<name>.mp4 (Remotion), writes out/final/<name>.mp4 (audio copied) and out/build/<name>_grade_check.jpg: before/after, in colour and in grey, with
the luma numbers, to judge contrast on the black-and-white view.
"""
import json, os, re, statistics, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "build")
FINAL = os.path.join(HERE, "out", "final"); os.makedirs(FINAL, exist_ok=True)
SHARP = "unsharp=7:7:2.2:7:7:2.2"         # the hard-sharpened copy (all three RGB planes alike)
SOFT = "gblur=sigma=1.4"                  # ...softened a little
MULT = 0.18                               # multiplied over the picture at this opacity
# levels on the luma only (per-channel RGB curves squeezed the warm cream towards grey-green): a gentle S, whites to
# 95.5%, blacks just off zero; the chroma planes are left alone so the game's colours keep their hue
LEVELS = "255*(0.012+0.943*if(lt(min(val,255)/255,0.5),0.5*pow(2*min(val,255)/255,1.1),1-0.5*pow(2-2*min(val,255)/255,1.1)))"


def chain():
    return (
        # read the full-range BT.601 picture as RGB
        "scale=in_range=pc:in_color_matrix=bt601,format=gbrp,split=2[base][s];"
        f"[s]{SHARP},{SOFT}[detail];"
        f"[base][detail]blend=all_mode=multiply:all_opacity={MULT},"
        f"scale=out_range=pc:out_color_matrix=bt709,format=yuv444p,lutyuv=y='{LEVELS.replace(',', chr(92) + ',')}',"
        # out as limited-range BT.709
        "unsharp=5:5:0.55:5:5:0,scale=in_range=pc:in_color_matrix=bt709:out_range=tv:out_color_matrix=bt709,format=yuv420p"
    )


def stats(path, extra=""):
    vf = (extra + "," if extra else "") + "fps=2,signalstats,metadata=print:file=-"
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", vf, "-f", "null", "-"], capture_output=True, text=True, errors="ignore").stdout
    d = {}
    for k, v in re.findall(r"lavfi\.signalstats\.(\w+)=([\d.]+)", r):
        d.setdefault(k, []).append(float(v))
    return {k: round(statistics.mean(d[k]), 1) for k in ("YLOW", "YAVG", "YHIGH", "YMAX", "SATAVG") if k in d}


def check_sheet(src, graded, name, times):
    """Before | after, colour and grey, a frame per row."""
    from PIL import Image, ImageDraw, ImageFont
    rows = []
    for t in times:
        pair = []
        for path, conv in ((src, "scale=in_range=pc:in_color_matrix=bt601"), (graded, "scale=in_range=tv:in_color_matrix=bt709")):
            raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", path, "-frames:v", "1", "-vf", conv + ",format=rgb24",
                                  "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
            import io
            pair.append(Image.open(io.BytesIO(raw)).convert("RGB"))
        w = 360 if pair[0].height > pair[0].width else 560
        h = round(pair[0].height * w / pair[0].width)
        row = Image.new("RGB", (w * 4, h))
        for i, im in enumerate(pair):
            im = im.resize((w, h))
            row.paste(im, (i * w, 0)); row.paste(im.convert("L").convert("RGB"), ((i + 2) * w, 0))
        rows.append(row)
    sheet = Image.new("RGB", (rows[0].width, sum(r.height for r in rows) + 40), "white")
    d = ImageDraw.Draw(sheet); f = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
    for i, lab in enumerate(["before", "after", "before (grey)", "after (grey)"]):
        d.text((i * rows[0].width // 4 + 8, 8), lab, font=f, fill="black")
    y = 40
    for r in rows: sheet.paste(r, (0, y)); y += r.height
    sheet.save(os.path.join(OUT, f"{name}_grade_check.jpg"), quality=88)


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "short"
    src = os.path.join(OUT, f"{name}.mp4"); dst = os.path.join(FINAL, f"{name.lower()}.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", chain(), "-c:v", "libx264", "-crf", "17", "-preset", "slow",
                    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
                    "-c:a", "copy", "-movflags", "+faststart", dst], check=True)
    before = stats(src, "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709")
    after = stats(dst)
    print(name, "before (as limited)", before)
    print(name, "after              ", after)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True).stdout)
    check_sheet(src, dst, name, [round(dur * k, 2) for k in (0.03, 0.2, 0.4, 0.6, 0.93)])
