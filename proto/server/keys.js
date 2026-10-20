// The game server's secrets, in <SLAM_DATA>/keys.json (mode 600, never in git or the deploy archive):
//   deviceKey  signs the device ids it gives out (devices.js); made here on first start
//   apiUrl, apiKey  the progress store (progress.js, worker/) and the key it shares with it; set by
//              hand on the VPS. Without them the store is off and the game plays as before.
// SLAM_API_URL / SLAM_API_KEY / SLAM_DEVICE_KEY override the file (tests, local runs).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_DIR } from './refs.js';

export const KEYS_FILE = path.join(DATA_DIR, 'keys.json');

export function loadKeys(env = process.env, file = KEYS_FILE) {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* first start */ }
  if (!saved.deviceKey && !env.SLAM_DEVICE_KEY) {
    saved.deviceKey = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(saved, null, 2)}\n`, { mode: 0o600 });
  }
  return {
    deviceKey: env.SLAM_DEVICE_KEY || saved.deviceKey,
    apiUrl: env.SLAM_API_URL ?? saved.apiUrl ?? '',
    apiKey: env.SLAM_API_KEY ?? saved.apiKey ?? '',
  };
}
