// First-time help: an invite card in the lobby, five illustrated steps, a pointer on the very
// first turn, one-off tips during the first matches, and the "?" quick-rules panel.
// All copy comes from TEXTS.md section I.
import { TUNE } from './config.js';
import { isFaceUp } from './rules.js';

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

const card = (cls, x, y, r = 0, s = 0.44, extra = '') => `<i class="fa-c ${cls}${extra}" style="left:${x}px;top:${y}px;--r:${r}deg;--s:${s}"></i>`;
const label = (x, y, text) => `<span class="fa-lbl" style="left:${x}px;top:${y}px">${text}</span>`;
const verdict = (cls, x, y, mark) => `<span class="fa-v ${cls}" style="left:${x}px;top:${y}px">${mark}</span>`;
const cell = (x, y, top, bottom, mark, caption) => `<div class="fa-cell" style="left:${x}px;top:${y}px">${card(bottom, 60, 48, 6, 0.42)}${card(top, 46, 38, -14, 0.42)}${verdict(mark[0], 93, 18, mark[1])}<div class="fa-cap">${caption}</div></div>`;
const SLIPPER = '<svg class="fa-dep" style="left:90px;top:176px;--r:-40deg" viewBox="0 0 40 84" aria-hidden="true"><rect x="3" y="3" width="34" height="78" rx="17" fill="#f5f7ff" stroke="#2a1418" stroke-width="4"/><path d="M9 36 Q20 20 31 36" fill="none" stroke="#5b8def" stroke-width="7" stroke-linecap="round"/><circle cx="20" cy="24" r="3" fill="#2a1418"/></svg>';

// Pictures from the approved Claude Design mockup (mockup/ftue-preview), 250x300 each.
const PAGES = [
  {
    title: 'LẬT BÀI, ĂN ĐỐI THỦ!',
    body: '<p>Đập cho bài m <b>ngửa</b> lên, rồi đè lên bài <b>úp</b> của đối thủ để ăn.</p><p>Thắng 2 ván là thắng trận!</p>',
    art: `${card('pb', 140, 150, 6, 0.62)}${card('bf', 118, 128, -16, 0.62)}<span class="fa-pop" style="left:150px;top:62px">ĂN!</span>${label(70, 236, 'bài m: NGỬA')}${label(186, 236, 'bài địch: ÚP')}`,
  },
  {
    title: 'NHẮM CHO CHUẨN!',
    body: '<p>Chọn điểm đập trong <b>vòng đen</b> quanh bài. Càng sát, lực càng mạnh.</p><p>Không đập lên lá bài được. Tay m sẽ hơi run đấy.</p>',
    touch: '<p>Kéo để ngắm, thả để đập.</p>',
    art: `<span class="fa-ring fa-reach" style="left:125px;top:140px;width:200px;height:200px"></span>${card('bb', 125, 140, -4, 0.55)}<span class="fa-ring fa-shake" style="left:90px;top:176px"></span>${SLIPPER}<svg class="fa-trail" viewBox="0 0 250 300" aria-hidden="true"><path d="M125 140 L190 88" stroke="#2a1418" stroke-width="6" stroke-dasharray="2 9" stroke-linecap="round" fill="none"/><path d="M190 88 l-14 1 m14 -1 l-4 13" stroke="#2a1418" stroke-width="5" stroke-linecap="round" fill="none"/></svg>${label(125, 258, 'vòng đen = tầm với của m')}${label(62, 214, 'dép rơi đây')}`,
  },
  {
    title: 'NGỬA ĂN ÚP!',
    body: '<p>Bài ngửa phải <b>đè hẳn</b> lên bài úp mới ăn được.</p><p>Địch tự đập bài nó lật úp nằm dưới bài m ngửa thì m vẫn ăn!</p><p>Chơi 3–4 người, bị ăn là <b>bị loại</b>!</p>',
    art: cell(8, 8, 'bf', 'pb', ['ok', '✓'], 'M ăn!') + cell(129, 8, 'pf', 'bb', ['bad', '✗'], 'M bị ăn!')
      + cell(8, 132, 'bb', 'pb', ['no', '–'], 'Cả hai úp') + cell(129, 132, 'bf', 'pf', ['no', '–'], 'Cả hai ngửa'),
  },
  {
    title: 'ĐỪNG LÀM RỚT BÀI!',
    body: '<p>Làm <b>bất kỳ lá bài nào</b> rớt khỏi bàn là m bị loại ngay!</p><p>Muốn chơi an toàn thì đừng đập quá mạnh gần mép bàn.</p>',
    art: `<span class="fa-floor"></span>${card('bb', 58, 96, -4, 0.46)}<svg class="fa-trail" viewBox="0 0 250 300" aria-hidden="true"><path d="M160 168 Q205 120 224 86" stroke="#fff" stroke-width="12" stroke-linecap="round" fill="none" opacity=".95"/></svg>${card('pb', 160, 172, 8, 0.46)}${card('pf', 226, 72, 38, 0.46, ' fa-air')}<span class="fa-ring fa-impact" style="left:118px;top:200px"></span>${label(118, 230, 'm đập đây')}${label(224, 128, 'RỚT!')}<span class="fa-v bad fa-out" style="left:110px;top:270px">M BỊ LOẠI</span>`,
  },
  {
    title: 'CÒN VÀI CHIÊU NỮA!',
    body: '<p><b>Gió</b> có thể làm bài bay lệch. M có thể đổi kiểu <b>đập bằng</b> hoặc <b>nghiêng</b>.</p><p>Bỏ lượt thì lượt sau buộc phải đập trong <b>vòng hồng</b>. Mỗi lượt có 30 giây thôi!</p>',
    art: `<div class="fa-tools"><span class="fa-wind"><svg width="34" height="16" viewBox="0 0 34 16" aria-hidden="true"><path d="M2 8 H28 M20 2 L30 8 L20 14" fill="none" stroke="#2a1418" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg> GIÓ 4</span><span class="fa-type sel">Đập bằng · Q</span><span class="fa-type">Đập nghiêng · E</span></div><span class="fa-ring fa-reach" style="left:125px;top:215px;width:120px;height:120px"></span><span class="fa-ring fa-forced" style="left:125px;top:215px"></span>${card('bb', 125, 215, -4, 0.36)}`,
  },
];

