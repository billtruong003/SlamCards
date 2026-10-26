# SEO for a one-man studio + founder portfolio: E-E-A-T, entity SEO, cross-site linking, and a live audit (Oct 2026)

Method note: the live audit was measured on 2026-10-22 with `curl` (Googlebot UA) and a regex parser over the raw HTML, which is what Google gets before JS runs. Pages fetched: studio `/`, `/vi/`, `/press/`, `/news/`, `/news/2026-slam-cards-beta/`, `/games/slam-cards/`, `/games/meh-merge/`, `/privacy/`, robots, sitemap; portfolio `/`, `/arcade/`, `/lab/unity-shmup-11-build-webgl-en/`, robots, sitemap; game `play.billthedevstudio.com/slam-cards/`. Only 3 of ~20 studio URLs and 3 of 192 portfolio URLs were checked. "Measured" items are direct observations. "Recommendation" items are inferences.

## Live audit: billthedevstudio.com (measured)

### Takeaway
The studio site is technically solid: prerendered HTML, canonical, en/vi hreflang, OG on every page, sitemap and robots. The big gap is entity markup. The only JSON-LD on the whole site is NewsArticle on news posts. There is no Organization, WebSite, VideoGame/SoftwareApplication, BreadcrumbList or Person markup. There are also several naming and link inconsistencies.

