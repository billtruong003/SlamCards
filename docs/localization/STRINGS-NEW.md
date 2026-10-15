# Chữ mới cần duyệt (L10N-04)

107 chuỗi mới từ sau gói dịch 10 ngôn ngữ (Lộ trình bước 3–23: vào trận mới, tủ đồ, pet, lá bài mới).

Cách dùng: sửa cột **vi** / **en** nếu cần, hoặc ném file này + `PROMPT.md` cho AI viết lại cho tự nhiên. Giữ nguyên `{tên biến}`. "max" là số ký tự tối đa vừa chỗ hiển thị.

Bản dịch 8 ngôn ngữ còn lại hiện là bản t viết tạm, nằm ở bảng thứ hai mỗi nhóm.

## Màn hình chính (`home.*`, 5)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `home.quickTitle` | Home: label above the player-count choice for matchmaking with strangers | 36 | Chơi với người lạ · mấy người? | Play strangers · how many? |
| `home.any` | Home: player-count option meaning 2 to 4, whatever is found first | 8 | Bất kỳ | Any |
| `home.play` | Home: big button that starts matchmaking | 14 | Chơi ngay | Play now |
| `home.orFriends` | Home: divider text before the friends options | 24 | hoặc chơi với bạn | or play with friends |
| `home.publicRooms` | Home: button opening the public room list | 16 | Phòng công khai | Public rooms |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `home.quickTitle` | 和陌生人玩 · 几个人？ | 和陌生人玩 · 幾個人？ | Main sama orang lain · berapa? | เล่นกับคนแปลกหน้า · กี่คน? | Jogar com estranhos · quantos? | Jugar con extraños · ¿cuántos? | 知らない人と · 何人？ | 모르는 사람과 · 몇 명? |
| `home.any` | 随便 | 隨便 | Bebas | กี่คนก็ได้ | Tanto faz | Cualquiera | おまかせ | 아무나 |
| `home.play` | 马上开玩 | 馬上開玩 | Main sekarang | เล่นเลย | Jogar já | Jugar ya | すぐ遊ぶ | 바로 시작 |
| `home.orFriends` | 或者和朋友玩 | 或者和朋友玩 | atau main sama teman | หรือเล่นกับเพื่อน | ou jogue com amigos | o juega con amigos | または友だちと | 또는 친구와 |
| `home.publicRooms` | 公开房间 | 公開房間 | Room publik | ห้องสาธารณะ | Salas abertas | Salas públicas | 公開ルーム | 공개 방 |

</details>

## Tạo phòng (`create.*`, 9)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `create.title` | Create-room dialog title | 14 | Tạo phòng | New room |
| `create.who` | Create-room dialog: label above private/public | 24 | Ai vào được? | Who can join? |
| `create.private` | Room visibility option: only people with the link | 12 | Riêng tư | Private |
| `create.privateSub` | Under the Private option | 20 | Chỉ ai có link | Link only |
| `create.public` | Room visibility option: shown in the public list | 12 | Công khai | Public |
| `create.publicSub` | Under the Public option | 22 | Hiện trong danh sách | Shown in the list |
| `create.cap` | Create-room dialog: label above the max-players choice | 24 | Tối đa mấy người? | Max players? |
| `create.go` | Create-room dialog: confirm button | 10 | Tạo | Create |
| `create.cancel` | Create-room dialog: cancel link | 10 | Thôi | Never mind |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `create.title` | 创建房间 | 建立房間 | Bikin room | สร้างห้อง | Criar sala | Crear sala | ルーム作成 | 방 만들기 |
| `create.who` | 谁能进？ | 誰能進？ | Siapa boleh masuk? | ใครเข้าได้บ้าง? | Quem pode entrar? | ¿Quién puede entrar? | だれが入れる？ | 누가 들어올 수 있어? |
| `create.private` | 私密 | 私密 | Privat | ส่วนตัว | Privada | Privada | 非公開 | 비공개 |
| `create.privateSub` | 有链接才能进 | 有連結才能進 | Cuma yang punya link | มีลิงก์เท่านั้น | Só com o link | Solo con el enlace | リンクを持つ人だけ | 링크 있는 사람만 |
| `create.public` | 公开 | 公開 | Publik | สาธารณะ | Aberta | Pública | 公開 | 공개 |
| `create.publicSub` | 显示在列表里 | 顯示在列表裡 | Muncul di daftar | แสดงในรายการ | Aparece na lista | Sale en la lista | 一覧に出る | 목록에 보여 |
| `create.cap` | 最多几个人？ | 最多幾個人？ | Maksimal berapa orang? | สูงสุดกี่คน? | Máximo de jogadores? | ¿Máximo de jugadores? | 最大何人？ | 최대 몇 명? |
| `create.go` | 创建 | 建立 | Bikin | สร้าง | Criar | Crear | 作る | 만들기 |
| `create.cancel` | 算了 | 算了 | Gak jadi | ไม่เอาแล้ว | Deixa | Mejor no | やめる | 취소 |

