import { launch, player, sleep, toFirstTurn } from './rec.mjs';
const b = await launch();
const host = await player(b, 'bill', { viewport: { width: 800, height: 600 } });
await host.click('#create'); await host.click('#create-go'); await host.waitForSelector('#invite');
await host.evaluate(() => slamDebug.film());
console.log(await host.evaluate(() => [typeof __film, Object.keys(slamDebug.world.cards||{}), slamDebug.me, typeof __film.popOut]));
console.log(await host.evaluate(() => { try { return __film.popOut(slamDebug.me); } catch (e) { return e.stack; } }));
await b.close();
