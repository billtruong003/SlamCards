// Slow boot: the "still loading?" card must go away once the game is up (it used to block the menu).
// Run with the game server on :8097:  node qa/slow-boot.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage();
await page.addInitScript(() => localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'));
// hold the physics wasm back past the 20 s timer
await page.route('**/*.wasm', async (route) => { await new Promise((r) => setTimeout(r, 23000)); await route.continue(); });
await page.goto('http://localhost:8097/?noftue');
await page.waitForFunction(() => window.slamBooted === true, null, { timeout: 60000 });
await page.waitForTimeout(500);
const r = await page.evaluate(() => ({ cardHidden: document.getElementById('boot-fail').hidden, createClickable: !!document.getElementById('create') }));
console.log(JSON.stringify(r));
await page.click('#create', { timeout: 5000 });
console.log('create clicked ok');
await browser.close();
if (!r.cardHidden) process.exit(1);