</details>

## Chung (`common.*`, 2)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `common.players` | A count of players, e.g. on filter buttons. {n} = number | 12 | {n} người | {n} players |
| `common.back` | Back button | 8 | Về | Back |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `common.players` | {n} 人 | {n} 人 | {n} orang | {n} คน | {n} jogadores | {n} jugadores | {n}人 | {n}명 |
| `common.back` | 返回 | 返回 | Balik | กลับ | Voltar | Volver | 戻る | 뒤로 |

</details>

## Phòng công khai (`rooms.*`, 11)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `rooms.title` | Public room list title | 18 | Phòng công khai | Public rooms |
| `rooms.all` | Room list filter: all sizes | 8 | Tất cả | All |
| `rooms.room` | Room list row title. {code} = room code | 14 | Phòng {code} | Room {code} |
| `rooms.count` | Room list row: players in / max | 14 | {n}/{cap} người | {n}/{cap} players |
| `rooms.waiting` | Room list row tag: lobby open | 10 | Đang chờ | Waiting |
| `rooms.playing` | Room list row tag: match running, cannot join | 10 | Đang đánh | Playing |
| `rooms.join` | Room list row button | 6 | Vào | Join |
| `rooms.note` | Under the room list | 50 | Phòng đang chờ lên đầu. Danh sách tự cập nhật. | Open rooms first. The list updates itself. |
| `rooms.create` | Room list button: make a public room | 22 | Tạo phòng công khai | New public room |
| `rooms.emptyTitle` | Room list when no room is open | 32 | Chưa có phòng nào đang chờ | No open rooms yet |
| `rooms.emptySub` | Room list empty state, second line | 60 | Mở một phòng cho người khác vào, hoặc để game ghép giúp. | Open one for others, or let the game match you. |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `rooms.title` | 公开房间 | 公開房間 | Room publik | ห้องสาธารณะ | Salas abertas | Salas públicas | 公開ルーム | 공개 방 |
| `rooms.all` | 全部 | 全部 | Semua | ทั้งหมด | Todas | Todas | すべて | 전체 |
| `rooms.room` | 房间 {code} | 房間 {code} | Room {code} | ห้อง {code} | Sala {code} | Sala {code} | ルーム {code} | {code} 방 |
| `rooms.count` | {n}/{cap} 人 | {n}/{cap} 人 | {n}/{cap} orang | {n}/{cap} คน | {n}/{cap} jogadores | {n}/{cap} jugadores | {n}/{cap}人 | {n}/{cap}명 |
| `rooms.waiting` | 等待中 | 等待中 | Nunggu | กำลังรอ | Esperando | Esperando | 募集中 | 대기 중 |
| `rooms.playing` | 对战中 | 對戰中 | Lagi main | กำลังเล่น | Jogando | Jugando | 対戦中 | 게임 중 |
| `rooms.join` | 进入 | 進入 | Masuk | เข้า | Entrar | Entrar | 入る | 입장 |
| `rooms.note` | 等待中的房间排在前面，列表会自动更新。 | 等待中的房間排在前面，列表會自動更新。 | Room yang nunggu di atas. Daftar update sendiri. | ห้องที่รออยู่ขึ้นก่อน รายการอัปเดตเอง | Salas esperando primeiro. A lista se atualiza. | Primero las salas que esperan. La lista se actualiza sola. | 募集中が上。一覧は自動で更新されるよ。 | 대기 중인 방이 위에. 목록은 자동 갱신돼. |
| `rooms.create` | 创建公开房间 | 建立公開房間 | Bikin room publik | สร้างห้องสาธารณะ | Criar sala aberta | Crear sala pública | 公開ルームを作る | 공개 방 만들기 |
| `rooms.emptyTitle` | 还没有等待中的房间 | 還沒有等待中的房間 | Belum ada room yang nunggu | ยังไม่มีห้องที่รออยู่ | Nenhuma sala esperando | Aún no hay salas esperando | 募集中のルームはまだないよ | 아직 대기 중인 방이 없어 |
| `rooms.emptySub` | 开一个房间等人来，或者让游戏帮你匹配。 | 開一個房間等人來，或者讓遊戲幫你配對。 | Bikin room buat orang lain, atau biar game yang cariin. | เปิดห้องให้คนอื่นเข้า หรือให้เกมจับคู่ให้ | Abra uma sala ou deixe o jogo achar alguém. | Abre una sala o deja que el juego te empareje. | ルームを開くか、ゲームにマッチングしてもらおう。 | 방을 열거나 게임이 매칭해 주게 해. |

</details>

