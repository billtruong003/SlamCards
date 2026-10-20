import { STICKERS, STICKER_TABS, stickerFile, PHRASES, SUGGEST, CHAT_MAX, SKILL_PHRASES } from './catalog.js';
import { showMeme } from './memes.js';
import { t } from './i18n.js';
import { chime } from './sound.js';

// Stickers, quick phrases and chat (mockup: design canvas, page "Biểu cảm + chat + mời bạn").
// - Reactions (sticker / phrase) work in every room; typed chat only in friends rooms.
// - In a match everything shows as a bubble over the sender's card; the full chat lives in the lobby
//   (a docked panel on wide screens, a bar that opens a sheet on narrow ones). In a match the chat
//   is a compact panel with the last lines, open whenever the player likes, their own turn included.
// - Touch screens get no text box (the keyboard would cover half the game): quick phrases and
//   stickers only, and they still read what others typed (B-03).
// - The server limits each player to 3 reactions and 3 lines per 5 s; the picker mirrors that.
// The elements are created once, outside the overlay, so a lobby redraw never eats a half-typed line.

const SMILE = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="8.8" cy="10" r="1.4" fill="currentColor"/><circle cx="15.2" cy="10" r="1.4" fill="currentColor"/><path d="M7.8 14.2c2.2 2.6 6.2 2.6 8.4 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
const CHAT = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H10l-5 4v-4H4z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const SEND = '<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 11l16-8-6 16-3-6z" fill="#fff" stroke="#2a1418" stroke-width="2" stroke-linejoin="round"/></svg>';
const CLOSE = '<svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 5l12 12M17 5L5 17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
const UP = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const BUBBLE_MS = 2600;
const TICKER_MS = 6000;
const LOG_KEEP = 40;
const LOCAL_MAX = 3;
const LOCAL_WINDOW = 5000;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
};

