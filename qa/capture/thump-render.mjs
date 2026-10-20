// The game's slam sound rendered by the browser's own Web Audio (sound.js thump(): the exact noise burst through the
// exact biquad), so the video uses what players hear. → video/sfx/game_thump_<i>.wav (48 kHz mono, 6 takes of the noise)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'video', 'sfx');
const browser = await chromium.launch();
const page = await browser.newPage();
const takes = await page.evaluate(async () => {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const ctx = new OfflineAudioContext(1, 48000 * 0.3, 48000);
    const length = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const source = ctx.createBufferSource(); source.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
    const gain = ctx.createGain(); gain.gain.value = 0.9;
    source.connect(filter).connect(gain).connect(ctx.destination); source.start();
    out.push(Array.from((await ctx.startRendering()).getChannelData(0)));
  }
  return out;
});
await browser.close();
const wav = (s) => {
  const b = Buffer.alloc(44 + s.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + s.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(48000, 24); b.writeUInt32LE(96000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(s.length * 2, 40);
  s.forEach((v, i) => b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2));
  return b;
};
takes.forEach((s, i) => fs.writeFileSync(path.join(OUT, `game_thump_${i}.wav`), wav(s)));
console.log('wrote', takes.length, 'takes, peaks', takes.map((s) => Math.max(...s.map(Math.abs)).toFixed(2)).join(' '));
