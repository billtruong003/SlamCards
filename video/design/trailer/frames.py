"""
Style frames of the trailer v3 + the three shorts' plan (python frames.py [local|canvas]).
Each frame is a 1920x1080 composition from a real still of the footage, with the trailer's type system:
  Display  Baloo 2 ExtraBold   the game's own letters: the logo, the in-world stamps
  Text     Nunito Black (the studio's font): every line of copy
  Rules    copy comes in loose chunks, each tilted its own way, mixed sizes, one key word in yellow, never in a box;
           Vietnamese line height >= 1.15 so the marks never touch; studio colours = the site's warm graphite + amber.
"""
import html, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MODE = sys.argv[1] if len(sys.argv) > 1 else 'local'
BL = json.load(open(os.path.join(HERE, 'blobs.json'))) if MODE == 'canvas' else {}
src = lambda f: (f'/_blob/{BL[f]}' if MODE == 'canvas' else f)
e = html.escape
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&amp;family=Nunito:wght@700;800;900&amp;display=swap" rel="stylesheet">'
GR = dict(base='#141210', card='#25221F', text='#F6F3EF', amber='#FFB84D', label='#D7AF83')
CSS = """
.fr{position:relative;width:1920px;height:1080px;overflow:hidden;background:#141210;font-family:'Nunito',sans-serif;color:#F6F3EF}
.fr img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(20,18,16,.55) 100%)}
.ch{position:absolute;font-weight:900;line-height:1.15;white-space:nowrap;color:#F6F3EF;-webkit-text-stroke:var(--sw) #141210;paint-order:stroke fill;
  text-shadow:0 var(--sd) 0 #141210, 0 10px 30px rgba(0,0,0,.35)}
.ch b{color:#FFC93C;font-weight:900}
.paper{position:absolute;background:#F6F3EF;color:#141210;font-weight:900;line-height:1.15;padding:.18em .5em .22em;white-space:nowrap;box-shadow:0 10px 24px rgba(0,0,0,.35)}
.paper b{color:#e0457b}
.tape{position:absolute;width:160px;height:46px;background:rgba(255,214,120,.85)}
.tc{position:absolute;right:30px;top:24px;font:800 24px Nunito;color:rgba(246,243,239,.8);background:rgba(20,18,16,.5);padding:4px 12px;border-radius:8px}
.lg text{font-family:'Baloo 2';font-weight:800;paint-order:stroke fill;stroke:#2a1418;stroke-linejoin:round}
"""


def frame(tc, body):
    return f'<div class="fr">{body}<div class="tc">{e(tc)}</div></div>'


def bg(f, pos='50% 50%', scale=1.0, blur=0, dark=0):
    fl = f'filter:blur({blur}px) brightness({1 - dark});' if blur or dark else ''
    return f'<img class="bg" src="{src(f)}" style="object-position:{pos};transform:scale({scale});transform-origin:{pos};{fl}">'


def ch(t, x, y, s, rot=0):
    return f'<div class="ch" style="left:{x}px;top:{y}px;font-size:{s}px;--sw:{s * .085:.0f}px;--sd:{s * .07:.0f}px;transform:rotate({rot}deg)">{t}</div>'


def paper(t, x, y, s, rot=0):
    return (f'<div class="paper" style="left:{x}px;top:{y}px;font-size:{s}px;transform:rotate({rot}deg)">{t}</div>'
            f'<div class="tape" style="left:{x - 50}px;top:{y - 30}px;width:120px;height:40px;transform:rotate({-rot * 1.5 - 32}deg)"></div>')


def cut(f, x, y, w, rot=0):
    return f'<img src="{src(f)}" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;transform:rotate({rot}deg);filter:drop-shadow(0 20px 26px rgba(0,0,0,.45))">'


