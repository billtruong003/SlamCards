"""
Trailer thumbnail options + 3 options of a 5-short series (python plan2.py [local|canvas]).
Reuses the trailer's type system and logo from frames.py.
"""
import html, json, os, sys
import frames as fr

e = html.escape
TH = """.th{position:relative;width:1280px;height:720px;overflow:hidden;background:#141210;font-family:Nunito}
.th img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.safe{position:absolute;right:0;bottom:0;width:190px;height:70px;border:3px dashed rgba(255,255,255,.55)}"""


def th(body):
    return f'<div class="th">{body}<div class="safe"></div></div>'


bg = fr.bg; ch = fr.ch; cut = fr.cut; paper = fr.paper
STAMP = lambda t, x, y, s, rot, col='#FFC93C': (f'<div style="position:absolute;left:{x}px;top:{y}px;font-family:\'Baloo 2\';font-weight:800;font-size:{s}px;line-height:1.05;color:{col};'
                                                f'-webkit-text-stroke:{s * .1:.0f}px #2a1418;paint-order:stroke fill;text-shadow:0 {s * .08:.0f}px 0 #2a1418;transform:rotate({rot}deg);white-space:nowrap">{t}</div>')
THUMBS = [
    ('A · Khoảnh khắc ăn hình', 'Cú dép đang đập, hai lá bay; chữ đóng dấu "ĂN HÌNH!" to bên phải. Mạnh nhất cho người chưa biết game: thấy hành động ngay.',
     th(bg('hook-air.jpg', '0% 50%', 1.0) + '<div style="position:absolute;inset:0;background:linear-gradient(270deg,rgba(20,18,16,.8),transparent 55%)"></div>' +
        STAMP('ĂN', 760, 60, 190, 6) + STAMP('HÌNH!', 640, 250, 190, 3) + ch('bằng <b>dép lào</b>', 760, 490, 64, 4))),
    ('B · Bằng dép?!', 'Câu hỏi gây tò mò + chiếc dép đập lên chữ làm chữ méo (đúng motion mở trailer). Hợp người Việt nhớ trò dích hình.',
     th(bg('hook-land.jpg', '50% 50%', 1.1, 10, .35) + ch('Dích hình', 90, 70, 130, -6) +
        f'<div class="ch" style="left:60px;top:300px;font-size:190px;--sw:16px;--sd:13px;transform:rotate(-9deg) skewX(-12deg) scale(1.1,.68);transform-origin:0 100%">bằng <b>dép?!</b></div>' +
        cut('cut-dep-dep_lao.png', 1040, -30, 280, -34) + cut('cut-card-tiger.png', 1010, 400, 170, 18))),
    ('C · Logo + nhân vật', 'Bản "thương hiệu": logo mới giữa khung, hổ và gấu trúc hai bên. Dùng khi kênh đã có người biết game.',
     th('<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,#3a3530,#141210 75%)"></div>' +
        cut('cut-pet-tiger.png', -40, 300, 400, -10) + cut('cut-pet-panda.png', 920, 300, 400, 10) +
        '<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;transform:scale(.6667);transform-origin:0 0">' + fr.logo(960, 470, 1250) + '</div>')),
]

OPTIONS = [
    ('Phương án 1 · "Ức chế rồi đã" (gameplay thuần)', 'Mỗi video là một cảm xúc trong ván: ức, hồi hộp, cười. Dễ quay nhất (dùng lại cuộn take có sẵn + quay thêm), hợp thuật toán vì giữ chân.', [
        ('Xíu nữa thôi', '"Ăn 1 lá thôi mà…"', '3 lần trượt tệ dần → lần 4 quay chậm ĂN HÌNH. Loop.', '"Bạn mất mấy lần?"'),
        ('Nhẹ tay nhé', '"Lực vừa đủ là…"', '5 cú mạnh tay liên tiếp, lá bay khỏi bàn mỗi kiểu, meme mỗi lần.', '"Đoán cú nào ở lại 👇"'),
        ('Ván quyết định', '"1 – 1. Lượt cuối."', 'Đếm ngược, dép đập, đóng băng giữa không trung.', '"Phần 2 tối nay"'),
        ('Phần 2: kết quả', 'Mở đúng khung đóng băng', 'Chạy tiếp → kết quả bất ngờ → tỉ số cuối.', '"Ai đoán đúng?"'),
        ('Dép nào mạnh nhất?', '"Dép lào vs dép lê vs tổ ong"', '3 cú đập cùng chỗ, 3 kiểu dép, so lá bay xa nhất.', '"Team dép nào?"')]),
    ('Phương án 2 · "Tuổi thơ dữ dội" (hoài niệm, relatable)', 'Bán ký ức giờ ra chơi; người xem tag bạn cũ. Cần thêm cảnh trang vở / chữ viết tay như short hoài niệm.', [
        ('Giờ ra chơi', '"Ai từng mất hết hình giờ ra chơi?"', 'Trang vở → dép giấy đập chữ méo → cắt khớp vào game → ĂN HÌNH.', '"Tag đứa ăn hình bạn"'),
        ('Đứa bạn ăn hết hình', '"Mỗi lớp đều có 1 đứa…"', 'Tèo ăn liên tục 4 lá, giấy nhớ đếm, Bill ức.', '"Lớp bạn là ai?"'),
        ('Dép lào huyền thoại', '"Vũ khí của tuổi thơ"', 'Trưng 3 đôi dép như vũ khí game đối kháng, chỉ số chế, rồi đập thử.', '"Bạn xài đôi nào?"'),
        ('POV: cô bắt được', '"POV: đang dích thì cô đi ngang"', 'Đang hăng → tiếng thước gõ bàn → cắt đen → "giờ chơi online, khỏi sợ cô".', '"Link ở bio"'),
        ('15 năm sau', '"Bạn thân cấp 1 nhắn…"', 'Chat thật "còn nhớ vụ t ăn hình m hông" → gửi link → phục thù.', '"Rủ đứa đó vào"')]),
    ('Phương án 3 · "Rủ bạn vào" (xã hội, thử thách)', 'Video nào cũng kết bằng lý do gửi link cho bạn. Trực tiếp nhất cho mục tiêu người chơi mới.', [
        ('Thử thách 3 lá', '"Ăn 3 lá liên tiếp được không?"', 'Bộ đếm 0/3, mỗi cú một lần thử, lần cuối thành công.', '"Thử phá kỷ lục"'),
        ('Chọc nhau', '"Thua cũng phải chọc"', 'Sticker + câu nhanh qua lại: "Run chưa?" → rớt bàn → "Vô lẹ!".', '"Gửi cho đứa hay chọc bạn"'),
        ('2h sáng với người lạ', '"2h sáng không ngủ được…"', 'Chơi ngay · ghép 4 người lạ, ván hỗn loạn.', '"Ai thức thì vào"'),
        ('Gửi link là vô', '"Không tải app. Thật."', 'Copy link → Zalo → bạn bấm → vào bàn trong 5 giây (đếm giờ trên màn).', '"Gửi cho 1 đứa ngay"'),
        ('Độ đôi tổ ong', '"Độ đôi tổ ong thần sầu"', 'Tủ đồ: chọn pet, tô màu dép từng phần, ra trận khoe.', '"Đôi bạn màu gì?"')]),
]


