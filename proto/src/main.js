import * as THREE from 'three';
import { World } from './world.js';
import { Visuals } from './visuals.js';
import { TUNE } from './config.js';
import { SEATS, SEAT_LABEL, ROUNDS_TO_WIN, FALL_Y, MAX_PLAYERS } from './rules.js';
import { thump } from './sound.js';
import { playMusic, refreshMusic } from './music.js';
import { getLevel, setLevel } from './audio.js';
import { mountMenuBackground } from './menu-bg.js';
import { playIntro } from './intro.js';
import { loadDeps, depModel, DEPS, DEFAULT_DEP } from './deps.js';
import { showMeme, preloadMemes, setMemesEnabled, memesEnabled } from './memes.js';

const $ = (id) => document.getElementById(id);
const els = {
  hud: $('hud'), players: $('players'), banner: $('banner'), hint: $('hint'), toggle: $('toggle'),
  overlay: $('overlay'), labels: $('labels'), toast: $('toast'), windArrow: $('wind-arrow'),
  windText: $('wind-text'), windBars: $('wind-bars'), wind: $('wind'), flat: $('type-flat'), tilt: $('type-tilt'),
  ping: $('ping'), fps: $('fps'), settings: $('settings'), panel: $('sound-panel'),
  info: $('info'), infoPanel: $('info-panel'),
};

async function copyText(text, field) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    field.select();
    return document.execCommand('copy');
  }
}

playIntro();
const world = await World.create($('stage'));
const visuals = new Visuals(world.scene);

let ws = null;
let me = null;
let roomCode = new URLSearchParams(location.search).get('room')?.toUpperCase() || null;
let state = null;
let stateAt = 0;
let slamType = 'flat';
let pointer = null;
let sim = null;
let playback = null;
let awaitingServer = false;
let appliedCardsKey = '';
let overlayKey = '';
let hudKey = '';
let lastWindKey = '';
let lastEventKey = '';
let pointerMoved = false;
let lastPong = performance.now();
let pingMs = 0;
let memeEventKey = '';
let memePhaseKey = '';
let flippedRound = 0;
let lastSlamStats = null;
let memesPreloaded = false;

const TOUCH = matchMedia('(pointer: coarse)').matches;
if (TOUCH) {
  document.getElementById('type-flat').textContent = 'Đập bằng';
  document.getElementById('type-tilt').textContent = 'Đập nghiêng';
}
const RPS_ICON = { bua: '✊', keo: '✌️', bao: '✋' };
const RPS_LABEL = { bua: 'Búa', keo: 'Kéo', bao: 'Bao' };

const nameOf = (seat) => state?.players[seat]?.name || SEAT_LABEL[seat];
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const htmlName = (seat) => `<b class="seat-${seat}">${escapeHtml(nameOf(seat))}</b>`;
const opponentsOf = (seat) => (state?.alive ?? []).filter((s) => s !== seat);

const storage = {
  get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* private mode */ } },
};

const playerName = {
  get: () => { try { return localStorage.getItem('slam-name') || ''; } catch { return ''; } },
  set: (name) => { try { localStorage.setItem('slam-name', name); } catch { /* private mode */ } },
};

const playerDep = {
  get: () => { try { return localStorage.getItem('slam-dep') || ''; } catch { return ''; } },
  set: (dep) => { try { localStorage.setItem('slam-dep', dep); } catch { /* private mode */ } },
};
const depOf = (seat) => state?.players[seat]?.dep ?? DEFAULT_DEP[seat];

function joinRoom(code) {
  roomCode = code;
  send({ t: 'join', code, token: storage.get(`slam-token-${code}`), name: playerName.get(), dep: playerDep.get() || undefined });
}

// ---------- sound settings ----------

const SLIDERS = [['music', 'Nhạc nền'], ['meme', 'Meme'], ['sfx', 'Tiếng dép']];
els.panel.innerHTML = `
  <h2>Âm thanh</h2>
  ${SLIDERS.map(([key, label]) => `
    <label class="vol">${label}
      <input type="range" min="0" max="100" step="5" value="${Math.round(getLevel(key) * 100)}" data-vol="${key}">
      <output>${Math.round(getLevel(key) * 100)}</output>
    </label>`).join('')}
  <label class="check"><input type="checkbox" id="memes-on" ${memesEnabled() ? 'checked' : ''}> Bật meme</label>
  <button class="btn" id="close-panel">Đóng</button>`;
els.panel.querySelectorAll('[data-vol]').forEach((input) => {
  input.oninput = () => {
    const value = Number(input.value) / 100;
    setLevel(input.dataset.vol, value);
    input.nextElementSibling.textContent = input.value;
    if (input.dataset.vol === 'music') refreshMusic();
  };
  input.onchange = () => {
    if (input.dataset.vol === 'meme') showMeme('pass');
    if (input.dataset.vol === 'sfx') thump(0.8);
  };
});
$('memes-on').onchange = (e) => setMemesEnabled(e.target.checked);
els.settings.onclick = () => {
  els.panel.hidden = !els.panel.hidden;
  els.infoPanel.hidden = true;
};
els.info.onclick = () => {
  els.infoPanel.hidden = !els.infoPanel.hidden;
  els.panel.hidden = true;
};
$('close-info').onclick = () => { els.infoPanel.hidden = true; };
$('close-panel').onclick = () => { els.panel.hidden = true; };

