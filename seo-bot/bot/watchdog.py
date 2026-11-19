"""Watchdog for the bot itself - runs from root's cron (/etc/cron.d/aorbo-bot-watchdog), NOT from n8n,
so it still works when n8n is down or stuck. Every 5 minutes:

  - is n8n running and answering (/healthz)? is the vendor agent's 2-minute check still happening
    (state vendor_last_check, written by vendor_agent.py check)?
  - not: restart n8n once and say so in Telegram; still broken 15 minutes later: alert again (once).
  - back: one "fixed" message with how long it was out.
  - tells the website server it is alive (bot-entry.sh "heartbeat"). If this whole server dies, the
    website server notices the missing heartbeat and alerts on its own (ops/site/bot_watch.py).

    python watchdog.py           normal run (cron)
    python watchdog.py --dry     report only: no restart, no Telegram, no heartbeat
"""
import json
import subprocess
import sys
import urllib.request
from datetime import datetime

from common import DATA, esc, state_get, telegram
from sitedeploy import SSH

# Root runs this: its own state file (never writes the bot's state.json, which n8n's runs write),
# and the bot's known_hosts for the website server.
OWN_STATE = DATA / "watchdog.json"
SSH_AS_BOT = SSH[:1] + ["-o", "UserKnownHostsFile=/var/lib/n8n/.ssh/known_hosts"] + SSH[1:]

STALE_MINUTES = 12          # the check runs every 2 minutes: 12 = several missed runs, not a slow one
REALERT_MINUTES = 15


def minutes_since(iso):
    try:
        return (datetime.now() - datetime.fromisoformat(iso)).total_seconds() / 60
    except (TypeError, ValueError):
        return None


def problems_now(n8n_active, healthz_ok, last_check_minutes):
    """What is wrong (pure; tested)."""
    out = []
    if not n8n_active:
        out.append("n8n is not running")
    elif not healthz_ok:
        out.append("n8n is not answering")
    if last_check_minutes is None:
        out.append("the vendor agent has never checked in")
    elif last_check_minutes > STALE_MINUTES:
        out.append(f"the vendor agent last checked {int(last_check_minutes)} min ago (every 2 min expected)")
    return out


def n8n_state():
    active = subprocess.run(["systemctl", "is-active", "--quiet", "n8n"]).returncode == 0
    try:
        healthz = urllib.request.urlopen("http://127.0.0.1:5678/healthz", timeout=10).status == 200
    except Exception:  # noqa: BLE001
        healthz = False
    return active, healthz


def main(argv):
    dry = "--dry" in argv
    active, healthz = n8n_state()
    last = (state_get("vendor_last_check") or {}).get("at")
    problems = problems_now(active, healthz, minutes_since(last))
    try:
        w = json.loads(OWN_STATE.read_text())
    except (OSError, ValueError):
        w = {"down_since": None, "alerted_at": None, "restarted_at": None}
    now = datetime.now().isoformat(timespec="seconds")
    print(json.dumps({"n8n": active, "healthz": healthz, "last_check": last, "problems": problems}))
    if dry:
        return 0

    if problems:
        if not w.get("down_since"):
            w["down_since"] = now
        if not w.get("restarted_at"):
            r = subprocess.run(["systemctl", "restart", "n8n"], capture_output=True, text=True)
            w["restarted_at"] = now
            telegram("🐕 <b>Bot watchdog</b>: " + esc("; ".join(problems))
                     + ("\nRestarted n8n; checking again in 5 minutes." if r.returncode == 0 else f"\nRestart failed: {esc(r.stderr[:200])}"))
            w["alerted_at"] = now
        elif (minutes_since(w.get("alerted_at")) or 0) >= REALERT_MINUTES and not w.get("realerted"):
            telegram("🔴 <b>Bot still down</b> after a restart: " + esc("; ".join(problems))
                     + "\nThe website keeps working; organisers' new dates reach it at the hourly sync until this is fixed.")
            w["realerted"] = True
    elif w.get("down_since"):
        out = minutes_since(w["down_since"]) or 0
        telegram(f"🟢 <b>Bot back</b>: the vendor agent is checking again (was out ~{int(out)} min).", silent=True)
        w = {"down_since": None, "alerted_at": None, "restarted_at": None}
    OWN_STATE.write_text(json.dumps(w))

    # Alive signal for the website server's own watch (ops/site/bot_watch.py).
    beat = {"at": now, "ok": not problems, "problems": problems[:3]}
    try:
        subprocess.run(SSH_AS_BOT + ["heartbeat"], input=json.dumps(beat), capture_output=True, text=True, timeout=60, check=True)
    except Exception as e:  # noqa: BLE001 - the website server will notice the gap
        print("heartbeat not sent:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
