# Việc cần sửa

Danh sách từ đợt QA + review trải nghiệm ngày 14/10/2026 (nhánh `fix/stability-and-ftue`). Sửa xong mục nào thì đánh dấu `[x]`, ghi commit, và chạy lại đúng cách kiểm tra ở cột cuối.

Ký hiệu: **QA** = lỗi kỹ thuật, **UX** = code chạy đúng nhưng người chơi vấp. "Đã chạy thử" = đã tái hiện bằng cách chạy thật; "Đọc code" = suy ra từ code, chưa tái hiện. "Lỗi mới" = do đợt sửa trước gây ra; "Có từ đầu" = có từ commit đầu tiên, bản đang chạy cho người chơi cũng dính.

Danh sách này đã gộp việc của session "Kết nối VPS (fork)" (bàn giao: `docs/HANDOFF_VPS_STUDIO.md`, bảng việc tổng https://claude.ai/artifact/7AQugZcgZ1pgLcVcrK7F4h). Mã trong ngoặc là mã bên đó: S/C/D/L/U/W = lỗi trong artifact "Dép Lào: FTUE & lỗi", G = game, V = VPS, LU = Lucy, WS = web studio, A = Bill tự làm.

**Luật cứng**: test kĩ trước, deploy là bước cuối và phải hỏi Bill (deploy xóa các phòng đang chơi). Không đụng `lucy-*`, docker hordecall, `warp-svc`, backup trên VPS. Sửa code Lucy (`/root/lucy/hub`) phải theo CLAUDE.md của repo đó: `gitnexus_impact` trước khi sửa, `gitnexus_detect_changes` trước khi commit.

## Lộ trình (hướng mới 14/10: tập trung làm game, quảng cáo/web/Lucy để sau)

Mỗi bước: code → `npm test` → `node qa/devices.mjs` (5 máy) → bước đụng giao diện thì thêm 11 ngôn ngữ trên iPhone SE (`SLAM_LANG=<mã>`) → commit. Mỗi mốc **[DEPLOY]**: 0 người đang chơi → sao lưu `/opt/slam-cards` → `SLAM_HOST=root@14.225.255.73 bash proto/deploy.sh` → `SLAM_BASE=… node qa/devices.mjs` + `qa/phase1-checks.mjs` + `qa/live-match.mjs` trên bản live → xem log lỗi pm2 → báo Bill.
Chữ mới: thêm vào `vi.json` + `context.json` + viết luôn cho cả 10 ngôn ngữ; gom lại cho Bill duyệt ở L10N-04.

**Đã xong**: giai đoạn sửa lỗi 1 (QA-01…QA-10, UX-01…UX-13), 10 ngôn ngữ + nút chọn ngôn ngữ, deploy live 14/10.

**Giai đoạn 2 · Lá bài stencil + Tủ đồ (việc chính)**
1. **C1 · Prototype lá stencil nằm trên bàn thật** (dùng pet + dép cố định, chưa cần chọn đồ). Ô cửa đặt lại depth trước khi vẽ khoảng không; vẽ các lá từ thấp lên cao để lá đè lá đúng; mặt sau đúng khi bài bay/lật; viền bàn không đè. Chạy WebKit/iPhone SE + đo draw call. **Cổng quyết định:** không đạt thì đổi hướng (vẽ khoảng không ra texture rồi dán lên lá) trước khi làm tiếp C2.
2. **A · Chủ phòng + Sẵn sàng.** Server: host, ready, chuyển host khi rời, tái đấu theo cùng luật. Client: "Chiến thôi! (n/m sẵn sàng)" / "Sẵn sàng" / "Hủy sẵn sàng", vương miện chủ phòng. Gộp QA-07. Test từng luật.
2b. **Tạo phòng có tùy chọn + phòng công khai** (canvas tab "Màn hình", hàng "Vào trận"; tab "Flow UI/UX"): khi tạo chọn Riêng tư (mặc định, chỉ ai có link) / Công khai, tối đa 2/3/4; chủ phòng đổi được ở phòng chờ. Server giữ danh sách phòng công khai (đang chờ lên đầu, lọc 2/3/4, **chỉ gửi pet + mã, không gửi tên**). Màn danh sách tự cập nhật, có trạng thái trống ("Tạo phòng công khai" / "Chơi ngay"); phòng đang đánh mờ, không có nút. Vào phòng công khai = phòng chờ bình thường. Test.
2c. **Chơi ngay** (Bất kỳ mặc định / 2 / 3 / 4): hàng chờ trên server. Bất kỳ: đủ 2 người thì đếm 5 giây chờ thêm người rồi vào. 2/3/4: đủ đúng số. Sau 20 giây chờ (đã có ≥ 1 người) gợi ý chơi ít người hơn. Đủ người → server tạo phòng ẩn (không link mời), vào trận luôn, không Sẵn sàng. Không bot giả người. Mất mạng > 10 giây khi đang chờ → về Màn chính, báo. Hết trận: "Tìm trận mới" (vào lại hàng chờ), "Tái đấu" (chỉ khi tất cả cùng bấm), "Về menu". Test (ghép đúng số, Bất kỳ đếm ngược, hủy, rớt mạng, 2 tab).
2d. **Luật cho người lạ**: trận ghép ngẫu nhiên hết giờ 2 lượt liền = bị loại khỏi ván (server, test). Lọc từ xấu trong tên người chơi (danh sách từ theo 10 ngôn ngữ, thay bằng tên ngẫu nhiên).
2e. **Màn chính mới** theo canvas "Home"/"HomePhone": Tủ đồ (lá bài to + pet/dép/màu) bên trái trên máy tính, khung "Chơi với người lạ" gom chọn số người + nút Chơi ngay, rồi "hoặc chơi với bạn": Tạo phòng / Phòng công khai / mã. (Phần Tủ đồ chạy thật cần bước 3.)
3. **Giao thức đồ** `pickLook { pet, dep, depColors, cardColor }`: lưu localStorage + gửi server; server kiểm tra hợp lệ, không trùng màu bài; đổi đồ thì tự bỏ Sẵn sàng. Test. (B, C2, C3, D cần bước này.)
4. **B · Dép nhiều màu trong game**: shader tô màu theo phần (từ mockup), 12 màu mỗi phần, màn chọn dép theo canvas "PickDep". Sửa luôn ART-01.
5. **D · 4 màu bài mới + chọn đồ trong phòng chờ**: hồng/xanh/vàng/xanh lá + hoa văn + biểu tượng; ô ghế, chip HUD, dòng điểm theo canvas "Main/Guest/Phone"; màu có người lấy thì mờ.
6. **[DEPLOY 2]** (A + phòng công khai + chơi ngay + màn chính + B + D; lá bài vẫn kiểu cũ nhưng màu mới).
7. **C2 · Thay lá bài trong game bằng lá mới**: mặt ngửa ô cửa + khoảng không 3 lớp + bệ, mặt úp logo; viền pet pháp tuyến mượt; chỉ tải pet của người trong phòng; vật lý giữ hộp 1 × 1.478.
8. **C3 · Pet phản ứng theo trận** (ăn → nhảy, bị ăn → lắc đầu, tới lượt → gật, rớt bàn → ngã) + màn chọn pet theo canvas "PickPet". Giữ nhãn ▲NGỬA/▼ÚP. ART-02: chụp lại ảnh dép/pet bằng shader game.
9. **PERF-01** warm-up shader (sau C2 vì C2 thêm shader) + đo `qa/perf.mjs` (mục tiêu < ~50 draw call với 4 lá) + `qa/devices.mjs`.
10. **L10N-04** gom chữ mới (tên 24 pet, màu, Sẵn sàng…) → `STRINGS.md` → Bill duyệt/đưa AI viết lại → `i18n:check` → 11 ngôn ngữ trên iPhone SE.
11. **[DEPLOY 3]** Tủ đồ đầy đủ.

**Giai đoạn 3 · Game thêm (sau Tủ đồ)**
12. G5 ảnh xem trước khi gửi link phòng (Open Graph, theo ngôn ngữ).
13. G2 ủng hộ: dải mời hết trận, nút góc, bảng QR / tấm trượt "Lưu ảnh mã QR", danh sách người ủng hộ công khai.
14. UX-08 bản đầy đủ: bạn đến muộn được ngồi xem và vào trận sau.
15. **[DEPLOY 4]**.

**Để sau (chưa làm)**
- G4 số liệu (không chặn game; làm khi muốn đo người chơi) → LU1–LU5 bảng số Lucy.
- G6 nút "Báo lỗi" (cần hộp `support@`, A1).
- Quảng cáo: Q3, ADS-01/02, WS3 trang chính sách, WS4 `ads.txt`, A4 AdSense.
- Web studio WS1/WS2/WS5/WS6. Android (AdMob). Cổng game (CrazyGames…).
- VPS: V1 ưu tiên CPU, V2 tin Telegram thử, V3 reboot (chờ Bill). OPS-01 alias ssh (đang deploy bằng `SLAM_HOST`).
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
- [ ] **QA-07 (L6) · Ai trong phòng chờ cũng bấm được "Chiến thôi".** Có từ đầu. Đọc code. Làm chung với Tủ đồ mục A.
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
