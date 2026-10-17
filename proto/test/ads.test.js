// Ads (src/ads.js client gating, server/ads.js switch): off unless configured, page-load only,
// never into a room or a live seat, frequency-capped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer, httpGet } from './harness.js';
import { createAds, readAdsConfig, adDue, prerollAllowed, countMatch, loadStats } from '../src/ads.js';
import os from 'node:os';
import path from 'node:path';
import { adsConfig, adsFileClient, withAds, adsTxt } from '../server/ads.js';
import { ADS } from '../src/config.js';

const DIST_INDEX = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const CLIENT = 'ca-pub-0000000000000000'; // a dummy id of the right shape, not a real account
const MIN = 60000;

// Just enough DOM for ads.js: a <meta> lookup, script creation, <head>.
function fakeDoc(metaContent, test = false) {
  const added = [];
  const win = {};
  return {
    added,
    win,
    defaultView: win,
    head: { appendChild: (el) => added.push(el) },
    createElement: (tag) => ({ tag, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
    querySelector: (sel) => (sel === 'meta[name="slam-ads"]' && metaContent != null
      ? { getAttribute: (k) => (k === 'content' ? metaContent : k === 'data-test' && test ? 'on' : null) }
      : null),
  };
}
function fakeStorage(init = {}) {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); } };
}
const veteran = (extra = {}) => fakeStorage({ 'slam-ads': JSON.stringify({ matches: 10, sinceAd: 5, lastAdAt: 0, ...extra }) });

test('ads off: no meta tag means no script, no adsbygoogle, no ad, matches not counted', async () => {
  for (const meta of [null, '', 'ca-pub-123', 'pub-0000000000000000', '"><script>']) {
    const doc = fakeDoc(meta);
    const storage = veteran();
    const before = JSON.stringify(storage.data);
    const muted = [];
    const ads = createAds({ doc, storage, search: '', mute: (on) => muted.push(on) });
    assert.equal(ads.enabled, false, `meta ${meta}`);
    assert.equal(await ads.preroll(), 'off');
    ads.matchFinished();
    assert.equal(doc.added.length, 0, 'no script tag');
    assert.equal(doc.win.adsbygoogle, undefined, 'no ad queue');
    assert.deepEqual(muted, [], 'sound untouched');
    assert.equal(JSON.stringify(storage.data), before, 'nothing written');
  }
});

test('ads off: the server sends no tag and no ads.txt without SLAM_ADSENSE_CLIENT', { skip: !fs.existsSync(DIST_INDEX) && 'needs npm run build' }, async () => {
  const built = fs.readFileSync(DIST_INDEX, 'utf8');
  assert.doesNotMatch(built, /adsbygoogle|googlesyndication|slam-ads/, 'the build itself carries no ad tag');
  const srv = await startServer({}, { SLAM_ADSENSE_CLIENT: '' });
  try {
    const page = await httpGet(srv.port, '/');
    assert.equal(page.status, 200);
    assert.doesNotMatch(page.body, /slam-ads|googlesyndication/);
    assert.equal((await httpGet(srv.port, '/ads.txt')).status, 404);
  } finally { srv.stop(); }
});

