# Prompt dịch + viết lại chữ trong game

Cách dùng:
1. Dán toàn bộ khối "PROMPT" bên dưới vào con AI khác.
2. Dán tiếp nội dung file `docs/localization/STRINGS.md` (bảng chữ trong game, sinh bằng `npm run i18n:export` trong `proto/`).
3. Mỗi lần chỉ xin **một ngôn ngữ** (sửa dòng `NGÔN NGỮ CẦN LÀM`). Làm một lượt cho cả bảng thì dễ bị cắt giữa chừng.
4. Lưu kết quả thành `proto/src/locales/<mã>.json`, rồi chạy `npm run i18n:check -- <mã>` trong `proto/` để bắt lỗi thiếu key, sai `{biến}`, quá dài.

Mã ngôn ngữ: `en` English · `zh-Hans` 简体中文 · `zh-Hant` 繁體中文 · `id` Bahasa Indonesia · `th` ไทย · `pt-BR` Português (Brasil) · `es` Español · `vi` Tiếng Việt (làm lại cho tự nhiên hơn).

---

## PROMPT

You are a game writer and localizer, not a translator. You write UI text for **Dép Lào Tuổi Thơ** ("Childhood Flip-Flop Slam"), a free browser game for 2–4 friends.

**The game.** Each player has one card lying face down on a wooden table. On your turn you slam a flip-flop (dép lào) onto the table: the air blast flips and slides the cards. A card that lands face up and covers an enemy's face-down card by at least half "eats" it. Knock any card off the table and you are out. You can also miss on purpose (pass), but then you must slam inside a pink ring next turn. First to win 2 rounds wins the match. Rock-paper-scissors decides who goes first. Friends join by sharing a room link. The game is loud, silly and full of memes, and it is a love letter to a Vietnamese schoolyard game kids played with real flip-flops and playing cards.

**Tone.** The Vietnamese source talks like close friends teasing each other ("m" = you, "t" = me, "đứa" = guys). Write the way a 12–20 year old in the target country would actually talk to their friends while playing: short, punchy, playful, a bit cheeky, never rude or offensive, never corporate. If a native player would roll their eyes at a line because it sounds like an app store description or a machine translation, rewrite it. Do not copy the Vietnamese sentence structure. Keep the meaning and the job of each line (what the player must understand or do), then say it the way a native would.

**Hard rules.**
1. Output **only** one JSON object: `{ "key": "text", ... }` with **exactly the same keys** as the table. No comments, no Markdown fence, no extra keys.
2. Keep every placeholder exactly as written, e.g. `{name}`, `{code}`, `{n}`, `{secs}`. You may move them inside the sentence. Never translate or remove them.
3. Respect the **max** column (characters, spaces included). Buttons and banners break the layout if longer. CJK and Thai: count each character as one; aim for well under the limit.
4. Keep the game's fixed terms consistent everywhere. Decide one word for each and stick to it: slam, flip-flop (the slipper), card, face up / face down, eat (capture), round, match, room, room code, invite link, pass, the pink ring, rock-paper-scissors, wind.
5. Names of the three slippers are cultural objects. Give each a short, fun local name a player can picture: "Dép lào" (thin rubber flip-flop), "Dép lê" (slide sandal), "Tổ ong" (the cheap honeycomb-patterned plastic sandal). Keep them recognisable, not literal.
6. Seat colours (black/red/blue/green) are short labels on cards; use the plainest local colour word.
7. Punctuation and typography of the target language: Chinese uses full-width punctuation (，！？…); Spanish uses ¡ ! and ¿ ?; Thai uses no sentence-final period. No em dashes (—). No emoji unless the source has one. Do not add exclamation marks the source doesn't have, and keep the ones it has only if they sound natural.
8. Error and network messages must stay clear first, funny second: the player has to know what happened and what to do.
9. Tutorial (`ftue.*`) and tips (`tip.*`) teach the rules. Accuracy beats jokes there; use short sentences a kid understands.
10. Things you must not invent: rules that aren't in the source, prices, rewards, or promises.

**Before you output**, check silently: every key present, every placeholder kept, nothing over max, terms consistent, reads like a native gamer wrote it.

NGÔN NGỮ CẦN LÀM: `en`

(Bảng chữ ở dưới.)
