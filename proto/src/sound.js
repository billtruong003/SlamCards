import { ctx, bus } from './audio.js';

// A short filtered noise burst: the "bốp" of a slipper on wood.
export function thump(volume = 1) {
  if (!ctx) return;
  try {
    const length = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.9 * volume;
    source.connect(filter).connect(gain).connect(bus('sfx'));
    source.start();
  } catch {
    // audio is optional
  }
}

// Little tones for room events (oscillators, no files): 'found' a match, someone is 'ready',
// someone was knocked 'out' for idling. Same sfx volume as the thump.
const TONES = {
  found: [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.27]],
  ready: [[880, 0], [1175, 0.07]],
  out: [[392, 0], [330, 0.14], [262, 0.28]],
  react: [[988, 0], [1319, 0.05]],
};
export function chime(kind, volume = 1) {
  if (!ctx || !TONES[kind]) return;
  try {
    const now = ctx.currentTime;
    const wave = kind === 'out' ? 'triangle' : 'sine';
    for (const [freq, at] of TONES[kind]) {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + at);
      if (kind === 'out') osc.frequency.exponentialRampToValueAtTime(freq * 0.94, now + at + 0.16);
      const gain = ctx.createGain();
      const len = kind === 'found' && at > 0.2 ? 0.35 : kind === 'react' ? 0.09 : 0.16;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.32 * volume, now + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
      osc.connect(gain).connect(bus('sfx'));
      osc.start(now + at);
      osc.stop(now + at + len + 0.02);
    }
  } catch {
    // audio is optional
  }
}
