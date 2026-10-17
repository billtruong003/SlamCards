// Link previews (Open Graph + Twitter card). Chat apps and social sites read the tags from the HTML the
// server sends and never run the game's JavaScript, so the server writes them into index.html per request:
// Vietnamese by default, English for ?lang=<anything else we ship>, and a room invite (?room=ABCD) gets
// the room in its title. Images: public/og/og-<lang>.jpg, 1200x630 (made by video/media/og.html).

export const PUBLIC_URL = (process.env.SLAM_PUBLIC_URL || 'https://billthedevstudio.io.vn/slam-cards/').replace(/\/?$/, '/');
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
    title: code ? text.roomTitle(code) : text.title,
    description: code ? text.roomDescription(code) : text.description,
    url,
    image: `${PUBLIC_URL}og/og-${lang}.jpg?v=${IMAGE_VERSION}`,
    alt: text.alt,
    site: text.site,
    locale: text.locale,
  };
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
    `<link rel="canonical" href="${escapeAttr(m.url)}">`,
    ...tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeAttr(value)}">`),
  ].join('\n');
}

// index.html with its title, canonical link, description and og:/twitter: tags replaced by this page's.
export function withMeta(html, query) {
  const stripped = html
    .replace(/[ \t]*<meta\s+(?:name="(?:description|twitter:[^"]*)"|property="og:[^"]*")[^>]*>\r?\n?/g, '')
    .replace(/[ \t]*<link\s+rel="canonical"[^>]*>\r?\n?/g, '');
  const head = metaTags(pageMeta(query));
  return /<title>[^<]*<\/title>/.test(stripped)
    ? stripped.replace(/<title>[^<]*<\/title>/, head)
    : stripped.replace('</head>', `${head}\n</head>`);
}
