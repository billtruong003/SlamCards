// The MV's opening camera moves on the real table (shots 0.2 dolly, 0.3 crane, 0.4 push-in), filmed in the dark with
// one warm beam, cards face down.   SLOW=0.25 node qa/capture/mv-tabletakes.mjs → qa/out/film/mv-0.2 … (assemble.py each)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn, record, LOOKS } from './rec.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'film');
LOOKS.h1 = { pet: 'tiger', dep: 'dep_lao', depColors: ['#fffaf0', '#ff5c9d'], cardColor: 'hong' };
LOOKS.h2 = { pet: 'panda', dep: 'dep_le', depColors: ['#fffaf0', '#2fa8ff', '#7a3d1a'], cardColor: 'xanh' };
LOOKS.h3 = { pet: 'chick', dep: 'dep_to_ong', depColors: ['#ffc93c'], cardColor: 'vang' };
LOOKS.h4 = { pet: 'fox', dep: 'dep_lao', depColors: ['#2a1418', '#3ccf6e'], cardColor: 'la' };
const NAMES = { h1: 'Hổ', h2: 'Gấu', h3: 'Gà', h4: 'Cáo' };
const DOWN = [0, 0, 1, 0];
const TAKES = {
  '0.2': [{ look: [-1.6, 0, 0], from: [-3.2, 0.32, 1.7], fov: 36 }, { look: [1.6, 0, 0], from: [3.2, 0.32, 1.7], fov: 36 }, 'linear'],
  '0.3': [{ look: [0, 0, 0], from: [0, 0.35, 2.8], fov: 36 }, { look: [0, 0, 0], from: [0, 6.8, 2.2], fov: 36 }, 'inOut'],
  '0.4': [{ look: [0, 0, 0.9], from: [0, 2.0, 3.4], fov: 34 }, { look: [0, 0, 0.9], from: [0, 0.7, 1.75], fov: 34 }, 'in'],
};
const browser = await launch();
async function room() {
  const ids = ['h1', 'h2', 'h3', 'h4'];
  const host = await player(browser, ids[0], { viewport: { width: 1920, height: 1080 } }, { name: NAMES[ids[0]] });
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const guests = [];
  for (const id of ids.slice(1)) {
    const g = await player(browser, id, { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean`, name: NAMES[id] });
    await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
    await g.waitForSelector('#ready'); await g.click('#ready'); guests.push(g);
  }
  await host.waitForFunction((k) => Object.values(slamDebug.state.ready || {}).filter(Boolean).length >= k, ids.length - 1);
  await host.click('#start');
  await toFirstTurn(host, [host, ...guests], ['bua', 'keo', 'keo', 'keo']);
  await sleep(1500);
  await host.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  await host.evaluate(() => slamDebug.film().then((f) => f.outlinePx(12)));
  for (const g of guests) await g.close();
  await host.evaluate(() => __film.light({ hemi: 0.22, sun: 0.08, bg: '#1a1315', spot: { from: [-3.5, 7, 2.5], at: [0.2, 0, 0.4], intensity: 110, angle: 0.3, penumbra: 0.75 } }));
  await host.evaluate((d) => {
    const now = slamDebug.cards(); const me = slamDebug.me;
    const seats = [me, ...Object.keys(now).filter((k) => k !== me)];
    const ring = [[0, 0.9], [-1.25, -0.2], [0.05, -1.25], [1.3, -0.1]];
    const out = {}; seats.forEach((s, i) => { out[s] = { p: [ring[i][0], 0.008, ring[i][1]], q: d }; });
    slamDebug.place(out);
  }, DOWN);
  return host;
}
try {
  for (const [name, [a, b, ease]] of Object.entries(TAKES)) {
    const host = await room();
    await host.evaluate((c) => __film.camSet(c), a); await sleep(800);
    const rec = await record(host, path.join(ROOT, `mv-${name}`));
    await sleep(200);
    await host.evaluate(([c, e]) => __film.camTo(c, 3800, e), [b, ease]);
    await sleep(4200);
    await rec.stop();
    await host.context().close();
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
