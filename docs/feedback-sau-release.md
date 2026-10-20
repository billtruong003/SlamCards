# Feedback sau release · phân tích theo user scenario

Nguồn: tin nhắn của Thuận (David) và "Slam notes" (17–19/10). Mỗi vấn đề có:
- hiện trạng trong code (đã kiểm tra);
- ai bị ảnh hưởng, ở bước nào;
- edge case;
- hướng sửa;
- mức độ, theo thang 0–4: 4 = người chơi bỏ game, 3 = vấp nặng, 2 = khó chịu, 1 = xấu nhỏ.

Mục tiêu trải nghiệm: *sau 2 phút đầu, người mới (được rủ qua link hoặc tự vào) đã đập được ít nhất 1 cú, hiểu "ăn hình = bài ngửa đè bài úp", và chưa phải ngồi chờ quá 15 giây liên tục.*

## Tóm tắt

| # | Vấn đề | Mức | Gốc rễ trong game hiện tại |
|---|---|---|---|
| 1 | Ít người, không có bot, phải đợi lâu | **4** | Chơi ngay cần ≥ 2 người thật trong hàng chờ; vào một mình thì chờ mãi, không có lối ra nào khác ngoài Hủy |
| 2 | Bị loại rồi phải ngồi chờ (spectator "chết") | **3** | Bị loại thì chỉ có dòng "M bị loại rồi! Ngồi hóng tiếp thôi."; không có nút rời trận hay tìm trận mới giữa ván; ván 4 người, mỗi lượt tới 30 giây |
| 3 | Rớt bài nhiều khi chơi > 2 người | **3** | Bàn 3–4 người: các lá cách nhau xa, phải đập mạnh mới tới. Luật "lá nào rớt thì người đập bị loại", nên đập trúng làm lá người khác rớt cũng bị loại |
| 4 | Người mới không biết chơi | **3** | Có mẹo trong trận (FTUE) nhưng không có màn giới thiệu luật trước khi chơi |
| 5 | Tính năng phòng còn thiếu | 2 | Chủ phòng chỉ đổi được công khai/riêng tư và số người tối đa, trong sảnh. Không mời ra, không chuyển chủ phòng |
| 6 | UI/UX nhiều chỗ chưa hợp lý | 2–3 | Đã sửa thanh cuộn, tủ đồ, sảnh (commit `610777c`). Cần đi từng scenario dưới đây để tìm tiếp |

Các vấn đề dính vào nhau:
- Ít người (1) làm hàng chờ lâu.
- Rớt bài (3) làm người chơi bị loại sớm, rồi phải ngồi chờ (2).
- Không hiểu luật (4) làm đập bừa, càng hay rớt bài (3).

Sửa 1 và 3 trước thì 2 và 4 nhẹ đi.

---

## 1 · Ít người, không có bot (mức 4)

**Hiện trạng**
- Hàng chờ "mấy người cũng được" chỉ ghép khi có ≥ 2 người, rồi đợi thêm 5 giây xem có ai nữa không.
- Chọn đúng "trận 4 người" thì phải đủ 4.
- Server không có bot nào.

**Scenario bị ảnh hưởng**
- *Người lạ thấy video trên Facebook, bấm link lúc 23h, bấm Chơi ngay:* màn "Đang tìm người chơi…" và đồng hồ "Đã đợi 0:45, 1:30…". Không có gì khác để làm. Bỏ game.
- *2 người bạn hẹn nhau chơi:* được, nhưng muốn chơi 4 người thì phải rủ đủ 4.
- *Người vừa thua, bấm "Tìm trận mới":* lại chờ.

**Edge case**
- 1 người chờ "4 người" và 1 người chờ "mấy người cũng được": không ghép được.
- 3 người ở 3 cỡ khác nhau (2, 3, 4): chỉ ghép được nếu có người "mấy người cũng được".
- Người trong hàng chờ khoá màn hình, socket chết: hàng chờ dọn người đó mỗi 400 ms.
- Ghép với bot xong thì người thật thứ 2 vào hàng chờ: có cho thay bot không?

