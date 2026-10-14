// UX-06: "Biết chơi rồi" turns off both the first-turn pointer and the tips.
// Run with the game server on :8097:  node qa/ux06-check.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chromium' });
const host = await browser.newPage();
await host.addInitScript(() => localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'));
await host.goto('http://localhost:8097/?noftue');
await host.waitForFunction(() => window.slamBooted === true);
await host.fill('#name', 'Bill');
await host.click('#create');
await host.waitForFunction(() => /room=/.test(location.href) || document.querySelector('#start'));
await host.waitForTimeout(800);
const link = await host.evaluate(() => location.href.includes('room=') ? location.href : document.querySelector('input[readonly]')?.value);
const guest = await browser.newPage();
await guest.addInitScript(() => localStorage.setItem('slam-volume', '{"music":0,"meme":0,"sfx":0}'));
await guest.goto(link.startsWith('http') ? link.replace('?noftue', '') : `http://${link}`);
await guest.waitForFunction(() => window.slamBooted === true);
await guest.fill('#name', 'Tí');
await guest.click('#go');
await guest.waitForSelector('#ftue-no');
await guest.click('#ftue-no');
const after = await guest.evaluate(() => ({ seen: localStorage.getItem('slam-ftue'), matches: localStorage.getItem('slam-ftue-matches'), invite: Boolean(document.querySelector('.ftue-invite')) }));
console.log(JSON.stringify(after));
await browser.close();
if (after.seen !== 'seen' || Number(after.matches) < 3 || after.invite) process.exit(1);
