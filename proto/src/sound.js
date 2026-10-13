import { ctx, bus } from './audio.js';

// A short filtered noise burst: the "bốp" of a slipper on wood.
export function thump(volume = 1) {
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