def board():
    thumbs = ''.join(f'<div style="width:840px"><div style="width:840px;height:472px;overflow:hidden;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.25)">'
                     f'<div style="transform:scale(.65625);transform-origin:0 0">{t}</div></div>'
                     f'<div style="font:900 22px Nunito;margin-top:10px">{e(n)}</div><div style="font:700 17px Nunito;line-height:1.45;color:#5a3a42">{e(d)}</div></div>'
                     for n, d, t in THUMBS)
    opts = ''
    for name, why, vids in OPTIONS:
        rows = ''.join(f'<tr><td style="font-weight:900">{i + 1}. {e(t)}</td><td>{e(h)}</td><td>{e(b)}</td><td style="color:#a34e71;font-weight:800">{e(c)}</td></tr>'
                       for i, (t, h, b, c) in enumerate(vids))
        opts += (f'<div style="width:2620px;background:#fffbf0;border:3px solid #141210;border-radius:18px;padding:20px 24px;box-sizing:border-box;margin-bottom:24px">'
                 f'<div style="font:900 28px Nunito">{e(name)}</div><div style="font:700 18px Nunito;color:#5a3a42;margin:4px 0 12px">{e(why)}</div>'
                 '<table style="width:100%;border-collapse:collapse;font:700 18px Nunito;line-height:1.4">'
                 '<tr style="color:#7a5a62;font-size:15px;text-transform:uppercase"><td style="width:300px">Video</td><td style="width:520px">Móc 0–1 giây</td><td>Diễn biến (10–15 giây, 9:16)</td><td style="width:320px">Kết / kêu gọi</td></tr>'
                 f'{rows}</table></div>')
    note = ('<div style="font:700 18px Nunito;color:#5a3a42;margin-bottom:18px">Chung cho cả 5 video: dọc 1080×1920, 10–15 giây, hành động ngay giây 0, cùng hệ chữ (Nunito Black lộn xộn + Baloo đóng dấu), '
            'logo mới + "Đập hình cùng chúng mình nhé!" + link ở 1,5 giây cuối, chữ tránh 250 px trên/dưới (nút của app).</div>')
    return ('<div style="font:900 44px Nunito">Thumbnail trailer · 3 hướng</div>'
            '<div style="font:700 20px Nunito;color:#7a5a62;margin:6px 0 20px">Thumbnail 1280×720, chữ đọc được ở cỡ điện thoại; ô gạch là chỗ YouTube đè thời lượng (không đặt gì quan trọng).</div>'
            f'<div style="display:flex;gap:30px">{thumbs}</div>')


if __name__ == '__main__':
    MODE = sys.argv[1] if len(sys.argv) > 1 else 'local'
    fr.MODE = MODE
    if MODE == 'canvas':
        fr.BL = json.load(open(os.path.join(fr.HERE, 'blobs.json')))
    fr.src = (lambda f: f'/_blob/{fr.BL[f]}') if MODE == 'canvas' else (lambda f: f)
    css = fr.CSS + TH
    if MODE == 'local':
        open(os.path.join(fr.HERE, 'plan2.html'), 'w', encoding='utf-8').write(
            f'<!doctype html><html lang="vi"><head><meta charset="utf-8">{fr.FONTS}<style>body{{margin:0;background:#ece3cf;padding:40px;color:#2a1418}}{css}</style></head><body>{board()}</body></html>')
    else:
        print(json.dumps({'css': css, 'body': board(), 'fonts': fr.FONTS}))
