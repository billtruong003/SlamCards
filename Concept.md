# SLAM CARDS — Concept (bản sửa 3)

Physics party game, đấu tay đôi theo lượt. Mỗi bên chỉ một lá bài trên bàn. Hai bên thay phiên đập dép, dùng luồng gió đẩy bài mình lại gần bài địch, rồi **cho bài mình đáp xuống ở mặt ngửa, đè lên bài địch đang úp thì thắng duel** (luật "gảy ảnh" hồi nhỏ). Không có chuyện một phát ăn ngay: phải tính lực, đọc gió, tính số vòng lật của lá bài, và tính xem mất mấy cú đập mới tới.

Mỗi lá bài nhốt một nhân vật. Skill nhân vật là lớp thứ hai, chỉ làm sau khi core đã vui.

---

## CONCEPT LOCK — Slam Cards — 2026-10-13

- **Core fantasy:** Màn đấu tay đôi đập bài hồi nhỏ, cân lực từng cú.
- **Core loop (1 câu):** Đọc gió, chọn điểm đập, gồng lực, đập → bài bay tới gần hơn và lật đúng mặt (hoặc trượt) → khi vào tầm thì tung cú quyết định: ngửa đè úp.
- **Pillars:**
  1. **Đập phải sướng tay.** Hitstop, rung camera, slow-mo lúc bài sắp đáp.
  2. **Lực đạo quyết định, hên xui chỉ là gia vị.** Người giỏi thắng người dở phần lớn các trận, nhưng vẫn có những pha lật kèo.
  3. **Cuộc đối đầu căng dần.** Ai bước vào tầm trước thì cho đối thủ đánh trước. Mỗi cú đập là một lần chọn giữa tiến lên hay chờ.
- **Game này KHÔNG phải:** TCG/gacha sưu tầm, game online xếp hạng, game có cốt truyện, game một phát ăn ngay.

---

## 1. Core gameplay

### Một trận
- Một trận gồm **3 round** (gọi là duel trong phần dưới). Thắng 2 round trước thì thắng trận.
- **Không giới hạn số lượt.** Đánh tới khi có người ăn hoặc có lá rớt bàn.
- Mỗi duel: mỗi bên 1 lá, **úp**, đặt ở hai đầu bàn. Lá úp là nhân vật còn bị phong ấn, lật ngửa là nhân vật thức dậy. Lớp skill sau này sẽ bám vào đúng chỗ này.
- Màn hình hiện **DUEL**. Hai bên ra **tù xì**. Người thắng **chọn** đập trước hay nhường. Đi trước chưa chắc đã lợi (xem phần "Tầm đánh" bên dưới), nên lựa chọn này có ý nghĩa thật.

### Cú đập
- **Chỉ được đập trong vòng tròn quanh bài mình,** như tầm với của tay. Muốn tác động lên bài địch thì bài mình phải ở gần nó trước.
- **Luồng gió thổi mọi lá trong bán kính,** cả bài địch. Hai lá còn xa nhau thì cú đập chỉ ảnh hưởng bài mình. Khi đã sát nhau thì một cú đập có thể lật bài địch úp xuống, đẩy nó đi, hoặc vô tình lật luôn bài mình.
- **Hướng:** bài bay ra xa điểm đập. Đập phía sau bài thì bài bay tới trước, giống bi-a.
- **Lực = khoảng cách.** Không có thanh gồng lực. Đập càng sát lá bài thì gió càng mạnh, bài bay càng xa. Đập xa thì gió yếu, bài chỉ nhích. Ra khỏi bán kính gió thì không ảnh hưởng gì. Giống đập dép ngoài đời: không chỉnh được lực tay, chỉ chọn được chỗ đập.
- **Được đập ra ngoài bàn,** miễn là còn trong vòng tầm với. Đập ở đó vẫn tạo gió y như đập trên bàn (không cần đúng vật lý). Mục đích là trị kiểu chơi nấp sát mép: đập từ phía ngoài thì bài đang nấp văng ngược vào trong bàn.
- **Không được đập lên lá bài.** Rê chuột lên lá nào thì con trỏ chuyển đỏ, click không có tác dụng.
- **Bỏ lượt:** đập vào chỗ trống ngoài bán kính gió của mọi lá. Vòng tầm với lớn hơn bán kính gió nên lúc nào cũng có chỗ để bỏ lượt.
- **Chống câu giờ:** không được bỏ 2 lượt liên tiếp. Vừa bỏ lượt thì lượt sau **bắt buộc đập** trong vòng nhỏ sát bài mình. Bài mình chắc chắn bay, có thể bị lật úp, nên đứng im có giá. Cách này chặn kiểu cả hai cùng ngửa rồi đứng im mãi.
- **Hết 30 giây** chưa đập: tính là bỏ lượt. Nếu đang trong lượt bắt buộc đập thì game tự đập một điểm ngẫu nhiên trong vòng bắt buộc.
- **Kiểu đập:**
  - **Đập bằng:** bài bay vồng cao, đáp từ trên xuống. Dễ đè, nhưng **gió ăn nhiều**.
  - **Đập nghiêng:** bài bay thấp, trượt xa. **Ít bị gió**, nhưng khó đáp lên trên bài địch.

