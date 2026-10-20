// A player's own menu (2.12): tap someone's chip in a match, or their seat in a lobby, to mute their
// stickers and chat (social.js) or report them to Bill (server/reports.js, then Telegram). A report
// says why (one of REASONS) and may add a few words; the server adds their name, the room and their
// last chat lines.
import { t } from './i18n.js';
import { REPORT_REASONS as REASONS } from './catalog.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// social: { toggleMute(seat), isMuted(seat) }; send(msg); nameOf(seat); toast(text); onMuteChange()
export function createPlayerMenu({ social, send, nameOf, toast, onMuteChange = () => {} }) {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="player-menu" class="player-menu" role="menu" hidden>
      <p class="pm-name"></p>
      <button type="button" class="btn pm-mute" role="menuitem"></button>
      <button type="button" class="btn pm-report" role="menuitem">${t('playerMenu.report')}</button>
    </div>
    <div id="player-report" class="panel-box player-report" hidden>
      <h2></h2>
      <div class="pr-reasons">${REASONS.map((r) => `<label><input type="radio" name="pr-reason" value="${r}"> ${t(`playerMenu.reason.${r}`)}</label>`).join('')}</div>
      <textarea id="pr-note" class="input" rows="2" maxlength="300" placeholder="${esc(t('playerMenu.note'))}"></textarea>
      <div class="row"><button type="button" class="btn pri" id="pr-send">${t('report.send')}</button><button type="button" class="btn" id="pr-close">${t('common.close')}</button></div>
    </div>`);
  const menu = document.getElementById('player-menu');
  const form = document.getElementById('player-report');
  let seat = null;

  const closeMenu = () => { menu.hidden = true; };
  const closeForm = () => { form.hidden = true; };
  addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target)) closeMenu(); }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeForm(); } });

  menu.querySelector('.pm-mute').onclick = () => {
    social.toggleMute(seat);
    onMuteChange();
    closeMenu();
  };
  menu.querySelector('.pm-report').onclick = () => {
    closeMenu();
    form.querySelector('h2').textContent = t('playerMenu.reportTitle', { name: nameOf(seat) });
    form.querySelectorAll('input[name="pr-reason"]').forEach((r) => { r.checked = false; });
    form.querySelector('#pr-note').value = '';
    form.querySelector('#pr-send').disabled = false;
    form.hidden = false;
  };
  form.querySelector('#pr-close').onclick = closeForm;
  form.querySelector('#pr-send').onclick = () => {
    const reason = form.querySelector('input[name="pr-reason"]:checked')?.value;
    if (!reason) {
      toast(t('playerMenu.pickReason'));
      return;
    }
    form.querySelector('#pr-send').disabled = true;
    send({ t: 'reportPlayer', seat, reason, note: form.querySelector('#pr-note').value });
  };

  return {
    // anchor: the element tapped; the menu opens just above it, inside the screen
    open(target, anchor) {
      seat = target;
      menu.querySelector('.pm-name').textContent = nameOf(target);
      menu.querySelector('.pm-mute').textContent = t(social.isMuted(target) ? 'playerMenu.unmute' : 'playerMenu.mute');
      menu.hidden = false;
      const r = anchor.getBoundingClientRect();
      const w = menu.offsetWidth;
      const h = menu.offsetHeight;
      const top = r.bottom + 8 + h < innerHeight ? r.bottom + 6 : Math.max(8, r.top - h - 6);
      menu.style.left = `${Math.min(Math.max(8, r.left), innerWidth - w - 8)}px`;
      menu.style.top = `${top}px`;
    },
    // the server's answer: { t: 'reportPlayer', result }
    answered(result) {
      form.querySelector('#pr-send').disabled = false;
      if (result === 'ok') {
        closeForm();
        toast(t('playerMenu.thanks'));
      } else toast(t(result === 'limited' ? 'report.limited' : 'playerMenu.pickReason'));
    },
    closeAll() { closeMenu(); closeForm(); },
  };
}
