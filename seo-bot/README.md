# AORBO SEO bot

Keeps an eye on aorbotreks.com in search and reports to Telegram (@Aorboswaggerbot).
Design and playbook: `Desktop\AORBO_SEO_BOT_DESIGN.md`, `Desktop\AORBO_SEO_PLAYBOOK.md`.

## What runs (n8n on 162.19.81.122, times IST)

| Workflow | When | Script | Telegram |
| --- | --- | --- | --- |
| Site health check | 06:00 daily | `bot/health_guard.py` | Silent ✅ line, or a 🚨 alert listing broken pages |
| Site health check (quick) | every 6 h at :30 | `bot/health_guard.py --quiet` | Only when something broke |
| Google Search daily pull | 09:00 daily | `bot/gsc_pull.py` | Clicks, impressions, position moves, indexing of key pages |
| Alert when a bot workflow fails | on any crash | `bot/notify.py` | ⚠️ which workflow failed and why |

The scripts send their own alerts; n8n schedules them and catches crashes.

## Where things live on the server

- Code: `/opt/aorbo-bot` (copy of this folder) + Python venv `/opt/aorbo-bot/venv`
- Data: `/var/lib/n8n/seo-bot/seo.db` (SQLite: search data, index status, health runs, bot changes)
- Secrets (n8n user only, never in git): `/var/lib/n8n/secrets/`
  - `google-seo-bot.json`: service account `seo-bot@aorbo-seo-bot.iam.gserviceaccount.com` (owner in Search Console)
  - `bing-webmaster-api-key`, `telegram-bot-token`, `telegram-chat-id`

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
