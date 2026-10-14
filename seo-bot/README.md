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
| Trek data check | Monday 08:00 | `bot/data_quality.py` | 🧹 treks with wrong state (vs map position), lowercase names, collisions, missing data |
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
