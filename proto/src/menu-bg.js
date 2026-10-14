// Menu backdrop: scattered cards, and a slipper that keeps slamming one at random and
// flipping it. Silent on purpose; the menu only has music.
import { t } from './i18n.js';

const CARDS = ['black-front', 'black-back', 'pink-front', 'pink-back'];
const FLIPPED = { 'black-front': 'black-back', 'black-back': 'black-front', 'pink-front': 'pink-back', 'pink-back': 'pink-front' };

const DEP_SVG = `<svg viewBox="0 0 40 84" aria-hidden="true"><rect x="3" y="3" width="34" height="78" rx="17" fill="#f5f7ff" stroke="#2a1418" stroke-width="4"/><path d="M9 36 Q20 20 31 36" fill="none" stroke="#5b8def" stroke-width="7" stroke-linecap="round"/><circle cx="20" cy="24" r="3" fill="#2a1418"/></svg>`;

export function mountMenuBackground(host) {
  const layer = document.createElement('div');
  layer.className = 'menu-anim';
  host.prepend(layer);

  const count = Math.max(6, Math.round(Math.min(26, (innerWidth * innerHeight) / 52000)));
  const cards = Array.from({ length: count }, (_, i) => {
    const el = document.createElement('div');
    const kind = CARDS[i % CARDS.length];
    el.className = `mcard ${kind}`;
    el.dataset.kind = kind;
    el.dataset.rot = String(Math.round((Math.random() - 0.5) * 50));
    el.style.left = `${4 + Math.random() * 88}%`;
    el.style.top = `${6 + Math.random() * 84}%`;
    el.style.transform = `rotate(${el.dataset.rot}deg)`;
    el.style.animationDelay = `${-Math.random() * 6}s`;
    layer.appendChild(el);
    return el;
  });

  const dep = document.createElement('div');
  dep.className = 'mdep';
  dep.innerHTML = DEP_SVG;
  layer.appendChild(dep);

  const slam = () => {
    if (!layer.isConnected) {
      clearInterval(timer);
      return;
    }
    const card = cards[Math.floor(Math.random() * cards.length)];
    const rect = card.getBoundingClientRect();
    const hostRect = layer.getBoundingClientRect();
    const x = rect.left - hostRect.left + rect.width * (Math.random() < 0.5 ? -0.15 : 1.15);
    const y = rect.top - hostRect.top + rect.height * 0.5;
    dep.style.left = `${x}px`;
    dep.style.top = `${y}px`;
    dep.animate([
      { transform: 'translate(-50%, -160%) rotate(-25deg) scale(1.25)', opacity: 0 },
      { transform: 'translate(-50%, -150%) rotate(-25deg) scale(1.25)', opacity: 1, offset: 0.4 },
      { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1, offset: 0.62 },
      { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1, offset: 0.85 },
      { transform: 'translate(-50%, -60%) rotate(0deg) scale(1)', opacity: 0 },
    ], { duration: 700, easing: 'ease-in' });

    setTimeout(() => {
      const rot = card.dataset.rot;
      card.animate([
        { transform: `rotate(${rot}deg) translateY(0) rotateY(0deg)` },
        { transform: `rotate(${rot}deg) translateY(-30px) rotateY(90deg)` },
      ], { duration: 160, easing: 'ease-out' }).onfinish = () => {
        card.classList.remove(card.dataset.kind);
        card.dataset.kind = FLIPPED[card.dataset.kind];
        card.classList.add(card.dataset.kind);
        card.dataset.rot = String(Math.round((Math.random() - 0.5) * 50));
        card.style.transform = `rotate(${card.dataset.rot}deg)`;
        card.animate([
          { transform: `rotate(${card.dataset.rot}deg) translateY(-30px) rotateY(90deg)` },
          { transform: `rotate(${card.dataset.rot}deg) translateY(0) rotateY(0deg)` },
        ], { duration: 220, easing: 'ease-in' });
      };
      const pop = document.createElement('div');
      pop.className = 'mpop';
      pop.textContent = t('card.pop');
      pop.style.left = `${x}px`;
      pop.style.top = `${y - 30}px`;
      layer.appendChild(pop);
      setTimeout(() => pop.remove(), 650);
    }, 440);
  };

  const timer = setInterval(slam, 900);
  slam();
}
