// The long video's extra footage, desktop 1920x1080:
//   quick     "Chơi ngay · Bất kỳ" with three strangers: the search, the 4-card table, a round of slams → out/film/desktop-quick
//   wardrobe  the wardrobe: pets, slipper colours, card colour                                       → out/film/desktop-wardrobe
//   ward2     the trailer's close-up: pets flipped fast, then the honeycomb slipper picked and painted     → out/film/desktop-ward2
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, DESKTOP, sleep, SLOW, SUFFIX, state, record, toFirstTurn } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'out', 'film');
const browser = await launch();
let rec;
try {
  if (process.argv[2] === 'wardrobe') {
    const host = await player(browser, 'bill', DESKTOP);
    rec = await record(host, path.join(OUT, 'desktop-wardrobe'));
    await sleep(1500); await rec.mark('home');
    await host.click('.gear-card [data-ward="pet"]'); await host.waitForSelector('[data-pet]'); await sleep(900); await rec.mark('pets');
    for (const pet of ['panda', 'fox', 'chick', 'tiger']) { await host.click(`[data-pet="${pet}"]`); await rec.mark('pet-' + pet); await sleep(1300); }
    await host.click('[data-tab="dep"]'); await sleep(1300); await rec.mark('dep');
    for (const i of [3, 9, 14, 5]) { await host.locator('[data-part]').nth(i).click().catch(() => {}); await rec.mark('swatch'); await sleep(1000); }
    await host.click('[data-tab="card"]'); await sleep(1200); await rec.mark('card');
    for (const c of ['vang', 'la', 'hong']) { await host.click(`[data-color="${c}"]`).catch(() => {}); await sleep(1000); }
    await host.click('#ward-done'); await sleep(1500); await rec.mark('done');
  } else if (process.argv[2] === 'ward2') {
    const host = await player(browser, 'bill', { ...DESKTOP, deviceScaleFactor: 2.5 }); // sharp when the edit zooms on the panel
    rec = await record(host, path.join(OUT, 'desktop-ward2' + SUFFIX));
    await sleep(1200); await rec.mark('home');
    await host.click('.gear-card [data-ward="pet"]'); await host.waitForSelector('[data-pet]'); await sleep(800); await rec.mark('pets');
    const pets = await host.$$eval('[data-pet]', (els) => els.map((e) => e.dataset.pet));
    for (const pet of pets.slice(0, 10)) { await host.click(`[data-pet="${pet}"]`); await rec.mark('pet-' + pet); await sleep(420); }
    await host.click('[data-pet="tiger"]'); await sleep(900);
    await host.click('[data-tab="dep"]'); await sleep(1000); await rec.mark('dep');
    await host.click('[data-dep="dep_to_ong"]'); await rec.mark('to-ong'); await sleep(1400);
    const n = await host.locator('[data-part]').count();
    for (const i of [2, 6, 10, 13, 4].filter((k) => k < n)) { await host.locator('[data-part]').nth(i).click().catch(() => {}); await rec.mark('swatch'); await sleep(750); }
    await sleep(800); await rec.mark('end');
  } else {
    const host = await player(browser, 'bill', DESKTOP);
    const others = [];
    for (const who of ['teo', 'ti', 'bu']) others.push(await player(browser, who, { viewport: { width: 480, height: 360 } }));
    rec = await record(host, path.join(OUT, 'desktop-quick' + SUFFIX));
    await sleep(1200); await rec.mark('home');
    await host.click('#size [data-size="any"]').catch(() => {}); await sleep(500);
    await host.click('#play'); await rec.mark('play');
    await sleep(2500);
    for (const p of others) { await p.click('#size [data-size="any"]').catch(() => {}); await p.click('#play'); await sleep(900); }
    await host.waitForFunction(() => slamDebug.state && slamDebug.state.phase !== 'lobby', null, { timeout: 40000 / SLOW }); await rec.mark('matched');
    const all = [host, ...others];
    await toFirstTurn(host, all, ['bua', 'keo', 'keo', 'keo']); await rec.mark('first-turn');
    for (let n = 0; n < 6; n++) {
      const s = await state(host);
      if (s.phase !== 'turn') { await sleep(500); continue; }
      for (const p of all) {
        const mine = await p.evaluate(() => slamDebug.state.turn === slamDebug.me);
        if (!mine) continue;
        await sleep(900);
        await p.evaluate(() => { const c = slamDebug.cards()[slamDebug.me].p; return [[1.7, 0.4], [-1.7, 0.4], [0.4, 1.7], [0.4, -1.7]].some(([dx, dz]) => slamDebug.slamAt(c[0] + dx, c[2] + dz)); });
        await rec.mark('slam');
        for (let w = 0; w < 40; w++) { await sleep(250); const s2 = await state(host); if (s2.phase !== 'anim' && !(s2.phase === 'turn' && s2.turn === s.turn)) break; }
        break;
      }
    }
    await sleep(1500);
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  if (rec) await rec.stop();
  await browser.close();
}