### Số vòng lật
- Đập **lệch mép** lá bài thì lá xoay nhiều vòng trên không. Đập **gần tâm** thì lá bay lên mà ít xoay.
- Số vòng quyết định mặt lúc đáp: lật số lẻ lần thì đổi mặt, số chẵn thì giữ mặt cũ.
- Đây là kỹ năng chính: không chỉ đáp đúng chỗ mà còn phải đáp đúng mặt. Bài mình đang úp thì phải lật nó ngửa lên trước. Bài địch đang ngửa thì phải đập gần để lật nó úp xuống.
- Không hiện trước số vòng. Người chơi tự học qua cảm giác lực và điểm đập.

### Gió
- Đầu mỗi lượt gió đổi hướng và đổi sức, hiện bằng mũi tên trên HUD (giống Gunbound).
- Gió thổi bài **lúc đang bay**. Bay càng cao, bay càng lâu thì càng bị lệch.
- Gió là phần hên xui nhìn thấy được. Người giỏi đọc gió để bù lực và chọn kiểu đập. Gặp gió xấu thì có thể chọn cú an toàn, hoặc lùi lại.

### Hên xui
Bỏ thanh lực thì phần hên xui đến từ ba chỗ:
- **Tay run:** dép không rơi đúng điểm ngắm mà lệch ngẫu nhiên một chút quanh đó. Đập càng sát lá bài thì độ lệch càng có ý nghĩa: lệch một chút là lực và độ xoay đổi hẳn. Cú mạnh vì thế cũng là cú liều.
- **Gió** đổi mỗi lượt.
- **Vật lý lật bài:** lá xoay nhiều vòng trên không thì khó đoán mặt lúc đáp hơn lá xoay ít.

Tổng phần ngẫu nhiên phải đủ nhỏ để người giỏi thắng phần lớn các trận. Độ lệch của tay run là con số tune quan trọng nhất.

### Chặn "một phát ăn ngay"
Đây là luật quan trọng nhất của core, làm bằng ba lớp:

1. **Khoảng cách:** hai lá bắt đầu cách nhau khoảng **2.5–3 lần quãng bay xa nhất của một cú đập, tính lúc gió xuôi mạnh nhất.** Phải mất ít nhất 2 cú mới vào tới tầm. Cú đầu tiên không thể đè được, về vật lý là không với tới.
2. **Tầm đánh:** quãng bay tối đa của bài mình cũng chính là tầm mà bài địch đánh tới được mình. Tiến vào tầm đánh của địch nghĩa là cho địch cú đánh đầu tiên. Từ đây có giằng co: tiến sát, dừng ngay mép tầm, hay để địch tiến trước.
3. **Đáp lên khó:** dù đã ở trong tầm, đáp đè được lên một lá bài nhỏ vẫn cần chọn chỗ đập chuẩn và đọc gió đúng. Đập sát để bay xa thì tay run ảnh hưởng nhiều.
4. **Phải đúng mặt:** bài bắt đầu úp, nên cần ít nhất một cú để lật bài mình ngửa lên. Đè trúng mà sai mặt thì không ăn.

### Luật thắng duel
Chỉ tính khi cả bàn đã đứng yên.

