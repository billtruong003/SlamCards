// Link previews (Open Graph + Twitter card). Chat apps and social sites read the tags from the HTML the
// server sends and never run the game's JavaScript, so the server writes them into index.html per request:
// Vietnamese by default, English for ?lang=<anything else we ship>, and a room invite (?room=ABCD) gets
// the room in its title. Images: public/og/og-<lang>.jpg, 1200x630 (made by video/media/og.html).

import { aboutHtml } from './about.js';

export const PUBLIC_URL = (process.env.SLAM_PUBLIC_URL || 'https://play.billthedevstudio.com/slam-cards/').replace(/\/?$/, '/');
const IMAGE_VERSION = 1; // bump when the images change, so sites that cached the old one fetch it again

const TEXT = {
  vi: {
    locale: 'vi_VN',
    site: 'Dép Lào Tuổi Thơ',
    title: 'Dép Lào Tuổi Thơ · Đập dép lật bài online',
    description: 'Trò đập dép lật bài hồi nhỏ, giờ chơi ngay trên trình duyệt với 2–4 đứa bạn. Gửi link là vô, không cần tải app, miễn phí.',
    roomTitle: (code) => `Vào phòng ${code} · Dép Lào Tuổi Thơ`,
    roomDescription: (code) => `M được rủ vào phòng ${code} đập dép lật bài. Bấm là vô, không cần tải app.`,
    alt: 'Dép Lào Tuổi Thơ: lá bài con hổ, lá bài úp và chiếc dép lào trên trang vở',
  },
  en: {
    locale: 'en_US',
    site: 'Flip-Flop Slam',
    title: 'Flip-Flop Slam · Slam cards with a flip-flop, online',
    description: 'The schoolyard card-slapping game, now in your browser with 2–4 friends. Send a link and play. Free, no download.',
    roomTitle: (code) => `Join room ${code} · Flip-Flop Slam`,
    roomDescription: (code) => `You're invited to room ${code} for a round of Flip-Flop Slam. Tap to play, no download.`,
    alt: 'Flip-Flop Slam: a tiger card, face-down cards and a flip-flop on notebook paper',
  },
};

const ROOM_CODE = /^[A-Z2-9]{4}$/;

const escapeAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// query: a URLSearchParams of the page address.
export function pageMeta(query) {
  const asked = /^[a-z]{2}(-[a-z]{2,4})?$/i.test(query.get('lang') || '') ? query.get('lang').toLowerCase() : '';
  const lang = asked && asked !== 'vi' ? 'en' : 'vi';
  const text = TEXT[lang];
  const room = (query.get('room') || '').toUpperCase();
  const code = ROOM_CODE.test(room) ? room : null;
  const params = new URLSearchParams();
  if (code) params.set('room', code);
  if (asked && lang === 'en') params.set('lang', asked);
  const url = PUBLIC_URL + (params.toString() ? `?${params}` : '');
  return {
    lang,
    // for search engines a room link (and any ?ref=, ?fbclid=...) is the same page as the game's own
    // address, so its canonical points there (Google advises canonical, not noindex, for duplicates)
    canonical: LANG_URL[lang],
    title: code ? text.roomTitle(code) : text.title,
    description: code ? text.roomDescription(code) : text.description,
    url,
    image: `${PUBLIC_URL}og/og-${lang}.jpg?v=${IMAGE_VERSION}`,
    alt: text.alt,
    site: text.site,
    locale: text.locale,
  };
}

// One address per language, each naming the other (hreflang). English is ?lang=en rather than its own
// path: the client finds its files, socket and room links relative to the page's folder.
const LANG_URL = { vi: PUBLIC_URL, en: `${PUBLIC_URL}?lang=en` };
// the studio as one entity across its sites (its home page's Organization markup has the same @id)
const STUDIO_ID = 'https://billthedevstudio.com/#organization';

// What the game is, for search engines (schema.org VideoGame).
function structuredData(m) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    // VideoGame alone shows nothing in results; paired with WebApplication it can earn the software
    // app rich result once it has real ratings (none are claimed here)
    '@type': ['VideoGame', 'WebApplication'],
    '@id': `${PUBLIC_URL}#game`,
    name: m.site,
    alternateName: m.lang === 'vi' ? 'Flip-Flop Slam' : 'Dép Lào Tuổi Thơ',
    description: TEXT[m.lang].description,
    url: m.canonical,
    image: m.image,
    inLanguage: m.lang,
    genre: ['Party', 'Casual', 'Multiplayer'],
    gamePlatform: 'Web browser',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    playMode: 'MultiPlayer',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4 },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@id': STUDIO_ID },
    publisher: { '@type': 'Organization', '@id': STUDIO_ID, name: 'Bill The Dev', url: 'https://billthedevstudio.com/' },
  }).replace(/</g, '\\u003c');
}

export function metaTags(m) {
  const tags = [
    ['name', 'description', m.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', m.site],
    ['property', 'og:locale', m.locale],
    ['property', 'og:title', m.title],
    ['property', 'og:description', m.description],
    ['property', 'og:url', m.url],
    ['property', 'og:image', m.image],
    ['property', 'og:image:secure_url', m.image],
    ['property', 'og:image:type', 'image/jpeg'],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', m.alt],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', m.title],
    ['name', 'twitter:description', m.description],
    ['name', 'twitter:image', m.image],
    ['name', 'twitter:image:alt', m.alt],
  ];
  return [
    `<title>${escapeAttr(m.title)}</title>`,
    `<link rel="canonical" href="${escapeAttr(m.canonical)}">`,
    `<link rel="alternate" hreflang="vi" href="${LANG_URL.vi}">`,
    `<link rel="alternate" hreflang="en" href="${LANG_URL.en}">`,
    `<link rel="alternate" hreflang="x-default" href="${LANG_URL.vi}">`,
    ...tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeAttr(value)}">`),
    `<script type="application/ld+json">${structuredData(m)}</script>`,
  ].join('\n');
}

// index.html with its language, title, canonical and language links, description, og:/twitter: tags
// and structured data replaced by this page's, and the "about and rules" text (about.js) in its place.
export function withMeta(html, query) {
  const meta = pageMeta(query);
  const stripped = html
    .replace(/<html lang="[^"]*">/, `<html lang="${meta.lang}">`)
    .replace(/[ \t]*<meta\s+(?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*>\r?\n?/g, '')
    .replace(/[ \t]*<link\s+rel="(?:canonical|alternate)"[^>]*>\r?\n?/g, '')
    .replace(/[ \t]*<script type="application\/ld\+json">.*?<\/script>\r?\n?/g, '')
    .replace(/<!-- about-game:[^>]*-->/, aboutHtml(meta.lang));
  const head = metaTags(meta);
  return /<title>[^<]*<\/title>/.test(stripped)
    ? stripped.replace(/<title>[^<]*<\/title>/, head)
    : stripped.replace('</head>', `${head}\n</head>`);
}
