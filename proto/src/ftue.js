// First-time help: an invite card in the lobby, five illustrated steps, a pointer on the very
// first turn, one-off tips during the first matches, and the "?" quick-rules panel.
// All copy comes from TEXTS.md section I (locale keys ftue.*, tip.*, rules.*).
import { TUNE } from './config.js';
import { isFaceUp } from './rules.js';
import { t } from './i18n.js';

const STEPS = 5;
const TIP_MATCHES = 3;
const TIP_MS = 3500;
const EDGE_WARNING = 1.2;
const POINTER_BEHIND = 1.3;

const memory = {};
const saved = {
  get(key) { try { return localStorage.getItem(key) ?? memory[key] ?? null; } catch { return memory[key] ?? null; } },
  set(key, value) { memory[key] = value; try { localStorage.setItem(key, value); } catch { /* private mode */ } },
};

// The pet in a card's window, as a full address: a relative url() inside a custom property resolves
// against the page, so under /slam-cards/ the stylesheet's own path missed and the cards were empty.
const thumb = (pet) => `url(${new URL(`pets/thumbs/${pet}.png`, document.baseURI).href})`;
const PET_OF = { b: 'cat', p: 'panda' }; // bf/bb: my pink cat card, pf/pb: the blue panda one
const card = (cls, x, y, r = 0, s = 0.44, extra = '') => `<i class="fa-c ${cls}${extra}" style="left:${x}px;top:${y}px;--r:${r}deg;--s:${s};--pet:${thumb(PET_OF[cls[0]])}"></i>`;
const label = (x, y, text) => `<span class="fa-lbl" style="left:${x}px;top:${y}px">${text}</span>`;
const verdict = (cls, x, y, mark) => `<span class="fa-v ${cls}" style="left:${x}px;top:${y}px">${mark}</span>`;
const cell = (x, y, top, bottom, mark, caption) => `<div class="fa-cell" style="left:${x}px;top:${y}px">${card(bottom, 60, 48, 6, 0.42)}${card(top, 46, 38, -14, 0.42)}${verdict(mark[0], 93, 18, mark[1])}<div class="fa-cap">${caption}</div></div>`;
const SLIPPER = '<svg class="fa-dep" style="left:90px;top:176px;--r:-40deg" viewBox="0 0 40 84" aria-hidden="true"><rect x="3" y="3" width="34" height="78" rx="17" fill="#f5f7ff" stroke="#2a1418" stroke-width="4"/><path d="M9 36 Q20 20 31 36" fill="none" stroke="#5b8def" stroke-width="7" stroke-linecap="round"/><circle cx="20" cy="24" r="3" fill="#2a1418"/></svg>';

const paras = (...keys) => keys.map((key) => `<p>${t(key)}</p>`).join('');

