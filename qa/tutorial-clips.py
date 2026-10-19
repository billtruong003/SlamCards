"""The tutorial clips (task 1.11): cut from takes filmed in the real game, without captions.

The game draws the captions itself, in the player's language, at the times listed in
proto/src/tutorial.js (STEPS cues). Change a cut here and the times there move with it.

    python qa/tutorial-clips.py <takes folder>

The takes folder holds one folder per take (near2, cap, off, types-side, wind, timeout2), each with
its footage.mp4 (1200x900, 60 fps), filmed with the posed slams of the video rig. Output, in
proto/public/tutorial/: 600x450 H.264 MP4s (muted, fast start), the same in VP9 WebM for browsers
without H.264 (open-source Chromium builds), and a poster frame for each.
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "proto", "public", "tutorial")
TAKES = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

# 600x450 in TV range (the capture is full range JPEG colour, which some phones show washed out)
FINISH = "fps=30,scale=600:450:flags=lanczos:out_range=tv,format=yuv420p"
H264 = ["-an", "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-profile:v", "high", "-movflags", "+faststart"]


def take(name):
    return os.path.join(TAKES, name, "footage.mp4")


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def extras(name, at):
    """From the MP4: the poster frame at `at` seconds, and the WebM copy."""
    mp4 = os.path.join(OUT, name + ".mp4")
    run(["-ss", str(at), "-i", mp4, "-frames:v", "1", "-q:v", "6", os.path.join(OUT, name + ".jpg")])
    run(["-i", mp4, "-an", "-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-deadline", "good", os.path.join(OUT, name + ".webm")])


def cut(name, src, start, dur, poster_at=0.0):
    run(["-ss", str(start), "-i", take(src), "-t", str(dur), "-vf", FINISH, *H264, os.path.join(OUT, name + ".mp4")])
    extras(name, poster_at)


# step 1: a far slam does nothing, a close one flips the card
cut("1-close", "near2", 22.6, 6.9)
# step 2: my card lands face up on the enemy's face-down one
cut("2-capture", "cap", 24.5, 4.6)
# step 3: a hard slam by the edge sends the card off the table
cut("3-fall", "off", 0.38, 4.4)
# step 4: two timeouts in a row; the clock sped up 2.5x until the second one, then the result as it was
run(["-i", take("timeout2"), "-filter_complex",
     "[0:v]crop=900:675:150:0,split[a][b];[a]trim=0:16.05,setpts=(PTS-STARTPTS)/2.5[s1];"
     f"[b]trim=17.55:20.3,setpts=PTS-STARTPTS[s2];[s1][s2]concat=n=2:v=1,{FINISH}[v]",
     "-map", "[v]", *H264, os.path.join(OUT, "4-timeout.mp4")])
extras("4-timeout", 0.2)
# step 5: flat (flies high, lands face down) then tilt (skims low, lands face up), side view
cut("5-types", "types-side", 0.8, 7.8)
# step 6: the same slam without wind, then with wind 4
cut("6-wind", "wind", 0.3, 8.3)
# step 7: after a pass the next turn must land in the small pink ring
run(["-ss", "9.6", "-t", "6.2", "-i", take("timeout2"), "-filter_complex",
     f"[0:v]crop=900:675:0:0,setpts=PTS/1.4,{FINISH}[v]", "-map", "[v]", *H264, os.path.join(OUT, "7-forced.mp4")])
extras("7-forced", 2.6)

for f in sorted(os.listdir(OUT)):
    print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, "KB")