## Chơi ngay (ghép trận) (`queue.*`, 13)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `queue.title` | Matchmaking screen title | 24 | Đang tìm đối thủ… | Finding players… |
| `queue.sizeAny` | Matchmaking: which size was asked, any size | 22 | Bất kỳ số người | Any size |
| `queue.size` | Matchmaking: exact size asked. {n} = number | 18 | Trận {n} người | {n}-player match |
| `queue.waited` | Matchmaking: time waited. {time} = m:ss | 16 | đã đợi {time} | waited {time} |
| `queue.startsIn` | Matchmaking any-size: enough found, short countdown. {n} players, {secs} seconds | 36 | Đủ {n} người! Vào trận sau {secs}… | {n} found! Starting in {secs}… |
| `queue.anyNote` | Matchmaking any-size countdown note | 50 | Đợi thêm vài giây xem có ai vào nữa không. | Giving it a few seconds for more to join. |
| `queue.fullNote` | Matchmaking exact size note | 36 | Đủ {n} người là vào luôn. | Starts as soon as {n} are in. |
| `queue.fewer` | Matchmaking: button after 20 s to settle for fewer players. {n} = number | 24 | Chơi {n} người luôn | Play with {n} now |
| `queue.cancel` | Matchmaking: cancel button | 10 | Hủy | Cancel |
| `queue.slot` | Matchmaking: empty seat still searching | 14 | Đang tìm… | Searching… |
| `queue.justIn` | Matchmaking: under a player who just turned up | 12 | vừa vào | just in |
| `queue.lost` | Home error after the connection dropped while matchmaking | 50 | Mất kết nối khi đang tìm trận. Thử lại nhé! | Lost connection while matching. Try again! |
| `queue.found` | Short screen right after a quick match is found, before round 1 | 18 | Tìm được trận! | Match found! |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `queue.title` | 正在找对手… | 正在找對手… | Lagi cari lawan… | กำลังหาคู่แข่ง… | Procurando rivais… | Buscando rivales… | 相手を探してるよ… | 상대 찾는 중… |
| `queue.sizeAny` | 人数随便 | 人數隨便 | Berapa aja | กี่คนก็ได้ | Qualquer tamanho | Cualquier tamaño | 人数おまかせ | 인원 상관없음 |
| `queue.size` | {n} 人对战 | {n} 人對戰 | Main {n} orang | แมตช์ {n} คน | Partida de {n} | Partida de {n} | {n}人対戦 | {n}인 게임 |
| `queue.waited` | 已等 {time} | 已等 {time} | nunggu {time} | รอแล้ว {time} | esperando {time} | esperando {time} | 待ち {time} | {time} 대기 |
| `queue.startsIn` | 凑齐 {n} 人！{secs} 秒后开始… | 湊齊 {n} 人！{secs} 秒後開始… | Udah {n} orang! Mulai {secs} detik lagi… | ครบ {n} คนแล้ว! เริ่มใน {secs}… | {n} achados! Começa em {secs}… | ¡{n} listos! Empieza en {secs}… | {n}人そろった！{secs}秒で開始… | {n}명 모였어! {secs}초 뒤 시작… |
| `queue.anyNote` | 再等几秒看看还有没有人来。 | 再等幾秒看看還有沒有人來。 | Nunggu bentar siapa tahu ada yang masuk lagi. | รออีกไม่กี่วิ เผื่อมีคนเข้ามาเพิ่ม | Esperando uns segundos por mais gente. | Esperamos unos segundos por si entra alguien más. | あと数秒、ほかの人を待つよ。 | 몇 초만 더 다른 사람을 기다려. |
| `queue.fullNote` | 凑齐 {n} 人就开始。 | 湊齊 {n} 人就開始。 | Begitu {n} orang langsung mulai. | ครบ {n} คนก็เริ่มเลย | Começa quando tiver {n}. | Empieza en cuanto haya {n}. | {n}人そろったらすぐ開始。 | {n}명 모이면 바로 시작. |
| `queue.fewer` | 就 {n} 人开始 | 就 {n} 人開始 | Main {n} orang aja | เล่น {n} คนเลย | Jogar com {n} já | Jugar con {n} ya | {n}人で始める | {n}명으로 시작 |
| `queue.cancel` | 取消 | 取消 | Batal | ยกเลิก | Cancelar | Cancelar | キャンセル | 취소 |
| `queue.slot` | 寻找中… | 尋找中… | Nyari… | กำลังหา… | Procurando… | Buscando… | さがし中… | 찾는 중… |
| `queue.justIn` | 刚进来 | 剛進來 | baru masuk | เพิ่งเข้า | chegou | acaba de entrar | 来たよ | 방금 들어옴 |
| `queue.lost` | 匹配时断线了，再试一次吧！ | 配對時斷線了，再試一次吧！ | Koneksi putus pas nyari lawan. Coba lagi! | หลุดตอนหาคู่ ลองใหม่นะ! | Caiu a conexão na busca. Tenta de novo! | Se cortó la conexión al buscar. ¡Prueba otra vez! | マッチング中に切れちゃった。もう一回！ | 매칭 중에 연결이 끊겼어. 다시 해 봐! |
| `queue.found` | 找到对局了！ | 找到對局了！ | Dapet lawan! | เจอแมตช์แล้ว! | Partida achada! | ¡Partida encontrada! | 対戦相手が見つかった！ | 게임 찾았어! |

