"""
A filmed take -> footage the edit can use (python qa/capture/assemble.py qa/out/film/<take>):
  footage.mp4   constant 60 fps H.264 (FPS=30 for the old takes) (each screencast frame held until the next one, as the screen showed it)
  events.json   the take's sounds and marks in seconds from the footage's first frame
  sheet.jpg     one frame every 0.5 s (to choose the cuts)
"""
import json, os, subprocess, sys

FPS = int(os.environ.get("FPS", 60))

d = sys.argv[1]
take = json.load(open(os.path.join(d, "take.json"), encoding="utf-8"))
frames = take["frames"]
t0 = frames[0]["t"]
# constant frame rate, each output frame shows the last screencast frame taken by its time (held until the next,
# as the screen showed it). The JPEGs are piped in at exactly FPS: the concat demuxer rounded every hold to 1/25 s,
# which made an even capture judder.
w, h = take["size"]
ts = [(f["t"] - t0) / 1000 for f in frames]
n_out = int(ts[-1] * FPS) + 1
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
                        "-vf", f"scale={w - w % 2}:{h - h % 2}", "-c:v", "libx264", "-crf", "16", "-preset", "medium",
                        "-pix_fmt", "yuv420p", os.path.join(d, "footage.mp4")], stdin=subprocess.PIPE)
j = 0; cache = (None, None)
for k in range(n_out):
    t = k / FPS
    while j + 1 < len(ts) and ts[j + 1] <= t: j += 1
    if cache[0] != j: cache = (j, open(os.path.join(d, "frames", frames[j]["file"]), "rb").read())
    enc.stdin.write(cache[1])
enc.stdin.close(); enc.wait()
rel = lambda t: round((t - t0) / 1000, 3)
ev = {"duration": rel(frames[-1]["t"]), "size": take["size"],
      "sounds": [{**s, "t": rel(s["t"])} for s in take["sounds"]],
      "marks": [{**m, "t": rel(m["t"])} for m in take["marks"]]}
json.dump(ev, open(os.path.join(d, "events.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
tw = 270 if h > w else 384
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(d, "footage.mp4"), "-vf", f"fps=2,scale={tw}:-2,tile=12x{max(1, int(ev['duration'] * 2 / 12) + 1)}",
                "-frames:v", "1", os.path.join(d, "sheet.jpg")], check=True)
print(d, f"{ev['duration']:.1f}s", len(ev["sounds"]), "sounds", len(ev["marks"]), "marks")
