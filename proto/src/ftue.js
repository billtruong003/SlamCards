// First-time help (task 1.11, mockup v25). The seven steps, each with a clip of the real game:
// forced once at a new player's first match (the server holds round 1 while they read), rotating
// on the quick-match wait, and replayed from "?". Then a pointer on the very first turn, one-off tips
// in the first matches, and a reminder clip the first time slam types, wind or the pink ring come up.
// Copy: locale keys tut.*, ftue.*, tip.*.
import { TUNE } from './config.js';
import { isFaceUp, ROUNDS_TO_WIN, TURN_MS } from './rules.js';
import { t } from './i18n.js';
import { STEPS, REMINDERS } from './tutorial.js';

const N = STEPS.length;
const TIP_MATCHES = 3;
const TIP_MS = 3500;
const EDGE_WARNING = 1.2;
const POINTER_BEHIND = 1.3;
const SKIP_LOCK_MS = 3000; // the first match's steps: "skip" opens after this
const QUEUE_STEP_MS = 6000; // the quick-match wait shows each step this long
const BUBBLE_MS = 8000;

const memory = {};
const saved = {
  get(key) { try { return localStorage.getItem(key) ?? memory[key] ?? null; } catch { return memory[key] ?? null; } },
  set(key, value) { memory[key] = value; try { localStorage.setItem(key, value); } catch { /* private mode */ } },
};

// Files as full addresses: relative ones resolve against the page, which is wrong under /slam-cards/.
const asset = (file) => new URL(file, document.baseURI).href;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pips = (at) => STEPS.map((_, k) => `<i class="${k <= at ? 'on' : ''}"></i>`).join('');

// A clip with its captions: the video plays muted on a loop, and the caption under way (STEPS cues,
// in the player's language) is laid over it. Nothing loads until a step is shown; the browser takes
// the MP4, or the WebM where it has no H.264 (open-source Chromium builds).
const SOURCES = [['mp4', 'video/mp4'], ['webm', 'video/webm']];
function mountClip(box) {
  box.insertAdjacentHTML('afterbegin', '<video muted loop playsinline preload="none" disablepictureinpicture></video><span class="tut-cap" hidden></span>');
  box.setAttribute('aria-hidden', 'true'); // the step's own words say it all
  const video = box.querySelector('video');
  const cap = box.querySelector('.tut-cap');
  let step = -1;
  const sync = () => {
    const cues = STEPS[step]?.cues ?? [];
    const k = cues.findIndex(([from, to]) => video.currentTime >= from && video.currentTime <= to);
    cap.hidden = k < 0;
    if (k < 0) return;
    cap.textContent = t(`tut.s${step + 1}.c${k + 1}`);
    cap.classList.toggle('pink', cues[k][2]);
  };
  for (const e of ['timeupdate', 'seeked', 'loadedmetadata']) video.addEventListener(e, sync);
  return {
    show(i) {
      if (i === step) return;
      step = i;
      cap.hidden = true;
      video.poster = asset(`tutorial/${STEPS[i].clip}.jpg`);
      video.innerHTML = SOURCES.map(([ext, type]) => `<source src="${asset(`tutorial/${STEPS[i].clip}.${ext}`)}" type="${type}">`).join('');
      video.load();
      // reduced motion: the poster stays until the player presses play; a blocked autoplay keeps it too
      if (reducedMotion) video.controls = true;
      else video.play().catch(() => {});
    },
    stop() {
      step = -1;
      video.pause();
      video.innerHTML = '';
      video.load(); // lets the browser drop the download and the decoder
    },
  };
}