</details>

## Lỗi (`error.*`, 4)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `error.inMatchWait` | Menu error after opening an invite link (or typing a code) for a room whose match is already running. {code} = room code | 70 | Phòng {code} đang đánh dở. Đợi hết trận rồi bấm lại link nhé! | Room {code} is mid-match. Open the link again when it ends! |
| `error.typedNotFound` | Menu error after typing a room code that matches no room (likely a typo). {code} = the 4 letters typed | 45 | Không thấy phòng {code}. Xem lại mã nhé! | No room {code}. Check the code! |
| `error.codeShort` | Menu error when Join is pressed with fewer than 4 letters in the room code box | 40 | Mã phòng có 4 ký tự nhé! | Room codes have 4 letters! |
| `error.colorTaken` | Toast when a card colour someone else has was picked | 40 | Màu đó có người lấy rồi! | Someone already has that color! |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `error.inMatchWait` | 房间 {code} 正在对战中，等这局结束再点链接吧！ | 房間 {code} 正在對戰中，等這局結束再點連結吧！ | Room {code} lagi main. Buka link-nya lagi pas udah selesai! | ห้อง {code} กำลังเล่นอยู่ รอจบเกมแล้วกดลิงก์อีกครั้งนะ | A sala {code} tá no meio da partida. Abre o link de novo quando acabar! | La sala {code} está en plena partida. ¡Abre el enlace otra vez cuando termine! | ルーム {code} は対戦中。終わったらもう一度リンクを開いてね！ | {code} 방은 게임 중이야. 끝나면 링크 다시 눌러 줘! |
| `error.typedNotFound` | 找不到房间 {code}，检查一下房号吧！ | 找不到房間 {code}，檢查一下房號吧！ | Room {code} nggak ada. Cek lagi kodenya! | ไม่เจอห้อง {code} ลองเช็กรหัสอีกที | Sala {code} não existe. Confere o código! | No existe la sala {code}. ¡Revisa el código! | ルーム {code} が見つからない。コードを確認してね！ | {code} 방이 없어. 코드 다시 확인해 봐! |
| `error.codeShort` | 房号是 4 个字符哦！ | 房號是 4 個字元喔！ | Kode room isinya 4 huruf! | รหัสห้องมี 4 ตัวนะ | O código da sala tem 4 letras! | ¡El código tiene 4 letras! | ルームコードは4文字だよ！ | 방 코드는 4글자야! |
| `error.colorTaken` | 这个颜色已经有人用了！ | 這個顏色已經有人用了！ | Warna itu udah dipakai orang! | สีนี้มีคนใช้แล้ว! | Alguém já pegou essa cor! | ¡Alguien ya tiene ese color! | その色はもう使われてるよ！ | 그 색은 누가 쓰고 있어! |

</details>

## Menu (`menu.*`, 1)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `menu.randomNames` | Not shown as one line: a \| separated list of silly nicknames; one is picked at random to prefill the name box on a first visit. Each name max 16 characters, kid-friendly, local flavour | 400 | Tí sún\|Tèo mũi\|Bé Bự\|Cu Tũn\|Mít ướt\|Tủn béo\|Bin lém\|Su hào\|Bống bang\|Cò hương | Flip King\|Sock Ninja\|Snack Boss\|Lil Slapper\|Captain Crumb\|Mr. Wiggles\|Turbo Toad\|Noodle Kid\|Sneaky Pete\|Bubble Bot |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `menu.randomNames` | 拖鞋大王\|小胖墩\|饭团侠\|皮皮虾\|闪电兔\|糖豆豆\|小旋风\|大白菜\|跳跳虎\|豆包子 | 拖鞋大王\|小胖墩\|飯糰俠\|皮皮蝦\|閃電兔\|糖豆豆\|小旋風\|大白菜\|跳跳虎\|珍奶仔 | Si Sandal\|Bocil Gesit\|Raja Cilok\|Ucup Turbo\|Mbak Bakso\|Jago Tepok\|Kancil Kece\|Bang Geprek\|Dedek Ompol\|Mas Kerupuk | เจ้าแตะ\|ตัวแสบ\|ไข่เจียว\|หมูกรอบ\|น้องตบ\|เจ้าจุก\|ลูกชิ้น\|ขนมครก\|เสือน้อย\|แมวเหมียว | Rei do Chinelo\|Zé Pipoca\|Tampinha\|Pé de Pano\|Juca Bala\|Mini Craque\|Dona Pipa\|Bolinho\|Tico Teco\|Coxinha | Rey Chancla\|Pulguita\|Tostadito\|Chapulín\|Pequeño Rayo\|Tío Taco\|Chispita\|Gordito\|Mapache\|Ratón Veloz | ビーサン王\|ちびっこ\|おにぎり丸\|ぽんた\|ダッシュ兎\|たこやき\|こてつ\|もちもち\|ペチ子\|しじみ | 쪼리왕\|꼬마번개\|떡볶이\|짱구\|만두\|콩떡\|날쌘돌이\|고구마\|뚱이\|호빵 |