// ---------- network ----------

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${location.pathname.replace(/[^/]*$/, '')}ws`);
  ws.onopen = () => {
    if (!roomCode) renderMenu();
    else if (playerName.get() || storage.get(`slam-token-${roomCode}`)) joinRoom(roomCode);
    else renderNamePrompt(roomCode);
  };
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  ws.onclose = () => {
    showToast('Rớt mạng rồi! Đang kết nối lại…');
    setTimeout(connect, 1500);
  };
}

function send(msg) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function onMessage(msg) {
  if (msg.t === 'joined') {
    me = msg.color;
    roomCode = msg.code;
    storage.set(`slam-token-${roomCode}`, msg.token);
    history.replaceState(null, '', `?room=${roomCode}`);
    hideToast();
  } else if (msg.t === 'error') {
    roomCode = null;
    history.replaceState(null, '', location.pathname);
    renderMenu(msg.message);
  } else if (msg.t === 'state') {
    onState(msg);
  } else if (msg.t === 'playStart') {
    startPlayback(msg);
  } else if (msg.t === 'playChunk') {
    playback?.buffer.push(...msg.frames);
  } else if (msg.t === 'playEnd') {
    if (playback) {
      playback.final = msg.final;
      playback.ended = true;
    }
  } else if (msg.t === 'playAbort') {
    playback = null;
  } else if (msg.t === 'pong') {
    lastPong = performance.now();
    pingMs = Math.round(lastPong - msg.at);
  } else if (msg.t === 'passed') {
    if (msg.impact) {
      const at = new THREE.Vector3(msg.impact.x, 0, msg.impact.z);
      visuals.dropDep(at, () => impactFx(at, 0.25, 0.4), depOf(msg.by));
    }
    showToast(msg.timeout ? `${nameOf(msg.by)} hết giờ, mất lượt!` : `${nameOf(msg.by)} bỏ lượt rồi!`, 1500);
  } else if (msg.t === 'autoSlam') {
    autoSlam();
  }
}

function onState(next) {
  state = next;
  stateAt = performance.now();
  if (awaitingServer && !(state.phase === 'turn' && state.turn === me)) awaitingServer = false;

  if (state.seats.length >= 2) world.setup(state.seats);
  const key = JSON.stringify(state.cards);
  if (state.seats.length >= 2 && !sim && !playback && key !== appliedCardsKey && state.phase !== 'anim') {
    world.setCards(state.cards);
    appliedCardsKey = key;
  }

  const gone = Object.keys(state.players).filter((s) => s !== me && !state.players[s].connected && !state.players[s].left);
  if (gone.length) showToast(`${gone.map(nameOf).join(', ')} rớt mạng! Đợi tối đa 60 giây…`);
  else if (els.toast.dataset.sticky) hideToast();

  announceEvent();
  reactWithMemes();
  playMusic(['lobby', 'matchEnd'].includes(state.phase) ? 'menu' : 'game');
  renderHud();
  renderOverlay();
  world.needsRender = true;
}

// Mid-round knockouts in 3-4 player games get a short toast.
function announceEvent() {
  const event = state.event;
  const key = event ? `${state.round}-${event.type}-${event.by}-${event.eliminated}` : '';
  if (key === lastEventKey) return;
  lastEventKey = key;
  if (!event?.eliminated?.length || state.phase === 'roundEnd') return;
  const out = event.eliminated.map(nameOf).join(', ');
  const text = event.type === 'fall' ? `${nameOf(event.by)} đập rớt bài! Bị loại!`
    : event.type === 'left' ? `${out} nghỉ chơi rồi.` : `${nameOf(event.by)} ăn bài của ${out}!`;
  showToast(text, 2500);
}

// ---------- meme reactions ----------

// How far each card travelled and how many half-turns it made during the last slam.
function slamStats(frames, by) {
  if (!frames?.length) return null;
  const i = world.seats.indexOf(by);
  if (i < 0) return null;
  const o = i * 7;
  const first = frames[0];
  const last = frames[frames.length - 1];
  let halfTurns = 0;
  let prevUp = null;
  for (const f of frames) {
    const up = 1 - 2 * (f[o + 3] ** 2 + f[o + 5] ** 2) > 0;
    if (prevUp !== null && up !== prevUp) halfTurns += 1;
    prevUp = up;
  }
  return { by, travel: Math.hypot(last[o] - first[o], last[o + 2] - first[o + 2]), halfTurns };
}

const isSkillShot = (stats) => stats && (stats.travel >= 3.5 || stats.halfTurns >= 4);

function reactWithMemes() {
  const s = state;
  if (!memesPreloaded && s.phase !== 'lobby') {
    memesPreloaded = true;
    preloadMemes();
  }

  const event = s.event;
  const eventKey = event ? `${s.round}-${event.type}-${event.by}-${event.eliminated ?? ''}` : '';
  if (eventKey && eventKey !== memeEventKey) {
    if (event.type === 'capture') showMeme(isSkillShot(lastSlamStats) && lastSlamStats.by === event.by ? 'skill' : 'capture');
    else if (event.type === 'fall') showMeme('fall');
    else if (event.type === 'pass') showMeme('pass');
    else if (event.type === 'timeout') showMeme('timeout');
  }
  memeEventKey = eventKey;

  const phaseKey = `${s.phase}-${s.round}-${s.turn}`;
  if (phaseKey === memePhaseKey) return;
  memePhaseKey = phaseKey;

  if (s.phase === 'turn' && s.turn === me && s.forced) showMeme('forced');
  if (s.phase === 'roundEnd' && s.result?.winner === me) showMeme('roundWin');
  if (s.phase === 'matchEnd') showMeme(s.result?.matchWinner === me ? 'matchWin' : 'matchLose');
  if (s.phase === 'roundIntro') {
    const onMatchPoint = s.seats.filter((seat) => (s.scores[seat] ?? 0) === ROUNDS_TO_WIN - 1).length;
    if (onMatchPoint >= 2) showMeme('tie');
  }
  if (s.phase === 'turn' && s.alive.includes(me) && flippedRound !== s.round) {
    const q = s.cards[me]?.q;
    if (q && 1 - 2 * (q[0] ** 2 + q[2] ** 2) > 0) {
      flippedRound = s.round;
      showMeme('firstFlip');
    }
  }
}

// ---------- overlays ----------

function setOverlay(key, html, { clear = false } = {}) {
  if (key === overlayKey) return false;
  overlayKey = key;
  els.overlay.className = clear ? 'clear' : '';
  els.overlay.innerHTML = html;
  return true;
}

function nameField() {
  return `<label class="name-field">Tên của m
    <input class="input name" id="name" maxlength="16" placeholder="VD: Tí sún" value="${escapeHtml(playerName.get())}" autocomplete="nickname">
  </label>`;
}

function readName() {
  const name = $('name').value.trim().slice(0, 16);
  if (!name) {
    $('name').focus();
    $('name').classList.add('shake');
    setTimeout(() => $('name')?.classList.remove('shake'), 400);
    return null;
  }
  playerName.set(name);
  return name;
}

function renderMenu(error = '') {
  overlayKey = 'menu';
  playMusic('menu');
  els.overlay.className = '';
  els.overlay.innerHTML = `
    <div class="menu-bg"><div class="panel menu-card">
      <h1 class="stamp title">DÉP LÀO<br>TUỔI THƠ</h1>
      <p class="sub">Đập bài tuổi thơ, chiến online 2–4 đứa</p>
      ${nameField()}
      <button class="btn pri wide" id="create">Tạo phòng</button>
      <div class="row">
        <label><input class="input" id="code" maxlength="4" placeholder="Mã phòng" aria-label="Mã phòng"></label>
        <button class="btn" id="join">Vào phòng</button>
      </div>
      ${error ? `<p class="sub error">${escapeHtml(error)}</p>` : ''}
    </div></div>`;
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  $('create').onclick = () => {
    const name = readName();
    if (name) send({ t: 'create', name, dep: playerDep.get() || undefined });
  };
  const join = () => {
    const code = $('code').value.trim().toUpperCase();
    if (code.length !== 4) {
      $('code').focus();
      return;
    }
    if (readName()) joinRoom(code);
  };
  $('join').onclick = join;
  $('code').onkeydown = (e) => { if (e.key === 'Enter') join(); };
}

function renderNamePrompt(code) {
  overlayKey = 'name';
  playMusic('menu');
  els.overlay.className = '';
  els.overlay.innerHTML = `
    <div class="menu-bg"><div class="panel menu-card">
      <h1 class="stamp title">DÉP LÀO<br>TUỔI THƠ</h1>
      <p class="sub">Có đứa rủ m vào phòng <span class="code">${escapeHtml(code)}</span> nè!</p>
      ${nameField()}
      <button class="btn pri wide" id="go">Vào phòng</button>
    </div></div>`;
  mountMenuBackground(els.overlay.querySelector('.menu-bg'));
  const go = () => { if (readName()) joinRoom(code); };
  $('go').onclick = go;
  $('name').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  $('name').focus();
}

function scoreLine() {
  return state.seats.map((s) => `${htmlName(s)} ${state.scores[s] ?? 0}`).join(' · ');
}

function renderOverlay() {
  const s = state;
  const myColor = `<b class="seat-${me}">${SEAT_LABEL[me]}</b>`;
  switch (s.phase) {
    case 'lobby': {
      const link = `${location.origin}${location.pathname}?room=${s.code}`;
      const count = Object.keys(s.players).length;
      const roster = SEATS.map((seat) => `${s.players[seat]?.name ?? ''}:${s.players[seat]?.dep ?? ''}`).join('|');
      const mine = depOf(me);
      const fresh = setOverlay(`lobby-${roster}`, `
        <div class="menu-bg"><div class="panel menu-card">
          <h1 class="stamp" style="font-size:44px">Phòng <span class="code">${s.code}</span></h1>
          <p class="sub">Gửi link rủ thêm chiến hữu vào đập!</p>
          <div class="row">
            <label><input class="input" style="width:min(340px,70vw);text-transform:none" id="link" value="${link}" readonly aria-label="Link mời"></label>
            <button class="btn" id="copy">Copy link</button>
          </div>
          <div class="seats">
            ${SEATS.map((seat) => (s.players[seat] ? `
              <div class="slot seat ${seat}"><img class="slot-dep" src="deps/${depOf(seat)}.jpg" alt="">${escapeHtml(s.players[seat].name)}<small>Bài ${SEAT_LABEL[seat].toLowerCase()}${seat === me ? ' · m' : ''}</small></div>`
    : '<div class="slot waiting">Đợi tí…<small>Còn trống</small></div>')).join('')}
          </div>
          <p class="sub dep-title">Chọn dép chiến</p>
          <div class="dep-picker">
            ${DEPS.map((d) => `<button class="dep-choice${d.id === mine ? ' sel' : ''}" data-dep="${d.id}">
              <img src="deps/${d.id}.jpg" alt=""><span>${d.label}</span></button>`).join('')}
          </div>
          <button class="btn pri wide" id="start" ${count < 2 ? 'disabled' : ''}>${count < 2 ? 'Đợi thêm 1 đứa nữa!' : `Chiến thôi! (${count} đứa)`}</button>
        </div></div>`);
      if (fresh) {
        mountMenuBackground(els.overlay.querySelector('.menu-bg'));
        $('copy').onclick = async () => {
          $('copy').textContent = await copyText(link, $('link')) ? 'Đã copy!' : 'Tự copy nhé!';
        };
        $('start').onclick = () => send({ t: 'start' });
        els.overlay.querySelectorAll('[data-dep]').forEach((b) => {
          b.onclick = () => {
            playerDep.set(b.dataset.dep);
            send({ t: 'pickDep', dep: b.dataset.dep });
          };
        });
      }
      break;
    }
    case 'roundIntro':
      setOverlay(`intro-${s.round}`, `
        <div class="panel">
          <h1 class="stamp">VÁN ${s.round}</h1>
          <p class="sub" style="font-size:22px">${scoreLine()}</p>
          <p class="sub">Bài m màu ${myColor}. Thắng ${ROUNDS_TO_WIN} ván là ăn cả trận!</p>
        </div>`);
      break;
    case 'rps': {
      if (!s.alive.includes(me)) {
        setOverlay(`rps-watch-${s.round}`, '<div class="panel"><h1 class="stamp" style="font-size:44px">Hai đứa đang tù xì…</h1></div>');
        break;
      }
      const opp = opponentsOf(me)[0];
      const chosen = s.rpsChosen[me];
      setOverlay(`rps-${s.round}-${chosen}-${s.rpsChosen[opp]}`, `
        <div class="panel">
          <h1 class="stamp" style="font-size:52px">TÙ XÌ!</h1>
          ${chosen ? '<p class="sub">Chốt rồi! Đợi đối thủ…</p>' : `
          <div class="row">
            ${Object.keys(RPS_ICON).map((k) => `<button class="rps" data-rps="${k}"><span class="icon">${RPS_ICON[k]}</span>${RPS_LABEL[k]}</button>`).join('')}
          </div>`}
          <p class="sub">${htmlName(opp)} ${s.rpsChosen[opp] ? 'chốt rồi' : 'đang chọn…'} · <span id="rps-timer"></span></p>
        </div>`);
      els.overlay.querySelectorAll('[data-rps]').forEach((b) => {
        b.onclick = () => send({ t: 'rps', choice: b.dataset.rps });
      });
      break;
    }
    case 'rpsReveal': {
      const [a, b] = s.alive;
      const left = s.alive.includes(me) ? me : a;
      const right = left === a ? b : a;
      const title = !s.rpsWinner ? 'HÒA! LÀM LẠI!' : s.rpsWinner === me ? 'M THẮNG!' : `${escapeHtml(nameOf(s.rpsWinner)).toUpperCase()} THẮNG!`;
      setOverlay(`reveal-${s.round}-${s.rpsShow[a]}-${s.rpsShow[b]}-${s.rpsWinner}`, `
        <div class="panel">
          <div class="row">
            <div class="rps ${s.rpsWinner === left ? 'sel' : ''}"><span class="icon">${RPS_ICON[s.rpsShow[left]]}</span>${left === me ? 'M' : escapeHtml(nameOf(left))}</div>
            <span class="stamp" style="font-size:36px">VS</span>
            <div class="rps ${s.rpsWinner === right ? 'sel' : ''}"><span class="icon">${RPS_ICON[s.rpsShow[right]]}</span>${escapeHtml(nameOf(right))}</div>
          </div>
          <h1 class="stamp" style="font-size:44px">${title}</h1>
        </div>`);
      break;
    }
    case 'choose':
      if (s.rpsWinner === me) {
        if (setOverlay(`choose-${s.round}`, `
          <div class="panel">
            <h1 class="stamp" style="font-size:44px">Đập trước hay nhường nó?</h1>
            <div class="row">
              <button class="btn pri" id="first">Đập trước</button>
              <button class="btn" id="yield">Nhường</button>
            </div>
            <p class="sub" style="font-weight:500">Đập trước được lợi thế, nhưng cũng dễ ăn đòn trước đấy!</p>
          </div>`)) {
          $('first').onclick = () => send({ t: 'choose', first: true });
          $('yield').onclick = () => send({ t: 'choose', first: false });
        }
      } else {
        setOverlay(`choose-wait-${s.round}`, `<div class="panel"><h1 class="stamp" style="font-size:40px">Đợi ${escapeHtml(nameOf(s.rpsWinner))} chọn lượt…</h1></div>`);
      }
      break;
    case 'order':
      setOverlay(`order-${s.round}`, `
        <div class="panel">
          <h1 class="stamp" style="font-size:48px">THỨ TỰ ĐẬP</h1>
          <div class="row order">${s.order.map((seat, i) => `${i ? '<span class="arrow">→</span>' : ''}<div class="slot seat ${seat}">${escapeHtml(nameOf(seat))}${seat === me ? '<small>m</small>' : ''}</div>`).join('')}</div>
          <p class="sub">M cầm bài ${myColor}. Trụ lại cuối cùng là thắng ván!</p>
        </div>`);
      break;
    case 'roundEnd': {
      const { winner, reason, by, eliminated = [] } = s.result;
      const head = reason === 'fall' ? 'RỚT BÀN!' : reason === 'left' ? 'RỜI TRẬN' : 'ĂN RỒI!';
      const out = eliminated.map(htmlName).join(', ');
      const how = reason === 'fall' ? `${htmlName(by)} đập rớt bài, bị loại!`
        : reason === 'left' ? `${out} nghỉ chơi rồi.` : `Bài ngửa của ${htmlName(by)} đè bài úp của ${out}!`;
      setOverlay(`end-${s.round}`, `
        <div class="panel">
          <h1 class="stamp ${winner === me ? '' : 'pink'}">${head}</h1>
          <p class="sub note">${how} ${htmlName(winner)} thắng ván này!</p>
          <p class="sub" style="font-size:22px">${scoreLine()}</p>
        </div>`, { clear: true });
      break;
    }
    case 'matchEnd': {
      const winner = s.result?.matchWinner ?? s.seats.reduce((a, b) => ((s.scores[b] ?? 0) > (s.scores[a] ?? 0) ? b : a));
      const iWon = winner === me;
      const present = s.seats.filter((seat) => s.players[seat]?.connected);
      const waitingFor = present.filter((seat) => !s.rematch[seat]);
      if (setOverlay(`match-${JSON.stringify(s.rematch)}-${present.join()}`, `
        <div class="panel">
          <h1 class="stamp ${iWon ? '' : 'pink'}">${iWon ? 'M THẮNG RỒI!' : `${escapeHtml(nameOf(winner)).toUpperCase()} THẮNG!`}</h1>
          <p class="sub" style="font-size:22px">${scoreLine()}</p>
          ${s.result?.matchReason === 'disconnect' ? '<p class="sub">Mọi người nghỉ chơi hết rồi!</p>' : ''}
          <div class="row">
            <button class="btn pri" id="rematch" ${s.rematch[me] ? 'disabled' : ''}>${s.rematch[me] ? 'Đợi tụi nó…' : 'Tái đấu'}</button>
            <button class="btn" id="menu">Về menu</button>
          </div>
          ${waitingFor.length && Object.keys(s.rematch).length ? `<p class="sub">Đang đợi: ${waitingFor.map(htmlName).join(', ')}</p>` : ''}
        </div>`)) {
        $('rematch').onclick = () => send({ t: 'rematch' });
        $('menu').onclick = () => { location.href = location.pathname; };
      }
      break;
    }
    default:
      setOverlay('none', '');
  }
}

function renderHud() {
  const inGame = !['lobby', 'matchEnd'].includes(state.phase);
  els.hud.hidden = !inGame;
  const strength = state.wind.strength;
  els.windText.textContent = `GIÓ ${strength}`;
  els.windBars.innerHTML = Array.from({ length: 4 }, (_, i) => `<i class="${i < strength ? 'on' : ''}"></i>`).join('');
  els.wind.dataset.level = String(strength);
  visuals.setWind(state.wind, world.table, ['turn', 'anim'].includes(state.phase));
  els.toggle.hidden = !(state.phase === 'turn' && state.turn === me);
  const key = JSON.stringify([state.seats, state.scores, state.alive, state.turn, state.players]);
  if (key === hudKey) return;
  hudKey = key;
  els.players.innerHTML = state.seats.map((seat) => {
    const out = !state.alive.includes(seat) && ['turn', 'anim'].includes(state.phase);
    const dots = Array.from({ length: ROUNDS_TO_WIN }, (_, i) => `<span class="dot ${i < (state.scores[seat] ?? 0) ? seat : ''}"></span>`).join('');
    return `<div class="chip ${seat}${out ? ' out' : ''}${state.turn === seat ? ' turn' : ''}">
      <span class="swatch ${seat}"></span><span class="name">${escapeHtml(nameOf(seat))}${seat === me ? ' (m)' : ''}</span><span class="dots">${dots}</span>
    </div>`;
  }).join('');
}

function remainingSeconds() {
  return Math.max(0, Math.ceil((state.remainingMs - (performance.now() - stateAt)) / 1000));
}

const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
const setClass = (el, name) => { if (el.className !== name) el.className = name; };
const setHidden = (el, hidden) => { if (el.hidden !== hidden) el.hidden = hidden; };

function updateBannerAndHint() {
  if (!state || !['turn', 'anim'].includes(state.phase)) {
    setHidden(els.banner, true);
    setHidden(els.hint, true);
    const timer = $('rps-timer');
    if (timer && state) setText(timer, `${remainingSeconds()}s`);
    return;
  }
  setHidden(els.banner, false);
  setHidden(els.hint, false);
  const mine = state.turn === me;
  if (state.phase === 'anim' || sim) {
    setText(els.banner, mine ? (sim ? 'BÀI ĐANG BAY…' : 'ĐỢI MỌI NGƯỜI XEM…') : `${nameOf(state.turn).toUpperCase()} ĐẬP!`);
    setClass(els.banner, mine ? '' : 'pink');
    setText(els.hint, mine ? 'Đợi bài nằm yên đã!' : `Đang xem ${nameOf(state.turn)} đập`);
    return;
  }
  const secs = `${remainingSeconds()}s`;
  if (mine) {
    setText(els.banner, state.forced ? `PHẢI ĐẬP! · ${secs}` : `TỚI M ĐẬP! · ${secs}`);
    setClass(els.banner, state.forced ? 'pink' : '');
    setText(els.hint, state.forced
      ? 'Bỏ lượt rồi à? Giờ phải đập trong vòng hồng!'
      : TOUCH
        ? 'Kéo để ngắm, thả để đập · Đập chỗ trống = bỏ lượt'
        : 'Click để đập · Càng sát càng mạnh · Đập chỗ trống = bỏ lượt · Q/E đổi kiểu');
  } else {
    setText(els.banner, `TỚI ${nameOf(state.turn).toUpperCase()} · ${secs}`);
    setClass(els.banner, 'pink');
    setText(els.hint, state.alive.includes(me) ? `${nameOf(state.turn)} đang ngắm…` : 'M bị loại rồi! Ngồi hóng tiếp thôi.');
  }
}

let toastTimer;
function showToast(text, ms) {
  els.toast.hidden = false;
  els.toast.textContent = text;
  clearTimeout(toastTimer);
  if (ms) {
    delete els.toast.dataset.sticky;
    toastTimer = setTimeout(hideToast, ms);
  } else {
    els.toast.dataset.sticky = '1';
  }
}
function hideToast() {
  els.toast.hidden = true;
  delete els.toast.dataset.sticky;
}

// ---------- labels ----------

const badges = {};
function badgeFor(seat) {
  if (!badges[seat]) {
    const el = document.createElement('div');
    el.className = `badge ${seat}`;
    els.labels.appendChild(el);
    badges[seat] = el;
  }
  return badges[seat];
}

const labelScreen = {};
function updateLabels() {
  const inRound = Boolean(state) && !['lobby', 'matchEnd'].includes(state.phase);
  for (const seat of SEATS) {
    const card = world.cards[seat];
    const el = badgeFor(seat);
    const show = inRound && Boolean(card?.mesh.visible);
    if (el.hidden === show) el.hidden = !show;
    if (!show) continue;
    const { x, y, z } = card.mesh.position;
    const q = card.mesh.quaternion;
    const faceUp = 1 - 2 * (q.x * q.x + q.z * q.z) > 0;
    const owner = seat === me ? ' (m)' : ` (${nameOf(seat)})`;
    const text = y < FALL_Y ? `RỚT${owner}` : `${faceUp ? '▲ NGỬA' : '▼ ÚP'}${owner}`;
    if (el.textContent !== text) el.textContent = text;
    // just under the card on screen, whichever way the camera faces the table
    world.toScreen(x, y, z, labelScreen);
    const transform = `translate(${labelScreen.x.toFixed(1)}px, ${(labelScreen.y + 30).toFixed(1)}px) translate(-50%, 0)`;
    if (el.dataset.at !== transform) {
      el.dataset.at = transform;
      el.style.transform = transform;
    }
  }
}

function popText(point, text) {
  const el = document.createElement('div');
  el.className = 'pop';
  el.textContent = text;
  const screen = world.toScreen(point.x, point.y + 0.5, point.z);
  el.style.left = `${screen.x}px`;
  el.style.top = `${screen.y}px`;
  els.labels.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function updateWindArrow() {
  const key = `${state?.wind.angle}-${world.tableKey}`;
  if (!state || key === lastWindKey) return;
  lastWindKey = key;
  const a = world.toScreen(0, 0, 0);
  const b = world.toScreen(Math.cos(state.wind.angle), 0, Math.sin(state.wind.angle));
  els.windArrow.style.transform = `rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`;
  els.windArrow.style.opacity = state.wind.strength === 0 ? 0.25 : 1;
}

// ---------- aiming & slamming ----------

const myTurnToAim = () => state && state.phase === 'turn' && state.turn === me && state.alive.includes(me)
  && !sim && !playback && !awaitingServer;
const cardPositions = () => Object.fromEntries(world.seats.map((s) => [s, world.cards[s].mesh.position]));

function isValidAim(point) {
  const mine = world.cards[me].mesh.position;
  const limit = state.forced ? TUNE.forcedRadius : TUNE.reachRadius;
  const distance = Math.hypot(point.x - mine.x, point.z - mine.z);
  return distance <= limit && !world.cardAt(point);
}

function setType(type) {
  slamType = type;
  els.flat.classList.toggle('sel', type === 'flat');
  els.tilt.classList.toggle('sel', type === 'tilt');
}
els.flat.onclick = () => setType('flat');
els.tilt.onclick = () => setType('tilt');
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'q' || e.key === 'Q') setType('flat');
  if (e.key === 'e' || e.key === 'E') setType('tilt');
});

const canvas = world.renderer.domElement;
canvas.addEventListener('pointermove', (e) => {
  pointer = world.pointerToGround(e.clientX, e.clientY);
  pointerMoved = true;
});
// Mouse: click to slam. Touch/pen: press and drag to aim, lift the finger to slam.
let touchAiming = false;
canvas.addEventListener('pointerdown', (e) => {
  if (!myTurnToAim()) return;
  const point = world.pointerToGround(e.clientX, e.clientY);
  if (e.pointerType === 'mouse') {
    if (e.button === 0 && point && isValidAim(point)) slam(point);
    return;
  }
  touchAiming = true;
  canvas.setPointerCapture(e.pointerId);
  pointer = point;
  pointerMoved = true;
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse' || !touchAiming) return;
  touchAiming = false;
  const point = world.pointerToGround(e.clientX, e.clientY);
  pointer = null;
  pointerMoved = true;
  if (point && myTurnToAim() && isValidAim(point)) slam(point);
});
canvas.addEventListener('pointercancel', () => {
  touchAiming = false;
  pointer = null;
  pointerMoved = true;
});

// The slap landing: hit burst, camera shake and the thump, all scaled by how hard it was.
function impactFx(point, strength, volume) {
  thump(volume);
  visuals.hit.play(point, strength);
  world.shake(0.25 + strength * 0.45);
}

function shakeHand(point) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * TUNE.handShake;
    const actual = new THREE.Vector3(point.x + Math.cos(angle) * radius, 0, point.z + Math.sin(angle) * radius);
    if (!world.cardAt(actual, 0)) return actual;
  }
  return point.clone();
}

function slam(aim) {
  awaitingServer = true;
  visuals.hideAim();
  const impact = shakeHand(aim);
  const type = slamType;
  const effects = world.slamEffects(impact, type);
  const impactMsg = { x: impact.x, z: impact.z };

  if (effects.length === 0) {
    visuals.dropDep(impact, () => {
      impactFx(impact, 0.25, 0.4);
      send({ t: 'pass', impact: impactMsg });
    }, depOf(me));
    return;
  }

  visuals.dropDep(impact, () => {
    const strength = Math.max(...effects.map((e) => e.strength));
    impactFx(impact, strength, 0.5 + strength * 0.5);
    popText(impact, 'BỐP!');
    send({ t: 'slamStart', impact: impactMsg, type });
    setTimeout(() => {
      world.applySlam(impact, type);
      sim = { frames: [], sent: 0, acc: 0, last: performance.now(), steps: 0, calm: 0, impact: impactMsg, type };
    }, TUNE.hitstopMs);
  }, depOf(me));
}

function autoSlam() {
  if (!state || state.phase !== 'turn' || state.turn !== me || sim || playback) return;
  const mine = world.cards[me].mesh.position;
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = TUNE.forcedRadius * (0.6 + Math.random() * 0.4);
    const point = new THREE.Vector3(mine.x + Math.cos(angle) * radius, 0, mine.z + Math.sin(angle) * radius);
    if (isValidAim(point)) {
      slam(point);
      return;
    }
  }
}

function stepSim(now) {
  sim.acc += Math.min((now - sim.last) / 1000, 0.1) * timeScale;
  sim.last = now;
  while (sim.acc >= TUNE.fixedDt) {
    sim.acc -= TUNE.fixedDt;
    world.stepPhysics(state.wind);
    sim.frames.push(world.recordFrame());
    sim.steps += 1;
    sim.calm = world.isSettled() ? sim.calm + 1 : 0;
  }
  world.syncMeshes();
  if (!sim.local && sim.frames.length - sim.sent >= TUNE.net.chunkSteps) flushChunk();

  const seconds = sim.steps * TUNE.fixedDt;
  const falling = world.isSomethingFalling();
  const done = (sim.calm >= TUNE.settle.steps && sim.steps > 15 && !falling)
    || (seconds > TUNE.settle.softCapSeconds && !falling)
    || seconds > TUNE.settle.hardCapSeconds;
  if (!done) return;

  const final = world.readCards();
  if (!sim.local) {
    flushChunk();
    send({ t: 'slamEnd', final });
    lastSlamStats = slamStats(sim.frames, me);
  }
  sim = null;
}

function flushChunk() {
  if (sim.frames.length === sim.sent) return;
  send({ t: 'slamChunk', frames: sim.frames.slice(sim.sent) });
  sim.sent = sim.frames.length;
}

// Other players' slams arrive in small chunks while still flying. Frames are played a few
// behind the newest one; if the network stalls, playback holds and the buffer grows.
function startPlayback(msg) {
  const impact = new THREE.Vector3(msg.impact.x, 0, msg.impact.z);
  const current = {
    by: msg.by, buffer: [], cursor: 0, ended: false, final: null, playing: false, impactDone: false,
    target: TUNE.net.startBuffer, last: performance.now(),
  };
  playback = current;
  visuals.dropDep(impact, () => {
    impactFx(impact, 0.8, 0.8);
    popText(impact, 'BỐP!');
    setTimeout(() => { current.impactDone = true; }, TUNE.hitstopMs);
  }, depOf(msg.by));
}

function finishPlayback() {
  lastSlamStats = slamStats(playback.buffer, playback.by);
  world.setCards(playback.final);
  playback = null;
  appliedCardsKey = '';
  send({ t: 'playbackDone' });
}

function stepPlayback(now) {
  const p = playback;
  const dt = Math.min((now - p.last) / 1000, 0.1);
  p.last = now;
  if (!p.impactDone) return;
  const available = p.buffer.length;
  if (!p.playing) {
    if (available - p.cursor >= p.target || p.ended) p.playing = true;
    else return;
  }
  const next = p.cursor + dt * 60;
  if (next > available - 1 && !p.ended) {
    p.playing = false;
    p.target = Math.min(p.target + 3, TUNE.net.maxBuffer);
    return;
  }
  p.cursor = Math.max(0, Math.min(next, available - 1));
  if (available) world.applyFrame(p.buffer[Math.floor(p.cursor)]);
  if (p.ended && p.cursor >= available - 1) finishPlayback();
}

function updateAim() {
  if (!myTurnToAim()) {
    if (!sim) visuals.hideAim();
    return;
  }
  const enemies = world.activeSeats.filter((s) => s !== me).map((s) => world.cards[s].mesh.position);
  visuals.showStandoff(world.cards[me].mesh.position, enemies, state.forced);
  if (!pointer) {
    visuals.hideCursor();
    return;
  }
  const valid = isValidAim(pointer);
  visuals.showCursor(pointer, valid, world.slamEffects(pointer, slamType), cardPositions());
  canvas.style.cursor = valid ? 'crosshair' : 'not-allowed';
}

// ---------- loop ----------

let couldAim = false;
let lastFrameAt = performance.now();
let timeScale = 1; // debug only: slow motion to inspect effects
let windClock = 0;
const IDLE_FRAME = 1 / 30;
function frame(now) {
  // schedule first: an error below must never stop the render loop
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastFrameAt) / 1000, 0.1) * timeScale;
  lastFrameAt = now;
  visuals.lastFrameAt = now;
  if (sim) stepSim(now);
  if (playback) stepPlayback(now);
  if (visuals.hit.update(dt, world.camera)) world.needsRender = true;
  if (visuals.trails.update(world.cards, world.camera)) world.needsRender = true;
  if (state) {
    const canAim = myTurnToAim();
    if (pointerMoved || canAim !== couldAim) {
      updateAim();
      couldAim = canAim;
      pointerMoved = false;
      world.needsRender = true;
    }
    updateBannerAndHint();
    updateWindArrow();
  }
  if (visuals.busy) world.needsRender = true;
  windClock += dt;
  if (windClock >= IDLE_FRAME) {
    if (visuals.updateWind(windClock, world.camera)) world.needsRender = true;
    windClock = 0;
  }
  if (world.render()) {
    updateLabels();
    drawnFrames++;
  }
}

let drawnFrames = 0;
setInterval(() => {
  setText(els.fps, drawnFrames < 5 ? 'fps –' : `${drawnFrames} fps`);
  els.fps.classList.toggle('bad', drawnFrames >= 5 && drawnFrames < 40);
  drawnFrames = 0;
}, 1000);

setInterval(() => {
  if (!state) return;
  send({ t: 'ping', at: performance.now() });
  const silent = performance.now() - lastPong;
  const slow = silent > TUNE.net.slowPingMs;
  if (slow && !els.toast.dataset.sticky) showToast('Mạng hơi lag…', 2500);
  els.ping.textContent = slow ? 'ping ?' : `ping ${pingMs}ms`;
  els.ping.classList.toggle('bad', slow || pingMs > 250);
}, TUNE.net.pingMs);

// Hidden, minimized or occluded tabs get no animation frames: finish the slam or the
// replay right away so the match never waits on a page nobody is looking at.
setInterval(() => {
  if (!document.hidden && performance.now() - lastFrameAt < 500) return;
  while (sim) {
    sim.last -= 100;
    stepSim(performance.now());
  }
  if (playback?.ended) finishPlayback();
}, 250);

if (new URLSearchParams(location.search).has('debug')) {
  window.slamDebug = {
    get state() { return state; },
    world,
    meme: showMeme,
    visuals,
    set timeScale(v) { timeScale = v; },
    previewDeps: (seats = ['black', 'pink', 'blue']) => {
      seats.forEach((seat, i) => {
        const model = depModel(depOf(seat))?.clone();
        if (!model) return;
        model.position.set((i - 1) * 1.6, 0, 1.2);
        model.rotation.y = 0.4;
        world.scene.add(model);
      });
      world.needsRender = true;
    },
    cards: () => world.readCards(),
    place: (cards) => world.setCards(cards),
    effects: (x, z, type = 'flat') => world.slamEffects(new THREE.Vector3(x, 0, z), type),
    localSlam: (x, z, type = 'flat') => {
      world.applySlam(new THREE.Vector3(x, 0, z), type);
      sim = { frames: [], sent: 0, acc: 0, last: performance.now(), steps: 0, calm: 0, local: true, type };
    },
    slamAt: (x, z) => {
      const point = new THREE.Vector3(x, 0, z);
      if (!myTurnToAim() || !isValidAim(point)) return false;
      slam(point);
      return true;
    },
  };
}

world.setCards({
  black: { p: [-4.5, 0.008, 0], q: [0, 0, 1, 0] },
  pink: { p: [4.5, 0.008, 0], q: [0, 0, 1, 0] },
});
loadDeps().catch((err) => console.warn('slipper models unavailable, using fallback', err));
connect();
requestAnimationFrame(frame);
