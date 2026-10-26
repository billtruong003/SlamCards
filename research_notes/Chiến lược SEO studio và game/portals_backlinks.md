# Distribution and link-building channels for Flip-Flop Slam (Dép Lào Tuổi Thơ)

Scope: where a free, 2-4 player browser party game with its own Node WebSocket server (three.js + Rapier, 10 languages, H5 preroll + AdSense pending) at https://play.billthedevstudio.com/slam-cards/ can be listed. The notes cover what each channel requires, what it returns (traffic, links, money), and the SEO trade-offs. Research date: 2026-10-22. About 20 tool calls; several portals have no current official docs reachable, and those are flagged in Gaps.

## 1. Game portals: requirements, link value, typical traffic

### Takeaway
Only CrazyGames publishes clear, current, developer-facing rules. Its rules ban outside ads and ban linking from the game to a playable web version elsewhere, so a portal build would be a separate, SDK-only build that cannot funnel players to our URL. Poki is curated and pushes web exclusivity (5-7 years), which conflicts with keeping our own URL as the main home; a flat-fee non-exclusive licence is the only realistic Poki route. itch.io is the easy "own page plus iframe to our server" option, but its outbound links are nofollow. Kongregate has been closed to new games since 2020. For a small game, portal traffic is front-loaded and modest (tens of dollars a day at launch, then falling).

### Cited Findings