</details>

## Phòng chờ (`lobby.*`, 10)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `lobby.host` | Lobby seat tag: this player is the host | 12 | Chủ phòng | Host |
| `lobby.isReady` | Lobby seat tag: guest is ready | 12 | Sẵn sàng | Ready |
| `lobby.notReady` | Lobby seat tag: guest not ready yet | 14 | Chưa sẵn sàng | Not ready |
| `lobby.readyBtn` | Guest's main lobby button | 16 | Sẵn sàng! | Ready! |
| `lobby.unready` | Guest's lobby button after pressing Ready | 16 | Hủy sẵn sàng | Not ready |
| `lobby.startReady` | Host's start button, with how many guests are ready. {ready}/{guests} | 30 | Chiến thôi! ({ready}/{guests} sẵn sàng) | Let's go! ({ready}/{guests} ready) |
| `lobby.waitGuests` | Under the host's start button: who still has to press Ready. {names} | 50 | Đợi {names} bấm Sẵn sàng | Waiting for {names} to get ready |
| `lobby.waitHost` | Under the guest's Ready button. {name} = host | 50 | {name} bắt đầu khi mọi người sẵn sàng | {name} starts once everyone is ready |
| `lobby.capTag` | Lobby tag: max players. {n} | 16 | Tối đa {n} người | Up to {n} |
| `lobby.myGear` | Lobby: heading above the player's gear tiles | 16 | Đồ của m | Your gear |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `lobby.host` | 房主 | 房主 | Host | เจ้าของห้อง | Dono | Anfitrión | ホスト | 방장 |
| `lobby.isReady` | 准备好了 | 準備好了 | Siap | พร้อม | Pronto | Listo | 準備OK | 준비 완료 |
| `lobby.notReady` | 还没准备 | 還沒準備 | Belum siap | ยังไม่พร้อม | Não pronto | No listo | まだ | 준비 안 됨 |
| `lobby.readyBtn` | 准备！ | 準備！ | Siap! | พร้อมแล้ว! | Pronto! | ¡Listo! | 準備OK！ | 준비! |
| `lobby.unready` | 取消准备 | 取消準備 | Batal siap | ยกเลิกพร้อม | Cancelar | Cancelar | 準備取り消し | 준비 취소 |
| `lobby.startReady` | 开打！（{ready}/{guests} 已准备） | 開打！（{ready}/{guests} 已準備） | Gas! ({ready}/{guests} siap) | ลุย! ({ready}/{guests} พร้อม) | Bora! ({ready}/{guests} prontos) | ¡Vamos! ({ready}/{guests} listos) | 始めよう！（{ready}/{guests} OK） | 시작! ({ready}/{guests} 준비) |
| `lobby.waitGuests` | 等 {names} 准备 | 等 {names} 準備 | Nunggu {names} siap | รอ {names} กดพร้อม | Esperando {names} ficar pronto | Esperando a que {names} esté listo | {names} の準備待ち | {names} 준비 기다리는 중 |
| `lobby.waitHost` | 大家都准备好后由 {name} 开始 | 大家都準備好後由 {name} 開始 | {name} mulai kalau semua siap | {name} จะเริ่มเมื่อทุกคนพร้อม | {name} começa quando todos estiverem prontos | {name} empieza cuando todos estén listos | みんな準備できたら {name} が開始 | 모두 준비되면 {name}가 시작해 |
| `lobby.capTag` | 最多 {n} 人 | 最多 {n} 人 | Maks {n} orang | สูงสุด {n} คน | Até {n} | Hasta {n} | 最大{n}人 | 최대 {n}명 |
| `lobby.myGear` | 你的装扮 | 你的裝扮 | Barangmu | ของเธอ | Seu visual | Tu equipo | きみの装備 | 내 장비 |

</details>

## Trong trận (`match.*`, 4)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `match.findNew` | Match end (quick match): back into matchmaking | 18 | Tìm trận mới | Find new match |
| `match.rematchCount` | Match end (quick match): rematch with a count. {n}/{m} | 20 | Tái đấu ({n}/{m}) | Rematch ({n}/{m}) |
| `match.quickNote` | Match end (quick match) note | 60 | Tái đấu chỉ chạy khi mọi người cùng bấm. | A rematch needs everyone to press it. |
| `match.newRoom` | Match-end button shown instead of Rematch when everyone else has left; makes a fresh room | 18 | Tạo phòng mới | New room |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `match.findNew` | 再找一局 | 再找一局 | Cari lawan baru | หาแมตช์ใหม่ | Nova partida | Buscar otra | 次の対戦へ | 새 게임 찾기 |
| `match.rematchCount` | 再来（{n}/{m}） | 再來（{n}/{m}） | Main lagi ({n}/{m}) | แข่งใหม่ ({n}/{m}) | Revanche ({n}/{m}) | Revancha ({n}/{m}) | 再戦（{n}/{m}） | 재대결 ({n}/{m}) |
| `match.quickNote` | 所有人都点了才会再来一局。 | 所有人都點了才會再來一局。 | Main lagi cuma jalan kalau semua pencet. | ต้องกดกันทุกคนถึงจะแข่งใหม่ | A revanche só rola se todos apertarem. | La revancha solo va si todos la pulsan. | 全員が押したら再戦できるよ。 | 모두 눌러야 재대결해. |
| `match.newRoom` | 新开房间 | 新開房間 | Bikin room baru | สร้างห้องใหม่ | Nova sala | Sala nueva | 新しいルーム | 새 방 만들기 |

