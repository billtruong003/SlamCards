# Bàn giao: VPS, Lucy, web studio, ủng hộ, quảng cáo (14/10/2026)

Viết bởi session "Kết nối VPS (fork)". Session này tách ra từ "Kết nối VPS" lúc khoảng 10:29 sáng 14/10, rồi làm phần VPS + thiết kế, trong khi session gốc làm sửa lỗi + FTUE trên nhánh `fix/stability-and-ftue`. File này gom mọi thứ session gốc chưa biết. Đọc xong thì gộp vào `TASKS.md` thành một danh sách thống nhất, rồi xóa hoặc chuyển file này vào `docs/`.

---

## 1. Tình trạng hiện tại (đã kiểm tra lúc viết)

- **Production vẫn chạy code gốc `80d3c9c`** (`/opt/slam-cards`, pm2 `slam-cards`, restart 14 lần, log lỗi trống → các lần restart là do deploy, không phải sập). Nhánh `fix/stability-and-ftue` **chưa deploy**.
- Đối chiếu danh sách lỗi của artifact "Dép Lào: FTUE & lỗi" với nhánh: S1, S2, C1, C2, C3, C4, C6, C7, C8, D1, D2, L1, L2, L3, L7, U1, W1, W2, W3 **đã có trong nhánh**. Còn mở: **QA-01** (tin > 2 MB làm sập, chưa có `ws.on('error')`), L4/L5/L6/C5 (đã nằm trong TASKS.md dưới tên QA-06, UX-03, QA-07, UX-08).
- **`proto/deploy.sh` không chạy được từ máy này**: nó dùng ssh host `hordecall`, mà `~/.ssh/config` trên máy này không có alias đó. Sửa bằng cách thêm vào `C:\Users\ducnq\.ssh\config`:
  ```
  Host hordecall
    HostName 14.225.255.73
    User root
    IdentityFile ~/.ssh/id_ed25519
  ```
  (Key `id_ed25519` của máy này đã được thêm vào VPS, đăng nhập root được.)
- Trong `deploy.sh` còn dòng in link IP `http://14.225.255.73:8096`. Nên bỏ (xem mục 6).

## 2. VPS 14.225.255.73 (Ubuntu 22.04, 2 nhân Xeon E5-2690 v4, 4 GB RAM)

**Truy cập**: `ssh root@14.225.255.73`. Chỉ nhận key, không nhận mật khẩu. `authorized_keys` có 2 key: `hordecall-vps@billthedev` và `chautn@gem-corp.global` (key máy này, có vẻ là key công ty, xem việc A6).

**Đang chạy trên VPS** (đừng đụng khi không được yêu cầu): pm2 `lucy-*` (lucy-hub 8800, lucy-bridge Telegram bot, coordinator, autopilot, vps-worker, pxpipe), `radiant-*`, `noteflow-view`, docker `deploy-api` + `postgres` (hordecall, sau `api.billthedevstudio.com` và cổng 8088), `warp-svc` (Cloudflare WARP proxy 127.0.0.1:40000, lucy-bridge dùng để gửi Telegram, KHÔNG gỡ), backup `hordecall-backup` 03:30 + offsite 03:45 (log báo ok mỗi ngày), watchdog 5 phút, fail2ban.

**nginx** (`/etc/nginx/sites-enabled/`):
- `slam-domain`: `billthedevstudio.io.vn` 443 → `/slam-cards/` và `/slam-cards/ws` → 127.0.0.1:8097. Cert hết hạn 11/01/2027 (certbot tự gia hạn).
- `slam-cards`: cổng 8096 → 8097 (link IP cũ).
- `lucy` (file thường, không phải symlink): cổng 80 mặc định của IP. Hôm nay đã thêm `X-Lucy-UI: next` cho các route 8800, nên `http://14.225.255.73/` hiện giao diện Lucy mới.

