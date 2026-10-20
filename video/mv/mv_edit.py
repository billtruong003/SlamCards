"""
The "Super Hero" MV mockup: chorus 1 of Bá Hưng x SR x Hoaprox (song 46.8 s → 62.8 s), cut from the filmed takes
qa/out/film/mv-T1..T4 (qa/capture/mv-takes.mjs). Writes ../edit/src/mv.json for MV.tsx:
  clips   footage in song order, each cut snapped to the song's beat grid (beats.json, librosa)
  words   every sung word in the window with its time (lyrics.json, word-timed), grouped into lines
  hits    the slam's thump (the take's events.json) placed on a word
Times in mv.json are seconds from the start of the video. The song itself stays out of git (public/mv/, ignored).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.join(HERE, "..", "..", "qa", "out", "film")
A, B = 46.8, 62.8                      # the window of the song
beats = json.load(open(os.path.join(HERE, "beats.json")))["beats"]
lyr = json.load(open(os.path.join(HERE, "lyrics.json"), encoding="utf-8"))


def snap(t):
    return min(beats, key=lambda b: abs(b - t))


def dur(take):
    return json.load(open(os.path.join(FILM, take, "events.json")))["duration"]


# words of the window, then lines: a new line after "." (the transcript's sentence ends) and before "anh hùng"
words = [w for s in lyr["segments"] for w in s["words"] if w["text"].strip() and not w["text"].startswith("[")]
words = [w for w in words if A <= w["start_time"] < B]
lines, cur = [], []
for w in words:
    if cur and w["text"].lower() == "anh" and cur[-1]["text"].lower() == "mong":
        lines.append(cur); cur = []
    cur.append(w)
    if w["text"].endswith("."):
        lines.append(cur); cur = []
if cur: lines.append(cur)
line_out = []
for ln in lines:
    line_out.append({
        "from_": round(ln[0]["start_time"] - A, 3), "to": round(ln[-1]["end_time"] - A, 3),
        "words": [{"t": round(w["start_time"] - A, 3), "e": round(w["end_time"] - A, 3), "w": w["text"].rstrip(".,")} for w in ln],
    })
for i, ln in enumerate(line_out):           # a line stays up until the next one starts (or 0.6 s after its last word)
    nxt = line_out[i + 1]["from_"] if i + 1 < len(line_out) else B - A
    ln["to"] = round(min(nxt, ln["to"] + 0.6), 3)

word_at = lambda text, after=0: next(w for w in words if w["text"].lower().startswith(text) and w["start_time"] - A >= after)

# the cut: T1 pop-out → T2 the slam (its thump on "Giải") → T3 the dive (the space on "Hãy") → T4 the pull back
hit_word = word_at("giải")["start_time"] - A
t2_rate, t2_hit = 0.6, 0.402
c2 = snap(A + hit_word - t2_hit / t2_rate) - A
t3_in = 1.6
c3 = snap(word_at("hãy")["start_time"] - (2.9 - t3_in)) - A
c4 = snap(A + c3 + (dur("mv-T3") - t3_in)) - A
end = B - A
clips = [
    {"src": "footage/mv-T1.mp4", "from_": 0, "dur": round(c2, 3), "t_in": 0.15, "rate": 1.0},
    {"src": "footage/mv-T2.mp4", "from_": round(c2, 3), "dur": round(c3 - c2, 3), "t_in": 0.0, "rate": t2_rate},
    {"src": "footage/mv-T3.mp4", "from_": round(c3, 3), "dur": round(c4 - c3, 3), "t_in": t3_in, "rate": 1.0},
    {"src": "footage/mv-T4.mp4", "from_": round(c4, 3), "dur": round(end - c4, 3), "t_in": 0.0,
     "rate": round(dur("mv-T4") / (end - c4), 3)},
]
hit = round(c2 + t2_hit / t2_rate, 3)
supers = [round(w["start_time"] - A, 3) for w in words if w["text"].lower().startswith("superhero")]
out = {
    "id": "MV-CHORUS1", "W": 1920, "H": 1080, "fps": 60, "dur": end, "song_from": A,
    "clips": clips, "lines": line_out, "hit": hit, "supers": supers,
    "beats": [round(b - A, 3) for b in beats if A <= b < B],
    "hero": {"from_": 0.9, "to": round(c2, 3), "name": "HỔ", "tag": "Chiến thần dép lào"},
    "title": {"from_": round(end - 2.4, 3), "to": end},
}
json.dump(out, open(os.path.join(HERE, "..", "edit", "src", "mv.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("cuts", [c["from_"] for c in clips], "hit", hit, "supers", supers, "lines", len(line_out))
