// Player names: strangers see each other's names in quick matches, so obvious swear words and
// slurs are blocked in the 10 languages the game ships in. A blocked name becomes empty and the
// caller picks a neutral one. This is a coarse net for the common words, not moderation.

// Latin-script words, matched on the name with accents, spaces and punctuation removed.
// Short ones (under 5 letters) only count as a whole word, so "Edith" or "Long" stay fine.
const LATIN = [
  // vi
  'dit', 'djt', 'dm', 'vl', 'lon', 'cac', 'buoi', 'duma', 'dume', 'dmm', 'dcm', 'vcl', 'vkl', 'clgt', 'deo', 'chode', 'occho', 'concac', 'dittmemay', 'ditme', 'ditmemay',
  // en
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'rape', 'rapist', 'nazi', 'hitler', 'porn', 'asshole', 'bastard', 'retard',
  // es / pt
  'puta', 'puto', 'mierda', 'pendejo', 'verga', 'chinga', 'cabron', 'culero', 'caralho', 'porra', 'buceta', 'viado', 'foda', 'merda', 'arrombado',
  // id
  'anjing', 'bangsat', 'kontol', 'memek', 'ngentot', 'bajingan', 'goblok', 'jancok', 'pepek',
];
// Other scripts, matched anywhere in the name.
const OTHER = [
  // th
  'เหี้ย', 'ควย', 'เย็ด', 'สัส', 'ไอ้สัตว์', 'หน้าหี',
  // zh
  '操你', '肏', '傻逼', '傻屄', '他妈', '妈的', '屌', '鸡巴', '雞巴', '婊子', '草泥马', '王八蛋', '幹你',
  // ja
  'くそ', 'クソ', 'ちんこ', 'まんこ', '死ね', 'きちがい', 'キチガイ',
  // ko
  '씨발', '시발', '병신', '개새끼', '좆', '지랄', 'ㅅㅂ', 'ㅂㅅ',
];

const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase()
  .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/\$/g, 's').replace(/@/g, 'a');

export function isBadName(name) {
  const folded = fold(name);
  const words = folded.split(/[^a-z]+/).filter(Boolean);
  const joined = folded.replace(/[^a-z]/g, '');
  for (const bad of LATIN) {
    // short words: as a whole word, or the whole name spelled out ("F U C K", "đ.ị.t")
    if (bad.length < 5 ? words.includes(bad) || joined === bad : joined.includes(bad)) return true;
  }
  return OTHER.some((bad) => name.includes(bad));
}

// Control characters and angle brackets out, trimmed to 16; '' when empty or blocked.
export function cleanName(name) {
  const text = String(name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
  return text && !isBadName(text) ? text : '';
}

// Chat lines (friends rooms only): control characters and angle brackets out, trimmed to `max`,
// and any word the name filter would block is masked, so the line still reads but the word does not.
export function cleanChat(text, max = 80) {
  let line = String(text ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  for (const bad of OTHER) line = line.split(bad).join('*'.repeat([...bad].length));
  line = line.split(' ').map((word) => (isBadName(word) ? '*'.repeat(Math.min(word.length, 6)) : word)).join(' ');
  // a word spelled out across spaces ("đ i t", "f u c k")
  if (isBadName(line.replace(/\s/g, '')) && line.replace(/[^\p{L}]/gu, '').length <= 8) return '';
  return line;
}