**Luật gốc ("gảy ảnh"):** lá **ngửa** nằm đè lên lá **úp** thì chủ lá ngửa ăn. "Đè" = tâm lá trên nằm trên mặt lá dưới.

| Chuyện xảy ra | Kết quả |
|---|---|
| Bài mình **ngửa**, đè lên bài địch **úp** | **Thắng duel** |
| Bài địch ngửa đè lên bài mình úp | Thua duel |
| Đè nhau nhưng cả hai cùng ngửa hoặc cùng úp | Không ai ăn, đập tiếp |
| Bài mình úp đè lên bài địch ngửa | Không ai ăn. Lá bên dưới bị kẹt, khó lật |
| Cú đập của ai làm **bất kỳ lá nào** rớt khỏi bàn (bài mình hay bài địch) | **Người đập thua duel.** Thổi bài địch ra khỏi bàn là chơi xấu, không phải cách thắng |
| Địch đập ẩu làm bài mình rơi đè lên bài địch | Mình thắng duel. Đập liều là có giá |

**Rớt bàn** tính bằng vật lý 3D thật: lá rơi khỏi mặt bàn là rớt. Kiểm tra rớt bàn trước, đè sau.

> Các con số (3 round, 30 giây, 2.5–3 lần, cỡ vòng bắt buộc đập) là để playtest, chưa chốt.

### Những tình huống luật này tạo ra
- **Giằng co ở mép tầm:** cả hai đứng ngay ngoài tầm của nhau, chờ gió đẹp.
- **Mồi:** cố ý vào tầm để dụ địch đánh liều, địch trượt thì tới lượt mình ở cự ly gần.
- **Lùi:** gió xấu thì đập bài lùi về, chấp mất một lượt.
- **Đứng mép bàn:** địch phải đập nhẹ tay khi lại gần, vì lỡ làm rớt bài mình thì địch thua. Nhưng tới lượt mình đập ở đó cũng phải cẩn thận y như vậy.
- **Phá thế mép bàn:** địch đập từ phía ngoài, hất bài đang nấp ở mép văng ngược vào giữa bàn, thường là vào ngay tầm đánh của địch. Ngồi lì ở mép không an toàn mãi.
- **Bỏ lượt chiến thuật:** gió xấu hoặc đang đứng thế tốt thì bỏ lượt, chờ địch đi trước.
- **Gió đổi chiều:** cú đè chắc ăn bị gió đẩy trượt, rơi cạnh bài địch, tới lượt địch ở cự ly sát.
- **Giữ mặt ngửa:** bài địch đang ngửa thì không bị ăn. Muốn ăn thì phải đập gần để lật nó úp xuống trước, mà đập gần thì bài mình cũng có thể bị lật theo.
- **Đè chặn:** bài mình đang úp nằm đè lên bài địch thì bài địch bị kẹt dưới, không lật được. Cú tiếp theo chỉ cần lật bài mình ngửa lên tại chỗ.
- **Lật trước, tiến sau:** lật bài ngửa từ xa cho an toàn, hay vừa tiến vừa lật để đỡ mất một lượt.

---

## 2. Công nghệ cho core

- **PhysX có sẵn của Unity,** không viết physics riêng.
- **Cú đập:** lấy các lá trong bán kính gió → mỗi lá nhận lực ngang (hướng ra xa điểm đập) và lực nâng (lớn khi đập bằng, nhỏ khi đập nghiêng). **Độ lớn chỉ phụ thuộc khoảng cách** từ điểm đập tới lá, có giá trị tối đa khi đập sát mép lá, nên quãng bay tối đa là một con số biết trước.
- **Tay run:** dịch điểm đập thật đi một vector ngẫu nhiên nhỏ so với điểm ngắm. Vẫn chặn không cho điểm đập thật rơi lên lá bài.
- **Rớt bàn:** vật lý 3D thật. Bàn là một khối có mép, lá rơi xuống dưới mặt bàn là rớt.
- **Ai phán thắng thua (online):** người đập gửi kèm vị trí cuối của 2 lá. **Server** dùng vị trí đó để phán rồi báo cho cả hai. Máy bên kia phát lại xong thì đặt 2 lá đúng vị trí cuối đó, không tự tính lại.
- **Vào lại sau khi rớt mạng:** server gửi lại toàn bộ trạng thái (vị trí 2 lá, lượt, gió, điểm, đang bị bắt buộc đập hay không).
- **Chờ bàn đứng yên:** tối đa 5 giây. Lá đang rơi dở ở mép thì đợi rơi hẳn rồi mới tính.
- **Gió:** khi bài đang bay, `AddForce` theo vector gió nhân với độ cao của bài.
- **Lá bài:** box mỏng, drag cao cho giống giấy. Ma sát bài với bài cao để bài đáp xuống thì dính lại.
- **Kiểm tra đè:** raycast xuống từ tâm lá, chỉ chạy lúc bàn đã đứng yên.
- **Kiểm tra mặt:** `Vector3.Dot(card.up, Vector3.up) > 0` là ngửa.
- **Số vòng lật:** mô-men xoắn tỉ lệ với khoảng cách từ điểm đập tới tâm lá. Angular drag phải tune sao cho cùng một cú đập thì số vòng gần như cố định, không thì phần lật mặt thành random.
- **Tù xì:** UI chọn búa/kéo/bao. Đánh với bot thì bot chọn ngẫu nhiên.
- **Chơi:** chơi chung một máy + bot. Online thì dùng Steam Remote Play Together.