</details>

## Thông báo nhanh (`toast.*`, 1)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `toast.afk` | Toast: a quick-match player timed out twice and is out of the round. {name} | 50 | {name} treo máy, bị loại ván này! | {name} went idle and is out this round! |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `toast.afk` | {name} 挂机，本局出局！ | {name} 掛機，本局出局！ | {name} AFK, keluar ronde ini! | {name} ไม่เล่น ตกรอบนี้! | {name} ficou parado e saiu da rodada! | ¡{name} se quedó quieto y queda fuera! | {name} は放置でこのラウンド脱落！ | {name} 잠수로 이번 판 탈락! |

</details>

## Hết ván (`result.*`, 2)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `result.afk` | Round-end title when the last opponent was out for idling | 14 | TREO MÁY! | IDLE! |
| `result.afkHow` | Round-end explanation: idle player. {name} | 50 | {name} hết giờ 2 lượt liền, bị loại! | {name} timed out twice in a row and is out! |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `result.afk` | 挂机！ | 掛機！ | AFK! | ไม่เล่น! | PARADO! | ¡INACTIVO! | 放置！ | 잠수! |
| `result.afkHow` | {name} 连续两回合超时，出局！ | {name} 連續兩回合超時，出局！ | {name} 2x kehabisan waktu, keluar! | {name} หมดเวลา 2 ตาติด ตกรอบ! | {name} estourou o tempo 2 vezes e saiu! | ¡{name} se quedó sin tiempo 2 veces y queda fuera! | {name} は2回連続時間切れで脱落！ | {name} 2번 연속 시간 초과로 탈락! |

</details>

