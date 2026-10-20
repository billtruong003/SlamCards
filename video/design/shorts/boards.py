"""
Frame-by-frame mockups of the 5 shorts, one concept each (python boards.py [local|canvas]).
Frames are 1080x1920 compositions on real portrait stills, in the trailer's type system (frames.py helpers).
"""
import html, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'trailer'))
import frames as fr

HERE = os.path.dirname(os.path.abspath(__file__))
MODE = sys.argv[1] if len(sys.argv) > 1 else 'local'
if MODE == 'canvas':
    _BL = json.load(open(os.path.join(HERE, 'blobs.json')))
    fr.src = lambda f: f'/_blob/{_BL[f]}'
else:
    fr.src = lambda f: f
e = html.escape
SH = """.v{position:relative;width:1080px;height:1920px;overflow:hidden;background:#141210;font-family:Nunito;color:#F6F3EF}
.v img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ruled{position:absolute;inset:0;background:#fdf8ea linear-gradient(transparent 0 76px,rgba(73,130,196,.30) 76px 80px) 0 40px/100% 80px}
.ruled::before{content:"";position:absolute;top:0;bottom:0;left:150px;width:6px;background:rgba(224,69,123,.5)}
.pen{position:absolute;font:800 80px Nunito;color:#1c5f94;white-space:nowrap}
.sticky{position:absolute;background:#fff3a8;color:#1c5f94;font:900 40px Nunito;text-align:center;padding:16px 24px;box-shadow:0 10px 18px rgba(0,0,0,.25)}
.stat{position:absolute;left:90px;right:90px;background:rgba(20,18,16,.82);border:5px solid #FFB84D;border-radius:26px;padding:26px 34px;font:800 44px Nunito;line-height:1.5}
.stat b{color:#FFB84D}
.bub{position:absolute;max-width:780px;background:#F6F3EF;color:#141210;border:6px solid #141210;border-radius:40px;padding:22px 34px;font:800 56px Nunito;line-height:1.25;box-shadow:0 10px 0 rgba(20,18,16,.5)}
.bub.me{background:#974e66;color:#fff}
.ring{position:absolute;width:140px;height:140px;border-radius:50%;border:12px solid #fff;box-shadow:0 0 0 8px rgba(20,18,16,.4)}"""


def V(body):
    return f'<div class="v">{body}</div>'


def bg(f, pos='50% 50%', scale=1.0, blur=0, dark=0):
    return fr.bg(f, pos, scale, blur, dark)


ch, paper, cut, logo = fr.ch, fr.paper, fr.cut, fr.logo
ST = lambda t, x, y, s, rot, col='#FFC93C': (f'<div style="position:absolute;left:{x}px;top:{y}px;font-family:\'Baloo 2\';font-weight:800;font-size:{s}px;line-height:1.05;color:{col};'
                                             f'-webkit-text-stroke:{s * .1:.0f}px #2a1418;paint-order:stroke fill;text-shadow:0 {s * .08:.0f}px 0 #2a1418;transform:rotate({rot}deg);white-space:nowrap">{t}</div>')
VIG = lambda a=.45: f'<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 40%,rgba(170,20,50,{a}) 100%)"></div>'
DIM = lambda a=.5: f'<div style="position:absolute;inset:0;background:rgba(20,18,16,{a})"></div>'
GRAPH = '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,#3a3530,#141210 75%)"></div>'
END = lambda line: (logo(540, 560, 820) + ch(line, 70, 1010, 68, -3) +
                    '<div style="position:absolute;left:0;right:0;top:1250px;display:flex;justify-content:center"><div style="font:900 46px Nunito;background:#e0457b;color:#fff;padding:12px 40px;border-radius:999px;border:5px solid #141210;box-shadow:0 8px 0 #141210;transform:rotate(1.5deg)">billthedevstudio.io.vn/slam-cards</div></div>'
                    '<div style="position:absolute;left:0;right:0;top:1400px;text-align:center;font:800 36px Nunito;line-height:1.45">Ý tưởng: ThuanBui (David)<br>Developer: BillTheDev</div>'
                    f'<img src="{fr.src("studio-logo-dark.png")}" style="position:absolute;left:50%;top:1600px;width:520px;margin-left:-260px">')