// track(name): a first-steps moment for the server's counts (server/metrics.js CLIENT_EVENTS).
export function createFtue({ send, track = () => {}, world, touch, toastVisible, hidePanels }) {
  const device = touch ? 'touch' : 'mouse';
  const disabled = new URLSearchParams(location.search).has('noftue');
  let matches = Number(saved.get('slam-ftue-matches')) || 0;
  // Steps seen, kept as "1257"; all seven = read through. Players from before the seven steps (who
  // opened the old five or played a match) count as having read them.
  const seenRaw = saved.get('slam-tut-seen');
  const seen = seenRaw === null && (saved.get('slam-ftue') === 'seen' || matches > 0)
    ? new Set(STEPS.keys())
    : new Set([...(seenRaw ?? '')].map((c) => Number(c) - 1).filter((i) => i >= 0 && i < N));
  if (seenRaw === null) saved.set('slam-tut-seen', [...seen].map((i) => i + 1).join(''));
  const reminded = new Set((saved.get('slam-tut-tips') ?? '').split(',').filter(Boolean));
  // the pointer is for a player who has never slammed; a reload mid-match must not bring it back (QA-05)
  let slammedOnce = saved.get('slam-ftue-slammed') === '1';
  let page = -1;
  let mode = null; // the steps open as 'first' (the first match, round 1 waits) or 'replay'
  let lockUntil = 0;
  let lockTimer = 0;
  let resumeAt = null;
  let shownThisMatch = false;
  let state = null;
  let me = null;
  let lastPhase = '';
  let tipsShown = new Set();
  let tipQueue = [];
  let tipUntil = 0;
  let pointerDone = false;
  let bubbleTimer = 0;
  let reminder = null;
  let queue = null;

  const learner = () => !disabled && seen.size < N;
  const firstUnseen = () => Math.max(0, STEPS.findIndex((_, i) => !seen.has(i)));
  function markSeen(i) {
    if (seen.has(i)) return;
    seen.add(i);
    saved.set('slam-tut-seen', [...seen].sort().map((k) => k + 1).join(''));
  }
  const vars = { q: touch ? '' : ' (Q)', e: touch ? '' : ' (E)', two: TURN_MS.two / 1000, more: TURN_MS.crowded / 1000, n: ROUNDS_TO_WIN };
  // a step's words into a card: its number, title, body and the device's extra line if it has one
  function fillStep(root, i) {
    root.querySelector('.ftue-step').textContent = t('ftue.step', { n: i + 1, total: N });
    root.querySelector('.ftue-pips').innerHTML = pips(i);
    root.querySelector('.tut-title').textContent = t(`tut.s${i + 1}.title`);
    const hint = STEPS[i].hint?.includes(device) ? `<p class="tut-hint">${t(`tut.s${i + 1}.hint.${device}`)}</p>` : '';
    root.querySelector('.tut-body').innerHTML = `<p>${t(`tut.s${i + 1}.body`, vars)}</p>${hint}`;
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="ftue-modal" class="ftue-modal" hidden>
      <p class="tut-banner">${t('tut.firstMatch')}</p>
      <div class="ftue-card tut-card" role="dialog" aria-modal="true" aria-labelledby="ftue-title">
        <div class="tut-clip"></div>
        <div class="ftue-txt">
          <div class="ftue-step"></div>
          <h2 id="ftue-title" class="tut-title"></h2>
          <div class="tut-body"></div>
          <div class="ftue-foot"><div class="ftue-pips"></div><button type="button" class="ftue-skip"></button><button type="button" class="btn pri ftue-next"></button></div>
        </div>
      </div>
    </div>
    <div id="tut-remind" class="tut-remind" role="dialog" aria-labelledby="tut-remind-h" hidden>
      <div class="tut-rhead"><i>${t('tip.label')}</i><span id="tut-remind-h"></span></div>
      <div class="tut-clip"></div>
      <div class="tut-rfoot"><p></p><button type="button" class="btn pri">${t('tut.gotIt')}</button></div>
    </div>
    <div id="ftue-bubble" class="ftue-bubble" hidden></div>
    <div id="ftue-tip" class="ftue-tip" hidden><i>${t('tip.label')}</i><span></span></div>
    <div id="ftue-point" class="ftue-point" hidden><span class="ftue-pulse"></span><span class="ftue-say">${t('ftue.pointer')}<small>${t('ftue.pointerGoal')}</small></span></div>`);

  const $ = (id) => document.getElementById(id);
  const modal = $('ftue-modal');
  const modalClip = mountClip(modal.querySelector('.tut-clip'));
  const skip = modal.querySelector('.ftue-skip');
  const next = modal.querySelector('.ftue-next');
  const remind = $('tut-remind');
  const remindClip = mountClip(remind.querySelector('.tut-clip'));
  const bubble = $('ftue-bubble');
  const helpButton = $('help');
  const point = $('ftue-point');
  const tip = $('ftue-tip');

  // the server hears where the player is in the steps, and whether they still have to read them through
  const shareStep = () => { if (state) send({ t: 'ftue', step: page >= 0 ? page + 1 : 0, learner: learner() }); };

  // ---------- the steps ----------

  // "Skip": none on the last step of the first match, locked for its first seconds (shown counting down)
  function renderSkip() {
    const left = Math.ceil((lockUntil - Date.now()) / 1000);
    skip.hidden = mode === 'first' && page === N - 1;
    skip.disabled = left > 0;
    skip.textContent = left > 0 ? t('ftue.skipIn', { n: left }) : t('ftue.skip');
    clearTimeout(lockTimer);
    // next when the shown second changes (a few ms after, so the count has really moved on)
    if (left > 0) lockTimer = setTimeout(renderSkip, ((lockUntil - Date.now()) % 1000 || 1000) + 15);
  }

  function showPage(i) {
    page = i;
    markSeen(i);
    fillStep(modal, i);
    modalClip.show(i);
    next.textContent = t(i === N - 1 ? 'ftue.done' : 'ftue.next');
    renderSkip();
    modal.hidden = false;
    next.focus();
    shareStep();
  }

  function openSteps(how, at) {
    track('tutorialOpened');
    mode = how;
    resumeAt = null;
    helpButton.classList.remove('dot');
    hideBubble();
    hideReminder();
    hidePanels();
    lockUntil = how === 'first' ? Date.now() + SKIP_LOCK_MS : 0;
    modal.classList.toggle('first', how === 'first');
    showPage(at);
  }

  function closeSteps() {
    const wasFirst = mode === 'first';
    page = -1;
    mode = null;
    clearTimeout(lockTimer);
    modal.hidden = true;
    modalClip.stop();
    shareStep();
    // after the first match's steps: where to find them again
    if (wasFirst) showBubble(`${t('tut.findAgain', { n: N })} <button type="button" class="btn pri" id="ftue-bubble-ok">${t('tut.ok')}</button>`);
  }

  next.onclick = () => {
    if (page < N - 1) {
      showPage(page + 1);
      return;
    }
    track('tutorialDone');
    closeSteps();
  };
  skip.onclick = () => {
    if (skip.disabled) return;
    track('tutorialSkipped');
    closeSteps();
  };

  // Round 1 went on without the reader (they took longer than the server waits): the steps go
  // behind "?", which says where they were.
  function stashSteps() {
    resumeAt = page;
    mode = 'replay';
    closeSteps();
    helpButton.classList.add('dot');
    showBubble(t('ftue.stashed', { n: resumeAt + 1, total: N }));
  }

  function showBubble(html) {
    bubble.innerHTML = html;
    bubble.hidden = false;
    const ok = $('ftue-bubble-ok');
    if (ok) ok.onclick = hideBubble;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, BUBBLE_MS);
  }
  function hideBubble() {
    clearTimeout(bubbleTimer);
    bubble.hidden = true;
  }

  helpButton.onclick = () => {
    track('rulesOpened');
    openSteps('replay', resumeAt ?? 0);
  };
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!modal.hidden) {
      if (e.key === 'Enter' && e.target !== skip) {
        e.preventDefault();
        next.click();
      }
      if (e.key === 'Escape' && !skip.hidden) skip.click();
      return;
    }
    if (queue && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) queue.step(e.key === 'ArrowLeft' ? -1 : 1);
    if (e.key === 'h' || e.key === 'H') helpButton.click();
  });

  // ---------- the quick-match wait: the steps rotate beside the queue ----------

  // The card for the queue screen (main.js renderQueue); queueStart wires it once it is on the page.
  const queueHtml = () => `
    <div class="panel menu-card tut-queue">
      <div class="tut-clip"><span class="tut-pill">${t('tut.queue.pill')}</span></div>
      <div class="tut-qtxt">
        <div class="tut-qhead"><div class="ftue-step"></div><div class="ftue-pips"></div></div>
        <h2 class="tut-title"></h2>
        <div class="tut-body"></div>
        <div class="tut-qnav">
          <button type="button" class="btn tut-prev" aria-label="${t('tut.queue.prev')}">‹</button>
          <div class="tut-qtime"><small>${t(touch ? 'tut.queue.auto' : 'tut.queue.autoKeys', { n: QUEUE_STEP_MS / 1000 })}</small><span class="tut-bar"><i></i></span></div>
          <button type="button" class="btn pri tut-nxt" aria-label="${t('tut.queue.next')}">›</button>
        </div>
      </div>
    </div>`;

  let queueAt = -1;
  function queueStart(root) {
    queueStop();
    const clip = mountClip(root.querySelector('.tut-clip'));
    const bar = root.querySelector('.tut-bar');
    let timer = 0;
    const show = (i) => {
      queueAt = (i + N) % N;
      fillStep(root, queueAt);
      clip.show(queueAt);
      bar.innerHTML = `<i style="animation-duration:${QUEUE_STEP_MS}ms"></i>`; // a fresh bar restarts its fill
      clearTimeout(timer);
      timer = setTimeout(() => step(1, true), QUEUE_STEP_MS);
    };
    // a step shown its full time, or passed on by the player, counts as seen
    const step = (by, read = by > 0) => {
      if (!root.isConnected) {
        queueStop();
        return;
      }
      if (read) markSeen(queueAt);
      show(queueAt + by);
    };
    root.querySelector('.tut-prev').onclick = () => step(-1);
    root.querySelector('.tut-nxt').onclick = () => step(1);
    queue = { step, stop: () => { clearTimeout(timer); clip.stop(); } };
    show(queueAt >= 0 ? queueAt : learner() ? firstUnseen() : 0);
  }
  function queueStop() {
    queue?.stop();
    queue = null;
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
    const myUp = isFaceUp(mine);
    const threat = !myUp && s.alive.some((seat) => seat !== me && isFaceUp(s.cards[seat])
      && Math.hypot(s.cards[seat].p[0] - mine.p[0], s.cards[seat].p[2] - mine.p[2]) < TUNE.threatRange);
    if (threat) queueTip('threat');
    if (myUp) queueTip('flipped');
    const { hx, hz } = world.table;
    if (Math.abs(mine.p[0]) > hx - EDGE_WARNING || Math.abs(mine.p[2]) > hz - EDGE_WARNING) queueTip('edge');
  }

  // A reminder replays a step's clip the first time its feature comes up on the player's turn:
  // the pink ring (any match), the slam types and the wind (hidden in the first match, ftue.firstMatch).
  remind.querySelector('.btn').onclick = () => hideReminder();
  function checkReminders() {
    const s = state;
    if (disabled || reminder || !modal.hidden || s.phase !== 'turn' || s.turn !== me) return;
    const due = [
      ['forced', s.forced],
      ['types', matches > 0],
      ['wind', matches > 0 && s.wind?.strength > 0],
    ].find(([kind, now]) => now && !reminded.has(kind));
    if (!due) return;
    const kind = due[0];
    reminder = kind;
    reminded.add(kind);
    saved.set('slam-tut-tips', [...reminded].join(','));
    remind.className = `tut-remind ${kind}`;
    $('tut-remind-h').textContent = t(`tut.remind.${kind}.title`);
    remind.querySelector('.tut-rfoot p').innerHTML = t(`tut.remind.${kind}.body`);
    remindClip.show(REMINDERS[kind] - 1);
    remind.hidden = false;
    if (kind === 'types') $('toggle').classList.add('tut-pulse');
  }
  function hideReminder() {
    if (!reminder) return;
    reminder = null;
    remind.hidden = true;
    remindClip.stop();
    $('toggle').classList.remove('tut-pulse');
  }

  function onState(nextState, seat) {
    const entered = nextState.phase !== lastPhase ? nextState.phase : '';
    const left = entered ? lastPhase : '';
    lastPhase = nextState.phase;
    state = nextState;
    me = seat;
    // Tips and the pointer run once per match; a finished match counts toward the first three.
    if (entered === 'roundIntro' && nextState.round === 1) {
      tipsShown = new Set();
      tipQueue = [];
      pointerDone = false;
    }
    // the first match of someone still learning: the steps, while the server holds round 1 for them
    if (nextState.phase === 'roundIntro' && nextState.round === 1 && nextState.reading?.includes(me)
      && !shownThisMatch && modal.hidden && learner()) {
      shownThisMatch = true;
      openSteps('first', firstUnseen());
    }
    if (left === 'roundIntro' && !modal.hidden && mode === 'first') stashSteps();
    if (entered === 'matchEnd') {
      if (matches === 0) track('firstMatch');
      matches += 1;
      saved.set('slam-ftue-matches', String(matches));
      shownThisMatch = false;
    }
    if (reminder && (nextState.phase !== 'turn' || nextState.turn !== me)) hideReminder();
    checkReminders();
    checkTips();
  }

  // Called every frame: the tip waits for any toast to clear, the first-turn pointer follows the card.
  function frame(now, canAim) {
    if (!tip.hidden && now > tipUntil) tip.hidden = true;
    if (tip.hidden && tipQueue.length && !toastVisible() && !reminder && state?.phase === 'turn') {
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
    const corners = [[-0.6, -0.8], [0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]].map(([cx, cz]) => world.toScreen(mine.x + cx, 0, mine.z + cz).y);
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
    hideReminder();
  }

  function leaveRoom() {
    state = null;
    lastPhase = '';
    shownThisMatch = false;
    if (!modal.hidden) closeSteps();
    point.hidden = true;
    tip.hidden = true;
    hideReminder();
    hideBubble();
  }

  return {
    onState, frame, onSlam, leaveRoom, queueHtml, queueStart, queueStop,
    openTutorial: () => openSteps('replay', 0),
    // just in a room: the server learns whether this player still has the steps to read
    joined: () => send({ t: 'ftue', step: 0, learner: learner() }),
    // a player's very first match: wind and slam types stay out of the way until they know the basics
    get firstMatch() { return matches === 0 && !disabled; },
  };
}
