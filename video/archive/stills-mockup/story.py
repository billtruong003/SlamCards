"""
The two launch videos, written in beats (python story.py -> timeline.json, the one source for render.py and audio_mix.py).

Story: two friends from primary school. Tèo once won Bill's best card at "dích hình" (the schoolyard game this one comes
from); fifteen years later Tèo brings it up in chat, Bill sends a link, revenge, Bill gets cocky and slams the card off
the table, "one more round". The rules are never explained in words: the first two seconds show them.

Music (the game's own loops, Bill: free to use): game-loop.mp3 130 BPM (first kick 0.251 s), menu-loop.mp3 145 BPM
(first kick 0.230 s). Every cut, slam and stamp sits on a beat of the track playing under it.
Pictures: keys of qa/out/story/<key>.png (real captures from the game, qa/capture/capture-story.mjs + capture-stage.mjs).
Frames at 30 fps; design pixels 1080x1920 (SHORT) and 1920x1080 (LONG).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
GAME = dict(id="game-loop", bpm=130.0, kick=0.251)
MENU = dict(id="menu-loop", bpm=145.0, kick=0.230)


def grid(track, start):
    """Frame of beat k when `track` comes in with its first kick on frame `start`."""
    period = 60 / track["bpm"] * FPS
    return lambda k: round(start + period * k)


def pic(key, a, b, z=(1.0, 1.04), c=(0.5, 0.5), **kw):
    return dict(key=key, start=a, end=b, z=list(z), c=list(c), **kw)


def text(t, a, b, y, style="stamp", size=96, **kw):
    return dict(t=t, at=a, until=b, y=y, style=style, size=size, **kw)


def sfx(id, at, gain=0, **kw):
    return dict(id=id, at=at, gain=gain, **kw)


# ------------------------------------------------------------------ SHORT · 9:16 · 30 s
b = grid(GAME, 60)
short = dict(
    id="SHORT", title="Dích hình 15 năm sau (dọc 30 giây)", W=1080, H=1920, frames=900,
    use="TikTok, Reels, Shorts. Xem tắt tiếng vẫn hiểu: chữ nằm giữa y 250 và 1350.",
    music=[dict(id="music:game-loop", start=60, end=900, seek=GAME["kick"], gain=-9, fade_in=2, fade_out=40,
                duck_at=[[b(38), b(39) + 2, -30]])],
    shots=[
        dict(id="S01", beat="Móc", start=0, end=60, still=40,
             camera="Cận sát mặt bàn, góc thấp. Dép rơi vào khung, lá bật, rồi ngửa đè lên lá úp của bạn.",
             action="0,5 giây trước cú đập, va chạm có chớp trắng và rung, lá hổ ngửa đè lá gấu trúc: luật nằm trong 2 giây.",
             pics=[pic("p-stage-slam-0", 0, 14, z=(1.0, 1.06)), pic("p-stage-slam-1", 14, 31, z=(1.22, 1.12)),
                   pic("p-stage-close-capture", 31, 60, z=(1.0, 1.08))],
             texts=[text("Hồi đó dích hình\ncó *thua ai* chưa?", 3, 59, 0.16, style="head", size=92),
                    text("BỐP!", 14, 30, 0.5, size=190, tilt=-6),
                    text("ĂN HÌNH!", 32, 59, 0.76, size=150, tilt=4, hl=True)],
             shake=[[14, 7, 22]], flash=[14],
             sfx=[sfx("whoosh", 5, -2), sfx("thump_big", 14, 0), sfx("flip", 30, -4), sfx("meme:capture-boom", 32, -11)]),
        dict(id="S02", beat="Khơi lại", start=60, end=b(8),
             camera="Màn hình chat của Bill (quay đt thật), nền là lá bài vừa ăn, mờ.",
             action="Tèo khều chuyện cũ, Bill đáp ngay. Nhạc trận vào đúng phách đầu.",
             pics=[pic("p-stage-close-capture", 60, b(8), z=(1.08, 1.12), blur=18, dim=0.35)],
             chat=dict(msgs=[dict(who="teo", t="ê còn nhớ vụ t ăn hình m hông =))", at=b(0) + 2),
                             dict(who="bill", t="nhớ chớ. vô đây t trả thù", at=b(4))]),
             sfx=[sfx("msg", b(0) + 2, -2), sfx("msg", b(4), -2)]),
        dict(id="S03", beat="Rủ", start=b(8), end=b(16),
             camera="Quay đt: phòng chờ, ngón tay bấm Mời bạn, bảng chia sẻ của máy trồi lên, chọn Zalo. Cắt sang lúc Tèo vào.",
             action="Không cài app: link mở thẳng vào phòng. Ô của Tèo bật Sẵn sàng đúng phách.",
             pics=[pic("p-lobby-invite", b(8), b(13), z=(1.0, 1.05), c=(0.5, 0.3)),
                   pic("p-lobby-joined", b(13), b(16), z=(1.06, 1.0), c=(0.5, 0.3))],
             taps=[dict(x=0.5, y=0.235, at=b(9)), dict(x=0.17, y=0.80, at=b(12))],
             share=dict(at=b(10), until=b(13)),
             texts=[text("Gửi link là vô.\n*Khỏi cài app*", b(13) + 1, b(16), 0.68, style="head", size=96)],
             sfx=[sfx("tap", b(9)), sfx("tap", b(12)), sfx("whoosh", b(13) - 6, -10), sfx("chime_ready", b(14), -2)]),
        dict(id="S04", beat="Phục thù", start=b(16), end=b(32),
             camera="4 cắt, mỗi cắt 1 nhịp nhạc (4 phách): ngắm, hai cú dích qua lại, Tèo ném sticker thẻ đỏ.",
             action="Căng dần: mỗi cú đập rơi đúng phách 1 của nhịp.",
             pics=[pic("p-aim", b(16), b(20), z=(1.18, 1.26), c=(0.5, 0.42)),
                   pic("p-bop-0", b(20), b(24), z=(1.75, 1.55), c=(0.5, 0.42)),
                   pic("p-bop-2", b(24), b(28), z=(1.75, 1.55), c=(0.5, 0.42)),
                   pic("p-stickers", b(28), b(32), z=(1.5, 1.6), c=(0.32, 0.5))],
             texts=[text("Phục thù\n*15 năm*", b(16) + 1, b(20) - 1, 0.66, size=130, tilt=-3)],
             shake=[[b(20), 6, 16], [b(24), 6, 16]],
             sfx=[sfx("whoosh", b(20) - 7, -6), sfx("thump", b(20), 0), sfx("whoosh", b(24) - 7, -6), sfx("thump", b(24), 0),
                  sfx("chime_react", b(28), -2)]),
        dict(id="S05", beat="Khoe", start=b(32), end=b(36),
             camera="Cận bong bóng của Bill trên lá bài.",
             action="Bill tưởng sắp thắng, gửi câu nhanh: Run chưa?",
             pics=[pic("p-stickers", b(32), b(36), z=(1.9, 2.05), c=(0.62, 0.42))],
             sfx=[sfx("chime_react", b(32), 0)]),
        dict(id="S06", beat="Quay xe", start=b(36), end=b(44),
             camera="Bill ngắm, dích quá tay; cắt sang lá bay khỏi bàn. Nhạc tắt nửa giây trước khi meme bật ra.",
             action="Kiêu là té: cú đập mạnh nhất, im lặng, RỚT BÀN!",
             pics=[pic("p-aim", b(36), b(38), z=(1.2, 1.32), c=(0.5, 0.42)),
                   pic("p-bop-1", b(38), b(39) + 2, z=(1.4, 1.5), c=(0.5, 0.45)),
                   pic("p-end-fall", b(39) + 2, b(44), z=(1.12, 1.04), c=(0.5, 0.35))],
             texts=[text("Mạnh tay quá\nlà *ăn hành*", b(40), b(44), 0.76, style="head", size=104)],
             shake=[[b(38), 8, 26], [b(39) + 2, 6, 14]], flash=[b(38)],
             sfx=[sfx("whoosh", b(38) - 7, -2), sfx("thump_big", b(38), 0), sfx("meme:fall-oidoioi", b(39) + 2, -3),
                  sfx("chime_out", b(40), -8)]),
        dict(id="S07", beat="Ván nữa", start=b(44), end=b(52),
             camera="Chat của Tèo đè lên màn rớt bàn; rồi màn hết trận, Bill bấm Tái đấu.",
             action="Tèo chọc lại đúng chuyện cũ. Bill không chịu thua.",
             pics=[pic("p-end-fall", b(44), b(47), z=(1.04, 1.06), c=(0.5, 0.35), blur=14, dim=0.3),
                   pic("p-match-end", b(47), b(52), z=(1.0, 1.06), c=(0.5, 0.55))],
             chat=dict(msgs=[dict(who="teo", t="y chang hồi xưa =))", at=b(44) + 1)], until=b(47)),
             taps=[dict(x=0.32, y=0.585, at=b(50))],
             texts=[text("Ván nữa.\nVán cuối. *Thật.*", b(48), b(52), 0.76, style="head", size=104)],
             sfx=[sfx("msg", b(44) + 1, -2), sfx("meme:pass-huh", b(45) + 4, -8), sfx("tap", b(50))]),
        dict(id="S08", beat="Kết", start=b(52), end=900,
             camera="Khung cuối đè lên gameplay đang chạy (mờ).",
             action="Tên game, chơi free trên web, link, credit ý tưởng.",
             pics=[pic("p-stage-close-capture", b(52), 900, z=(1.1, 1.18), blur=16, dim=0.45)],
             endcard=dict(at=b(52)),
             sfx=[sfx("thump", b(52), -2), sfx("chime_found", b(53), -6)]),
    ],
)

# ------------------------------------------------------------------ LONG · 16:9 · 75 s
c = grid(MENU, 150)
g = grid(GAME, c(24))
END = 2250
long = dict(
    id="LONG", title="Dích hình 15 năm sau (ngang 75 giây)", W=1920, H=1080, frames=END,
    use="YouTube, Facebook. Cả một ván thật; không giọng đọc, chữ và tiếng game kể chuyện.",
    music=[dict(id="music:menu-loop", start=150, end=c(24) + 6, seek=MENU["kick"], gain=-10, fade_in=2, fade_out=14),
           dict(id="music:game-loop", start=c(24), end=END, seek=GAME["kick"], gain=-9, fade_in=2, fade_out=60,
                duck_at=[[g(62), g(64), -30]])],
    shots=[
        dict(id="L01", beat="Móc", start=0, end=150, still=30,
             camera="Máy tính, cận sát mặt bàn. Cú dích quay chậm: hai lá bay lên quanh chiếc dép, rồi lá hổ ngửa đè lá gấu trúc.",
             action="Chưa có tên game, chưa có chữ: chỉ cú dích đẹp nhất.",
             pics=[pic("d-stage-slam-0", 0, 20, z=(1.0, 1.05)), pic("d-stage-slam-1", 20, 76, z=(1.05, 1.16)),
                   pic("d-stage-close-capture", 76, 150, z=(1.0, 1.1))],
             texts=[text("BỐP!", 20, 44, 0.42, size=170, tilt=-6), text("ĂN HÌNH!", 78, 149, 0.8, size=130, tilt=3, hl=True)],
             shake=[[20, 7, 20]], flash=[20],
             sfx=[sfx("whoosh", 10, -2), sfx("thump_big", 20, 0), sfx("flip", 74, -4), sfx("meme:capture-boom", 78, -11)]),
        dict(id="L02", beat="Khơi lại + rủ", start=150, end=c(24),
             camera="Chat; rồi phòng chờ trên máy tính, bấm Mời bạn; rồi chia đôi: máy tính và đt của Tèo cùng thấy phòng.",
             action="Tèo khều chuyện cũ, Bill gửi link, Tèo vào thẳng phòng từ đt.",
             pics=[pic("d-stage-close-capture", 150, c(8), z=(1.1, 1.14), blur=20, dim=0.35),
                   pic("d-lobby-invite", c(8), c(14), z=(1.25, 1.32), c=(0.42, 0.42))],
             chat=dict(msgs=[dict(who="teo", t="ê còn nhớ vụ t ăn hình m hông =))", at=c(0) + 3),
                             dict(who="bill", t="nhớ chớ. vô đây t trả thù", at=c(4))], until=c(8)),
             taps=[dict(x=0.42, y=0.28, at=c(10))],
             split=dict(at=c(14), left="d-lobby-joined", right="p-lobby-joined"),
             texts=[text("Gửi link là vô. *Khỏi cài app*", c(15), c(24), 0.88, style="head", size=78)],
             sfx=[sfx("msg", c(0) + 3, -2), sfx("msg", c(4), -2), sfx("tap", c(10)), sfx("whoosh", c(14) - 6, -8),
                  sfx("chime_ready", c(16), -2), sfx("riser", c(24) - 45, -10)]),
        dict(id="L03", beat="Vào trận", start=c(24), end=g(20),
             camera="Tù xì, chọn đập trước, rồi lượt đầu: vòng ngắm quanh lá của mình.",
             action="Không giải thích luật: thấy là hiểu.",
             pics=[pic("d-rps", c(24), g(6), z=(1.3, 1.36), c=(0.5, 0.5)), pic("d-choose", g(6), g(10), z=(1.3, 1.36), c=(0.5, 0.48)),
                   pic("d-aim", g(10), g(20), z=(1.15, 1.25), c=(0.42, 0.45))],
             texts=[text("Kéo ngắm, thả tay là *dích*", g(11), g(20), 0.86, style="head", size=78)],
             sfx=[sfx("thump", c(24), -4), sfx("chime_react", g(4), -6), sfx("tap", g(8), -2), sfx("whoosh", g(19) - 2, -8)]),
        dict(id="L04", beat="Phục thù", start=g(20), end=g(60),
             camera="5 cắt, mỗi cắt 2 nhịp nhạc: dích, ăn hình, sticker qua lại, dích, gió đẩy lá.",
             action="Hai bên ăn qua lại, chọc nhau bằng sticker.",
             pics=[pic("d-bop-0", g(20), g(28), z=(2.1, 1.85), c=(0.66, 0.45)),
                   pic("d-stage-capture", g(28), g(36), z=(1.5, 1.6), c=(0.55, 0.42)),
                   pic("d-stickers", g(36), g(44), z=(1.7, 1.8), c=(0.6, 0.42)),
                   pic("d-bop-1", g(44), g(52), z=(2.1, 1.85), c=(0.3, 0.45)),
                   pic("d-bop-2", g(52), g(60), z=(2.1, 1.85), c=(0.3, 0.45))],
             texts=[text("ĂN!", g(28) + 1, g(32), 0.3, size=150, tilt=-5, hl=True)],
             shake=[[g(20), 6, 14], [g(44), 6, 14], [g(52), 6, 14]],
             sfx=[sfx("thump", g(20)), sfx("flip", g(28), -2), sfx("meme:capture-boom", g(28) + 1, -12), sfx("chime_react", g(36), -2),
                  sfx("chime_react", g(39), -2), sfx("thump", g(44)), sfx("thump", g(52))]),
        dict(id="L05", beat="Quay xe", start=g(60), end=g(76),
             camera="Bill ngắm, dích quá tay, im nửa giây, lá rớt bàn.",
             action="Kiêu là té.",
             pics=[pic("d-aim", g(60), g(62), z=(1.25, 1.4), c=(0.42, 0.45)), pic("d-bop-1", g(62), g(64), z=(2.2, 2.4), c=(0.3, 0.45)),
                   pic("d-end-fall", g(64), g(76), z=(1.75, 1.6), c=(0.5, 0.42))],
             texts=[text("Mạnh tay quá là *ăn hành*", g(66), g(76), 0.86, style="head", size=84)],
             shake=[[g(62), 8, 22], [g(64), 6, 12]], flash=[g(62)],
             sfx=[sfx("whoosh", g(62) - 7, -2), sfx("thump_big", g(62)), sfx("meme:fall-oidoioi", g(64), -3)]),
        dict(id="L06", beat="Ván nữa + người lạ", start=g(76), end=g(98),
             camera="Tèo thắng, chat chọc lại; rồi Chơi ngay · Bất kỳ: ghép 4 người, bàn 4 lá.",
             action="Hết bạn thì dích với người lạ.",
             pics=[pic("d-match-end", g(76), g(84), z=(1.6, 1.7), c=(0.45, 0.47)),
                   pic("d-quick-searching", g(84), g(90), z=(1.1, 1.15)), pic("d-quick-4players", g(90), g(98), z=(1.15, 1.25), c=(0.5, 0.45))],
             chat=dict(msgs=[dict(who="teo", t="y chang hồi xưa =))", at=g(77))], until=g(84), side="right"),
             texts=[text("Hết bạn? *Dích với người lạ*", g(85), g(98), 0.86, style="head", size=80)],
             sfx=[sfx("meme:match-win", g(76), -10), sfx("msg", g(77), -2), sfx("chime_found", g(90), -4), sfx("thump", g(94), -2)]),
        dict(id="L07", beat="Tủ đồ", start=g(98), end=g(114),
             camera="Tủ đồ: chọn pet, tô màu dép.",
             action="Đổi dép đổi vận, chuẩn bị phục thù tiếp.",
             pics=[pic("d-ward-pet", g(98), g(106), z=(1.25, 1.32), c=(0.5, 0.5)), pic("d-ward-dep", g(106), g(114), z=(1.25, 1.32), c=(0.5, 0.5))],
             taps=[dict(x=0.39, y=0.58, at=g(100)), dict(x=0.37, y=0.45, at=g(108))],
             texts=[text("Đổi dép *đổi vận*", g(99), g(114), 0.86, style="head", size=84)],
             sfx=[sfx("tap", g(100)), sfx("chime_react", g(102), -8), sfx("tap", g(108)), sfx("chime_react", g(110), -8)]),
        dict(id="L08", beat="Kết", start=g(114), end=END,
             camera="Khung cuối đè lên cú ăn hình (mờ).",
             action="Tên game, chơi free trên web, link, credit ý tưởng.",
             pics=[pic("d-stage-close-capture", g(114), END, z=(1.1, 1.2), blur=18, dim=0.45)],
             endcard=dict(at=g(114)),
             sfx=[sfx("thump", g(114), -2), sfx("chime_found", g(115), -6)]),
    ],
)

tl = dict(about=__doc__.strip(), fps=FPS, videos=[short, long])
json.dump(tl, open(os.path.join(HERE, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for v in tl["videos"]:
    print(v["id"], v["frames"] / FPS, "s", [(s["id"], s["start"], s["end"]) for s in v["shots"]])
