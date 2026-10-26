# Technical SEO for a single-page WebGL browser game (Dép Lào Tuổi Thơ / Flip-Flop Slam), Google guidance 2025-2026

Scope: play.billthedevstudio.com/slam-cards/. It is one HTML document with a three.js canvas, available in 10 languages through `?lang=`. Room links use `?room=`. The research was done 22/10/2026. Each point is labelled either "Google explicit" (from Search Central or web.dev documentation) or "practitioner" (opinion or observation).

## 1. How Googlebot renders JS/WebGL SPAs, and how a canvas game should supply indexable text

### Takeaway
Googlebot renders any 200 page in a headless Chromium. It indexes the rendered DOM text and `<a href>` links. Pixels drawn on a `<canvas>` produce no text, so the game itself adds almost nothing to the index. Indexable content has to be real HTML text: an H1, a description, how to play, controls and FAQ-style copy, server-rendered around or below the canvas. Large portals such as CrazyGames do exactly this.

### Cited Findings
- Google explicit: Googlebot queues pages for crawling and rendering separately. Every page with a 200 status goes to the render queue, and headless Chromium runs the JS before Google parses the rendered HTML for links and indexing. Google Search won't render JS from blocked files or pages. (Page last updated 2026-03-04.) [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Google explicit: Google discovers links only from `<a>` elements with an `href`. Fragment URLs (`#/x`) can't be reliably resolved, so use the History API with real paths. [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Google explicit: when Google sees `noindex` in the original HTML it "may skip rendering and JavaScript execution", so JS cannot reliably remove a noindex. Decide indexability server-side. [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Google's JS SEO page does not mention canvas or WebGL at all. A search found no Google statement specific to WebGL/canvas indexing. [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Historical background: the evergreen Googlebot (modern Chromium) dates from 2019 [Google Webmaster blog 2019](https://webmasters.googleblog.com/2019/05/the-new-evergreen-googlebot.html). In 2018 Google said the render queue could delay indexing of JS-dependent content from minutes to about a week; this is a secondhand recap and outdated, as later talks reportedly gave a median render time of about 5 s. [Lumar recap](https://www.lumar.io/blog/industry-news/google-javascript-rendering-secrets-chrome-dev-summit-2018/)
- Practitioner/industry example: the CrazyGames page for Smash Karts puts the game inside a full HTML page:
  - title "Smash Karts … Play on CrazyGames" and H1 "Smash Karts"
  - breadcrumbs Games > .io > Battle
  - intro paragraph, then an H2 "How to Play" with sub-sections and a feature list
  - metadata block (developer, release date, platforms, rating with vote count, engine, orientation)
  - controls, an H2 FAQ with 4 Qs, a gameplay video, tag/category links and links to related games

  [CrazyGames Smash Karts](https://www.crazygames.com/game/smash-karts)
- Google explicit: title links can come from `<title>`, the main visual title, H1, `og:title`, other prominent text, anchor text, and WebSite structured data. A canvas-only page gives Google nothing but `<title>`/og:title to work with. [Title links](https://developers.google.com/search/docs/appearance/title-link)

### Inferences
- Server-render, in the same HTML response, a text block in the current language. It should hold an H1 with the game name, a 1-2 paragraph description, how to play, controls (touch/mouse), number of players, and "play with friends via room link". It can sit below the canvas (scroll) or in a pre-game landing/menu overlay made of real DOM. Hiding it with `display:none` is riskier. The main game page should be the canonical, indexable page with this text.
- `<noscript>` text is a weak fallback. Google renders JS, so noscript content is not the main lever. Real visible DOM text is.
- Separate, light HTML pages would give more indexable URLs and real internal links, e.g. `/slam-cards/how-to-play/`, `/slam-cards/about/`, and a blog/press page on the studio root. Make sure every page is a real `<a href>`.
- Do not serve noindex in initial HTML then try to remove it via JS.

### Gaps
- There is no Google statement about whether WRS (the Web Rendering Service) initialises WebGL contexts or captures canvas output. Assume it contributes nothing to indexing.
- No primary data was found on how Poki builds its game pages. Only CrazyGames was checked.

## 2. Structured data: what is relevant and what still produces rich results (2025-2026)

### Takeaway
The only rich result that fits a free web game is the Software App rich result. It requires `name`, `offers.price` (0 for free) and either `aggregateRating` or `review`. An app typed only as `VideoGame` gets no rich result, so co-type it as `["VideoGame","WebApplication"]`. FAQ rich results are gone: Google stopped showing them on 7 May 2026 and removed the docs in June 2026. HowTo rich results have been gone since 2023. Organization, WebSite (site name) and BreadcrumbList are cheap and help understanding and branding. Only add a rating if real user ratings are collected and shown on the page.

### Cited Findings
- Google explicit, Software App rich result:
  - Required: `name`; `offers.price` (set `0` for free; add `priceCurrency` for paid); and at least one of `aggregateRating` or `review`, which follow the Review snippet guidelines.
  - Recommended: `applicationCategory` (e.g. `GameApplication`) and `operatingSystem`.
  - `MobileApplication` and `WebApplication` are supported extended types.
  - "Apps typed only as VideoGame don't get a rich result", so co-type, e.g. `["VideoGame","MobileApplication"]`.
  - Rich results aren't guaranteed.

  (Page last updated 2026-09-08.) [Software app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- Google explicit: FAQ rich results were deprecated, and the changelog says the "feature will no longer appear in Google Search starting May 7, 2026". On 15 June 2026 Google removed the documentation, since the feature "is no longer shown in Google Search results". [FAQPage doc / changelog](https://developers.google.com/search/docs/appearance/structured-data/faqpage). Secondary coverage disagrees on whether government and health sites kept eligibility; Google's own text says not shown. [TechWyse](https://www.techwyse.com/news/ai-search/google-faq-rich-results-deprecated-2026)
- Google explicit (2023): In August 2023 FAQ rich results were limited to well-known authoritative government and health sites. HowTo was first limited to desktop, then deprecated completely around 13 Sep 2023, with Search Console reports dropped. [Search Central blog Aug 2023](https://developers.google.com/search/blog/2023/08/howto-faq-changes); [SEJ: HowTo removed](https://www.searchenginejournal.com/google-completely-removes-how-to-rich-results/496479/); [Search Engine Land](https://searchengineland.com/?p=430452). This makes the 2023 guidance outdated for FAQ, since it is now gone for everyone.
- Google explicit (via secondary quote): unused structured data "does not cause problems for Search, but also has no visible effects". [Search Engine Journal](https://www.searchenginejournal.com/google-downgrades-visibility-of-howto-and-faq-rich-results/)
- Secondary: in June 2025 Google deprecated seven more structured data types, including Course Info and Learning Video, with phased removal. [Relevant Audience](https://www.relevantaudience.com/seo/google-removes-structured-data-2025-guide-for-websites/)
- Google explicit: to set a site name, use `WebSite` structured data on the home page (`name`, `url`, optional `alternateName`); Google also considers `og:site_name`. Site names work for domain-level and **subdomain-level** sites, but "Google Search does not support site names at the subdirectory level". [Site names](https://developers.google.com/search/docs/appearance/site-names)

### Inferences
- The JSON-LD on `/slam-cards/` should co-type the game as `@type: ["VideoGame","WebApplication"]` with:
  - `name`, `description`, `url` (canonical), `image`, `inLanguage`
  - `applicationCategory: "GameApplication"`, `operatingSystem: "Any (web browser)"`
  - `offers: {price: 0, priceCurrency: "VND"/"USD"}`
  - `author`/`publisher` pointing to the Organization (Bill The Dev Studio)
  - `gamePlatform`, `numberOfPlayers`, `genre`
- Add `aggregateRating` only if the game shows real player ratings on the page; fabricated or hidden ratings break the review snippet guidelines and risk a manual action. Without a rating there is no software rich result, but the markup still helps understanding.
- Put `WebSite` JSON-LD at `https://play.billthedevstudio.com/` (the subdomain root), because site names work per subdomain, not per subfolder. Put `Organization` (logo, sameAs to socials, contact email) on billthedevstudio.com, and optionally reference it from play.
- Add BreadcrumbList if there are real hierarchy pages, e.g. Home > Games > Dép Lào Tuổi Thơ. It helps understanding; display varies (see Gaps).
- VideoObject is worth it only if a trailer is embedded on the page (video results / key moments). The FAQ section is still useful as visible text for users and for AI answers, but FAQPage markup no longer produces a rich result. HowTo markup is wasted effort.

### Gaps
- I did not verify the current Google display status of breadcrumbs in mobile results. There were reports of a change around early 2025; check the Search Central changelog.
- The current VideoObject requirements page was not fetched.

## 3. Multilingual: ?lang= vs separate paths, and hreflang

### Takeaway
Google recommends a separate URL for each language version, and lists URL parameters (`?loc=`) as "Not recommended". Parameters can still be indexed if they are linked and produce distinct content. The cleanest setup is a subdirectory per language: `/slam-cards/` (vi, the default) plus `/slam-cards/en/` and so on. Each page needs fully server-rendered translated title, description and visible text, reciprocal hreflang including itself, and an x-default. Do not auto-redirect by Accept-Language or IP.

### Cited Findings
- Google explicit, URL structure options:
  - subdirectories: easy, low maintenance
  - subdomains: easy, but users may not see the target
  - URL parameters (`site.com?loc=de`): "Not recommended"

  [Managing multi-regional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- Google explicit:
  - "Google recommends using different URLs for each language version of a page" rather than cookies or browser settings.
  - "Don't use IP analysis to adapt your content."
  - Googlebot usually crawls from the USA without an `Accept-Language` header, so it may miss versions that switch dynamically.
  - "Avoid automatically redirecting" between language versions; add hyperlinks to other language versions instead.

  [Managing multi-regional sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- Google explicit, hreflang:
  - Three equivalent methods: HTML link tags, HTTP Link headers, or the sitemap. Using all three gives no benefit.
  - Each version must list itself and all other versions, and links must be bidirectional or they are ignored.
  - URLs must be fully qualified.
  - Use `x-default` for the fallback or selector page.
  - Codes are ISO 639-1 plus an optional ISO 3166-1 region; a country code alone is invalid.
  - In sitemaps, use `<xhtml:link>` children on each `<url>`, with the xhtml namespace declared.

  [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- Google (community/forum reply, 2020): `?lang=fr` parameters are "perfectly fine" and can be indexed like normal pages, but they must be reachable via normal links, not a form. Mueller (2022) warned that many parameters leading to the same content can make Google ignore a parameter. [Google Webmaster help thread](https://support.google.com/webmasters/thread/87776723?hl=en); [SERoundtable](https://www.seroundtable.com/google-translated-content-garbage-parameters-in-urls-33008.html)

### Inferences
- The current state is risky: today only the link-preview meta changes with `?lang=en`, so the visible page is not a distinct translated page. That is a weak signal, and Google may fold all `?lang=` variants into one.
- Recommended setup:
  - Keep `/slam-cards/` as vi and add `/slam-cards/en/`, `/slam-cards/th/` and so on. Have the server render `<html lang>`, title, description, H1/text and og tags per path.
  - Each page's canonical points to itself; never canonicalise every language to vi.
  - Add the hreflang set (vi, en, … , x-default → `/slam-cards/` or a chooser page) in the `<head>` or the sitemap, not both.
  - Show visible `<a href>` language switcher links.
  - If paths are too much work, keep `?lang=xx` but make it a full translation, self-canonical, hreflang-annotated, and linked. This is acceptable but second-best per Google's doc.
- Keep the in-game language preference (localStorage) for UX, but never redirect Googlebot or first-time visitors away from the requested URL.

### Gaps
- There is no Google statistic on how much hreflang adds for a small site. Practitioners say hreflang is not a ranking factor; it only swaps which URL shows (per [referenceur.be](https://referenceur.be/google-hreflang-influence-pas-ranking/), not verified in full).

## 4. Subdomain vs subfolder for the game under the studio domain

### Takeaway
Google's stated position, unchanged since around 2017, is that subdomains and subfolders are treated the same for ranking. Practitioners still report consolidation gains from subfolders. Here it matters little: the root is GitHub Pages, so a subfolder would need a reverse proxy. The subdomain also brings a concrete Google benefit: it can have its own site name, which a subfolder cannot.

### Cited Findings
- Google (Mueller, 2017 hangout): Google treats subdomains and subdirectories the same. Keep related content together, and use a subdomain only when it is genuinely different. [Search Engine Journal](https://www.searchenginejournal.com/google-treats-subdomains-subdirectories-john-mueller-says/254687/)
- Practitioner: many SEOs dispute this and cite cases where moving international subdomains to subfolders raised traffic. [Semrush (ES)](https://es.semrush.com/blog/subdominio-vs-subdirectorio/); [RankMath](https://rankmath.com/blog/subdomains-vs-subfolders/)
- Google explicit: site names are supported per subdomain, not per subdirectory. [Site names](https://developers.google.com/search/docs/appearance/site-names)
- Google explicit: robots.txt is per host; a file at one subdomain does not cover another. [robots.txt intro](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)

### Inferences
- Keep play. as is. Instead of migrating, connect it to the root with crawlable links both ways:
  - studio site → game page, in each language
  - game page → studio/about/contact

  Use the same Organization entity on both, and verify both in Search Console (a Domain property covers all subdomains).
- A subfolder move is not worth the reverse-proxy complexity at this stage. If one is ever done, it needs 301s per URL.

### Gaps
- I found no 2025-2026 Google statement that revisits the topic.

## 5. Room/invite links (?room=), canonical vs noindex, parameters after the URL Parameters tool

### Takeaway
Room URLs are temporary duplicates of the game page. The canonical tag on `?room=ABCD` should point to the clean `/slam-cards/` (or the language URL), not to itself. The server already writes the canonical tag per request, so this is a one-line fix. Google advises against noindex for canonicalisation and against using robots.txt for it. The URL Parameters tool has been gone since April 2022, so canonical, internal linking and sitemaps are the levers.

### Cited Findings
- Google explicit, signal strength:
  - redirect: strongest
  - `rel=canonical` (in HTML or HTTP header; pick one): strong
  - sitemap inclusion: weak

  Combining them raises the chance the preferred URL is chosen. [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- Google explicit: Google does not recommend "using noindex to prevent selection of a canonical page within a single site", because it fully blocks the page. Do not use robots.txt for canonicalisation either, since Google "may still index URLs that are disallowed in robots.txt without their content". Link internally to the canonical URL. [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- Google explicit: the URL Parameters tool was announced as retired on 28 Mar 2022 (shutdown about 26 Apr 2022), because only about 1% of configurations helped crawling. Google said no action was needed, and pointed to robots.txt for more control. [Search Central blog](https://developers.google.com/search/blog/2022/03/url-parameters-tool-deprecated); [Search Engine Land](https://searchengineland.com/googles-url-parameters-tool-is-going-away-383220)
- Google explicit: Google may pick a different canonical than declared; check it with URL Inspection. [Canonicalization troubleshooting](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting)

### Inferences
- Fix: set canonical(`/slam-cards/?room=ABCD`) = `https://play.billthedevstudio.com/slam-cards/` (or `/slam-cards/en/` for English). Keep og:url equal to the canonical too, unless the room-specific preview text is wanted; og:url affects Facebook's share grouping.
- Never list room URLs in the sitemap or link to them internally.
- Optional: a `Disallow: /*?room=` rule cuts crawl waste. The downside is that Google then can't see the canonical, and the URLs may get indexed bare if they are linked publicly. Canonical alone is safer; robots.txt rules are for crawl budget, which is irrelevant at this scale.
- Ad-hoc params (fbclid, utm_, zarsrc) need the same treatment, because the per-request canonical should always strip query params except a supported language param, if that stays.

### Gaps
- None material.

## 6. Soft 404s and SPA fallback

### Takeaway
Serving the game page with 200 for any unknown path is a classic soft 404. Google may flag it, and it can produce indexable duplicates. The server already routes; it should return a real 404 (or 410) for unknown paths and only serve the game at known routes.

### Cited Findings
- Google explicit: when client-side routing can't set status codes, do one of two things:
  - JS-redirect to a URL the server answers with a 404, e.g. `/not-found`
  - add a `noindex` robots meta to error pages via JS

  [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Google explicit: Google processes any 2xx response. An empty or error-looking page with 200 shows as a soft 404 in Search Console. Google doesn't index URLs that return 4xx. [HTTP status codes & network errors](https://developers.google.com/search/docs/crawling-indexing/http-network-errors)

### Inferences
- With a Node server this is easy. Whitelist known paths: `/`, `/slam-cards/`, the language paths, static assets, `/robots.txt`, `/sitemap.xml` and API/WebSocket routes. Everything else gets HTTP 404 with a small HTML page linking to the game. The nginx `try_files` fallback must not rewrite every path to index.html.

### Gaps
- None.

## 7. Sitemaps (with hreflang) and robots.txt placement

### Takeaway
robots.txt must live at `https://play.billthedevstudio.com/robots.txt`; the root domain's file does not cover the subdomain. Add a `Sitemap:` line pointing to a sitemap that lists only canonical URLs: each language page, plus how-to/about pages if they exist. Hreflang can go there instead of the `<head>`.

### Cited Findings
- Google explicit: robots.txt must be in the top-level directory; a file in a subfolder has no effect. It applies only to the exact protocol, host and port. A `Sitemap:` line must be a fully qualified URL, can point to another host, and applies to all user agents. [robots.txt intro](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)
- Google explicit: a sitemap can only list URLs under its own directory. Sitemap hreflang uses `<xhtml:link rel="alternate" hreflang=… href=…>` children, including a self entry, the same set on every entry, and the xhtml namespace on `urlset`. [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- Google explicit: sitemap inclusion is a weak canonical signal. [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

### Inferences
- Serve `/robots.txt` and `/sitemap.xml` from the play. host root, not under `/slam-cards/`, because of the sitemap directory scope. The repo has untracked `proto/public/robots.txt` and `sitemap.xml`; confirm nginx serves them at the subdomain root.
- Minimal robots.txt: `User-agent: *`, `Allow: /`, then the `Sitemap:` line. Do not block JS, CSS, model or texture files, because Google won't render with blocked resources.
- Submit the sitemap in Search Console under a Domain property for billthedevstudio.com, which covers play. too.

### Gaps
- None.

## 8. Core Web Vitals for a heavy WebGL page

### Takeaway
CWV are a real but small ranking signal. Google says they are "used by our ranking systems" but there is "no single signal", and relevance wins even with sub-par page experience. The thresholds are LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile. `<canvas>` is not an LCP candidate type, so the LCP element on a WebGL page is whatever HTML image or text paints. A light server-rendered hero makes LCP fast and stable, and lazy-loading three.js keeps INP and CLS in check.

### Cited Findings
- Google explicit: "Core Web Vitals are used by our ranking systems", but there is "no single signal". Good scores don't guarantee top rankings. Other page-experience aspects "don't directly help your website rank higher". Google "always seeks to show the most relevant content, even if the page experience is sub-par". (Page updated 2026-09-22.) [Page experience](https://developers.google.com/search/docs/appearance/page-experience)
- web.dev explicit: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, judged at the 75th percentile and segmented by mobile and desktop. INP replaced FID as a stable CWV in 2024. [web.dev Web Vitals](https://web.dev/articles/vitals)
- web.dev explicit:
  - LCP candidates are `<img>`, `<image>` in SVG, `<video>` (poster or first frame), url() background images, and block elements with text. Canvas is not listed.
  - Elements with opacity 0 are excluded.
  - LCP stops being recorded at the first user interaction (tap, scroll or keypress).

  [web.dev LCP](https://web.dev/articles/lcp)

### Inferences
- Practical fixes:
  1. Server-render a poster/hero: a small optimised `<img>` (WebP/AVIF with `fetchpriority="high"`, width and height set) plus the H1 and text. It becomes the LCP and paints in under 1 s.
  2. Load three.js and assets after first paint (dynamic `import()`); show a progress UI in reserved space.
  3. Reserve the canvas box with fixed CSS dimensions, so CLS stays near 0.
  4. Keep main-thread work in menus short, and break up long tasks during asset decode or shader compile, for INP.
  5. Avoid ad scripts injecting above the fold.
- Field data (CrUX) only exists once there is enough traffic. Until then, CWV hardly matter for ranking; content and links matter more.

### Gaps
- No Google number for CWV ranking weight exists. Google deliberately doesn't publish one.

## 9. Link previews (og:) vs SEO; Facebook/Zalo/Messenger

### Takeaway
og: tags are mainly for social previews, but Google also uses `og:title` as one input for title links and `og:site_name` as one input for site names. Social crawlers don't run JS, so the current server-side per-request injection is the right approach. Use a 1200×630 og:image and keep it small, ideally under 300 KB for WhatsApp-like clients.

### Cited Findings
- Google explicit: `og:title` is among the title-link sources [Title links](https://developers.google.com/search/docs/appearance/title-link); `og:site_name` is considered for site names [Site names](https://developers.google.com/search/docs/appearance/site-names).
- Practitioner (Splitt, as summarised): social media crawlers can't render JS, so client-rendered meta needs server/dynamic rendering. [Lumar](https://www.lumar.io/blog/industry-news/google-chrome-dev-summit-2018/)
- Facebook explicit: recommends images of at least 1200×630, with 600×315 as the minimum for large previews, 8 MB max, and a ratio near 1.91:1. [Meta: Images in link shares](https://developers.facebook.com/docs/sharing/webmasters/images)
- Practitioner: WhatsApp reportedly shows a preview only if og:image is under about 300 KB. [Wix](https://support.wix.com/en/article/wix-editor-recommended-ogimage-size); [Flarum forum](https://discuss.flarum.org/d/39207-whatsapp-embed)

### Inferences
- Keep per-language og:title, og:description, og:image (localised art) and og:locale, plus og:locale:alternate. Keep the room-invite text ("X invites you to room ABCD") in og tags only; the canonical still points to the clean URL. Use the Facebook Sharing Debugger to refresh the cache after changes.

### Gaps
- I found no official Zalo developer documentation on og:image size or caching. Test by sharing in Zalo.

## 10. Page experience: HTTPS, mobile, intrusive interstitials (ads preroll)

### Takeaway
HTTPS and mobile-friendliness are baseline self-checks, not ranking boosts on their own. A full-screen ad or preroll covering the content when someone lands from Search is exactly what Google's interstitial guidance warns against. Show ads after the user starts or between rounds, never before the landing content.

### Cited Findings
- Google explicit: the self-assessment covers secure (HTTPS) serving, display on mobile, and avoiding intrusive interstitials. Only CWV are said to be used in ranking; the other aspects don't directly help ranking. [Page experience](https://developers.google.com/search/docs/appearance/page-experience)
- Google explicit: intrusive interstitials obstruct the view of content, usually for promotion. Google recommends small banners instead, and lists two mistakes: covering the whole page, and redirecting to a separate page for consent or input. Legally mandatory ones (cookie consent, age gates) are exempt. [Interstitials and dialogs](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials)
- Google (2016 blog): introduced a mobile signal demoting pages whose content isn't easily accessible on the click-through from search. It was later folded into page experience. [Search Central blog 2016](https://developers.google.com/search/blog/2016/08/helping-users-easily-access-content-on)

### Inferences
- Gate ad prerolls behind an explicit "Play" tap, after the landing text and hero have shown. Use a small, dismissible cookie/consent banner if needed (AdSense in the EU requires a CMP). Keep the HTTPS redirect and HSTS, and the viewport meta.

### Gaps
- No quantified ranking impact of interstitials in 2025-2026 was found.

## Summary: what helps vs wasted effort (synthesis)
- **High value:**
  - server-rendered visible text around the canvas, plus how-to/about pages
  - clean canonical without `?room=`
  - real 404s
  - robots.txt and sitemap at the subdomain root
  - a separate URL per language with hreflang and x-default
  - WebSite structured data on the subdomain and Organization structured data on the studio site
  - VideoGame+WebApplication JSON-LD with offers price 0
  - a fast HTML hero as LCP
  - no preroll before content
  - crawlable links between the studio site and play.
- **Conditional:** aggregateRating, only with real on-page ratings (this unlocks the software rich result); VideoObject, only if a trailer is embedded.
- **Wasted effort now:** FAQPage markup for rich results (gone since May 2026), HowTo markup (gone since 2023), migrating play. to a subfolder, noindex on room URLs instead of canonical, chasing perfect CWV before there is traffic, the URL Parameters tool (removed in 2022).