const RULES = [
  ['ok', '✓', 'M ngửa đè địch úp = ăn'],
  ['bad', '✗', 'Địch ngửa đè m úp = bị ăn'],
  ['bad', '✗', 'M đập làm rớt bài = bị loại'],
  ['no', '–', 'Cùng mặt hoặc chỉ chạm = đánh tiếp'],
  ['no', '!', 'Vừa bỏ lượt = phải đập trong vòng hồng'],
  ['no', '!', 'Hết 30 giây = mất lượt'],
];

const TIPS = {
  flipped: 'Ngửa rồi kìa! Giờ tìm cách đè bài địch!',
  threat: 'Bài địch đang ngửa sát bài m, coi chừng bị đè!',
  edge: 'Sát mép rồi! Đập mạnh là bay luôn đấy!',
  forced: 'Bỏ lượt rồi nhé! Giờ phải đập trong vòng hồng.',
  timeout: 'Hết giờ là mất lượt đấy!',
};

export function createFtue({ send, world, touch, toastVisible, hidePanels }) {
  const disabled = new URLSearchParams(location.search).has('noftue');
  let seen = saved.get('slam-ftue') === 'seen';
  let matches = Number(saved.get('slam-ftue-matches')) || 0;
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
          <div class="ftue-foot"><div class="ftue-pips"></div><button type="button" class="ftue-skip">Bỏ qua</button><button type="button" class="btn pri ftue-next">Tiếp</button></div>
        </div>
      </div>
    </div>
    <div id="ftue-confirm" class="ftue-confirm" hidden>
      <div class="menu-card ftue-side">
        <h2 class="ftue-h"></h2>
        <p class="ftue-p"></p>
        <div class="row"><button type="button" class="btn pri" id="ftue-go">Bắt đầu luôn</button><button type="button" class="btn" id="ftue-wait">Đợi tí</button></div>
      </div>
    </div>
    <div id="help-panel" class="panel-box help-panel" hidden>
      <h2>NHỚ 6 ĐIỀU NÀY!</h2>
      <div class="rules-grid">${RULES.map(([cls, mark, text]) => `<div class="rule"><span class="fa-v ${cls}">${mark}</span>${text}</div>`).join('')}</div>
      <div class="row help-actions"><button type="button" class="btn" id="help-replay">Xem lại hướng dẫn</button><button type="button" class="btn" id="close-help">Đóng</button></div>
    </div>
    <div id="ftue-bubble" class="ftue-bubble" hidden></div>
    <div id="ftue-tip" class="ftue-tip" hidden><i>MẸO</i><span></span></div>
    <div id="ftue-point" class="ftue-point" hidden><span class="ftue-pulse"></span><span class="ftue-say">Thử đập <b>sát bài m</b> xem nào!</span></div>`);

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
    modal.querySelector('.ftue-step').textContent = `CÁCH CHƠI · ${i + 1}/${STEPS}`;
    modal.querySelector('#ftue-title').textContent = p.title;
    modal.querySelector('.ftue-body').innerHTML = p.body + (touch && p.touch ? p.touch : '');
    modal.querySelector('.ftue-pips').innerHTML = PAGES.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('');
    modal.querySelector('.ftue-next').textContent = i === STEPS - 1 ? 'Chiến thôi!' : 'Tiếp';
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
    else closeModal();
  };
  modal.querySelector('.ftue-skip').onclick = closeModal;

  // The match started while the steps were open: put them away behind "?" and say where they went.
  function stashTutorial() {
    resumeAt = page;
    closeModal();
    helpButton.classList.add('dot');
    const bubble = $('ftue-bubble');
    bubble.innerHTML = `Hướng dẫn cất ở đây. Bấm <b>?</b> xem tiếp từ bước <b>${resumeAt + 1}/${STEPS}</b>.`;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 4000);
  }

  function toggleHelp(open = help.hidden) {
    if (open) hidePanels();
    help.hidden = !open;
    $('ftue-bubble').hidden = true;
    $('help-replay').textContent = resumeAt !== null ? `Xem tiếp từ bước ${resumeAt + 1}/${STEPS}` : 'Xem lại hướng dẫn';
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
        <h2 class="ftue-h">Lần đầu đập bài à?</h2>
        <p class="ftue-p">Xem hướng dẫn nhanh 1 phút nhé. Không khó đâu!</p>
        <button type="button" class="btn pri wide" id="ftue-yes">Chỉ t chơi</button>
        <button type="button" class="ftue-no" id="ftue-no">Biết chơi rồi</button>
      </div>`);
    $('ftue-yes').onclick = () => openTutorial(0);
    $('ftue-no').onclick = () => { remember(); removeInvite(); };
  }

  // Starting while someone is still reading asks once. Returns false when nothing needs asking.
  function confirmStart(go, nameOf) {
    const reading = Object.entries(state?.players ?? {}).filter(([seat, p]) => seat !== me && p.tutorial > 0 && p.connected);
    if (!reading.length) return false;
    const [seat, p] = reading[0];
    const box = $('ftue-confirm');
    box.querySelector('.ftue-h').textContent = `${nameOf(seat)} đang học luật`;
    box.querySelector('.ftue-p').innerHTML = `Nó mới xem tới bước <b>${p.tutorial}/${STEPS}</b>. Bắt đầu luôn thì nó xem tiếp trong trận được.`;
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
      matches += 1;
      saved.set('slam-ftue-matches', String(matches));
    }
    checkTips();
  }

  // Called every frame: the tip waits for any toast to clear, the first-turn pointer follows the card.
  function frame(now, canAim) {
    if (!tip.hidden && now > tipUntil) tip.hidden = true;
    if (tip.hidden && tipQueue.length && !toastVisible() && state?.phase === 'turn') {
      tip.querySelector('span').textContent = TIPS[tipQueue.shift()];
      tip.hidden = false;
      tipUntil = now + TIP_MS;
    }

    const showPointer = canAim && !pointerDone && matches === 0 && !disabled && state?.round === 1 && modal.hidden;
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
    // Keep the speech bubble (240 px wide, centred on the pulse) inside the screen.
    const centre = Math.min(Math.max(at.x, 128), innerWidth - 128);
    point.style.setProperty('--shift', `${(centre - at.x).toFixed(1)}px`);
  }

  function onSlam() {
    pointerDone = true;
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

  return { decorateLobby, confirmStart, onState, frame, onSlam, leaveRoom, closeHelp: () => toggleHelp(false) };
}