**Đã làm hôm nay** (bản sao lưu config ở `/root/vps-maintenance-20261014/`, số liệu trước/sau ở `before.txt`, `after.txt`, `sites-*.txt`):
- Ổ đĩa 31 GB (78%) → 22 GB (56%): xóa `/swapfile2` 6 GB không dùng, log pm2 cũ, cache npm/apt/pnpm, 2 bản Claude Code cũ, kernel 186, snap cũ, `syslog.1`.
- Tắt phiên Claude Code bị treo từ 08/10 (Ctrl+Z trên console) + đăng xuất console root ttyS0.
- Cài 18 bản cập nhật. 4 gói phased còn lại. Không cần reboot, nhưng vài dịch vụ (nginx, ssh, cron…) còn dùng thư viện cũ đến lần restart sau.
- Chặn rác `warp-svc` trong syslog (`/etc/rsyslog.d/10-drop-warp.conf`); rsyslog xoay vòng hằng ngày, tối đa 100 MB, giữ 7 bản; journald tối đa 300 MB; `vm.swappiness=10` (`/etc/sysctl.d/99-vps-tune.conf`); SSH tắt X11Forwarding (`/etc/ssh/sshd_config.d/99-hardening.conf`).
- nginx `worker_connections` 768 → 4096, `worker_rlimit_nofile 16384`. Sức chứa game qua nginx từ khoảng 700 lên vài nghìn người.
- Cổng 80 hiện giao diện Lucy mới, **đóng cổng 8890** (xóa site `lucy-next`, `ufw delete allow 8890/tcp`).
- Xóa 3 nhóm route chết trên cổng 80 (`/ytm`, `/strataro`, `/quan-ly-701510`). Bản cũ: `configs/lucy.enabled.before-deadroutes`.
- Tự động: `/usr/local/bin/vps-cleanup` (Chủ nhật 04:30) và `/usr/local/bin/vps-diskguard` (15 phút/lần; ổ ≥ 85% thì tự dọn, dọn xong vẫn ≥ 85% mới gửi Telegram qua bot + proxy của lucy-bridge, tối đa 1 lần/6 giờ; RAM trống < 300 MB thì ghi log). Cron: `/etc/cron.d/vps-maintenance`. Log: `/root/lucy/vps-maintenance.log`. **Chưa gửi tin thử** (`vps-diskguard --test`) vì cần Bill cho phép.

**Số liệu**: RAM thật dùng khoảng 1.5/3.9 GB (panel báo 3.6 GB là tính cả cache), CPU rảnh khoảng 95%. Game chỉ ăn khoảng 70 MB. Thứ đẩy CPU lên là Lucy chạy Claude CLI + Chrome, không phải game. Chưa cần nâng máy; khi cần thì lên 4 nhân trước.

**Bảo mật cần biết**: Lucy hub chạy http thường (token đi qua mạng không mã hóa) → việc LU5. API của Lucy có đăng nhập (401 khi chưa đăng nhập).

## 3. Lucy hub (`/root/lucy/hub`) và kế hoạch bảng số liệu game

- Express (`server/src/index.ts` + `routes/*.ts`, đăng ký trong `routes/index.ts`), giao diện React ở `web-next` (lazy route trong `App.tsx`, thanh trái 7 nút trong `shell/AppShell.tsx`), design system "F" trong `web-next/src/ds/f.css`. Đăng nhập + 2FA qua `authed(req)` / `requireAuth`.
- **Quy định của repo này** (`CLAUDE.md`): BẮT BUỘC chạy `gitnexus_impact` trước khi sửa bất kỳ hàm nào, và `gitnexus_detect_changes` trước khi commit.
- Kế hoạch đã chốt với Bill: màn **Game** trong Lucy (nút riêng trên thanh trái), 6 tab: Tổng quan, Người chơi, Trận đấu, FTUE, Ủng hộ, Kỹ thuật. Có **tên người chơi** (tên tự gõ, mới nhất) + mã ẩn danh trong localStorage. **Không lưu IP.** Tên chỉ hiện trong Lucy. Tin tóm tắt Telegram 8:00.
- Khuôn dùng lại cho game sau: game ghi sự kiện JSONL theo "hợp đồng sự kiện chuẩn" (`session_start`, `room_create/join`, `join_error`, `match_start`, `round_end`, `match_end`, `rematch`, `ftue_*`, `hint_shown`, `client_error`, `ws_drop/resume`, `server_start/error`, riêng game: `slam`, `pass`; thêm `donate_open`, `donate_qr`, `donate_save`) ra `/var/lib/game-analytics/<game>/YYYY-MM-DD.jsonl`, mở `GET /__stats` chỉ ở 127.0.0.1. Lucy đọc file khai báo `/root/lucy/games/<id>.json`, gom số lúc 00:10, giữ file thô 30 ngày.
- Việc UX-10 trong TASKS.md (gắn event FTUE) **chính là một phần của việc G4** bên dưới. Làm một lần theo hợp đồng chuẩn.

## 4. Thương hiệu, tên miền, email (đã bàn với Bill)

