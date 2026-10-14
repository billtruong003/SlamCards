# Hạng mục chữ trong game

M điền cột **Chữ của m**. Cột "Hiện tại" chỉ để biết chỗ đó đang ghi gì, không cần giữ.
Biến: `{tên}` tên người chơi · `{màu}` ĐEN/ĐỎ/XANH/LỤC · `{s}` số giây · `{n}` số · `{MÃ}` mã phòng.
"Dài" = độ dài tối đa nên giữ để không vỡ layout (ký tự, tính cả dấu cách).

## A. Menu & vào phòng
| ID | Chỗ hiện | Cần nói gì | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|---|
| A1 | Tên game (logo, tab trình duyệt) | tên game | 20 | Dép Lào Tuổi Thơ | |
| A2 | Dòng dưới logo | game là gì, mấy người | 40 | Đập bài tuổi thơ, chiến online 2–4 đứa | |
| A3 | Nhãn ô nhập tên | nhập tên | 15 | Tên của m | |
| A4 | Chữ mờ trong ô tên | ví dụ tên | 15 | VD: Tí sún | |
| A5 | Tên khi để trống | tên mặc định | 12 | Tí vô danh (trùng thì thêm số: Tí vô danh 2) | |
| A6 | Nút tạo phòng | | 12 | Tạo phòng | |
| A7 | Chữ mờ ô mã phòng | | 10 | Mã phòng | |
| A8 | Nút vào phòng | | 12 | Vào phòng | |
| A9 | Mở link mời: dòng phụ | báo là được mời vào phòng `{MÃ}` | 40 | Có đứa rủ m vào phòng {MÃ} nè! | |
| A10 | Lỗi: sai mã | | 30 | Không thấy phòng này đâu! | |
| A11 | Lỗi: phòng đang đánh | | 30 | Phòng đang đánh dở, tạo phòng mới đi! | |
| A12 | Lỗi: phòng đủ người | | 30 | Phòng đủ 4 đứa rồi, vào không được! | |

## B. Phòng chờ
| ID | Chỗ hiện | Cần nói gì | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|---|
| B1 | Tiêu đề | phòng `{MÃ}` | 15 | Phòng {MÃ} | |
| B2 | Dòng phụ | rủ gửi link cho bạn | 45 | Gửi link rủ thêm chiến hữu vào đập! | |
| B3 | Nút copy / sau khi copy | | 10 / 10 | Copy link / Đã copy! | |
| B4 | Ô người chơi, dòng nhỏ | màu bài của người đó, đánh dấu là mình | 20 | Bài {màu} · m | |
| B5 | Ô trống | đang chờ người vào | 12 / 8 | Đợi tí… / Còn trống | |
| B6 | Tiêu đề chọn dép | | 20 | Chọn dép chiến | |
| B7 | Tên 3 loại dép | | 12 mỗi cái | Dép lào · Tổ ong · Dép lê | |
| B8 | Nút bắt đầu khi thiếu người | | 25 | Đợi thêm 1 đứa nữa! | |
| B9 | Nút bắt đầu | bắt đầu, có số người `{n}` | 20 | Chiến thôi! ({n} đứa) | |
| B10 | Tên 4 màu bài | | 5 mỗi cái | ĐEN · ĐỎ · XANH · LỤC | |