**Hướng sửa**
1. **Bot lấp chỗ**: chờ quá 8–10 giây thì thêm bot cho đủ người. Có nút "Chơi với máy luôn" ngay trên màn chờ.
   - **Cách bot đập:** server chọn điểm ngắm cho bot (bài của bot, bài gần nhất, kèm sai số theo độ khó). Mô phỏng vật lý thì nhờ máy một người chơi thật trong phòng chạy, giống cú đập bình thường. Như vậy server không cần chạy vật lý.
   - **Độ khó:** bot ngắm chuẩn vừa phải, thỉnh thoảng làm rớt bài để người chơi thắng được.
2. **Ghi rõ là bot:** tên dạng "🤖 Bot Tí". Không giả làm người, vì người chơi phát hiện ra thì mất lòng tin.
3. **Màn chờ có việc để làm:** cho xem 4 ô hướng dẫn (mục 4) và số người đang online.
4. **Gộp cỡ trận:** sau 15 giây, người chờ "trận 4 người" được hỏi "Chơi luôn 3 người / có bot?". Đã có sẵn chữ `queue.fewer` ("Chơi luôn {n} người").

**Cần Bill quyết:** bot có xuất hiện trong phòng bạn bè không (ví dụ 2 người thật + 2 bot)? Hay chỉ trong Chơi ngay?

---

## 2 · Bị loại phải chờ (mức 3)

**Hiện trạng**
- Bị loại thì ngồi xem tới hết round.
- Ván thắng 2 round, round sau người bị loại được vào lại.
- Không có nút rời trận giữa ván. Muốn đi thì phải đóng tab.
- Ván 4 người: mỗi lượt tối đa 30 giây, cộng thời gian bài bay. Một round có thể kéo dài vài phút.

**Scenario bị ảnh hưởng**
- *Người lạ trong trận 4 người, bị loại ngay lượt đầu:*
  - Ngồi xem 3 người kia đập vài phút, không biết round sau có được vào lại không.
  - Thấy chán, đóng tab. Server tính là "rời trận", 3 người kia mất một người.
- *Nhóm bạn 4 người:* người bị loại đầu ngồi chọc thì vui (đã có biểu cảm, câu nhanh, chat). Nhưng bị loại cả 2 round thì chán.

**Edge case**
- Bị loại ở round cuối thì trận kết thúc khi còn 1 người. Người bị loại xem nốt rồi thấy màn kết quả.
- Người bị loại rời giữa trận, ván đang chạy: round sau không có họ (`left`). Ván 3 người còn 2 thì vẫn chơi.
- Người bị loại đóng tab rồi mở lại: vào lại phòng được không, trong bao lâu?
- Còn 2 người, cả hai đều AFK: mỗi người 2 lượt hết giờ thì bị loại (`afk`). Cần xem có rơi vào vòng lặp chờ không.

**Hướng sửa** (giống battle royale như Thuận gợi ý)
1. Khi bị loại hiện 2 nút:
   - **"Xem tiếp"** (mặc định): kèm dòng "Round sau m vào lại" và đếm số người còn lại.
   - **"Rời trận / Tìm trận mới"**: rời ngay, không bị phạt. Với trận Chơi ngay, nếu người còn lại < 2 thì bot thay chỗ.
2. **Rút ngắn chờ:**
   - Lượt 30 giây xuống 15–20 giây khi bàn 3–4 người.
   - Người không thao tác thì bị loại sau 1 lượt hết giờ thay vì 2 (cần thử để không bị oan).
3. **Việc cho người đang xem:**
   - Đã có biểu cảm, câu nhanh, chat.
   - Thêm "đoán ai thắng round": bấm vào bài của một người, đoán đúng có hiệu ứng vui. Không cần điểm.

---

## 3 · Rớt bài khi chơi > 2 người (mức 3)

**Hiện trạng** (`src/rules.js`)

| Số người | Bàn (nửa rộng × nửa sâu) | Vị trí bài | Khoảng cách 2 lá gần nhất |
|---|---|---|---|
| 2 | 6 × 3,5 | (±4,5, 0) | 9,0 |
| 3 | 7,5 × 5 | (±5,8, −2,6), (0, 3,6) | khoảng 8,4 |
| 4 | 7,5 × 5 | (±5,8, 0), (0, ±3,6) | khoảng 6,9 |

