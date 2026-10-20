// Google H5 Games Ads (Ad Placement API, through AdSense). Off unless the server writes
// <meta name="slam-ads" content="ca-pub-…"> into the page (SLAM_ADSENSE_CLIENT, server/ads.js);
// without it nothing loads and the game is exactly as before.
//
// One placement only: a 'preroll' while the page loads, for players who already know the game.
// It covers the menu (no room yet), so no turn timer runs and nobody waits for this player:
//  - never with ?room= in the address: that is an invite link (a friend's first look at the game,
//    and the room host is waiting) or a reload back into a seat in a live match;
//  - never before `minMatches` finished matches on this device;
//  - at most one per `matchesPerAd` matches or `minutesPerAd` minutes, never within `floorMinutes`.
// "Về menu" at the end of a match reloads the page, so that is where most of these show; the
// old socket is already closed by then, so the table does not see this player as still there.
// "Tìm trận mới" and "Tái đấu" never show one: other players are waiting on those.
import { ADS } from './config.js';

export const CLIENT_ID = /^ca-pub-\d{16}$/;
const STATS_KEY = 'slam-ads';
const SHOWN = ['viewed', 'dismissed'];

export function readAdsConfig(doc) {
  const tag = doc?.querySelector?.('meta[name="slam-ads"]');
  const client = tag?.getAttribute('content') || '';
  return CLIENT_ID.test(client) ? { client, test: tag.getAttribute('data-test') === 'on' } : null;
}

export function loadStats(storage) {
  try {
    const s = JSON.parse(storage?.getItem(STATS_KEY) || '{}');
    return { matches: Number(s.matches) || 0, sinceAd: Number(s.sinceAd) || 0, lastAdAt: Number(s.lastAdAt) || 0 };
  } catch {
    return { matches: 0, sinceAd: 0, lastAdAt: 0 };
  }
}

function saveStats(storage, stats) {
  try { storage?.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* private mode */ }
}

// A finished match this player took part in.
export function countMatch(stats) {
  return { ...stats, matches: stats.matches + 1, sinceAd: stats.sinceAd + 1 };
}

export function adDue(stats, now, cfg = ADS) {
  const minutes = (now - stats.lastAdAt) / 60000;
  if (stats.matches < cfg.minMatches) return false;
  if (minutes < cfg.floorMinutes) return false;
  return stats.sinceAd >= cfg.matchesPerAd || minutes >= cfg.minutesPerAd;
}

// The lobby banner: the same people as the page-load ad (no invite link, past the first matches),
// with no count between them: it sits beside a lobby, it never stops anyone.
export function bannerAllowed(search, stats, cfg = ADS) {
  const query = new URLSearchParams(search);
  if (query.has('room') || query.has('noads') || query.has('clean')) return false;
  return stats.matches >= cfg.minMatches;
}

// Page-load ad: only on the plain menu address, never for a room link or a seat being resumed.
export function prerollAllowed(search, stats, now, cfg = ADS) {
  const query = new URLSearchParams(search);
  if (query.has('room') || query.has('noads') || query.has('clean')) return false;
  return adDue(stats, now, cfg);
}

// env: { doc, storage, search, now, mute(on) }. Returns { enabled, preroll(), lobbyBanner(box), matchFinished() }.
export function createAds(env) {
  const config = readAdsConfig(env.doc);
  const off = { enabled: false, preroll: () => Promise.resolve('off'), lobbyBanner: () => false, matchFinished() {} };
  if (!config) return off;
  const now = env.now ?? Date.now;
  const storage = env.storage;

  const script = env.doc.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.client}`;
  script.setAttribute('data-ad-frequency-hint', ADS.frequencyHint);
  if (config.test) script.setAttribute('data-adbreak-test', 'on');
  const win = env.doc.defaultView ?? globalThis;
  win.adsbygoogle = win.adsbygoogle || [];
  const push = (o) => win.adsbygoogle.push(o);
  let failed = false;
  const failWaiters = [];
  script.onerror = () => { failed = true; failWaiters.splice(0).forEach((f) => f()); }; // ad blocker, offline
  env.doc.head.appendChild(script);
  push({ preloadAdBreaks: 'on', sound: 'on' }); // adConfig

  return {
    enabled: true,
    // Resolves with the break status once any ad is over (or none came).
    preroll() {
      if (!prerollAllowed(env.search, loadStats(storage), now())) return Promise.resolve('skipped');
      // a preroll takes no beforeAd/afterAd, so the game is quiet from the call until adBreakDone
      env.mute(true);
      return new Promise((resolve) => {
        let done = false;
        const finish = (status) => {
          if (done) return;
          done = true;
          clearTimeout(safety);
          env.mute(false);
          if (SHOWN.includes(status)) saveStats(storage, { ...loadStats(storage), sinceAd: 0, lastAdAt: now() });
          resolve(status);
        };
        const safety = setTimeout(() => finish('timeout'), ADS.safetyMs);
        if (failed) finish('error');
        else failWaiters.push(() => finish('error'));
        push({ type: 'preroll', adBreakDone: (info) => finish(info?.breakStatus ?? 'other') });
      });
    },
    // Fills `box` with the display unit once and asks Google for an ad; false when this player
    // gets none. The caller keeps the box for the whole room visit (a banner drawn again would ask
    // again: refreshing ads that way is against AdSense rules).
    lobbyBanner(box) {
      if (!bannerAllowed(env.search, loadStats(storage))) return false;
      box.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%;height:100%" data-ad-client="${config.client}" data-ad-slot="${ADS.lobbySlot}"></ins>`;
      push({});
      return true;
    },
    matchFinished() {
      saveStats(storage, countMatch(loadStats(storage)));
    },
  };
}