## C. Đầu round, tù xì, chọn lượt
| ID | Chỗ hiện | Cần nói gì | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|---|
| C1 | Tiêu đề màn round | round mấy | 10 | VÁN {n} | |
| C2 | Dòng phụ màn round | m cầm bài màu gì + thắng mấy round là thắng trận | 50 | Bài m màu {màu}. Thắng 2 ván là ăn cả trận! | |
| C3 | Tiêu đề tù xì | | 10 | TÙ XÌ! | |
| C4 | 3 nút | | 5 mỗi cái | Búa · Kéo · Bao | |
| C5 | Sau khi chọn | đang chờ đối thủ | 30 | Chốt rồi! Đợi đối thủ… | |
| C6 | Trạng thái đối thủ | `{tên}` đã chọn / đang chọn | 25 | {tên} chốt rồi / {tên} đang chọn… | |
| C7 | Người khác xem tù xì | | 20 | Hai đứa đang tù xì… | |
| C8 | Kết quả hòa | ra lại | 15 | HÒA! LÀM LẠI! | |
| C9 | Kết quả thắng / thua | | 15 | M THẮNG! / {TÊN} THẮNG! | |
| C10 | Hỏi người thắng tù xì | đi trước hay nhường | 30 | Đập trước hay nhường nó? | |
| C11 | 2 nút | | 15 mỗi cái | Đập trước · Nhường | |
| C12 | Giải thích dưới 2 nút | ưu/nhược của đi trước | 80 | Đập trước được lợi thế, nhưng cũng dễ ăn đòn trước đấy! | |
| C13 | Người thua tù xì chờ | `{tên}` đang chọn | 25 | Đợi {tên} chọn lượt… | |
| C14 | Tiêu đề thứ tự (3–4 người) | | 15 | THỨ TỰ ĐẬP | |
| C15 | Dòng phụ thứ tự | màu bài của m + ai trụ cuối thắng | 55 | M cầm bài {màu}. Trụ lại cuối cùng là thắng ván! | |

## D. Trong trận
| ID | Chỗ hiện | Cần nói gì | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|---|
| D1 | Chip người chơi, đánh dấu mình | | 6 | (m) | |
| D2 | Ô gió | gió cấp `{n}` | 8 | GIÓ {n} | |
| D3 | 2 nút kiểu đập | | 15 mỗi cái | Đập bằng · Đập nghiêng | |
| D4 | Banner lượt mình | + `{s}` | 22 | TỚI M ĐẬP! · {s} | |
| D5 | Banner bắt buộc đập | + `{s}` | 22 | PHẢI ĐẬP! · {s} | |
| D6 | Banner lượt người khác | `{TÊN}` + `{s}` | 25 | TỚI {TÊN} · {s} | |
| D7 | Banner sau khi mình đập | đang bay / đang chờ người khác xem lại | 22 / 25 | BÀI ĐANG BAY… / ĐỢI MỌI NGƯỜI XEM… | |
| D8 | Banner khi người khác đập | | 18 | {TÊN} ĐẬP! | |
| D9 | Hướng dẫn dưới đáy (PC) | click để đập, sát = mạnh, chỗ trống = bỏ lượt, Q/E | 90 | Click để đập · Càng sát càng mạnh · Đập chỗ trống = bỏ lượt · Q/E đổi kiểu | |
| D10 | Hướng dẫn dưới đáy (điện thoại) | kéo ngắm, thả đập, chỗ trống = bỏ lượt | 70 | Kéo để ngắm, thả để đập · Đập chỗ trống = bỏ lượt | |
| D11 | Hướng dẫn khi bắt buộc | vừa bỏ lượt nên phải đập trong vòng hồng | 70 | Bỏ lượt rồi à? Giờ phải đập trong vòng hồng! | |
| D12 | Hướng dẫn lúc chờ bài dừng | | 25 | Đợi bài nằm yên đã! | |
| D13 | Hướng dẫn khi xem người khác | đang xem cú đập / đang ngắm | 30 | Đang xem {tên} đập / {tên} đang ngắm… | |
| D14 | Hướng dẫn khi mình bị loại | | 45 | M bị loại rồi! Ngồi hóng tiếp thôi. | |
| D15 | Nhãn dưới lá bài | ngửa / úp / rớt + chủ bài | 8 mỗi cái | ▲ NGỬA · ▼ ÚP · RỚT | |
| D16 | Chữ nổ khi đập | | 6 | BỐP! | |

