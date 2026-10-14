# Việc cần sửa

Danh sách từ đợt QA + review trải nghiệm ngày 14/10/2026 (nhánh `fix/stability-and-ftue`). Sửa xong mục nào thì đánh dấu `[x]`, ghi commit, và chạy lại đúng cách kiểm tra ở cột cuối.

Ký hiệu: **QA** = lỗi kỹ thuật, **UX** = code chạy đúng nhưng người chơi vấp. "Đã chạy thử" = đã tái hiện bằng cách chạy thật; "Đọc code" = suy ra từ code, chưa tái hiện. "Lỗi mới" = do đợt sửa trước gây ra; "Có từ đầu" = có từ commit đầu tiên, bản đang chạy cho người chơi cũng dính.

## P0 — phải sửa trước khi deploy

- [ ] **QA-01 · Server sập khi nhận tin nhắn > 2 MB (hoặc khung WebSocket lỗi).** Một tin nhắn làm mất mọi phòng đang chơi. Có từ đầu, production đang dính. Đã chạy thử 3/3.
  - Nguyên nhân: socket không có listener `error`, thư viện `ws` ném "Max payload size exceeded" thành lỗi không ai bắt (`server/server.js`, đoạn `wss.on('connection')`).
  - Sửa: thêm `ws.on('error', …)` (log rồi bỏ qua) và `wss.on('error', …)`.
  - Kiểm tra: bỏ `todo` ở test "huge message" trong `test/server-edge.test.js`, `npm test` phải pass.

- [ ] **UX-01 · Điện thoại: tiêu đề + mã phòng ở phòng chờ bị đẩy lên khỏi màn hình, cuộn không tới.** Chỉ xảy ra khi thẻ mời FTUE đang hiện. Lỗi mới. Đã chạy thử trên cả 5 thiết bị giả lập: iPhone SE −190px, Galaxy S9 −146px, iPhone 13 −130px, Pixel 7 −98px, iPad Mini −6px (không có thẻ mời thì ở 56px). Ảnh: `qa/screens/ux01-iphone-se-lobby-top.png`.
  - Nguyên nhân: `.menu-bg.with-invite` xếp dọc nhưng vẫn `justify-content:center`, phần tràn phía trên bị cắt (`src/ftue.css`).
  - Sửa: `justify-content:flex-start` cho `.menu-bg.with-invite`, để `margin:auto` lo căn giữa khi đủ chỗ.
  - Kiểm tra: 375×812, người mới vào bằng link → cuộn lên đầu thấy "Phòng XXXX".

## P1

- [ ] **UX-11 · Điện thoại nhỏ (iPhone SE), lượt đầu: chỉ tay + bong bóng nằm đè lên banner "TỚI M ĐẬP! · 30s", và bài của mình bị banner + chỉ tay che.** Đúng lúc quan trọng nhất của FTUE thì người mới không thấy bài mình. Đã chạy thử (ảnh `qa/screens/ux11-iphone-se-first-turn.png`).
  - Nguyên nhân: màn dọc đặt banner ở `bottom:118px`, trùng vùng bài của mình ở cuối bàn; bong bóng chỉ tay luôn nằm phía trên chấm.
  - Sửa: màn dọc đưa banner lên dải trên (dưới HUD) hoặc thu nhỏ; bong bóng chỉ tay tự lật xuống dưới/sang bên khi đè lên banner hoặc lên bài mình (đo bằng `getBoundingClientRect`).
- [ ] **UX-12 · Điện thoại xoay ngang: thẻ MẸO che banner lượt** (ai tới lượt, còn bao nhiêu giây). Đã chạy thử (ảnh `qa/screens/ux12-iphone-se-landscape.png`). Sửa: màn ngang đặt mẹo dưới banner hoặc ở góc dưới, không trùng `#banner`.
- [ ] **QA-02 · Gõ sai mã phòng thì báo "phòng hết hạn hoặc server vừa khởi động lại".** Sai ngữ cảnh khi gõ nhầm. Lỗi mới. Đã chạy thử.
  - Sửa: tách 2 câu. Mở link mời → K1 như hiện tại. Gõ mã → câu mới kiểu "Không thấy phòng {MÃ}. Xem lại mã nhé!". Mã chưa đủ 4 ký tự → báo luôn, đừng chỉ nháy ô nhập (hiện đang giữ lại thông báo lỗi cũ). Thêm chữ vào TEXTS.md mục K.
- [ ] **UX-02 · Tên người chơi màu hồng/xanh/lục gần như không đọc được ở màn đầu ván, kết ván, kết trận.** Tương phản khoảng 1:1 (cần ≥ 4.5:1). Có từ đầu. Đã chạy thử (ảnh kết trận "Tèo Bot" gần như vô hình).
  - Sửa: dòng điểm (`scoreLine` trong `src/main.js`) dùng chip nền kem viền mực như HUD, hoặc chữ kem có ô màu ghế bên cạnh.