test('server switch: a valid id turns ads on (meta tag + ads.txt), anything else keeps them off', () => {
  assert.equal(adsConfig({}), null);
  assert.equal(adsConfig({ SLAM_ADSENSE_CLIENT: 'pub-0000000000000000' }), null);
  assert.equal(adsConfig({ SLAM_ADSENSE_CLIENT: 'ca-pub-12' }), null);
  const on = adsConfig({ SLAM_ADSENSE_CLIENT: ` ${CLIENT} `, SLAM_ADS_TEST: '1' });
  assert.deepEqual(on, { client: CLIENT, test: true });
  assert.equal(withAds('<head></head>', null), '<head></head>');
  const html = withAds('<head><title>x</title></head>', on);
  assert.match(html, /<meta name="slam-ads" content="ca-pub-0000000000000000" data-test="on">\n<\/head>/);
  assert.equal(adsTxt(null), null);
  assert.equal(adsTxt(on), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
});

test('ads on: the server writes the tag into the page and serves ads.txt', { skip: !fs.existsSync(DIST_INDEX) && 'needs npm run build' }, async () => {
  const srv = await startServer({}, { SLAM_ADSENSE_CLIENT: CLIENT });
  try {
    const page = await httpGet(srv.port, '/?room=ABCD');
    assert.match(page.body, /<meta name="slam-ads" content="ca-pub-0000000000000000">/);
    assert.doesNotMatch(page.body, /data-test/);
    const txt = await httpGet(srv.port, '/ads.txt');
    assert.equal(txt.status, 200);
    assert.equal(txt.body.toString(), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
  } finally { srv.stop(); }
});

test('client: reads the meta switch, loads one adsbygoogle script with test mode and the frequency hint', () => {
  assert.deepEqual(readAdsConfig(fakeDoc(CLIENT, true)), { client: CLIENT, test: true });
  const doc = fakeDoc(CLIENT, true);
  const ads = createAds({ doc, storage: fakeStorage(), search: '', mute() {} });
  assert.equal(ads.enabled, true);
  assert.equal(doc.added.length, 1);
  const [script] = doc.added;
  assert.equal(script.src, `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`);
  assert.equal(script.async, true);
  assert.equal(script.attrs['data-adbreak-test'], 'on');
  assert.equal(script.attrs['data-ad-frequency-hint'], ADS.frequencyHint);
  assert.deepEqual(doc.win.adsbygoogle[0], { preloadAdBreaks: 'on', sound: 'on' }, 'adConfig first');
  const live = fakeDoc(CLIENT);
  createAds({ doc: live, storage: fakeStorage(), search: '', mute() {} });
  assert.equal(live.added[0].attrs['data-adbreak-test'], undefined, 'no test mode unless asked');
});

test('cap: new players get no ad; then one per 3 matches or 5 minutes, never within 2 minutes', () => {
  const now = 100 * MIN;
  const at = (matches, sinceAd, minutesAgo) => adDue({ matches, sinceAd, lastAdAt: now - minutesAgo * MIN }, now);
  assert.equal(adDue({ matches: 0, sinceAd: 0, lastAdAt: 0 }, now), false, 'first visit');
  assert.equal(adDue({ matches: 1, sinceAd: 1, lastAdAt: 0 }, now), false, 'after the first match (invited friend)');
  assert.equal(adDue({ matches: 2, sinceAd: 2, lastAdAt: 0 }, now), true, 'never had one, played 2');
  assert.equal(at(10, 1, 3), false, '1 match, 3 minutes after the last ad');
  assert.equal(at(10, 3, 3), true, '3 matches since the last ad');
  assert.equal(at(10, 0, 5), true, '5 minutes since the last ad');
  assert.equal(at(10, 9, 1.5), false, 'floor: never within 2 minutes');
  assert.deepEqual(countMatch({ matches: 1, sinceAd: 0, lastAdAt: 7 }), { matches: 2, sinceAd: 1, lastAdAt: 7 });
  assert.deepEqual(loadStats(fakeStorage({ 'slam-ads': 'junk' })), { matches: 0, sinceAd: 0, lastAdAt: 0 });
  assert.deepEqual(loadStats(null), { matches: 0, sinceAd: 0, lastAdAt: 0 }, 'storage blocked');
});

test('never into a room: invite links and reloads into a live seat get no ad, nor ?noads / ?clean', () => {
  const stats = { matches: 10, sinceAd: 10, lastAdAt: 0 };
  const now = 100 * MIN;
  assert.equal(prerollAllowed('', stats, now), true);
  assert.equal(prerollAllowed('?ref=tt&lang=en', stats, now), true);
  assert.equal(prerollAllowed('?room=ABCD', stats, now), false, 'invite link / reload mid-match');
  assert.equal(prerollAllowed('?ref=fb&room=ABCD', stats, now), false);
  assert.equal(prerollAllowed('?noads', stats, now), false);
  assert.equal(prerollAllowed('?clean', stats, now), false);
});

test('preroll: mutes until adBreakDone, records a shown ad, counts matches; skipped breaks do not reset the cap', async () => {
  let clock = 100 * MIN;
  const storage = veteran();
  const doc = fakeDoc(CLIENT);
  const muted = [];
  const ads = createAds({ doc, storage, search: '', now: () => clock, mute: (on) => muted.push(on) });
  const pending = ads.preroll();
  const breakCall = doc.win.adsbygoogle.at(-1);
  assert.equal(breakCall.type, 'preroll');
  assert.equal(breakCall.beforeAd, undefined, 'preroll takes no beforeAd/afterAd');
  assert.deepEqual(muted, [true]);
  breakCall.adBreakDone({ breakStatus: 'viewed' });
  assert.equal(await pending, 'viewed');
  assert.deepEqual(muted, [true, false], 'sound back after the ad');
  assert.deepEqual(loadStats(storage), { matches: 10, sinceAd: 0, lastAdAt: clock });

  clock += 3 * MIN;
  assert.equal(await ads.preroll(), 'skipped', 'just had one');
  ads.matchFinished();
  ads.matchFinished();
  ads.matchFinished();
  assert.deepEqual(loadStats(storage), { matches: 13, sinceAd: 3, lastAdAt: clock - 3 * MIN });
  const again = ads.preroll();
  doc.win.adsbygoogle.at(-1).adBreakDone({ breakStatus: 'frequencyCapped' });
  assert.equal(await again, 'frequencyCapped');
  assert.equal(loadStats(storage).sinceAd, 3, 'no ad shown, still due');
  assert.deepEqual(muted, [true, false, true, false]);
});

test('preroll: an ad blocker (script error) gives the sound back at once', async () => {
  const doc = fakeDoc(CLIENT);
  const muted = [];
  const ads = createAds({ doc, storage: veteran(), search: '', mute: (on) => muted.push(on) });
  const pending = ads.preroll();
  doc.added[0].onerror();
  assert.equal(await pending, 'error');
  assert.deepEqual(muted, [true, false]);
});

test('the publisher id can live in data/ads.json; a missing or broken file means none', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slam-ads-'));
  const file = path.join(dir, 'ads.json');
  assert.equal(adsFileClient(file), undefined);
  fs.writeFileSync(file, '{oops');
  assert.equal(adsFileClient(file), undefined);
  fs.writeFileSync(file, JSON.stringify({ client: 'ca-pub-1234567890123456' }));
  assert.equal(adsFileClient(file), 'ca-pub-1234567890123456');
  assert.equal(adsConfig({ SLAM_ADSENSE_CLIENT: adsFileClient(file) }).client, 'ca-pub-1234567890123456');
  fs.rmSync(dir, { recursive: true });
});
