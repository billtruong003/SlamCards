# Dép Lào Tuổi Thơ (Slam Cards)

Game đập bài bằng dép chơi online trên trình duyệt, 2–4 người. Mỗi người một lá bài úp trên bàn, thay phiên đập dép xuống bàn để gió hất bài bay. Lật bài mình ngửa rồi cho nó đè lên bài úp của địch là ăn.

**Chơi:** https://billthedevstudio.io.vn/slam-cards/ (bản dự phòng: http://14.225.255.73:8096)

Làm bởi [BillTheDev](https://www.billthedev.com).

---

## Luật chơi

- Mỗi người 1 lá bài, ban đầu đều **úp**. Đánh nhiều ván, ai **thắng 2 ván** trước thì thắng trận.
- **Đập:** chỉ được đập trong vòng tầm với quanh bài mình. Không có thanh lực: đập càng sát bài, bài bay càng mạnh và lật càng nhiều. Không được đập lên lá bài. Tay hơi run nên dép rơi lệch một chút.
- **Kiểu đập:** đập bằng (bài bay cao, lật nhiều) hoặc đập nghiêng (bài trượt xa, ít lật). Phím Q/E.
- **Gió:** đổi mỗi lượt (cấp 0–4), thổi bài bay lệch theo hướng mũi tên.
- **Ăn:** bài **ngửa** nằm đè hẳn lên bài **úp** của người khác. Ăn được cả trong lượt địch: địch tự đập bài nó lật úp nằm dưới bài m ngửa thì m vẫn ăn.
- **Rớt bàn:** cú đập của ai làm bất kỳ lá nào rớt khỏi bàn thì người đó bị loại. Đập ngoài mép bàn vẫn được, dùng để hất bài đang nấp sát mép.
- **Bỏ lượt:** đập chỗ trống là bỏ lượt. Không được bỏ 2 lần liền: lượt sau bắt buộc đập trong vòng hồng sát bài mình. Mỗi lượt 30 giây, hết giờ coi như bỏ lượt.
- **2 người:** tù xì, người thắng chọn đập trước hay nhường. **3–4 người:** thứ tự ngẫu nhiên rồi đi theo chiều kim đồng hồ, bị ăn là bị loại, ai trụ cuối cùng thắng ván.

Chi tiết thiết kế ở [Concept.md](Concept.md). File này viết trước khi có chế độ 3–4 người, chưa cập nhật theo luật mới nhất; luật đúng là luật ở trên và code trong `proto/src/rules.js`.

---

## Cấu trúc thư mục

```
proto/                 Game web (đây là phần đang chạy)
  index.html
  src/
    main.js            Luồng client: menu, phòng chờ, các màn overlay, HUD, nhập liệu, mạng
    world.js           Three.js scene + vật lý Rapier, camera, render theo yêu cầu, rung camera
    rules.js           Luật dùng chung client/server: ghế, kích thước bàn, xử thắng thua (judge)
    config.js          Mọi con số tune được (lực đập, tầm với, gió, mạng…)
    visuals.js         Vòng tầm với, con trỏ, mũi tên, dép rơi
    fx.js              Gió (vệt xoáy), hiệu ứng đập (gai + sóng + tia), vệt trắng sau bài
    cards.js           Shader lá bài (bo góc SDF, 2 mặt)
    deps.js            Nạp model dép .glb, toon shader + viền
    toon.js            Toon material và viền mực dùng chung
    intro.js           Logo studio BillTheDev lúc mở game
    audio.js music.js sound.js memes.js   Âm thanh: bus nhạc/meme/tiếng đập, meme chuẩn hóa âm lượng
    menu-bg.js         Nền động ở menu
    style.css
  server/server.js     Server Node: phục vụ file tĩnh + WebSocket, giữ phòng, xử luật, gió, lượt
  public/              Ảnh bài, nhạc, meme, model dép, logo
  deploy.sh            Build và đẩy lên VPS
  deploy/              Cấu hình nginx của domain
art/blender/           Script Blender dựng model dép (low-poly, texture palette)
mockup/                Mockup HTML: flow, review meme, FTUE, trang nhập chữ
TEXTS.md               Toàn bộ chữ trong game theo hạng mục (ID, chỗ hiện, giới hạn ký tự)
Concept.md             Tài liệu thiết kế
Assets/ Packages/ ProjectSettings/   Project Unity trống (template), chưa dùng
```

---

## Chạy ở máy

Cần Node 18 trở lên.

```bash
cd proto
npm install
npm run build
npm start
```

Mở http://localhost:8097. Muốn đổi cổng thì đặt biến `PORT`.

Mở 2 tab cùng một link phòng để tự chơi với mình. Thêm `?debug` vào URL để có `window.slamDebug` trong console (xem state, đặt bài, slow-mo hiệu ứng…).

`npm run dev` chạy Vite dev server ở cổng 5173 và proxy `/ws` sang server Node ở 8097, nên vẫn phải chạy `npm start` song song.

---

## Kiến trúc

- **Client:** Three.js 0.169 + Rapier 0.14 (bản non-compat, file `.wasm` nạp tay qua `instantiateStreaming`, xem `world.js` và alias trong `vite.config.js`). Vite build với `base: './'`, mọi đường dẫn asset là tương đối nên cùng một bản build chạy được ở `/` lẫn `/slam-cards/`.
- **Server có quyền quyết:** server giữ phòng, chọn gió, tù xì, thứ tự lượt và xử thắng thua bằng `rules.js`. Người đập chạy vật lý trên máy mình rồi stream đường bay lên server (`slamStart` → `slamChunk` mỗi 6 frame → `slamEnd`). Người xem phát lại có buffer, phát xong báo `playbackDone`; server đợi mọi người xem xong (tối đa 4 giây) mới qua lượt.
- **Kết nối lại:** token lưu trong `sessionStorage`, rớt mạng được chờ tối đa 60 giây.
- **Hiệu năng:** chỉ vẽ khi có gì thay đổi; gió chạy 30 hình/giây; tối đa khoảng 60 hình/giây trên màn hình tần số cao; tự hạ độ phân giải khi máy chậm; shadow map chỉ vẽ một lần. FPS hiện ở góc phải dưới.
- **Tải:** test 800 client giả lập tốn khoảng 20% một nhân CPU và 101 MB RAM.

---

## Deploy

VPS Ubuntu, ssh host `hordecall`. Code nằm ở `/opt/slam-cards`, chạy bằng pm2 (app `slam-cards`, cổng 8097). nginx đứng trước:

- `billthedevstudio.io.vn` (443, Let's Encrypt) → `/slam-cards/` proxy về 8097. Cấu hình: `proto/deploy/nginx-slam-domain.conf`.
- Cổng 8096 → 8097 (link IP cũ).

```bash
bash proto/deploy.sh
```

Script build client, nén `dist` + `server`, đẩy lên VPS rồi `pm2 restart`. Restart sẽ xóa các phòng đang mở.

DNS của domain quản lý ở PA Vietnam: bản ghi A `@` và `www` trỏ về `14.225.255.73`.

---

## Model dép

Dép làm bằng Blender 5.2, chạy script không cần mở giao diện:

```bash
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P art/blender/build_slippers_lowpoly.py -- art/blender/out_lowpoly
```

Ra file `.glb` và ảnh chụp thử trong `out_lowpoly/`. Copy `.glb` sang `proto/public/models/`, ảnh nhỏ cho phòng chờ nằm ở `proto/public/deps/`. Màu lấy từ ô trong `art/blender/palette.png` (bảng `SWATCH` trong script). Trong game dép được toon shader + viền mực (`deps.js`).

---

## Chữ trong game

Mọi chữ hiện trong game liệt kê ở [TEXTS.md](TEXTS.md), mỗi dòng có ID, chỗ hiện, ý cần nói và giới hạn ký tự. Sửa chữ thì sửa ở đó trước rồi mới vào code. Giọng: 70% rõ ràng, 30% cà khịa; nút, lỗi và hướng dẫn luật ưu tiên dễ hiểu; xưng "m".

---

## Việc tiếp theo

- **FTUE (hướng dẫn người mới):** mockup đã duyệt, chữ đã chốt (mục I trong TEXTS.md), chưa code. Gồm popup mời, 5 bước có hình, chỉ tay ở lượt đầu, câu nhắc theo tình huống, nút `?` xem lại luật.
- Cập nhật Concept.md theo luật 2–4 người.
- Cho đổi dép ở màn hết trận.
- Nâng giới hạn kết nối của nginx nếu đông người (hiện ước khoảng 500–700 người chơi cùng lúc).

---

## Credits

- Code, thiết kế: BillTheDev — https://www.billthedev.com — truongbill003@gmail.com
- Hình lá bài: Dani Maccari (CuteCards)
- Âm thanh meme và ảnh meme lấy từ các meme phổ biến trên mạng, chỉ dùng cho bản prototype phi thương mại.
