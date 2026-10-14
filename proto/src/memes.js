// Meme reactions: a sound plus an image (or a text effect) for each game moment.
// Several variants for one moment are picked at random; reactions queue up so they never overlap.
const BASE = 'memes/';

const MEMES = {
  capture: [
    { sound: 'capture-damage.mp3', image: 'capture-damage.jpg' },
    { sound: 'capture-boom.mp3', image: 'capture-pikachu.jpg' },
  ],
  skill: [{ sound: 'skill-trinh.mp3', vfx: 'trinh', maxMs: 6000 }],
  fall: [
    { sound: 'fall-bruh.mp3', image: 'fall-bruh.png' },
    { sound: 'fall-oidoioi.mp3', image: 'fall-tom.jpg' },
  ],
  roundWin: [{ sound: 'round-clap.mp3', vfx: 'clap', maxMs: 4500 }],
  matchWin: [{ sound: 'match-win.mp3', image: 'match-win.jpg', caption: 'meme.perfectVictory', maxMs: 7000 }],
  matchLose: [{ sound: 'match-lose.mp3', image: 'match-lose.jpg' }],
  pass: [{ sound: 'pass-huh.mp3', image: 'pass-huh.jpg' }],
  timeout: [{ sound: 'timeout-snore.mp3', image: 'timeout-snore.jpg', maxMs: 4000 }],
  forced: [{ sound: 'forced-fbi.mp3', image: 'forced-fbi.jpg' }],
  firstFlip: [{ sound: 'flip-wow.mp3', image: 'flip-wow.jpg', maxMs: 3500 }],
  tie: [{ sound: 'tie-tbc.mp3', image: 'tie-tbc.png', maxMs: 6000 }],
};

import { loadClip, playClip } from './audio.js';
import { t } from './i18n.js';

const MIN_SHOW_MS = 1600;
const MAX_QUEUE = 2;

let enabled = true;
try { enabled = localStorage.getItem('slam-memes') !== '0'; } catch { /* private mode */ }

export function preloadMemes() {
  for (const variants of Object.values(MEMES)) {
    for (const v of variants) {
      loadClip(BASE + v.sound);
      if (v.image) new Image().src = BASE + v.image;
    }
  }
}

export function memesEnabled() {
  return enabled;
}

export function setMemesEnabled(value) {
  enabled = value;
  try { localStorage.setItem('slam-memes', enabled ? '1' : '0'); } catch { /* private mode */ }
  if (!enabled) stop();
}

const host = document.createElement('div');
host.id = 'meme';
document.body.appendChild(host);

const queue = [];
let current = null;

export function showMeme(kind) {
  if (!enabled || !MEMES[kind]) return;
  if (queue.length >= MAX_QUEUE) return;
  queue.push(kind);
  if (!current) next();
}

function stop() {
  queue.length = 0;
  if (current) {
    current.handle?.stop();
    clearTimeout(current.timer);
    current = null;
  }
  host.innerHTML = '';
}

async function next() {
  const kind = queue.shift();
  if (!kind) {
    current = null;
    host.innerHTML = '';
    return;
  }
  const variants = MEMES[kind];
  const meme = variants[Math.floor(Math.random() * variants.length)];
  const token = {};
  current = token;
  host.innerHTML = render(meme);
  const handle = await playClip(BASE + meme.sound, 'meme', meme.maxMs ?? 5000);
  if (current !== token) {
    handle?.stop();
    return;
  }
  token.handle = handle;
  const showMs = Math.max(MIN_SHOW_MS, handle?.durationMs ?? meme.maxMs ?? 3000);
  token.timer = setTimeout(() => {
    if (current !== token) return;
    handle?.stop();
    next();
  }, showMs);
}

function render(meme) {
  if (meme.vfx === 'trinh') {
    return `<div class="vfx-trinh"><span class="l1">${t('meme.trinh1')}</span><span class="l2">${t('meme.trinh2')}</span></div>`;
  }
  if (meme.vfx === 'clap') {
    return `<div class="vfx-clap"><span>${t('meme.clap')}</span></div>`;
  }
  return `<figure class="meme-card">
    <img src="${BASE + meme.image}" alt="">
    ${meme.caption ? `<figcaption>${t(meme.caption)}</figcaption>` : ''}
  </figure>`;
}