// Pictures from the approved Claude Design mockup (mockup/ftue-preview), 250x300 each.
// Built on first use: the locale is not loaded yet when this module is imported.
const pages = () => [
  {
    title: t('ftue.step1.title'),
    body: paras('ftue.step1.p1', 'ftue.step1.p2'),
    art: `${card('pb', 140, 150, 6, 0.62)}${card('bf', 118, 128, -16, 0.62)}<span class="fa-pop" style="left:150px;top:62px">${t('ftue.step1.eat')}</span>${label(72, 98, t('ftue.step1.mineUp'))}${label(178, 212, t('ftue.step1.enemyDown'))}`,
  },
  {
    title: t('ftue.step2.title'),
    body: paras('ftue.step2.p1', 'ftue.step2.p2'),
    touch: paras('ftue.step2.touch'),
    art: `<span class="fa-ring fa-reach" style="left:125px;top:140px;width:200px;height:200px"></span>${card('bb', 125, 140, -4, 0.55)}<span class="fa-ring fa-shake" style="left:90px;top:176px"></span>${SLIPPER}<svg class="fa-trail" viewBox="0 0 250 300" aria-hidden="true"><path d="M125 140 L190 88" stroke="#2a1418" stroke-width="6" stroke-dasharray="2 9" stroke-linecap="round" fill="none"/><path d="M190 88 l-14 1 m14 -1 l-4 13" stroke="#2a1418" stroke-width="5" stroke-linecap="round" fill="none"/></svg>${label(125, 258, t('ftue.step2.reach'))}${label(62, 214, t('ftue.step2.dropHere'))}`,
  },
  {
    title: t('ftue.step3.title'),
    body: paras('ftue.step3.p1', 'ftue.step3.p2', 'ftue.step3.p3'),
    art: cell(8, 8, 'bf', 'pb', ['ok', '✓'], t('ftue.step3.win')) + cell(129, 8, 'pf', 'bb', ['bad', '✗'], t('ftue.step3.lose'))
      + cell(8, 132, 'bb', 'pb', ['no', '–'], t('ftue.step3.bothDown')) + cell(129, 132, 'bf', 'pf', ['no', '–'], t('ftue.step3.bothUp')),
  },
  {
    title: t('ftue.step4.title'),
    body: paras('ftue.step4.p1', 'ftue.step4.p2'),
    art: `<span class="fa-floor"></span>${card('bb', 58, 96, -4, 0.46)}<svg class="fa-trail" viewBox="0 0 250 300" aria-hidden="true"><path d="M160 168 Q205 120 224 86" stroke="#fff" stroke-width="12" stroke-linecap="round" fill="none" opacity=".95"/></svg>${card('pb', 160, 172, 8, 0.46)}${card('pf', 226, 72, 38, 0.46, ' fa-air')}<span class="fa-ring fa-impact" style="left:118px;top:200px"></span>${label(118, 230, t('ftue.step4.slamHere'))}${label(224, 128, t('ftue.step4.fall'))}<span class="fa-v bad fa-out" style="left:110px;top:270px">${t('ftue.step4.out')}</span>`,
  },
  {
    title: t('ftue.step5.title'),
    body: paras('ftue.step5.p1', 'ftue.step5.p2'),
    art: `<div class="fa-tools"><span class="fa-wind"><svg width="34" height="16" viewBox="0 0 34 16" aria-hidden="true"><path d="M2 8 H28 M20 2 L30 8 L20 14" fill="none" stroke="#2a1418" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ${t('hud.wind', { n: 4 })}</span><span class="fa-type sel">${t('turn.flat')} · Q</span><span class="fa-type">${t('turn.tilt')} · E</span></div><span class="fa-ring fa-reach" style="left:125px;top:215px;width:120px;height:120px"></span><span class="fa-ring fa-forced" style="left:125px;top:215px"></span>${card('bb', 125, 215, -4, 0.36)}`,
  },
];

const RULES = [['ok', '✓'], ['bad', '✗'], ['bad', '✗'], ['no', '–'], ['no', '!'], ['no', '!'], ['bad', '✗']];

