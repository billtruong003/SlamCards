import { getLevel, isMuted, onMuteChange } from './audio.js';

// Two looping tracks: menu/lobby and in-match. Browsers block audio until the first
// user gesture, so playback starts on the first click or key press.
const TRACKS = {
  menu: { audio: Object.assign(new Audio('audio/menu-loop.mp3'), { loop: true, preload: 'auto' }), base: 0.7 },
  game: { audio: Object.assign(new Audio('audio/game-loop.mp3'), { loop: true, preload: 'none' }), base: 0.5 },
};

let current = null;
let unlocked = false;

export function refreshMusic() {
  const level = getLevel('music');
  for (const [name, { audio, base }] of Object.entries(TRACKS)) {
    audio.volume = Math.min(1, base * level);
    if (name === current && unlocked && level > 0 && !isMuted()) audio.play().catch(() => {});
    else audio.pause();
  }
}

export function playMusic(name) {
  if (name === current) return;
  if (current) TRACKS[current].audio.currentTime = 0;
  current = name;
  refreshMusic();
}

const unlock = () => {
  unlocked = true;
  refreshMusic();
  removeEventListener('pointerdown', unlock);
  removeEventListener('keydown', unlock);
};
addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);
onMuteChange(refreshMusic);