def logo(cx, cy, w, ribbon=True):
    """DÉP LÀO arched in cream, TUỔI THƠ big in yellow with a stacked extrude, a slipper and the tiger card tucked behind,
    the English name on a graphite ribbon."""
    h = w * 0.66
    ext = ''.join(f'<text x="500" y="{455 + i * 4}" text-anchor="middle" font-size="230" fill="#9a5414" stroke="#2a1418" stroke-width="22">TUỔI THƠ</text>' for i in range(5, 0, -1))
    rb = ('<g transform="rotate(-4 500 600)"><path d="M110 565 L890 565 L855 607 L890 649 L110 649 L145 607 Z" fill="#25221F" stroke="#141210" stroke-width="8"/>'
          '<text x="500" y="623" text-anchor="middle" style="font-family:Nunito;font-weight:900;stroke:none" font-size="50" fill="#FFB84D" letter-spacing="10">FLIP FLOP SLAM</text></g>') if ribbon else ''
    return (f'<div style="position:absolute;left:{cx - w / 2}px;top:{cy - h / 2}px;width:{w}px;height:{h}px">'
            f'{cut("cut-card-tiger.png", -w * .06, h * .30, w * .17, -18)}'
            '<svg class="lg" viewBox="0 0 1000 660" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">'
            '<path id="arc" d="M140 300 Q500 110 860 300" fill="none"/>'
            '<text font-size="170" fill="#F6F3EF" stroke-width="26"><textPath href="#arc" startOffset="50%" text-anchor="middle">DÉP LÀO</textPath></text>'
            f'<g transform="rotate(-3 500 420)">{ext}<text x="500" y="455" text-anchor="middle" font-size="230" fill="#FFC93C" stroke-width="22">TUỔI THƠ</text></g>'
            f'{rb}</svg>{cut("cut-dep-dep_lao.png", w * .80, -h * .02, w * .32, -18)}</div>')


def squash(t, cy, s):
    return (f'<div class="ch" style="left:0;right:0;top:{cy - s * .6}px;text-align:center;font-size:{s}px;--sw:{s * .085:.0f}px;--sd:{s * .07:.0f}px;'
            f'transform:rotate(-9deg) skewX(-14deg) scale(1.18,.55);transform-origin:50% 100%">{t}</div>')


