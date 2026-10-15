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

// Card colours: the card frame, the room behind the window, its stage, a suit mark so colours
// can be told apart without seeing colour.
export const CARD_COLORS = {
  hong: { color: '#ff5c9d', dark: '#c2306b', room: '#ffd6e6', floor: '#ffb3cf', suit: '♥' },
  xanh: { color: '#2fa8ff', dark: '#1a6fb3', room: '#d3ecff', floor: '#a7d6ff', suit: '◆' },
  vang: { color: '#ffc93c', dark: '#c98e00', room: '#fff2c4', floor: '#ffe08a', suit: '★' },
  la: { color: '#3ccf6e', dark: '#1f8f45', room: '#d6f7e0', floor: '#a9ebbd', suit: '♣' },
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
