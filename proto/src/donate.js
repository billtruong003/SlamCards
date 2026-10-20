// Support the game (G2, canvas "Bill The Dev Studio · Cổng game", page "Dép Lào · Ủng hộ"): a QR code
// for MoMo or any Vietnamese bank app (VietQR / Napas 247), cropped so no account name shows. Only
// outside a match (the menu, a lobby, the end of a match), never in the way of play; only in
// Vietnamese, the language of the people who can pay by VietQR. On a laptop a card in the middle; on
// a phone a sheet from the bottom with "save the QR image" (a phone cannot scan its own screen) and
// the three steps. Supporters who asked to be named (public/donate/supporters.json) are thanked.
import { t, lang } from './i18n.js';

const QR = 'donate/qr.png';
const SUPPORTERS = 'donate/supporters.json';
const HEART = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2b7a46" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// track(name): server counts (metrics.js CLIENT_EVENTS); hidePanels(): close the corner panels.
export function createDonate({ track = () => {}, hidePanels = () => {} }) {
  const on = lang() === 'vi';
  const button = document.getElementById('donate');
  button.innerHTML = `${HEART}<span>${t('donate.button')}</span>`;
  button.dataset.short = t('donate.button');
  button.setAttribute('aria-label', t('donate.button')); // the heart alone on a narrow phone
  document.body.insertAdjacentHTML('beforeend', `
    <div id="donate-panel" class="donate" hidden>
      <div class="donate-card" role="dialog" aria-modal="true" aria-labelledby="donate-title">
        <span class="donate-grip" aria-hidden="true"></span>
        <img class="donate-qr" src="${QR}" alt="${esc(t('donate.qrAlt'))}" width="521" height="551">
        <div class="donate-txt">
          <h2 id="donate-title">${t('donate.title')}</h2>
          <p>${t('donate.body')}</p>
          <ul><li>${CHECK}${t('donate.noName')}</li><li>${CHECK}${t('donate.noUnlock')}</li></ul>
          <a class="btn pri wide donate-save" href="${QR}" download="dep-lao-ung-ho.png">${t('donate.save')}</a>
          <ol class="donate-steps"><li><i>1</i>${t('donate.step1')}</li><li><i>2</i>${t('donate.step2')}</li><li><i>3</i>${t('donate.step3')}</li></ol>
          <p class="donate-thanks" hidden></p>
          <button type="button" class="btn donate-close">${t('donate.close')}</button>
        </div>
      </div>
    </div>`);
  const panel = document.getElementById('donate-panel');
  const close = () => { panel.hidden = true; };
  panel.querySelector('.donate-close').onclick = close;
  panel.onclick = (e) => { if (e.target === panel) close(); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  panel.querySelector('.donate-save').onclick = () => track('donateSaved');

  let thanked = false;
  async function thank() {
    if (thanked) return;
    thanked = true;
    try {
      const names = (await (await fetch(SUPPORTERS, { cache: 'no-cache' })).json()).filter((n) => typeof n === 'string' && n.trim());
      if (!names.length) return;
      const line = panel.querySelector('.donate-thanks');
      line.innerHTML = t('donate.thanks', { names: names.map((n) => `<b>${esc(n.trim())}</b>`).join(', ') });
      line.hidden = false;
    } catch { /* no list yet */ }
  }

  function open() {
    hidePanels();
    panel.hidden = false;
    track('donateOpened');
    thank();
  }
  button.onclick = open;

  return {
    // shown outside a match only: the menu (no room), a lobby, the end of a match
    show(phase) {
      button.hidden = !on || !(phase == null || phase === 'lobby' || phase === 'matchEnd');
      if (button.hidden) close();
    },
    // the invitation under the end-of-match buttons
    strip: () => (on ? `<div class="donate-strip">${HEART}<p>${t('donate.strip1')}<br><span>${t('donate.strip2')}</span></p><button type="button" class="btn donate-open">${t('donate.button')}</button></div>` : ''),
    wire(root) { root.querySelector('.donate-open')?.addEventListener('click', open); },
  };
}