- **Bộ mặt studio** lấy từ `C:\Users\ducnq\Downloads\BillTheDev-Pack` và `BillTheDev-GamesPage-Pack`: nền `#0B0B0C`, amber `#FFB84D`, chữ phụ `#B9B4AA`, font Baloo 2, dấu cáo đeo kính. Khung studio luôn tối + amber, màu sắc là của từng game. Chữ trung tính, không bao giờ gọi studio là "silly/casual".
- **Ba tên miền**: `billthedev.com` = portfolio cá nhân (repo `C:\Projects\Personal-Branding\BillPortfolio`, Next.js static trên GitHub Pages; bản trên máy chậm hơn GitHub 1 commit). `billthedevstudio.com` = landing studio (làm sau). `billthedevstudio.io.vn` = cổng chơi web. Đề xuất đang chờ Bill chốt (Q4): cổng game sang `play.billthedevstudio.com`, io.vn chỉ làm link tắt chuyển hướng + "hậu trường" (`lucy.`, `status.`).
- `billthedev.com/arcade` (Unity WebGL trên Cloudflare R2) giữ làm mẫu công việc. **Không** đưa game của công ty/khách/clone sang cổng studio. Chỉ đưa game riêng của Bill (Timeless Soul chắc chắn; Zombie War, Typing Fight, Drag & Slice chờ Bill xác nhận, Q5).
- `app-ads.txt` của AdMob (`pub-2681948403948920`) đang ở billthedev.com vì Google Play trỏ website về đó. Muốn đổi website trên Play thì chép file sang trước.
- **Email studio**: Bill duyệt 3 hộp `bill@`, `admin@`, `support@`. Đề xuất đặt trên `@billthedevstudio.com`. Bill tự tạo trên PA Vietnam (client.pavietnam.vn), sau đó kiểm tra SPF/DKIM/DMARC. Claude in Chrome chưa kết nối nên chưa đọc được danh sách tên miền + gói mail trên PA.
- Mạng xã hội: YouTube studio `@billthedevgames`, Facebook `billthedevstudio`, portfolio `www.billthedev.com`. Đang lệch: portfolio ghi @BillTheDev / facebook.com/billthedev / billtruong003@gmail.com; Bill đưa Gmail cá nhân truongbill003@gmail.com; YOUTUBE_SETUP ghi billtruong004@gmail.com (Q6).
- Claude for Startups: trang chính thức đang ghi "cohort is now full", chưa nhận đơn. Khi mở cần email trùng tên miền website công ty.

## 5. Ủng hộ + quảng cáo

- **Ủng hộ (đã thiết kế, chưa code)**: mã QR MoMo/VietQR đã cắt sẵn, không có tên và số tài khoản. Bản gốc ở `C:\Users\ducnq\Downloads\77375854_download.webp`, cắt vùng x 324–845, y 360–911. Chỗ đặt: dải mời ở màn hết trận, nút "Ủng hộ" ở góc dưới cạnh Info/Âm thanh, bảng QR (máy tính), tấm trượt có nút **Lưu ảnh mã QR** (điện thoại không quét được mã trên chính nó). Không hiện tên chủ tài khoản. Danh sách người ủng hộ công khai: chờ Bill (Q7).
- **Quảng cáo (đề xuất, chờ Bill duyệt, Q3)**: KHÔNG chặn nút copy link mời bằng quảng cáo (vừa giết vòng lan truyền, vừa vi phạm luật quảng cáo game web của Google). Chỗ đặt: banner nhỏ ở phòng chờ; quảng cáo toàn màn khi bấm "Về menu" (không khi Tái đấu), tối đa 1 lần mỗi 3 trận hoặc 5 phút; quảng cáo tự chọn để mở dép; không bao giờ trong ván. Web cần AdSense (khác AdMob), cần trang chính sách riêng tư + `ads.txt`. Có quảng cáo thì phải sửa câu "free, không quảng cáo" ở phần ủng hộ.

## 6. Artifact và mockup

| Gì | Link |
|---|---|
| Lỗi + kế hoạch FTUE (bản đầu, có ảnh chụp game) | https://claude.ai/artifact/RymAPeinsyve1f86ZzmHSB |
| Kế hoạch bảng số Lucy (HTML, bản trước canvas) | https://claude.ai/artifact/9JmN2m6X937HLnPjTE7e1U |
| **Canvas Claude Design**: cổng game (máy tính + điện thoại), "Bộ mặt studio", Lucy (Tổng quan, Người chơi có tên, Danh sách game, điện thoại), Dép Lào ủng hộ (hết trận, bảng QR máy tính, tấm trượt điện thoại) | https://claude.ai/artifact/CjdMqkAyKS6BuFnxjY9uTb |
| Bảng việc tổng (mã S/C/D/L/G/LU/V/WS/A) | https://claude.ai/artifact/7AQugZcgZ1pgLcVcrK7F4h |
| Brand canvas gốc của Bill (không sửa) | https://claude.ai/artifact/U55tjfdu29zf6mFQF3TrVj |
| Mockup Tủ đồ của session gốc | https://claude.ai/artifact/FMn6afs8qBzdu4unpgC9ex |