## E. Thông báo nhỏ (hiện vài giây)
| ID | Khi nào | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|
| E1 | `{tên}` hết giờ | 30 | {tên} hết giờ, mất lượt! | |
| E2 | `{tên}` bỏ lượt | 25 | {tên} bỏ lượt rồi! | |
| E3 | 3–4 người: `{tên}` đập rớt bài, bị loại | 35 | {tên} đập rớt bài! Bị loại! | |
| E4 | 3–4 người: `{tên}` ăn `{tên}` | 30 | {tên} ăn bài của {tên}! | |
| E5 | `{tên}` rời trận | 25 | {tên} nghỉ chơi rồi. | |
| E6 | Mạng mình rớt | 30 | Rớt mạng rồi! Đang kết nối lại… | |
| E7 | Người khác rớt mạng (chờ 60s) | 50 | {tên} rớt mạng! Đợi tối đa 60 giây… | |
| E8 | Mạng lag | 20 | Mạng hơi lag… | |

## F. Hết round, hết trận
| ID | Chỗ hiện | Cần nói gì | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|---|
| F1 | Tiêu đề hết round, 3 kiểu | rớt bàn / ăn / có người rời | 12 mỗi cái | RỚT BÀN! · ĂN RỒI! · RỜI TRẬN | |
| F2 | Giải thích: rớt bàn | `{tên}` làm rớt nên bị loại | 45 | {tên} đập rớt bài, bị loại! | |
| F3 | Giải thích: ăn | `{tên}` ngửa đè lên `{tên}` úp | 45 | Bài ngửa của {tên} đè bài úp của {tên}! | |
| F4 | Đuôi giải thích | `{tên}` thắng round | 25 | {tên} thắng ván này! | |
| F5 | Tiêu đề hết trận | thắng / người khác thắng | 15 | M THẮNG RỒI! / {TÊN} THẮNG! | |
| F6 | Khi mọi người bỏ đi | | 35 | Mọi người nghỉ chơi hết rồi! | |
| F7 | Nút tái đấu / sau khi bấm | | 12 / 20 | Tái đấu / Đợi tụi nó… | |
| F8 | Nút về menu | | 10 | Về menu | |
| F9 | Đang chờ ai bấm tái đấu | | 40 | Đang đợi: {tên}, {tên} | |

## G. Âm thanh
| ID | Chỗ hiện | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|
| G1 | Nút góc + tiêu đề panel | 10 | Âm thanh | |
| G2 | 3 thanh trượt | 12 mỗi cái | Nhạc nền · Meme · Tiếng dép | |
| G3 | Ô tick | 15 | Bật meme | |

## H. Chữ trong meme
| ID | Khi nào | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|
| H1 | Thắng trận | 20 | PERFECT VICTORY | |
| H2 | Cú đập đẹp, dòng 1 / dòng 2 | 15 / 20 | TRÌNH LÀ GÌ… / …LÀ TRÌNH HALAND! | |
| H3 | Vỗ tay | 10 | VỖ TAY NÀO! | |

