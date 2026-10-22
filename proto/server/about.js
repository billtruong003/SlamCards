// The page's words for search engines and for players who want to read (SEO task T10): what the game
// is, how to play, and the usual questions, written into the HTML by the server (meta.js withMeta), so
// it is there before any script runs. The game itself is drawn on a canvas, which search engines do
// not read. Players open it from the Info panel ("Giới thiệu & luật chơi"); it is hidden until then.
// Vietnamese by default, English for ?lang=<anything else>, like the link preview tags.

const STUDIO = 'https://billthedevstudio.com/';

const TEXT = {
  vi: {
    title: 'Dép Lào Tuổi Thơ: trò bạt dép ăn hình, chơi online với bạn bè',
    intro: [
      'Hồi nhỏ, giờ ra chơi là cả đám ngồi quanh mặt bàn: mỗi đứa úp một lá hình, rồi cầm dép lào đập xuống bàn cho gió hất lá hình lật lên. Lá của mình lật ngửa, đáp đè lên lá đang úp của bạn là ăn luôn lá đó. Trò này mỗi nơi gọi một kiểu: bạt dép ăn hình, đập hình, đập dép.',
      '<b>Dép Lào Tuổi Thơ</b> đưa trò đó lên trình duyệt: miễn phí, không cần tải app, không cần tài khoản. Tạo phòng, gửi link qua Zalo hay Messenger là bạn bè vào chơi, từ 2 đến 4 người, trên điện thoại hay máy tính đều được. Vắng người thì có máy chơi cùng.',
    ],
    howTitle: 'Cách chơi',
    how: [
      '<b>Đập sát bài mình.</b> Đập xuống bàn gần lá bài, đừng đập lên bài. Đập càng sát, bài bật càng mạnh.',
      '<b>Ngửa đè úp là ăn.</b> Bài mình lật ngửa, rơi đè lên bài đang úp của đối thủ là ăn luôn lá đó.',
      '<b>Đừng làm rớt bài.</b> Làm bất kỳ lá nào rớt khỏi bàn là bị loại. Gần mép bàn thì đập nhẹ thôi.',
      '<b>Đập bằng hay đập nghiêng.</b> Đập bằng thì bài bay cao, đập nghiêng thì bài lướt thấp và dễ lật ngửa hơn. Nhớ để ý gió: gió đẩy bài lúc đang bay.',
      '<b>Đừng để hết giờ.</b> Hết giờ 2 lượt liền là bị loại khỏi ván. Người còn lại cuối cùng thắng ván, thắng 2 ván là thắng trận.',
    ],
    faqTitle: 'Hỏi nhanh',
    faq: [
      ['Có mất tiền không?', 'Không. Game miễn phí, có quảng cáo ngoài trận và nút ủng hộ nếu bạn thích game.'],
      ['Có cần tải app không?', 'Không. Mở link là chơi ngay trên trình duyệt, điện thoại hay máy tính đều được.'],
      ['Chơi được mấy người?', 'Từ 2 đến 4 người mỗi phòng. Chọn "Chơi ngay" để ghép với người lạ, hoặc tạo phòng riêng rồi gửi link cho bạn bè.'],
      ['Không có ai chơi thì sao?', 'Chờ một lúc không đủ người thì có máy vào chơi cùng, để bạn không phải đợi.'],
    ],
    by: 'Game của <a href="' + STUDIO + '">Bill The Dev</a>, studio game một người ở TP. Hồ Chí Minh.',
    privacy: 'Chính sách riêng tư',
    close: 'Đóng',
  },
  en: {
    title: 'Flip-Flop Slam: the schoolyard card-slapping game, online with friends',
    intro: [
      'At recess in Vietnam, kids sat around a desk, each with a card face down, and slammed a flip-flop on the table so the gust flipped the cards. Land your card face up on a friend\'s face-down card and it is yours. In Vietnam it is called bạt dép ăn hình, đập hình or Dép Lào Tuổi Thơ, the flip-flops of our childhood.',
      '<b>Flip-Flop Slam</b> brings it to the browser: free, no download, no account. Make a room, send the link, and 2 to 4 friends join from their phone or computer. When nobody else is around, computer players join in.',
    ],
    howTitle: 'How to play',
    how: [
      '<b>Slam close to your card.</b> Hit the table near your card, not the card itself. The closer the hit, the harder the gust.',
      '<b>Face up on face down wins.</b> Flip your card face up so it lands on an opponent\'s face-down card, and you win that card.',
      '<b>Don\'t drop a card.</b> Knock any card off the table and you are out. Go easy near the edge.',
      '<b>Flat or tilted.</b> A flat slam sends the card high; a tilted one skims low and flips more easily. Watch the wind: it pushes cards while they fly.',
      '<b>Mind the clock.</b> Run out of time two turns in a row and you are out of the round. Last player standing wins the round; two rounds win the match.',
    ],
    faqTitle: 'Quick answers',
    faq: [
      ['Is it free?', 'Yes. The game is free, with ads outside matches and a button to support it if you like it.'],
      ['Do I need to download anything?', 'No. Open the link and play in the browser, on a phone or a computer.'],
      ['How many players?', '2 to 4 per room. Use "Play now" to be matched with others, or make a private room and send the link to friends.'],
      ['What if nobody is online?', 'If not enough people turn up after a short wait, computer players join so you never wait long.'],
    ],
    by: 'A game by <a href="' + STUDIO + '">Bill The Dev</a>, a one-man game studio in Ho Chi Minh City.',
    privacy: 'Privacy policy',
    close: 'Close',
  },
};

export function aboutHtml(lang) {
  const t = TEXT[lang] ?? TEXT.vi;
  return `<article id="about-game" class="about-game" lang="${lang}" aria-labelledby="about-title" hidden>
<h2 id="about-title">${t.title}</h2>
${t.intro.map((p) => `<p>${p}</p>`).join('\n')}
<h3>${t.howTitle}</h3>
<ol>${t.how.map((s) => `<li>${s}</li>`).join('')}</ol>
<h3>${t.faqTitle}</h3>
<dl>${t.faq.map(([q, a]) => `<dt>${q}</dt><dd>${a}</dd>`).join('')}</dl>
<p class="muted">${t.by} <a href="./privacy.html">${t.privacy}</a></p>
<button type="button" class="btn" id="close-about">${t.close}</button>
</article>`;
}

// words a search engine reads in the served page (tests keep it well above the 31 of 22/10)
export const aboutWordCount = (lang) => aboutHtml(lang).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