## 7. Việc còn lại từ phía bên này (gộp vào TASKS.md)

Mã theo bảng việc tổng. Việc đã có trong TASKS.md thì ghi mã bên đó trong ngoặc.

**Deploy và vận hành**
- [ ] **QA-01** trước, rồi deploy nhánh lên VPS vào giờ vắng (kiểm tra `ss -tn state established '( sport = :8097 )' | wc -l` gần 0). Thêm alias `hordecall` (mục 1) trước.
- [ ] **G7** · pm2 giới hạn RAM: `pm2 restart slam-cards --max-memory-restart 400M --update-env && pm2 save`, gộp vào lần deploy đó.
- [ ] **V1** · Ưu tiên CPU cho game: script `/usr/local/bin/vps-priority` (cron 5 phút) `renice 10` cho tiến trình `lucy-*` (con sinh ra tự thừa hưởng); thêm `nice -n 15` vào dòng `cron_dream.sh` trong crontab root. Bill đã duyệt.
- [ ] **V3** · Reboot giờ vắng (gộp với deploy) để nạp thư viện đã cập nhật.
- [ ] **V2** · Gửi tin Telegram thử (`vps-diskguard --test`), chỉ khi Bill cho phép.
- [ ] **G8** · Bỏ link IP `:8096` khỏi README và `deploy.sh`; cập nhật Concept.md theo luật 2–4 người.

**Đo đạc + Lucy** (làm sau deploy)
- [ ] **G4** (gồm UX-10) · `server/analytics.js` + `src/analytics.js` theo hợp đồng sự kiện ở mục 3, mã ẩn danh + tên, `/__stats` có số kết nối, phòng, độ trễ event loop (`perf_hooks.monitorEventLoopDelay`). Client gửi qua WebSocket: danh sách tên cho phép, tối đa 20 sự kiện/phút/người.
- [ ] **LU1** · Lucy server `routes/games.ts` + job gom số 00:10.
- [ ] **LU2** · Lucy giao diện theo canvas trang "Lucy".
- [ ] **LU3** · Tóm tắt Telegram 8:00 + nút "Hỏi Lucy".
- [ ] **LU4** · Tín hiệu "cần nâng máy": online đỉnh/ngày > 1.000, độ trễ server p95 > 50 ms, CPU game > 70% một nhân, load 15 phút > 1.6, RAM trống < 500 MB; đỏ 3 ngày liền thì báo Telegram.
- [ ] **LU5** · HTTPS cho Lucy (`lucy.billthedevstudio.io.vn` hoặc theo tên miền Bill chốt). Chờ Q4.

**Tính năng game**
- [ ] **G2** · Ủng hộ trong game theo canvas trang "Dép Lào · Ủng hộ". Chữ mới vào TEXTS.md.
- [ ] **G5** · Ảnh xem trước khi dán link phòng (Open Graph) cho Zalo/Messenger.
- [ ] **G6** · Nút "Báo lỗi" (về `support@` hoặc Lucy).
- [ ] **G3** · Quảng cáo, chờ Q3 + Bill đăng ký AdSense.

**Web studio** (chờ Q4)
- [ ] **WS1** · Cổng game từ canvas (trang tĩnh, đọc danh sách game chung với Lucy).
- [ ] **WS3** · Trang pháp lý trên tên miền studio (riêng tư: tên người chơi, mã ẩn danh, quảng cáo).
- [ ] **WS4** · `ads.txt` cho web; giữ `app-ads.txt` ở billthedev.com.
- [ ] **WS2** landing `.com`, **WS5** press kit, **WS6** portfolio thêm nút "Game của studio" ở /arcade.

**Bill làm**: A1 tạo 3 hộp mail; A2 thống nhất tên tài khoản; A3 cài Claude in Chrome (https://chromewebstore.google.com/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn); A4 AdSense; A5 bản tin Claude for Startups; A6 thay key `chautn@gem-corp.global` bằng key riêng khi có.

## 8. Câu hỏi Bill chưa trả lời

- Q3 duyệt chỗ đặt quảng cáo
- Q4 tên miền cổng game
- Q5 game nào được đưa lên studio
- Q6 Gmail cá nhân nào, kênh @BillTheDev là gì
- Q7 danh sách người ủng hộ công khai

Q1 (luật "đè hẳn") và Q2 (duyệt mockup FTUE) có vẻ session gốc đã xử lý khi làm FTUE. Kiểm tra lại và đánh dấu.
