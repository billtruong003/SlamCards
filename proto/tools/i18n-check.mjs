// Compares locale files with vi.json: missing and extra keys, placeholder and <b> tag mismatches,
// strings longer than context.json's max. Exits 1 on missing keys or placeholder mismatches.
// Usage: node tools/i18n-check.mjs [lang]
import fs from 'node:fs';

const locales = new URL('../src/locales/', import.meta.url);
const read = (name) => JSON.parse(fs.readFileSync(new URL(name, locales), 'utf8'));
const vi = read('vi.json');
const context = read('context.json');

const only = process.argv[2];
const codes = only ? [only] : fs.readdirSync(locales)
  .filter((f) => f.endsWith('.json') && !['vi.json', 'context.json'].includes(f))
  .map((f) => f.slice(0, -5));

const placeholders = (text) => (text.match(/\{\w+\}/g) ?? []).sort().join(' ');
const tags = (text) => (text.match(/<\/?b>/g) ?? []).join('');
const length = (text) => [...text.replace(/<[^>]+>/g, '')].length;

let failed = false;

// vi.json itself: every key needs translator context.
const noContext = Object.keys(vi).filter((k) => !context[k]);
const staleContext = Object.keys(context).filter((k) => !(k in vi));
if (noContext.length) { failed = true; console.log(`vi: no context.json entry for ${noContext.join(', ')}`); }
if (staleContext.length) console.log(`vi: context.json has keys not in vi.json: ${staleContext.join(', ')}`);

if (!codes.length) console.log('no other locale files yet; vi.json checked');

for (const code of codes) {
  let table;
  try {
    table = read(`${code}.json`);
  } catch (err) {
    console.log(`${code}: cannot read ${code}.json (${err.message})`);
    failed = true;
    continue;
  }
  const missing = Object.keys(vi).filter((k) => !(k in table));
  const extra = Object.keys(table).filter((k) => !(k in vi));
  const badPlaceholders = Object.keys(vi).filter((k) => k in table && placeholders(table[k]) !== placeholders(vi[k]));
  const badTags = Object.keys(vi).filter((k) => k in table && tags(table[k]) !== tags(vi[k]));
  const long = Object.keys(vi).filter((k) => k in table && context[k]?.max && length(table[k]) > context[k].max);

  console.log(`\n${code}: ${Object.keys(vi).length - missing.length}/${Object.keys(vi).length} keys`);
  for (const k of missing) console.log(`  missing      ${k}`);
  for (const k of extra) console.log(`  extra        ${k}`);
  for (const k of badPlaceholders) console.log(`  placeholders ${k}: has "${placeholders(table[k])}", needs "${placeholders(vi[k])}"`);
  for (const k of badTags) console.log(`  <b> tags     ${k}: has "${tags(table[k])}", vi has "${tags(vi[k])}"`);
  for (const k of long) console.log(`  too long     ${k}: ${length(table[k])} > ${context[k].max}  "${table[k]}"`);
  if (missing.length || badPlaceholders.length) failed = true;
}

process.exit(failed ? 1 : 0);