- [ ] **UX-03 · Hết trận mà chỉ còn mình: nút "Tái đấu" chờ mãi.** Gặp mỗi lần bạn bỏ về. Có từ đầu (L5). Đã chạy thử.
  - Sửa: khi chỉ còn 1 người online thì đổi nút thành "Tạo phòng mới" (chữ mới, cần duyệt).
- [ ] **QA-06 · Người rớt mạng vẫn bắt cả bàn chờ đủ 30 giây mỗi lượt của họ** (40 giây nếu đang bị bắt đập). Có từ đầu (L4). Đọc code.
  - Sửa: ghế đang mất kết nối thì rút timer lượt xuống khoảng 8 giây.

## P2

- [ ] **QA-08 · Trình duyệt không có Web Audio (hoặc tạo AudioContext lỗi) thì cả game không chạy, chỉ hiện "Game tải lâu quá".** `src/audio.js` tạo `AudioContext` ngay khi nạp module, lỗi là chết luôn. Đã chạy thử trên WebKit (Playwright trên Windows không có Web Audio). iOS Safari thật có Web Audio nên ít người gặp, nhưng âm thanh là phần phụ, không được làm sập game.
  - Sửa: bọc việc tạo `AudioContext` trong try/catch, không có thì các bus âm thanh thành no-op, game vẫn chơi được không tiếng.
- [ ] **UX-04 · Điện thoại: cụm nút góc (?, Info, Âm thanh) che nút ở thẻ mời FTUE trong phòng chờ, và chỉ cao 30px** (nên ≥ 44px). Đã chạy thử: 375×812 che "Biết chơi rồi"; Pixel 7 che "Chỉ t chơi". Cả 5 thiết bị giả lập đều 30px.
  - Sửa: chừa khoảng trống đáy cho `.menu-bg` trên màn hẹp; tăng vùng chạm nút góc trên màn cảm ứng.
- [ ] **UX-05 · Điện thoại dọc: meme hiện đè lên bàn, che bài.** Có từ đầu. Đã chạy thử (meme che bài đối thủ).
  - Sửa: trên màn dọc đưa meme lên dải trên (dưới HUD) hoặc thu nhỏ; không che vùng bàn.
- [ ] **UX-06 · Người bấm "Biết chơi rồi" vẫn bị chỉ tay lượt đầu + mẹo trong 3 trận đầu.** **Cần m quyết:** tắt chỉ tay nhưng giữ mẹo, hay tắt cả hai?
- [ ] **UX-07 · Người được mời phải gõ tên trước khi vào phòng.** Đề xuất điền sẵn một tên ngẫu nhiên đúng giọng game (vd "Tí sún", "Tèo mũi"), sửa sau được. Chữ cần duyệt.
- [ ] **QA-07 · Ai trong phòng chờ cũng bấm được "Chiến thôi".** Có từ đầu (L6). Đọc code.
- [ ] **UX-08 · Bạn đến muộn bấm link khi phòng đang đánh thì bị đuổi về menu.** Có từ đầu (C5). Tối thiểu: báo "Phòng đang đánh, đợi hết trận rồi bấm lại link". Tốt hơn: cho ngồi xem và vào luôn ở trận sau.

## P3

- [ ] **QA-03 · Client chờ trả lời `peek` mãi nếu server là bản cũ** (chỉ xảy ra khi client và server lệch phiên bản lúc deploy). Đọc code. Sửa: chờ 5 giây không có trả lời thì vào phòng thẳng.
- [ ] **QA-04 · Mỗi phòng từng vào để lại một token trong localStorage, không bao giờ xóa.** Đọc code. Sửa: chỉ giữ 5 token gần nhất.
- [ ] **QA-05 · Reload giữa ván 1 của trận đầu thì chỉ tay lượt đầu hiện lại.** Đã chạy thử. Sửa: lưu cờ "đã đập lần đầu" vào storage.
- [ ] **UX-09 · Đập trong 0.6 giây cuối của lượt bị bỏ qua mà không có phản hồi.** Đọc code. Sửa: hiện chữ nhỏ "Hết giờ!" ở chỗ bấm.
- [ ] **UX-10 · Chưa có số liệu FTUE**, không biết người mới bỏ ở bước nào. Đề xuất gắn event: `room_join_success`, `ftue_invite_yes/no`, `ftue_step_n`, `ftue_skip`, `first_slam`, `first_flip`, `round_end`, `match_end`, `rematch`.
- [ ] **TXT-01 · Duyệt chữ nháp I17–I24 và K1–K7 trong TEXTS.md.**

## Hình ảnh & hiệu năng

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

## Đã kiểm tra, đang ổn

25 test tự động trên server thật (`npm test`). Trên trình duyệt: cả trận tới tái đấu, hòa tù xì, reload giữa trận về đúng ghế, server restart, link phòng không tồn tại, 2 tab giành ghế, mất kết nối hẳn, bấm Tạo phòng 3 lần liền, bỏ lượt + bị bắt đập, chỉ tay lượt đầu (330 lần mô phỏng vật lý, không rớt bàn), mẹo theo tình huống, bảng luật nhanh, màn 720p, màn điện thoại dọc trong trận.
