// Card cut-outs for key art: the tiger card face up and the panda card face up, each alone, shot from straight above on
// a flat key-green table (the table, floor and shadows hidden), keyed by video/media/key.py.  → video/media/src/key-*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, player, sleep, toFirstTurn } from './rec.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'video', 'media', 'src');
const browser = await launch();
try {
  const host = await player(browser, 'bill', { viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 2 });
  await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
  const link = await host.evaluate(() => { const el = document.getElementById('link'); return el.dataset.real || el.value; });
  const g = await player(browser, 'teo', { viewport: { width: 480, height: 360 } }, { url: `${link}&debug&noftue&clean` });
  await g.waitForSelector('#ready, #go'); if (await g.$('#go')) await g.click('#go');
  await g.waitForSelector('#ready'); await g.click('#ready');
  await host.waitForFunction(() => slamDebug.state.ready.pink === true);
  await host.click('#start');
  await toFirstTurn(host, [host, g], ['bua', 'keo']);
  await sleep(1500);
  await host.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  // key green: scene background, every mesh that is not a card hidden
  await host.evaluate(() => {
    const w = slamDebug.world;
    const cardMeshes = new Set(Object.values(w.cards).map((c) => c.mesh));
    const keep = (o) => { for (let x = o; x; x = x.parent) if (cardMeshes.has(x)) return true; return false; };
    w.scene.traverse((o) => { if (o.isMesh && !keep(o)) o.visible = false; });
    w.scene.background = new (w.scene.background?.constructor || Object)(0x00ff00);
    if (!w.scene.background.isColor) { w.renderer.setClearColor(0x00ff00, 1); w.scene.background = null; }
    w.camera.clearViewOffset(); w.camera.fov = 20; w.camera.updateProjectionMatrix();
  });
  const other = await host.evaluate(() => Object.keys(slamDebug.cards()).find((k) => k !== slamDebug.me));
  for (const [name, mine, up] of [['tiger', true, true], ['panda', false, true], ['tiger-back', true, false], ['panda-back', false, false]]) {
    await host.evaluate(([mine, other, up]) => {
      const cards = slamDebug.cards(); const me = slamDebug.me;
      cards[mine ? me : other] = { p: [0, 0.008, 0], q: up ? [0, 0, 0, 1] : [0, 0, 1, 0] };
      cards[mine ? other : me] = { p: [0, -50, 0], q: [0, 0, 0, 1] };
      slamDebug.place(cards);
      const w = slamDebug.world; w.lookTarget.set(0, 0, 0); w.cameraBase.set(0, 6, 0.0001); w.needsRender = true;
    }, [mine, other, up]);
    await sleep(600);
    await host.screenshot({ path: path.join(OUT, `key-${name}.png`) });
    console.log('  key', name);
  }
} catch (err) {
  console.log('ERR', err.message.split('\n')[0]);
} finally {
  await browser.close();
}
