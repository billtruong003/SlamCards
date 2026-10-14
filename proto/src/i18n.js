// Player-facing text. locales/vi.json is the source of truth; other languages fall back to
// English, then Vietnamese, then the key itself. The language comes from the browser only:
// no IP or geolocation lookups, on purpose.
import vi from './locales/vi.json';

export const LANGS = [
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'en', name: 'English' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'zh-Hant', name: '繁體中文' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'th', name: 'ไทย' },
  { code: 'pt-BR', name: 'Português' },
  { code: 'es', name: 'Español' },
];

const loaders = Object.fromEntries(Object.entries(import.meta.glob(['./locales/*.json', '!./locales/context.json', '!./locales/vi.json']))
  .map(([path, load]) => [path.slice('./locales/'.length, -'.json'.length), load]));
const available = (code) => code === 'vi' || code in loaders;

export const availableLangs = () => LANGS.filter((l) => available(l.code));

const STORE_KEY = 'slam-lang';

function fromBrowser(tag) {
  const t = tag.toLowerCase();
  if (t.startsWith('zh')) return /^zh-(tw|hk|mo|hant)/.test(t) ? 'zh-Hant' : 'zh-Hans';
  if (t.startsWith('pt')) return 'pt-BR';
  return ['es', 'vi', 'en', 'id', 'th'].find((code) => t === code || t.startsWith(`${code}-`)) ?? null;
}

// URL ?lang= → saved choice → browser languages → English if shipped, else Vietnamese.
export function detectLang() {
  const asked = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch { /* private mode */ }
  for (const code of [asked, saved]) {
    const match = code && LANGS.find((l) => l.code.toLowerCase() === code.toLowerCase());
    if (match) return match.code;
  }
  for (const tag of navigator.languages ?? [navigator.language ?? '']) {
    const code = fromBrowser(tag);
    if (code && available(code)) return code;
  }
  return available('en') ? 'en' : 'vi';
}

let chain = [vi];
let current = 'vi';

async function load(code) {
  if (code === 'vi' || !loaders[code]) return null;
  try {
    return (await loaders[code]()).default;
  } catch (err) {
    console.warn(`locale ${code} failed to load`, err);
    return null;
  }
}

export async function loadLang(code) {
  const [chosen, en] = code === 'vi' ? [vi, null] : await Promise.all([load(code), code === 'en' ? null : load('en')]);
  chain = [chosen, en, vi].filter(Boolean);
  current = (chosen || code === 'vi') ? code : (en ? 'en' : 'vi');
  document.documentElement.lang = current;
  return current;
}

export const lang = () => current;

export function has(key) {
  return chain.some((table) => key in table);
}

export function t(key, vars) {
  const table = chain.find((tbl) => key in tbl);
  const text = table ? table[key] : key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text;
}

export function setLang(code) {
  try { localStorage.setItem(STORE_KEY, code); } catch { /* private mode */ }
  // a ?lang= in the address would override the saved choice on reload
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  location.replace(url);
}

// Static markup: data-i18n fills the text, data-i18n-aria the aria-label.
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
