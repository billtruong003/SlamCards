# Distribution platforms for a web (three.js + Rapier) 2-4 player party game with its own WebSocket server

Context: Flip-Flop Slam / Dép Lào Tuổi Thơ, https://play.billthedevstudio.com/slam-cards/, a few MB client, Node WS rooms on our VPS, monetized with Google ads + donations. Research date: Oct 2026. About 30 search/fetch calls. Official docs were fetched for YouTube Playables, Meta Instant Games, CrazyGames multiplayer, Discord discovery and Steam Direct. Many portal and Asian-messenger details were not reachable from primary sources, and those are listed as gaps.

## Chat and social platforms (Discord, Telegram, Facebook, Zalo, LINE, Kakao, Snapchat, YouTube Playables)

### Takeaway
Discord Activities fits best: it is a social, instant, small-group multiplayer surface, it runs our web build in an iframe, and our own backend reaches it through URL mapping. Discovery needs verification, though, and there is no browsable store. YouTube Playables is a poor fit as things stand: own ads are banned, it is invite-only beta, and there is no documented support for external servers. Meta Web Games are being shut down, and only Zero-Permissions Instant Games remain. Snapchat Games is dead. Telegram fits technically, but discovery runs on links and search. Zalo and LINE are unverified for games, and Vietnam's G1 licensing (Decree 147/2024) is the real blocker for a domestic multiplayer listing.