**CrazyGames (most relevant, best documented)**
- Two stages. Basic Launch: SDK optional, "CrazyGames monetization is disabled", "No external ads". Full Launch needs the SDK and the GameplayStart event, ads only through the SDK ("Only ads served through our SDK are allowed"), must work with AdBlock, full visual QA, and should "Land directly in gameplay". PEGI12 content. Limits: initial download 50 MB or less, total 250 MB or less, 1500 files or fewer. — [CrazyGames requirements intro](https://docs.crazygames.com/requirements/intro/)
- Basic Launch runs 7-21 days. It ends after at least 7 days and 500 plays, or after 21 days. CrazyGames then compares average playtime, conversion to gameplay and retention against other games, and either invites the game to Full Launch, offers another Basic Launch, or rejects it. A resubmission counts as a new game. Multiplayer games that need a larger audience may skip Basic Launch. — [PortalReady summary of CrazyGames docs](https://portalready.world/portals/crazygames/)
- Licence is non-exclusive by default. Opting in gives 2 months of browser-site exclusivity after Full Launch for +50% compensation. Steam and app stores don't count. "A game iframed from your own domain earns revenue only if the SDK is integrated." Payout minimum €100 a month via Tipalti. No revenue during Basic Launch. — [PortalReady](https://portalready.world/portals/crazygames/)
- Revenue share is not published officially. One developer article cites the 2026 jam terms as 60% of ads and 70% of IAP, while third parties cite 40-60%. — [PixelGameCraft, 2026-09](https://pixelgamecraft.com/blog/html5-game-income/); [Cinevva guide](https://app.cinevva.com/guides/web-game-monetization)
- Multiplayer: the docs describe SDK room features (Update Room with `isJoinable`, invite links via `inviteParams`, instant multiplayer where "The first player in a party should be placed directly into a new private room with default settings", keeping rooms across rounds, DisableChat). Lobby sizes must be submitted with the build. The pages I fetched say nothing either way about external game servers, so a self-hosted WebSocket backend is not explicitly forbidden. — [CrazyGames multiplayer requirements](https://docs.crazygames.com/requirements/multiplayer/)
- Link rules: "The game should not include cross-promotions for external or internal games/platforms." Community links (Discord, dev website) are allowed on the menu only "if they don't lead directly to a playable web version". Backlinks to CrazyGames are "accepted but not promoted". App store links are never allowed in-game. — [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- Real numbers (anecdotal): one CrazyGames title made about $50/day at launch and fell to about $5/day; a Construct 3 game made about $400 in total; one developer reported about €1.20 per 1,000 plays (older figure). A three.js developer tweeted that a game needs "1 to 15 million plays" to reach $15,000. — [PixelGameCraft](https://pixelgamecraft.com/blog/html5-game-income/); [frederik on X](https://x.com/froessell/status/2110671824279179694)
- Site scale: CrazyGames claims 50M+ monthly players. Semrush estimated 77.88M visits in December 2025, down 11.6% from November. — [Semrush crazygames.com](https://cw.semrush.com/website/crazygames.com/overview)

**Poki**
- Curated. You apply with a form that asks for team details, a playable link or video, 3 screenshots, and why the game fits Poki. The build must be accessible "without a login", and the form asks whether the game "has already been released on other platforms". The form gives no formal quality bar. — [Poki share/apply](https://developers.poki.com/guide/share)
- Revenue: 100% of earnings when you bring the player, 50% when Poki brings them (older docs and search snippets). — [sdk.poki.com deals (search snippet)](https://sdk.poki.com/deals)
- Exclusivity: the current page says "By default, exclusive deals run for 5 years"; older copies and the bonus page say 7 years. Exclusivity covers the open web, including Discord and YouTube Playables. Steam, app stores and consoles are excluded. For games "already live on other web platforms" there is "a one-time flat license fee instead, with no revenue share". The page does not say whether the developer's own website counts as a breach. — [Poki revenue deal types](https://developers.poki.com/guide/revenue-deal-types); [sdk.poki.com/bonus](https://sdk.poki.com/bonus)
- Poki offers a free networking library (Netlib) for online multiplayer, which suggests multiplayer games are welcome. Whether an own WebSocket server is accepted is not stated. — [sdk.poki.com (search snippet)](https://sdk.poki.com/)
- Scale: Ahrefs puts poki.com at about 116M organic visits; Semrush (Sep 2025) at about 144M visits. — [Ahrefs top game sites](https://ahrefs.com/websites/games); [Semrush](https://sv.semrush.com/website/poki.dev/competitors)

**itch.io**
- Open upload. For an externally hosted game, devs upload a small index.html with an iframe that points to their own site; a moderator said there is "nothing against that in our ToS" (2016), and multiplayer games work this way "by necessity". The socket must be `wss://` because itch serves over HTTPS. — [itch forum: iframe to game hosted elsewhere](https://itch.io/t/28193/html-game-question-can-i-have-an-iframe-to-a-game-im-hosting-elsewhere); [itch forum: wss required](https://itch.io/t/1017614/not-able-to-host-multiplayer-html5-games-on-itchio)
- Outbound links on itch.io profile and game pages are `rel="nofollow noopener"`, with `rel="nofollow me"` on profile links. I checked the live HTML of an itch profile on 2026-10-22: links to Steam and CrazyGames all carry nofollow. — [itch.io profile, inspected with curl](https://itch.io/profile/mickaelbneron)
- A developer reported their itch game was "de-indexed" from itch's browse pages with no clear reason. — [itch.io post](https://itch.io/post/12932297)

**Newgrounds**
- Open HTML5 upload as a zip with index.html at the root. No special permission is needed (2019 tutorial). There is a revenue programme, which excludes mature content. I found no official rule on external multiplayer servers. — [Construct: publish to Newgrounds](https://construct.net/en/tutorials/publish-games-newgrounds-com-303); [html5gamedevs](https://www.html5gamedevs.com/topic/1464-newgrounds-now-accept-html5-games)

**GameDistribution**
- It accepts only complete games and runs QA focused on playability (2021 tutorial). — [Construct: Getting started with GameDistribution](https://www.construct.net/en/tutorials/getting-started-2722)
- Developer share is cited by a third party at about 33%, distributed across 4,000+ partner portals. This is unverified. — [PixelGameCraft](https://pixelgamecraft.com/blog/html5-game-income/)

**Y8**
- In 2017 Y8 said it was moving to HTML5 with an AdSense revenue split; developers had to be 18+. In 2021 Y8 staff said games are first evaluated for an ads partnership, and simple games with few views may not justify one. A third party cites the share at about 50%. — [html5gamedevs 2017](https://html5gamedevs.com/topic/32059-y8-is-publishing-html5-games); [html5gamedevs 2021](https://html5gamedevs.com/topic/47942-y8-ad-revenue-partnership-question); [PixelGameCraft](https://pixelgamecraft.com/blog/html5-game-income/)

**Kongregate and Armor Games**
- Kongregate stopped accepting new games on 1 July 2020; existing games stay playable. It is owned by Monumental (2024-). — [Wikipedia: Kongregate](https://en.wikipedia.org/wiki/Kongregate); [PCGamesInsider](https://www.pcgamesinsider.biz/news/71325/kongregate-is-no-longer-acce...)
- Armor Games is still active but laid off part of its publishing team in August 2024. I found no current statement on open submissions. — [Wikipedia: Armor Games](https://en.wikipedia.org/wiki/Armor_Games)

**Vietnamese portals (game24h, gamevui)**
- Ahrefs-style listings describe game24h.vn as a gaming news and reviews site and gamevui.vn as a portal for news, guides and downloads. I found no public developer-submission page or contact for either. — [ahrefstop game24h.vn](https://ahrefstop.com/websites/game24h.vn/competitors); [ahrefstop gamevui.vn](https://ahrefstop.com/websites/gamevui.vn/competitors)

### Inferences
- **CrazyGames is the best portal fit, but as a separate build.** We would remove the H5 preroll and AdSense, add the CrazyGames SDK, and map rooms to `updateRoom`/invite links. The portal build cannot link players to play.billthedevstudio.com because that is "a playable web version". It can still link to billthedevstudio.com if the studio page is not itself a game page. The shared WebSocket server is an advantage here: portal players and own-URL players can share the same room pool, which helps the "need a larger audience" argument for skipping Basic Launch. Rooms must still feel alive with low concurrency, so bots or instant private rooms matter.
- **Poki exclusivity probably conflicts with our own URL.** Treat Poki as "apply only for a flat licence" unless we are willing to give the web version to Poki. This is an inference; the docs do not say explicitly that the developer's own site is covered.
- **itch.io, Newgrounds and GameJolt are cheap profile pages.** They give a branded page, small community traffic, and a nofollow link (confirmed for itch). Their main value is discovery and a place to send jam or devlog traffic, not PageRank.
- **GameDistribution and GameMonetize-style syndicators** spread the game to thousands of clone portals. That is low revenue per play and creates many duplicate copies that compete with us on the brand name. It also usually needs their SDK and their ads.
- Revenue math for a small game: at the article's "realistic" 100k plays a month that is roughly $400; most new games sit well below that.

### Gaps
- No official CrazyGames statement on external WebSocket servers (not forbidden in the pages read). The safest step is to ask CrazyGames developer support before building.
- Poki: no clarity on whether self-hosting on our own domain breaches exclusivity, and no current confirmed % (the 100/50 figure comes from search snippets of an older page).
- GameDistribution, Y8 and GameJolt: no current official terms retrieved; the % figures are third-party.
- Newgrounds, GameJolt, IndieDB, alternativeto: curl returned blocked or short pages, so their rel attributes are unverified. Assume nofollow or ugc until checked in a browser.
- No portal publishes typical traffic for a small multiplayer game; the only numbers are anecdotal.
- Vietnamese portals: no submission route found. They look like news or download sites rather than open HTML5 portals.

## 2. Directories and launch sites (Product Hunt, Show HN, Reddit, IndieDB, alternativeto, AI/tool directories)

### Takeaway
Show HN and a few targeted subreddits are the only launch channels with documented traffic spikes. They work for a no-signup browser game because it can be tried in one click. Mass "submit to 100 directories" lists are what Google calls low-quality directory links: worthless at best, harmful at worst.

### Cited Findings
- Show HN rules: the project must be something people can try, non-trivial, built by you. Make it "easy to try without signing up", and don't ask friends to upvote (voting rings are banned). — [HN Show HN guidelines](https://news.ycombinator.com/showhn.html)
- Show HN outcomes: one tool sat about 13 hours on the front page and drew about 11k unique visitors plus 300+ sign-ups, served by a "$7 server". Another post drew about 3.9k visitors. Analytics undercount because many HN readers block trackers. — [Indie Hackers: first place on HN](https://www.indiehackers.com/post/first-place-on-hackernews-stats-traffic-and-regs-46b8b95333); [Indie Hackers: Show HN front page](https://indiehackers.com/post/my-show-hn-reached-hacker-news-front-page-here-is-how-you-can-do-it-44c73fbdc6)
- There is a community "HN Arcade" directory and newsletter of games from Show HN; it featured a WebRTC multiplayer Liero clone. — [HN Arcade newsletter](https://buttondown.com/andrewgy8/archive/issue-2/); [Doug Belshaw: games from Show HN](https://archive.dougbelshaw.com/thought-shrapnel/games-from-hacker-news-show/)
- Google lists "Low-quality directories: links from low-quality directory or bookmark sites" and forum comments with optimised links as link spam. — [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)

### Inferences
- **Show HN:** best fit is a technical angle ("three.js + Rapier physics, server-authoritative WebSocket party game, solo dev"). Traffic is a one-day spike in the thousands to around 10k, mostly desktop English-speaking devs, not the core audience. Load-test the VPS, because a front page puts many people into rooms at once and empty rooms kill first impressions. The HN link itself is nofollow; the value comes from secondary pickups (newsletters, HN Arcade, blogs) that may give editorial links.
- **Reddit** (r/WebGames, r/IndieGaming, r/playmygame, r/threejs, r/vietnam / r/VietNam): native posts with a GIF or clip work best. Expect a short spike. Reddit links are nofollow-type, so the value is players and feedback. I could not fetch the r/WebGames rules (Reddit is blocked to the fetch tool); check sidebar rules on self-promotion frequency manually.
- **Product Hunt:** weak fit for a game. Its audience is makers and SaaS. Low cost to post, but low expected return.
- **IndieDB, GameJolt, alternativeto:** acceptable as legitimate profile pages. "AI tool directories" and paid "submit your game to 500 sites" services are not relevant to a game and fall under the low-quality directory pattern.

### Gaps
- No sourced traffic numbers for a browser multiplayer game on Show HN, Product Hunt or r/WebGames specifically.
- Product Hunt, IndieDB and alternativeto rel attributes not verified.

## 3. Vietnamese channels and PR angle

### Takeaway
Vietnamese gaming press (Kenh14, Genk) regularly runs nostalgia ("tuổi thơ") lists and features indie Vietnamese studios. A 2025 nostalgia game (Trở Về Tuổi Thơ) got both Genk and Kenh14 coverage. The realistic angle is "solo Vietnamese dev turns a childhood game, dép lào throwing, into an online game you can play with friends in the browser, in 10 languages". It is pitched with a short video, not a press release.

### Cited Findings
- Kenh14 and Genk run recurring nostalgia pieces about the games of Vietnamese gamers' childhood (4-button handhelds, Battle City, etc.). — [Kenh14: trò chơi 4 nút](https://kenh14.vn/nhung-tro-choi-dien-tu-4-nut-gan-lien-voi-tuoi-tho-cua-game-thu-viet-20220916152701964.chn); [Genk: game huyền thoại tuổi thơ](https://genk.vn/nhung-tua-game-huyen-thoai-gan-lien-voi-tuoi-tho-cua-game-thu-viet-nhin-thoi-ma-ky-uc-ua-ve-20220826140602823.chn)
- Genk (May 2025) profiled Vietnamese indie studios. Trở Về Tuổi Thơ, a game set in an 80s-90s Vietnamese village, was in the App Store top ranks for two weeks after launching before Tết 2025. Kenh14 interviewed its three developers. — [Genk: studio indie Việt](https://genk.vn/gap-go-nhung-studio-game-indie-viet-nam-dang-chinh-phuc-app-store-20250531181821936.chn); [Kenh14 interview](https://kenh14.vn/tro-chuyen-cung-nha-phat-trien-tre-dua-game-viet-vuon-ra-the-gioi-215250531111859169.chn)
- Việt Giải Trí covered the indie game Goosing Out (Nov 2025) as nostalgic and rustic, which shows that smaller outlets pick up this angle too. — [Việt Giải Trí](https://vietgiaitri.com/them-mot-game-indie-viet-sieu-hap-dan-goi-nhac-game-thu-ve-ky-niem-tuoi-tho-20251125i7582777)

### Inferences
- **PR hook:** "trò chơi tuổi thơ, now online with friends" plus the solo-dev story plus a "play in the browser, no install, send a link to your group" call to action. Timing it before Tết or the summer holidays matches when nostalgia pieces and group play peak. Vietnamese news sites often link with nofollow or no link at all; the value is reach and brand searches ("dép lào tuổi thơ"), which help rankings indirectly.
- **Facebook groups and Zalo:** the invite-link mechanic is the distribution. Post a short clip in gaming, nostalgia ("Hội những người sinh năm 199x") and student groups, following each group's rules. Zalo is for sharing between friends, so make room links render well (OG image, Vietnamese title).
- **Voz, Tinhte, Spiderum:** Voz (gaming or dev boxes) and Tinhte suit a "mình tự làm game này" (I made this game) post. Spiderum suits a longer story about building it. These are discussion and feedback channels, not link sources.
- **TikTok:** short physics fails and slam clips are the native format. Seeding to small Vietnamese gaming or nostalgia creators beats paying large ones at this stage.

### Gaps
- No sourced data on a Vietnamese web game going viral, or on whether Kenh14/Genk links are dofollow.
- No sourced rules for Voz, Tinhte or Spiderum self-promotion. Check each forum's rules manually.

## 4. Do portal and jam backlinks help rankings? Portal hosting vs own URL (duplicate content, canonical)

### Takeaway
Most portal, jam, community and social links are nofollow (confirmed for itch.io). They bring direct traffic and brand searches, not much link equity. Hosting a copy of the game on a portal creates competing pages for our brand name: Google may rank the portal's copy over ours, and canonical tags won't fix it because we don't control the portal's markup. Keep play.billthedevstudio.com/slam-cards/ as the canonical home. Use portals as separate audiences, ideally with distinct titles or pages.

### Cited Findings
- Google says the canonical element "is not recommended for avoiding duplication by syndication partners" because the pages are often very different. The most effective solution is for partners to block indexing. — [Google: Fix canonicalization issues](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting)
- Google tries to support cross-domain canonicals but treats canonical as a hint. It may rank a non-original copy based on domain authority and links, and "in rare situations" may pick an external URL hosting your content. — [SEJ on cross-domain canonicals](https://www.searchenginejournal.com/google-guidance-on-cross-domain-canonicals/486097/); [Google 2009: cross-domain duplication](https://developers.google.com/search/blog/2009/12/handling-legitimate-cross-domain?authuser=7)
- Older Google syndication advice: each site carrying syndicated content should link back to the original, and partners can noindex. — [Google 2009 blog](https://developers.google.com/search/blog/2009/12/handling-legitimate-cross-domain?authuser=7)
- itch.io outbound links carry `rel="nofollow noopener"`. — [itch.io profile, inspected](https://itch.io/profile/mickaelbneron)
- CrazyGames bans in-game links to a playable web version elsewhere, so a portal copy cannot send players back to our game URL. — [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)

### Inferences
- **Hosting on a portal:** the portal page (a high-authority domain) will likely outrank our URL for "Flip-Flop Slam" in English. That trades our brand SERP for the portal's traffic and revenue share. To limit this, use our own domain for the Vietnamese name and landing pages (Vietnamese, 10-language hreflang), which portals don't target. Alternatively, give the portal build a slightly different presentation.
- **itch.io-style iframe embed:** the game still runs from our origin. itch's page is a thin wrapper, which helps but does not solve the problem; itch's page can still rank for the name.
- **Links that move rankings** are editorial links from articles (Vietnamese press, dev blogs, newsletters, HN pickups) and links from our own properties (billthedevstudio.com, billthedev.com portfolio case study). Nofollow portal links still help indirectly through brand searches and discovery.
- **Game jams:** a jam entry page (itch-hosted) is nofollow, but jam roundups and streamers sometimes write editorial posts. The game is already finished, so jams fit poorly unless we build a small spin-off.

### Gaps
- No Google source specific to embedded browser games or game portals. The guidance above comes from syndication guidance by analogy.
- No measured data on portal pages outranking developer domains for small games.

## 5. Google link spam policies: what to avoid

### Takeaway
Avoid anything whose main purpose is to create links rather than players. Paid or ad links must be qualified with `nofollow` or `sponsored`. The risky patterns for a game studio are link-swaps with other game sites, "embed this game" widgets with keyword links, footer links across many sites, paid directory and guest-post packages, and forum or comment signature spam.

### Cited Findings (all from [Google Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies))
- Link spam means creating links mainly to manipulate rankings. Listed examples:
  - buying or selling links for ranking, including goods or services or free products in exchange for links;
  - excessive link exchanges ("Link to me and I'll link to you") and partner pages built only for cross-linking;
  - automated link creation;
  - requiring a link in ToS or contracts without letting the owner qualify it;
  - ad text links that don't block ranking credit;
  - advertorials, guest posts or press releases with ranking-passing links or optimised anchors;
  - low-quality directory or bookmark sites;
  - keyword-rich, hidden or low-quality links in widgets distributed across sites;
  - widely distributed footer or template links;
  - forum comments with optimised links in the post or signature;
  - low-value content made mainly to manipulate links.
- Paid or sponsored links are fine if they carry `rel="nofollow"` or `rel="sponsored"`.
- Site reputation abuse: third-party content hosted on a site mainly because of the host's ranking signals can get a manual action (outside the EEA), or be treated as separate from the main domain (inside the EEA).

### Inferences
- An "embed this game on your site" snippet is legitimate distribution only if its credit link is plain branded text, not keyword anchors, and is not a condition of use. Safest is nofollow on the embed credit.
- Cross-linking billthedevstudio.com, billthedev.com and the game is normal for owned properties. A small number of honest contextual links is fine; avoid site-wide footer links with keyword anchors on every page.
- Press outreach is fine. Paying Vietnamese news sites for "PR bài" (paid articles) with dofollow links is an advertorial and must be nofollow or sponsored.
- Under site reputation abuse, any partner who hosts "our" SEO pages on their high-authority domain mainly to rank is risky for them. This is not relevant unless we do sponsored content.

### Gaps
- The fetched spam-policy page did not mention `rel="ugc"` or private blog networks explicitly. Google's separate "qualify outbound links" doc covers ugc but was not fetched.
