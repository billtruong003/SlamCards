// This browser's device token (2.01): "<id>.<signature>" from the game server (server/devices.js),
// kept on the device and sent in every hello, so coins and xp (Phase 2) stay with the device.
const KEY = 'slam-device';

export function deviceToken() {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; } // private mode, storage blocked
}

export function keepDevice(token) {
  try { localStorage.setItem(KEY, token); } catch { /* private mode: a new id next time */ }
}