GRAPHITE = f'<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,{GR["card"]} 0%,{GR["base"]} 70%)"></div>'
SPARKS = ''.join(f'<div style="position:absolute;left:{960 + math.cos(a) * 470}px;top:{640 + math.sin(a) * 170}px;width:100px;height:16px;border-radius:8px;background:#F6F3EF;transform:rotate({math.degrees(a)}deg)"></div>' for a in [0.15, 0.55, 2.55, 2.95, 3.4, 5.9])
F = [
    ('0:00 · Móc', 'Cú dích quay chậm, không chữ. Chỉ tiếng BỐP.',
     frame('0:00', bg('hook-air.jpg', '40% 50%'))),
    ('0:02 · Ident studio (graphite)', 'Đúng màu web: graphite ấm + amber. Quầng amber thở quanh cáo như hero của web; cáo bật vào, kính rơi "cạch", chữ trượt ra. "GIỚI THIỆU" màu nhãn #D7AF83.',
     frame('0:02', GRAPHITE + '<div style="position:absolute;left:50%;top:50%;width:900px;height:900px;margin:-450px;border-radius:50%;background:radial-gradient(circle,rgba(255,184,77,.16) 0%,rgba(255,184,77,.05) 40%,transparent 65%)"></div>'
           f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><img src="{src("studio-logo-dark.png")}" style="width:1240px">'
           f'<div style="margin-top:40px;font:800 30px Nunito;letter-spacing:.32em;color:{GR["label"]}">GIỚI THIỆU</div></div>')),
    ('0:04 · "Dích hình, đập hình…"', 'Hai cụm rơi vào lệch nhau 2 phách, mỗi cụm nghiêng một kiểu.',
     frame('0:04', bg('hook-land.jpg', '50% 50%', 1.1, 20, .4) + ch('Dích hình,', 300, 300, 170, -6) + ch('đập <b>hình…</b>', 860, 560, 130, 4))),
    ('0:05 · "Bằng dép?"', 'Chữ to giữa màn, dấu hỏi lắc.',
     frame('0:05', bg('hook-land.jpg', '50% 50%', 1.1, 20, .45) + ch('Bằng <b>dép?</b>', 500, 360, 230, -5))),
    ('0:05.5 · Dép đập xuống chữ', 'Dép rơi từ trên khung đập lên chữ: chữ bẹp còn 55%, xô nghiêng, rung 6 khung, vạch va chạm; dép bật lên, lá hổ bay ra để vào logo.',
     frame('0:05', bg('hook-land.jpg', '50% 50%', 1.1, 20, .45) + squash('Bằng <b>dép?</b>', 640, 230) + cut('cut-dep-dep_lao.png', 690, 210, 620, -18) + SPARKS)),
    ('0:07 · Logo game', 'Logo làm lại: "DÉP LÀO" cong theo vòm, "TUỔI THƠ" khối nổi 3D, dép + lá hổ cài sau chữ, ruy băng graphite "FLIP FLOP SLAM". Đóng xuống đúng phách BỐP.',
     frame('0:07', bg('hook-land.jpg', '50% 50%', 1.05, 8, .35) + logo(960, 540, 1300))),
    ('0:10 · Rủ bạn', '"Càng đông càng vui!": cụm sau dán trên mẩu giấy băng keo.',
     frame('0:10', bg('lobby.jpg', '60% 35%', 1.6, 0, .2) + '<div class="vig"></div>' + ch('Càng đông', 110, 630, 140, -5) + paper('càng <b>vui!</b>', 500, 830, 96, 4))),
    ('0:20 · Luật 1', 'Chữ vào lúc dép chạm, rung theo cú đập.',
     frame('0:20', bg('aim.jpg', '28% 45%', 2.0) + '<div class="vig"></div>' + ch('Đập hình', 1080, 140, 150, 5) + ch('cho bài <b>di chuyển</b>', 960, 360, 96, -3))),
    ('0:25 · Luật 2', '"Ăn hình" to; câu giải thích dán giấy.',
     frame('0:25', bg('capture.jpg', '30% 48%', 1.7) + '<div class="vig"></div>' + ch('<b>Ăn hình</b>', 150, 120, 170, -6) + paper('= nằm đè lên bài đối thủ', 150, 380, 70, 3))),
    ('0:36 · Nhẹ tay nhé', 'Nhạc tắt nửa giây, BỐP, lá bay khỏi bàn, rồi chữ.',
     frame('0:36', bg('fall.jpg', '30% 40%', 1.6) + '<div class="vig"></div>' + ch('Nhẹ tay nhé!', 980, 130, 140, 6) + ch('Mạnh tay quá là <b>ra khỏi bàn</b> đấy.', 260, 820, 76, -3))),
    ('0:44 · Người lạ', 'Câu hỏi trước, câu rủ sau 1 phách.',
     frame('0:44', bg('quick.jpg', '50% 45%', 1.5) + '<div class="vig"></div>' + ch('Bạn không có bạn?', 140, 130, 120, -5) + paper('Thử chơi cùng <b>người lạ</b> nhé?', 760, 810, 74, 3))),
    ('0:49 · Tủ đồ', 'Sẽ quay lại tủ đồ cận hơn, chọn dép tổ ong và tô màu. Dép tổ ong cắt nền xoay vào khung.',
     frame('0:49', bg('ward-dep.jpg', '50% 45%', 2.2, 3, .35) + '<div class="vig"></div>' + cut('cut-dep-dep_to_ong.png', 1280, 420, 560, 18) +
           ch('<b>24</b> pet,', 120, 130, 150, -6) + ch('đa dạng màu custom', 140, 380, 92, 3) + paper('cho đôi <b>tổ ong</b> thần sầu?', 130, 620, 76, -3))),
    ('0:54 · Khung kết (duy nhất)', 'Logo game + câu rủ + link + credit + logo studio nhỏ. Giữ 5 giây. Không còn khung studio riêng.',
     frame('0:54', bg('hook-land.jpg', '50% 50%', 1.1, 26, .5) + logo(960, 290, 800) +
           ch('Đập hình cùng <b>chúng mình</b> nhé!', 470, 610, 80, -3) +
           '<div style="position:absolute;left:0;right:0;top:740px;display:flex;justify-content:center"><div style="font:900 44px Nunito;background:#e0457b;color:#fff;padding:12px 44px;border-radius:999px;border:5px solid #141210;box-shadow:0 8px 0 #141210;transform:rotate(1.5deg)">play.billthedevstudio.com/slam-cards</div></div>'
           '<div style="position:absolute;left:0;right:0;top:868px;text-align:center;font:800 30px Nunito;line-height:1.4;color:#F6F3EF;text-shadow:0 2px 10px rgba(0,0,0,.6)">Ý tưởng: ThuanBui (David) &nbsp;·&nbsp; Developer: BillTheDev</div>'
           f'<img src="{src("studio-logo-dark.png")}" style="position:absolute;left:50%;top:965px;width:440px;margin-left:-220px">')),
]

