// Bug reports from players (G6): a few lines of their own plus what their device says (build,
// browser, screen, language, room, phase, the page's last errors), one JSON line each in
// <SLAM_DATA>/reports/<Vietnam day>.jsonl. A cron script on the VPS (deploy/report-notify.sh) sends
// new ones to Bill on Telegram. Nothing about who: no IP, no name, no token.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './refs.js';
import { vnDay } from './daily.js';

export const REPORTS_DIR = path.join(DATA_DIR, 'reports');
const TEXT_MAX = 1000;
const PER_SOCKET = 3; // reports one connection may send
const GAP_MS = 60000; // between two from the same connection
const PER_DAY = 500; // for the whole server: a flood cannot fill the disk
const KEEP_DAYS = 90;

let today = '';
let todayCount = 0;

// printable text only (control characters dropped; line breaks kept in the player's text, at most
// two in a row), trimmed and cut to `max`
const clean = (value, max, lines = false) => String(value ?? '')
  .replace(lines ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()
  .slice(0, max);

// What the client may tell about its device, and nothing else.
function cleanDiag(d) {
  if (!d || typeof d !== 'object') return {};
  const errors = Array.isArray(d.errors) ? d.errors.slice(-5).map((e) => clean(e, 200)).filter(Boolean) : [];
  return {
    build: clean(d.build, 20),
    ua: clean(d.ua, 300),
    screen: clean(d.screen, 20),
    lang: clean(d.lang, 10),
    room: /^[A-Z2-9]{4}$/.test(d.room ?? '') ? d.room : '',
    phase: clean(d.phase, 16),
    errors,
  };
}

// msg: { t: 'report', text, diag }. Returns 'ok', 'empty' (no words), or 'limited'.
export function saveReport(ws, msg, now = Date.now()) {
  const text = clean(msg.text, TEXT_MAX, true);
  if (!text) return 'empty';
  ws.reports ??= { n: 0, last: 0 };
  const day = vnDay(now);
  if (day !== today) {
    today = day;
    todayCount = 0;
  }
  if (ws.reports.n >= PER_SOCKET || now - ws.reports.last < GAP_MS || todayCount >= PER_DAY) return 'limited';
  ws.reports.n += 1;
  ws.reports.last = now;
  todayCount += 1;
  const line = JSON.stringify({ at: new Date(now).toISOString(), text, ...cleanDiag(msg.diag) });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.appendFile(path.join(REPORTS_DIR, `${day}.jsonl`), `${line}\n`, (err) => {
    if (err) console.error(`[reports] ${err.message}`);
  });
  return 'ok';
}

// Day files older than KEEP_DAYS go (at start-up).
export function pruneReports(now = Date.now()) {
  let files = [];
  try { files = fs.readdirSync(REPORTS_DIR); } catch { return; }
  const oldest = vnDay(now - KEEP_DAYS * 86400000);
  for (const f of files) if (/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f) && f.slice(0, 10) < oldest) fs.rmSync(path.join(REPORTS_DIR, f));
}
