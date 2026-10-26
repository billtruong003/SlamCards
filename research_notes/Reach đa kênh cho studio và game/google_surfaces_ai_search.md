# Google surfaces beyond blue links + AI search visibility for a tiny studio (2025-2026)

Scope: billthedevstudio.com (Next.js static, en+vi, news posts), play.billthedevstudio.com/slam-cards/ (10 languages), billthedev.com (founder), YouTube @billthedevgames, 3 Android games in Play closed testing. Researched 22/10/2026. Each finding is labelled [GOOGLE] (official Google doc or statement) or [VENDOR] (SEO-industry study or trade press).

## 1. Google Discover: eligibility, images, follow, small sites, desktop

### Takeaway
No application is needed. Any indexed page that follows the content policies is eligible. The main levers are a large image (1200px+, `max-image-preview:large`), an honest title and fresh, people-focused content. Since 2025 users can "Follow" publishers and creators, and Discover also shows YouTube Shorts, X and Instagram posts, so the YouTube channel is a second way in. Discover on desktop was announced in 2025 and seems to have disappeared since. Odds for a tiny site: low and spiky. Treat it as a bonus, not a channel to plan around.

### Cited Findings
- [GOOGLE] Content is eligible if it is indexed and meets Discover content policies: "No special tags or structured data are required." Eligibility "is not a guarantee of appearing." — [Google: Discover and your website (updated 2026-03-09)](https://developers.google.com/search/docs/appearance/google-discover)
- [GOOGLE] Image guidance: "at least 1200 px wide", ">300,000 total pixels", 16x9, enabled via `max-image-preview:large` (or AMP). Set a representative image through schema.org or `og:image`, and avoid logos and text-heavy images. — [Google: Discover](https://developers.google.com/search/docs/appearance/google-discover)
- [GOOGLE] Titles should "capture the essence of the content". Clickbait and misleading previews are discouraged. SafeSearch filtering applies, and policy violations can lead to manual actions. — [Google: Discover](https://developers.google.com/search/docs/appearance/google-discover)
- [VENDOR/press] The Follow feature for publishers and creators rolled out around 24 Sep 2025. Users must be signed in, and Discover shows followed sources more often. Google also said Discover will show more posts from X, Instagram and YouTube Shorts. — [Search Engine Land](https://searchengineland.com/google-discover-adds-follow-feature-and-more-social-posts-from-creators-and-publishers-462123); [SE Roundtable](https://www.seroundtable.com/google-discover-follow-feature-creator-content-40129.html); [Android Authority](https://www.androidauthority.com/google-discover-follow-creators-publishers-3598668/)
- [GOOGLE statement via press] Desktop Discover was announced at Search Central Live Madrid (May 2025) and seen live for some users in Australia. — [Stan Ventures](https://www.stanventures.com/news/google-discover-is-coming-to-desktop-soon-2398/); [RollerAds](https://blog.rollerads.com/2025/05/05/google-discover-is-coming-to-desktop/)
- [VENDOR] A September 2026 report says Barry Schwartz has not seen desktop Discover for several months. Google has made no official statement about cancelling it. — [NetContentSEO](https://netcontentseo.com/article/google-said-discover-was-coming-to-desktop-now-the-rollout-appears-to-have-vanished-853)
- [GOOGLE via press] The first "Discover core update" was announced 5 Feb 2026. It aims for more locally relevant content, less clickbait and more quality content from trusted sites. Reports say it was initially limited to English-language users in the US. — [Search Engine Journal](https://searchenginejournal.com/google-discover-update/468507/); [DesignRush recap](https://news.designrush.com/seo-news-update-recap-google-core-ai-search-discover-visibility)
- [VENDOR] Evidence on small sites conflicts. DesignRush and Raptive-type commentary say Discover now favours smaller publishers. NewzDash says regional publishers rose, but fewer sites shared the traffic. — [DesignRush](https://news.designrush.com/seo-news-update-recap-google-core-ai-search-discover-visibility); [SEJ/NewzDash](https://www.searchenginejournal.com/google-discover-core-update-data-local-publishers-lost-reach/569735/)
- [VENDOR] Anecdotal reports describe sites losing about 98% of Discover impressions overnight after the December 2025 core update, which shows how volatile the surface is. — [365i](https://www.365i.co.uk/news/2025/12/27/google-december-update-discover-traffic-collapse/)
- [GOOGLE via press] A Search Console toggle lets sites opt out of grounding generative AI Search features. Opting out also removes traffic from "AI Overviews in Google Discover", so AI summaries now appear inside Discover. — [9to5Google](https://9to5google.com/?p=716745)

### Inferences
- The studio news posts and per-language game landing pages should all ship a 1200px+ 16:9 `og:image` and `<meta name="robots" content="max-image-preview:large">`. These are cheap and are the only technical levers.
- Discover favours topical, timely, visual stories. Good candidates are folk-game nostalgia (dép lào), Tết or Trung Thu occasions, and devlog "behind the scenes" posts, written so they don't read as clickbait.
- The Follow button and Shorts-in-Discover make the YouTube channel (Shorts) perhaps the most realistic way into Discover for a tiny brand.
- Realistic odds: occasional spikes if a post catches a trend. Little sustained traffic until the site has topical authority.

### Gaps
- No source confirms whether Discover is available, or how big it is, in Vietnam or in each of the 10 game languages.
- No current Google doc describes the Follow feature's requirements (for example RSS or feed linkage). The Discover doc does not cover it.

## 2. Google Images, Videos, Short videos, YouTube Shorts in Search

### Takeaway
Video results need a dedicated "watch page" that is already indexed and performing well, with a stable thumbnail. A blog post with an embedded trailer usually won't be indexed as a video. YouTube videos surface in Google more easily than self-hosted ones. The "Short videos" carousel or tab groups YouTube Shorts, TikTok and Instagram Reels, and YouTube shows up most often. Key moments come from YouTube description timestamps or Clip/SeekToAction markup.

### Cited Findings
- [GOOGLE] Video indexing requires: the watch page is indexed; the watch page "must be performing well in Search before its video can be considered"; the video is embedded on a watch page and not hidden; the thumbnail is valid at a stable URL. A watch page's main purpose is to show one video. One video is indexed per page. — [Google Video SEO best practices](https://developers.google.com/webmasters/videosearch/); [Video indexing report help](https://support.google.com/webmasters/answer/9495631?hl=en)
- [VENDOR] Publishers criticise the "performing well" rule as circular, and it especially hurts independent sites. — [PPC Land](https://ppc.land/googles-video-indexing-update-poses-challenges-for-independent-publishers/)
- [GOOGLE] Clip markup sets the start and end times and the label for each segment, in all languages. SeekToAction lets Google detect key moments automatically. It needs deep-linkable URLs (for example `?t=30`), fetchable video files and a video at least 30s long, and it supports fewer languages. For YouTube, set key moments with timestamps in the description. Manually set moments take priority. `nosnippet` opts out. — [Google VideoObject/Clip structured data](https://developers.google.com/search/docs/data-types/video); [Search Engine Land (2021 launch)](https://searchengineland.com/google-video-structured-data-with-clip-markup-and-seek-markup-348781)
- [GOOGLE PM via press] Google describes "Short videos" as vertical clips under 5 minutes. Google groups YouTube Shorts, TikTok and Instagram Reels together. — [Rock Content citing SEJ](https://rockcontent.com/blog/google-short-form-videos/)
- [VENDOR] YouTube is the video platform shown most often in both main results and the short videos tab. — [Search Engine Land guide](https://searchengineland.com/guide/how-to-win-video-driven-serps)
- [VENDOR] A "Short videos" filter or tab was being tested on Android. Its rollout status is unclear and sources conflict. — [BrandWell](https://brandwell.ai/blog/google-short-video-filtering/); [The Technology Express](https://thetechnologyexpress.com/google-short-video-feature-launch/)
- [VENDOR] Ahrefs' December 2025 follow-up found YouTube mentions had the strongest single correlation with AI visibility (about 0.737), and a June 2026 Ahrefs snapshot put YouTube as the #1 cited domain (32.4%) in its sample. YouTube therefore matters for AI search too (see section 6). — [CiteFlow summary of Ahrefs](https://www.citeflow.io/blog/brand-mentions-vs-backlinks); [QuickSEO summary](https://quickseo.ai/blog/how-reddit-affects-ai-visibility-2026)

### Inferences
- Host the trailer and gameplay videos on YouTube, and give them titles and descriptions in each target language plus chapter timestamps. That is the cheapest way into Videos, Short videos and key moments.
- If the studio site wants its own video results, build one watch page per video (for example `/videos/flip-flop-slam-trailer`) with VideoObject markup. Embedding videos inside news posts will not get them indexed as video.
- Google Images: use descriptive filenames and alt text in each locale, high-resolution screenshots and an image sitemap. These are standard practices, and I did not fetch a 2025-26 Images doc update (see Gaps).

### Gaps
- I did not fetch Google's Image SEO doc in this session, so there are no 2025-26 specifics on Images (for example how image-search CTR has changed).
- No Google doc confirms how Shorts are chosen for the "Short videos" carousel, beyond the fact that they are indexed YouTube pages.

## 3. Google News / Top stories / Publisher Center

### Takeaway
Since 2024-2025 nobody applies. Publisher Center no longer decides eligibility, and any site that follows Google News content policies is "automatically eligible for consideration". A small studio news section is technically eligible, but Top stories ranks on prominence, authoritativeness and freshness. Product devlogs and press-release-style posts from one studio will very rarely reach Top stories, except perhaps for brand-name queries.

### Cited Findings
- [GOOGLE] "Publisher Center no longer determines eligibility for Google News or other news surfaces, such as the Top Stories carousel." Content that follows the content policies is automatically eligible for consideration. Systems rank on relevance, prominence, authoritativeness, freshness, location and language. — [Google Publisher Center Help: News content across Google](https://support.google.com/news/publisher-center/answer/9607025?hl=en)
- [GOOGLE via press] Manual addition of publications to Publisher Center stopped in April 2024. Publication pages became automatic by March 2025: the logo comes from the favicon, the title from the site name, and custom sections are gone. — [Search Engine Land](https://searchengineland.com/google-publisher-center-to-stop-allowing-you-to-add-publications-439978); [Search Engine Land (March 2025)](https://searchengineland.com/google-news-automated-publication-pages-to-start-in-march-451831); [PPC Land](https://ppc.land/google-news-ends-manual-customization-of-publisher-pages/)
- [VENDOR] For newer small sites, the hardest part is earning topical authority. — [Search Engine Land: launching a news publication](https://searchengineland.com/news-publication-google-visibility-484268)

### Inferences
- What to do: set a clear site name (WebSite schema `name`) and a good favicon, use NewsArticle or BlogPosting markup with author and date, add a news sitemap if posting often, and keep transparent author and about pages. All of this is cheap.
- The realistic value is being covered by other news outlets (Vietnamese gaming and tech media), not the studio's own Top stories presence. Those third-party mentions also feed the Knowledge Panel and AI citations.

### Gaps
- No 2025-26 data on how often non-news brand blogs appear in Top stories.

## 4. Google Play search, Play Instant, web games in Google

### Takeaway
Google Play Instant (try-before-install) shut down in December 2025. There is no "play on web" feature in Play that would surface a browser game. Closed-testing apps are not publicly listed, so they get no Play search exposure until production or open testing. For the browser game, the channels are normal web search (VideoGame/WebApplication-style pages), YouTube and AI answers.

### Cited Findings
- [GOOGLE] From December 2025, Instant Apps can't be published through Google Play, and all Instant APIs stop working. The reason given was low usage and engagement. Google recommends deep links into the full app instead. — [Android Developers: Google Play Instant](https://developer.android.com/topic/google-play-instant); [Android Authority](https://www.androidauthority.com/google-killing-android-instant-apps-3567211/)
- [VENDOR] Wikipedia says the Play Games "instant play" feature was retired in December 2025. — [Wikipedia: Google Play Games](https://en.wikipedia.org/wiki/Google_Play_Games)

### Inferences
- Moving the three Android titles to open testing or production is a precondition for any Play search presence. Closed-testing listings are invisible to search. This comes from general Play Console knowledge and was not re-verified this session.
- Cross-link the Play listings from the studio site (one page per game with `SoftwareApplication`/`MobileApplication` markup), and link the developer site in Play Console. This strengthens the entity graph for the Knowledge Panel.

### Gaps
- I found no source showing any Google "playable web games in Search" feature active in 2025-26 for third-party HTML5 games. Google's own built-in doodle-style games do not count. Treat it as non-existent unless found otherwise.
- I did not verify the current Play Store rules on whether closed or open-testing listings appear in search.

## 5. Knowledge Panel, brand SERP, Google Business Profile, Wikidata

### Takeaway
GBP is a poor fit. Online-only businesses with no in-person customer contact are generally not eligible, and a home-based studio in Ho Chi Minh City with no customer visits does not fit the service-area-business model. Wikidata requires a Wikipedia or other Wikimedia sitelink, or a "clearly identifiable entity" backed by "serious and publicly available references", or a structural need. A tiny studio qualifies only once independent coverage exists. The realistic way to a Knowledge Panel is consistent entity data (Organization/Person schema with `sameAs`) plus third-party mentions.

### Cited Findings
- [GOOGLE via third parties] Home-based businesses are eligible only if they serve customers in person, either at their location or by travelling to customers. Businesses operating entirely online without in-person contact are "generally not eligible". — [Whitespark](https://whitespark.ca/blog/are-home-based-businesses-eligible-for-a-google-business-profile/); [Google GBP help](https://support.google.com/business/answer/2853879?hl=en)
- [GOOGLE] If there is no storefront where customers are received, the address must be hidden and the business set up as a service-area business. Up to 20 service areas are allowed, within about 2 hours' drive. — [Google Business Profile Help](https://support.google.com/business/answer/10514137?hl=en); [Uberall summary](https://uberall.helpjuice.com/457447)
- [VENDOR] A real, verifiable address is still required behind a hidden profile. Virtual offices are not allowed unless staffed. Not every category can hide its address. — [Sterling Sky](https://www.sterlingsky.ca/google-business-profile-virtual-office-guidelines/); [Uberall](https://uberall.helpjuice.com/457447)
- [WIKIDATA] The notability criteria are (1) at least one valid sitelink to Wikipedia, Wikivoyage, Wikisource and similar projects; (2) "a clearly identifiable conceptual or material entity" that can be described with "serious and publicly available references"; (3) a "structural need". — [Wikidata:Notability](https://www.wikidata.org/wiki/Wikidata:Notability)

### Inferences
- GBP: listing a home studio with no customer visits would likely break the guidelines and risks suspension. If the studio ever runs public playtest events at a staffed venue, revisit this. Otherwise skip GBP.
- Wikidata: once there are 2-3 independent articles (Vietnamese gaming or tech press, an itch.io or Poki/CrazyGames listing, an app-store page), an item for the game, and possibly for the founder, could meet criterion 2. Criterion 3 could also apply if the game item references the studio. Self-created thin items do get deleted. Odds today: borderline.
- Brand SERP: use Organization schema on billthedevstudio.com with `sameAs` pointing to YouTube, Play developer page, X/Facebook and billthedev.com. Use Person schema on billthedev.com with `worksFor` set to the studio and `sameAs` to the socials. Use VideoGame schema on the game with `publisher` set to the studio. Keep names identical everywhere, for example "Bill The Dev Studio". This is the main lever for a Knowledge Panel and is also what AI systems read.

### Gaps
- No Google statement in 2025-26 gives specific Knowledge Panel thresholds. Google does not publish them.

## 6. AI search visibility (AI Overviews, AI Mode, ChatGPT, Perplexity, Gemini, Copilot), llms.txt, Vietnamese

### Takeaway
[GOOGLE] There are no extra requirements: a page that is indexed and eligible for a snippet can be a supporting link, and sources are found through "query fan-out". No special schema, AI text file or llms.txt is needed. [VENDOR] Across studies, off-site brand mentions (web, YouTube, Reddit) correlate with AI visibility much more strongly than backlinks. ChatGPT's citations track Bing's index closely. llms.txt is almost never fetched by AI crawlers. AI Mode now supports Vietnamese.

### Cited Findings — Google statements
- [GOOGLE] Supporting links must be "indexed and eligible to be shown in Google Search with a snippet". "There are no additional technical requirements." Both AI Overviews and AI Mode may use query fan-out across subtopics. The two features may use different models, so the links they show differ. AI Overviews appear only when they add value. Structured data should match the visible text, but "no special schema.org structured data" is needed. You don't need to create new machine-readable files or AI text files. Traffic from AI features is counted in Search Console's Performance report under "Web". Snippet controls (`nosnippet`, `data-nosnippet`, `max-snippet`, `noindex`) apply. Google-Extended covers other Google AI systems. — [Google: AI features and your website (updated 2025-12-10)](https://developers.google.com/search/docs/appearance/ai-features)
- [GOOGLE] Gary Illyes (July 2025): Google doesn't support llms.txt and has no plans to. John Mueller compared it to the keywords meta tag. Lighthouse has added an llms.txt audit, aimed at browser agents rather than SEO. — [Search Engine Land](https://searchengineland.com/google-says-llms-txt-files-wont-harm-or-help-your-search-rankings-480264); [SEJ](https://searchenginejournal.com/googles-llms-txt-guidance-depends-on-which-product-you-ask/575431/); [Pasquale Pillitteri](https://pasqualepillitteri.it/en/news/3734/llms-txt-google-seo-chrome-lighthouse-en)
- [GOOGLE via press] A Search Console toggle can opt a site out of grounding generative AI Search features (AI Overviews, AI Mode, AI Overviews in Discover). It is not a ranking signal. — [9to5Google](https://9to5google.com/?p=716745)
- [GOOGLE] AI Mode added Hindi, Indonesian, Japanese, Korean and Brazilian Portuguese in September 2025. A later expansion added 35 languages, including Vietnamese, Thai, Malay, Russian, German, French and Chinese, and reached 200+ countries and territories. — [Google blog](https://blog.google/products/search/ai-mode-expands-more-languages/); [TechCrunch](https://techcrunch.com/2025/09/08/googles-ai-mode-adds-5-new-languages-including-hindi-japanese-and-korean); [Engadget](https://engadget.com/ai/google-search-ai-mode-is-now-available-in-more-languages-and-regions-043540278.html)
- [GOOGLE via press] On 15 May 2026 the spam policies were revised to explicitly cover manipulation of generative AI responses. Scaled content abuse applies across all search formats, including AI Overviews. — [WebProNews](https://www.webpronews.com/google-tightens-rules-on-ai-search-manipulation/)

### Cited Findings — vendor studies
- [VENDOR: Ahrefs, 75k brands, 2025] Branded web mentions correlated 0.664 with AI Overview brand visibility, against 0.218 for referring domains. Branded anchors scored 0.527, branded search volume 0.392 and branded organic traffic 0.274. These are correlations only, and brands with zero AI Overview mentions were excluded. — [Search Engine Journal](https://www.searchenginejournal.com/ahrefs-data-shows-brand-mentions-boost-ai-search-rankings/559938/); [CiteFlow](https://www.citeflow.io/blog/brand-mentions-vs-backlinks)
- [VENDOR: Ahrefs, Dec 2025 follow-up covering ChatGPT, AI Mode and AI Overviews] YouTube mentions had the strongest single signal (about 0.737). For AI Mode, branded web mentions correlated at 0.709. — [CiteFlow](https://www.citeflow.io/blog/brand-mentions-vs-backlinks); [Medium/Machine Relations](https://medium.com/machine-relations/brand-mentions-vs-backlinks-for-ai-visibility-what-the-data-shows-8412550788e0)
- [VENDOR: Seer Interactive, Feb 2025] About 87% of ChatGPT search citations overlapped with Bing's top results, against 56% for Google's top results. — [Pingprime summary](https://www.pingprime.ai/en-be/blog/chatgpt-search-ai-overviews-perplexity); [AEOHunt](https://aeohunt.com/blog/how-ai-engines-choose-sources-2026)
- [VENDOR: Profound / others] Reddit is the leading source for Perplexity (46.7% of top-10 source share, but 6.6% of all citations). A vendor claims about 82% of Perplexity citations are under 30 days old. Estimates of Wikipedia's share of ChatGPT citations range from 12.1% to 47.9% depending on method. Semrush recorded Reddit's ChatGPT share falling from about 60% to about 10% between August and September 2025. Only about 11% of domains are cited by both ChatGPT and Perplexity. — [Profound](https://www.tryprofound.com/blog/ai-platform-citation-patterns); [5WPR AI Citation Index](https://www.5wpr.com/research/state-of-ai-citations-2026/); [QuickSEO](https://quickseo.ai/blog/how-reddit-affects-ai-visibility-2026); [Discovered Labs](https://discoveredlabs.com/blog/chatgpt-claude-perplexity-and-google-ai-overviews-how-each-platform-cites-sources-differently)
- [VENDOR: Ahrefs, 137k domains] 28% of domains publish llms.txt, 97% of those files were never requested, and AI retrieval bots made only 1.1% of llms.txt requests. SE Ranking (Nov 2025) found 10.13% adoption and only 1 of the 50 most AI-cited domains had llms.txt. Limy counted 408 llms.txt hits among 500M+ AI-bot visits. — [PPC Land](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/); [Optimizely](https://www.optimizely.com/field-notes/articles/does-llms-txt-work/); [Limy](https://limy.ai/blog/llms.txt-in-2026-the-full-guide)

### Inferences
- The highest-leverage GEO actions for this studio, in order:
  1. Earn third-party mentions: YouTube (own channel plus creators covering the game), Reddit threads (r/WebGames, r/incremental-style communities, Vietnamese subs), game portals and Vietnamese press.
  2. Get indexed in Bing (Bing Webmaster Tools plus IndexNow), because ChatGPT and Copilot depend on it.
  3. Write factual, clearly structured pages per game: what it is, how to play, rules, languages, platform, price (free), studio and founder, release date. A short FAQ helps fan-out queries like "dép lào game là gì" or "flip flop slam how to play".
- llms.txt: optional and near-zero value. If added it costs nothing, but don't prioritise it.
- Vietnamese AI answers: AI Mode supports Vietnamese, and the studio already has vi content. Vietnamese pages that answer folk-game and nostalgia questions ("trò chơi dân gian", "ném dép") in plain factual form are the realistic way to get cited in vi answers, because there is less competing content.
- Perplexity's freshness bias means regular dated news and devlog posts help there.

### Gaps
- No rigorous (non-vendor) study isolates causation between structured or factual pages and AI citations. The evidence is correlational, so treat it as directional.
- No data specific to Vietnamese-language AI citations was found.
- No 2025-26 primary source was found on Gemini app or Copilot source selection beyond the Bing link.

## 7. Bing/Copilot, Cốc Cốc, Yandex, Naver, Yahoo Japan, IndexNow

### Takeaway
Vietnam is about 94% Google, and Cốc Cốc has only about 4-5%. In Korea, Naver is large (it leads on mobile, and the two measurement firms disagree on the overall share), so Naver Search Advisor registration matters if Korean is one of the 10 languages. IndexNow covers Bing, Naver, Yandex, Seznam and Yep, but not Google, so one IndexNow ping from the static-site deploy reaches Bing, Copilot, ChatGPT's Bing grounding and Naver.

### Cited Findings
- [VENDOR: StatCounter, May 2026] Vietnam search share: Google 94.41%, Cốc Cốc 4.41%, Bing 0.59%, Yahoo 0.46%. Some local agency sources claim Cốc Cốc has more than 50%, which conflicts with StatCounter and is unreliable. — [StatCounter Vietnam](https://gs.statcounter.com/search-engine-market-share/all/viet-nam); [DPS.MEDIA (conflicting claim)](https://dps.media/en/coc-coc-search-vietnamese-friendly-search-tool-competing-with-google/)
- [VENDOR] Korea, 2026: InternetTrend (July 2026) has Naver at 66.69% and Google at 26.10%. StatCounter (May 2026, all platforms) has google.com at 46.63% and Naver at about 42% combined. On mobile Naver has 66.67% against Google's 28.56%, while on desktop Google leads with 59.78%. — [StatCounter South Korea](https://gs.statcounter.com/search-engine-host-market-share/all/south-korea); [Interad](https://www.interad.com/en/insights/google-overtakes-naver-in-monthly-users-what-does-it-mean-for-marketing-in-korea); [Seoulz](https://www.seoulz.com/naver-vs-google-korea/)
- [VENDOR] IndexNow participants are Microsoft Bing, Yandex, Naver, Seznam and Yep. Naver's endpoint is `searchadvisor.naver.com/indexnow`. Google does not support IndexNow. — [Wikipedia: IndexNow](https://en.wikipedia.org/wiki/IndexNow); [Pressonify](https://pressonify.ai/blog/indexnow-instant-indexing-press-releases-2026); [IndexBolt](https://www.indexbolt.com/glossary/indexnow)

### Inferences
- Priority list: Google Search Console (all 3 sites), Bing Webmaster Tools (can import from GSC; feeds Copilot and ChatGPT), IndexNow key file plus a deploy hook, then Naver Search Advisor (if a ko locale exists), then Yandex Webmaster (if a ru locale exists), then Cốc Cốc (low priority).
- Yahoo Japan: my background knowledge, not verified this session, is that Yahoo! JAPAN's web results are powered by Google, so Google SEO covers Japan. Confirm before relying on it.

### Gaps
- No source was found for Cốc Cốc's webmaster tools or IndexNow support. Not verified.
- Naver Search Advisor's registration steps for foreign sites, and Yahoo Japan's backend, were not verified with sources this session.
- Bing Webmaster and Copilot-specific docs were not fetched.

## 8. Programmatic and long-tail pages vs scaled content abuse

### Takeaway
Google does not publish a page-count threshold. The test is whether pages are "generated mainly to manipulate rankings" and are "unoriginal… of little value". Since May 2026 the policy explicitly covers AI-answer manipulation too. One genuinely localised page per language market, per related folk game or per occasion is safe if each page carries unique substance: rules, regional names, history, screenshots, a real playable link, and real translation rather than token swaps. Templated swap-the-keyword pages risk both scaled-content and doorway penalties.

### Cited Findings
- [GOOGLE via PPC Land] Spam policies (last revised 28 Aug 2026) describe scaled content abuse as many pages "generated mainly to manipulate rankings", typically unoriginal and of little value. The five illustrative patterns include unoriginal AI output, scraping and spreading output across sites to hide scale. "No threshold is published." — [PPC Land: scaled content abuse](https://ppc.land/scaled-content-abuse/)
- [VENDOR] Templated location-style pages are especially exposed to both scaled-content and doorway rules. — [PPC Land](https://ppc.land/scaled-content-abuse/)
- [GOOGLE via press] 2026 spam updates: June (24-26 June, all languages, not targeting link spam or site reputation abuse), August (began 18 Aug, content policies) and September (broader). — [Priority Pixels](https://prioritypixels.co.uk/insights/googles-june-2026-spam-update-is-rolling-out/); [GSQi case studies](https://gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/); [Sanjay B](https://sanjayb.com/august-2026-spam-update)
- [VENDOR] A study of 16,573 Mediavine and Raptive sites in a March core update found sites under 10k visits per month lost 64% on average, against 9% for sites over 1M. The year is unspecified and the sample is ad-network sites only. — [Niche Site Growth](https://nichesitegrowth.beehiiv.com/p/tracked-16573-websites-march-core-update)

### Inferences
- Safe patterns for this studio:
  - 10 language versions of the game page, each with a native-quality description and hreflang.
  - One page per real folk-game relative (for example ném dép and other childhood throwing games), with genuine history and rules.
  - Occasion pages only where the game actually has seasonal content (a Tết mode or similar).
  - Founder devlogs with first-hand experience, which supports E-E-A-T.
- Risky patterns: "best free game in {city}" pages, machine-translated pages left unedited, near-duplicate "play X online" pages for keyword variants, and mass AI-written news posts.
- Small sites took the biggest hits in recent core updates, so fewer, deeper pages beat many thin ones.

### Gaps
- I did not fetch Google's spam-policies page directly. The definition is quoted via PPC Land, so verify the exact wording at developers.google.com/search/docs/essentials/spam-policies.
- No Google guidance specific to localised or translated programmatic pages was found in 2025-26 sources.