BEATS = [('Móc', 2, '#a34e71'), ('Ident', 2, '#25221F'), ('Dích hình… dép? + logo', 6, '#886116'), ('Rủ bạn + chat', 10, '#1c719a'),
         ('Luật', 9, '#307a4f'), ('Trận: ăn, chọc', 7, '#a34e71'), ('Nhẹ tay', 6, '#a34e71'), ('Người lạ', 5, '#1c719a'), ('Tủ đồ', 5, '#307a4f'), ('Kết', 5, '#25221F')]

SHORTS = [
    ('Short 1 · Ức chế giữ chân (11 giây, loop)', [
        'Mở: "Ăn 1 lá thôi mà…" (cụm chữ nghiêng, bỏ nhãn giấy).',
        'Ba lần trượt, mỗi lần một chữ đóng dấu nghiêng khác nhau: "XÍU NỮA!" · "ỨC GHÊ!" · "RA KHỎI BÀN?!".',
        'Chen lời phụ nhỏ kiểu bình luận: "(tay run rồi đó)", "(thở đi bạn)".',
        'Lần 4 quay chậm → "ĂN HÌNH!" → logo mới nhỏ + "Bạn mất mấy lần?" để kéo bình luận.']),
    ('Short 2 · Cliffhanger (9–10 giây, có phần 2)', [
        'Mở: "Ván quyết định" + giấy nhớ 1–1, đồng hồ tích tắc.',
        'Đóng băng giữa không trung: "Ăn hình…" / "hay ra khỏi bàn?" hai cụm lệch nhau.',
        'Kết: "Đoán đi! 👇" + "Phần 2 tối nay" + logo nhỏ. Phần 2 mở đúng khung đó rồi trả lời.']),
    ('Short 3 · Hoài niệm (14 giây)', [
        'Trang vở: "Dích hình, đập hình…" viết tay → "Bằng dép?" → dép giấy đập xuống làm chữ méo (đúng motion mở trailer).',
        'Cắt khớp sang cú dép trong game → "ĂN HÌNH!".',
        '"15 năm sau…" / "vẫn ức như hồi đó" (cụm lộn xộn).',
        'Khung kết như trailer: logo mới + "Đập hình cùng chúng mình nhé!" + link + credit + logo studio nhỏ.']),
]


