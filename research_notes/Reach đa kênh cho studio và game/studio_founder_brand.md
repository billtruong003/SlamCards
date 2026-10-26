# Global reach for a solo game-dev studio brand and founder brand (Bill The Dev / billtruong003)

Research done 2026-10-22, using about 17 search and fetch calls. Many 2025-2026 specifics (subreddit rules, newsletter lists, Vietnam events) could not be verified from primary sources in this budget. Those are listed under Gaps rather than guessed.

## 1. Developer and technical communities (HN, Reddit, dev.to/Hashnode/Medium, three.js forum) and cross-posting

### Takeaway
Show HN is the highest-ceiling single channel for a no-signup browser game like Flip-Flop Slam. Front-page traffic is a 24-48h spike in the low thousands to about 11k visitors, followed by a long tail. Vote solicitation gets posts flagged. Technical write-ups go to regular HN submissions, not Show HN. Cross-post articles to dev.to and Hashnode with a canonical URL back to billthedevstudio.com. Medium keeps the canonical only through its import tool.

### Cited Findings
- **Show HN rules.** A Show HN must be something people can try, non-trivial, and built by the poster, who is available to discuss it. Blog posts, sign-up pages, newsletters, lists, landing pages and fundraisers are not Show HN; blog posts go in as regular submissions. Version releases and new features are generally not substantive enough. HN asks for no signups or email barriers. Asking friends to upvote or comment is "not ok". — [HN Show HN guidelines](https://news.ycombinator.com/showhn.html)
- **Show HN is getting crowded.** Its share of HN posts rose past 12% after LLM coding tools appeared. The average Show HN score is about 9 points, against roughly 19.5 overall (Dec 2025 data, Korean-language summary). — [GeekNews / news.hada.io](https://news.hada.io/topic?id=26030)
- **Traffic examples (non-game).**
  - KTool.io stayed on the front page for about 13 hours, bringing about 11k unique visitors and 300+ signups. The author credits a demo with no account and a cached server. — [Indie Hackers](https://www.indiehackers.com/post/my-show-hn-reached-hacker-news-front-page-here-is-how-you-can-do-it-44c73fbdc6)
  - Aidlab, a hardware company on the Show HN front page, got about 6k page views, about 500 unique visitors from HN and about 468 active users on day one. The shape was "massive 24h spike, gentle decline, long tail" with no direct conversions. — [Indie Hackers postmortem](https://www.indiehackers.com/post/front-page-of-hn-the-full-postmortem-traffic-lessons-surprises-cbe9e0a7f6)
- **Solo browser tower-defense launch week (closest analogue to Bill's games).**
  - The developer launched on Product Hunt, Show HN, itch.io and a CrazyGames submission at the same time.
  - Result: about 100 players in 2.5 days, 55 new on launch day and roughly halving each day, about 23h total play, D1 retention 2%.
  - The Show HN was flagged within hours, likely because the author shared the direct link to collect votes.
  - CrazyGames rejected the game as "too close to existing titles".
  - Product Hunt did not rank it high but "converts steadily". itch.io was "the kindest community".
  - Lessons: bounced traffic never comes back for the patch, so fix the first two minutes before launch. A dev-humor hook beat "I made a TD".
  - Source: [itch.io forum postmortem](https://itch.io/t/6645181/launch-week-postmortem-solo-browser-td-product-hunt-a-portal-rejection-and-a-flagged-show-hn-numbers-inside)
- **HN party-game reference point.** A browser party-game Show HN (Gaming Couch) reported that its busiest games had 7 players. A daily-word-game Show HN drew a "seen an identical game on the front page" comment, so novelty matters. — [Show HN: Gaming Couch](https://news.ycombinator.com/item?id=46344573); [HN search result summary](https://news.ycombinator.com/item?id=50080246)
- **r/gamedev self-promotion.**
  - Self-promotion is allowed, but "too self-serving" posts get removed.
  - A post must offer more than a store link or a feedback request.
  - Gamer-oriented promotion is off-topic. Feedback requests belong in the weekly threads.
  - Sources: [r/gamedev wiki "good posts" (undated mirror)](https://cal1.lr.ggtyler.dev/r/gamedev/wiki/good_posts). In April 2025 the moderators noted that users try to "bypass our self-promotion rules by framing posts as feedback requests" — [r/gamedev mirror, Apr 2025](https://redlib.hackliberty.org/r/GameDev)
- **three.js Discourse showcase.** It actively hosts multiplayer browser game showcases, for example DISCBALL3D 5v5 soccer, outlol browser football over WebRTC, and an MMORPG prototype with Socket.io reporting 100-200 CCU in tests. This makes it a natural venue for a Rapier/three.js party game. — [three.js forum: DISCBALL3D](https://discourse.threejs.org/t/discball3d-multiplayer-soccer/95207); [outlol](https://discourse.threejs.org/t/outlol-multiplayer-browser-football-and-foosball-3d-view-in-three-js/94799); [MMORPG showcase](https://discourse.threejs.org/t/showcase-my-first-mmorpg-built-with-three-js-socket-io/87899)
- **Canonical cross-posting.**
  - dev.to supports a `canonical_url` front-matter field and API field.
  - Hashnode sets it in the editor or through the API (`originalArticleURL`). DIY Zapier/Make flows often drop it.
  - Medium keeps the canonical only through its import tool or API; pasting into the editor strips it. A canonical cannot be added after publishing. The Medium Partner Program requires exclusivity.
  - Vendor source; verify against the official docs. — [StartupHub canonical guide](https://www.startuphub.ai/news/canonical-cross-posting-guide); [StartupHub dev.to/Medium](https://www.startuphub.ai/news/auto-publish-devto-medium-cross-posting)
  - Hashnode's own post encourages republishing devblog posts with a canonical. — [Hashnode Townhall](https://townhall.hashnode.com/why-you-should-republish-your-devblog-posts-and-how-to-do-it.md)
- **dev.to as a gamedev venue.** The js13kGames organizers publish their official announcements and winners on dev.to (the dev.to/js13kgames org), so the platform has an active web-gamedev audience. — [dev.to js13kGames 2025 winners](https://dev.to/js13kgames/js13kgames-2025-winners-announced-20nl)

### Inferences
- Sequence for Flip-Flop Slam:
  1. Polish the first 60 seconds and the solo/bot mode, since HN visitors arrive alone and an empty room is the main failure risk.
  2. Post a Show HN of the game, playable with no signup.
  3. Days or weeks later, submit a separate regular HN story for a technical article, such as "Server-authoritative Rapier physics for a browser party game" or "anti-cheat for a 4-player card-slap game".
  4. Cross-post that article to dev.to and Hashnode with a canonical to the studio blog. Post it to the three.js forum Showcase and r/threejs, and use r/gamedev only as a dev-framed write-up.
- Never share the HN link asking for votes. Share the game URL, not the HN item.
- The Bruh/Meh/Nah Android games are not Show HN material while in closed testing ("not ready for users to try").

### Gaps
- Could not verify current (2025-2026) rules for r/IndieDev, r/webgames, r/threejs and r/javascript (Reddit pages not fetched); the moderators' sidebars need checking.
- Lobsters (invite-only, strict self-promo ratio) and the Rapier/Dimforge Discord showcase norms were not verified in this pass.
- No sourced case study found of a "deterministic physics" or "three.js perf" article going viral with traffic numbers.

## 2. Open source as reach (small libs, stars, awesome-lists, GitHub profile SEO)

### Takeaway
Not researched to sourced depth in this budget. Treat everything below as an unverified plan for the report writer to flag.

### Cited Findings
- No sources retrieved for awesome-threejs or awesome-html5-games contribution rules, or for GitHub star-to-traffic data.

### Inferences
- Candidate extractable libraries from the codebase: a server-side Rapier step/snapshot helper, and a bot-persona "talk" system. Small, focused, demo-linked repos are the usual awesome-list entry criterion (unverified).

### Gaps
- awesome-list acceptance criteria, GitHub profile README SEO effects, and star-farming risks (buying stars counts as spam) were all unsourced here.

## 3. Professional networks (LinkedIn 2025-2026, X/Bluesky, Mastodon)

### Takeaway
There is no official LinkedIn ranking documentation for 2026. Third-party analyses agree that dwell time and substantive comment threads matter most, and that distribution starts with the poster's network and widens only if engagement holds. Advice on link placement conflicts. For gamedev, Bluesky has measurable studio-level goodwill and no link suppression but weak passive discovery. X still matters for Asian developer audiences.

### Cited Findings
- **LinkedIn ranking signals.**
  - Dwell time, both scroll-view time and time reading after "see more", is cited as the top signal.
  - Comments outweigh likes, with multipliers quoted anywhere from 2x to 15x. The spread shows these are estimates.
  - Saves and sends are strong signals (one estimate: a save is about 5x a like).
  - Distribution starts in the immediate network and expands if engagement holds.
  - Text and gallery posts outperform URL posts. Sources disagree on putting links in the post vs. the first comment.
  - A claimed Jan 2026 penalty for posting twice within 4 hours is unconfirmed.
  - Sources: [Metricool](https://metricool.com/linkedin-algorithm/); [eClincher](https://www.eclincher.com/articles/how-the-linkedin-algorithm-works-in-2026-a-guide-for-b2b-growth); [Expandi](https://expandi.io/blog/linkedin-algorithm/); [Unfractional](https://unfractional.substack.com/p/linkedins-2026-algorithm); [Medium/HypergrowthAI](https://medium.com/@HypergrowthAI/5-steps-to-10x-your-linkedin-reach-in-2026-comments-now-count-2x-more-than-likes-aa6d5bedf60d). All are vendor or blog sources.
- **Bluesky for game developers (Game Developer, Nov 18, 2024).**
  - Finji reported growth and engagement there.
  - Polygon Treehouse said posts about *Mythwrecked* got better engagement there than on other platforms.
  - Robert Yang said even a small Bluesky audience reached more people than X, and that Bluesky does not suppress off-platform links.
  - Monica Fan keeps X because Asian game developers have not moved to Bluesky.
  - Caveat: no algorithmic main feed, which weakens passive discovery. Starter packs and custom feeds help.
  - Source: [Game Developer](https://www.gamedeveloper.com/business/what-are-game-developers-getting-out-of-bluesky-)
- **Bluesky platform data.** Metricool's 2026 report says Bluesky averaged 16.38 interactions per post in 2025 and outperformed X for accounts under 100K followers. Methodology was not reviewed. — [Metricool Bluesky vs X](https://metricool.com/bluesky-vs-twitter/)
- **Journalists are on Bluesky.** A PR survey found journalists more active on Bluesky than on X. This is relevant for press reach. — [PRmoment](https://www.prmoment.com/pr-research/bluesky-now-leads-x-when-it-comes-to-journalist-engagement-data-finds)
- **Small anecdotal test.** A 7-day Bluesky vs X experiment from a 70-follower base found slightly more growth and interactions on Bluesky. — [Indie Hackers](https://www.indiehackers.com/post/bluesky-vs-x-my-7-day-experiment-eef3bc5fba)

### Inferences
- **LinkedIn (founder):**
  - Post build-in-public posts natively: a GIF or short video of the physics or bots, plus a lesson.
  - Reply in depth to comments within the first hour.
  - Put links last or in the comments and test both.
  - Client-work audiences (Unity/VR/AI) live here more than gamers do.
- **Social posting cadence:**
  - Post one clip a week to X and Bluesky with #screenshotsaturday and #indiedev. This #screenshotsaturday cadence is a well-known convention, but not verified here.
  - Mastodon gamedev.place is a reasonable mirror, but unverified.
- Engagement pods are risky: LinkedIn reportedly detects them (unverified claim). Treat pods as a spam tactic.

### Gaps
- Official LinkedIn or X engineering sources for 2025-2026 were not found. X's open-sourced ranking code was not reviewed.
- No numbers found for #screenshotsaturday reach or for Mastodon gamedev instance size.

## 4. Gaming press, newsletters, curators, YouTube: how to pitch

### Takeaway
Pitch a small, targeted list. Use a subject line of genre + hook + timing, at most five short paragraphs with the hook in the first sentence, and an attached press kit, trailer link and direct play link. Follow up once after 5-7 days. Curators (itch.io collections, subreddit moderators, Discord admins) are their own tier and want a one-screen pitch. Bought press lists rot quickly.

### Cited Findings
- **Pitch format.** Subject line of "Genre + Hook + Timing" or "Comparison + Differentiator". At most five paragraphs, hook first. — [presskit.gg email guide](https://presskit.gg/field-guides/how-to-write-press-email-indie-game)
- **Contact lists.** Game journalism has high turnover. Purchased lists degrade 15-20% every six months, so build your own. — [presskit.gg free press list](https://presskit.gg/field-guides/build-game-press-list-free)
- **Targeting.** Don't email "everyone under the sun who writes about games". — [Game Developer PR pro tips](https://gamedeveloper.com/business/pr-pro-tips-targeting-and-pitching-your-game-to-media)
- **Curators as a tier.** Steam curators, itch.io collectors, subreddit moderators and Discord admins are a distinct tier. They want a one-screen pitch and fast legitimacy checks. — [StraySpark 2026 press kit guide](https://www.strayspark.studio/blog/indie-game-press-kit-2026-presskit-replacement)
- **Timing and follow-up.** Send mid-week mornings and follow up once, never three times. — [Wayline](https://www.wayline.io/blog/how-to-get-game-press-coverage)
- **Web portals as curators can reject games.** CrazyGames rejected a solo browser TD as "too close to existing titles". — [itch.io postmortem](https://itch.io/t/6645181/launch-week-postmortem-solo-browser-td-product-hunt-a-portal-rejection-and-a-flagged-show-hn-numbers-inside)

### Inferences
- The studio's existing press kit page is the right asset. Add a GIF and a "play now in browser, no install" line to every pitch, since that removes the key barrier for web-game writers.

### Gaps
- No sourced list was found of 2025-2026 indie newsletters, HTML5 game blogs, YouTube curators of web games, or podcasts accepting pitches. This needs a dedicated pass (e.g. Game Developer newsletter, Rock Paper Shotgun's free-game coverage, itch.io's featured staff picks).

## 5. Awards, jams and showcases (incl. Google Play eligibility for Vietnam)

### Takeaway
js13kGames is the best-fit global web-game competition. It runs mid-August to mid-September, results come out in October, it had 197 entries in 2025, top-100 entrants get prize packages, and it has Mobile, WebXR and Online categories. The IGF 2026 and A MAZE 2026 windows have closed; IndieCade's January 2027 online festival had open submissions. Google Play's Indie Games Festival has historically been limited to Europe, Japan and South Korea, so Vietnam is not eligible. The Indie Games Accelerator has included Vietnam (2018 Asia launch; later editions spanned 70+ countries), but no 2026 call was found.

### Cited Findings
- **js13kGames 2025.**
  - 14th edition, theme "Black Cat", ran Aug 13 to Sep 13. There were 197 entries.
  - The top overall game was CLAWSTRIKE.
  - Categories: Desktop, Mobile, Online, WebXR, Decentralized. Over 20 prize types; t-shirt and gadget packages go to the top 100 overall.
  - Sources: [dev.to js13kGames 2025 winners](https://dev.to/js13kgames/js13kgames-2025-winners-announced-20nl); [Wikipedia](https://en.wikipedia.org/wiki/Js13kGames)
- **Gamedev.js Jam 2025.** Ran Apr 13 to Apr 26, 2025 on itch.io and is web-game focused. — [itch.io gamedevjs-2025](https://itch.io/jam/gamedevjs-2025)
- **IGF.** Pages list 2026-cycle deadlines in early October (Oct 8 vs Oct 10, the sources conflict). The 2025 entry fee was $75. A March 2-4, 2027 pavilion is listed. — [IGF submissions 2026](https://igf.com/article/submissions-open-for-igf-2026/); [GDC](https://www.gdconf.com/article/submissions-now-open-join-the-2026-independent-games-festival); [IGF 2025 submissions](https://igf.com/article/the-2025-independent-games-festival-submissions-are-now-open/)
- **IndieCade.** Online festival in January 2027. Submissions listed as open; deadline not found. — [IndieCade overview](https://www.indiecade.com/submissions-help-section/general-festival-overview/)
- **A MAZE. Berlin 2026.** Ran May 13-16, 2026 and is finished. — [festivalsindeutschland](https://www.festivalsindeutschland.de/index.php/en/festival/a-maze-berlin)
- **Google Play Indie Games Festival.** Historically ran separate contests for Europe (a named country list), Japan and South Korea. Studios of 50 or fewer employees, new game within a set window (2020-2022 rules). — [Google Developers Blog finalists](https://developers.googleblog.com/google-play-indie-games-festival-finalists-revealed/); [wnhub](https://wnhub.io/news/analytics/item-2549); [Android Dev Blog 2020](https://android-developers.googleblog.com/2020/07/the-winners-of-google-play-indie-games.html?hl=ko)
- **Google Play Indie Games Accelerator.**
  - The first Asia edition named Vietnam among eight countries, with bootcamps in Singapore.
  - The 2024 edition was a 10-week program across 70+ countries, deadline Dec 12, 2023.
  - In 2026 Google ran an Indie Games Fund for Africa only.
  - Sources: [Google Developers Blog, Asia launch](https://developers.googleblog.com/launching-the-indie-games-accelerator-in-asia-helping-gaming-startups-find-success-on-google-play/); [Google Developers Blog, submissions open](https://developers.googleblog.com/grow-your-game-on-google-play-with-the-indie-games-accelerator-submissions-now-open/); [Game Developer, 37 countries](https://www.gamedeveloper.com/game-platforms/google-opens-its-indie-games-accelerator-to-mobile-devs-across-37-countries); [Android Dev Blog, Africa Fund 2026](https://android-developers.googleblog.com/2026/07/Indie-Games-Fund-Africa.html); [accelerators hub](https://developers.google.com/community/accelerators)

### Inferences
- **Realistic calendar from today (Oct 2026):**
  - IndieCade (Jan 2027, online) if still open.
  - Gamedev.js Jam (around April 2027).
  - js13kGames (Aug-Sep 2027). Flip-Flop Slam is too large, so a 13KB spin-off would be needed.
  - IGF 2027-28 cycle (early October 2027).
  - Watch for the Google Indie Games Accelerator once the Android games are publicly released, since accelerators require a Play-registered developer.
- Jam entries on itch.io build the studio's itch profile and backlinks cheaply.

### Gaps
- Ludum Dare, GMTK, Global Game Jam (Vietnam sites), Indie Prize and Web Game Dev showcase dates and rules for 2026-27 were not verified.
- The Google Play Indie Festival 2025/2026 regions were not confirmed; only 2020-2022 data was found.

## 6. Founder brand in Vietnam (talks, Vietnamese tech media)

### Takeaway
GDG DevFests run in Hanoi, HCMC, Da Nang (GDG Cloud) and Central Vietnam every Nov-Dec. They are the clearest speaking route, with calls typically on Sessionize or gdg.community.dev. Nothing was found on Vietnam Web Summit, Viblo Mayfest, TopDev or ITviec contributor programs.

### Cited Findings
- **DevFest Vietnam 2025 dates:**
  - Hanoi: Nov 15, 2025.
  - HCMC: Dec 6, 2025 (speakers were Googlers, GDEs and experts).
  - Da Nang (GDG Cloud): Dec 6, 2025, Vietnamese sessions with English keynotes.
  - MienTrung: Nov 21-23, 2025, hackathon.
  - Sources: [GDG Hanoi](https://gdg.community.dev/events/details/google-gdg-ha-noi-presents-gdg-devfest-hanoi-dev-for-impact/); [GDG Cloud Da Nang](https://gdg.community.dev/events/details/google-gdg-cloud-da-nang-presents-devfest-2025-cloud-da-nang); [GDG MienTrung](https://gdg.community.dev/events/details/google-gdg-mientrung-presents-gdg-devfest-mientrung-2025)
- **Bizhub reporting.** Vietnamese business media covered Google Play's indie programs opening to Vietnamese developers, so there is local press interest in the angle. — [Bizhub](https://bizhub.vn/google-play-opens-submissions-for-indie-game-developer-programmes-post325436.html)

### Inferences
- DevFest 2026 calls are likely already closed (events are Nov-Dec). Target the 2027 calls around Aug-Sep. Pitch a talk such as "Server-authoritative physics for a web party game" or "Running an AI ops assistant on a single VPS".

### Gaps
- Viblo, TopDev and ITviec guest-post norms, Vietnam Web Summit dates, Unity Vietnam meetups, and Vietnamese gamedev podcasts were all not found or verified.

## 7. Aggregators and profile sites (SERP value vs spam)

### Takeaway
The evidence is thin and vendor-driven. Crunchbase and Wellfound profiles are claimed to rank for company-name searches and to feed knowledge panels and AI answers. A Product Hunt maker profile links launches to the person. Consistent cross-linking (sameAs) across LinkedIn, GitHub, Crunchbase and the site is the main recommendation. Paid "Crunchbase profile or knowledge panel creation" gigs are sales copy.

### Cited Findings
- **Crunchbase.**
  - A complete profile "supports your Google Knowledge Panel" and AI answer citation. Vendor claim.
  - Texta claims complete funding data makes a profile 3.2x more likely to be cited. That is its own analysis, not independent.
  - Founders can add themselves.
  - Sources: [Stackmatix Crunchbase](https://www.stackmatix.com/blog/crunchbase-profile-optimization-startups); [Texta](https://www.texta.ai/api/md/blog/how-to-optimize-crunchbase-profile-for-ai-search); [Small Biz Trends](https://smallbiztrends.com/2023/12/crunchbase-to-build-brand.html)
- **Wellfound.** The profile "often ranks on page one for company-name searches" alongside the site, Crunchbase and LinkedIn. Link all of them for a consistent entity footprint. — [Stackmatix Wellfound](https://stackmatix.com/blog/wellfound-profile-optimization-startups)
- **Fiverr Crunchbase and knowledge-panel gigs.** Treat their ranking claims as sales copy (low value). — [Fiverr listing](https://fiverr.com/sajid_101/create-professional-crunchbase-profile)
- **Product Hunt for a browser game.** It "didn't rank high" but the page "converts steadily". — [itch.io postmortem](https://itch.io/t/6645181/launch-week-postmortem-solo-browser-td-product-hunt-a-portal-rejection-and-a-flagged-show-hn-numbers-inside)

### Inferences
- **Worth doing (low effort, brand SERP):** Crunchbase (studio plus founder), Product Hunt maker profile, Wellfound, GitHub, itch.io, a Google Play developer page, and Gravatar (feeds WordPress/dev ecosystems). Add Organization and Person schema with `sameAs` on both sites.
- **Clutch and GoodFirms:** only worth it if client work is actively sold. They are review-driven; an empty profile adds little (unverified).
- **Low value or spam:** about.me-style link pages, bulk directory submissions, paid knowledge-panel and "backlink" gigs, and bought GitHub stars.

### Gaps
- No independent study was found on which profile sites earn page-one results for a person's name. The Behance/ArtStation value for a solo developer is unverified.

## 8. Measuring brand reach (share of voice, branded search, mention monitoring)

### Takeaway
Google Search Console added a native branded-queries filter on Nov 20, 2025. It auto-detects brand terms and misspellings and shows branded vs non-branded impressions, clicks, CTR and position. It is the core free metric for "Bill The Dev" and "Flip-Flop Slam" demand. For mentions, Talkwalker Alerts and Social Searcher are free; paid tools start around $29/month (Mention, Awario).

### Cited Findings
- **GSC branded-queries filter.** Announced Nov 20, 2025, a month after Query groups. It works across web, image, video and news search. Brand terms, variations, misspellings and brand products are detected automatically. There is an Insights card for the branded vs non-branded split. Rollout is gradual and limited to properties with enough queries. — [Google Search Central blog](https://developers.google.com/search/blog/2025/11/search-console-branded-filter)
  - Sources conflict on historical backfill: one says no retroactive data; a Brazilian source says data from Feb 2026. — [ads-up.fr](https://ads-up.fr/en/publications/seo/google-search-console-now-automatically-filters-brand-queries/); [Conversion.com.br](https://www.conversion.com.br/blog/google-search-console-branded-queries)
- **Free monitoring tools.** Talkwalker Alerts is the most-cited free Google Alerts replacement; Social Searcher is a free option. Mention costs $29/month for one user; Awario Starter is $29/month. These are vendor roundups. — [Awario](https://awario.com/blog/best-google-alerts-alternatives); [Brand24](https://brand24.com/blog/google-alerts-alternative); [Smart Insights](https://www.smartinsights.com/digital-marketing-strategy/5-best-google-alerts-alternatives/)

### Inferences
- **Monthly dashboard:**
  - GSC branded clicks and impressions for both properties.
  - Mention count from Talkwalker and Google Alerts, plus a free Reddit/HN keyword alert tool (F5Bot is commonly used, unverified here).
  - Share of voice = brand mentions ÷ mentions of a comparison set (e.g. other browser party games) on the same channels.
  - Referral traffic by source from the analytics already on the VPS.
- A small brand may sit below GSC's "enough queries" threshold at first, so check whether the filter is visible.

### Gaps
- F5Bot (Reddit/HN/Lobsters keyword alerts) was not verified in this pass. No standard free share-of-voice tool was sourced.