- Luật hiện tại: **chỉ cần một lá bất kỳ rớt, người đập bị loại**, còn lá rớt được đặt lại.
- Bàn đông người: đập vào giữa hai lá đối thủ có thể đẩy một lá văng xuống. Người đập bị loại dù không đụng bài mình. Người mới thấy đó là bị phạt oan.
- Lá ngồi đầu bàn (0, ±3,6) chỉ cách mép 1,4 trên trục ngắn, rất dễ bị đẩy rớt.

**Cần đo trước khi sửa:** chạy 500 cú đập ngẫu nhiên bằng vật lý cho mỗi cỡ bàn. Mô phỏng chạy trên máy được (cùng engine với cảnh quay video). Đếm:
- tỉ lệ rớt;
- lá của ai rớt;
- rớt vì cú đập vào bài mình hay bài người khác.

Có số liệu rồi mới chọn cách sửa.

**Hướng sửa** (chọn sau khi đo)
1. Kéo các lá vào trong cho cách mép đều như bàn 2 người, hoặc nới bàn 3–4 người rộng hơn.
2. Đổi luật cho đúng cảm giác:
   - Làm rớt bài **của mình** thì mình bị loại (như cũ).
   - Làm rớt bài **người khác** thì chỉ mất lượt, bài kia đặt lại.
   - Thay đổi này cần Bill và David duyệt vì đụng luật chơi.
3. Viền bàn thấp: bài chạm viền bật lại một chút. Đổi vật lý nên phải thử cảm giác.

---

## 4 · Hướng dẫn người mới (mức 3)

**Hiện trạng**
- FTUE hiện có là các mẹo hiện trong trận theo tình huống (`src/ftue.js`).
- Nút "?" mở lại phần hướng dẫn.
- Chưa có màn giới thiệu luật trước khi chơi.

**Đề xuất của Thuận:** khung 4 ô, mỗi ô một clip ngắn chạy cùng lúc, đọc trong 10–15 giây. Hợp với thói quen không đọc chữ.

**Phương án cụ thể** (dùng footage vừa quay cho video, đã có sẵn)

| Ô | Clip (2–3 giây, lặp) | Chữ (≤ 6 từ) |
|---|---|---|
| 1 | Dép đập gần bài, bài bay | Đập gần bài cho bài bay |
| 2 | Bài ngửa đè bài úp | Ngửa đè úp = ăn hình |
| 3 | Bài rớt khỏi bàn | Mạnh tay quá là bị loại |
| 4 | Màn thắng | Thắng 2 round là thắng |

**Hiện ở đâu:**
- Lúc chờ trong hàng chờ hoặc sảnh. Đó là thời gian chết, dạy luôn.
- Lần đầu bấm Chơi ngay hoặc vào phòng, có nút "Hiểu rồi" (bỏ qua được).
- Mở lại từ nút "?".

**Clip:** WebM hoặc MP4 nhỏ (mỗi clip < 300 KB), không dùng GIF vì nặng và mờ.

**Edge case**
- Điện thoại xoay ngang: 4 ô xếp 2×2 hay 4×1?
- Mạng yếu: clip chưa tải xong thì hiện ảnh tĩnh.
- Người đã chơi rồi: chỉ hiện một lần cho mỗi máy (lưu trong localStorage), không hiện lại mỗi trận.
- Trận bắt đầu khi người chơi đang xem: tự đóng, không chặn lượt đầu.

---

## 5 · Tính năng phòng (mức 2)

**Hiện trạng**
- Chủ phòng: đổi công khai/riêng tư, đổi số người tối đa (chỉ trong sảnh), bấm Bắt đầu.
- Khách: bấm Sẵn sàng.
- Không có mời ra, không chuyển chủ phòng, không đổi cài đặt sau khi vào trận.

**Đề xuất** (cần Bill xác nhận "thêm bớt xóa sửa" là những gì)
- Chủ phòng mời một người ra khỏi phòng: trong sảnh, và với người mất kết nối.
- Chuyển chủ phòng: tự động khi chủ phòng rời (kiểm tra xem hiện có làm chưa), và chủ phòng chủ động chuyển.
- Đổi cài đặt giữa các trận (sau màn kết quả, trước khi Tái đấu): số người, công khai.
- Thêm bot vào ghế trống (nối với mục 1).

