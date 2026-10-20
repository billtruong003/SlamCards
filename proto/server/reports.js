// Reports for Bill, one JSON line each in <SLAM_DATA>/reports/<Vietnam day>.jsonl; a cron script on
// the VPS (deploy/report-notify.sh) sends new ones to him on Telegram.
// - Bug reports (G6): a few lines from the player plus what their device says (build, browser,
//   screen, language, room, phase, the page's last errors). Nothing about who sent it.
// - Player reports (2.12, type 'player'): why, and the reported player's name, room and last chat
//   lines. Nothing about who reported. Never an IP or a token.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './refs.js';
import { vnDay } from './daily.js';
import { REPORT_REASONS } from '../src/catalog.js';

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

// One more report from this connection, if the limits allow: true, counted; false, refused.
function admit(ws, now) {
  ws.reports ??= { n: 0, last: 0 };
  const day = vnDay(now);
  if (day !== today) {
    today = day;
    todayCount = 0;
  }
  if (ws.reports.n >= PER_SOCKET || now - ws.reports.last < GAP_MS || todayCount >= PER_DAY) return false;
  ws.reports.n += 1;
  ws.reports.last = now;
  todayCount += 1;
  return true;
}

function write(report, now) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.appendFile(path.join(REPORTS_DIR, `${vnDay(now)}.jsonl`), `${JSON.stringify({ at: new Date(now).toISOString(), ...report })}\n`, (err) => {
    if (err) console.error(`[reports] ${err.message}`);
  });
}

// A bug report, msg: { t: 'report', text, diag }. Returns 'ok', 'empty' (no words), or 'limited'.
export function saveReport(ws, msg, now = Date.now()) {
  const text = clean(msg.text, TEXT_MAX, true);
  if (!text) return 'empty';
  if (!admit(ws, now)) return 'limited';
  write({ text, ...cleanDiag(msg.diag) }, now);
  return 'ok';
}

// A player reported by another (2.12): why (REPORT_REASONS), a few words, and what the server knows
// of them (name, computer player or not, the room, their last chat lines). Returns 'ok', 'bad' (no
// such reason) or 'limited' (the same limits as bug reports).
export function savePlayerReport(ws, { reason, note, name, bot, room, kind, chat }, now = Date.now()) {
  if (!REPORT_REASONS.includes(reason)) return 'bad';
  if (!admit(ws, now)) return 'limited';
  write({
    type: 'player', reason, text: clean(note, 300, true), reported: clean(name, 40), bot: Boolean(bot), room, kind,
    chat: (chat ?? []).slice(-5).map((line) => clean(line, 120)),
  }, now);
  return 'ok';
}

// Day files older than KEEP_DAYS go (at start-up).
export function pruneReports(now = Date.now()) {
  let files = [];
  try { files = fs.readdirSync(REPORTS_DIR); } catch { return; }
  const oldest = vnDay(now - KEEP_DAYS * 86400000);
  for (const f of files) if (/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f) && f.slice(0, 10) < oldest) fs.rmSync(path.join(REPORTS_DIR, f));
}
