// Look test for the MV: the same close-up with the game's outline hull and with the film's fixed-width line.
// → qa/out/mv-look/*.png     (game server on :8097)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, LOOKS } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'mv-look');
fs.mkdirSync(OUT, { recursive: true });
LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
const browser = await launch();
try {
  const host = await player(browser, 'h1', { viewport: { width: 1920, height: 1080 } }, { name: 'Hổ' });
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const g = await player(browser, 'h2', { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean`, name: 'Gấu' });
  await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
  await g.waitForSelector('#ready'); await g.click('#ready');
  await host.waitForFunction(() => Object.values(slamDebug.state.ready || {}).filter(Boolean).length >= 1);
  await host.click('#start');
  await toFirstTurn(host, [host, g], ['bua', 'keo']);
  await sleep(1500);
  await host.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  await host.evaluate(() => slamDebug.film());
  await host.evaluate(() => { const me = slamDebug.me; const c = slamDebug.cards(); const out = {}; for (const k of Object.keys(c)) out[k] = { p: [0, -20, 0], q: [0, 0, 0, 1] }; out[me] = { p: [0, 0.008, 0], q: [0, 0, 0, 1] }; slamDebug.place(out); });
  for (const [name, from, look] of [['far', [0, 1.5, 1.6], [0, 0, -0.05]], ['near', [0, 0.5, 0.15], [0, 0, -0.12]]]) {
    for (const px of [12, 16]) {
      await host.evaluate(([f, l, p]) => { __film.camSet({ from: f, look: l, fov: 34 }); __film.outlinePx(p); }, [from, look, px]);
      await sleep(600);
      await host.screenshot({ path: path.join(OUT, `${name}-px${px}.png`) });
      console.log('  ', name, px);
    }
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
