# Measuring search performance: Google Search Console, its API, Bing Webmaster Tools and Cốc Cốc, piped into the "Lucy" dashboard

Research date: 2026-10-22. Sites: billthedevstudio.com (GitHub Pages), play.billthedevstudio.com/slam-cards/ (VPS), www.billthedev.com (portfolio). Google account truongbill003@gmail.com, GCP project `dep-lao-tuoi-tho`.

## Q1. Property types: is a domain property via DNS TXT better than URL-prefix properties, and how many are needed?

### Takeaway
Create one **Domain property** `billthedevstudio.com`, verified with a TXT record at PA Vietnam. It covers the root (GitHub Pages), `www.` and `play.` on every protocol and path. **billthedev.com is a separate domain and needs its own property**, ideally another Domain property verified by DNS wherever that domain's DNS is hosted. It is also worth adding a URL-prefix property `https://play.billthedevstudio.com/slam-cards/` so the game gets its own view and its own row budget (see Q2).

### Cited Findings
- A Domain property includes "all subdomains (m, www, and so on) and multiple protocols (http, https, ftp)", plus all subpaths. It requires DNS record verification (unless the site is on a Google product such as Blogger). Do not enter `www`, a protocol or a path when defining it. — [Google Search Console Help: Add a website property](https://support.google.com/webmasters/answer/34592)
- "A property for example.com doesn't cover example.org." In other words, a different registrable domain needs its own property. — [Search Console Help](https://support.google.com/webmasters/answer/34592)
- A URL-prefix property "Includes only URLs with the specified prefix, including the protocol (http/https)". It must be entered with the trailing "/". It supports many verification methods: HTML file, meta tag, GA, GTM, DNS. — [Search Console Help](https://support.google.com/webmasters/answer/34592)
- In the API, a Domain property is addressed as `sc-domain:example.com`, and a URL-prefix property as `https://www.example.com/` with the trailing slash. — [URL Inspection API reference](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)

### Inferences
- Console steps (current UI): Search Console → property dropdown → **Add property** → **Domain** → type `billthedevstudio.com` → copy the `google-site-verification=…` string → at PA Vietnam add a **TXT** record with host `@` and that value → back in GSC click **Verify**. DNS may take minutes to hours to propagate. Leave the TXT record in place, because Google re-checks it periodically. (The exact UI labels come from the standard flow. The help page only says "DNS record verification" and does not name the record type.)
- After verifying the Domain property, adding the URL-prefix `https://play.billthedevstudio.com/slam-cards/` is usually auto-verified for the same owner, because the Domain owner is also the owner of every child. This is common practice, but I did not find an official source confirming it.
- For billthedev.com: if its DNS is not at PA Vietnam, add the TXT at whichever provider hosts it. If DNS cannot be touched, fall back to a URL-prefix property `https://www.billthedev.com/` verified with an HTML file or meta tag.

### Gaps
- The help page used here does not explicitly say the DNS record is a TXT record (the content I fetched only says "DNS record verification"). The TXT method (and CNAME as an alternative) is the familiar UI, but I did not get a direct quote.

## Q2. What the data shows and hides: anonymised queries, delay, 16-month retention, row limits

### Takeaway
GSC hides "rare" queries (anonymised) from the table and API, though they are still counted in the chart totals. The API returns at most about **50,000 rows per day, per property, per search type**, sorted by clicks. Data is kept for **16 months**. Finalised data arrives after about 2 days, with partial "fresh" data available within hours. For a tiny site, expect the query-level sum to be well below the total.

### Cited Findings
- Anonymised queries are ones not issued by more than a few dozen users over a period of 2-3 months. They are left out of table rows and out of the API, but they **are** included in chart totals (unless you filter by query), so the table sum is usually lower than the chart. — [Google Search Central Blog, Oct 2022: Performance data deep dive](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive) (via search summary; I could not fetch the body directly)
- The Search Analytics API (and the Looker Studio connector) is capped at **50,000 rows per day per site per search type**, and the cap "may not be reached in all cases". The UI export is 1,000 rows. — [Google Search Central Blog 2022](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive) (via search summary)
- "The newest data can be preliminary, meaning it's still being collected and might change in the next few hours." — [Search Console Help: Performance report](https://support.google.com/webmasters/answer/7576553)
- Aggregation: queries, countries, devices and dates are aggregated **by property**, while page and search appearance are aggregated **by page**, so totals differ between views. Average position is the position of the site's topmost result. — [Search Console Help](https://support.google.com/webmasters/answer/7576553)
- In exports, "~" or "-" values become 0. — [Search Console Help](https://support.google.com/webmasters/answer/7576553)
- Search Console keeps 16 months of data. Data appears about 48 hours after collection (per Google's GA4 integration docs). — [Google Analytics Help](https://support.google.com/analytics/answer/13682862) (via search summary)
- Third-party guides say finalised data takes about 2-3 days to settle. — [Windsor.ai guide](https://windsor.ai/guide-to-google-search-console-api/); fresh data is often partial — [Inchoo](https://inchoo.net/data-analytics/accurate-fresh-data-search-console-reports/)

### Inferences
- Because the cap is per property, creating an extra URL-prefix property for `/slam-cards/` gives the game its own 50k rows per day. At the studio's current scale the cap will not be hit, but this costs nothing to do.
- The daily job should pull **D-3** (fully final) and re-pull the last 3-4 days to overwrite preliminary numbers.
- Retention: the API only goes back 16 months, so keeping the data long-term requires Lucy to store it in its own DB from day one.

### Gaps
- I could not fetch the body of the 2022 blog post to quote it directly (the page is too long and returned only the archive). The 50k and anonymisation figures come from the search summary and match common knowledge.
- I found no official source for the exact delay in hours; "~2 days" comes from GA Help and third-party sources.

## Q3. Sitemaps, URL Inspection and the Indexing API

### Takeaway
Submit a sitemap for each property: in the UI under **Indexing → Sitemaps**, or through the API with `sitemaps.submit`. Use URL Inspection (UI or API) to check index status. **The Indexing API cannot be used** for the game or the studio site, because it only accepts JobPosting and BroadcastEvent (livestream) pages.

### Cited Findings
- "The Indexing API can only be used to crawl pages with either JobPosting or BroadcastEvent embedded in a VideoObject." — [Indexing API quickstart](https://developers.google.com/search/apis/indexing-api/v3/quickstart)
- The Search Console API has a `sitemaps.submit` method for submitting sitemaps programmatically. — [Sitemaps: submit](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
- The URL Inspection API is `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`. Body: `inspectionUrl` (required, must be inside the property), `siteUrl` (required, `sc-domain:` or a prefix ending in `/`), `languageCode` (optional, default en-US). Scope `webmasters` or `webmasters.readonly`. It reports **only the indexed version**; you **cannot test a live URL** through the API. — [urlInspection.index.inspect](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
- URL Inspection quota: **2,000 QPD and 600 QPM per site**; 10,000,000 QPD and 15,000 QPM per project. — [Usage limits](https://developers.google.com/webmaster-tools/limits)

### Inferences
- The repo already has uncommitted `proto/public/robots.txt` and `sitemap.xml` (git status). The sitemap URL for the game must be under `play.billthedevstudio.com`, and robots.txt should include a `Sitemap:` line.
- 2,000 inspections per day per site is far more than these sites need. Lucy could inspect every URL in the sitemap once a day and alert on Telegram if any URL's verdict changes away from PASS.
- "Request indexing" (the button in the UI) has no public API. Do it by hand in the UI.

### Gaps
- I did not fetch the `UrlInspectionResult` schema (fields such as verdict, coverageState, lastCrawlTime, googleCanonical). They appear in the reference, but I did not verify them in this session.

## Q4. Search Console API: searchanalytics.query, quotas, service account auth, key handling, Node code, BigQuery

### Takeaway
Use `searchanalytics.query` with `dimensions` = `date, query, page, country, device`, `rowLimit` 25000 and pagination by `startRow`, `dataState: "final"` for the stored numbers (or `"all"` to include fresh data), and the `webmasters.readonly` scope. Authenticate with a service account that is added as a **Restricted** user on each property. On a non-GCP VPS, a JSON key is acceptable if it is protected properly (Google explicitly discourages putting it in Secret Manager). The BigQuery bulk export does **not** include anonymised queries, has no backfill, and needs billing turned on, so it is unnecessary at this scale.

### Cited Findings: searchanalytics.query
- Endpoint: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`. Body fields: `startDate`/`endDate` (YYYY-MM-DD, **Pacific time**, inclusive); `dimensions[]` = `country`, `device`, `page`, `query`, `searchAppearance`, `date`, `hour`; `type` = `web` (default) | `image` | `video` | `news` | `discover` | `googleNews`; `dimensionFilterGroups[].filters[]` with `operator` `equals|contains|notContains|notEquals|includingRegex|excludingRegex` (RE2); `aggregationType` `auto|byPage|byProperty|byNewsShowcasePanel`; **`rowLimit` 1-25,000 (default 1,000)**; `startRow` zero-based (past the end returns 0 rows); **`dataState` = `final` (default) | `all` (includes fresh) | `hourly_all`** (with the `hour` dimension). — [searchanalytics.query reference](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- Country uses ISO 3166-1 alpha-3 (for example `vnm`). Device is DESKTOP/MOBILE/TABLET. — [same](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- Response: `rows[].keys[]`, `clicks`, `impressions`, `ctr` (0-1), `position`; plus `metadata.first_incomplete_date` when `dataState=all` and grouped by date. Sorted by clicks descending (by date ascending if grouped by date). "Does not guarantee all rows", only the top rows. If you group or filter by page, `byProperty` aggregation is not allowed. — [same](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- Quotas: **1,200 QPM per site, 1,200 QPM per user, 40,000 QPM and 30,000,000 QPD per project**. There is also a "load quota" in 10-minute and 1-day windows. Grouping or filtering by page + query is the most expensive, and long date ranges increase load. If you exceed the short-term quota, wait 15 minutes. — [Usage limits](https://developers.google.com/webmaster-tools/limits)

### Cited Findings: authentication and service accounts
- Scopes: `https://www.googleapis.com/auth/webmasters` (read/write) and `…/webmasters.readonly`. You must enable the Search Console API in the API Console. — [Authorizing requests](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing)
- Permissions in GSC: Owner / Full / Restricted. Restricted "Has simple view rights on most data" and can see Performance. To add someone: **Settings → Users and permissions → Add user** → enter the email → choose a level. Up to 100 non-owner users per property. Email groups are not allowed. — [Manage users & permissions](https://support.google.com/webmasters/answer/7687615)
- Third-party guides: add the `client_email` from the JSON as a Restricted user; Restricted is enough for read-only search analytics. — [ZappySys](https://zappysys.com/api/integration-hub/google-search-console-connector/help/authentication/ServiceAccount), [Bruin ingestr docs](https://getbruin.com/docs/ingestr/supported-sources/google_search_console.html) (third-party; the official GSC page does not mention the API)

### Cited Findings: key handling
- Google recommends avoiding user-managed keys when there is a more secure option (an attached service account on GCP, or Workload Identity Federation). Keys are acceptable "where no more secure option exists". — [GCP IAM: best practices for managing SA keys](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- "Don't submit service account keys to source code repositories"; enable secret scanning; if a key leaks, delete it in IAM, not just from git. "Whenever possible, avoid storing service account keys on a file system"; if you must, restrict access, audit it and encrypt the disk. — [same](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- "We don't recommend using Google Cloud's Secret Manager to store and rotate service account keys." Rotate keys periodically. Keys **do not expire by default**, and Google advises against setting an expiry on production keys (it can cause outages). — [same](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- The org policy constraints "Disable service account key creation/upload" are enforced by default for organisations created on or after **3 May 2024**. — [same](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)

### Cited Findings: BigQuery bulk export
- Setup: a GCP project **with billing**; enable the BigQuery API and the BigQuery Storage API; in IAM, grant `search-console-data-export@system.gserviceaccount.com` the roles **BigQuery Job User** and **BigQuery Data Editor**; in GSC go to **Settings → Bulk data export**, enter the project ID (not the number), a dataset name (must start with `searchconsole`) and a location (hard to change later). The first export arrives within 48 hours. **No backfill.** Data accumulates indefinitely unless you set partition expiration (minimum 14 days). Storage and queries are billed by GCP, with a free tier. — [Start a new bulk data export](https://support.google.com/webmasters/answer/12917675)
- The export contains all performance data "with the exception of anonymized queries". — [Bulk data export overview](https://support.google.com/webmasters/answer/12918484)

### Inferences
- **Auth recommendation for Lucy (a non-GCP VPS):** Workload Identity Federation needs an external identity provider (AWS/Azure/OIDC/SAML) that issues tokens for the VPS. A self-managed VPS has none, so WIF is not practical here. A JSON key is the pragmatic choice. Before creating one, check whether `dep-lao-tuoi-tho` belongs to an organisation created after May 2024 (a personal gmail project usually has no org, so the constraint does not apply). An alternative without a SA key is OAuth "installed app" with a refresh token from truongbill003, but the OAuth client is in Testing mode (see memory), so refresh tokens expire after 7 days. That route is a poor fit for a cron job.
- **Steps:** (1) GCP console → project `dep-lao-tuoi-tho` → APIs & Services → Library → enable **Google Search Console API**. (2) IAM & Admin → Service Accounts → Create, for example `lucy-gsc@dep-lao-tuoi-tho.iam.gserviceaccount.com`, **with no IAM roles** (GSC access is granted inside GSC, not through GCP IAM). (3) Keys → Add key → JSON, or `gcloud iam service-accounts keys create /etc/lucy/gsc-sa.json --iam-account=…`, which writes straight to the destination with tight permissions. (4) For each GSC property → Settings → Users and permissions → Add user → SA email → **Restricted**.
- **Storing the key on the VPS:** keep it outside the repo and outside the pm2 app directory, for example `/etc/lucy/gsc-sa.json`, `chown lucy:lucy`, `chmod 600`. Pass `GOOGLE_APPLICATION_CREDENTIALS` through the pm2 ecosystem env, add the filename to `.gitignore`, and rotate it every 90-180 days (create the new key, deploy it, delete the old key in IAM). Even if the key leaks, the damage is limited to reading GSC data, because the SA has no GCP roles and is Restricted in GSC.
- **Minimal Node example** (`npm i googleapis`; based on the API reference, not run in this session):

```js
// lucy/jobs/gsc-daily.js — pm2 cron_restart "15 3 * * *" (VN time ~ after the PT day ends)
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const sc = google.searchconsole({ version: 'v1', auth });
const SITES = ['sc-domain:billthedevstudio.com', 'sc-domain:billthedev.com'];
const ymd = d => d.toISOString().slice(0, 10);

async function pull(siteUrl, date) {
  const rows = [];
  for (let startRow = 0; ; startRow += 25000) {
    const { data } = await sc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: date, endDate: date, type: 'web', dataState: 'final',
        dimensions: ['query', 'page', 'country', 'device'],
        rowLimit: 25000, startRow,
      },
    });
    rows.push(...(data.rows || []));
    if (!data.rows || data.rows.length < 25000) break;
  }
  // also pull totals without the query dimension (includes anonymised queries):
  const { data: tot } = await sc.searchanalytics.query({
    siteUrl, requestBody: { startDate: date, endDate: date, dimensions: ['page', 'country', 'device'], rowLimit: 25000 },
  });
  return { rows, totals: tot.rows || [] };
}

(async () => {
  for (let back = 3; back <= 5; back++) {          // re-pull D-3..D-5, upsert by (site,date,keys)
    const date = ymd(new Date(Date.now() - back * 864e5));
    for (const s of SITES) { const r = await pull(s, date); /* upsert into Lucy DB */ }
  }
})();
```

- In code, `google.searchconsole('v1')` exposes `searchanalytics`, `sites`, `sitemaps` and `urlInspection.index` (the webmasters v3 endpoint is the same API). The Lucy DB should store (site, date, query, page, country, device, clicks, impressions, position). Recompute CTR as `sum(clicks)/sum(impressions)` and position as an impression-weighted average; **never average CTR or position directly** across rows.
- For page or country totals, run a **separate request without `query`** so the totals include anonymised queries. Otherwise the numbers come out low.
- **BigQuery:** at this scale it would almost certainly stay in the free tier (10 GiB storage and 1 TiB of queries per month, from general knowledge, not verified on the pricing page). But it requires billing, has no backfill, does not include anonymised queries either, and adds a second datastore. Not worth it while the API meets the need.

### Gaps
- I could not fetch exact BigQuery prices from cloud.google.com/bigquery/pricing (the page was truncated). The free-tier figures above are background knowledge.
- No official Google page states that a "Restricted" service account may call the API; the claim comes from third-party sources (it is widely practiced).
- I did not verify the current googleapis npm package version.

## Q5. Bing Webmaster Tools, IndexNow, Cốc Cốc: worth it for Vietnam?

### Takeaway
In Vietnam, Google has about 95.6% of search, Cốc Cốc 3.6% (6.1% on desktop) and Bing 0.44% (June 2026). Bing Webmaster Tools takes about 5 minutes (import from GSC) and the game can ping IndexNow for free, so do it, but **do not** build an API pipeline for Bing. Cốc Cốc has its own documentation section for site owners (URL submission, sitemaps, robots), but I found no evidence that it offers a performance dashboard or API.

### Cited Findings
- Statcounter, Vietnam, June 2026, all platforms: leader (Google) 95.59%, Cốc Cốc 3.62%, Bing 0.44%, Yahoo 0.27%. Desktop/tablet/console: Cốc Cốc 6.09%, Bing 1.59%. — [Statcounter Vietnam](https://gs.statcounter.com/search-engine-market-share/all/viet-nam) (via search summary)
- Importing from GSC: Bing WMT → Add site → **Import from Google Search Console** → sign in to Google and allow access → pick sites → Import. Imported sites are **verified automatically**. Up to 100 sites per import, 1,000 sites per account. Bing periodically re-syncs ownership with GSC, so if access is revoked you must re-verify. Data can take up to 48 hours to appear. — [Bing Webmaster Blog, Sep 2019](https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools); [Search Engine Land](https://searchengineland.com/bing-webmaster-tools-allows-site-verification-via-google-search-console-321197)
- Bing WMT API: OAuth 2.0 (recommended) or an API key. Get the key at **Settings → API Access → Generate API Key**. There is one key per user and it works for every verified site. To rotate, delete the key and generate a new one. — [Microsoft Learn: Getting access](https://learn.microsoft.com/en-us/bingwebmaster/getting-access)
- `GetQueryStats`/`GetPageStats` take only `siteUrl`, have no date or row parameters, and return data in **weekly** buckets. JSON endpoint `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=…&apikey=…`. — [Analytics Edge notes](https://bing-webmaster-api.analyticsedge.com/getquerystats/) (third-party, not Microsoft documentation)
- IndexNow: the key is 8-128 characters (letters, digits, hyphens). The file `/{key}.txt` contains the key and lives at the host root. POST to `https://api.indexnow.org/indexnow` with JSON `{host, key, urlList}`, or GET `?url=…&key=…`. **At most 10,000 URLs per request**. A 200 or 202 response means accepted. A submission to one endpoint is shared with every participant: Amazon, Bing, Naver, Seznam, Yandex, Yep. — [IndexNow FAQ](https://www.indexnow.org/faq)
- The IndexNow FAQ does not list Google. — [IndexNow FAQ](https://www.indexnow.org/faq)
- Cốc Cốc has a documentation section for site owners (redirected from help.coccoc.com to `coccoc.com/search/console/en`): "Submit individual URLs directly to Cốc Cốc Search's index", "Submit sitemap to Cốc Cốc Search", robots.txt, Cốc Cốc Robots, noindex, favicon, and removing a site. — [Cốc Cốc Search console docs](https://coccoc.com/search/console/en)

### Inferences
- Bing: import both domains from GSC (they are verified instantly) to get a second data source and crawl alerts. At 0.44% share, the weekly-only Bing API is not worth wiring into Lucy; a quick look at the UI once a month is enough.
- IndexNow: add a step to `deploy.sh` that POSTs the changed URLs from the sitemap. It costs almost nothing and helps Bing/Yandex/Naver (useful if the game targets Korea through Naver). Put the key file in `proto/public/` for the play subdomain. GitHub Pages also serves the key file if it sits in the repo root.
- Cốc Cốc: given its ~6% desktop share, submitting the sitemap and the main URLs once is worthwhile. Make sure robots.txt does not block coccocbot. No dashboard to integrate.

### Gaps
- Microsoft's official per-method documentation for `GetQueryStats` and the Bing API quotas was not fetched; those details come from third-party sources.
- The Cốc Cốc pages on verification, the sitemap procedure and any search statistics could not be read ("Get your website on Cốc Cốc" returned 404 at the URL I guessed). I do not know whether Cốc Cốc requires an account or verification.

## Q6. Weekly KPIs for a tiny studio, and reading early data when impressions are small

### Takeaway
Weekly (Mon-Sun, Pacific time), per site: total impressions and clicks (from the request without `query`), branded vs non-branded split, number of indexed pages (from URL Inspection or the Page indexing report), number of queries and pages with ≥1 impression, and position for 5-10 target queries. With small samples, read **trends over 28 days** and count queries rather than CTR or position.

### Cited Findings
- Position is the average of the site's topmost position, per URL or grouping; query and country data are aggregated by property and page data by page, so totals differ. — [Search Console Help](https://support.google.com/webmasters/answer/7576553)
- Anonymised queries are dropped from rows but kept in chart totals, so the query-level sum is lower than the total. — [Search Central Blog 2022](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive)

### Inferences (my own analysis; no source covers small-studio KPIs specifically)
- **Weekly Telegram digest from Lucy:** (1) impressions and clicks WoW plus a 4-week rolling sum; (2) branded share, using regex `includingRegex` on `slam|billthedev|bill the dev`; (3) the count of distinct non-branded queries with impressions (a sign that coverage is growing); (4) top 10 queries and top pages by impressions; (5) mobile vs desktop and the VN vs other split (country `vnm`); (6) URL Inspection verdicts for every URL in the sitemap; (7) alerts on new 404s or "not indexed" pages.
- **Small data:** with fewer than ~100 impressions per query per week, CTR and position swing wildly. Report them only for queries above a threshold (for example ≥50 impressions in 28 days), and always use impression-weighted averages. In the first 4-8 weeks, the main signals are "number of pages indexed" and "number of distinct queries". Clicks will be close to 0, and that is normal.
- A gap between the total and the sum by query is the share of anonymised queries. With small data it can exceed 50%, and that is not a bug.
- Compare by the same weekday or by whole weeks, because data is in Pacific time while the team works in VN time (UTC+7): a "day" in GSC runs from 14:00 VN that day to 14:00 the next.

### Gaps
- I found no authoritative benchmark CTR by position for Vietnam or for browser games.