## I. FTUE (I1–I16 đã duyệt; I17 trở đi là chữ nháp, cần duyệt)
| ID | Chỗ hiện | Cần nói gì | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|---|
| I1 | Popup mời: tiêu đề | hỏi có phải lần đầu chơi | 30 | Lần đầu đập bài à? | |
| I2 | Popup mời: dòng phụ | có hướng dẫn ngắn, mất bao lâu | 70 | Xem hướng dẫn nhanh 1 phút nhé. Không khó đâu! | |
| I3 | Popup mời: 2 nút | xem / bỏ qua | 15 mỗi cái | Chỉ t chơi / Biết chơi rồi | |
| I4 | Nút chung các bước | tiếp / bỏ qua / nút cuối vào chơi | 10 mỗi cái | Tiếp / Bỏ qua / Chiến thôi! | |
| I5 | Bước 1 tiêu đề + nội dung | mục tiêu: lật bài mình ngửa, đè lên bài úp của địch; thắng 2 round | 45 + 160 | LẬT BÀI, ĂN ĐỐI THỦ! Đập cho bài m ngửa lên, rồi đè lên bài úp của đối thủ để ăn. Thắng 2 ván là thắng trận! | |
| I6 | Bước 2 tiêu đề + nội dung | cách đập: trong vòng đen, sát = mạnh, xa = nhẹ, không đập lên bài, tay hơi run | 45 + 160 | NHẮM CHO CHUẨN! Chọn điểm đập trong vòng đen quanh bài. Càng sát, lực càng mạnh. Không đập lên lá bài được. Tay m sẽ hơi run đấy. | |
| I7 | Bước 3 tiêu đề + nội dung | khi nào ăn: chỉ ngửa đè úp, phải đè hẳn; ăn được cả trong lượt địch; 3–4 người bị ăn là loại | 45 + 160 | NGỬA ĂN ÚP! Bài ngửa phải đè hẳn lên bài úp mới ăn được. Địch tự đập bài nó lật úp nằm dưới bài m ngửa thì m vẫn ăn! Chơi 3–4 người, bị ăn là bị loại! | |
| I8 | Bước 3, chú thích 4 ô hình | m ăn / m bị ăn / cả 2 úp / cả 2 ngửa | 25 mỗi ô | M ăn! / M bị ăn! / Cả hai úp / Cả hai ngửa | |
| I9 | Bước 4 tiêu đề + nội dung | làm rớt bất kỳ lá nào = mình bị loại; mẹo đập ngoài bàn | 45 + 160 | ĐỪNG LÀM RỚT BÀI! Làm bất kỳ lá bài nào rớt khỏi bàn là m bị loại ngay! Muốn chơi an toàn thì đừng đập quá mạnh gần mép bàn. | |
| I10 | Bước 5 tiêu đề + nội dung | gió, đập bằng vs nghiêng, bỏ lượt và vòng hồng, 30 giây | 45 + 180 | CÒN VÀI CHIÊU NỮA! Gió có thể làm bài bay lệch. M có thể đổi kiểu đập bằng hoặc nghiêng. Bỏ lượt thì lượt sau buộc phải đập trong vòng hồng. Mỗi lượt có 30 giây thôi! | |
| I11 | Ván đầu: bong bóng chỉ tay | bảo click sát bài mình | 60 | Thử đập sát bài m xem nào! | |
| I12 | Nhắc: bài mình vừa ngửa | giờ đè lên bài địch | 50 | Ngửa rồi kìa! Giờ tìm cách đè bài địch! | |
| I13 | Nhắc: bài địch ngửa đang gần bài mình úp | cẩn thận bị ăn | 50 | Bài địch đang ngửa sát bài m, coi chừng bị đè! | |
| I14 | Nhắc: bài mình sát mép | đập mạnh dễ rớt | 50 | Sát mép rồi! Đập mạnh là bay luôn đấy! | |
| I15 | Nhắc: lần đầu bắt buộc đập | giải thích vòng hồng | 50 | Bỏ lượt rồi nhé! Giờ phải đập trong vòng hồng. | |
| I16 | Nhắc: lần đầu hết giờ | hết giờ là mất lượt | 40 | Hết giờ là mất lượt đấy! | |
| I17 | Bảng luật nhanh (nút ?): tiêu đề | | 15 | NHỚ 6 ĐIỀU NÀY! | |
| I17a | Luật nhanh ô 1 | ngửa đè úp = ăn | 35 | M ngửa đè địch úp = ăn | |
| I17b | Luật nhanh ô 2 | bị đè = bị ăn | 35 | Địch ngửa đè m úp = bị ăn | |
| I17c | Luật nhanh ô 3 | làm rớt = loại | 35 | M đập làm rớt bài = bị loại | |
| I17d | Luật nhanh ô 4 | cùng mặt / chỉ chạm = đánh tiếp | 40 | Cùng mặt hoặc chỉ chạm = đánh tiếp | |
| I17e | Luật nhanh ô 5 | vừa bỏ lượt = vòng hồng | 45 | Vừa bỏ lượt = phải đập trong vòng hồng | |
| I17f | Luật nhanh ô 6 | 30 giây | 35 | Hết 30 giây = mất lượt | |
| I18 | Luật nhanh: nút mở lại hướng dẫn / khi còn dở | | 20 / 30 | Xem lại hướng dẫn / Xem tiếp từ bước {n}/5 | |
| I19 | Nút ? ở góc (đọc cho trình đọc màn hình) | | 15 | Luật chơi | |
| I20 | Phòng chờ: nhãn dưới ô người đang xem hướng dẫn | | 25 | đang xem cách chơi {n}/5 | |
| I21 | Thẻ hỏi lại khi bấm bắt đầu lúc có người đang xem: tiêu đề | `{tên}` đang xem hướng dẫn | 25 | {tên} đang học luật | |
| I22 | Thẻ hỏi lại: dòng phụ + 2 nút | đang ở bước mấy, bắt đầu thì xem tiếp trong trận được | 90 / 15 mỗi nút | Nó mới xem tới bước {n}/5. Bắt đầu luôn thì nó xem tiếp trong trận được. / Bắt đầu luôn · Đợi tí | |
| I23 | Bong bóng khi trận bắt đầu lúc mình đang xem | hướng dẫn cất vào nút ?, xem tiếp bước mấy | 60 | Hướng dẫn cất ở đây. Bấm ? xem tiếp từ bước {n}/5. | |
| I24 | Nhãn trước câu nhắc I12–I16 | | 5 | MẸO | |