export function createSocial({ send, getState, getMe, nameOf, inkOf, cardTop, safeTop, showToast }) {
  const root = document.body;
  root.insertAdjacentHTML('beforeend', `
    <div id="bubbles" aria-hidden="true"></div>
    <div id="ticker" aria-live="polite"></div>
    <div id="social-fabs" hidden>
      <button type="button" class="sfab plain" id="chat-fab" aria-label="${esc(t('social.chat'))}">${CHAT}<span class="nb" hidden></span></button>
      <button type="button" class="sfab" id="react-fab" aria-label="${esc(t('social.react'))}" aria-expanded="false">${SMILE}<span class="key">T</span><span class="nb" hidden></span></button>
    </div>
    <div id="react-panel" class="spanel" hidden role="dialog" aria-label="${esc(t('social.react'))}">
      <div class="sug" id="react-sug"></div>
      <div class="stabs" role="tablist">
        <button type="button" data-rtab="face" class="on">${t('social.tabFace')}</button>
        <button type="button" data-rtab="cat">${t('social.tabCat')}</button>
        <button type="button" data-rtab="phrase">${t('social.tabPhrase')}</button>
        <button type="button" class="sclose" id="react-close" aria-label="${esc(t('common.close'))}">${CLOSE}</button>
      </div>
      <div class="sgrid" id="react-grid"></div>
      <button type="button" class="react-chat" id="react-chat" hidden>${CHAT}<span>${t('social.placeholder')}</span><span class="nb" hidden></span></button>
    </div>
    <button type="button" id="chat-bar" hidden aria-label="${esc(t('social.chatTitle'))}">
      <span class="cb-head">${CHAT}<b>${t('social.chatTitle')}</b><span class="cb-new" hidden></span>${UP}</span>
      <span class="cb-line" id="cb-line1"></span><span class="cb-line" id="cb-line2"></span>
    </button>
    <div id="chat-panel" hidden role="dialog" aria-label="${esc(t('social.chatTitle'))}">
      <div class="cp-handle"></div>
      <div class="cp-head"><h2>${t('social.chatTitle')} <small id="cp-count"></small></h2><button type="button" class="sib" id="chat-close" aria-label="${esc(t('common.close'))}">${CLOSE}</button></div>
      <div class="cp-log" id="cp-log"></div>
      <div class="cp-chips" id="cp-chips"></div>
      <div class="cp-bar">
        <button type="button" class="sib" id="cp-stk" aria-label="${esc(t('social.react'))}" aria-pressed="false">${SMILE}</button>
        <label class="cp-inp"><input id="cp-input" maxlength="${CHAT_MAX}" autocomplete="off" enterkeyhint="send" placeholder="${esc(t('social.placeholder'))}" aria-label="${esc(t('social.placeholder'))}"></label>
        <button type="button" class="sib send" id="cp-send" aria-label="${esc(t('social.send'))}">${SEND}</button>
      </div>
      <div class="sgrid cp-stickers" id="cp-stickers" hidden></div>
    </div>`);
  const $ = (id) => document.getElementById(id);
  const els = {
    bubbles: $('bubbles'), ticker: $('ticker'), fabs: $('social-fabs'), reactFab: $('react-fab'), chatFab: $('chat-fab'),
    panel: $('react-panel'), sug: $('react-sug'), grid: $('react-grid'), bar: $('chat-bar'), chat: $('chat-panel'),
    log: $('cp-log'), chips: $('cp-chips'), input: $('cp-input'), stk: $('cp-stk'), stickers: $('cp-stickers'),
  };

  const log = [];                 // { seat, name, text | sticker | phrase }
  const live = [];                // bubbles on screen: { el, seat, until }
  const muted = new Set();
  const sentAt = [];
  let tab = 'face';
  let context = 'lobby';
  let mode = 'off';               // off | lobby | match
  let chatOpen = false;
  let unread = 0;
  let showOthers = storage.get('slam-reacts') !== '0';

  const friends = () => getState()?.kind === 'friends';
  const canType = matchMedia('(pointer: fine)').matches;
  els.chat.classList.toggle('no-typing', !canType);
  els.stickers.hidden = canType; // without a text box the stickers are always there
  if (!canType) $('react-chat').querySelector('span').textContent = t('social.chatTitle');
  // words, not a sticker: a quick phrase ("p:"), or a computer player's own line ("b:", server/bot-talk.js)
  const isWords = (id) => id.startsWith('p:') || id.startsWith('b:');
  const label = (id) => (id.startsWith('p:') ? t(`phrase.${id.slice(2)}`) : id.startsWith('b:') ? t(`bot.${id.slice(2)}`) : '');
  // lazy only in the pickers: a bubble is created at the corner of the screen and must show at once
  const stickerImg = (id, cls = '', lazy = true) => `<img class="${cls}" src="${stickerFile(id)}" alt="" ${lazy ? 'loading="lazy" ' : ''}draggable="false">`;
  const reactionHtml = (id) => (isWords(id) ? `<span class="phrase">${esc(label(id))}</span>` : stickerImg(id, '', false));

  // ---------- sending ----------
  function canSend() {
    const now = Date.now();
    while (sentAt.length && now - sentAt[0] > LOCAL_WINDOW) sentAt.shift();
    if (sentAt.length >= LOCAL_MAX) {
      els.panel.classList.add('cool');
      setTimeout(() => els.panel.classList.remove('cool'), LOCAL_WINDOW - (now - sentAt[0]));
      return false;
    }
    sentAt.push(now);
    return true;
  }
  function react(id) {
    if (!canSend()) return;
    send({ t: 'react', id });
    if (mode === 'match') closePicker();
  }
  function sendChat() {
    const text = els.input.value.trim();
    if (!text || !friends()) return;
    send({ t: 'chat', text });
    els.input.value = '';
  }

  // ---------- picker ----------
  function drawPicker() {
    els.panel.querySelectorAll('[data-rtab]').forEach((b) => {
      b.classList.toggle('on', b.dataset.rtab === tab);
      b.setAttribute('aria-selected', String(b.dataset.rtab === tab));
    });
    const ids = tab === 'phrase' ? PHRASES.map((p) => `p:${p}`) : STICKER_TABS[tab];
    els.grid.className = `sgrid ${tab === 'phrase' ? 'phrases' : ''}`;
    els.grid.innerHTML = ids.map((id, i) => (id.startsWith('p:')
      ? `<button type="button" class="sph" data-react="${id}">${esc(label(id))}</button>`
      : `<button type="button" class="sem" data-react="${id}" aria-label="${esc(id)}">${i < 8 ? `<b>${i + 1}</b>` : ''}${stickerImg(id)}</button>`)).join('');
    const sug = SUGGEST[context] ?? SUGGEST.lobby;
    els.sug.innerHTML = `${sug.map((id) => (id.startsWith('p:')
      ? `<button type="button" class="sph" data-react="${id}">${esc(label(id))}</button>`
      : `<button type="button" class="sem small" data-react="${id}" aria-label="${esc(id)}">${stickerImg(id)}</button>`)).join('')}<span>${esc(t(`social.ctx.${context}`))}</span>`;
  }
  els.panel.addEventListener('click', (e) => {
    const r = e.target.closest('[data-react]');
    if (r) { react(r.dataset.react); return; }
    const tb = e.target.closest('[data-rtab]');
    if (tb) { tab = tb.dataset.rtab; drawPicker(); }
  });
  function openPicker() {
    drawPicker();
    els.panel.hidden = false;
    els.reactFab.setAttribute('aria-expanded', 'true');
    closeChat();
  }
  function closePicker() {
    els.panel.hidden = true;
    els.reactFab.setAttribute('aria-expanded', 'false');
  }
  els.reactFab.onclick = () => (els.panel.hidden ? openPicker() : closePicker());
  $('react-close').onclick = closePicker;

  // ---------- chat panel ----------
  function drawChips() {
    // with no text box, every phrase is a chip; with one, a few for the moment
    const ids = !canType ? PHRASES.map((p) => `p:${p}`) : mode === 'match' ? ['p:lucky', 'p:eat', 'p:hurry', 'p:oops'] : ['p:comeon', 'p:wait', 'p:gg'];
    els.chips.innerHTML = ids.map((id) => `<button type="button" class="${mode === 'match' ? 'say' : ''}" data-react="${id}">${esc(label(id))}</button>`).join('');
  }
  els.chips.addEventListener('click', (e) => { const r = e.target.closest('[data-react]'); if (r) react(r.dataset.react); });
  els.stickers.innerHTML = STICKERS
    .map((id) => `<button type="button" class="sem" data-react="${id}" aria-label="${esc(id)}">${stickerImg(id)}</button>`).join('');
  els.stickers.addEventListener('click', (e) => { const r = e.target.closest('[data-react]'); if (r) react(r.dataset.react); });
  els.stk.onclick = () => {
    const on = els.stickers.hidden;
    els.stickers.hidden = !on;
    els.stk.setAttribute('aria-pressed', String(on));
    if (on) els.input.blur();
  };
  els.input.addEventListener('focus', () => { els.stickers.hidden = true; els.stk.setAttribute('aria-pressed', 'false'); });
  els.input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // game keys (Q, E, T, 1-8) must not fire while typing
    if (e.key === 'Enter') sendChat();
    if (e.key === 'Escape') closeChat();
  });
  $('cp-send').onclick = sendChat;
  function openChat() {
    if (!friends()) return;
    chatOpen = true;
    unread = 0;
    closePicker();
    layout();
    drawLog();
    els.log.scrollTop = els.log.scrollHeight;
    if (canType) els.input.focus({ preventScroll: true });
  }
  function closeChat() {
    if (!chatOpen) return;
    chatOpen = false;
    els.input.blur();
    els.stickers.hidden = true;
    layout();
  }
  els.bar.onclick = openChat;
  els.chatFab.onclick = () => (chatOpen ? closeChat() : openChat());
  $('chat-close').onclick = closeChat;
  $('react-chat').onclick = () => { closePicker(); openChat(); };

  // ---------- log, bubbles, ticker ----------
  function lineHtml(m) {
    const ink = inkOf(m.seat);
    const mine = m.seat === getMe();
    const body = m.text != null ? `<p>${esc(m.text)}</p>` : m.phrase ? `<p class="ph">${esc(label(m.phrase))}</p>` : stickerImg(m.sticker, 'stk');
    return `<div class="cl${mine ? ' me' : ''}"><b style="color:${ink}">${esc(m.name)}</b>${body}</div>`;
  }
  function drawLog() {
    els.log.innerHTML = log.length ? log.map(lineHtml).join('') : `<span class="cl-sys">${esc(t('social.empty'))}</span>`;
    els.log.scrollTop = els.log.scrollHeight;
    const last = log.slice(-2);
    const plain = (m) => `<b style="color:${inkOf(m.seat)}">${esc(m.name)}:</b> ${m.text != null ? esc(m.text) : m.phrase ? esc(label(m.phrase)) : esc(t('social.sentSticker'))}`;
    $('cb-line1').innerHTML = last.length > 1 ? plain(last[0]) : '';
    $('cb-line2').innerHTML = last.length ? plain(last[last.length - 1]) : esc(t('social.empty'));
    const pill = els.bar.querySelector('.cb-new');
    pill.hidden = !unread;
    pill.textContent = t('social.newCount', { n: unread });
    // the same count on the chat button, and on the reaction button / chat row where phones fold chat into it
    for (const nb of [els.chatFab, els.reactFab, $('react-chat')].map((b) => b.querySelector('.nb'))) {
      nb.hidden = !unread;
      nb.textContent = String(unread);
    }
  }
  function addLine(m) {
    log.push(m);
    if (log.length > LOG_KEEP) log.shift();
    if (!chatOpen && m.seat !== getMe()) unread += 1;
    drawLog();
  }
  function bubble(seat, html) {
    if (mode !== 'match' || !cardTop(seat)) return;
    const el = document.createElement('div');
    el.className = 'sbub';
    el.innerHTML = `<span class="who" style="background:${inkOf(seat, true)}">${esc(nameOf(seat))}</span>${html}`;
    els.bubbles.appendChild(el);
    // one bubble per player: a new one replaces the last
    for (const b of live.filter((x) => x.seat === seat)) b.el.remove();
    live.splice(0, live.length, ...live.filter((x) => x.seat !== seat), { el, seat, until: performance.now() + BUBBLE_MS });
  }
  function tick(seat, html) {
    if (mode !== 'match') return;
    const el = document.createElement('div');
    el.className = 'tk';
    el.innerHTML = `<b style="color:${inkOf(seat)}">${esc(nameOf(seat))}:</b> ${html}`;
    els.ticker.appendChild(el);
    while (els.ticker.children.length > 3) els.ticker.firstChild.remove();
    setTimeout(() => el.classList.add('gone'), TICKER_MS);
    setTimeout(() => el.remove(), TICKER_MS + 600);
  }

  // ---------- messages ----------
  function onMessage(msg) {
    if (msg.t === 'chatLog') {
      log.splice(0, log.length, ...msg.lines.map((l) => ({ seat: l.seat, name: l.name, text: l.text })));
      drawLog();
      return true;
    }
    if (msg.t !== 'react' && msg.t !== 'chat') return false;
    const seat = msg.seat;
    if (muted.has(seat) && seat !== getMe()) return true;
    const name = msg.name ?? nameOf(seat);
    if (msg.t === 'chat') {
      addLine({ seat, name, text: msg.text });
      if (seat !== getMe() && showOthers) {
        bubble(seat, `<span class="txt">${esc(msg.text)}</span>`);
        tick(seat, esc(msg.text));
      }
    } else {
      const phrase = isWords(msg.id) ? msg.id : null;
      addLine({ seat, name, ...(phrase ? { phrase } : { sticker: msg.id }) });
      if (SKILL_PHRASES.has(msg.id) && (seat === getMe() || showOthers)) showMeme('skill');
      if (seat === getMe() || showOthers) bubble(seat, reactionHtml(msg.id));
      if (seat !== getMe() && showOthers) chime('react');
    }
    return true;
  }

  // ---------- layout & per-frame work ----------
  function layout() {
    const state = getState();
    const inRoom = Boolean(state && getMe());
    const inMatch = inRoom && !['lobby', 'matchEnd'].includes(state.phase);
    mode = !inRoom ? 'off' : inMatch ? 'match' : 'lobby';
    const chatOk = inRoom && friends();
    document.body.dataset.social = mode;
    document.body.dataset.chat = !chatOk ? 'off' : chatOpen ? 'open' : 'closed';
    // only during turns: RPS, "go first" and round results put a panel in the middle of the screen
    els.fabs.hidden = mode !== 'match' || !['turn', 'anim'].includes(state.phase);
    if (els.fabs.hidden) closePicker();
    els.chatFab.hidden = !chatOk;
    $('react-chat').hidden = !chatOk;
    els.bar.hidden = !(mode === 'lobby' && chatOk);
    els.chat.hidden = !(chatOk && (chatOpen || mode === 'lobby'));
    els.chat.dataset.mode = mode === 'match' ? 'compose' : chatOpen ? 'sheet' : 'dock';
    if (mode !== 'match') closePicker();
    if (mode === 'off') { chatOpen = false; log.length = 0; unread = 0; }
    drawChips();
    $('cp-count').textContent = state ? `· ${t('social.people', { n: Object.keys(state.players).length })}` : '';
  }
  let lastKey = '';
  function update() {
    const state = getState();
    const key = `${state?.phase}|${state?.kind}|${getMe()}|${chatOpen}|${state ? Object.keys(state.players).length : 0}`;
    if (key !== lastKey) { lastKey = key; layout(); }
    if (mode !== 'match') return;
    if (state.phase === 'turn' && state.turn !== getMe() && context !== 'slow' && state.remainingMs < 20000) setContext('slow');
  }
  function frame(now) {
    for (let i = live.length - 1; i >= 0; i--) {
      const b = live[i];
      const top = cardTop(b.seat);
      if (now > b.until || !top) {
        b.el.classList.add('gone');
        setTimeout(() => b.el.remove(), 250);
        live.splice(i, 1);
        continue;
      }
      // Where it fits, in this order: above the card (tail down), beside it (tail sideways: a card
      // near the top of a phone held upright), under it (tail up). Always clear of the HUD's top band.
      const w = b.el.offsetWidth; const h = b.el.offsetHeight;
      const minY = safeTop() + 8;
      const sideY = Math.min(innerHeight - h - 8, Math.max(minY, top.mid - h / 2));
      let place = 'above'; let x = Math.min(innerWidth - w - 8, Math.max(8, top.x - w / 2)); let y = top.y - 24 - h;
      if (y < minY) {
        if (top.right + 24 + w <= innerWidth - 8) { place = 'right'; x = top.right + 24; y = sideY; }
        else if (top.left - 24 - w >= 8) { place = 'left'; x = top.left - 24 - w; y = sideY; }
        else { place = 'below'; y = Math.min(innerHeight - h - 8, top.bottom + 46); } // under the card label
      }
      if (b.el.dataset.place !== place) b.el.dataset.place = place;
      b.el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
    }
  }
  function setContext(c) {
    if (!SUGGEST[c] || c === context) return;
    context = c;
    if (!els.panel.hidden) drawPicker();
  }

  // ---------- keys, mute, settings ----------
  addEventListener('keydown', (e) => {
    if (mode !== 'match' || e.target.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 't' || e.key === 'T') { els.panel.hidden ? openPicker() : closePicker(); return; }
    if (e.key === 'Escape') { closePicker(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= 8) {
      const ids = tab === 'phrase' ? PHRASES.map((p) => `p:${p}`) : STICKER_TABS[tab];
      if (ids[n - 1]) react(ids[n - 1]);
    }
  });
  function toggleMute(seat) {
    if (seat === getMe()) return;
    if (muted.has(seat)) muted.delete(seat); else muted.add(seat);
    showToast(t(muted.has(seat) ? 'social.muted' : 'social.unmuted', { name: nameOf(seat) }), 1800);
  }
  function setShowOthers(on) {
    showOthers = on;
    storage.set('slam-reacts', on ? '1' : '0');
  }

  return {
    onMessage, update, frame, layout, setContext, toggleMute, isMuted: (seat) => muted.has(seat),
    setShowOthers, showOthers: () => showOthers, closeAll: () => { closePicker(); closeChat(); },
  };
}
