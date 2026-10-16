# Việc cần sửa

Danh sách từ đợt QA + review trải nghiệm ngày 14/10/2026 (nhánh `fix/stability-and-ftue`). Sửa xong mục nào thì đánh dấu `[x]`, ghi commit, và chạy lại đúng cách kiểm tra ở cột cuối.

Ký hiệu: **QA** = lỗi kỹ thuật, **UX** = code chạy đúng nhưng người chơi vấp. "Đã chạy thử" = đã tái hiện bằng cách chạy thật; "Đọc code" = suy ra từ code, chưa tái hiện. "Lỗi mới" = do đợt sửa trước gây ra; "Có từ đầu" = có từ commit đầu tiên, bản đang chạy cho người chơi cũng dính.

Danh sách này đã gộp việc của session "Kết nối VPS (fork)" (bàn giao: `docs/HANDOFF_VPS_STUDIO.md`, bảng việc tổng https://claude.ai/artifact/7AQugZcgZ1pgLcVcrK7F4h). Mã trong ngoặc là mã bên đó: S/C/D/L/U/W = lỗi trong artifact "Dép Lào: FTUE & lỗi", G = game, V = VPS, LU = Lucy, WS = web studio, A = Bill tự làm.

**Luật cứng**: test kĩ trước, deploy là bước cuối và phải hỏi Bill (deploy xóa các phòng đang chơi). Không đụng `lucy-*`, docker hordecall, `warp-svc`, backup trên VPS. Sửa code Lucy (`/root/lucy/hub`) phải theo CLAUDE.md của repo đó: `gitnexus_impact` trước khi sửa, `gitnexus_detect_changes` trước khi commit.

## Lộ trình phase dài (chốt 14/10: làm game, chưa quảng cáo)

Thiết kế đã duyệt: canvas https://claude.ai/artifact/XWcsPAYQfdDG6VZMPK4tJz (tab "Màn hình" + tab "Flow UI/UX").

**Cách làm mỗi bước**: code → `npm test` → `node qa/devices.mjs` (5 máy) → bước đụng giao diện thì thêm 11 ngôn ngữ trên iPhone SE (`SLAM_LANG=<mã>`) → commit. Chữ mới: `vi.json` + `context.json` + viết luôn 10 ngôn ngữ, gom lại cho Bill duyệt ở bước 22. **[DEPLOY]**: 0 người đang chơi → sao lưu `/opt/slam-cards` → `SLAM_HOST=root@14.225.255.73 bash proto/deploy.sh` → chạy `qa/devices.mjs`, `qa/phase1-checks.mjs`, `qa/live-match.mjs` trên bản live → xem log lỗi pm2 → báo Bill.

**Quyết định đã chốt**: chọn số người mặc định "Bất kỳ"; ghép ngẫu nhiên vào trận luôn, không Sẵn sàng, không bot giả người; phòng tạo với bạn mặc định Riêng tư; danh sách phòng công khai chỉ hiện pet + mã; ghép ngẫu nhiên hết giờ 2 lượt liền = bị loại; lọc từ xấu trong tên; mọi đồ đều miễn phí (chưa khóa, chưa quảng cáo).

### Mốc 1 · Kiểm chứng kỹ thuật
1. ✅ **Xong 14/10 · đạt.** `?stencil` trong game, code ở `src/stencil-card.js`, kiểm tra bằng `node qa/stencil-proto.mjs [chromium|webkit]` (cần server :8097) và `SLAM_STENCIL=1 node qa/live-match.mjs`. Kết quả: 4 lá nằm cạnh nhau / chồng nhau / ngửa trên úp / bay nghiêng / sát mép đều đúng; lật giữa không trung đúng ở 8 góc; dép rơi trên ô cửa không bị che; trận 2 người trọn vẹn không lỗi. Draw call: 54–64 cả cảnh (bản cũ 20) sau khi gộp pet thành 1 mesh có xương (7 mảnh → 2 lần vẽ) và chỉ vẽ mặt đang nhìn thấy. Chromium 60 FPS. WebKit giả lập trên Windows 21–31 FPS (bản cũ 30–40, vẽ bằng CPU nên chưa phản ánh iPhone thật) → **cần thử trên điện thoại thật** trước mốc 4. Cách dựng: sân khấu (bệ + pet + dép) luôn xoay về camera, nên lá nằm hướng nào pet cũng đứng thẳng nhìn người chơi; khoảng không phía sau đứng yên tạo chiều sâu.
   - Ghi chú kỹ thuật: three.js sắp theo renderOrder của Group trước (groupOrder) → chỉ đánh số mesh; đẩy depth ra xa bằng `gl_FragDepth` trong ShaderMaterial; dép đang rơi vẽ sau các lá (renderOrder 900).
   - Mô tả gốc: **Prototype lá stencil trên bàn thật** (cờ `?stencil` trong game, pet + dép cố định). Renderer `stencil: true`; mỗi lá 1 cặp mã (ngửa/úp), tối đa 4 lá. Ô cửa ghi stencil + đặt lại depth, khoảng không/bệ/pet/dép vẽ theo stencil; vẽ lá từ thấp lên cao để lá đè lá đúng; mặt úp đúng khi bài bay/lật; viền bàn không đè. Đo draw call + FPS (`qa/perf.mjs`), chạy WebKit/iPhone SE. **Xong khi**: 4 lá chồng/lật/bay đều đúng trên 5 máy giả lập, ≤ ~50 draw call. **Không đạt** → đổi sang vẽ khoảng không + pet ra texture (render-to-texture) rồi dán lên lá, ghi lại lý do.

### Mốc 2 · Phòng và vào trận
2. ✅ (15/10) **Chủ phòng + Sẵn sàng** (server + client, gộp QA-07): host = người tạo, rời thì chuyển cho người vào sớm nhất; khách Sẵn sàng / Hủy sẵn sàng; chủ phòng chỉ bắt đầu được khi ≥ 2 người và mọi khách sẵn sàng; tái đấu theo cùng luật. Vương miện, nhãn trạng thái trên ô ghế. Test từng luật.
3. ✅ (15/10) **Tạo phòng có tùy chọn + phòng công khai**: Riêng tư/Công khai, tối đa 2/3/4 (chủ phòng đổi được ở phòng chờ); server giữ danh sách (đang chờ lên đầu, lọc 2/3/4, chỉ gửi pet + mã); màn Phòng công khai tự cập nhật + trạng thái trống. Bảng: CreateRoom, Rooms, RoomsEmpty, RoomsPhone, Main. Test.
4. ✅ (15/10) **Chơi ngay**: hàng chờ server theo Bất kỳ/2/3/4; Bất kỳ đủ 2 → đếm 5 giây chờ thêm; 20 giây gợi ý ít người hơn; đủ người → phòng ẩn (không link), vào luôn; hủy; mất mạng > 10 giây khi chờ → về Màn chính. Màn hết trận ghép ngẫu nhiên: Tìm trận mới / Tái đấu (khi tất cả bấm) / Về menu. Bảng: Matching, MatchingPhone, MatchEndRandom. Test nhiều client giả (ghép đúng số, đếm ngược, hủy, rớt mạng, 2 tab).
5. ✅ (15/10) **Luật cho người lạ**: ghép ngẫu nhiên hết giờ 2 lượt liền = bị loại khỏi ván (server, test); lọc từ xấu trong tên (danh sách từ cho 10 ngôn ngữ ở server, tên bị chặn → tên ngẫu nhiên; test).
6. ✅ (15/10, phần Tủ đồ ở màn chính nối ở bước 11) **Màn chính mới** theo bảng Home/HomePhone (Tủ đồ bên trái trên máy tính, khung "Chơi với người lạ", "hoặc chơi với bạn"). Phần Tủ đồ lúc này mở các màn chọn ở mốc 3.

### Mốc 3 · Tủ đồ (skin)
7. ✅ (15/10) **Dữ liệu đồ** `src/catalog.js` (dùng chung client + server): 24 pet (id, file model, tên → key ngôn ngữ), 3 dép (model, danh sách phần tô màu, màu mặc định), bảng 12 màu dép, 4 màu bài (màu, màu đậm, màu khoảng không, hoa văn, biểu tượng ♥ ◆ ★ ♣). Giao thức `pickLook { pet, dep, depColors, cardColor }`: lưu localStorage, gửi server; server kiểm tra hợp lệ, chặn trùng màu bài (trùng thì giữ màu cũ + báo; ghép ngẫu nhiên thì server tự đổi màu cho người vào sau). Đổi đồ ở phòng chờ → tự bỏ Sẵn sàng. Test.
8. ✅ (15/10; xem trước 3D trong tủ đồ, ảnh dép trong ô vẫn là ảnh cũ tới bước 18) **Dép tô màu trong game**: đưa shader tô theo ô palette từ mockup vào `toon.js`; dép lào 2 phần, dép lê 3 phần, tổ ong 1 phần; dép người khác hiện đúng màu họ chọn. Màn chọn dép theo bảng PickDep (xem 3D xoay được). Sửa ART-01 (dải toon rõ).
9. ✅ (15/10) **Màu bài mới**: 4 màu + hoa văn + biểu tượng thay ĐEN/ĐỎ/XANH/LỤC ở mọi chỗ (ô ghế, chip HUD, dòng điểm, nhãn ▲/▼, lá bài cũ tạm tô theo màu mới). Màn chọn màu bài; màu đã có người lấy thì mờ. Hoa văn từng màu dùng cho nền khoảng không ở mốc 4.
10. ✅ (15/10; xem pet trong lá bài làm ở mốc 4) **Màn chọn pet** theo bảng PickPet: lưới 24 pet (tải ảnh nhỏ, không tải model khi chưa cần), xem pet trong lá bài.
11. ✅ (15/10) **Tủ đồ ở Màn chính + Phòng chờ** nối vào 8–10; lá của m to bên trái (máy tính).
12. ✅ (15/10) **[DEPLOY 2]**: mốc 2 + mốc 3 (lá bài vẫn kiểu cũ nhưng màu, dép, pet đã chọn được).

### Mốc 4 · Lá bài mới trong game
13. ✅ (15/10; `?classic` còn giữ lá cũ) **Thay `cards.js`** bằng lá stencil từ bước 1: mặt ngửa (khung màu ghế, ô cửa, dải tên pet, nhãn dép), mặt úp (hoạ tiết cáo + logo BillTheDev), khoảng không 3 lớp theo màu/hoa văn, bệ tròn; viền pet theo pháp tuyến mượt; chỉ tải model pet của người trong phòng; vật lý giữ hộp 1 × 1.478.
14. ✅ (15/10) **Pet phản ứng**: AnimationMixer mỗi lá; tới lượt → gật, ăn bài → nhảy múa, bị ăn → lắc đầu, rớt bàn → ngã, chờ → đứng yên thở. Dừng hoạt cảnh khi lá úp (đỡ tốn máy).
15. ✅ (15/10; máy chậm 6×: 60 FPS, cú đập max 117 ms, ≤ 50 draw call) **Hiệu năng**: PERF-01 (warm-up shader trước trận), giới hạn số pet chuyển động, `qa/perf.mjs` với 4 lá (mục tiêu 60 FPS laptop, ≤ ~50 draw call, không khung > 50 ms trên máy chậm 4×), `qa/devices.mjs`.
16. ✅ (15/10; lá vẽ bằng CSS, `qa/ftue-art.mjs`) **Giữ nhãn ▲NGỬA / ▼ÚP** một thời gian; FTUE bước 1 + 3 vẽ lại theo lá mới.

### Mốc 5 · Ảnh và tài nguyên
17. ✅ (15/10; `src/asset-studio.js`) **Ảnh pet** 24 con (thumbnail 128 px, nền trong) chụp bằng shader game (`qa/render-assets.mjs` chạy trên game, không phải mockup).
18. ✅ (15/10) **Ảnh dép** 3 loại × màu mặc định cho màn chọn, chụp bằng shader game; xóa `public/deps/*.jpg` kiểu Blender (ART-02).
19. ✅ (15/10; `qa/ribbon-fit.mjs`: mọi tên vừa ở cỡ 42 px, 10 ngôn ngữ) **Mặt lá bài**: vẽ bằng canvas lúc chạy (khung, dải tên, nhãn dép, mặt sau từ `brand/*.svg`); không cần file ảnh lá. Kiểm tra chữ tên pet ở 11 ngôn ngữ vừa dải tên.
20. ✅ (15/10) **Biểu tượng giao diện** (SVG nét, không emoji): vương miện chủ phòng, dấu ✓ sẵn sàng, quả địa cầu, vòng xoay đang tìm, khóa Riêng tư, người (số người).
21. ✅ (15/10; `sound.js` chime) **Âm thanh mới** (tạo bằng code như tiếng "bốp", không tải file): "đã tìm được trận", "sẵn sàng", "bị loại vì treo máy". Tắt theo thanh âm thanh hiện có.
22. ✅ (15/10: Bill duyệt gói dep-lao-localization (1), merge 107 key `updates/`; i18n + 5 máy × 10 ngôn ngữ sạch) **Chữ mới** (tên 24 pet, tên màu, Sẵn sàng, phòng công khai, chơi ngay…): gom `STRINGS.md` → Bill duyệt/đưa AI viết lại → `i18n:check` → 11 ngôn ngữ trên iPhone SE.
23. ✅ (15/10) **Ghi công**: Kenney (pet, CC0) trong bảng Info; cập nhật `public/models/LICENSE-kenney.txt`.

### Mốc 6 · QA lớn + phát hành
24. ✅ (15/10; `qa/m6-full.mjs` 4 người ghép "Bất kỳ", phòng 3 người, rớt mạng ở phòng chờ + trong trận, 2 tab, server khởi động lại; 5 máy × 10 ngôn ngữ 0 lỗi; perf máy chậm 6×: đập max 83 ms = mức cũ) **QA đầy đủ** (skill game-qa-strict + game-ux-scenario-review): 2/3/4 người thật bằng nhiều trình duyệt, ghép ngẫu nhiên với nhiều client giả, phòng công khai, tủ đồ, đổi đồ khi đã Sẵn sàng, rớt mạng ở từng màn, 2 tab, server khởi động lại; 5 máy + 11 ngôn ngữ; hiệu năng.
25. ✅ (15/10 15:50; backup VPS `/root/slam-cards-backup-20261015-1548-pre-deploy3.tgz`; QA live: 5 máy, phase1, m2, m3, trận đầy đủ, FTUE sạch; pm2 0 lỗi) **[DEPLOY 3]** Tủ đồ + lá bài mới + vào trận mới.

### Mốc 7 · Thêm cho game (sau phát hành)
26. G5 ảnh xem trước khi gửi link phòng (Open Graph 1200 × 630, theo ngôn ngữ, có lá bài + tên phòng).
27. G2 ủng hộ: dải mời hết trận, nút góc, bảng QR / tấm trượt "Lưu ảnh mã QR", danh sách người ủng hộ công khai.
28. UX-08 bản đầy đủ: bạn đến muộn ngồi xem rồi vào trận sau.
29. **[DEPLOY 4]**.

### Mốc 8 · Biểu cảm nhanh + chat + mời bạn (mockup đã duyệt 16/10: canvas trang "Biểu cảm + chat + mời bạn")
30. ✅ (16/10) Server: `react` (sticker / câu nhanh theo danh mục `catalog.js`), `chat` (chỉ phòng bạn bè, ≤ 80 ký tự, lọc từ xấu bằng `cleanChat`, giữ 30 dòng cho người vào sau), chống spam 3 lần / 5 giây mỗi loại; `test/social.test.js`.
31. ✅ (16/10) Client `src/social.js` + `social.css`: bảng biểu cảm (Mặt / Mèo / Câu nhanh, hàng gợi ý theo tình huống, phím T và 1–8), bong bóng trên lá người gửi (trên → cạnh → dưới lá, tránh dải HUD), dải chat (máy tính), khung soạn trong trận tự đóng khi tới lượt, chat phòng chờ (cột phải màn rộng / thanh + tấm trượt màn hẹp), chạm chip tên để ẩn một người, công tắc trong Âm thanh; nút "Mời bạn" (bảng chia sẻ trên điện thoại, copy trên máy tính); 35 chuỗi × 10 ngôn ngữ; `qa/social-ui.mjs`.
32. ⏳ **Ảnh sticker cho bản công khai**: 32 sticker trong `public/stickers/` là bộ tạm lọc từ các gói emoji.gg Bill gửi (không ghi giấy phép, ảnh gốc 56–230 px nên mờ khi phóng). Trước khi deploy công khai: vẽ lại theo nét game (viền mực, toon, ≥ 256 px) hoặc Bill chấp nhận rủi ro. Thay ảnh = thay file cùng tên.
33. Mã QR trong phòng chờ (mockup có, chưa làm).

### Để sau (chưa làm)
- G4 số liệu (không chặn game) → LU1–LU5 bảng số Lucy.
- G6 nút "Báo lỗi" (cần hộp `support@`, A1).
- Quảng cáo (Q3, ADS-01/02, WS3, WS4, A4), web studio (WS1/2/5/6), Android (AdMob), cổng game (CrazyGames…), khóa đồ / mở bằng quảng cáo.
- VPS: V1 ưu tiên CPU, V2 tin Telegram thử, V3 reboot (chờ Bill). OPS-01 alias ssh.
- Bill: A1 hộp mail, A2/A3/A5/A6.

## Câu hỏi

- [x] **Q1 · Luật "đè hẳn"**: đã chốt 14/10. Giữ code (≥ 50% diện tích chồng lên là "đè hẳn") và giữ chữ "đè hẳn", vì hai cách nói không khác nghĩa.
- [x] **Q2 · Mockup FTUE**: đã duyệt 14/10, làm theo mockup. FTUE đã có trong nhánh (`src/ftue.js`, `src/ftue.css`).
- [ ] **Q3** · Duyệt chỗ đặt quảng cáo (mục G3). Mockup 3 chỗ ở canvas https://claude.ai/artifact/XWcsPAYQfdDG6VZMPK4tJz, hàng "Q3". Chờ Bill xem.
- [x] **Q4** · Cổng game dùng `billthedevstudio.io.vn` (chốt 14/10).
- [x] **Q5** · Tạm thời đưa 3 game casual (Meh Merge, Nah Blocks, Bruh Arrows), chỉ gồm nội dung quảng cáo, video YouTube, ảnh store và link store (chốt 14/10).
- [x] **Q6** · Gmail chính: truongbill003@gmail.com (chốt 14/10). Hộp mail studio (A1) tạo trên PA Vietnam: Bill tự đăng nhập và tạo, Claude không được tạo tài khoản/đặt mật khẩu thay.
- [x] **Q7** · Có danh sách người ủng hộ công khai (chốt 14/10). Thêm vào G2.
- [x] **UX-06** · Người bấm "Biết chơi rồi": tắt cả chỉ tay lẫn mẹo (chốt 14/10).

## P0 — phải sửa trước khi deploy

- [x] **QA-01 · Server sập khi nhận tin nhắn > 2 MB (hoặc khung WebSocket lỗi).** Một tin nhắn làm mất mọi phòng đang chơi. Có từ đầu, production đang dính. Đã chạy thử 3/3.
  - Nguyên nhân: socket không có listener `error`, thư viện `ws` ném "Max payload size exceeded" thành lỗi không ai bắt (`server/server.js`, đoạn `wss.on('connection')`).
  - Sửa: thêm `ws.on('error', …)` (log rồi bỏ qua) và `wss.on('error', …)`.
  - Kiểm tra: bỏ `todo` ở test "huge message" trong `test/server-edge.test.js`, `npm test` phải pass.
  - Xong 14/10: `npm test` 26/26 pass.

- [x] **UX-01 · Điện thoại: tiêu đề + mã phòng ở phòng chờ bị đẩy lên khỏi màn hình, cuộn không tới.** Chỉ xảy ra khi thẻ mời FTUE đang hiện. Lỗi mới. Đã chạy thử trên cả 5 thiết bị giả lập: iPhone SE −190px, Galaxy S9 −146px, iPhone 13 −130px, Pixel 7 −98px, iPad Mini −6px (không có thẻ mời thì ở 56px). Ảnh: `qa/screens/ux01-iphone-se-lobby-top.png`.
  - Nguyên nhân: `.menu-bg.with-invite` xếp dọc nhưng vẫn `justify-content:center`, phần tràn phía trên bị cắt (`src/ftue.css`).
  - Sửa: `justify-content:flex-start` cho `.menu-bg.with-invite`, để `margin:auto` lo căn giữa khi đủ chỗ.
  - Kiểm tra: 375×812, người mới vào bằng link → cuộn lên đầu thấy "Phòng XXXX".
  - Xong 14/10: `qa/devices.mjs` cả 5 máy, đỉnh thẻ phòng chờ ở 16px, nút góc không còn đè nút thẻ mời.

- [ ] **OPS-01 · `proto/deploy.sh` không chạy được từ máy này**: nó dùng ssh host `hordecall`, mà `C:\Users\ducnq\.ssh\config` chưa có alias đó. Thêm:
  ```
  Host hordecall
    HostName 14.225.255.73
    User root
    IdentityFile ~/.ssh/id_ed25519
  ```
  Kiểm tra: `ssh hordecall true` chạy không hỏi mật khẩu.

## Deploy và vận hành (gộp vào một lần deploy giờ vắng, chờ Bill đồng ý)

Production vẫn chạy `80d3c9c`. Trước khi deploy: `ss -tn state established '( sport = :8097 )' | wc -l` gần 0. Bản sao config VPS: `/root/vps-maintenance-20261014/`.

- [x] **DEP-01 · Deploy nhánh `fix/stability-and-ftue`** (14/10, kèm 10 ngôn ngữ; deploy bằng `SLAM_HOST=root@14.225.255.73 bash deploy.sh` vì chưa có alias). Bản cũ sao lưu ở VPS `/root/slam-cards-backup-20261014-80d3c9c.tgz`.
- [x] **G7** · (xong 14/10) pm2 giới hạn RAM: `pm2 restart slam-cards --max-memory-restart 400M --update-env && pm2 save`.
- [ ] **V1** · Ưu tiên CPU cho game: `/usr/local/bin/vps-priority` (cron 5 phút) `renice 10` các tiến trình `lucy-*`; thêm `nice -n 15` vào dòng `cron_dream.sh` trong crontab root. Bill đã duyệt.
- [ ] **V3** · Reboot giờ vắng để nạp thư viện vừa cập nhật.
- [ ] **V2** · Gửi tin Telegram thử (`vps-diskguard --test`). Chỉ khi Bill cho phép.
- [x] **G8** · ~~Bỏ link IP `:8096` khỏi README và `deploy.sh`~~ (xong 14/10; cổng 8096 trên nginx vẫn mở, đóng khi deploy nếu Bill đồng ý). Concept.md đã thêm luật 2–4 người (14/10).

## P1

- [x] **UX-11 · Điện thoại nhỏ (iPhone SE), lượt đầu: chỉ tay + bong bóng nằm đè lên banner "TỚI M ĐẬP! · 30s", và bài của mình bị banner + chỉ tay che.** Đúng lúc quan trọng nhất của FTUE thì người mới không thấy bài mình. Đã chạy thử (ảnh `qa/screens/ux11-iphone-se-first-turn.png`).
  - Nguyên nhân: màn dọc đặt banner ở `bottom:118px`, trùng vùng bài của mình ở cuối bàn; bong bóng chỉ tay luôn nằm phía trên chấm.
  - Sửa: màn dọc đưa banner lên dải trên (dưới HUD) hoặc thu nhỏ; bong bóng chỉ tay tự lật xuống dưới/sang bên khi đè lên banner hoặc lên bài mình (đo bằng `getBoundingClientRect`).
- [x] **UX-12 · Điện thoại xoay ngang: thẻ MẸO che banner lượt** (ai tới lượt, còn bao nhiêu giây). Đã chạy thử (ảnh `qa/screens/ux12-iphone-se-landscape.png`). Sửa: màn ngang đặt mẹo dưới banner hoặc ở góc dưới, không trùng `#banner`.
- [x] **QA-02 · Gõ sai mã phòng thì báo "phòng hết hạn hoặc server vừa khởi động lại".** Sai ngữ cảnh khi gõ nhầm. Lỗi mới. Đã chạy thử.
  - Sửa: tách 2 câu. Mở link mời → K1 như hiện tại. Gõ mã → câu mới kiểu "Không thấy phòng {MÃ}. Xem lại mã nhé!". Mã chưa đủ 4 ký tự → báo luôn, đừng chỉ nháy ô nhập (hiện đang giữ lại thông báo lỗi cũ). Thêm chữ vào TEXTS.md mục K.
- [x] **UX-02 · Tên người chơi màu hồng/xanh/lục gần như không đọc được ở màn đầu ván, kết ván, kết trận.** Tương phản khoảng 1:1 (cần ≥ 4.5:1). Có từ đầu. Đã chạy thử (ảnh kết trận "Tèo Bot" gần như vô hình).
  - Sửa: dòng điểm (`scoreLine` trong `src/main.js`) dùng chip nền kem viền mực như HUD, hoặc chữ kem có ô màu ghế bên cạnh.
- [x] **UX-03 (L5) · Hết trận mà chỉ còn mình: nút "Tái đấu" chờ mãi.** Gặp mỗi lần bạn bỏ về. Có từ đầu (L5). Đã chạy thử.
  - Sửa: khi chỉ còn 1 người online thì đổi nút thành "Tạo phòng mới" (chữ mới, cần duyệt).
- [x] **QA-06 (L4) · Người rớt mạng vẫn bắt cả bàn chờ đủ 30 giây mỗi lượt của họ** (40 giây nếu đang bị bắt đập). Có từ đầu (L4). Đọc code.
  - Sửa: ghế đang mất kết nối thì rút timer lượt xuống khoảng 8 giây.

## P2

- [x] **QA-10 · Server: người đập gửi chuyển động bài, mà có một ghế đang offline đứng trước trong danh sách, thì server lỗi `null.send` và dừng gửi cho những người sau.** Gặp trên bản live (log lỗi 11 lần, lúc test người rời giữa trận). Người xem sau ghế offline không thấy bài bay, chỉ thấy kết quả. Sửa `relayChunk`, có test server.

- [x] **QA-09 · Mạng chậm: thẻ "Game tải lâu quá" hiện lúc 20 giây rồi nằm đè menu dù game đã tải xong, che nút Vào phòng.** Gặp trên bản live (iPhone 13 giả lập, tải 22 giây). Sửa: ẩn thẻ khi game tải xong. Kiểm tra: `node qa/slow-boot.mjs`.
- [x] **UX-13 · Màn kết ván: dòng điểm "Bill 1 · Tèo 0" bị lá bài thắng và nhãn ▲ NGỬA của nó che.** Gặp trên bản live (`qa/out/match/04-round-end.png`). Sửa: nhãn bài nằm dưới lớp overlay, hoặc dời dòng điểm khỏi giữa màn.

- [x] **QA-08 · Trình duyệt không có Web Audio (hoặc tạo AudioContext lỗi) thì cả game không chạy, chỉ hiện "Game tải lâu quá".** `src/audio.js` tạo `AudioContext` ngay khi nạp module, lỗi là chết luôn. Đã chạy thử trên WebKit (Playwright trên Windows không có Web Audio). iOS Safari thật có Web Audio nên ít người gặp, nhưng âm thanh là phần phụ, không được làm sập game.
  - Sửa: bọc việc tạo `AudioContext` trong try/catch, không có thì các bus âm thanh thành no-op, game vẫn chơi được không tiếng.
- [x] **UX-04 · Điện thoại: cụm nút góc (?, Info, Âm thanh) che nút ở thẻ mời FTUE trong phòng chờ, và chỉ cao 30px** (nên ≥ 44px). Đã chạy thử: 375×812 che "Biết chơi rồi"; Pixel 7 che "Chỉ t chơi". Cả 5 thiết bị giả lập đều 30px.
  - Sửa: chừa khoảng trống đáy cho `.menu-bg` trên màn hẹp; tăng vùng chạm nút góc trên màn cảm ứng.
- [x] **UX-05 · Điện thoại dọc: meme hiện đè lên bàn, che bài.** Có từ đầu. Đã chạy thử (meme che bài đối thủ).
  - Sửa: trên màn dọc đưa meme lên dải trên (dưới HUD) hoặc thu nhỏ; không che vùng bàn.
- [x] **UX-06 · Người bấm "Biết chơi rồi" vẫn bị chỉ tay lượt đầu + mẹo trong 3 trận đầu.** Bill chốt: tắt cả hai. Xong 14/10: bấm "Biết chơi rồi" đặt số trận đã chơi lên 3, chỉ tay và mẹo đều tắt. Kiểm tra: `node qa/ux06-check.mjs`.
- [x] **UX-07 · Người được mời phải gõ tên trước khi vào phòng.** Đề xuất điền sẵn một tên ngẫu nhiên đúng giọng game (vd "Tí sún", "Tèo mũi"), sửa sau được. Chữ cần duyệt.
- [x] **QA-07 (L6) · Ai trong phòng chờ cũng bấm được "Chiến thôi".** Có từ đầu. Đọc code. Làm chung với Tủ đồ mục A.
- [x] **UX-08 (C5) · Bạn đến muộn bấm link khi phòng đang đánh thì bị đuổi về menu.** Có từ đầu (C5). Tối thiểu: báo "Phòng đang đánh, đợi hết trận rồi bấm lại link". Tốt hơn: cho ngồi xem và vào luôn ở trận sau.

## P3

- [x] **QA-03 · Client chờ trả lời `peek` mãi nếu server là bản cũ** (chỉ xảy ra khi client và server lệch phiên bản lúc deploy). Đọc code. Sửa: chờ 5 giây không có trả lời thì vào phòng thẳng.
- [x] **QA-04 · Mỗi phòng từng vào để lại một token trong localStorage, không bao giờ xóa.** Đọc code. Sửa: chỉ giữ 5 token gần nhất.
- [x] **QA-05 · Reload giữa ván 1 của trận đầu thì chỉ tay lượt đầu hiện lại.** Đã chạy thử. Sửa: lưu cờ "đã đập lần đầu" vào storage.
- [x] **UX-09 · Đập trong 0.6 giây cuối của lượt bị bỏ qua mà không có phản hồi.** Đọc code. Sửa: hiện chữ nhỏ "Hết giờ!" ở chỗ bấm.
- [ ] **UX-10 (= một phần G4) · Chưa có số liệu FTUE.** Làm chung với G4 theo hợp đồng sự kiện chuẩn, không làm riêng.
- [x] **TXT-01 · Duyệt chữ nháp I17–I24 và K1–K7 trong TEXTS.md.**

## Đo đạc + bảng số Lucy (làm sau deploy)

Kế hoạch đã chốt với Bill: màn **Game** trong Lucy, 6 tab (Tổng quan, Người chơi, Trận đấu, FTUE, Ủng hộ, Kỹ thuật); tên người chơi + mã ẩn danh trong localStorage; **không lưu IP**; tin tóm tắt Telegram 8:00. Chi tiết: `docs/HANDOFF_VPS_STUDIO.md` mục 3.

- [ ] **G4 (gồm UX-10)** · `server/analytics.js` + `src/analytics.js`: ghi JSONL theo hợp đồng sự kiện (`session_start`, `room_create/join`, `join_error`, `match_start`, `round_end`, `match_end`, `rematch`, `ftue_*`, `hint_shown`, `client_error`, `ws_drop/resume`, `server_start/error`, `slam`, `pass`, `donate_*`) ra `/var/lib/game-analytics/slam-cards/YYYY-MM-DD.jsonl`. `GET /__stats` chỉ ở 127.0.0.1, có số kết nối, phòng, độ trễ event loop. Client gửi qua WebSocket, danh sách tên cho phép, tối đa 20 sự kiện/phút/người. Có test.
- [ ] **LU1** · Lucy server `routes/games.ts` + job gom số 00:10, giữ file thô 30 ngày.
- [ ] **LU2** · Lucy giao diện theo canvas trang "Lucy" (https://claude.ai/artifact/CjdMqkAyKS6BuFnxjY9uTb).
- [ ] **LU3** · Tóm tắt Telegram 8:00 + nút "Hỏi Lucy".
- [ ] **LU4** · Tín hiệu "cần nâng máy": online đỉnh/ngày > 1.000, độ trễ p95 > 50 ms, CPU game > 70% một nhân, load 15 phút > 1.6, RAM trống < 500 MB; đỏ 3 ngày liền thì báo Telegram.
- [ ] **LU5** · HTTPS cho Lucy (token đang đi qua http thường), vd `lucy.billthedevstudio.io.vn`.

## Tính năng khác

- [ ] **G2** · Ủng hộ trong game theo canvas trang "Dép Lào · Ủng hộ": dải mời ở màn hết trận, nút "Ủng hộ" cạnh Info/Âm thanh, bảng QR (máy tính), tấm trượt có nút "Lưu ảnh mã QR" (điện thoại). Không hiện tên chủ tài khoản. Có danh sách người ủng hộ công khai (Q7). QR gốc: `C:\Users\ducnq\Downloads\77375854_download.webp`, cắt x 324–845, y 360–911. Chữ mới vào TEXTS.md.
- [ ] **G5** · Ảnh xem trước khi dán link phòng (Open Graph) cho Zalo/Messenger.
- [ ] **G6** · Nút "Báo lỗi" (về `support@` hoặc Lucy).
- [ ] **G3** · Quảng cáo. Chờ Q3 + Bill đăng ký AdSense. Không chặn nút copy link; không bao giờ trong ván.
  - Kênh (Bill chốt 14/10): bản web prototype dùng Google H5 Games Ads (Ad Placement API, phải xin duyệt) cho quảng cáo nhận thưởng + toàn màn; banner để sau. Android (AdMob) và cổng game (CrazyGames…) để sau, xem mục "Để sau".
  - [ ] **ADS-01** · Gắn Ad Placement API ở chế độ test (`data-adbreak-test="on"`) sau cờ bật/tắt: `adBreak` lúc bấm "Về menu" (giới hạn 1 lần / 3 trận hoặc 5 phút), rewarded cho màu dép có khóa. Tắt tiếng game khi quảng cáo chạy. Bật thật khi AdSense duyệt.
  - [ ] **ADS-02** · Trước khi bật thật: trang chính sách riêng tư (WS3), `ads.txt` (WS4), và bảng hỏi đồng ý của một CMP được Google chứng nhận cho khách châu Âu/Anh/Thụy Sĩ.

## Web studio (cổng game ở `billthedevstudio.io.vn`)

- [ ] **WS1** · Cổng game từ canvas (trang tĩnh, dùng chung danh sách game với Lucy) trên `billthedevstudio.io.vn`. Đợt đầu: Dép Lào + 3 game casual (chỉ nội dung quảng cáo, video YouTube, ảnh store, link store).
- [ ] **WS3** · Trang pháp lý (riêng tư: tên người chơi, mã ẩn danh, quảng cáo).
- [ ] **WS4** · `ads.txt` cho web; giữ `app-ads.txt` ở billthedev.com.
- [ ] **WS2** landing `.com` · **WS5** press kit · **WS6** portfolio thêm nút "Game của studio" ở /arcade.

## Bill tự làm

- [ ] **A1** tạo 3 hộp mail `bill@`, `admin@`, `support@` · **A2** thống nhất tên tài khoản · **A3** cài Claude in Chrome · **A4** đăng ký AdSense · **A5** theo dõi Claude for Startups · **A6** thay key `chautn@gem-corp.global` trên VPS bằng key riêng.

## Đa ngôn ngữ

Ngôn ngữ chọn theo **ngôn ngữ trình duyệt** (`navigator.languages`), có ô chọn tay ở góc và `?lang=`. **Không** tra IP hay vị trí. Đợt 1: vi, en, zh-Hans, zh-Hant, id, th, pt-BR, es.

- [x] **L10N-01** · (xong 14/10, 194 chuỗi) Hạ tầng: `src/i18n.js`, `src/locales/vi.json` (nguồn) + `context.json` (chỗ hiện, độ dài tối đa), chuyển mọi chữ trong game sang `t()`, server gửi mã lỗi, font dự phòng cho chữ Trung/Thái, `npm run i18n:export` / `i18n:check`.
- [x] **L10N-02** (xong 14/10: 9 ngôn ngữ + vi viết lại) · Bill đưa `docs/localization/PROMPT.md` + `STRINGS.md` cho AI khác viết từng ngôn ngữ (và viết lại bản Việt cho tự nhiên hơn) → lưu `src/locales/<mã>.json` → `npm run i18n:check`.
- [x] **L10N-03** (xong 14/10: 11 ngôn ngữ trên iPhone SE, không chữ tràn) · Kiểm tra giao diện từng ngôn ngữ trên điện thoại giả lập (chữ dài vỡ nút, font Trung/Thái). Meme có chữ/giọng tiếng Việt: giữ nguyên hoặc thay theo ngôn ngữ (quyết sau).

## Quyền riêng tư (để không bị Google chặn quảng cáo)

- Không lưu IP, không tra vị trí theo IP, không dò vân tay trình duyệt. Mã người chơi là mã ngẫu nhiên trong localStorage (G4).
- Không gửi tên người chơi hay thông tin cá nhân nào cho Google/quảng cáo.
- nginx mặc định ghi IP vào log truy cập: ghi rõ trong trang chính sách (WS3), giữ log ngắn ngày (cân nhắc ẩn bớt octet cuối).
- Khách châu Âu/Anh/Thụy Sĩ: phải có bảng hỏi đồng ý (CMP được Google chứng nhận) trước khi hiện quảng cáo (ADS-02).

## Để sau

- **Android** (AdMob): sau khi bản web prototype ổn.
- **Cổng game** (CrazyGames, GameDistribution, Poki): từ từ, chưa làm. Khi làm cần: vào chơi ngay (ghép trận nhanh/đấu bot), bản build riêng có SDK của cổng (tắt QR ủng hộ và quảng cáo riêng).

## Tính năng mới: Tủ đồ (pet trong lá bài, dép tự chọn màu, chủ phòng + Sẵn sàng)

> Ghi chú gốc từ 14/10, giữ làm chi tiết kỹ thuật. Thứ tự làm và phạm vi mới nhất nằm ở **Lộ trình phase dài** phía trên.

Mockup chạy thật: `mockup/customize/index.html` (artifact https://claude.ai/artifact/FMn6afs8qBzdu4unpgC9ex). Pet: Kenney Cube Pets (CC0), 24 con, mỗi con 8 động tác, ~150 KB. Ảnh mockup: `qa/customize-shots.mjs` → `qa/out/customize/`.

**A. Phòng chờ: chủ phòng + Sẵn sàng** (làm trước, ít rủi ro, gộp với QA-07)
- [ ] Server: `host` = người tạo phòng (rời thì chuyển cho người vào sớm nhất còn lại); `ready` cho từng người; chỉ host `start`, khi ≥ 2 người và mọi khách đã sẵn sàng; đổi đồ thì tự bỏ sẵn sàng. Test tự động cho từng luật.
- [ ] Client: host thấy "Chiến thôi! ({n}/{m} sẵn sàng)" (khóa tới khi đủ), khách thấy "Sẵn sàng" / "Hủy sẵn sàng", ô ghế có 👑 và nhãn trạng thái. Tái đấu theo cùng luật (gộp UX-03).

**B. Dép nhiều màu, kiểu toon** (sửa luôn ART-01, ART-02)
- [ ] Shader tô lại màu theo ô palette (đã chạy trong mockup): dép lào 2 phần, dép lê 3 phần, tổ ong 1 phần. Bảng 12 màu mỗi phần.
- [ ] Phòng chờ: thay ảnh JPG bằng xem trước 3D trực tiếp (hoặc chụp lại bằng shader game).

**C. Lá bài stencil + pet**

Thiết kế lá đã chốt 14/10 (mockup `mockup/customize/`, canvas https://claude.ai/artifact/XWcsPAYQfdDG6VZMPK4tJz): mặt ngửa nền kem viền mực, khung màu ghế, ô cửa có khoảng hở với dải tên; trong ô là "khoảng không" 3 lớp (kiểu shader UI Background của Minions Art) + bệ tròn cho pet và dép; mặt úp là hoạ tiết cáo + logo, chữ Bill trắng · The xám · Dev cam. Viền pet đi theo pháp tuyến mượt nướng sẵn, độ dày viền là uniform.
- [ ] Renderer bật `stencil: true`; mỗi lá 1 cặp mã (ngửa/úp), tối đa 4 lá.
- [ ] Lá mới: mặt trước/sau vẽ bằng canvas (màu, hoa văn, biểu tượng, tên pet), ô cửa chỉ ghi stencil, căn phòng + pet + dép đạo cụ so stencil. Thay `cards.js`; vật lý giữ hộp 1 × 1.478.
- [ ] **Prototype riêng phần khó nhất**: bài nằm trên bàn thì căn phòng nằm dưới mặt bàn, bị bàn che ở depth test. Cần ô cửa đặt lại depth trước khi vẽ phòng, và vẽ các lá từ thấp lên cao để lá đè vẫn che lá dưới. Mockup hiện chỉ chứng minh lá đứng giữa không gian.
- [ ] Pet: chỉ tải pet của người trong phòng; `AnimationMixer` mỗi lá; nối động tác với sự kiện (ăn → nhảy, bị ăn → lắc đầu, tới lượt → gật, bài bay → chạy, rớt bàn → ngã).
- [ ] Ý "úp = pet ngủ, ngửa = pet thức": giữ nhãn ▲NGỬA/▼ÚP một thời gian, playtest xem người mới có hiểu không.
- [ ] Đo lại `qa/perf.mjs` (mục tiêu dưới ~50 draw call với 4 lá) và `qa/devices.mjs` (WebKit có stencil, iPhone SE).

**D. Màu bài mới + chọn đồ**
- [ ] Thay 4 màu ghế bằng hồng dâu / xanh biển / vàng nắng / xanh lá mạ + hoa văn (sọc chéo, chấm bi, răng cưa, ô cờ) + biểu tượng ♥ ◆ ★ ♣. Cập nhật CSS ghế, nhãn bài, chip HUD, dòng điểm (gộp UX-02).
- [ ] Người chơi tự chọn màu bài (màu đã có người lấy thì mờ). Lưu pet/dép/màu trong localStorage, gửi lên server (`pickLook`), server kiểm tra hợp lệ + trùng màu.
- [ ] Chữ mới vào TEXTS.md: tên 24 pet, tên màu, Sẵn sàng / Hủy sẵn sàng / Đợi chủ phòng / tab Tủ đồ. Sửa FTUE bước 1 + 3 theo lá bài mới. Ghi công Kenney trong bảng Info.

## Hình ảnh & hiệu năng

- [x] **ART-03 · Viền mực của bàn đè lên lá bài nằm sát mép.** Hull viền cao hơn mặt bàn 0.045 nên che bài ở mép xa. Sửa: viền bàn không ghi depth, vẽ sau sàn/bàn (`renderOrder` 1), bài vẽ sau viền (`renderOrder` 2). Bàn vẫn che bài nằm sau nó, viền thì không, và không có z-fight. Kiểm tra: `node qa/table-rim.mjs` (cần server :8097) → `qa/out/table-rim.png`.

- [ ] **ART-01 · Dép trong game nhìn như tô màu mượt, không ra chất toon.** Đã kiểm tra: dép có dùng `MeshToonMaterial` (3 dải) + viền mực, nhưng texture `art/blender/palette.png` là các ô **chuyển màu** (mỗi ô sáng → tối). UV của dép trải dọc ô nên bóng đổ đã "vẽ sẵn" trong màu, che mất các dải toon. Ảnh: `qa/screens/art01-slippers-closeup.png`.
  - Sửa (trong `art/blender/build_slippers_lowpoly.py`): mỗi vật liệu lấy màu ở **một điểm** của ô (dồn UV vào giữa ô), hoặc thay palette bằng ô màu phẳng. Xuất lại 3 file `.glb`. Có thể chỉnh thêm độ tương phản 3 dải trong `toonGradient()` (`src/toon.js`) sau khi màu nền đã phẳng.
  - Nghi thêm (chưa chứng minh): đèn bán cầu 1.6 (`HemisphereLight` trong `world.js`) tô mượt, không chia dải; nếu sau khi làm phẳng màu mà dải vẫn mờ thì giảm đèn này.
- [ ] **ART-02 · Ảnh dép ở phòng chờ (`public/deps/*.jpg`) là ảnh render Blender kiểu thật, không cùng phong cách toon + viền mực trong game.** Sửa: chụp lại ảnh từ chính model trong game (cùng shader), có thể tự động bằng script Playwright như `qa/toon-look.mjs`.
- [ ] **PERF-01 · Khựng nhẹ ở cú đập đầu tiên trên máy yếu.** Đo: điện thoại tầm trung (CPU chậm 4×) có 1 frame 50ms; máy yếu (CPU chậm 6×) có 3 frame giật, dài nhất 83ms. Số shader tăng dần 5 → 10 đúng lúc hiệu ứng đập/dép rơi xuất hiện lần đầu → trình duyệt biên dịch shader lúc đang chơi.
  - Sửa: sau khi tải xong, gọi `renderer.compile(scene, camera)` và cho hiệu ứng đập + dép rơi chạy một lần ngoài màn hình (warm-up) trước khi vào trận.

Đo hiệu năng ngày 14/10/2026 (`node qa/perf.mjs`, Chromium dùng GPU thật AMD Radeon 610M — GPU tích hợp yếu; kết quả ở `qa/perf-report-2026-10-14.json`):

| Cấu hình | FPS | Khung hình p95 | Khung dài nhất | Draw call | Tam giác |
|---|---|---|---|---|---|
| Laptop 1280×720 | 60 | 16.8 ms | 33 ms (1 lần, lúc đập) | 17–26 | ≤ 1 582 |
| Laptop 1920×1080 (dpr 1.5) | 60 | 16.7 ms | 16.8 ms | 17–25 | ≤ 1 182 |
| Pixel 7, CPU chậm 4× | 60 | 16.8 ms | 50 ms (lúc đập) | 17–28 | ≤ 1 592 |
| Galaxy S9+, CPU chậm 6× | 59–60 | 16.8 ms | 83.5 ms (lúc đập) | 17–28 | ≤ 1 592 |

- Game chỉ vẽ khi có gì thay đổi: lúc đứng yên vẽ 0 khung/giây (đỡ pin). Bộ nhớ JS khoảng 33 MB. Tải lần đầu 2.5–3.8 MB chưa nén; production đã bật gzip + cache 1 năm cho file trong `assets/`.
- Kết luận: chưa cần tối ưu lớn. Chỉ nên làm PERF-01. Giả lập chỉ làm chậm CPU, còn GPU vẫn là của laptop; điện thoại yếu thật (GPU, nóng máy) cần đo bằng máy thật qua Chrome remote debugging.

## Đợt test thiết bị giả lập

Playwright 1.48: WebKit (cùng engine với Safari) với hồ sơ iPhone 13, iPhone SE, iPad Mini; Chromium với Pixel 7, Galaxy S9+. Mỗi máy là người mới mở link mời: nhập tên → phòng chờ → 5 bước hướng dẫn → tù xì → chạm vào chỗ chỉ tay để đập → xoay ngang → xoay dọc. Âm thanh tắt.

- Cả 5 máy chạy hết luồng. Chạm đúng chỗ chỉ tay thì bài lật ngửa trên cả 5 máy, mẹo "Ngửa rồi kìa!" hiện ra, bài trên máy khớp server (lệch 0).
- Ô nhập tên cỡ chữ 18px nên iOS không tự phóng to trang khi chạm vào. Không trang nào bị cuộn ngang. Hướng dẫn 5 bước vừa màn trên mọi máy, nút "Tiếp" luôn thấy được.
- Lỗi tìm thêm: QA-08, UX-11, UX-12. Xác nhận lại UX-01 và UX-04 trên máy giả lập.
- Chạy lại: bật server (`cd proto && npm run build && npm start`), rồi `cd qa && npm i --no-save playwright@1.48.2 && npx playwright install webkit chromium` (một lần), rồi `node qa/devices.mjs` (hoặc thêm tên máy, vd `node qa/devices.mjs iPhone-SE-Safari`). Ảnh + `report.json` ra `qa/out/`. Kết quả đợt này lưu ở `qa/device-report-2026-10-14.json` và `qa/screens/`.
- Giới hạn: đây là giả lập, không phải máy thật. WebKit trên Windows thiếu Web Audio nên phải dùng âm thanh giả; GPU, hiệu năng và cách iOS tạm dừng tab chạy nền khác máy thật.

## Chưa test (cần test thêm)

- Máy thật (iPhone, Android tầm thấp), trình duyệt trong Zalo/Messenger/Facebook. Giả lập không thay được: hiệu năng, GPU, iOS tạm dừng tab khi chuyển app, bàn phím ảo thật.
- Mạng chậm/mất gói thật (trình duyệt tích hợp không có DevTools throttling).
- Một trận 3–4 người đầy đủ trên giao diện (logic 3 người đã có test tự động).
- Máy không có WebGL thật.

## Đã có trong nhánh (session VPS đối chiếu 14/10)

Các lỗi trong artifact "Dép Lào: FTUE & lỗi" đã sửa trong nhánh: S1, S2, C1, C2, C3, C4, C6, C7, C8, D1, D2, L1, L2, L3, L7, U1, W1, W2, W3. Còn mở: QA-01, và L4/L5/L6/C5 = QA-06/UX-03/QA-07/UX-08 ở trên.

## Đã kiểm tra, đang ổn

25 test tự động trên server thật (`npm test`). Trên trình duyệt: cả trận tới tái đấu, hòa tù xì, reload giữa trận về đúng ghế, server restart, link phòng không tồn tại, 2 tab giành ghế, mất kết nối hẳn, bấm Tạo phòng 3 lần liền, bỏ lượt + bị bắt đập, chỉ tay lượt đầu (330 lần mô phỏng vật lý, không rớt bàn), mẹo theo tình huống, bảng luật nhanh, màn 720p, màn điện thoại dọc trong trận.
