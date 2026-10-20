// The game server's requests to the progress store (worker/, Phase 2) are signed: an HMAC-SHA256 of
// "<time>.<body>" with the key both sides hold, sent as x-slam-time and x-slam-sig. The store refuses
// a request older or newer than MAX_SKEW_MS. WebCrypto only, so the same code runs in Node and in the
// Cloudflare Worker.
export const MAX_SKEW_MS = 60000;
const encoder = new TextEncoder();
const keys = new Map(); // secret -> CryptoKey

async function hmacKey(secret) {
  if (!keys.has(secret)) {
    keys.set(secret, await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']));
  }
  return keys.get(secret);
}

export async function hmacHex(secret, text) {
  const mac = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(text));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const sign = (secret, time, body) => hmacHex(secret, `${time}.${body}`);

// the same length and the same characters, in time that does not depend on where they differ
export function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
