// One audio context and three volume buses (music, meme, sfx) with player-set levels.
// Meme clips are decoded once and loudness-normalised, so loud and quiet clips land at
// about the same level before the player's meme slider applies.

const DEFAULTS = { music: 0.5, meme: 0.6, sfx: 0.7 };
const TARGET_RMS = 0.12;
const PEAK_LIMIT = 0.9;

let levels = { ...DEFAULTS };
try { levels = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('slam-volume') || '{}') }; } catch { /* private mode */ }

// Sound is optional (QA-08): with no Web Audio, or a context that fails to start, `ctx` is null,
// buses are null and every player below turns into a no-op, so the game still runs silently.
function createContext() {
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch (err) {
    console.warn('no Web Audio, playing silently', err);
    return null;
  }
}
export const ctx = createContext();
const buses = Object.fromEntries(Object.keys(DEFAULTS).map((name) => {
  if (!ctx) return [name, null];
  const gain = ctx.createGain();
  gain.gain.value = levels[name];
  gain.connect(ctx.destination);
  return [name, gain];
}));

export const bus = (name) => buses[name];
export const getLevel = (name) => levels[name];

export function setLevel(name, value) {
  levels[name] = value;
  buses[name]?.gain.setTargetAtTime(value, ctx.currentTime, 0.03);
  try { localStorage.setItem('slam-volume', JSON.stringify(levels)); } catch { /* private mode */ }
}

// Ad breaks (ads.js) silence everything: the Web Audio buses by suspending the context, the music
// (plain <audio>, music.js) through the listeners. A tap during the ad does not wake the sound.
let muted = false;
const muteListeners = new Set();
export const isMuted = () => muted;
export const onMuteChange = (fn) => muteListeners.add(fn);
export function setMuted(on) {
  if (muted === on) return;
  muted = on;
  if (ctx) (on ? ctx.suspend() : ctx.resume()).catch(() => {});
  muteListeners.forEach((fn) => fn());
}

const unlock = () => { if (ctx && !muted && ctx.state !== 'running') ctx.resume(); };
addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);

// ---------- normalised clips ----------

const clips = new Map();

function loudnessGain(buffer) {
  let sum = 0;
  let count = 0;
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      if (v > 0.01) {
        sum += v * v;
        count++;
      }
    }
  }
  const rms = count ? Math.sqrt(sum / count) : TARGET_RMS;
  return Math.min(TARGET_RMS / rms, PEAK_LIMIT / Math.max(peak, 1e-3));
}

export function loadClip(url) {
  if (!ctx) return Promise.resolve(null);
  if (!clips.has(url)) {
    clips.set(url, fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => ({ buffer, gain: loudnessGain(buffer) }))
      .catch(() => null));
  }
  return clips.get(url);
}

// Plays a clip on a bus; returns a handle with its duration and a stop() that fades out.
export async function playClip(url, busName, maxMs = Infinity) {
  const clip = await loadClip(url);
  if (!clip) return null;
  const source = ctx.createBufferSource();
  source.buffer = clip.buffer;
  const gain = ctx.createGain();
  gain.gain.value = clip.gain;
  source.connect(gain).connect(buses[busName]);
  source.start();
  const durationMs = Math.min(clip.buffer.duration * 1000, maxMs);
  const stop = () => {
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    source.stop(ctx.currentTime + 0.4);
  };
  if (Number.isFinite(maxMs) && clip.buffer.duration * 1000 > maxMs) setTimeout(stop, maxMs);
  return { durationMs, stop };
}