**Edge case**
- Mời ra người đang ở giữa trận thì sao? (Đề xuất: chỉ trong sảnh.)
- Người bị mời ra mở lại link phòng: chặn hay cho vào lại?
- Chủ phòng giảm số người tối đa khi phòng đã đủ: server đã chặn (không cho thấp hơn số người đang có).

---

## 6 · Các scenario cần chơi thử tiếp (vẽ thêm ngoài feedback)

Mỗi scenario sẽ chơi thật trên máy thật hoặc máy giả lập, ghi lại chỗ vấp.

| # | Persona và tình huống | Thiết bị | Bắt đầu từ | Thành công khi |
|---|---|---|---|---|
| S1 | Người lạ thấy video Facebook, lần đầu, không đọc chữ | Điện thoại, 4G | Link trong bình luận ghim (`?ref=fb`) | Đập được 1 cú trong 60 giây |
| S2 | Được bạn rủ qua Zalo, mở link trong trình duyệt của Zalo | Điện thoại | Link phòng `?room=ABCD` | Vào đúng phòng, bấm Sẵn sàng |
| S3 | Chủ phòng tạo phòng, gửi link, chờ bạn | Laptop | Màn chính | Bạn vào, bắt đầu được |
| S4 | Vào lúc vắng, Chơi ngay một mình | Bất kỳ | Màn chính | Chơi được trong ≤ 15 giây (cần bot) |
| S5 | Nhóm 4 bạn, 1 người bị loại đầu round | 4 máy | Phòng 4 người | Người bị loại không bỏ đi |
| S6 | Đang chơi thì mất mạng 10 giây (vào thang máy) | Điện thoại | Giữa lượt của mình | Vào lại đúng ván, không mất lượt oan |
| S7 | Chuyển sang Zalo trả lời tin nhắn, quay lại | Điện thoại | Giữa ván | Ván vẫn còn, hiểu chuyện vừa xảy ra |
| S8 | Chơi xong muốn chơi tiếp với người lạ | Bất kỳ | Màn kết quả | Vào trận mới ≤ 15 giây |
| S9 | Người quay lại hôm sau | Bất kỳ | Bookmark | Nhớ tên, đồ; không phải xem lại hướng dẫn |
| S10 | Điện thoại cũ, màn nhỏ (iPhone SE), xoay ngang | iPhone SE | Bất kỳ | Bấm được mọi nút, không chữ bị cắt |
| S11 | Mở link trong trình duyệt của Facebook hoặc Messenger | Điện thoại | Link quảng cáo | Âm thanh, bàn phím, chia sẻ link đều chạy |
| S12 | Chủ phòng rời khi đang ở sảnh hoặc giữa trận | 2–3 máy | Phòng | Phòng không chết, có chủ phòng mới |

**Edge case chung cần đi kèm**
- Hai tab cùng một máy.
- Bấm Tái đấu đúng lúc người kia rời.
- Server restart giữa ván (khi deploy).
- Hết giờ đúng lúc bài đang bay.
- Tên dài, tên có emoji.
- Trình duyệt chặn localStorage (chế độ ẩn danh).

---

## Thứ tự làm đề xuất

| Ưu tiên | Việc | Công sức | Phụ thuộc / cần duyệt |
|---|---|---|---|
| P0 | Đo tỉ lệ rớt bài theo số người (mục 3) | nhỏ | không |
| P0 | Nút "Rời trận / Tìm trận mới" và dòng "round sau m vào lại" cho người bị loại (mục 2) | nhỏ | chữ mới cần Bill duyệt |
| P0 | Bot lấp chỗ trong Chơi ngay + nút "Chơi với máy" (mục 1) | lớn | Bill quyết phạm vi bot |
| P1 | Sửa rớt bài theo số đo: vị trí bài / cỡ bàn / luật rớt (mục 3) | vừa | đổi luật cần Bill + David |
| P1 | Hướng dẫn 4 ô, hiện lúc chờ (mục 4) | vừa | mockup cho Bill duyệt trước |
| P1 | Rút lượt 3–4 người còn 15–20 giây (mục 2) | nhỏ | thử cảm giác |
| P2 | Tính năng phòng: mời ra, chuyển chủ, đổi cài đặt giữa trận (mục 5) | vừa | Bill xác nhận phạm vi |
| P2 | Chơi thử 12 scenario, ghi phát hiện UI/UX (mục 6) | vừa | không |