### Cited Findings (measured, source = live fetch of the URL named)
- **Rendering:** every Next.js page is server-prerendered (static export). Word counts in raw HTML: home 878 (EN) / 979 (VI), press 483, news article 511, game pages 310–343. These are not client-only shells. — [billthedevstudio.com](https://billthedevstudio.com/)
- **Titles (unique, brand-suffixed):** "Bill The Dev · one-man game studio", "Press kit · Bill The Dev", "Flip Flop Slam · Bill The Dev", "Meh Merge · Bill The Dev", "News from the studio · Bill The Dev", "Flip Flop Slam opens its beta in the browser · Bill The Dev". VI home: "Bill The Dev · studio game một người". I found no duplicate titles in the sample. — live fetch
- **Meta description** present on every sampled page. The home description is good: "Shades on. Ship it. Bill The Dev is a one-man game studio from Vietnam: Meh Merge, Nah Blocks, Bruh Arrows, Flip Flop Slam, and Unity, web and AI work for clients." On /news/ it is truncated mid-sentence: "…Tutorials and devlogs live on" (the link text was dropped). — [news](https://billthedevstudio.com/news/)
- **Canonical:** self-referencing absolute canonical on every Next.js page, all with a trailing slash. `/games/meh-merge` returns a 301 to `/games/meh-merge/` (GitHub Pages directory redirect). http→https 301 works. A random URL returns a real 404 status. — live fetch
- **hreflang:** each page has reciprocal `en` + `vi` alternates (for example `/games/slam-cards/` ↔ `/vi/games/slam-cards/`). There is **no `x-default`** anywhere. The sitemap has no `xhtml:link` alternates, which is fine because HTML tags are an equivalent method. `<html lang>` is set correctly (en / vi). — live fetch
- **Open Graph:** og:title, description, url, site_name ("Bill The Dev"), type, and twitter:card=summary_large_image on all pages. **Every game page reuses the generic `/img/brand/og.png`** (279 KB) instead of the game's key art. Only news articles have a per-page og:image. — live fetch
- **Structured data:** **home, /vi/, /press/, /news/, game pages: no JSON-LD at all.** The news article has one NewsArticle block with headline, description, datePublished "2026-10-19" (no time or timezone), image, `author` Person "Trương Ngọc Châu (Bill)" with jobTitle and url=https://www.billthedev.com, and `publisher` Organization "Bill The Dev" with url but **no logo**. It has no `dateModified` and no `sameAs`. — [news article](https://billthedevstudio.com/news/2026-slam-cards-beta/)
- **Headings:** home has one H1 ("Shades on. Ship it.", a slogan with no brand or keyword), then H2s ("Four games out. Duck Drip is next.", "How Bill The Dev works", "Need it built?…", "One developer. Every part of the game.") and H3s for services and games. Game and news pages have a single H1 equal to the game or article name. /news/ has only an H1, and article cards are not headings. — live fetch
- **Images/alt:** no `<img>` lacks an alt attribute, but most use `alt=""`. That is 11/14 on home, 12/12 on Flip Flop Slam, 13/13 on Meh Merge, and 19/19 on press, including screenshots and the logos offered for download. Google Images gets no text for the game screenshots. — live fetch
- **Assets/performance:** home preloads **~16 images** (fox.svg, five feature/shot JPGs, five game icons, collab image, bill-portrait.webp, lucy-wave.webp, …) plus two fonts. That competes with the LCP image. Every page, including game pages, loads `adsbygoogle.js` synchronously in the head script list. There are 11–12 Next.js chunks. TTFB is about 0.2–0.6 s from Vietnam through GitHub's Fastly CDN. `Cache-Control: max-age=600`. — curl headers
- **Internal links:** home has 57 links. It links to all 5 game pages, /news/, one news post, /press/, /privacy/, and social profiles (YouTube @billthedevgames, TikTok, Facebook /billthedevstudio, LinkedIn, GitHub, Zalo, Messenger, Telegram, Discord) plus `https://www.billthedev.com` and `https://www.billthedev.com/arcade/?game=spirit-war`. The footer has "About Bill" and "Devlog on billthedev.com". **There is no /about/ or /contact/ URL**; "Studio" and "Contact" are hash anchors (`/#studio`, `/#contact`). — live fetch
- **Stale link:** the "Play in the browser" CTA on home, /vi/, the Flip Flop Slam page and the news article points to **`https://billthedevstudio.io.vn/slam-cards/`**, the old domain. It 301s to `https://play.billthedevstudio.com/slam-cards/`, so each click and crawl takes an extra cross-domain hop and passes signals through the domain the user has abandoned. — curl redirect check
- **Contact NAP inconsistency:** Next.js pages use `bill@billthedevstudio.com`. /privacy/ and the game use `support@billthedevstudio.com` (the latest commit says support@ is the contact email). The portfolio uses `billtruong003@gmail.com`. — live fetch
- **/privacy/ is a separate legacy static page:** different CSS (`/assets/site.css`), favicon `/assets/fox.svg`, **og:image `/assets/og.png` returns 404**, no hreflang, no site chrome, 57 words. It is **not in sitemap.xml**, and neither are /privacy/meh-merge/ and the others. Play Console privacy URLs only need to be reachable, so this is low priority. — curl
- **robots.txt:** `User-Agent: * / Allow: / / Sitemap: https://billthedevstudio.com/sitemap.xml`. sitemap.xml lists 22 URLs (11 EN + 11 VI) with `changefreq` only and **no `lastmod`**. `/news/rss.xml` returns 200. `/ads.txt` returns 200. `/favicon.ico` returns 404 (only `/favicon.svg` is declared). — curl
- **Headers:** GitHub Pages sends no HSTS header on the studio apex. The portfolio (`www.billthedev.com`) does send `Strict-Transport-Security`. Neither site can set custom headers (see the Next.js/GitHub Pages section). — curl -I

### Inferences
- The site is close to "good technical SEO". The work left is mostly entity signals and consistency, not crawlability.
- A slogan-only H1 on the home page gives Google little to tie the page to the "Bill The Dev" studio entity. The H1 or the text right next to it should say "Bill The Dev, a one-man game studio in Ho Chi Minh City".

### Gaps
- I did not run Lighthouse/PageSpeed or CrUX, so I have no LCP/INP numbers. The preload count and the synchronous ads script are only risk indicators.
- I did not check Search Console coverage or what Google actually indexed. A general web search for "Bill The Dev" game studio returned no results for either site, which suggests weak brand visibility so far. All the results were unrelated "Bill" entities (Crunchbase, Giant Bomb and similar). That search engine is not Google, so this is indicative only.
- The Ask Lucy assistant was only seen as images (`lucy-wave.webp`). I did not test whether its answers appear in the HTML.

## Live audit: www.billthedev.com and play.billthedevstudio.com (measured)

### Takeaway
The portfolio has good content depth (1,478 words on home, 192 sitemap URLs, 60 with lastmod, 48 hreflang entries) and a Person JSON-LD. But it **never links to the studio**, uses a different name and different social profiles from the studio, has no canonical on the home page, and has an arcade page with a duplicate title and almost no text. The game page itself is a client-rendered shell with no structured data, and it links to the portfolio instead of the studio.

### Cited Findings (measured)
- **Portfolio home:** title "Bill The Dev | Unity Engineer · Games, XR & Tools". The meta description is present. OG is complete, with a generated 1200×630 image and og:image:alt. It has a manifest and apple-touch-icon. **No `<link rel=canonical>` and no hreflang on the home page.** The lab article does have both. — [billthedev.com](https://www.billthedev.com/)
- **Portfolio JSON-LD (home):** `Person` with name **"Bill Truong"**, jobTitle, description, url, email `billtruong003@gmail.com`, address HCMC/VN, and sameAs [GitHub billtruong003, LinkedIn billtruong003, **YouTube @BillTheDev**, **Facebook /billthedev/**, itch.io billtruong003]. It has **no image, no `worksFor`/`founder` link to the studio, no alternateName "Trương Ngọc Châu"**, and it is not wrapped in ProfilePage. — live fetch
- **Name and profile mismatch across sites:** the studio's NewsArticle author is "Trương Ngọc Châu (Bill)" and the press kit says founder "Trương Ngọc Châu (Bill)". The portfolio Person is "Bill Truong". The studio links YouTube **@billthedevgames** and Facebook **/billthedevstudio**. The portfolio links YouTube **@BillTheDev**, **@BillVRGamer**, **@BillAITrainer** and Facebook **/billthedev/**. Neither site lists the other's profiles in sameAs. — live fetch of both
- **Portfolio H1:** "BILL TRUONG" appears three times in a single H1 (a marquee/animation duplicate in the DOM). — live fetch
- **No cross-link to the studio:** the strings "billthedevstudio" appear **0 times** in the portfolio home, the /arcade/ page and the sampled lab article. The studio links to the portfolio 2–3 times per page, so the link graph runs one way only. — grep of fetched HTML
- **/arcade/:** the title is identical to the home page ("Bill The Dev | Unity Engineer · Games, XR & Tools"). That is a **duplicate title**. The page has 24 words in raw HTML, so the games list is client-rendered, and it has no canonical. — [arcade](https://www.billthedev.com/arcade/)
- **Lab article:** unique title, canonical, en↔vi hreflang, `Article` JSON-LD with author **and publisher** both Person "Bill Truong", datePublished 2026-09-24 and dateModified 2026-09-19 (**dateModified is earlier than datePublished**), 1,508 words. — [lab article](https://www.billthedev.com/lab/unity-shmup-11-build-webgl-en/)
- **Portfolio robots/sitemap:** `Allow: /`, `Disallow: /cmd-center/`, sitemap with 192 URLs. `billthedev.com` returns a 301 to `www.billthedev.com`. — curl
- **Game (play.billthedevstudio.com/slam-cards/):** 6.9 KB HTML, `lang="vi"`, Vietnamese title "Dép Lào Tuổi Thơ · Đập dép lật bài online", VI description, full OG with a 1200×630 og-vi.jpg, self canonical. **31 words of text in raw HTML; the three H2s are empty**, so the game is fully client-rendered (Vite bundle). **No JSON-LD, no hreflang** even though the game ships 10 languages. Its only outbound links are `./privacy.html`, **`https://www.billthedev.com`** (not the studio) and `mailto:support@`. — live fetch
- **play subdomain root:** `https://play.billthedevstudio.com/` returns a **302** (temporary) to `/slam-cards/`. `/robots.txt` and `/sitemap.xml` on the subdomain both return **404**. — curl

### Inferences
- As crawled today, Google sees two different people ("Bill Truong" vs "Trương Ngọc Châu (Bill)") with disjoint social profile sets and one-directional links between the sites. That is the opposite of the consistent, corroborated entity that entity-SEO practice calls for (see next section).
- Both domains present `og:site_name` "Bill The Dev" and both titles lead with "Bill The Dev". That invites them to compete for the same brand query (see the cannibalisation section).

### Gaps
- I did not fetch every portfolio page, so I can't say how many other pages share the home title the way /arcade/ does.

## E-E-A-T and entity building (Organization, Person, Knowledge Panel, About/contact, NAP)

### Takeaway
E-E-A-T is not a ranking factor in itself, but Google explicitly asks for clear "who/how/why" signals: bylines that lead to author info and an About page. For entities, the practical recipe is one canonical "entity home" per entity, markup on that page, a consistent one-sentence description, and corroboration by external profiles that point back. Knowledge Panels can't be created on demand, only earned and then claimed.

### Cited Findings
- E-E-A-T "isn't a specific ranking factor"; trust is the most important component; E-E-A-T is weighted more heavily on YMYL topics (games are not YMYL). — [Google: Creating helpful content (updated 2026-10-05)](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- Google asks for "Who/How/Why". Google strongly encourages "accurate authorship information". Bylines should lead to info about the author. An author page or the site's About page helps people judge trust. Fabricated profiles are deception. — [same](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- **Organization markup:** no required properties. Place it on the home page or a single About page; it doesn't need to appear on every page. Recommended: `name` and `alternateName` (use the same as the site name), `url`, `logo` (≥112×112 px, crawlable, looks right on white), `sameAs` (social and review profiles), `contactPoint`/`email`, `address`, `foundingDate`, `description`, and more. It can affect the logo in Search results and knowledge panels. No feature is guaranteed. The doc does **not** list `founder` among its recommended properties, although it is valid schema.org. — [Google: Organization structured data (updated 2026-09-08)](https://developers.google.com/search/docs/appearance/structured-data/organization)
- **ProfilePage:** for pages whose primary focus is a single person or org affiliated with the site (for example an "About Me" page). `mainEntity` Person is required, along with its `name`. Recommended: alternateName (handle), identifier, image, sameAs, description, dateCreated/dateModified, and interaction statistics. The named feature is Discussions and Forums. Article markup can also point to ProfilePage authors. A busy portfolio home page with lots of non-profile content does not fit; an /about/ page does. — [Google: ProfilePage (updated 2026-09-08)](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- **Article author markup:** list each author separately. Give each author a `url` or `sameAs`. Put only the name in `author.name`, with job titles in their own properties. Use Person vs Organization correctly. Dates should be ISO 8601 with a timezone. Images should come in 16×9, 4×3 and 1×1 versions, each at least 50K pixels. No properties are required. — [Google: Article structured data (updated 2026-09-08)](https://developers.google.com/search/docs/appearance/structured-data/article)
- **Knowledge Panel claiming:** search the name, click "Claim this knowledge panel", then sign in to a linked official profile (YouTube, Search Console, Twitter or Facebook). Not every panel can be claimed. — [Google Knowledge Panel Help](https://support.google.com/knowledgepanel/answer/7534902)
- **Entity-home method (vendor view):** (1) choose one owned page, usually About, as the "entity home"; (2) corroborate its facts on several independent authoritative sources; (3) keep a self-reinforcing loop. Repeat one clear subject-verb-object sentence about the entity everywhere. Kalicube claims 3 weeks to 3 months from its own data, and argues Google has "no concept of notability". Kalicube sells this as a service (from US$12k), so treat the timelines as vendor claims. — [Kalicube: Can you create your own knowledge panel](https://kalicube.com/learning-spaces/faq/knowledge-panels/can-you-create-your-own-knowledge-panel); [Kalicube three steps](https://kalicube.com/?p=9525)
- The more Google sees the same information on sources it trusts, the more confident it is in that information. Once a panel exists, it is claimed via "Claim this knowledge panel". — [Semrush: Google Knowledge Panel](https://www.semrush.com/blog/google-knowledge-panel)

### Inferences (recommendations)
- **Two entities, two entity homes:**
  - Organization "Bill The Dev" (studio). Entity home: `billthedevstudio.com/` or a new `/about/`.
  - Person "Trương Ngọc Châu" (alternateName "Bill Truong", "Bill The Dev"). Entity home: a new `www.billthedev.com/about/` with ProfilePage.
  - Link them with `founder` (Org→Person) and `worksFor`/`founderOf`-style text plus `affiliation` (Person→Org). Use `@id`s such as `https://billthedevstudio.com/#org` and `https://www.billthedev.com/#person`, referenced from NewsArticle `author`/`publisher` and from Lab Article `author`.
- **Pick one spelling set and use it everywhere:**
  - Person: name "Trương Ngọc Châu", alternateName ["Bill Truong", "Châu Trương"…], and one face image.
  - Studio: "Bill The Dev", alternateName "Bill The Dev Studio", "billthedevstudio".
  - Contact: one email (support@ for the studio, as the latest commit decided).
  - City: HCMC.
  - Use the same values in the press kit, both sites, the Play developer profile, YouTube About, LinkedIn and Facebook.
- **Split sameAs by entity, and make each profile link back to its entity home:**
  - Studio Org sameAs: YouTube @billthedevgames, TikTok @billthedevstudio, Facebook /billthedevstudio, the Google Play developer page (once public), and itch.io if it is the studio's.
  - Person sameAs: LinkedIn /in/billtruong003, GitHub billtruong003, YouTube @BillTheDev, Facebook /billthedev.
- **Add a real `/about/` (EN + VI) and `/contact/` page on the studio.** Today those are hash anchors on the home page, and anchors can't rank or be targeted as entity homes. The press kit is a good second corroboration page (it already lists founder, founding year 2026, location and history).
- Fix the NewsArticle publisher (add `logo` and `@id`), add a timezone to datePublished (for example `2026-10-19T09:00:00+07:00`), and add `dateModified`. On the portfolio Lab Article, fix dateModified < datePublished, and consider making the publisher the Person `@id`.
- The realistic order: a brand SERP with sitelinks first; a Knowledge Panel only after external corroboration exists (press coverage, the VnExpress VGV 2024 page already linked from the portfolio, Play developer page, YouTube). Then claim it via YouTube sign-in.

### Gaps
- I found no Google documentation that guarantees a Knowledge Panel from markup alone, and no independent study of how long panels take for small personal brands. Kalicube's timelines are self-reported.

## Hub choice, cross-site linking and brand-query cannibalisation

### Takeaway
Each domain or subdomain gets one site name from Google, chosen mainly from the home page's WebSite markup, title, headings and og:site_name. Today both domains claim "Bill The Dev". Make the studio the hub for games and studio-brand queries. Make the portfolio the hub for the person (resume, Unity tutorials). Make the game subdomain a product leaf that links up to the studio.

### Cited Findings
- Google generates the site name from the home page and from references elsewhere. `WebSite` markup (name, url required; alternateName optional and ordered by preference, with the lowercase domain as a final fallback) goes on the home page only. Google also uses og:site_name, `<title>` and headings. There is **one site name per domain or subdomain**, subdirectories are unsupported, and a subdomain without markup may fall back to the domain's name. Use the same name across title, markup and content. The Rich Results Test does not test site names. — [Google: Site names (updated 2025-12-10)](https://developers.google.com/search/docs/appearance/site-names)
- Sitelinks are automated and appear only when Google finds them useful. Google bases them on link structure. Helps: informative and compact titles/headings, logical structure, short relevant anchor text, no repeated content. The only owner control is removal (delete the page or noindex it). — [Google: Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks)

### Inferences (recommendations)
- **Studio = hub for "Bill The Dev", "billthedevstudio" and game names.**
  - WebSite name "Bill The Dev", alternateName ["Bill The Dev Studio", "billthedevstudio.com"].
  - Organization on the home page.
  - Keep the "· Bill The Dev" title suffix.
- **Portfolio = hub for the person.**
  - Change WebSite name and og:site_name to the person, for example "Bill Truong" or "Trương Ngọc Châu – Bill The Dev", so the two domains stop sharing one site name.
  - Lead the home title with the person's name ("Bill Truong · Unity Engineer…").
  - The person's queries ("Bill Truong Unity", "Trương Ngọc Châu") then land on the portfolio, and "Bill The Dev" lands on the studio, with the portfolio as a second result. Two owned results in one brand SERP is a good outcome.
- **Link graph:**
  - Portfolio → studio: in the nav or footer ("My studio: Bill The Dev"), in the Person `worksFor`/sameAs, from the arcade cards for studio games, and from Lab posts that mention the games.
  - Studio → portfolio: already there; keep it as "About the founder".
  - Game → studio: replace the `www.billthedev.com` link in the game footer with `billthedevstudio.com/games/slam-cards/`.
  - Studio → game: point directly at `play.billthedevstudio.com/slam-cards/`, not the io.vn redirect.
- **Avoid duplicate pages for the same game on both domains.** If the portfolio arcade lists studio games, give each a short card that links to the studio game page as the canonical description, not a second full page.
- The play subdomain is its own "site" for site-name purposes. Add WebSite markup there with name "Flip Flop Slam" or "Dép Lào Tuổi Thơ", or let it fall back to the domain name.

### Gaps
- I found no authoritative data on how Google treats a person-brand and a studio-brand that share a nickname across two domains. The recommendation above rests on the site-name and sitelinks docs plus entity-consistency practice.

## Structured data per page type and which rich results exist today

### Takeaway
Most of this markup helps entity understanding rather than producing visible rich results. Organization affects the logo and knowledge panel. WebSite drives the site name. Article/NewsArticle has no required properties and feeds article and Top-stories-style displays plus author understanding. BreadcrumbList shows breadcrumbs. The **software-app rich result requires a rating or review**, and a VideoGame-only type gets no rich result, so pre-launch game pages can't earn the app rich result honestly.

### Cited Findings
- Software app rich result: `SoftwareApplication`, `MobileApplication` or `WebApplication`. "Google doesn't show a rich result for Software Apps that only have the VideoGame type". Use `["VideoGame","MobileApplication"]`. Required: `name`, `offers.price` (0 for free), and **`aggregateRating` or `review`**. Recommended: `applicationCategory` "GameApplication", `operatingSystem`. — [Google: Software app (updated 2026-09-08)](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- In June 2025 Google retired seven structured-data features (Book Actions, Course Info, ClaimReview, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing). Ranking was not affected. In November 2025 it announced further phase-outs of lesser-used features without listing them. Unofficial reports name Practice Problems, among others. None of the types relevant here (Organization, Article, Breadcrumb, Software App, ProfilePage, VideoObject) was in the official June list. — [Google Search Central blog, 2025-06-12](https://developers.google.com/search/blog/2025/06/simplifying-search-results); [Google blog, 2025-11](https://developers.google.com/search/blog/2025/11/update-on-our-efforts)
- Organization: logo and knowledge-panel influence, no guaranteed feature. — [Organization doc](https://developers.google.com/search/docs/appearance/structured-data/organization)
- ProfilePage: the explicit feature is Discussions and Forums, and Article authors can point to it. — [ProfilePage doc](https://developers.google.com/search/docs/appearance/structured-data/profile-page)

### Inferences (recommendations per page)
| Page | Markup | Visible result realistically available |
|---|---|---|
| Studio home | `Organization` (@id, name, alternateName, url, logo ≥112px PNG on white, description, foundingDate 2026, address HCMC, email support@, founder → Person @id, sameAs studio profiles) + `WebSite` (name/alternateName) | Logo and site name in SERP; KP eligibility later |
| Studio /about/ (new) | `AboutPage` + Organization reference | Entity home |
| Game pages (Android, testing) | `VideoGame` + `MobileApplication`, name, description, image, operatingSystem Android, applicationCategory GameApplication, offers price 0, author/publisher → Org @id, `sameAs`/`installUrl` → Play URL once public, `trailer` VideoObject | **No app rich result until real ratings exist.** Never fake aggregateRating. Add the Play rating only once it is public and shown on the page. |
| Flip Flop Slam page | `VideoGame` + `WebApplication`, `url` → play.billthedevstudio.com/slam-cards/, `playMode` MultiPlayer, `numberOfPlayers` 2–4, `inLanguage` list | Same rating constraint |
| News posts | `NewsArticle` (exists): add publisher logo and @id, timezone on dates, dateModified, author @id + sameAs | Article display; author entity linking |
| All inner pages | `BreadcrumbList` (Home › Games › Meh Merge; Home › News › post). The UI already shows "Games / Flip Flop Slam". | Breadcrumb trail in the SERP URL line |
| Portfolio /about/ (new) | `ProfilePage` → Person (name Trương Ngọc Châu, alternateName Bill Truong / Bill The Dev, image, jobTitle, worksFor/affiliation → studio Org, sameAs person profiles, knowsAbout Unity…) | Entity home; feeds Article author linking |
| Portfolio home | Keep the Person with the same @id, add image and a studio link; add WebSite with the person-name site name | Site name |
| Lab articles | Article, with author → Person @id (exists, needs date fix) | Article display |
| Game page on play subdomain | `WebSite` + `VideoGame`/`WebApplication`, publisher → studio Org | Site name |

### Gaps
- Google's current docs don't list the exact visual elements of the software-app rich result, and I found no official statement that Google still shows it widely in 2026.

## Google Play listing interplay

### Takeaway
While the three puzzle games are in closed testing, they have no public Play listing to rank. During that phase the studio game pages are the only indexable pages for those game names, so they should be fully built out. Once the games go to production, the Play listing will very likely outrank or sit next to the studio page for the game's name. Link both ways and use consistent names and descriptions.

### Cited Findings
- Closed-test apps have no public listing and are not findable in Play search; testers join via the opt-in URL (`play.google.com/apps/testing/<package>`). Production access needs at least 12 testers opted in for 14 continuous days. — [Testers Community guide (third-party)](https://www.testerscommunity.com/blog/tester-cannot-find-my-app); [Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- Practitioner advice: link from your website to the store listing (footer or near social links). Backlinks to the listing and its long description are said to influence Play ranking. Keep keywords consistent between the site and the listing. Decide where searchers should land. — [Neil Patel: SEO & ASO for Google Play](https://neilpatel.com/blog/seo-aso-google-play-store/); [Practical Ecommerce: Optimizing Google Search options for Android apps](https://www.practicalecommerce.com/optimizing-google-search-options-android-apps)
- Measured: studio game pages show "COMING SOON TO Google Play / Email to join the test". They have no Play URL and no testing opt-in link. The package ids (`com.billthedev.mehmerge` etc.) appear only on /privacy/. — live fetch of [/games/meh-merge/](https://billthedevstudio.com/games/meh-merge/) and [/privacy/](https://billthedevstudio.com/privacy/)

### Inferences (recommendations)
- Now: make each game page the canonical, text-rich home for the game name. That means more than ~310 words, alt text on screenshots, a game-specific og:image, an FAQ, and the trailer embedded as VideoObject.
- At launch:
  - Add the official "Get it on Google Play" badge linking to `play.google.com/store/apps/details?id=…`, plus `sameAs`/`installUrl` in the markup.
  - Set the Play listing's website field to the **studio game page**, not the home page.
  - Make the Play developer page link to billthedevstudio.com.
  - Use the same game name and tagline in both places.
- Expect the brand SERP for a game name to show both the Play listing and the studio page. That is a desired outcome, not cannibalisation.

### Gaps
- No primary Google source quantifies how often Play listings outrank developer pages. The sources above are practitioner opinion.

## Static Next.js on GitHub Pages: limits and hreflang implementation

### Takeaway
Static export removes server-side redirects, headers, rewrites, middleware and i18n routing. GitHub Pages adds no way to set custom headers or arbitrary redirects. All SEO signals must therefore live in HTML: meta, canonical, hreflang, meta-refresh or JS redirects as a last resort, and a static 404.html.

### Cited Findings
- Static export does not support Redirects, Headers, Rewrites, Proxy/middleware, Cookies, ISR, default-loader Image Optimization, Server Actions, or dynamic routes without `generateStaticParams`. `trailingSlash: true` emits `/me/index.html` and changes links to `/me/`. The export generates `404.html`. — [Next.js: Static exports (updated 2026-08-09)](https://nextjs.org/docs/app/guides/static-exports)
- GitHub Pages supports a custom `404.html` at the site root. A 404 page should return a real 404 status so error pages aren't indexed. — [GitHub Docs: custom 404](https://help.github.com/articles/custom-404-pages); [draft.dev: GitHub Pages 404](https://draft.dev/learn/github-pages-404)
- hreflang: use HTML link tags, HTTP headers or sitemap (they are equivalent). Each version must list itself and all others, otherwise Google ignores the tags. Use fully qualified URLs, which may be cross-domain. `x-default` is recommended for language selectors and auto-redirecting pages. Use ISO 639-1 codes. — [Google: Localized versions (updated 2026-09-21)](https://developers.google.com/search/docs/specialty/international/localized-versions)
- Measured: the studio returns a real 404 for unknown URLs (5.9 KB custom page). It 301s non-slash directory URLs to the slash version and http→https. It sends `Cache-Control: max-age=600` and no HSTS. — curl

### Inferences (recommendations)
- **hreflang:** the studio implementation is correct (self-referencing, reciprocal, absolute). Add `x-default` → the EN URL on every page pair. Optionally mirror the alternates in the sitemap and add `<lastmod>` (generated at build time from content dates).
- **Trailing slashes:** keep `trailingSlash: true` everywhere, which it is now. Make every internal link, canonical, sitemap entry and external link (Play listing, social bios) use the slash form so no link needs the 301.
- **Redirects** (old io.vn URLs, renamed slugs): GitHub Pages can't 301 inside a site, so:
  - keep cross-domain 301s at the DNS/host level (io.vn already 301s through the VPS);
  - for in-site moves, emit a stub page with `<meta http-equiv="refresh" content="0;url=…">` and a canonical to the target.
  - Above all, update the source links, starting with the stale io.vn CTA.
- **Headers:** HSTS, CSP and long cache lifetimes for hashed `_next/static` assets are not settable on GitHub Pages. If they become important, put Cloudflare in front of the site (the user already has a Cloudflare account per project memory) or move to Cloudflare Pages, which supports a `_headers`/`_redirects` file. Search ranking doesn't depend on these headers.
- **Game subdomain:** add `robots.txt` and `sitemap.xml` (nginx on the VPS). Change the root 302 to a 301 if the redirect is permanent. Since the game is client-rendered with only 31 words of static text, add static noscript/intro text and a link up to the studio game page. Alternatively, accept that the studio's `/games/slam-cards/` page is the one meant to rank, and keep the play URL as the "Play" target. The game also ships 10 languages but has one URL, so it can't have hreflang. The studio EN/VI game pages handle language targeting instead.

### Gaps
- I did not verify whether the studio repo's GitHub Pages "Enforce HTTPS" setting is on. HTTP does 301 to HTTPS, but there is no HSTS header. The portfolio repo, on the same host, does send HSTS, so the difference may come from a setting or the apex vs www hostname. This is unconfirmed.

## Brand search and sitelinks for a small site

### Takeaway
Sitelinks can't be requested. They come from a clear hierarchy, compact distinctive titles and headings, and short descriptive internal anchors on a site that clearly ranks #1 for its own navigational query. For a new brand, that first requires winning "Bill The Dev" and "billthedevstudio", which means consistent naming, Organization/WebSite markup and external links.

### Cited Findings
- Sitelinks are automated and based on link structure. Use informative, compact titles and headings, short relevant anchors, and no duplicated content. The only control is removal via noindex or deletion. — [Google: Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks)
- Site name comes from WebSite markup, title, og:site_name and headings, with one per domain or subdomain. — [Google: Site names](https://developers.google.com/search/docs/appearance/site-names)
- Measured: the studio's top-level sections (Games, Services, Studio, News, Press) exist in the nav, but three of the five are hash anchors on the home page. Real crawlable section URLs are `/games/<slug>/`, `/news/`, `/press/`. There is no `/games/` index page (a link to `/#games` only). — live fetch

### Inferences (recommendations)
- Give each nav item a real URL with a distinct title: `/games/` (index), `/services/`, `/about/`, `/contact/`, `/news/`, `/press/`. Those are the natural sitelink candidates. Hash anchors can't become sitelinks.
- Keep nav anchors short and identical to page H1s ("Games", "Services", "About", "News", "Press kit").
- Remove duplicated or near-duplicate pages (the portfolio /arcade/ title clone). Put the Organization and WebSite markup on the home page. Earn a few external links that use the brand as anchor: the press kit for outreach, the YouTube and TikTok bios linking to billthedevstudio.com, the Play developer page.
- Track with Search Console: the brand-query impressions and position for "bill the dev", "billthedevstudio" and each game name. Verify both domains and the play subdomain as separate properties, or use a Domain property for billthedevstudio.com covering apex and play. A Search Console property is also one of the knowledge-panel verification routes.

### Gaps
- I couldn't observe Google's live SERP for "Bill The Dev" from this environment. Whether sitelinks or a site name already show is unknown and should be checked manually in Search Console and Google.
