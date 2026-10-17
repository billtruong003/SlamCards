// Ads switch (client side: src/ads.js). Start the server with SLAM_ADSENSE_CLIENT=ca-pub-<16 digits>
// (the AdSense publisher id) to turn ads on; SLAM_ADS_TEST=1 adds Google's test mode (fake ads,
// no money, for checking the flow before approval). Unset or malformed = no ads: the page gets no
// tag and /ads.txt does not exist.
import fs from 'node:fs';
import { CLIENT_ID } from '../src/ads.js';

export function adsConfig(env = process.env) {
  const client = String(env.SLAM_ADSENSE_CLIENT || '').trim();
  if (!client) return null;
  if (!CLIENT_ID.test(client)) {
    console.warn(`[ads] SLAM_ADSENSE_CLIENT "${client}" is not ca-pub-<16 digits>; ads stay off`);
    return null;
  }
  return { client, test: env.SLAM_ADS_TEST === '1' };
}

// The publisher id saved in a JSON file ({"client": "ca-pub-…"}), or undefined when there is none.
export function adsFileClient(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')).client; } catch { return undefined; }
}

// index.html with the switch the client reads; unchanged when ads are off.
export function withAds(html, config) {
  if (!config) return html;
  const tag = `<meta name="slam-ads" content="${config.client}"${config.test ? ' data-test="on"' : ''}>`;
  return html.replace('</head>', `${tag}\n</head>`);
}

// The ads.txt line for AdSense: google.com, pub-…, DIRECT, f08c47fec0942fa0 (Google's fixed TAG id).
// nginx sends billthedevstudio.io.vn/ads.txt here (proto/deploy/nginx-slam-domain.conf).
export function adsTxt(config) {
  return config ? `google.com, ${config.client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n` : null;
}
