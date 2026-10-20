// "Báo lỗi" (G6): from the Info panel, a few lines from the player plus what this device says
// (build, browser, screen, language, room, phase, the page's last errors) go to the server
// (server/reports.js), which keeps them for Bill and sends them on to him on Telegram.
import { t, lang } from './i18n.js';

const ERRORS_KEPT = 5;
const errors = [];
const keep = (text) => {
  errors.push(String(text).slice(0, 200));
  if (errors.length > ERRORS_KEPT) errors.shift();
};
addEventListener('error', (e) => keep(e.message || 'error'));
addEventListener('unhandledrejection', (e) => keep(e.reason?.message ?? String(e.reason)));

// send(msg): the socket; context(): { build, room, phase }; toast(text): a short message.
export function createReport({ send, context, toast }) {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="report-panel" class="panel-box report-panel" hidden>
      <h2>${t('report.title')}</h2>
      <label class="report-label" for="report-text">${t('report.ask')}</label>
      <textarea id="report-text" class="input" rows="4" maxlength="1000"></textarea>
      <p class="muted">${t('report.note')}</p>
      <div class="row"><button type="button" class="btn pri" id="report-send">${t('report.send')}</button><button type="button" class="btn" id="report-close">${t('common.close')}</button></div>
    </div>`);
  const panel = document.getElementById('report-panel');
  const text = document.getElementById('report-text');
  const sendButton = document.getElementById('report-send');
  const close = () => { panel.hidden = true; };
  document.getElementById('report-close').onclick = close;

  sendButton.onclick = () => {
    if (!text.value.trim()) {
      text.focus();
      return;
    }
    sendButton.disabled = true;
    const { build, room, phase } = context();
    send({
      t: 'report',
      text: text.value,
      diag: { build, room, phase, lang: lang(), ua: navigator.userAgent, screen: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, errors: [...errors] },
    });
  };

  return {
    open() {
      panel.hidden = false;
      sendButton.disabled = false;
      text.focus();
    },
    close,
    // the server's answer: { t: 'report', result: 'ok' | 'empty' | 'limited' }
    answered(result) {
      sendButton.disabled = false;
      if (result === 'ok') {
        text.value = '';
        close();
        toast(t('report.thanks'));
      } else toast(t(result === 'limited' ? 'report.limited' : 'report.empty'));
    },
  };
}