### Cited Findings
**Discord Activities**
- Activities are web apps running in an iframe inside Discord on desktop, mobile and web. The SDK is `@discord/embedded-app-sdk`. — [Discord docs: building an activity](https://docs.discord.com/developers/activities/building-an-activity); [GitHub embedded-app-sdk](https://github.com/discord/embedded-app-sdk)
- Activities opened to all developers in September 2024, with monetization included. — [Gigazine](https://gigazine.net/gsc_news/en/20240927-discord-new-monetization-feature)
- Setup: create an app in the Developer Portal, enable Activities, host the build on public HTTPS, and map URL prefixes (for example `/` to the game, `/api` to the backend). All traffic goes through the `discordsays.com` proxy under a strict CSP, and unmapped hosts fail with `blocked:csp`. `patchUrlMappings` rewrites runtime URLs. Flow: `ready()`, then `authorize()`/`authenticate()`, then read channel participants. — [Cinevva guide 2026 (third party)](https://app.cinevva.com/ko/guides/publish-game-discord-activities)
- No browsable store: players find Activities through shared links, friends' voice sessions and word of mouth. The App Launcher and Directory listing appear only after verification and opting into Discovery. — [Cinevva](https://app.cinevva.com/ko/guides/publish-game-discord-activities); [Discord docs: enabling discovery](https://docs.discord.com/developers/discovery/enabling-discovery)
- Discovery requires the team owner to complete identity and application verification. After that, the developer opts in on the Discovery Status tab, and the app shows in the App Directory and App Launcher. **Unverified Activities can only launch in servers with fewer than 25 members.** — [Discord docs: enabling discovery](https://docs.discord.com/developers/discovery/enabling-discovery); [Discord dev support: discovery requirements](https://support-dev.discord.com/hc/en-us/articles/9489299950487-App-Discovery-Content-Requirements-Policy)
- Discovery content requirements: a public Privacy Policy and Terms of Service, no IP-infringing names, and content suitable for 13+. Discord can remove apps at any time. — [Discord dev support](https://support-dev.discord.com/hc/en-us/articles/9489299950487)
- Monetization: native IAP (subscriptions, durable and consumable items). Discord takes 15% of the first $1M and 30% above that, payouts start at $100, and the app must be owned by a Team with Stripe Connect. — [Cinevva](https://app.cinevva.com/ko/guides/publish-game-discord-activities); [embedded-app-sdk ref](https://github.com/devprog-dev/embedded-app-sdk)
- Reach claims from a third party citing Discord: over 25% of Discord MAU use Apps/Activities. Death by AI peaked at about 700k DAU and reached about 7M players within weeks, with over 70% of sessions having 3+ friends. Krunker Strike FRVR more than doubled its player base as an Activity. — [Cinevva](https://app.cinevva.com/ko/guides/publish-game-discord-activities)
- Poki's default web-exclusive deal explicitly covers Discord and YouTube Playables, so a Poki exclusive would block both. — [Poki bonus page](https://sdk.poki.com/bonus)

**YouTube Playables**
- Developer access is a pre-release beta. Developers apply through the Playables application form, and release goes through a Partner Manager. Every Playable is certified before launch, must suit a general 13+ audience, and cannot be made for kids. — [Playables certification requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements); [Playables overview (ko)](https://developers.google.com/youtube/gaming/playables?hl=ko)
- Size limits: initial bundle (until `gameReady`) of 30 MiB maximum (15 MiB recommended), total 250 MiB, 30 MiB per file, 8,000 files, 3 MiB of save data, interactive in under 5 seconds, peak JS heap of 512 MB. Relative paths only. — [Stability & performance reqs](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)
- Progress must be saved only through the SDK's `saveData`/`loadData`. Network calls must stop on `onPause` and resume on `onResume`. — [Integration reqs](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)
- **The game "MUST NOT display in-game advertising of any kind using off-platform services."** Only `ytgame.ads` is allowed, and off-platform IAP is banned. — [Monetization reqs](https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization)

**Facebook / Meta Instant Games**
- July 31, 2025 (updated Nov 18, 2025): from Aug 1, 2025, new Instant Games must use "Zero Permissions". **Web Games (canvas) sunset on Sept 30, 2026.** They stay only if migrated to Zero-Permissions Instant Games (same App ID). Meta says removing loading blockers doubles the share of players who pass loading, and migration gives better discoverability and notifications on Facebook and Messenger mobile. Instant Games SDK v8.0 is GA. — [Meta developer blog](https://developers.facebook.com/blog/post/2025/07/31/web-and-instant-games-changes/)
- Instant Games left the Messenger iOS app back in 2019, and play switches to the Facebook app. — [Engadget 2019](https://www.engadget.com/2019-07-26-instant-games-facebook-gaming-tab.html)
- Meta ended support for the standalone Facebook Gaming app. — [tech.co](https://tech.co/news/support-facebook-gaming-app)

**Telegram**
- Mini Apps are HTML5/JS web apps running in Telegram's WebView. Users find them through search, bot commands, shared links and the attachment menu. — [showwcase (vendor blog)](https://www.showwcase.com/article/77089/telegram-mini-games-in-2025-why-theyre-trending-and-how-to-create-your-own)
- June 2024: Telegram said more than 500M users interact with mini apps monthly, and Stars can be converted to Toncoin or spent on discounted Telegram Ads. — [Telegram blog](https://telegram.org/blog/mini-app-bar-paid-media-and-more)
- Nov 2024 "Mini Apps 2.0": full-screen portrait/landscape, home-screen shortcuts, Stars subscriptions, and developers can earn from Telegram Ads shown in mini apps. — [Telegram blog](https://telegram.org/blog/fullscreen-miniapps-and-more)
- July 31, 2024: in-app browser, and mini apps can share custom content to Stories (for example leaderboard snapshots). The URL slug says "mini-app-store", but the fetched text didn't describe the store. — [Telegram blog](https://telegram.org/blog/w3-browser-mini-app-store)
- Third-party ad networks (AdsGram) sell rewarded, banner and interstitial formats for mini apps. — [AdsGram (vendor)](https://adsgram.ai/telegram-mini-apps-unlocinkg-monetization-and-advertising-potential/)

**Zalo (Vietnam)**
- Zalo Mini Apps launched mid-2022 as small web apps (retail, entertainment, finance). Developers create them in Zalo for Developers with a Zalo account. — [Quantrimang](https://quantrimang.com/cong-nghe/zalo-mini-app-la-gi-cach-dang-ky-zalo-mini-app-204678); [Brands Vietnam](https://www.brandsvietnam.com/congdong/topic/338606-mini-app-zalo-doanh-nghiep-duoc-loi-gi-trong-cuoc-choi-moi)
- Vietnam law: Decree 147/2024/NĐ-CP replaced 72/2013 from Dec 25, 2024. A G1 game (multiplayer over the provider's server) needs **a G1 service licence plus a per-game Publishing Decision**, both held by an **enterprise**. The provider must have at least one server in Vietnam and must publish the age rating, rules and decision number. Article 44 was amended by Decree 116/2026. Players under 18 are limited to 60 minutes per game and 180 minutes per day. — [Thư viện pháp luật / legal summaries via search](https://legalzone.vn/wp-content/uploads/legal-sources/social-media-speech/nghi-dinh-147-2024-nd-cp-internet-thong-tin-mang-phan-2.pdf); [Luật Việt An G1 summary](https://luatvietan.vn/tong-hop-quy-dinh-phap-luat-ve-cung-cap-dich-vu-tro-choi-dien-tu-g1.html); [24hstore](https://24hstore.vn/cong-nghe/tu-25-12-2024-tre-em-duoi-18-tuoi-se-khong-duoc-choi-game-qua-60-phut-moi-ngay-n8942)
- VNG stopped card-image games on ZingPlay, a sign that the regulator actively enforces game rules on VNG platforms. — [Báo Pháp luật](https://doanhnhan.baophapluat.vn/cong-ty-vng-noi-gi-ve-viec-dung-cung-cap-dich-vu-tro-choi-su-dung-hinh-anh-la-bai-tren-zingplay-thoi-gian-toi-79039.html)

**LINE, Kakao, Snapchat**
- LINE MINI App regions are Japan, Thailand and Taiwan. Japan dropped its pre-examination in 2022. LINE Thailand promoted LINE MINI App and a partner programme at LINE CONFERENCE THAILAND 2025. LINE Ads in Japan are being discontinued (API ends March 2027). — [LINE Developers getting started](https://developers.line.biz/en/docs/line-mini-app/develop/develop-overview/); [LINE news](https://developers.line.biz/en/news/32/); [LY Corp](https://www.lycorp.co.jp/ja/news/release/017166/); [LINE Developers news 2026](https://developers.line.biz/en/news/2026/)
- **Snapchat Games and Minis are closed.** Snapchat Support (Feb 2023): "Games and Minis are no longer available." — [Dexerto](https://www.dexerto.com/entertainment/did-snapchat-remove-games-2057934/); [Distractify](https://www.distractify.com/p/did-snapchat-get-rid-of-games)

### Inferences
- Discord is the top social target. A 2-4 player room game started from a voice channel is the format that platform rewards. The backend can stay on our VPS through URL mapping (for example map `/ws` to our WS host). Expect to need a Discord-auth adapter and to swap our Google ads (Discord has no third-party ads path documented, and AdSense on `discordsays.com` would not match our approved site). Work: medium (SDK, proxy mapping, OAuth, 13+ ToS/privacy pages, verification). Exposure: zero until it spreads through friends, and capped at servers under 25 members until verification.
- YouTube Playables: skip for now. It is invite-only, own ads are banned, and saves are SDK-only. There is no documentation that external WS servers are allowed, and since network calls must pause with the host, an always-on room model is risky.
- Facebook: only Zero-Permissions Instant Games remain. This means a separate build with the FB SDK and its own ads (Meta Audience Network). It is low priority for a Vietnamese audience that now mostly plays outside FB.
- Telegram: technically the easiest (just a bot plus a URL, and our domain can stay the host). Share-to-chat and Stories fit a party game. Ads would be AdsGram or Telegram Ads, not AdSense. Organic discovery outside links is weak.
- Zalo: the biggest reach in Vietnam, but a multiplayer game served to Vietnamese players is legally a G1 game. A Zalo listing makes us more visible to regulators than an indie website does, and likely requires an enterprise (not an individual). Treat as blocked until we have a company and G1 papers.
- LINE (TH/JP/TW) and Kakao: low value for a Vietnamese-language game. Skip.

### Gaps
- Discord: no primary source says whether third-party ad networks or AdSense are allowed inside an Activity, or whether raw WebSockets work through the proxy (community reports say yes for mapped `wss`, but this is unverified).
- Telegram: could not confirm the current Mini App Store / "Apps" search tab listing rules from official docs (core.telegram.org/bots/webapps was not fetched).
- Zalo Mini App game content policy and whether the "Game" category accepts non-VNG developers: no official source found.
- YouTube Playables: no explicit rule found on external multiplayer servers. The Trust & Safety and Privacy pages were not fetched.
- Kakao (Korea) mini-game platform status: nothing found.
- Whether an individual (not an enterprise) can hold a G1 licence under Decree 147/116: sources only say "doanh nghiệp" (enterprise).

## Web game portals beyond the big ones (CrazyGames, Poki, GameDistribution, GamePix, GameMonetize, Y8, Newgrounds, Armor, Kongregate, io lists)

### Takeaway
Of the large portals, CrazyGames is the one with a real multiplayer programme (SDK room and invite reporting, instant multiplayer, a Friends landing page). It has no stated exclusivity, but it requires its SDK and ads at Full Launch. Poki's default deal is web exclusivity, so it conflicts with every other channel here. Syndication networks (GameDistribution, GamePix, GameMonetize) spread a build across thousands of sites but replace our ads with theirs, and their revenue shares are vague. Their multiplayer and external-server rules were not documented in sources found.

### Cited Findings
- CrazyGames multiplayer: the game must report room and joinability through the SDK so Join/Invite works. The invite button is for multiplayer invites only (misuse risks rejection) and is hidden once a match starts. — [CrazyGames multiplayer reqs](https://docs.crazygames.com/requirements/multiplayer/); [Unity SDK doc](https://docs.crazygames.com/sdk/unity/game)
- CrazyGames multiplayer rules continued:
  - "Instant multiplayer" must drop the player straight into joinable play, with at most a short config screen.
  - Round-based games must keep the same group across rounds.
  - Chat must be disable-able and moderated.
  - The game must show CrazyGames usernames and declare lobby sizes.
  - Multiplayer games that need a big audience may skip Basic Launch.
  - Full Launch requires the full SDK.
  
  — [CrazyGames multiplayer reqs](https://docs.crazygames.com/requirements/multiplayer/); [requirements intro](https://docs.crazygames.com/requirements/intro/)
- Photon Fusion has an official "Crazy Starter WebGL" sample (passes session and region through the invite link), showing that external realtime servers are used on CrazyGames. — [Photon docs](https://doc.photonengine.com/fusion/current/technical-samples/fusion-webgl)
- Poki: web exclusivity in exchange for investment (Steam and mobile still allowed). The bonus page says the default Web Exclusive term is **7 years and covers Discord and YouTube Playables**, while Playgama says 5 years (conflict). Revenue: developers keep 100% of player traffic they bring themselves and get 50% of Poki-sourced traffic. A non-exclusive flat-fee licence also exists. — [Poki deals](https://sdk.poki.com/deals); [Poki bonus](https://sdk.poki.com/bonus); [Playgama (competitor)](https://playgama.com/blog/business-faqs/should-i-go-exclusive-with-one-web/)
- Playgama (a competitor, so biased) says CrazyGames doesn't require exclusivity but pays extra for launch exclusivity. — [Playgama](https://playgama.com/blog/?p=14176)
- GamePix: developers integrate the GamePix SDK (ads) and receive a 45% revenue share (third-party profile). GamePix also handles hosting and QA. — [Dealroom](https://app.dealroom.co/companies/gamepix)
- GameDistribution doesn't publish a headline revenue share (it refers to its T&C), and there are anecdotal payment complaints on html5gamedevs. GameMonetize terms are "negotiated" per a third party. — [Playgama FAQ](https://playgama.com/blog/?p=14174); [html5gamedevs tag](https://html5gamedevs.com/tags/gamedistribution)
- io-game portals: one developer (2017) said more than 90% of their traffic came from iogames.space even after spreading to other sites. Others suggested titotu.io, 4j.com and spreadmygame.com. — [html5gamedevs thread](https://www.html5gamedevs.com/topic/33972-best-io-game-sites)
- A talk on 7 years of .io games: no review gate, easy iteration, and traffic swings with weekends and school breaks. — [GitNation](https://gitnation.com/contents/lessons-from-7-years-of-io-games-what-works-what-doesnt-work-where-to-go-from-here)
- iogames.forum accepts free game submissions and runs on two banner ads. — [iogames.forum](https://forum.codergautam.dev/t/add-your-game-to-the-iogames-forum/12858)
- Newgrounds accepts HTML5 uploads (undated forum note). The status of Armor Games and Kongregate HTML5 submissions in 2025-26 was not confirmed. — [gamedev.net](https://gamedev.net/forums/topic/638520-how-to-publish-html5-javascript-game/); [construct.net forum](https://construct.net/en/forum/general/open-topic-33/finding-audience-61911)
- Yandex Games (another large portal, strong in CIS) requires at least 10 minutes of main content or the game can be removed. — [Yandex Games requirements (vi)](https://yandex.com/dev/games/doc/vi/requirements/2/9)

### Inferences
- Pick CrazyGames (non-exclusive, real multiplayer support) over Poki (an exclusive deal kills Discord, Playables and the syndication sites, and conflicts with keeping our own site as the main home, although Poki's "keep 100% of traffic you bring" partly softens this).
- Syndication networks mostly embed a hosted zip on thousands of low-traffic sites. With a 2-4 player game that needs live rooms, a thin spread of players means empty lobbies. Bots (already built on feat/bots) or a single global room list are prerequisites before syndicating.
- io-game lists (iogames.space, io-games.zone and similar) are cheap: submit a link, our domain stays the home, our ads stay. They are worth doing on day one. "Unblocked games" sites copy builds without permission, so don't expect revenue or attribution from them.
- Newgrounds and itch.io: low effort, they keep a link back to our domain, and they give modest community exposure.

### Gaps
- No primary docs found on GameDistribution, GamePix, GameMonetize, Y8, Lagged, CoolMath, Addicting Games or Armor Games policies for external WS servers, own ads, or iframe-of-our-URL versus uploaded zip.
- Kongregate's 2025-26 upload status: not confirmed (it is known to have scaled back, but no source was found).
- CrazyGames docs fetched did not state rules on own ads, self-hosted servers or revenue share.
- No 2023-2026 post-mortem with portal traffic numbers for a small multiplayer web game was found.

## App stores (Google Play TWA, Microsoft Store PWA, Samsung, Huawei, Amazon)

### Takeaway
Wrapping the existing PWA is cheap. Bubblewrap turns it into an Android App Bundle for Play, and AdSense terms list TWAs as a supported frame, so our ads can stay. PWABuilder targets the Microsoft Store. Samsung has no fees. Store listings give search presence (ASO) in Vietnam, where Android dominates, but a party game still has to be pushed through links.

### Cited Findings
- Bubblewrap is a CLI that packages a PWA into an Android App Bundle for Google Play with no Android know-how. It now supports Play Billing. — [Google: PWA in Play](https://developers.google.com/chromeos/app-development/publish/pwa-in-play?hl=zh-cn); [Chrome TWA what's new](https://developer.chrome.com/docs/android/trusted-web-activity/whats-new?hl=tr)
- AdSense product terms list "Chrome Custom Tabs and Trusted Web Activities" as supported viewing frames on Android, and WebView content is held to the same policy as the browser. — [Google AdSense product terms](https://transparency.google/intl/is/our-policies/product-terms/google-adsense)
- Microsoft Store: PWABuilder packages PWAs. A 2023 promotion waived the roughly $19 individual account fee for a limited window. — [Microsoft Edge blog 2023](https://blogs.windows.com/msedgedev/2023/08/16/publish-your-pwa-to-the-microsoft-store-on-windows-for-free-with-pwabuilder/)
- Samsung Galaxy Store: no sign-up or annual fee, and an 80% share on paid sales. PWA submission was by emailing the URL, US-only per 2019 coverage (possibly outdated). — [Samsung Galaxy Games FAQ](https://developer.samsung.com/galaxy-games/faq.html); [XDA](https://www.xda-developers.com/developers-upload-progressive-web-apps-samsung-galaxy-store/)

### Inferences
- Google Play TWA: high value for low effort. The studio already has a Play account, the game stays served from our domain (TWA requires Digital Asset Links on our domain, which keeps our site as the main home), and players get a Vietnamese store listing. The listing must look like a real app (offline or error screen, no plain link-wrapper) to pass Play's minimum-functionality review.
- Microsoft Store via PWABuilder: an afternoon of work for small reach.
- Samsung, Huawei and Amazon: low value in Vietnam relative to the extra account and paperwork. Optional later.
- Vietnamese Play listing: game apps distributed in Vietnam face the same G1 question as Zalo. Google Play has restricted unlicensed games in Vietnam before. Check this before listing with Vietnam as a target country.

### Gaps
- Google Play's current policy text on web-wrapper and minimum-functionality apps was not fetched.
- Whether Microsoft's individual-developer registration is now permanently free (reported in 2025) is not confirmed by a source here.
- Huawei AppGallery quick apps and Amazon Appstore status (Amazon announced winding down its Android Appstore for Fire-less devices in 2025, unverified here): no sources found.
- Whether Google Play enforces Vietnam G1 licensing on game listings: not sourced.

## Steam (Electron-wrapped free party game)

### Takeaway
It's possible: $100 per app (recouped only after $1,000 in revenue, which a free game won't reach), a 30-day wait after paying, and a Coming Soon page live for at least 2 weeks. Electron or NW.js gives predictable WebGL, and steamworks.js adds the overlay and invites. HTML5 games have shipped on Steam (CrossCode on NW.js; Vampire Survivors started on Phaser). A free online-only party game with no Steam-native friend invites will get little visibility.

### Cited Findings
- $100 Steam Direct fee per product, non-refundable, recoupable after $1,000 adjusted gross revenue. 30 days must pass between paying and release, and a public Coming Soon page must be up for 2 or more weeks (where wishlists accrue). — [Steam Direct](https://partner.steamgames.com/steamdirect); [Steamworks app fee](https://partner.steamgames.com/doc/gettingstarted/appfee)
- Free-to-play titles also pay the fee (community thread). — [Steam community](https://steamcommunity.com/discussions/forum/1/1480982971170315888)
- Electron and NW.js bundle Chromium and Node, while Tauri uses the system webview. steamworks.js provides achievements, cloud saves and the overlay. CrossCode shipped in NW.js, and Vampire Survivors reached 1.0 while still on Phaser. — [SummerEngine three.js on Steam](https://www.summerengine.com/make-great-games/threejs-game-on-steam)

### Inferences
- Steam for a free web party game: a "later, if a hit" option. The real value would come from Steam friend invites and Remote Play Together, which need Steam lobby integration through an adapter. Steam doesn't allow Google web ads in a desktop client in any meaningful way, so monetization there would be donations or DLC. Steam visibility for a free game with few reviews is low.

### Gaps
- No post-mortem numbers for a free web-wrapped party game on Steam were found.

## Smart TV / console browsers

### Takeaway
Skip: no sources were researched. Note only that TV browsers lack touch and keyboard input, and our controls and ads assume phone or desktop.

### Cited Findings
- None gathered (out of the tool budget).

### Inferences
- Only Samsung Galaxy Store's games push and similar app stores are relevant. TV is not worth the effort for a 2-4 player phone party game.

### Gaps
- Tizen, webOS and Xbox Edge browser WebGL2 and WebSocket support were not researched.

## Multi-platform strategy (one core build, per-platform adapters, our site canonical)

### Takeaway
Keep play.billthedevstudio.com as the main home and the only server. Build a thin `platform` adapter layer (ads, identity, invite/room reporting, pause/mute, saves) with one implementation each for web/AdSense, CrazyGames SDK, Discord SDK and Telegram WebApp. Avoid exclusive deals (Poki), because they forbid syndicating to Discord and Playables. Roll out in order of exposure per hour of work.

### Cited Findings
- Platform contracts that drive the adapter design:
  - CrazyGames needs room and invite reporting plus its own usernames. — [CrazyGames](https://docs.crazygames.com/requirements/multiplayer/)
  - Discord needs proxy-mapped URLs plus OAuth and participants. — [Cinevva](https://app.cinevva.com/ko/guides/publish-game-discord-activities)
  - Playables needs `gameReady`, onPause/onResume, SDK saves and only `ytgame.ads`. — [Playables integration](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration); [monetization](https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization)
  - Meta needs the Zero-Permissions Instant Games SDK. — [Meta blog](https://developers.facebook.com/blog/post/2025/07/31/web-and-instant-games-changes/)
- Krunker (a web .io shooter) expanded as a Discord Activity (Krunker Strike FRVR) and more than doubled its player base. Death by AI reached about 7M players as an Activity. — [Cinevva](https://app.cinevva.com/ko/guides/publish-game-discord-activities)
- Poki's "keep 100% of the traffic you bring" means even a portal deal can credit our own links. — [Poki deals](https://sdk.poki.com/deals)

### Inferences
- Suggested order (effort to exposure):
  1. Link listings that keep our domain and ads: iogames.space and other io lists, itch.io, Newgrounds.
  2. Google Play TWA (existing account; check the G1 risk for Vietnam).
  3. CrazyGames Basic Launch, then the multiplayer Full Launch with SDK adapter (their ads replace ours there).
  4. Discord Activity (adapter plus verification).
  5. Telegram Mini App.
  6. Microsoft Store via PWABuilder.
  7. Optional: GameDistribution or GamePix syndication, only once bots fill empty rooms.
  8. Defer Zalo (needs an enterprise and a G1 licence), Steam ($100, low value), FB Instant (separate SDK), Playables (no own ads, invite-only).
- Keep one server: every platform adapter connects to the same WS backend, so lobbies are shared and player density adds up across platforms. Tag each connection with `source=discord|crazygames|tg|web` for analytics.
- Canonical/SEO: portal iframes or uploads don't hurt our domain. Add `rel=canonical` on our page and keep portal builds free of crawlable duplicate pages.

### Gaps
- No sourced 2023-2026 post-mortems with numbers for small indie web multiplayer games syndicated across many portals (only the Discord Activity case studies above, which are large titles).
- The legal question of whether serving Vietnamese players from a foreign-portal or Discord listing without G1 is enforced differently from our own site: not researched.
