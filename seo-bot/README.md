# AORBO SEO bot

Keeps an eye on aorbotreks.com in search and reports to Telegram (@Aorboswaggerbot).
Design and playbook: `Desktop\AORBO_SEO_BOT_DESIGN.md`, `Desktop\AORBO_SEO_PLAYBOOK.md`.

## What runs (n8n on 162.19.81.122, times IST)

| Workflow | When | Script | Telegram |
| --- | --- | --- | --- |
| Site health check | 06:00 daily | `bot/health_guard.py` | Silent ✅ line, or a 🚨 alert listing broken pages |
| Site health check (quick) | every 6 h at :30 | `bot/health_guard.py --quiet` | Only when something broke |
| Google Search daily pull | 09:00 daily | `bot/gsc_pull.py` | Clicks, impressions, position moves, indexing of key pages |
| Rebuild site when treks or blogs change | every 3 h at :15 | `bot/content_sync.py` → `bot/sitedeploy.py` | Quiet 🚀 line per rebuild; loud if it failed or rolled back |
| Improve pages + judge earlier changes | 10:00 daily | `bot/optimizer.py` | ✏️ new titles / ❓ FAQs with the reason; ↩️ rollbacks; ⏸ frozen during Google updates |
| Website reachable? | every 5 min | `bot/uptime.py` | 🔴 down after 2 failed checks (says whether our server or AIC's entry point is at fault), 🟢 back + how long |
| Trek data check | Monday 08:00 | `bot/data_quality.py` | 🧹 treks with wrong state (vs map position), lowercase names, collisions, missing data |
| Competitor radar | Sunday 07:00 | `bot/radar.py` | 📡 our Google positions, 📉 drops with the cause + fix or team to-do, 🛡 top-3 defence, 🔥 #1 streaks, 👑 who rules |
| Alert when a bot workflow fails | on any crash | `bot/notify.py` | ⚠️ which workflow failed and why |

The scripts send their own alerts; n8n schedules them and catches crashes.

## How the optimizer decides (playbook: Desktop\AORBO_SEO_PLAYBOOK.md)

- **CTR fix:** a page seen in Google (30+ impressions in 28 days, position <= 15) but clicked under 60% of the
  usual rate for its position gets a new title + description.
- **FAQs:** position 4-20 for 3+ searches and no FAQs yet: 3-5 FAQs answering those searches.
- Text comes from Gemini (`bot/ai.py`) using **only our data**; every result is checked (lengths, every number
  must exist in our data, no "best / No.1 / certified / 24/7 / guaranteed / seat") and retried with the
  reasons, else not published. Max 5 edits a day, 21-day cooldown per page, never touches pages the team
  edited, skips treks flagged by the data check, frozen while Google rolls out a ranking update.
- After 21 days (+3 for Search Console's delay) each change is judged: kept, or **rolled back** if CTR or
  position got worse.
- Test without publishing: `optimizer.py --dry-run --page /treks/<id> --kind ctr|faq`

## How the radar works

- SerpApi free plan: 250 Google searches a month. Each Sunday run uses up to 48 and always keeps 10 spare.
- Every week: "aorbo treks", "treks near me" from Hyderabad, Bengaluru, Chennai, Pune, Mumbai, Delhi plus
  2 tier-2 towns in rotation (Google answers "near me" from the searcher's location), 4 generic searches.
  The rest goes to trek names: the 10 with most Search Console impressions every week, the others in rotation.
- Searches are Google India, mobile, English. Each result keeps the top 10, map pack, AI overview and
  "People also ask" questions (table `serp`; the full results are trimmed after a year).
- A search we lost (down 2+ places, out of the top 10, or passed by a new site) is diagnosed: rules first
  (Google update, our page broken, our own recent change), then Gemini compares both results
  (table `radar_diagnoses`). Fixes for trek/blog pages go to `radar_queue` in state.json; the optimizer
  applies them next morning under its usual limits. Home and listing pages are only reported.
- Top-3 searches whose page has no FAQs get FAQs answering "People also ask" (max 2 a week).
- Small test: `radar.py --max 3` (uses 3 searches).

## "Treks near <city>" pages (/treks-near/<town>)

- Built by the website build (`aorbo-frontend/scripts/near-pages.mjs`) from the trek list, the trek map
  positions and GeoNames' India towns (`scripts/data/india-places.json`, 6,475 towns of 5,000+ people).
- A town gets a page only with real, distinct content (Google penalises near-identical "near X" pages):
  3+ treks within a radius that grows 150 → 250 → 400 → 600 km (max 250 km for towns under 100k
  people, 400 km under 1M); a town whose treks are mostly already on a bigger town's page within
  60 km gets none (suburbs). Currently 328 towns qualify.
- Released in weekly waves, biggest towns first: 150 from 15 Oct 2026, +100 a week. `content_sync.py`
  includes the week number in its fingerprint, so the weekly rebuild happens on its own.
- Trek positions: `bot/trek_geo.py`. Gemini says what to put on the map (trailhead, first stop, or
  "region" = left out), OpenStreetMap finds it, accepted only in the right state, as a real place and
  within 80 km of Gemini's own estimate. The admin's coordinates were often wrong (three Andhra treks
  shared one default point), so they are used only when they agree; wrong ones are listed in the
  Monday data report. Positions go to the web server with the SSH command `geo` (`ops/site/put_data.py`
  -> `/opt/aorbo-site/data/trek-geo.json`, read by the build via `TREK_GEO_FILE`). The trek data
  itself is never changed.
- Every page is full HTML at build time (the app's own components), with CollectionPage + ItemList +
  breadcrumb + FAQPage data; the FAQs are computed from the data and shown on the page. The optimizer
  never adds FAQs there.

## Destination pages (/destinations/<place>, /destinations/<state>)

- People search the place, not the package ("coorg trip", "gokarna", "manali trek package").
  `bot/destinations.py`: Gemini lists the destinations each package visits (searched spelling: Coorg, not
  Kodagu), merges spellings, filters the admin's famous places to those really at the destination (some
  were copy-pasted from other packages) and positions each place like the treks. Answers are remembered
  (state `dest_pkg_cache`, `dest_canonical`), so a page's address never changes once decided.
- A destination gets a page with 2+ packages (with one, the package page already is that page); every
  state with 3+ packages gets a state page. Now: 58 places + 10 states.
- Sent with the SSH command `destinations` (`put_data.py` -> `/opt/aorbo-site/data/destinations.json`,
  `DESTINATIONS_FILE`); built by `aorbo-frontend/scripts/destination-pages.mjs`: packages, durations,
  prices, departure days, places, distance from the nearest metros (linked to city pages), FAQs from the
  data, more destinations in the state. `content_sync.py` refreshes destinations whenever packages change.

## 45-day plan (15 Oct -> 29 Nov 2026): `bot/goals.py`, every day 07:30

| Target (by 29 Nov) | Day 7 | Day 14 | Day 30 | Day 45 |
|---|---|---|---|---|
| Pages indexed by Google | 20 | 80 | 200 | 300 |
| Times shown in Google (28 days) | 50 | 300 | 1,500 | 3,000 |
| Clicks from Google (28 days) | 2 | 10 | 50 | 100 |
| Tracked searches in Google's top 10 | 2 | 4 | 12 | 25 |
| Tracked searches in Google's top 3 | 1 | 2 | 5 | 10 |
| Links to us from other sites (Bing count) | 5 | 15 | 35 | 60 |

The bot checks every sitemap page with the URL Inspection API (table `page_index`), measures each target
against today's value on a straight line between milestones (table `goals_daily`), and sends the 10 most
important unindexed pages (destinations, treks, then towns) to request in Search Console. Mondays add the
team's tasks for the week (organiser links, listings, YouTube Shorts, Quora/Reddit, press).

## Locks against wrong trek data

1. **Entry** (`aorboweb/treks_app/trek_rules.py`, used by the trek admin form and "Publish draft"):
   durations must be days-first and sensible (`3D/2N`; refuses `D/2N`, `6D/5D`, `6N/7D`, `3D/4N`), states
   must be official names (tidied: `karnataka` -> `Karnataka`), departure days real weekdays (`Thu, Fri, Sat`),
   names not all-lowercase and not another trek's name, positions inside India/Nepal and not another trek's,
   descriptions 40+ characters and not (almost) another trek's. Tests: `manage.py test treks_app.test_trek_rules`.
   The model no longer fills in the state's centre as a trek's position; new ids can't differ only in capitals.
2. **Weekly** (`bot/data_quality.py`, Mondays): Gemini lists suspicious places / activities / description lines,
   then says only WHERE each thing and each stop of the trip is; the bot computes the distance and reports items
   300+ km from every stop (copy-paste errors found were 1,000-2,500 km off; stops on the way are 50-250 km).
   Only treks changed since their last check are re-checked (state `content_audit`). Flagged treks are skipped
   by the optimizer until fixed. Also reported: wrong admin positions, treks without real organiser names.
3. **Rebuild**: `content_sync.py` watches every trek detail (description, activities, places, organisers,
   departure days, photo, position), so a fix in the admin reaches the site within 3 hours.

## Deploys (web server 37.187.139.100)

`ops/site/` in this repo is installed at `/opt/aorbo-site` on the web server: `deploy.sh` builds
`/opt/aorbo-site/src` (a copy of `aorbo-frontend`), runs `gate.py` (refuses an incomplete build),
swaps it live, runs `post_check.py` through nginx and **rolls back** if that fails, then pings
IndexNow for changed pages. Logs: `/opt/aorbo-site/logs` (30 days).

The bot's SSH key (`/var/lib/n8n/secrets/web-deploy-key`) is locked on the web server to
`bot-entry.sh`: it can only run `deploy`, `last-deploy` and `status`.

When frontend **code** changes, refresh the source copy on the web server (data changes need nothing):
`tar --exclude=node_modules --exclude=dist -czf /tmp/src.tar.gz -C aorbo-frontend .`, copy it over,
unpack into `/opt/aorbo-site/src` (keep its `node_modules`), then `/opt/aorbo-site/deploy.sh`.

## Where things live on the server

- Code: `/opt/aorbo-bot` (copy of this folder) + Python venv `/opt/aorbo-bot/venv`
- Data: `/var/lib/n8n/seo-bot/seo.db` (SQLite: search data, index status, health runs, bot changes)
- Secrets (n8n user only, never in git): `/var/lib/n8n/secrets/`
  - `google-seo-bot.json`: service account `seo-bot@aorbo-seo-bot.iam.gserviceaccount.com` (owner in Search Console)
  - `bing-webmaster-api-key`, `telegram-bot-token`, `telegram-chat-id`
  - `seo-api-token`: writes page overrides (same value as `SEO_BOT_TOKEN` in the web server's `/opt/aorboweb/.env`)
  - `web-deploy-key`: SSH key locked to `ops/site/bot-entry.sh` on the web server
  - `gemini-api-key`: Gemini API (free tier), project `aorbo-seo-bot`, key restricted to the Gemini API. `bot/ai.py` tries `gemini-flash-latest`, then `gemini-flash-lite-latest` when busy.
  - `serpapi-api-key`: SerpApi free plan (250 searches/month), account abhishek.aorbotreks@gmail.com.

## Change and redeploy

```bash
# on your PC, from the repo root
python seo-bot/n8n/build_workflows.py            # only if workflows changed
tar -czf /tmp/seo-bot.tar.gz seo-bot
scp -P 20135 /tmp/seo-bot.tar.gz root@162.19.81.122:/tmp/
# on the server
tar --no-same-owner -xzf /tmp/seo-bot.tar.gz -C /tmp && cp -r /tmp/seo-bot/bot /tmp/seo-bot/n8n /opt/aorbo-bot/
# workflows changed? stop n8n, re-import, publish, start:
systemctl stop n8n
E="env HOME=/var/lib/n8n N8N_USER_FOLDER=/var/lib/n8n NODES_EXCLUDE=[]"
cd /var/lib/n8n && runuser -u n8n -- $E /opt/n8n/bin/n8n import:workflow --input=/opt/aorbo-bot/n8n/health.json
runuser -u n8n -- $E /opt/n8n/bin/n8n publish:workflow --id=aorboSeoHealth01
systemctl start n8n
```

Run a script by hand (as n8n, so it can read the secrets):
`cd /opt/aorbo-bot/bot && runuser -u n8n -- /opt/aorbo-bot/venv/bin/python health_guard.py`

`n8n execute --id=...` can't run these workflows (they start from a schedule, not a manual trigger).
Use the editor instead: `ssh -p 20135 -L 5678:127.0.0.1:5678 root@162.19.81.122`, then http://localhost:5678.