## Tên pet (`pet.*`, 24)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `pet.cat` | Pet name (cat), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Mèo | Cat |
| `pet.dog` | Pet name (dog), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Chó | Dog |
| `pet.panda` | Pet name (panda), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Gấu trúc | Panda |
| `pet.fox` | Pet name (fox), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Cáo | Fox |
| `pet.pig` | Pet name (pig), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Heo | Pig |
| `pet.bunny` | Pet name (bunny), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Thỏ | Bunny |
| `pet.chick` | Pet name (chick), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Gà con | Chick |
| `pet.penguin` | Pet name (penguin), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Cánh cụt | Penguin |
| `pet.tiger` | Pet name (tiger), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Hổ | Tiger |
| `pet.lion` | Pet name (lion), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Sư tử | Lion |
| `pet.monkey` | Pet name (monkey), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Khỉ | Monkey |
| `pet.koala` | Pet name (koala), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Gấu túi | Koala |
| `pet.cow` | Pet name (cow), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Bò | Cow |
| `pet.deer` | Pet name (deer), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Nai | Deer |
| `pet.elephant` | Pet name (elephant), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Voi | Elephant |
| `pet.giraffe` | Pet name (giraffe), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Hươu cao cổ | Giraffe |
| `pet.bee` | Pet name (bee), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Ong | Bee |
| `pet.crab` | Pet name (crab), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Cua | Crab |
| `pet.fish` | Pet name (fish), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Cá | Fish |
| `pet.parrot` | Pet name (parrot), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Vẹt | Parrot |
| `pet.beaver` | Pet name (beaver), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Hải ly | Beaver |
| `pet.hog` | Pet name (hog), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Heo rừng | Boar |
| `pet.polar` | Pet name (polar), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Gấu Bắc cực | Polar bear |
| `pet.caterpillar` | Pet name (caterpillar), shown on pet tiles and on the card ribbon (upper-cased there) | 14 | Sâu | Caterpillar |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `pet.cat` | 猫咪 | 貓咪 | Kucing | แมว | Gato | Gato | ネコ | 고양이 |
| `pet.dog` | 狗狗 | 狗狗 | Anjing | หมา | Cachorro | Perro | イヌ | 강아지 |
| `pet.panda` | 熊猫 | 熊貓 | Panda | แพนด้า | Panda | Panda | パンダ | 판다 |
| `pet.fox` | 狐狸 | 狐狸 | Rubah | จิ้งจอก | Raposa | Zorro | キツネ | 여우 |
| `pet.pig` | 小猪 | 小豬 | Babi | หมู | Porco | Cerdo | ブタ | 돼지 |
| `pet.bunny` | 兔子 | 兔子 | Kelinci | กระต่าย | Coelho | Conejo | ウサギ | 토끼 |
| `pet.chick` | 小鸡 | 小雞 | Anak ayam | ลูกเจี๊ยบ | Pintinho | Pollito | ヒヨコ | 병아리 |
| `pet.penguin` | 企鹅 | 企鵝 | Penguin | เพนกวิน | Pinguim | Pingüino | ペンギン | 펭귄 |
| `pet.tiger` | 老虎 | 老虎 | Harimau | เสือ | Tigre | Tigre | トラ | 호랑이 |
| `pet.lion` | 狮子 | 獅子 | Singa | สิงโต | Leão | León | ライオン | 사자 |
| `pet.monkey` | 猴子 | 猴子 | Monyet | ลิง | Macaco | Mono | サル | 원숭이 |
| `pet.koala` | 考拉 | 無尾熊 | Koala | โคอาล่า | Coala | Koala | コアラ | 코알라 |
| `pet.cow` | 奶牛 | 乳牛 | Sapi | วัว | Vaca | Vaca | ウシ | 소 |
| `pet.deer` | 小鹿 | 小鹿 | Rusa | กวาง | Veado | Ciervo | シカ | 사슴 |
| `pet.elephant` | 大象 | 大象 | Gajah | ช้าง | Elefante | Elefante | ゾウ | 코끼리 |
| `pet.giraffe` | 长颈鹿 | 長頸鹿 | Jerapah | ยีราฟ | Girafa | Jirafa | キリン | 기린 |
| `pet.bee` | 蜜蜂 | 蜜蜂 | Lebah | ผึ้ง | Abelha | Abeja | ハチ | 꿀벌 |
| `pet.crab` | 螃蟹 | 螃蟹 | Kepiting | ปู | Caranguejo | Cangrejo | カニ | 게 |
| `pet.fish` | 小鱼 | 小魚 | Ikan | ปลา | Peixe | Pez | サカナ | 물고기 |
| `pet.parrot` | 鹦鹉 | 鸚鵡 | Burung beo | นกแก้ว | Papagaio | Loro | オウム | 앵무새 |
| `pet.beaver` | 海狸 | 河狸 | Berang-berang | บีเวอร์ | Castor | Castor | ビーバー | 비버 |
| `pet.hog` | 野猪 | 山豬 | Babi hutan | หมูป่า | Javali | Jabalí | イノシシ | 멧돼지 |
| `pet.polar` | 北极熊 | 北極熊 | Beruang kutub | หมีขั้วโลก | Urso-polar | Oso polar | シロクマ | 북극곰 |
| `pet.caterpillar` | 毛毛虫 | 毛毛蟲 | Ulat | หนอน | Lagarta | Oruga | イモムシ | 애벌레 |

</details>

## Màu bài (`color.*`, 4)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `color.hong` | Card colour name (hong), upper case, on seats, labels and the colour picker | 10 | HỒNG | PINK |
| `color.xanh` | Card colour name (xanh), upper case, on seats, labels and the colour picker | 10 | XANH | BLUE |
| `color.vang` | Card colour name (vang), upper case, on seats, labels and the colour picker | 10 | VÀNG | YELLOW |
| `color.la` | Card colour name (la), upper case, on seats, labels and the colour picker | 10 | XANH LÁ | GREEN |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `color.hong` | 粉色 | 粉紅 | PINK | ชมพู | ROSA | ROSA | ピンク | 분홍 |
| `color.xanh` | 蓝色 | 藍色 | BIRU | ฟ้า | AZUL | AZUL | あお | 파랑 |
| `color.vang` | 黄色 | 黃色 | KUNING | เหลือง | AMARELO | AMARILLO | きいろ | 노랑 |
| `color.la` | 绿色 | 綠色 | HIJAU | เขียว | VERDE | VERDE | みどり | 초록 |

</details>

## Phần dép đổi màu (`depPart.*`, 6)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `depPart.dep_lao.sole` | Slipper part that can be recoloured (dep_lao.sole) | 16 | Mặt đế | Sole |
| `depPart.dep_lao.strap` | Slipper part that can be recoloured (dep_lao.strap) | 16 | Quai + viền | Strap + rim |
| `depPart.dep_le.insole` | Slipper part that can be recoloured (dep_le.insole) | 16 | Lót chân | Insole |
| `depPart.dep_le.sole` | Slipper part that can be recoloured (dep_le.sole) | 16 | Đế | Sole |
| `depPart.dep_le.strap` | Slipper part that can be recoloured (dep_le.strap) | 16 | Quai | Strap |
| `depPart.dep_to_ong.all` | Slipper part that can be recoloured (dep_to_ong.all) | 16 | Cả chiếc | Whole |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `depPart.dep_lao.sole` | 鞋底 | 鞋底 | Alas | พื้นรองเท้า | Sola | Suela | ソール | 밑창 |
| `depPart.dep_lao.strap` | 鞋带和边 | 鞋帶和邊 | Tali + pinggir | สาย + ขอบ | Tira + borda | Tira + borde | ひも＋ふち | 끈 + 테두리 |
| `depPart.dep_le.insole` | 鞋垫 | 鞋墊 | Alas kaki | แผ่นรองเท้า | Palmilha | Plantilla | インソール | 깔창 |
| `depPart.dep_le.sole` | 鞋底 | 鞋底 | Sol | พื้น | Sola | Suela | ソール | 밑창 |
| `depPart.dep_le.strap` | 鞋带 | 鞋帶 | Tali | สาย | Tira | Tira | ひも | 끈 |
| `depPart.dep_to_ong.all` | 整只 | 整隻 | Semua | ทั้งข้าง | Inteiro | Entera | まるごと | 전체 |