def board():
    tot = sum(b[1] for b in BEATS)
    strip = ('<div style="display:flex;width:2620px;height:56px;border:3px solid #141210;border-radius:12px;overflow:hidden;margin:6px 0 26px">' +
             ''.join(f'<div style="flex:{d};background:{c};color:#fff;font:800 17px Nunito;display:flex;align-items:center;justify-content:center;border-right:2px solid #141210;white-space:nowrap;overflow:hidden">{e(n)} · {d}s</div>' for n, d, c in BEATS) + '</div>')
    cells = ''.join(f'<div style="width:840px"><div style="width:840px;height:472px;overflow:hidden;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.25)">'
                    f'<div style="transform:scale(.4375);transform-origin:0 0">{fr}</div></div>'
                    f'<div style="font:900 22px Nunito;margin-top:10px">{e(t)}</div><div style="font:700 17px Nunito;line-height:1.45;color:#5a3a42">{e(n)}</div></div>'
                    for t, n, fr in F)
    shorts = ''.join(f'<div style="width:840px;background:#fffbf0;border:3px solid #141210;border-radius:18px;padding:20px 24px;box-sizing:border-box">'
                     f'<div style="font:900 24px Nunito;margin-bottom:8px">{e(t)}</div>' + ''.join(f'<div style="font:700 17px Nunito;line-height:1.5;margin:4px 0">• {e(x)}</div>' for x in xs) + '</div>'
                     for t, xs in SHORTS)
    rules = ('<div style="width:2620px;background:#fffbf0;border:3px solid #141210;border-radius:18px;padding:20px 26px;box-sizing:border-box;font:700 18px Nunito;line-height:1.55;margin-top:30px">'
             '<b>Hệ chữ (trailer + 3 short):</b> Baloo 2 ExtraBold chỉ cho logo game và chữ đóng dấu · Nunito Black cho mọi câu chữ. '
             '<b>Bố cục chữ:</b> cụm rời, mỗi cụm nghiêng −6° → +6°, to nhỏ xen kẽ (170 / 96 / 76 px), một từ nhấn vàng, thỉnh thoảng một cụm dán mẩu giấy có băng keo; không khung tối sau chữ; giãn dòng ≥ 1,15 cho dấu tiếng Việt. '
             '<b>Chuyển động:</b> mỗi cụm rơi vào riêng (scale 1.4 → 1, xoay thêm 3°, 5 khung), cụm sau trễ 1 phách; rung theo cú đập. '
             '<b>Màu studio:</b> graphite ấm #141210 / #25221F, chữ #F6F3EF, nhấn amber #FFB84D (đúng web).</div>')
    return (f'<div style="font:900 44px Nunito">Trailer v3 · Dép Lào Tuổi Thơ (ngang ~{tot} giây)</div>'
            '<div style="font:700 20px Nunito;color:#7a5a62;margin:6px 0 10px;max-width:2600px">Nội dung theo bản Bill viết. Ident studio màu graphite như web, logo game làm lại, chữ lộn xộn kiểu trailer indie; studio chỉ ở ident đầu + khung kết. Khung là ảnh thật từ footage (tủ đồ sẽ quay lại cận hơn với dép tổ ong).</div>'
            + strip + f'<div style="display:flex;flex-wrap:wrap;gap:30px;width:2620px">{cells}</div>' + rules +
            '<div style="font:900 34px Nunito;margin:40px 0 14px">Ý tưởng lại cho 3 short (cùng hệ chữ, cùng logo mới)</div>'
            f'<div style="display:flex;gap:30px">{shorts}</div>')


if __name__ == '__main__' and MODE == 'local':
    open(os.path.join(HERE, 'trailer-frames.html'), 'w', encoding='utf-8').write(
        f'<!doctype html><html lang="vi"><head><meta charset="utf-8">{FONTS}<style>body{{margin:0;background:#ece3cf;padding:40px;color:#2a1418}}{CSS}</style></head><body>{board()}</body></html>')
elif __name__ == '__main__':
    print(json.dumps({'css': CSS, 'body': board(), 'fonts': FONTS}))