## K. Lỗi & kết nối (chữ nháp, cần duyệt)
| ID | Chỗ hiện | Cần nói gì | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|---|
| K1 | Ô báo lỗi trên menu: link tới phòng không còn | phòng `{MÃ}` hết hạn hoặc server vừa khởi động lại | 100 | Phòng {MÃ} không còn nữa rồi. Có thể nó hết hạn hoặc server vừa khởi động lại. Tạo phòng mới nhé! | |
| K2 | Ô báo lỗi trên menu: mở phòng ở tab khác | phòng đã mở ở tab khác | 60 | Phòng này đang mở ở tab khác rồi. Chơi tiếp ở tab đó nhé! | |
| K3 | Thẻ không kết nối được: tiêu đề + dòng phụ | | 25 + 80 | Không vào được server! / Thử mấy lần rồi vẫn không được. Kiểm tra mạng, hoặc đợi tí rồi thử lại. | |
| K4 | Thẻ không kết nối được: nút + đếm ngược | | 10 / 30 | Thử lại / Tự thử lại sau {s} giây… | |
| K5 | Bấm Tạo/Vào phòng lúc đang mất kết nối | | 40 | Đang kết nối lại, đợi tí rồi bấm nhé! | |
| K6 | Máy không chạy được 3D: tiêu đề + dòng phụ | | 25 + 100 | Máy này không chạy được game! / Trình duyệt không bật được đồ họa 3D. Thử mở bằng Chrome, hoặc bật "tăng tốc phần cứng" trong cài đặt trình duyệt. | |
| K7 | Trình duyệt quá cũ / tải quá lâu | | 90 | Game tải lâu quá. Thử tải lại trang, hoặc mở bằng Chrome hay Safari bản mới nhé! | |

## J. Góc dưới & Info
| ID | Chỗ hiện | Dài | Hiện tại | Chữ của m |
|---|---|---|---|---|
| J1 | Nút mở bảng thông tin | 8 | Info | |
| J2 | Bảng Info: tiêu đề | 25 | Dép Lào Tuổi Thơ | |
| J3 | Bảng Info: tác giả | 30 | Một trò của BillTheDev | |
| J4 | Bảng Info: nhãn portfolio | 12 | Portfolio | |
| J5 | Bảng Info: nhãn liên hệ | 12 | Liên hệ | |
| J6 | Nút đóng bảng Info / Âm thanh | 8 | Đóng | |
| J7 | Nút copy link khi trình duyệt chặn copy | 18 | Tự copy nhé! | |
| J8 | FPS khi bàn đứng yên / đang chạy | 8 | fps – / {n} fps | |
