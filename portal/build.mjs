// Builds the game portal for play.billthedevstudio.com into ./site from games.json (the one game list,
// also served as /games.json for Lucy and anything else that needs it). Plain HTML, no framework:
// every page reads fine without JavaScript; the script only opens trailers in place.
//   node portal/build.mjs   then   bash portal/deploy.sh
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'site');
const DATA = JSON.parse(readFileSync(join(ROOT, 'games.json'), 'utf8'));
const { studio, games } = DATA;
const PORTAL = studio.portal;

const TEXT = {
  vi: {
    lang: 'vi', other: 'en', otherLabel: 'English', home: '/', privacyHref: '/privacy/',
    title: 'Bill The Dev Studio · Game chơi trên web và điện thoại',
    description: 'Game của Bill The Dev Studio: Dép Lào Tuổi Thơ chơi ngay trên trình duyệt, cùng Meh Merge, Nah Blocks, Bruh Arrows trên Android.',
    navGames: 'Game', navStudio: 'Studio',
    heroKicker: 'Bill The Dev Studio',
    heroTitle: ['Chọn game,', 'chơi luôn.'],
    heroLede: 'Game trên web mở là chơi, không cần tải app. Game điện thoại đang thử trên Google Play.',
    webTitle: 'Chơi trên trình duyệt', webNote: 'Điện thoại hay máy tính đều được',
    play: 'Chơi ngay', details: 'Giới thiệu', players: (p) => `${p.replace('-', '–')} người`, beta: 'Beta',
    mobileTitle: 'Trên điện thoại', mobileNote: 'Android · đang thử trên Google Play',
    testing: 'Đang thử', trailer: 'Trailer', close: 'Đóng',
    playSoonTop: 'SẮP CÓ TRÊN', playLiveTop: 'TẢI TRÊN',
    playSoonLabel: (n) => `${n} sắp có trên Google Play. Gửi email cho studio để chơi thử`,
    mailSubject: (n) => `Chơi thử ${n}`,
    more: 'Game mới sẽ lên đây khi chơi được.',
    footerPrivacy: 'Chính sách riêng tư', footerStudio: 'Trang studio', footerContact: 'Liên hệ',
  },
  en: {
    lang: 'en', other: 'vi', otherLabel: 'Tiếng Việt', home: '/en/', privacyHref: '/privacy/#en',
    title: 'Bill The Dev Studio · Games for the browser and phones',
    description: 'Games by Bill The Dev Studio: Flip Flop Slam plays in your browser, and Meh Merge, Nah Blocks and Bruh Arrows are on Android.',
    navGames: 'Games', navStudio: 'Studio',
    heroKicker: 'Bill The Dev Studio',
    heroTitle: ['Pick a game,', 'play it now.'],
    heroLede: 'Web games open and play, nothing to install. The phone games are in testing on Google Play.',
    webTitle: 'Play in the browser', webNote: 'On a phone or a computer',
    play: 'Play now', details: 'About the game', players: (p) => `${p.replace('-', '–')} players`, beta: 'Beta',
    mobileTitle: 'On your phone', mobileNote: 'Android · in testing on Google Play',
    testing: 'In testing', trailer: 'Trailer', close: 'Close',
    playSoonTop: 'COMING SOON TO', playLiveTop: 'GET IT ON',
    playSoonLabel: (n) => `${n} is coming soon to Google Play. Email the studio to join the test`,
    mailSubject: (n) => `${n} test`,
    more: 'New games show up here the day they are ready to play.',
    footerPrivacy: 'Privacy policy', footerStudio: 'Studio site', footerContact: 'Contact',
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// The studio site keeps English at / and Vietnamese under /vi/.
const studioPage = (url, t) => (t.lang === 'vi' ? url.replace(`${studio.site}/`, `${studio.site}/vi/`) : url);
const studioHome = (t) => studioPage(`${studio.site}/`, t);

const fox = `<svg class="fox" viewBox="0 0 240 240" aria-hidden="true">${readFileSync(join(ROOT, 'img/fox.svg'), 'utf8').replace(/^<svg[^>]*>|<\/svg>\s*$/g, '')}</svg>`;

const playBadge = (g, t) => {
  const href = g.storeLive
    ? `https://play.google.com/store/apps/details?id=${g.package}`
    : `mailto:${studio.email}?subject=${encodeURIComponent(t.mailSubject(g.name[t.lang]))}`;
  const label = g.storeLive ? 'Google Play' : t.playSoonLabel(g.name[t.lang]);
  return `<a class="badge" href="${esc(href)}" aria-label="${esc(label)}"${g.storeLive ? ' target="_blank" rel="noopener"' : ''}>
      <svg viewBox="0 0 26 29" aria-hidden="true"><polygon points="0,0 13,14.5 0,29" fill="#00C3FF"/><polygon points="0,0 18.5,10 13,14.5" fill="#00E676"/><polygon points="0,29 13,14.5 18.5,19" fill="#FF3A44"/><polygon points="18.5,10 26,14.5 18.5,19 13,14.5" fill="#FFD500"/></svg>
      <span><small>${g.storeLive ? t.playLiveTop : t.playSoonTop}</small>Google Play</span></a>`;
};

const webCard = (g, t) => `
    <article class="web" style="--accent:${g.accent};--ground:${g.ground}">
      <a class="web-art" href="${esc(g.play)}" tabindex="-1" aria-hidden="true"><img src="${g.feature}" width="1024" height="500" alt="" fetchpriority="high"></a>
      <div class="web-body">
        <div class="title-row"><img class="icon" src="${g.icon}" width="64" height="64" alt="">
          <div><h3>${esc(g.name[t.lang])}</h3><p class="meta">${esc(t.players(g.players))} · ${t.beta}${t.lang === 'en' ? ` · <span lang="vi">${esc(g.name.vi)}</span>` : ''}</p></div></div>
        <p class="tagline">${esc(g.tagline[t.lang])}</p>
        <p class="short">${esc(g.short[t.lang])}</p>
        <div class="actions"><a class="btn play" href="${esc(g.play)}">${fox.replace('class="fox"', 'class="fox mini"')}${t.play}</a>
          <a class="btn ghost" href="${esc(studioPage(g.page, t))}">${t.details}</a></div>
      </div>
    </article>`;

const mobileCard = (g, t) => `
    <article class="card" style="--accent:${g.accent};--ground:${g.ground}">
      <div class="art"><img src="${g.feature}" width="1024" height="500" alt="${esc(g.name[t.lang])}" loading="lazy"></div>
      <div class="body"><img class="icon" src="${g.icon}" width="76" height="76" alt="" loading="lazy">
        <h3>${esc(g.name[t.lang])} <span class="chip">${t.testing}</span></h3>
        <p class="tagline">${esc(g.tagline[t.lang])}</p>
        <p class="short">${esc(g.short[t.lang])}</p>
        <div class="actions">${playBadge(g, t)}
          <a class="btn ghost trailer" href="https://www.youtube.com/watch?v=${g.youtube}" data-yt="${g.youtube}" data-name="${esc(g.name[t.lang])}" target="_blank" rel="noopener">${t.trailer}</a></div>
      </div>
    </article>`;

const header = (t, page) => `
<header class="top"><div class="wrap">
  <a class="brand" href="${t.home}">${fox}<span>Bill <b>The Dev</b><small>STUDIO</small></span></a>
  <nav>${page === 'home' ? `<a href="#games">${t.navGames}</a>` : `<a href="${t.home}">${t.navGames}</a>`}
    <a href="${studioHome(t)}">${t.navStudio}</a>
    <a class="lang" href="${page === 'home' ? TEXT[t.other].home : `#${t.other}`}" hreflang="${t.other}" lang="${t.other}">${t.other === 'en' ? 'EN' : 'VI'}</a></nav>
</div></header>`;

const footer = (t) => `
<footer><div class="wrap">
  <p>© 2026 Bill The Dev Studio</p>
  <p class="links"><a href="${t.privacyHref}">${t.footerPrivacy}</a> · <a href="${studioHome(t)}">${t.footerStudio}</a> · <a href="mailto:${studio.email}">${t.footerContact}</a></p>
</div></footer>`;

const head = ({ t, title, description, path, alternates = true }) => `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${PORTAL}${path}">
${alternates ? `<link rel="alternate" hreflang="vi" href="${PORTAL}/"><link rel="alternate" hreflang="en" href="${PORTAL}/en/"><link rel="alternate" hreflang="x-default" href="${PORTAL}/">` : ''}
<meta name="theme-color" content="#0B0B0C">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bill The Dev Studio">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${PORTAL}${path}">
<meta property="og:image" content="${PORTAL}/img/og.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/fox.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/portal.css?v=${DATA.updated}">
</head>`;

const home = (t) => {
  const web = games.filter((g) => g.platform === 'web');
  const mobile = games.filter((g) => g.platform === 'android');
  const ld = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: t.title,
    itemListElement: games.map((g, i) => ({
      '@type': 'ListItem', position: i + 1,
      item: { '@type': 'VideoGame', name: g.name[t.lang], url: g.platform === 'web' ? PORTAL + g.play : g.page, image: PORTAL + g.feature,
        gamePlatform: g.platform === 'web' ? 'Web browser' : 'Android', author: { '@type': 'Organization', name: studio.name, url: studio.site } },
    })),
  };
  return `${head({ t, title: t.title, description: t.description, path: t.home })}
<body>${header(t, 'home')}
<main>
  <section class="hero wrap">
    <p class="kicker">${t.heroKicker}</p>
    <h1>${t.heroTitle[0]}<br><span>${t.heroTitle[1]}</span></h1>
    <p class="lede">${t.heroLede}</p>
  </section>
  <section class="wrap" id="games" aria-labelledby="web-h">
    <div class="sec-head"><h2 id="web-h">${t.webTitle}</h2><p>${t.webNote}</p></div>${web.map((g) => webCard(g, t)).join('')}
  </section>
  <section class="wrap" aria-labelledby="mob-h">
    <div class="sec-head"><h2 id="mob-h">${t.mobileTitle}</h2><p>${t.mobileNote}</p></div>
    <div class="shelf">${mobile.map((g) => mobileCard(g, t)).join('')}
    </div>
    <p class="more">${t.more}</p>
  </section>
</main>${footer(t)}
<dialog class="video" aria-label="${t.trailer}"><div class="frame"></div><form method="dialog"><button class="x" aria-label="${t.close}">×</button></form></dialog>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script src="/portal.js?v=${DATA.updated}" defer></script>
</body>
</html>
`;
};

const privacy = () => {
  const t = TEXT.vi;
  const list = (lang) => games.map((g) => `<li><a href="${esc(g.privacy)}">${esc(g.name[lang])}</a></li>`).join('');
  return `${head({ t, title: 'Chính sách riêng tư · Bill The Dev Studio', description: 'Cổng game play.billthedevstudio.com lưu gì, gửi gì và quảng cáo hoạt động thế nào. Privacy policy in English below.', path: '/privacy/', alternates: false })}
<body class="doc">${header(t, 'privacy')}
<main class="wrap prose">
<section id="vi" lang="vi">
<h1>Chính sách riêng tư</h1>
<p class="muted">Bill The Dev Studio · cổng game play.billthedevstudio.com · cập nhật ngày 20/10/2026</p>
<p>Bill The Dev Studio là studio làm game của Bill Trương, một nhà phát triển độc lập ở TP. Hồ Chí Minh. Trang này áp dụng cho cổng game <b>play.billthedevstudio.com</b> và nói chung cho các game của studio. Mỗi game còn có chính sách riêng, chi tiết hơn (danh sách ở cuối trang).</p>
<h2>Tóm tắt</h2>
<ul>
<li>Không có tài khoản, không đăng nhập, không hỏi email, số điện thoại hay ngày sinh.</li>
<li>Tên chơi bạn tự đặt chỉ dùng để hiện cho người chơi cùng phòng. Không bán, không chia sẻ cho ai.</li>
<li>Game có quảng cáo của Google. Google có thể dùng cookie để hiển thị và đo quảng cáo.</li>
</ul>
<h2>Trang cổng game này</h2>
<p>Trang danh sách game (trang chủ play.billthedevstudio.com) không đặt cookie, không chạy quảng cáo hay công cụ đo lường. Trang tải phông chữ Baloo 2 từ Google Fonts, và khi bạn bấm Trailer thì trình duyệt mở video từ YouTube (chế độ hạn chế cookie, youtube-nocookie.com); hai dịch vụ này của Google nhận địa chỉ IP của bạn như mọi trang web khác bạn mở.</p>
<h2>Tên chơi</h2>
<p>Trong game nhiều người (như Dép Lào Tuổi Thơ), bạn tự gõ một tên chơi. Tên được lưu trong trình duyệt của bạn, gửi tới máy chủ của game để hiện cho người cùng phòng, và có thể được ghi vào số liệu nội bộ của studio (ví dụ để biết bao nhiêu người chơi lại, hoặc để tìm lỗi một người báo). Tên không bao giờ được gửi cho Google hay đối tác quảng cáo. Đừng dùng họ tên thật nếu bạn không muốn người lạ thấy.</p>
<h2>Mã ẩn danh</h2>
<p>Để đếm số người chơi và số người quay lại mà không cần tài khoản, game có thể lưu trong trình duyệt của bạn một mã ngẫu nhiên do chính trình duyệt tạo ra, cùng ngày bạn vào lần đầu và lần gần nhất. Mã này không chứa thông tin gì về bạn, không gắn với IP, không gửi cho Google hay đối tác quảng cáo. Xoá dữ liệu trang web trong trình duyệt là mất mã, lần sau bạn là một người chơi mới.</p>
<h2>Nhật ký máy chủ</h2>
<p>Máy chủ web (nginx) ghi nhật ký truy cập thông thường: địa chỉ IP, thời gian, trang đã mở, trình duyệt. Nhật ký này chỉ để chống tấn công và sửa lỗi, được xoay vòng và xoá định kỳ. Studio không tra vị trí theo IP và không dò "vân tay" trình duyệt.</p>
<h2>Quảng cáo Google</h2>
<p>Các game của studio hiển thị quảng cáo qua Google AdSense (trên web) và Google AdMob (trên Android). Google và các đối tác có thể dùng cookie và mã nhận dạng quảng cáo để hiển thị quảng cáo, giới hạn số lần hiện và đo hiệu quả, kể cả quảng cáo dựa trên các trang bạn đã ghé. Cách Google dùng dữ liệu: <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>. Tắt quảng cáo cá nhân hoá tại <a href="https://adssettings.google.com">adssettings.google.com</a>.</p>
<p>Người dùng ở Khu vực Kinh tế Châu Âu, Vương quốc Anh và Thụy Sĩ được hỏi đồng ý trước khi có quảng cáo cá nhân hoá. Quảng cáo không bao giờ hiện giữa ván chơi.</p>
<h2>Trẻ em</h2>
<p>Các game không nhắm tới trẻ em dưới 13 tuổi và không cố ý thu thập thông tin cá nhân của trẻ em.</p>
<h2>Chính sách của từng game</h2>
<ul>${list('vi')}</ul>
<h2>Liên hệ</h2>
<p>Có câu hỏi, hoặc muốn xoá dữ liệu gắn với tên chơi của bạn: <a href="mailto:${studio.email}">${studio.email}</a> · <a href="${studio.site}/vi/">billthedevstudio.com</a></p>
</section>
<hr>
<section id="en" lang="en">
<h1>Privacy policy</h1>
<p class="muted">Bill The Dev Studio · game portal play.billthedevstudio.com · updated 20 October 2026</p>
<p>Bill The Dev Studio is the game studio of Bill Truong, an independent developer in Ho Chi Minh City, Vietnam. This page covers the game portal at <b>play.billthedevstudio.com</b> and the studio's games in general. Each game also has its own, more detailed policy (listed at the end).</p>
<h2>In short</h2>
<ul>
<li>No accounts, no login, no email, phone number or birthday.</li>
<li>The player name you type is only used to show you to the other players in your room. It is never sold or shared.</li>
<li>The games show Google ads. Google may use cookies to show and measure ads.</li>
</ul>
<h2>This portal page</h2>
<p>The game list (the play.billthedevstudio.com home page) sets no cookies and runs no ads or analytics. It loads the Baloo 2 font from Google Fonts, and when you press Trailer your browser plays the video from YouTube in its reduced-cookie mode (youtube-nocookie.com); like any site you open, these Google services receive your IP address.</p>
<h2>Player names</h2>
<p>In multiplayer games (such as Flip Flop Slam) you type a player name. It is kept in your browser, sent to the game server to show to your room, and may appear in the studio's own play records (for example to count returning players, or to look into a bug someone reported). Names are never sent to Google or to ad partners. Don't use your full real name if you don't want strangers to see it.</p>
<h2>Anonymous ID</h2>
<p>To count players and returning players without accounts, a game may keep a random code made by your own browser, together with the days of your first and latest visit. The code holds nothing about you, is not tied to your IP address, and is never sent to Google or ad partners. Clearing the site's data in your browser removes it, and you count as a new player next time.</p>
<h2>Server logs</h2>
<p>The web server (nginx) keeps standard access logs: IP address, time, page and browser. They are used only to stop attacks and fix problems, and are rotated and deleted regularly. The studio does not look up your location from your IP address and does not fingerprint browsers.</p>
<h2>Google ads</h2>
<p>The studio's games show ads through Google AdSense (on the web) and Google AdMob (on Android). Google and its partners may use cookies and advertising identifiers to serve ads, cap how often you see them and measure them, including ads based on your visits to other sites. How Google uses data: <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>. Turn off personalised ads at <a href="https://adssettings.google.com">adssettings.google.com</a>.</p>
<p>Visitors in the European Economic Area, the UK and Switzerland are asked for consent before any personalised ads. Ads never appear in the middle of a match.</p>
<h2>Children</h2>
<p>The games are not directed at children under 13 and do not knowingly collect personal information from children.</p>
<h2>Each game's policy</h2>
<ul>${list('en')}</ul>
<h2>Contact</h2>
<p>Questions, or to delete data linked to your player name: <a href="mailto:${studio.email}">${studio.email}</a> · <a href="${studio.site}/">billthedevstudio.com</a></p>
</section>
</main>${footer(t)}
</body>
</html>
`;
};

const notFound = () => {
  const t = TEXT.vi;
  return `${head({ t, title: 'Không thấy trang · Bill The Dev Studio', description: t.description, path: '/404', alternates: false })}
<body>${header(t, '404')}
<main class="wrap hero"><p class="kicker">404</p><h1>Không thấy trang này.<br><span>Page not found.</span></h1>
<p class="lede"><a class="btn play" href="/">Về danh sách game</a></p></main>${footer(t)}
</body></html>
`;
};

rmSync(OUT, { recursive: true, force: true });
const write = (rel, body) => { const p = join(OUT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, body); };
write('index.html', home(TEXT.vi));
write('en/index.html', home(TEXT.en));
write('privacy/index.html', privacy());
write('404.html', notFound());
write('games.json', JSON.stringify(DATA, null, 2) + '\n');
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${PORTAL}/sitemap.xml\n`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/en/', '/privacy/', '/slam-cards/'].map((p) => `  <url><loc>${PORTAL}${p}</loc><lastmod>${DATA.updated}</lastmod></url>`).join('\n')}\n</urlset>\n`);
for (const f of ['ads.txt', 'portal.css', 'portal.js']) cpSync(join(ROOT, f), join(OUT, f));
cpSync(join(ROOT, 'img'), join(OUT, 'img'), { recursive: true });
console.log(`portal: built ${OUT}`);