**Rủi ro lớn nhất:** tỷ lệ giữa kỹ năng và hên xui. Hên xui nhiều quá thì game thành random, ít quá thì mất tình huống. Mọi tham số (nhiễu, gió, quãng bay) phải chỉnh được trong Inspector để tune lúc playtest.

---

## 3. MVP — mỗi bước trả lời một câu hỏi

| Bước | Có gì | Câu hỏi cần trả lời |
|---|---|---|
| **1. Đập thử** | Bàn xám, 1 lá của mình, 1 lá địch đứng yên làm bia. Cú đập đủ hướng, lực, bằng/nghiêng. Gió + nhiễu bật/tắt được | Tập 10 phút có đè bia giỏi hơn không? Có chủ động cho bài đáp ngửa được không? Gió có làm cú đập thú vị hơn hay chỉ gây bực? |
| **2. Một duel** | Hai lá, thay phiên đập, tầm đập, luật thắng/thua, bỏ lượt, bắt buộc đập, chơi chung một máy | Có giằng co ở mép tầm không? Một round mất bao lâu? Có ai tìm được cách câu giờ không? |
| **3. Một trận** | Màn ROUND, tù xì, 3 round, bảng điểm | Cả trận 3–5 phút có căng không? |
| **4. Cảm giác** | Hitstop, rung camera, slow-mo khi sắp đè, âm thanh dép, hiển thị tầm đánh | Đập có sướng tay không? |
| **5. Đóng gói** | Bot, menu, hướng dẫn ngắn | Người lạ cầm vào có tự chơi được không? |

Bước 1 không đạt thì dừng lại sửa bước 1, chưa làm gì khác.

---

## 4. Lớp 2 — Skill nhân vật (chỉ làm sau khi core vui)

Hướng tạm thời, chưa lock:
- Mỗi người có bộ 5 lá, mỗi duel chọn 1 lá ra đấu. Chọn lá nào để khắc lá địch là thêm một lớp chiến thuật.
- Skill = thay đổi vật lý: Cục Đá (nặng, ít bị gió), Origami Fox (nhẹ, lượn theo gió), Wind Eater (miễn gió một lượt), Void Child (hút bài địch lại gần), Lò Xo (nảy thêm một nhịp sau khi đáp), Stitch (dính vào bài địch khi chạm).
- Lá bài sống bằng stencil: mặc định 2.5D parallax, 1–2 lá dùng 3D thật.

---

## 5. Phát hành

Steam, indie trả tiền một lần, khoảng $4.99–$5.99. Bán như party game chơi chung một máy + Remote Play Together. Gốc trò chơi tuổi thơ Việt Nam nên đưa người Việt chơi thử đầu tiên.

---

## ICEBOX

- Online thật bằng Photon Fusion
- 3–4 người chơi
- Hệ thống sưu tầm, mở khóa nhân vật
- Nhiều loại dép có đặc tính khác nhau
- Mirror Girl, Mimic, Joker, Twins, Red Thread, Second Hand
- Nhân vật chui ra khỏi khung bài
- Replay chậm / chia sẻ clip cú đập hay
