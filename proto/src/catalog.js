// Everything a player can wear, shared by the client and the server (which checks picks).
// Display names are locale keys: pet.<id>, color.<id>, dep.<id>, depPart.<id>.<part>.

// Kenney Cube Pets (CC0), public/pets/animal-<id>.json, thumbnails in public/pets/thumbs/.
export const PETS = [
  'cat', 'dog', 'panda', 'fox', 'pig', 'bunny', 'chick', 'penguin', 'tiger', 'lion', 'monkey', 'koala',
  'cow', 'deer', 'elephant', 'giraffe', 'bee', 'crab', 'fish', 'parrot', 'beaver', 'hog', 'polar', 'caterpillar',
];

// Slippers: each part is a cell of the 16 x 4 palette texture (row, column) that gets recoloured.
export const DEP_PARTS = {
  dep_lao: [{ id: 'sole', cell: [3, 8], def: '#fffaf0' }, { id: 'strap', cell: [1, 14], def: '#4f8ff0' }],
  dep_le: [{ id: 'insole', cell: [3, 8], def: '#fffaf0' }, { id: 'sole', cell: [2, 12], def: '#d93a3a' }, { id: 'strap', cell: [0, 15], def: '#7a3d1a' }],
  dep_to_ong: [{ id: 'all', cell: [3, 12], def: '#6cc3e8' }],
};
export const DEP_IDS = Object.keys(DEP_PARTS);
export const DEP_COLORS = ['#fffaf0', '#2a1418', '#ff5c9d', '#ff8a3d', '#ffc93c', '#3ccf6e', '#2fa8ff', '#4f8ff0', '#9b6bff', '#d93a3a', '#7a3d1a', '#6cc3e8'];
export const defaultDepColors = (dep) => DEP_PARTS[dep].map((p) => p.def);

// Card colours: the card frame, its dark and deep shades (names, badges), the room behind the window
// and its stage. Colour alone tells the seats apart, with each player's name on their chip and card
// (Bill 20/10, 1.41: no playing-card suits; more colours to choose from). The first four are the
// seats' defaults (SEAT_DEFAULTS); two players in a room never share one.
export const CARD_COLORS = {
  hong: { color: '#a34e71', deep: '#974e66', dark: '#693449', room: '#fae0e8', floor: '#ecbbcc' },
  xanh: { color: '#2f6e9e', deep: '#1c719a', dark: '#1c4b70', room: '#d8ebfb', floor: '#abcff0' },
  vang: { color: '#d4a14a', deep: '#886116', dark: '#5f4106', room: '#f3e6d2', floor: '#e0c69f' },
  la: { color: '#5d9d6b', deep: '#307a4f', dark: '#235430', room: '#dbeede', floor: '#b0d6b6' },
  tim: { color: '#7d5ba6', deep: '#6a4a93', dark: '#45305f', room: '#ece3f6', floor: '#cdbde4' },
  cam: { color: '#d9733b', deep: '#a8552a', dark: '#6e3615', room: '#fbe7d9', floor: '#f0c4a6' },
  ngoc: { color: '#2e9a94', deep: '#1f7a75', dark: '#14504c', room: '#d6f0ee', floor: '#a6dcd8' },
  do: { color: '#c0443f', deep: '#a33733', dark: '#6e2320', room: '#f8dcdb', floor: '#ebb0ae' },
};
export const CARD_COLOR_IDS = Object.keys(CARD_COLORS);

// What a seat wears until its player picks: card colour in seat order, a pet per seat.
export const SEAT_DEFAULTS = {
  black: { cardColor: 'hong', pet: 'cat' },
  pink: { cardColor: 'xanh', pet: 'panda' },
  blue: { cardColor: 'vang', pet: 'chick' },
  green: { cardColor: 'la', pet: 'fox' },
};

// A look as the server keeps it: anything missing or unknown falls back to a default.
export function cleanLook(look, fallbackDep = 'dep_lao') {
  const dep = DEP_IDS.includes(look?.dep) ? look.dep : fallbackDep;
  const parts = DEP_PARTS[dep];
  const colors = Array.isArray(look?.depColors) && look.depColors.length === parts.length
    && look.depColors.every((c) => DEP_COLORS.includes(c)) ? look.depColors : defaultDepColors(dep);
  return {
    pet: PETS.includes(look?.pet) ? look.pet : null,
    dep,
    depColors: [...colors],
    cardColor: CARD_COLOR_IDS.includes(look?.cardColor) ? look.cardColor : null,
  };
}

// ---------- reactions ----------
// Stickers (public/stickers/<id>.<ext>) in two tabs, and quick phrases (locale keys phrase.<id>).
// Placeholder art from emoji.gg packs, filtered by Bill: to be redrawn in the game's style before a
// public release (no licence on those packs). Swapping the art only means replacing the files.
const GIFS = new Set(['dance', 'pop', 'crazy', 'aww', 'happy', 'hello', 'sob', 'hellochat']);
export const STICKER_TABS = {
  face: ['haha', 'bonk', 'wow', 'sly', 'sad', 'dead', 'flushed', 'like', 'scheme', 'waiting', 'shh', 'boo', 'shrug', 'stare', 'wail', 'laughpray'],
  cat: ['redcard', 'scream', 'plot', 'cool', 'sadcat', 'dance', 'nope', 'pop', 'crazy', 'hush', 'aww', 'happy', 'hello', 'sob', 'cry', 'hellochat'],
};
export const STICKERS = [...STICKER_TABS.face, ...STICKER_TABS.cat];
export const stickerFile = (id) => `stickers/${id}.${GIFS.has(id) ? 'gif' : 'png'}`;
// The five after "gg" came with the bots' lines (Bill 20/10, docs/bot-loi-noi.md): people may tease back.
export const PHRASES = ['eat', 'lucky', 'hurry', 'oops', 'scared', 'wait', 'comeon', 'gg', 'ga', 'non', 'trinh', 'halan', 'bakhi'];
// Phrases that bring the "trình" meme along (memes.js 'skill', off unless the player turned memes on).
export const SKILL_PHRASES = new Set(['p:trinh', 'p:halan']);
// What a reaction message may carry: a sticker id, or "p:" + a phrase id. Computer players also send
// "b:" + a line of their own (server/bot-talk.js), which people cannot.
export const REACTIONS = new Set([...STICKERS, ...PHRASES.map((p) => `p:${p}`)]);
// Suggestions for the moment (the row on top of the picker), by what just happened to me.
export const SUGGEST = {
  ate: ['haha', 'sly', 'cool', 'p:eat'],
  eaten: ['sadcat', 'wail', 'nope', 'p:lucky'],
  fall: ['scream', 'dead', 'bonk', 'p:oops'],
  slow: ['waiting', 'stare', 'p:hurry'],
  won: ['dance', 'like', 'p:gg'],
  lobby: ['hello', 'hellochat', 'p:comeon', 'p:wait'],
};
export const CHAT_MAX = 80;
// Why one player reports another (2.12, player-menu.js / server reports.js).
export const REPORT_REASONS = ['rude', 'name', 'spam', 'afk', 'cheat'];