// track(name): a first-steps moment for the server's counts (server/metrics.js CLIENT_EVENTS).
export function createFtue({ send, track = () => {}, world, touch, toastVisible, hidePanels }) {
  const PAGES = pages();
  const disabled = new URLSearchParams(location.search).has('noftue');
  let seen = saved.get('slam-ftue') === 'seen';
  let matches = Number(saved.get('slam-ftue-matches')) || 0;
  // the pointer is for a player who has never slammed; a reload mid-match must not bring it back (QA-05)
  let slammedOnce = saved.get('slam-ftue-slammed') === '1';
  let page = -1;
  let resumeAt = null;
  let state = null;
  let me = null;
  let lastPhase = '';
  let tipsShown = new Set();
  let tipQueue = [];
  let tipUntil = 0;
  let pointerDone = false;
  let bubbleTimer = 0;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="ftue-modal" class="ftue-modal" hidden>
      <div class="ftue-card" role="dialog" aria-modal="true" aria-labelledby="ftue-title">
        <div class="ftue-art"><div class="fa-stage"></div></div>
        <div class="ftue-txt">
          <div class="ftue-step"></div>
          <h2 id="ftue-title"></h2>
          <div class="ftue-body"></div>
          <div class="ftue-foot"><div class="ftue-pips"></div><button type="button" class="ftue-skip">${t('ftue.skip')}</button><button type="button" class="btn pri ftue-next">${t('ftue.next')}</button></div>
        </div>
      </div>
    </div>
    <div id="ftue-confirm" class="ftue-confirm" hidden>
      <div class="menu-card ftue-side">
        <h2 class="ftue-h"></h2>
        <p class="ftue-p"></p>
        <div class="row"><button type="button" class="btn pri" id="ftue-go">${t('ftue.confirm.go')}</button><button type="button" class="btn" id="ftue-wait">${t('ftue.confirm.wait')}</button></div>
      </div>
    </div>
    <div id="help-panel" class="panel-box help-panel" hidden>
      <h2>${t('rules.title')}</h2>
      <div class="rules-grid">${RULES.map(([cls, mark], i) => `<div class="rule"><span class="fa-v ${cls}">${mark}</span>${t(`rules.r${i + 1}`)}</div>`).join('')}</div>
      <div class="row help-actions"><button type="button" class="btn" id="help-replay">${t('rules.replay')}</button><button type="button" class="btn" id="close-help">${t('common.close')}</button></div>
    </div>
    <div id="ftue-bubble" class="ftue-bubble" hidden></div>
    <div id="ftue-tip" class="ftue-tip" hidden><i>${t('tip.label')}</i><span></span></div>
    <div id="ftue-point" class="ftue-point" hidden><span class="ftue-pulse"></span><span class="ftue-say">${t('ftue.pointer')}<small>${t('ftue.pointerGoal')}</small></span></div>`);

  const $ = (id) => document.getElementById(id);
  const modal = $('ftue-modal');
  const help = $('help-panel');
  const helpButton = $('help');
  const point = $('ftue-point');
  const tip = $('ftue-tip');

  const inLobby = () => state?.phase === 'lobby';
  const remember = () => { seen = true; saved.set('slam-ftue', 'seen'); };
  const shareStep = () => { if (state) send({ t: 'ftue', step: page >= 0 ? page + 1 : 0 }); };

  function showPage(i) {
    page = i;
    const p = PAGES[i];
    modal.querySelector('.fa-stage').innerHTML = p.art;
    modal.querySelector('.ftue-step').textContent = t('ftue.step', { n: i + 1, total: STEPS });
    modal.querySelector('#ftue-title').textContent = p.title;
    modal.querySelector('.ftue-body').innerHTML = p.body + (touch && p.touch ? p.touch : '');
    modal.querySelector('.ftue-pips').innerHTML = PAGES.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('');
    modal.querySelector('.ftue-next').textContent = t(i === STEPS - 1 ? 'ftue.done' : 'ftue.next');
    modal.hidden = false;
    modal.querySelector('.ftue-next').focus();
    shareStep();
  }

  function closeModal() {
    page = -1;
    modal.hidden = true;
    shareStep();
  }

  function openTutorial(at = 0) {
    track('tutorialOpened');
    remember();
    resumeAt = null;
    helpButton.classList.remove('dot');
    help.hidden = true;
    $('ftue-bubble').hidden = true;
    removeInvite();
    showPage(at);
  }

  modal.querySelector('.ftue-next').onclick = () => {
    if (page < STEPS - 1) showPage(page + 1);
    else {
      track('tutorialDone');
      closeModal();
    }
  };
  modal.querySelector('.ftue-skip').onclick = () => {
    track('tutorialSkipped');
    closeModal();
  };

  // The match started while the steps were open: put them away behind "?" and say where they went.
  function stashTutorial() {
    resumeAt = page;
    closeModal();
    helpButton.classList.add('dot');
    const bubble = $('ftue-bubble');
    bubble.innerHTML = t('ftue.stashed', { n: resumeAt + 1, total: STEPS });
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 4000);
  }

  function toggleHelp(open = help.hidden) {
    if (open) {
      hidePanels();
      track('rulesOpened');
    }
    help.hidden = !open;
    $('ftue-bubble').hidden = true;
    $('help-replay').textContent = resumeAt !== null ? t('rules.resume', { n: resumeAt + 1, total: STEPS }) : t('rules.replay');
  }
  helpButton.onclick = () => toggleHelp();
  $('close-help').onclick = () => toggleHelp(false);
  $('help-replay').onclick = () => openTutorial(resumeAt ?? 0);
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || !modal.hidden) return;
    if (e.key === 'h' || e.key === 'H') toggleHelp();
    if (e.key === 'Escape') toggleHelp(false);
  });

  // ---------- lobby ----------

  function removeInvite() {
    document.querySelector('.ftue-invite')?.remove();
    document.querySelector('.menu-bg.with-invite')?.classList.remove('with-invite');
  }

  function decorateLobby() {
    const bg = document.querySelector('#overlay .menu-bg');
    if (!bg || seen || disabled || !modal.hidden || bg.querySelector('.ftue-invite')) return;
    bg.classList.add('with-invite');
    bg.insertAdjacentHTML('beforeend', `
      <div class="menu-card ftue-invite ftue-side">
        <div class="ftue-invite-art">${card('pb', 52, 36, -8, 0.5)}${card('bf', 84, 32, 12, 0.5)}</div>
        <h2 class="ftue-h">${t('ftue.invite.title')}</h2>
        <p class="ftue-p">${t('ftue.invite.sub')}</p>
        <button type="button" class="btn pri wide" id="ftue-yes">${t('ftue.invite.yes')}</button>
        <button type="button" class="ftue-no" id="ftue-no">${t('ftue.invite.no')}</button>
      </div>`);
    $('ftue-yes').onclick = () => openTutorial(0);
    // "Already know how": no first-turn pointer and no tips either (UX-06), same as after three matches.
    $('ftue-no').onclick = () => {
      track('tutorialDeclined');
      remember();
      matches = Math.max(matches, TIP_MATCHES);
      saved.set('slam-ftue-matches', String(matches));
      removeInvite();
    };
  }

  // Starting while someone is still reading asks once. Returns false when nothing needs asking.
  function confirmStart(go, nameOf) {
    const reading = Object.entries(state?.players ?? {}).filter(([seat, p]) => seat !== me && p.tutorial > 0 && p.connected);
    if (!reading.length) return false;
    const [seat, p] = reading[0];
    const box = $('ftue-confirm');
    box.querySelector('.ftue-h').textContent = t('ftue.confirm.title', { name: nameOf(seat) });
    box.querySelector('.ftue-p').innerHTML = t('ftue.confirm.body', { n: p.tutorial, total: STEPS });
    box.hidden = false;
    $('ftue-go').onclick = () => { box.hidden = true; go(); };
    $('ftue-wait').onclick = () => { box.hidden = true; };
    return true;
  }

  // ---------- during a match ----------

  const tipsOn = () => !disabled && matches < TIP_MATCHES;

  function queueTip(key) {
    if (tipsShown.has(key) || tipQueue.includes(key)) return;
    tipsShown.add(key);
    tipQueue.push(key);
  }

  function checkTips() {
    const s = state;
    if (!tipsOn() || s.phase !== 'turn' || !s.alive.includes(me)) return;
    const mine = s.cards[me];
    if (!mine) return;
    if (s.event?.type === 'timeout' && s.event.by === me) queueTip('timeout');
    if (s.turn === me && s.forced) queueTip('forced');
    const myUp = isFaceUp(mine);
    const threat = !myUp && s.alive.some((seat) => seat !== me && isFaceUp(s.cards[seat])
      && Math.hypot(s.cards[seat].p[0] - mine.p[0], s.cards[seat].p[2] - mine.p[2]) < TUNE.threatRange);
    if (threat) queueTip('threat');
    if (myUp) queueTip('flipped');
    const { hx, hz } = world.table;
    if (Math.abs(mine.p[0]) > hx - EDGE_WARNING || Math.abs(mine.p[2]) > hz - EDGE_WARNING) queueTip('edge');
  }

  function onState(next, seat) {
    const entered = next.phase !== lastPhase ? next.phase : '';
    const wasLobby = lastPhase === 'lobby';
    lastPhase = next.phase;
    state = next;
    me = seat;
    if (next.phase !== 'lobby') {
      removeInvite();
      $('ftue-confirm').hidden = true;
      if (wasLobby && page >= 0) stashTutorial();
    }
    // Tips and the pointer run once per match; a finished match counts toward the first three.
    if (entered === 'roundIntro' && next.round === 1) {
      tipsShown = new Set();
      tipQueue = [];
      pointerDone = false;
    }
    if (entered === 'matchEnd') {
      if (matches === 0) track('firstMatch');
      matches += 1;
      saved.set('slam-ftue-matches', String(matches));
    }
    checkTips();
  }

  // Called every frame: the tip waits for any toast to clear, the first-turn pointer follows the card.
  function frame(now, canAim) {
    if (!tip.hidden && now > tipUntil) tip.hidden = true;
    if (tip.hidden && tipQueue.length && !toastVisible() && state?.phase === 'turn') {
      tip.querySelector('span').textContent = t(`tip.${tipQueue.shift()}`);
      tip.hidden = false;
      tipUntil = now + TIP_MS;
    }

    const showPointer = canAim && !pointerDone && !slammedOnce && matches === 0 && !disabled && state?.round === 1 && modal.hidden;
    point.hidden = !showPointer;
    if (!showPointer) return;
    // A slam pushes the card away from where the slipper lands, so the pointer sits behind the
    // card, on the side away from the nearest enemy. At this distance a flat slam flips the card
    // and slides it about 1.6 toward the enemy without anything leaving the table (checked with
    // the game's physics across the whole hand-shake range).
    const mine = world.cards[me]?.mesh.position;
    if (!mine) return;
    const enemies = state.alive.filter((s) => s !== me).map((s) => world.cards[s]?.mesh.position).filter(Boolean);
    const enemy = enemies.sort((a, b) => Math.hypot(a.x - mine.x, a.z - mine.z) - Math.hypot(b.x - mine.x, b.z - mine.z))[0];
    const dx = enemy ? enemy.x - mine.x : 1;
    const dz = enemy ? enemy.z - mine.z : 0;
    const len = Math.hypot(dx, dz) || 1;
    const target = { x: mine.x - (dx / len) * POINTER_BEHIND, z: mine.z - (dz / len) * POINTER_BEHIND };
    if (world.cardAt(target)) {
      point.hidden = true;
      return;
    }
    const at = world.toScreen(target.x, 0, target.z);
    point.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
    // The bubble must never cover the player's own card. Its outline on screen (the footprint's
    // corners) decides: the bubble hangs above or below the pulse, pushed clear of that outline, on
    // the side with room (on a laptop the card often sits level with the pulse, so "the other side
    // of the pulse" was not enough). Near the top it prefers below, keeping the turn banner clear.
    const corners = [[-0.6, -0.8], [0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]].map(([dx, dz]) => world.toScreen(mine.x + dx, 0, mine.z + dz).y);
    const cardTop = Math.min(...corners);
    const cardBottom = Math.max(...corners);
    const sayH = point.querySelector('.ftue-say').offsetHeight || 80;
    const gapAbove = Math.max(34, at.y - cardTop + 10); // bubble bottom this far above the pulse
    const gapBelow = Math.max(34, cardBottom - at.y + 10); // bubble top this far below it
    const roomAbove = at.y - gapAbove - sayH > 60;
    const roomBelow = at.y + gapBelow + sayH < innerHeight - 8;
    const below = !roomAbove || (roomBelow && at.y < 280);
    point.classList.toggle('below', below);
    point.style.setProperty('--gap', `${(below ? gapBelow : gapAbove).toFixed(0)}px`);
    // Keep the speech bubble (240 px wide, centred on the pulse) inside the screen.
    const centre = Math.min(Math.max(at.x, 128), innerWidth - 128);
    point.style.setProperty('--shift', `${(centre - at.x).toFixed(1)}px`);
  }

  function onSlam() {
    pointerDone = true;
    if (!slammedOnce) {
      slammedOnce = true;
      saved.set('slam-ftue-slammed', '1');
      track('firstSlam');
    }
    point.hidden = true;
  }

  function leaveRoom() {
    state = null;
    lastPhase = '';
    page = -1;
    modal.hidden = true;
    point.hidden = true;
    tip.hidden = true;
    $('ftue-confirm').hidden = true;
    removeInvite();
  }

  return {
    decorateLobby, confirmStart, onState, frame, onSlam, leaveRoom, closeHelp: () => toggleHelp(false),
    openTutorial: () => openTutorial(0),
    // a player's very first match: wind and slam types stay out of the way until they know the basics
    get firstMatch() { return matches === 0 && !disabled; },
  };
}
