// Tells Bing, Yandex, Naver and the other IndexNow engines (not Google) which of the game's pages
// exist, after each deploy (deploy.sh). The key is public by design: the engines fetch it from the
// site to check the request comes from its owner. URLs are the sitemap's (public/sitemap.xml).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const HOST = 'play.billthedevstudio.com';
const key = fs.readdirSync(PUBLIC).find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, 32);
const urls = [...fs.readFileSync(path.join(PUBLIC, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
if (!key || !urls.length) {
  console.log('indexnow: no key or no urls, skipped');
  process.exit(0);
}
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/slam-cards/${key}.txt`, urlList: urls }),
}).catch((err) => ({ status: `failed: ${err.message}` }));
console.log(`indexnow: ${urls.length} url(s), answer ${res.status}`);