</details>

## Tủ đồ (`wardrobe.*`, 9)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `wardrobe.title` | Wardrobe screen title | 14 | Tủ đồ | Wardrobe |
| `wardrobe.pet` | Wardrobe tab / tile label: pet | 10 | Pet | Pet |
| `wardrobe.dep` | Wardrobe tab / tile label: slipper | 10 | Dép | Slipper |
| `wardrobe.card` | Wardrobe tab / tile label: card colour | 12 | Màu bài | Card color |
| `wardrobe.done` | Wardrobe: close button | 10 | Xong | Done |
| `wardrobe.note` | Under the wardrobe tiles on the home screen | 40 | Đồ này đi theo m vào mọi trận | Your gear comes to every match |
| `wardrobe.taken` | Card colour already used by someone in the room | 18 | Có người lấy rồi | Taken |
| `wardrobe.preview` | Wardrobe: caption under the card preview | 24 | Lá của m | Your card |
| `wardrobe.pickType` | Wardrobe slipper tab: label above the slipper types | 20 | Loại dép | Slipper type |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `wardrobe.title` | 衣柜 | 衣櫃 | Lemari | ตู้ของ | Armário | Armario | クローゼット | 옷장 |
| `wardrobe.pet` | 宠物 | 寵物 | Pet | สัตว์เลี้ยง | Pet | Mascota | ペット | 펫 |
| `wardrobe.dep` | 拖鞋 | 拖鞋 | Sandal | รองเท้า | Chinelo | Chancla | サンダル | 슬리퍼 |
| `wardrobe.card` | 卡牌颜色 | 卡牌顏色 | Warna kartu | สีไพ่ | Cor da carta | Color de carta | カードの色 | 카드 색 |
| `wardrobe.done` | 好了 | 好了 | Selesai | เสร็จ | Pronto | Listo | OK | 완료 |
| `wardrobe.note` | 你的装扮会带进每一局 | 你的裝扮會帶進每一局 | Barangmu ikut tiap pertandingan | ของนี้ติดตัวไปทุกแมตช์ | Seu visual vai pra toda partida | Tu equipo va a cada partida | 装備はどの対戦にも持っていくよ | 꾸민 건 모든 게임에 같이 가 |
| `wardrobe.taken` | 已被选 | 已被選 | Udah diambil | มีคนเลือกแล้ว | Já pegaram | Ya elegido | 使用中 | 사용 중 |
| `wardrobe.preview` | 你的卡牌 | 你的卡牌 | Kartumu | ไพ่ของเธอ | Sua carta | Tu carta | きみのカード | 내 카드 |
| `wardrobe.pickType` | 拖鞋种类 | 拖鞋種類 | Jenis sandal | ชนิดรองเท้า | Tipo de chinelo | Tipo de chancla | サンダルの種類 | 슬리퍼 종류 |

</details>

## Lượt (`turn.*`, 1)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `turn.tooLate` | Pop text where the player tapped in the last ~0.6 s of their turn, when a slam can no longer be sent | 10 | Hết giờ! | Too late! |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `turn.tooLate` | 来不及了！ | 來不及了！ | Telat! | หมดเวลา! | Tarde! | ¡Tarde! | 時間切れ！ | 늦었어! |

</details>

## Bảng Info (`info.*`, 1)

| key | chỗ hiện | max | vi | en |
|---|---|---|---|---|
| `info.petArt` | Credit for the 3D pets and slippers' style source (info panel); {name} is 'Kenney (CC0)' | 34 | Pet 3D: {name} | 3D pets: {name} |

<details><summary>8 ngôn ngữ khác</summary>

| key | zh-Hans | zh-Hant | id | th | pt-BR | es | ja | ko |
|---|---|---|---|---|---|---|---|---|
| `info.petArt` | 3D 宠物：{name} | 3D 寵物：{name} | Pet 3D: {name} | สัตว์เลี้ยง 3D: {name} | Pets 3D: {name} | Mascotas 3D: {name} | 3Dペット：{name} | 3D 펫: {name} |

</details>