VIDEOS = [
    ('1 · Xíu nữa thôi', 'Ức chế giữ chân · 11 giây · loop', 'Ba lần trượt tệ dần, tim đập nhanh dần; lần 4 quay chậm rồi ăn. Cảnh cuối nối về cảnh đầu nên người xem xem lại.', [
        ('0s', 'Mở ngay bàn, chữ rơi vào 2 cụm.', V(bg('s-ready.jpg') + ch('Ăn 1 lá', 140, 260, 150, -6) + ch('thôi <b>mà…</b>', 420, 470, 120, 5))),
        ('2s', 'Lần 1: lá ngửa nhưng lệch. Âm "ơ".', V(bg('s-near1.jpg') + ST('XÍU NỮA!', 110, 260, 170, -7, '#ff5d8f') + ch('(tay run rồi đó)', 380, 520, 60, 4))),
        ('4s', 'Lần 2: lệch hơn. Tim bắt đầu đập.', V(bg('s-near2.jpg') + VIG(.35) + ST('ỨC GHÊ!', 160, 280, 190, 5, '#ff5d8f'))),
        ('6s', 'Lần 3: mạnh tay, lá bay khỏi bàn (quay thêm cú này ở khung dọc). Nhạc tắt.', V(bg('s-flipdown.jpg') + VIG(.45) + ST('RA KHỎI', 120, 230, 160, -5, '#ff5d8f') + ST('BÀN?!', 300, 400, 170, 4, '#ff5d8f') + ch('(thở đi bạn)', 500, 640, 60, -3))),
        ('8s', 'Lần 4: quay chậm 30%, chỉ còn tiếng tim.', V(bg('s-air.jpg') + VIG(.55) + ch('lần <b>4</b>…', 330, 300, 150, -4))),
        ('10s', 'Đáp: BỐP, chớp, chữ đóng dấu; logo nhỏ + câu kéo bình luận.', V(bg('s-cap.jpg') + ST('ĂN HÌNH!', 70, 260, 200, -5) + paper('Bạn mất mấy lần? 👇', 200, 1500, 70, 3)))]),
    ('2 · Ván quyết định', 'Cliffhanger · 10 giây + phần 2', 'Dừng đúng lúc lá đang lật giữa không trung. Người xem phải bình luận đoán; phần 2 đăng tối cùng ngày.', [
        ('0s', 'Tỉ số 1–1, lượt cuối, đồng hồ tích tắc.', V(bg('s-ready.jpg') + paper('Ván quyết định', 120, 230, 96, -3) + '<div class="sticky" style="right:80px;top:470px;transform:rotate(5deg)">Bill – Tèo<br><span style="font-size:90px">1 – 1</span></div>')),
        ('2s', 'Ngắm chậm, đếm 3–2–1.', V(bg('s-ready.jpg', '50% 50%', 1.08) + ST('3', 440, 1250, 300, -4, '#F6F3EF'))),
        ('4s', 'Dép đập, BỐP, rung.', V(bg('s-slam.jpg') + ST('BỐP!', 300, 280, 200, -8))),
        ('5s', 'Quay chậm dần rồi đóng băng; nền tối, nút pause.', V(bg('s-air.jpg', '50% 45%', 1.15) + DIM(.45) + ch('Ăn hình…', 120, 230, 140, -5) + ch('hay <b>ra khỏi bàn?</b>', 120, 1460, 100, 4) +
                                                                  '<div style="position:absolute;left:440px;top:860px;width:200px;height:200px;border-radius:40px;background:rgba(246,243,239,.92);border:8px solid #141210;display:flex;gap:28px;align-items:center;justify-content:center"><i style="width:32px;height:96px;background:#141210;border-radius:8px"></i><i style="width:32px;height:96px;background:#141210;border-radius:8px"></i></div>')),
        ('8s', 'Kêu đoán + hẹn phần 2.', V(bg('s-air.jpg', '50% 45%', 1.2) + DIM(.6) + ST('ĐOÁN ĐI! 👇', 110, 600, 150, -4) + paper('Phần 2 tối nay', 260, 900, 80, 3))),
        ('Phần 2 · 0s', 'Mở đúng khung đóng băng, chạy tiếp, trả lời.', V(bg('s-cap.jpg') + paper('Phần 2', 100, 200, 70, -4) + ST('ĂN HÌNH!', 90, 360, 190, -5) + ch('Ai đoán đúng? 👇', 230, 1500, 80, 3)))]),
    ('3 · Giờ ra chơi', 'Hoài niệm · 14 giây', 'Trang vở học trò mở bằng đúng màn của trailer: "Dích hình, đập hình… Bằng dép?" rồi dép giấy đập chữ méo, cắt khớp vào game.', [
        ('0s', 'Trang vở, tiếng trống trường, chữ viết tay.', V('<div class="ruled"></div><div class="pen" style="left:200px;top:180px;transform:rotate(-3deg)">Giờ ra chơi…</div>' + ch('Dích hình,', 170, 520, 150, -6) + ch('đập <b>hình…</b>', 420, 760, 120, 4))),
        ('2s', '"Bằng dép?" to giữa trang.', V('<div class="ruled"></div>' + ch('Bằng <b>dép?</b>', 90, 820, 180, -5))),
        ('3s', 'Dép giấy rơi đập xuống chữ: chữ bẹp, xô nghiêng.', V('<div class="ruled"></div>' +
                                                            '<div class="ch" style="left:0;right:0;top:900px;text-align:center;font-size:170px;--sw:15px;--sd:12px;transform:rotate(-9deg) skewX(-14deg) scale(1.05,.55);transform-origin:50% 100%">Bằng <b>dép?</b></div>' +
                                                            cut('cut-dep-dep_lao.png', 260, 470, 600, -20))),
        ('4s', 'Cắt khớp vào cú dép trong game cùng bố cục.', V(bg('s-slam.jpg') + ST('BỐP!', 300, 260, 200, -8))),
        ('7s', 'Ăn hình + "15 năm sau… vẫn ức như hồi đó".', V(bg('s-cap.jpg') + ST('ĂN HÌNH!', 90, 220, 180, -5) + ch('15 năm sau…', 140, 1560, 90, -3) + ch('vẫn <b>ức</b> như hồi đó', 160, 1710, 84, 3))),
        ('11s', 'Khung kết như trailer.', V(GRAPH + END('Đập hình cùng <b>chúng mình</b> nhé!')))]),
    ('4 · Dép nào mạnh nhất?', 'So sánh · 12 giây', 'Ba đôi dép như ba nhân vật đối kháng; cùng một cú đập, đo lá bay xa nhất. Kéo bình luận "team dép nào".', [
        ('0s', 'Màn chọn nhân vật: 3 đôi dép xoay nhẹ.', V(GRAPH + ch('Dép nào', 140, 220, 150, -6) + ch('<b>mạnh nhất?</b>', 230, 420, 130, 4) +
                                                       cut('cut-dep-dep_lao.png', 20, 820, 520, -24) + cut('cut-dep-dep_le.png', 300, 1080, 500, 6) + cut('cut-dep-dep_to_ong.png', 560, 800, 500, 24))),
        ('2s', 'Dép lào: thẻ chỉ số, rồi đập.', V(bg('s-slam.jpg') + '<div class="stat" style="top:1280px;transform:rotate(-2deg)"><b>DÉP LÀO</b><br>Lực ●●●○○ · Chuẩn ●●●●○</div>')),
        ('4s', 'Dép lê (quay thêm với dép lê).', V(bg('s-air.jpg') + '<div class="stat" style="top:1280px;transform:rotate(2deg)"><b>DÉP LÊ</b><br>Lực ●●●●○ · Chuẩn ●●○○○</div>')),
        ('6s', 'Dép tổ ong (quay thêm với tổ ong).', V(bg('s-near2.jpg') + '<div class="stat" style="top:1280px;transform:rotate(-1deg)"><b>TỔ ONG</b><br>Lực ●●●●● · Chuẩn ●○○○○</div>')),
        ('8s', 'Kết quả: số đo chồng lên, bất ngờ thắng.', V(GRAPH + ch('Lá bay xa nhất:', 120, 260, 90, -3) + ST('TỔ ONG!', 120, 420, 190, -6) + ch('dép lào ăn <b>chuẩn</b> nhất', 160, 760, 76, 3) + cut('cut-dep-dep_to_ong.png', 320, 1040, 520, 14))),
        ('10s', 'Kéo bình luận + logo.', V(GRAPH + paper('Team dép nào? 👇', 180, 260, 84, -3) + logo(540, 900, 960)))]),
    ('5 · Bạn thân cấp 1', 'Rủ bạn · 13 giây', 'Câu chuyện thật trong 13 giây: đứa bạn cũ khều chuyện cũ, gửi link, vào bàn trong 5 giây, phục thù. Kết bằng lý do gửi link cho bạn.', [
        ('0s', 'Tin nhắn tới, to giữa màn, rung nhẹ.', V(bg('p-chat.jpg', '50% 50%', 1.0, 18, .45) + ch('15 năm sau…', 140, 200, 110, -4) +
                                                      '<div class="bub" style="left:80px;top:700px;transform:rotate(-2deg)">ê còn nhớ vụ t ăn hình m hông =))</div>')),
        ('2s', 'Bill trả lời.', V(bg('p-chat.jpg', '50% 50%', 1.0, 18, .45) + '<div class="bub" style="left:80px;top:500px;transform:rotate(-2deg)">ê còn nhớ vụ t ăn hình m hông =))</div>' +
                                 '<div class="bub me" style="right:80px;top:900px;transform:rotate(2deg)">nhớ chớ. vô đây t trả thù</div>')),
        ('4s', 'Bấm "Mời bạn", gửi link.', V(bg('p-invite.jpg', '50% 30%', 1.15, 0, .5) + '<div class="ring" style="left:470px;top:370px"></div>' + ch('Gửi link', 140, 1300, 130, -5) + paper('khỏi tải app', 300, 1520, 80, 3))),
        ('6s', 'Đồng hồ: Tèo vào bàn sau 5 giây.', V(bg('p-join.jpg', '50% 30%', 1.15, 0, .5) + ST('00:05', 300, 1300, 170, -4, '#F6F3EF') + ch('là vào bàn', 300, 1540, 80, 3))),
        ('8s', 'Ván phục thù: ăn hình.', V(bg('s-cap.jpg') + ST('PHỤC THÙ!', 60, 240, 170, -5))),
        ('11s', 'Kết: gửi cho đứa bạn cũ.', V(GRAPH + END('Gửi cho <b>đứa bạn cấp 1</b> 👇')))]),
]


