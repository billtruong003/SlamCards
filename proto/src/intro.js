// "Bill The Dev" studio credit, ported from the studio's Unity boot (BillTheDev-Pack/3-boot-credit):
// the fox pops in, its sunglasses drop on with a click and a squash, a glare sweeps the lenses,
// the name types out with a blinking amber cursor, then it all fades. About 4.8 s.
// First visit of the day plays in full; later visits that day can skip it with a tap after 1 s.
import { ctx, bus } from './audio.js';

const ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c = 1.70158;
    const u = t - 1;
    return 1 + (c + 1) * u * u * u + c * u * u;
  },
  outBounce: (t) => {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function tween(ms, curve, apply) {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now) => {
      const k = Math.min((now - start) / ms, 1);
      apply(curve(k));
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

// The 0.12 s rising blip at the shades' impact (synthesised: the original asset may not ship on its own).
function click() {
  if (!ctx || ctx.state !== 'running') return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
  osc.connect(gain).connect(bus('sfx'));
  osc.start();
  osc.stop(ctx.currentTime + 0.13);
}

export async function playIntro() {
  const today = new Date().toISOString().slice(0, 10);
  let repeat = false;
  try {
    repeat = localStorage.getItem('boot.day') === today;
    localStorage.setItem('boot.day', today);
  } catch { /* private mode */ }

  const root = document.createElement('div');
  root.id = 'intro';
  root.innerHTML = `
    <div class="intro-group">
      <div class="intro-fox">
        <img class="intro-head" src="brand/fox_head.png" alt="">
        <img class="intro-shades" src="brand/fox_shades.png" alt="">
        <div class="intro-lens"><div class="intro-glare"></div></div>
      </div>
      <div class="intro-name" aria-label="Bill The Dev"></div>
    </div>`;
  document.body.appendChild(root);
  const group = root.querySelector('.intro-group');
  const fox = root.querySelector('.intro-fox');
  const shades = root.querySelector('.intro-shades');
  const glare = root.querySelector('.intro-glare');
  const name = root.querySelector('.intro-name');

  let skipped = false;
  const started = performance.now();
  root.addEventListener('pointerdown', () => {
    if (repeat && performance.now() - started > 1000) skipped = true;
  });
  const wait = async (ms) => {
    const end = performance.now() + ms;
    while (!skipped && performance.now() < end) await sleep(16);
  };

  fox.style.transform = 'scale(0)';
  shades.style.visibility = 'hidden';
  await wait(300);

  if (!skipped) {
    // the bare fox pops in, then sits a beat so the drop reads
    tween(500, ease.outBack, (k) => { fox.style.transform = `scale(${k})`; });
    await wait(900);
  }
  if (!skipped) {
    // the sunglasses drop on; the head squashes a little on impact
    shades.style.visibility = 'visible';
    tween(500, ease.outBounce, (k) => { shades.style.transform = `translateY(${-(1 - k) * 70}%)`; });
    await wait(300);
    click();
    tween(240, ease.linear, (k) => {
      const s = 0.07 * Math.sin(k * Math.PI);
      fox.style.transform = `scale(${1 + s}, ${1 - s})`;
    }).then(() => { fox.style.transform = 'scale(1)'; });
    await wait(500);
  }
  if (!skipped) {
    // glare across the lenses while the name types out
    // the bar sweeps from -420 to +420 px across the 460 px fox, i.e. about -91 % to +91 %
    tween(700, ease.inOutSine, (k) => { glare.style.left = `${50 - 91 + k * 182}%`; });
    const full = 'Bill The Dev';
    for (let i = 1; i <= full.length && !skipped; i++) {
      name.innerHTML = `${full.slice(0, i)}<span class="cursor">_</span>`;
      await sleep(60);
    }
    name.innerHTML = `${full}<span class="cursor">_</span>`;
    for (let blink = 0; blink < 2 && !skipped; blink++) {
      await wait(250);
      name.textContent = full;
      await wait(250);
      name.innerHTML = `${full}<span class="cursor">_</span>`;
    }
    await wait(500);
  }
  fox.style.transform = 'scale(1)';
  shades.style.visibility = 'visible';
  shades.style.transform = 'none';
  const fadeMs = skipped ? 250 : 500;
  await tween(fadeMs, ease.outQuad, (k) => {
    root.style.opacity = String(1 - k);
    group.style.transform = `scale(${1 - 0.04 * k})`;
  });
  root.remove();
}
