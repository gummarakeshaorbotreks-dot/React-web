#!/usr/bin/env python3
"""The website server watches the bot server (19 Nov 2026): the bot's watchdog (seo-bot/bot/watchdog.py,
root cron every 5 min) sends a heartbeat here through bot-entry.sh; if none arrives for 20 minutes the
bot server itself is down or cut off, and nothing over there can say so - this does, in Telegram.

Root cron on the website server: /etc/cron.d/aorbo-bot-watch (every 10 min).
Secrets: /opt/aorbo-site/secrets/telegram-bot-token, telegram-chat-id (root only, copied from the bot).

    python3 bot_watch.py          normal run
    python3 bot_watch.py --dry    print what it would do
"""
import json
import sys
import urllib.request
from datetime import datetime

BEAT = "/opt/aorbo-site/data/bot-heartbeat.json"
OWN = "/opt/aorbo-site/data/bot-watch-state.json"
SECRETS = "/opt/aorbo-site/secrets"
SILENT_MINUTES = 20


def minutes_since(iso):
    try:
        return (datetime.now() - datetime.fromisoformat(iso)).total_seconds() / 60
    except (TypeError, ValueError):
        return None


def verdict(beat, now_minutes=None):
    """'ok' / 'silent' / 'unwell' (pure; the bot says it is up but something there is wrong)."""
    age = now_minutes if now_minutes is not None else minutes_since((beat or {}).get("received"))
    if age is None or age > SILENT_MINUTES:
        return "silent"
    return "ok" if beat.get("ok") else "unwell"


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def telegram(text):
    token = open(f"{SECRETS}/telegram-bot-token", encoding="utf-8").read().strip()
    chat = int(open(f"{SECRETS}/telegram-chat-id", encoding="utf-8").read().strip())
    body = json.dumps({"chat_id": chat, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=body,
                                 headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=30)


def main(argv):
    beat = load(BEAT, {})
    state = load(OWN, {"silent_since": None})
    v = verdict(beat)
    print(json.dumps({"verdict": v, "last": beat.get("received"), "state": state}))
    if "--dry" in argv:
        return 0
    # The bot's own watchdog reports "unwell" itself (it is up and has Telegram); only silence is ours.
    if v == "silent" and not state.get("silent_since"):
        telegram("🔴 <b>Bot server silent</b>: no heartbeat from the SEO/vendor bot server (freescout-vps) for "
                 f"{SILENT_MINUTES}+ minutes (last {beat.get('received') or 'never'}). The website keeps working; organisers' "
                 "new dates still reach it at the hourly sync. Check the server at the hosting panel.")
        state["silent_since"] = datetime.now().isoformat(timespec="seconds")
    elif v != "silent" and state.get("silent_since"):
        out = minutes_since(state["silent_since"]) or 0
        telegram(f"🟢 <b>Bot server back</b>: heartbeat again (silent ~{int(out) + SILENT_MINUTES} min).")
        state["silent_since"] = None
    with open(OWN + ".tmp", "w", encoding="utf-8") as f:
        json.dump(state, f)
    import os
    os.replace(OWN + ".tmp", OWN)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
