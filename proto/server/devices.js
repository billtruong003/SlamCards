// Device ids (2.01): the game server gives each browser a random id with its signature,
// "<id>.<signature>", which the browser keeps (src/device.js) and sends in every hello. Only an id
// with a good signature is believed, so nobody can claim another device's coins by making one up.
import crypto from 'node:crypto';

const ID_BYTES = 12; // 16 base64url characters
const SIG_CHARS = 32;
const TOKEN = /^([A-Za-z0-9_-]{16})\.([0-9a-f]{32})$/;

const signature = (key, id) => crypto.createHmac('sha256', key).update(`device:${id}`).digest('hex').slice(0, SIG_CHARS);

export function newDevice(key) {
  const id = crypto.randomBytes(ID_BYTES).toString('base64url');
  return { id, token: `${id}.${signature(key, id)}` };
}

// the id in a token this server signed, else null
export function deviceId(key, token) {
  const m = TOKEN.exec(typeof token === 'string' ? token : '');
  if (!m) return null;
  const good = Buffer.from(signature(key, m[1]));
  return crypto.timingSafeEqual(good, Buffer.from(m[2])) ? m[1] : null;
}