def board():
    out = ('<div style="font:900 44px Nunito">5 short · mỗi video một concept · mockup từng khung</div>'
           '<div style="font:700 20px Nunito;color:#7a5a62;margin:6px 0 24px;max-width:2000px">Dọc 1080×1920, cùng hệ chữ trailer (Nunito Black lộn xộn + Baloo đóng dấu), logo mới. Khung là ảnh thật; chỗ ghi "quay thêm" cần một lần quay ngắn ở khung dọc.</div>')
    for title, kind, idea, frames in VIDEOS:
        cells = ''.join(f'<div style="width:270px"><div style="width:270px;height:480px;overflow:hidden;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.25)">'
                        f'<div style="transform:scale(.25);transform-origin:0 0">{f}</div></div>'
                        f'<div style="font:900 18px Nunito;margin-top:8px">{e(t)}</div><div style="font:700 15px Nunito;line-height:1.4;color:#5a3a42">{e(n)}</div></div>'
                        for t, n, f in frames)
        out += (f'<div style="background:#fffbf0;border:3px solid #141210;border-radius:20px;padding:22px 26px;margin-bottom:28px;width:1880px;box-sizing:border-box">'
                f'<div style="display:flex;gap:16px;align-items:baseline"><div style="font:900 32px Nunito">{e(title)}</div><div style="font:800 18px Nunito;color:#a34e71">{e(kind)}</div></div>'
                f'<div style="font:700 18px Nunito;color:#5a3a42;margin:4px 0 16px">{e(idea)}</div><div style="display:flex;gap:30px">{cells}</div></div>')
    return out


if __name__ == '__main__':
    css = fr.CSS + SH
    if MODE == 'local':
        open(os.path.join(HERE, 'shorts.html'), 'w', encoding='utf-8').write(
            f'<!doctype html><html lang="vi"><head><meta charset="utf-8">{fr.FONTS}<style>body{{margin:0;background:#ece3cf;padding:40px;color:#2a1418}}{css}</style></head><body>{board()}</body></html>')
    else:
        print(json.dumps({'css': css, 'body': board(), 'fonts': fr.FONTS}))
