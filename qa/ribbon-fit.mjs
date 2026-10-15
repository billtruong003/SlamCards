// Pet names on the card ribbon (upper-cased, 42 px, squeezed down to 18 px) and slipper names on
// the card's chip, in every language. Run with the game server on :8097:  node qa/ribbon-fit.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import { PETS, DEP_IDS } from '../proto/src/catalog.js';

const BASE = process.env.SLAM_BASE || 'http://localhost:8097';
const FONT = '"Baloo 2", system-ui, sans-serif'; // stencil-card.js
const dir = new URL('../proto/src/locales/', import.meta.url);
const langs = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'context.json');
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage();
await page.goto(`${BASE}/?noftue`);
await page.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await page.evaluate((f) => document.fonts.load(`800 42px ${f}`), FONT);
let bad = 0;
for (const f of langs) {
  const loc = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
  const names = PETS.map((p) => (loc[`pet.${p}`] ?? '').toUpperCase());
  const deps = DEP_IDS.map((d) => (loc[`dep.${d}`] ?? '').toUpperCase());
  const r = await page.evaluate(([names, deps, font]) => {
    const g = document.createElement('canvas').getContext('2d');
    const sizeFor = (s) => {
      let z = 42;
      for (; z > 18; z -= 2) { g.font = `800 ${z}px ${font}`; if (g.measureText(s).width <= 349) break; }
      g.font = `800 ${z}px ${font}`;
      return { z, fits: g.measureText(s).width <= 349 };
    };
    const pets = names.map((n) => ({ n, ...sizeFor(n) }));
    g.font = `800 19px ${font}`;
    return { pets, deps: deps.map((d) => ({ d, w: g.measureText(d).width })) };
  }, [names, deps, FONT]);
  const small = r.pets.filter((p) => !p.fits || p.z < 28);
  const wide = r.deps.filter((d) => d.w > 300);
  if (r.pets.some((p) => !p.fits) || wide.length) bad++;
  console.log(`${f.padEnd(12)} smallest ${Math.min(...r.pets.map((p) => p.z))}px  ${small.map((p) => `${p.n}=${p.z}${p.fits ? '' : '!'}`).join(', ')}${wide.length ? `  WIDE: ${wide.map((d) => d.d).join(',')}` : ''}`);
}
await browser.close();
process.exit(bad ? 1 : 0);
